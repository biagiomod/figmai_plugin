# AT-A Auto-Annotate — Design Spec

**Date:** 2026-04-09
**Status:** Approved for implementation
**Scope:** One-click annotation of interactive elements in selected screens using the Smart Detector

---

## Problem

The Analytics Tagging Assistant (AT-A) can scan screens for existing ScreenID and ActionID annotations, but creating those annotations is a manual, per-element task in Figma. Users working on unannotated screens must add them individually before running a scan. This spec covers a new "Add Annotations" action that auto-detects interactive elements and writes placeholder annotations in one step.

---

## Out of Scope

- Auto-populating real analytics IDs (values stay as placeholders)
- Running Get Analytics Tags automatically after annotation
- Near-miss repair (separate feature, already implemented)
- Annotation of content elements (heading, body text, images, etc.)
- Annotation of structural containers (navbar, sidenav_drawer, tabs, etc.)

---

## Architecture

### New file: `src/core/analyticsTagging/autoAnnotator.ts`

Contains all annotation logic. No handler coupling. No UI dependencies.

#### Result type

```ts
export interface AutoAnnotateResult {
  screensProcessed: number    // number of root frames processed
  screenIdAdded: number       // frames that received a new ScreenID annotation
  actionIdAdded: number       // total ActionID annotations written across all frames
  skippedExisting: number     // elements skipped because they already had ActionID (valid or near-miss)
  writeFailed: number         // nodes where safeSetNativeAnnotations returned false
}
```

This is the canonical result structure. The summary status message is always derived from it. It is also the payload field in the completion message (see Message Types).

#### Annotatable element kinds

```ts
export const ANNOTATABLE_ELEMENT_KINDS = new Set([
  // Direct interaction controls
  'button', 'icon_button', 'link', 'menu_item',
  // Form controls
  'checkbox', 'radio', 'switch', 'slider',
  'text_input', 'textarea', 'search_input',
  'select', 'combobox', 'date_picker', 'file_upload', 'stepper',
  // Expand/collapse
  'accordion',
  // Tappable content items (see Rationale below)
  'chip_tag', 'card', 'list_item',
  // Catch-all
  'unknown_interactive',
])
```

**Excluded and why:**

| Kind | Reason excluded |
|---|---|
| `navbar`, `sidenav_drawer`, `toolbar` | Structural containers; their child `menu_item`/`link`/`button` items are detected and annotated individually |
| `tabs`, `pagination`, `breadcrumb` | Component-level containers; individual child buttons/links inside are the real targets |
| `heading`, `body_text`, `label`, `helper_text` | Text content, not interaction targets |
| `image`, `icon`, `avatar`, `badge`, `progress`, `divider` | Decorative or status display |
| `alert`, `error_message`, `toast`, `tooltip` | Informational displays |
| `table`, `list` | Data or layout containers |

**`card` and `list_item` rationale:** Tap-on-card (article cards, product tiles) and tap-on-row (settings rows, navigation lists) are among the most common interaction events analytics teams track in mobile/web apps. Combined with the high/medium confidence filter, the Smart Detector only emits these kinds when structural signals are strong. Including them avoids manual annotation for one of the highest-value patterns.

#### Main function

```ts
export async function autoAnnotateScreens(
  rootNodes: SceneNode[]
): Promise<AutoAnnotateResult>
```

**Precondition:** `rootNodes` is exactly the resolved `scanRoots` from the existing `resolveSelection` flow. No additional container inference is performed inside this function.

**Steps:**

1. `ensureAnnotationCategory('ScreenID')` → `screenCatId`; `ensureAnnotationCategory('ActionID')` → `actionCatId`. If either returns undefined, throw — caller catches and sends error completion.
2. `getCategoryMapShared()` → `categoryMap` (shared cache, loaded once).
3. For each `root` in `rootNodes`:

   **ScreenID pass (root only):**
   - Read raw `root.annotations` (the live array from Figma).
   - Check if any entry has a `categoryId` whose resolved label is `"ScreenID"` (exact) or passes `isNearMissScreenId()`. If present, skip — do not write.
   - If absent: build `merged = [...existingAnnotations, { label: \`${root.name}_REVIEW\`, categoryId: screenCatId }]`. Call `safeSetNativeAnnotations(root, merged)`. Increment `screenIdAdded` on success.

   **ActionID pass (descendants only — root node is never a target):**
   - Call `scanSelectionSmart([root], { maxNodes: 500 })`. Consume only `result.elements`.
   - Dedupe `result.elements` by `nodeId` — first qualifying entry wins; discard subsequent entries for the same id.
   - Filter to entries where `confidence ∈ {'high', 'med'}` AND `kind ∈ ANNOTATABLE_ELEMENT_KINDS`.
   - For each qualifying entry:
     - `await figma.getNodeByIdAsync(nodeId)` → if `null`, skip silently (node removed since scan).
     - If resolved node is the root frame itself, skip — root is never an ActionID target.
     - Read raw `node.annotations` and resolve labels via `categoryMap`.
     - **Skip condition (category-based only):** if any annotation's resolved category label is `"ActionID"` (exact) or passes `isNearMissActionId()`, skip and increment `skippedExisting`. This check is based solely on the resolved category label from the shared cache — not on annotation label text or legacy label parsing.
     - Build `merged = [...existingAnnotations, { label: 'ADD ID HERE', categoryId: actionCatId }]`. Call `safeSetNativeAnnotations(node, merged)`. If it returns `false`, increment `writeFailed` and continue. If `true`, increment `actionIdAdded`.

