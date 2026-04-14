# SDK Toolkit Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Introduce stable SDK contracts, SmartDetection/DesignSystem port seams, and twin-shell surgery on `main.ts`/`ui.tsx` so strike teams build against durable interfaces and SD-T/DS-T can be swapped in by replacing adapter implementations only.

**Architecture:** Ports-first — define `SmartDetectionPort` and three `DesignSystem*Port` interfaces with host-owned DTOs before any shell surgery, so extracted SDK services depend on ports from the start. Then thin `main.ts` and `ui.tsx` into routing coordinators by extracting `ConversationManager`, `QuickActionExecutor`, `StatusChannel`, `SelectionResolver`, and eight per-assistant UI controllers. Phases 2–3 route current in-repo detector/DS logic behind the new ports. Phase 4 introduces the `AssistantConfig` layer. Phases 6–7 clean up the build and publish docs.

**Tech Stack:** TypeScript, `tsx` (test runner), `build-figma-plugin` (esbuild bundler), `npm run test`, `npm run build`, `npm run invariants`.

**Phase 5 (SKILL.md + ACE editing surface) is explicitly out of scope.** See the gating note at the end of this plan.

---

## File Map

### New files (Phase 0)
- `src/core/sdk/ports/SmartDetectionPort.ts` — host-owned DTOs + `SmartDetectionPort` interface
- `src/core/sdk/ports/DesignSystemPort.ts` — `DSPromptEnrichmentPort`, `DSQueryPort`, `DSPlacementPort` + host-owned DTOs
- `src/core/sdk/index.ts` — SDK barrel export
- `vendor/README.md` — vendored toolkit instructions

### New files (Phase 1)
- `src/core/sdk/conversationManager.ts` — `messageHistory`, segment ops, push/replace
- `src/core/sdk/statusChannel.ts` — typed `replaceStatusMessage`, `sendAssistantMessage`, `updateStatusStep`
- `src/core/sdk/selectionResolver.ts` — wraps `buildSelectionContext` + `resolveSelection`
- `src/core/sdk/quickActionExecutor.ts` — `RUN_QUICK_ACTION` dispatch logic
- `src/core/sdk/types.ts` — `OutcomeRecord` (north star stub), shared SDK types
- `src/ui/controllers/AnalyticsTaggingController.tsx`
- `src/ui/controllers/ContentTableController.tsx`
- `src/ui/controllers/DesignCritiqueController.tsx`
- `src/ui/controllers/DesignWorkshopController.tsx`
- `src/ui/controllers/GeneralController.tsx`
- `src/ui/controllers/Code2DesignController.tsx`
- `src/ui/controllers/DiscoveryController.tsx`
- `src/ui/controllers/SmartDetectorController.tsx`
- `src/ui/services/viewportManager.ts`
- `src/ui/services/uiStatusService.ts`
- `tests/sdk/conversationManager.test.ts`
- `tests/sdk/statusChannel.test.ts`

### Modified files (Phase 1)
- `src/main.ts` — reduced to routing + bootstrap only
- `src/ui.tsx` — reduced to render root + message router only
- `src/core/assistants/handlers/base.ts` — add `outcome?: OutcomeRecord`

### New files (Phase 2)
- `src/core/sdk/adapters/figmaNodeSerializer.ts` — `SceneNode → FigmaNode` serializer
- `src/core/detection/smartDetector/DefaultSmartDetectionEngine.ts` — in-repo engine behind the port
- `tests/sdk/smartDetectionPort.test.ts`

### Modified files (Phase 2)
- `src/core/assistants/handlers/smartDetector.ts` — import port, not `scanSelectionSmart` directly
- `src/core/analyticsTagging/autoAnnotator.ts` — import port, not `scanSelectionSmart` directly
- `scripts/assert-invariants.ts` — add SD port compliance check

### New files (Phase 3)
- `src/core/sdk/adapters/figmaInstructionWalker.ts` — `DSLayerInstruction → figma.*` calls
- `src/core/designSystem/DefaultDSPromptEnrichmentEngine.ts`
- `src/core/designSystem/DefaultDSQueryEngine.ts`
- `src/core/designSystem/DefaultDSPlacementEngine.ts`
- `tests/sdk/designSystemPort.test.ts`

### Modified files (Phase 3)
- `src/custom/knowledge.ts` — use `DSPromptEnrichmentPort`, not direct DS imports
- `src/core/tools/designSystemTools.ts` — use `DSQueryPort`, not direct DS imports
- `src/core/designWorkshop/renderer.ts` — use `DSPlacementPort`, not direct DS imports
- `scripts/assert-invariants.ts` — add DS port compliance check

### New files (Phase 4)
- `src/core/sdk/assistantConfig.ts` — `AssistantConfig` type + loader
- `tests/sdk/assistantConfig.test.ts`

### Modified files (Phase 4)
- `scripts/pull-ace-config.ts` — emit `AssistantConfig` fields
- `src/core/settings.ts` — read `AssistantConfig` where appropriate

### Modified files (Phase 6)
- `scripts/assert-invariants.ts` — drift checks (manifest ↔ handler, port compliance)

### New files (Phase 7)
- `docs/sdk-architecture.md`
- `docs/migration-guide-sdk.md`
- `docs/strike-team-guide.md`

---

## Phase 0: Port Interfaces

### Task 1: Create SmartDetectionPort with host-owned DTOs

**Files:**
- Create: `src/core/sdk/ports/SmartDetectionPort.ts`

- [ ] **Step 1: Create the port file**

```typescript
// src/core/sdk/ports/SmartDetectionPort.ts
/**
 * SmartDetectionPort — host-owned interface for element detection.
 * No imports from toolkit packages. Adapter implementations map to/from toolkit types.
 */

export type DetectionCertainty = 'exact' | 'inferred' | 'weak' | 'unknown' | 'ambiguous'

export interface DetectedElement {
  id: string
  candidateType: string | null   // element classification (e.g. 'button', 'input')
  category: string | null        // broad category
  certainty: DetectionCertainty
  rationale: string
  matchedSignals: string[]
  ambiguous: boolean
  children: DetectedElement[]
}

export interface SmartDetectionSummary {
  total: number
  exact: number
  inferred: number
  weak: number
  unknown: number
  ambiguous: number
}

export interface SmartDetectionResult {
  sourceRef: string              // Figma node ID of the scanned root
  root: DetectedElement
  summary: SmartDetectionSummary
}

/**
 * Port interface for smart element detection.
 * Default engine: DefaultSmartDetectionEngine (wraps current in-repo detector).
 * Future engine: SDToolkitSmartDetectionEngine (uses SD-T pipeline via vendored dist).
 */
export interface SmartDetectionPort {
  /**
   * Detect elements in the given selection roots.
   * Returns one result per root in the same order as input.
   */
  detect(roots: readonly SceneNode[]): Promise<SmartDetectionResult[]>
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsx --no-cache -e "import type { SmartDetectionPort } from './src/core/sdk/ports/SmartDetectionPort'"
```

Expected: no output (compiles cleanly).

- [ ] **Step 3: Commit**

```bash
git add src/core/sdk/ports/SmartDetectionPort.ts
git commit -m "feat(sdk): add SmartDetectionPort host-owned DTOs (Phase 0)"
```

---

### Task 2: Create DesignSystem ports with host-owned DTOs

**Files:**
- Create: `src/core/sdk/ports/DesignSystemPort.ts`

- [ ] **Step 1: Create the port file**

```typescript
// src/core/sdk/ports/DesignSystemPort.ts
/**
 * DesignSystem ports — three separate interfaces covering:
 *   1. DSPromptEnrichmentPort  — inject DS knowledge into LLM requests
 *   2. DSQueryPort             — query components, resolve active DS context
 *   3. DSPlacementPort         — receive instruction tree, create Figma nodes
 *
 * No imports from toolkit packages. Adapter implementations map to/from toolkit types.
 */

// ── Prompt Enrichment ────────────────────────────────────────────────────────

/**
 * Returns a DS knowledge segment to inject into LLM system prompts.
 * Returns undefined if no active DS or enrichment is disabled.
 */
export interface DSPromptEnrichmentPort {
  getKnowledgeSegment(assistantId: string): string | undefined
}

// ── Query ─────────────────────────────────────────────────────────────────────

export interface DSComponentMatch {
  canonicalKind: string    // e.g. 'button', 'card'
  componentName: string    // as it appears in the DS (e.g. 'PrimaryButton')
  description?: string
  registryId?: string
}

export interface DSContext {
  name: string             // e.g. 'Nuxt UI'
  theme: string            // e.g. 'light'
}

/**
 * Query components and resolve active design system context.
 */
export interface DSQueryPort {
  searchComponents(query: string, context?: string): Promise<DSComponentMatch[]>
  getActiveDesignSystem(): DSContext | null
}

// ── Placement ─────────────────────────────────────────────────────────────────

/**
 * Host-owned instruction tree — mirrors DS-T FigmaLayerInstruction without importing it.
 * The adapter implementation maps between this and the toolkit's native type.
 */
export interface DSLayerInstruction {
  id: string
  type: 'frame' | 'text' | 'instance'
  name: string
  textContent?: string
  children?: DSLayerInstruction[]
}

/**
 * Receives a DSLayerInstruction tree and creates actual Figma nodes/instances.
 * The host plugin owns this — toolkit instructions are translated here.
 */
export interface DSPlacementPort {
  executeInstructions(root: DSLayerInstruction): Promise<void>
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsx --no-cache -e "import type { DSPromptEnrichmentPort, DSQueryPort, DSPlacementPort } from './src/core/sdk/ports/DesignSystemPort'"
```

