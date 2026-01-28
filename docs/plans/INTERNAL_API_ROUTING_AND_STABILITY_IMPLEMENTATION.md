# Internal API Routing and Stability — Updated Implementation Plan

**Baseline:** Internal API Routing and Stability plan (internal_api_routing_and_stability_ac90a186).  
**Status:** Plan only — no implementation until approved.

---

## Hard requirement (must be explicit)

When Internal API is enabled (settings: `connectionType === 'internal-api'` and `internalApiUrl` is set):

- **All** LLM/chat requests **must** go through **InternalApiProvider only**.
- Any “public mode” routing (proxy, `providerId`-based, external/OpenAI/Azure direct) **must** be automatically disabled/ignored.
- If proxy or other public settings are present at the same time, they **must** be treated as **inactive** for the session.
- When Internal API is active and proxy settings exist, surface a **non-blocking notice**: e.g. “Internal API active; proxy ignored.”

This precedence must be un-bypassable, documented in code, and auditable via privacy-safe logging.

---

## 1. Audit findings — current behavior

### 1.1 Single source of truth for provider selection

- **Location:** [figmai_plugin/src/core/provider/providerFactory.ts](figmai_plugin/src/core/provider/providerFactory.ts).
- **Logic:** `createProvider(providerId?)` calls `getSettings()`, then:
  - If `connectionType === 'internal-api'` **and** `internalApiUrl` → return `InternalApiProvider()` (no use of `providerId`).
  - Else if proxy configured or `connectionType` proxy/undefined → return `ProxyProvider()`.
  - Else switch on `providerId` (openai → ProxyProvider, claude/copilot/stub).
- **Conclusion:** There is a single place that decides provider type. When Internal API is enabled, the factory always returns Internal API; proxy and `providerId` are not used for that branch.

### 1.2 Where provider is used (no bypass found)

- **main.ts:** `currentProvider` is set only via `createProvider(...)` at:
  - Plugin load (`initializeProvider()`),
  - `RESET` (reset handler),
  - `SET_LLM_PROVIDER` (uses `createProvider(providerId)` — when Internal API is on, factory still returns InternalApiProvider),
  - **SAVE_SETTINGS** (right after `saveSettings()`, so provider is reinitialized when user saves),
  - Before send/quick action when `!currentProvider`.
- **Chat:** SEND_MESSAGE → `currentProvider.sendChat(...)`.
- **Quick actions (e.g. Deceptive Review, Give Design Crit):** RUN_QUICK_ACTION → handler receives `context.provider` (same `currentProvider` from main) → `provider.sendChat(...)`.
- **Design Critique / Design Workshop repair:** Use `context.provider.sendChat(...)`; `context.provider` is the same `currentProvider` passed from main.
- **Proxy client:** [figmai_plugin/src/core/proxy/client.ts](figmai_plugin/src/core/proxy/client.ts) is used only by `ProxyProvider`. When the active provider is `InternalApiProvider`, the proxy client is **not** used for chat.

**Conclusion:** No code path was found that deliberately routes to proxy or external when Internal API is enabled. All LLM traffic goes through one provider instance from `createProvider()`.

### 1.3 Edge cases that could cause wrong route

| Edge case | Current behavior | Risk |
|-----------|------------------|------|
| **Stale `currentProvider`** | Refreshed on load, RESET, SET_LLM_PROVIDER, SAVE_SETTINGS, and when `!currentProvider` before send. | Low: after saving Internal API settings, next request uses new provider. If user sends before save completes, old provider could be used once. |
| **Settings race** | `createProvider()` calls `getSettings()` async; if storage is slow or UI posts SAVE_SETTINGS and user sends immediately, `getSettings()` could theoretically return old values. | Low; would be timing-dependent. |
| **TEST_PROXY connection** | Handler in main.ts branches on `options?.connectionType \|\| settings.connectionType`: if `internal-api` → `new InternalApiProvider()` directly; else uses `currentProvider` for proxy test. | Duplicate selection logic: test path does not use `createProvider()`, so precedence is replicated (correct today but not single source of truth). |

