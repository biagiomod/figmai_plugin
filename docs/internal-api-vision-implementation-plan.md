# Internal API Vision/Images — Audit and Implementation Plan

**Scope:** Enable selection-based vision (images) for the Internal API provider so assistants like Design Critique can analyze selected Figma elements in work/private environment. No regressions to proxy/OpenAI paths; no changes to Internal API response parsing or auth unless strictly required.

**Constraints:** No new network domains or telemetry; minimal, localized, config-driven changes; respect `llm.safety.forceNoImages`; no raw base64 in logs (counts/sizes only in diagnostics).

---

## 1. Audit: Image/Vision Gating Pipeline

### 1.1 Flow (selection → request → provider)

| Step | Location | Behavior |
|------|----------|----------|
| **1. Selection context** | [src/core/context/selectionContext.ts](../src/core/context/selectionContext.ts) `buildSelectionContext()` | Exports images **only when** (a) `quickAction?.requiresVision === true`, (b) `provider.capabilities.supportsImages === true`, (c) selection exists. Uses `quickAction.maxImages` / `quickAction.imageScale`; caps by `provider.capabilities.maxImages`. Calls [exportSelectionAsImages](../src/core/figma/exportSelectionAsImages.ts). |
| **2. Export** | [src/core/figma/exportSelectionAsImages.ts](../src/core/figma/exportSelectionAsImages.ts) | No feature flag. Exports selected nodes as PNG → base64 data URLs (`data:image/png;base64,...`). Options: maxImages, imageScale, preferFrames, maxWidth, maxHeight, maxSizeBytes. |
| **3. Envelope** | [src/core/contracts/requestEnvelope.ts](../src/core/contracts/requestEnvelope.ts), main.ts | Envelope includes `images` from selection context. Provider is resolved via `createProvider(providerId)`; same provider instance is passed to `buildSelectionContext` and later to `sendChatWithRecovery`. |
| **4. Safety** | [src/core/contentSafety/recovery.ts](../src/core/contentSafety/recovery.ts) `sendChatWithRecovery()` | Applies `getSafetyToggles()`: if `safety.forceNoImages` is true, sets `images: undefined` on the payload before calling `provider.sendChat()`. So **forceNoImages gates at send time** regardless of provider capabilities. |
| **5. Normalize** | [src/core/provider/normalize.ts](../src/core/provider/normalize.ts) `prepareRequest()` | Calls `normalizeImageData(request.images, capabilities)`. If `capabilities.supportsImages` is false, returns `undefined` — **images are stripped before provider.sendChat()**. Also enforces `capabilities.maxImages`. |
| **6. Provider** | Proxy: [proxyProvider.ts](../src/core/provider/proxyProvider.ts) → [client.ts](../src/core/proxy/client.ts). Internal API: [internalApiProvider.ts](../src/core/provider/internalApiProvider.ts) | Proxy: `capabilities.supportsImages: true`, `maxImages: undefined`; passes `normalizedRequest.images` to `proxyClient.chat()` which sends `payload.images` array. Internal API: `supportsImages: false`, `maxImages: 0`; **payload is built without any images field** (message + selection text only). |

### 1.2 Where Internal API is blocked today

- **Capabilities:** [internalApiProvider.ts](../src/core/provider/internalApiProvider.ts) lines 71–77: `supportsImages: false`, `maxImages: 0`. So:
  - `buildSelectionContext` never exports images for Internal API (because `providerSupportsImages` is false).
  - Even if images were in the envelope, `normalizeImageData(..., capabilities)` would strip them in `prepareRequest`.
- **Payload:** Internal API `sendChat()` builds `payload` as `Record<string, string>` with only `type`, `message`, `kbName` — no `images` key. So the backend would not receive images even if we passed them through.

### 1.3 Safety and config

- **forceNoImages:** From [getSafetyToggles()](../src/custom/config.ts) — `forceNoImages: customConfig?.llm?.safety?.forceNoImages !== false` (default **true**). When true, [recovery.ts](../src/core/contentSafety/recovery.ts) sets `images: undefined` on the payload. To enable images in work environment, deployers set `llm.safety.forceNoImages: false` in config.
- **No other feature flags** gate selection export PNG; the only gates are `requiresVision`, `provider.supportsImages`, and `forceNoImages`.

### 1.4 Logging (guardrails)

