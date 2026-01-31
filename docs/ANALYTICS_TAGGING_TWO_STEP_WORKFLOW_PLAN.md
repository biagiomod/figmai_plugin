# Analytics Tagging — Two-Step Single-Selection Workflow Plan

## Goal

Change row creation from one-shot two-node selection to a **two-step single-selection** workflow: (1) select target → Capture Action Item → draft row; (2) fill form → select section container → Capture Screenshot & Add Row → commit. No other assistants affected. Export pipeline unchanged.

---

## 1. Where current analytics tagging requires 2-node selection

### 1.1 Core

- **`src/main.ts` (lines ~745–755):** For `analytics_tagging` + `add-row`, calls `resolveSelectionWithPolicy(selectionOrder, SelectionPolicy.ANALYTICS_TAGGING_PAIR)` and passes resolved `[container, target]` to the handler. **Touchpoint:** Remove add-row from this block; add handling for two new actions (capture-action-item, capture-screenshot-add-row) with **single-node** selection.
- **`src/core/assistants/handlers/analyticsTagging.ts`:** `actionId === 'add-row'` calls `validateSelection(selectionOrder)` which requires exactly 2 nodes (container, target), then captures screenshot and appends one Row. **Touchpoint:** Replace with two flows: (1) `capture-action-item` — 1 node (target) → create DraftRow, no screenshot; (2) `capture-screenshot-add-row` — 1 node (container) + existing draft → validate target center inside container, capture, commit Row, clear draft.
- **`src/core/analyticsTagging/selection.ts`:** `validateSelection(selectionOrder)` expects `selectionOrder.length === 2`, treats `[0]` as container and `[1]` as target. **Touchpoint:** Add a new function (e.g. `validateTargetOnly(selectionOrder)` for step 1 and `validateContainerForDraft(containerNodeId, draft: DraftRow)` for step 2) or refactor so step 2 validates “draft.targetNodeId center inside container rect” without two-node selection.

### 1.2 UI

- **`src/assistants/index.ts`:** Analytics Tagging has one quick action `add-row` (“Add row”). **Touchpoint:** Replace with two quick actions: `capture-action-item` (“Capture Action Item”), `capture-screenshot-add-row` (“Capture Screenshot & Add Row”). Update intro/copy to describe the two-step flow.
- **`src/ui/components/AnalyticsTaggingTable.tsx`:** Empty state text: “No rows yet. Select two nodes (container, then target) and click Add row.” **Touchpoint:** Show draft form when `draftRow` exists; empty state: “Select one node (action item), then click Capture Action Item.” Add CTAs: “Capture Action Item” (calls quick action or START_ROW_FROM_TARGET_SELECTION), “Capture Screenshot & Add Row” (calls quick action or REQUEST_SECTION_SCREENSHOT_CAPTURE). Inline prompts and error states for “Select one node…”, “Select the section container…”, “Capture an action item first.”

### 1.3 Selection policy

- **`src/core/context/selectionPolicy.ts`:** Used only for `add-row` with `ANALYTICS_TAGGING_PAIR`. **Touchpoint:** No longer use `ANALYTICS_TAGGING_PAIR` for analytics_tagging (both new actions use single selection). Either remove its use from main for analytics_tagging or keep the enum and simply not call it for the new actions.

---

## 2. DraftRow and Row state transitions + persistence (no screenshot bytes)

### 2.1 Types

- **DraftRow:** Same fields as Row **except** `screenshotRef` is **optional** (absent until step 2). Include: id, screenId, description, actionType, component, actionId, actionName?, figmaElementLink, population, note, meta? (targetNodeId, rootScreenNodeId). Optional flags: screenIdWarning, actionIdWarning. **Touchpoint:** In `src/core/analyticsTagging/types.ts`, define `DraftRow` as Row-like with `screenshotRef?: ScreenshotRef` and no screenshot bytes.
- **Row:** Unchanged: requires `screenshotRef` (ScreenshotRef only; no bytes in storage). Rows live in `Session.rows`.
- **Session:** Add optional `draftRow: DraftRow | null`. When non-null, UI shows draft form and “Capture Screenshot & Add Row” is enabled. **Touchpoint:** `Session` in types: `draftRow?: DraftRow | null`. Stored session (clientStorage) includes `draftRow`; no screenshot bytes anywhere.

### 2.2 State transitions

