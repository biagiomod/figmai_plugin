# Content Safety and Recovery Pipeline — Architectural Plan

## Context and goal

The FigmAI plugin can hit **Azure OpenAI content policy blocks** in some environments. This plan defines a **progressive, non-blocking** content safety and recovery pipeline that:

- Does **not** preemptively scrub user content by default  
- Supports **large payloads** without hard caps  
- **Recovers gracefully** from Azure content policy blocks via a tiered retry strategy  
- Explains blocks to users using local detection signals  
- Preserves existing **provider routing** and stability guarantees  

**Planning only — no code implementation.**

---

## 1. Pipeline stages and responsibilities

### 1.1 High-level flow

```
[User / Quick Action]
        ↓
[Main: build messages + selectionContext]  ← unchanged; source of truth
        ↓
[Content Pipeline: prepare payload]
   Stage A: Default optimizations (value-neutral)
   Stage B: (on block) Tier 2 transform → retry
   Stage C: (on block) Tier 3 transform → retry
        ↓
[Provider.sendChat(payload)]  ← providerFactory unchanged; same provider instance
        ↓
[Success] → handler / replaceStatusMessage
[CONTENT_FILTER] → retry with next tier or surface final error + UI messaging
[Other errors] → fail fast, no retry (existing behavior)
```

The pipeline is a **single orchestration layer** between “request assembled” and “provider.sendChat”. It does not replace providerFactory, does not add new external calls, and applies to **all assistants** (chat and quick actions) because they all go through the same send path in main.

### 1.2 Stage responsibilities

| Stage | Name | Responsibility | When |
|-------|------|----------------|------|
| **A** | **Default prepare** | Apply only value-neutral, low-risk optimizations to the outgoing payload (messages + selectionSummary + images). No PII masking, no hard size caps. | Every request (Attempt 1). |
| **B** | **Tier 2 — Targeted redaction** | On CONTENT_FILTER from provider: transform payload with minimal, targeted redaction (emails, phones, long numeric runs, token-like strings). Preserve semantic structure. | Attempt 2 only. |
| **C** | **Tier 3 — Summary-first fallback** | On CONTENT_FILTER again: replace verbatim user/selection text with neutral local summaries; preserve hierarchy, intent, and metrics. | Attempt 3 only. |
| **D** | **Provider call** | Unchanged: `provider.sendChat(request)`. Provider selection remains via providerFactory; no new HTTP paths. | After each prepare. |
| **E** | **Recovery loop** | In main (or a thin “send with recovery” wrapper): call Stage A → D; on CONTENT_FILTER, call Stage B → D; on CONTENT_FILTER again, call Stage C → D; on success return; on non-retryable error or third block, surface error and optional UI payload. | Same process for chat and quick actions. |

### 1.3 Where the pipeline lives

- **New module:** `src/core/contentSafety/` (or `src/core/provider/contentSafety/`):
  - **Prepare functions:** `preparePayloadTier1(request): PreparedRequest`, `preparePayloadTier2(request): PreparedRequest`, `preparePayloadTier3(request): PreparedRequest`.
  - **Local detectors (no external calls):** e.g. `detectSensitivePatterns(text): DetectionSignals` — used for Tier 2 redaction targets and for UI “likely trigger” hints. No logging of raw content.
- **Orchestration:** Either in main.ts around the existing `sendChat` call (retry loop + prepare tier selection), or in a single function e.g. `sendChatWithRecovery(provider, request, options)` called from main. Recommendation: **`sendChatWithRecovery`** in a small module that main imports, so main stays readable and the loop is testable in isolation.

---

## 2. Default request behavior (no preemptive scrubbing)

### 2.1 Tier 1 — Value-neutral optimizations only

Applied to the payload before **Attempt 1** (and preserved as baseline for Tier 2/3 input when applicable):

- **URLs:** Strip query params and fragments from any URL-like strings in message content and selectionSummary (e.g. `https://example.com/path?k=v#hash` → `https://example.com/path`). Reduces trigger surface without changing meaning.
- **Blobs:** Collapse obvious base64/hex blobs into a single placeholder (e.g. `[base64 data, 12KB]`). Use a simple heuristic (long alphanumeric runs, optional `data:` prefix). Do not strip; replace with a short, neutral descriptor so structure remains.
- **De-duplication:** If the same long text block (e.g. >200 chars) appears verbatim more than once in the combined payload, keep the first occurrence and replace subsequent ones with a short line such as `[same as above]` to avoid redundant tokens and some policy triggers.

No blanket PII masking, no arbitrary character/token caps, no removal of “sensitive” keywords in Tier 1.

### 2.2 Data contract (Tier 1)

