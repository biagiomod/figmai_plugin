# AT-A Annotation Repair Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Detect near-miss annotation category labels (e.g. "Screen ID" instead of "ScreenID") and offer one-click repair from an amber banner in the AT-A panel.

**Architecture:** A new pure-function detector module (`nearMissDetector.ts`) scans annotation categories and produces serializable findings. The handler module stores live `SceneNode` refs in a module-level variable, sends serializable `NearMissInfo[]` to the UI, and handles a new `FIX_ANNOTATION_NEAR_MISSES` action that writes back canonical category IDs. The UI renders an amber banner (new component) above the table or empty state.

**Tech Stack:** TypeScript, Preact/h, `@create-figma-plugin/utilities` emit/on pattern, `node:assert` + `tsx` for tests.

---

## File Map

| Action | File | What changes |
|---|---|---|
| **Create** | `src/core/analyticsTagging/nearMissDetector.ts` | Pure detection functions: `normalizeTagKey`, `isNearMissScreenId`, `isNearMissActionId`, `detectNearMisses` |
| **Create** | `src/ui/components/AnalyticsTaggingRepairBanner.tsx` | Amber banner for mixed-state and zero-valid-state scenarios |
| **Create** | `tests/nearMissDetector.test.ts` | Unit tests for the three pure functions |
| **Modify** | `src/core/figma/annotations.ts` | Add `repairNearMissAnnotations()` |
| **Modify** | `src/core/analyticsTagging/annotations.ts` | Export `AnnotationWithCategory` type for reuse in nearMissDetector |
| **Modify** | `src/core/assistants/handlers/analyticsTagging.ts` | Add `_lastNearMisses`, detect on get/append, handle `fix-annotation-near-misses` action |
| **Modify** | `src/core/types.ts` | Add `NearMissInfo`, `AnalyticsTaggingNearMissesHandler`, `FixAnnotationNearMissesHandler` |
| **Modify** | `src/ui/components/AnalyticsTaggingView.tsx` | Accept + render `<AnalyticsTaggingRepairBanner>` |
| **Modify** | `src/ui/components/AnalyticsTaggingWelcome.tsx` | Accept + render `<AnalyticsTaggingRepairBanner>` |
| **Modify** | `src/ui.tsx` | Add `ataNearMisses` state, handle `ANALYTICS_TAGGING_NEAR_MISSES`, emit `FIX_ANNOTATION_NEAR_MISSES` |
| **Modify** | `package.json` | Add `tsx tests/nearMissDetector.test.ts` to `npm test` |

---

## Task 1: Pure detection functions + unit tests (TDD)

**Files:**
- Create: `src/core/analyticsTagging/nearMissDetector.ts`
- Create: `tests/nearMissDetector.test.ts`

### Step 1: Write the failing test

- [ ] Create `tests/nearMissDetector.test.ts`:

```ts
import assert from 'node:assert'
import {
  normalizeTagKey,
  isNearMissScreenId,
  isNearMissActionId
} from '../src/core/analyticsTagging/nearMissDetector'

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
  console.log('nearMissDetector.test.ts')

  // normalizeTagKey
  await runTest('normalizeTagKey: strips spaces', () => {
    assert.strictEqual(normalizeTagKey('Screen ID'), 'screenid')
  })
  await runTest('normalizeTagKey: strips underscores', () => {
    assert.strictEqual(normalizeTagKey('screen_id'), 'screenid')
  })
  await runTest('normalizeTagKey: lowercases', () => {
    assert.strictEqual(normalizeTagKey('SCREENID'), 'screenid')
  })
  await runTest('normalizeTagKey: mixed spaces+underscores+case', () => {
    assert.strictEqual(normalizeTagKey('Action_ID'), 'actionid')
  })

  // isNearMissScreenId
  await runTest('isNearMissScreenId: "Screen ID" (space)', () => {
    assert.strictEqual(isNearMissScreenId('Screen ID'), true)
  })
  await runTest('isNearMissScreenId: "screen id" (lowercase space)', () => {
    assert.strictEqual(isNearMissScreenId('screen id'), true)
  })
  await runTest('isNearMissScreenId: "ScreenId" (wrong case)', () => {
    assert.strictEqual(isNearMissScreenId('ScreenId'), true)
  })
  await runTest('isNearMissScreenId: "screen_id" (underscore)', () => {
    assert.strictEqual(isNearMissScreenId('screen_id'), true)
  })
  await runTest('isNearMissScreenId: "screenid" (all lower)', () => {
    assert.strictEqual(isNearMissScreenId('screenid'), true)
  })
  await runTest('isNearMissScreenId: "SCREENID" (all upper)', () => {
    assert.strictEqual(isNearMissScreenId('SCREENID'), true)
  })
  await runTest('isNearMissScreenId: exact "ScreenID" is NOT a near-miss', () => {
    assert.strictEqual(isNearMissScreenId('ScreenID'), false)
  })
  await runTest('isNearMissScreenId: "ActionID" is not a near-miss', () => {
    assert.strictEqual(isNearMissScreenId('ActionID'), false)
  })
  await runTest('isNearMissScreenId: unrelated label is false', () => {
    assert.strictEqual(isNearMissScreenId('Description'), false)
  })

  // isNearMissActionId
  await runTest('isNearMissActionId: "Action ID" (space)', () => {
    assert.strictEqual(isNearMissActionId('Action ID'), true)
  })
  await runTest('isNearMissActionId: "action id" (lowercase space)', () => {
    assert.strictEqual(isNearMissActionId('action id'), true)
  })
  await runTest('isNearMissActionId: "ActionId" (wrong case)', () => {
    assert.strictEqual(isNearMissActionId('ActionId'), true)
  })
  await runTest('isNearMissActionId: "action_id" (underscore)', () => {
    assert.strictEqual(isNearMissActionId('action_id'), true)
  })
  await runTest('isNearMissActionId: "actionid" (all lower)', () => {
    assert.strictEqual(isNearMissActionId('actionid'), true)
  })
  await runTest('isNearMissActionId: "ACTIONID" (all upper)', () => {
    assert.strictEqual(isNearMissActionId('ACTIONID'), true)
  })
  await runTest('isNearMissActionId: exact "ActionID" is NOT a near-miss', () => {
    assert.strictEqual(isNearMissActionId('ActionID'), false)
  })
  await runTest('isNearMissActionId: "ScreenID" is not a near-miss', () => {
    assert.strictEqual(isNearMissActionId('ScreenID'), false)
  })
  await runTest('isNearMissActionId: unrelated label is false', () => {
    assert.strictEqual(isNearMissActionId('Description'), false)
  })

  // No cross-contamination
  await runTest('isNearMissScreenId: "ActionID" → false (no cross-contamination)', () => {
    assert.strictEqual(isNearMissScreenId('ActionID'), false)
  })
  await runTest('isNearMissActionId: "ScreenID" → false (no cross-contamination)', () => {
    assert.strictEqual(isNearMissActionId('ScreenID'), false)
  })

  console.log(`\n${passed} passed, ${failed} failed`)
  if (failed > 0) process.exit(1)
}

run().catch(err => { console.error(err); process.exit(1) })
```

