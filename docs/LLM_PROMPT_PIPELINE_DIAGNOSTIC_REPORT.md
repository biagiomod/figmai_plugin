# LLM Prompt Pipeline — Diagnostic Report

**Purpose:** Pinpoint why Azure CONTENT_FILTER can trigger even for "Hello?" in the work environment; document exact wire payloads, risky-content sources, and safe defaults.

---

## 1. Every callsite into sendChatWithRecovery and what each sends

**Single entry point:** All outbound LLM traffic goes through `sendChatWithRecovery(provider, request, options)`. There is no other path to `provider.sendChat`.

| Call site | File:line | messages | selectionSummary | images | kbName (effective) |
|-----------|-----------|----------|------------------|--------|---------------------|
| General assistant (first send) | `main.ts:563` | finalChatMessages (preamble + user in first) | selectionContext?.selectionSummary | selectionContext?.images | Internal: figma; Proxy: none |
| General assistant (handler callback) | `main.ts:593` | req.messages | req.selectionSummary ?? selectionContext | (from req) | same |
| Quick action (Design Workshop / Critique / other) | `main.ts:702, 732, 764` | req.messages | req.selectionSummary | (from req) | same |
| Quick action (direct flow) | `main.ts:956` | chatMessages (preamble + user when Internal API) | selectionContext.selectionSummary | selectionContext.images | same |
| Quick action (handler callback) | `main.ts:987` | req.messages | req.selectionSummary | (from req) | same |
| Analytics Tagging (capture action) | `main.ts:1162` | req.messages | req.selectionSummary | (from req) | same |
| Analytics Tagging (screenshot add row) | `main.ts:1218` | req.messages | req.selectionSummary | (from req) | same |
| Design Workshop repair | `designWorkshop.ts:452` | repairMessages | (none in repair) | (none) | same |
| Design Critique repair | `designCritique.ts:498` | repairMessages | (none in repair) | (none) | same |

**Notes:**
- **messages:** Always an array of `{ role, content }`. For Internal API, preamble is prepended to the first user message content in main.ts before the request is built; pipeline then splits preamble from user when `options.assistantPreamble` is set (for budgeting/flags only; wire payload still has merged first user message).
- **selectionSummary:** Set when selection context is built (`buildSelectionContext`); passed in request. Internal API does not send it on the wire; Proxy sends it as a separate field.
- **images:** From selection context when vision is used. Internal API: not sent (supportsImages: false). Proxy: sent as `images[]` with full `dataUrl` (base64) unless pipeline drops/clamps them.
- **kbName:** Not a field on ChatRequest. Internal API sets `kbName: 'figma'` in its payload unless `request.minimalForContentFilter === true` (fallback path); Proxy does not send kbName.

---

## 2. Internal API path: how message is assembled and how kbName is applied

**Code:** `src/core/provider/internalApiProvider.ts` → `sendChat(request)`.

**Message assembly:**
1. Client builds `request.messages` (main.ts or handlers). For Internal API, the first user message often contains **preamble + user text** (preamble injected in main.ts).
2. In recovery, the pipeline runs: `assembleSegments` (splits preamble from first user when `assistantPreamble` is provided), `sanitizeSegments`, `applyBudgets`, `buildMessages`, `applySafetyAssertions`. Output is a ChatRequest with sanitized/budgeted messages.
3. Internal API then does:
   - `userMessages = request.messages.filter(m => m.role === 'user').map(m => m.content).join('\n\n')`
   - Wire payload: `{ type: 'generalChat', message: userMessages [, kbName: 'figma'] }`
4. So the **wire message** is the concatenation of all user-role message contents (after pipeline). No selectionSummary or images are sent.

**kbName application:**
- When `request.minimalForContentFilter` is **false** (normal path): payload includes `kbName: 'figma'`.
- When `request.minimalForContentFilter` is **true** (CONTENT_FILTER fallback): payload **omits** kbName so the backend does not inject KB/DS on retry.
- Backend is assumed to inject knowledge base and/or design system content when kbName is present. The client cannot sanitize that server-injected content.

**Can backend injection cause "Hello?" blocks?**
- **Yes.** If the backend injects large or risky content (e.g. long text, URLs, token-like strings, or patterns that Azure flags) when it sees `kbName: 'figma'`, the **total** prompt (client message + server-injected context) can trigger CONTENT_FILTER even when the client sends only "Hello?" plus a short preamble.
- Mitigations on the client: (1) Sanitize and budget everything we send (pipeline). (2) On first CONTENT_FILTER, one retry with minimal payload and **no** kbName (fallback) so backend injection is avoided on retry.

---

## 3. All possible "hidden risky patterns" sources

| Source | Where it enters | Risk | Pipeline handling |
|--------|-----------------|------|-------------------|
| **Preamble injection** | main.ts: prepended to first user message | Can contain first ~200 chars of promptMarkdown (KB/DS-derived); URLs, tokens, long runs | Split in assembleSegments when assistantPreamble set; sanitize + budget asst segment; no permanent unmerge on wire |
| **KB/DS merge (server)** | Backend when kbName present | Server injects full KB/DS; not visible to client | Avoid on fallback: omit kbName when minimalForContentFilter |
| **Selection summaries** | buildSelectionContext → request.selectionSummary | Long text, node names, metrics; can contain URLs or structured blobs | Sanitize (HTML, data URLs, base64); budget ctx; drop on fallback |
| **Images / data URLs** | selectionContext.images → request.images | Full base64 data URLs in Proxy payload | sanitizeSegments drops images and flags DATA_URL; applySafetyAssertions strips any remaining data:image/ |
| **Long base64 runs** | In any message or selectionSummary text | Azure/content filters flag long encoded runs | Collapse to placeholders in sanitizeSegments; assert no long base64 in applySafetyAssertions |
| **Huge JSON/log blocks** | Handlers or user paste | Very long lines or blocks | Clamp in sanitizeSegments (HUGE_JSON, LONG_LINE); budget |
| **HTML** | User or context | Tags can confuse or trigger filters | Strip in sanitizeSegments |
| **Repeated URLs / many URLs** | selectionSummary or messages | MANY_URLS flag; some filters sensitive to URL count | Flag in sanitizeSegments; no full URL list in diagnostics |
| **Over-budget segments** | Any segment | Total or per-segment overflow | applyBudgets caps and records trims; OVER_BUDGET flag |

