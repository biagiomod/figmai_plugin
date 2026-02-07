# FigmAI + ACE — Assistants Architecture Audit (Pre-Refactor)

**Scope:** Plugin + admin-editor (ACE) + custom config + assistants + KBs + schemas.  
**Goal:** Accurate map of how Assistants work today (helper functions, Quick Actions, execution pipelines). No refactor proposals in the audit; invariants to freeze are listed at the end.

---

## 1. Architecture Map (High-Level)

### Major subsystems and responsibilities

| Subsystem | Responsibility | Key paths |
|-----------|----------------|-----------|
| **Plugin UI** | Chat, assistant selector, quick action buttons, mode (simple/advanced/content-mvp), message history display, scorecard/table/artifact rendering, settings modal | `src/ui.tsx`, `src/ui/components/*.tsx` |
| **Main thread** | Message routing, handler lookup, selection state, provider creation, SEND_MESSAGE + RUN_QUICK_ACTION handling, boundary/instructions injection, sendChatWithRecovery | `src/main.ts` |
| **Providers** | LLM request formatting and send; Internal API vs Proxy vs stub | `src/core/provider/*.ts`, `src/core/proxy/client.ts` |
| **Config** | customConfig (bundled), getCustomConfig, getLlmProvider, getConfigProxySettings, getEffectiveSettings | `src/custom/config.ts`, `src/custom/generated/customConfig.ts`, `src/core/settings.ts` |
| **Assistants** | Manifest → ASSISTANTS array, mergeKnowledgeBase + appendDesignSystemKnowledge → promptMarkdown; listAssistantsByMode, getAssistant, getHandler | `src/assistants/index.ts`, `src/assistants/assistants.generated.ts`, `src/core/assistants/handlers/index.ts` |
| **ACE server** | Load/save model (config.json, assistants.manifest.json, custom knowledge), auth, RBAC, users CRUD | `admin-editor/server.ts`, `admin-editor/src/model.ts`, `admin-editor/src/save.ts`, `admin-editor/src/schema.ts` |
| **ACE client** | Tabs (General, AI, Assistants, Knowledge, …), edit assistants manifest (incl. quickActions), save model | `admin-editor/public/app.js`, `admin-editor/public/index.html` |
| **Storage** | clientStorage (settings); in-memory message history; analytics tagging session (clientStorage); no server-side cache for prompts | `src/core/settings.ts`, `src/core/analyticsTagging/storage.ts` |

### Entry points

| Entry | Trigger | Code path |
|-------|--------|-----------|
| **Normal assistant run (chat)** | User sends message in chat | UI: `handleSend` → `emit('SEND_MESSAGE', message)` → main: `on('SEND_MESSAGE')` → build context, normalize messages, optional handler.prepareMessages → sendChatWithRecovery → handler.handleResponse if any, else replaceStatusMessage(response) |
| **Quick action run** | User clicks quick action | UI: `handleQuickAction(actionId)` → optional UI-only handling (e.g. content_table copy-table, code2design send-json) → `emit('RUN_QUICK_ACTION', actionId, assistant.id)` → main: `on('RUN_QUICK_ACTION')` → getAssistant, get action, getHandler; special-case blocks (design_critique temp-place, content_table generate-table, analytics_tagging get/copy/new-session, code2design send/get/help) or build context → sendChatWithRecovery → handler.handleResponse |
| **Settings load** | Plugin opens or user opens Settings | UI: `emit('REQUEST_SETTINGS')` → main: `on('REQUEST_SETTINGS')` → getEffectiveSettings() → postMessage SETTINGS_RESPONSE → SettingsModal hydrates from response |
| **Assistant-specific flows** | Content Table scan (no LLM), Design Critique scorecard/deceptive/place cards, Design Workshop JSON screens, Discovery Copilot JSON, Analytics Tagging get/copy/new-session | main.ts RUN_QUICK_ACTION branches + handlers in `src/core/assistants/handlers/*.ts` |

---

## 2. Assistant Inventory

Source of truth for list: **custom/assistants.manifest.json** → **scripts/generate-assistants-from-manifest.ts** → **src/assistants/assistants.generated.ts**. Runtime list: **src/assistants/index.ts** builds ASSISTANTS from manifest + mergeKnowledgeBase + appendDesignSystemKnowledge.

