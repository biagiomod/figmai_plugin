# Refactor Program Kickoff — Runtime Contract (A), Assistant Config (B), KB Normalization (C)

**Agent:** Architect  
**Mode:** Plan + audit-backed implementation strategy (no code in this step).  
**Baseline:** [assistants-architecture-audit-verified.md](./assistants-architecture-audit-verified.md), [refactor-plan-runtime-assistants-kb-rfc.md](./refactor-plan-runtime-assistants-kb-rfc.md).

**Constraints:** Preserve dispatch key `(assistantId, actionId)`; single LLM path `sendChatWithRecovery` → promptPipeline (Tier 1/2/3); plugin consumes only generated TS at runtime; Quick Actions remain pluggable code.

---

## 1) Audit confirmation

### 1.1 Drift check — repo vs RFC

| Area | RFC / audit reference | Current repo | Status |
|------|------------------------|--------------|--------|
| main.ts RUN_QUICK_ACTION | Handler at 669; getHandler 699; design_critique 704–743; content_table 745–775; analytics_tagging 777–808; code2design 810–864 | Verified: same line numbers and conditions | **Match** |
| recovery.ts | sendChatWithRecovery 128–265; Tier 1 → minimal fallback → Tier 2 → Tier 3 | Verified: 131–265 | **Match** |
| selectionContext.ts | buildSelectionContext 44–101; images only when quickAction?.requiresVision && provider.supportsImages && selection.hasSelection | Verified: 44–101, 59–62 | **Match** |
| handlers/index.ts | getHandler(assistantId, actionId) line 29 | Verified: line 29 | **Match** |
| ui.tsx handleQuickAction | 1105; content_table/code2design/analytics_tagging branches; contentTableQuickActions ~2130 | Verified: 1105–1246; contentTableQuickActions 2130–2156 | **Match** |

**Conclusion:** No drift. Repo matches the RFC drift check.

### 1.2 Additional special-cases not listed in RFC

- **content_table send-to-confluence:** Audit says it’s in “contentTableQuickActions”; **current code** handles `actionId === 'send-to-confluence'` in handleQuickAction (1116–1120) but **does not** include send-to-confluence in the `contentTableQuickActions` array (2130–2156). Comment in ui.tsx: “Send to Confluence quick action disabled for all modes.” So today there is no visible Confluence button; only copy-table, view-table, copy-ref-image, generate-new-table are in the list. **Implication:** If we add UI-only actions to manifest (Option A), we can add send-to-confluence to the manifest and optionally re-enable it in the UI from manifest order; no behavior change until we do that.
- **design_critique give-critique (UI state):** Before emitting RUN_QUICK_ACTION, UI clears scorecard state (1190–1194). This is UI-only state reset, not routing; no change needed for contract/routing refactor.
- **content_table generate-new-table:** UI never sends `actionId === 'generate-new-table'` to main; it either sets selectionRequired (no emit) or sets `actionId = 'generate-table'` and falls through so main receives only `generate-table`. So main never needs to handle `generate-new-table`; it’s purely a UI label that triggers generate-table. **Implication:** In manifest we can model it as one entry with id `generate-new-table` and executionType `ui-only` that “redirects” to generate-table in UI, or keep it as a second UI-only entry that doesn’t hit main; either way main stays unchanged.

---

## 2) Implementation plan — PR breakdown

Refined from the RFC’s 9 steps. **ExecutionType is required before main refactor** (see §3); PR order reflects that.

