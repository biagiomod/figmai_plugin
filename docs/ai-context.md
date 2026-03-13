# AI Context

## Active ChatGPT Project Context

### Migration Private Work
- Workstream: host ACE as a static SPA with remote configuration storage in S3, without breaking existing repo invariants or local development.
- Intended architecture authority:
  - `docs/architecture/ace-static-s3-migration.md`
- Current operational reality:
  - `docs/setup/ace-public-replica.md`
- Practical truth when docs diverge:
  - current code in `infra/config-api/`, `admin-editor/`, and `scripts/`
- Current implementation status:
  - `infra/config-api/` is a partial but working MVP/prototype, not a placeholder and not yet a full implementation of the migration spec.
  - Current behavior already includes `/api/*`, `meta.revision`, bearer-token auth, richer `published.json` metadata, and working save/publish/KB CRUD paths.
- Relevant repo areas:
  - `admin-editor/`
  - `infra/config-api/`
  - `scripts/sync-config.ts`
  - `scripts/s3-config-files.ts`
- Hosting model currently supported:
  - generic static HTTPS host + `config.js` + remote API
  - AWS-native path: CloudFront + S3
  - generic path: any static host
  - HostGator/cPanel is explicitly supported by current docs/scripts
- Known deployment blocker:
  - previous AWS/SAM attempt failed with `AccessDenied` on `cloudformation:CreateChangeSet`
  - caller at the time: `arn:aws:iam::125903111955:user/figmai-s3-service`
  - this identity should not be treated as the correct SAM/CloudFormation deploy identity; it appears suitable for S3-oriented tasks, not infra deployment
  - recommended deploy model: dedicated deploy role or CI role, ideally with CloudFormation execution role separation
- Guardrails:
  - preserve `npm run admin` local fallback
  - preserve deterministic build-time sync behavior
  - keep this workstream documentation-first until chat-context migration is fully preserved in repo docs
- Detailed handoff:
  - `docs/chat-context/migration-private-work.md`
