# Smart Placement v2 — Audit and Implementation Plan

## 1. Current State Map

### 1.1 Where placement logic lives

| Location | Functions | Behavior | Collision? |
|----------|-----------|----------|------------|
| **`src/core/figma/placement.ts`** | `getPlacementTarget`, `computeRootPlacement`, `placeNodeOnPage` | Anchor-based: primary side (left/right), fallback opposite side, then viewport center. Default `side: 'left'`. No BELOW/ABOVE. No collision checks. | No |
| **`src/core/figma/placement.ts`** (deprecated) | `findRootContainer`, `calculateLeftPlacement`, `applyPlacement` | Legacy left-only placement; no call sites in app code (only definitions). | No |
| **`src/core/stage/anchor.ts`** | `getTopLevelContainerNode`, `getAnchorBounds`, `computePlacement` | Mode: left \| right \| above \| below \| center. Single candidate position per call; no fallbacks, no collision. | No |
| **`src/core/figma/artifacts/placeArtifact.ts`** | `placeArtifactFrame`, `findExistingArtifactsByType`, `removeExistingArtifacts` | Uses `placement.ts` (getPlacementTarget → getAnchorBounds → computeRootPlacement → placeNodeOnPage). Default `replace: true` → removes existing same type/version before place. `side: 'left'`. | No |
| **`src/core/discovery/renderer.ts`** | `calculateSectionPlacement` (local) | “Below lowest” page child + 120px; x=0. No collision. | No |
| **`src/core/designWorkshop/renderer.ts`** | `calculateSectionPlacement` (local) | Same algorithm as discovery: below lowest + 120px; x=0. Duplicated logic. | No |

### 1.2 All known call sites and bypasses

**Using shared placement path (figma/placement.ts or placeArtifactFrame):**

- **`placeArtifact.ts`** → `placeArtifactFrame()`: scorecard, deceptive-report, critique (via createArtifact / renderScorecard).
- **`placeCritiqueFallback.ts`** → `getPlacementTarget`, `getAnchorBounds`, `computeRootPlacement` (side: 'left'), `placeNodeOnPage`.
- **`designCritique.ts`** (Add Deceptive Demos) → `getPlacementTarget`, `getAnchorBounds`, `computeRootPlacement` (side: 'right', spacing: 40), `placeNodeOnPage(container)`.

**Using stage/anchor.ts `computePlacement` (separate path, no collision):**

- **`renderDocument.ts`** → anchor from selection, `computePlacement(anchorBounds, …, { mode: 'left', offset: 40 })`, then `container.x/y`, appendChild.
- **`renderPlaceholderScorecard.ts`** → same: `computePlacement(..., { mode: 'left', offset: 40 })`, container.x/y, appendChild.
- **`renderDesignSpec.ts`** → `computePlacement(..., options.placement ?? 'left', options.offset ?? 40)`, rootNode.x/y, appendChild.

**Ad-hoc / bypass (direct x/y or viewport center):**

- **`discovery/renderer.ts`** → local `calculateSectionPlacement(frame)` then `frame.x`, `frame.y`, appendChild.
- **`designWorkshop/renderer.ts`** → local `calculateSectionPlacement(section)` then `section.x`, `section.y`, appendChild.
- **`designWorkshop.ts` (handler)** → `annotationFrame.x = section.x + section.width + 40`, `annotationFrame.y = section.y` (relative to section only).
- **`figmaTools.ts`** → annotation: `annotation.x = node.x + node.width + 10`, `annotation.y = node.y`; checklist: `frame.x/y = viewport.center +/- 100`.
- **`componentService.ts`** → `instance.x/y = position ?? viewport center`.
- **`jsonTools.ts`** → `rootNode.x/y = viewport.center - half size`.

### 1.3 Where replacement/overwrite behavior happens

- **`placeArtifact.ts`**  
  - `placeArtifactFrame()`: `replace === true` (default) → calls `removeExistingArtifacts(type, version)` before creating/placing.  
  - So every artifact type that uses `placeArtifactFrame` with `replace: true` is “replace in place” by type/version.

- **`designCritique.ts`**  
  - Give critique: `removeExistingArtifacts('scorecard', 'v2')` and `removeExistingArtifacts('critique')` before placing scorecard.  
  - Deceptive review: `removeExistingArtifacts('deceptive-report', 'v1')` before placing report; on error again `removeExistingArtifacts('deceptive-report', 'v1')`.

