# ACE Static + S3 Migration Spec

> **Status**: Approved — single source of truth for this migration.
> **Supersedes**: all prior plan files in `.cursor/plans/` related to S3, ACE static, or Config API migration.

---

## 1. Problem

ACE (Admin Config Editor) is an Express server that reads and writes config files directly on the local filesystem. It is co-located with the plugin repo and runs generators via `spawnSync` after every save. This architecture requires Docker Compose with bind-mounted volumes and a persistent filesystem — neither of which the target deployment environment provides.

---

## 2. Target Architecture

```
┌──────────────┐       REST        ┌──────────────┐      S3 API      ┌───────────┐
│  ACE SPA     │ ───────────────── │  Config API  │ ────────────────  │  S3       │
│  (static)    │   /api/v1/*       │  (stateless) │   read/write     │  (private)│
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
  snapshots/
    <snapshotId>/                      # e.g. "20260121T143000Z_a1b2"
      _manifest.json                   # written last = commit marker
      config.json
      assistants.manifest.json
      knowledge/...
      content-models.md
      design-systems/...
      knowledge-bases/...
  published.json                       # { "snapshotId": "..." }
```

### Key Objects

**`draft/_meta.json`**
```json
{ "version": 1, "lastModified": "2026-01-21T14:30:00Z", "lastAuthor": "user@example.com" }
```
Integer `version` incremented on every save. Used for optimistic concurrency (replaces current `meta.revision` which depends on `fs.statSync`).

**`snapshots/<id>/_manifest.json`**
```json
{ "snapshotId": "20260121T143000Z_a1b2", "createdAt": "2026-01-21T14:30:00Z", "author": "user@example.com", "draftVersion": 5, "fileCount": 18 }
```
Written last during publish. Presence = snapshot is complete and immutable. Config API rejects any write to `snapshots/<id>/*` when `_manifest.json` exists.

**`published.json`**
```json
{ "snapshotId": "20260121T143000Z_a1b2" }
```
Points to the active snapshot. Build-time sync reads this, then downloads the referenced snapshot. Rollback = PUT a different `snapshotId`.

### What Does NOT Go to S3

These stay in the repo (not user-editable via ACE):
- `custom/branding.local.json` — gitignored, local-only
- `custom/design-systems/nuxt-ui-v4/nuxt-ui-v4.catalog.json` and `demo-allowlist.json` — static reference data
- `custom/*.example.*`, `custom/knowledge/README.md` — documentation/templates

---

## 4. Config API Surface

Base path: `/api/v1`. Auth: `Authorization: Bearer <token>` on all routes.

### Model CRUD

| Method | Path | Purpose | S3 Ops |
|--------|------|---------|--------|
| GET | `/api/v1/model` | Load draft model + meta | GetObject `draft/*`, ListObjectsV2 for `knowledge/`, `design-systems/` |
| POST | `/api/v1/save` | Save draft (optimistic lock) | Read `_meta.json` -> compare `expectedVersion` -> write changed files -> increment version |
| POST | `/api/v1/validate` | Validate model (stateless) | None |

### Publish / Rollback

| Method | Path | Purpose | S3 Ops |
|--------|------|---------|--------|
| POST | `/api/v1/publish` | Copy draft to new snapshot, update pointer | CopyObject `draft/*` -> `snapshots/<newId>/*`, PutObject `_manifest.json`, PutObject `published.json` |
| GET | `/api/v1/snapshots` | List available snapshots | ListObjectsV2 `snapshots/*/`, GetObject each `_manifest.json` |
| POST | `/api/v1/rollback` | Re-point published to a different snapshot | PutObject `published.json` |

### Knowledge Base CRUD

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/v1/kb/registry` | Get KB registry |
| GET | `/api/v1/kb/:id` | Get KB document |
| POST | `/api/v1/kb` | Create KB document |
| PATCH | `/api/v1/kb/:id` | Update KB document |
| DELETE | `/api/v1/kb/:id` | Delete KB document |
| POST | `/api/v1/kb/normalize` | Normalize KB content (stateless) |

### Request/Response Shapes

```typescript
// GET /api/v1/model -> 200
{
  model: {
    config: Config
    assistantsManifest: AssistantsManifest
    customKnowledge: Record<string, string>
    contentModelsRaw?: string
    designSystemRegistries?: Record<string, unknown>
  }
  meta: { version: number, lastModified: string, lastAuthor?: string }
}

