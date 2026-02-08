> Status: Archived
> Reason: Historical reference / superseded; see docs/README.md for current docs.
> Date: 2026-01-21

# LLM Prompt Assembly Audit

**Purpose:** Identify all outbound LLM call paths, what each provider sends on the wire, sanitization gaps, and why content filtering can trigger even for "Hello?" in General Assistant.

---

## 1. Outbound LLM call paths

**All outbound LLM requests go through `sendChatWithRecovery(provider, request, options)`.** There is no other entry point to `provider.sendChat`.

| Call site | File:line | Context |
|-----------|-----------|---------|
| General assistant (first message) | `main.ts:561` | `sendChatWithRecovery(currentProvider, { messages: finalChatMessages, ... })` |
| General assistant (tool/handler callback) | `main.ts:587` | Handler’s `sendChatWithRecovery(currentProvider!, req, { selectionSummary, assistantId, quickActionId })` |
| Quick action (Design Critique give-critique, etc.) | `main.ts:696, 726, 758` | `sendChatWithRecovery(providerForContext, req, { selectionSummary, assistantId, ... })` |
| Quick action (general flow) | `main.ts:951` | `sendChatWithRecovery(currentProvider, { messages: chatMessages, ... })` |
| Quick action (handler callback) | `main.ts:978` | `sendChatWithRecovery(currentProvider!, req, ...)` |
| Analytics Tagging assistant | `main.ts:1153, 1209` | `sendChatWithRecovery(providerForContext, req, { selectionSummary, assistantId: 'analytics_tagging', ... })` |
| Design Workshop repair | `designWorkshop.ts:452` | `context.sendChatWithRecovery({ messages: repairMessages, ... })` |
| Design Critique repair | `designCritique.ts:498` | `context.sendChatWithRecovery({ messages: repairMessages, ... })` |

**Conclusion:** Every LLM call routes through `sendChatWithRecovery`. Centralizing sanitization and budgets there covers all assistants and handlers.

---

## 2. Wire payload by provider

### 2.1 Internal API (content blocker-backed)

**Implementation:** `internalApiProvider.ts` → `sendChat(request: ChatRequest)`.

**Sent on the wire:**
- `type: 'generalChat'`
- `message: string` — concatenation of **all user-role message contents** (joined by `\n\n`). This includes the **preamble** when preamble injection is used (prepended to the first user message in `main.ts`).
- `kbName: 'figma'` (hardcoded; backend may inject KB/DS server-side from this).

**Not sent:**
- `selectionSummary` — not included in the Internal API payload.
- `images` — not sent; provider has `supportsImages: false`, and normalizer strips images.

**System / preamble:**
- There is no separate system message in the payload. Preamble is built in `main.ts` using a **safe session header** (no instruction-override or jailbreak-style language):  
  `SESSION_HEADER_SAFE + "\n\n" + "${assistant.label} context: " + getShortInstructions(assistant) + "\n\n"`  
  where `SESSION_HEADER_SAFE` is: *"Start a new conversation. Use only the assistant instructions and context provided in this request."*  
  This is **prepended to the first user message content** before the request is passed to `sendChatWithRecovery`. The final user text sent to the backend is **preamble + user text** in one string.

**User messages:**
- All `request.messages` with `role === 'user'` are concatenated into `message`. So a single string is sent.

**kbName / server-side KB:**
- Backend receives `kbName: 'figma'` and may inject knowledge base and/or design system content **server-side**. The client cannot sanitize or budget that injected content. If the backend injects large or risky content, content blockers can block even when the client sends only "Hello?" plus a short preamble.

---

### 2.2 Proxy (OpenAI-backed)

**Implementation:** `proxyProvider.ts` → `proxyClient.chat(messages, options)` → `proxy/client.ts` builds JSON body.

**Sent on the wire:**
- `model`, `messages` (role + content)
- `assistantId`, `quickActionId` when present
- `selectionSummary` when present (string)
- `images` when present — array of `{ dataUrl, name?, width?, height? }`. **dataUrl is full base64 data URL** (e.g. `data:image/png;base64,...`). Not sanitized by current content-safety tiers.

**System / preamble:**
- No special system block; preamble (if any) would be inside the first user message content in `messages`.

**User messages:**
- Passed through as `messages` array. Selection summary and images are added as separate fields, not necessarily merged into message text.

**kbName:**
- Not sent by the proxy client. No server-side KB injection from this client path.

---