| PR | Title | Files to touch | Risk / rollback | Manual QA | Automated tests to add | Invariants protected |
|----|--------|----------------|-----------------|------------|------------------------|------------------------|
| **1** | Frozen contract types (no call-site changes) | **New:** `src/core/contracts/requestEnvelope.ts`, `responseEnvelope.ts`, `types.ts` (re-exports), `README.md` (mapping to existing code). | Low. Rollback: delete `src/core/contracts/` (or the new files only). | Build succeeds; no runtime change. | None in this PR. | Documents single pipeline, state boundaries. |
| **2** | executionType in schema (required) + generator + types | `admin-editor/src/schema.ts` (quickActionSchema: add required `executionType`); `scripts/generate-assistants-from-manifest.ts` (read/write executionType, fail if missing); `src/core/types.ts` (QuickAction.executionType required). | Medium. Old manifest without executionType will fail generator. Rollback: revert schema/generator/types; restore optional executionType or remove field. | Run `npm run generate-assistants` on manifest **without** executionType → must fail with clear error. | Generator test: manifest missing executionType on any quick action fails. | Single source of truth for action metadata. |
| **3** | Backfill manifest with executionType | `custom/assistants.manifest.json` (add executionType to every quick action per audit table). | Low. Rollback: revert manifest. | generate-assistants succeeds; build succeeds; plugin loads. | None. | — |
| **4** | ACE validation: executionType required | `admin-editor/src/schema.ts` (already required in 2); `admin-editor/src/schema.ts` validateModel: add warning or error if any quick action missing executionType if we ever make it optional again — N/A if required in schema. `admin-editor/public/app.js`: Assistants tab save/validate shows error if executionType missing (schema parse will fail). | Low. Rollback: revert validation. | In ACE, remove executionType from one action, save → validation fails. | — | Fail-fast before deploy. |
| **5** | Main RUN_QUICK_ACTION routing by executionType | `src/main.ts`: Replace branches at 704–808 with: getHandler; if handler && action.executionType === 'tool-only' → build handlerContext, handler.handleResponse, return if handled. If action.executionType === 'ui-only' → return (no-op). Keep code2design block (810–864) as-is or convert to executionType 'hybrid' + same behavior. | **High.** Wrong executionType → wrong path. Rollback: revert main.ts to current if/else. | Full regression matrix (§4): every (assistantId, actionId) behaves as today. | getHandler matrix; tool-only never calls sendChat; ui-only returns without sendChat. | Dispatch key; single LLM path; handler contract. |
| **6** | UI-only actions in manifest + UI consume manifest order (Option A) | `custom/assistants.manifest.json` (add content_table: send-to-confluence, copy-table, view-table, copy-ref-image, generate-new-table; analytics_tagging: export-screenshots; all executionType 'ui-only'). `src/ui.tsx`: For content_table when contentTable exists, build displayed quick actions from **assistant.quickActions** (manifest) filtered by executionType === 'ui-only' + existing generate-table, same order as manifest. Remove hardcoded contentTableQuickActions array. Main: already no-op for ui-only in PR5. | Medium. UI order/labels must match manifest. Rollback: revert manifest additions; restore contentTableQuickActions in ui.tsx. | content_table: buttons order and labels match ACE; copy/view/ref-image/new-table work. analytics_tagging: export-screenshots visible and works. | — | Single source of truth for labels + order. |
| **7** | Assistant config extensions (optional fields) | `admin-editor/src/schema.ts` (assistantEntrySchema: optional instructionBlocks, outputSchema, safetyConstraints, etc.); generator; `src/core/types.ts`. | Low. Rollback: revert schema/generator/types. | Build; ACE can edit new fields. | — | — |
| **8** | Wire assistant extensions into runtime | `src/assistants/index.ts`, handlers (e.g. designCritique advancedToggles), recovery if needed. | Medium. Rollback: revert wiring. | design_critique and any wired assistant behave as before. | — | Prompt pipeline; handler contract. |
| **9** | Tests and invariant checklist | **New:** `src/core/contracts/__tests__/` or `tests/` (getHandler matrix, routing assertions, selectionContext image gating); `scripts/assert-invariants.ts` or CI step. `package.json`: add test script. | Low. Rollback: remove tests/script. | Run test script; CI green. | getHandler resolution; tool-only vs llm vs ui-only; buildSelectionContext no images when quickAction undefined. | All invariants. |

**Note on PR order:** PRs 2+3+4 establish required executionType and backfill before any routing change. PR 5 is the only one that changes main’s control flow; it must land after every quick action has executionType and tests are in place (PR 9 can precede or follow PR 5; if follow, run manual regression after PR 5).

---

## 3) executionType — enforce before refactoring main

**Decision:** No derived executionType once routing changes. Every quick action **must** have an explicit `executionType` before main.ts is refactored to use it.

### 3.1 Validation rules (admin-editor)

- **Schema:** In `admin-editor/src/schema.ts`, change quickActionSchema so that `executionType` is **required** (not optional):
  - `executionType: z.enum(['ui-only', 'tool-only', 'llm', 'hybrid'])`
