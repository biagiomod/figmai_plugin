# ACE Spring Wrapper — Custom Deployment Guide

> **DEPRECATED.** The Spring Boot ACE wrapper is no longer the active private/work deployment path.
>
> **Current active paths:**
> - **Localhost / local dev:** `npm run admin` (see `admin-editor/README.md`)
> - **Private/work hosted deployment:** static ACE + Config API + AWS Lambda + S3 (see `docs/setup/ace-private-env-setup.md`)
>
> This document is kept as historical reference for teams that deployed the wrapper before this change. Do not start new deployments using this path.

## 1. Architecture and Trust Boundary

Public entrypoint:

- `wrapper:8080` (Spring Boot)

Public URLs:

- Product site: `/home/`
- ACE UI: `/home/admin/`
- Root-relative product assets: `/fonts.css`, `/styles.css`, `/assets/**`

Private internal service:

- `node:3333` (ACE admin-editor, wrapper mode)

Trust boundary:

- External clients must never reach Node directly.
- Wrapper strips ALL inbound identity headers and injects trusted headers to Node:
  - `X-ACE-User` (username from verified principal)
  - `X-ACE-Role` (canonical role derived from groups)
  - `X-ACE-Groups` (comma-separated group list)
  - `X-ACE-Wrapper-Token` (shared secret proving request came from wrapper)
- Node in wrapper mode requires:
  - `X-ACE-User` header (403 if missing)
  - `X-ACE-Wrapper-Token` matching `ACE_WRAPPER_TOKEN` env var, verified with constant-time comparison (403 if missing or invalid)
  - `X-ACE-Role` (canonical role) unless `ACE_ALLOW_GROUPS_FALLBACK=true` is set for dev

Diagram:

```text
Internet / SSO / Identity Provider
            |
            v
   ACE Spring Wrapper (:8080)   <-- only public service
     - Identity from Spring Security principal (OIDC/SAML/pre-auth)
     - NEVER reads identity from HTTP request headers
            |
            | injects: X-ACE-User, X-ACE-Role, X-ACE-Groups, X-ACE-Wrapper-Token
            | strips:  all incoming identity headers before proxying
            v
      ACE Node admin-editor (:3333)  <-- internal only, 127.0.0.1
```

---

## 2. Security Model

### Spring wrapper enforces

- Route allowlist (default-deny for non-allowlisted route/method).
- Path normalization with iterative decoding (max 2 passes) and double-encoded traversal rejection.
- `/api/auth/me` and `/api/auth/bootstrap-allowed` are wrapper-owned endpoints handled by Spring MVC (not proxied to Node).
- RBAC tier gating (public / read / write / admin).
- Rate limiting (100 req/60s per user, fallback per IP).
- Audit log emission (JSONL to stdout or file).
- Security response headers (CSP, X-Frame-Options, X-Content-Type-Options).
- Identity header stripping on all incoming requests (prevents spoofing).

### Production identity model (enableAuth=true, devStubAuth=false)

In production, the wrapper reads identity exclusively from the **Spring Security principal**:

- The principal must be set by an upstream authentication mechanism (OIDC Resource Server, SAML, or a custom pre-authentication filter) configured in `SecurityConfig.java`.
- The wrapper **never reads HTTP request headers** for identity resolution. This eliminates header spoofing attacks.
- If no authenticated principal exists, the request is rejected with 401.
- Username is extracted from `principal.getName()`.
- Groups are extracted from `GrantedAuthority` values (stripping any `ROLE_` prefix).

### Dev stub mode (enableAuth=true, devStubAuth=true)

- Injects a hardcoded test user (`dev-user@example.com`, groups `ace-admins,ace-editors`).
- **Profile-guarded**: only allowed when Spring profile `dev`, `local`, or `test` is active.
- Startup fails with `IllegalStateException` if `dev-stub-auth=true` and no allowed profile is active.

### Node admin-editor (wrapper mode)

- `ACE_AUTH_MODE=wrapper` environment variable activates wrapper mode.
- Blocks `/api/auth/**` with 403 ("disabled in wrapper mode").
- Rejects requests missing `X-ACE-Wrapper-Token` or `X-ACE-User` with 403.
- Validates wrapper token using constant-time comparison (`crypto.timingSafeEqual`).
- Trusts `X-ACE-Role` as canonical role (or falls back to `X-ACE-Groups` if `ACE_ALLOW_GROUPS_FALLBACK=true`).
- Binds to `127.0.0.1` by default in wrapper mode (configurable via `ADMIN_EDITOR_HOST`).

