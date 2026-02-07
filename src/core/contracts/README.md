# Frozen Runtime Contract

This folder defines the **canonical type-level contract** for the assistants runtime: request envelope, response envelope, and handler contract. It does **not** change any runtime behavior; it documents and types the existing flow.

**Constraints:** Dispatch key `(assistantId, actionId)` and single LLM path `sendChatWithRecovery` → promptPipeline (Tier 1/2/3) are preserved. Plugin consumes only generated TS at runtime (no JSON config reads).

---

## 1. Inputs: SEND_MESSAGE and RUN_QUICK_ACTION

| Source | Where it lives |
|--------|----------------|
| **SEND_MESSAGE** | UI: `handleSend` → `emit('SEND_MESSAGE', message, includeSelection)`. Main: `on('SEND_MESSAGE')` in `src/main.ts`. |
| **RUN_QUICK_ACTION** | UI: `handleQuickAction(actionId)` → after UI-only/selection checks, `emit('RUN_QUICK_ACTION', actionId, assistant.id)`. Main: `on('RUN_QUICK_ACTION', actionId, assistantId)` in `src/main.ts`. |

**Request envelope fields and current sources:**

| Field | SEND_MESSAGE path | RUN_QUICK_ACTION path | File / function |
|-------|--------------------|------------------------|-----------------|
| assistantId | currentAssistant.id (from lastAssistantId) | Payload assistantId | main.ts |
| actionId | undefined | Payload actionId | main.ts |
| requestId | generateRequestId() | generateRequestId() | main.ts |
| messages | getCurrentAssistantSegment(messageHistory, currentAssistant.id) → normalizeMessages; optional handler.prepareMessages | action.templateMessage + segment; optional handler.prepareMessages | main.ts |
| selectionOrder | figma.currentPage.selection (synced to selectionOrder) | Same | main.ts |
| selection, selectionSummary, images | buildSelectionContext({ selectionOrder, quickAction: undefined, provider }) | buildSelectionContext({ selectionOrder, quickAction: action, provider }) | src/core/context/selectionContext.ts |
| providerId, settings | createProvider() uses getEffectiveSettings() | Same | src/core/provider/providerFactory.ts, src/core/settings.ts |
| assistantPreamble | When Internal API + first user message in segment: SESSION_HEADER_SAFE + assistant context | Same for quick action segment | main.ts |
| allowImages | Passed in recovery options when images allowed | From quick action / context | main.ts, recovery.ts |
| safetyToggles | getSafetyToggles() from custom config | Same | custom config (generated) |
| budgets | DEFAULT_BUDGETS or ALLOW_IMAGES_BUDGETS | Same | src/core/llm/promptPipeline.ts |

---

## 2. Selection and images gating (buildSelectionContext)

**File:** `src/core/context/selectionContext.ts` — `buildSelectionContext(options)`.

**Rules:**

- **Selection state:** Always computed via `summarizeSelection(selectionOrder)` (selection.ts). Returned as `context.selection`.
- **Selection summary:** When `selection.hasSelection`, `context.selectionSummary = formatSelectionSummary(await extractSelectionSummary(selectionOrder))`.
- **Images:** Included **only when** all of:
  1. `quickAction?.requiresVision === true`
  2. `provider.capabilities.supportsImages === true`
  3. `selection.hasSelection`
- **Limits:** `quickAction.maxImages ?? 1`, `quickAction.imageScale ?? 2`; provider `capabilities.maxImages` caps the count.
- **Failure:** Image export failure does **not** block the request; context falls back to summary only (no images).

So for **chat** (SEND_MESSAGE), `quickAction` is undefined → images are never attached. For **quick actions**, images are attached only for actions with `requiresVision: true` and only when the provider supports images.

---

## 3. Provider selection

**File:** `src/core/provider/providerFactory.ts` — `createProvider(providerId?)`.

**Precedence:**