- **Input:** `ChatRequest` (messages, selectionSummary, images, assistantId, quickActionId, etc.) — same as today.
- **Output:** `PreparedRequest` (or a subtype of ChatRequest) with the same shape; only `messages[].content` and `selectionSummary` may be transformed strings; `images` unchanged for Tier 1 (Tier 3 may replace with summaries).
- **Idempotent:** Same input → same Tier 1 output. No randomness.

---

## 3. Large-content handling (no hard limits)

### 3.1 Strategy

- **No hard token or character caps** in default or Tier 2. Tier 3 reduces size by design (summary-first) but still no fixed cap.
- **Semantic chunking (for Tier 3 and future use):** When building selectionSummary or when building a “summary index” for Tier 3:
  - Chunk by **frame/section/component** (align with existing selectionSummary node boundaries). Each chunk = one or more nodes with a natural boundary (e.g. top-level frame, or logical section if available).
  - For each chunk, keep: **title** (node name), **short summary** (e.g. 1–2 sentences from layout + text presence), **metrics** (width, height, child count, hasText).
- **Screen index (compact):** A single compact structure: list of `{ id, name, summary, metrics }` for all chunks. Used in Tier 3 as the primary context instead of full verbatim text.
- **Multi-pass (when Tier 3 is used):** Conceptually:
  - **Pass A:** Summary/index across all chunks (already produced locally; no extra LLM call). Tier 3 payload = system message + “screen index” + optional truncated user message.
  - **Pass B:** (Future) Deeper analysis of high-impact chunks only — would require a second LLM call; **out of scope** for initial pipeline. Pipeline only prepares the payload; it does not perform multi-pass LLM calls. So “multi-pass” here means: Tier 3 sends index + minimal text; if the backend or a future handler wants to do a second request for details, that is a separate feature.

### 3.2 Data contracts for large content

- **Chunk:** `{ id, name, summary, metrics }` (and optionally full text for Tier 1/2). Summary and metrics are derived locally from selectionSummary / extractSelectionSummary; no new external API.
- **Screen index:** `Chunk[]` — ordered list of chunks. Built from the same data that today produces `selectionSummary`; formatting differs (compact key-value or short lines).
- **Tier 3 payload:** messages where the “selection” part is replaced by the screen index (and optionally a one-line user intent); user message content can be replaced by a single neutral line if it was the trigger (e.g. “User requested analysis of the selected frames.”).

---

## 4. Azure block recovery loop (retry state machine)

### 4.1 Retry state machine

- **S0 — Start:** Request assembled (messages + selectionContext) as today. Pipeline runs **Tier 1** prepare → `payload1`.
- **S1 — Attempt 1:** `provider.sendChat(payload1)`.
  - **Success** → Done; hand response to handler / replaceStatusMessage.
  - **CONTENT_FILTER** → Transition to S2 (Attempt 2).
  - **Other (network, auth, 5xx, timeout, etc.)** → **Fail fast**; no retry; surface error as today. `retryable` flag on ProviderError remains the source of truth for “other” retries (e.g. 5xx); content recovery loop does not change that.
- **S2 — Attempt 2:** Pipeline runs **Tier 2** prepare on the **original** request (not payload1) → `payload2`. `provider.sendChat(payload2)`.
  - **Success** → Done; optionally set a flag “recovered_with_redaction” for UI.
  - **CONTENT_FILTER** → Transition to S3 (Attempt 3).
  - **Other** → Fail fast; surface error.
- **S3 — Attempt 3:** Pipeline runs **Tier 3** prepare on the original request → `payload3` (summary-first). `provider.sendChat(payload3)`.
  - **Success** → Done; optionally set “recovered_with_summary” for UI.
  - **CONTENT_FILTER** or **any error** → **Final failure**; surface error and content-policy-specific UI (see §5).
- **Max attempts:** 3. No infinite retry. After third attempt, do not retry again automatically.

### 4.2 Automatic retries and opt-out

- **Automatic:** Tier 2 and Tier 3 retries happen **automatically** when the provider returns CONTENT_FILTER. No user click required for the first two retries.
- **Opt-out:** If, in the future, a user preference “Do not retry on content block” is added (e.g. in Settings), the recovery loop can skip Tier 2/3 and go straight to final failure after Attempt 1. Not required for v1; document as an option.
- **Non-retryable errors:** Auth, 4xx (other than content filter), invalid response, etc. must **not** trigger the content recovery loop. Only `ProviderError` with `type === CONTENT_FILTER` triggers Tier 2/3. Other errors continue to be handled as today (single attempt, then replaceStatusMessage with error).

### 4.3 Provider contract for CONTENT_FILTER

