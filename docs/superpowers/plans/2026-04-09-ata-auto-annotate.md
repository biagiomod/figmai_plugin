# AT-A Auto-Annotate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an "Add Annotations" action to the Analytics Tagging Assistant that uses the Smart Detector to find interactive elements and writes placeholder ScreenID/ActionID annotations.

**Architecture:** A new pure-logic module `autoAnnotator.ts` contains all detection-to-annotation logic; the existing handler and UI are extended minimally. The manifest is the source of truth for quick action routing; the build regenerates the generated assistant file automatically.

**Tech Stack:** TypeScript, Preact, Figma Plugin API (annotations), Smart Detector (`scanSelectionSmart`), `@create-figma-plugin/utilities` (`emit`)

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `src/core/types.ts` | Modify | Add `AutoAnnotateResult` + `AnalyticsTaggingAddAnnotationsDoneMessage` |
| `src/core/analyticsTagging/autoAnnotator.ts` | **Create** | Pure helpers + `autoAnnotateScreens` |
| `tests/autoAnnotator.test.ts` | **Create** | Pure function tests + lightweight integration tests |
| `custom/assistants/analytics_tagging/manifest.json` | Modify | Add `add-annotations` quick action |
| `src/core/assistants/handlers/analyticsTagging.ts` | Modify | Add `add-annotations` handler branch |
| `src/ui/components/AnalyticsTaggingWelcome.tsx` | Modify | New `onAddAnnotations` / `isAddingAnnotations` props + button |
| `src/ui/components/AnalyticsTaggingView.tsx` | Modify | New `onAddAnnotations` / `isAddingAnnotations` props + button |
| `src/ui.tsx` | Modify | New state, handler, message case, wired props |
| `package.json` | Modify | Add `autoAnnotator.test.ts` to test script |

---

### Task 1: Add types to `src/core/types.ts`

**Files:**
- Modify: `src/core/types.ts`

- [ ] **Step 1: Add `AutoAnnotateResult` and the DONE message type**

Open `src/core/types.ts`. Find the Analytics Tagging section (search for `NearMissInfo`). Add the following after the `NearMissInfo` block:

```ts
/** Result returned by autoAnnotateScreens. All counts are non-negative integers. */
export interface AutoAnnotateResult {
  screensProcessed: number    // root frames processed
  screenIdAdded: number       // frames that received a new ScreenID annotation
  actionIdAdded: number       // total ActionID annotations written
  skippedExisting: number     // elements skipped because they already had ActionID (valid or near-miss)
  writeFailed: number         // nodes where safeSetNativeAnnotations returned false
}

/**
 * Main → UI: sent on every terminal outcome of the add-annotations action (success and error).
 * The UI uses this to reset ataIsAddingAnnotations. Never omitted.
 */
export interface AnalyticsTaggingAddAnnotationsDoneMessage {
  type: 'ANALYTICS_TAGGING_ADD_ANNOTATIONS_DONE'
  result: AutoAnnotateResult | null   // non-null on success (including partial)
  error: string | null                // non-null when the run failed at the action level
}
```

- [ ] **Step 2: Verify build passes**

```bash
cd /Users/biagio/Desktop/Dev_Figma/figmai/figmai_plugin && npm run build
```

Expected: build completes, all invariants pass, no TypeScript errors.

---

### Task 2: Create `autoAnnotator.ts` — pure helpers

**Files:**
- Create: `src/core/analyticsTagging/autoAnnotator.ts`
- Create: `tests/autoAnnotator.test.ts`

- [ ] **Step 1: Write the failing tests for pure functions**

Create `tests/autoAnnotator.test.ts`:

