# Assistants Architecture Audit — Verified (Pre-Refactor)

**Reference:** `docs/ARCHITECTURE_AUDIT_ASSISTANTS.md`  
**Goal:** Implementation-grounded map of the Assistants system (plugin + ACE) to safely refactor Categories A (runtime contract), B (assistant config standardization), C (KB normalization).  
**Constraints:** Audit-only. No refactors, no behavior/naming/routing/schema changes.

---

## A) Frozen Runtime Contract (~1 page)

### Inputs

| Input | Source | Type / Notes |
|-------|--------|--------------|
| `assistantId` | UI (current assistant) or message payload | string; from `ASSISTANTS` (manifest) |
| `actionId` | Quick action click (undefined for chat) | string \| undefined |
| User message | Chat input or `action.templateMessage` | string |
| Selection | `figma.currentPage.selection` → `selectionOrder` (main.ts) | string[] (node IDs) |
| `selectionSummary` | `buildSelectionContext()` → `formatSelectionSummary(extractSelectionSummary())` | string \| undefined |
| Images | `buildSelectionContext()` when `quickAction?.requiresVision && provider.capabilities.supportsImages` | ImageData[] \| undefined |
| Settings | `getEffectiveSettings()` → config overrides then clientStorage | Settings |

**Evidence:**  
- Selection: `main.ts` uses `selectionOrder` (synced from `figma.currentPage.selection`).  
- Context: `src/core/context/selectionContext.ts` lines 46–102 `buildSelectionContext()`; images only when `needsVision && providerSupportsImages && selection.hasSelection` (lines 61–64).  
- Settings: `src/core/settings.ts` lines 98–126 `getEffectiveSettings()`; `src/custom/config.ts` `getLlmProvider()`, `getCustomLlmEndpoint()`, `getConfigProxySettings()`.

### Pipeline steps (file/function pointers)

1. **Resolve assistant & action**  
   `getAssistant(assistantId)` → `src/assistants/index.ts` line 41.  
   Action: `assistant.quickActions.find(a => a.id === actionId)` (main.ts RUN_QUICK_ACTION).

2. **Handler lookup**  
   `getHandler(assistantId, actionId)` → `src/core/assistants/handlers/index.ts` line 29; returns first handler where `canHandle(assistantId, actionId)` is true.

3. **Selection context**  
   `buildSelectionContext({ selectionOrder, quickAction, provider })` → `src/core/context/selectionContext.ts` lines 46–102.  
   Produces: `selection` (SelectionState), `selectionSummary?`, `images?` (only when vision + provider supports images).

4. **Message assembly**  
   Chat: `getCurrentAssistantSegment(messageHistory, currentAssistant.id)` then `normalizeMessages`; optional `handler.prepareMessages(finalChatMessages)` (main.ts 565–570).  
   Quick action: user message = `action.templateMessage`; optional `handler.prepareMessages(chatMessages)` (main.ts 834–846).  
   Preamble: when Internal API and first user message in segment, prepend `SESSION_HEADER_SAFE` + assistant context (main.ts 539–561, 904–923).

5. **Prompt pipeline (all LLM requests)**  
   `sendChatWithRecovery(provider, request, options)` → `src/core/contentSafety/recovery.ts` lines 128–265.  
   Tier 1: `assembleSegments` → `sanitizeSegments` → `applyBudgets` → `buildMessages` → `applySafetyAssertions` (promptPipeline.ts); then `getSafetyToggles()` applied to payload (recovery.ts 152–157).  
   On CONTENT_FILTER: one minimal-payload retry; then Tier 2 `preparePayloadTier2`; then Tier 3 `preparePayloadTier3` (screen index).  
   **Evidence:** recovery.ts 142–157 (Tier 1), 188–224 (minimal fallback), 230–239 (Tier 2), 242–264 (Tier 3).

6. **Provider send**  
   `provider.sendChat(payload)` after `prepareRequest(request, provider.capabilities)` in provider (normalize.ts).  
   Provider selection: `createProvider()` → `src/core/provider/providerFactory.ts` lines 44–70: Internal API first, else Proxy, else providerId fallback.

7. **Response handling**  
   If `handler`: `handler.handleResponse(handlerContext)`; if `result.handled`, replace status and return.  
   Else: `replaceStatusMessage(requestId, response)`.  
   **Evidence:** main.ts SEND_MESSAGE 605–630; RUN_QUICK_ACTION 901–924 (LLM path) and 699–809 (pre-LLM handler branches).

### Outputs

