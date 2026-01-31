# Analytics Tagging Assistant — Plan

## Overview

New assistant/flow: **Analytics Tagging Assistant** that reuses the Content Table Assistant table/export pattern. User selects two nodes (interaction area container + interaction target); plugin derives root screen container for ScreenID; reads dev-mode annotations (ScreenID, ActionID); persists session/rows to clientStorage (and optionally sharedPluginData); captures subsection screenshot with hotspot; each row maps to Confluence table row via the same export pipeline.

**Constraints:** No employer/internal references in docs or UI copy. Prefer “custom” over “work” in prose/UI. No layout/HUG changes outside what is required for this feature.

---

## 1. Data model (DraftRow, Row, Session) + storage strategy

### 1.1 Row fields (per row)

| Field | Source | Editable | Notes |
|-------|--------|----------|--------|
| **Screen ID** | Auto (root screen container or fallback), editable | Yes | From annotation tag ScreenID or root screen name/layer |
| **Screenshot** | Generated + stored for export | No (regenerate only) | Subsection crop + hotspot; stored as base64 or bytes ref |
| **Description** | Manual | Yes | User text |
| **Action Type** | Dropdown | Yes | Action \| Interaction \| Screen Event \| Personalization Event |
| **Component** | Auto-detect instance mainComponent name else `custom`, editable | Yes | Same pattern as Content Table scanner |
| **Action Name** | Optional; annotation or node name, editable | Yes | From tag ActionID or target node name |
| **Figma element link** | Auto (node URL), non-editable in cell | No | UI: “Link captured” + copy; canonical Figma file URL |
| **Population** | Manual | Yes | User text |
| **Note** | Manual | Yes | User text |

### 1.2 DraftRow (in-memory / UI state)

- Same shape as Row but may have missing/invalid fields (e.g. screenshot pending, ScreenID missing).
- Used while user is editing before “Add row” or “Save row”.
- Optional: `screenshotDataUrl?: string`, `screenIdWarning?: boolean`, `actionIdWarning?: boolean`.

### 1.3 Row (persisted)

- **id:** string (UUID or stable id per row).
- **screenId:** string
- **screenshot:** stored representation (see storage) — e.g. `dataUrl` or key into blob storage.
- **description:** string
- **actionType:** `'Action' | 'Interaction' | 'Screen Event' | 'Personalization Event'`
- **component:** string
- **actionName:** string
- **figmaElementLink:** string (URL)
- **population:** string
- **note:** string
- **meta (optional):** containerNodeId, targetNodeId, rootScreenNodeId, capturedAtISO — for regeneration and Confluence context.

### 1.4 Session

- **id:** string (e.g. UUID).
- **rows:** Row[]
- **createdAtISO:** string
- **updatedAtISO:** string
- **source (optional):** pageId, pageName — for Confluence/export context.

### 1.5 Storage strategy

- **clientStorage keys:**
  - `figmai.analyticsTagging.session` — current session JSON (Session).
  - Version key: include `version: 1` in the stored object for future migrations.
- **Autosave:** On every row add/update/delete and on session field changes, serialize Session and `figma.clientStorage.setAsync('figmai.analyticsTagging.session', session)`. No “Save” button required for persistence; optional “New session” clears and overwrites.
- **Versioning / migrations:** On load, read stored JSON; if `version === undefined`, treat as v0 and migrate to v1 (e.g. add default actionType, normalize field names). Future: if `version < 2`, run migration to v2 and save. Migrations run in plugin main thread only; no new network calls.
- **Optional mirror to sharedPluginData:** If enabled (e.g. per-session or global setting), mirror key fields to a chosen node (e.g. root screen container): e.g. `figmai.analyticsTagging.screenId`, `figmai.analyticsTagging.lastActionId`. Specification: store only non-PII, short strings; do not store screenshot bytes in pluginData (size limits). Document as optional; default off.

---

## 2. Selection validation rules

- **Requirement:** Exactly two nodes selected.
  - **First (primary):** Interaction area container — frame/component/instance that defines the crop region (subsection).
  - **Second:** Interaction target — button/link/etc. (may be inside or outside the container hierarchy).
