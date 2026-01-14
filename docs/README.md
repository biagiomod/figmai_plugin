# Documentation

Welcome to the FigmAI plugin documentation. This is the **single entry point** for all documentation.

---

## Quick Start

### New to the project?
1. Start with **[Getting Started](01-getting-started.md)** [AUTHORITATIVE] for architecture overview
2. Read **[README.md](../README.md)** for project overview

### Migrating to Work Plugin?
1. Read **[Work Plugin Guide](work-plugin/README.md)** [AUTHORITATIVE] - entry point
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
- **[Message Contract](reference/message-contract.md)** [REFERENCE] - UI ↔ Main thread message types and payloads

#### Connection Modes
- **[Connection Modes Overview](connection-modes.md)** [AUTHORITATIVE] - Proxy vs Internal API comparison (coming soon)
- **[Proxy Setup](setup/proxy-setup.md)** [AUTHORITATIVE] - Proxy server configuration
- **[Internal API Setup](setup/internal-api-setup.md)** [AUTHORITATIVE] - Internal API configuration (coming soon)
- **[Response Parsing](reference/response-parsing.md)** [AUTHORITATIVE] - Unified response parsing guide (coming soon)

#### Work Plugin
- **[Work Plugin Guide](work-plugin/README.md)** [AUTHORITATIVE] - Entry point for Work Plugin documentation
- **[Migration Guide](work-plugin/migration-guide.md)** [AUTHORITATIVE] - Step-by-step migration instructions
- **[Adapter Pattern](work-plugin/adapter-pattern.md)** [CONTEXTUAL] - Work adapter pattern deep dive
- **[Extension Points](work-plugin/extension-points.md)** [REFERENCE] - All extension hooks and implementation guide
- **[Work Constraints](work-plugin/constraints.md)** [AUTHORITATIVE] - Work environment constraints (coming soon)

#### Reference
- **[Message Contract](reference/message-contract.md)** [REFERENCE] - Message types and payloads
- **[Configuration](configuration.md)** [REFERENCE] - Configuration schema and environment variables
- **[Content Models](content-models.md)** [REFERENCE] - Table format presets for Content Table Assistant
- **[Response Parsing](reference/response-parsing.md)** [AUTHORITATIVE] - Unified response parsing guide (coming soon)

#### Setup & Troubleshooting
- **[Proxy Setup](setup/proxy-setup.md)** [AUTHORITATIVE] - Proxy server and plugin setup
- **[Internal API Setup](setup/internal-api-setup.md)** [AUTHORITATIVE] - Internal API setup guide (coming soon)
- **[Debugging](setup/debugging.md)** [AUTHORITATIVE] - Debug controls and troubleshooting (coming soon)
- **[Troubleshooting](troubleshooting/)** - Common issues and solutions
  - [Internal API Parsing](troubleshooting/internal-api-parsing.md) [REFERENCE] - Internal API response parsing troubleshooting

#### Other
- **[Security](security.md)** [AUTHORITATIVE] - Security considerations and data storage
- **[Health Report](health-report.md)** [REFERENCE] - Codebase health status and migration readiness assessment
- **[AI Task Brief](ai-task-brief.md)** [REFERENCE] - Quick reference for common migration tasks

#### Migration Documentation
- **[Migration Index](migration/README.md)** [REFERENCE] - Migration documentation overview
- **[Portability Analysis](migration/portability-analysis.md)** [REFERENCE] - Risk assessment and portability findings

#### Archived (Historical/Strategic)
- **[Archive](archive/)** [HISTORICAL] - Historical audits, completed refactors, strategic planning
  - See [archive/README.md](archive/README.md) for details

---

## Documentation Labels

- **[AUTHORITATIVE]** - Source of truth for this topic. Read this first.
- **[CONTEXTUAL]** - Supporting context or deep dive. Useful but not required.
- **[REFERENCE]** - Quick reference, schemas, lookup tables. Use for specific lookups.
- **[HISTORICAL]** - Archived content. Kept for reference but not current.

---

## Finding What You Need

**I want to understand the architecture:**
→ Start with [Getting Started](01-getting-started.md) [AUTHORITATIVE]

**I want to migrate to Work Plugin:**
→ Read [Work Plugin Guide](work-plugin/README.md) [AUTHORITATIVE], then [Migration Guide](work-plugin/migration-guide.md) [AUTHORITATIVE]

**I need to implement a Work feature:**
→ Check [Extension Points](work-plugin/extension-points.md) [REFERENCE] for available hooks

**I need to understand connection modes:**
→ Read [Connection Modes](connection-modes.md) [AUTHORITATIVE] (coming soon), then setup guide for your mode

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
├── connection-modes.md          # [AUTHORITATIVE] Proxy vs Internal API (coming soon)
│
├── work-plugin/                 # Work Plugin documentation
│   ├── README.md               # [AUTHORITATIVE] Entry point
│   ├── migration-guide.md      # [AUTHORITATIVE] Step-by-step migration
│   ├── adapter-pattern.md      # [CONTEXTUAL] Adapter pattern deep dive
│   ├── extension-points.md     # [REFERENCE] Extension hooks reference
│   └── constraints.md          # [AUTHORITATIVE] Work constraints (coming soon)
│
├── setup/                       # Setup guides
│   ├── proxy-setup.md          # [AUTHORITATIVE] Proxy configuration
│   ├── internal-api-setup.md  # [AUTHORITATIVE] Internal API setup (coming soon)
│   └── debugging.md            # [AUTHORITATIVE] Debug controls (coming soon)
│
├── reference/                   # Reference documentation
│   ├── message-contract.md     # [REFERENCE] Message types
│   ├── response-parsing.md     # [AUTHORITATIVE] Response parsing (coming soon)
│   └── (other reference docs)
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