- **Internal API:** Already detects content-filter responses (e.g. `content_filter`, `content policy` in body) and throws `ProviderError(..., ProviderErrorType.CONTENT_FILTER, ..., false)`. Keep as is.
- **Proxy:** Today the proxy client throws a generic error on `!response.ok`. **Add** content-filter detection: if response status is 400 (or 429 if Azure uses it for policy) and response body contains known phrases (e.g. `content_filter`, `content policy`, `content filtering`), throw `ProviderError(..., ProviderErrorType.CONTENT_FILTER, statusCode, responseBody, false)` so the same recovery loop applies. No new network call; only interpretation of the existing error response.

---

## 5. User-facing messaging

### 5.1 When a block occurs (final failure after Attempt 3 or user opt-out)

- **Inform:** The UI must show that the **provider blocked the request** (content policy), not a generic “request failed.” Use a short, non-technical line (e.g. “This request was blocked by the provider’s content policy.”).
- **Explain likely triggers:** Use **local detection signals only** (no raw user content). The pipeline exposes a small **ContentBlockContext** (or equivalent) when entering final failure:
  - Flags such as: `hadSensitivePatterns`, `hadBlobContent`, `hadTokenLikeStrings`, `hadLongNumericRuns`, `hadUrlsWithParams`.
  - UI can map these to short bullets, e.g. “Your input may have included: email/phone, long numbers, credential-like text, or large encoded data.”
- **Indicate retry/fallback:** If Attempt 2 or 3 **succeeded**, replace the status message with the assistant response and optionally append a short line: “We had to simplify some content to get a response.” If Attempt 2 or 3 **failed**, show the final error and the “likely trigger” hints.

### 5.2 Manual retry options (future)

- **Summary-only retry:** A UI control “Try again with summary only” that re-sends the **same** request through the pipeline with **Tier 3** from the start (skip Tier 1 and Tier 2). No new architecture; just a different entry point into the same pipeline.
- **Targeted redaction retry:** “Try again with less detail” that re-sends with **Tier 2** from the start. Same pipeline, different entry tier.

These can be implemented as additional quick actions or buttons that call the same `sendChatWithRecovery` with an option like `startTier: 2 | 3`.

### 5.3 UI integration points

- **Main → UI:** Today errors are surfaced via `replaceStatusMessage(requestId, errorMessage, true)`. For content-policy final failure, main (or the recovery wrapper) can call `replaceStatusMessage(requestId, formattedMessage, true)` where `formattedMessage` is a string that includes the “blocked by content policy” line and, if available, a second line with “Possible reasons: …” from ContentBlockContext. No new message types required for v1; optional later: a structured `CONTENT_BLOCK` message type with `reason` and `hints[]` for richer UI (e.g. expandable “Why?” section).
- **Recovery success:** When Attempt 2 or 3 succeeds, the existing flow (replaceStatusMessage with the assistant response) is enough; the optional “We had to simplify…” can be appended to that message or sent as a follow-up status line.

---

## 6. Observability and safety

### 6.1 Safe to log (metadata only)

- **Payload size:** Total character count of (messages + selectionSummary); optionally per-message length.
- **Chunk count:** Number of chunks when Tier 3 is used (screen index length).
- **Retry tier used:** 1, 2, or 3 on success; or “failed after 3” on final failure.
- **Local detector flags:** Same flags as ContentBlockContext (hadSensitivePatterns, hadBlobContent, etc.) — **not** the actual content, only booleans or counts.
- **Provider and assistant:** provider id, assistantId, quickActionId (already logged today).

### 6.2 Forbidden

- **Raw user content:** Do not log `messages[].content`, `selectionSummary`, or any substring of user/selection text in production.
- **Redacted or summarized content:** Do not log the output of Tier 2 or Tier 3 transforms; only tier index and success/failure.

### 6.3 Analytics

- **Events:** Optional analytics events such as `content_safety_tier_used` (value 1/2/3), `content_block_final_failure` (with detector flags), `content_safety_recovery_success` (tier 2 or 3). Payload: tier, assistantId, quickActionId, and detector flags; no content.

---

## 7. Integration constraints

- **Provider routing:** providerFactory and createProvider remain the single source of truth. The pipeline only receives the already-built ChatRequest and calls the same `provider.sendChat(request)`; it does not choose or change the provider.
- **Layout / HUG:** No change to layout, Auto-Layout, or HUG behavior; pipeline only transforms request payload (strings and optional image placeholders). No Figma node APIs in the pipeline.
- **No new external calls:** All prepare and detection steps are local (in-plugin). Tier 3 “summary” is built from existing selectionSummary / extractSelectionSummary data; no extra HTTP or third-party API.
- **All assistants:** The single send path in main (chat + quick actions) goes through the recovery loop, so all assistants benefit uniformly. Handlers that call `provider.sendChat` directly (e.g. repair steps in Design Critique or Design Workshop) can either be updated to use the same wrapper or remain as-is and only get recovery when the **first** send goes through main; recommend routing repair through the same wrapper so recovery is consistent.