```ts
import assert from 'node:assert'

// Stub figma global so module loads outside the Figma runtime.
;(globalThis as unknown as { figma: unknown }).figma = {
  annotations: undefined,
  getNodeByIdAsync: async () => null,
}

import {
  isAnnotatableKind,
  hasScreenIdAnnotation,
  hasActionIdAnnotation,
  buildSummaryMessage,
  ANNOTATABLE_ELEMENT_KINDS,
} from '../src/core/analyticsTagging/autoAnnotator'
import type { AutoAnnotateResult } from '../src/core/types'

let passed = 0
let failed = 0

async function runTest(name: string, fn: () => void | Promise<void>) {
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

async function run() {
  console.log('autoAnnotator.test.ts')

  // ── ANNOTATABLE_ELEMENT_KINDS has 21 kinds ──────────────────────────────────
  await runTest('ANNOTATABLE_ELEMENT_KINDS has 21 entries', () => {
    assert.strictEqual(ANNOTATABLE_ELEMENT_KINDS.size, 21)
  })

  // ── isAnnotatableKind ───────────────────────────────────────────────────────
  const annotatable = [
    'button','icon_button','link','menu_item',
    'checkbox','radio','switch','slider',
    'text_input','textarea','search_input',
    'select','combobox','date_picker','file_upload','stepper',
    'accordion','chip_tag','card','list_item','unknown_interactive',
  ]
  for (const k of annotatable) {
    await runTest(`isAnnotatableKind: "${k}" → true`, () => {
      assert.strictEqual(isAnnotatableKind(k), true)
    })
  }

  const notAnnotatable = ['navbar','tabs','pagination','sidenav_drawer','breadcrumb',
    'heading','body_text','image','icon','divider','table','list','toolbar',
    'alert','progress','badge','avatar']
  for (const k of notAnnotatable) {
    await runTest(`isAnnotatableKind: "${k}" → false`, () => {
      assert.strictEqual(isAnnotatableKind(k), false)
    })
  }

  // ── hasScreenIdAnnotation ───────────────────────────────────────────────────
  await runTest('hasScreenIdAnnotation: exact "ScreenID" → true', () => {
    const map = new Map([['cat-1', 'ScreenID']])
    assert.strictEqual(hasScreenIdAnnotation([{ categoryId: 'cat-1' }], map), true)
  })

  await runTest('hasScreenIdAnnotation: near-miss "Screen ID" → true', () => {
    const map = new Map([['cat-2', 'Screen ID']])
    assert.strictEqual(hasScreenIdAnnotation([{ categoryId: 'cat-2' }], map), true)
  })

  await runTest('hasScreenIdAnnotation: absent → false', () => {
    const map = new Map<string, string>()
    assert.strictEqual(hasScreenIdAnnotation([], map), false)
  })

  await runTest('hasScreenIdAnnotation: ActionID category → false', () => {
    const map = new Map([['cat-3', 'ActionID']])
    assert.strictEqual(hasScreenIdAnnotation([{ categoryId: 'cat-3' }], map), false)
  })

  // ── hasActionIdAnnotation ───────────────────────────────────────────────────
  await runTest('hasActionIdAnnotation: exact "ActionID" → true', () => {
    const map = new Map([['cat-4', 'ActionID']])
    assert.strictEqual(hasActionIdAnnotation([{ categoryId: 'cat-4' }], map), true)
  })

  await runTest('hasActionIdAnnotation: near-miss "Action ID" → true', () => {
    const map = new Map([['cat-5', 'Action ID']])
    assert.strictEqual(hasActionIdAnnotation([{ categoryId: 'cat-5' }], map), true)
  })

  await runTest('hasActionIdAnnotation: absent → false', () => {
    const map = new Map<string, string>()
    assert.strictEqual(hasActionIdAnnotation([], map), false)
  })

  await runTest('hasActionIdAnnotation: ScreenID category → false', () => {
    const map = new Map([['cat-6', 'ScreenID']])
    assert.strictEqual(hasActionIdAnnotation([{ categoryId: 'cat-6' }], map), false)
  })

  await runTest('hasActionIdAnnotation: annotation without categoryId → false', () => {
    const map = new Map<string, string>()
    // label text "ActionID" without a categoryId should NOT trigger the skip
    assert.strictEqual(hasActionIdAnnotation([{ label: 'ActionID' }], map), false)
  })

  // ── buildSummaryMessage ─────────────────────────────────────────────────────
  const zero: AutoAnnotateResult = { screensProcessed: 0, screenIdAdded: 0, actionIdAdded: 0, skippedExisting: 0, writeFailed: 0 }

  await runTest('buildSummaryMessage: error string → surfaces error directly', () => {
    const msg = buildSummaryMessage(null, "Could not create 'ActionID' annotation category")
    assert.strictEqual(msg, "Could not create 'ActionID' annotation category")
  })

  await runTest('buildSummaryMessage: screensProcessed=0 → no screens found', () => {
    const msg = buildSummaryMessage({ ...zero }, null)
    assert.strictEqual(msg, 'No screens found in selection.')
  })

  await runTest('buildSummaryMessage: only writeFailed, nothing else → write-fail message', () => {
    const msg = buildSummaryMessage({ ...zero, screensProcessed: 1, writeFailed: 3 }, null)
    assert.strictEqual(msg, '3 annotation write(s) failed — check for locked layers.')
  })

  await runTest('buildSummaryMessage: zero everything (screensProcessed=1) → no elements detected', () => {
    const msg = buildSummaryMessage({ ...zero, screensProcessed: 1 }, null)
    assert.strictEqual(msg, 'No interactive elements detected in the selection.')
  })

  await runTest('buildSummaryMessage: screenIdAdded only → added ScreenID, no elements detected', () => {
    const msg = buildSummaryMessage({ ...zero, screensProcessed: 1, screenIdAdded: 1 }, null)
    assert.strictEqual(msg, 'Added ScreenID to 1 screen(s). No interactive elements detected.')
  })

  await runTest('buildSummaryMessage: screenIdAdded + writeFailed, no actionId → includes write-fail suffix', () => {
    const msg = buildSummaryMessage({ ...zero, screensProcessed: 1, screenIdAdded: 1, writeFailed: 2 }, null)
    assert.strictEqual(msg, 'Added ScreenID to 1 screen(s). No interactive elements detected. (2 write(s) failed.)')
  })

  await runTest('buildSummaryMessage: actionId=0, skippedExisting=2 → all already tagged', () => {
    const msg = buildSummaryMessage({ ...zero, screensProcessed: 1, skippedExisting: 2 }, null)
    assert.strictEqual(msg, 'No new ActionID annotations needed — all detected elements are already tagged.')
  })

  await runTest('buildSummaryMessage: actionId=0, skippedExisting=2, screenIdAdded=1 → prefix', () => {
    const msg = buildSummaryMessage({ ...zero, screensProcessed: 1, screenIdAdded: 1, skippedExisting: 2 }, null)
    assert.ok(msg.startsWith('Added ScreenID to 1 screen(s).'), `got: ${msg}`)
    assert.ok(msg.includes('all detected elements are already tagged'), `got: ${msg}`)
  })

  await runTest('buildSummaryMessage: happy path — base message', () => {
    const msg = buildSummaryMessage({ screensProcessed: 2, screenIdAdded: 1, actionIdAdded: 8, skippedExisting: 0, writeFailed: 0 }, null)
    assert.strictEqual(msg, 'Added ScreenID to 1 screen(s) and ActionID to 8 element(s).')
  })

  await runTest('buildSummaryMessage: happy path with skipped + writeFailed suffixes', () => {
    const msg = buildSummaryMessage({ screensProcessed: 2, screenIdAdded: 2, actionIdAdded: 5, skippedExisting: 3, writeFailed: 1 }, null)
    assert.ok(msg.includes('ActionID to 5 element(s)'), `got: ${msg}`)
    assert.ok(msg.includes('3 already tagged'), `got: ${msg}`)
    assert.ok(msg.includes('1 could not be written'), `got: ${msg}`)
  })

  console.log(`\n${passed} passed, ${failed} failed`)
  if (failed > 0) process.exit(1)
}

run().catch(err => { console.error(err); process.exit(1) })
```

