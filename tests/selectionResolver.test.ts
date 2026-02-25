import assert from 'node:assert'
import { resolveSelection } from '../src/core/figma/selectionResolver'

type MockNode = {
  id: string
  name: string
  type: string
  visible?: boolean
  children?: MockNode[]
}

let passed = 0
let failed = 0

async function runTest(name: string, fn: () => Promise<void> | void) {
  try {
    await fn()
    passed++
    console.log(`  ✓ ${name}`)
  } catch (e: unknown) {
    failed++
    const err = e as Error
    console.error(`  ✗ ${name}`)
    console.error(`    ${err.message}`)
  }
}

function setMockFigma(nodes: MockNode[]) {
  const byId = new Map<string, MockNode>()
  const walk = (n: MockNode) => {
    byId.set(n.id, n)
    if (Array.isArray(n.children)) n.children.forEach(walk)
  }
  nodes.forEach(walk)
  ;(globalThis as unknown as { figma: { getNodeByIdAsync: (id: string) => Promise<MockNode | null> } }).figma = {
    getNodeByIdAsync: async (id: string) => byId.get(id) || null
  }
}

async function run() {
  console.log('selectionResolver.test.ts')

  await runTest('Section expands to descendant frames', async () => {
    const section: MockNode = {
      id: 'section-1',
      name: 'Section',
      type: 'SECTION',
      visible: true,
      children: [
        { id: 'frame-a', name: 'A', type: 'FRAME', visible: true },
        { id: 'frame-b', name: 'B', type: 'FRAME', visible: true }
      ]
    }
    setMockFigma([section])
    const resolved = await resolveSelection(['section-1'], { containerStrategy: 'expand', skipHidden: true })
    assert.deepStrictEqual(resolved.scanRoots.map(n => n.id), ['frame-a', 'frame-b'])
  })

  await runTest('Wrapper group expands to descendant frames', async () => {
    const group: MockNode = {
      id: 'group-1',
      name: 'Group',
      type: 'GROUP',
      visible: true,
      children: [
        {
          id: 'inner-group',
          name: 'Inner',
          type: 'GROUP',
          visible: true,
          children: [{ id: 'frame-c', name: 'C', type: 'FRAME', visible: true }]
        }
      ]
    }
    setMockFigma([group])
    const resolved = await resolveSelection(['group-1'], { containerStrategy: 'expand', skipHidden: true })
    assert.deepStrictEqual(resolved.scanRoots.map(n => n.id), ['frame-c'])
  })

  await runTest('Leaf passthrough does not climb to parent', async () => {
    const frame: MockNode = {
      id: 'frame-x',
      name: 'Frame X',
      type: 'FRAME',
      visible: true,
      children: [{ id: 'text-x', name: 'Title', type: 'TEXT', visible: true }]
    }
    setMockFigma([frame])
    const resolved = await resolveSelection(['text-x'], { containerStrategy: 'expand', skipHidden: true })
    assert.deepStrictEqual(resolved.scanRoots.map(n => n.id), ['text-x'])
    assert.ok(resolved.scanRoots.every(n => n.id !== 'frame-x'))
  })

  await runTest('Dedupe preserves first order and tracks duplicateIds', async () => {
    const section: MockNode = {
      id: 'section-dup',
      name: 'Section Dup',
      type: 'SECTION',
      visible: true,
      children: [
        { id: 'frame-1', name: 'F1', type: 'FRAME', visible: true },
        { id: 'frame-2', name: 'F2', type: 'FRAME', visible: true }
      ]
    }
    setMockFigma([section])
    const resolved = await resolveSelection(['section-dup', 'frame-1'], { containerStrategy: 'expand', skipHidden: true })
    assert.deepStrictEqual(resolved.scanRoots.map(n => n.id), ['frame-1', 'frame-2'])
    assert.ok(resolved.diagnostics.duplicateIds.includes('frame-1'))
  })

  await runTest('PAGE and DOCUMENT are excluded', async () => {
    const page: MockNode = { id: 'page-1', name: 'Page', type: 'PAGE', visible: true }
    const doc: MockNode = { id: 'doc-1', name: 'Doc', type: 'DOCUMENT', visible: true }
    const frame: MockNode = { id: 'frame-ok', name: 'Frame OK', type: 'FRAME', visible: true }
    setMockFigma([page, doc, frame])
    const resolved = await resolveSelection(['doc-1', 'page-1', 'frame-ok'], { containerStrategy: 'direct', skipHidden: true })
    assert.deepStrictEqual(resolved.scanRoots.map(n => n.id), ['frame-ok'])
    const excludedReasons = resolved.diagnostics.excluded.map(e => e.reason)
    assert.ok(excludedReasons.includes('page-or-document'))
  })

  await runTest('Hidden nodes are excluded when skipHidden is true', async () => {
    const frameHidden: MockNode = { id: 'frame-hidden', name: 'Hidden', type: 'FRAME', visible: false }
    setMockFigma([frameHidden])
    const resolved = await resolveSelection(['frame-hidden'], { containerStrategy: 'direct', skipHidden: true })
    assert.strictEqual(resolved.scanRoots.length, 0)
    assert.ok(resolved.diagnostics.excluded.some(e => e.reason === 'hidden'))
  })

  console.log(`\n${passed} passed, ${failed} failed`)
  if (failed > 0) process.exit(1)
}

run().catch((e) => {
  console.error(e)
  process.exit(1)
})