- **validateModel:** No extra logic needed if schema is strict; parsing a manifest that lacks executionType will fail at `assistantEntrySchema` / quickActionSchema.
- **ACE save:** When user saves from ACE, the payload is validated by adminEditableModelSchema; missing executionType on any quick action → 400 + validation errors. ACE UI must provide a value (default or required field) so saved model always has executionType.

### 3.2 Migration / backfill for custom/assistants.manifest.json

- **One-time backfill:** For each assistant in the manifest, for each quick action, set executionType from the verified audit table (D) in assistants-architecture-audit-verified.md:
  - **tool-only:** content_table generate-table; design_critique temp-place-forced-action-card; analytics_tagging get-analytics-tags, copy-table, new-session.
  - **llm:** general (explain, suggestions); content_table — none in manifest today; ux_copy_review (all); design_critique give-critique, deceptive-review; dev_handoff, accessibility, errors (all); design_workshop generate-screens; discovery_copilot start-discovery.
  - **hybrid:** code2design send-json, get-json, json-format-help (or keep code2design as special-case in main and still tag send-json, get-json as hybrid, json-format-help as llm-with-canned-response — see below).
- **code2design nuance:** Today main does not call sendChat for any of them. Recommended: executionType `hybrid` for send-json and get-json (UI does modal/RUN_TOOL; main no-op); executionType `llm` for json-format-help with a special-case in main that returns canned message (or introduce a small `canned` executionType and keep one branch). To avoid “derived” behavior, prefer: json-format-help as `llm` and in main, when executionType === 'llm' and (assistantId, actionId) === (code2design, json-format-help), replaceStatusMessage(canned) and return without calling provider. That keeps executionType explicit and one small branch for canned content.

### 3.3 Fail-fast behavior

- **Generator:** In `scripts/generate-assistants-from-manifest.ts`, after reading manifest, before generating TS: iterate every assistant.quickActions; if any entry is missing `executionType` (or it’s not one of the four values), throw with a clear message (e.g. “Quick action ‘<id>’ of assistant ‘<assistantId>’ missing required executionType.”). Exit code non-zero so prebuild fails.
- **ACE:** On “Validate” or “Save”, POST to /api/validate or /api/save; server runs validateModel and schema parse. Missing executionType → validation errors returned; save can be rejected. No need for separate “executionType check” if schema requires the field.

---

## 4) Quick Actions UI-only strategy — recommendation

**Recommendation: Option A** (UI-only actions in manifest with executionType 'ui-only').

**Justification:**

- **Single source of truth:** Labels and ordering live in the manifest; ACE edits one place; plugin and UI consume the same list. Option B keeps a second list in ui.tsx (or a separate module), which can drift from ACE and from what’s displayed.
- **ACE visibility:** Editors see all actions per assistant in one list, including UI-only; they can reorder, relabel, or disable without code changes.
- **Main behavior:** Main treats executionType === 'ui-only' as no-op (return immediately after validation). So if a UI-only action ever reaches main (e.g. future code path), behavior is defined and safe.

### 4.1 Option A — specification

- **Manifest:** Add to content_table quickActions (with executionType 'ui-only'): send-to-confluence, copy-table, view-table, copy-ref-image, generate-new-table. Add to analytics_tagging: export-screenshots (executionType 'ui-only'). Order in manifest = display order in UI.
- **UI consumption:** For a given assistant, the list of quick actions to show = `assistant.quickActions` from the runtime (generated from manifest). No separate hardcoded contentTableQuickActions. Filter by context if needed (e.g. content_table: when contentTable exists, show all; when not, show only generate-table). Order = array order from manifest.
- **Main:** When RUN_QUICK_ACTION is received and the resolved action has executionType === 'ui-only', main does: (1) optional: push user message + status for consistency (or not, since UI didn’t send in current design); (2) return without calling provider or handler. Current behavior is that UI doesn’t send RUN_QUICK_ACTION for these at all; after Option A we can either keep that (UI handles 100% for ui-only) or have UI always emit and main no-op; the latter is simpler and consistent (“every click goes to main, main routes by executionType”).

