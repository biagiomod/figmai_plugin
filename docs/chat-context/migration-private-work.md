# Migration Private Work

## 1. Purpose

Preserve the durable context from the ChatGPT Project thread "Migration Private Work" inside the repo before additional ACE S3 migration work continues in Cursor.

This is a concise handoff, not a transcript.

## 2. Workstream Summary

This workstream is about moving ACE toward a deployment model where:

- ACE is hosted as a static SPA
- configuration is stored durably in S3
- a remote Config API mediates read/write/publish operations
- plugin builds pull published config from S3 before running existing generators
- the local fallback workflow remains intact

This direction is already reflected in the repo and is not speculative.

## 3. Current Known State

Grounded in current repo docs and code:

- `docs/architecture/ace-static-s3-migration.md` is the intended architecture authority for this migration.
- `docs/setup/ace-public-replica.md` reflects current operational reality.
- If docs diverge, the practical truth should be taken from current code in:
  - `infra/config-api/`
  - `admin-editor/`
  - `scripts/`
- `infra/config-api/` is a partial but working MVP/prototype.
- It is not a placeholder.
- It is not yet a complete implementation of the migration spec.
- Current code already includes:
  - `/api/*` endpoints
  - `meta.revision`
  - bearer-token auth
  - richer `published.json` metadata
  - working save/publish/KB CRUD paths
- The repo already contains the key migration surfaces:
  - `admin-editor/`
  - `infra/config-api/`
  - S3 sync scripts
  - static-host deployment guidance

## 4. Relevant Repo Areas

Primary relevant areas for this workstream:

- `admin-editor/`
  - ACE frontend and local-dev server area
  - preserves the `npm run admin` fallback workflow
- `infra/config-api/`
  - current Config API implementation surface
  - AWS/SAM deployment area
- `scripts/sync-config.ts`
  - published-snapshot pull into local repo inputs before build
- `scripts/s3-config-files.ts`
  - file mapping and S3 layout helpers
- `docs/architecture/ace-static-s3-migration.md`
  - intended migration architecture authority
- `docs/setup/ace-public-replica.md`
  - current deployment/setup reality
- `docs/security/config-api-auth.md`
  - current auth model documentation

Older ACE docs should be treated mainly as legacy or local-mode context unless they align with the current migration authority and current code.

## 5. Known Deployment Blocker

A prior AWS/SAM deployment attempt failed with:

- `AccessDenied` on `cloudformation:CreateChangeSet`

Caller identity at the time:

- `arn:aws:iam::125903111955:user/figmai-s3-service`

Audit conclusion:

- this IAM user should **not** be treated as the correct SAM/CloudFormation deploy identity
- it appears suitable for S3-oriented tasks, not infrastructure deployment
- the recommended deployment model is:
  - a dedicated deploy role or CI role
  - ideally with CloudFormation execution role separation

This is currently the clearest known blocker for the AWS-native deploy path.

## 6. Architectural Guardrails

Use these guardrails when resuming work:

- Preserve the ACE + Config API + S3 direction already established in repo docs and code.
- Do not invent a new architecture unless a hard blocker forces it.
- Preserve local fallback:
  - `npm run admin`
- Preserve deterministic build-time sync behavior.
- Keep the plugin runtime decoupled from ACE and S3.
- Prefer current migration SSOT over older planning docs.
- When authority conflicts exist:
  1. `docs/architecture/ace-static-s3-migration.md`
  2. current code in `infra/config-api/`, `admin-editor/`, and `scripts/`
  3. `docs/setup/ace-public-replica.md` for current operating guidance
- Treat older ACE/local-server docs as legacy context unless explicitly still applicable.

## 7. Recommended Next Step

The next step is to stabilize and align what already exists, not invent a new architecture.

Recommended sequence:

1. Correct the deployment identity / role model for AWS/SAM and CloudFormation.
2. Reconcile documentation with the current code and migration authority.
3. Confirm where current MVP behavior intentionally differs from the migration spec.
4. Only after that, fill remaining functional gaps.

This workstream remains documentation-first for now. Implementation is intentionally deferred until this documentation migration is complete.

## 8. Open Questions

Only the still-unresolved questions should remain open:

- Which exact AWS IAM role model should be used for production deployment:
  - dedicated human deploy role
  - CI role
  - or both with CloudFormation execution-role separation?
- Which current code/spec differences are intentional MVP tradeoffs versus gaps that should be closed next?
- What should be the canonical deployment target for the first supported production path:
  - AWS-native static hosting (`CloudFront + S3`)
  - or generic static hosting as the primary documented path?

## Status Note

Implementation is intentionally deferred until this chat-context migration is preserved in repo documentation.