- **`renderScorecard.ts`**  
  - v1: `removeExistingArtifacts('scorecard')` (all versions) then `placeArtifactFrame(..., replace: true)`.  
  - v2: `placeArtifactFrame(..., version: 'v2', replace: true)` (which removes existing v2 scorecards).

- **Discovery / Design Workshop**  
  - Discovery: `updateDiscoveryDocument()` updates the same frame in place (replaces contents), does not create a new artifact each run.  
  - Design Workshop: creates new section each run; annotation is positioned relative to that section. No artifact-type “replace” by name.

So “re-running creates new output” is violated today for: scorecard (v1 and v2), critique, deceptive-report. Optional suffix naming (e.g. “Design Critique Report (2)”) does not exist.

---

## 2. Proposed Smart Placement v2 Design

### 2.1 API surface (single source of truth)

Place all placement APIs in **`src/core/figma/placement.ts`** (or a dedicated `placementV2.ts` that re-exports from placement). Stage `anchor.ts` stays for bounds only; placement decisions live in figma layer.

**Single-item placement (e.g. one report):**

```ts
placeSingleArtifactNearSelection(
  node: FrameNode,
  options: {
    selectedNode?: SceneNode
    preferSide?: 'right' | 'left'   // default: 'right'
    margin?: number                 // default: 24
    step?: number                   // default: 24, grid step for “beyond obstruction”
  }
): PlacementResult
```

- Appends `node` to current page, computes position, sets `node.x/y`, selects and scrolls into view.
- Strategy: try RIGHT → LEFT → BELOW → ABOVE (each with margin); if all collide, place to the right past the furthest obstruction in that horizontal band (using step).
- Returns outcome (coordinates + method used) for logging.

**Batch placement (e.g. templated screens / demo cards):**

```ts
placeBatchBelowPageContent(
  node: FrameNode,
  options?: {
    marginTop?: number   // gap above first item of batch; default: 24
    minX?: number
    minY?: number
  }
): PlacementResult
```

- Appends `node` to current page.
- Position: x = minX (e.g. 0 or 24), y = (lowest bottom of all page children excluding `node`) + marginTop.
- No collision check needed if “lowest bounds” is used; optionally clamp so batch does not go above viewport.

**Low-level (for call sites that need only coordinates):**

```ts
computeSinglePlacement(
  placedSize: { width: number; height: number },
  options: {
    anchorBounds: Rect | null
    preferSide?: 'right' | 'left'
    margin?: number
    step?: number
    obstacles?: Rect[]
  }
): PlacementResult

getPageContentBounds(page: PageNode, exclude?: SceneNode): Rect | null
```

- `getPageContentBounds`: union of absolute bounds of all direct children of page (excluding `exclude`); returns null if no children. Used for “lowest bottom” and for obstacle list.
- `computeSinglePlacement`: implements right → left → below → above → beyond-right; uses `obstacles` for collision.

### 2.2 Data needed

- **Selection/anchor:** Already available via `getPlacementTarget(selectedNode)` and `getAnchorBounds(placementTarget)` from placement.ts and stage/anchor.ts. Keep using these for anchor bounds.
- **Page content bounds:** New helper `getPageContentBounds(page, exclude?)` returning union of page children bounds (and optionally `{ bounds, obstacles: Rect[] }` for collision).
- **Obstacles list:** For single-item collision:
  - All current page direct children (excluding the node being placed) as rects (absolute bounds).
  - Include locked nodes as obstacles (do not place on top of them).
  - Optionally include nested plugin artifacts (e.g. frames with `figmai.artifactType`) so we treat them as solid; first version can use only top-level page children.

### 2.3 Collision algorithm

- **Representation:** Each obstacle is a `Rect` (x, y, width, height) in page coordinates.
- **Collision:** Two rects collide if they overlap (e.g. `!((a.x + a.width <= b.x) || (b.x + b.width <= a.x) || (a.y + a.height <= b.y) || (b.y + b.height <= a.y))`).
- **Candidate positions:** For single item, generate up to 5 candidates in order: right of anchor, left of anchor, below anchor, above anchor, then “right beyond furthest in band” (anchor.y band, then step to the right until no collision).
- **Margin:** All candidates use `margin` (default 24px) gap from anchor (or from obstacles when shifting).
- **Grid:** When placing “beyond obstruction”, snap candidate x to multiples of `step` (default 24px) to keep layout tidy.

