# Documentation

Welcome to the FigmAI plugin documentation. This is the **single entry point** for all documentation.

**Canonical stack (SSOT):** [SSOT.md](SSOT.md) → [ARCHITECTURE.md](ARCHITECTURE.md) → [RUNBOOK.md](RUNBOOK.md) → [DECISIONS.md](DECISIONS.md). Start here for orientation, data flow, build/run, and key decisions. **Admin Config Editor (ACE) supersession:** current plan is [ADMIN_CONFIG_EDITOR_PLAN_V3.md](ADMIN_CONFIG_EDITOR_PLAN_V3.md) [AUTHORITATIVE]; supersedes [V2](archive/ADMIN_CONFIG_EDITOR_PLAN_V2.md) [SUPERSEDED REFERENCE], which supersedes [IMPLEMENTATION_PLAN](archive/ADMIN_CONFIG_EDITOR_IMPLEMENTATION_PLAN.md) [HISTORICAL].

---

## Quick Start

### New to the project?
1. Start with **[Getting Started](01-getting-started.md)** [AUTHORITATIVE] for architecture overview
2. Read **[README.md](../README.md)** for project overview

### Migrating to Custom Plugin?
1. Read **[Custom Plugin Guide](work-plugin/README.md)** [AUTHORITATIVE] - entry point
2. Follow **[Migration Guide](work-plugin/migration-guide.md)** [AUTHORITATIVE] for step-by-step instructions

### Setting up connection?
1. Read **[Connection Modes](connection-modes.md)** [AUTHORITATIVE] - Proxy vs Internal API comparison
2. Follow setup guide for your chosen mode

### For AI Assistants?
1. Read **[Getting Started](01-getting-started.md)** [AUTHORITATIVE] for architecture
2. Quick reference: **[AI Task Brief](ai-task-brief.md)** [REFERENCE]

---

## Documentation Map

### Core Topics

#### Architecture
- **[Getting Started](01-getting-started.md)** [AUTHORITATIVE] - Architecture guide for AI assistants and human developers
- **[Invariants](invariants.md)** [REFERENCE] - Implemented invariants (routing, handler contract, placement)
- **[Message Contract](reference/message-contract.md)** [REFERENCE] - UI ↔ Main thread message types and payloads
- **[Open Source Architecture](open-source-architecture.md)** [REFERENCE] - Overview for enterprise security/legal reviewers

#### Connection Modes
- **[Connection Modes Overview](connection-modes.md)** [AUTHORITATIVE] - Proxy vs Internal API comparison
- **[Proxy Setup](setup/proxy-setup.md)** [AUTHORITATIVE] - Proxy server configuration
- **[Internal API Setup](setup/internal-api-setup.md)** [AUTHORITATIVE] - Internal API configuration

#### Custom Plugin
- **[Custom Plugin Guide](work-plugin/README.md)** [AUTHORITATIVE] - Entry point for Custom Plugin documentation
- **[Migration Guide](work-plugin/migration-guide.md)** [AUTHORITATIVE] - Step-by-step migration instructions
- **[Adapter Pattern](work-plugin/adapter-pattern.md)** [CONTEXTUAL] - Custom adapter pattern deep dive
- **[Extension Points](work-plugin/extension-points.md)** [REFERENCE] - All extension hooks and implementation guide

#### Custom Overlay System
- **[Custom Overlay Guide](../custom/README.md)** [AUTHORITATIVE] - Custom overlay system for config and knowledge bases

#### Analytics
- **[Setup Guide](analytics/setup.md)** [AUTHORITATIVE] - How to enable and configure analytics
- **[Endpoint Specification](analytics/endpoint-spec.md)** [REFERENCE] - API specification for analytics ingestion
- **[Metrics Guide](analytics/metrics-guide.md)** [REFERENCE] - Event types and metrics guide
- **[Implementation Summary](analytics-implementation-summary.md)** [REFERENCE] - Analytics implementation details and architecture

#### Reference
- **[Message Contract](reference/message-contract.md)** [REFERENCE] - Message types and payloads
- **[Configuration](configuration.md)** [REFERENCE] - Configuration schema and environment variables
- **[Content Models](content-models.md)** [REFERENCE] - Table format presets for Content Table Assistant
- **[Debugging](reference/debugging.md)** [REFERENCE] - Scoped debugging system and configuration

