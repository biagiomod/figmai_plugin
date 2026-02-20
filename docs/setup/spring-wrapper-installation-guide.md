# Spring Wrapper — Installation & Deployment Guide

Step-by-step guide for running the ACE Admin Config Editor behind the Spring
Boot wrapper using Docker Compose.  No local Node or Java install required for
the main path — everything runs inside containers.

---

## Architecture at a Glance

```text
┌──────────────────────────────────────────────────────────────────────────┐
│  Host machine                                                            │
│                                                                          │
│   Browser ──► :8080  ace-wrapper  (Spring Boot — public entrypoint)      │
│                       │                                                  │
│                       │  /actuator/**    ← handled by Spring directly    │
│                       │  /api/auth/**    ← wrapper-owned auth endpoints  │
│                       │                     (disabled in wrapper mode     │
│                       │                      on Node — returns 403)       │
│                       │                                                  │
│                       │  everything else ← route allowlist + proxy ──►   │
│                       │                                                  │
│                       └──► :3333  ace-node  (Node — internal only)       │
│                                                                          │
│   Routing contract:                                                      │
│     /home/            Product site (generated HTML)                      │
│     /home/admin/      ACE Admin UI (static SPA)                          │
│     /api/auth/*       Wrapper-owned (Spring handles identity)            │
│     /api/model        Read full config model          (GET,  read tier)  │
│     /api/validate     Validate a model payload        (POST, write tier) │
│     /api/save         Persist model to disk           (POST, write tier) │
│     /api/kb/**        Knowledge-base CRUD             (various tiers)    │
│     /api/users        User management                 (GET,  admin tier) │
│     /api/build-info   Health / version                (GET,  public)     │
│                                                                          │
│   Volumes (mutable data that survives container recreation):             │
│     ./../../custom                       plugin customisation files      │
│     ./../../docs                         content-model markdown          │
│     ./../../admin-editor/.backups        automatic save backups          │
└──────────────────────────────────────────────────────────────────────────┘
```

Both services share a **single `WRAPPER_TOKEN`** — a shared secret that the
wrapper injects as `X-ACE-Wrapper-Token` on every proxied request, and Node
validates with constant-time comparison.  If the tokens do not match, Node
returns `403`.

---

## Prerequisites

| Requirement | Minimum version | Check command |
|---|---|---|
| Docker Engine | 24+ | `docker --version` |
| Docker Compose v2 | 2.20+ | `docker compose version` |
| `curl` | any | `curl --version` |
| `jq` (optional) | any | `jq --version` |
| `openssl` (for token generation) | any | `openssl version` |

> **No local Node.js or Java installation is needed.** Both run inside
> containers.  If you later need to run `npm run build` (Figma plugin bundle),
> you can exec into the running Node container (see Step 12).

---

## Part A — Local Docker Run

### Step 1. Obtain the project

Download the ZIP archive and extract it.

```bash
unzip figmai_plugin.zip -d figmai_plugin
cd figmai_plugin
```

**Expected:** You are inside the repo root.  `ls enterprise/ace-spring-wrapper/docker-compose.example.yml` succeeds.

**Failure — "No such file or directory":**
You may be one level too deep.  Run `ls` — if you see another `figmai_plugin/`
directory, `cd figmai_plugin` once more.

---

### Step 2. Copy the environment template

```bash
cp enterprise/ace-spring-wrapper/.env.example enterprise/ace-spring-wrapper/.env
```

**Expected:** File `enterprise/ace-spring-wrapper/.env` now exists and contains
`WRAPPER_TOKEN=dev-wrapper-token-local-only`.

**Failure — `.env.example` not found:**
You are not in the repo root.  Go back to Step 1.

---

### Step 3. (Optional) Generate a strong token

For anything beyond local smoke-testing, replace the dev token:

```bash
NEW_TOKEN=$(openssl rand -hex 32)
echo "WRAPPER_TOKEN=$NEW_TOKEN" > enterprise/ace-spring-wrapper/.env
cat enterprise/ace-spring-wrapper/.env
```