### Node local mode (ACE_AUTH_MODE != wrapper)

Unchanged:

- Cookie/session auth.
- Local `/api/auth/*` endpoints available.
- Existing development workflow on `localhost:3333`.

---

## 3. Startup Failure Conditions

The following misconfigurations cause immediate startup failure (not silent degradation):

| Condition | Component | Error |
|-----------|-----------|-------|
| `ace.proxy.wrapper-token` is empty, null, or a placeholder (`REPLACE_ME_LONG_RANDOM`, `REPLACE_ME`, `changeme`, `test`, `secret`) | Spring `StartupValidator` | `IllegalStateException` with generation instructions |
| `ace.security.dev-stub-auth=true` without profile `dev`, `local`, or `test` active | Spring `DevStubAuthFilter.@PostConstruct` | `IllegalStateException` requiring profile activation |
| `ACE_AUTH_MODE=wrapper` with `ACE_WRAPPER_TOKEN` empty or placeholder | Node `validateWrapperConfig()` | `process.exit(1)` with error message |

Generate a strong wrapper token:

```bash
openssl rand -hex 32
```

---

## 4. Full Config Reference

### Spring wrapper properties (ace.*)

| Property | Default | Description |
|----------|---------|-------------|
| `server.port` | `8080` | Wrapper listen port |
| `ace.routes.site-base-path` | `/home` | Marketing site base path |
| `ace.routes.ace-base-path` | `/home/admin` | ACE UI base path |
| `ace.routes.api-base-path` | `/api` | API base path |
| `ace.proxy.node-base-url` | `http://127.0.0.1:3333` | Internal Node upstream URL |
| `ace.proxy.wrapper-token` | `REPLACE_ME_LONG_RANDOM` | Shared secret injected as `X-ACE-Wrapper-Token`. **Validated at startup; placeholder values are rejected.** |
| `ace.proxy.connect-timeout-ms` | `5000` | Proxy upstream connect timeout |
| `ace.proxy.read-timeout-ms` | `30000` | Proxy upstream read timeout |
| `ace.proxy.max-request-bytes` | `10485760` | Max request payload size (10 MB) |
| `ace.proxy.allowlist.*` | varies | Route allowlist by tier (`public` / `read` / `write` / `admin`) |
| `ace.security.enable-auth` | `false` | Enable wrapper authentication and RBAC |
| `ace.security.dev-stub-auth` | `false` | Inject hardcoded dev identity. **Requires `dev`/`local`/`test` Spring profile.** |
| `ace.security.user-header-name` | `X-ACE-User` | Header name used when **injecting** username downstream to Node |
| `ace.security.groups-header-name` | `X-ACE-Groups` | Header name used when **injecting** groups downstream to Node |
| `ace.security.role-header-name` | `X-ACE-Role` | Header name used when **injecting** canonical role downstream to Node |
| `ace.security.allow-groups-fallback` | `false` | Node-side: allow groups-based role fallback when role header is missing (dev only) |
| `ace.security.trusted-proxy-ips[]` | `[]` | IPs allowed to supply trusted `X-Forwarded-For` (for rate-limit and audit IP resolution) |
| `ace.security.group-to-role-map` | built-in map | Canonical mapping: `group name -> ACE role` (admin, manager, editor, reviewer) |
| `ace.security.headers.content-security-policy` | default CSP | CSP response header |
| `ace.security.headers.x-frame-options` | `DENY` | X-Frame-Options mode |
| `ace.security.headers.x-content-type-options` | `nosniff` | X-Content-Type-Options |
| `ace.audit.enabled` | `true` | Enable audit logging |
| `ace.audit.mode` | `stdout` | Audit output mode (`stdout` or `file`) |
| `ace.audit.log-path` | `./logs/ace-audit.jsonl` | Audit file path when mode is `file` |

Path forwarding behavior:

- The wrapper preserves the incoming path when proxying to Node.
- Requests to `/home/admin`, `/home/admin/`, and `/home/admin/**` are forwarded upstream with the same prefix (no `/home/admin` stripping).

Static asset routing:

- **ACE assets** use relative paths (`fonts.css`, `styles.css`, `app.js`), resolved under `/home/admin/*` by the browser.
- **Product site assets** use root-relative paths (`/fonts.css`, `/styles.css`, `/assets/**`), served by Node at those roots.
- Both `GET` and `HEAD` methods are allowed for all public static routes (HEAD is used by browsers and CDNs for cache validation).
- The allowlist must include root-level patterns (`GET /fonts.css`, `GET /styles.css`, `GET /assets/**`) to proxy product site assets correctly.

### Node wrapper mode environment variables

| Variable | Default | Description |
|----------|---------|-------------|
| `ACE_AUTH_MODE` | `local` | Set to `wrapper` for custom deployments |
| `ACE_WRAPPER_TOKEN` | (none) | Shared secret matching `ace.proxy.wrapper-token`. **Required in wrapper mode; placeholder values rejected at startup.** |
| `ACE_ALLOW_GROUPS_FALLBACK` | `false` | Allow groups-based role resolution when `X-ACE-Role` is missing (dev only) |
| `ADMIN_EDITOR_PORT` | `3333` | Node listen port |
| `ADMIN_EDITOR_HOST` | `0.0.0.0` (local) / `127.0.0.1` (wrapper) | Bind address. Defaults to loopback in wrapper mode. |

---

## 5. Setup Steps

### Prerequisites

- **Node.js 20+** and **npm** (for admin-editor)
- **JDK 17+** and **Maven 3.9+** (for Spring wrapper)
  - macOS: `brew install openjdk@17 maven`
  - Ubuntu/Debian: `sudo apt install openjdk-17-jdk maven`
  - Or use the Docker path (section 6) which bundles both in the build stage.

### A. Node-only local dev (unchanged)

All commands below assume you are at the **repo root** (`figmai_plugin/`).

If you switched between macOS/Linux (or host Docker bind mounts), reset dependencies first to avoid `esbuild` platform mismatch:

```bash
rm -rf node_modules
npm ci
```

```bash
npm run admin
# http://localhost:3333 (cookie/session auth)
```

### B. Wrapper smoke test (auth off)

Generate a token first:

```bash
export WRAPPER_TOKEN=$(openssl rand -hex 32)
```

```bash
# Terminal 1: Node in wrapper mode (from repo root)
ACE_AUTH_MODE=wrapper \
ACE_WRAPPER_TOKEN=$WRAPPER_TOKEN \
npx tsx admin-editor/server.ts

# Terminal 2: Spring wrapper (auth disabled, from repo root)
cd enterprise/ace-spring-wrapper
mvn spring-boot:run \
  -Dspring-boot.run.arguments="--ace.proxy.wrapper-token=$WRAPPER_TOKEN"

# Smoke test
curl -i http://localhost:8080/api/build-info
```

### C. Wrapper dev stub auth

```bash
export WRAPPER_TOKEN=$(openssl rand -hex 32)

# Terminal 1: Node in wrapper mode (from repo root)
ACE_AUTH_MODE=wrapper \
ACE_WRAPPER_TOKEN=$WRAPPER_TOKEN \
npx tsx admin-editor/server.ts

# Terminal 2: Spring with dev stub auth (requires dev profile, from repo root)
cd enterprise/ace-spring-wrapper
mvn spring-boot:run -Dspring-boot.run.arguments="\
--spring.profiles.active=dev \
--ace.security.enable-auth=true \
--ace.security.dev-stub-auth=true \
--ace.proxy.wrapper-token=$WRAPPER_TOKEN"
```

### D. Production mode

- `ace.security.enable-auth=true`
- `ace.security.dev-stub-auth=false`
- Identity comes from the **Spring Security principal** (set by OIDC/SAML/pre-auth), not from HTTP headers.
- Configure your identity provider in `SecurityConfig.java`. Example for JWT:

```java
http.oauth2ResourceServer(oauth2 -> oauth2.jwt(Customizer.withDefaults()));
```

Then in `application.yml`:

```yaml
spring:
  security:
    oauth2:
      resourceserver:
        jwt:
          issuer-uri: https://your-idp.example.com
```

- Groups and username are extracted from the authenticated principal's `GrantedAuthority` values and `getName()`.
- The wrapper maps groups to ACE roles using `ace.security.group-to-role-map` and injects `X-ACE-Role` downstream.

---

## 6. Docker Usage