#### Setup & Troubleshooting
- **[Proxy Setup](setup/proxy-setup.md)** [AUTHORITATIVE] - Proxy server and plugin setup
- **[Internal API Setup](setup/internal-api-setup.md)** [AUTHORITATIVE] - Internal API setup guide
- **[Debugging](reference/debugging.md)** [REFERENCE] - Scoped debugging and configuration
- **[Troubleshooting](troubleshooting/)** - Common issues and solutions
  - [Internal API Parsing](troubleshooting/internal-api-parsing.md) [REFERENCE] - Internal API response parsing troubleshooting

#### Custom / Admin Config Editor
- **[Admin Config Editor – Plan V3](ADMIN_CONFIG_EDITOR_PLAN_V3.md)** [AUTHORITATIVE] - Current plan: sources of truth, classification, Phases 0–3, Go/No-Go, risks, doc hygiene policy
- **[Admin Config Editor – Run the server](../admin-editor/README.md)** [REFERENCE] - How to run the local admin editor (Phase 1 server), what is editable, backups, troubleshooting
- **[Admin Config Editor – Revised Plan (V2)](archive/ADMIN_CONFIG_EDITOR_PLAN_V2.md)** [SUPERSEDED REFERENCE] - Superseded by V3; in archive
- **[Admin Config Editor – Audit](ADMIN_CONFIG_EDITOR_AUDIT.md)** [REFERENCE] - Config and assistant sources, read/write flow
- **[Admin Config Editor – Architecture](ADMIN_CONFIG_EDITOR_ARCHITECTURE.md)** [REFERENCE] - Single editable model, write targets, validation

#### Other plans and summaries
- **[Admin Config Editor – Implementation Plan](archive/ADMIN_CONFIG_EDITOR_IMPLEMENTATION_PLAN.md)** [HISTORICAL] - Superseded by Plan V2; in archive
- **[Analytics Tagging – Assistant Plan](ANALYTICS_TAGGING_ASSISTANT_PLAN.md)** [REFERENCE] - Analytics Tagging assistant design
- **[Analytics Tagging – Two-Step Workflow Plan](ANALYTICS_TAGGING_TWO_STEP_WORKFLOW_PLAN.md)** [REFERENCE] - Two-step single-selection workflow
- **[Analytics Tagging – Verification](ANALYTICS_TAGGING_VERIFICATION.md)** [REFERENCE] - Verification notes
- **[Content Safety and Recovery Plan](CONTENT_SAFETY_AND_RECOVERY_PLAN.md)** [REFERENCE] - Content safety and recovery design
- **[Selection Policy Plan](SELECTION_POLICY_PLAN.md)** [REFERENCE] - Selection policy for Analytics Tagging
- **[Documentation Cleanup Summary](documentation-cleanup-summary.md)** [REFERENCE] - Documentation cleanup notes
- **[Deceptive Review](deceptive-review.md)** [REFERENCE] - Deceptive review feature
- **[Smart Placement V2 Plan](smart-placement-v2-plan.md)** [REFERENCE] - Smart placement plan
- **[Smart Placement V2 Summary](smart-placement-v2-summary.md)** [REFERENCE] - Smart placement summary
- **[Internal API Routing (Plans)](plans/internal-api-routing-and-stability-implementation.md)** [REFERENCE] - Internal API routing implementation plan

#### Other
- **[Security](security.md)** [AUTHORITATIVE] - Security considerations and data storage
- **[Health Report](health-report.md)** [REFERENCE] - Codebase health status and migration readiness assessment
- **[AI Task Brief](ai-task-brief.md)** [REFERENCE] - Quick reference for common migration tasks
- **[Backlog](backlog.md)** [REFERENCE] - Canonical backlog for planned work and technical debt
- **[Documentation Governance](documentation-governance.md)** [REFERENCE] - Doc hygiene, link/case audit, supersession and naming rules

#### Migration Documentation
- **[Migration Index](migration/README.md)** [REFERENCE] - Migration documentation overview
- **[Portability Analysis](migration/portability-analysis.md)** [REFERENCE] - Risk assessment and portability findings