1. **No draft:** User selects 1 node (target) → runs “Capture Action Item” → main creates DraftRow (from target: component, ActionID, ActionName, Figma link, ScreenID from root), sets `session.draftRow = draft`, saves to clientStorage, posts `ANALYTICS_TAGGING_SESSION_UPDATED` with session (including draftRow).
2. **Draft exists:** User edits form in UI → UI sends `UPDATE_DRAFT_ROW_FIELDS` with partial fields → main merges into `session.draftRow`, saves, posts session updated.
3. **Draft exists, user selects 1 node (container):** User clicks “Capture Screenshot & Add Row” → main validates target (from draft.targetNodeId) center inside container rect, runs existing `captureVisibleInArea(container, target, …)`, builds Row from draft + new screenshotRef, appends to `session.rows`, sets `session.draftRow = null`, saves, posts session. If validation fails: status message “Target must be inside the section. Select the section container that contains the action item.”

### 2.3 Persistence

- **clientStorage key:** Unchanged `figmai.analyticsTagging.session`. Stored shape: `StoredSessionV1` extended with `draftRow?: DraftRow | null`. No screenshot bytes; DraftRow has no screenshotRef or a placeholder ref only for type compatibility (e.g. omit from stored draft).
- **Load/save:** `loadSession()` and `saveSession()` read/write `session.draftRow`. Migration: if stored session has no `draftRow`, treat as `null`.

---

## 3. Message types (UI ↔ main)

### 3.1 START_ROW_FROM_TARGET_SELECTION

- **Direction:** Can be implemented as **quick action** only (no UI→main message): user selects 1 node in Figma and clicks quick action “Capture Action Item”; main receives RUN_QUICK_ACTION with `actionId === 'capture-action-item'` and `selectionOrder.length === 1`. Main creates draft from that node (target), saves, posts session.  
  **Or** UI→main: UI sends `START_ROW_FROM_TARGET_SELECTION` (no payload); main reads `figma.currentPage.selection`; if exactly 1 node, create draft and post. Latter allows a single “Capture Action Item” button in the panel without relying on quick action. **Recommendation:** Support both: quick action “Capture Action Item” (1 selection) and, if UI has a button, message `START_ROW_FROM_TARGET_SELECTION` where main uses current selection. Handler: same as quick action (require 1 node, create draft).
- **Contract:** No payload. Main: if selection.length !== 1 → reply with error (e.g. ANALYTICS_TAGGING_ERROR or status); else create DraftRow from target, save, post ANALYTICS_TAGGING_SESSION_UPDATED with session (draftRow set).

### 3.2 UPDATE_DRAFT_ROW_FIELDS

- **Direction:** UI → main.
- **Payload:** `Partial<Pick<DraftRow, 'screenId' | 'description' | 'actionType' | 'component' | 'actionId' | 'actionName' | 'population' | 'note'>>`. Main merges into `session.draftRow`, saves, posts ANALYTICS_TAGGING_SESSION_UPDATED. If no draft, no-op or ignore.

### 3.3 REQUEST_SECTION_SCREENSHOT_CAPTURE

- **Direction:** UI → main (when user clicks “Capture Screenshot & Add Row”).
- **Payload:** None. Main: if no `session.draftRow` → post error/status “Capture an action item first.” If selection.length !== 1 → post “Select exactly one node: the section container.” If 1 node (container): resolve draft.targetNodeId (target), validate target center inside container bounds; if invalid → “Target must be inside the section. Select the section container that contains the action item.” If valid: run `captureVisibleInArea(container, target, …)`, build Row from draft + screenshotRef, append to session.rows, clear draft, save, post ANALYTICS_TAGGING_SESSION_UPDATED.

### 3.4 COMMIT_ROW

- **Semantic:** “Commit” is the result of REQUEST_SECTION_SCREENSHOT_CAPTURE (append row, clear draft). No separate COMMIT_ROW message required unless we want an explicit “row committed” event. **Recommendation:** Do not add a separate COMMIT_ROW message; success is conveyed via ANALYTICS_TAGGING_SESSION_UPDATED (session with new row and no draft). If desired, main can post a short status “Row added” via replaceStatusMessage when handling REQUEST_SECTION_SCREENSHOT_CAPTURE success.

---

## 4. UI changes

### 4.1 Quick actions (assistants/index.ts)

- **Remove:** `add-row` (“Add row”).
- **Add:**  
  - `capture-action-item` — label: “Capture Action Item”, templateMessage: “Start row from selected action item (one node).”, requiresSelection: true.  
  - `capture-screenshot-add-row` — label: “Capture Screenshot & Add Row”, templateMessage: “Select section container (one node), then capture screenshot and add row.”, requiresSelection: true.
