# ACE Static + S3 Migration Spec

> **Status**: Architecture authority for this migration.
> **Current implementation note**: when this document drifts from the current working code, use `infra/config-api/`, `admin-editor/`, and `scripts/` as the tie-breaker, then `docs/setup/ace-private-env-setup.md` for the current reusable setup flow.
> **Supersedes**: all prior plan files in `.cursor/plans/` related to S3, ACE static, or Config API migration.

---

## 1. Problem

ACE (Admin Config Editor) is an Express server that reads and writes config files directly on the local filesystem. It is co-located with the plugin repo and runs generators via `spawnSync` after every save. This architecture requires Docker Compose with bind-mounted volumes and a persistent filesystem — neither of which the target deployment environment provides.

---

## 2. Target Architecture

```
┌──────────────┐       REST        ┌──────────────┐      S3 API      ┌───────────┐
│  ACE SPA     │ ───────────────── │  Config API  │ ────────────────  │  S3       │
│  (static)    │    /api/*         │  (stateless) │   read/write     │  (private)│
└──────────────┘                   └──────────────┘                   └───────────┘
                                          │
                                          │  (future, P3+)
                                          ▼
                                   ┌──────────────┐
                                   │ Preview API  │  reads S3, runs prompt assembly
                                   └──────────────┘

┌──────────────┐     S3 read       ┌───────────┐
│ CI / Local   │ ──────────────── │  S3       │
│ sync-config  │  published.json  │  (private)│
│ → generators │  → snapshot/*    └───────────┘
│ → build      │
└──────────────┘
```

- **ACE SPA**: pure HTML/CSS/JS. Deployed to any static host. Zero server-side logic.
- **Config API**: stateless Node service. Reads/writes S3. Validates models. Manages Draft/Publish lifecycle. Does NOT run generators.
- **Plugin build**: `sync-config` pulls the published snapshot from S3 into `custom/` and `docs/`. Existing generators run unchanged. Plugin has no runtime dependency on ACE or S3.
- **Preview API** (future): loads config from S3, runs instruction assembly pipeline, returns assembled prompt. Does not call LLMs. Out of scope for this spec.

---

## 3. S3 Object Layout

Bucket: private, versioning enabled. All keys under a configurable prefix (default `figmai/`).

```
<prefix>/
  draft/
    _meta.json                        # concurrency guard
    config.json
    assistants.manifest.json
    knowledge/
      <assistantId>.md
    content-models.md
    design-systems/
      <registryId>/registry.json
    knowledge-bases/
      registry.json
      <kbId>.kb.json
    skills/
      registry.json
      <skillId>.md
  snapshots/
    <snapshotId>/                      # e.g. "20260121T143000Z_a1b2"
      _manifest.json                   # written last = commit marker
      config.json
      assistants.manifest.json
      knowledge/...
      content-models.md
      design-systems/...
      knowledge-bases/...
      skills/...
  published.json                       # snapshot pointer + publish metadata
```

### Key Objects

**`draft/_meta.json`**
```json
{ "version": 1, "lastModified": "2026-01-21T14:30:00Z", "lastAuthor": "user@example.com" }
```
Integer `version` is incremented on every save and exposed to the current ACE UI as `meta.revision`.

**`snapshots/<id>/_manifest.json`**
```json
{ "snapshotId": "20260121T143000Z_a1b2", "createdAt": "2026-01-21T14:30:00Z", "author": "user@example.com", "draftVersion": 5, "fileCount": 18 }
```
Written last during publish. Presence = snapshot is complete and immutable. Config API rejects any write to `snapshots/<id>/*` when `_manifest.json` exists.

**`published.json`**
```json
{
  "snapshotId": "20260121T143000Z_a1b2",
  "publishedRevision": "5",
  "publishedAt": "2026-01-21T14:30:00Z",
  "snapshotPath": "snapshots/20260121T143000Z_a1b2/",
  "snapshotKey": "snapshots/20260121T143000Z_a1b2/published.json"
}
```
Points to the active snapshot. Build-time sync reads this, then downloads the referenced snapshot. The current implementation only requires `snapshotId`; the extra metadata is informational and publish-related.

### What Does NOT Go to S3

