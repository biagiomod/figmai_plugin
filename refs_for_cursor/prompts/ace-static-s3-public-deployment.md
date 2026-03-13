# ACE Static Site + S3 Deployment Prompt

Agent: Proxy & Providers
Mode: Agent
Model: GPT-5.4

## Mission

Continue the ACE public deployment setup for the public version of `figmai_plugin` starting from the AWS credential and SAM deploy step.

The goal is to get this architecture working end-to-end without breaking the local fallback:

- static ACE frontend
- Lambda + API Gateway Config API
- S3-backed configuration storage
- plugin build flow that can pull published config from S3

Do not restart the architecture discussion. The repo already contains a working MVP/prototype for this direction.

## Scope

Work only inside:

- `/Users/biagio/Desktop/Dev_Figma/figmai/figmai_plugin`

## Required Operating Assumptions

- Preserve `npm run admin` local fallback.
- Preserve deterministic build-time sync behavior.
- Treat current code as the tie-breaker where docs diverge.
- Keep ACE static and framework-free for hosted use.
- Keep the Config API serverless and compatible with SAM/Lambda/API Gateway + S3.

## Authority Order

For ACE migration and hosting topics, use this authority order:

1. `docs/architecture/ace-static-s3-migration.md`
2. current code in `infra/config-api/`, `admin-editor/`, and `scripts/`
3. `docs/setup/ace-public-replica.md`

Also review:

- `docs/ai-context.md`
- `docs/chat-context/migration-private-work.md`

## Current Repo Reality

The repo is already partway into the target architecture:

- `npm run ace:build` builds a true static ACE site from `admin-editor/public/` into `admin-editor/dist/`
- the hosted/static ACE runtime uses `config.js` loaded before `app.js`
- the current Config API is implemented in `infra/config-api/`
- the current shipped API surface is `/api/*`, not `/api/v1/*`
- the current API uses bearer-token auth and S3-backed save/publish behavior
- plugin S3 sync exists today via `sync-config`, but it is still explicit through `build:with-s3` rather than automatic in `prebuild`

## Important Drift And Caveats

Before making changes, account for these current mismatches:

1. The setup doc says `CorsAllowOrigin`, but the SAM template actually uses `CorsAllowOrigins` and runtime env uses `CORS_ALLOW_ORIGINS`.
2. The setup doc is too loose about wildcard CORS. Current code exact-matches origins rather than behaving like a permissive `*`.
3. The migration target doc still describes `/api/v1/*` and `meta.version`, but current working code is `/api/*` and `meta.revision`.
4. Hosted cross-origin ACE must use bearer auth with the current Lambda. Do not assume cookie mode is valid for the public hosted path.
5. `Preview` in the current ACE UI appears to call `POST /api/save?dryRun=1`, but current Lambda behavior may not support true dry-run semantics. Verify this before trusting preview in a hosted environment.
6. `build:with-s3` exists, but plain `build` does not auto-sync from S3.

## Starting Point

Continue from the AWS credential/deploy stage described in the handoff:

- the previous AWS identity used for deploy (`figmai-s3-service`) is not appropriate for CloudFormation deployment
- use the correct AWS deploy identity
- configure AWS CLI for that deploy identity
- deploy the SAM stack for `infra/config-api`
- obtain the deployed `ConfigApiUrl`
- wire hosted ACE to that API URL using bearer auth
- verify the full hosted flow

## Primary Task

Get the public deployment path working, or get it to the point where the remaining blocker is explicit and minimal.

Specifically:

1. Review the handoff and current repo files first.
2. Verify what is already implemented versus what the docs still describe as target-state.
3. Continue from the AWS credential step, not from a greenfield design.
4. Deploy or validate the SAM Config API with the correct AWS identity and parameters.
5. Configure hosted ACE runtime to use the deployed Config API URL and bearer auth.
6. Validate hosted ACE against the deployed API.
7. Validate the S3-backed plugin build path still works.
8. If you find repo drift that blocks reliable public setup, fix the smallest correct surface and document the rest.

## Concrete Execution Sequence

1. Inspect these files first:
   - `docs/ai-context.md`
   - `docs/setup/ace-public-replica.md`
   - `package.json`
   - `admin-editor/public/config.example.js`
   - `admin-editor/public/app.js`
   - `admin-editor/scripts/build-static.sh`
   - `admin-editor/scripts/deploy-hostgator.sh`
   - `infra/config-api/template.yaml`
   - `infra/config-api/src/router.ts`
   - `infra/config-api/src/auth.ts`
   - `infra/config-api/src/cors.ts`
   - `infra/config-api/src/routes/model.ts`
   - `infra/config-api/src/routes/publish.ts`
   - `scripts/sync-config.ts`

2. Confirm the correct AWS deployment identity and configure CLI access for it.

3. Deploy the Config API with SAM:
   - use the actual template parameter names from `template.yaml`
   - ensure CORS origins are configured using exact origins required by hosted ACE
   - do not assume wildcard origin behavior if the code does not support it

4. After deploy, capture and verify:
   - API URL
   - health response
   - auth expectations
   - CORS behavior for the hosted ACE origin

5. Build static ACE with:
   - `npm run ace:build`

6. Configure the hosted ACE runtime using `admin-editor/dist/config.js`:
   - set `apiBase` to the deployed API URL
   - set `authMode` to `bearer`

7. Deploy or validate the hosted ACE static files on the public host.

8. Verify hosted ACE behavior:
   - load model
   - authenticate with bearer token
   - save draft
   - publish snapshot
   - verify any preview behavior before trusting it

9. Verify plugin build path:
   - use the S3-backed config flow
   - confirm `build:with-s3` succeeds against the published snapshot
   - confirm local fallback still works

10. If docs or code drift materially affects deployment reliability, update the smallest appropriate surface and report the rest clearly.

## Validation Checklist

Validate these API endpoints against the deployed or local-tested target as appropriate:

- `GET /api/health`
- `GET /api/model`
- `POST /api/save`
- `POST /api/publish`
- `GET /api/auth/me`

Validate these hosted ACE behaviors:

- ACE loads as a static site
- bearer token flow works
- model loads successfully from the deployed API
- save succeeds with the expected revision behavior
- stale revision returns conflict behavior if applicable
- publish creates a snapshot or updates published state as expected
- CORS works from the hosted ACE origin

Validate plugin integration:

- `npm run build:with-s3`
- published config can be pulled into local build inputs
- plugin build still succeeds
- local fallback is not broken

## Known Must-Watch Risks

- wrong AWS deploy identity causing CloudFormation failure
- CORS misconfiguration due to singular/plural parameter drift
- assuming `/api/v1/*` when current code is `/api/*`
- assuming cookie auth for hosted ACE
- treating ACE preview as safe without confirming dry-run behavior
- assuming plain `npm run build` uses S3 when only `build:with-s3` currently does

## Deliverables

At the end, provide a concise summary covering:

- what you deployed or validated
- the final public Config API URL, if deployment succeeded
- the final ACE runtime config used for hosted mode
- whether hosted ACE can load, save, and publish successfully
- whether `build:with-s3` works end-to-end
- what blockers remain, if any
- what repo drift or follow-up fixes should happen next

## Success Condition

The public deployment path is considered successful when:

- ACE is served as a static site
- ACE talks to the deployed Config API over bearer auth
- the Config API reads and writes S3-backed config correctly
- publish works
- plugin config can be pulled from S3 and built successfully
- local fallback remains intact