| ID | Name | Configured in | Mode(s) | Knowledge base (paths/IDs) | Output / schema | Quick Actions (IDs) | Special-case code |
|----|------|----------------|---------|----------------------------|------------------|---------------------|--------------------|
| general | General | custom/assistants.manifest.json | simple, advanced | Public only (promptTemplate in manifest); no .md | Free-form text | explain, suggestions | None |
| content_table | Content Table | same | simple, advanced | src/assistants/contentTable.md (ref in promptTemplate); custom/knowledge via mergeKnowledgeBase | ContentTableV1 (scanner output) | generate-table | Handler: content_table + generate-table → ContentTableHandler (no LLM); main.ts explicit branch |
| ux_copy_review | Content Review | same | advanced | src/assistants/uxCopyReview.md; custom | Free-form | review-copy, tone-check, content-suggestions | None |
| design_critique | Design Critique | same | simple, advanced | src/assistants/designCritique.md; custom | JSON scorecard / deceptive report; strict JSON in promptTemplate | give-critique, deceptive-review, temp-place-forced-action-card | Handler: prepareMessages (tool/DS, deceptive prompt); handleResponse (parse JSON, place scorecard, deceptive report, or place demo cards); main.ts explicit branches for temp-place and LLM path |
| code2design | Code2Design | same | advanced | General promptTemplate (shared with general) | JSON template / help text | send-json, get-json, json-format-help | main.ts: send-json/get-json no-op or placeholder; json-format-help → canned message; UI: send-json opens modal, get-json → RUN_TOOL EXPORT_SELECTION_TO_TEMPLATE_JSON |
| dev_handoff | Dev Handoff | same | advanced | src/assistants/devHandoff.md; custom | Free-form | generate-specs, export-measurements, component-details | None |
| accessibility | Accessibility | same | advanced | src/assistants/accessibility.md; custom | Free-form / structured per KB | check-a11y, wcag-compliance, contrast-analysis | None |
| errors | Errors | same | advanced | src/assistants/errors.md; custom | Free-form | find-errors, check-consistency | None |
| design_workshop | Design Workshop | same | simple, advanced | In manifest (long promptTemplate) | designScreens JSON (strict) | generate-screens | Handler: DesignWorkshopHandler prepareMessages + handleResponse (parse JSON, place screens) |
| discovery_copilot | Discovery Copilot | same | advanced | In manifest | discovery JSON (DiscoverySpecV1) | start-discovery | Handler: DiscoveryCopilotHandler |
| analytics_tagging | Analytics Tagging | same | advanced | In manifest (short) | Table rows (ScreenID, ActionID); no LLM for get/copy/new-session | get-analytics-tags, copy-table, new-session | Handler: AnalyticsTaggingHandler; main.ts explicit branch for get/copy/new-session; UI: copy-table/view-table/send-to-confluence handled in UI for content_table; analytics_tagging export-screenshots in UI |

**Mode rules:** simpleModeIds / advancedModeIds / contentMvpAssistantId from customConfig (ACE: config.json → custom/config.json → generate-custom-overlay → customConfig.ts). Defaults in `src/assistants/index.ts`: DEFAULT_SIMPLE_MODE_IDS, DEFAULT_CONTENT_MVP_ASSISTANT_ID, ADVANCED_DESIGN_ORDER.

---

## 3. Execution Pipelines

### 3.1 Standard assistant chat/run

