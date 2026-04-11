# AT-A Annotation Repair — Design Spec

**Date:** 2026-04-09
**Status:** Approved for implementation
**Scope:** Annotation near-miss detection and one-click repair in the Analytics Tagging Assistant (AT-A)

---

## Problem

The AT-A scanner requires annotation category labels to be exactly `"ScreenID"` and `"ActionID"`. Any variant — including the natural human form `"Screen ID"` (with a space) — is silently ignored. Users end up with partial or empty tables and no explanation of why some annotated elements were skipped. This spec covers detection and repair of all case/spacing/underscore variants.

Auto-annotation (finding interactive elements and adding new annotations) is **out of scope** and will be addressed in a separate spec.

---

## Near-Miss Variants to Detect

All comparisons are case-insensitive. Normalization: strip all spaces and underscores, lowercase, then compare to `"screenid"` or `"actionid"`.

| Example found | Normalizes to | Canonical target |
|---|---|---|
| `Screen ID` | `screenid` | `ScreenID` |
| `screen id` | `screenid` | `ScreenID` |
| `ScreenId` | `screenid` | `ScreenID` |
| `screen_id` | `screenid` | `ScreenID` |
| `screenid` | `screenid` | `ScreenID` |
| `SCREENID` | `screenid` | `ScreenID` |
| `Action ID` | `actionid` | `ActionID` |
| `action id` | `actionid` | `ActionID` |
| `ActionId` | `actionid` | `ActionID` |
| `action_id` | `actionid` | `ActionID` |
| `actionid` | `actionid` | `ActionID` |
| `ACTIONID` | `actionid` | `ActionID` |

A category label that already equals `"ScreenID"` or `"ActionID"` (exact) is not a near-miss.

---

## Architecture

### New file: `src/core/analyticsTagging/nearMissDetector.ts`

Pure functions, no side effects, no direct Figma API calls beyond reading annotations.

```ts
export interface NearMissResult {
  node: SceneNode
  nodeName: string
  nodeId: string
  nearMissLabel: string      // e.g. "Screen ID" — the raw category label found
  canonicalLabel: 'ScreenID' | 'ActionID'
}

/** Normalize a category label for near-miss comparison. */
export function normalizeTagKey(s: string): string

/** True if label is a near-miss for ScreenID (not an exact match). */
export function isNearMissScreenId(label: string): boolean

/** True if label is a near-miss for ActionID (not an exact match). */
export function isNearMissActionId(label: string): boolean

/**
 * Scan rootNodes for ScreenID near-misses and all their visible descendants
 * for ActionID near-misses. Returns all near-miss findings.
 * Uses the shared category cache — caller should ensure cache is warm.
 */
export async function detectNearMisses(
  rootNodes: readonly SceneNode[]
): Promise<NearMissResult[]>
```

`detectNearMisses` mirrors the existing scan structure:
- For each root node: check annotation categories for ScreenID near-misses
- For each visible descendant: check annotation categories for ActionID near-misses
- De-duplicate by `nodeId` + `canonicalLabel` (first near-miss label wins per node per type)

### New function in `src/core/figma/annotations.ts`

```ts
/**
 * Fix near-miss annotations on a set of nodes.
 * For each result: finds or creates the canonical category, updates the node's
 * annotation categoryId to the canonical one, writes back via safeSetNativeAnnotations.
 * Clears the shared category cache after all writes.
 * Returns the count of nodes successfully updated.
 */
export async function repairNearMissAnnotations(
  nearMisses: NearMissResult[]
): Promise<number>
```

Repair steps per near-miss:
1. Call `ensureAnnotationCategory(result.canonicalLabel)` → canonical category ID
2. Read `node.annotations`
3. Find annotation entries whose resolved category label is the near-miss label
4. Replace their `categoryId` with the canonical ID
5. Call `safeSetNativeAnnotations(node, updatedAnnotations)`
6. After all nodes processed: call `clearAnnotationCategoryCache()`

### Changes to `src/core/assistants/handlers/analyticsTagging.ts`

In the `get-analytics-tags` and `append-analytics-tags` handler branches:

1. After `resolveSelection` and before / alongside `validateEligibleScreenSelections`, call `detectNearMisses(resolvedSelection.scanRoots)`.
2. Send near-miss results to the UI via a new message regardless of whether validation passed.
3. Add handler for new action `fix-annotation-near-misses`:
   - Reads `nearMisses` from context (passed via message payload stored in a handler-level variable, or re-detected from current selection)
   - Calls `repairNearMissAnnotations(nearMisses)`
   - Clears annotation cache
   - Automatically re-runs the full `get-analytics-tags` logic
   - Sends updated session + cleared near-misses to UI

### New message types (`src/core/types.ts`)

`NearMissInfo` is the serializable form of `NearMissResult` (no `node` reference — nodes cannot cross the plugin/UI boundary):