- **Validation rules:**
  1. **Count:** Exactly 2 nodes. If 0 or 1: show “Select two nodes: interaction area (container), then interaction target.” If &gt;2: show “Select only two nodes: container, then target.”
  2. **Container:** First selected node must be a valid container (FRAME, COMPONENT, INSTANCE, or GROUP with bounds). If not: “First selection must be the interaction area (frame/component/group).”
  3. **Target vs crop rect:** The interaction target (second node) must either:
     - **Option A (safest):** Be a descendant of the container (contained in hierarchy), or
     - **Option B:** Have its absolute bounds **fully inside** the container’s absolute bounds (contained geometrically), or
     - **Option C:** **Intersect** the container’s absolute bounds (target overlaps the crop region).
   - **Recommendation:** Use **Option B (fully inside)** for predictability: “Interaction target must lie inside the interaction area.” If target is outside, show: “Move the target inside the interaction area, or select a different target.” Option C (intersect) is more permissive but can include targets only partially visible in the crop; document as alternative if product prefers.
  4. **Root screen:** Derived from container (see §3). No selection rule for root screen; derivation only.

---

## 3. Root screen container heuristic for ScreenID

- **Input:** The interaction area container (first selected node).
- **Steps:**
  1. Walk up the parent chain from the container until the parent is **PAGE** (direct child of page). That node is the **root page-level container** (same as `getTopLevelContainerNode(container)` in `src/core/stage/anchor.ts`).
  2. Use this root container as the **Screen** for ScreenID.
  3. **ScreenID value:** Prefer annotation tag `ScreenID` on the root container (or on the container itself if no annotation on root); if missing, fallback to root container’s **layer name** (e.g. `Screen – Home` → “Screen – Home” or a normalized form). If root has no name, fallback to container’s name. Document as: “ScreenID: from tag ScreenID on root screen container, else root container layer name.”
- **Reuse:** Use existing `getTopLevelContainerNode(container)` from `src/core/stage/anchor.ts`; no new heuristic beyond annotation read (§4).

---

## 4. Annotation read strategy for ScreenID + ActionID

- **Figma API:** Dev-mode annotations are available on nodes via `node.annotations` (array). Each annotation has `label`, `labelMarkdown`, `properties`, `categoryId`. Use `label` (or `labelMarkdown` stripped to plain text) for tag parsing.
- **Tag convention:** Assume annotations like “ScreenID: Home” and “ActionID: submit-button” (or “ScreenID=Home”, “ActionID=submit-button”). Parser: split on `:` or `=`, trim key and value; key case-insensitive; value is the rest of the string.
- **ScreenID:** Read from (1) root screen container’s annotations (first matching tag “ScreenID”), (2) if not found, from interaction area container’s annotations. Fallback: root container’s layer name (§3).
- **ActionID:** Read from (1) interaction target node’s annotations (first matching tag “ActionID”). Fallback: target node’s **name** (e.g. “Submit”).
- **Missing annotations:** If ScreenID tag is missing, use fallback (layer name) and set a flag `screenIdFromFallback: true` for UI warning. If ActionID tag is missing, use fallback (node name) and set `actionIdFromFallback: true`. UI shows warning: “ScreenID (or ActionID) not found in annotations; using layer name. Add dev-mode annotations to override.” Allow manual edit in row; no block.

---

## 5. Screenshot pipeline design

