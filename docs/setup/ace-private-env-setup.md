# ACE Private/Work Environment Setup

This guide packages the current ACE static-hosting flow into a reusable setup for a generic private/work environment:

- static ACE hosted anywhere over HTTPS
- Config API backend
- S3-backed config storage

It is written against the repo's current working behavior, not an aspirational future contract.

## What this setup assumes

- `npm run ace:build` copies `admin-editor/public/` into `admin-editor/dist/`
- hosted ACE runtime configuration lives in `admin-editor/dist/config.js`
- hosted ACE talks to the Config API over `/api/*`
- hosted auth mode is `bearer`
- plugin S3 sync reads `published.json`, then downloads the referenced snapshot
- `POST /api/save` updates draft state only
- `POST /api/publish` must run before `npm run build:with-s3` sees the new published snapshot
- CORS is exact-origin based, not wildcard-permissive

## Files in this setup package

- `deploy/ace-env.example.env` — committed, non-secret template for S3, Config API, SAM, CORS, and static-host values
- `deploy/write-config-js.sh` — writes `admin-editor/dist/config.js` from your local env file
- `deploy/ace-env.env` — local copy of the template; gitignored

## 1. Prepare local environment values

Copy the template:

```bash
cp deploy/ace-env.example.env deploy/ace-env.env
```

Fill in the non-secret values for your environment:

- S3 bucket, region, and prefix
- static ACE public URL
- exact allowed CORS origins
- SAM stack metadata
- static deploy target path

Keep secrets out of `deploy/ace-env.env`. In particular:

- do not store `CONFIG_API_TOKEN` there
- do not store AWS credentials there

Load the file when needed:

```bash
set -a
source deploy/ace-env.env
set +a
```

## 2. Seed S3 with the current config set

From repo root:

```bash
set -a
source deploy/ace-env.env
set +a

npm run seed-s3
```

This creates:

- `draft/*`
- `snapshots/<snapshotId>/*`
- `published.json`

## 3. Deploy the Config API

The current implementation lives in `infra/config-api/` and is deployed with SAM.

Build:

```bash
set -a
source deploy/ace-env.env
set +a

cd infra/config-api
npm install
sam build
```

Deploy with parameter overrides. Provide `CONFIG_API_TOKEN` from your shell, secret manager, or CI:

```bash
set -a
source deploy/ace-env.env
set +a

export CONFIG_API_TOKEN='<long-random-token>'

cd infra/config-api
sam deploy \
  --stack-name "$SAM_STACK_NAME" \
  --region "$SAM_REGION" \
  --s3-bucket "$SAM_ARTIFACT_BUCKET" \
  --capabilities CAPABILITY_IAM \
  --parameter-overrides \
    S3BucketName="$S3_BUCKET" \
    S3Prefix="$S3_PREFIX" \
    ConfigApiToken="$CONFIG_API_TOKEN" \
    CorsAllowOrigins="$CORS_ALLOW_ORIGINS" \
    ServiceName="$SERVICE_NAME" \
    ServiceVersion="$SERVICE_VERSION"
```

After deploy, capture the API URL from the `ConfigApiUrl` output and write it back to `deploy/ace-env.env` as `ACE_API_BASE`.

## 4. Build hosted ACE and write `config.js`

Build the static ACE bundle:

```bash
npm run ace:build
```

Write the deploy-time runtime config:

```bash
./deploy/write-config-js.sh
```

That writes:

- `admin-editor/dist/config.js`

with the current hosted settings:

- `apiBase`
- `authMode: "bearer"`

## 5. Upload `admin-editor/dist/` to your static host

This repo intentionally does not hard-code one hosting provider. Upload the built `admin-editor/dist/` contents to whatever static HTTPS host your environment uses.

Typical options:

- local document root
- `rsync` or `scp` to a remote server
- S3 static-site or bucket-backed hosting

Examples:

```bash
rsync -av --delete admin-editor/dist/ "$STATIC_DEPLOY_PATH"
```

```bash
aws s3 sync admin-editor/dist/ "$STATIC_DEPLOY_PATH" --delete
```

Use the example that matches your `STATIC_DEPLOY_PATH` convention. The guide does not require a specific provider.

## 6. Verify the Config API before opening ACE

Health:

```bash
curl -i "$ACE_API_BASE/api/health"
```

Expected:

- HTTP 200
- JSON health payload including service metadata

Authenticated model fetch:

```bash
curl -s \
  -H "Authorization: Bearer $CONFIG_API_TOKEN" \
  "$ACE_API_BASE/api/model"
```

Expected:

- `model`
- `meta.revision`
- validation payload

## 7. Verify the hosted ACE flow

Open the hosted ACE URL from `ACE_PUBLIC_URL`.

Current hosted behavior:

- the app reads `window.__ACE_CONFIG__` from `dist/config.js`
- bearer-token mode stores the token in browser session storage
- API calls go to `/api/*`

Basic smoke test:

1. Open ACE.
2. Enter the bearer token when prompted.
3. Confirm the editor loads the model successfully.
4. Make a small draft change and save.
5. Confirm save succeeds without publishing yet.
6. Publish the draft.

## 8. Build the plugin from the published snapshot

Published config is what the plugin build consumes through S3 sync.

After publishing:

```bash
set -a
source deploy/ace-env.env
set +a

npm run build:with-s3
```

Important:

- `POST /api/save` updates draft only
- `POST /api/publish` updates `published.json`
- `npm run build:with-s3` reads the published snapshot, not the draft

If you do not publish, the plugin build will continue using the previously published snapshot.

## 9. Update-friendly operating model

To keep private/work adoption low-churn:

- keep environment-specific values in `deploy/ace-env.env`
- keep secrets out of committed files
- keep hosted ACE runtime config in generated `admin-editor/dist/config.js`
- treat `docs/architecture/ace-static-s3-migration.md` as the architectural authority
- treat current code in `infra/config-api/`, `admin-editor/`, and `scripts/` as the tie-breaker when docs drift

This keeps future upstream/open-source updates easier to adopt because environment packaging stays outside the main product code.

## 10. Troubleshooting

### ACE loads but cannot connect

Check:

- `admin-editor/dist/config.js` exists and points to the right `ACE_API_BASE`
- the static host origin exactly matches `CORS_ALLOW_ORIGINS`
- the API is reachable at `GET /api/health`

### Save works but plugin build does not pick up changes

Check:

- you published after saving
- `published.json` points to the new snapshot
- `npm run build:with-s3` is being used, not plain `npm run build`

### Local static test works, hosted site fails

Check:

- `ACE_PUBLIC_URL` matches the actual deployed origin exactly
- no trailing slash drift in `ACE_API_BASE` or `ACE_PUBLIC_URL`
- CORS is configured with exact origins only
