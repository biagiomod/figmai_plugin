# Admin Config Editor (ACE) – UX Audit Report

**Scope:** `admin-editor/public/` (index.html, styles.css, app.js)  
**Goals:** Consumer-grade polish (Airbnb/Kayak/Robinhood-level), clarity, reduced cognitive load, safe save/preview/validate, accessibility, excellent state UX.  
**Constraints:** No plugin runtime changes; no new dependencies (plain HTML/CSS/JS); existing API only; keep revision guard, dry-run preview, validation gating; no build/publish features.

---

## 1. Top 10 UX Problems (with concrete examples)

1. **Conflict “Reload” button does nothing**  
   `#reload-after-conflict-btn` exists in [index.html](figmai_plugin/admin-editor/public/index.html) but is never bound in `bindEvents()` in [app.js](figmai_plugin/admin-editor/public/app.js). After a 409, users see “Reload required” with a Reload button that has no effect.

2. **Registries tab crashes when there are no registries**  
   In `renderRegistriesTab()`, when `ids.length === 0` the DOM only gets “No registries present.” and no `#reset-registries-btn`. The subsequent `document.getElementById('reset-registries-btn').onclick = ...` runs anyway and throws (null.onclick), breaking the tab.

3. **No loading or disabled state for Reload / Validate / Preview / Save**  
   Buttons stay clickable during API calls. Users can double-submit Save or Validate; there is no visual feedback that a request is in flight (e.g. “Validating…”, “Saving…”).

4. **No visible focus styles**  
   [styles.css](figmai_plugin/admin-editor/public/styles.css) has no `:focus` or `:focus-visible` for tabs, buttons, or inputs. Keyboard users cannot see which control is focused; contrast/accessibility suffer.

5. **Tab navigation is mouse-only**  
   Tabs have `role="tab"` and `aria-selected` but no `tabindex`, arrow-key handling, or Enter/Space. Screen-reader and keyboard-only users cannot move between tabs without a mouse.

6. **Save/Preview affordance is unclear**  
   Save is always enabled (except when validation errors block it implicitly). There is no explicit “No changes to save” state: the button doesn’t disable when there are no unsaved changes, and there’s no short copy like “Save (no changes)” to set expectations.