### 2.4 Placement search strategy (single item)

1. **RIGHT** of selection (anchor right edge + margin). If no collision with any obstacle → use it.
2. **LEFT** (anchor left edge - margin - width). If no collision → use it.
3. **BELOW** (anchor bottom + margin). If no collision → use it.
4. **ABOVE** (anchor top - margin - height). If no collision → use it.
5. **Beyond obstruction:** In the horizontal band of the anchor (e.g. same vertical range), find the rightmost obstacle; place to the right of that with margin, x aligned to step. If still in collision (e.g. tall obstacles), advance x by step and repeat until no collision or max iterations.

### 2.5 Batch strategy

- Single call: compute “page content bounds” (union of page children, excluding the new node).
- `y = max(0, contentBounds.bottom + marginTop)` (or contentBounds = null → y = marginTop).
- `x = minX` (e.g. 0 or 24).
- No need to consider selection for batch; always “below everything”.

### 2.6 Margin and grid

- **Default margin:** 24px (between artifact and anchor, and between artifact and obstacles).
- **Default step:** 24px for “beyond obstruction” horizontal stepping.
- **Config surface:** Keep minimal: optional `PlacementConfig` (e.g. margin, step, minX, minY) passable from options; no global config unless needed later.

---

## 3. Rollout Plan

### Phase 1 — Central placement and collision (no behavior change yet)

1. **Add to `placement.ts` (or new `placementV2.ts`):**
   - `getPageContentBounds(page, exclude?)`.
   - `getObstacles(page, exclude?)`: return `Rect[]` for page direct children (use existing getAnchorBounds/getAbsoluteBounds from anchor for each child).
   - `rectsOverlap(a: Rect, b: Rect): boolean`.
   - `computeSinglePlacement(size, { anchorBounds, preferSide, margin, step, obstacles }): PlacementResult` implementing right → left → below → above → beyond-right.
   - `placeSingleArtifactNearSelection(node, options)` using the above and `placeNodeOnPage`.
   - `placeBatchBelowPageContent(node, options)` using `getPageContentBounds` and fixed x.

2. **Keep existing exports** `getPlacementTarget`, `getAnchorBounds` (from anchor), `placeNodeOnPage`, and current `computeRootPlacement` for compatibility; mark `computeRootPlacement` as superseded by `computeSinglePlacement` in comments only for now.

### Phase 2 — Switch artifact path to “never replace” and new placement

3. **Artifact placement:**
   - In `placeArtifact.ts`: add option `replace?: boolean` (default **false** for new behavior). When `replace === false`, do **not** call `removeExistingArtifacts`. Always create new root and place it.
   - Optional naming: when creating root name, if `replace === false`, optionally append suffix “ (2)”, “ (3)” by scanning page for same base name and incrementing (e.g. “FigmAI Artifact — Scorecard (v2)” → “FigmAI Artifact — Scorecard (v2) (2)”). Keep this simple and optional in Phase 2.

4. **Migrate `placeArtifactFrame` to Smart Placement:**
   - Inside `placeArtifactFrame`, after creating root and appending to page, call `placeSingleArtifactNearSelection(root, { selectedNode, preferSide: 'right', margin: 24, step: 24 })` instead of current getPlacementTarget → computeRootPlacement → placeNodeOnPage. Obtain obstacles from `getObstacles(figma.currentPage, root)`.

5. **Call sites that must pass `replace: false`:**
   - Design Critique (give-critique): stop calling `removeExistingArtifacts` before place; pass `replace: false` to `placeArtifactFrame` / `createArtifact`.
   - Deceptive review: stop calling `removeExistingArtifacts('deceptive-report', 'v1')` before/on error; pass `replace: false` for deceptive-report.
   - Scorecard v1/v2: pass `replace: false` and remove all `removeExistingArtifacts('scorecard', ...)` and `removeExistingArtifacts('critique')` from designCritique handler and from renderScorecard.

### Phase 3 — Migrate other call sites to shared placement