1. **UI:** User types message and sends. `handleSend` in ui.tsx → `emit('SEND_MESSAGE', message, includeSelection)`.
2. **Main (main.ts):** `on('SEND_MESSAGE')`:
   - requestId = generateRequestId(); sendStatusMessage(requestId, '…').
   - currentAssistant from lastAssistantId; if none, send error and return.
   - **Selection context:** If includeSelection, `buildSelectionContext({ selectionOrder, quickAction: undefined, provider })` (selectionContext.ts) → summarizeSelection (selection.ts), extractSelectionSummary + formatSelectionSummary (selectionSummary.ts); images only if quickAction.requiresVision and provider.supportsImages (here quickAction is undefined so no images unless chat path adds them elsewhere—confirm: for chat, includeSelection just adds selection summary).
   - **Messages:** messageHistory → normalizeToChatMessages (main.ts) → build finalChatMessages (boundary + greeting + instructions when assistant changed; preamble injection for Internal API). Handler.prepareMessages(finalChatMessages) if handler exists (e.g. Design Critique).
   - **Provider:** createProvider() → getEffectiveSettings() → Internal API first, else Proxy, else providerId fallback (providerFactory.ts).
   - **Send:** sendChatWithRecovery(currentProvider, { messages, assistantId, selectionSummary, images, … }, { assistantPreamble, … }). recovery.ts: Tier 1 = full payload; on CONTENT_FILTER, Tier 2 (redact) or Tier 3 (screen index) retry. Pipeline: assembleSegments → sanitizeSegments → applyBudgets → buildMessages → applySafetyAssertions (promptPipeline.ts); preparePayloadTier2/Tier3 (contentSafety/prepare.ts). Provider.sendChat(normalizedRequest).
   - **Response:** If handler.handleResponse exists and returns handled: true, replace status with result.message. Else replaceStatusMessage(requestId, response). Analytics: assistant_complete.
3. **Context assembly:** Selection: figma.currentPage.selection → selectionOrder (main.ts); extractSelectionSummary(selectionOrder) → formatSelectionSummary (selectionSummary.ts). Instructions/greeting: built in main from currentAssistant.promptMarkdown (which is mergeKnowledgeBase + appendDesignSystemKnowledge in assistants/index.ts).
4. **KB attachment:** promptMarkdown is computed once per assistant at module load (ASSISTANTS array). No per-request KB fetch; custom knowledge merged via mergeKnowledgeBase(assistantId, promptTemplate) and appendDesignSystemKnowledge(...) in src/assistants/index.ts.
5. **Provider selection:** getEffectiveSettings() (settings.ts): if config.llm.provider === 'internal-api' use endpoint; if 'proxy' use config proxy fields; else clientStorage. createProvider uses that for InternalApiProvider vs ProxyProvider.
6. **Request formatting / size:** promptPipeline.ts DEFAULT_BUDGETS (total 40k, sys/asst/user/ctx/logs caps); ALLOW_IMAGES_BUDGETS when allowImages. contentSafety/prepare.ts trims and Tier 2/3 replacements.
7. **Response parsing/validation:** Handlers (e.g. Design Critique) parse JSON and render; otherwise raw response shown in chat. Content-safety recovery on CONTENT_FILTER.
8. **Rendering:** replaceStatusMessage sends ASSISTANT_MESSAGE or status update to UI; UI appends to message list or shows scorecard/table from handler-driven messages (e.g. SCORECARD_PLACED, CONTENT_TABLE_GENERATED).
9. **Caching:** No prompt or response cache. messageHistory in main is in-memory. clientStorage: settings only; analytics tagging session in clientStorage (storage.ts).

### 3.2 Quick Action run

1. **UI:** User clicks quick action. handleQuickAction(actionId) in ui.tsx:
   - UI-only: copy-ref-image, content_table (send-to-confluence, copy-table, view-table, generate-new-table → may set actionId = 'generate-table'), code2design (send-json → modal, get-json → RUN_TOOL EXPORT_SELECTION_TO_TEMPLATE_JSON), design_critique give-critique (clear scorecard), analytics_tagging export-screenshots (directory picker + EXPORT_ANALYTICS_TAGGING_SCREENSHOTS).
   - Else: check action.requiresSelection / requiresVision vs selectionState; then emit('RUN_QUICK_ACTION', actionId, assistant.id).