## 3. Where segments are merged

| Segment | Where merged | Internal API | Proxy |
|---------|--------------|--------------|--------|
| System | Not sent as separate role by Internal API; only in `messages` for proxy | N/A (no system in payload) | In `messages[]` if present |
| Preamble | **main.ts**: prepended to first user message content before `sendChatWithRecovery` | Inside `message` string | Inside first user message content |
| User | **main.ts** / handlers: `chatMessages` or `finalChatMessages` | Concatenated into `message` | In `messages[]` |
| Knowledge / DS | Client: only via `getShortInstructions(assistant)` (first ~200 chars of promptMarkdown) in preamble. Full KB/DS: **server-side** for Internal API when backend resolves `kbName` | Backend injects from `kbName` | N/A |
| Selection context | **main.ts** / handlers: `selectionSummary` and `images` from `buildSelectionContext()` passed in `ChatRequest` | Not sent | Sent as `selectionSummary` and `images` |
| Logs | Not currently injected into prompts | — | — |

**Exact merge point:** When `main.ts` (or handlers) builds the object passed to `sendChatWithRecovery({ messages, selectionSummary, images, ... })`. Preamble is already merged into `messages[0].content` for the first user message before that call.

---

## 3.1 Session lifecycle (assistant change = new session)

- **Conversation state:** Main thread holds `messageHistory` (single source of truth). Messages are grouped by **assistant segment**: each segment starts with a boundary message (`isBoundary: true`, `assistantId`).
- **When the user changes the selected assistant:** `SET_ASSISTANT` in `main.ts` inserts a boundary for the new assistant, pushes greeting + instructions (UI-only), and sets `preambleSentForSegment = null`. The **next user message** is the first in that segment and is treated as a **fresh session**: it gets the safe session header + assistant context prepended (preamble injection).
- **Segment scope:** `getCurrentAssistantSegment(messageHistory, currentAssistantId)` returns only messages after the last boundary for that assistant (excluding UI-only: boundary, greeting, instructions, status). So switching assistant effectively “resets” the conversation for the new assistant without clearing global history.
- **No override/jailbreak phrases:** The assembled prompt contains no phrases such as “ignore previous instructions”, “disregard prior”, or “you are now”. Only the neutral session header and assistant instructions/context are used.

---

## 4. Sanitization gaps

**Current sanitization (contentSafety/prepare.ts):**
- **Tier 1** is applied to `messages[].content` and `selectionSummary` only: strip URL params/fragments, collapse base64/hex blobs in text, deduplicate long blocks.
- **Tier 2/3** apply redaction or replace selection with screen index; again only to message text and selectionSummary.

**Gaps:**
1. **Images (data URLs):** `request.images` is **not** sanitized. For Proxy, full `dataUrl` strings (base64) are sent in the JSON body. Large or numerous images can trigger content filters and are not clamped or stripped by the current pipeline.
2. **Preamble in first user message:** Sanitization runs on the **combined** first user message (preamble + user). If the preamble is derived from promptMarkdown that contains risky patterns (e.g. embedded examples with URLs or long runs), Tier 1 still runs on the whole string, but there is **no separate budget or flag for preamble** vs user text, and no dedicated strip of `data:` URLs inside that combined string.
3. **Server-side KB/DS (Internal API):** When the backend injects content from `kbName`, the client cannot sanitize or budget it. Only the backend can reduce or sanitize that context.
4. **Explicit safety assertions:** There is no final check before send that no `data:image/` or long base64 runs remain in the payload (e.g. in message text or in images array). Adding a single “assemble → sanitize → budget → assert → send” pipeline closes this.

---

## 5. Why "Hello?" can be blocked (Internal API / content-blocker)

1. **Preamble:** The first user message is `preamble + "Hello?"`. If `getShortInstructions(assistant)` pulls from promptMarkdown that includes risky patterns (URLs, tokens, long numbers, or accidental base64-like snippets), the **combined** string may trigger the filter even though the user only said "Hello?".
2. **Server-side injection:** The backend may inject large KB/DS when it sees `kbName: 'figma'`. If that injected content is large or contains patterns content-blocker flags, the **total** prompt (user message + server-injected context) can be blocked.
3. **No client-side budget:** Without per-segment and total caps, the client can send a very long preamble + user text; combined with server-injected context, the total prompt size or content can exceed policy.

