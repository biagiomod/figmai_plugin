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
3. [`setup/ace-private-env-setup.md`](setup/ace-private-env-setup.md) — current generic private/work environment setup

[`setup/ace-public-replica.md`](setup/ace-public-replica.md) is a thinner reference retained for compatibility.
[`setup/ace-custom-spring-wrapper.md`](setup/ace-custom-spring-wrapper.md) is **deprecated** — the Spring Boot wrapper deployment path is no longer the active private/work direction.

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
- [`setup/ace-private-env-setup.md`](setup/ace-private-env-setup.md) — current generic private/work environment setup for static ACE + Config API + S3
- [`setup/ace-public-replica.md`](setup/ace-public-replica.md) — thinner public/static reference retained for compatibility
- [`../admin-editor/README.md`](../admin-editor/README.md) — local ACE server workflow (`npm run admin`)
- [`security/config-api-auth.md`](security/config-api-auth.md) — current bearer-token auth model

### Plugin connection/setup
- [`connection-modes.md`](connection-modes.md)
- [`setup/README.md`](setup/README.md)
- [`setup/proxy-setup.md`](setup/proxy-setup.md)
- [`setup/internal-api-setup.md`](setup/internal-api-setup.md)

### Assistant development
- [`assistant-sdk.md`](assistant-sdk.md) — **strike-team guide**: how to build and maintain an assistant (ownership model, file layout, testing)
- [`../src/assistants/assistants.md`](../src/assistants/assistants.md) — canonical live assistant registry (what is running, handler and KB paths, pipeline)
- [`../src/core/assistants/handlers/README.md`](../src/core/assistants/handlers/README.md) — handler-to-assistant map with pre/post-LLM classification

### Custom/plugin extension docs
- [`work-plugin/README.md`](work-plugin/README.md)
- [`work-plugin/migration-guide.md`](work-plugin/migration-guide.md)
- [`work-plugin/adapter-pattern.md`](work-plugin/adapter-pattern.md)
- [`work-plugin/extension-points.md`](work-plugin/extension-points.md)
- [`../custom/README.md`](../custom/README.md)

### AI working context
- [`ai-context.md`](ai-context.md) — active migration context for AI/code-steward work
- [`ai-task-brief.md`](ai-task-brief.md) — quick reference for AI agents executing Custom Plugin migration tasks
- [`chat-context/migration-private-work.md`](chat-context/migration-private-work.md) — durable handoff for the ACE migration workstream

---

## Active Reference Docs

### Architecture and contracts
- [`open-source-architecture.md`](open-source-architecture.md)
- [`reference/message-contract.md`](reference/message-contract.md)
- [`configuration.md`](configuration.md)
- [`content-models.md`](content-models.md)
- [`reference/debugging.md`](reference/debugging.md)
- [`security.md`](security.md)
- [`smart-placement-v2-plan.md`](smart-placement-v2-plan.md) — artifact placement and replacement semantics (referenced by `invariants.md` invariant #3)

### Architecture audits and RFCs
These are living reference documents for active refactor/migration work — not historical archives.
- [`audits/assistants-architecture-audit-verified.md`](audits/assistants-architecture-audit-verified.md) — verified implementation map of the Assistants system (used as baseline for active refactors)
- [`audits/refactor-plan-runtime-assistants-kb-rfc.md`](audits/refactor-plan-runtime-assistants-kb-rfc.md) — RFC for runtime contract (A), assistant config (B), KB normalization (C) refactors
- [`audits/refactor-kickoff-runtime-assistants-kb.md`](audits/refactor-kickoff-runtime-assistants-kb.md) — refactor kickoff notes
- [`audits/rich-text-unification-plan.md`](audits/rich-text-unification-plan.md) — rich text formatting unification audit and plan
- [`audits/guardrails-pr9-note.md`](audits/guardrails-pr9-note.md) — PR9 guardrails and routing regression matrix
- [`audits/pr11a-kb-normalization-foundation-plan.md`](audits/pr11a-kb-normalization-foundation-plan.md) — PR11a KB normalization foundation

### Contribution and governance
- [`collab-mode.md`](collab-mode.md) — policy for when and how to switch from solo to collaboration mode (ESLint, CI, pre-commit, PR templates)

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

### KB authoring tools
- [`kb-import-prompt.md`](kb-import-prompt.md) — prompt template for converting raw text to normalized KB JSON schema

### Active implementation plans and specs
- [`plans/`](plans/) — active feature specs and implementation plans
- [`superpowers/plans/`](superpowers/plans/) — implementation plans generated by the superpowers planning tool (6 files; tool-managed location)
- [`superpowers/specs/`](superpowers/specs/) — architecture design specs from superpowers (2 files)

---

## Historical Context

- [`archive/README.md`](archive/README.md) — archive index and policy
- Historical and superseded docs should live under `docs/archive/` rather than the active docs root.

---

## Documentation Rules

See [`documentation-governance.md`](documentation-governance.md) for the full governance policy (document classes, naming rules, navigation rules, link audit procedure, generated output policy).

Summary:

- New active human-facing docs should use lowercase kebab-case filenames.
- Historical filenames under `docs/archive/` may retain legacy naming.
- If a doc is not authoritative, label it clearly and keep it out of the primary navigation.
- When moving or renaming docs, update links in the same change.