2. **Main (main.ts):** on('RUN_QUICK_ACTION', actionId, assistantId):
   - getAssistant(assistantId), action = assistant.quickActions.find(a => a.id === actionId); validate; getAnalytics().track('assistant_run', …).
   - **Handler pre-LLM (no LLM):** getHandler(assistantId, actionId). If handler exists and assistantId+actionId in explicit list: build handlerContext (selectionOrder, summarizeSelection(selectionOrder), provider, sendChatWithRecovery, replaceStatusMessage, requestId), handler.handleResponse(handlerContext). If handled, replace status and return. Explicit branches: design_critique + temp-place-forced-action-card; content_table + generate-table; analytics_tagging + get-analytics-tags | copy-table | new-session.
   - **Code2Design:** send-json/get-json return early; json-format-help → replaceStatusMessage(canned help).
   - **Selection/vision checks:** action.requiresSelection && !selection.hasSelection → error; action.requiresVision && !selection.hasSelection → error.
   - **Selection context:** buildSelectionContext({ selectionOrder, quickAction: action, provider }) → selection + selectionSummary + images (if requiresVision and provider.supportsImages, maxImages/imageScale from action).
   - **Messages:** User message = action.templateMessage; build request with assistant promptMarkdown, boundary/instructions, selection summary, images. Handler.prepareMessages if present (e.g. Design Critique deceptive prompt, tool enforcement).
   - **Send:** sendChatWithRecovery(provider, request, { assistantPreamble, selectionSummary, assistantId, quickActionId: actionId }).
   - **Response:** handler.handleResponse(context) if handler; if handled, replace status and return. Else replaceStatusMessage(requestId, response).
3. **Handler registration:** src/core/assistants/handlers/index.ts: ContentTableHandler, DesignCritiqueHandler, DesignWorkshopHandler, DiscoveryCopilotHandler, AnalyticsTaggingHandler. getHandler(assistantId, actionId) returns first handler where canHandle(assistantId, actionId) is true.

---

## 4. Helper Function Index (Important Ones)

### Context extraction

| Function | File | What it does | Call sites |
|----------|------|--------------|------------|
| summarizeSelection | src/core/context/selection.ts | From selectionOrder (node ids), returns SelectionState (count, summary, hasSelection, names) | main.ts (selection state to UI, handler context), selectionContext.ts |
| extractSelectionSummary | src/core/context/selectionSummary.ts | Async: builds SelectionSummary (nodes, text, layout, etc.) from selection/selectionOrder | selectionContext.ts buildSelectionContext |
| formatSelectionSummary | src/core/context/selectionSummary.ts | Formats SelectionSummary as string for AI context | selectionContext.ts buildSelectionContext |
| buildSelectionContext | src/core/context/selectionContext.ts | Returns SelectionContext (selection, selectionSummary?, images?); images only when quickAction.requiresVision and provider.supportsImages; uses exportSelectionAsImages | main.ts SEND_MESSAGE and RUN_QUICK_ACTION |
| exportSelectionAsImages | src/core/figma/exportSelectionAsImages.ts | Exports selection as image data URLs (maxImages, imageScale) | selectionContext.ts |

### Prompt assembly

| Function | File | What it does | Call sites |
|----------|------|--------------|------------|
| mergeKnowledgeBase | src/custom/knowledge.ts | Merges custom KB with public content for assistantId (append/override from config) | src/assistants/index.ts (when building ASSISTANTS) |
| appendDesignSystemKnowledge | src/custom/knowledge.ts | Appends design system component index to content when designSystems.enabled | src/assistants/index.ts |
| assembleSegments | src/core/llm/promptPipeline.ts | Splits request.messages into sys/asst/user segments; optional preamble split | recovery.ts sendChatWithRecovery |
| sanitizeSegments | src/core/llm/promptPipeline.ts | Data URL / base64 / long line / huge JSON sanitization; sets DiagFlag[] | recovery.ts |
| applyBudgets | src/core/llm/promptPipeline.ts | Trims segments to DEFAULT_BUDGETS or ALLOW_IMAGES_BUDGETS | recovery.ts |
| buildMessages | src/core/llm/promptPipeline.ts | Converts segments to normalized messages for provider | recovery.ts |
| applySafetyAssertions | src/core/llm/promptPipeline.ts | forceNoKbName, forceNoSelectionSummary, forceNoImages (safety toggles) | recovery.ts |

### KB loading/merging

| Function | File | What it does | Call sites |
|----------|------|--------------|------------|
| mergeKnowledgeBase | src/custom/knowledge.ts | See above | assistants/index.ts |
| appendDesignSystemKnowledge | src/custom/knowledge.ts | See above | assistants/index.ts |
| loadDesignSystemRegistries | src/core/designSystem/registryLoader.ts | Loads active registries from customConfig | knowledge.ts appendDesignSystemKnowledge |
| buildComponentIndex | src/core/designSystem/searchIndex.ts | Builds compact component index for KB | knowledge.ts |