4. `clearAnnotationCategoryCache()` after all writes.
5. Return `AutoAnnotateResult`.

#### Non-destructive annotation guarantee

`autoAnnotateScreens` never replaces existing annotations. For every write:
- Existing `node.annotations` are read first
- The new entry is appended to the end of the existing array
- The full merged array is written back via `safeSetNativeAnnotations`
- Annotation order from before the run is preserved

---

### Smart Detector contract

**Call site:** `scanSelectionSmart([root], { maxNodes: 500 })`

**Output consumed:** `result.elements: DetectedElement[]` — shape `{ kind, confidence, nodeId, ... }`. `result.content` and `result.patterns` are ignored.

**Node resolution:** `await figma.getNodeByIdAsync(element.nodeId)`. The Smart Detector cannot guarantee nodes remain valid between scan and write. A null result means the node was removed; skip silently.

**Hidden nodes:** The Smart Detector excludes hidden nodes during scan. No additional visibility filtering is needed at annotation time.

**Locked / instance-internal nodes:** `safeSetNativeAnnotations` returns `false` for nodes that do not accept annotation writes (locked layers, nodes inside component instances). This is counted in `writeFailed` and is never fatal — the run continues.

---

### Modified files

| File | Change |
|---|---|
| `src/core/analyticsTagging/autoAnnotator.ts` | **New** — pure annotation logic |
| `src/core/assistants/handlers/analyticsTagging.ts` | New `add-annotations` action branch |
| `custom/assistants/analytics_tagging/manifest.json` | New quick action entry (source of truth) |
| `src/core/types.ts` | New `ANALYTICS_TAGGING_ADD_ANNOTATIONS_DONE` message type |
| `src/ui/components/AnalyticsTaggingWelcome.tsx` | New button + props |
| `src/ui/components/AnalyticsTaggingView.tsx` | New button + props |
| `src/ui.tsx` | New state, handler, message case |

---

### Manifest change — why it is required

The "Add Annotations" button is custom-rendered in `AnalyticsTaggingWelcome.tsx` and `AnalyticsTaggingView.tsx` — it is not auto-generated from the manifest. Despite this, adding `add-annotations` to `custom/assistants/analytics_tagging/manifest.json` is required for three reasons:

1. **Execution routing.** The `RUN_QUICK_ACTION` handler in `main.ts` looks up the action in the assistant's `quickActions` array. If the action is not found, it logs an error and returns without calling any handler. The manifest is the source of that array.
2. **Action registration.** `executionType: 'tool-only'` tells the router to call the handler directly rather than routing through the LLM path. `requiresSelection: true` is recorded in manifest metadata for consistency with other actions and for any future auto-generated action surfaces.
3. **Metadata consistency.** Keeping all quick actions in the manifest prevents routing divergence if a future surface auto-renders buttons from assistant metadata.

**Important distinction:** The custom button's `disabled` prop in `AnalyticsTaggingWelcome.tsx` and `AnalyticsTaggingView.tsx` is driven by local React state (`hasSelection` and `ataIsAddingAnnotations`) — not by manifest metadata. The manifest `requiresSelection` field does not directly control the custom button. It is the React component's own responsibility to check selection state and disable accordingly.

**Source of truth:** `custom/assistants/analytics_tagging/manifest.json`.
**Generated artifact:** `src/assistants/assistants.generated.ts` — regenerated automatically by `npm run build` (via `scripts/build-assistants.ts`). This file must not be edited manually.

---

## Message Types

### `ANALYTICS_TAGGING_ADD_ANNOTATIONS_DONE` (Main → UI)

Sent on **every terminal outcome** — success, partial success, and error. The UI uses this to reset the loading state. This message is never omitted.

```ts
export interface AnalyticsTaggingAddAnnotationsDoneMessage {
  type: 'ANALYTICS_TAGGING_ADD_ANNOTATIONS_DONE'
  result: AutoAnnotateResult | null   // non-null on success (including partial)
  error: string | null                // non-null when the run failed to start or threw
}
```