### 1.4 Duplicate provider-selection logic

- **TEST_PROXY handler** ([figmai_plugin/src/main.ts](figmai_plugin/src/main.ts) ~1028–1072): Decides “internal-api” vs “proxy” via `testConnectionType` and either instantiates `InternalApiProvider` or uses `currentProvider`. This duplicates the “when do we use Internal API?” rule. **Proposed consolidation:** Use `createProvider(currentProviderId)` (or `createProvider()` with no args) to obtain the provider for the test; then call `testProvider.testConnection(options)`. That way the same precedence applies and there is only one place that “knows” the active connection.

### 1.5 Where instability likely originates

- **Backend → Azure:** Intermittent 400 with “content filtering” is consistent with the **Internal API backend** calling Azure and Azure’s content filter sometimes triggering (e.g. Deceptive Review language: “deceptive”, “manipulate”, “dark pattern”).
- **Plugin:** Single attempt per request in InternalApiProvider; no retry. All 4xx (including 400) are today mapped to a generic NETWORK-style message; content-filter 400 is not distinguished, so no “do not retry” or user-specific message.

---

## 2. Implementation plan (phased, low risk)

### Phase 1 — Make precedence explicit and un-bypassable (safest first)

| Step | What | Files | Why |
|------|------|-------|-----|
| 1.1 | Document the hard rule in the factory: “When Internal API is enabled, **all** LLM requests use InternalApiProvider only; proxy and providerId are ignored.” Add JSDoc and a short inline comment. | [providerFactory.ts](figmai_plugin/src/core/provider/providerFactory.ts) | Single place that encodes the requirement; future readers and audits see it. |
| 1.2 | Add a small helper used only for observability/UI (no branching for creating provider): e.g. `getActiveConnectionType(settings): 'internal-api' \| 'proxy' \| 'none'` using the **same** condition as the factory (Internal API first, then proxy). Call it from factory or from code that logs/shows the notice; do not duplicate the “which provider to create” logic. | [providerFactory.ts](figmai_plugin/src/core/provider/providerFactory.ts) or a tiny helper in same file / [settings.ts](figmai_plugin/src/core/settings.ts) | Enables consistent “active connection” for logging and “proxy ignored” notice. |
| 1.3 | In main.ts SAVE_SETTINGS handler: add a one-line comment that “Provider is reinitialized here so all subsequent requests use the new connection; no other path should serve chat with a stale provider when Internal API is enabled.” | [main.ts](figmai_plugin/src/main.ts) | Documents that refresh is intentional and is the only way to switch mode. |
| 1.4 | Consolidate TEST_PROXY: obtain test provider via `createProvider(currentProviderId)` (or `createProvider()`), then call `testProvider.testConnection(options)`. For Internal API, pass `options?.internalApiUrl` for “test this URL before saving” if needed. Remove the duplicate `if (testConnectionType === 'internal-api')` branch that constructs InternalApiProvider directly. | [main.ts](figmai_plugin/src/main.ts) | Single source of truth for “which provider is active”; test reflects the same provider used for chat. |

**Risks:** Minimal. 1.1–1.3 are comments/helpers; 1.4 is a small behavioral change (test always uses the same provider as chat).  
**Regression watch:** After 1.4, “Test connection” with Internal API selected must still test Internal API (and optional URL override must still work).

---

### Phase 2 — Privacy-safe observability and “proxy ignored” notice