**Expected:** Single line `WRAPPER_TOKEN=<64-char hex string>`.

**Failure — `openssl: command not found`:**
Install OpenSSL (`brew install openssl` / `apt install openssl`), or use any
other method to produce a random hex string of at least 32 characters.

---

### Step 4. Start the stack

```bash
cd enterprise/ace-spring-wrapper
docker compose -f docker-compose.example.yml up --build
```

**Expected (first run takes 3-5 min):**

1. Maven downloads dependencies, builds the wrapper JAR.
2. Node container runs `npm ci`, installs dependencies.
3. You see:
   ```
   ace-node     | Admin Config Editor server at http://0.0.0.0:3333
   ace-node     | Auth mode: wrapper (Spring wrapper — Node login disabled, identity from headers)
   ace-wrapper  | Started AceWrapperApplication in X.XXs
   ```

**Failure — `WRAPPER_TOKEN is required (copy .env.example to .env)`:**
Compose could not resolve `${WRAPPER_TOKEN}`.  Ensure `.env` exists in
`enterprise/ace-spring-wrapper/` and contains a `WRAPPER_TOKEN=...` line.
Re-run Step 2.

**Failure — Spring crashes with "wrapper-token is not configured or still uses
a placeholder":**
The `StartupValidator` rejects known placeholder values (`REPLACE_ME`,
`changeme`, `test`, `secret`, empty).  Use a real token (Step 3).

**Failure — Maven build fails (network/proxy):**
If you are behind a corporate proxy, configure Maven's proxy settings in a
custom `settings.xml` and mount it into the build stage, or pre-build the JAR
externally.

**Failure — `exec format error` on Apple Silicon:**
The Dockerfile uses `eclipse-temurin:17-jre-jammy` (multi-arch).  If you see
this error, pull the latest base image: `docker pull eclipse-temurin:17-jre-jammy`.

---

### Step 5. Wait for health checks to pass

In a second terminal:

```bash
docker compose -f docker-compose.example.yml ps
```

**Expected:** Both `ace-node` and `ace-wrapper` show `healthy`.

If they still show `starting`, wait 30-60 seconds and retry.  The Node
container must finish `npm ci` before its health check passes.

---

### Step 6. Verify the product site

```bash
curl -I http://localhost:8080/home/
```

**Expected:** `HTTP/1.1 200` with `Content-Type: text/html`.

**Failure — `404`:**
The wrapper's route allowlist requires `/home/**` to be present.  Check
`application.yml` → `ace.proxy.allowlist.public` includes `GET /home/**`.

**Failure — `502 Upstream unavailable`:**
Node is not ready yet or crashed.  Check `docker compose logs ace-node`.

---

### Step 7. Verify the ACE Admin UI

```bash
curl -I http://localhost:8080/home/admin/
```

**Expected:** `HTTP/1.1 200` with `Content-Type: text/html`.

Verify that static assets are reachable:

```bash
curl -I http://localhost:8080/home/admin/app.js
curl -I http://localhost:8080/home/admin/styles.css
curl -I http://localhost:8080/home/admin/fonts.css
```

**Expected:** All three return `200`.

**Failure — `404` on `/home/admin/`:**
Check that the allowlist includes `GET /home/admin/**`.

**Failure — `200` on `/home/admin/` but `404` on asset files:**
The Node static middleware serves from `admin-editor/public/`.  Verify those
files exist: `docker compose exec ace-node ls /workspace/admin-editor/public/`.

---

### Step 8. Verify wrapper-owned auth

```bash
curl -s http://localhost:8080/api/auth/me | jq .
```

**Expected (dev-stub-auth mode):**
```json
{
  "user": {
    "id": "...",
    "username": "dev-user@example.com",
    "role": "admin"
  },
  "allowedTabs": ["..."]
}
```

**Without jq:**
```bash
curl -s http://localhost:8080/api/auth/me
```

**Failure — `403 "Auth endpoints disabled in wrapper mode"`:**
This means the request reached **Node** instead of being handled by the
wrapper.  This should not happen — `/api/auth/**` is a wrapper-owned endpoint
that bypasses the proxy.  Verify the Spring `ProxyFilter` is running
(check logs for `ProxyFilter` references).

