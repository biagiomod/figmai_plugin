# Documentation

Welcome to the FigmAI plugin documentation. This directory contains all project documentation organized by purpose.

---

## Quick Start

### New to the project?

1. Start with [Getting Started](getting-started.md) for architecture overview
2. Read [README.md](../README.md) for project overview

### Migrating to Work Plugin?

1. Read [Work Migration Guide](work-migration.md)
2. Reference [Extension Points](extension-points.md) for available hooks

### For AI Assistants?

1. Read [Getting Started](getting-started.md)
2. Quick reference: [AI Task Brief](ai-task-brief.md)

---

## Documentation by Category

### Getting Started

- **[Getting Started](getting-started.md)** - Architecture guide for AI assistants and human developers

### Work Plugin

- **[Work Migration](work-migration.md)** - Complete step-by-step migration guide
- **[Work Adapter](work-adapter.md)** - Work adapter pattern documentation
- **[Extension Points](extension-points.md)** - All extension hooks and implementation guide

### Reference

- **[Message Contract](message-contract.md)** - UI ↔ Main thread message types and payloads
- **[Configuration](configuration.md)** - Configuration schema and environment variables
- **[Security](security.md)** - Security considerations and data storage
- **[Proxy Setup](proxy-and-plugin-setup.md)** - Proxy server and plugin setup guide
- **[Content Models](content-models.md)** - Table format presets for Content Table Assistant

### Status & Reports

- **[Health Report](health-report.md)** - Codebase health status and migration readiness assessment

### For AI Assistants

- **[AI Task Brief](ai-task-brief.md)** - Quick reference for common migration tasks

### Migration

- **[Migration Index](migration/README.md)** - Migration documentation overview
- **[Portability Analysis](migration/portability-analysis.md)** - Risk assessment and portability findings

---

## Documentation Structure

```
docs/
├── README.md                    # This file - navigation index
│
├── getting-started.md           # Architecture guide
├── work-migration.md            # Migration guide
│
├── work-adapter.md              # Adapter pattern
├── extension-points.md          # Extension hooks
│
├── message-contract.md          # Message types
├── configuration.md             # Configuration reference
├── security.md                  # Security guide
├── proxy-and-plugin-setup.md   # Setup guide
├── content-models.md             # Table format presets
│
├── ai-task-brief.md            # AI quick reference
├── health-report.md            # Codebase health status
│
└── migration/                   # Migration docs
    ├── README.md
    └── portability-analysis.md
```

---

## Finding What You Need

**I want to understand the architecture:**
→ Start with [Getting Started](getting-started.md)

**I want to migrate to Work Plugin:**
→ Read [Work Migration](work-migration.md), then [Extension Points](extension-points.md)

**I need to implement a Work feature:**
→ Check [Extension Points](extension-points.md) for available hooks

**I need to understand message flow:**
→ Read [Message Contract](message-contract.md)

**I need to configure the plugin:**
→ See [Configuration](configuration.md)

**I'm an AI assistant working on this codebase:**
→ Start with [Getting Started](getting-started.md), then [AI Task Brief](ai-task-brief.md)

---

## Contributing to Documentation

When adding new documentation:

1. Use lowercase filenames with hyphens (e.g., `new-guide.md`)
2. Add a clear header with purpose and audience
3. Update this README.md with a link to your new doc
4. Update relevant cross-references in other docs