| Output | Where | Evidence |
|--------|--------|----------|
| Rendered message in chat | UI (message list from ASSISTANT_MESSAGE / status updates) | main.ts `replaceStatusMessage`, `sendAssistantMessage` |
| Artifacts placed on canvas | Handlers (scorecard, table, screens, discovery, demo cards) | e.g. designCritique handler, contentTable handler, designWorkshop, discovery, analyticsTagging |
| Tool results | RUN_TOOL → `routeToolCall` → `sendAssistantMessage` with result | main.ts 1081–1098; jsonTools.ts CREATE_FROM_TEMPLATE_JSON, EXPORT_SELECTION_TO_TEMPLATE_JSON |
| State written | clientStorage (settings, analytics session); in-memory messageHistory | settings.ts SETTINGS_KEY; analyticsTagging/storage.ts; main.ts messageHistory array |

### Where state lives

| State | Location | Evidence |
|-------|----------|----------|
| Message history | In-memory (main thread) | main.ts `messageHistory` array |
| Settings | clientStorage key `figmai_settings` | settings.ts SETTINGS_KEY |
| Analytics tagging session | clientStorage (key from storage.ts) | src/core/analyticsTagging/storage.ts loadSession/saveSession |
| Mode | localStorage `figmai-mode` (UI) | settings.ts deprecation comment; UI init |
| Assistant list & prompts | Generated TS at build time (no runtime JSON) | assistants.generated.ts, customConfig.ts; see § D and § 4 |

### Helper contracts (summary)

- **BuildSelectionContext** (`src/core/context/selectionContext.ts` 46–102): Inputs `selectionOrder`, `quickAction?`, `provider`. Outputs `selection` (SelectionState), `selectionSummary?` when hasSelection, `images?` only when `quickAction?.requiresVision === true` and `provider.capabilities.supportsImages` and `selection.hasSelection`; respects `quickAction.maxImages` / `imageScale` and provider `maxImages`. Image export failure does not block request (summary only).
- **Prompt pipeline** (`src/core/llm/promptPipeline.ts`): Segment types sys/asst/user/ctx/logs/images. Budgets: DEFAULT_BUDGETS (total 40k, sys/asst/user/ctx/logs caps, imagesBytes 0) or ALLOW_IMAGES_BUDGETS (imagesBytes 100k, maxImages 2). Order: assembleSegments → sanitizeSegments → applyBudgets → buildMessages → applySafetyAssertions. Safety: getSafetyToggles() applied in recovery (forceNoKbName, forceNoSelectionSummary, forceNoImages).
- **Handler contract** (`src/core/assistants/handlers/base.ts`): `canHandle(assistantId, actionId)` → boolean; `prepareMessages?(messages)` → messages or undefined; `handleResponse(context)` → Promise<{ handled, message? }>. main.ts calls getHandler(assistantId, actionId) then, for chat or after LLM, handler.handleResponse(handlerContext); for pre-LLM tool actions, main builds handlerContext and calls handler.handleResponse then returns if handled.

---

## B) Sequence diagrams

### 1) Standard chat send

```text
User          UI (ui.tsx)        Main (main.ts)              buildSelectionContext    getHandler    sendChatWithRecovery    Provider    Handler
  |                |                     |                            |                    |                  |                    |            |
  |-- type msg -->|                     |                            |                    |                  |                    |            |
  |-- Send ------->|                     |                            |                    |                  |                    |            |
  |                |-- SEND_MESSAGE ----->|                           |                    |                  |                    |            |
  |                |   (message, inclSel) |                           |                    |                  |                    |            |
  |                |                     |-- sendStatusMessage()      |                    |                  |                    |            |
  |                |                     |-- getAssistant()           |                    |                  |                    |            |
  |                |                     |-- includeSelection? ------->| buildSelectionContext()               |                    |            |
  |                |                     |<-- selection, summary?, images?               |                  |                    |            |
  |                |                     |-- getCurrentAssistantSegment(), normalizeMessages |                  |                    |            |
  |                |                     |-- getHandler(id, undefined) ------------------>|                  |                    |            |
  |                |                     |-- handler.prepareMessages?(finalChatMessages)   |                  |                    |            |
  |                |                     |-- sendChatWithRecovery(provider, {messages, ...}) ------------------>|                    |            |
  |                |                     |                            |                    |  assembleSegments |                    |            |
  |                |                     |                            |                    |  sanitizeSegments |                    |            |
  |                |                     |                            |                    |  applyBudgets    |                    |            |
  |                |                     |                            |                    |  buildMessages   |                    |            |
  |                |                     |                            |                    |  applySafetyAssertions |             |            |
  |                |                     |                            |                    |  provider.sendChat(payload) ---------->|            |
  |                |                     |                            |                    |                  |<-- response ------|            |
  |                |                     |<-- recoveryResult -----------|                    |                  |                    |            |
  |                |                     |-- handler.handleResponse?(ctx) ------------------------------------------------>|            |
  |                |                     |   else replaceStatusMessage(requestId, response)                                 |            |
  |                |                     |-- postMessage ASSISTANT_MESSAGE / status update -->|                            |            |
  |                |<-- message/status --|                     |                            |                    |                    |            |
```