- **Keep:** `export`, `new-session` unchanged.
- **Copy:** Update assistant intro to: “Select one node (the action item), click Capture Action Item. Fill in the form, then select the section container and click Capture Screenshot & Add Row. Export to Confluence when ready.”

### 4.2 Analytics Tagging panel (AnalyticsTaggingTable + parent in ui.tsx)

- **When no draft and no rows:** Inline prompt: “Select one node (the action item, e.g. button/link), then click **Capture Action Item**.” Show primary CTA “Capture Action Item” (triggers quick action or emit START_ROW_FROM_TARGET_SELECTION). Do not show “Capture Screenshot & Add Row” as primary until draft exists.
- **When draft exists:** Show draft form (Screen ID, Description, Action Type, Component, Action ID, Action Name, Figma link “Link captured” + copy, Population, Note). All editable. Inline prompt: “Fill in the form, then select the **section container** (frame that contains the action item) and click **Capture Screenshot & Add Row**.” Show CTA “Capture Screenshot & Add Row” (triggers quick action or emit REQUEST_SECTION_SCREENSHOT_CAPTURE). Optional: “Discard draft” to clear draft without committing.
- **Error states:**  
  - “Select exactly one node (the action item).” when Capture Action Item is used with 0 or >1 selection.  
  - “Capture an action item first.” when Capture Screenshot & Add Row is used with no draft.  
  - “Select exactly one node: the section container.” when Capture Screenshot & Add Row is used with 0 or >1 selection.  
  - “Target must be inside the section. Select the section container that contains the action item.” when container does not contain target center.
- **Autosave:** Unchanged; UPDATE_DRAFT_ROW_FIELDS on field blur or debounced input; show “Saved” / “Saving…” / “Save failed” for draft updates.
- **Existing table:** When session.rows.length > 0, show table as today. Rows still have screenshotRef; “Generate preview” still uses REQUEST_ANALYTICS_TAGGING_SCREENSHOT. No layout/HUG changes.

### 4.3 Message handling (ui.tsx)

- On ANALYTICS_TAGGING_SESSION_UPDATED, set session (including draftRow). If draftRow present, show draft form and “Capture Screenshot & Add Row” CTA.
- Wire “Capture Action Item” button to: either emit RUN_QUICK_ACTION with capture-action-item, or emit new handler START_ROW_FROM_TARGET_SELECTION (if main handles that message and reads selection).
- Wire “Capture Screenshot & Add Row” button to: either emit RUN_QUICK_ACTION with capture-screenshot-add-row, or emit REQUEST_SECTION_SCREENSHOT_CAPTURE.
- Wire draft form fields to UPDATE_DRAFT_ROW_FIELDS (debounced or on blur).

---

## 5. Export pipeline

- **sessionToTable(session):** Unchanged. Input is Session (rows only; draftRow is not exported). session.rows map to table items as today. **Touchpoint:** None if draftRow is not included in export payload.
- **Confluence / copy:** Unchanged. Export uses sessionToTable(session); ConfluenceModal and copy flow unchanged. **Touchpoint:** None.

---

## 6. No other assistants affected

- Only analytics_tagging assistant and its handler, storage, and UI are changed. Selection policy for analytics_tagging: no longer use ANALYTICS_TAGGING_PAIR (remove from main for analytics_tagging). All other assistants keep current selection behavior. **Touchpoint:** In main.ts, remove the block that runs resolveSelectionWithPolicy for analytics_tagging add-row and replace with the two new action handlers (capture-action-item, capture-screenshot-add-row) using raw selectionOrder (1 node each).

---

## 7. File touch list and implementation sequence

### 7.1 Core (types, storage, selection, handler, main)