- [selectionContext.ts](../src/core/context/selectionContext.ts) lines 84–88: currently logs `preview = img.dataUrl.substring(0, 80) + '...'` — **this leaks base64**. Plan: log only counts/sizes (e.g. image count, total byte size or per-image size), and only when diagnostics are enabled or in a dedicated debug scope; never log raw dataUrl content.

---

## 2. Minimal Changes Required

### 2.1 Provider capabilities (Internal API)

**File:** [src/core/provider/internalApiProvider.ts](../src/core/provider/internalApiProvider.ts)

- Set `supportsImages: true`.
- Set `maxImages` to a sensible limit (e.g. `1` or `2`) to match typical quick actions (Design Critique, etc. use maxImages: 1). Recommend `2` for parity with `ALLOW_IMAGES_BUDGETS.maxImages` in [promptPipeline.ts](../src/core/llm/promptPipeline.ts).

No other provider code path needs change for capabilities; selection context and normalize already use them.

### 2.2 Internal API request payload (add images)

**File:** [src/core/provider/internalApiProvider.ts](../src/core/provider/internalApiProvider.ts) `sendChat()`.

- After building `message` (and optional `kbName`), if `request.images` is present and non-empty, add an `images` field to the payload.
- Payload is currently `Record<string, string>`; for images we need a JSON-serializable structure. Use the **same shape as the proxy** for consistency and so the enterprise endpoint can mirror proxy semantics if desired.

**Expected Internal API request schema (with images):**

- Existing: `type`, `message`, `kbName` (optional).
- New (optional): `images` — array of objects:
  - `dataUrl` (string): `data:image/png;base64,...`
  - `name` (string, optional): node name
  - `width` (number, optional): width in px
  - `height` (number, optional): height in px

So the backend contract becomes: same as today when `images` is omitted; when the plugin sends `images`, the endpoint may use them for vision (e.g. inline with message or as separate attachments). **Response shape is unchanged** (Format A: `Prompts[0].ResponseFromAssistant`, Format B: `result`); no change to `extractInternalApiAssistantText`.

Implementation detail: build payload as `Record<string, unknown>` (or a small typed object) so `images` can be an array; then `JSON.stringify(payload)`. Only add `images` when `normalizedRequest.images` is non-empty (Internal API will receive the request already normalized by `prepareRequest`, so images will be capped by `maxImages` and validated).

### 2.3 Logging (no raw base64)

**File:** [src/core/context/selectionContext.ts](../src/core/context/selectionContext.ts)

- Replace the per-image log that uses `img.dataUrl.substring(0, 80) + '...'` with diagnostics-only, count/size-only logging. For example: log only when a diagnostics/debug scope is enabled; log `imageCount`, and for each image only `name`, `width`, `height`, and approximate size in KB (e.g. `(dataUrl.length * 0.75) / 1024`). Never log `dataUrl` or any substring of base64.

Optional: use [debug.scope](../src/core/debug/logger.ts) (e.g. `subsystem:provider` or a dedicated `selectionContext` scope) so these logs appear only when diagnostics are enabled.

---

## 3. Parity and Regressions

- **Proxy / OpenAI:** No code changes in proxyProvider, proxy client, or normalize logic for other providers. Proxy path continues to use `supportsImages: true`, `maxImages: undefined`, and existing payload.images. **No regressions.**
- **Text-only when images disabled:** If `forceNoImages` is true (default), recovery.ts forces `images: undefined`. If provider is Internal API with `supportsImages: true` but no selection or requiresVision false, buildSelectionContext does not add images. If images are unavailable or export fails, selectionContext already falls back to summary only. **Behavior remains text-only when appropriate.**
- **Safety:** forceNoImages is respected in recovery.ts before provider.sendChat. No new domains or telemetry.

---

## 4. Expected Internal API Payload Schema (for deployers)

Document for the enterprise endpoint owners:

**POST (existing):**

- `type`: `"generalChat"`
- `message`: string (user message + optional selection context text)
- `kbName`: optional string (e.g. `"figma"`), omitted when minimalForContentFilter

**Optional (when plugin sends selection images):**

- `images`: array of `{ dataUrl: string, name?: string, width?: number, height?: number }`  
  - `dataUrl`: full `data:image/png;base64,...` string  
  - Same structure as proxy `/v1/chat` request body.images for interoperability.

Response format is unchanged (Prompts[0].ResponseFromAssistant or result).

---

