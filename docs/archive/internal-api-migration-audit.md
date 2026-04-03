# FigmAI Internal API Migration — Audit Report and Readiness Plan

**Scope:** Proxy (current) vs Internal API (enterprise endpoint). No behavior changes unless required for parity, risk, or obvious issue.  
**Baseline:** Current proxy flow (config.llm.provider = "proxy", baseUrl + optional sharedToken).

---

## 1. Executive summary

**Safe / already aligned**
- Provider abstraction is clear: [providerFactory](../src/core/provider/providerFactory.ts) selects Proxy vs Internal API by `connectionType` and URL; [provider.ts](../src/core/provider/provider.ts) defines a single `Provider` interface used everywhere.
- Request lifecycle is identical for both: UI → main thread → `sendChatWithRecovery` → `provider.sendChat()` → fetch → response parsing → handler/rendering. No separate code paths that bypass the provider.
- Error types are unified (`ProviderError` / `ProviderErrorType`); both proxy and Internal API map status codes to the same enum (auth, rate limit, timeout, content filter, network).
- Content-safety pipeline (Tier 1/2/3, recovery on CONTENT_FILTER) and safety toggles (forceNoImages, forceNoKbName, forceNoSelectionSummary) apply to both providers; they use the same `sendChatWithRecovery` and config.
- Settings and config: effective settings come from [getEffectiveSettings](../src/core/settings.ts) (config wins when config.llm.provider is set); Internal API URL comes from config.llm.endpoint (or clientStorage fallback). No proxy-specific logic in message state or assistant behavior.

**Risky / must-address for parity**
- **Manifest allowedDomains:** The script [update-manifest-network-access.ts](../scripts/update-manifest-network-access.ts) does **not** add `config.llm.endpoint` or proxy `baseUrl` to `manifest.networkAccess.allowedDomains`. It only adds `networkAccess.baseAllowedDomains`, `networkAccess.extraAllowedDomains`, and (if enabled) `analytics.endpointUrl`. So for Internal API, the **enterprise endpoint origin must be listed in baseAllowedDomains or extraAllowedDomains** or Figma will block all LLM requests. Operational playbook must require adding the Internal API origin to config before switching provider.
- **Internal API response shape:** Internal API expects/returns a different contract (e.g. `type: 'generalChat'`, `message`, `kbName`; response `Prompts[0].ResponseFromAssistant` or `result`). This is already implemented in [internalApiProvider.ts](../src/core/provider/internalApiProvider.ts). Design Critique and other JSON-based assistants rely on this extraction. **Assumption:** If the enterprise API changes response shape (different wrapper or field names), parsing will break until [extractInternalApiAssistantText](../src/core/provider/internalApiProvider.ts) is updated; that file is the single place to adapt.
- **Images:** Internal API has `supportsImages: false` and `maxImages: 0`. Assistants that use vision (e.g. Design Critique with selection image) will not send images when Internal API is selected. This is intentional but must be clearly documented for deployers (either disable vision-dependent actions in work mode or add image support to the Internal API later).
- **Auth:** Proxy uses optional `X-FigmAI-Token` or `Authorization: Bearer` from settings. Internal API uses no custom auth headers (session/cookies are not sent; comment in code says "credentials omitted to match curl behavior and avoid CORS"). If the enterprise endpoint requires auth, it must be handled by the endpoint (e.g. API key in query, or server-side session tied to another mechanism). Token handling in UI/storage: sharedToken and sessionToken are only used by the proxy client; they are not sent by InternalApiProvider. So no new token exposure from Internal API path; ensure Internal API URL and any in-URL tokens are not logged or displayed in error messages.

---

## 2. Parity matrix: Proxy vs Internal API

