# Setup Guides

## ACE setup authority

For ACE static-hosting and S3 migration topics, use:

1. [`../architecture/ace-static-s3-migration.md`](../architecture/ace-static-s3-migration.md)
2. Current code in `infra/config-api/`, `admin-editor/`, and `scripts/`
3. [`ace-public-replica.md`](./ace-public-replica.md)

Use the local ACE server guide in [`../../admin-editor/README.md`](../../admin-editor/README.md) for the `npm run admin` fallback workflow.

## Setup index

| Guide | Scope | When to use |
|-------|-------|-------------|
| [ace-public-replica.md](./ace-public-replica.md) | Static ACE hosting with remote Config API + S3-backed config. | Current hosted/static ACE path. |
| [ace-custom-spring-wrapper.md](./ace-custom-spring-wrapper.md) | ACE deployment behind the Spring wrapper with auth, RBAC, allowlist, rate-limit, and Docker. | Custom or enterprise ACE deployment behind a wrapper/SSO layer. |
| [proxy-setup.md](./proxy-setup.md) | Figma plugin LLM proxy (`figmai-proxy` + ngrok). | Local development of the Figma plugin with OpenAI. |
| [internal-api-setup.md](./internal-api-setup.md) | Figma plugin "Internal API" connection mode. | Org-hosted LLM endpoint for plugin traffic. |
| [s3-config-phase1-checklist.md](./s3-config-phase1-checklist.md) | Manual validation checklist for S3 config sync. | Verifying `seed-s3`, `sync-config`, and `push-config`. |

> `proxy-setup.md` and `ace-custom-spring-wrapper.md` describe different systems. The former is the plugin LLM transport path; the latter is an ACE deployment wrapper.