**Failure — `401`:**
Auth is enabled but no identity is being injected.  Verify
`ACE_SECURITY_DEVSTUBAUTH=true` and `SPRING_PROFILES_ACTIVE=dev` in the
compose file.

---

### Step 9. Verify API read endpoints

```bash
curl -i http://localhost:8080/api/model
```

**Expected:** `200` with JSON containing `{ "model": { ... }, "meta": { ... }, "validation": { ... } }`.

```bash
curl -i http://localhost:8080/api/kb/registry
```

**Expected:** `200` with JSON containing `{ "knowledgeBases": [ ... ] }`.

```bash
curl -i http://localhost:8080/api/users
```

**Expected:** `200` with JSON containing `{ "users": [ ... ] }`.
Requires admin role — works with dev-stub-auth since the stub user is admin.

**Failure — `403 Insufficient privileges`:**
The dev-stub user's role does not meet the route tier.  Check compose env vars
and the group-to-role mapping.

**Failure — `404 Route not allowed`:**
The method+path is not in the allowlist.  Check `application.yml`.

---

### Step 10. Validate a model (POST /api/validate)

`/api/validate` expects the **model object** — that is, the `.model` property
from the `/api/model` response (not the full response).

**With jq:**

```bash
curl -s http://localhost:8080/api/model \
  | jq '.model' \
  | curl -s -X POST http://localhost:8080/api/validate \
      -H 'Content-Type: application/json' \
      -d @- \
  | jq .
```

**Without jq (Node one-liner):**

```bash
curl -s http://localhost:8080/api/model \
  | docker compose exec -T ace-node node -e "
      let d='';process.stdin.on('data',c=>d+=c);
      process.stdin.on('end',()=>process.stdout.write(JSON.stringify(JSON.parse(d).model)))" \
  | curl -s -X POST http://localhost:8080/api/validate \
      -H 'Content-Type: application/json' \
      -d @- \
  | docker compose exec -T ace-node node -e "
      let d='';process.stdin.on('data',c=>d+=c);
      process.stdin.on('end',()=>console.log(JSON.stringify(JSON.parse(d),null,2)))"
```

**Expected:**
```json
{
  "errors": [],
  "warnings": []
}
```

(Or a list of validation errors/warnings if the current config has issues.)

**Failure — `400` with schema errors:**
The payload does not match the `adminEditableModelSchema`.  Make sure you are
sending `.model` (not the full response, which includes `meta` and
`validation`).

---

### Step 11. Save a model (POST /api/save)

`/api/save` expects the full `/api/model` response **minus the `validation`
key**, wrapped as `{ model, meta }`.

**Dry-run first (recommended — writes nothing to disk):**

**With jq:**

```bash
curl -s http://localhost:8080/api/model \
  | jq 'del(.validation)' \
  | curl -s -X POST 'http://localhost:8080/api/save?dryRun=1' \
      -H 'Content-Type: application/json' \
      -d @- \
  | jq .
```

**Without jq (Node one-liner):**

```bash
curl -s http://localhost:8080/api/model \
  | docker compose exec -T ace-node node -e "
      let d='';process.stdin.on('data',c=>d+=c);
      process.stdin.on('end',()=>{
        const o=JSON.parse(d);delete o.validation;
        process.stdout.write(JSON.stringify(o))
      })" \
  | curl -s -X POST 'http://localhost:8080/api/save?dryRun=1' \
      -H 'Content-Type: application/json' \
      -d @- \
  | docker compose exec -T ace-node node -e "
      let d='';process.stdin.on('data',c=>d+=c);
      process.stdin.on('end',()=>console.log(JSON.stringify(JSON.parse(d),null,2)))"
```

**Expected (dry run):**
```json
{
  "success": true,
  "filesWritten": [],
  "backupsCreatedAt": "",
  "backupRoot": "...",
  "generatorsRun": [],
  "errors": [],
  "nextSteps": "..."
}
```