Use `enterprise/ace-spring-wrapper/docker-compose.example.yml`.

Key topology:

- Host publishes only `8080 -> wrapper`.
- Node service port `3333` is internal (not host-published).
- Wrapper injects wrapper token, role, user, and groups headers on proxied requests.

For local Docker dev, copy `.env.example` to `.env` (contains a dev-only token). For internal/prod, replace with a strong token.
If `WRAPPER_TOKEN` changes, recreate both services so Node and Spring stay in sync.

```bash
cd enterprise/ace-spring-wrapper
cp .env.example .env
# optional: replace WRAPPER_TOKEN in .env with openssl rand -hex 32
docker compose -f docker-compose.example.yml up --build --force-recreate
```

This compose setup uses a dedicated Docker volume for `/workspace/node_modules`, so host `node_modules` is never reused across platforms.

---

## 7. Internal Deployment Checklist

- Set `ACE_AUTH_MODE=wrapper` on Node.
- Publish and verify:
  - `https://<host>/home/` (product site)
  - `https://<host>/home/admin/` (ACE UI)
- Set the same strong token in both places:
  - Node env: `ACE_WRAPPER_TOKEN`
  - Spring env/property: `ACE_PROXY_WRAPPERTOKEN` / `ace.proxy.wrapper-token`
- Keep Node private (`ace-node:3333` internal only, not host published).
- Expose only wrapper publicly (`host:8080 -> ace-wrapper:8080`).
- Set `ACE_SECURITY_ENABLEAUTH=true` and `ACE_SECURITY_DEVSTUBAUTH=false`.
- Configure Spring Security principal source (OIDC/SAML/pre-auth) in `SecurityConfig.java`.
- Ensure `ace.security.group-to-role-map` matches real IdP group names.
- Keep `ACE_ALLOW_GROUPS_FALLBACK=false` in production.
- Reverse proxy must preserve the `/home` prefix when forwarding requests (no path stripping), unless you explicitly support a different base path in both Node and wrapper configs.

---

## 8. Troubleshooting

### Startup failures

| Error | Cause | Fix |
|-------|-------|-----|
| Spring: "wrapper-token is not configured or still uses a placeholder" | `ace.proxy.wrapper-token` is empty or a known placeholder | Generate a real token: `openssl rand -hex 32` |
| Spring: "dev-stub-auth=true is only allowed when a dev/local/test profile is active" | `dev-stub-auth=true` without required profile | Add `--spring.profiles.active=dev` or disable dev stub auth |
| Node: "ACE_AUTH_MODE=wrapper requires ACE_WRAPPER_TOKEN" + exit | `ACE_WRAPPER_TOKEN` env var missing or placeholder | Set `ACE_WRAPPER_TOKEN` to same value as Spring's `ace.proxy.wrapper-token` |

### 401 from wrapper (production mode)

No authenticated Spring Security principal found.

Check:

- OIDC/SAML/pre-auth is configured in `SecurityConfig.java`.
- The identity provider is reachable and issuing valid tokens.
- JWT issuer-uri / SAML metadata is correct.

### 403 from Node (wrapper mode)

- Missing `X-ACE-User` header.
- Missing or invalid `X-ACE-Wrapper-Token`.
- Missing or invalid `X-ACE-Role` (unless `ACE_ALLOW_GROUPS_FALLBACK=true`).

Check:

- `ACE_AUTH_MODE=wrapper` and `ACE_WRAPPER_TOKEN` are set on Node.
- `ace.proxy.wrapper-token` on Spring matches `ACE_WRAPPER_TOKEN` on Node exactly.

### 403 from wrapper (RBAC)

- Route requires higher tier than user's resolved role.
- Group-to-role mapping does not resolve to expected role.

Check:

- `ace.security.group-to-role-map` entries match your identity provider's group names.
- In production: verify the `GrantedAuthority` values on the Spring Security principal.
- In dev stub: hardcoded user is `dev-user@example.com` with groups `ace-admins,ace-editors`.

### /api/auth/* behavior in wrapper deployments

- `GET /api/auth/me` is served by Spring wrapper and returns current identity from wrapper filters.
- `GET /api/auth/bootstrap-allowed` is served by Spring wrapper and returns `{"allowed":false,...}`.
- `POST /api/auth/login` and `POST /api/auth/bootstrap` are disabled at Node when `ACE_AUTH_MODE=wrapper`.
- If `GET /api/auth/me` returns 401, no authenticated identity reached the wrapper (check dev-stub or your SSO principal wiring).