| Area | Proxy | Internal API | Mitigation / notes |
|------|--------|--------------|-------------------|
| **Request payload** | POST to `{baseUrl}/v1/chat`; body: `model`, `messages[]`, optional `assistantId`, `quickActionId`, `selectionSummary`, `images`, `response_format` (Design Critique). | POST to single URL (config.llm.endpoint); body: `type: 'generalChat'`, `message` (concatenated user + selection), `kbName`. | Internal API has no model field in payload; no tool definitions sent. Acceptable if backend uses a single model or derives from headers. |
| **Auth** | Optional `X-FigmAI-Token` or `Authorization: Bearer` from settings (sharedToken / sessionToken). | No auth headers. Credentials omitted. | Enterprise must accept unauthenticated requests from the plugin or use another mechanism (e.g. IP allowlist, gateway API key in URL). |
| **Response parsing** | [extractResponseText](../src/core/provider/normalize.ts) + proxy-specific JSON. | [extractInternalApiAssistantText](../src/core/provider/internalApiProvider.ts): Format A `Prompts[0].ResponseFromAssistant`, Format B `result`. | If backend changes format, update extraction only; no change to rest of plugin. |
| **Errors** | [ProxyError.fromResponse](../src/core/proxy/client.ts): 401/403 → AUTHENTICATION, 429 → RATE_LIMIT, 4xx → INVALID_REQUEST, 5xx → PROVIDER_ERROR; AbortError → TIMEOUT. | Same mapping in [internalApiProvider](../src/core/provider/internalApiProvider.ts); 400 + content-filter body → CONTENT_FILTER. | Parity. |
| **Retry** | Proxy client: no retry loop. | Internal API: retry up to 2 times with 1s/2s delay for retryable errors. | Internal API is more resilient; proxy could add retry later if desired. |
| **Streaming** | Not implemented; `sendChatStream` yields once with full response. | Same. | Parity. |
| **Images** | Sent if present (proxy server enforces limits). | Stripped (capabilities.supportsImages: false). | Document; no code change for parity. |
| **Preamble** | supportsPreambleInjection not set (default false). | supportsPreambleInjection: true. | Prompt pipeline can inject preamble for Internal API; no change needed for proxy. |
| **Tool calls** | Proxy returns plain text (or JSON for DC). Plugin does not parse OpenAI-style `tool_calls` from response. Tools are invoked by UI (RUN_TOOL) with toolId + payload. | Same: response is text; no tool_calls in response. | Parity. |
| **allowedDomains** | Proxy baseUrl must be in networkAccess.baseAllowedDomains or extraAllowedDomains (manually configured). | config.llm.endpoint origin must be in baseAllowedDomains or extraAllowedDomains. | **Critical:** Add Internal API origin to config.networkAccess before switching to internal-api. |

---

## 3. Must-fix before migration (if any)

**allowedDomains rule (critical):** Figma enforces `manifest.networkAccess.allowedDomains` at runtime. The script [update-manifest-network-access.ts](../scripts/update-manifest-network-access.ts) computes this list **only** from `custom/config.json`: `networkAccess.baseAllowedDomains`, `networkAccess.extraAllowedDomains`, and (when enabled) `analytics.endpointUrl`. It does **not** add `config.llm.endpoint` or `config.llm.proxy.baseUrl`. Therefore the **Internal API origin must be present in config.networkAccess.baseAllowedDomains or extraAllowedDomains**, and the plugin must be **rebuilt** after config change so the manifest is patched. Otherwise Figma blocks all outbound requests to that origin.

| Item | Severity | Description |
|------|----------|-------------|
| **Internal API origin in manifest** | **Critical** | Add the Internal API endpoint origin to `custom/config.json` under `networkAccess.baseAllowedDomains` or `extraAllowedDomains`; run build so manifest is updated. No code change required for basic support. **Optional (low-risk):** A startup or test-connection guard that checks the current provider URL origin is in the effective allowed list and fails fast with a clear message; improves failure clarity only. |
| **No other code change required** | — | Current code already supports Internal API; provider selection and request/response handling are implemented. Remaining work is configuration and operational validation. |

---

## 4. Nice-to-have (post-demo)