| Step | What | Files | Why |
|------|------|-------|-----|
| 2.1 | **Request observability (privacy-safe):** When about to call `sendChat`, log provider type and target host only (e.g. “internal-api” + host from `internalApiUrl`, or “proxy” + host from `proxyBaseUrl`). Do **not** log full URL, path, query, request body, response body, or any PII. Use existing debug scope or a single logger; no new dependencies. | [internalApiProvider.ts](figmai_plugin/src/core/provider/internalApiProvider.ts) (and optionally [proxyProvider.ts](figmai_plugin/src/core/provider/proxyProvider.ts) / proxy client for symmetry), or a single call in [main.ts](figmai_plugin/src/main.ts) before `sendChat` that logs `currentProvider.id` + safe host | Enables proving “this request used Internal API” and “no request used proxy” when Internal API is on. |
| 2.2 | **Non-blocking notice:** When settings are loaded and `connectionType === 'internal-api'` and `internalApiUrl` is set **and** `proxyBaseUrl` is non-empty, show a short, dismissible or session-scoped notice: “Internal API is active; proxy settings are ignored.” Place near connection-type selector or at top of settings panel. | [ui/components/SettingsModal.tsx](figmai_plugin/src/ui/components/SettingsModal.tsx) | Makes precedence obvious; avoids confusion when both are filled. |

**Risks:** Low. Logging is host-only; notice is non-blocking.  
**Regression watch:** Ensure notice does not block saving or testing; no PII in logs.

---

### Phase 3 — Azure content-filter stability

| Step | What | Files | Why |
|------|------|-------|-----|
| 3.1 | **Content-filter error type:** Add `CONTENT_FILTER = 'content_filter'` to `ProviderErrorType`. In `ProviderError`, treat CONTENT_FILTER as non-retryable (e.g. set `retryable: false` when type is CONTENT_FILTER). | [provider.ts](figmai_plugin/src/core/provider/provider.ts) | Typed error so callers and retry logic can “do not retry” and show a specific message. |
| 3.2 | **Detect content-filter 400 in Internal API provider:** When `response.status === 400`, read response body (text); if it indicates content filtering (e.g. substring “content_filter”, “content filtering”, “content policy”, or known Azure filter code/key), throw `ProviderError` with type `CONTENT_FILTER`, message like “Response was blocked by content policy. Try rephrasing or simplifying the request.” and `retryable: false`. Otherwise keep existing 400 handling (e.g. INVALID_REQUEST or NETWORK, `retryable: false`). | [internalApiProvider.ts](figmai_plugin/src/core/provider/internalApiProvider.ts) | Users get a clear, actionable message; no retry on same prompt. |
| 3.3 | **Do not retry on content-filter:** Any retry/backoff logic (see 3.4) must **not** retry when the error type is CONTENT_FILTER (or status 400 with content-filter body). | [internalApiProvider.ts](figmai_plugin/src/core/provider/internalApiProvider.ts) | Prevents repeated filtered requests. |
| 3.4 | **Optional retry for retryable conditions only:** For Internal API, on 5xx or timeout (and only when error is marked retryable), retry up to 1–2 times with exponential backoff (e.g. 1s, 2s). Do **not** retry on 400, 401, 403, or CONTENT_FILTER. Use existing `ProviderError.retryable` / `isRetryable()` where applicable. | [internalApiProvider.ts](figmai_plugin/src/core/provider/internalApiProvider.ts) | Improves stability for transient backend/network issues without resending filtered requests. |
| 3.5 | **Prompt shaping for Deceptive Review:** In the Dark UX evaluation prompt, soften wording that may trigger Azure’s filter while keeping the same JSON schema and evaluation dimensions. E.g. add framing like “Evaluate for compliance with ethical UX guidelines”; use “patterns that may pressure or confuse users” alongside or instead of only “deceptive”/“manipulate” where it does not change semantics; avoid unnecessary repetition of strong terms. Keep schema and dimension list unchanged. | [designCritique.ts](figmai_plugin/src/core/assistants/handlers/designCritique.ts) (`getDarkUxEvaluationPrompt()`) | Reduces likelihood of content-filter triggers on Deceptive Review runs. |

**Risks:** 3.2 depends on backend/Azure response shape; detection should be conservative (if in doubt, treat as generic 400). 3.5 must not change output structure or meaning of dimensions.  
**Regression watch:** Deceptive Review output schema and dimension set must remain the same; 400s that are not content-filter should still show a sensible message.