### 404 Route not allowed

- Method/path not in allowlist.
- Path normalization rejected traversal attempt or double-encoded bypass.

### 429 Too Many Requests

- Rate limit: 100 requests per 60-second window.
- Key is `user` (from `ace.user` attribute) first, then `clientIp`.
- Wrapper trusts `X-Forwarded-For` only from IPs in `trusted-proxy-ips`.

### 502 Upstream unavailable

- Node not running or unreachable at `ace.proxy.node-base-url`.
- Check `/actuator/health` for Node backend status.

---

## 9. Security Checklist

- [ ] Node binds to `127.0.0.1` only (default in wrapper mode, or set `ADMIN_EDITOR_HOST=127.0.0.1`)
- [ ] `ace.proxy.wrapper-token` is a strong random value (not a placeholder)
- [ ] `ACE_WRAPPER_TOKEN` on Node matches Spring's `ace.proxy.wrapper-token` exactly
- [ ] Production mode uses Spring Security principal for identity (OIDC/SAML configured)
- [ ] Production mode does NOT use `dev-stub-auth=true`
- [ ] `dev-stub-auth` is only enabled with `dev`/`local`/`test` Spring profile
- [ ] Route allowlist covers only the endpoints ACE needs (no `* /**` wildcards)
- [ ] `GET /api/auth/me` and `GET /api/auth/bootstrap-allowed` are served by Spring (not proxied)
- [ ] Node runs with `ACE_AUTH_MODE=wrapper` (disables login, requires identity headers)
- [ ] `max-request-bytes` is set to a reasonable limit (default 10 MB)
- [ ] Audit logging is enabled (`ace.audit.enabled=true`)
- [ ] `trusted-proxy-ips` contains only actual proxy IPs (empty by default)
- [ ] `allow-groups-fallback=false` in production
- [ ] Wrapper token is not logged anywhere (audit filter excludes it)
- [ ] `custom-ace.yml` is NOT committed (check `.gitignore`)
- [ ] No internal URLs, org names, or credentials in committed files

---

## 10. Run Commands Reference

### Node-only dev (unchanged)

```bash
# From repo root (figmai_plugin/)
rm -rf node_modules && npm ci
npm run admin
```

### Wrapper smoke test (auth off)

```bash
export WRAPPER_TOKEN=$(openssl rand -hex 32)

# Terminal 1 (from repo root)
ACE_AUTH_MODE=wrapper ACE_WRAPPER_TOKEN=$WRAPPER_TOKEN npx tsx admin-editor/server.ts

# Terminal 2 (from repo root)
cd enterprise/ace-spring-wrapper
mvn spring-boot:run -Dspring-boot.run.arguments="--ace.proxy.wrapper-token=$WRAPPER_TOKEN"
```

### Wrapper dev stub auth

```bash
export WRAPPER_TOKEN=$(openssl rand -hex 32)

# Terminal 1 (from repo root)
ACE_AUTH_MODE=wrapper ACE_WRAPPER_TOKEN=$WRAPPER_TOKEN npx tsx admin-editor/server.ts

# Terminal 2 (from repo root)
cd enterprise/ace-spring-wrapper
mvn spring-boot:run -Dspring-boot.run.arguments="\
--spring.profiles.active=dev \
--ace.security.enable-auth=true \
--ace.security.dev-stub-auth=true \
--ace.proxy.wrapper-token=$WRAPPER_TOKEN"
```

### Docker wrapper dev

```bash
cd enterprise/ace-spring-wrapper
cp .env.example .env
docker compose -f docker-compose.example.yml up --build --force-recreate

# verify health + auth endpoints
docker compose -f docker-compose.example.yml ps
curl -i http://localhost:8080/api/auth/me
curl -i http://localhost:8080/api/auth/bootstrap-allowed
```

Quick endpoint sanity checks (dev-stub mode):