### Step 2: Run test to verify it fails

- [ ] Run: `cd figmai_plugin && npx tsx tests/nearMissDetector.test.ts`

Expected: FAIL with "Cannot find module"

### Step 3: Create nearMissDetector.ts

- [ ] Create `src/core/analyticsTagging/nearMissDetector.ts`:

```ts
/**
 * AT-A Near-Miss Detector
 * Pure functions for detecting annotation category labels that are close to
 * "ScreenID" or "ActionID" but not exact — e.g. "Screen ID", "screen_id".
 * No side effects. No Figma API calls (reads annotations via getCategoryMapShared).
 */

import { getCategoryMapShared } from '../figma/annotations'

// ============================================================================
// Public interfaces
// ============================================================================

export interface NearMissResult {
  node: SceneNode
  nodeName: string
  nodeId: string
  /** Raw category label found on the annotation, e.g. "Screen ID" */
  nearMissLabel: string
  canonicalLabel: 'ScreenID' | 'ActionID'
}

// ============================================================================
// Normalization + detection
// ============================================================================

/** Normalize a category label for near-miss comparison: strip spaces + underscores, lowercase. */
export function normalizeTagKey(s: string): string {
  return s.replace(/[\s_]/g, '').toLowerCase()
}

/** True if label normalizes to "screenid" but is NOT the exact string "ScreenID". */
export function isNearMissScreenId(label: string): boolean {
  if (label === 'ScreenID') return false
  return normalizeTagKey(label) === 'screenid'
}

/** True if label normalizes to "actionid" but is NOT the exact string "ActionID". */
export function isNearMissActionId(label: string): boolean {
  if (label === 'ActionID') return false
  return normalizeTagKey(label) === 'actionid'
}

// ============================================================================
// Scan
// ============================================================================

type AnnotationEntry = { categoryId?: string }

function getAnnotations(node: SceneNode): AnnotationEntry[] {
  if (!('annotations' in node)) return []
  const raw = (node as SceneNode & { annotations?: AnnotationEntry[] }).annotations
  return Array.isArray(raw) ? raw : []
}

/**
 * Check a node's annotation categories for near-misses of the given canonical label.
 * Returns the first near-miss label found, or null.
 * Uses the shared category cache — caller should ensure cache is warm.
 */
function checkNodeForNearMiss(
  node: SceneNode,
  categoryMap: Map<string, string>,
  canonicalLabel: 'ScreenID' | 'ActionID'
): string | null {
  const annotations = getAnnotations(node)
  const check = canonicalLabel === 'ScreenID' ? isNearMissScreenId : isNearMissActionId
  for (const entry of annotations) {
    if (!entry.categoryId) continue
    const catLabel = categoryMap.get(entry.categoryId)
    if (catLabel && check(catLabel)) return catLabel
  }
  return null
}

/**
 * Collect all visible descendants of a SceneNode (includes root).
 * Visibility is checked by walking up to root: node and every ancestor up to
 * (but not including) root must have visible === true.
 */
function collectVisibleDescendants(root: SceneNode): SceneNode[] {
  const result: SceneNode[] = []
  function walk(n: SceneNode): void {
    if (!isVisibleUnderRoot(n, root)) return
    result.push(n)
    if ('children' in n) {
      for (const child of n.children) walk(child as SceneNode)
    }
  }
  walk(root)
  return result
}

function isVisibleUnderRoot(node: SceneNode, root: SceneNode): boolean {
  let current: BaseNode | null = node
  while (current && current !== root) {
    if ('visible' in current && (current as SceneNode).visible === false) return false
    current = current.parent
  }
  return current === root
}

/**
 * Scan rootNodes for ScreenID near-misses, and all their visible descendants for
 * ActionID near-misses. Returns all near-miss findings.
 *
 * De-duplicates by nodeId + canonicalLabel: first near-miss label found wins.
 * Expects the shared category cache to be warm (call getCategoryMapShared() before this
 * function if scanning was not preceded by another annotation read).
 */
export async function detectNearMisses(
  rootNodes: readonly SceneNode[]
): Promise<NearMissResult[]> {
  const categoryMap = await getCategoryMapShared()
  const seen = new Set<string>()  // `${nodeId}:${canonicalLabel}`
  const results: NearMissResult[] = []

  for (const root of rootNodes) {
    // Check root node for ScreenID near-miss
    const screenNearMiss = checkNodeForNearMiss(root, categoryMap, 'ScreenID')
    if (screenNearMiss) {
      const key = `${root.id}:ScreenID`
      if (!seen.has(key)) {
        seen.add(key)
        results.push({
          node: root,
          nodeName: root.name,
          nodeId: root.id,
          nearMissLabel: screenNearMiss,
          canonicalLabel: 'ScreenID'
        })
      }
    }

    // Check all visible descendants for ActionID near-misses
    const descendants = collectVisibleDescendants(root)
    for (const node of descendants) {
      const actionNearMiss = checkNodeForNearMiss(node, categoryMap, 'ActionID')
      if (actionNearMiss) {
        const key = `${node.id}:ActionID`
        if (!seen.has(key)) {
          seen.add(key)
          results.push({
            node,
            nodeName: node.name,
            nodeId: node.id,
            nearMissLabel: actionNearMiss,
            canonicalLabel: 'ActionID'
          })
        }
      }
    }
  }

  return results
}
```