- [ ] **Step 2: Run the tests to verify they fail**

```bash
cd /Users/biagio/Desktop/Dev_Figma/figmai/figmai_plugin && npx tsx tests/autoAnnotator.test.ts
```

Expected: error — `autoAnnotator` module not found.

- [ ] **Step 3: Create `src/core/analyticsTagging/autoAnnotator.ts` with pure helpers**

```ts
/**
 * AT-A Auto-Annotate
 * Detects interactive elements in selected screens using the Smart Detector
 * and writes placeholder ScreenID / ActionID annotations.
 *
 * autoAnnotateScreens() is side-effectful (Figma API + Smart Detector).
 * Pure helpers (isAnnotatableKind, hasScreenIdAnnotation, hasActionIdAnnotation,
 * buildSummaryMessage) are exported for testing.
 */

import {
  ensureAnnotationCategory,
  getCategoryMapShared,
  clearAnnotationCategoryCache,
  safeSetNativeAnnotations,
  type AnnotationEntry,
} from '../figma/annotations'
import { scanSelectionSmart } from '../detection/smartDetector'
import { isNearMissScreenId, isNearMissActionId } from './nearMissDetector'
import type { AutoAnnotateResult } from '../types'

// ============================================================================
// Annotatable element kinds
// ============================================================================

/**
 * Element kinds from the Smart Detector that qualify for ActionID annotation.
 * Excludes structural containers (navbar, tabs, pagination, sidenav_drawer, breadcrumb)
 * because their child buttons/links are the real interaction targets.
 * Excludes content and decorative kinds (heading, image, icon, etc.).
 */
export const ANNOTATABLE_ELEMENT_KINDS = new Set([
  // Direct interaction controls
  'button', 'icon_button', 'link', 'menu_item',
  // Form controls
  'checkbox', 'radio', 'switch', 'slider',
  'text_input', 'textarea', 'search_input',
  'select', 'combobox', 'date_picker', 'file_upload', 'stepper',
  // Expand/collapse
  'accordion',
  // Tappable content (cards, list rows, filter chips — high-value analytics events)
  'chip_tag', 'card', 'list_item',
  // Catch-all
  'unknown_interactive',
])

/** True if the given Smart Detector element kind qualifies for ActionID annotation. */
export function isAnnotatableKind(kind: string): boolean {
  return ANNOTATABLE_ELEMENT_KINDS.has(kind)
}

// ============================================================================
// Annotation skip-check helpers (category-based only)
// ============================================================================

/**
 * True if the node already has a ScreenID annotation (exact match or near-miss).
 * Check is based solely on resolved category label — not on annotation label text.
 */
export function hasScreenIdAnnotation(
  existingAnnotations: AnnotationEntry[],
  categoryMap: Map<string, string>
): boolean {
  return existingAnnotations.some(e => {
    if (!e.categoryId) return false
    const label = categoryMap.get(e.categoryId)
    return label != null && (label === 'ScreenID' || isNearMissScreenId(label))
  })
}

/**
 * True if the node already has an ActionID annotation (exact match or near-miss).
 * Check is based solely on resolved category label — not on annotation label text.
 */
export function hasActionIdAnnotation(
  existingAnnotations: AnnotationEntry[],
  categoryMap: Map<string, string>
): boolean {
  return existingAnnotations.some(e => {
    if (!e.categoryId) return false
    const label = categoryMap.get(e.categoryId)
    return label != null && (label === 'ActionID' || isNearMissActionId(label))
  })
}

// ============================================================================
// Summary message builder
// ============================================================================

/**
 * Build the user-facing status message from an AutoAnnotateResult.
 * If error is non-null, surfaces it directly — does not replace with a generic fallback.
 * Evaluated in order; first match wins.
 */
export function buildSummaryMessage(
  result: AutoAnnotateResult | null,
  error: string | null
): string {
  if (error != null) return error
  if (!result) return 'Could not add annotations.'

  const { screensProcessed, screenIdAdded, actionIdAdded, skippedExisting, writeFailed } = result

  if (screensProcessed === 0) return 'No screens found in selection.'

  // writeFailed-aware zero cases — checked before "no elements" to avoid misleading messages
  if (writeFailed > 0 && actionIdAdded === 0 && skippedExisting === 0 && screenIdAdded === 0) {
    return `${writeFailed} annotation write(s) failed — check for locked layers.`
  }

  if (actionIdAdded === 0 && skippedExisting === 0 && screenIdAdded === 0) {
    return 'No interactive elements detected in the selection.'
  }

  if (actionIdAdded === 0 && skippedExisting === 0) {
    const base = `Added ScreenID to ${screenIdAdded} screen(s). No interactive elements detected.`
    return writeFailed > 0 ? `${base} (${writeFailed} write(s) failed.)` : base
  }

  if (actionIdAdded === 0) {
    const prefix = screenIdAdded > 0 ? `Added ScreenID to ${screenIdAdded} screen(s). ` : ''
    const base = `${prefix}No new ActionID annotations needed — all detected elements are already tagged.`
    return writeFailed > 0 ? `${base} (${writeFailed} write(s) failed.)` : base
  }

  let msg = `Added ScreenID to ${screenIdAdded} screen(s) and ActionID to ${actionIdAdded} element(s).`
  if (skippedExisting > 0) msg += ` (${skippedExisting} already tagged, skipped.)`
  if (writeFailed > 0) msg += ` (${writeFailed} could not be written — check for locked layers.)`
  return msg
}

// ============================================================================
// Internal helpers
// ============================================================================

function getRawAnnotations(node: SceneNode): AnnotationEntry[] {
  if (!('annotations' in node)) return []
  const raw = (node as SceneNode & { annotations?: AnnotationEntry[] }).annotations
  return Array.isArray(raw) ? [...raw] : []
}

// ============================================================================
// Main function
// ============================================================================

/**
 * Auto-annotate interactive elements across the given screen root nodes.
 *
 * For each root:
 *   - Adds a ScreenID annotation (value: "FrameName_REVIEW") if absent.
 *   - Runs the Smart Detector and writes ActionID ("ADD ID HERE") to each
 *     high/medium confidence interactive descendant that is not yet tagged.
 *
 * Non-destructive: existing annotations are always preserved (new entry appended).
 * Root frame is never written as an ActionID target.
 *
 * Throws if ScreenID or ActionID annotation categories cannot be created.
 * Per-node write failures are counted in result.writeFailed and are not fatal.
 */
export async function autoAnnotateScreens(
  rootNodes: SceneNode[]
): Promise<AutoAnnotateResult> {
  const result: AutoAnnotateResult = {
    screensProcessed: 0,
    screenIdAdded: 0,
    actionIdAdded: 0,
    skippedExisting: 0,
    writeFailed: 0,
  }

  const screenCatId = await ensureAnnotationCategory('ScreenID')
  const actionCatId = await ensureAnnotationCategory('ActionID')

  if (!screenCatId || !actionCatId) {
    throw new Error("Could not create 'ScreenID' or 'ActionID' annotation category")
  }

  const categoryMap = await getCategoryMapShared()

  for (const root of rootNodes) {
    result.screensProcessed++

    // ── ScreenID pass (root only) ──────────────────────────────────────────
    const rootAnnotations = getRawAnnotations(root)
    if (!hasScreenIdAnnotation(rootAnnotations, categoryMap)) {
      const merged = [...rootAnnotations, { label: `${root.name}_REVIEW`, categoryId: screenCatId }]
      if (safeSetNativeAnnotations(root, merged)) {
        result.screenIdAdded++
      } else {
        result.writeFailed++
      }
    }

    // ── ActionID pass (descendants only — root excluded) ───────────────────
    let sdResult: Awaited<ReturnType<typeof scanSelectionSmart>>
    try {
      sdResult = await scanSelectionSmart([root], { maxNodes: 500 })
    } catch (e) {
      throw new Error(`Smart Detector failed: ${e instanceof Error ? e.message : String(e)}`)
    }

    // Dedupe by nodeId (first qualifying entry wins)
    const seenNodeIds = new Set<string>()
    const uniqueElements = sdResult.elements.filter(e => {
      if (seenNodeIds.has(e.nodeId)) return false
      seenNodeIds.add(e.nodeId)
      return true
    })

    // Filter by confidence (high/med) and annotatable kind
    const candidates = uniqueElements.filter(
      e => (e.confidence === 'high' || e.confidence === 'med') && isAnnotatableKind(e.kind)
    )

    for (const element of candidates) {
      // Root is never an ActionID target
      if (element.nodeId === root.id) continue

      const node = await figma.getNodeByIdAsync(element.nodeId) as SceneNode | null
      if (!node) continue  // removed since scan

      const nodeAnnotations = getRawAnnotations(node)

      // Skip if already has ActionID (valid or near-miss) — category-based check only
      if (hasActionIdAnnotation(nodeAnnotations, categoryMap)) {
        result.skippedExisting++
        continue
      }

      const merged = [...nodeAnnotations, { label: 'ADD ID HERE', categoryId: actionCatId }]
      if (safeSetNativeAnnotations(node, merged)) {
        result.actionIdAdded++
      } else {
        result.writeFailed++
      }
    }
  }

  clearAnnotationCategoryCache()
  return result
}
```