1. **Compute crop rect:** From container (first selected node): get **absolute bounds** of the container (e.g. `absoluteBoundingBox` or `getAbsoluteBounds` from `src/core/stage/anchor.ts`). This rect is the crop region in page coordinates.
2. **Collect visible nodes in crop:** Traverse **page direct children** (and optionally their descendants) in **paint order** (order of `page.children`). For each node, get absolute bounds; if bounds **intersect** the crop rect, include it. Include nodes that are **visually above** the container (e.g. overlays) — i.e. do not restrict to container descendants. Filter out nodes that are fully outside the crop rect. Sort by paint order (page child index, then depth) so stacking is preserved.
3. **Clone into temp frame:** Create a new **FrameNode** (not appended to page yet). Set frame size to crop rect width and height. For each intersecting node, clone the node (e.g. `node.clone()`), position the clone so that its absolute position relative to the crop origin is preserved (clone.x = nodeAbsoluteX - cropRect.x, clone.y = nodeAbsoluteY - cropRect.y). Append clones to the temp frame. Do not modify the original scene graph except to read; temp frame is not appended to page until after positioning.
4. **Export frame:** Append temp frame to page (e.g. off-canvas or same page), then `frame.exportAsync({ format: 'PNG', ... })`. Use constraint to match crop dimensions (e.g. 1x or 2x scale). Read bytes; convert to base64 data URL for storage/export.
5. **Hotspot overlay (UI canvas):** Hotspot is **not** drawn in Figma. After export, the screenshot image is shown in the **plugin UI**. Draw a **circle** (or dot) overlay in the UI at the position of the interaction target **relative to the crop rect**: hotspotX = (targetAbsoluteX - cropRect.x) / cropRect.width * imageWidth, hotspotY = (targetAbsoluteY - cropRect.y) / cropRect.height * imageHeight. So: export is subsection-only (step 4); hotspot is applied when **rendering the image in the UI** (e.g. canvas or div with overlay). Store target relative position (e.g. `hotspotRatioX`, `hotspotRatioY`) in the row so the UI can redraw the hotspot on the same screenshot.
6. **Delete temp frame:** Remove the temp frame from the page and discard. No persistent stage artifacts.
7. **Store screenshot for export:** Save the screenshot bytes (or data URL) in the row (e.g. in Session.rows[].screenshot). Confluence/HTML export will embed or link the image the same way as Content Table thumbnail (e.g. base64 in `<img>` or upload to Confluence if API supports).

**Edge cases:** Locked nodes are still included in the clone set (read-only clone). Hidden nodes can be excluded (visible === false). Cloning may fail for some node types; document fallback (e.g. skip that node and log).

---

## 6. Reuse points with Content Table Assistant

### 6.1 Existing modules to reuse

- **Table rendering / export:**
  - `src/core/contentTable/renderers.ts` — `universalTableToHtml`, `universalTableToTsv`, `universalTableToJson` (take `UniversalContentTableV1` + preset).
  - `src/core/contentTable/export/confluence.ts` — `buildConfluenceXhtmlFromTable` (postProcess, normalize, HTML, XHTML encode).
  - `src/core/contentTable/validate.ts` — `normalizeContentTableV1` (and optionally a normalizer for analytics table → universal).
  - `src/core/encoding/xhtml.ts` — `encodeXhtmlDocument` (for Confluence).
- **Row serialization:** Content Table uses `ContentItemV1` and preset column `extract(item)`. Analytics Tagging will **map each Row to a synthetic ContentItemV1** (or a parallel type that satisfies the same column extract interface) so the same presets/renderers can be used. Alternatively: add a new **preset** (e.g. `analytics-tagging`) and a new column set in `presets.generated.ts` (or a separate preset file) that defines columns for Screen ID, Screenshot, Description, Action Type, Component, Action Name, Figma element link, Population, Note. Then the “universal” table passed to Confluence is built from Session.rows by mapping each Row to an item with those keys; renderers stay unchanged.
- **UI patterns:**
  - `src/ui/components/ConfluenceModal.tsx` — reuse as-is: accepts `contentTable: UniversalContentTableV1`, format, buildConfluenceXhtmlFromTable, createConfluence. So the Analytics Tagging UI must produce a `UniversalContentTableV1` from the current Session (see below).
  - Copy/export: same `universalTableToHtml`, `universalTableToTsv` for copy-to-clipboard and format modal.
  - Table view: same HTML table view pattern (e.g. `toHtmlTable` or universalTableToHtml with `forView: true`).

### 6.2 Integration: new assistant vs extension