- **On success:** `{ result: AutoAnnotateResult, error: null }`
- **On run-level error** (category creation failed, scanner threw, no scan roots): `{ result: null, error: "<descriptive message>" }`. The `error` string must be descriptive and specific — e.g. `"Could not create 'ActionID' annotation category"` or `"Smart Detector failed: <original message>"`. It must not be replaced with a generic fallback.
- **Per-node write failures** are counted in `result.writeFailed` and are not surfaced as `error`. They are reported in the summary message.

---

## UI

### State

```ts
const [ataIsAddingAnnotations, setAtaIsAddingAnnotations] = useState(false)
```

Reset to `false` on every `ANALYTICS_TAGGING_ADD_ANNOTATIONS_DONE` message — both success and error paths. The UI never remains stuck in loading state.

### Handler

```ts
const handleAddAnnotations = useCallback(() => {
  setAtaIsAddingAnnotations(true)
  emit<RunQuickActionHandler>('RUN_QUICK_ACTION', 'add-annotations', 'analytics_tagging')
}, [])
```

**Idempotency:**
- **Primary guard:** UI disabled state (`ataIsAddingAnnotations === true`) prevents re-emit while running.
- **Secondary guard:** Existing tool-only emit debounce (`lastToolOnlyEmitRef`, 800 ms) in `handleQuickAction`. Note: `handleAddAnnotations` emits directly (like `handleFixNearMisses`), so it bypasses `handleQuickAction`'s debounce — the primary UI guard is the sole protection.

### Button placement

**Welcome state (`AnalyticsTaggingWelcome.tsx`):** Secondary outlined button below the primary "Get Analytics Tags" CTA. Disabled when `!hasSelection` or `isAddingAnnotations`.

**View state (`AnalyticsTaggingView.tsx`):** In the footer action row alongside "Append Selection". Disabled when `!hasSelection` or `isAddingAnnotations`.

**Loading state:** Button label changes to "Adding…" and is disabled. No other panel state changes (no banner, no partial result display) while running.

**Completion:** Loading state clears. Status bar shows the summary string derived from `AutoAnnotateResult`. No secondary banner or partial-success state is introduced.

---

## Status Message Format

Derived from `AutoAnnotateResult`. Logic:

Implemented as `buildSummaryMessage(result: AutoAnnotateResult | null, error: string | null): string`. Evaluated in order — first match wins.

```
if error is non-null:
  → error string directly (e.g. "Could not create 'ActionID' annotation category")

if screensProcessed === 0:
  → "No screens found in selection."

// writeFailed-aware zero cases — checked before "no elements" to avoid misleading messages

if writeFailed > 0 and actionIdAdded === 0 and skippedExisting === 0 and screenIdAdded === 0:
  // All attempts failed; nothing else happened
  → "{writeFailed} annotation write(s) failed — check for locked layers."

if actionIdAdded === 0 and skippedExisting === 0 and screenIdAdded === 0:
  // Zero writes, zero skips, zero ScreenIDs — truly nothing detected
  → "No interactive elements detected in the selection."

if actionIdAdded === 0 and skippedExisting === 0:
  // ScreenID added, no interactive elements found (writeFailed suffix if relevant)
  → "Added ScreenID to {screenIdAdded} screen(s). No interactive elements detected."
    suffix if writeFailed > 0: " ({writeFailed} write(s) failed.)"

if actionIdAdded === 0:
  // All detected elements were already tagged (writeFailed suffix if relevant)
  → prefix "Added ScreenID to {screenIdAdded} screen(s). " if screenIdAdded > 0
  → "No new ActionID annotations needed — all detected elements are already tagged."
    suffix if writeFailed > 0: " ({writeFailed} write(s) failed.)"

// Base: at least one ActionID was written
→ "Added ScreenID to {screenIdAdded} screen(s) and ActionID to {actionIdAdded} element(s)."
  suffix if skippedExisting > 0: " ({skippedExisting} already tagged, skipped.)"
  suffix if writeFailed > 0:     " ({writeFailed} could not be written — check for locked layers.)"
```

---

## Data Flow