**Actual save (remove `?dryRun=1`):**

```bash
curl -s http://localhost:8080/api/model \
  | jq 'del(.validation)' \
  | curl -s -X POST http://localhost:8080/api/save \
      -H 'Content-Type: application/json' \
      -d @- \
  | jq .
```

**Expected:** `200` with `"success": true` and a list of files written.

**Failure — `409 "Files changed since load":`**
Another save happened between your `GET /api/model` and `POST /api/save`.
Re-fetch the model and retry.

**Failure — `400` schema errors:**
Ensure you are sending `{ model: {...}, meta: {...} }` — the full response
minus `validation`.  Do not double-wrap.

---

### Step 12. Build the Figma plugin bundle (optional)

If you need to rebuild the Figma plugin after saving config changes, exec into
the running Node container:

```bash
docker compose exec ace-node sh -c "npm run build"
```

**Expected output (key lines):**
```
success Typechecked in X.XXXs
success Built in X.XXXs
[check-sync-api] ✅ PASSED
[check-banned-phrases] PASSED
[check-figma-bundle-compat] PASSED
All invariants passed.
```

**Warning — `fatal: not a git repository`:**
This is harmless.  The ZIP distribution has no `.git` directory.  The build
scripts emit this warning when generating `build-info.json` but continue
successfully.  The build output in `build/` is still valid.

**Failure — `npm run build` fails with missing deps:**
Run `npm ci` first: `docker compose exec ace-node sh -c "npm ci && npm run build"`.

---

### Step 13. Stop the stack

```bash
docker compose -f docker-compose.example.yml down
```

Add `-v` to also remove the `ace_node_modules` named volume (forces fresh
`npm ci` on next start):

```bash
docker compose -f docker-compose.example.yml down -v
```

---

## Part B — WRAPPER_TOKEN Management

### Token Rules

1. **Single shared value.** The token in `ace-wrapper` (`ACE_PROXY_WRAPPER_TOKEN`)
   and `ace-node` (`ACE_WRAPPER_TOKEN`) must be **identical**.  The compose
   file reads both from the same `${WRAPPER_TOKEN}` env var via the `.env` file.

2. **Fail-fast on bad tokens.** Both services reject placeholder tokens at
   startup:
   - Spring `StartupValidator` rejects: empty, `REPLACE_ME_LONG_RANDOM`,
     `REPLACE_ME`, `changeme`, `test`, `secret`.
   - Node `validateWrapperConfig()` rejects the same set plus missing values.

3. **Mismatch = 403 from Node.** If the tokens differ, every proxied request
   returns `403` from Node.

### Token Rotation

```bash
# 1. Generate new token
NEW_TOKEN=$(openssl rand -hex 32)
echo "WRAPPER_TOKEN=$NEW_TOKEN" > enterprise/ace-spring-wrapper/.env

# 2. Recreate BOTH containers so they pick up the new value
cd enterprise/ace-spring-wrapper
docker compose -f docker-compose.example.yml up --build --force-recreate -d

# 3. Verify
curl -s http://localhost:8080/api/auth/me | jq .user.username
```

> **`--force-recreate` is mandatory** — a plain `up` may reuse an existing
> container that still has the old token in its environment.

---

## Part C — Server Deployment (Generic Linux)

### Step 14. Transfer the archive

```bash
scp figmai_plugin.zip deploy@yourserver:/opt/apps/
```

### Step 15. Extract on the server

```bash
ssh deploy@yourserver
cd /opt/apps
unzip figmai_plugin.zip -d figmai_plugin
cd figmai_plugin
```

### Step 16. Create a production token

```bash
openssl rand -hex 32 > /opt/apps/.ace-wrapper-token
chmod 600 /opt/apps/.ace-wrapper-token

# Write .env
echo "WRAPPER_TOKEN=$(cat /opt/apps/.ace-wrapper-token)" \
  > enterprise/ace-spring-wrapper/.env
chmod 600 enterprise/ace-spring-wrapper/.env
```

### Step 17. Start the stack

```bash
cd enterprise/ace-spring-wrapper
docker compose -f docker-compose.example.yml up --build -d
```