Expected: no output.

- [ ] **Step 3: Commit**

```bash
git add src/core/sdk/ports/DesignSystemPort.ts
git commit -m "feat(sdk): add DesignSystem ports host-owned DTOs (Phase 0)"
```

---

### Task 3: Create SDK barrel, OutcomeRecord stub, and vendor directory

**Files:**
- Create: `src/core/sdk/types.ts`
- Create: `src/core/sdk/index.ts`
- Create: `vendor/README.md`

- [ ] **Step 1: Create SDK types (north star stubs)**

```typescript
// src/core/sdk/types.ts
/**
 * Shared SDK types.
 * OutcomeRecord is a north-star stub — reserved for the future review/iterate loop.
 * It is additive and backward-compatible; nothing reads it today.
 */

/** Reserved for north star: machine-readable outcome from a handler run. */
export interface OutcomeRecord {
  type: string                  // e.g. 'scorecard_placed', 'table_generated'
  summary?: string
  artifactIds?: string[]        // Figma node IDs of placed artifacts
  metadata?: Record<string, unknown>
}
```

- [ ] **Step 2: Create SDK barrel**

```typescript
// src/core/sdk/index.ts
/**
 * SDK barrel — strike-team stable surface.
 * Import SDK services from here, not from individual implementation files.
 */
export type { SmartDetectionPort, SmartDetectionResult, DetectedElement, SmartDetectionSummary, DetectionCertainty } from './ports/SmartDetectionPort'
export type { DSPromptEnrichmentPort, DSQueryPort, DSPlacementPort, DSComponentMatch, DSContext, DSLayerInstruction } from './ports/DesignSystemPort'
export type { OutcomeRecord } from './types'
```

- [ ] **Step 3: Create vendor README**

```markdown
<!-- vendor/README.md -->
# Vendored Toolkit Packages

This directory holds pre-built dist outputs from external toolkits.
Do NOT import toolkit packages directly in port contract files.
Only adapter implementations (src/core/sdk/adapters/) import from here.

## Adding / updating a toolkit

1. Build the toolkit package: `pnpm build` in its repo.
2. Copy the built `dist/` folder here under `vendor/<toolkit-name>/`.
3. Update tsconfig path aliases if needed.
4. Update only the adapter implementation — port contracts and consumers are unchanged.

## Current contents
(empty — populate when SD-T and DS-T are ready for integration)
```

- [ ] **Step 4: Verify barrel compiles**

```bash
npx tsx --no-cache -e "import type { SmartDetectionPort, DSPromptEnrichmentPort, OutcomeRecord } from './src/core/sdk/index'"
```

Expected: no output.

- [ ] **Step 5: Commit**

```bash
git add src/core/sdk/types.ts src/core/sdk/index.ts vendor/README.md
git commit -m "feat(sdk): add SDK barrel, OutcomeRecord stub, vendor dir (Phase 0)"
```

---

## Phase 1: Shell Surgery

**Checkpoint before starting:** Run `npm run build && npm run test`. Both must pass. Phase 1 modifies files with no behavior changes — every test must still pass at each commit.

### Task 4: Add OutcomeRecord to HandlerResult (additive)

**Files:**
- Modify: `src/core/assistants/handlers/base.ts`

- [ ] **Step 1: Read the current HandlerResult interface**

```bash
grep -n "HandlerResult" src/core/assistants/handlers/base.ts
```

- [ ] **Step 2: Add `outcome?` field (additive — nothing reads it yet)**

In `src/core/assistants/handlers/base.ts`, find the `HandlerResult` interface and add one field:

```typescript
import type { OutcomeRecord } from '../../sdk/types'

export interface HandlerResult {
  handled: boolean
  message?: string
  /** Reserved for north star review loop — unused today, populated by future handlers. */
  outcome?: OutcomeRecord
}
```

- [ ] **Step 3: Verify build and tests pass**

```bash
npm run build && npm run test
```

Expected: green.

- [ ] **Step 4: Commit**

```bash
git add src/core/assistants/handlers/base.ts
git commit -m "feat(sdk): add OutcomeRecord stub to HandlerResult (north star hook)"
```

---

### Task 5: Extract ConversationManager from main.ts

**Files:**
- Create: `src/core/sdk/conversationManager.ts`
- Modify: `src/main.ts`
- Create: `tests/sdk/conversationManager.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/sdk/conversationManager.test.ts
import { createConversationManager } from '../../src/core/sdk/conversationManager'

function assert(condition: boolean, msg: string): void {
  if (!condition) throw new Error(`FAIL: ${msg}`)
}

function test(name: string, fn: () => void): void {
  try { fn(); console.log(`  ✓ ${name}`) }
  catch (e) { console.error(`  ✗ ${name}:`, (e as Error).message); process.exit(1) }
}

test('creates with empty history', () => {
  const cm = createConversationManager()
  assert(cm.getHistory().length === 0, 'initial history is empty')
})

test('pushUserMessage adds to history', () => {
  const cm = createConversationManager()
  cm.pushUserMessage('req1', 'assistant1', 'hello')
  assert(cm.getHistory().length === 1, 'history has one entry')
  assert(cm.getHistory()[0].role === 'user', 'role is user')
  assert(cm.getHistory()[0].content === 'hello', 'content matches')
})

test('getCurrentAssistantSegment returns only messages for that assistant', () => {
  const cm = createConversationManager()
  cm.pushUserMessage('req1', 'assistant_a', 'msg-a')
  cm.pushAssistantMessage('req1', 'assistant_a', 'response-a')
  cm.pushBoundary('assistant_b')
  cm.pushUserMessage('req2', 'assistant_b', 'msg-b')
  const segmentB = cm.getCurrentAssistantSegment('assistant_b')
  assert(segmentB.length === 1, 'segment B has 1 message')
  assert(segmentB[0].content === 'msg-b', 'segment B has correct content')
})

test('clearHistory resets to empty', () => {
  const cm = createConversationManager()
  cm.pushUserMessage('req1', 'assistant_a', 'hello')
  cm.clearHistory()
  assert(cm.getHistory().length === 0, 'history cleared')
})

console.log('ConversationManager tests passed')
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx tsx tests/sdk/conversationManager.test.ts
```

Expected: FAIL with "Cannot find module '../../src/core/sdk/conversationManager'".

- [ ] **Step 3: Create ConversationManager**

Move the `messageHistory` state and related functions from `main.ts` into this new module. In `main.ts`, locate the following functions (search by name) and move them to `conversationManager.ts`, adapting them to operate on an internal array:

- `messageHistory` array (line ~169) → internal state
- `generateMessageId()` (line ~243) → internal helper
- `generateRequestId()` (line ~248) → exported
- `getCurrentAssistantSegment()` (line ~256) → exported as method on manager
- `sendAssistantMessage()` (line ~332) → becomes `pushAssistantMessage()` on manager (remove `figma.ui.postMessage` call — that stays in main)
- `replaceStatusMessage()` (line ~389) → exported as method on manager (remove `figma.ui.postMessage` call)
- The `pushUserMessage`, `pushBoundary`, `clearHistory` ops scattered across main.ts → collected as methods

```typescript
// src/core/sdk/conversationManager.ts
/**
 * ConversationManager — owns the message history for the current plugin session.
 * Main thread creates one instance at startup and passes it to handlers/executor.
 * figma.ui.postMessage calls for UI updates remain in main.ts (not here).
 */

export type MessageRole = 'user' | 'assistant' | 'system'

export interface Message {
  id: string
  role: MessageRole
  content: string
  assistantId?: string
  requestId?: string
  isStatus?: boolean
  isBoundary?: boolean
}

export interface ConversationManager {
  getHistory(): Message[]
  getCurrentAssistantSegment(assistantId: string): Message[]
  pushUserMessage(requestId: string, assistantId: string, content: string): Message
  pushAssistantMessage(requestId: string, assistantId: string, content: string, isStatus?: boolean): Message
  pushBoundary(nextAssistantId: string): void
  replaceStatusForRequest(requestId: string, content: string, isError?: boolean): Message | null
  clearHistory(): void
  generateRequestId(): string
}

function generateId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

export function createConversationManager(): ConversationManager {
  let history: Message[] = []

  return {
    getHistory: () => [...history],

    getCurrentAssistantSegment(assistantId: string): Message[] {
      // Find last boundary for this assistant, return messages after it
      let segmentStart = 0
      for (let i = history.length - 1; i >= 0; i--) {
        if (history[i].isBoundary && history[i].assistantId === assistantId) {
          segmentStart = i + 1
          break
        }
      }
      return history.slice(segmentStart).filter(
        m => !m.isBoundary && (m.assistantId === assistantId || m.role !== 'assistant')
      )
    },

    pushUserMessage(requestId, assistantId, content): Message {
      const msg: Message = { id: generateId(), role: 'user', content, assistantId, requestId }
      history.push(msg)
      return msg
    },

    pushAssistantMessage(requestId, assistantId, content, isStatus = false): Message {
      const msg: Message = { id: generateId(), role: 'assistant', content, assistantId, requestId, isStatus }
      history.push(msg)
      return msg
    },

    pushBoundary(nextAssistantId): void {
      history.push({ id: generateId(), role: 'system', content: '', assistantId: nextAssistantId, isBoundary: true })
    },

    replaceStatusForRequest(requestId, content, isError = false): Message | null {
      const idx = history.findIndex(m => m.requestId === requestId && m.isStatus === true)
      if (idx === -1) return null
      const updated: Message = { ...history[idx], content, isStatus: false }
      history[idx] = updated
      return updated
    },

    clearHistory(): void { history = [] },

    generateRequestId,
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx tsx tests/sdk/conversationManager.test.ts
```