**If we keep “UI handles ui-only without sending to main”:** Then UI still needs to know which actions are ui-only (from manifest) so it can handle them before emit. So UI still consumes assistant.quickActions and executionType; main never sees ui-only actions. Single source of truth is preserved; main doesn’t need to handle ui-only.

**If we “always send to main, main no-ops for ui-only”:** UI always emit RUN_QUICK_ACTION(actionId, assistantId); main looks up action, if executionType === 'ui-only' returns without doing work. Then UI doesn’t need to handle copy-table/view-table/etc. in handleQuickAction for content_table — but it still must, because copy-table opens a modal, view-table opens format modal, etc. So we still have UI handling for the *effect* of the action; main just doesn’t call LLM. So the only difference is whether we emit RUN_QUICK_ACTION for ui-only or not. **Recommendation:** Emit for ui-only as well; main returns immediately. That way the contract is “every quick action click goes to main; main routes by executionType.” UI then only does post-action effects (open modal, etc.) when it receives a message from main or when it’s a pure UI concern (e.g. copy to clipboard). Actually re-reading the current flow: for copy-table, the UI opens a modal and copies from in-memory contentTable; it doesn’t need main. So we have two patterns: (1) UI-only that never needs main (copy-table, view-table, copy-ref-image, export-screenshots) — UI handles and does not emit. (2) UI-only that could be acknowledged by main (e.g. for analytics) — emit and main no-op. For single source of truth we still put all in manifest; UI decides “if executionType === 'ui-only' and I can handle it without main, handle and don’t emit; else emit.” That’s a bit redundant. Cleaner: **all quick action clicks go to main**; for executionType === 'ui-only', main posts back a message like “OPEN_COPY_TABLE_MODAL” or leaves it to UI to interpret. That would require main to know about UI modals. So the simpler approach is: **UI-only actions: UI handles entirely and does not emit RUN_QUICK_ACTION.** Labels and order still come from manifest (assistant.quickActions); UI filters to show only actions that are either not ui-only, or ui-only and context-appropriate (e.g. content table exists). So Option A: (1) All actions in manifest with executionType. (2) UI builds button list from assistant.quickActions (manifest order). (3) On click: if executionType === 'ui-only', handle in UI and do not emit; else emit RUN_QUICK_ACTION. (4) Main: never receives ui-only; no-op branch in main is for safety if we ever send by mistake.

Final **Option A spec:**

- **Manifest:** All actions (including UI-only) have executionType. Order in manifest = display order.
- **UI:** Quick actions list = `assistant.quickActions` (no hardcoded contentTableQuickActions). On click: if `action.executionType === 'ui-only'`, handle in handleQuickAction (current behavior) and **do not** emit RUN_QUICK_ACTION; otherwise emit RUN_QUICK_ACTION.
- **Main:** If an action with executionType === 'ui-only' ever reaches main (e.g. future code path), return immediately without calling provider (no-op). No need to push user message for ui-only.

---

## 5) Frozen Runtime Contract deliverable

### 5.1 Location

- **Directory:** `src/core/contracts/`
- **Files:**
  - `requestEnvelope.ts` — LLMRequestEnvelope and related input types.
  - `responseEnvelope.ts` — LLMResponseEnvelope and related output types.
  - `handlerContract.ts` — HandlerContext, HandlerResult (re-export or alias from handlers/base.ts to avoid duplication), and any explicit “handler contract” typing used by main.
  - `types.ts` — Re-exports for consumers.
  - `README.md` — Mapping from envelope fields to existing code (main.ts, selectionContext.ts, providerFactory.ts, recovery.ts, promptPipeline.ts).

### 5.2 Exact TS interfaces (contract-types-only PR; no call-site changes)

- **LLMRequestEnvelope:** As in RFC §1.1: assistantId, actionId, requestId, messages, userMessageOverride?, selectionOrder, selection, selectionSummary?, images?, providerId, settings, assistantPreamble?, allowImages?, safetyToggles, budgets, schemaId?. Use existing types where possible (NormalizedMessage, SelectionState, ImageData, Settings, PromptBudgets from existing modules); import and compose.
- **LLMResponseEnvelope:** As in RFC §1.2: requestId, rawText, tierUsed, recoveredWithRedaction?, recoveredWithSummary?, parsedJson?, parseError?, handlerHandled, handlerMessage?, artifactsPlaced?, toolResult?, renderInstruction. Align with SendChatWithRecoveryResult and HandlerResult.
- **Handler contract:** Either re-export from `src/core/assistants/handlers/base.ts` (HandlerContext, HandlerResult, AssistantHandler) or define a minimal interface in contracts that main will use (e.g. `QuickActionHandlerContract { canHandle(assistantId, actionId): boolean; handleResponse(ctx): Promise<HandlerResult> }`) and document that AssistantHandler implements it. Prefer re-export to avoid duplication.