### Provider routing/auth

| Function | File | What it does | Call sites |
|----------|------|--------------|------------|
| getEffectiveSettings | src/core/settings.ts | Returns Settings: config overrides (provider, proxy, internal-api) over clientStorage | main.ts (createProvider), providerFactory.ts createProvider |
| createProvider | src/core/provider/providerFactory.ts | Internal API first, else Proxy, else providerId fallback | main.ts |
| getHandler | src/core/assistants/handlers/index.ts | Returns AssistantHandler for (assistantId, actionId) or undefined | main.ts SEND_MESSAGE and RUN_QUICK_ACTION |
| prepareRequest | src/core/provider/normalize.ts | Strips unsupported features by provider capabilities; normalizeMessages, normalizeImageData | proxyProvider, internalApiProvider |

### Network request wrappers

| Function | File | What it does | Call sites |
|----------|------|--------------|------------|
| sendChatWithRecovery | src/core/contentSafety/recovery.ts | Assemble → sanitize → budget → send; on CONTENT_FILTER, Tier 2 then Tier 3 retry | main.ts SEND_MESSAGE and RUN_QUICK_ACTION |
| provider.sendChat | src/core/provider/*.ts | Actual HTTP/API call (Proxy vs Internal API) | recovery.ts after prepareRequest |

### Response parsing/validation

| Function | File | What it does | Call sites |
|----------|------|--------------|------------|
| parseScorecardJson | src/core/output/normalize.ts | Parses Design Critique scorecard JSON | designCritique handler |
| parseDeceptiveReportJson | src/core/output/normalize/deceptiveReport.ts | Parses deceptive review JSON | designCritique handler |
| normalizeContentTableV1 / validateContentTableV1 | src/core/contentTable/validate.ts | Content table schema validation | contentTable handler, scanner path |
| Handler.handleResponse | src/core/assistants/handlers/*.ts | Assistant-specific parse + render (scorecard, table, screens, discovery, analytics) | main.ts after sendChatWithRecovery |

### UI rendering/formatting

| Function | File | What it does | Call sites |
|----------|------|--------------|------------|
| replaceStatusMessage | main.ts (inline) | Finds status message by requestId, updates content/error style, postMessage to UI | main.ts after handler or sendChatWithRecovery |
| sendAssistantMessage | main.ts (inline) | postMessage ASSISTANT_MESSAGE | main.ts errors, handler messages |
| renderScorecard / placeCritiqueOnCanvas | src/core/figma/renderScorecard.ts, placeCritiqueFallback.ts | Place scorecard artifact on canvas | designCritique handler |
| createArtifact, placeArtifact | src/core/figma/artifacts/*.ts | Generic artifact placement | designCritique, designWorkshop handlers |

### Export/clipboard/table utilities

| Function | File | What it does | Call sites |
|----------|------|--------------|------------|
| sessionToTable (TSV) | src/core/analyticsTagging/sessionToTable.ts | Converts analytics session to TSV string | UI copy table, export |
| Content table export (HTML/TSV) | ui.tsx / content table state | Export table as file or clipboard | UI content_table actions |

### Config load/save + version/build info

| Function | File | What it does | Call sites |
|----------|------|--------------|------------|
| getCustomConfig | src/custom/config.ts | Returns customConfig from generated | Many: settings, mode, assistants index, knowledge |
| loadModel | admin-editor/src/model.ts | Reads config.json, assistants.manifest.json, custom knowledge paths; returns AdminEditableModel | server GET /api/model |
| saveModel | admin-editor/src/save.ts | Writes config.json, assistants.manifest.json, custom knowledge | server POST /api/save |
| Build info | admin-editor/server.ts GET /api/build-info | Reads build/build-info.json | ACE app.js AI tab |

### RBAC/permissions (ACE)

| Function | File | What it does | Call sites |
|----------|------|--------------|------------|
| requireAuth | admin-editor/src/auth-middleware.ts | Validates session, sets res.locals.auth | server.ts protected routes |
| requireOwner → requireAdmin | auth-middleware.ts | auth.role === 'admin' | server.ts /api/users |
| requireRole('editor') | auth-middleware.ts | editor/manager/admin can validate/save | server.ts /api/validate, /api/save |
| allowedTabsFromRole | admin-editor/public/app.js | Returns allowed tab IDs by role | applyAuthUI, init, switchTab |

---

## 5. Risks & Inconsistencies (Pre-Refactor)

### Duplicated / divergent logic

- **Quick action IDs vs UI labels:** content_table in UI uses 'copy-table', 'view-table', 'generate-new-table' for post-scan actions; manifest only has 'generate-table'. Copy/view/send-to-confluence are UI-only and not in manifest quickActions; they are handled in ui.tsx handleQuickAction. If ACE adds a quick action with id 'copy-table' for another assistant, could collide.
- **main.ts explicit (assistantId, actionId) branches:** design_critique+temp-place-forced-action-card, content_table+generate-table, analytics_tagging+get-analytics-tags|copy-table|new-session are duplicated both as getHandler(...) then if (assistantId === … && actionId === …) block. Handler.handleResponse is still invoked; the explicit block only builds handlerContext and calls handler first. So “pre-LLM” tool handlers are reached both via explicit branch and via generic handler path later for LLM quick actions—but the explicit branch returns after handleResponse(handled). So no double execution; duplication is only in building context and early return.
- **Code2Design:** send-json and get-json in main are early return (no-op or placeholder); actual send-json is UI modal → RUN_TOOL CREATE_FROM_TEMPLATE_JSON; get-json is UI → RUN_TOOL EXPORT_SELECTION_TO_TEMPLATE_JSON. Quick action IDs in manifest are send-json, get-json, json-format-help. Consistent; but main.ts does not delegate to a Code2Design “handler” for send/get.

### Dead / optional code

- **StubProvider / ClaudeProvider / CopilotProvider:** Used when no Internal API and no Proxy (providerId fallback). If all deployments use Internal API or Proxy, stub/claude/copilot paths are dead in practice.
- **content_table “copy-table” in main:** analytics_tagging has actionId 'copy-table'; content_table’s copy is UI-only (id handled in UI). So RUN_QUICK_ACTION('copy-table', 'content_table') is never emitted; only analytics_tagging copy-table goes to main and is handled by AnalyticsTaggingHandler.

### Schema / config mismatches

- **assistants.manifest.json vs ACE:** ACE loads model from repo (config + assistantsManifest + customKnowledge paths). ACE saves to custom/assistants.manifest.json. Plugin builds ASSISTANTS from assistants.generated.ts (from same manifest). So ACE and plugin share the same file; no schema split. ACE schema (admin-editor/src/schema.ts) has quickActionSchema with id, label, templateMessage, requiresSelection, etc.; generate-assistants-from-manifest.ts validates id, label, templateMessage, optional requiresSelection, requiresVision, maxImages, imageScale. Tag variant in schema allows 'new'|'beta'|'alpha'; manifest and generated use same.
- **customConfig.ui.advancedModeIds vs ADVANCED_DESIGN_ORDER:** Plugin index.ts ADVANCED_DESIGN_ORDER is hardcoded; if ACE sets advancedModeIds, plugin uses that order; if not set, plugin uses ADVANCED_DESIGN_ORDER. So order can differ between ACE “Assistants” tab order and plugin “Advanced” list when advancedModeIds is not set.

### Special cases / assumptions

- **Design Critique:** Only assistant with prepareMessages that injects system/tool/deceptive prompts. Assumes last user message content to detect “deceptive review” and “design system query”. Internal API compatibility: prepends to user message when system is filtered.
- **Content Table:** Only “tool” that runs entirely in handler (no LLM). Single selection required; validated in handler.
- **Analytics Tagging:** get-analytics-tags, copy-table, new-session are tool-only (no LLM); export-screenshots is UI-driven (directory picker + EXPORT_ANALYTICS_TAGGING_SCREENSHOTS). Session in clientStorage; schema has screenId, actionId, etc.
- **Design Workshop / Discovery:** Expect strict JSON output; handlers parse and place artifacts. If model returns prose + JSON, parsing can fail; recovery is handler-specific.
- **Assumption “all assistants share same provider”:** One currentProvider per main thread; no per-assistant provider. So Internal API vs Proxy is global.

### Areas not fully verified

- **RUN_TOOL:** Confirmed: main.ts `on('RUN_TOOL')` resolves tool via a tools registry (e.g. getTools); CREATE_FROM_TEMPLATE_JSON and EXPORT_SELECTION_TO_TEMPLATE_JSON are implemented in **src/core/tools/jsonTools.ts** and invoked from that registry. UI emits RUN_TOOL for code2design send-json (CREATE_FROM_TEMPLATE_JSON) and get-json (EXPORT_SELECTION_TO_TEMPLATE_JSON); main runs tool and posts result via sendAssistantMessage.
- **Exact order of applySafetyAssertions vs Tier 2/3 in recovery.ts:** Pipeline is assembleSegments → sanitizeSegments → applyBudgets → buildMessages → applySafetyAssertions (promptPipeline.ts); recovery uses preparePayloadTier2, preparePayloadTier3, detectSensitivePatterns, mergeSignals, buildScreenChunksFromSelectionSummaryString, formatScreenIndex (contentSafety/prepare.ts). Full Tier 2/3 retry flow and diagnostics emission were not re-verified line-by-line.
- **ACE “Assistants” tab:** Which fields are editable (quickActions array, promptTemplate, etc.) and how they map to schema and to plugin runtime (e.g. promptTemplate length limits) were not re-verified in app.js.

---

## 6. Invariants to Freeze Before Refactor (Recommendation)

These are the smallest set of invariants to fix or freeze so a refactor does not break behavior or duplicate work.

1. **Single source of assistant list and quick actions:** Manifest is **custom/assistants.manifest.json**. Generator is **scripts/generate-assistants-from-manifest.ts** → **src/assistants/assistants.generated.ts**. Runtime **ASSISTANTS** is built only in **src/assistants/index.ts** (mergeKnowledgeBase + appendDesignSystemKnowledge). Freeze: no second source of assistant or quick action definitions (e.g. no hardcoded list in main or UI that bypasses manifest).

2. **Handler contract:** Handlers are identified by (assistantId, actionId) via **getHandler**; **canHandle(assistantId, actionId)** must be the only predicate. Freeze: remove duplicate explicit branches in main.ts that check (assistantId === 'x' && actionId === 'y') and instead rely on getHandler and a single “if (handler) { build context; handleResponse; if (handled) return }” path for all “pre-LLM” tool actions.

3. **Quick action ID namespace:** Content Table “copy-table” / “view-table” are UI-only (no manifest quick action). Analytics Tagging has manifest quick action id “copy-table”. Freeze: either rename one set (e.g. content_table → “copy-content-table”) or document that same id in different assistants is allowed and dispatch is always (assistantId, actionId).

4. **Provider selection:** Single path **getEffectiveSettings() → createProvider()**. Freeze: no per-assistant or per-request override of provider unless explicitly added and documented.

5. **Selection context contract:** **buildSelectionContext** is the only producer of selection + selectionSummary + images for sendChatWithRecovery. Images only when quickAction.requiresVision and provider.supportsImages. Freeze: no ad-hoc selection summary or image build in main or handlers; pass quickAction into buildSelectionContext for quick actions.

6. **Prompt assembly:** **sendChatWithRecovery** uses **assembleSegments → sanitize → applyBudgets → buildMessages → applySafetyAssertions** (and Tier 2/3 on failure). Freeze: no second code path that builds messages for provider without going through this pipeline (e.g. no raw prompt concatenation in provider that bypasses budgets/safety).

7. **ACE ↔ plugin consistency:** ACE saves **custom/assistants.manifest.json** and **custom/config.json**. Plugin build runs **generate-assistants** (prebuild) and **generate-custom-overlay** (prebuild). Freeze: plugin never reads assistants.manifest.json or config.json at runtime; only generated TS. So “always run npm run build after ACE save” is the intended contract until/unless runtime fetch is added.

8. **Mode and visibility:** Assistant visibility and order come from **customConfig.ui** (simpleModeIds, advancedModeIds, contentMvpAssistantId). Defaults in **src/assistants/index.ts** (DEFAULT_SIMPLE_MODE_IDS, etc.). Freeze: one place that defines default mode IDs and order (either all in config with schema defaults, or all in code with config override only).

Document version: 1.0. Audit scope: plugin + ACE; assistants, quick actions, handlers, context, providers, config, storage. No refactor implemented; invariants are recommendations only.