```bash
# Product site + ACE UI
curl -I http://localhost:8080/home/                  # 200 text/html
curl -I http://localhost:8080/home/admin/             # 200 text/html

# ACE static assets (relative paths resolve under /home/admin/*)
curl -I http://localhost:8080/home/admin/app.js       # 200 application/javascript
curl -I http://localhost:8080/home/admin/styles.css   # 200 text/css
curl -I http://localhost:8080/home/admin/fonts.css    # 200 text/css

# Product site root-relative assets
curl -I http://localhost:8080/fonts.css               # 200 text/css
curl -I http://localhost:8080/styles.css               # 200 text/css
curl -I http://localhost:8080/assets/logo-figmai.svg  # 200 image/svg+xml

# Auth shape expected by ACE UI
curl -i http://localhost:8080/api/auth/me
# expected: { "user": { "id": "...", "username": "...", "email": "...", "role": "..." }, "allowedTabs": [...] }

# Core APIs used by ACE
curl -i http://localhost:8080/api/model
curl -i -X POST http://localhost:8080/api/validate -H "Content-Type: application/json" -d '{"model":{}}'
curl -i -X POST http://localhost:8080/api/save -H "Content-Type: application/json" -d '{}'
curl -i http://localhost:8080/api/users
curl -i -X PATCH http://localhost:8080/api/users/demo -H "Content-Type: application/json" -d '{"role":"editor"}'
```

### Production

```bash
cd enterprise/ace-spring-wrapper
java -jar target/ace-spring-wrapper-1.0.0-SNAPSHOT.jar \
  --spring.config.additional-location=file:/path/to/custom-ace.yml
```

### Spring unit tests

```bash
cd enterprise/ace-spring-wrapper
mvn test
```

---

## 11. Verification Checklist

- [ ] Node-only dev still works when `ACE_AUTH_MODE` is not set.
- [ ] Spring fails to start with placeholder wrapper token.
- [ ] Spring fails to start with `dev-stub-auth=true` and no dev/local/test profile.
- [ ] Node fails to start with `ACE_AUTH_MODE=wrapper` and placeholder/missing `ACE_WRAPPER_TOKEN`.
- [ ] Direct Node wrapper-mode request without token returns 403.
- [ ] Direct Node wrapper-mode request with wrong token returns 403.
- [ ] Wrapper strips incoming `X-ACE-User` / `X-ACE-Role` / `X-ACE-Groups` / `X-ACE-Wrapper-Token` headers from client.
- [ ] Wrapper injects `X-ACE-Wrapper-Token`, `X-ACE-User`, `X-ACE-Role`, and `X-ACE-Groups` to Node.
- [ ] Wrapper bypasses proxy for `/api/auth/**` and serves wrapper-owned auth endpoints.
- [ ] `HEAD /home/admin/app.js` returns 200 (not blocked by allowlist).
- [ ] `GET /fonts.css`, `GET /styles.css`, `GET /assets/**` proxy to Node (200).
- [ ] Encoded traversal paths (`%2e%2e`, `%252e%252e`) are rejected (404).
- [ ] RBAC tier gating rejects under-privileged users (403).
- [ ] Rate limiting returns 429 after threshold.
- [ ] Audit log records include user, tier, method, path, status, latency, clientIp.

---

## 12. Plugin Build Integration (Pull from ACE)

The plugin compile flow remains local, but you can pull the authoritative ACE config snapshot before `npm run build`.

Add and use:

```bash
npm run pull-config
```

`pull-config` reads:

- `ACE_URL` (default: `http://localhost:8080`)
- `ACE_TOKEN` (optional; sent as `X-ACE-Wrapper-Token`)

What it syncs:

- `custom/config.json`
- `custom/assistants.manifest.json`
- `custom/knowledge/*.md`
- `custom/design-systems/<id>/registry.json`
- `docs/content-models.md` (when present in `/api/model`)
- `custom/.ace-revision`

Behavior:

- Idempotent by `meta.revision` from `/api/model`
- If revision is unchanged, no files are written
- If revision changed and `custom/.ace-revision` exists, run with `--force` to overwrite local files

Examples:

```bash
# Local wrapper (dev stub)
ACE_URL=http://localhost:8080 ACE_TOKEN=dev-wrapper-token-local-only npm run pull-config
npm run build

# Internal server / CI
ACE_URL=https://ace.example.internal ACE_TOKEN=$CI_ACE_TOKEN npm run pull-config -- --force
npm run build
```

Security notes:

- The pull script does not send identity headers (`X-ACE-User`, `X-ACE-Groups`, `X-ACE-Role`)
- It only sends optional `X-ACE-Wrapper-Token` when `ACE_TOKEN` is provided
