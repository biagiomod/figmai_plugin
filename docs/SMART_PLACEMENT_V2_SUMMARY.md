# Smart Placement v2 — Implementation Summary

## What changed

- **Single-artifact placement** uses collision-aware logic (right → left → below → above → beyond-right) with obstacles from all direct page children (including locked). No overlap with existing content.
- **Batch placement** uses a single shared “below all page content” algorithm: union of page children bounds + margin; no overlap.
- **Re-run behavior**: Design Critique (Give Design Crit, Deceptive Review) and scorecard no longer remove or replace existing artifacts. Each run creates a new artifact; optional naming suffix ` (2)`, ` (3)` when the base name exists.

## What moved

- **`src/core/figma/placement.ts`**
  - New: `rectsOverlap`, `getPageContentBounds`, `getObstacles`, `computeSinglePlacement`, `placeSingleArtifactNearSelection`, `placeBatchBelowPageContent`.
  - `computeRootPlacement` and legacy flow kept but marked deprecated.
- **`src/core/figma/artifacts/placeArtifact.ts`**
  - Default `replace = false`; placement uses `placeSingleArtifactNearSelection`; when `replace === false`, `uniqueArtifactNameOnPage` for root name. `getAnchorBounds` re-export fixed (import from `stage/anchor`).
- **`src/core/figma/placeCritiqueFallback.ts`**
  - Replaced `getPlacementTarget` / `getAnchorBounds` / `computeRootPlacement` / `placeNodeOnPage` with `placeSingleArtifactNearSelection(..., { preferSide: 'right', margin: 24, step: 24 })`.
- **`src/core/assistants/handlers/designCritique.ts`**
  - **Add Deceptive Demos**: container placement uses `placeBatchBelowPageContent(container, { marginTop: 24 })`.
  - **Deceptive Review**: no `removeExistingArtifacts` in catch block; `createArtifact` never passes `replace: true`.
  - Imports: `placeBatchBelowPageContent` from placement, `getTopLevelContainerNode` from stage/anchor (still used elsewhere); removed `removeExistingArtifacts`, `getPlacementTarget`, `computeRootPlacement`, `placeNodeOnPage`.
- **`src/core/discovery/renderer.ts`**
  - Initial document placement: `placeBatchBelowPageContent(frame, { marginTop: 24 })` instead of local `calculateSectionPlacement` + append + set x/y (local helper left in file but unused).
- **`src/core/designWorkshop/renderer.ts`**
  - Section placement: `placeBatchBelowPageContent(section, { marginTop: 24 })` instead of local `calculateSectionPlacement` + append + set x/y (local helper left in file but unused).
- **`src/core/figma/renderScorecard.ts`**
  - v1 path: no `removeExistingArtifacts('scorecard')`; `placeArtifactFrame(..., { replace: false })`.

## How to test quickly

1. **Single artifact**
   - Give Design Crit with nothing selected → artifact near viewport; run again → second artifact (e.g. “Design Critique (2)”).
   - Give Design Crit with a frame selected, space to the right → artifact to the right with gap; block right with another frame → artifact goes left (or below/above/beyond as space allows).
   - No overlap with existing or locked nodes.
2. **Batch**
   - Add Deceptive Demos → container below all page content.
   - Discovery / Design Workshop new document/section → below all page content.
3. **Re-run**
   - Run “Give Design Crit” twice → two scorecards/critiques.
   - Run “Deceptive Review” twice → two deceptive reports.
   - No deletion or replacement of previous artifacts.
4. **Build**
   - `npm run build` passes.

## Non-negotiables (met)

- Plugin-generated items are not placed on top of existing page children (locked nodes treated as obstacles).
- Re-running does not replace or remove existing artifacts (scorecard, critique, deceptive-report).
- Existing placement APIs remain available; v2 APIs added and call sites migrated in phases.
- Build passes: `npm run build`.