Verify health:

```bash
docker compose -f docker-compose.example.yml ps
# Both services should show "healthy" within ~60s
```

### Step 18. Verify from the server

```bash
curl -I http://localhost:8080/home/
curl -I http://localhost:8080/home/admin/
curl -s http://localhost:8080/api/auth/me
curl -s http://localhost:8080/api/build-info
```

### Persistence Paths

The compose file mounts the repo root into the Node container at `/workspace`.
These directories contain mutable data that should survive container recreation:

| Host path (relative to repo root) | Container path | Contents |
|---|---|---|
| `custom/` | `/workspace/custom` | Plugin customisation (config.json, KBs, registries) |
| `docs/` | `/workspace/docs` | Content-model markdown |
| `admin-editor/.backups/` | `/workspace/admin-editor/.backups` | Automatic save backups |

Because the compose bind-mount is `../../:/workspace` (the entire repo root),
all three directories are already persisted to the host filesystem.  Edits made
via the ACE UI and saved through `/api/save` write directly to these host
paths.

> **If you move the repo directory**, update the volume mount in
> `docker-compose.example.yml` accordingly.

### Reverse Proxy Notes

If placing an Nginx/Apache/Caddy reverse proxy in front of port 8080:

- **Preserve the `/home` prefix.** The Spring wrapper and Node both expect
  routes starting with `/home/` and `/api/`.  Do not strip or rewrite these
  prefixes.
- **WebSocket support** is not required (no WS endpoints).
- **Recommended headers to forward:** `Host`, `X-Forwarded-For`,
  `X-Forwarded-Proto`.
- **Timeout:** Set proxy read timeout ≥ 30s to match the wrapper's default
  `read-timeout-ms`.

Example Nginx location block:

```nginx
location / {
    proxy_pass http://127.0.0.1:8080;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_read_timeout 60s;
}
```

### Log Inspection

```bash
# All logs
docker compose -f docker-compose.example.yml logs -f

# Wrapper only (Spring)
docker compose -f docker-compose.example.yml logs -f ace-wrapper

# Node only
docker compose -f docker-compose.example.yml logs -f ace-node
```

Audit log entries (JSONL format) appear in the wrapper's stdout by default.
To write to a file instead, set `ACE_AUDIT_MODE=file` and
`ACE_AUDIT_LOGPATH=/app/logs/ace-audit.jsonl` in the compose file, and mount
a host directory for persistence.

---

## Troubleshooting

### 403 from every API call — "Wrapper token mismatch"

**Symptom:** Node returns `403` on all proxied requests.  The wrapper itself
starts fine.

**Cause:** `ACE_WRAPPER_TOKEN` (Node) does not match `ACE_PROXY_WRAPPER_TOKEN`
(Spring).

**Fix:**
1. Verify both values resolve from the same `.env` file:
   ```bash
   docker compose exec ace-node printenv ACE_WRAPPER_TOKEN
   docker compose exec ace-wrapper printenv ACE_PROXY_WRAPPER_TOKEN
   ```
   They must be identical.
2. If they differ, fix `.env` and recreate:
   ```bash
   docker compose -f docker-compose.example.yml up --build --force-recreate -d
   ```

---

### 403 on /api/auth/me — "Auth endpoints disabled in wrapper mode"

**Symptom:** `curl http://localhost:8080/api/auth/me` returns `403` with
`"Auth endpoints disabled in wrapper mode"`.

**Cause:** The request reached Node's `/api/auth/**` catch-all instead of being
handled by the Spring wrapper.  This happens when the wrapper's
`ProxyFilter` does not intercept `/api/auth/**`.

**Fix:** This should not occur in normal operation — `ProxyFilter` explicitly
passes `/api/auth/**` to the Spring filter chain.  Check wrapper logs for
startup errors.

---

### Empty ACE panels / no data loaded

**Symptom:** `/home/admin/` loads but panels are empty.

**Cause:** Usually a 401/403 on the underlying API calls (`/api/model`,
`/api/auth/me`).

