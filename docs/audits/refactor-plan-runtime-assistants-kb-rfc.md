# RFC: Refactor Plan — Runtime Contract (A), Assistant Config (B), KB Normalization (C)

**Status:** Planning only. No code changes in this pass.  
**Baseline:** [assistants-architecture-audit-verified.md](./assistants-architecture-audit-verified.md)  
**Drift check (done before writing this RFC):** Current code matches the audit. Verified: main.ts RUN_QUICK_ACTION handler at 669; getHandler(assistantId, actionId) at 699; design_critique+temp-place at 704–743; content_table+generate-table at 745–775; analytics_tagging+(get-analytics-tags|copy-table|new-session) at 777–808; code2design block at 810–864. recovery.ts sendChatWithRecovery 128–265 (Tier 1 → minimal fallback → Tier 2 → Tier 3). selectionContext.ts buildSelectionContext 44–101. handlers/index.ts getHandler at line 29. Handler canHandle() implementations unchanged (contentTable, designCritique, designWorkshop, discovery, analyticsTagging). ui.tsx handleQuickAction 1105, contentTableQuickActions ~2130.

---

## Current state summary

- **Runtime:** All LLM requests go through `sendChatWithRecovery` → `promptPipeline` (assemble → sanitize → budget → buildMessages → applySafetyAssertions). Selection context is built only via `buildSelectionContext(selectionOrder, quickAction?, provider)` (`src/core/context/selectionContext.ts`). Provider selection: `getEffectiveSettings()` → `createProvider()` (`src/core/provider/providerFactory.ts`, `src/core/settings.ts`). Dispatch key is `(assistantId, actionId)` everywhere.
- **Quick actions:** Manifest defines quick actions in `custom/assistants.manifest.json` (schema in `admin-editor/src/schema.ts` quickActionSchema: id, label, templateMessage, requiresSelection, requiresVision, maxImages, imageScale). Routing in main uses explicit `if (assistantId === '...' && actionId === '...')` for tool-only paths (design_critique+temp-place, content_table+generate-table, analytics_tagging+get-analytics-tags|copy-table|new-session) and code2design (send-json/get-json return, json-format-help canned). UI-only actions (content_table send-to-confluence, copy-table, view-table, copy-ref-image, generate-new-table; code2design send-json modal / get-json RUN_TOOL; analytics_tagging export-screenshots) live in `ui.tsx` (`handleQuickAction`, `contentTableQuickActions` at ~2130) and are not in the manifest.
- **Assistants:** Single source is manifest → `scripts/generate-assistants-from-manifest.ts` → `src/assistants/assistants.generated.ts`; runtime list built in `src/assistants/index.ts` with `mergeKnowledgeBase(entry.id, promptTemplate)` and `appendDesignSystemKnowledge(...)`. Mode ordering: `customConfig.ui.simpleModeIds` / `advancedModeIds` / `contentMvpAssistantId` with code fallbacks `DEFAULT_SIMPLE_MODE_IDS`, `ADVANCED_DESIGN_ORDER` in `src/assistants/index.ts`.
- **KB:** Public content is in manifest `promptTemplate` and/or referenced files (e.g. `src/assistants/*.md`). Custom KB: `custom/knowledge/<assistantId>.md` → `generate-custom-overlay` → `customKnowledge.ts`; merge policy per assistant in `config.knowledgeBases` (append/override) applied in `src/custom/knowledge.ts` `mergeKnowledgeBase`. Design system index appended when enabled via `appendDesignSystemKnowledge`. No structured KB schema; markdown is concatenated.

---

## Target state

- **A)** A single, typed **LLM Request Envelope** and **Response Envelope**; explicit state read/write boundaries; all provider calls still go through the same pipeline.
- **B)** Quick actions have an explicit **execution type** in manifest/ACE model so main routing uses one path (handler + type) instead of special-case branches; UI-only actions either declared in manifest with a type or remain in a single declarative UI list with a clear contract.
- **C)** Assistant config: a **normalized schema** (instruction blocks, output schema selector, safety, KB attachments, tone, advanced toggles) that maps to current runtime without breaking assistants; quick actions remain pluggable in code but have standard declarative metadata.
- **D)** KB: a **normalized KB schema** (Purpose/Scope/Rules/Examples/etc.) with defined import paths (script, LLM, manual ACE) and update/merge/diff strategy.