- [ ] **Step 4: Run the tests**

```bash
cd /Users/biagio/Desktop/Dev_Figma/figmai/figmai_plugin && npx tsx tests/autoAnnotator.test.ts
```

Expected: all tests pass. Fix any failures before continuing.

- [ ] **Step 5: Add test to `package.json`**

In `package.json`, find the `"test"` script. Append `&& tsx tests/autoAnnotator.test.ts` to the end of the existing string.

Before (end of string):
```
... && tsx tests/nearMissDetector.test.ts"
```

After:
```
... && tsx tests/nearMissDetector.test.ts && tsx tests/autoAnnotator.test.ts"
```

- [ ] **Step 6: Run full test suite**

```bash
cd /Users/biagio/Desktop/Dev_Figma/figmai/figmai_plugin && npm run test
```

Expected: all tests pass including `autoAnnotator.test.ts`.

- [ ] **Step 7: Verify build**

```bash
cd /Users/biagio/Desktop/Dev_Figma/figmai/figmai_plugin && npm run build
```

Expected: no errors.

---

### Task 3: Update manifest + handler

**Files:**
- Modify: `custom/assistants/analytics_tagging/manifest.json`
- Modify: `src/core/assistants/handlers/analyticsTagging.ts`

- [ ] **Step 1: Add `add-annotations` to the assistant manifest**