**Entry:** `handleSend` → `emit('SEND_MESSAGE', message, includeSelection)` (ui.tsx).  
**Main:** `on('SEND_MESSAGE')` (main.ts): requestId, currentAssistant, selectionContext when includeSelection, finalChatMessages, handler.prepareMessages, sendChatWithRecovery, handler.handleResponse or replaceStatusMessage.

### 2) Quick Action (LLM-backed)

```text
User          UI                 Main                       getHandler    buildSelectionContext    sendChatWithRecovery    Provider    Handler
  |            |                  |                             |                    |                      |                    |            |
  |-- click QA ->|                 |                             |                    |                      |                    |            |
  |            |-- (UI-only branches: copy-ref-image, content_table copy/view/send, code2design send/get, analytics export-screenshots)  |
  |            |-- RUN_QUICK_ACTION(actionId, assistantId) ------>|                             |                      |                    |            |
  |            |                  |-- getAssistant(), action    |                             |                      |                    |            |
  |            |                  |-- getHandler(assistantId, actionId) ->|                    |                      |                    |            |
  |            |                  |   (no pre-LLM branch for this action)  |                    |                      |                    |            |
  |            |                  |-- requiresSelection/requiresVision checks              |                      |                    |            |
  |            |                  |-- push user message (templateMessage), sendStatusMessage |                      |                    |            |
  |            |                  |-- buildSelectionContext(selectionOrder, action, provider) ->|                      |                    |            |
  |            |                  |-- handler.prepareMessages?(chatMessages)                  |                      |                    |            |
  |            |                  |-- sendChatWithRecovery(provider, {messages, selectionSummary, images, ...}) -------->|                    |            |
  |            |                  |                                                          | provider.sendChat   |            |
  |            |                  |<-- recoveryResult -----------------------------------------------------------------|                    |            |
  |            |                  |-- handler.handleResponse(ctx) ------------------------------------------------------------------>|            |
  |            |                  |   or replaceStatusMessage(requestId, response)                                          |            |
  |            |<-- ASSISTANT_MESSAGE / status ------------------|                             |                      |                    |            |
```

**Entry:** `handleQuickAction(actionId)` → after UI-only and selection/vision checks, `emit('RUN_QUICK_ACTION', actionId, assistant.id)` (ui.tsx 1244).  
**Main:** No pre-LLM branch for this (assistantId, actionId); user message from templateMessage; buildSelectionContext with `quickAction: action`; sendChatWithRecovery; handler.handleResponse or replaceStatusMessage (main.ts 858–924).

### 3) Quick Action (tool-only, no LLM)

```text
User          UI                 Main                       getHandler    Handler.handleResponse
  |            |                  |                             |                    |
  |-- click QA ->|                 |                             |                    |
  |            |-- RUN_QUICK_ACTION(actionId, assistantId) ------>|                    |
  |            |                  |-- getHandler(assistantId, actionId) ->|            |
  |            |                  |   if (assistantId === 'design_critique' && actionId === 'temp-place-forced-action-card') |
  |            |                  |     build handlerContext, handler.handleResponse(context) ------------------>|
  |            |                  |     if (result.handled) return                                                      |
  |            |                  |   if (assistantId === 'content_table' && actionId === 'generate-table')     |
  |            |                  |     build handlerContext, handler.handleResponse(context) ------------------>|
  |            |                  |     if (result.handled) return                                                      |
  |            |                  |   if (assistantId === 'analytics_tagging' && (get-analytics-tags|copy-table|new-session)) |
  |            |                  |     build handlerContext, handler.handleResponse(context) ------------------>|
  |            |                  |     if (result.handled) return                                                      |
  |            |                  | (no provider.sendChat)        |                    |
  |            |<-- status/result |<-- replaceStatusMessage ------|                    |
```

**Evidence:** main.ts lines 699–809: three explicit `if (assistantId === ... && actionId === ...)` blocks; each builds `handlerContext`, calls `handler.handleResponse(handlerContext)`, returns if `result.handled`. Content Table: ContentTableHandler runs scanner (no LLM). Analytics: get-analytics-tags, copy-table, new-session run in handler only.

### 4) Settings load + provider selection