### 5.3 Mapping notes (for README in contracts/)

| Envelope / concept | Current source |
|--------------------|----------------|
| assistantId, actionId, requestId | main.ts RUN_QUICK_ACTION / SEND_MESSAGE |
| messages | main.ts getCurrentAssistantSegment, normalizeMessages; or action.templateMessage |
| selectionOrder, selection, selectionSummary, images | buildSelectionContext() in selectionContext.ts |
| providerId, settings | createProvider(), getEffectiveSettings() in providerFactory.ts, settings.ts |
| assistantPreamble, allowImages | main.ts preamble injection; recovery SendChatWithRecoveryOptions |
| safetyToggles | getSafetyToggles() from custom config |
| budgets | DEFAULT_BUDGETS / ALLOW_IMAGES_BUDGETS in promptPipeline.ts |
| rawText, tierUsed, recovered* | SendChatWithRecoveryResult in recovery.ts |
| handlerHandled, handlerMessage | HandlerResult in handlers/base.ts |
| artifactsPlaced | Handler postMessage types (SCORECARD_PLACED, etc.) |
| toolResult | RUN_TOOL result in main.ts |

### 5.4 Confirmation

- **Contract-types-only PR:** Only new files under `src/core/contracts/`; no changes to main.ts, recovery.ts, selectionContext.ts, providerFactory.ts, or any call site. Build and runtime behavior unchanged.

---

## 6) Tests / guardrails

### 6.1 Invariants as executable checklist

- **Script:** Add `scripts/assert-invariants.ts` (or similar) that runs in CI and:
  1. **Single source:** Asserts that assistant list is loaded from generated file only (e.g. no hardcoded ASSISTANTS array elsewhere).
  2. **Dispatch key:** Asserts that getHandler(assistantId, actionId) is used in main for quick actions (grep or AST).
  3. **Pipeline:** Asserts that sendChatWithRecovery is the only caller of assembleSegments/sanitizeSegments/applyBudgets (or that all paths to provider.sendChat go through recovery).
  4. **No runtime JSON:** Asserts that no plugin source file reads custom/assistants.manifest.json or custom/config.json at runtime (only generated TS).
  5. **buildSelectionContext:** Asserts that images are only set when quickAction?.requiresVision and provider.supportsImages (code inspection or unit test of buildSelectionContext).

- **Format:** Script can be tsx + simple asserts; exit 1 on failure. Run in `npm run assert-invariants` or in CI after build.

### 6.2 Minimal tests to prevent behavior drift

- **getHandler resolution matrix:** For each (assistantId, actionId) in the audit table, test getHandler(assistantId, actionId) returns the expected handler or undefined. File: e.g. `src/core/assistants/handlers/__tests__/getHandler.test.ts` or `tests/handlers/getHandler.test.ts`. Data: list of { assistantId, actionId, expectedHandlerId or null } from audit.
- **Tool-only vs llm vs ui-only routing:** Unit test or integration-style test that, for a given (assistantId, actionId) with executionType 'tool-only', the code path does not call provider.sendChat (mock or spy). Similarly, for executionType 'ui-only', main path returns without calling sendChatWithRecovery. For 'llm', sendChatWithRecovery is called. File: e.g. `tests/routing/executionType.test.ts`. This may require exporting a small “runQuickActionPath” or testing main’s branch logic in isolation.
- **SelectionContext image gating:** Unit test for buildSelectionContext: when quickAction is undefined, result.images is undefined even when selection has nodes and provider supports images. When quickAction.requiresVision is true and provider.supportsImages and selection.hasSelection, result.images is defined (or at least export is attempted). File: `src/core/context/__tests__/selectionContext.test.ts` or similar.

### 6.3 Test framework