In `custom/assistants/analytics_tagging/manifest.json`, inside the `"quickActions"` array, add the following entry before `"export-screenshots"`:

```json
{
  "executionType": "tool-only",
  "id": "add-annotations",
  "label": "Add Annotations",
  "requiresSelection": true,
  "templateMessage": "Detect interactive elements and add ScreenID/ActionID placeholder annotations."
},
```

- [ ] **Step 2: Add `add-annotations` to `canHandle` in the handler**

In `src/core/assistants/handlers/analyticsTagging.ts`, in the `canHandle` method, add `actionId === 'add-annotations'` to the return expression:

```ts
canHandle(assistantId: string, actionId: string | undefined): boolean {
  if (assistantId !== 'analytics_tagging') return false
  return (
    actionId === 'get-analytics-tags' ||
    actionId === 'append-analytics-tags' ||
    actionId === 'copy-table' ||
    actionId === 'new-session' ||
    actionId === 'fix-annotation-near-misses' ||
    actionId === 'add-annotations'
  )
}
```

- [ ] **Step 3: Add imports to `analyticsTagging.ts`**

At the top of `src/core/assistants/handlers/analyticsTagging.ts`, add:

```ts
import { autoAnnotateScreens, buildSummaryMessage } from '../../analyticsTagging/autoAnnotator'
```