- **Retry for proxy:** Add the same retry/backoff as Internal API for retryable errors (e.g. 5xx, timeout) to improve resilience.
- **Health check parity:** Internal API testConnection uses POST with a small payload; proxy uses GET /health. Align if the enterprise endpoint only supports POST.
- **Config validation:** At build or first run, validate that the selected provider’s URL origin is in allowedDomains (or in the config that feeds allowedDomains) to fail fast instead of at first request.
- **Internal API auth:** If the enterprise endpoint later requires a header (e.g. API key), add an optional config field and send it only in InternalApiProvider (no change to proxy or token handling in UI).

---

## 5. Verification plan

**Commands and automated checks**
- `npm run build` — Must succeed; postbuild runs `update-manifest-network-access.ts` and `npm run invariants`. Ensures manifest and blocklist invariant pass.
- `npm run invariants` — Asserts allowed-domains blocklist (no segment, amplitude, posthog, etc.) and other refactor invariants.
- Grep for unintended domains:  
  `grep -R "statsigapi\|segment\.io\|amplitude\|posthog\|sentry\.io\|datadoghq" --include="*.json" figmai_plugin/custom figmai_plugin/manifest.json figmai_plugin/build/manifest.json`  
  Expect no matches in allowedDomains or in config URLs.

**Manual checks**
1. **Proxy (baseline):** Set provider to proxy, set baseUrl and optional token. Run an assistant; confirm request reaches proxy and response renders. Check Settings → Test connection.
2. **Internal API:** Set config.llm.provider to `internal-api`, config.llm.endpoint to enterprise URL. Add that URL’s **origin** (e.g. `https://internal-llm.corp.com`) to config.networkAccess.extraAllowedDomains (or baseAllowedDomains). Rebuild; load plugin. Run same assistant; confirm request reaches Internal API and response parses (e.g. Design Critique returns scorecard). Test connection from Settings.
3. **Errors:** For Internal API, simulate 401 (if possible) and confirm UX shows auth message; simulate timeout and confirm timeout message. No proxy-specific strings in Internal API path.
4. **Secrets:** Confirm sharedToken/sessionToken are not logged in provider code; confirm error messages do not echo full URLs with query params. Internal API URL is only in settings and in manifest allowedDomains (origin only).

**Smoke checklist (demo / enterprise rollout)**
- [ ] config.json has correct provider and endpoint; networkAccess includes the endpoint origin.
- [ ] Build + invariants pass; manifest.allowedDomains contains expected origins only.
- [ ] Plugin loads; Settings shows correct connection type and Test connection succeeds.
- [ ] One non-visual assistant (e.g. General) returns a reply.
- [ ] Design Critique (or one JSON assistant) returns and parses correctly.
- [ ] Content safety: forceNoImages or similar still applies when configured.
- [ ] No console errors related to fetch or CORS for the LLM request.

---

## 6. Key files and entry points

| Concern | File(s) |
|--------|---------|
| Provider selection | [src/core/provider/providerFactory.ts](../src/core/provider/providerFactory.ts) — `createProvider()`, precedence internal-api → proxy → by id. |
| Proxy request/response | [src/core/proxy/client.ts](../src/core/proxy/client.ts) — `ProxyClient.chat()`, healthCheck, error mapping. |
| Internal API request/response | [src/core/provider/internalApiProvider.ts](../src/core/provider/internalApiProvider.ts) — `sendChat()`, `extractInternalApiAssistantText()`, error mapping, retry. |
| Normalized send path | [src/core/contentSafety/recovery.ts](../src/core/contentSafety/recovery.ts) — `sendChatWithRecovery()`; [src/core/provider/normalize.ts](../src/core/provider/normalize.ts) — `prepareRequest`, `extractResponseText`. |
| Effective settings | [src/core/settings.ts](../src/core/settings.ts) — `getEffectiveSettings()`; [src/custom/config.ts](../src/custom/config.ts) — `getLlmProvider()`, `getCustomLlmEndpoint()`, `getConfigProxySettings()`. |
| Manifest allowedDomains | [scripts/update-manifest-network-access.ts](../scripts/update-manifest-network-access.ts) — `computeAllowedDomains()` (only networkAccess + analytics; **does not** add llm.endpoint or proxy baseUrl). |
| Blocklist invariant | [scripts/assert-invariants.ts](../scripts/assert-invariants.ts) — “Allowed domains blocklist” step. |
| All fetch call sites | See “Networking + security” below. |