- **Recommendation: new assistant.** Add **Analytics Tagging Assistant** as a separate assistant (e.g. `id: 'analytics_tagging'`) with its own quick actions (e.g. “Add row”, “Export to Confluence”, “New session”). It does **not** extend the Content Table Assistant (different selection model, different data source). Flow: user selects two nodes → runs “Add row” → plugin validates selection, derives ScreenID/ActionID, captures screenshot, creates DraftRow then Row, appends to Session, autosaves to clientStorage, sends session to UI. UI shows a **table of rows** (same table UX as Content Table: table view, copy, Confluence modal). When user clicks “Export to Confluence”, plugin builds a **UniversalContentTableV1** from Session.rows (map each Row to ContentItemV1-like item with keys matching the analytics preset columns), then opens ConfluenceModal with that table and format “analytics-tagging”. So:
  - **Conversion layer:** `sessionToUniversalContentTable(session: Session): UniversalContentTableV1` — builds meta (rootNodeId from first row or session), source (pageId, pageName), items array where each item is a synthetic ContentItemV1 with field paths matching the new preset columns (screenId, screenshot, description, actionType, component, actionName, figmaElementLink, population, note). Screenshot column: same as thumbnail — image in cell or link.
  - **New preset:** Add `analytics-tagging` to `TableFormatPreset` and a column set in presets (or `presets.analyticsTagging.ts`) so `universalTableToHtml(table, 'analytics-tagging')` produces the correct headers and cells.
- **Content Table Assistant:** Unchanged. No extension of its handler or selection logic. Only shared usage of ConfluenceModal, renderers, and export pipeline.

### 6.3 Data flow summary

- Analytics Tagging Session (clientStorage) → `sessionToUniversalContentTable(session)` → UniversalContentTableV1 → existing Confluence pipeline (buildConfluenceXhtmlFromTable, ConfluenceModal) and existing copy/table view. New code: Analytics Tagging handler, session storage, screenshot pipeline, UI for multi-row table and “Add row” / “Link captured” / autosave indicator; conversion function and new preset for columns.

---

## 7. Failure / recovery UX

- **Missing annotations:** Show inline warning near Screen ID and/or Action Name: “ScreenID (or ActionID) not found in annotations; using [layer name]. Add dev-mode annotations to override.” Row remains editable; user can type over. No block.
- **Invalid selection:** On “Add row” with wrong selection (not 2 nodes, or target not inside crop): show **guidance text** in status message and optionally in UI: “Select two nodes: first the interaction area (frame), then the interaction target inside it.” Do not clear session; user can fix selection and try again.
- **Autosave status indicator:** In the Analytics Tagging UI, show a small indicator: “Saved” (or checkmark) when last write to clientStorage succeeded; “Saving…” briefly after a change; “Save failed” if clientStorage.setAsync fails (with optional “Retry” or auto-retry once). No “Save” button required; “New session” clears in-memory and overwrites storage.
- **Screenshot failure:** If export or clone fails, show “Screenshot unavailable” in the row and leave screenshot field empty; allow user to retry “Capture” for that row (re-run with same container/target if still selected) or edit row without screenshot. Confluence export can show “No image” for that cell.

---

## 8. Implementation sequence + file touch list

### 8.1 Implementation order

1. **Data model and storage**
   - Define types: DraftRow, Row, Session (and versioned stored shape).
   - Implement clientStorage get/set with version and migration (v0 → v1).
   - Optional: sharedPluginData mirror (small scope).

2. **Selection validation and root screen**
   - Implement two-node validation (count, container type, target inside crop).
   - Use getTopLevelContainerNode(container) for root screen.
   - Add annotation reader: parse ScreenID and ActionID from node.annotations (with fallback to layer/node name).

3. **Screenshot pipeline**
   - Crop rect from container bounds; collect intersecting nodes in paint order; clone into temp frame; export; delete temp frame; store bytes/data URL in row. Hotspot position computed (relative to crop) and stored in row.

4. **Row creation flow**
   - On “Add row”: validate selection → read ScreenID/ActionID → capture screenshot → build Row → append to Session → autosave → send session to UI.

5. **Conversion and preset**
   - Implement sessionToUniversalContentTable(session).
   - Add TableFormatPreset `analytics-tagging` and column definitions (screenId, screenshot, description, actionType, component, actionName, figmaElementLink, population, note). Wire universalTableToHtml / renderers to support new preset (meta row optional or adapted).