---

### Phase 4 — Verification and telemetry (plugin-side only)

| Step | What | Files | Why |
|------|------|-------|-----|
| 4.1 | **Outcome logging (privacy-safe):** Log success vs failure and, on failure, reason category only (e.g. network, timeout, 4xx, content_filter). No prompt/response content or PII. | [internalApiProvider.ts](figmai_plugin/src/core/provider/internalApiProvider.ts) or shared logger used by main | Enables measuring content-filter rate vs other failures over time. |
| 4.2 | Document verification steps and expected UX in this plan (see Section 4 below). | This doc | Repeatable way to confirm routing and stability. |

**Risks:** None if logging stays metadata-only.  
**Regression watch:** No PII or prompt/response in logs.

---

## 3. Exact files to touch (summary)

| File | Changes |
|------|---------|
| [figmai_plugin/src/core/provider/providerFactory.ts](figmai_plugin/src/core/provider/providerFactory.ts) | Document hard precedence (JSDoc + comment); add `getActiveConnectionType(settings)` (or equivalent) for observability/UI only. |
| [figmai_plugin/src/main.ts](figmai_plugin/src/main.ts) | Comment at SAVE_SETTINGS; refactor TEST_PROXY to use `createProvider()` for test provider so precedence is single source of truth. |
| [figmai_plugin/src/core/provider/provider.ts](figmai_plugin/src/core/provider/provider.ts) | Add `ProviderErrorType.CONTENT_FILTER`; ensure CONTENT_FILTER is non-retryable. |
| [figmai_plugin/src/core/provider/internalApiProvider.ts](figmai_plugin/src/core/provider/internalApiProvider.ts) | 400 handling: detect content-filter body → throw CONTENT_FILTER (retryable: false); other 400 → keep or set retryable: false; optional retry loop for 5xx/timeout (1–2 retries); privacy-safe request log (provider + host); optional outcome log (success / failure reason category). |
| [figmai_plugin/src/core/assistants/handlers/designCritique.ts](figmai_plugin/src/core/assistants/handlers/designCritique.ts) | Prompt shaping in `getDarkUxEvaluationPrompt()`: softer framing, same schema and dimensions. |
| [figmai_plugin/src/ui/components/SettingsModal.tsx](figmai_plugin/src/ui/components/SettingsModal.tsx) | When `connectionType === 'internal-api'` and `proxyBaseUrl` is non-empty, show non-blocking notice “Internal API active; proxy ignored.” |

Optional for symmetry: [proxyProvider.ts](figmai_plugin/src/core/provider/proxyProvider.ts) or proxy client — add same style of privacy-safe log (provider + host) when sending chat, if we want one consistent pattern.

---

## 4. Risks and regressions to watch

- **TEST_PROXY refactor (Phase 1.4):** “Test connection” must still test the correct endpoint (Internal API when Internal API is selected; proxy when proxy is selected). If UI passes `options?.internalApiUrl` for “test before save”, that override must still be passed to Internal API provider’s `testConnection`.
- **Content-filter detection (Phase 3.2):** Backend/Azure response format may vary. Prefer conservative heuristics (e.g. a few known substrings); if unclear, treat as generic 400. Avoid depending on exact JSON shape that might change.
- **Deceptive Review prompt (Phase 3.5):** Do not change JSON schema or dimension names/count; only soften instructional wording to reduce filter triggers.
- **Logging:** No full URL, no path/query, no request/response bodies, no PII (constraint already stated).

---

## 5. Minimal rollout order

1. **Phase 1** (documentation + TEST_PROXY consolidation) — lowest risk; no change to chat path except comments.
2. **Phase 2** (observability + notice) — low risk; additive logging and UI notice.
3. **Phase 3** (content-filter handling + optional retry + prompt shaping) — implement 3.1 and 3.2 first (error type + detection), then 3.3 and 3.4 (no retry on filter + retry on retryable), then 3.5 (prompt shaping) so stability improvements are in place before touching prompt text.
4. **Phase 4** (outcome logging + verification doc) — can be done with Phase 2 or 3.