| Order | File | Change |
|-------|------|--------|
| 1 | `src/core/analyticsTagging/types.ts` | Add/align DraftRow (screenshotRef optional). Add `draftRow?: DraftRow \| null` to Session. StoredSessionV1: include draftRow. |
| 2 | `src/core/analyticsTagging/storage.ts` | loadSession/saveSession read/write session.draftRow. createNewSession: draftRow null. Migration: missing draftRow → null. |
| 3 | `src/core/analyticsTagging/selection.ts` | Add `validateTargetOnly(selectionOrder): Promise<{ ok: true, target, rootScreen } \| { ok: false, message }>` (exactly 1 node, not PAGE/DOCUMENT). Add `validateContainerForDraft(containerNodeId, draft): Promise<{ ok: true, container, target, rootScreen } \| { ok: false, message }>` (container valid type, target center inside container rect). Keep or reuse getTopLevelContainerNode, getAbsoluteBounds. |
| 4 | `src/core/assistants/handlers/analyticsTagging.ts` | Remove add-row flow. Add capture-action-item: 1 node → create DraftRow (component, ActionID, ActionName, Figma link, ScreenID from root), session.draftRow = draft, save, post. Add capture-screenshot-add-row: load draft; 1 node = container; validateContainerForDraft(container, draft); captureVisibleInArea; build Row; append to session.rows; draftRow = null; save; post. canHandle: capture-action-item, capture-screenshot-add-row, export, new-session. |
| 5 | `src/main.ts` | Replace analytics_tagging block: remove add-row and ANALYTICS_TAGGING_PAIR resolution. Add handling for capture-action-item and capture-screenshot-add-row (single-node selection; pass selectionOrder as-is). Add message handlers: START_ROW_FROM_TARGET_SELECTION (read selection, create draft, save, post), UPDATE_DRAFT_ROW_FIELDS (merge into draft, save, post), REQUEST_SECTION_SCREENSHOT_CAPTURE (draft + 1 selection → validate, capture, commit, post). Register handler types in core/types.ts. |

### 7.2 Types (events)

| Order | File | Change |
|-------|------|--------|
| 6 | `src/core/types.ts` | Add StartRowFromTargetSelectionHandler, UpdateDraftRowFieldsHandler, RequestSectionScreenshotCaptureHandler (and any payload types). Deprecate or keep ANALYTICS_TAGGING_UPDATE_ROW for row edits (existing rows). |

### 7.3 UI

| Order | File | Change |
|-------|------|--------|
| 7 | `src/assistants/index.ts` | analytics_tagging: replace add-row with capture-action-item and capture-screenshot-add-row. Update intro/copy to two-step flow. |
| 8 | `src/ui/components/AnalyticsTaggingTable.tsx` | Accept session (with draftRow). When draftRow: show draft form (all fields); inline prompt for “select section container…” and CTA “Capture Screenshot & Add Row”. When no draft: inline prompt “Select one node (action item)…” and CTA “Capture Action Item”. Wire CTAs to emit START_ROW_FROM_TARGET_SELECTION and REQUEST_SECTION_SCREENSHOT_CAPTURE (or RUN_QUICK_ACTION). Wire form to UPDATE_DRAFT_ROW_FIELDS. Error state props or session.errorMessage for inline errors. Empty state copy: “Select one node (the action item), then click Capture Action Item.” |
| 9 | `src/ui.tsx` | Handle ANALYTICS_TAGGING_SESSION_UPDATED with session.draftRow; pass draftRow to AnalyticsTaggingTable. Optionally handle ANALYTICS_TAGGING_ERROR or status for “Select exactly one node…”, “Capture an action item first.” Ensure primary quick action for analytics_tagging is capture-action-item or capture-screenshot-add-row where appropriate (e.g. primary = capture-action-item when no draft). |

### 7.4 Cleanup

| Order | File | Change |
|-------|------|--------|
| 10 | `src/main.ts` | Remove use of SelectionPolicy.ANALYTICS_TAGGING_PAIR for analytics_tagging (delete the resolveSelectionWithPolicy block for this assistant). |
| 11 | (optional) `src/core/context/selectionPolicy.ts` | Leave enum as-is; no call site for ANALYTICS_TAGGING_PAIR after change, or remove from main only. |

### 7.5 Verification

- Run `npm run build` after implementation. No layout/HUG changes outside analytics tagging. No employer/internal references; use “custom” in prose/UI.

---

## 8. Summary

- **Current 2-node usage:** main (resolveSelectionWithPolicy for add-row), handler (validateSelection(selectionOrder) with 2 nodes), selection.ts (validateSelection), UI empty state and single “Add row” CTA.
- **DraftRow/Row:** DraftRow = row fields with optional screenshotRef; Session.draftRow; persist in clientStorage with session; no screenshot bytes.
- **Messages:** START_ROW_FROM_TARGET_SELECTION (create draft from 1 selection), UPDATE_DRAFT_ROW_FIELDS (merge draft), REQUEST_SECTION_SCREENSHOT_CAPTURE (validate container + target, capture, commit); COMMIT_ROW implied by success of REQUEST_SECTION_SCREENSHOT_CAPTURE.
- **UI:** Two CTAs, draft form when draft exists, inline prompts and error states; quick actions capture-action-item and capture-screenshot-add-row.
- **Export:** Unchanged; sessionToTable(session) uses session.rows only.
- **Scope:** Analytics Tagging only; selection policy no longer used for this assistant.
