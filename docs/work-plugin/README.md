# Custom Plugin Documentation

This directory contains all documentation related to the Custom Plugin variant of FigmAI.

---

## Quick Start

**New to Custom Plugin?**
1. Start with **[Migration Guide](migration-guide.md)** [AUTHORITATIVE] - Step-by-step migration instructions
2. Review **[Extension Points](extension-points.md)** [REFERENCE] - Available hooks and implementation guide
3. Understand **[Adapter Pattern](adapter-pattern.md)** [CONTEXTUAL] - How the custom adapter works

---

## Documentation

### Core Guides

- **[Migration Guide](migration-guide.md)** [AUTHORITATIVE] - Complete step-by-step migration instructions
  - Prerequisites and checklists
  - Extension points implementation
  - Configuration and troubleshooting
  - Verification checklist

- **[Extension Points](extension-points.md)** [REFERENCE] - All extension hooks and implementation guide
  - Component Scanner
  - Knowledge Base Loader
  - Compliance Hook
  - Custom Provider
  - And more...

- **[Adapter Pattern](adapter-pattern.md)** [CONTEXTUAL] - Custom adapter architecture deep dive
  - Override mechanism
  - Migration path
  - Best practices

---

## What is Custom Plugin?

The Custom Plugin is a variant of the FigmAI plugin designed for restricted enterprise environments. It uses an adapter pattern to inject custom-only features without modifying the Public Plugin codebase.

**Key Features:**
- Session-based authentication (no API keys)
- Internal API integration
- Custom-specific extensions (component scanning, compliance, etc.)
- Maintains Public↔Custom boundary

---

## Related Documentation

- **[Main Documentation Index](../README.md)** - Complete documentation navigation
- **[Getting Started](../01-getting-started.md)** [AUTHORITATIVE] - Architecture overview
- **[Connection Modes](../connection-modes.md)** [AUTHORITATIVE] - Proxy vs Internal API (coming soon)
- **[Setup Guides](../setup/)** - Connection setup instructions

---

## Finding What You Need

**I want to migrate to Custom Plugin:**
→ Start with [Migration Guide](migration-guide.md) [AUTHORITATIVE]

**I need to implement a custom extension:**
→ Check [Extension Points](extension-points.md) [REFERENCE] for available hooks

**I want to understand how the adapter works:**
→ Read [Adapter Pattern](adapter-pattern.md) [CONTEXTUAL]

**I'm troubleshooting a Custom Plugin issue:**
→ Check [Troubleshooting](../troubleshooting/) directory

---

## Documentation Labels

- **[AUTHORITATIVE]** - Source of truth for this topic. Read this first.
- **[CONTEXTUAL]** - Supporting context or deep dive. Useful but not required.
- **[REFERENCE]** - Quick reference, schemas, lookup tables. Use for specific lookups.