---

## 7. Provider plumbing and request lifecycle (reference)

```
UI (postMessage)
  → main.ts: RUN_QUICK_ACTION / handler path
  → buildSelectionContext (selection, images if allowed)
  → prompt pipeline (assembleSegments → sanitize → budget → assert)
  → sendChatWithRecovery(provider, request, options)
       → provider.sendChat(payload)   [ProxyProvider or InternalApiProvider]
            → proxyClient.chat()      [proxy]  → fetch(baseUrl/v1/chat)
            → fetch(internalApiUrl)   [internal-api]  → POST type:generalChat, message, kbName
       ← response text
  → handler post-process (e.g. parse JSON for Design Critique)
  → sendAssistantMessage / render
  → UI (postMessage)
```

Abstraction points: `Provider` interface ([provider.ts](../src/core/provider/provider.ts)); `ChatRequest` / response as string; `prepareRequest` in normalize.ts; `extractResponseText` (proxy) vs `extractInternalApiAssistantText` (internal). Tool execution is separate: `RUN_TOOL` from UI → `routeToolCall` → local tool execution; no LLM round-trip for tool calls.

---

## 8. Config and environment controls

- **Runtime:** `getEffectiveSettings()` (settings.ts) merges clientStorage with config. When config.llm.provider is set, config supplies provider and URL; proxy baseUrl/defaultModel/auth come from config.llm.proxy when provider is proxy.
- **Build-time:** Manifest allowedDomains are computed from custom/config.json (networkAccess + analytics only) by update-manifest-network-access.ts; assert-invariants.ts runs after and checks blocklist. Config.llm.endpoint and config.llm.proxy.baseUrl are **not** auto-added to the manifest; they must appear in networkAccess.baseAllowedDomains or extraAllowedDomains.
- **Minimal config for Internal API deployment:** Set config.llm.provider to `internal-api`, config.llm.endpoint to the enterprise URL. Add that URL’s origin to networkAccess.baseAllowedDomains or extraAllowedDomains. Optionally set hideProxySettings: true, hideModelSettings: true for work-only mode.

---

## 9. Networking and security (all fetch call sites)

| Location | Purpose | Allowed by |
|----------|---------|------------|
| [src/core/proxy/client.ts](../src/core/proxy/client.ts) | Proxy health + chat | manifest allowedDomains (proxy baseUrl must be in config networkAccess) |
| [src/core/provider/internalApiProvider.ts](../src/core/provider/internalApiProvider.ts) | Internal API chat + test | manifest allowedDomains (internal API URL must be in config networkAccess) |
| [src/core/analytics/service.ts](../src/core/analytics/service.ts) | Analytics batch upload | manifest allowedDomains (analytics endpoint added by script when enabled) |
| [src/ui.tsx](../src/ui.tsx) | `fetch(data:image/png;base64,...)` for blob | No network; data URL only |

No other fetch/XHR in plugin src. Scripts (admin-editor, scripts) are not in the plugin runtime.

**Token and secrets:** sharedToken and sessionToken are read from settings and sent only in proxy client headers; they are not logged in provider code. Internal API does not send these. Ensure Internal API URL (and any query params) are not logged or displayed in errors.

---

## 10. Error handling and resilience parity

- **Proxy:** 401/403 → AUTHENTICATION; 429 → RATE_LIMIT; 4xx → INVALID_REQUEST; 5xx → PROVIDER_ERROR; AbortError → TIMEOUT. Content-filter detection via [isContentFilterResponse](../src/core/contentSafety/index.ts) (status 400 + body phrase). No retry in client.
- **Internal API:** Same status mapping; 400 + content-filter body → CONTENT_FILTER. Retry up to 2 times with 1s/2s delay for retryable errors. CORS (status 0) mapped to NETWORK with message about allowedDomains.
- **Enterprise considerations:** TLS/cert errors will surface as network errors. Non-JSON or HTML error pages from a gateway should be handled by existing try/catch around response.json(); invalid JSON falls back to response.text() and may then fail extraction. No special handling for redirects (Figma plugin fetch follows redirects; ensure endpoint URL is final).