6. **placeCritiqueFallback:** Use `placeSingleArtifactNearSelection(frame, { selectedNode, preferSide: 'right', margin: 24 })` instead of manual getPlacementTarget → computeRootPlacement → placeNodeOnPage.

7. **Add Deceptive Demos (designCritique):** Use `placeBatchBelowPageContent(container, { marginTop: 24 })` instead of current computeRootPlacement(…, side: 'right').

8. **Discovery and Design Workshop “below” placement:** Replace local `calculateSectionPlacement` with shared `placeBatchBelowPageContent`. Discovery: create frame, append to page, then call `placeBatchBelowPageContent(frame, …)` and set frame.x/y from result (or let a helper do append + position). Design Workshop: same for section.

9. **Stage renderers (renderDocument, renderPlaceholderScorecard, renderDesignSpec):** Prefer importing `placeSingleArtifactNearSelection` or `computeSinglePlacement` from placement and using it with anchor from selection; or keep using anchor only for bounds and call new `computeSinglePlacement` with obstacles from `getObstacles(page)`. Goal: one code path (placement.ts), no use of `stage/anchor.ts` `computePlacement` for final placement (keep getAnchorBounds/getTopLevelContainerNode).

10. **Deprecate:** `computePlacement` in `stage/anchor.ts` (doc only first); after migration, point call sites to placement.ts.

### Phase 4 — Optional cleanups

11. **designWorkshop annotation:** Position annotation using a small helper that takes “relative to section” and optionally runs a single collision check so it doesn’t cover content; or keep current relative positioning and leave for later.

12. **figmaTools / componentService / jsonTools:** Leave viewport-center and ad-hoc placement as-is unless product asks for “never overlap” for these tools; then feed viewport center as synthetic “anchor” or use `placeSingleArtifactNearSelection` with no selection (already falls back to non-overlap if we add viewport obstacles).

13. **Remove or clearly deprecate:** `findRootContainer`, `calculateLeftPlacement`, `applyPlacement` in placement.ts once no references remain (already no call sites; only definitions).

---

## 4. Verification Checklist

- **Single item, clear space on right:** With selection and nothing on the right, new artifact lands to the right of selection with 24px gap.
- **Single item, right blocked:** With an obstacle to the right of selection, artifact lands to the left (or below/above per spec).
- **Single item, all sides blocked:** Artifact lands to the right past the furthest obstruction in that band (step 24px).
- **Batch placement:** “Add Deceptive Demos” and Discovery/Design Workshop sections always place below the lowest existing page content; margin 24px above batch.
- **No overlap:** New artifact never overlaps existing page children or locked nodes (verify with a few manual tests: place frame, run action, confirm no overlap).
- **Re-run creates new:** Run “Give Design Crit” twice: two scorecards exist; run Deceptive Review twice: two reports. No removal of previous artifact. Names can be “(2)” on second run if suffix logic is added.

---

## 5. Metadata (pluginTag)

- **Existing:** `figmai.artifactType`, `figmai.artifactVersion` (and naming “FigmAI Artifact — …”) already identify plugin outputs. Sufficient for “find existing” for naming suffix and for excluding from obstacles if we ever want to.
- **Optional:** A single `figmai.pluginTag = 'figmai'` (or versioned tag) could be set on every plugin-created root for a quick “is this ours?” filter. Not required for v2; recommend adding only if we introduce more complex policies (e.g. “only avoid overlapping other FigmAI artifacts”). Omit for minimal surface.

---

## 6. Summary

- **Current state:** Two placement paths (figma/placement.ts and stage/anchor.ts), no collision checks, duplicated “below lowest” in discovery and designWorkshop, and explicit “replace in place” via `removeExistingArtifacts` for scorecard, critique, and deceptive-report.
- **v2 design:** Single API in figma placement: `placeSingleArtifactNearSelection` (right → left → below → above → beyond obstruction, with obstacles) and `placeBatchBelowPageContent`; 24px margin and 24px step; no replace-by-type — always create new artifact, optional “(2)” naming.
- **Rollout:** Add collision and new APIs → switch artifacts to replace: false and new placement → migrate all placement call sites to shared APIs → deprecate old placement helpers.

After approval, Code Steward can implement Smart Placement v2 and migrate call sites per this plan.