6. **Analytics Tagging assistant and handler**
   - Register assistant (id, label, quick actions: Add row, Export to Confluence, New session).
   - Handler: canHandle(analytics_tagging, actionId); for “add-row” run selection validation + screenshot + append row + autosave + postMessage session to UI; for “export” open Confluence modal with converted table; for “new-session” clear session and save.

7. **UI**
   - New assistant panel: table view of rows (from session); “Add row” button; per-row edit (description, action type, component, action name, population, note); “Link captured” + copy for Figma link; screenshot thumbnail with hotspot overlay; autosave indicator; “Export to Confluence” opens ConfluenceModal; “New session” clears table. Reuse ConfluenceModal, copy flow, and format modal by passing converted UniversalContentTableV1.

8. **Failure UX**
   - Wire invalid-selection messages, missing-annotation warnings, screenshot failure and autosave failure states in UI and handler.

### 8.2 File touch list (no code yet — list only)

- **New files (candidates):**
  - `src/core/analyticsTagging/types.ts` — DraftRow, Row, Session, stored schema.
  - `src/core/analyticsTagging/storage.ts` — clientStorage key, get, set, migrate.
  - `src/core/analyticsTagging/annotations.ts` — read ScreenID/ActionID from node.annotations, fallbacks.
  - `src/core/analyticsTagging/selection.ts` — validate two nodes, target inside crop, get container/target.
  - `src/core/analyticsTagging/screenshot.ts` — crop rect, collect nodes, clone, export, hotspot ratio.
  - `src/core/analyticsTagging/sessionToTable.ts` — sessionToUniversalContentTable(session).
  - `src/core/assistants/handlers/analyticsTagging.ts` — AnalyticsTaggingHandler.
  - `src/ui/components/AnalyticsTaggingTable.tsx` (or similar) — table view, add row, edit, screenshot+hotspot, autosave, export/new session.
- **Modified files (candidates):**
  - `src/core/contentTable/types.ts` — extend TableFormatPreset with `analytics-tagging` (or in presets).
  - `src/core/contentTable/presets.generated.ts` or new preset file — add column set for analytics-tagging.
  - `src/core/contentTable/renderers.ts` — support analytics-tagging preset (meta row and column extraction from synthetic items).
  - `src/assistants/index.ts` — register Analytics Tagging assistant and quick actions.
  - `src/core/assistants/handlers/index.ts` — register AnalyticsTaggingHandler.
  - `src/main.ts` — handle analytics_tagging quick actions (add-row, export, new-session); postMessage session to UI on load and on update.
  - `src/ui.tsx` — show Analytics Tagging panel when assistant is analytics_tagging; receive session, show table, Confluence modal trigger.
  - `src/core/types.ts` — any new event types (e.g. ANALYTICS_TAGGING_SESSION_UPDATED).
- **Reused as-is (no structural change):**
  - `src/core/contentTable/export/confluence.ts`
  - `src/core/encoding/xhtml.ts`
  - `src/core/stage/anchor.ts` (getTopLevelContainerNode, getAbsoluteBounds)
  - `src/ui/components/ConfluenceModal.tsx`
  - Content Table validate/normalize (or thin adapter if synthetic items need normalization).

---

## Summary

- **Data model:** Session with Row[]; each Row has screenId, screenshot, description, actionType, component, actionName, figmaElementLink, population, note; clientStorage with versioning and optional sharedPluginData mirror.
- **Selection:** Two nodes: container (crop region) + target; target must be fully inside container bounds (safest).
- **Root screen:** getTopLevelContainerNode(container); ScreenID from annotation or root layer name.
- **Annotations:** Read ScreenID and ActionID from node.annotations (label/labelMarkdown); fallback to layer/node name; warn if missing.
- **Screenshot:** Crop rect → intersecting nodes (paint order) → clone to temp frame → export → hotspot in UI overlay → delete frame → store in row.
- **Reuse:** Same Confluence and table pipeline via sessionToUniversalContentTable + new preset “analytics-tagging”; new assistant and handler; new UI panel for multi-row table and autosave.
- **Failure UX:** Guidance for invalid selection, warning for missing annotations, autosave indicator, screenshot failure non-blocking.

No code written; plan only. Implementation sequence and file list above are for the Code Steward.