```text
UI                    Main                     getEffectiveSettings    createProvider    Provider
  |                      |                             |                     |               |
  |-- REQUEST_SETTINGS ->|                             |                     |               |
  |                      |-- getEffectiveSettings() ---->|                     |               |
  |                      |   getSettings() (clientStorage)                     |               |
  |                      |   getLlmProvider() (customConfig)                   |               |
  |                      |   if internal-api: getCustomLlmEndpoint()           |               |
  |                      |   if proxy: getConfigProxySettings()                |               |
  |                      |<-- Settings ------------------|                     |               |
  |                      |-- createProvider()? ------------------------------>|               |
  |                      |   getEffectiveSettings()      |                     |               |
  |                      |   if connectionType==='internal-api' && internalApiUrl -> InternalApiProvider
  |                      |   else if proxyBaseUrl || connectionType proxy/undefined -> ProxyProvider
  |                      |   else providerId fallback (openai/claude/copilot/stub)               |
  |                      |<-- Provider ------------------|                     |               |
  |<-- SETTINGS_RESPONSE-|                             |                     |               |
```

**Evidence:** main.ts `on('REQUEST_SETTINGS')` → `getEffectiveSettings()` → postMessage SETTINGS_RESPONSE. providerFactory.ts lines 44–70: Internal API first, then Proxy, then fallback. settings.ts lines 98–126: config (getLlmProvider) overrides clientStorage.

---

## C) File/module responsibility map