---

## 8. Data contracts (summary)

| Artifact | Description |
|----------|-------------|
| **ChatRequest** | Existing: messages, selectionSummary, images, assistantId, quickActionId, etc. |
| **PreparedRequest** | Same shape as ChatRequest; only content strings (and optionally images in Tier 3) may be transformed. |
| **DetectionSignals** | Local-only: `{ hadSensitivePatterns, hadBlobContent, hadTokenLikeStrings, hadLongNumericRuns, hadUrlsWithParams }` (or similar). No raw text. |
| **ContentBlockContext** | For UI/analytics on final failure: `{ detectionSignals, attemptedTiers: [1,2,3] }`. |
| **Screen index (Tier 3)** | List of `{ id, name, summary, metrics }` per chunk; derived from selectionSummary source data. |

---

## 9. Recommended implementation order

1. **Content-filter detection in Proxy**  
   In proxy client: on non-OK response, parse body for content-policy phrases; throw `ProviderError` with `CONTENT_FILTER` so behavior matches Internal API.

2. **Content pipeline module (Tier 1 only)**  
   Add `contentSafety` module with Tier 1 prepare (URL strip, blob placeholder, de-dupe). No retry yet; just one function that main can call to get the payload for Attempt 1.

3. **Recovery loop in main**  
   Introduce `sendChatWithRecovery(provider, request)`: run Tier 1 → sendChat; on CONTENT_FILTER, run Tier 2 (stub) → sendChat; on CONTENT_FILTER again, run Tier 3 (stub) → sendChat. Tier 2/3 can return the same request initially (no-op) so that behavior is unchanged until they are implemented.

4. **Tier 2 — Targeted redaction**  
   Implement Tier 2 prepare: local detectors (email, phone, long numeric runs, token-like strings); redact those only; preserve structure. Plug into recovery loop.

5. **Tier 3 — Summary-first**  
   Implement screen index from selectionSummary source; Tier 3 prepare that replaces selection and optionally user message with index + neutral line. Plug into recovery loop.

6. **UI messaging**  
   On final content-policy failure, pass ContentBlockContext to a small formatter and show “blocked by content policy” + “Possible reasons: …” via replaceStatusMessage. Optionally show “We had to simplify…” when recovery succeeds.

7. **Observability**  
   Add safe metadata logging (tier, size, chunk count, detector flags) and optional analytics events. Ensure no raw or redacted content is logged.

8. **Error categorization**  
   In `errorCodes.ts`, map `CONTENT_FILTER` to a dedicated category (e.g. `provider_content_filter`) for analytics.

9. **Manual retry (optional)**  
   Add “Try again with summary only” / “Try again with less detail” that call `sendChatWithRecovery` with `startTier: 2` or `startTier: 3`.

---

## 10. Risks and mitigations

| Risk | Mitigation |
|------|------------|
| **Tier 2/3 change semantics** | Redaction and summary are minimal and structure-preserving; document that analysis may be less precise when Tier 2/3 are used; optional UI hint “We had to simplify…” |
| **False positives (block not content)** | Only treat as CONTENT_FILTER when response body matches known phrases; do not overload other 400s as content filter. |
| **Performance (Tier 3 index build)** | Reuse existing selectionSummary extraction; index is a different formatting of the same data; no extra Figma reads beyond what buildSelectionContext already does. |
| **Leaking sensitive data in logs** | Strict rule: never log message content or selectionSummary; only sizes, tier, and boolean flags. Code review and tests for logging paths. |
| **Provider-specific behavior** | Pipeline is provider-agnostic; only reacts to CONTENT_FILTER. If a provider does not use that type, no retry. Internal API and Proxy both map to CONTENT_FILTER as above. |
| **Repair / follow-up calls** | Handlers that do a second sendChat (e.g. Design Critique repair) should use the same recovery wrapper so both first and repair get Tier 2/3 if needed; otherwise repair might block again with no recovery. |

---

## 11. Out of scope for this plan

- **Multi-pass LLM (Pass B):** A second request to the LLM for “deep analysis of high-impact chunks” is not part of the pipeline; the pipeline only prepares payloads. If needed later, it can be a separate feature that uses the screen index.
- **PII masking in Tier 1:** Not done; only Tier 2 does targeted redaction.
- **New provider types:** No new providers; only detection and retry behavior for existing ones.
- **Changing providerFactory or routing logic:** No change to when or which provider is created.

---

This plan is ready for implementation by the Code Steward. No code has been written; only architecture and contracts are defined.