---

## 4. Test matrix

| provider | kbName on/off | selection on/off | images on/off | fallback on/off | Notes |
|----------|---------------|------------------|---------------|-----------------|--------|
| internal-api | on | off | off | off | Normal: message + kbName; backend may inject. |
| internal-api | on | on | off | off | selectionSummary not sent on wire; only in pipeline for ctx budget. |
| internal-api | off | off | off | on | Fallback: minimal message, no kbName (minimalForContentFilter=true). |
| openai (proxy) | n/a | off | off | off | messages only. |
| openai (proxy) | n/a | on | off | off | messages + selectionSummary. |
| openai (proxy) | n/a | on | on | off | messages + selectionSummary + images; pipeline drops images by default (imagesBytes: 0) or clamps. |
| either | — | — | — | on | One retry only; no selectionSummary, no images; Internal API: no kbName. |

**How to test at work (no verbose notes):**
1. **Hello? + diagnostics:** Set `llm.promptDiagnostics.enabled: true` in custom/config.json. Send "Hello?" in General Assistant. Copy the one-line diag; confirm small user= and bounded preamble=, no DATA_URL/BASE64_RUN.
2. **Fallback:** Trigger CONTENT_FILTER (e.g. risky paste or rely on server block). Confirm second attempt succeeds and diag shows `fallback=1`, reduced ctx/images.
3. **Proxy + images:** Use Proxy with selection that exports images. Confirm diag shows flags/trims and no raw base64 in UI; images dropped or clamped.
4. **Build:** Run `npm run build`; must pass.

---

## 5. Minimal safe defaults and what must remain for quality

**Safe defaults (already in place):**
- **llm.promptDiagnostics.enabled:** false (no diagnostics in UI unless opted in).
- **llm.promptDiagnostics.level:** "compact" when enabled (one-line + optional details table; no raw prompt).
- **DEFAULT_BUDGETS:** total 40k, preamble/asst 8k, user 8k, ctx 8k, logs 2k, imagesBytes 0 (images dropped unless budget increased).
- **Fallback:** One retry only; minimal message; no selectionSummary, no images; Internal API: no kbName.
- **Safety assertions:** Before send, no `data:image/` or long base64 runs remain in request (applySafetyAssertions).

**What must remain for quality:**
- Preamble and user text must still be sent so the model has assistant context and the actual question; we only sanitize and budget, not remove.
- Selection context (summary) is valuable for design/critique; we cap size and drop only on fallback.
- Proxy image path: either drop (current default) or cap by count/bytes so huge dataUrl payloads are never sent unclamped.
- Tier 2 / Tier 3 recovery (redaction, screen index) remain after fallback so the plugin can still recover when fallback is insufficient.

**No:** Verbose logs of prompt content; raw prompt or base64 in UI; new network calls; clientStorage/screenshot bytes stored for this pipeline.

---

## 6. Code locations (audit reference)

| Concern | Location |
|---------|----------|
| Single send entry | `src/core/contentSafety/recovery.ts` — sendChatWithRecovery |
| Pipeline | `src/core/llm/promptPipeline.ts` — assembleSegments, sanitizeSegments, applyBudgets, buildMessages, applySafetyAssertions, diagnose |
| Internal API payload | `src/core/provider/internalApiProvider.ts` — sendChat (message, kbName when !minimalForContentFilter) |
| Proxy payload | `src/core/provider/proxyProvider.ts`, `src/core/proxy/client.ts` — messages, selectionSummary, images |
| Preamble injection | `main.ts` — preamble prepended to first user message; assistantPreamble passed in options |
| Config | `custom/config.json` — llm.promptDiagnostics; `src/custom/config.ts` — isPromptDiagnosticsEnabled, getPromptDiagnosticsLevel |
| Diagnostics UI | `src/ui.tsx` — PROMPT_DIAG handler; one-line diag + Copy + optional details table |

---

## 7. How to test at work (checklist)

- **Enable diagnostics:** In `custom/config.json` set `"llm": { "promptDiagnostics": { "enabled": true, "level": "compact" } }`.
- **Hello?:** Send "Hello?" in General Assistant. Copy the one-line diag; confirm small `user=` and bounded `preamble=`, no `DATA_URL`/`BASE64_RUN`.
- **Fallback:** If CONTENT_FILTER occurs, confirm second attempt runs and diag shows `fallback=1`; no raw prompt/base64 in UI.
- **Proxy + images:** With Proxy and selection that exports images, confirm diag shows flags/trims; no huge dataUrl sent (images dropped or clamped).
- **Build:** `npm run build` must pass.
- **No leaks:** No raw prompt, base64, or full URL list in UI or default logs; no clientStorage/screenshot writes from pipeline.