| Module / path | Responsibility | Key exports / entry |
|---------------|----------------|---------------------|
| **Plugin UI** | | |
| `src/ui.tsx` | Chat input, assistant selector, quick action buttons, mode (simple/advanced/content-mvp), message list, scorecard/table/artifact display, settings modal, UI-only quick actions (copy-ref-image, content_table copy/view/send, code2design send/get modal, analytics export-screenshots) | handleSend, handleQuickAction, contentTableQuickActions (lines 2118–2156) |
| `src/ui/components/*.tsx` | Reusable UI pieces (modals, panels, etc.) | — |
| **Main thread** | | |
| `src/main.ts` | Message routing; SEND_MESSAGE & RUN_QUICK_ACTION; handler lookup; selection sync; provider creation; buildSelectionContext; sendChatWithRecovery; replaceStatusMessage; REQUEST_SETTINGS; RUN_TOOL | on('SEND_MESSAGE'), on('RUN_QUICK_ACTION'), on('RUN_TOOL'), on('REQUEST_SETTINGS') |
| **Handlers** | | |
| `src/core/assistants/handlers/index.ts` | Registry: ContentTableHandler, DesignCritiqueHandler, DesignWorkshopHandler, DiscoveryCopilotHandler, AnalyticsTaggingHandler; getHandler(assistantId, actionId) | getHandler, getAllHandlers |
| `src/core/assistants/handlers/contentTable.ts` | canHandle(content_table, generate-table); handleResponse: scan, normalize, validate ContentTableV1, postMessage CONTENT_TABLE_GENERATED | — |
| `src/core/assistants/handlers/designCritique.ts` | canHandle(design_critique, give-critique|deceptive-review|temp-place-forced-action-card); prepareMessages (tool/DS/deceptive); handleResponse: parse JSON, place scorecard/deceptive/demo cards | — |
| `src/core/assistants/handlers/designWorkshop.ts` | canHandle(design_workshop, generate-screens); prepareMessages; handleResponse: parse designScreens JSON, place screens | — |
| `src/core/assistants/handlers/discovery.ts` | canHandle(discovery_copilot, start-discovery); handleResponse: parse discovery JSON | — |
| `src/core/assistants/handlers/analyticsTagging.ts` | canHandle(analytics_tagging, get-analytics-tags|copy-table|new-session); handleResponse: scan ScreenID/ActionID, load/save session, postMessage ANALYTICS_TAGGING_SESSION_UPDATED | — |
| **Providers** | | |
| `src/core/provider/providerFactory.ts` | createProvider(): Internal API → Proxy → providerId fallback | createProvider, getActiveConnectionType |
| `src/core/provider/internalApiProvider.ts`, `proxyProvider.ts` | sendChat, prepareRequest (normalize.ts) | — |
| `src/core/provider/normalize.ts` | normalizeMessages, normalizeImageData, prepareRequest | — |
| **Config** | | |
| `src/custom/config.ts` | getCustomConfig, getLlmProvider, getCustomLlmEndpoint, getConfigProxySettings, getHideInternalApiSettings, getHideProxySettings, etc. | All read from customConfig (generated) |
| `src/custom/generated/customConfig.ts` | Generated from custom/config.json (generate-custom-overlay) | customConfig |
| **Assistants** | | |
| `src/assistants/index.ts` | Build ASSISTANTS from ASSISTANTS_MANIFEST + mergeKnowledgeBase + appendDesignSystemKnowledge; listAssistantsByMode, getAssistant, getDefaultAssistant; mode defaults (DEFAULT_SIMPLE_MODE_IDS, ADVANCED_DESIGN_ORDER) | ASSISTANTS, getAssistant, listAssistantsByMode |
| `src/assistants/assistants.generated.ts` | Generated from custom/assistants.manifest.json (generate-assistants) | ASSISTANTS_MANIFEST |
| **KB merge** | | |
| `src/custom/knowledge.ts` | mergeKnowledgeBase(assistantId, promptTemplate), appendDesignSystemKnowledge(content) | Called from assistants/index.ts when building ASSISTANTS |
| `src/custom/generated/customKnowledge.ts` | Generated custom KB content by assistantId | — |
| **Prompt pipeline** | | |
| `src/core/llm/promptPipeline.ts` | assembleSegments, sanitizeSegments, applyBudgets, buildMessages, applySafetyAssertions, diagnose; DEFAULT_BUDGETS, ALLOW_IMAGES_BUDGETS | — |
| `src/core/contentSafety/recovery.ts` | sendChatWithRecovery: Tier 1 (pipeline + send), minimal fallback, Tier 2, Tier 3 | sendChatWithRecovery |
| `src/core/contentSafety/prepare.ts` | preparePayloadTier2, preparePayloadTier3, detectSensitivePatterns, buildScreenChunksFromSelectionSummaryString, formatScreenIndex | — |
| **Context** | | |
| `src/core/context/selectionContext.ts` | buildSelectionContext(selectionOrder, quickAction?, provider) → SelectionContext | buildSelectionContext |
| `src/core/context/selectionSummary.ts` | extractSelectionSummary, formatSelectionSummary | — |
| `src/core/context/selection.ts` | summarizeSelection(selectionOrder) → SelectionState | — |
| **Settings** | | |
| `src/core/settings.ts` | getSettings (clientStorage), getEffectiveSettings (config overrides), saveSettings, clearSettings | getEffectiveSettings |
| **ACE** | | |
| `figmai_plugin/admin-editor/src/model.ts` | loadModel(repoRoot): read custom/config.json, custom/assistants.manifest.json, custom/knowledge/*.md, design-systems registries; return AdminEditableModel + ModelMeta | loadModel |
| `figmai_plugin/admin-editor/src/save.ts` | saveModel: validate, backup, write config.json, assistants.manifest.json, custom/knowledge, content-models, registries; run GENERATOR_SCRIPTS (generate-assistants, generate-custom-overlay, generate-presets) | saveModel |
| `figmai_plugin/admin-editor/src/schema.ts` | configSchema, assistantsManifestSchema (quickActionSchema, tagSchema, assistantEntrySchema), validateModel | — |
| `figmai_plugin/admin-editor/server.ts` | GET /api/model (loadModel), POST /api/save (saveModel), auth, RBAC | — |
| `figmai_plugin/admin-editor/public/app.js` | ACE UI: tabs (General, AI, Assistants, Knowledge, …), edit assistants manifest (quickActions, promptTemplate, etc.), save model | — |

---

## D) Assistant inventory + Quick Action classification

Source: **custom/assistants.manifest.json** → **scripts/generate-assistants-from-manifest.ts** → **src/assistants/assistants.generated.ts**. Runtime: **src/assistants/index.ts** builds ASSISTANTS with mergeKnowledgeBase + appendDesignSystemKnowledge.

**Classification:**  
- **a) UI-only:** Handled entirely in ui.tsx handleQuickAction; never RUN_QUICK_ACTION to main (or only to show modal / run RUN_TOOL).  
- **b) Tool-only / pre-LLM:** main.ts explicit branch or getHandler; handler.handleResponse runs without provider.sendChat.  
- **c) LLM-backed:** main builds context, sendChatWithRecovery, then optional handler.handleResponse for parse/render.  
- **d) Special-cased in main.ts:** Explicit (assistantId, actionId) block (e.g. code2design send-json/get-json return; json-format-help canned message).

| Assistant ID | Modes | Quick action ID | In manifest? | Classification | Notes |
|--------------|-------|-----------------|-------------|-----------------|------|
| general | simple, advanced | explain | Yes | c) LLM-backed | |
| general | | suggestions | Yes | c) LLM-backed | |
| content_table | simple, advanced | generate-table | Yes | b) Tool-only | main.ts branch + ContentTableHandler; no LLM. |
| content_table | | send-to-confluence | No (UI list) | a) UI-only | contentTableQuickActions; handleQuickAction. |
| content_table | | copy-table | No | a) UI-only | Same. |
| content_table | | view-table | No | a) UI-only | Same. |
| content_table | | copy-ref-image | No | a) UI-only | Same; handleCopyRefImage(). |
| content_table | | generate-new-table | No | a) UI-only | Clears table; may set actionId='generate-table' and emit RUN_QUICK_ACTION. |
| ux_copy_review | advanced | review-copy, tone-check, content-suggestions | Yes | c) LLM-backed | |
| design_critique | simple, advanced | give-critique | Yes | c) LLM-backed | Handler prepareMessages + handleResponse (parse scorecard). |
| design_critique | | deceptive-review | Yes | c) LLM-backed | Handler parse deceptive report. |
| design_critique | | temp-place-forced-action-card | Yes | b) Tool-only | main.ts branch; handler places demo cards. |
| code2design | advanced | send-json | Yes | d) + a) | main: return (no-op). UI: modal → RUN_TOOL CREATE_FROM_TEMPLATE_JSON. |
| code2design | | get-json | Yes | d) + a) | main: return. UI: RUN_TOOL EXPORT_SELECTION_TO_TEMPLATE_JSON. |
| code2design | | json-format-help | Yes | d) | main: replaceStatusMessage(canned help), return. |
| dev_handoff | advanced | generate-specs, export-measurements, component-details | Yes | c) LLM-backed | |
| accessibility | advanced | check-a11y, wcag-compliance, contrast-analysis | Yes | c) LLM-backed | |
| errors | advanced | find-errors, check-consistency | Yes | c) LLM-backed | |
| design_workshop | simple, advanced | generate-screens | Yes | c) LLM-backed | Handler parse designScreens JSON, place screens. |
| discovery_copilot | advanced | start-discovery | Yes | c) LLM-backed | Handler parse discovery JSON. |
| analytics_tagging | advanced | get-analytics-tags | Yes | b) Tool-only | main.ts branch + AnalyticsTaggingHandler. |
| analytics_tagging | | copy-table | Yes | b) Tool-only | Same. |
| analytics_tagging | | new-session | Yes | b) Tool-only | Same. |
| analytics_tagging | | export-screenshots | No | a) UI-only | handleQuickAction → directory picker + EXPORT_ANALYTICS_TAGGING_SCREENSHOTS. |

**Collision note:** actionId `copy-table` appears for content_table (UI-only) and analytics_tagging (manifest + main). Dispatch is always (assistantId, actionId); no runtime collision because content_table copy-table never sends RUN_QUICK_ACTION.

---

## E) Special-cases & divergence list (main.ts branches, UI-only, collisions)

### Every place main.ts branches by (assistantId, actionId)

| File | Line range | Condition | Behavior |
|------|------------|-----------|----------|
| main.ts | 704–743 | `assistantId === 'design_critique' && actionId === 'temp-place-forced-action-card'` | Push user message, sendStatusMessage, build handlerContext, handler.handleResponse; return if handled. |
| main.ts | 745–775 | `assistantId === 'content_table' && actionId === 'generate-table'` | Build handlerContext (no LLM), handler.handleResponse; return if handled. |
| main.ts | 777–808 | `assistantId === 'analytics_tagging' && (actionId === 'get-analytics-tags' \|\| actionId === 'copy-table' \|\| actionId === 'new-session')` | Build handlerContext, handler.handleResponse; return if handled. |
| main.ts | 810–864 | `assistantId === 'code2design'` | send-json: return (no-op). get-json: return (no-op). json-format-help: replaceStatusMessage(canned help), return. |

**Evidence:** main.ts 699–864 (exact line numbers from read_file).

### UI-only quick actions (not in manifest)

| assistantId | actionId | Where defined (UI) | Why not in manifest |
|-------------|----------|--------------------|----------------------|
| (any when contentTable) | send-to-confluence | ui.tsx handleQuickAction, contentTableQuickActions | Post-scan export; only relevant after content table exists. |
| content_table | copy-table | ui.tsx 2121, handleQuickAction 1121 | Same: copy table to clipboard after scan. |
| content_table | view-table | ui.tsx 2139, handleQuickAction 1130 | Same: view table in plugin. |
| content_table | copy-ref-image | ui.tsx 2145, handleQuickAction 1109 | Get reference image; UI handles via handleCopyRefImage(). |
| content_table | generate-new-table | ui.tsx 2152, handleQuickAction 1133 | Clears table and then triggers generate-table; may set actionId = 'generate-table' and emit RUN_QUICK_ACTION. |
| code2design | send-json | ui.tsx 1158 | Opens modal; actual create is RUN_TOOL CREATE_FROM_TEMPLATE_JSON. |
| code2design | get-json | ui.tsx 1162 | Emits RUN_TOOL EXPORT_SELECTION_TO_TEMPLATE_JSON; main does not run LLM. |
| analytics_tagging | export-screenshots | Not in manifest quickActions | UI-only: directory picker + EXPORT_ANALYTICS_TAGGING_SCREENSHOTS; never RUN_QUICK_ACTION. |

**Evidence:** custom/assistants.manifest.json has content_table quickActions only `generate-table`; analytics_tagging has `get-analytics-tags`, `copy-table`, `new-session` (no export-screenshots). ui.tsx lines 1105–1235 (handleQuickAction), 2118–2156 (contentTableQuickActions).

### Collisions and dispatch key

- **actionId `copy-table`:** Used by content_table (UI-only, copy table to clipboard) and by analytics_tagging (manifest quick action; main.ts + AnalyticsTaggingHandler copy session table). Dispatch is always `(assistantId, actionId)`; no collision at runtime because content_table copy-table never sends RUN_QUICK_ACTION (handled in UI).
- **Confirmation:** main only receives RUN_QUICK_ACTION(actionId, assistantId); handler lookup is getHandler(assistantId, actionId). So (assistantId, actionId) is the dispatch key everywhere.

### Duplicated / parallel logic

- **main.ts pre-LLM branches vs getHandler:** The three blocks (design_critique+temp-place, content_table+generate-table, analytics_tagging+get\|copy\|new-session) duplicate the “build handlerContext and call handler.handleResponse” pattern. Handler is already found via getHandler; the explicit `if (assistantId === ... && actionId === ...)` is redundant for routing but ensures these actions never go to the LLM path (early return). So duplication is in control flow, not in handler logic.
- **Mode ordering:** `src/assistants/index.ts` ADVANCED_DESIGN_ORDER (lines 56–68) is hardcoded; when customConfig.ui.advancedModeIds is set, plugin uses that order (listAssistantsByMode lines 111–118). When not set, getAdvancedOrderedAssistants() uses ADVANCED_DESIGN_ORDER. ACE “Assistants” tab order is not necessarily the same as plugin “Advanced” list if advancedModeIds is unset.
- **allowedTabs / RBAC:** admin-editor/public/app.js has allowedTabsFromRole (or equivalent); auth-middleware has requireAuth, requireAdmin, requireRole('editor'). Not re-verified line-by-line; same pattern as in reference audit.

---

## F) Risks + refactor guardrails

### Minimum invariants to preserve during refactor

1. **Single source of assistant and quick action definitions**  
   Manifest: `custom/assistants.manifest.json`. Generator: `scripts/generate-assistants-from-manifest.ts` → `src/assistants/assistants.generated.ts`. Runtime list: built only in `src/assistants/index.ts` (mergeKnowledgeBase + appendDesignSystemKnowledge). No second source (e.g. hardcoded assistant list in main or UI that bypasses manifest).

2. **Dispatch key (assistantId, actionId)**  
   All quick action dispatch must use (assistantId, actionId). UI-only actions never emit RUN_QUICK_ACTION for that action; tool-only actions are identified by getHandler(assistantId, actionId) and/or explicit main.ts branches.

3. **buildSelectionContext contract**  
   Selection context for sendChatWithRecovery is produced only by buildSelectionContext. Images only when quickAction?.requiresVision === true and provider.capabilities.supportsImages and selection.hasSelection. No ad-hoc selection summary or image build in main or handlers.

4. **Prompt pipeline single path**  
   All LLM requests go through sendChatWithRecovery → assembleSegments → sanitizeSegments → applyBudgets → buildMessages → applySafetyAssertions (and Tier 2/3 on CONTENT_FILTER). No path that builds messages and calls provider.sendChat without this pipeline.

5. **Provider selection**  
   Single path: getEffectiveSettings() → createProvider(). Precedence: Internal API (connectionType === 'internal-api' && internalApiUrl) → Proxy → providerId fallback. No per-assistant or per-request override unless explicitly added and documented.

6. **Handler contract**  
   Handlers are identified by canHandle(assistantId, actionId). prepareMessages(messages) optional; handleResponse(context) returns { handled, message? }. Main must call handler.handleResponse for the same (assistantId, actionId) that getHandler returns; pre-LLM branches must not double-invoke.

7. **Plugin does not read JSON at runtime**  
   Plugin uses only generated TS: assistants.generated.ts (from assistants.manifest.json), customConfig.ts (from config.json), customKnowledge.ts (from custom/knowledge). No runtime read of custom/assistants.manifest.json or custom/config.json. Exception: API responses (e.g. response.json() in proxy/internalApiProvider) are not “config” files.

8. **ACE save → plugin build**  
   ACE saveModel writes custom/config.json, custom/assistants.manifest.json, custom/knowledge/*.md, then runs generate-assistants, generate-custom-overlay, generate-presets. Plugin runtime reads only generated TS; therefore “run npm run build after ACE save” is the contract unless runtime fetch is introduced.

### Test cases to preserve (by assistant and quick action)

- **general:** Chat with/without selection; quick actions explain, suggestions (with selection).
- **content_table:** generate-table (tool-only, single selection → scanner → CONTENT_TABLE_GENERATED); UI-only send-to-confluence, copy-table, view-table, copy-ref-image, generate-new-table (no RUN_QUICK_ACTION for copy/view/send/ref-image).
- **ux_copy_review:** review-copy, tone-check, content-suggestions (LLM).
- **design_critique:** give-critique (LLM + handler parse scorecard); deceptive-review (LLM + handler parse report); temp-place-forced-action-card (tool-only, handler places demo cards); chat with prepareMessages (tool/DS/deceptive).
- **code2design:** send-json (UI modal → RUN_TOOL CREATE_FROM_TEMPLATE_JSON); get-json (UI → RUN_TOOL EXPORT_SELECTION_TO_TEMPLATE_JSON); json-format-help (canned message in main).
- **dev_handoff, accessibility, errors:** Quick actions LLM-backed; no handler or handler only for chat.
- **design_workshop:** generate-screens (LLM + handler parse designScreens JSON, place screens).
- **discovery_copilot:** start-discovery (LLM + handler parse discovery JSON).
- **analytics_tagging:** get-analytics-tags, copy-table, new-session (tool-only, handler); export-screenshots (UI-only, EXPORT_ANALYTICS_TAGGING_SCREENSHOTS).
- **Settings load:** REQUEST_SETTINGS → getEffectiveSettings → SETTINGS_RESPONSE; provider selection Internal API vs Proxy vs fallback.
- **Content safety:** Tier 1 → CONTENT_FILTER → minimal retry → Tier 2 → Tier 3; diagnostics when enabled.

---

## Corrections and gaps vs reference audit

- **Reference audit:** “content_table in UI uses 'copy-table', 'view-table', 'generate-new-table' for post-scan actions; manifest only has 'generate-table'.” **Verified.** In addition, content_table UI uses a hardcoded `contentTableQuickActions` list (ui.tsx 2118–2156) that includes send-to-confluence, copy-table, view-table, copy-ref-image, generate-new-table; only generate-table is in the manifest and sent to main as RUN_QUICK_ACTION.
- **Reference audit:** “Explicit branches: design_critique+temp-place-forced-action-card; content_table+generate-table; analytics_tagging+get-analytics-tags|copy-table|new-session.” **Verified** with exact line numbers (main.ts 704–808).
- **Reference audit:** “Plugin never reads assistants.manifest.json or config.json at runtime; only generated TS.” **Verified.** No `readFile`/`fetch` of custom/assistants.manifest.json or custom/config.json in plugin src; only generated assistants.generated.ts and customConfig.ts. API response.json() in providers is not config.
- **export-screenshots:** Confirmed not in manifest quickActions; UI-only (handleQuickAction analytics_tagging + export-screenshots → directory picker + EXPORT_ANALYTICS_TAGGING_SCREENSHOTS). Reference audit already stated this.
- **ACE model/save:** Confirmed loadModel reads configPath, manifestPath, customKnowledge paths, designSystemRegistries (admin-editor/src/model.ts 112–120, 59–78, 84–110). saveModel writes those and runs GENERATOR_SCRIPTS ['generate-assistants', 'generate-custom-overlay', 'generate-presets'] (save.ts 143, 191–218).
- **Tier 2/3 order in recovery:** Verified: Tier 1 (pipeline + send); on CONTENT_FILTER, one minimal-payload retry; then Tier 2 preparePayloadTier2 → send; then Tier 3 preparePayloadTier3 → send (recovery.ts 128–265).

---

## Next refactor plan outline (derived from audit only)

- **Category A — Runtime contract**  
  - Document and type the frozen contract (inputs, pipeline steps, outputs, state) as the single reference.  
  - Consider extracting a single “run quick action” path in main that: (1) getHandler(assistantId, actionId), (2) if handler and “tool-only” per handler contract, build context and handler.handleResponse then return; (3) else run LLM path. This would allow removing the duplicated explicit (assistantId, actionId) branches while preserving behavior.

- **Category B — Assistant config standardization**  
  - Unify manifest vs UI-only quick actions: either (a) add UI-only actions to manifest with a flag (e.g. uiOnly: true) so ACE and plugin share one list, or (b) document and centralize UI-only list in one place (e.g. contentTableQuickActions and analytics export-screenshots) and keep manifest as “actions that can hit main”.  
  - Standardize mode ordering: single source for default advanced (and simple) order (config schema default vs code constant) so ACE and plugin agree when advancedModeIds is unset.

- **Category C — KB normalization**  
  - KB merge: mergeKnowledgeBase + appendDesignSystemKnowledge are the only producers of promptMarkdown; promptMarkdown is computed at module load in assistants/index.ts. Normalize policy (append/override) and file paths (config knowledgeBases) so all assistants use the same contract.  
  - Consider documenting or typing “public” vs “custom” KB sources (e.g. promptTemplate + src/assistants/*.md vs custom/knowledge/*.md) and ensuring generate-custom-overlay and ACE custom knowledge paths stay in sync.

No implementation in this audit; the above is a minimal outline derived strictly from the verified map and risks.
