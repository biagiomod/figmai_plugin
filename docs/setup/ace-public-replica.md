# ACE Public Replica Setup

> Status: Secondary setup reference.
> For the reusable private/work environment package, use `docs/setup/ace-private-env-setup.md`.

This document stays in the repo as a thinner public/static reference for the current ACE deployment shape:

- ACE is built from `admin-editor/public/` into `admin-editor/dist/`
- hosted runtime configuration is supplied by `admin-editor/dist/config.js`
- hosted auth mode is `bearer`
- current Config API routes live under `/api/*`
- plugin S3 sync consumes the published snapshot, not the draft

## What this guide is for

Use this guide when you only need the high-level hosted/static ACE flow without the fuller private/work environment packaging.

If you need:

- a reusable env file template
- a deploy-time `config.js` writer
- generic static-host guidance
- a durable setup package for another developer

use `docs/setup/ace-private-env-setup.md` instead.

## Minimal hosted/static flow

### 1. Seed S3

```bash
export S3_BUCKET=your-bucket-name
export S3_REGION=us-east-1
export S3_PREFIX=figmai/
export CONFIG_AUTHOR=your-name-or-team

npm run seed-s3
```

### 2. Deploy the Config API

Current implementation:

- SAM template: `infra/config-api/template.yaml`
- CORS parameter: `CorsAllowOrigins`
- runtime env variable: `CORS_ALLOW_ORIGINS`
- exact-origin CORS only

The generic deploy flow is documented in `docs/setup/ace-private-env-setup.md`.

### 3. Build ACE and write `config.js`

```bash
npm run ace:build
```

Hosted config shape:

```js
window.__ACE_CONFIG__ = {
  apiBase: "https://<api-id>.execute-api.<region>.amazonaws.com",
  authMode: "bearer"
}
```

### 4. Upload `admin-editor/dist/`

Upload the built `admin-editor/dist/` contents to your static host.

The repo still contains a thin historical/public helper script for one specific provider path:

- `npm run ace:deploy:hostgator`

It is not the primary generic recommendation. Prefer the provider-neutral setup in `docs/setup/ace-private-env-setup.md`.

### 5. Publish before building the plugin from S3

Current behavior:

- `POST /api/save` updates draft state
- `POST /api/publish` updates the published snapshot pointer
- `npm run build:with-s3` reads the published snapshot

Build from published S3 config:

```bash
export S3_BUCKET=your-bucket-name
export S3_REGION=us-east-1
export S3_PREFIX=figmai/

npm run build:with-s3
```

Local/offline fallback remains available:

```bash
npm run build:offline
```

## Local proxy workflow

Use this when testing the static UI locally against the remote API without browser CORS issues:

```bash
export ACE_API_URL=https://<api-id>.execute-api.<region>.amazonaws.com
export ACE_API_TOKEN=<same token used by API>
npm run admin:proxy
```

Open `http://127.0.0.1:3334`.