## 5. Implementation Plan (concise)

| # | Task | File(s) | Description |
|---|------|--------|-------------|
| 1 | Enable Internal API image capabilities | internalApiProvider.ts | Set `supportsImages: true`, `maxImages: 2` (or 1). |
| 2 | Add images to Internal API payload | internalApiProvider.ts | In `sendChat()`, after building message/kbName, if `request.images?.length > 0`, set `payload.images = request.images` (same shape as proxy). Use `Record<string, unknown>` and serialize with JSON.stringify. |
| 3 | Privacy-safe selectionContext logging | selectionContext.ts | Remove log of dataUrl substring; log only image count and per-image metadata (name, width, height, size in KB). Gate on diagnostics/debug if desired. |

No changes to: response parsing, auth, proxy client, providerFactory, recovery (except already respecting forceNoImages), or manifest/network.

---

## 6. Verification Checklist

### 6.1 Unit / lightweight runtime

- **Capabilities:** After change, `createProvider('internal-api')` returns a provider with `capabilities.supportsImages === true` and `capabilities.maxImages === 2` (or chosen value). No change to proxy provider capabilities.
- **Normalize:** For a request with `images: [valid ImageData]` and Internal API capabilities, `prepareRequest(request, internalApiCapabilities)` leaves `normalized.images` as a non-empty array (capped by maxImages). For `supportsImages: false` (e.g. stub), images remain stripped.
- **Recovery / safety:** With `getSafetyToggles()` returning `forceNoImages: true`, payload in sendChatWithRecovery has `images: undefined` regardless of provider (existing behavior).
- **Logging:** Grep or manual check that no `console.log`/debug path logs `dataUrl` or any substring of base64 in selectionContext or Internal API provider; only counts/sizes.

### 6.2 Manual smoke in Figma

**Prerequisites:** Internal API configured (provider, endpoint, allowedDomains if required); `llm.safety.forceNoImages: false` in config so images are not forced off.

1. **Proxy baseline (no regression):** Provider = proxy, selection = one frame. Run Design Critique “Give Design Crit”. Confirm request includes image and response references visual details. Check Settings → Test connection.
2. **Internal API with vision:** Provider = internal-api, same selection. Run same action. Confirm:
   - Request reaches Internal API (network tab or backend logs).
   - Request body includes `images` array with one element and `dataUrl` starting with `data:image/png;base64,`.
   - Response returns and parses (e.g. Design Critique scorecard); response text references visual details when backend uses the image.
3. **No images when disabled:** Set `forceNoImages: true`; run same Internal API action. Confirm request body has no `images` key (or empty).
4. **Text-only path:** Internal API, no selection (or action without requiresVision). Confirm no images in payload, response still works.
5. **Console:** No errors; no log line containing raw base64 or full dataUrl.

### 6.3 Summary

- **Unit/lightweight:** Provider capabilities; prepareRequest with Internal API capabilities; forceNoImages stripping; no base64 in logs.
- **Manual:** Proxy unchanged; Internal API with selection + image in payload; forceNoImages disables images; text-only and no-regression paths.

---

## 7. Key Files Reference

| Concern | File |
|--------|------|
| Selection → images export gating | [src/core/context/selectionContext.ts](../src/core/context/selectionContext.ts) |
| PNG export | [src/core/figma/exportSelectionAsImages.ts](../src/core/figma/exportSelectionAsImages.ts) |
| Safety forceNoImages | [src/core/contentSafety/recovery.ts](../src/core/contentSafety/recovery.ts), [src/custom/config.ts](../src/custom/config.ts) getSafetyToggles |
| Request normalization / image strip by capability | [src/core/provider/normalize.ts](../src/core/provider/normalize.ts) |
| Internal API capabilities and payload | [src/core/provider/internalApiProvider.ts](../src/core/provider/internalApiProvider.ts) |
| Proxy image payload (reference shape) | [src/core/proxy/client.ts](../src/core/proxy/client.ts), [src/core/provider/proxyProvider.ts](../src/core/provider/proxyProvider.ts) |
| Image budgets | [src/core/llm/promptPipeline.ts](../src/core/llm/promptPipeline.ts) ALLOW_IMAGES_BUDGETS |

---

**Document version:** 1.0 — Audit + implementation plan. Implemented: internalApiProvider capabilities + payload.images; selectionContext diagnostics-only logging (no dataUrl/base64).