### Step 4: Run test to verify it passes

- [ ] Run: `cd figmai_plugin && npx tsx tests/nearMissDetector.test.ts`

Expected: all tests PASS

---

## Task 2: Add `NearMissInfo` types to `src/core/types.ts`

**Files:**
- Modify: `src/core/types.ts`

### Step 1: Add the three new type definitions

- [ ] In `src/core/types.ts`, find the AT-A handler section (after `ExportAnalyticsTaggingOneRowHandler`). Add the following after `AnalyticsTaggingScreenshotErrorHandler`:

```ts
// ============================================================================
// AT-A Near-Miss Repair
// ============================================================================

/**
 * Serializable near-miss finding (no SceneNode — safe to cross plugin/UI boundary).
 * The main thread keeps NearMissResult (with node ref); UI only receives NearMissInfo.
 */
export interface NearMissInfo {
  nodeId: string
  nodeName: string
  /** Raw category label found, e.g. "Screen ID" */
  nearMissLabel: string
  canonicalLabel: 'ScreenID' | 'ActionID'
}

/** Main → UI: near-miss findings after a scan. Empty array clears the banner. */
export interface AnalyticsTaggingNearMissesHandler extends EventHandler {
  name: 'ANALYTICS_TAGGING_NEAR_MISSES'
  handler: (nearMisses: NearMissInfo[]) => void
}

/** UI → Main: user requested repair of stored near-misses. */
export interface FixAnnotationNearMissesHandler extends EventHandler {
  name: 'FIX_ANNOTATION_NEAR_MISSES'
  handler: () => void
}
```

### Step 2: Build to check types

- [ ] Run: `cd figmai_plugin && npm run build`

Expected: build succeeds (no new errors from this change alone).

---

## Task 3: `repairNearMissAnnotations` in `src/core/figma/annotations.ts`

**Files:**
- Modify: `src/core/figma/annotations.ts`

### Step 1: Add the repair function

- [ ] Append to `src/core/figma/annotations.ts` (before the final blank line):

```ts
/**
 * Fix near-miss annotations on a set of nodes.
 * For each result:
 *   1. ensureAnnotationCategory(canonicalLabel) → canonical category ID
 *   2. Read node.annotations
 *   3. Find entries whose resolved category label is the near-miss label
 *   4. Replace their categoryId with the canonical ID (preserve array order)
 *   5. safeSetNativeAnnotations(node, updatedAnnotations)
 * After all nodes processed: clears the shared category cache.
 * Returns count of nodes successfully updated.
 */
export async function repairNearMissAnnotations(
  nearMisses: import('../analyticsTagging/nearMissDetector').NearMissResult[]
): Promise<number> {
  let repaired = 0

  for (const result of nearMisses) {
    try {
      const canonicalId = await ensureAnnotationCategory(result.canonicalLabel)
      if (!canonicalId) continue

      // Re-read category map (may have been updated by ensureAnnotationCategory)
      const categoryMap = await getCategoryMapShared()

      const node = result.node
      if (!('annotations' in node)) continue
      const annotatable = node as SceneNode & { annotations?: AnnotationEntry[] }
      const raw = annotatable.annotations
      if (!Array.isArray(raw) || raw.length === 0) continue

      // Build updated array — preserve order, only replace matching categoryId entries
      const nearMissLabelLower = result.nearMissLabel.toLowerCase().trim()
      const updated = raw.map(entry => {
        if (!entry.categoryId) return entry
        const resolvedLabel = categoryMap.get(entry.categoryId)?.trim().toLowerCase()
        if (resolvedLabel !== nearMissLabelLower) return entry
        return { ...entry, categoryId: canonicalId }
      })

      const wrote = safeSetNativeAnnotations(node, updated)
      if (wrote) repaired++
    } catch {
      // Skip this node; continue with others
    }
  }

  clearAnnotationCategoryCache()
  return repaired
}
```

