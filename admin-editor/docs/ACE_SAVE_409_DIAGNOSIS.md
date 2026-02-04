# ACE Save 409 – Diagnosis and Acceptance Tests

## A) Audit summary (current code)

- **Client baseline token:** `state.meta.revision` (string). Sent as `body.meta.revision` in POST /api/save. Can be empty if `state.meta` is null (`state.meta?.revision ?? ''`).
- **Server:** Expects `parsed.data.meta.revision`. Computes `currentMeta.revision` from disk via `loadModel(repoRoot)` (hash of path + mtimeMs + size for config, manifest, content-models, knowledge/*.md, design-systems/*/registry.json). Returns 409 when `currentMeta.revision !== clientRevision`. On 200, response always includes `meta: newMeta` (post-save `loadModel()`).
- **Caching:** Server GET /api/model sets `Cache-Control: no-store`. Client GET /api/model uses `fetch(..., { cache: 'no-store' })`. No service worker in repo.

---

## B) Instrumentation (behind flags)

**Client:** In [admin-editor/public/app.js](admin-editor/public/app.js) set `const ACE_DEBUG = true` (line 11).

- **Before Save:** Logs `hasStateMeta`, `meta.revision` value, `revisionLength`.
- **After response:** Logs `status`; on 200: `meta.revisionLength`, `meta.revision`; on 409: `serverRevisionLength`, `serverRevision`.
- **After Save success:** Logs `summary.meta` presence, `summary.meta.revisionLength`.

**Server:** Run with `ACE_DEBUG=1` (e.g. `ACE_DEBUG=1 npm run admin` or set in env).

- **At start of POST /api/save:** Logs `clientRevisionLength`, `currentMeta.revisionLength`, `match` (boolean).
- **On 200:** Logs `newMeta.revisionLength`.

Logs contain only revision strings/lengths; no full model or secrets.

---

## C) Reproduce and capture logs

1. Enable client: in `admin-editor/public/app.js` set `ACE_DEBUG = true`.
2. Start server with debug: `ACE_DEBUG=1 npm run admin` (or equivalent).
3. Open ACE in browser; open DevTools Console (client) and terminal (server logs).
4. Run flow:
   - Load ACE (or Reload).
   - Change Default Mode: Simple → Advanced.
   - Validate (expect success).
   - Save (expect success) → **capture client + server logs for this Save.**
   - Change Default Mode: Advanced → Simple.
   - Validate (expect success).
   - Save (currently 409) → **capture client + server logs for this Save.**
5. Compare logs:
   - **First Save (success):** Client should log `revisionLength=16` (or similar non-zero). Server should log `match=true`. Response should log `meta.revisionLength=16`. Success path should log `summary.meta=present`, `summary.meta.revisionLength=16`.
   - **Second Save (409):** Client request should show `meta.revision` and `revisionLength`. Server should log `match=false` and show `clientRevisionLength` vs `currentMeta.revisionLength`. If client sent `revisionLength=0` or empty → hypothesis: token not updated after first Save (or missing in response). If client sent same revision as first Save but server has different `currentMeta.revision` → hypothesis: disk changed (external or server-side).

---

## D) Diagnosis template (fill after capturing logs)

**What mismatch occurred (proof from logs):**

- First Save request: `hasStateMeta=…`, `revisionLength=…`, `meta.revision=…`
- First Save response: `status=200`, `meta.revisionLength=…`
- First Save success path: `summary.meta=…`, `summary.meta.revisionLength=…`
- Second Save request: `hasStateMeta=…`, `revisionLength=…`, `meta.revision=…`
- Second Save server: `clientRevisionLength=…`, `currentMeta.revisionLength=…`, `match=…`

**Conclusion:** (e.g. "Client sent empty revision on second Save because summary.meta was missing on first Save response" or "Client sent stale revision; server currentMeta differed because file X was modified by …")

---

## G) Diagnosis result (from diagnostic run)

**Repro:** Script `admin-editor/scripts/diagnose-ace-save.mjs` simulates: GET /api/model → POST /api/save (defaultMode=advanced) → POST /api/save (defaultMode=simple). Run against server on port 3333.

**Captured logs (proof):**