#### Archived / Historical
- **[Archive index](archive/README.md)** — All archived docs (historical only; not authoritative).
- **Root-level archive:** ACE V2/Implementation Plan, Design Critique/Workshop migration plans, Errors audits, LLM prompt audits, ARCHITECTURE_AUDIT_ASSISTANTS, ANALYTICS_TAGGING_ACTIONID_AUDIT, PROJECT_CONTEXT_FROM_CHATGPT, PR11c1 hardening/QA evidence. Filenames preserved (including ALL_CAPS).
- **Subfolders:** [archive/phases/](archive/phases/) (Phase 0/1/2, UI stabilization), [archive/verification/](archive/verification/) (verification reports), [archive/qa/](archive/qa/), [archive/strategic/](archive/strategic/), [archive/refactor-tickets/](archive/refactor-tickets/).
- For **current** docs use the sections above; for **historical** context only, use archive.

---

## Documentation Labels

- **[AUTHORITATIVE]** - Source of truth for this topic. Read this first.
- **[SUPERSEDED REFERENCE]** - Superseded by a newer doc; kept for reference only.
- **[CONTEXTUAL]** - Supporting context or deep dive. Useful but not required.
- **[REFERENCE]** - Quick reference, schemas, lookup tables. Use for specific lookups.
- **[HISTORICAL]** - Archived content. Kept for reference but not current.

---

## Finding What You Need

**I want to understand the architecture:**
→ Start with [Getting Started](01-getting-started.md) [AUTHORITATIVE]

**I want to migrate to Custom Plugin:**
→ Read [Custom Plugin Guide](work-plugin/README.md) [AUTHORITATIVE], then [Migration Guide](work-plugin/migration-guide.md) [AUTHORITATIVE]

**I need to implement a custom feature:**
→ Check [Extension Points](work-plugin/extension-points.md) [REFERENCE] for available hooks

**I need to understand connection modes:**
→ Read [Connection Modes](connection-modes.md) [AUTHORITATIVE], then setup guide for your mode

**I need to understand message flow:**
→ Read [Message Contract](reference/message-contract.md) [REFERENCE]

**I need to configure the plugin:**
→ See [Configuration](configuration.md) [REFERENCE]

**I'm troubleshooting an issue:**
→ Check [Troubleshooting](troubleshooting/) directory

**I'm an AI assistant working on this codebase:**
→ Start with [Getting Started](01-getting-started.md) [AUTHORITATIVE], then [AI Task Brief](ai-task-brief.md) [REFERENCE]

---

## Documentation Structure

```
docs/
├── README.md                    # This file - navigation index
│
├── 01-getting-started.md        # [AUTHORITATIVE] Architecture guide
│
├── connection-modes.md          # [AUTHORITATIVE] Proxy vs Internal API
│
├── work-plugin/                 # Custom Plugin documentation
│   ├── README.md               # [AUTHORITATIVE] Entry point
│   ├── migration-guide.md      # [AUTHORITATIVE] Step-by-step migration
│   ├── adapter-pattern.md      # [CONTEXTUAL] Adapter pattern deep dive
│   └── extension-points.md     # [REFERENCE] Extension hooks reference
│
├── setup/                       # Setup guides
│   ├── proxy-setup.md          # [AUTHORITATIVE] Proxy configuration
│   └── internal-api-setup.md   # [AUTHORITATIVE] Internal API setup
│
├── reference/                   # Reference documentation
│   ├── message-contract.md     # [REFERENCE] Message types
│   └── debugging.md            # [REFERENCE] Debugging system
│
├── troubleshooting/             # Troubleshooting guides
│   └── internal-api-parsing.md # [REFERENCE] Internal API troubleshooting
│
├── migration/                   # Migration documentation
│   ├── README.md
│   └── portability-analysis.md
│
└── archive/                     # Historical/archived docs
    ├── README.md
    ├── strategic/              # Strategic/future planning
    └── (other archived docs)
```

---

## Contributing to Documentation

When adding new documentation:

1. Use lowercase filenames with hyphens (e.g., `new-guide.md`)
2. Add a clear header with purpose and audience
3. Mark with appropriate label: [AUTHORITATIVE], [CONTEXTUAL], [REFERENCE], or [HISTORICAL]
4. Update this README.md with a link to your new doc
5. Update relevant cross-references in other docs
6. Place in appropriate subdirectory (work-plugin/, setup/, reference/, troubleshooting/, etc.)