### Step 2: Build to check types

- [ ] Run: `cd figmai_plugin && npm run build`

Expected: build succeeds.

---

## Task 4: Update `analyticsTagging.ts` handler

**Files:**
- Modify: `src/core/assistants/handlers/analyticsTagging.ts`

### Step 1: Add imports and module-level variable

- [ ] Replace the import block at the top of `src/core/assistants/handlers/analyticsTagging.ts`:

```ts
import type { AssistantHandler, HandlerContext, HandlerResult } from './base'
import { validateEligibleScreenSelections, scanVisibleActionIds, actionIdFindingsToRows } from '../../analyticsTagging/selection'
import { loadSession, saveSession, createNewSession } from '../../analyticsTagging/storage'
import type { Session, Row } from '../../analyticsTagging/types'
import { resolveSelection } from '../../figma/selectionResolver'
import { detectNearMisses } from '../../analyticsTagging/nearMissDetector'
import type { NearMissResult } from '../../analyticsTagging/nearMissDetector'
import type { NearMissInfo } from '../../types'
import { repairNearMissAnnotations } from '../../figma/annotations'
```

- [ ] After the import block, add the module-level variable before the class:

```ts
/**
 * Stores live NearMissResult[] (with SceneNode refs) from the most recent scan.
 * Reset to [] on every get/append/fix+rescan run and on new-session.
 * Never echoed back from UI — UI only holds NearMissInfo[] (no node refs).
 */
let _lastNearMisses: NearMissResult[] = []
```

### Step 2: Add `fix-annotation-near-misses` to `canHandle`

- [ ] In `canHandle()`, update the return expression:

```ts
  canHandle(assistantId: string, actionId: string | undefined): boolean {
    if (assistantId !== 'analytics_tagging') return false
    return (
      actionId === 'get-analytics-tags' ||
      actionId === 'append-analytics-tags' ||
      actionId === 'copy-table' ||
      actionId === 'new-session' ||
      actionId === 'fix-annotation-near-misses'
    )
  }
```

### Step 3: Clear `_lastNearMisses` in `new-session` and send empty near-misses

- [ ] In the `new-session` branch, after `await saveSession(session)`:

```ts
    if (actionId === 'new-session') {
      _lastNearMisses = []
      const page = figma.currentPage
      const session = createNewSession({
        pageId: page.id,
        pageName: page.name
      })
      await saveSession(session)
      figma.ui.postMessage({
        pluginMessage: {
          type: 'ANALYTICS_TAGGING_SESSION_UPDATED',
          session
        }
      })
      figma.ui.postMessage({
        pluginMessage: {
          type: 'ANALYTICS_TAGGING_NEAR_MISSES',
          nearMisses: []
        }
      })
      replaceStatusMessage('New session started.')
      return { handled: true }
    }
```

### Step 4: Add `fix-annotation-near-misses` handler branch

- [ ] Insert before the `get-analytics-tags / append-analytics-tags` block:

```ts
    if (actionId === 'fix-annotation-near-misses') {
      const toFix = _lastNearMisses
      _lastNearMisses = []
      if (toFix.length === 0) {
        replaceStatusMessage('Nothing to fix.')
        return { handled: true }
      }
      replaceStatusMessage('Fixing annotations…')
      const repairedCount = await repairNearMissAnnotations(toFix)
      if (repairedCount === 0) {
        replaceStatusMessage('Could not update annotations. Check that you have edit access to this file.', true)
        return { handled: true }
      }
      // Re-run get-analytics-tags logic inline (same code path)
      // Fall through by setting actionId equivalent via local re-dispatch:
      return this._runGetAnalyticsTags(context, false)
    }
```

**Note:** This requires extracting the get/append logic into a private method. See Step 5.

### Step 5: Extract get/append logic into `_runGetAnalyticsTags`

- [ ] Refactor the `get-analytics-tags / append-analytics-tags` block into a private method and update `handleResponse` to call it. Replace the existing block with:

