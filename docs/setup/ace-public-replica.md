# ACE Public Replica Setup

This guide deploys ACE as a static SPA and uses the AWS Config API (Lambda + API Gateway + S3) as the backend.

## 1) Create S3 bucket + prefix

- Create a private bucket (example: `my-figmai-config`)
- Use a prefix (default: `figmai/`)
- Enable versioning on the bucket

## 2) Seed initial draft data

From repo root:

```bash
export S3_BUCKET=my-figmai-config
export S3_REGION=us-east-1
export S3_PREFIX=figmai/
export CONFIG_AUTHOR=dev-user@example.com

npm run seed-s3
```

This writes initial `draft/*`, `snapshots/<id>/*`, and `published.json`.

## 3) Deploy SAM Config API

```bash
cd infra/config-api
npm install
sam build
sam deploy --guided
```

Use these parameters during guided deploy:

- `S3BucketName` = your config bucket
- `S3Prefix` = `figmai/` (or your prefix)
- `ConfigApiToken` = long random secret
- `CorsAllowOrigin` = `*` or your ACE origin

After deploy, note `ConfigApiUrl`.

## 4) Build and configure static ACE

From repo root:

```bash
npm run ace:build
```

Set `admin-editor/dist/config.js` for hosted mode:

```js
window.__ACE_CONFIG__ = {
  apiBase: "https://<api-id>.execute-api.<region>.amazonaws.com",
  authMode: "bearer"
}
```

Current MVP code expects ACE API routes under `/api/*`.

## 5) Deploy static ACE to host

Option A: automated HostGator deploy

```bash
cp admin-editor/.env.deploy.example admin-editor/.env.deploy
# fill env values in your shell (or source file)
export ACE_API_BASE=https://<api-id>.execute-api.<region>.amazonaws.com
export HOSTGATOR_HOST=...
export HOSTGATOR_USER=...
export HOSTGATOR_PASS=...
export HOSTGATOR_PATH=/public_html/figmai/ace

npm run ace:deploy:hostgator
```

Option B: manual upload

- Upload all files in `admin-editor/dist/` to your host web root/subpath
- Ensure `.htaccess` from `admin-editor/deploy/.htaccess` is present

## 6) Local proxy workflow (optional)

Use this when testing the static UI locally against the remote API while avoiding browser CORS issues:

```bash
export ACE_API_URL=https://<api-id>.execute-api.<region>.amazonaws.com
export ACE_API_TOKEN=<same token used by API>
npm run admin:proxy
```

Open `http://127.0.0.1:3334`.

## 7) Build plugin using published S3 config

```bash
export S3_BUCKET=my-figmai-config
export S3_REGION=us-east-1
export S3_PREFIX=figmai/

npm run build:with-s3
```

Offline/local fallback remains available:

```bash
npm run build:offline
```
