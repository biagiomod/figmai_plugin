# Analytics Tagging Assistant — Verification Checklist

Use this checklist to verify the implementation meets the requirements.

## 1. No screenshot bytes in clientStorage

- **Requirement:** Do NOT store screenshot bytes/base64 in `figma.clientStorage`.
- **Verify:** Inspect stored payload: only crop rect metrics (w/h), target hotspot ratios, container/target/root node ids, and `screenshotRef.id` are persisted.
- **Where:** `src/core/analyticsTagging/storage.ts` (saveSession writes only Session; Row has `screenshotRef` with no bytes). `src/core/analyticsTagging/types.ts` (Row.screenshotRef has no dataUrl/bytes).

## 2. Temp capture frame always deleted

- **Requirement:** Temporary frame `__figmai_tmp_capture__` must always be removed in a `finally` block.
- **Verify:** Screenshot capture runs in try/finally; `frame.remove()` is in `finally`.
- **Where:** `src/core/analyticsTagging/screenshot.ts` — `captureVisibleInArea()` uses `try { ... } finally { if (frame.parent) frame.remove() }`.

## 3. Selection rule supports geometry + descendant

- **Requirement:** Accept target if (A) target is a descendant of the container, OR (B) target center lies within the container crop rect; if (B) but not (A), show non-blocking warning.
- **Verify:** Selection validation allows both cases; `targetGeometryWarning` is set when target is inside by geometry but not a descendant.
- **Where:** `src/core/analyticsTagging/selection.ts` — `validateSelection()` returns `ok: true` with `targetGeometryWarning: true` when center inside but not descendant; handler passes warning to UI.

## 4. Confluence export uses existing pipeline

- **Requirement:** Analytics Tagging export reuses the same Confluence/XHTML path as Content Table.
- **Verify:** Export builds `UniversalContentTableV1` via `sessionToTable(session)`, uses preset `analytics-tagging`, and calls `buildConfluenceXhtmlFromTable` / ConfluenceModal with that table.
- **Where:** `src/core/analyticsTagging/sessionToTable.ts` (sessionToTable); `src/ui.tsx` (ConfluenceModal receives `sessionToTable(analyticsTaggingExportSession)` when opened from Analytics Tagging export); `src/core/contentTable/export/confluence.ts` (unchanged pipeline).

## Quick manual checks

1. **Add row:** Select two nodes (container, then target); run "Add row". Row appears; no screenshot bytes in clientStorage.
2. **New session:** Run "New session"; session clears and resets.
3. **Export:** Run "Export"; format modal opens; choose "Analytics Tagging" and Confluence; table exports via existing Confluence flow.
4. **Screenshot preview:** In table, click "Generate preview" for a row; preview appears (or error if nodes missing). Temp frame is not left on canvas.
5. **Geometry warning:** Select container and a target that is inside the container bounds but not a descendant; add row; non-blocking warning appears.