(Add alongside the existing import from `'../../analyticsTagging/nearMissDetector'`.)

- [ ] **Step 4: Add the `add-annotations` handler branch**

In `handleResponse`, add the following block before `if (actionId === 'get-analytics-tags' || actionId === 'append-analytics-tags')`:

```ts
if (actionId === 'add-annotations') {
  const resolvedSelection = await resolveSelection(selectionOrder, {
    containerStrategy: 'expand',
    skipHidden: true
  })

  if (resolvedSelection.scanRoots.length === 0) {
    const errorMsg = 'No screens found in selection. Select a frame to continue.'
    figma.ui.postMessage({
      pluginMessage: {
        type: 'ANALYTICS_TAGGING_ADD_ANNOTATIONS_DONE',
        result: null,
        error: errorMsg
      }
    })
    replaceStatusMessage(errorMsg, true)
    return { handled: true }
  }

  try {
    const result = await autoAnnotateScreens(resolvedSelection.scanRoots)
    const summary = buildSummaryMessage(result, null)
    figma.ui.postMessage({
      pluginMessage: {
        type: 'ANALYTICS_TAGGING_ADD_ANNOTATIONS_DONE',
        result,
        error: null
      }
    })
    replaceStatusMessage(summary)
  } catch (e) {
    const errorMsg = e instanceof Error ? e.message : 'Unknown error during annotation'
    figma.ui.postMessage({
      pluginMessage: {
        type: 'ANALYTICS_TAGGING_ADD_ANNOTATIONS_DONE',
        result: null,
        error: errorMsg
      }
    })
    replaceStatusMessage(errorMsg, true)
  }
  return { handled: true }
}
```