---

## Non-goals

- Changing provider selection logic (Internal API → Proxy → fallback) or adding per-assistant providers.
- Exposing handler implementation details to ACE; only metadata and routing contracts are standardized.
- Runtime reading of JSON config/manifest; plugin continues to consume only generated TS after build.
- Removing or rewriting existing handlers; only routing and config shape are standardized.

---

## 1) Frozen Runtime Contract — Typed interface set

### 1.1 LLM Request Envelope (canonical inputs)

Proposed canonical type (to be implemented in code in a later phase). All current inputs are included; additions are optional and backward-compatible.

```ts
// Conceptual; file location TBD (e.g. src/core/contracts/requestEnvelope.ts)
interface LLMRequestEnvelope {
  // Identity
  assistantId: string
  actionId: string | undefined
  requestId: string

  // Content
  messages: NormalizedMessage[]
  userMessageOverride?: string  // e.g. quick action templateMessage

  // Selection (from buildSelectionContext)
  selectionOrder: string[]
  selection: SelectionState
  selectionSummary?: string
  images?: ImageData[]

  // Provider & settings (from getEffectiveSettings / createProvider)
  providerId: 'internal-api' | 'proxy' | 'stub' | string
  settings: Settings

  // Pipeline options
  assistantPreamble?: string
  allowImages?: boolean

  // Safety (from getSafetyToggles in custom/config)
  safetyToggles: { forceNoKbName?: boolean; forceNoSelectionSummary?: boolean; forceNoImages?: boolean }

  // Budgets (DEFAULT_BUDGETS | ALLOW_IMAGES_BUDGETS from promptPipeline)
  budgets: PromptBudgets

  // Optional: output schema hint for validation (e.g. 'scorecard' | 'designScreens' | 'discovery' | 'freeform')
  schemaId?: string
}
```

**Where this maps today:**

| Envelope field | Current source | File/function |
|----------------|----------------|---------------|
| assistantId, actionId | RUN_QUICK_ACTION payload or currentAssistant.id | main.ts 669, 676, 684 |
| requestId | generateRequestId() | main.ts |
| messages | getCurrentAssistantSegment + normalizeMessages; or action.templateMessage + segment | main.ts 531–537, 834–846 |
| selectionOrder, selection, selectionSummary, images | buildSelectionContext() | selectionContext.ts 46–102 |
| providerId, settings | createProvider(), getEffectiveSettings() | providerFactory.ts 44–70, settings.ts 98–126 |
| assistantPreamble, allowImages | main.ts preamble injection, recovery options | main.ts 539–561, 904–923; recovery.ts SendChatWithRecoveryOptions |
| safetyToggles | getSafetyToggles() | custom/config (generated) |
| budgets | DEFAULT_BUDGETS / ALLOW_IMAGES_BUDGETS | promptPipeline.ts 31–46 |
| schemaId | Not present today; optional for B/C | — |

**Read boundary:** Envelope is built in main thread only from: messageHistory (in-memory), selectionOrder (from Figma), getEffectiveSettings() (clientStorage + config), getAssistant/getHandler (from ASSISTANTS/handlers). No direct read of JSON files at runtime.

### 1.2 Response Envelope (canonical outputs)

```ts
// Conceptual; file location TBD (e.g. src/core/contracts/responseEnvelope.ts)
interface LLMResponseEnvelope {
  requestId: string
  rawText: string
  tierUsed: 1 | 2 | 3
  recoveredWithRedaction?: boolean
  recoveredWithSummary?: boolean

  // Optional parsed result (handler-specific)
  parsedJson?: unknown
  parseError?: string

  // Handler / UI directives (no exposure of internal handler code)
  handlerHandled: boolean
  handlerMessage?: string
  artifactsPlaced?: ('scorecard' | 'deceptive_report' | 'demo_cards' | 'content_table' | 'screens' | 'discovery' | 'analytics_session')[]
  toolResult?: { toolId: string; payload?: Record<string, unknown> }

  // UI render instructions (replace status, show in chat, show modal, etc.)
  renderInstruction: 'replace_status' | 'append_chat' | 'replace_status_and_show_artifact'
}
```

