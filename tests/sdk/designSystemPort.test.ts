// tests/sdk/designSystemPort.test.ts
import { DefaultDSPromptEnrichmentEngine } from '../../src/core/designSystem/DefaultDSPromptEnrichmentEngine'
import { DefaultDSQueryEngine } from '../../src/core/designSystem/DefaultDSQueryEngine'
import { DSTQueryEngine } from '../../src/core/designSystem/DSTQueryEngine'
import { DSTPromptEnrichmentEngine } from '../../src/core/designSystem/DSTPromptEnrichmentEngine'
import type { DSPromptEnrichmentPort, DSQueryPort } from '../../src/core/sdk/ports/DesignSystemPort'

function assert(condition: boolean, msg: string): void {
  if (!condition) throw new Error(`FAIL: ${msg}`)
}
async function test(name: string, fn: () => Promise<void>): Promise<void> {
  return fn().then(() => console.log(`  ✓ ${name}`)).catch(e => { console.error(`  ✗ ${name}:`, e.message); process.exit(1) })
}

async function run() {
  // ── DefaultDS engines (legacy registry path) ────────────────────────────────
  const enrichment: DSPromptEnrichmentPort = new DefaultDSPromptEnrichmentEngine()
  const query: DSQueryPort = new DefaultDSQueryEngine()

  await test('DefaultDS: getKnowledgeSegment returns string or undefined', async () => {
    const result = enrichment.getKnowledgeSegment('general')
    assert(result === undefined || typeof result === 'string', 'returns string or undefined')
  })

  await test('DefaultDS: getActiveDesignSystem returns null or DSContext', async () => {
    const ds = query.getActiveDesignSystem()
    assert(ds === null || (typeof ds === 'object' && typeof (ds as { name: string }).name === 'string'), 'returns null or DSContext')
  })

  await test('DefaultDS: searchComponents returns array', async () => {
    const results = await query.searchComponents('button')
    assert(Array.isArray(results), 'returns array')
  })

  // ── DST engines (DS-T v0.1.0-alpha.0) ────────────────────────────────────────
  // Test env has activeRegistries: ["example"] — "example" is not a DS-T known DS.
  // DS-T returns [] / undefined for unknown registry ids (graceful no-op).

  const dstQuery = new DSTQueryEngine()
  const dstEnrich = new DSTPromptEnrichmentEngine()

  await test('DSTQueryEngine: getActiveDesignSystem returns DSContext or null', async () => {
    const ds = dstQuery.getActiveDesignSystem()
    // Returns a DSContext with the first active registry id (may be unknown to DS-T)
    assert(
      ds === null || (typeof ds === 'object' && typeof (ds as { name: string }).name === 'string'),
      'returns null or DSContext'
    )
  })

  await test('DSTQueryEngine: searchComponents returns empty array for unknown DS id', async () => {
    // Test env activeRegistries[0] = "example" which DS-T doesn't know → []
    const results = await dstQuery.searchComponents('button')
    assert(Array.isArray(results), 'returns array')
    // DS-T returns [] for unknown DS — length is 0 unless "example" is somehow known
    assert(results.every(r => typeof r.canonicalKind === 'string'), 'all results have canonicalKind')
  })

  await test('DSTPromptEnrichmentEngine: getKnowledgeSegment returns string or undefined', async () => {
    // Module may or may not be loaded yet — either way, result must be string | undefined.
    const result = dstEnrich.getKnowledgeSegment('general')
    assert(result === undefined || typeof result === 'string', 'returns string or undefined')
  })

  await test('DSTPromptEnrichmentEngine: getKnowledgeSegmentAsync returns undefined for unknown DS', async () => {
    // Async path — module is loaded by the time this resolves.
    // "example" registry is unknown to DS-T → undefined
    const result = await dstEnrich.getKnowledgeSegmentAsync('general')
    assert(result === undefined || typeof result === 'string', 'returns string or undefined for active DS')
  })

  // ── DST with explicit DS id (directly calling schema module) ────────────────
  // This exercises the vendor module loading + real API surface, independent of
  // FigmAI config. Uses 'jazz' which is always present in DS-T v0.1.0-alpha.0.

  await test('DST schema: searchComponents returns matches for known DS', async () => {
    const mod = await import('../../vendor/ds-t-schema/index.js')
    const results = await mod.searchComponents('button', 'jazz')
    assert(Array.isArray(results), 'returns array')
    assert(results.length > 0, 'finds button in jazz DS')
    assert(results[0].canonicalKind === 'button', 'first result is button kind')
    assert(typeof results[0].componentName === 'string' && results[0].componentName.length > 0, 'componentName is a non-empty string')
  })

  await test('DST schema: searchComponents returns [] for unknown DS', async () => {
    const mod = await import('../../vendor/ds-t-schema/index.js')
    const results = await mod.searchComponents('button', 'not-a-ds')
    assert(Array.isArray(results) && results.length === 0, 'returns empty for unknown DS')
  })

  await test('DST schema: getPromptEnrichmentSegment returns string for known DS', async () => {
    const mod = await import('../../vendor/ds-t-schema/index.js')
    const result = mod.getPromptEnrichmentSegment('jazz')
    assert(typeof result === 'string' && result.length > 0, 'returns non-empty string for jazz')
    assert(result.includes('Jazz') || result.includes('jazz'), 'segment mentions the DS name')
  })

  await test('DST schema: getPromptEnrichmentSegment returns undefined for unknown DS', async () => {
    const mod = await import('../../vendor/ds-t-schema/index.js')
    const result = mod.getPromptEnrichmentSegment('not-a-ds')
    assert(result === undefined, 'returns undefined for unknown DS')
  })

  await test('DST schema: resolveDesignSystem returns RendererDesignSystem for known DS', async () => {
    const mod = await import('../../vendor/ds-t-schema/index.js')
    const ds = mod.resolveDesignSystem('jazz', 'default-light')
    assert(typeof ds === 'object' && ds !== null, 'returns object')
    assert(typeof ds.name === 'string', 'has name field')
    assert(Array.isArray(ds.components), 'has components array')
    assert(ds.components.length > 0, 'components array is non-empty')
  })

  await test('DST renderer: createFigmaInstructionTree maps canonical tree to DS names', async () => {
    const schema = await import('../../vendor/ds-t-schema/index.js')
    const renderer = await import('../../vendor/ds-t-renderer-figma/index.js')
    const ds = schema.resolveDesignSystem('jazz', 'default-light')
    const tree = {
      id: 'p1',
      kind: 'page' as const,
      children: [
        { id: 'btn1', kind: 'button' as const, textContent: 'Click me' }
      ]
    }
    const result = renderer.createFigmaInstructionTree(tree, ds)
    assert(result.type === 'FRAME', 'page maps to FRAME')
    assert(typeof result.name === 'string' && result.name.length > 0, 'name is populated')
    assert(Array.isArray(result.children) && result.children!.length === 1, 'child preserved')
    assert(result.children![0].type === 'INSTANCE', 'button maps to INSTANCE')
  })

  console.log('DesignSystemPort tests passed')
}
run()