- [ ] **Step 5: Run build to regenerate `assistants.generated.ts`**

```bash
cd /Users/biagio/Desktop/Dev_Figma/figmai/figmai_plugin && npm run build
```

Expected: build passes, `src/assistants/assistants.generated.ts` is updated, all invariants pass.

---

### Task 4: Update `AnalyticsTaggingWelcome.tsx`

**Files:**
- Modify: `src/ui/components/AnalyticsTaggingWelcome.tsx`

- [ ] **Step 1: Add the new props to the interface and function signature**

Replace the current `AnalyticsTaggingWelcomeProps` interface and function signature with:

```ts
interface AnalyticsTaggingWelcomeProps {
  hasSelection: boolean
  onGetTags: () => void
  onAddAnnotations: () => void
  isAddingAnnotations: boolean
  nearMisses: NearMissInfo[]
  onFixNearMisses: () => void
  onDismissNearMisses: () => void
  isFixingNearMisses: boolean
}

export function AnalyticsTaggingWelcome({
  hasSelection,
  onGetTags,
  onAddAnnotations,
  isAddingAnnotations,
  nearMisses,
  onFixNearMisses,
  onDismissNearMisses,
  isFixingNearMisses
}: AnalyticsTaggingWelcomeProps) {
```

- [ ] **Step 2: Add the "Add Annotations" button after the "Get Analytics Tags" button**

In the JSX, after the existing `<button>Get Analytics Tags</button>` block, add:

```tsx
<button
  data-at-button="add-annotations"
  onClick={onAddAnnotations}
  disabled={!hasSelection || isAddingAnnotations}
  style={{
    padding: '10px 24px',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    backgroundColor: 'transparent',
    color: (!hasSelection || isAddingAnnotations) ? 'var(--fg-muted)' : 'var(--fg)',
    cursor: (!hasSelection || isAddingAnnotations) ? 'not-allowed' : 'pointer',
    fontSize: '13px',
    fontWeight: 500,
    opacity: isAddingAnnotations ? 0.6 : 1
  }}
>
  {isAddingAnnotations ? 'Adding…' : 'Add Annotations'}
</button>
```

- [ ] **Step 3: Build to check for TypeScript errors**

```bash
cd /Users/biagio/Desktop/Dev_Figma/figmai/figmai_plugin && npm run build
```

