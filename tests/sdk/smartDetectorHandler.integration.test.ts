// tests/sdk/smartDetectorHandler.integration.test.ts
// Handler-level integration stub: stubs the `figma` global (getNodeByIdAsync,
// variables.*, mixed) and invokes SmartDetectorHandler.handleResponse
// directly. Proves the full handler composition path end-to-end short of the
// Figma runtime itself: detection → formatSummary → audit → formatAuditBlock
// → final assistant message.
//
// Positive path: fixture with unbound fill + orphan binding → message
// contains both `## Smart Detector` and `### Token Audit`.
//
// Negative path: fixture with only a bound fill against a valid catalog →
// auditTokens yields zero findings → `### Token Audit` is omitted.

function assert(condition: boolean, msg: string): void {
  if (!condition) throw new Error(`FAIL: ${msg}`)
}
async function test(name: string, fn: () => Promise<void>): Promise<void> {
  return fn().then(() => console.log(`  ✓ ${name}`)).catch(e => { console.error(`  ✗ ${name}:`, e.message); process.exit(1) })
}

// ── Figma stub ─────────────────────────────────────────────────────────────
// Must be installed BEFORE the handler module is imported, because the
// handler's module-level `new SDToolkitSmartDetectionEngine()` does not run
// figma.* calls itself but the downstream adapters do.

type StubNode = {
  id: string
  name: string
  type: string
  visible: boolean
  x: number; y: number; width: number; height: number
  fills?: Array<{ type: string; color?: { r: number; g: number; b: number; a?: number } }>
  boundVariables?: Record<string, unknown>
  children?: StubNode[]
}

// ── Fixture 1: unbound + orphan (positive path) ───────────────────────────
const positiveCatalogCollections = [{
  id: 'c1',
  name: 'Colors',
  modes: [{ modeId: 'm-light', name: 'Light' }, { modeId: 'm-dark', name: 'Dark' }],
  defaultModeId: 'm-light',
}]
const positiveCatalogVariables = [{
  id: 'v-primary',
  name: 'color/brand/primary',
  variableCollectionId: 'c1',
  resolvedType: 'COLOR' as const,
  scopes: ['ALL_FILLS'],
  valuesByMode: {
    'm-light': { r: 0.2, g: 0.5, b: 1, a: 1 },
    'm-dark': { r: 0.3, g: 0.6, b: 1, a: 1 },
  },
}]

const positiveRoot: StubNode = {
  id: 'pos-root',
  name: 'Card',
  type: 'FRAME',
  visible: true,
  x: 0, y: 0, width: 320, height: 200,
  fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1, a: 1 } }], // unbound
  children: [
    {
      id: 'pos-orphan',
      name: 'Orphan',
      type: 'FRAME',
      visible: true,
      x: 0, y: 0, width: 80, height: 32,
      fills: [{ type: 'SOLID', color: { r: 0.2, g: 0.5, b: 1, a: 1 } }],
      boundVariables: { fills: [{ type: 'VARIABLE_ALIAS', id: 'v-does-not-exist' }] },
    },
  ],
}

// ── Fixture 2: bound only, no unbound / no orphan (negative path) ────────
const negativeRoot: StubNode = {
  id: 'neg-root',
  name: 'CardBound',
  type: 'FRAME',
  visible: true,
  x: 0, y: 0, width: 320, height: 200,
  fills: [{ type: 'SOLID', color: { r: 0.2, g: 0.5, b: 1, a: 1 } }],
  boundVariables: { fills: [{ type: 'VARIABLE_ALIAS', id: 'v-primary' }] },
  children: [],
}

let activeCatalogVariables: typeof positiveCatalogVariables = positiveCatalogVariables
const nodeRegistry = new Map<string, StubNode>([
  [positiveRoot.id, positiveRoot],
  [negativeRoot.id, negativeRoot],
])

// Install the global figma stub before importing the handler.
;(globalThis as unknown as { figma: unknown }).figma = {
  mixed: Symbol('figma.mixed'),
  async getNodeByIdAsync(id: string) {
    return nodeRegistry.get(id) ?? null
  },
  variables: {
    async getLocalVariableCollectionsAsync() { return positiveCatalogCollections },
    async getLocalVariablesAsync() { return activeCatalogVariables },
  },
}

// Build a minimal HandlerContext. Fields not read by the handler are
// stubbed as no-ops.
function makeContext(selectionOrder: string[]): any {
  return {
    assistantId: 'general',
    actionId: 'run-smart-detector',
    response: '',
    selectionOrder,
    selection: { roots: [], contentTable: null },
    provider: null,
    sendChatWithRecovery: async () => '',
    sendAssistantMessage: () => {},
    replaceStatusMessage: () => {},
    requestId: 'test-request',
  }
}

async function run() {
  // Import AFTER installing the figma stub (which must happen at module top).
  const { SmartDetectorHandler } = await import('../../src/core/assistants/handlers/smartDetector')
  const handler = new SmartDetectorHandler()

  await test('positive path: detector + token-audit sections both present', async () => {
    activeCatalogVariables = positiveCatalogVariables
    const ctx = makeContext([positiveRoot.id])
    const result = await handler.handleResponse(ctx)
    assert(result.handled === true, 'handler claims result')
    const msg = result.message ?? ''
    assert(msg.includes('## Smart Detector'), 'Smart Detector section header present')
    assert(msg.includes('### Token Audit'), 'Token Audit section header present')
    // Token-audit section must appear AFTER the Smart Detector section
    assert(msg.indexOf('### Token Audit') > msg.indexOf('## Smart Detector'), 'Token Audit appended below detector output')
    // Positive fixture: 1 unbound-color on root + 1 orphaned-binding on child
    assert(msg.includes('unbound-color=1'), 'unbound-color count present')
    assert(msg.includes('orphaned-binding=1'), 'orphaned-binding count present')
    assert(msg.includes('[error] orphaned-binding'), 'error severity rendered')
  })

  await test('negative path: no audit findings → detector output unchanged, no ### Token Audit appended', async () => {
    activeCatalogVariables = positiveCatalogVariables
    const ctx = makeContext([negativeRoot.id])
    const result = await handler.handleResponse(ctx)
    const msg = result.message ?? ''
    assert(msg.includes('## Smart Detector'), 'Smart Detector section header still present')
    assert(!msg.includes('### Token Audit'), 'Token Audit section NOT appended when zero findings')
  })

  await test('empty selection: neither detector nor audit section; short guidance message', async () => {
    const ctx = makeContext([])
    const result = await handler.handleResponse(ctx)
    const msg = result.message ?? ''
    assert(msg.includes('Smart Detector: no selection'), 'empty-selection guidance message')
    assert(!msg.includes('### Token Audit'), 'Token Audit section NOT appended on empty selection')
  })

  console.log('SmartDetectorHandler integration tests passed')
}
run()
