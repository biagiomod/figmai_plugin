# Phase 1 — S3 + Manual Sync Summary

Implemented Phase 1 end-to-end from `docs/architecture/ace-static-s3-migration.md` and committed as:

- `0bdde90` — Add Phase 1 S3 config sync scripts and wiring.

## Fast Audit

1. Current file expectations/usages found:
- `custom/config.json` is read by `scripts/generate-custom-overlay.ts` and ACE server/model routes.
- `custom/assistants.manifest.json` is used by assistant generator and ACE.
- `custom/knowledge/*.md` is read by custom overlay generator.
- `docs/content-models.md` is read by `scripts/generate-presets.ts`.
- `custom/design-systems/**/registry.json` is read by custom overlay generator.
- `custom/knowledge-bases/registry.json` and `custom/knowledge-bases/*.kb.json` are read by `scripts/generate-knowledge-bases.ts`.

2. Current prebuild chain confirmed:
- `prebuild` is currently generators-only and does **not** include sync yet.
- Phase 2 prepend point is clear: before `generate-assistants` in `package.json` `prebuild`.

## What Was Implemented (Phase 1 only)

- Added new scripts:
  - `scripts/sync-config.ts`
  - `scripts/seed-s3.ts`
  - `scripts/push-config.ts`
  - shared helper: `scripts/s3-config-files.ts`
- Added `@aws-sdk/client-s3` to dev dependencies.
- Added root `.env.example` with `S3_BUCKET`, `S3_REGION`, `S3_PREFIX`, `CONFIG_SNAPSHOT_ID`, `CONFIG_AUTHOR`.
- Updated `.gitignore` to ignore `custom/.config-snapshot-id`.
- Added scripts in `package.json`: `sync-config`, `seed-s3`, `push-config`.
- Added docs note + commands in `README.md`.
- Added checklist doc: `docs/setup/s3-config-phase1-checklist.md`.
- Explicitly protects `custom/branding.local.json` in sync mapping flow.

## Verification Run

Executed locally:

- `npm run sync-config` (no `S3_BUCKET`, local config present) exits 0 with:
  - `S3 not configured, using local config`
- Missing local config case exits 1 with clear error:
  - `S3_BUCKET is not set and custom/config.json was not found...`
- `npm run seed-s3` without env fails clearly:
  - `S3_BUCKET is required for this command.`
- `npm run push-config` without env fails clearly:
  - `S3_BUCKET is required for this command.`
- `npm test` passed
- `npm run build` passed

S3-positive path (`seed-s3`/`sync-config` with real bucket) is implemented but not executed in this environment due missing AWS env/credentials.

## Run Commands

```bash
# 0) set env
cp .env.example .env
# fill S3_BUCKET, S3_REGION, S3_PREFIX

# 1) one-time seed from local files
npm run seed-s3

# 2) sync published snapshot to local working files
npm run sync-config

# 3) build
npm run build

# later: publish local changes as new snapshot
npm run push-config

# on another machine:
npm run sync-config
npm run build
```

## Changed Files (Phase 1 commit)

- `.env.example`
- `.gitignore`
- `README.md`
- `docs/setup/s3-config-phase1-checklist.md`
- `package.json`
- `scripts/push-config.ts`
- `scripts/s3-config-files.ts`
- `scripts/seed-s3.ts`
- `scripts/sync-config.ts`