Expected: all ✓.

- [ ] **Step 5: Update main.ts to import ConversationManager**

In `main.ts`, replace the inline `messageHistory` array and its associated functions with a `ConversationManager` instance:

```typescript
// Add near top of main.ts imports:
import { createConversationManager, generateRequestId } from './core/sdk/conversationManager'

// Replace:  let messageHistory: Message[] = []
// With:     const conversationManager = createConversationManager()
```

Update each call site in `main.ts`:
- `messageHistory.push(userMessage)` → `conversationManager.pushUserMessage(...)`
- `getCurrentAssistantSegment(messageHistory, ...)` → `conversationManager.getCurrentAssistantSegment(...)`
- `replaceStatusMessage(requestId, content, isError)` → calls `conversationManager.replaceStatusForRequest(...)` then posts to UI
- `messageHistory = []` (on `CLEAR_MESSAGES`) → `conversationManager.clearHistory()`
- `generateRequestId()` → imported directly (already pure)

**Do not remove `figma.ui.postMessage` calls from main.ts.** Those stay in main — the manager only owns the history array.

- [ ] **Step 6: Build and test**

```bash
npm run build && npm run test
```

Expected: green.

- [ ] **Step 7: Commit**

```bash
git add src/core/sdk/conversationManager.ts tests/sdk/conversationManager.test.ts src/main.ts
git commit -m "refactor(sdk): extract ConversationManager from main.ts (Phase 1)"
```

---

### Task 6: Extract StatusChannel from main.ts

**Files:**
- Create: `src/core/sdk/statusChannel.ts`
- Modify: `src/main.ts`
- Create: `tests/sdk/statusChannel.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/sdk/statusChannel.test.ts
import { createStatusChannel } from '../../src/core/sdk/statusChannel'

function assert(condition: boolean, msg: string): void {
  if (!condition) throw new Error(`FAIL: ${msg}`)
}
function test(name: string, fn: () => void): void {
  try { fn(); console.log(`  ✓ ${name}`) }
  catch (e) { console.error(`  ✗ ${name}:`, (e as Error).message); process.exit(1) }
}

// Collect posted messages for assertions
const posted: Array<{ type: string; payload: unknown }> = []
function mockPost(type: string, payload: unknown) { posted.push({ type, payload }) }

test('replaceStatusMessage emits REPLACE_STATUS event', () => {
  const ch = createStatusChannel(mockPost)
  ch.replaceStatusMessage('req1', 'Done.')
  const ev = posted.find(p => p.type === 'REPLACE_STATUS')
  assert(ev !== undefined, 'REPLACE_STATUS event emitted')
  assert((ev!.payload as { requestId: string }).requestId === 'req1', 'requestId matches')
})

test('sendAssistantMessage emits ASSISTANT_MESSAGE event', () => {
  const ch = createStatusChannel(mockPost)
  ch.sendAssistantMessage('Hello world')
  const ev = posted.find(p => p.type === 'ASSISTANT_MESSAGE')
  assert(ev !== undefined, 'ASSISTANT_MESSAGE event emitted')
})

test('updateStatusStep emits STATUS_STEP event', () => {
  const ch = createStatusChannel(mockPost)
  ch.updateStatusStep('req1', 'Scanning...')
  const ev = posted.find(p => p.type === 'STATUS_STEP')
  assert(ev !== undefined, 'STATUS_STEP event emitted')
})

console.log('StatusChannel tests passed')
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx tsx tests/sdk/statusChannel.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create StatusChannel**

```typescript
// src/core/sdk/statusChannel.ts
/**
 * StatusChannel — typed wrapper for all UI status/message posting.
 * Receives a post function (wrapping figma.ui.postMessage) injected by main.ts.
 * Keeps all message type strings in one place and out of main.ts.
 */

export type PostFn = (type: string, payload: unknown) => void

export interface StatusChannel {
  replaceStatusMessage(requestId: string, content: string, isError?: boolean): void
  sendAssistantMessage(content: string, toolCallId?: string, requestId?: string): void
  updateStatusStep(requestId: string, step: string): void
}