```ts
  private async _runGetAnalyticsTags(
    context: HandlerContext,
    isAppend: boolean
  ): Promise<HandlerResult> {
    const { replaceStatusMessage, selectionOrder } = context

    _lastNearMisses = []

    const resolvedSelection = await resolveSelection(selectionOrder, {
      containerStrategy: 'expand',
      skipHidden: true
    })
    if (resolvedSelection.scanRoots.length === 0) {
      const errorMsg = resolvedSelection.diagnostics.hints[0] || 'No screens found. Select frames with ScreenID annotations.'
      replaceStatusMessage(errorMsg, true)
      figma.notify(errorMsg)
      figma.ui.postMessage({ pluginMessage: { type: 'ANALYTICS_TAGGING_NEAR_MISSES', nearMisses: [] } })
      return { handled: true }
    }

    // Detect near-misses in parallel with validation (both need the scan roots)
    const [nearMisses, validation] = await Promise.all([
      detectNearMisses(resolvedSelection.scanRoots),
      validateEligibleScreenSelections(resolvedSelection.scanRoots)
    ])
    _lastNearMisses = nearMisses

    // Send near-misses regardless of validation result
    const nearMissesInfo: NearMissInfo[] = nearMisses.map(r => ({
      nodeId: r.nodeId,
      nodeName: r.nodeName,
      nearMissLabel: r.nearMissLabel,
      canonicalLabel: r.canonicalLabel
    }))
    figma.ui.postMessage({ pluginMessage: { type: 'ANALYTICS_TAGGING_NEAR_MISSES', nearMisses: nearMissesInfo } })

    if (!validation.ok) {
      const sectionHint = resolvedSelection.diagnostics.hints.find((h) => h.toLowerCase().includes('section'))
      const finalMessage = sectionHint
        ? `${validation.message} Tip: ${sectionHint}`
        : validation.message
      replaceStatusMessage(finalMessage, true)
      const notifyDetail =
        validation.invalidNames.length > 0
          ? ` Invalid: ${validation.invalidNames.slice(0, 5).join(', ')}${validation.invalidNames.length > 5 ? '…' : ''}`
          : ''
      figma.notify(finalMessage + notifyDetail)
      return { handled: true }
    }

    const allRows: Row[] = []
    for (const { node, screenId } of validation.screens) {
      const findings = await scanVisibleActionIds(node)
      const screenRows = await actionIdFindingsToRows(screenId, node.id, findings)
      allRows.push(...screenRows)
    }
    const seen = new Set<string>()
    const newRows = allRows.filter((row) => {
      const key = `${row.screenId}::${row.actionId}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })

    let session: Session | null = await loadSession()
    const page = figma.currentPage
    if (!session) {
      session = createNewSession({ pageId: page.id, pageName: page.name })
    }

    let keptRows = newRows
    let skippedCount = 0
    if (isAppend) {
      const existingKeys = new Set(session.rows.map(r => `${r.screenId}::${r.actionId}`))
      keptRows = newRows.filter(r => !existingKeys.has(`${r.screenId}::${r.actionId}`))
      skippedCount = newRows.length - keptRows.length
      session.rows = [...session.rows, ...keptRows]
    } else {
      session.rows = newRows
    }
    session.draftRow = null
    session.updatedAtISO = new Date().toISOString()
    await saveSession(session)
    figma.ui.postMessage({
      pluginMessage: {
        type: 'ANALYTICS_TAGGING_SESSION_UPDATED',
        session
      }
    })

    if (keptRows.length === 0 && skippedCount === 0) {
      figma.notify('No ActionID items found.')
      replaceStatusMessage('No ActionID items found in selection.', true)
    } else if (isAppend && keptRows.length === 0 && skippedCount > 0) {
      figma.notify(`All ${skippedCount} row(s) already exist.`)
      replaceStatusMessage(`${skippedCount} duplicate row(s) skipped; no new rows appended.`)
    } else {
      const screenCount = validation.screens.length
      const verb = isAppend ? 'appended' : 'added'
      const skipNote = skippedCount > 0 ? ` (${skippedCount} duplicate(s) skipped)` : ''
      replaceStatusMessage(
        screenCount === 1
          ? `${keptRows.length} row(s) ${verb} from scan.${skipNote}`
          : `${keptRows.length} row(s) ${verb} from ${screenCount} screen(s).${skipNote}`
      )
    }
    return { handled: true }
  }
```

- [ ] Update `handleResponse` to call `_runGetAnalyticsTags` for get/append:

```ts
    if (actionId === 'get-analytics-tags' || actionId === 'append-analytics-tags') {
      return this._runGetAnalyticsTags(context, actionId === 'append-analytics-tags')
    }
```

- [ ] Update the `fix-annotation-near-misses` branch to call `_runGetAnalyticsTags` after repair (not a recursive call to `handleResponse`):

```ts
    if (actionId === 'fix-annotation-near-misses') {
      const toFix = _lastNearMisses
      _lastNearMisses = []
      if (toFix.length === 0) {
        replaceStatusMessage('Nothing to fix.')
        return { handled: true }
      }
      replaceStatusMessage('Fixing annotations…')
      const repairedCount = await repairNearMissAnnotations(toFix)
      if (repairedCount === 0) {
        replaceStatusMessage('Could not update annotations. Check that you have edit access to this file.', true)
        return { handled: true }
      }
      // Re-run get-analytics-tags after successful repair (not append)
      return this._runGetAnalyticsTags(context, false)
    }
```

### Step 6: Build to check types

- [ ] Run: `cd figmai_plugin && npm run build`

Expected: build succeeds.

---

## Task 5: Create `AnalyticsTaggingRepairBanner.tsx`

**Files:**
- Create: `src/ui/components/AnalyticsTaggingRepairBanner.tsx`

### Step 1: Create the banner component

- [ ] Create `src/ui/components/AnalyticsTaggingRepairBanner.tsx`:

```tsx
/**
 * AT-A Repair Banner
 * Amber banner shown above the table (or empty state) when near-miss annotation
 * category labels are detected. Two visual states:
 *   - hasRows: slim compact banner (mixed state)
 *   - !hasRows: expanded banner with per-node list (zero-valid state)
 */