```ts
export interface NearMissInfo {
  nodeId: string
  nodeName: string
  nearMissLabel: string          // raw label found, e.g. "Screen ID"
  canonicalLabel: 'ScreenID' | 'ActionID'
}

// Main → UI: near-miss findings after a scan
type ANALYTICS_TAGGING_NEAR_MISSES = {
  type: 'ANALYTICS_TAGGING_NEAR_MISSES'
  nearMisses: NearMissInfo[]
}

// UI → Main: user requested repair
type FixAnnotationNearMissesHandler = {
  name: 'FIX_ANNOTATION_NEAR_MISSES'
  handler: () => void
}
```

`analyticsTagging.ts` keeps a handler-module-scoped variable `let _lastNearMisses: NearMissResult[] = []` (with `SceneNode` references intact) that is reset on every `get-analytics-tags` / `append-analytics-tags` run. The `fix-annotation-near-misses` action reads from this variable — the UI never echoes node references back across the boundary.

---

## UI

### State in `ui.tsx`

```ts
const [ataNearMisses, setAtaNearMisses] = useState<NearMissInfo[]>([])
```

Cleared when:
- A new `ANALYTICS_TAGGING_NEAR_MISSES` message arrives with an empty array
- The session is restarted
- The user dismisses the banner (dismiss is per-session only, not persisted)

### Banner component: `src/ui/components/AnalyticsTaggingRepairBanner.tsx`

```ts
interface AnalyticsTaggingRepairBannerProps {
  nearMisses: NearMissInfo[]
  hasRows: boolean          // true when the table already has valid rows
  onFix: () => void
  onDismiss: () => void
}
```

Rendered between the "Analytics Tags" header row and the table (or empty state). Not rendered when `nearMisses.length === 0`.

**Mixed state** (`hasRows === true`):
- Soft amber background `#fffbeb`, border `#fde68a`
- Single line: `"N annotation(s) skipped — category name has a spacing or casing issue. Fix them to include all tagged elements."` followed by a compact inline list of distinct near-miss labels found (e.g. `Screen ID → ScreenID, Action Id → ActionID`). If all near-misses share one label, show only that pair.
- Buttons: `Fix (N)` (amber filled) + `✕` dismiss icon

**Zero valid state** (`hasRows === false`):
- Richer amber background `#fef3c7`, border `#fcd34d`
- Heading: `"No valid annotations found — N near-miss(es) detected."`
- Per-node list: node name + found label + canonical target
- Buttons: `Fix & Re-scan (N)` (dark amber filled) + `Dismiss`

After `onFix` is called the banner shows a brief loading state ("Fixing…") until the re-scan result arrives.

### Integration in `AnalyticsTaggingView.tsx` and `AnalyticsTaggingWelcome.tsx`

Both components receive `nearMisses` and `onFix`/`onDismiss` props and render `<AnalyticsTaggingRepairBanner>` above the table / empty-state area respectively.

---

## Data Flow

```
User clicks "Get Analytics Tags"
  │
  ├─ resolveSelection → scanRoots
  ├─ detectNearMisses(scanRoots)  ←── new, runs in parallel
  ├─ validateEligibleScreenSelections(scanRoots)
  ├─ scanVisibleActionIds (per valid screen)
  │
  ├─ postMessage ANALYTICS_TAGGING_SESSION_UPDATED (rows)
  └─ postMessage ANALYTICS_TAGGING_NEAR_MISSES (nearMisses)

User clicks "Fix (N)" / "Fix & Re-scan (N)"
  │
  └─ emit FIX_ANNOTATION_NEAR_MISSES
       │
       ├─ repairNearMissAnnotations(storedNearMisses)
       ├─ clearAnnotationCategoryCache()
       ├─ re-run get-analytics-tags logic
       │
       ├─ postMessage ANALYTICS_TAGGING_SESSION_UPDATED (updated rows)
       └─ postMessage ANALYTICS_TAGGING_NEAR_MISSES ([])  ← clears banner
```

---

## Error Handling

- If `ensureAnnotationCategory` fails for a node (API unavailable), that node is skipped; remaining nodes are still repaired. Count of successfully repaired nodes is returned and shown in the status message.
- If `safeSetNativeAnnotations` returns false (node doesn't support annotations), the node is silently skipped — this should not happen since the node had annotations in the first place.
- If zero nodes are repaired (all failed), show: `"Could not update annotations. Check that you have edit access to this file."`

---

## Testing

New test file: `tests/nearMissDetector.test.ts`

Tests:
- `normalizeTagKey` strips spaces, underscores, lowercases
- `isNearMissScreenId` returns true for all 6 ScreenID variants, false for exact `"ScreenID"`, false for unrelated labels
- `isNearMissActionId` returns true for all 6 ActionID variants, false for exact `"ActionID"`, false for unrelated labels
- `isNearMissScreenId` + `isNearMissActionId` return false for each other's canonical form (no cross-contamination)

The test file follows the existing `node:assert` + `npx tsx` pattern used in the project and is added to `npm test`.

---

## Out of Scope

- Detecting near-misses in annotation **label text** (e.g. `"Screen ID: home"` as a legacy label) — the existing `parseTagFromLabel` already handles this via `legacyLabel` source
- Auto-annotation of interactive elements — separate spec
- Persisting the dismiss state across sessions
- Renaming or deleting the near-miss category from the Figma file — we only update the `categoryId` on individual nodes; the orphaned category remains in the file (harmless)