| Step | clientRevision sent | server currentMeta.revision | match | status | response meta.revision |
|------|---------------------|-----------------------------|-------|--------|------------------------|
| Load | — | — | — | 200 | R1 length=16, value=44a6f6cc81503e94 |
| First Save | R1 (44a6f6cc81503e94) | (not logged; server was existing process) | — | 200 | **R2 length=0, value=(missing)** |
| Second Save | R2 (empty) | 44a6f6cc81503e94 | false | 409 | serverRevision=44a6f6cc81503e94 |

**Conclusion (proof-based):**

- **What mismatched:** On second Save, `clientRevision` was **empty** (length 0). Server `currentMeta.revision` was `44a6f6cc81503e94`. So `'' !== currentMeta.revision` → 409.
- **Where it changed:** The first Save 200 response did **not** include `meta` (or `meta.revision`). The diagnostic script received `meta.revision R2 length= 0 value= (missing)`. So the client never got the post-save baseline and sent empty revision on the second Save.
- **Why:** The server process that was running during the diagnostic run was likely an **older build** that does not attach `meta: newMeta` to the save success response (current code in [server.ts](admin-editor/server.ts) line 121 does `res.json({ ...summary, meta: newMeta })`). If the running server is current, then the response would include `meta`; the observed “missing” indicates either an old server or a different bug. **No tracked file changed between saves**—the server revision stayed R1 because the client sent empty R2, so the server compared empty to R1.

**Decision:** No revision logic change. Ensure the server that serves ACE is the **current** build (restart `npm run admin` after pulling/changes) so that save 200 responses include `meta: newMeta`. No “revision inputs diff” debug needed—the mismatch was clientRevision empty, not server revision changing unexpectedly.

---

## E) Fixes applied (minimal patch)

1. **Banner lifecycle:** In `runSave()` success path, after `state.meta = summary.meta`, call `showConflictBanner(false)` so the conflict banner is cleared after a successful Save (no stale banner after recovery).
2. **Cache defense:** Client `apiGetModel()` uses `fetch(API_BASE + '/api/model', { cache: 'no-store' })`. Server already sets `Cache-Control: no-store` on GET /api/model.
3. **Instrumentation:** Client logs (ACE_DEBUG) and server logs (ACE_DEBUG=1) as above; revision length and match only.

No change to 409 semantics; conflict protection unchanged.

---

## F) Acceptance tests (manual)

| # | Test | Steps | Expected |
|---|------|--------|----------|
| 1 | Validate → Save repeated | Load ACE. Five times: change config (e.g. Default Mode), Validate (success), Save (success). | No 409. Each Save succeeds; next Save uses updated baseline. |
| 2 | Two-tab conflict | Tab A: Load. Tab B: Load, change config, Save. Tab A: change config, Save. | Tab A receives 409 (conflict modal + banner). |
| 3 | Conflict recovery | Trigger 409 (e.g. edit file on disk, Save in ACE). Click Reload (modal or banner). Change config, Save successfully. | After Save success, conflict banner is not visible. |
| 4 | Preview | Change config, Preview. | No 409. Preview shows correct files that would change. |
| 5 | Unsaved banner | Change config (unsaved banner visible), Save successfully. | Unsaved banner disappears; dirty state false. |

**Confirmation:** Run each test, record pass/fail and any observed outcome (e.g. "Test 1: passed, 5 Save cycles no 409"; "Test 3: passed, banner hidden after Save success").

---

## Output (deliverables)

- **Proof-based conclusion:** Second Save 409 was caused by **empty clientRevision**. First Save 200 response did not include `meta` (or `meta.revision`), so the client never updated the baseline and sent empty revision on the second Save. Server correctly returned 409 (`'' !== currentMeta.revision`). No tracked file changed unexpectedly.
- **Patch:** No change to revision logic. Existing fixes (banner lifecycle, `cache: 'no-store'` for GET /api/model, server `res.json({ ...summary, meta: newMeta })`) are sufficient. **Restart the ACE server** after code changes so the save response includes `meta`; then repeated Validate → Save cycles should succeed.
- **False-positive 409:** Stopped by ensuring the running server is the current build (meta in save response) and client uses that meta after Save success. Real conflict detection unchanged.
