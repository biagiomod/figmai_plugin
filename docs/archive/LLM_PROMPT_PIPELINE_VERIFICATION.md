> Status: Archived
> Reason: Historical reference / superseded; see docs/README.md for current docs.
> Date: 2026-01-21

# LLM Prompt Pipeline — Verification Report

**Purpose:** Confirm pipeline wiring, payload shapes after buildMessages/applySafetyAssertions, fallback behavior, and that diagnostics never leak raw prompt/base64/URL lists.

---

## 1. Provider paths and fields sent after buildMessages + applySafetyAssertions

**Internal API** (`internalApiProvider.ts` → `sendChat(request)`):
- **Sent:** `type: 'generalChat'`, `message` (concat of user-role `request.messages[].content`), and `kbName: 'figma'` only when `!request.minimalForContentFilter`.
- **Not sent:** `selectionSummary`, `images` (provider does not read them).
- **After pipeline:** `request` passed to `provider.sendChat` is the output of `applySafetyAssertions(buildMessages(segmentsAfter, originalRequest))`. So `message` is sanitized and budgeted; no `data:image/` or long base64 in any message content; images array is stripped by applySafetyAssertions when data URLs present. Internal API ignores `request.images` and `request.selectionSummary`.

**Proxy** (`proxyProvider.ts` → `proxyClient.chat(messages, options)`):
- **Sent:** `messages` (role + content), `selectionSummary` (if present), `images` (if present).
- **After pipeline:** Same request from `applySafetyAssertions(buildMessages(...))`. Message content and selectionSummary have no `data:image/` or long base64; images array either empty or only non–data-URL entries (applySafetyAssertions filters out any image whose dataUrl matches `data:image/`). With DEFAULT_BUDGETS.imagesBytes=0, applyBudgets already drops all images; so Proxy receives no images unless allowImages override is used with a cap.

---

## 2. No data:image/ or long base64 can survive to provider.sendChat

- **applySafetyAssertions** (promptPipeline.ts): For every `request.messages[].content` and `request.selectionSummary`, runs `assertNoDataUrlsOrLongBase64(text)` which (1) replaces `data:image/...base64,...` with `[DATA_URL_REMOVED]`, (2) replaces base64-like runs ≥200 chars with `[BASE64_STRIPPED]`. For `request.images`, filters out any image whose `dataUrl` matches `data:image/`. So after applySafetyAssertions, the request has no `data:image/` in text and no long base64 runs; images array has no data-URL entries.
- **Order of operations:** Pipeline runs assemble → sanitize → applyBudgets → buildMessages → applySafetyAssertions; then (with this implementation) safety toggles are applied (strip ctx/images/force no kbName). The result is the only object passed to `provider.sendChat`. So no data:image/ or long base64 can reach the provider.
- **Deterministic checks:** A small assertion script (see section 6) runs sanitizeSegments and assertNoDataUrlsOrLongBase64 on representative strings and asserts flags + stripping.

---

## 3. Fallback request omits kbName (Internal API) and strips selectionSummary/images

- **Fallback payload** (recovery.ts): Built as `minimalRequest` with `messages: [{ role: 'user', content: minimalMessage }]`, `selectionSummary: undefined`, `images: undefined`, `minimalForContentFilter: true`.
- **Internal API:** When `request.minimalForContentFilter === true`, `internalApiProvider.sendChat` does not set `payload.kbName`; so the wire payload has no kbName and backend injection is avoided on retry.
- **Proxy:** Receives the same minimal request; no selectionSummary, no images.

---

## 4. Diagnostics never include raw prompt/base64/long URL lists

- **diagnose()** (promptPipeline.ts): Builds `compact` from segment **lengths** (total, sys, preamble, user, ctx, images count/bytes), providerId, kbName (string "figma" or "none" or "off-forced"), flags (names only), trims (e.g. "ctx:-1000"), fallback (0|1), and a short **hash** of length summary. No message content, no selectionSummary text, no image dataUrls, no URL list.
- **details** object: Same numeric/identifier fields (sizes, flags, trims, hash). No raw content.
- **UI:** Displays only `compact` and optional details table; Copy copies the compact string. No raw prompt, base64, or URL list are ever rendered or copied.

---

## 5. Code reference

| Check | Location |
|-------|----------|
| Pipeline output → send | recovery.ts: request1 = buildMessages(segmentsAfter); payload1 = applySafetyAssertions(request1).request; provider.sendChat(payload1) |
| Safety assertions | promptPipeline.ts: applySafetyAssertions, assertNoDataUrlsOrLongBase64 |
| Fallback minimal payload | recovery.ts: minimalRequest with selectionSummary/images undefined, minimalForContentFilter true |
| Internal API kbName | internalApiProvider.ts: if (!request.minimalForContentFilter) payload.kbName = 'figma' |
| Diagnose output | promptPipeline.ts: diagnose() builds compact + details from lengths/flags/trims/hash only |

---

## 6. Deterministic internal checks

See `scripts/assert-prompt-pipeline.ts`: runs assertNoDataUrlsOrLongBase64, sanitizeSegments, applySafetyAssertions, and applyBudgets on fixed strings (data URLs, long base64, huge JSON); asserts expected flags and that output contains no data:image/ or long base64 runs. Run with `npm run assert-prompt-pipeline` or `npx tsx scripts/assert-prompt-pipeline.ts`; exit 0 = pass.

---

## 7. How to test at work (≤10 lines; PROMPT_DIAG only)

1. Set `llm.promptDiagnostics.enabled: true` and `llm.promptDiagnostics.level: "compact"` in custom/config.json.
2. Send "Hello?" in General Assistant; copy the one-line PROMPT_DIAG (Copy diag). Confirm small user= and no DATA_URL/BASE64_RUN.
3. **A/B test kbName:** Turn `llm.safety.forceNoKbName` **on**; send "Hello?" again; copy diag (should show kbName=off-forced). Turn `forceNoKbName` **off**; send "Hello?" again; copy diag (kbName=figma or none). If blocking only happens with kbName on, server injection is likely.
4. If CONTENT_FILTER occurs, confirm second attempt runs and diag shows fallback=1.
5. Optional: set forceNoSelectionSummary / forceNoImages for more isolation; copy diag to see ctx=0-forced, images=0-forced.
6. Run `npm run build` and (if present) `npx tsx scripts/assert-prompt-pipeline.ts`.
