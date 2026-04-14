# Setup Guides

## ACE setup authority

For ACE static-hosting and S3 migration topics, use:

1. [`../architecture/ace-static-s3-migration.md`](../architecture/ace-static-s3-migration.md)
2. Current code in `infra/config-api/`, `admin-editor/`, and `scripts/`
3. [`ace-private-env-setup.md`](./ace-private-env-setup.md)

Use the local ACE server guide in [`../../admin-editor/README.md`](../../admin-editor/README.md) for the `npm run admin` local dev workflow.

The Spring Boot wrapper docs (`ace-custom-spring-wrapper.md`, `spring-wrapper-installation-guide.md`) are **archived** — see `docs/archive/deprecated-ace-deployment/`. They are not the active private/work deployment path.

## Setup index

| Guide | Scope | When to use |
|-------|-------|-------------|
| [admin-editor/README.md](../../admin-editor/README.md) | Local ACE dev server (`npm run admin`). | **Start here for local ACE development.** Runs the full ACE UI at `localhost:3333`. No infrastructure required. |
| [ace-private-env-setup.md](./ace-private-env-setup.md) | Generic private/work environment packaging for static ACE + Config API + S3. | **Current reusable hosted/static ACE setup.** Use for private/work deployments on AWS + Lambda + S3. |
| [ace-public-replica.md](./ace-public-replica.md) | Thin public/static reference for the same deployment shape. | When you only need the minimal hosted/static overview. |
| [proxy-setup.md](./proxy-setup.md) | Figma plugin LLM proxy (`figmai-proxy` + ngrok). | Local development of the Figma plugin with OpenAI. |
| [internal-api-setup.md](./internal-api-setup.md) | Figma plugin "Internal API" connection mode. | Org-hosted LLM endpoint for plugin traffic. |
| [s3-config-phase1-checklist.md](./s3-config-phase1-checklist.md) | Manual validation checklist for S3 config sync. | Verifying `seed-s3`, `sync-config`, and `push-config`. |
| `docs/archive/deprecated-ace-deployment/ace-custom-spring-wrapper.md` ⚠️ **ARCHIVED** | ACE deployment behind the Spring wrapper with auth, RBAC, allowlist, rate-limit, and Docker. | Historical reference only. Do not use for new deployments. Active path is AWS + Lambda + S3. |
| `docs/archive/deprecated-ace-deployment/spring-wrapper-installation-guide.md` ⚠️ **ARCHIVED** | Step-by-step Docker Compose installation for the Spring wrapper. | Historical reference only. Do not use for new deployments. |
| [phase1-s3-migration-summary.md](./phase1-s3-migration-summary.md) | Summary of Phase 1 S3 sync implementation. | Historical implementation record for the Phase 1 S3 migration. |

> `proxy-setup.md` describes the plugin LLM transport path. The archived Spring wrapper docs describe a separate, now-deprecated ACE deployment approach.