1. **Internal API:** `settings.connectionType === 'internal-api' && settings.internalApiUrl` → `InternalApiProvider`.
2. **Proxy:** `settings.proxyBaseUrl` or `connectionType` proxy/undefined → `ProxyProvider`.
3. **Fallback:** By providerId (openai → Proxy, claude/copilot/stub per id).

**Settings source:** `src/core/settings.ts` — `getEffectiveSettings()`. Config (from generated customConfig) overrides clientStorage when `config.llm.provider` is set. So provider selection is global per session, not per-assistant.

---

## 4. Tiers and recovery

**File:** `src/core/contentSafety/recovery.ts` — `sendChatWithRecovery(provider, request, options)`.

**Pipeline (Tier 1):**

1. `assembleSegments(request, { assistantPreamble })` — split messages into sys/asst/user segments.
2. `sanitizeSegments(segments)` — data URLs, base64, long lines, huge JSON; sets diag flags.
3. `applyBudgets(segments, budgets)` — DEFAULT_BUDGETS or ALLOW_IMAGES_BUDGETS (promptPipeline.ts).
4. `buildMessages(segments, request)` — normalized messages for provider.
5. `applySafetyAssertions(request)` — safety transforms.
6. `getSafetyToggles()` applied to payload (forceNoKbName, forceNoSelectionSummary, forceNoImages).
7. `provider.sendChat(payload)`.

**On CONTENT_FILTER:**

- One retry with **minimal payload** (last user content only; no selectionSummary, no images).
- **Tier 2:** `preparePayloadTier2(originalRequest)` (contentSafety/prepare.ts) → send.
- **Tier 3:** `preparePayloadTier3(originalRequest, indexString, ...)` — screen index from selectionSummary string; send. If still CONTENT_FILTER, throw with content-policy message.

All of this is the **single LLM path**; no request goes to the provider without going through this pipeline.

---

## 5. Response and handler contract

**Response envelope** aligns with:

- `SendChatWithRecoveryResult` (recovery.ts): response, tierUsed, recoveredWithRedaction, recoveredWithSummary, diagnostics, fallbackUsed.
- `HandlerResult` (handlers/base.ts): handled, message.
- Handler-driven outcomes: replaceStatusMessage, postMessage (SCORECARD_PLACED, CONTENT_TABLE_GENERATED, etc.), RUN_TOOL result via sendAssistantMessage.

**Handler contract** (re-exported from `src/core/assistants/handlers/base.ts`):

- `canHandle(assistantId, actionId): boolean`
- `prepareMessages?(messages): NormalizedMessage[] | undefined`
- `handleResponse(context: HandlerContext): Promise<HandlerResult>`

Main calls `getHandler(assistantId, actionId)` (handlers/index.ts); if a handler exists, it may call `handler.prepareMessages` before send and `handler.handleResponse` after. Dispatch key is always `(assistantId, actionId)`.

---

## 6. State and boundaries

| State | Location | Read by | Write by |
|-------|----------|---------|----------|
| Message history | In-memory array in main.ts (`messageHistory`) | main (segment, normalize) | main (push user/status, replace status) |
| Settings | clientStorage key `figmai_settings` | getSettings, getEffectiveSettings (settings.ts) | saveSettings (settings.ts), UI save |
| Analytics tagging session | clientStorage (key in analyticsTagging/storage.ts) | AnalyticsTaggingHandler, UI | Handler, UI |
| Mode | localStorage `figmai-mode` | UI init | UI mode switch |
| Assistant list & prompts | Generated TS only (assistants.generated.ts, customConfig.ts, customKnowledge.ts) | assistants/index.ts, config.ts, knowledge.ts | Build only (ACE save → generators). **No runtime JSON reads.** |

**Read boundary:** Request envelope is built in main thread from messageHistory, selectionOrder, getEffectiveSettings(), getAssistant(), getHandler(). No direct read of `custom/assistants.manifest.json` or `custom/config.json` at runtime.

**Write boundary:** Main writes to messageHistory, replaceStatusMessage/sendAssistantMessage (→ UI), figma.ui.postMessage (artifact messages). clientStorage only via saveSettings and analytics tagging storage. Plugin does not write repo files.