**Fix:**
1. Open browser DevTools → Network tab.  Look for failed requests.
2. If `/api/auth/me` returns `401`: auth is not configured.  Ensure
   `ACE_SECURITY_ENABLEAUTH=true` and `ACE_SECURITY_DEVSTUBAUTH=true` (for
   dev) in the compose file.
3. If `/api/model` returns `403`: the dev-stub user's role is too low.  The
   stub user is `admin` by default, so check group-to-role mapping.

---

### 404 on routes that should work

**Symptom:** `curl http://localhost:8080/api/model` returns
`{"error":"Route not allowed."}`.

**Cause:** The method+path is not in the wrapper's route allowlist.

**Fix:** Check `enterprise/ace-spring-wrapper/src/main/resources/application.yml`
→ `ace.proxy.allowlist` and ensure the route is listed under the correct tier.

---

### Node container keeps restarting

**Symptom:** `docker compose ps` shows ace-node restarting.

**Cause:** Usually `npm ci` failures (network issues) or token validation
failure.

**Fix:**
1. Check logs: `docker compose logs ace-node`
2. If "ACE_AUTH_MODE=wrapper requires ACE_WRAPPER_TOKEN": the token env var
   is missing.  Check `.env` file.
3. If `npm ci` fails: check network access.  Behind a corporate proxy, set
   `HTTP_PROXY`/`HTTPS_PROXY` in the compose environment.

---

### Mount/path mismatch — files not found

**Symptom:** Node logs show "ENOENT" errors for config files, or
`/api/model` returns `500`.

**Cause:** The volume mount `../../:/workspace` assumes `docker compose` is
run from `enterprise/ace-spring-wrapper/`.  If you run from a different
directory, the relative path resolves incorrectly.

**Fix:** Always `cd enterprise/ace-spring-wrapper` before running compose
commands, or change the volume mount to an absolute path.

---

### `npm run build` warns "fatal: not a git repository"

**Symptom:** During `npm run build`, you see:
```
fatal: not a git repository (or any of the parent directories): .git
```

**Cause:** The ZIP distribution does not include `.git`.  The build-info
generator tries to read the git commit hash and falls back gracefully.

**Fix:** This is a **harmless warning**, not an error.  The build continues
and produces valid output in `build/`.

---

### 502 Upstream unavailable

**Symptom:** Wrapper returns `502` on proxied routes.

**Cause:** Node is not running or not reachable at `http://ace-node:3333`.

**Fix:**
1. Check Node container status: `docker compose ps ace-node`
2. Check Node logs: `docker compose logs ace-node`
3. Wait for Node's health check to pass (up to 60s on first start due to
   `npm ci`).

---

### 429 Too Many Requests

**Symptom:** Wrapper returns `429` after many rapid requests.

**Cause:** Rate limiter (100 requests per 60-second window per user/IP).

**Fix:** Wait 60 seconds.  For load testing, temporarily increase the limit
in `application.yml` or disable rate limiting.

---

## Quick Reference — All Curl Checks

Run these from the host machine after `docker compose up`:

```bash
# Product site
curl -I http://localhost:8080/home/

# ACE Admin UI + assets
curl -I http://localhost:8080/home/admin/
curl -I http://localhost:8080/home/admin/app.js
curl -I http://localhost:8080/home/admin/styles.css
curl -I http://localhost:8080/home/admin/fonts.css

# Auth (wrapper-owned)
curl -s http://localhost:8080/api/auth/me | jq .

# Read endpoints
curl -i http://localhost:8080/api/model
curl -i http://localhost:8080/api/kb/registry
curl -i http://localhost:8080/api/users

# Build info (public, no auth)
curl -s http://localhost:8080/api/build-info | jq .

# Validate (send .model from /api/model)
curl -s http://localhost:8080/api/model \
  | jq '.model' \
  | curl -s -X POST http://localhost:8080/api/validate \
      -H 'Content-Type: application/json' -d @- | jq .

# Save dry-run (send full response minus .validation)
curl -s http://localhost:8080/api/model \
  | jq 'del(.validation)' \
  | curl -s -X POST 'http://localhost:8080/api/save?dryRun=1' \
      -H 'Content-Type: application/json' -d @- | jq .
```