**Mitigations (implemented in prompt pipeline):**
- Treat preamble separately in assembly/budgets so it can be capped and flagged.
- Sanitize all text (strip HTML, clamp data URLs and base64-like runs, shorten huge JSON/log blocks).
- Apply budgets (total + per-segment) before send.
- One fallback retry on CONTENT_FILTER with minimal payload (no selectionSummary, no images; minimal preamble + user only); if backend supports omitting KB (e.g. empty kbName), use that on fallback.

---

## 6. Isolation test matrix

Use this matrix to test at work without verbose logs. Each dimension can be toggled where supported.

| kbName | selection | images | fallback | Notes |
|--------|-----------|--------|----------|--------|
| on | off | off | off | Baseline: only message + preamble; backend may inject KB. |
| on | on | off | off | selectionSummary in request (Proxy only; Internal API ignores it). |
| on | on | on | off | selectionSummary + images (Proxy). Internal API: images stripped by provider. |
| on | off | off | on | After CONTENT_FILTER: one retry with minimal payload, fallback=1. |
| off* | off | off | off | *Requires backend/provider support to send empty/omit kbName. |

**How to test:**
- **Hello? with diagnostics on:** Send "Hello?" in General Assistant with prompt diagnostics enabled. Confirm one-line diag shows small user segment, bounded preamble, no risky flags (e.g. no DATA_URL, BASE64_RUN).
- **Force selection/images:** Use an assistant that sends selection/images (e.g. Proxy with selection). Confirm diagnostics show flags and clamping when applicable (e.g. DATA_URL or OVER_BUDGET if limits hit).
- **Trigger fallback:** Cause a CONTENT_FILTER (e.g. paste risky content or rely on server-side block). Confirm second attempt uses minimal payload and diag shows `fallback=1`, reduced segments.

---

## 7. Minimal test checklist (work)

Use these checks without verbose logs or raw prompt dumps.

1. **"Hello?" with diagnostics on**
   - In `custom/config.json` set `llm.promptDiagnostics.enabled` to `true`.
   - In General Assistant send "Hello?".
   - Confirm one-line diag appears (e.g. below the input) with small `user=` segment and bounded `preamble=`; no risky flags (e.g. no `DATA_URL`, `BASE64_RUN`).
   - Copy the line with the Copy button; paste elsewhere to verify no raw prompt or base64.

2. **Force selection/images**
   - Use an assistant that sends selection (and, for Proxy, images).
   - Confirm diagnostics show flags and trims when applicable (e.g. `DATA_URL` or `OVER_BUDGET` if limits hit).
   - Confirm no raw prompt text or base64 in the UI.

3. **Trigger fallback path**
   - Cause a CONTENT_FILTER (e.g. paste risky content or rely on server-side block).
   - Confirm second attempt uses minimal payload and diag shows `fallback=1`, reduced segments (e.g. small `ctx=0`, no images).

4. **Preview**
   - No verbose dumps, no raw prompt text, no base64 in UI or default logs.

5. **Enterprise-safe prompt (no override/jailbreak language)**
   - Send "Hello?" in General Assistant (Internal API / content-blocker).
   - Confirm the request succeeds (no content-filter block from preamble).
   - Confirm the assembled prompt contains **no** phrases such as "ignore previous instructions", "disregard prior", or "you are now". The preamble uses only the safe session header and assistant context.

6. **Assistant change = new session**
   - Switch to Assistant A, send one message, get a reply.
   - Switch to Assistant B; send "Hello?".
   - Confirm the message is treated as first-in-session for B (safe session header + B’s context prepended) and that no A context bleeds into the request.

---

## 8. References

- **Recovery:** `src/core/contentSafety/recovery.ts` — single entry for all LLM sends.
- **Prepare (Tier 1/2/3):** `src/core/contentSafety/prepare.ts` — text-only sanitization today.
- **Pipeline:** `src/core/llm/promptPipeline.ts` — assemble, sanitize, budgets, build, diagnose.
- **Internal API:** `src/core/provider/internalApiProvider.ts` — payload: `message`, `kbName` only (omit `kbName` when `minimalForContentFilter`).
- **Proxy:** `src/core/provider/proxyProvider.ts` and `src/core/proxy/client.ts` — payload includes `messages`, `selectionSummary`, `images`.
- **Preamble:** `main.ts` — `SESSION_HEADER_SAFE` constant and preamble prepended to first user message (general and quick-action paths) before `sendChatWithRecovery`. No instruction-override or jailbreak language.