**Where this maps today:**

| Envelope field | Current source | File/function |
|----------------|----------------|---------------|
| rawText, tierUsed, recovered* | SendChatWithRecoveryResult | recovery.ts 37–51 |
| handlerHandled, handlerMessage | HandlerResult | handlers/base.ts 28–31 |
| artifactsPlaced | Implicit in handler postMessage types (SCORECARD_PLACED, CONTENT_TABLE_GENERATED, etc.) | handlers/*.ts |
| toolResult | RUN_TOOL result, sendAssistantMessage | main.ts 1081–1098; jsonTools.ts |
| renderInstruction | replaceStatusMessage vs handler-driven postMessage | main.ts replaceStatusMessage, sendAssistantMessage |

**Write boundary:** main thread writes to: messageHistory (in-memory), replaceStatusMessage/sendAssistantMessage (→ UI), figma.ui.postMessage (artifact messages). clientStorage: only via saveSettings (settings.ts) and analytics tagging storage (analyticsTagging/storage.ts). No direct write to repo files from plugin.

### 1.3 State locations and read/write boundaries

| State | Location | Read by | Write by |
|-------|----------|---------|----------|
| Message history | main.ts messageHistory (in-memory) | main (segment, normalize) | main (push user/status, replace status) |
| Settings | clientStorage `figmai_settings` | getSettings, getEffectiveSettings (settings.ts) | saveSettings (settings.ts), UI save | 
| Analytics session | clientStorage (key in analyticsTagging/storage.ts) | AnalyticsTaggingHandler, UI | AnalyticsTaggingHandler, UI |
| Mode | localStorage `figmai-mode` | UI init | UI mode switch |
| Assistant list & prompts | Generated TS (assistants.generated.ts, customConfig.ts, customKnowledge.ts) | assistants/index.ts, config.ts, knowledge.ts | Build only (ACE save → generators) |

---

## 2) Quick Actions framework proposal

### 2.1 Classification of every action

| Execution type | Meaning | Current examples |
|----------------|---------|------------------|
| **UI-only** | Handled entirely in UI; never RUN_QUICK_ACTION to main (or only to open modal / emit RUN_TOOL). | copy-ref-image; content_table send-to-confluence, copy-table, view-table, generate-new-table (when it only clears and re-triggers generate-table); code2design send-json (modal), get-json (RUN_TOOL); analytics_tagging export-screenshots |
| **Tool-only** | main calls handler.handleResponse with no provider.sendChat. | content_table generate-table; design_critique temp-place-forced-action-card; analytics_tagging get-analytics-tags, copy-table, new-session |
| **LLM-backed** | main builds context, sendChatWithRecovery, then optional handler.handleResponse. | give-critique, deceptive-review; design_workshop generate-screens; discovery_copilot start-discovery; general explain/suggestions; ux_copy_review, dev_handoff, accessibility, errors actions |
| **Hybrid** | UI does one thing (e.g. modal), main does another (e.g. no-op or canned message). | code2design send-json (UI: modal → RUN_TOOL; main: return), get-json (UI: RUN_TOOL; main: return), json-format-help (main: canned message) |

### 2.2 Explicit execution type in manifest / ACE model

- **Proposal:** Add optional `executionType` to quick action schema in manifest and ACE:
  - `'ui-only'` | `'tool-only'` | `'llm'` | `'hybrid'`
  - Default: if omitted, derive from existing behavior (handler canHandle + main branches) so current manifest stays valid.
- **Schema change:** `admin-editor/src/schema.ts` quickActionSchema: add `executionType: z.enum(['ui-only', 'tool-only', 'llm', 'hybrid']).optional()`. Generator `scripts/generate-assistants-from-manifest.ts`: pass through optional executionType; runtime type in `src/core/types.ts` QuickAction: add optional `executionType`.
- **Routing in main:** Replace explicit `if (assistantId === '...' && actionId === '...')` with:
  1. getHandler(assistantId, actionId)
  2. If handler and (executionType === 'tool-only' or handler declares tool-only for this pair): build handlerContext, handler.handleResponse(), return if handled
  3. If executionType === 'ui-only': return (no-op; UI should have handled)
  4. If code2design and (send-json | get-json): return; if json-format-help: canned message, return
  5. Else: proceed to LLM path (selection checks, buildSelectionContext, sendChatWithRecovery, handler.handleResponse or replaceStatusMessage)

**Files affected:** `admin-editor/src/schema.ts` (quickActionSchema), `scripts/generate-assistants-from-manifest.ts`, `src/core/types.ts` (QuickAction), `src/assistants/assistants.generated.ts` (generated), `src/main.ts` (RUN_QUICK_ACTION branch logic). Handler registration unchanged; canHandle remains the source of truth for “which handler owns this pair”; executionType is a hint for main so it can avoid hard-coded assistantId/actionId.

### 2.3 Migration plan for current UI-only actions

- **Option A — Manifest with executionType 'ui-only':** Add to manifest (ACE-editable) every UI-only action (e.g. content_table: send-to-confluence, copy-table, view-table, copy-ref-image, generate-new-table; analytics_tagging: export-screenshots) with `executionType: 'ui-only'`. Plugin UI continues to handle them in handleQuickAction; main never receives RUN_QUICK_ACTION for them if we keep UI handling first, or main receives and returns no-op when executionType === 'ui-only'. Single source of truth: manifest; ACE can see and reorder/label them.
- **Option B — Single declarative UI list (no manifest change):** Keep UI-only actions out of manifest. Document and centralize in one place: e.g. a constant in `src/ui.tsx` or a small module `src/ui/quickActionsUiOnly.ts` that exports a list of (assistantId, actionId) and optional metadata (label, icon). contentTableQuickActions and analytics_tagging export-screenshots stay UI-only; code2design send-json/get-json stay as today (manifest has the actions; main treats them as hybrid). No schema change for UI-only; only code organization.
- **Recommendation:** Option A for content_table and analytics_tagging UI-only actions so ACE has one list of all actions per assistant; add `executionType: 'ui-only'` and optional `uiHandler?: 'confluence' | 'copy-table' | 'view-table' | 'ref-image' | 'generate-new-table' | 'export-screenshots'` for wiring if needed. Option B for code2design (keep hybrid in manifest; main and UI behavior unchanged). Migration steps: (1) Add executionType to schema and generator; (2) Backfill manifest with executionType for existing actions from audit table; (3) Add UI-only entries to manifest for content_table and analytics_tagging with executionType 'ui-only'; (4) Refactor main to use executionType + getHandler instead of raw if/else; (5) UI: if action has executionType 'ui-only', handle in UI and optionally still emit RUN_QUICK_ACTION for analytics or future use, or keep current behavior (no emit for copy-ref-image, etc.).

---

## 3) Assistant configuration standardization

### 3.1 Normalized assistant config schema (ACE-driven, safe for non-technical editors)

Proposed extension of current assistant manifest entry (additive; defaults preserve current behavior):

- **Existing (unchanged):** id, label, intro, welcomeMessage, hoverSummary, tag, iconId, kind, quickActions, promptTemplate.
- **New optional blocks (all optional so no breaking change):**
  - **instructionBlocks:** `{ system?: string; userPrefix?: string; userSuffix?: string }` — Optional split of promptTemplate for pipeline/UI use; if absent, promptTemplate remains the single instruction blob.
  - **outputSchema:** `'freeform' | 'scorecard' | 'deceptive_report' | 'designScreens' | 'discovery' | 'content_table' | 'analytics_session'` — Hint for handler and validation; default freeform.
  - **safetyConstraints:** `{ allowImages?: boolean; requireSelectionForChat?: boolean }` — Maps to allowImages and selection checks; default from quick action when actionId set.
  - **knowledgeBases:** `{ publicRef?: string; customPolicy?: 'append' | 'override' }` — Override per-assistant custom policy; default from config.knowledgeBases[assistantId].
  - **toneStylePreset:** `'default' | 'concise' | 'structured'` — Optional; not used by pipeline today; for future preamble or model params.
  - **advancedToggles:** `{ injectDesignSystemQuery?: boolean; injectDeceptivePrompt?: boolean }` — Explicit flags instead of inferring from promptTemplate; used by Design Critique prepareMessages.

**Validation rules:** outputSchema must be one of the enum values. knowledgeBases.customPolicy if present must be append or override. References in simpleModeIds/advancedModeIds/contentMvpAssistantId must reference existing assistant ids (already in validateModel).

**Mapping to runtime:**  
- instructionBlocks: If present, pipeline could use system/userPrefix/userSuffix to assemble messages; today promptTemplate is merged into promptMarkdown and used as one block — migration can keep promptTemplate as default source and optionally merge instructionBlocks.  
- outputSchema: Passed into HandlerContext or Request Envelope as schemaId; handlers already know schema by assistantId/actionId.  
- safetyConstraints: Feed into buildSelectionContext and recovery options (allowImages).  
- knowledgeBases: Already per-assistant in config; assistant-level override optional.  
- advancedToggles: Replace or complement Design Critique’s detection of “deceptive” or “design system query” from last user message (designCritique handler prepareMessages).

**Files affected:** `admin-editor/src/schema.ts` (assistantEntrySchema), `scripts/generate-assistants-from-manifest.ts`, `src/core/types.ts` (Assistant), `src/assistants/assistants.generated.ts`, `src/assistants/index.ts` (build ASSISTANTS), `src/core/assistants/handlers/designCritique.ts` (prepareMessages if we use advancedToggles). ACE UI: `admin-editor/public/app.js` Assistants tab — add form fields for new optional blocks with sensible defaults.

### 3.2 Quick Actions: pluggable code, standard declarative config

- Quick action **code** (handler.handleResponse, UI modals, RUN_TOOL) remains pluggable and not exposed to ACE.
- **Declarative config** (manifest): id, label, templateMessage, requiresSelection, requiresVision, maxImages, imageScale, executionType (new), optional uiHandler for UI-only. ACE edits only this; plugin uses it for routing, labels, and template message. Handler registration (canHandle) stays in code; executionType in manifest allows main to route without hard-coded (assistantId, actionId) branches.

---

## 4) Knowledge Base normalization

### 4.1 KB schema (structure of content)

Proposed structure for a single KB document (markdown or structured):

- **Purpose** — One-line goal of the KB.
- **Scope** — What this KB applies to (assistant, use case).
- **Definitions** — Key terms (optional section).
- **Rules** — Must/must-not rules (bulleted or numbered).
- **Do / Don’t** — Short do/don’t lists.
- **Examples** — Code or text examples (optional).
- **Edge cases** — Exceptions, limits (optional).

Current markdown files (e.g. `src/assistants/designCritique.md`, `custom/knowledge/design_critique.md`) are freeform. Migration: either keep freeform and add optional frontmatter (e.g. Purpose, Scope) or convert gradually to sections above; both can be merged by mergeKnowledgeBase as today (append/override).

### 4.2 Import paths

- **(a) Script-based conversion:** New script (e.g. `scripts/normalize-kb-markdown.ts`) that reads existing .md, detects headings (## Purpose, ## Rules, …), and emits structured JSON or normalized markdown with consistent section order. Output can be consumed by generate-custom-overlay or a new step that writes custom/knowledge or a generated KB module. **Files:** New script; optionally `scripts/generate-custom-overlay.ts` or generate-assistants to accept structured KB.
- **(b) LLM prompt-based conversion:** ACE or a one-off job sends existing markdown to an LLM with a prompt that asks for extraction into Purpose/Scope/Rules/Do-Don’t/Examples/Edge cases; output is markdown or JSON. Manual review before committing. No change to plugin runtime.
- **(c) Manual ACE form:** ACE Knowledge tab: form fields for Purpose, Scope, Rules (textarea), Do/Don’t, Examples, Edge cases. Save as custom/knowledge/<id>.md with a standard template (e.g. ## Purpose\n...\n## Rules\n...). **Files:** admin-editor/public/app.js (Knowledge tab), admin-editor save (already writes customKnowledge by assistantId).

### 4.3 Update strategy: diff/merge and “what changed” visibility

- **Merge:** Keep current policy (append vs override) in config.knowledgeBases[assistantId]. Custom content is one blob per assistant; mergeKnowledgeBase concatenates or replaces. No per-section merge in this phase unless we introduce structured KB storage.
- **Diff / what changed:** ACE can show “draft vs saved” diff when editor edits Knowledge; saveModel already writes custom/knowledge/<id>.md. Optional: store last saved content hash or version in model meta and show “Knowledge for X changed” in ACE UI. Plugin does not need diff; it only consumes generated customKnowledge.ts after build.

---

## 5) Guardrails and tests

### 5.1 Invariants checklist (from audit)

Convert the audit’s “F) Risks + refactor guardrails” invariants into a pre/post refactor checklist:

- [ ] **Single source of assistant/quick action definitions:** Manifest → generator → assistants.generated.ts; ASSISTANTS built only in assistants/index.ts. No second source.
- [ ] **Dispatch key (assistantId, actionId):** All routing uses (assistantId, actionId). UI-only actions either not sent to main or main treats by executionType.
- [ ] **buildSelectionContext contract:** Only producer of selection + selectionSummary + images; images only when quickAction?.requiresVision && provider.supportsImages && selection.hasSelection.
- [ ] **Prompt pipeline single path:** All LLM requests via sendChatWithRecovery → assembleSegments → sanitizeSegments → applyBudgets → buildMessages → applySafetyAssertions (and Tier 2/3 on CONTENT_FILTER).
- [ ] **Provider selection:** getEffectiveSettings() → createProvider(); Internal API → Proxy → providerId fallback.
- [ ] **Handler contract:** canHandle(assistantId, actionId); prepareMessages?(messages); handleResponse(context) → { handled, message? }. No double-invoke.
- [ ] **No runtime JSON config:** Plugin uses only generated TS (assistants.generated.ts, customConfig.ts, customKnowledge.ts).
- [ ] **ACE save → build:** Save runs generators; plugin build consumes generated output.

### 5.2 Suggested automated tests

- **Unit:** getHandler(assistantId, actionId) returns expected handler for each (assistantId, actionId) in the audit table; buildSelectionContext returns no images when quickAction is undefined; applyBudgets respects DEFAULT_BUDGETS/ALLOW_IMAGES_BUDGETS.
- **Integration (main):** For each (assistantId, actionId) that is tool-only, call RUN_QUICK_ACTION and assert no provider.sendChat; for LLM-backed, assert sendChatWithRecovery called and handler.handleResponse called when handler exists.
- **Regression matrix (no behavior change):** For each row in the audit’s Assistant inventory + Quick Action classification table, one test (or manual QA step): run the action and assert expected outcome (message type, artifact placed, or UI-only behavior). Focus on: design_critique (give-critique, deceptive-review, temp-place-forced-action-card), content_table (generate-table, and UI copy/view/send), code2design (send-json, get-json, json-format-help), analytics_tagging (get-analytics-tags, copy-table, new-session, export-screenshots).

---

## 6) Migration steps (high level)

1. **Contract types only:** Introduce LLMRequestEnvelope and LLMResponseEnvelope types (and state boundary doc) in a new file under `src/core/contracts/` or similar; do not change call sites yet. **Files:** New file(s); no change to main.ts, recovery.ts. **Rollback:** Delete new file.
2. **Execution type in schema and generator:** Add executionType to quickActionSchema (optional), generator, and QuickAction type; backfill manifest with executionType for all current actions from audit. **Files:** admin-editor/src/schema.ts, scripts/generate-assistants-from-manifest.ts, src/core/types.ts, custom/assistants.manifest.json. **Rollback:** Remove field from schema and generator; revert manifest.
3. **Main routing refactor:** In main.ts RUN_QUICK_ACTION, replace explicit if (assistantId === ... && actionId === ...) with: getHandler + executionType === 'tool-only' (or handler-declared tool-only) → handleResponse and return; executionType === 'ui-only' → return; code2design send-json/get-json/json-format-help keep current behavior. **Files:** src/main.ts. **Rollback:** Revert main.ts to current branches.
4. **UI-only actions in manifest (optional):** Add content_table and analytics_tagging UI-only actions to manifest with executionType 'ui-only'; UI continues to handle them first. **Files:** custom/assistants.manifest.json, admin-editor schema if new fields. **Rollback:** Remove those entries.
5. **Assistant config extensions:** Add optional instructionBlocks, outputSchema, safetyConstraints, knowledgeBases override, toneStylePreset, advancedToggles to assistant schema and generator; defaults so existing manifest valid. **Files:** admin-editor/src/schema.ts, scripts/generate-assistants-from-manifest.ts, src/core/types.ts, ACE app.js Assistants tab. **Rollback:** Remove new fields; keep promptTemplate/quickActions as only required.
6. **KB schema and import path (a):** Add script to normalize markdown to structured sections; optional integration with generate-custom-overlay. **Files:** New script; optionally scripts/generate-custom-overlay.ts. **Rollback:** Remove script; keep current overlay.
7. **KB ACE form (c):** Add Knowledge tab fields for Purpose/Scope/Rules/etc. and save as custom/knowledge/<id>.md. **Files:** admin-editor/public/app.js, save. **Rollback:** Revert to single markdown textarea if needed.
8. **Tests:** Add invariant checklist run (e.g. in CI) and regression matrix tests for assistantId/actionId. **Files:** New test file(s). **Rollback:** Remove or skip tests.

---

## Risks

- **Execution type defaulting:** If executionType is omitted, derivation from handler canHandle + current main branches must be correct for every (assistantId, actionId); otherwise routing could change. Mitigation: backfill manifest in same PR as routing refactor; add validation that every quick action has executionType before removing fallback logic.
- **ACE UI complexity:** New assistant fields (instructionBlocks, outputSchema, etc.) may overwhelm non-technical editors. Mitigation: all new fields optional and hidden behind “Advanced” or “Developer” section in ACE.
- **KB structure:** Migrating existing freeform markdown to Purpose/Scope/Rules may lose nuance or require manual review. Mitigation: script and LLM paths are best-effort; manual ACE form is optional; mergeKnowledgeBase continues to accept raw markdown.

---

## Test plan

- **Pre-refactor baseline:** Run regression matrix (manual or automated) for each assistant and quick action from audit; record outcomes.
- **After each PR:** Re-run regression matrix; run invariant checklist (automated where possible).
- **Focus areas:** design_critique (all three actions), content_table (generate-table + UI-only), code2design (send-json, get-json, json-format-help), analytics_tagging (get/copy/new-session + export-screenshots), settings load and provider selection (Internal API vs Proxy).

---

## Sequenced task list (small PRs)

| # | Task | Files touched | Rollback |
|---|------|---------------|----------|
| 1 | Add LLMRequestEnvelope and LLMResponseEnvelope types + state boundary doc (no call site changes) | New: src/core/contracts/requestEnvelope.ts, responseEnvelope.ts, stateBoundary.md | Delete new files |
| 2 | Add executionType to quickActionSchema (optional), generator, QuickAction type; backfill manifest | schema.ts, generate-assistants-from-manifest.ts, types.ts, assistants.manifest.json | Revert schema/generator/manifest |
| 3 | Refactor main RUN_QUICK_ACTION: use getHandler + executionType for tool-only; keep code2design branches | main.ts | Revert main.ts |
| 4 | Add UI-only quick actions to manifest (content_table, analytics_tagging) with executionType 'ui-only' | assistants.manifest.json, regenerate | Revert manifest + regenerate |
| 5 | Add optional assistant fields (instructionBlocks, outputSchema, safetyConstraints, etc.) to schema and generator | schema.ts, generate-assistants-from-manifest.ts, types.ts | Revert schema/generator/types |
| 6 | Wire optional assistant fields into runtime (promptMarkdown build, handler schemaId, designCritique advancedToggles) | assistants/index.ts, handlers/designCritique.ts, recovery/pipeline if needed | Revert changes |
| 7 | ACE Assistants tab: form fields for new assistant options (collapsed/advanced) | admin-editor/public/app.js | Revert app.js |
| 8 | KB: add normalize-kb script (optional) and/or ACE Knowledge form (Purpose/Scope/Rules) | New script; app.js Knowledge tab; save | Revert script + app.js |
| 9 | Invariant checklist script or CI step; regression test matrix by assistantId/actionId | New test file(s), package.json script or CI | Remove/skip tests |

---

**End of RFC.** No code changes in this pass; all recommendations cite affected files and preserve (assistantId, actionId) and the single sendChatWithRecovery/promptPipeline path.