These stay in the repo (not user-editable via ACE):
- `custom/branding.local.json` — gitignored, local-only
- `custom/design-systems/nuxt-ui-v4/nuxt-ui-v4.catalog.json` and `demo-allowlist.json` — static reference data
- `custom/*.example.*`, `custom/knowledge/README.md` — documentation/templates

---

## 4. Config API Surface

### Current implementation snapshot

The current code in `infra/config-api/` is a working MVP / prototype. It does not yet match every future-normalized route or payload described in older plan drafts.

Current working behavior:

- base path is `/api/*`
- hosted auth is bearer-token based
- save concurrency uses `meta.revision` as a string token
- hosted ACE writes only to draft state until publish
- `POST /api/publish` updates `published.json`, which is what `npm run build:with-s3` consumes

### Implemented routes

Base path: `/api`. Auth: `Authorization: Bearer <token>` on all stateful routes; `/api/health` is the health probe.

### Model CRUD

| Method | Path | Purpose | S3 Ops |
|--------|------|---------|--------|
| GET | `/api/model` | Load draft model + meta | GetObject `draft/*`, ListObjectsV2 for `knowledge/`, `design-systems/` |
| POST | `/api/save` | Save draft (optimistic lock) | Read `_meta.json` -> compare `meta.revision` -> write changed files -> increment version |
| POST | `/api/validate` | Validate model (stateless) | None |

### Publish / Rollback

| Method | Path | Purpose | S3 Ops |
|--------|------|---------|--------|
| POST | `/api/publish` | Copy draft to new snapshot, update pointer | CopyObject `draft/*` -> `snapshots/<newId>/*`, PutObject `_manifest.json`, PutObject `published.json` |

The current MVP does not expose snapshot listing or rollback endpoints yet.

### Knowledge Base CRUD

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/kb/registry` | Get KB registry |
| GET | `/api/kb/:id` | Get KB document |
| POST | `/api/kb` | Create KB document |
| PATCH | `/api/kb/:id` | Update KB document |
| DELETE | `/api/kb/:id` | Delete KB document |
| POST | `/api/kb/normalize` | Normalize KB content (stateless) |

### Shared Skills CRUD

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/skills` | List all skills (registry) |
| GET | `/api/skills/:id` | Get skill content |
| POST | `/api/skills` | Create skill |
| PATCH | `/api/skills/:id` | Update skill title, kind, or content |
| DELETE | `/api/skills/:id` | Delete skill |

Skills CRUD is independent of the model version guard (same as KB CRUD). Implemented in `infra/config-api/src/routes/skills.ts`.

### Health and auth support routes

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/health` | Health probe for deployment and smoke checks |
| GET | `/api/auth/me` | Hosted ACE auth stub for bearer-token mode |
| GET | `/api/auth/bootstrap-allowed` | Hosted ACE bootstrap/auth-mode hint |
| POST | `/api/auth/logout` | Hosted ACE logout stub |
| GET | `/api/build-info` | Basic build metadata for the UI |

### Request/Response Shapes

```typescript
// GET /api/model -> 200
{
  model: {
    config: Config
    assistantsManifest: AssistantsManifest
    customKnowledge: Record<string, string>
    contentModelsRaw?: string
    designSystemRegistries?: Record<string, unknown>
    skillMdContent?: Record<string, string>      // assistantId -> SKILL.md content
    dsSkillMdContent?: Record<string, string>    // dsId -> SKILL.md content ('__top_level__' for top-level)
  }
  meta: { revision: string, capabilities?: { hasUnpublished: boolean, canPublish: boolean } }
  validation: { errors: string[], warnings: string[] }
}

// POST /api/save -> 200 | 409
// Request:
{ model: AdminEditableModel, meta: { revision: string } }
// 200:
{ success: true, meta: { revision: string }, filesWritten: string[], generatorsRun: [] }
// 409:
{
  error: "STALE_REVISION",
  message: "Files changed on disk. Reload to get the latest.",
  expectedRevision: string,
  currentRevision: string,
  lastPublishedRevision?: string | null,
  meta: { revision: string }
}