---

## 11. Tooling and tool-call compatibility

- **Current:** Tools are registered in [toolRegistry](../src/core/tools/toolRegistry.ts); execution is [routeToolCall](../src/core/tools/toolRouter.ts) (main thread). The LLM (proxy or Internal API) returns **text**; there is no parsing of OpenAI-style `tool_calls` in the response. The UI sends `RUN_TOOL` with toolId and payload when the user or flow triggers a tool (e.g. export selection to JSON). So both proxy and Internal API are “text in, text out”; no schema difference for tools.
- **Internal API:** No tool definitions are sent in the payload; the backend does not need to support function calling. If a future Internal API supports tool calls in its own format, an adapter in InternalApiProvider would be needed; current design does not require it for parity.

---

## 12. Operational readiness for private deployment

- **Manifest strategy:** For private deployment, set networkAccess.baseAllowedDomains (and optionally extraAllowedDomains) in custom/config.json to the exact origins needed: e.g. Internal API origin, and (if used) analytics endpoint. Do not rely on PUBLIC_DEFAULT_ALLOWED_DOMAINS for production; override with explicit list. Staging/localhost: add staging and localhost origins to extraAllowedDomains as needed.
- **CI validation:** Run `npm run build` (includes invariants); run optional grep for blocklist hostnames in config and manifest; run tests (`npm run test`). No new scripts required; existing invariants cover blocklist.
- **Smoke checklist:** As in section 5 above (config, build, load plugin, test connection, one assistant, one JSON assistant, safety toggles, no console errors).

---

## 13. Go / No-Go

**Go** — Proceed with migration when:
- The Internal API endpoint origin is added to `custom/config.json` under `networkAccess.baseAllowedDomains` or `extraAllowedDomains`, and the manifest has been rebuilt (postbuild run).
- The enterprise endpoint accepts the documented request shape (`type: 'generalChat'`, `message`, `kbName`) and returns one of the supported response shapes (Format A: `Prompts[0].ResponseFromAssistant`, Format B: `result`). See [internalApiProvider.ts](../src/core/provider/internalApiProvider.ts) for exact extraction logic.
- You accept that images/vision are not sent when Internal API is selected (capabilities.supportsImages: false), and that no auth headers are sent unless the endpoint uses another mechanism (e.g. API key in URL, IP allowlist).

**No-Go** — Pause migration if:
- The Internal API origin is not in config networkAccess and you cannot rebuild before rollout (Figma will block requests).
- The enterprise API response format does not match what [extractInternalApiAssistantText](../src/core/provider/internalApiProvider.ts) expects, and you cannot change the backend or update the extractor before cutover.
- You require vision/image support for Internal API and the backend does not yet support it (no code path today sends images for internal-api).

---

## 14. Migration checklist (custom/private environment)

**1. Set in custom/config.json**
- `llm.provider`: `"internal-api"`
- `llm.endpoint`: full enterprise URL (e.g. `https://internal-llm.corp.com/chat`)
- `networkAccess.baseAllowedDomains` or `networkAccess.extraAllowedDomains`: include the **origin** of the endpoint (e.g. `https://internal-llm.corp.com`). This is required; the manifest is derived from these fields only.

**2. Rebuild**
- Run `npm run build` (or at least run the postbuild step so `tsx scripts/update-manifest-network-access.ts` and `npm run invariants` execute).
- Confirm `manifest.json` (or `build/manifest.json`) has `networkAccess.allowedDomains` containing the Internal API origin.

**3. Test**
- Load the plugin in Figma; open Settings and confirm connection type shows Internal API and Test connection succeeds.
- Run one non-visual assistant (e.g. General) and one JSON assistant (e.g. Design Critique) and confirm responses parse and render.
- Confirm no console errors for fetch/CORS and that content-safety toggles (e.g. forceNoImages) still apply.