// POST /api/v1/save -> 200 | 409
// Request:
{ model: AdminEditableModel, meta: { expectedVersion: number } }
// 200:
{ success: true, meta: { version: number, lastModified: string }, filesWritten: string[] }
// 409:
{ error: "Draft has been modified. Reload to see changes.", currentVersion: number }

// POST /api/v1/publish -> 200
{ snapshotId: string, createdAt: string }

// GET /api/v1/snapshots -> 200
{ snapshots: Array<{ snapshotId: string, createdAt: string, author?: string, draftVersion: number }> }

// POST /api/v1/rollback -> 200
// Request:
{ snapshotId: string }
// 200:
{ success: true }
```

### Concurrency

- `draft/_meta.json.version` is the single concurrency token.
- Client receives `version` from GET, sends `expectedVersion` with save.
- Server compares before writing. Mismatch -> 409. Match -> writes files, bumps version, writes `_meta.json` last.
- KB CRUD is independent of the version guard (same as today: KB files are not in the model revision).

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
- `app.js`: `API_BASE` becomes configurable (`window.__ACE_API_BASE__ || ''`)
- `FETCH_OPTS`: adds `Authorization: Bearer <token>` header (replaces cookie-based auth)
- All paths become `/api/v1/*`
- `state.meta.revision` (string) -> `state.meta.version` (number)
- New UI: Publish button, Snapshots list, Rollback action
- Removed: generator status in save response, `nextSteps` text about `npm run build`

**3d. Deprecation**
- `admin-editor/src/save.ts`: remove `spawnSync`, `GENERATOR_SCRIPTS`, `runGenerator`
- `admin-editor/src/model.ts`: remove `computeRevision`, `fs.statSync` loop
- `admin-editor/src/fs.ts`: remove `backupFile` (S3 versioning replaces it)
- `admin-editor/server.ts`: keep runnable for local dev fallback (feature-flagged via `API_BASE`)
- Marketing routes (`/home`, `/assistants`, etc.): drop or convert to static HTML

**Acceptance criteria:**
- [ ] `GET /api/v1/model` returns same `AdminEditableModel` shape as current `GET /api/model`
- [ ] `POST /api/v1/save` with correct `expectedVersion` succeeds; stale version returns 409
- [ ] `POST /api/v1/publish` creates immutable snapshot and updates `published.json`
- [ ] `POST /api/v1/rollback` re-points `published.json`; subsequent `sync-config && build` produces older bundle
- [ ] ACE SPA deployed to static hosting, pointed at Config API: full edit/save/publish flow works
- [ ] KB CRUD via `/api/v1/kb/*` is functionally identical to current routes
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
| Scaffold Config API + model read | P3 | M | `services/config-api/` | `GET /api/v1/model` reads S3 draft; returns correct shape |
| Add save endpoint | P3 | M | `services/config-api/` | Version guard works; writes to S3 |
| Add publish + snapshots + rollback | P3 | M | `services/config-api/` | Publish creates snapshot; rollback re-points |
| Add KB CRUD to Config API | P3 | M | `services/config-api/` | All 6 routes work against S3 |
| Add auth + CORS to Config API | P3 | S | `services/config-api/` | Bearer token validation; CORS for SPA |
| Refactor ACE frontend | P3 | M | `admin-editor/public/app.js`, `index.html` | Configurable `API_BASE`; bearer auth; `/api/v1/`; `meta.version` |
| Add publish/snapshots UI | P3 | M | `admin-editor/public/app.js` | Publish button; snapshot list; rollback |
| Remove spawnSync from save | P3 | S | `admin-editor/src/save.ts` | No generator execution in save path |
| End-to-end validation | P3 | S | Manual/CI | Edit -> publish -> sync -> build cycle works |
