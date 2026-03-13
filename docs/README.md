# Documentation

This is the main entry point for human-facing documentation in `figmai_plugin`.

## Current Authority Map

### Core plugin docs
1. [`01-getting-started.md`](01-getting-started.md) — primary architecture and repo orientation
2. [`invariants.md`](invariants.md) — non-negotiable guardrails
3. Topic-specific setup/reference docs linked below

### ACE / Config API topics
For ACE migration and hosting topics, use this authority order:

1. [`architecture/ace-static-s3-migration.md`](architecture/ace-static-s3-migration.md)
2. Current code in `infra/config-api/`, `admin-editor/`, and `scripts/`
3. [`setup/ace-public-replica.md`](setup/ace-public-replica.md)

Historical ACE planning docs are kept for reference only and are not authoritative.

### Generated build output
The following are build artifacts, not maintained documentation:

- `admin-editor/dist/`
- `infra/config-api/dist/`

---

## Start Here

### Repo orientation
- [`01-getting-started.md`](01-getting-started.md) — architecture overview
- [`../README.md`](../README.md) — project overview and build commands
- [`invariants.md`](invariants.md) — hard guardrails

### ACE / S3 / hosting
- [`architecture/ace-static-s3-migration.md`](architecture/ace-static-s3-migration.md) — target ACE + Config API + S3 architecture
- [`setup/ace-public-replica.md`](setup/ace-public-replica.md) — current static ACE + remote API setup
- [`../admin-editor/README.md`](../admin-editor/README.md) — local ACE server workflow (`npm run admin`)
- [`security/config-api-auth.md`](security/config-api-auth.md) — current bearer-token auth model
- [`ai-context.md`](ai-context.md) — active migration context for AI/code-steward work
- [`chat-context/migration-private-work.md`](chat-context/migration-private-work.md) — durable handoff for the current ACE migration workstream

### Plugin connection/setup
- [`connection-modes.md`](connection-modes.md)
- [`setup/README.md`](setup/README.md)
- [`setup/proxy-setup.md`](setup/proxy-setup.md)
- [`setup/internal-api-setup.md`](setup/internal-api-setup.md)

### Custom/plugin extension docs
- [`work-plugin/README.md`](work-plugin/README.md)
- [`work-plugin/migration-guide.md`](work-plugin/migration-guide.md)
- [`work-plugin/adapter-pattern.md`](work-plugin/adapter-pattern.md)
- [`work-plugin/extension-points.md`](work-plugin/extension-points.md)
- [`../custom/README.md`](../custom/README.md)

---

## Active Reference Docs

### Architecture and contracts
- [`open-source-architecture.md`](open-source-architecture.md)
- [`reference/message-contract.md`](reference/message-contract.md)
- [`configuration.md`](configuration.md)
- [`content-models.md`](content-models.md)
- [`reference/debugging.md`](reference/debugging.md)
- [`security.md`](security.md)

### ACE references
- [`admin-config-editor-audit.md`](admin-config-editor-audit.md)
- [`admin-config-editor-architecture.md`](admin-config-editor-architecture.md)

### Analytics and feature references
- [`analytics/setup.md`](analytics/setup.md)
- [`analytics/endpoint-spec.md`](analytics/endpoint-spec.md)
- [`analytics/metrics-guide.md`](analytics/metrics-guide.md)
- [`analytics-implementation-summary.md`](analytics-implementation-summary.md)
- [`deceptive-review.md`](deceptive-review.md)
- [`backlog.md`](backlog.md)

---

## Historical Context

- [`archive/README.md`](archive/README.md) — archive index and policy
- Historical and superseded docs should live under `docs/archive/` rather than the active docs root.

---

## Documentation Rules

- New active human-facing docs should use lowercase kebab-case filenames.
- Historical filenames under `docs/archive/` may retain legacy naming.
- If a doc is not authoritative, label it clearly and keep it out of the primary navigation.
- When moving or renaming docs, update links in the same change.
