# Single Source of Truth — FigmAI Plugin (5‑minute read)

**Purpose:** One place to orient maintainers and new contributors. All facts below are derived from the codebase and existing docs.

---

## What this repo is

- **Figma plugin** that adds AI assistants to the Figma editor (chat, quick actions, design critique, content table, etc.).
- **Admin Config Editor (ACE):** optional local server to edit `custom/config.json`, `custom/assistants.manifest.json`, and knowledge bases via a browser UI. Not required for plugin runtime.
- **Custom overlay:** configuration and knowledge under `custom/` are build-time inputs; runtime reads only generated TS under `src/`, no JSON/file reads at runtime for assistants or KB docs.

---

## Repo tree (major directories)

```
figmai_plugin/
├── admin-editor/          # ACE: local server + static UI (GET/POST /api/model, /api/save, etc.)
│   ├── server.ts         # Express app; port via ADMIN_EDITOR_PORT (default 3333)
│   ├── public/            # Static app (index.html, app.js, styles.css)
│   ├── src/               # Model load/save, auth, KB routes, schema
│   └── data/              # Runtime data (users, backups; created on first use)
├── custom/                # Build-time config and content (not read at plugin runtime as JSON)
│   ├── config.json       # UI, LLM, network, analytics, resources
│   ├── assistants.manifest.json
│   ├── knowledge/         # Per-assistant .md (merged at build into prompts)
│   ├── knowledge-bases/   # registry.json + *.kb.json → knowledgeBases.generated.ts
│   └── design-systems/    # Registry + component .md (optional)
├── docs/                  # All documentation (this file, ARCHITECTURE, RUNBOOK, etc.)
├── scripts/               # Build-time generators and post-build scripts
├── src/                   # Plugin source
│   ├── main.ts            # Message routing, handlers, provider, SEND_MESSAGE / RUN_QUICK_ACTION
│   ├── ui.tsx              # Chat UI, assistant selector, settings
│   ├── assistants/        # Registry: ASSISTANTS from manifest + mergeKnowledgeBase
│   │   └── assistants.generated.ts   # From custom/assistants.manifest.json
│   ├── core/              # Providers, settings, context, LLM pipeline, tools, KB resolver
│   ├── custom/            # Config loader + generated overlay (customConfig, customKnowledge, etc.)
│   └── knowledge-bases/   # knowledgeBases.generated.ts (KB_REGISTRY, KB_DOCS)
├── tests/                 # Test runners (tsx; no Jest/Vitest)
└── build/                 # Output of build-figma-plugin (main.js, ui.js, manifest.json)
```

---

## Where to find what

| Need | Location |
|------|----------|
| **Build commands** | [RUNBOOK.md](RUNBOOK.md#build-commands) |
| **Runtime endpoints / network** | [ARCHITECTURE.md](ARCHITECTURE.md#runtime-services-and-network) |
| **Assistants & KB inventory** | [KB_AND_ASSISTANTS.md](KB_AND_ASSISTANTS.md) |
| **Key decisions & TBDs** | [DECISIONS.md](DECISIONS.md) |
| **Configuration & settings** | [RUNBOOK.md](RUNBOOK.md#where-settings-are-stored-and-loaded), [configuration.md](configuration.md) |
| **Invariants (must not break)** | [invariants.md](invariants.md) |
| **Connection modes (Proxy vs Internal API)** | [connection-modes.md](connection-modes.md) |

---

## Key principles (from codebase)

1. **Assistants:** SSOT is `custom/assistants.manifest.json` → `scripts/generate-assistants-from-manifest.ts` → `src/assistants/assistants.generated.ts`. Runtime uses `ASSISTANTS` from `src/assistants/index.ts` (no runtime JSON read).
2. **Knowledge bases (structured KB):** SSOT is `custom/knowledge-bases/registry.json` + `*.kb.json` → `scripts/generate-knowledge-bases.ts` → `src/knowledge-bases/knowledgeBases.generated.ts`. Runtime resolves refs via `resolveKnowledgeBaseDocs()` from generated `KB_DOCS` only.
3. **Config:** `custom/config.json` is read by generators and by `scripts/update-manifest-network-access.ts`; plugin runtime gets config from `src/custom/generated/customConfig.ts` (and merged with clientStorage in settings).
4. **Network:** All outbound requests are limited to origins in `manifest.json` → `networkAccess.allowedDomains`. Domains are patched at build from `custom/config.json` (see [ARCHITECTURE.md](ARCHITECTURE.md#runtime-services-and-network)).

---

## File links

- [docs/SSOT.md](SSOT.md) — this file  
- [docs/ARCHITECTURE.md](ARCHITECTURE.md)  
- [docs/KB_AND_ASSISTANTS.md](KB_AND_ASSISTANTS.md)  
- [docs/DECISIONS.md](DECISIONS.md)  
- [docs/RUNBOOK.md](RUNBOOK.md)