```
User clicks "Add Annotations"
  │
  ├─ UI: setAtaIsAddingAnnotations(true) → button disabled
  └─ emit RUN_QUICK_ACTION('add-annotations', 'analytics_tagging')

Main thread (add-annotations branch):
  ├─ resolveSelection(selectionOrder, { containerStrategy: 'expand', skipHidden: true })
  │     → scanRoots[]
  ├─ if scanRoots.length === 0:
  │     postMessage DONE { result: null, error: "No screens found…" }
  │     replaceStatusMessage(error)
  │     return
  │
  └─ autoAnnotateScreens(scanRoots):
       ├─ ensureAnnotationCategory × 2 (throws on failure → caught above)
       ├─ getCategoryMapShared()
       ├─ For each root:
       │    ├─ ScreenID pass (root only)
       │    ├─ scanSelectionSmart([root], { maxNodes: 500 })
       │    ├─ Dedupe elements by nodeId
       │    ├─ Filter by confidence + kind
       │    └─ For each qualifying descendant: check skip → write or skip
       └─ clearAnnotationCategoryCache()
            return AutoAnnotateResult

  postMessage ANALYTICS_TAGGING_ADD_ANNOTATIONS_DONE { result, error: null }
  replaceStatusMessage(buildSummaryMessage(result))

UI receives DONE → setAtaIsAddingAnnotations(false)
```

---

## Error Handling

| Condition | Behaviour |
|---|---|
| Empty selection / no scan roots | DONE sent with `error`; status message shown; loading cleared |
| `ensureAnnotationCategory` fails | DONE sent with `error: "Could not create annotation category"`; abort |
| `scanSelectionSmart` throws | Caught; DONE sent with `error`; loading cleared |
| `getNodeByIdAsync` returns null | Skip silently; not counted |
| `safeSetNativeAnnotations` returns false | Count in `writeFailed`; continue; reported in summary |
| Zero interactive elements detected | Non-error DONE; summary: "No interactive elements detected" |
| All elements already tagged | Non-error DONE; summary: "No new annotations needed" |

---

## Testing

### New file: `tests/autoAnnotator.test.ts`

Uses `node:assert` + `tsx` pattern (same as `nearMissDetector.test.ts`).

#### Pure / extractable tests (no Figma mock needed)

These test logic extracted as standalone pure functions from `autoAnnotator.ts`:

- `isAnnotatableKind(kind: string): boolean` — extracted from the Set membership check
  - Returns true for all 21 kinds in `ANNOTATABLE_ELEMENT_KINDS`
  - Returns false for excluded kinds: `navbar`, `tabs`, `pagination`, `sidenav_drawer`, `breadcrumb`, `heading`, `image`, `icon`, `divider`, `table`, `list`
- `buildSummaryMessage(result: AutoAnnotateResult | null, error: string | null): string`
  - Tests all summary branches: error path, zero screens, all-tagged, none-detected, base with/without suffixes
- ScreenID value format: `"FrameName_REVIEW"` — frame name is taken verbatim and `_REVIEW` is appended

#### Integration-style tests (lightweight mock)

`autoAnnotateScreens` is side-effectful. Tests use lightweight fake objects rather than a full Figma API mock:

- **Skip existing valid ActionID:** node with `annotations: [{ categoryId: 'cat-action' }]` where `categoryMap.get('cat-action') === 'ActionID'` → `skippedExisting: 1, actionIdAdded: 0`
- **Skip existing near-miss ActionID:** same but label is `'Action ID'` → same result
- **Root exclusion:** Smart Detector emits the root frame nodeId → not annotated as ActionID
- **ScreenID skipped when present:** root already has ScreenID category annotation → `screenIdAdded: 0`
- **ScreenID added when absent:** `screenIdAdded: 1`; written value is `"FrameName_REVIEW"`
- **Null node:** `getNodeByIdAsync` returns null → skipped, `writeFailed` unchanged
- **Write failure:** `safeSetNativeAnnotations` returns false → `writeFailed: 1, actionIdAdded: 0`
- **Dedupe:** two `DetectedElement` entries with same `nodeId` → one write attempt, not two
- **Category check is category-based only:** node has `annotation.label === 'ActionID'` but no matching `categoryId` → not skipped (label-text check is out of scope; only category label triggers skip)

Added to `npm test`.

---

## Analytics Tagging Best Practices Reference

The `ANNOTATABLE_ELEMENT_KINDS` set was derived from standard analytics tagging guidance across GA4, Amplitude, Segment, and Adobe Analytics:

| Category | Elements | Typical event |
|---|---|---|
| CTAs | `button`, `icon_button` | click |
| Navigation | `link`, `menu_item`, `accordion` | click / navigate |
| Form controls | `text_input`, `textarea`, `search_input`, `select`, `combobox`, `date_picker`, `file_upload`, `stepper`, `slider` | input / change |
| Toggles | `checkbox`, `radio`, `switch` | toggle |
| Tappable content | `card`, `list_item`, `chip_tag` | click / select |
| Unknown interactive | `unknown_interactive` | click |

Structural containers (`navbar`, `tabs`, `pagination`, `breadcrumb`, `sidenav_drawer`) are excluded because their child elements (buttons, links, menu items) are the actual interaction targets and will be detected and annotated individually.