7. **Error and retry UX is minimal**  
   On load failure, 400, or network error, the message appears in `#validation-message` but there’s no “Retry” or “Copy error” action. For 409, the conflict banner appears but the only recovery (Reload) is broken (see #1). No distinction between “validation errors” vs “server/network error” in layout or copy.

8. **Preview vs Save flow is under-explained**  
   “Preview changes” runs a dry-run save; the result appears in `#preview-summary`. There’s no inline hint that “Preview shows what would change; Save applies it,” and no clear visual grouping of Preview → Validate → Save as a safe sequence.

9. **Raw/danger zones are under-framed**  
   Config “Advanced: raw config JSON,” Content Models markdown, and Registries JSON are easy to break. Aside from one Content Models warning banner, there’s no consistent “danger zone” treatment, validation-inline feedback (e.g. JSON parse error under the textarea), or “Revert to last saved” next to raw editors.

10. **Information hierarchy and scannability**  
    Status (connection, loaded, repo) is a single line of dots; tabs are flat with no grouping. Assistants/Knowledge use a list+detail layout but section titles and secondary text (e.g. “Files are written to custom/knowledge/<id>.md”) don’t follow a clear typographic scale or spacing system, so hierarchy feels flat.

---

## 2. Prioritized issues (P0 / P1 / P2)

| Priority | Issue | Rationale |
|----------|--------|-----------|
| **P0** | Conflict Reload button not bound | 409 is a critical path; without Reload, users are stuck. |
| **P0** | Registries tab null ref when no registries | Crashes JS; tab becomes unusable. |
| **P1** | Loading/disabled state for Reload, Validate, Preview, Save | Prevents double-submit and sets expectations; core “professional” behavior. |
| **P1** | Visible focus styles (tabs, buttons, inputs) | Required for accessibility and keyboard use. |
| **P1** | Keyboard navigation for tabs (arrow keys, tabindex) | ARIA tabs imply keyboard support; currently missing. |
| **P1** | Save enabled only when dirty; “No changes” state | Reduces mistakes and clarifies when Save does something. |
| **P2** | Error UX: retry, copy diagnostics, clearer 400/409/network | Helps non-technical users recover and share errors. |
| **P2** | Preview/Save flow copy and grouping | Lowers cognitive load (“preview first, then save”). |
| **P2** | Danger zone framing and inline validation for raw editors | Makes raw editing feel safer and more predictable. |
| **P2** | Typography and spacing scale for hierarchy | Improves scannability and “polish” without changing IA. |

---

## 3. Recommended IA + interaction model

### 3.1 Information architecture

- **Shell:** Header (title + status) → Optional unsaved/conflict banners → **Primary nav (tabs)** → Main content → **Sticky footer (actions + messages).**
- **Tabs (current):** Config | Assistants | Knowledge | Content Models (conditional) | Design System Registries (conditional).  
- **Recommendation:** Keep flat tabs; add a **sticky subheader** inside main for the current tab that shows: tab title + short description + “Reset section” (and for raw tabs, “Revert” / danger hint). This gives a consistent “where I am” and “what I can do here” without changing routes.

### 3.2 Safe task flow

1. **Load** → Status shows “Server connected” and “Loaded: …”. If load fails, show error + Retry (and optional Copy).
2. **Edit** → Any change sets dirty state: unsaved banner appears; Save/Preview become relevant.
3. **Validate** (optional but recommended) → User clicks Validate; errors/warnings show in footer. Fix errors before Save or Preview.
4. **Preview** (optional) → User clicks “Preview changes”; dry-run result shows (files/generators that would run). No file writes.
5. **Save** → Enabled only when dirty and (if we enforce) no validation errors. On success: summary + “Copy summary”; optionally toast “Saved.” On 409: conflict banner + working Reload.
6. **Discard** → “Discard all changes” and per-tab “Reset section” / “Revert” with clear effect (revert to last loaded state, not “last save”).

### 3.3 Interaction principles

- **Predictable CTAs:** Save disabled when not dirty; Validate always available; Preview available when dirty (and optionally blocked by validation errors, same as Save).
- **Recovery:** Every error state offers a next step (Retry, Reload, Copy error).
- **No surprise writes:** Preview is clearly “no write”; Save is the only write action; revision guard and messaging stay as-is.

---

## 4. UI spec: layout and components

### 4.1 Layout

- **Header:** Keep; add subtle separation (e.g. border or background) and ensure status items have clear labels (“Connection: …”, “Loaded: …”, “Repo: …”) for screen readers and scannability.
- **Nav:** Keep horizontal tabs; add `tabindex="0"` and arrow-key handling; optional: left border or background on active tab to reinforce “section.”
- **Main:** Add a **sticky subheader** per tab (e.g. under the tab bar, inside main): “Config” + one-line description + “Reset section” (and for Content Models/Registries/raw Config: danger hint or “Revert”).
- **Footer:** Keep sticky; group actions in order: Reload | Validate | Preview changes | Save. Add loading state (disabled + “Validating…” / “Saving…” / “Previewing…”). Under actions: validation message area, then preview summary, then save summary (only one “result” visible at a time if desired, or stack).

### 4.2 Components to add or refine

| Component | Purpose |
|-----------|--------|
| **Sticky subheader** | Tab title + short description + Reset/Revert; consistent “context” under tabs. |
| **Button loading state** | Disable primary action during request; optional spinner or label swap (“Save” → “Saving…”). |
| **Toasts (optional)** | Short-lived “Saved.” or “Validation passed.” to confirm success without cluttering footer. If no new deps: use a small inline message that auto-clears after a few seconds. |
| **Inline help** | Short hints next to key fields (e.g. “Simple mode IDs shown in the plugin’s simple mode”) or under “Preview changes” (“Shows which files would change; does not write.”). |
| **Danger zone** | Wrap raw JSON/markdown editors in a bordered block with a label (“Advanced / raw editing”) and inline validation (e.g. “Invalid JSON” under textarea) + “Revert to saved” where applicable. |
| **Error block** | For load/validate/save errors: icon or title + message + primary action (Retry / Reload) + “Copy error” (or “Copy diagnostics”). |
| **Empty states** | Registries “No registries present.” and Knowledge “Select an assistant” are fine; ensure they’re clearly styled and don’t leave orphan bindings (e.g. no `#reset-registries-btn` when empty). |

### 4.3 Visual system (within existing CSS)

- **Spacing:** Use a single scale (e.g. 4px base: 4, 8, 12, 16, 24) for margins/padding; apply consistently to sections, form groups, and footer.
- **Typography:** Keep system font; distinguish page title (e.g. 1.25–1.5rem), section title (1rem, semibold), label (0.9rem, medium), body (0.9–1rem), caption (0.85rem, secondary color).
- **Inputs/buttons:** Keep current; add `:focus-visible` outline (e.g. 2px solid `var(--accent)` with offset). Ensure minimum touch target (~44px) for primary buttons.
- **Icons:** No new assets required; use text or Unicode (e.g. “!” for warning, “×” for close) if needed. Optional later: small SVG sprite.
- **Consistency:** One “primary” button style (e.g. Save), one “secondary” (Reload, Validate, Preview), one “danger” or “ghost” (Discard, Reset section). Apply same radius and border pattern across tabs.

---

## 5. Implementation plan (3–5 PR-sized steps)

### Step 1: Bug fixes (P0)

- **Bind `#reload-after-conflict-btn`** in `bindEvents()`: on click, call `loadModel()` and then `showConflictBanner(false)` (or equivalent so banner hides after reload).
- **Guard Registries tab:** In `renderRegistriesTab()`, only attach `onclick` to `#reset-registries-btn` if the element exists (`const btn = document.getElementById('reset-registries-btn'); if (btn) btn.onclick = ...`). Alternatively render the Reset button even when `ids.length === 0` (e.g. “Reset section” disabled or no-op) so the ID always exists and behavior is consistent.

**Files:** [admin-editor/public/app.js](figmai_plugin/admin-editor/public/app.js) (`bindEvents`, `renderRegistriesTab`).

### Step 2: Loading and Save state (P1)

- Add a small state flag, e.g. `state.loadingAction: null` (`'reload' | 'validate' | 'preview' | 'save'`).
- In `loadModel`, `runValidate`, `runPreview`, `runSave`: set `state.loadingAction` at start; clear it in `finally` (and on 409/error).
- In `bindEvents` (or a single `renderFooter()` if you introduce it): set button `disabled` and optionally `textContent` (e.g. “Saving…”) based on `state.loadingAction`. Re-run this after each API start/end (or from a single place that updates footer buttons).
- Optionally disable Save when `!hasUnsavedChanges()` and show “No changes” in the button or a small hint next to it.

**Files:** [app.js](figmai_plugin/admin-editor/public/app.js) (state, `loadModel`, `runValidate`, `runPreview`, `runSave`, footer button updates); optionally [index.html](figmai_plugin/admin-editor/public/index.html) if you add a wrapper for footer buttons for easier toggling.

### Step 3: Focus and keyboard (P1)

- **Focus:** In [styles.css](figmai_plugin/admin-editor/public/styles.css), add `:focus-visible` (and fallback `:focus` if needed) for `.tabs button`, `.footer-actions button`, `input`, `select`, `textarea`, and other interactive elements; use a visible outline (e.g. 2px solid `var(--accent)`).
- **Tabs:** Set `tabindex="0"` on each tab button (or ensure they are focusable). In `bindEvents` (or a dedicated tab key handler), on keydown: Left/Right move selection and call `switchTab`; Enter/Space activate the focused tab (already handled by click). Update `aria-selected` and focus the newly selected tab.

**Files:** [styles.css](figmai_plugin/admin-editor/public/styles.css), [app.js](figmai_plugin/admin-editor/public/app.js) (tab event binding), [index.html](figmai_plugin/admin-editor/public/index.html) if you add `tabindex` in markup.

### Step 4: Error UX and conflict (P2)

- **Retry:** On load failure, append a “Retry” button next to the error message (or in the same block); on click, call `loadModel()`.
- **Copy error:** For validation and save errors, add “Copy” that puts the current error text (or a small diagnostics blob) to the clipboard.
- **409:** Ensure conflict banner Reload is fixed in Step 1; optionally add short copy: “Someone else saved or files changed on disk. Reload to get the latest, then re-apply your changes if needed.”

**Files:** [app.js](figmai_plugin/admin-editor/public/app.js) (`loadModel` error block, `renderValidationMessage` or equivalent, conflict banner copy).

### Step 5: Polish and hierarchy (P2)

- **Sticky subheader:** For each tab panel, render a small bar under the tab row: tab name + one-line description + “Reset section” (or “Revert”). Can be done inside existing `renderConfigTab`, `renderAssistantsTab`, etc., or by a single `renderTabSubheader(tabId)` that runs after `switchTab`.
- **Preview/Save copy:** Under footer actions, add one line: “Preview shows what would change; Save writes files and runs generators.”
- **Danger zone:** Wrap raw Config JSON, Content Models textarea, and each Registry JSON in a `.danger-zone` (or `.raw-editor`) block in HTML/CSS; add a label and, where feasible, inline validation (e.g. under raw JSON: “Invalid JSON” when `JSON.parse` throws). “Revert” / “Reset section” already exist; keep them.
- **Spacing/typography:** In CSS, standardize section margins and label/body font sizes as in the visual system above; no structural DOM change required.

**Files:** [styles.css](figmai_plugin/admin-editor/public/styles.css), [app.js](figmai_plugin/admin-editor/public/app.js) (subheader, preview/save hint, raw blocks), [index.html](figmai_plugin/admin-editor/public/index.html) if you add containers for danger zones.

---

## 6. Obvious UI bugs and exact fixes

### 6.1 Conflict Reload button not bound

- **Location:** [app.js](figmai_plugin/admin-editor/public/app.js) `bindEvents()`.
- **Fix:** Add:
  ```js
  const reloadConflictBtn = document.getElementById('reload-after-conflict-btn')
  if (reloadConflictBtn) reloadConflictBtn.onclick = function () {
    showConflictBanner(false)
    loadModel()
  }
  ```

### 6.2 Registries tab when there are no registries

- **Location:** [app.js](figmai_plugin/admin-editor/public/app.js) `renderRegistriesTab()`.
- **Fix:** Only bind Reset if the button exists:
  ```js
  const resetRegBtn = document.getElementById('reset-registries-btn')
  if (resetRegBtn) resetRegBtn.onclick = function () { ... }
  ```
  Alternatively, always render the “Reset section” button (e.g. above “No registries present.”) so the ID is always in the DOM; then binding is safe and behavior is consistent.

### 6.3 Knowledge tab: first assistant selection when list is empty

- **Location:** `renderKnowledgeTab()` uses `state.selectedKnowledgeId || (assistants[0] && assistants[0].id)`. If `assistants` is empty, `selectedId` becomes `undefined`; the editor shows “Select an assistant” and the list is empty. No crash, but worth ensuring the empty state copy is clear and that no code assumes `selectedId` is always set when there are assistants.

### 6.4 Panel visibility vs `aria-hidden`

- **Current:** `switchTab()` sets both `panel.style.display` and `aria-hidden`. When Content Models or Registries are conditionally hidden (no data), their panels are `display: none` in HTML and then shown/hidden in `renderAllPanels`. Ensure when a tab is hidden (e.g. no registries), that tab button is also removed or disabled and focus never lands on a hidden panel. Currently the tab button is hidden via `style.display: none` when there are no registries, so this is consistent.

### 6.5 Copy summary / copy generator output

- **Current:** `renderSaveSummary()` binds `#copy-summary-btn` and `.copy-gen-btn` after innerHTML. If `renderSaveSummary()` is not re-run after save, buttons remain. If `renderAllPanels()` is called after save, it does call `renderSaveSummary()`, so bindings are refreshed. No bug identified; keep as-is.

---

## 7. Annotated references (DOM / functions)

| Area | DOM / function | Recommendation |
|------|----------------|-----------------|
| Footer actions | `#reload-btn`, `#validate-btn`, `#preview-btn`, `#save-btn` | Disable + label swap during request (Step 2); add `:focus-visible` (Step 3). |
| Tabs | `.tabs button[role="tab"]`, `switchTab(tabId)` | Add `tabindex="0"`, arrow keys, and focus management (Step 3). |
| Unsaved banner | `#unsaved-banner`, `showUnsavedBanner()` | Keep; optionally add “X unsaved edits” or “Save or discard” hint. |
| Conflict banner | `#conflict-banner`, `showConflictBanner()`, `#reload-after-conflict-btn` | Bind Reload in `bindEvents()` (Step 1). |
| Validation message | `#validation-message`, `renderValidationMessage()` | Add Retry for load failure; add “Copy error” for validation/save errors (Step 4). |
| Save summary | `#save-summary`, `renderSaveSummary()` | Keep; ensure “Copy summary” and generator “Copy” stay bound after re-renders. |
| Preview summary | `#preview-summary`, `renderPreviewSummary()` | Keep; add one-line explanation above or below (Step 5). |
| Config tab | `renderConfigTab()`, `#config-raw`, `#reset-config-btn` | Wrap raw JSON in danger zone; optional inline JSON validation (Step 5). |
| Assistants tab | `renderAssistantsTab()`, `bindAssistantEditor()` | Optional sticky subheader “Assistants” + description (Step 5). |
| Knowledge tab | `renderKnowledgeTab()`, `#knowledge-preview-toggle`, `#knowledge-body` | Optional subheader; keep preview toggle and file-existence cues. |
| Content Models tab | `renderContentModelsTab()`, `#content-models-raw`, `#revert-content-models-btn` | Keep warning banner; wrap in danger zone; ensure Revert is prominent (Step 5). |
| Registries tab | `renderRegistriesTab()`, `#reset-registries-btn` | Guard `getElementById('reset-registries-btn')` when empty (Step 1). |
| Status | `#status`, `updateStatus()` | Optional clearer labels (“Connection: …”) and aria-label for accessibility. |

---

## 8. Checklist summary

- **Navigation:** Tabs kept; add sticky subheader and keyboard nav; no deep links in scope.
- **Primary CTA:** Save enabled only when dirty (and optionally when no validation errors); “No changes” state; confirm Discard if desired (optional).
- **Preview:** Clear copy that it shows “what would change”; dry-run only.
- **Assistants:** List/search/filter and editing affordances kept; ID read-only; required fields can be enforced by server validation and optional inline hints.
- **Knowledge:** Markdown + preview toggle and file-existence cues kept.
- **Raw editors:** Danger zone framing, inline validation where feasible, revert flows kept.
- **Error UX:** 400/409/network with Retry, Reload, Copy diagnostics.
- **Visual system:** Spacing scale, typography, focus states, consistent buttons; no new dependencies.

This audit and plan stay within the constraints (no plugin `src/` changes, no new deps, existing API only, safety features retained) and are implementable in 3–5 small PRs as above.
