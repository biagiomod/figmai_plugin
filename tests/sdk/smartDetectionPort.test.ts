// tests/sdk/smartDetectionPort.test.ts
// Note: SceneNode is a Figma API type — we use a minimal mock
import { DefaultSmartDetectionEngine } from '../../src/core/detection/smartDetector/DefaultSmartDetectionEngine'
import { SDToolkitSmartDetectionEngine } from '../../src/core/detection/smartDetector/SDToolkitSmartDetectionEngine'
import type { SmartDetectionPort } from '../../src/core/sdk/ports/SmartDetectionPort'
import type { VariableCatalogSnapshot } from '../../src/core/sdk/adapters/figmaVariableCatalogAdapter'

function assert(condition: boolean, msg: string): void {
  if (!condition) throw new Error(`FAIL: ${msg}`)
}
async function test(name: string, fn: () => Promise<void>): Promise<void> {
  return fn().then(() => console.log(`  ✓ ${name}`)).catch(e => { console.error(`  ✗ ${name}:`, e.message); process.exit(1) })
}

// ── Mocks for the token-audit seam test ────────────────────────────────────

// Minimal SceneNode shape the serializer actually reads. No SceneNode type
// conformance needed at runtime — tsx erases types.
type MockNode = {
  id: string
  name: string
  type: string
  visible?: boolean
  x?: number; y?: number; width?: number; height?: number
  fills?: Array<{ type: string; color?: { r: number; g: number; b: number; a?: number } }>
  boundVariables?: Record<string, unknown>
  resolvedVariableModes?: Record<string, string>
  children?: MockNode[]
}

const auditCatalog: VariableCatalogSnapshot = {
  collections: [
    {
      id: 'c1',
      name: 'Colors',
      modes: [
        { modeId: 'm-light', name: 'Light' },
        { modeId: 'm-dark', name: 'Dark' },
      ],
      defaultModeId: 'm-light',
    },
  ],
  variables: [
    {
      id: 'v-primary',
      name: 'color/brand/primary',
      collectionId: 'c1',
      resolvedType: 'COLOR',
      scopes: ['ALL_FILLS'],
      valuesByMode: {
        'm-light': { type: 'COLOR', r: 0.2, g: 0.5, b: 1, a: 1 },
        'm-dark':  { type: 'COLOR', r: 0.3, g: 0.6, b: 1, a: 1 },
      },
    },
  ],
}

const rootNode: MockNode = {
  id: 'root',
  name: 'Card',
  type: 'FRAME',
  visible: true,
  x: 0, y: 0, width: 320, height: 200,
  fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 } }],
  children: [
    {
      id: 'raw-child',
      name: 'Raw',
      type: 'FRAME',
      visible: true,
      x: 0, y: 0, width: 80, height: 32,
      fills: [{ type: 'SOLID', color: { r: 0.2, g: 0.5, b: 1, a: 1 } }],
      // no boundVariables — expect an unbound-color finding here
    },
    {
      id: 'bound-child',
      name: 'Bound',
      type: 'FRAME',
      visible: true,
      x: 0, y: 40, width: 80, height: 32,
      fills: [{ type: 'SOLID', color: { r: 0.2, g: 0.5, b: 1, a: 1 } }],
      boundVariables: { fills: [{ type: 'VARIABLE_ALIAS', id: 'v-primary' }] },
      // bound to a valid variable — no finding expected
    },
    {
      id: 'orphan-child',
      name: 'Orphan',
      type: 'FRAME',
      visible: true,
      x: 0, y: 80, width: 80, height: 32,
      fills: [{ type: 'SOLID', color: { r: 0.2, g: 0.5, b: 1, a: 1 } }],
      boundVariables: { fills: [{ type: 'VARIABLE_ALIAS', id: 'v-does-not-exist' }] },
      // bound to a missing variable — expect orphaned-binding
    },
  ],
}

async function run() {
  const engine: SmartDetectionPort = new DefaultSmartDetectionEngine()

  await test('implements SmartDetectionPort interface', async () => {
    assert(typeof engine.detect === 'function', 'detect method exists')
  })

  await test('detect returns array', async () => {
    // Empty roots — engine should return empty array
    const results = await engine.detect([])
    assert(Array.isArray(results), 'returns array')
    assert(results.length === 0, 'empty roots returns empty array')
  })

  // ── Token-audit seam (SDToolkitSmartDetectionEngine) ──────────────────

  const toolkitEngine = new SDToolkitSmartDetectionEngine(async () => auditCatalog)

  await test('SD-Toolkit engine exposes auditTokens', async () => {
    assert(typeof toolkitEngine.auditTokens === 'function', 'auditTokens method exists')
  })

  await test('auditTokens emits unbound-color + orphaned-binding, skips bound fill', async () => {
    const results = await toolkitEngine.auditTokens([rootNode as unknown as SceneNode])
    assert(Array.isArray(results) && results.length === 1, 'one result per root')
    const report = results[0]!
    assert(report.sourceRef === 'root', 'sourceRef matches root id')

    const unbound = report.findings.filter(f => f.kind === 'unbound-color')
    const orphaned = report.findings.filter(f => f.kind === 'orphaned-binding')

    // Root + raw-child both have unbound SOLID fills; bound-child and
    // orphan-child have bindings (orphan raises orphaned-binding instead)
    assert(unbound.length === 2, `expected 2 unbound-color, got ${unbound.length}`)
    assert(orphaned.length === 1, `expected 1 orphaned-binding, got ${orphaned.length}`)
    assert(orphaned[0]!.severity === 'error', 'orphaned severity is error')
    assert(orphaned[0]!.nodeId === 'orphan-child', 'orphan attributed to correct node')
  })

  await test('auditTokens top suggestion surfaces color/brand/primary for exact-match fills', async () => {
    const results = await toolkitEngine.auditTokens([rootNode as unknown as SceneNode])
    const unbound = results[0]!.findings.filter(f => f.kind === 'unbound-color' && f.nodeId === 'raw-child')
    assert(unbound.length === 1, 'one finding on raw-child')
    const top = unbound[0]!.suggestions[0]
    assert(top !== undefined, 'at least one suggestion')
    assert(top!.variableId === 'v-primary', 'top suggestion is v-primary')
    assert(top!.confidence === 'high', 'high confidence (exact color match)')
    assert(top!.modeReady === true, 'both modes present → mode-ready')
  })

  await test('auditTokens summary counts match findings', async () => {
    const results = await toolkitEngine.auditTokens([rootNode as unknown as SceneNode])
    const s = results[0]!.summary
    assert(s.total === results[0]!.findings.length, 'total == findings length')
    assert(s.byKind['unbound-color'] === 2, 'summary byKind unbound-color')
    assert(s.byKind['orphaned-binding'] === 1, 'summary byKind orphaned-binding')
    assert(s.bySeverity.error === 1, 'summary bySeverity error')
    assert(s.bySeverity.warn === 2, 'summary bySeverity warn')
  })

  await test('auditTokens with empty roots returns empty array', async () => {
    const results = await toolkitEngine.auditTokens([])
    assert(Array.isArray(results) && results.length === 0, 'empty array')
  })

  console.log('SmartDetectionPort tests passed')
}
run()