- **Current state:** No existing *.test.ts/tsx in the plugin; there is `scripts/assert-prompt-pipeline.ts`. No vitest/jest in package.json.
- **Recommendation:** Add a **lightweight harness**: Node test runner (e.g. `node --test`) or Vitest for unit tests. Prefer **Node’s built-in test runner** (`node --test`) for minimal deps and fast CI, or **Vitest** if we want one-liner runs and future UI tests. Place tests in `tests/` at repo root or in `src/**/__tests__/`; run with `npm run test`. For getHandler and buildSelectionContext, unit tests don’t need Figma runtime; for main routing we may need mocks or a small extracted function to test.

---

## A) Architecture map (1 page)

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                        RUNTIME CONTRACT + ASSISTANT CONFIG FLOW                   │
├─────────────────────────────────────────────────────────────────────────────────┤
│  SOURCES (build-time, no runtime JSON)                                            │
│  • custom/assistants.manifest.json → generate-assistants → assistants.generated.ts│
│  • custom/config.json → generate-custom-overlay → customConfig.ts                 │
│  • custom/knowledge/*.md → generate-custom-overlay → customKnowledge.ts           │
│  • ASSISTANTS = f(ASSISTANTS_MANIFEST, mergeKnowledgeBase, appendDesignSystemKB)  │
│    in src/assistants/index.ts                                                     │
├─────────────────────────────────────────────────────────────────────────────────┤
│  ENTRY POINTS                                                                     │
│  • SEND_MESSAGE(message, includeSelection)  → chat path                            │
│  • RUN_QUICK_ACTION(actionId, assistantId) → quick action path                    │
│  • REQUEST_SETTINGS → getEffectiveSettings → SETTINGS_RESPONSE                     │
├─────────────────────────────────────────────────────────────────────────────────┤
│  REQUEST FLOW (single LLM path)                                                   │
│  ┌──────────────┐   ┌─────────────────────┐   ┌──────────────────────────────┐  │
│  │ getAssistant │   │ buildSelectionContext│   │ getHandler(id, actionId)      │  │
│  │ get action   │   │ (selectionOrder,     │   │ → tool-only? handleResponse   │  │
│  │              │   │  quickAction?,       │   │   and return                  │  │
│  │              │   │  provider)           │   │ → ui-only? return (no-op)     │  │
│  └──────┬───────┘   └──────────┬──────────┘   │ → else: messages + context    │  │
│         │                      │              └──────────────┬───────────────┘  │
│         │                      │                             │                  │
│         ▼                      ▼                             ▼                  │
│  ┌─────────────────────────────────────────────────────────────────────────────┐│
│  │ sendChatWithRecovery(provider, request, options)                            ││
│  │   → assembleSegments → sanitizeSegments → applyBudgets → buildMessages       ││
│  │   → applySafetyAssertions → getSafetyToggles → provider.sendChat              ││
│  │   → on CONTENT_FILTER: minimal retry → Tier 2 → Tier 3                       ││
│  └─────────────────────────────────────────────────────────────────────────────┘│
│  Provider: createProvider() → getEffectiveSettings() → Internal API | Proxy | id  │
├─────────────────────────────────────────────────────────────────────────────────┤
│  RESPONSE FLOW                                                                    │
│  handler.handleResponse(context) if handler → replaceStatusMessage / postMessage  │
│  else replaceStatusMessage(requestId, response)                                  │
│  State writes: messageHistory (in-memory), clientStorage (settings, analytics)  │
├─────────────────────────────────────────────────────────────────────────────────┤
│  DISPATCH KEY: (assistantId, actionId) everywhere. executionType on each action │
│  (required) drives: ui-only (UI handle, no emit) | tool-only (handler only)       │
│  | llm (sendChatWithRecovery + optional handler) | hybrid (e.g. code2design).    │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## B) PR-by-PR plan (table)

The full table (files, risk, rollback, manual QA, tests, invariants) is in **§2 Implementation plan — PR breakdown**. Summary:

| PR | Title | Key files | Invariants |
|----|--------|-----------|------------|
| 1 | Contract types only | New: src/core/contracts/* | Doc |
| 2 | executionType required | schema.ts, generate-assistants-from-manifest.ts, types.ts | SSOT |
| 3 | Backfill manifest | custom/assistants.manifest.json | — |
| 4 | ACE validation executionType | schema, app.js | Fail-fast |
| 5 | Main routing by executionType | main.ts | Dispatch, single path, handler |
| 6 | UI-only in manifest + UI from manifest | manifest, ui.tsx | SSOT labels/order |
| 7 | Assistant config extensions | schema, generator, types, app.js | — |
| 8 | Wire extensions | assistants/index.ts, handlers | Pipeline, handler |
| 9 | Tests + invariant script | tests/, scripts/assert-invariants.ts | All |

---

## C) UI-only strategy decision

**Decision: Option A** — UI-only actions live in the manifest with executionType 'ui-only'. Labels and ordering are single source of truth in manifest; UI builds the quick action list from `assistant.quickActions`. On click, if executionType === 'ui-only', UI handles and does not emit RUN_QUICK_ACTION; main treats ui-only as no-op if one ever arrives. See §4 for full spec.

---

## D) Must-not-break regression matrix (by assistantId, actionId)

From verified audit table D. Each row must behave the same before and after the refactor.

| assistantId | actionId | Execution type (target) | Expected behavior | Critical check |
|-------------|----------|--------------------------|-------------------|----------------|
| general | explain | llm | LLM response in chat | sendChatWithRecovery called; no handler handleResponse |
| general | suggestions | llm | Same | Same |
| content_table | generate-table | tool-only | ContentTableHandler runs; CONTENT_TABLE_GENERATED; no LLM | getHandler → ContentTableHandler; no provider.sendChat |
| content_table | send-to-confluence | ui-only | UI: format modal (currently disabled in UI list) | Not sent to main; or main no-op |
| content_table | copy-table | ui-only | UI: copy format modal | Not sent to main |
| content_table | view-table | ui-only | UI: view format modal | Not sent to main |
| content_table | copy-ref-image | ui-only | UI: handleCopyRefImage | Not sent to main |
| content_table | generate-new-table | ui-only | UI: clear table; if selection, emit generate-table | Never sent as generate-new-table to main |
| ux_copy_review | review-copy, tone-check, content-suggestions | llm | LLM response | sendChatWithRecovery called |
| design_critique | give-critique | llm | Scorecard JSON parsed; placed; handler handleResponse | prepareMessages + sendChat + handleResponse |
| design_critique | deceptive-review | llm | Deceptive report parsed; placed | Same |
| design_critique | temp-place-forced-action-card | tool-only | Demo cards placed; no LLM | getHandler → DesignCritiqueHandler; no provider.sendChat |
| code2design | send-json | hybrid | UI: modal; main: no-op | Main returns; UI opens modal |
| code2design | get-json | hybrid | UI: RUN_TOOL EXPORT_*; main: no-op | Main returns; UI emits RUN_TOOL |
| code2design | json-format-help | llm (canned) | Canned help message in chat | Main replaceStatusMessage(canned); no sendChat |
| dev_handoff | generate-specs, export-measurements, component-details | llm | LLM response | sendChatWithRecovery |
| accessibility | check-a11y, wcag-compliance, contrast-analysis | llm | LLM response | sendChatWithRecovery |
| errors | find-errors, check-consistency | llm | LLM response | sendChatWithRecovery |
| design_workshop | generate-screens | llm | designScreens JSON parsed; screens placed | sendChat + DesignWorkshopHandler handleResponse |
| discovery_copilot | start-discovery | llm | Discovery JSON parsed | sendChat + DiscoveryCopilotHandler handleResponse |
| analytics_tagging | get-analytics-tags | tool-only | Handler scans; session updated; no LLM | getHandler → AnalyticsTaggingHandler; no sendChat |
| analytics_tagging | copy-table | tool-only | Handler copies session table | Same |
| analytics_tagging | new-session | tool-only | Handler creates new session | Same |
| analytics_tagging | export-screenshots | ui-only | UI: directory picker + EXPORT_* | Not sent to main |

**Collision:** (content_table, copy-table) vs (analytics_tagging, copy-table) — dispatch key (assistantId, actionId) distinguishes; content_table copy-table never sent to main.

---

**End of kickoff.** No code implemented; if any RFC assumption is wrong (e.g. send-to-confluence not in UI list), it is called out in §1.2 and reflected in the Option A spec and regression matrix.