export function createStatusChannel(post: PostFn): StatusChannel {
  return {
    replaceStatusMessage(requestId, content, isError = false): void {
      post('REPLACE_STATUS', { requestId, content, isError })
    },
    sendAssistantMessage(content, toolCallId, requestId): void {
      post('ASSISTANT_MESSAGE', { content, toolCallId, requestId })
    },
    updateStatusStep(requestId, step): void {
      post('STATUS_STEP', { requestId, step })
    },
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx tsx tests/sdk/statusChannel.test.ts
```

Expected: all ✓.

- [ ] **Step 5: Wire StatusChannel into main.ts**

In `main.ts`, instantiate `StatusChannel` after `figma.showUI` and replace all inline `figma.ui.postMessage({ pluginMessage: { type: 'REPLACE_STATUS', ... } })` patterns and `figma.ui.postMessage({ pluginMessage: { type: 'ASSISTANT_MESSAGE', ... } })` patterns with calls to the channel:

```typescript
import { createStatusChannel } from './core/sdk/statusChannel'

// After figma.showUI:
const statusChannel = createStatusChannel((type, payload) => {
  figma.ui.postMessage({ pluginMessage: { type, ...payload as object } })
})
```

Then replace:
- `sendAssistantMessage(content, toolCallId, requestId)` in main.ts → `statusChannel.sendAssistantMessage(content, toolCallId, requestId)`
- `replaceStatusMessage(requestId, content, isError)` in main.ts → `statusChannel.replaceStatusMessage(requestId, content, isError)`
- `updateStatusStep` calls → `statusChannel.updateStatusStep(...)`

**Also update `HandlerContext.replaceStatusMessage` to call the channel** — verify `src/core/assistants/handlers/base.ts` `HandlerContext` interface signature stays compatible.

- [ ] **Step 6: Build and test**

```bash
npm run build && npm run test
```

Expected: green.

- [ ] **Step 7: Commit**

```bash
git add src/core/sdk/statusChannel.ts tests/sdk/statusChannel.test.ts src/main.ts
git commit -m "refactor(sdk): extract StatusChannel from main.ts (Phase 1)"
```

---

### Task 7: Extract SelectionResolver from main.ts

**Files:**
- Create: `src/core/sdk/selectionResolver.ts`
- Modify: `src/main.ts`

Note: `src/core/figma/selectionResolver.ts` already exists and implements `resolveSelection`. The SDK `SelectionResolver` wraps it alongside `buildSelectionContext` into one cohesive SDK service.

- [ ] **Step 1: Verify what already exists**

```bash
grep -n "export" src/core/figma/selectionResolver.ts | head -10
grep -n "export" src/core/context/selectionContext.ts | head -10
```

- [ ] **Step 2: Create SDK SelectionResolver wrapper**

```typescript
// src/core/sdk/selectionResolver.ts
/**
 * SDK SelectionResolver — combines resolveSelection + buildSelectionContext
 * into one service so SDK consumers have a single import point.
 */
import { resolveSelection, type ResolvedSelection } from '../figma/selectionResolver'
import { buildSelectionContext, type SelectionContext } from '../context/selectionContext'
import type { QuickAction } from '../../src/assistants'  // adjust path if needed
import type { Provider } from '../provider/provider'

export type { ResolvedSelection, SelectionContext }

export interface SelectionResolverOptions {
  selectionOrder: string[]
  quickAction?: QuickAction
  provider?: Provider
}

export interface SelectionResolverService {
  resolve(opts: Pick<SelectionResolverOptions, 'selectionOrder'> & { containerStrategy?: 'expand' | 'direct'; skipHidden?: boolean }): Promise<ResolvedSelection>
  buildContext(opts: SelectionResolverOptions): Promise<SelectionContext>
}

export function createSelectionResolver(): SelectionResolverService {
  return {
    async resolve({ selectionOrder, containerStrategy = 'expand', skipHidden = true }) {
      return resolveSelection(selectionOrder, { containerStrategy, skipHidden })
    },
    async buildContext({ selectionOrder, quickAction, provider }) {
      return buildSelectionContext({ selectionOrder, quickAction, provider })
    },
  }
}
```

- [ ] **Step 3: Wire into main.ts**

Add `import { createSelectionResolver } from './core/sdk/selectionResolver'` and replace direct `resolveSelection` / `buildSelectionContext` calls in main.ts with service calls. This is a thin wrapper — behavior is unchanged.

- [ ] **Step 4: Build and test**

```bash
npm run build && npm run test
```

Expected: green.

- [ ] **Step 5: Commit**

```bash
git add src/core/sdk/selectionResolver.ts src/main.ts
git commit -m "refactor(sdk): extract SelectionResolver from main.ts (Phase 1)"
```

---

### Task 8: Extract QuickActionExecutor from main.ts

**Files:**
- Create: `src/core/sdk/quickActionExecutor.ts`
- Modify: `src/main.ts`

This is the largest extraction. The `RUN_QUICK_ACTION` handler in `main.ts` (~500 lines starting at line ~792) becomes `QuickActionExecutor`.

- [ ] **Step 1: Understand the current structure**

```bash
sed -n '782,900p' src/main.ts
```

Note the `resolveExecutionType()` helper and the main dispatch block that branches on `(assistantId, actionId)`.

- [ ] **Step 2: Create QuickActionExecutor**

```typescript
// src/core/sdk/quickActionExecutor.ts
/**
 * QuickActionExecutor — owns the RUN_QUICK_ACTION dispatch logic.
 * Receives injected dependencies (conversationManager, statusChannel, provider, etc.)
 * so it has no direct plugin globals.
 * main.ts calls executor.run(actionId, assistantId) and awaits it.
 */
import type { ConversationManager } from './conversationManager'
import type { StatusChannel } from './statusChannel'
import type { SelectionResolverService } from './selectionResolver'
import { getHandler } from '../assistants/handlers/index'
import { getAssistant } from '../../src/assistants/index'
import type { Provider } from '../provider/provider'

export interface QuickActionExecutorDeps {
  conversationManager: ConversationManager
  statusChannel: StatusChannel
  selectionResolver: SelectionResolverService
  getProvider: () => Provider | null
  selectionOrder: () => string[]
  postMessage: (type: string, payload: unknown) => void
}

export interface QuickActionExecutor {
  run(actionId: string, assistantId: string): Promise<void>
}

export function createQuickActionExecutor(deps: QuickActionExecutorDeps): QuickActionExecutor {
  return {
    async run(actionId: string, assistantId: string): Promise<void> {
      // Move entire RUN_QUICK_ACTION body here from main.ts.
      // Access deps.conversationManager, deps.statusChannel, deps.selectionResolver, etc.
      // instead of closure variables.
      // See main.ts on<RunQuickActionHandler>('RUN_QUICK_ACTION', ...) body.
      throw new Error('Not yet implemented — see migration note below')
    }
  }
}
```

> **Migration note:** Move the complete `on<RunQuickActionHandler>('RUN_QUICK_ACTION', ...)` function body from `main.ts` into `executor.run()`. Replace all references to:
> - `messageHistory.*` → `deps.conversationManager.*`
> - `replaceStatusMessage(...)` → `deps.statusChannel.replaceStatusMessage(...)`
> - `sendAssistantMessage(...)` → `deps.statusChannel.sendAssistantMessage(...)`
> - `buildSelectionContext(...)` → `deps.selectionResolver.buildContext(...)`
> - `currentProvider` → `deps.getProvider()`
> - `selectionOrder` → `deps.selectionOrder()`
> - `figma.ui.postMessage(...)` → `deps.postMessage(...)`

- [ ] **Step 3: Wire executor into main.ts**

```typescript
// In main.ts after creating all services:
const executor = createQuickActionExecutor({
  conversationManager,
  statusChannel,
  selectionResolver,
  getProvider: () => currentProvider,
  selectionOrder: () => selectionOrder,
  postMessage: (type, payload) => figma.ui.postMessage({ pluginMessage: { type, ...payload as object } }),
})

// Replace the RUN_QUICK_ACTION body with:
on<RunQuickActionHandler>('RUN_QUICK_ACTION', async (actionId, assistantId) => {
  await executor.run(actionId, assistantId)
})
```

- [ ] **Step 4: Build and test**

```bash
npm run build && npm run test
```

Expected: green.

- [ ] **Step 5: Commit**

```bash
git add src/core/sdk/quickActionExecutor.ts src/main.ts
git commit -m "refactor(sdk): extract QuickActionExecutor from main.ts (Phase 1)"
```

---

### Task 9: Verify main.ts is a thin coordinator

**Files:**
- Modify: `src/main.ts` (verify, remove dead code)

- [ ] **Step 1: Check main.ts size after extractions**

```bash
wc -l src/main.ts
```

Target: under 400 lines. If still over 500, there is more to extract — read the remaining large blocks and identify what belongs in a service.

- [ ] **Step 2: Verify the coordinator rule**

```bash
grep -n "messageHistory\|scanSelectionSmart\|buildSelectionContext\|getCurrentAssistantSegment" src/main.ts
```

Expected: zero results. If any remain, they are leaks — move them to the appropriate service.

- [ ] **Step 3: Build and test**

```bash
npm run build && npm run test
```

Expected: green.

- [ ] **Step 4: Commit**

```bash
git add src/main.ts
git commit -m "refactor(sdk): finalize main.ts as thin coordinator (Phase 1)"
```

---

### Task 10: Extract UI controllers and thin ui.tsx

**Files:**
- Create: `src/ui/controllers/AnalyticsTaggingController.tsx`
- Create: `src/ui/controllers/ContentTableController.tsx`
- Create: `src/ui/controllers/DesignCritiqueController.tsx`
- Create: `src/ui/controllers/DesignWorkshopController.tsx`
- Create: `src/ui/controllers/GeneralController.tsx`
- Create: `src/ui/controllers/Code2DesignController.tsx`
- Create: `src/ui/controllers/DiscoveryController.tsx`
- Create: `src/ui/controllers/SmartDetectorController.tsx`
- Create: `src/ui/services/viewportManager.ts`
- Create: `src/ui/services/uiStatusService.ts`
- Modify: `src/ui.tsx`

ui.tsx is 5,591 lines. This task extracts all assistant-specific state, quick-action dispatch, and message rendering into per-assistant controllers, leaving ui.tsx as a render root + message router.

- [ ] **Step 1: Map the current per-assistant sections in ui.tsx**

```bash
grep -n "assistantId === \|analytics_tagging\|content_table\|design_critique\|design_workshop\|general\|code2design\|discovery\|smart_detector" src/ui.tsx | head -40
```

Identify the block boundaries for each assistant's: state declarations, quick-action handler branches, and message/view rendering.

- [ ] **Step 2: Create controller interface**

```typescript
// src/ui/controllers/types.ts
import type { PluginMessage } from '../../core/types'

export interface AssistantController {
  /** Called when a plugin message arrives that this controller should handle */
  onPluginMessage(message: PluginMessage): void
  /** Called when the user clicks a quick action */
  onQuickAction(actionId: string): void
  /** Returns the React view for this assistant, or null if not active */
  renderView(): React.ReactElement | null
}
```

- [ ] **Step 3: Extract AnalyticsTaggingController**

Move all code in `ui.tsx` that is gated on `assistantId === 'analytics_tagging'` into `src/ui/controllers/AnalyticsTaggingController.tsx`. This includes:
- All state hooks: `session`, `nearMisses`, analytics-specific state
- All `case 'ANALYTICS_TAGGING_*'` message handlers
- The `AnalyticsTaggingView` rendering branch
- Quick action handlers: `copy-table`, `new-session`, `get-analytics-tags`, `append-analytics-tags`, `fix-annotation-near-misses`, `add-annotations`

```typescript
// src/ui/controllers/AnalyticsTaggingController.tsx
import React, { useState } from 'react'
import type { Session, Row } from '../../core/analyticsTagging/types'
import type { NearMissInfo } from '../../types'
// ... import AnalyticsTaggingView

export function useAnalyticsTaggingController(emit: (event: string, ...args: unknown[]) => void) {
  const [session, setSession] = useState<Session | null>(null)
  const [nearMisses, setNearMisses] = useState<NearMissInfo[]>([])
  // Move all analytics tagging state here

  function handleMessage(type: string, payload: unknown): boolean {
    // Returns true if this controller handled the message
    switch (type) {
      case 'ANALYTICS_TAGGING_SESSION_UPDATED': { setSession((payload as { session: Session }).session); return true }
      case 'ANALYTICS_TAGGING_NEAR_MISSES': { setNearMisses((payload as { nearMisses: NearMissInfo[] }).nearMisses); return true }
      case 'ANALYTICS_TAGGING_ADD_ANNOTATIONS_DONE': { /* handle */ return true }
      default: return false
    }
  }

  function handleQuickAction(actionId: string): boolean {
    // Returns true if handled
    const analyticsActions = new Set(['copy-table', 'new-session', 'get-analytics-tags',
      'append-analytics-tags', 'fix-annotation-near-misses', 'add-annotations'])
    if (!analyticsActions.has(actionId)) return false
    emit('RUN_QUICK_ACTION', actionId, 'analytics_tagging')
    return true
  }

  function renderView(isActive: boolean): React.ReactElement | null {
    if (!isActive) return null
    return <AnalyticsTaggingView session={session} nearMisses={nearMisses} /* ... */ />
  }

  return { handleMessage, handleQuickAction, renderView }
}
```

Repeat this pattern for each of the 7 remaining controllers.

- [ ] **Step 4: Extract ViewportManager**

```typescript
// src/ui/services/viewportManager.ts
/**
 * ViewportManager — owns viewport scroll and stage positioning logic extracted from ui.tsx.
 */
export interface ViewportManager {
  scrollToTop(): void
  scrollToBottom(): void
  // Add methods matching the current inline viewport logic in ui.tsx
}

export function createViewportManager(): ViewportManager {
  return {
    scrollToTop() { window.scrollTo({ top: 0, behavior: 'smooth' }) },
    scrollToBottom() { window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' }) },
  }
}
```

- [ ] **Step 5: Thin ui.tsx**

After extracting all controllers, `ui.tsx` should contain only:
- React render root / `App` component
- `pluginMessage` event listener that routes to controllers
- Global state: `mode`, `editorType`, `assistantId`
- Controller instantiation and wiring

Verify the coordinator rule:

```bash
grep -n "analytics_tagging\|content_table\|design_critique\|design_workshop\|code2design\|discovery\|smart_detector" src/ui.tsx | grep -v "assistantId\|controller\|Controller\|register"
```

Expected: zero or near-zero results (only controller registration lines).

- [ ] **Step 6: Check ui.tsx line count**

```bash
wc -l src/ui.tsx
```

Target: under 300 lines. If over 500, continue extracting.

- [ ] **Step 7: Build and test**

```bash
npm run build && npm run test
```

Expected: green.

- [ ] **Step 8: Commit**

```bash
git add src/ui/controllers/ src/ui/services/ src/ui.tsx
git commit -m "refactor(sdk): extract UI controllers + thin ui.tsx (Phase 1)"
```

---

## Phase 2: Route Smart Detector Through Port

**Checkpoint:** `npm run build && npm run test` must pass before starting.

### Task 11: Implement FigmaNodeSerializer and DefaultSmartDetectionEngine

**Files:**
- Create: `src/core/sdk/adapters/figmaNodeSerializer.ts`
- Create: `src/core/detection/smartDetector/DefaultSmartDetectionEngine.ts`
- Create: `tests/sdk/smartDetectionPort.test.ts`

- [ ] **Step 1: Write failing test for DefaultSmartDetectionEngine**

```typescript
// tests/sdk/smartDetectionPort.test.ts
// Note: SceneNode is a Figma API type — we use a minimal mock here.
import { DefaultSmartDetectionEngine } from '../../src/core/detection/smartDetector/DefaultSmartDetectionEngine'
import type { SmartDetectionPort } from '../../src/core/sdk/ports/SmartDetectionPort'

function assert(condition: boolean, msg: string): void {
  if (!condition) throw new Error(`FAIL: ${msg}`)
}
function test(name: string, fn: () => Promise<void>): Promise<void> {
  return fn().then(() => console.log(`  ✓ ${name}`)).catch(e => { console.error(`  ✗ ${name}:`, e.message); process.exit(1) })
}

async function run() {
  const engine: SmartDetectionPort = new DefaultSmartDetectionEngine()

  // Minimal mock SceneNode that matches the shape the serializer reads
  const mockNode = {
    id: 'node-1',
    name: 'Submit Button',
    type: 'FRAME',
    x: 0, y: 0, width: 120, height: 40,
    visible: true,
    children: [],
    fills: [],
    opacity: 1,
  } as unknown as SceneNode

  await test('implements SmartDetectionPort interface', async () => {
    assert(typeof engine.detect === 'function', 'detect method exists')
  })

  await test('detect returns SmartDetectionResult array', async () => {
    const results = await engine.detect([mockNode])
    assert(Array.isArray(results), 'returns array')
    assert(results.length === 1, 'one result per root')
    assert(typeof results[0].sourceRef === 'string', 'sourceRef is string')
    assert(typeof results[0].root === 'object', 'root is object')
    assert(typeof results[0].summary === 'object', 'summary is object')
  })

  console.log('SmartDetectionPort tests passed')
}
run()
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx tsx tests/sdk/smartDetectionPort.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create FigmaNodeSerializer**

```typescript
// src/core/sdk/adapters/figmaNodeSerializer.ts
/**
 * FigmaNodeSerializer — converts Figma SceneNode to plain FigmaNode JSON.
 * FigmaNode is the input format for SD-T's traverseFigmaNode().
 * This is a host-owned adapter — lives here regardless of which SD engine is active.
 */

export interface FigmaNodeStyle {
  fontSize?: number
  fontWeight?: number
  fontFamily?: string
  fontStyle?: string
  letterSpacingPx?: number
  lineHeightPx?: number
  textAlign?: string
  textDecoration?: string
}

export interface FigmaNodeFill {
  type: string
  color?: { r: number; g: number; b: number; a: number }
}

/** Plain JSON representation of a Figma node — safe to serialize, no SceneNode refs. */
export interface FigmaNodeJSON {
  id: string
  name?: string
  type: string
  x?: number
  y?: number
  width?: number
  height?: number
  fills?: FigmaNodeFill[]
  characters?: string
  style?: FigmaNodeStyle
  cornerRadius?: number
  opacity?: number
  visible?: boolean
  strokeWeight?: number
  layoutMode?: string
  primaryAxisAlignItems?: string
  counterAxisAlignItems?: string
  paddingLeft?: number
  paddingRight?: number
  paddingTop?: number
  paddingBottom?: number
  itemSpacing?: number
  children?: FigmaNodeJSON[]
}

function readStyle(node: TextNode): FigmaNodeStyle {
  return {
    fontSize: typeof node.fontSize === 'number' ? node.fontSize : undefined,
    fontFamily: typeof (node.fontName as FontName).family === 'string' ? (node.fontName as FontName).family : undefined,
    fontStyle: typeof (node.fontName as FontName).style === 'string' ? (node.fontName as FontName).style : undefined,
  }
}

export function serializeFigmaNode(node: SceneNode): FigmaNodeJSON {
  const base: FigmaNodeJSON = {
    id: node.id,
    name: node.name,
    type: node.type,
    visible: 'visible' in node ? (node as { visible: boolean }).visible : true,
    opacity: 'opacity' in node ? (node as { opacity: number }).opacity : 1,
  }

  if ('x' in node) base.x = (node as { x: number }).x
  if ('y' in node) base.y = (node as { y: number }).y
  if ('width' in node) base.width = (node as { width: number }).width
  if ('height' in node) base.height = (node as { height: number }).height
  if ('fills' in node) {
    const fills = (node as { fills: readonly Paint[] }).fills
    if (Array.isArray(fills)) {
      base.fills = fills.map(f => ({
        type: f.type,
        color: f.type === 'SOLID' ? (f as SolidPaint).color : undefined,
      }))
    }
  }
  if (node.type === 'TEXT') {
    const t = node as TextNode
    base.characters = t.characters
    base.style = readStyle(t)
  }
  if ('cornerRadius' in node && typeof (node as { cornerRadius: number }).cornerRadius === 'number') {
    base.cornerRadius = (node as { cornerRadius: number }).cornerRadius
  }
  if ('strokeWeight' in node && typeof (node as { strokeWeight: number }).strokeWeight === 'number') {
    base.strokeWeight = (node as { strokeWeight: number }).strokeWeight
  }
  if ('layoutMode' in node) {
    const f = node as FrameNode
    base.layoutMode = f.layoutMode
    base.paddingLeft = f.paddingLeft
    base.paddingRight = f.paddingRight
    base.paddingTop = f.paddingTop
    base.paddingBottom = f.paddingBottom
    base.itemSpacing = f.itemSpacing
  }
  if ('children' in node) {
    base.children = (node as ChildrenMixin).children
      .filter(c => 'visible' in c ? (c as SceneNode & { visible: boolean }).visible : true)
      .map(c => serializeFigmaNode(c as SceneNode))
  }
  return base
}
```

- [ ] **Step 4: Create DefaultSmartDetectionEngine**

```typescript
// src/core/detection/smartDetector/DefaultSmartDetectionEngine.ts
/**
 * DefaultSmartDetectionEngine — wraps the current in-repo smart detector behind SmartDetectionPort.
 * This is the temporary engine. When SD-T is ready, replace with SDToolkitSmartDetectionEngine.
 * Consumers import SmartDetectionPort and never import this class directly.
 */
import type { SmartDetectionPort, SmartDetectionResult, DetectedElement, SmartDetectionSummary } from '../../sdk/ports/SmartDetectionPort'
import { scanSelectionSmart } from './index'
import type { SmartDetectorResult, DetectedElement as InternalDetected, Confidence } from './types'

function mapCertainty(confidence: Confidence): SmartDetectionResult['root']['certainty'] {
  switch (confidence) {
    case 'high': return 'exact'
    case 'med': return 'inferred'
    case 'low': return 'weak'
    default: return 'unknown'
  }
}

function mapElements(elements: InternalDetected[]): Map<string, DetectedElement> {
  const map = new Map<string, DetectedElement>()
  for (const el of elements) {
    map.set(el.nodeId, {
      id: el.nodeId,
      candidateType: el.kind,
      category: null,
      certainty: mapCertainty(el.confidence),
      rationale: el.reasons.join('; '),
      matchedSignals: el.reasons,
      ambiguous: false,
      children: [],
    })
  }
  return map
}

function buildResult(root: SceneNode, result: SmartDetectorResult): SmartDetectionResult {
  const elementMap = mapElements(result.elements)
  const rootElement: DetectedElement = elementMap.get(root.id) ?? {
    id: root.id,
    candidateType: null,
    category: null,
    certainty: 'unknown',
    rationale: 'root node',
    matchedSignals: [],
    ambiguous: false,
    children: Array.from(elementMap.values()),
  }
  const summary: SmartDetectionSummary = {
    total: result.stats.nodesScanned,
    exact: result.elements.filter(e => e.confidence === 'high').length,
    inferred: result.elements.filter(e => e.confidence === 'med').length,
    weak: result.elements.filter(e => e.confidence === 'low').length,
    unknown: 0,
    ambiguous: 0,
  }
  return { sourceRef: root.id, root: rootElement, summary }
}

export class DefaultSmartDetectionEngine implements SmartDetectionPort {
  async detect(roots: readonly SceneNode[]): Promise<SmartDetectionResult[]> {
    return Promise.all(
      [...roots].map(async root => {
        const result = await scanSelectionSmart([root], {})
        return buildResult(root, result)
      })
    )
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

```bash
npx tsx tests/sdk/smartDetectionPort.test.ts
```

Expected: all ✓.

- [ ] **Step 6: Build and test**

```bash
npm run build && npm run test
```

Expected: green.

- [ ] **Step 7: Commit**

```bash
git add src/core/sdk/adapters/figmaNodeSerializer.ts src/core/detection/smartDetector/DefaultSmartDetectionEngine.ts tests/sdk/smartDetectionPort.test.ts
git commit -m "feat(sdk): add FigmaNodeSerializer + DefaultSmartDetectionEngine (Phase 2)"
```

---

### Task 12: Route all Smart Detector consumers through the port

**Files:**
- Modify: `src/core/assistants/handlers/smartDetector.ts`
- Modify: `src/core/analyticsTagging/autoAnnotator.ts`
- Modify: `scripts/assert-invariants.ts`

- [ ] **Step 1: Update SmartDetectorHandler to use port**

In `src/core/assistants/handlers/smartDetector.ts`:

Remove:
```typescript
import { scanSelectionSmart } from '../../detection/smartDetector'
```

Add:
```typescript
import { DefaultSmartDetectionEngine } from '../../detection/smartDetector/DefaultSmartDetectionEngine'
import type { SmartDetectionPort, SmartDetectionResult } from '../../sdk/ports/SmartDetectionPort'

const sdPort: SmartDetectionPort = new DefaultSmartDetectionEngine()
```

Replace:
```typescript
const result = await scanSelectionSmart(roots, {})
const message = formatSummary(result)
```

With:
```typescript
const [sdResult] = await sdPort.detect(roots)
const message = formatSummaryFromPort(sdResult)
```

Add `formatSummaryFromPort`:
```typescript
function formatSummaryFromPort(result: SmartDetectionResult): string {
  // Map SmartDetectionResult → SmartDetectorResult shape for existing formatter
  // OR call formatSmartDetectorReport with adapted data
  const adapted = {
    elements: result.root.children.map(el => ({
      kind: el.candidateType ?? 'unknown',
      confidence: el.certainty === 'exact' ? 'high' as const : el.certainty === 'inferred' ? 'med' as const : 'low' as const,
      reasons: el.matchedSignals,
      nodeId: el.id,
    })),
    content: [],
    patterns: [],
    stats: { nodesScanned: result.summary.total, elementsByKind: {}, contentByKind: {}, patternCount: 0 },
  }
  const md = formatSmartDetectorReport(adapted)
  return renderForChat(md)
}
```

- [ ] **Step 2: Update autoAnnotator.ts to use port**

In `src/core/analyticsTagging/autoAnnotator.ts`:

Remove:
```typescript
import { scanSelectionSmart, type ElementKind } from '../detection/smartDetector'
```

Add:
```typescript
import { DefaultSmartDetectionEngine } from '../detection/smartDetector/DefaultSmartDetectionEngine'
import type { SmartDetectionPort } from '../sdk/ports/SmartDetectionPort'

const sdPort: SmartDetectionPort = new DefaultSmartDetectionEngine()
```

Replace all `scanSelectionSmart([root], ...)` calls with `sdPort.detect([root])` and adapt the result shape (map `SmartDetectionResult` → the expected field names).

- [ ] **Step 3: Add port compliance check to assert-invariants.ts**

In `scripts/assert-invariants.ts`, add a check that no file outside `DefaultSmartDetectionEngine.ts` imports from `src/core/detection/smartDetector/index.ts` or `src/core/detection/smartDetector/traversal.ts` etc.:

```typescript
// Invariant: SmartDetector consumers must use SmartDetectionPort, not direct imports
const sdDirectImports = await findImportsOf([
  'src/core/detection/smartDetector/index',
  'src/core/detection/smartDetector/traversal',
  'src/core/detection/smartDetector/elementClassifier',
  'src/core/detection/smartDetector/contentClassifier',
], { excludeFiles: ['src/core/detection/smartDetector/DefaultSmartDetectionEngine.ts'] })

if (sdDirectImports.length > 0) {
  errors.push(`SmartDetector port violation: direct imports found in: ${sdDirectImports.join(', ')}`)
}
```

- [ ] **Step 4: Build, test, and run invariants**

```bash
npm run build && npm run test && npm run invariants
```

Expected: green.

- [ ] **Step 5: Commit**

```bash
git add src/core/assistants/handlers/smartDetector.ts src/core/analyticsTagging/autoAnnotator.ts scripts/assert-invariants.ts
git commit -m "feat(sdk): route all SD consumers through SmartDetectionPort (Phase 2)"
```

---

## Phase 3: Route Design System Through Ports

**Checkpoint:** `npm run build && npm run test` must pass before starting.

### Task 13: Create DefaultDS engines and FigmaInstructionWalker

**Files:**
- Create: `src/core/sdk/adapters/figmaInstructionWalker.ts`
- Create: `src/core/designSystem/DefaultDSPromptEnrichmentEngine.ts`
- Create: `src/core/designSystem/DefaultDSQueryEngine.ts`
- Create: `src/core/designSystem/DefaultDSPlacementEngine.ts`
- Create: `tests/sdk/designSystemPort.test.ts`

- [ ] **Step 1: Write failing test for DS engines**

```typescript
// tests/sdk/designSystemPort.test.ts
import { DefaultDSPromptEnrichmentEngine } from '../../src/core/designSystem/DefaultDSPromptEnrichmentEngine'
import { DefaultDSQueryEngine } from '../../src/core/designSystem/DefaultDSQueryEngine'
import type { DSPromptEnrichmentPort, DSQueryPort } from '../../src/core/sdk/ports/DesignSystemPort'

function assert(condition: boolean, msg: string): void {
  if (!condition) throw new Error(`FAIL: ${msg}`)
}
async function test(name: string, fn: () => Promise<void>): Promise<void> {
  return fn().then(() => console.log(`  ✓ ${name}`)).catch(e => { console.error(`  ✗ ${name}:`, e.message); process.exit(1) })
}

async function run() {
  const enrichment: DSPromptEnrichmentPort = new DefaultDSPromptEnrichmentEngine()
  const query: DSQueryPort = new DefaultDSQueryEngine()

  await test('DSPromptEnrichmentPort: getKnowledgeSegment returns string or undefined', async () => {
    const result = enrichment.getKnowledgeSegment('general')
    assert(result === undefined || typeof result === 'string', 'returns string or undefined')
  })

  await test('DSQueryPort: getActiveDesignSystem returns null or DSContext', async () => {
    const ds = query.getActiveDesignSystem()
    assert(ds === null || (typeof ds === 'object' && typeof ds.name === 'string'), 'returns null or DSContext')
  })

  await test('DSQueryPort: searchComponents returns array', async () => {
    const results = await query.searchComponents('button')
    assert(Array.isArray(results), 'returns array')
  })

  console.log('DesignSystemPort tests passed')
}
run()
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx tsx tests/sdk/designSystemPort.test.ts
```

Expected: FAIL — modules not found.

- [ ] **Step 3: Create DefaultDSPromptEnrichmentEngine**

```typescript
// src/core/designSystem/DefaultDSPromptEnrichmentEngine.ts
/**
 * DefaultDSPromptEnrichmentEngine — wraps appendDesignSystemKnowledge behind DSPromptEnrichmentPort.
 * Temporary engine. When DS-T is ready, replace with DSToolkitPromptEnrichmentEngine.
 */
import type { DSPromptEnrichmentPort } from '../sdk/ports/DesignSystemPort'
import { appendDesignSystemKnowledge } from '../../custom/knowledge'

export class DefaultDSPromptEnrichmentEngine implements DSPromptEnrichmentPort {
  getKnowledgeSegment(_assistantId: string): string | undefined {
    // appendDesignSystemKnowledge takes a base string and appends DS knowledge
    // Return only the DS portion (non-empty when DS is configured and enabled)
    const enriched = appendDesignSystemKnowledge('')
    return enriched.trim().length > 0 ? enriched : undefined
  }
}
```

- [ ] **Step 4: Create DefaultDSQueryEngine**

```typescript
// src/core/designSystem/DefaultDSQueryEngine.ts
import type { DSQueryPort, DSComponentMatch, DSContext } from '../sdk/ports/DesignSystemPort'
import { searchComponents, listDesignSystemRegistries } from './assistantApi'

export class DefaultDSQueryEngine implements DSQueryPort {
  async searchComponents(query: string, _context?: string): Promise<DSComponentMatch[]> {
    // searchComponents is from assistantApi.ts — returns ComponentSearchResult[]
    const results = searchComponents(query)
    return results.map(r => ({
      canonicalKind: r.entry?.semanticType ?? r.name,
      componentName: r.name,
      description: r.description,
      registryId: r.registryId,
    }))
  }

  getActiveDesignSystem(): DSContext | null {
    const registries = listDesignSystemRegistries()
    if (registries.length === 0) return null
    const first = registries[0]
    return { name: first.name, theme: first.theme ?? 'default' }
  }
}
```

- [ ] **Step 5: Create FigmaInstructionWalker and DefaultDSPlacementEngine**

```typescript
// src/core/sdk/adapters/figmaInstructionWalker.ts
/**
 * FigmaInstructionWalker — converts DSLayerInstruction tree to actual Figma nodes.
 * This is a host-owned adapter. The host plugin always owns the final mapping
 * from instruction trees to real Figma component instances.
 */
import type { DSLayerInstruction } from '../ports/DesignSystemPort'

export async function walkInstructions(root: DSLayerInstruction, parent: FrameNode | PageNode): Promise<void> {
  const node = await createNode(root, parent)
  if (root.children && node && 'appendChild' in node) {
    for (const child of root.children) {
      await walkInstructions(child, node as FrameNode)
    }
  }
}

async function createNode(instruction: DSLayerInstruction, parent: FrameNode | PageNode): Promise<SceneNode | null> {
  switch (instruction.type) {
    case 'frame': {
      const frame = figma.createFrame()
      frame.name = instruction.name
      parent.appendChild(frame)
      return frame
    }
    case 'text': {
      const text = figma.createText()
      await figma.loadFontAsync({ family: 'Inter', style: 'Regular' })
      text.name = instruction.name
      text.characters = instruction.textContent ?? ''
      parent.appendChild(text)
      return text
    }
    case 'instance': {
      // Look up component by name in the current Figma document
      const component = figma.root.findOne(n => n.type === 'COMPONENT' && n.name === instruction.name) as ComponentNode | null
      if (!component) {
        console.warn(`[FigmaInstructionWalker] Component not found: ${instruction.name}`)
        return null
      }
      const instance = component.createInstance()
      if (instruction.textContent) {
        const textChild = instance.findOne(n => n.type === 'TEXT') as TextNode | null
        if (textChild) {
          await figma.loadFontAsync(textChild.fontName as FontName)
          textChild.characters = instruction.textContent
        }
      }
      parent.appendChild(instance)
      return instance
    }
    default: return null
  }
}
```

```typescript
// src/core/designSystem/DefaultDSPlacementEngine.ts
import type { DSPlacementPort, DSLayerInstruction } from '../sdk/ports/DesignSystemPort'
import { walkInstructions } from '../sdk/adapters/figmaInstructionWalker'

export class DefaultDSPlacementEngine implements DSPlacementPort {
  async executeInstructions(root: DSLayerInstruction): Promise<void> {
    await walkInstructions(root, figma.currentPage)
  }
}
```

- [ ] **Step 6: Run test to verify it passes**

```bash
npx tsx tests/sdk/designSystemPort.test.ts
```

Expected: all ✓.

- [ ] **Step 7: Build and test**

```bash
npm run build && npm run test
```

Expected: green.

- [ ] **Step 8: Commit**

```bash
git add src/core/sdk/adapters/figmaInstructionWalker.ts src/core/designSystem/Default*.ts tests/sdk/designSystemPort.test.ts
git commit -m "feat(sdk): add DS engines + FigmaInstructionWalker (Phase 3)"
```

---

### Task 14: Route all DS consumers through ports and add invariant check

**Files:**
- Modify: `src/custom/knowledge.ts`
- Modify: `src/core/tools/designSystemTools.ts`
- Modify: `src/core/designWorkshop/renderer.ts`
- Modify: `scripts/assert-invariants.ts`

- [ ] **Step 1: Update knowledge.ts to use DSPromptEnrichmentPort**

In `src/custom/knowledge.ts`, the `appendDesignSystemKnowledge` function currently imports from `registryLoader` and `searchIndex`. Route through the port:

```typescript
import { DefaultDSPromptEnrichmentEngine } from '../core/designSystem/DefaultDSPromptEnrichmentEngine'
import type { DSPromptEnrichmentPort } from '../core/sdk/ports/DesignSystemPort'

// Module-level port instance (initialized once)
let _dsEnrichment: DSPromptEnrichmentPort | null = null
function getDSEnrichment(): DSPromptEnrichmentPort {
  if (!_dsEnrichment) _dsEnrichment = new DefaultDSPromptEnrichmentEngine()
  return _dsEnrichment
}

export function appendDesignSystemKnowledge(baseContent: string): string {
  const segment = getDSEnrichment().getKnowledgeSegment('__global__')
  if (!segment) return baseContent
  return baseContent + '\n\n' + segment
}
```

- [ ] **Step 2: Update designSystemTools.ts to use DSQueryPort**

In `src/core/tools/designSystemTools.ts`, replace direct imports from `assistantApi.ts` with `DefaultDSQueryEngine`:

```typescript
import { DefaultDSQueryEngine } from '../designSystem/DefaultDSQueryEngine'
const dsQuery = new DefaultDSQueryEngine()
// Replace all searchComponents() / listDesignSystemRegistries() calls with dsQuery.* calls
```

- [ ] **Step 3: Update renderer.ts to use DSPlacementPort**

In `src/core/designWorkshop/renderer.ts`, the `createInstanceOnly` call from `componentService` and `getNuxtDemoAllowlist` from `nuxtDsRegistry` are used for component creation. Route component placement through `DefaultDSPlacementEngine` where applicable. **Leave nuxtDsRegistry as demo-only** — do not route it through the port in this phase.

- [ ] **Step 4: Add DS port compliance check to assert-invariants.ts**

```typescript
// In assert-invariants.ts:
const dsDirectImports = await findImportsOf([
  'src/core/designSystem/registryLoader',
  'src/core/designSystem/assistantApi',
  'src/core/designSystem/componentService',
  'src/core/designSystem/searchIndex',
], {
  excludeFiles: [
    'src/core/designSystem/DefaultDSPromptEnrichmentEngine.ts',
    'src/core/designSystem/DefaultDSQueryEngine.ts',
    'src/core/designSystem/DefaultDSPlacementEngine.ts',
  ]
})
if (dsDirectImports.length > 0) {
  errors.push(`DesignSystem port violation: direct imports found in: ${dsDirectImports.join(', ')}`)
}
```

- [ ] **Step 5: Build, test, and run invariants**

```bash
npm run build && npm run test && npm run invariants
```

Expected: green.

- [ ] **Step 6: Commit**

```bash
git add src/custom/knowledge.ts src/core/tools/designSystemTools.ts src/core/designWorkshop/renderer.ts scripts/assert-invariants.ts
git commit -m "feat(sdk): route all DS consumers through DesignSystem ports (Phase 3)"
```

---

## Phase 4: ACE Config Alignment

**Checkpoint:** `npm run build && npm run test && npm run invariants` must pass before starting.

### Task 15: Define AssistantConfig type and loader

**Files:**
- Create: `src/core/sdk/assistantConfig.ts`
- Create: `tests/sdk/assistantConfig.test.ts`

- [ ] **Step 1: Write failing test**

```typescript
// tests/sdk/assistantConfig.test.ts
import { defaultAssistantConfig, validateAssistantConfig } from '../../src/core/sdk/assistantConfig'

function assert(condition: boolean, msg: string): void {
  if (!condition) throw new Error(`FAIL: ${msg}`)
}
function test(name: string, fn: () => void): void {
  try { fn(); console.log(`  ✓ ${name}`) }
  catch (e) { console.error(`  ✗ ${name}:`, (e as Error).message); process.exit(1) }
}

test('defaultAssistantConfig has required fields', () => {
  const cfg = defaultAssistantConfig('general')
  assert(typeof cfg.assistantId === 'string', 'assistantId is string')
  assert(typeof cfg.llmEnabled === 'boolean', 'llmEnabled is boolean')
  assert(Array.isArray(cfg.kbAssignments), 'kbAssignments is array')
})

test('validateAssistantConfig returns true for valid config', () => {
  const cfg = defaultAssistantConfig('general')
  assert(validateAssistantConfig(cfg) === true, 'valid config passes validation')
})

test('validateAssistantConfig returns false for missing assistantId', () => {
  const cfg = { ...defaultAssistantConfig('general'), assistantId: '' }
  assert(validateAssistantConfig(cfg) === false, 'missing assistantId fails validation')
})

console.log('AssistantConfig tests passed')
```

- [ ] **Step 2: Run test to verify it fails**

```bash
npx tsx tests/sdk/assistantConfig.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Create AssistantConfig**

```typescript
// src/core/sdk/assistantConfig.ts
/**
 * AssistantConfig — ACE-owned per-assistant configuration.
 * Compiled to TS by pull-ace-config at build time. Read at runtime from generated TS.
 * Fields are forward-compatible with SD-T and DS-T settings; no coupling to temp engine internals.
 */

export interface AssistantConfig {
  assistantId: string

  // LLM
  llmEnabled: boolean

  // Knowledge bases
  kbAssignments: string[]               // KB IDs to inject for this assistant

  // Design system (DS-T ready — no coupling to registry internals)
  designSystemId?: string               // Active DS ID from ACE config
  designSystemTheme?: string

  // Vision / scanning gates
  visionEnabled: boolean
  smartDetectionEnabled: boolean

  // Quick action visibility
  hiddenQuickActionIds: string[]

  // Rate limiting hook
  rateLimitTier?: 'default' | 'elevated' | 'unrestricted'
}

export function defaultAssistantConfig(assistantId: string): AssistantConfig {
  return {
    assistantId,
    llmEnabled: true,
    kbAssignments: [],
    visionEnabled: true,
    smartDetectionEnabled: true,
    hiddenQuickActionIds: [],
  }
}

export function validateAssistantConfig(cfg: AssistantConfig): boolean {
  if (!cfg.assistantId) return false
  if (typeof cfg.llmEnabled !== 'boolean') return false
  if (!Array.isArray(cfg.kbAssignments)) return false
  return true
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
npx tsx tests/sdk/assistantConfig.test.ts
```

Expected: all ✓.

- [ ] **Step 5: Build and test**

```bash
npm run build && npm run test
```

Expected: green.

- [ ] **Step 6: Commit**

```bash
git add src/core/sdk/assistantConfig.ts tests/sdk/assistantConfig.test.ts
git commit -m "feat(sdk): add AssistantConfig type and loader (Phase 4)"
```

---

### Task 16: Wire AssistantConfig into pull-ace-config and runtime

**Files:**
- Modify: `scripts/pull-ace-config.ts`
- Modify: `src/core/sdk/index.ts`

- [ ] **Step 1: Read current pull-ace-config.ts**

```bash
head -80 scripts/pull-ace-config.ts
```

- [ ] **Step 2: Add AssistantConfig emission to pull-ace-config**

In `scripts/pull-ace-config.ts`, after pulling and writing the standard config fields, emit per-assistant config as `AssistantConfig[]` to a generated file:

```typescript
// In pull-ace-config.ts, after existing config generation:
import type { AssistantConfig } from '../src/core/sdk/assistantConfig'
import { defaultAssistantConfig } from '../src/core/sdk/assistantConfig'

function buildAssistantConfigs(aceData: Record<string, unknown>): AssistantConfig[] {
  const assistants = (aceData.assistants as { id: string }[] | undefined) ?? []
  return assistants.map(a => ({
    ...defaultAssistantConfig(a.id),
    // Map ACE fields to AssistantConfig fields
    llmEnabled: (a as { llmEnabled?: boolean }).llmEnabled ?? true,
    kbAssignments: (a as { kbs?: string[] }).kbs ?? [],
    designSystemId: (a as { designSystemId?: string }).designSystemId,
    visionEnabled: (a as { visionEnabled?: boolean }).visionEnabled ?? true,
    smartDetectionEnabled: (a as { smartDetectionEnabled?: boolean }).smartDetectionEnabled ?? true,
    hiddenQuickActionIds: (a as { hiddenActions?: string[] }).hiddenActions ?? [],
  }))
}

// Write assistantConfigs.generated.ts:
const configs = buildAssistantConfigs(aceData)
const configsTs = `// Generated by pull-ace-config — do not edit manually\nimport type { AssistantConfig } from '../core/sdk/assistantConfig'\nexport const ASSISTANT_CONFIGS: AssistantConfig[] = ${JSON.stringify(configs, null, 2)}\n`
fs.writeFileSync('src/custom/assistantConfigs.generated.ts', configsTs, 'utf-8')
```

- [ ] **Step 3: Export AssistantConfig from SDK barrel**

In `src/core/sdk/index.ts`, add:

```typescript
export type { AssistantConfig } from './assistantConfig'
export { defaultAssistantConfig, validateAssistantConfig } from './assistantConfig'
```

- [ ] **Step 4: Build and test**

```bash
npm run build && npm run test && npm run invariants
```

Expected: green.

- [ ] **Step 5: Commit**

```bash
git add scripts/pull-ace-config.ts src/core/sdk/index.ts
git commit -m "feat(sdk): wire AssistantConfig into pull-ace-config + SDK barrel (Phase 4)"
```

---

## Phase 6: Build and Registration Cleanup

### Task 17: Add drift detection checks to assert-invariants

**Files:**
- Modify: `scripts/assert-invariants.ts`

- [ ] **Step 1: Add manifest ↔ handler registration check**

In `scripts/assert-invariants.ts`, add:

```typescript
// Invariant: Every quick action in assistants.manifest.json must have a handler entry.
// This prevents manifest additions from silently having no handler.
import { ASSISTANTS } from '../src/assistants/assistants.generated'
import { getHandler } from '../src/core/assistants/handlers/index'

for (const assistant of ASSISTANTS) {
  for (const action of (assistant.quickActions ?? [])) {
    const handler = getHandler(assistant.id, action.id)
    if (handler === undefined) {
      // Non-LLM actions handled in UI are expected to have no main-thread handler — skip UI-only actions
      const uiOnlyActions = new Set(['copy-table', 'view-table', 'send-to-confluence', 'export-screenshots',
        'copy-ref-image', 'generate-new-table', 'send-json', 'get-json', 'json-format-help'])
      if (!uiOnlyActions.has(action.id)) {
        warnings.push(`No handler for action ${assistant.id}/${action.id} — add to handlers/index.ts or uiOnlyActions`)
      }
    }
  }
}
```

- [ ] **Step 2: Run invariants to verify the new check works**

```bash
npm run invariants
```

Expected: green (no existing drift).

- [ ] **Step 3: Commit**

```bash
git add scripts/assert-invariants.ts
git commit -m "feat(sdk): add manifest↔handler drift detection to assert-invariants (Phase 6)"
```

---

## Phase 7: Strike-Team Docs

### Task 18: Write SDK architecture and migration guide

**Files:**
- Create: `docs/sdk-architecture.md`
- Create: `docs/migration-guide-sdk.md`
- Create: `docs/strike-team-guide.md`

- [ ] **Step 1: Write SDK architecture doc**

```markdown
<!-- docs/sdk-architecture.md -->
# SDK Architecture

## Stable surface (safe to import)

| Module | What it is |
|---|---|
| `src/core/sdk/index.ts` | SDK barrel — import all port types from here |
| `src/core/sdk/ports/SmartDetectionPort.ts` | SmartDetectionPort + host-owned DTOs |
| `src/core/sdk/ports/DesignSystemPort.ts` | DS ports + host-owned DTOs |
| `src/core/sdk/conversationManager.ts` | ConversationManager |
| `src/core/sdk/statusChannel.ts` | StatusChannel |
| `src/core/sdk/selectionResolver.ts` | SelectionResolver |
| `src/core/sdk/quickActionExecutor.ts` | QuickActionExecutor |
| `src/core/sdk/assistantConfig.ts` | AssistantConfig |

## Internal (do not import from outside sdk/)

| Module | Why |
|---|---|
| `src/core/detection/smartDetector/*` (except DefaultSmartDetectionEngine) | In-repo engine, temp |
| `src/core/designSystem/registryLoader.ts` | In-repo engine internal |
| `src/core/designSystem/assistantApi.ts` | In-repo engine internal |
| `src/core/designSystem/componentService.ts` | In-repo engine internal |

## Replaceable engines

| Port | Current engine | Future engine (when ready) |
|---|---|---|
| SmartDetectionPort | DefaultSmartDetectionEngine | SDToolkitSmartDetectionEngine |
| DSPromptEnrichmentPort | DefaultDSPromptEnrichmentEngine | DSToolkitPromptEnrichmentEngine |
| DSQueryPort | DefaultDSQueryEngine | DSToolkitQueryEngine |
| DSPlacementPort | DefaultDSPlacementEngine | DSToolkitPlacementEngine |
```

- [ ] **Step 2: Write migration guide**

Document the engine swap procedure for SD-T and DS-T in `docs/migration-guide-sdk.md`:
- Build the toolkit: `pnpm build` in SD-T/DS-T repo
- Copy dist to `vendor/`
- Create `SDToolkitSmartDetectionEngine.ts` implementing `SmartDetectionPort`
- Register new engine in the point where `DefaultSmartDetectionEngine` is instantiated
- Run `npm run build && npm run test && npm run invariants`

- [ ] **Step 3: Write strike-team guide**

Document in `docs/strike-team-guide.md`:
- What a new assistant needs: a handler + manifest entry + (future) SKILL.md
- The `handlers/index.ts` registration pattern
- SDK services available via `src/core/sdk/index.ts`
- What NOT to import (in-repo engine internals)
- How to add a quick action

- [ ] **Step 4: Commit**

```bash
git add docs/sdk-architecture.md docs/migration-guide-sdk.md docs/strike-team-guide.md
git commit -m "docs(sdk): add SDK architecture, migration guide, strike-team guide (Phase 7)"
```

---

## Phase 5 Gating Note

**Phase 5 (SKILL.md authoring + ACE hybrid editing surface) is out of scope for this plan.**

Before executing Phase 5, a separate implementation plan is required that covers:
- Canonical SKILL.md parser and `AssistantSkill` TypeScript type definition
- `scripts/compile-skills.ts` build-time compiler (SKILL.md → `assistantSkills.generated.ts`)
- ACE React components: structured panels (Identity, Behavior list editor, Quick Action entries, Safety toggles)
- ACE source/preview mode integration
- Round-trip rule implementation (structured edit → SKILL.md canonical → re-derive structured view)
- Validation before save/publish (required fields, unknown section detection, diff before publish)
- Lossy-edit prevention (warn + require source-mode confirmation)
- Per-assistant migration from `promptTemplate` → SKILL.md (one assistant at a time)
- Backward-compatibility: existing `promptTemplate` assistants continue to work during migration

Trigger: write that sub-plan when the ACE React component architecture is ready to absorb the new editor panels.

---

## Self-Review

**Spec coverage check:**
- ✓ Phase 0 ports: Tasks 1–3
- ✓ Phase 1 shell surgery: Tasks 4–9
- ✓ Phase 2 SD routing: Tasks 11–12
- ✓ Phase 3 DS routing: Tasks 13–14
- ✓ Phase 4 ACE config: Tasks 15–16
- ✓ Phase 6 build cleanup: Task 17
- ✓ Phase 7 docs: Task 18
- ✓ North star hook (OutcomeRecord): Task 4
- ✓ Vendor dir setup: Task 3
- ✓ Host-owned DTOs (no toolkit imports in ports): Tasks 1–2
- ✓ Separate `assistantSkills.generated.ts`: noted in spec revisions, referenced in Phase 5 gating note
- ✓ `nuxtDsRegistry` demo-only: Task 14

**Type consistency check:**
- `SmartDetectionPort.detect(roots: readonly SceneNode[]): Promise<SmartDetectionResult[]>` — consistent from Task 1 definition through Task 11 implementation and Task 12 consumer usage
- `DSLayerInstruction` — defined in Task 2, implemented in Task 13 walker, used in Task 13 engine
- `ConversationManager` — defined in Task 5, wired in Task 5, used by QuickActionExecutor in Task 8
- `StatusChannel` — defined in Task 6, wired in Task 6, injected into executor in Task 8
- `AssistantConfig` — defined in Task 15, emitted in Task 16, exported in Task 16