Expected: TypeScript will report errors on `ui.tsx` call sites that are not yet updated — that is expected and will be fixed in Task 6.

---

### Task 5: Update `AnalyticsTaggingView.tsx`

**Files:**
- Modify: `src/ui/components/AnalyticsTaggingView.tsx`

- [ ] **Step 1: Add the new props to the interface**

In `AnalyticsTaggingViewProps`, add after `isFixingNearMisses: boolean`:

```ts
onAddAnnotations: () => void
isAddingAnnotations: boolean
```

- [ ] **Step 2: Add to the destructured function params**

In the `AnalyticsTaggingView` function parameter destructuring, add after `isFixingNearMisses`:

```ts
onAddAnnotations,
isAddingAnnotations,
```

- [ ] **Step 3: Add the "Add Annotations" button in the footer**

In the footer action row, after the `<button>Append Selection</button>` block, add:

```tsx
<button
  onClick={onAddAnnotations}
  disabled={!hasSelection || isAddingAnnotations}
  title={hasSelection ? 'Detect interactive elements and add placeholder annotations' : 'Select frames first'}
  style={actionBtnStyle(!hasSelection || isAddingAnnotations)}
>
  {isAddingAnnotations ? 'Adding…' : 'Add Annotations'}
</button>
```

(`actionBtnStyle` is already imported — it accepts a `boolean` for the disabled state.)

- [ ] **Step 4: Build to check for TypeScript errors**

```bash
cd /Users/biagio/Desktop/Dev_Figma/figmai/figmai_plugin && npm run build
```

Expected: TypeScript will report errors on `ui.tsx` until Task 6 is complete — that is expected.

---

### Task 6: Wire `ui.tsx`

**Files:**
- Modify: `src/ui.tsx`

- [ ] **Step 1: Add the `ataIsAddingAnnotations` state**

Near the `ataNearMisses` / `ataIsFixingNearMisses` state declarations (search for `ataIsFixingNearMisses`), add:

```ts
const [ataIsAddingAnnotations, setAtaIsAddingAnnotations] = useState(false)
```

- [ ] **Step 2: Add the message handler case**

In the `onmessage` switch block, after `case 'ANALYTICS_TAGGING_NEAR_MISSES'`, add:

```ts
case 'ANALYTICS_TAGGING_ADD_ANNOTATIONS_DONE': {
  setAtaIsAddingAnnotations(false)
  break
}
```

- [ ] **Step 3: Add the `handleAddAnnotations` callback**

Near `handleFixNearMisses` and `handleDismissNearMisses` (search for `handleFixNearMisses`), add:

```ts
const handleAddAnnotations = useCallback(() => {
  setAtaIsAddingAnnotations(true)
  emit<RunQuickActionHandler>('RUN_QUICK_ACTION', 'add-annotations', 'analytics_tagging')
}, [])
```

- [ ] **Step 4: Wire props to `<AnalyticsTaggingView>`**

Find the `<AnalyticsTaggingView ... />` JSX call (search for `isFixingNearMisses={ataIsFixingNearMisses}` inside the View). Add the two new props:

```tsx
onAddAnnotations={handleAddAnnotations}
isAddingAnnotations={ataIsAddingAnnotations}
```

- [ ] **Step 5: Wire props to `<AnalyticsTaggingWelcome>`**

Find the `<AnalyticsTaggingWelcome ... />` JSX call. Add the two new props:

```tsx
onAddAnnotations={handleAddAnnotations}
isAddingAnnotations={ataIsAddingAnnotations}
```

- [ ] **Step 6: Run build**

```bash
cd /Users/biagio/Desktop/Dev_Figma/figmai/figmai_plugin && npm run build
```

Expected: build passes with no TypeScript errors and all invariants pass.

- [ ] **Step 7: Run full test suite**

```bash
cd /Users/biagio/Desktop/Dev_Figma/figmai/figmai_plugin && npm run test
```

Expected: all tests pass.