---

## Appendix — Secondary LLM Prompt

Copy and paste the block below into a fresh LLM conversation if you need
automated help deploying or debugging this stack.

````text
You are helping me deploy a Docker Compose stack for a Node-based admin config
editor (ACE) behind a Spring Boot reverse-proxy wrapper.

Architecture:
- ace-wrapper (Spring Boot, :8080) — public entrypoint, owns /api/auth/*,
  enforces route allowlist + RBAC, proxies everything else to Node.
- ace-node (Node 22, :3333) — internal only, runs the ACE admin-editor.
  In wrapper mode (ACE_AUTH_MODE=wrapper) it disables its own login endpoints
  and trusts identity headers from the wrapper.
- Both services share a single WRAPPER_TOKEN (env var).  Mismatch = 403.

Routing contract:
- /home/              — product site (dynamic HTML from Node)
- /home/admin/        — ACE Admin UI (static SPA from admin-editor/public/)
- /api/auth/*         — handled by Spring wrapper (bypasses proxy to Node)
- /api/model          — GET: returns { model, meta, validation }
- /api/validate       — POST: body = the .model object from /api/model
- /api/save           — POST: body = { model, meta } (full /api/model minus .validation)
- /api/kb/registry    — GET: returns knowledge base list
- /api/users          — GET: returns user list (admin only)
- /api/build-info     — GET: public health/version

Key files (relative to repo root):
- enterprise/ace-spring-wrapper/docker-compose.example.yml
- enterprise/ace-spring-wrapper/.env.example  (copy to .env)
- enterprise/ace-spring-wrapper/Dockerfile
- enterprise/ace-spring-wrapper/src/main/resources/application.yml  (allowlist)
- admin-editor/server.ts  (Node server)
- package.json  (npm run build for Figma plugin)

Verification steps after docker compose up:
1. curl -I http://localhost:8080/home/                 → 200
2. curl -I http://localhost:8080/home/admin/           → 200
3. curl -I http://localhost:8080/home/admin/app.js     → 200
4. curl -I http://localhost:8080/home/admin/styles.css → 200
5. curl -I http://localhost:8080/home/admin/fonts.css  → 200
6. curl -s http://localhost:8080/api/auth/me           → 200 with user JSON
7. curl -i http://localhost:8080/api/model             → 200 with model JSON
8. curl -i http://localhost:8080/api/kb/registry       → 200
9. curl -i http://localhost:8080/api/users             → 200 (admin)
10. Validate pipeline:
    curl -s http://localhost:8080/api/model | jq '.model' \
      | curl -s -X POST http://localhost:8080/api/validate \
          -H 'Content-Type: application/json' -d @-
    → { "errors": [], "warnings": [] }
11. Save dry-run pipeline:
    curl -s http://localhost:8080/api/model | jq 'del(.validation)' \
      | curl -s -X POST 'http://localhost:8080/api/save?dryRun=1' \
          -H 'Content-Type: application/json' -d @-
    → { "success": true, ... }

Common failure modes:
- 403 on all API calls: WRAPPER_TOKEN mismatch between containers.
  Fix: ensure .env has one token, then docker compose up --force-recreate.
- Empty ACE panels: 401/403 on /api/auth/me or /api/model.
  Fix: ensure ACE_SECURITY_ENABLEAUTH + ACE_SECURITY_DEVSTUBAUTH in compose.
- 404 on a valid route: not in allowlist (application.yml).
- 502: Node not ready yet; wait for health check or check logs.
- "git not found" warning during npm run build: harmless in ZIP distribution.

Persistence volumes (must survive container recreation):
- custom/                    → plugin config, KBs, registries
- docs/                      → content-model markdown
- admin-editor/.backups/     → automatic save backups

Token rotation requires: docker compose up --build --force-recreate
(both containers must restart to pick up the new token).

My current situation is: [DESCRIBE YOUR ISSUE OR GOAL HERE]
````