// POST /api/publish -> 200
{ snapshotId: string, createdAt: string, publishedRevision: string }
```

### Security Constraints

| Constraint | Where | Detail |
|-----------|-------|--------|
| Request body limit | `handler.ts` | 1 MB max. Requests exceeding this return 413 before auth check. |
| Skill filePath validation | `routes/skills.ts` | Registry `filePath` must match `^[a-z0-9]+(?:-[a-z0-9]+)*\.md$`. Entries failing this are rejected at read time. |
| ID format | All routes | IDs validated as kebab-case (`KB_ID_REGEX`) before any S3 key construction. |
| Auth exemptions | `handler.ts` | Only `/api/health` (GET) and `OPTIONS` bypass bearer-token check. All other routes require a valid `CONFIG_API_TOKEN`. |
| CORS | `cors.ts` | Origin allowlist via `CORS_ALLOW_ORIGINS` env var (comma-separated). No wildcard. Unrecognized origins receive no `Access-Control-Allow-Origin` header. |

### Concurrency

- `draft/_meta.json.version` is the single stored concurrency token.
- The current API exposes that token to the frontend as `meta.revision` (string).
- Client receives `meta.revision` from GET, sends `meta.revision` with save.
- Server compares before writing. Mismatch -> 409. Match -> writes files, bumps version, writes `_meta.json` last.
- KB and Skills CRUD are independent of the version guard (KB and skill files are not in the model revision).

---

## 5. Build-Time Sync

### `scripts/sync-config.ts`

Downloads the published snapshot from S3 into `custom/` and `docs/` so existing generators can run unchanged.

**Environment variables:**
- `S3_BUCKET` — bucket name (required for S3 mode)
- `S3_REGION` — AWS region (default `us-east-1`)
- `S3_PREFIX` — key prefix (default `figmai/`)
- `CONFIG_SNAPSHOT_ID` — pin to a specific snapshot (optional; overrides `published.json`)

**Behavior:**
1. If `S3_BUCKET` is not set AND `custom/config.json` exists locally: log "S3 not configured, using local config", exit 0.
2. If `S3_BUCKET` is not set AND `custom/config.json` does NOT exist: exit 1 with error.
3. If `S3_BUCKET` is set:
   a. Read `published.json` to get `snapshotId` (or use `CONFIG_SNAPSHOT_ID` if set).
   b. Verify `snapshots/<id>/_manifest.json` exists (integrity check).
   c. Download all objects from `snapshots/<id>/` (excluding `_manifest.json`).
   d. Map S3 keys to local paths: `config.json` -> `custom/config.json`, `content-models.md` -> `docs/content-models.md`, etc.
   e. Write `custom/.config-snapshot-id` with the snapshot ID.
   f. Exit 0.
4. Never overwrites `custom/branding.local.json`.

**Integration with prebuild:**
```
"prebuild": "tsx scripts/sync-config.ts && npm run generate-assistants && npm run generate-presets && ..."
```
The sync step is a no-op for local dev without `S3_BUCKET`. No disruption.

### `scripts/seed-s3.ts` (one-time)

Uploads current local `custom/` + `docs/content-models.md` to S3 as the initial draft and first snapshot, writes `published.json`.

### `scripts/push-config.ts`

Uploads local config as a new snapshot and updates `published.json`. Used during transition (before Config API exists) or as a local dev shortcut.

---

## 6. Phased Implementation

### Phase 1 — S3 + Manual Sync

**Goal**: Config is stored in S3. Builds can pull from S3. No ACE changes. Local dev unaffected.

**Deliverables:**
- `scripts/sync-config.ts` (new)
- `scripts/seed-s3.ts` (new)
- `scripts/push-config.ts` (new)
- `@aws-sdk/client-s3` added as devDependency
- `.env.example` updated with S3 vars
- `.gitignore` updated with `custom/.config-snapshot-id`
- `package.json` updated with `sync-config`, `seed-s3`, `push-config` scripts

**No modifications to existing source files. Purely additive.**

**Acceptance criteria:**
- [ ] `npm run seed-s3` populates S3 with `draft/`, `snapshots/<id>/`, `published.json`
- [ ] `npm run sync-config` with `S3_BUCKET` set downloads snapshot to `custom/` and `docs/`
- [ ] `npm run sync-config && npm run build` produces build output identical to `npm run build` from local files (hash comparison)
- [ ] `npm run sync-config` without `S3_BUCKET` and local config present: skips, exit 0
- [ ] `npm run sync-config` without `S3_BUCKET` and no local config: exit 1
- [ ] `custom/branding.local.json` is never overwritten
- [ ] `npm run push-config` creates a new snapshot and updates `published.json`

**Rollback**: delete the three new scripts and remove devDependency. Zero risk.

---

### Phase 2 — Automated Build-Time Sync

**Goal**: CI builds automatically pull config from S3. Build metadata includes snapshot ID. Local dev still works without S3.

**Deliverables:**
- `package.json` prebuild chain prepended with `tsx scripts/sync-config.ts &&`
- `scripts/generate-build-info.ts` reads `custom/.config-snapshot-id` and includes `configSnapshotId` in output
- CI/CD environment configured with `S3_BUCKET`, `S3_REGION`, `S3_PREFIX`, AWS credentials

**Acceptance criteria:**
- [ ] CI build with `S3_BUCKET`: sync runs, generators run, build succeeds
- [ ] CI build with `CONFIG_SNAPSHOT_ID` pinned: produces identical output every time
- [ ] Local build without `S3_BUCKET`: sync skips, build succeeds using local files
- [ ] `build/build-info.json` contains `configSnapshotId` when built from S3
- [ ] `push-config` on machine A, then `sync-config && build` on machine B: same bundle

**Rollback**: remove `tsx scripts/sync-config.ts &&` from prebuild (one line).

---

### Phase 3 — Config API + Static ACE

**Goal**: ACE is a static SPA. All dynamic operations go through Config API backed by S3. Generator execution removed from save path.

**Deliverables:**

**3a. Shared schema package** (`packages/config-schema/`)
- Extract from `admin-editor/src/schema.ts`: all Zod schemas, types, `validateModel()`
- Extract from `admin-editor/src/fs.ts`: `canonicalizeConfig()`, `canonicalizeAssistantsManifest()`
- Consumed by Config API and admin-editor

**3b. Config API service** (`services/config-api/`)
- Express + `@aws-sdk/client-s3`
- Implements all endpoints from section 4
- Auth: bearer token (`CONFIG_API_TOKEN` env var)
- CORS: allows ACE SPA origin
- Deployable as container or serverless

**3c. ACE frontend refactor** (`admin-editor/public/`)
- `app.js`: keep deploy-time API base configurable via `window.__ACE_CONFIG__.apiBase`
- `FETCH_OPTS`: adds `Authorization: Bearer <token>` header (replaces cookie-based auth)
- Keep `/api/*` routes unless the frontend and Config API are normalized together in the same change
- Keep `state.meta.revision` (string) unless the API contract is deliberately migrated in the same change
- New UI: Publish button, Snapshots list, Rollback action
- Removed: generator status in save response, `nextSteps` text about `npm run build`

**3d. Deprecation**
- `admin-editor/src/save.ts`: remove `spawnSync`, `GENERATOR_SCRIPTS`, `runGenerator`
- `admin-editor/src/model.ts`: remove `computeRevision`, `fs.statSync` loop
- `admin-editor/src/fs.ts`: remove `backupFile` (S3 versioning replaces it)
- `admin-editor/server.ts`: keep runnable for local dev fallback (feature-flagged via `API_BASE`)
- Marketing routes (`/home`, `/assistants`, etc.): drop or convert to static HTML

**Acceptance criteria:**
- [ ] `GET /api/model` returns the expected `AdminEditableModel` shape from S3-backed draft state
- [ ] `POST /api/save` with correct `meta.revision` succeeds; stale revision returns 409
- [ ] `POST /api/publish` creates immutable snapshot data and updates `published.json`
- [ ] A later rollback capability, if added, re-points `published.json`; subsequent `sync-config && build` produces the older bundle
- [ ] ACE SPA deployed to static hosting, pointed at Config API: full edit/save/publish flow works
- [ ] KB CRUD via `/api/kb/*` is functionally identical to the current routes
- [ ] No `spawnSync` or generator execution in Config API save path
- [ ] `sync-config.ts` continues to work unchanged (reads `published.json` from S3)
- [ ] Admin-editor Express server still works for local dev when `API_BASE` is empty

---

## 7. Out of Scope

The following are explicitly NOT part of this spec:

- **Preview Runtime API**: testing assistant prompts without building the plugin. Deferred to a future spec.
- **IdP / OIDC integration**: full identity provider for ACE users. Phase 3 ships with bearer token auth. IdP integration is a separate effort.
- **Multi-tenancy**: per-tenant S3 prefixes or isolation. Current design supports a single deployment per bucket prefix.
- **User management migration**: `data/users.json` and RBAC. Phase 3 uses a shared bearer token. User-level auth is a separate effort.
- **Audit trail persistence**: `data/audit.jsonl` replacement. Use structured logging (stdout/CloudWatch) or defer.
- **Database introduction**: no database is introduced. S3 is the only persistence layer.
- **Plugin runtime changes**: the plugin never talks to ACE, Config API, or S3 at runtime. This does not change.
- **Generator modifications**: generators are pure functions of `custom/` files. They are not modified.
- **Marketing pages**: the `/home`, `/assistants`, `/demo`, etc. routes are informational. Whether they become static HTML or are dropped is a separate decision.

---

## 8. Risks

| Risk | Mitigation |
|------|------------|
| Two editors save concurrently | Version-based optimistic lock on `draft/_meta.json`. 409 on conflict. Same UX as today. |
| Publish captures partial draft | Publish reads `_meta.json` version; if a save is in flight, version mismatch fails the publish. |
| Local `custom/` drifts from S3 | `sync-config` always overwrites local with S3 published. CI always syncs. `push-config` for explicit publish. |
| Config contains proxy URLs/tokens | S3 bucket: private, IAM-only access. Config API requires auth. HTTPS enforced. |
| CI needs AWS credentials | OIDC federation (GitHub Actions/GitLab -> IAM role). No long-lived keys. |
| Build fails if S3 is unreachable | `sync-config` has local fallback for dev. CI should fail fast (correct behavior). |
| Snapshot storage growth | S3 lifecycle rule: expire old snapshots after N days. Keep last K always. |
| `branding.local.json` overwritten by sync | `sync-config` explicitly skips it. |

---

## 9. Implementation Backlog

| Task | Phase | Size | Files | Acceptance Criteria |
|------|-------|------|-------|---------------------|
| Create `sync-config.ts` | P1 | S | `scripts/sync-config.ts`, `package.json` | Downloads snapshot; skips without `S3_BUCKET`; exit 1 when no config |
| Create `seed-s3.ts` | P1 | S | `scripts/seed-s3.ts`, `package.json` | Uploads local config; creates snapshot + `published.json` |
| Create `push-config.ts` | P1 | S | `scripts/push-config.ts`, `package.json` | Creates new snapshot; updates `published.json` |
| Add S3 devDep + env docs | P1 | XS | `package.json`, `.env.example`, `.gitignore` | `@aws-sdk/client-s3` installed; vars documented |
| Validate build parity | P1 | S | Manual | Synced build output = local build output |
| Wire sync into prebuild | P2 | XS | `package.json` | Prebuild starts with sync; local dev unaffected |
| Add `configSnapshotId` to build-info | P2 | XS | `scripts/generate-build-info.ts` | `build-info.json` includes snapshot ID |
| CI/CD integration | P2 | S | CI config | CI builds from S3; pinned snapshots tested |
| Extract `packages/config-schema/` | P3 | M | `packages/config-schema/`, `admin-editor/src/schema.ts` | Package exports schemas + validation; tests pass |
| Scaffold Config API + model read | P3 | M | `services/config-api/` | `GET /api/model` reads S3 draft; returns correct shape |
| Add save endpoint | P3 | M | `services/config-api/` | Version guard works; writes to S3 |
| Add publish + snapshots + rollback | P3 | M | `services/config-api/` | Publish creates snapshot; rollback re-points |
| Add KB CRUD to Config API | P3 | M | `services/config-api/` | All 6 routes work against S3 |
| Add auth + CORS to Config API | P3 | S | `services/config-api/` | Bearer token validation; CORS for SPA |
| Refactor ACE frontend | P3 | M | `admin-editor/public/app.js`, `index.html` | Configurable `API_BASE`; bearer auth; current `/api/*` contract remains explicit; revision token handling stays aligned with API |
| Add publish/snapshots UI | P3 | M | `admin-editor/public/app.js` | Publish button; snapshot list; rollback |
| Remove spawnSync from save | P3 | S | `admin-editor/src/save.ts` | No generator execution in save path |
| End-to-end validation | P3 | S | Manual/CI | Edit -> publish -> sync -> build cycle works |