import { h } from 'preact'
import type { NearMissInfo } from '../../core/types'

interface AnalyticsTaggingRepairBannerProps {
  nearMisses: NearMissInfo[]
  /** true when the table already has valid rows (mixed state) */
  hasRows: boolean
  /** Called when user clicks Fix / Fix & Re-scan */
  onFix: () => void
  /** Called when user clicks dismiss / ✕ */
  onDismiss: () => void
  /** true while fix is in progress (disables button, shows loading text) */
  isFixing?: boolean
}

export function AnalyticsTaggingRepairBanner({
  nearMisses,
  hasRows,
  onFix,
  onDismiss,
  isFixing = false
}: AnalyticsTaggingRepairBannerProps) {
  if (nearMisses.length === 0) return null

  const n = nearMisses.length

  if (hasRows) {
    // Mixed state: slim compact banner
    // Build compact label pairs: "Screen ID → ScreenID, action id → ActionID"
    const labelPairs = Array.from(
      new Map(nearMisses.map(m => [m.nearMissLabel, m.canonicalLabel])).entries()
    ).map(([found, canonical]) => `${found} → ${canonical}`)
    const pairsText = labelPairs.join(', ')

    return (
      <div style={{
        background: '#fffbeb',
        borderBottom: '1px solid #fde68a',
        padding: '8px 12px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '8px',
        fontSize: '11px',
        color: '#92400e',
        flexShrink: 0
      }}>
        <span style={{ marginTop: '1px' }}>⚠</span>
        <span style={{ flex: 1, lineHeight: '1.5' }}>
          <strong>{n} annotation(s) skipped</strong> — category name has a spacing or casing issue
          {' '}(<em>{pairsText}</em>).
          {' '}Fix them to include all tagged elements.
        </span>
        <div style={{ display: 'flex', gap: '6px', flexShrink: 0, marginTop: '1px' }}>
          <button
            onClick={onFix}
            disabled={isFixing}
            style={{
              fontSize: '11px',
              padding: '3px 10px',
              background: isFixing ? '#e5c07b' : '#d97706',
              color: '#fff',
              borderRadius: '4px',
              border: 'none',
              whiteSpace: 'nowrap',
              cursor: isFixing ? 'not-allowed' : 'pointer',
              opacity: isFixing ? 0.7 : 1
            }}
          >
            {isFixing ? 'Fixing…' : `Fix (${n})`}
          </button>
          <button
            onClick={onDismiss}
            style={{
              fontSize: '11px',
              padding: '3px 6px',
              background: 'transparent',
              border: 'none',
              color: '#b45309',
              cursor: 'pointer',
              lineHeight: 1
            }}
          >
            ✕
          </button>
        </div>
      </div>
    )
  }

  // Zero-valid state: expanded banner with per-node list
  return (
    <div style={{
      background: '#fef3c7',
      borderBottom: '1px solid #fcd34d',
      padding: '10px 12px',
      fontSize: '11px',
      color: '#78350f',
      flexShrink: 0
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
        <span style={{ marginTop: '1px', fontSize: '13px' }}>⚠</span>
        <div style={{ flex: 1 }}>
          <strong>No valid annotations found — {n} near-miss(es) detected.</strong>
          <div style={{ marginTop: '4px', lineHeight: '1.6' }}>
            These annotations were skipped because the category name doesn't match the required format:
          </div>
          <div style={{
            marginTop: '6px',
            background: '#fde68a',
            borderRadius: '4px',
            padding: '6px 8px',
            lineHeight: '1.8'
          }}>
            {nearMisses.map((m, i) => (
              <div key={i}>
                · <strong>{m.nodeName}</strong> — <em>"{m.nearMissLabel}"</em> → should be <em>"{m.canonicalLabel}"</em>
              </div>
            ))}
          </div>
          <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
            <button
              onClick={onFix}
              disabled={isFixing}
              style={{
                fontSize: '11px',
                padding: '5px 14px',
                background: isFixing ? '#c97a3a' : '#b45309',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: isFixing ? 'not-allowed' : 'pointer',
                opacity: isFixing ? 0.7 : 1
              }}
            >
              {isFixing ? 'Fixing…' : `Fix & Re-scan (${n})`}
            </button>
            <button
              onClick={onDismiss}
              style={{
                fontSize: '11px',
                padding: '5px 10px',
                background: '#fff',
                border: '1px solid #d1d5db',
                color: '#374151',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
```

### Step 2: Build to check types

- [ ] Run: `cd figmai_plugin && npm run build`

Expected: build succeeds.

---

## Task 6: Integrate banner into `AnalyticsTaggingView.tsx`

**Files:**
- Modify: `src/ui/components/AnalyticsTaggingView.tsx`

### Step 1: Add import and props

- [ ] Add the import after existing imports in `AnalyticsTaggingView.tsx`:

```ts
import { AnalyticsTaggingRepairBanner } from './AnalyticsTaggingRepairBanner'
import type { NearMissInfo } from '../../core/types'
```

- [ ] Add to `AnalyticsTaggingViewProps`:

```ts
  nearMisses: NearMissInfo[]
  onFixNearMisses: () => void
  onDismissNearMisses: () => void
  isFixingNearMisses: boolean
```

- [ ] Add to the destructured props:

```ts
  nearMisses,
  onFixNearMisses,
  onDismissNearMisses,
  isFixingNearMisses,
```

### Step 2: Render banner between header and table container

- [ ] In the JSX, between the header `<div>` (ending after the Restart button) and the table container `<div>`, insert:

```tsx
      {nearMisses.length > 0 && (
        <AnalyticsTaggingRepairBanner
          nearMisses={nearMisses}
          hasRows={session.rows.length > 0}
          onFix={onFixNearMisses}
          onDismiss={onDismissNearMisses}
          isFixing={isFixingNearMisses}
        />
      )}
```

### Step 3: Build

- [ ] Run: `cd figmai_plugin && npm run build`

Expected: build succeeds.

---

## Task 7: Integrate banner into `AnalyticsTaggingWelcome.tsx`

**Files:**
- Modify: `src/ui/components/AnalyticsTaggingWelcome.tsx`

### Step 1: Add import and props

- [ ] Add imports:

```ts
import { AnalyticsTaggingRepairBanner } from './AnalyticsTaggingRepairBanner'
import type { NearMissInfo } from '../../core/types'
```

- [ ] Update `AnalyticsTaggingWelcomeProps`:

```ts
interface AnalyticsTaggingWelcomeProps {
  hasSelection: boolean
  onGetTags: () => void
  nearMisses: NearMissInfo[]
  onFixNearMisses: () => void
  onDismissNearMisses: () => void
  isFixingNearMisses: boolean
}
```

- [ ] Update destructured props:

```ts
export function AnalyticsTaggingWelcome({ hasSelection, onGetTags, nearMisses, onFixNearMisses, onDismissNearMisses, isFixingNearMisses }: AnalyticsTaggingWelcomeProps) {
```

### Step 2: Render banner above the welcome content

- [ ] In the JSX, make the outer `<div>` a fragment container so the banner renders above the welcome card. Replace the outer `<div data-assistant="analytics_tagging" style={{...}}>` with:

```tsx
  return (
    <div data-assistant="analytics_tagging" style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      {nearMisses.length > 0 && (
        <AnalyticsTaggingRepairBanner
          nearMisses={nearMisses}
          hasRows={false}
          onFix={onFixNearMisses}
          onDismiss={onDismissNearMisses}
          isFixing={isFixingNearMisses}
        />
      )}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        flex: 1,
        padding: '32px 24px',
        gap: '16px',
        textAlign: 'center'
      }}>
        {/* ... existing welcome content unchanged ... */}
      </div>
    </div>
  )
```

Note: Keep all existing welcome content (title, description, button, helper text) inside the inner `<div>` unchanged.

### Step 3: Build

- [ ] Run: `cd figmai_plugin && npm run build`

Expected: build succeeds.

---

## Task 8: Wire near-miss state in `src/ui.tsx`

**Files:**
- Modify: `src/ui.tsx`

### Step 1: Add imports

- [ ] Add to the existing type imports from `'./core/types'`:

```ts
import type { NearMissInfo, AnalyticsTaggingNearMissesHandler, FixAnnotationNearMissesHandler } from './core/types'
```

### Step 2: Add state variables

- [ ] Add near the existing AT-A state (after `ataCopying` or `ataSession`):

```ts
  const [ataNearMisses, setAtaNearMisses] = useState<NearMissInfo[]>([])
  const [ataIsFixingNearMisses, setAtaIsFixingNearMisses] = useState(false)
  const [ataNearMissesDismissed, setAtaNearMissesDismissed] = useState(false)
```

### Step 3: Handle `ANALYTICS_TAGGING_NEAR_MISSES` in the message handler

- [ ] In the `onmessage` handler (where other `ANALYTICS_TAGGING_*` messages are handled), add:

```ts
          if (msg.type === 'ANALYTICS_TAGGING_NEAR_MISSES') {
            const incoming = (msg.nearMisses ?? []) as NearMissInfo[]
            setAtaNearMisses(incoming)
            setAtaNearMissesDismissed(false)
            setAtaIsFixingNearMisses(false)
          }
```

### Step 4: Clear near-misses on session restart

- [ ] Find where `new-session` action is dispatched (the Restart button handler). After dispatching, also clear:

```ts
    setAtaNearMisses([])
    setAtaNearMissesDismissed(false)
    setAtaIsFixingNearMisses(false)
```

### Step 5: Define fix and dismiss callbacks

- [ ] Add near existing AT-A callbacks:

```ts
  const handleFixNearMisses = useCallback(() => {
    setAtaIsFixingNearMisses(true)
    emit<FixAnnotationNearMissesHandler>('FIX_ANNOTATION_NEAR_MISSES')
  }, [])

  const handleDismissNearMisses = useCallback(() => {
    setAtaNearMissesDismissed(true)
  }, [])
```

### Step 6: Compute displayed near-misses

- [ ] Add:

```ts
  const displayedNearMisses = ataNearMissesDismissed ? [] : ataNearMisses
```

### Step 7: Pass props to `AnalyticsTaggingView`

- [ ] Find where `<AnalyticsTaggingView>` is rendered and add the new props:

```tsx
          nearMisses={displayedNearMisses}
          onFixNearMisses={handleFixNearMisses}
          onDismissNearMisses={handleDismissNearMisses}
          isFixingNearMisses={ataIsFixingNearMisses}
```

### Step 8: Pass props to `AnalyticsTaggingWelcome`

- [ ] Find where `<AnalyticsTaggingWelcome>` is rendered and add:

```tsx
          nearMisses={displayedNearMisses}
          onFixNearMisses={handleFixNearMisses}
          onDismissNearMisses={handleDismissNearMisses}
          isFixingNearMisses={ataIsFixingNearMisses}
```

### Step 9: Build

- [ ] Run: `cd figmai_plugin && npm run build`

Expected: build succeeds with no type errors.

---

## Task 9: Add test to `npm test`

**Files:**
- Modify: `package.json`

### Step 1: Add the new test file to the test script

- [ ] In `package.json`, find the `"test"` script. Append ` && tsx tests/nearMissDetector.test.ts` at the end.

### Step 2: Run full test suite

- [ ] Run: `cd figmai_plugin && npm test`

Expected: all tests pass including the new `nearMissDetector.test.ts`.

---

## Self-Review

### 1. Spec coverage

| Spec requirement | Task that implements it |
|---|---|
| `normalizeTagKey` | Task 1 |
| `isNearMissScreenId` (6 variants, exact excluded) | Task 1 |
| `isNearMissActionId` (6 variants, exact excluded) | Task 1 |
| `detectNearMisses` (scan roots for ScreenID, descendants for ActionID) | Task 1 |
| `repairNearMissAnnotations` (preserve order, skip failures) | Task 3 |
| `NearMissInfo` + message types in `types.ts` | Task 2 |
| Handler: detect on get/append, store `_lastNearMisses` | Task 4 |
| Handler: `fix-annotation-near-misses` action | Task 4 |
| Handler: `_lastNearMisses` cleared on new-session, get, append, fix+rescan | Task 4 |
| Banner component (mixed state + zero-valid state) | Task 5 |
| Banner integrated into `AnalyticsTaggingView` | Task 6 |
| Banner integrated into `AnalyticsTaggingWelcome` | Task 7 |
| UI state: `ataNearMisses`, dismiss per-session, loading state | Task 8 |
| Test: `normalizeTagKey`, `isNearMissScreenId`, `isNearMissActionId` | Task 1 |
| Test added to `npm test` | Task 9 |
| Error handling: skip failed nodes, show message if all fail | Task 3 (`repairNearMissAnnotations` returns count) + Task 4 |
| Near-misses sent even when validation fails | Task 4 (`_runGetAnalyticsTags` sends before checking validation) |

### 2. Placeholder scan

No "TBD", "TODO", or vague requirements — all steps include complete code.

### 3. Type consistency

- `NearMissResult` (with `node: SceneNode`) defined in `nearMissDetector.ts` — used in handler and `repairNearMissAnnotations`.
- `NearMissInfo` (no node) defined in `types.ts` — used in UI state and banner props.
- `detectNearMisses` → returns `NearMissResult[]` → stored in `_lastNearMisses: NearMissResult[]`.
- `repairNearMissAnnotations(nearMisses: NearMissResult[])` → takes the module-level variable directly.
- Banner prop `nearMisses: NearMissInfo[]` — matches what UI state holds.
- `FixAnnotationNearMissesHandler` handler has no payload — `emit<FixAnnotationNearMissesHandler>('FIX_ANNOTATION_NEAR_MISSES')` is correct.
- `AnalyticsTaggingNearMissesHandler` handler takes `(nearMisses: NearMissInfo[])` — matches the `postMessage` payload `{ nearMisses: nearMissesInfo }`.

### 4. Cursor agent refinements — all addressed

1. **`_lastNearMisses` lifecycle**: Reset to `[]` on get-tags, append-tags (via `_runGetAnalyticsTags`), fix+rescan, and new-session. ✓ Task 4.
2. **Fix button idempotency**: `isFixing` prop disables button + shows "Fixing…". ✓ Task 5, Task 8.
3. **Annotation order preservation**: `repairNearMissAnnotations` maps over raw array without sorting, only replaces matching `categoryId`. ✓ Task 3.
4. **Exact canonical preserved**: `isNearMissScreenId('ScreenID') === false` and `isNearMissActionId('ActionID') === false` tested. `findAnnotationValueByCategory` in existing code uses exact `catLabel !== wanted` comparison — untouched. ✓ Task 1.
5. **Mixed-state banner aggregation**: Banner builds label pairs from all near-misses, shows distinct pairs. Tested manually via the mixed state rendering. ✓ Task 5.
6. **Scope narrow**: No auto-annotation, no category cleanup, no persistent dismiss. ✓ Out of scope throughout.
7. **No commits unless requested**: Plan contains no `git commit` steps. ✓

---

**Plan complete and saved to `docs/superpowers/plans/2026-04-09-ata-annotation-repair.md`. Two execution options:**

**1. Subagent-Driven (recommended)** — I dispatch a fresh subagent per task, review between tasks, fast iteration

**2. Inline Execution** — Execute tasks in this session using executing-plans, batch execution with checkpoints

**Which approach?**