---

## 6. Verification checklist (concrete test steps)

Use this to confirm behavior before and after implementation.

### 6.1 Routing: Internal API only when enabled

- [ ] **Setup:** Set `connectionType` to Internal API and set a valid `internalApiUrl`. Also set `proxyBaseUrl` to a non-empty value (e.g. a proxy URL).
- [ ] **Notice:** Open Settings; confirm non-blocking message appears: “Internal API active; proxy ignored” (or equivalent).
- [ ] **Chat:** Send a chat message. Verify (network tab or backend logs) that **only** the Internal API host receives the request; proxy endpoint receives **no** chat request.
- [ ] **Deceptive Review:** Run Deceptive Review quick action. Again verify only Internal API receives the request; proxy receives none.
- [ ] **Logs:** If request logging is implemented, confirm each request logs provider type `internal-api` and the Internal API host (no proxy, no prompt/response content).

### 6.2 Routing: Test connection uses same precedence

- [ ] With Internal API enabled and proxy URL also set, click “Test connection”. Result should reflect Internal API (success/failure of Internal API), not proxy.
- [ ] With Proxy selected and proxy URL set, click “Test connection”. Result should reflect proxy.

### 6.3 Stability: Content-filter 400

- [ ] **Simulate or trigger:** If possible, trigger a 400 that includes content-filter indication (e.g. from backend or mock). Plugin should show a clear, user-friendly message (e.g. “Response was blocked by content policy…”) and **should not** retry the same request automatically.
- [ ] **Retry:** Trigger a 5xx or timeout; plugin may retry (if Phase 3.4 implemented). Confirm no retry occurs for 400/content-filter.

### 6.4 Stability: Deceptive Review

- [ ] Run Deceptive Review multiple times (e.g. 10–20) on the same design. Record success vs 400 rate. After prompt shaping (Phase 3.5), expect same or lower 400 rate; output schema and dimensions should remain valid and unchanged.

### 6.5 No regressions

- [ ] With **Proxy** selected and proxy URL set, chat and quick actions still use proxy and work as before.
- [ ] Saving settings (Internal API or Proxy) updates behavior on the next request without requiring plugin reload.

---

## 7. Where to observe provider + host logs (post-implementation)

Privacy-safe request logging emits **provider type** and **host** only (no URL path, body, or PII):

- **Debug scope:** `subsystem:provider`
- **Log key:** `request_route`
- **Payload:** `{ provider: 'internal-api' | 'proxy', host: '<host>' }`

**How to see logs:**

1. Enable the `subsystem:provider` debug scope (via your project's debug/config or by enabling debug for that scope in code).
2. Trigger a chat or quick action (e.g. Deceptive Review).
3. In the console (Figma plugin dev tools or browser console for the plugin iframe), look for log lines containing `request_route` and the `provider` + `host` fields.

When Internal API is enabled, every LLM request should show `provider: 'internal-api'` and the host derived from `internalApiUrl`; you should never see `provider: 'proxy'` for chat when Internal API is active.

## 8. Summary

- **Audit:** Provider selection is centralized in `providerFactory.ts`. No code path was found that routes to proxy or external when Internal API is enabled; only edge cases are stale provider or settings race. TEST_PROXY uses `createProvider()` (or tests with an explicit URL override when the UI passes one).
- **Hard requirement:** Enforced by keeping all selection in the factory, documenting it, consolidating TEST_PROXY, and surfacing “Internal API active; proxy ignored” when both are set.
- **Implementation:** Phases 1–3 implemented — (1) document + consolidate test path, (2) observability + notice, (3) content-filter detection + no-retry + retry for retryable only + prompt shaping.
- **Verification:** Use the checklist in Section 6 and the log location in Section 7 to confirm routing and stability.
