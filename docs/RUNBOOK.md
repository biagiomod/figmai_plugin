# Runbook

**Purpose:** Build, test, deploy, and operational reference. Facts derived from the codebase.

---

## Build commands

| Command | What it does |
|---------|----------------|
| `npm run prebuild` | Runs all generators: generate-assistants, generate-presets, generate-custom-overlay, generate-dark-demo-cards, generate-knowledge-bases, generate-build-info. |
| `npm run build` | Runs prebuild (via npm lifecycle if configured), then `build-figma-plugin --typecheck --minify`. |
| `npm run postbuild` | After build: check-sync-api.js, check-banned-phrases.js, update-manifest-network-access.ts, then `npm run invariants`. |
| `npm run watch` | Generators + update-manifest-network-access --watch + build-figma-plugin --typecheck --watch (no generate-knowledge-bases or generate-dark-demo-cards in watch script). |
| `npm run generate-assistants` | tsx scripts/generate-assistants-from-manifest.ts → src/assistants/assistants.generated.ts |
| `npm run generate-custom-overlay` | tsx scripts/generate-custom-overlay.ts → customConfig, customKnowledge, customRegistries |
| `npm run generate-knowledge-bases` | tsx scripts/generate-knowledge-bases.ts → src/knowledge-bases/knowledgeBases.generated.ts |
| `npm run invariants` | tsx scripts/assert-invariants.ts — exit 0 = pass, 1 = fail |

---

## Test commands

| Command | What it does |
|---------|----------------|
| `npm run test` | Runs in order: instructionAssembly.test.ts, instructionParity.test.ts, routing.regression.test.ts, resolveKb.test.ts, kb-normalization.test.ts, kb-routes.test.ts, generate-knowledge-bases.test.ts. All must pass (tsx; no Jest). |

---

## Where settings are stored and loaded

- **Build-time / plugin default config:**  
  `custom/config.json` → read by generate-custom-overlay and update-manifest-network-access.  
  Generated into `src/custom/generated/customConfig.ts` (exported as customConfig).  
  Plugin does not read `custom/config.json` at runtime.

- **Runtime user settings:**  
  Figma `figma.clientStorage` holds user-editable settings (connection type, proxy URL, Internal API URL, auth mode, token, default model, etc.).  
  Loaded and merged in `src/core/settings.ts`: getEffectiveSettings() combines customConfig with clientStorage so UI-saved values override config defaults.

- **Manifest network access:**  
  `manifest.json` → `networkAccess.allowedDomains` is written at build by `scripts/update-manifest-network-access.ts` from custom/config.json (networkAccess.baseAllowedDomains, extraAllowedDomains) or script defaults.  
  Not user-editable at runtime; Figma enforces these origins for fetch.

See also [configuration.md](configuration.md) for full config schema and priority.

---

## Deploy / publish

- Build output is under `build/` (main.js, ui.js, manifest.json).  
- Plugin is published via Figma’s plugin publish flow (not described in repo).  
- For local development: run plugin from Figma desktop (Development → Import plugin from manifest → select build/manifest.json or equivalent).  
- **No secrets in repo:** Do not commit tokens, API keys, or internal URLs in custom/config.json or code; use [REDACTED] or env in docs/examples.

---

## ACE (Admin Config Editor)

- **Start:** `npm run admin` or `npm run admin:dev` → tsx admin-editor/server.ts.  
- **Default URL:** http://localhost:3333 (override with `ADMIN_EDITOR_PORT`).  
- **Use:** Log in, edit config / Assistants / Knowledge tabs, save → writes to `custom/config.json`, `custom/assistants.manifest.json`, and custom knowledge files.  
- After save, run `npm run prebuild` (or full build) so generated TS and manifest are updated; then reload the plugin in Figma.

---

## Troubleshooting

| Issue | Action |
|-------|--------|
| **Build fails (typecheck)** | Fix reported TypeScript errors; run `npm run build` again. |
| **Invariants fail** | See scripts/assert-invariants.ts and docs/invariants.md; fix code to satisfy assertions (dispatch key, ui-only before provider, assistants from generated only, etc.). |
| **Network / CORS errors in plugin** | Ensure the request origin (scheme + host, no path) is in manifest.json → networkAccess.allowedDomains. Add origin to custom/config.json networkAccess.extraAllowedDomains and run full build. See setup/internal-api-setup.md, setup/proxy-setup.md. |
| **Assistants or KB not updating** | Confirm custom/ files changed, then run `npm run generate-assistants` and/or `npm run generate-knowledge-bases` (or full prebuild). Reload plugin. |
| **Tests fail** | Run `npm run test`; fix failing test file (assertions in instructionAssembly, resolveKb, routing, kb-normalization, kb-routes, generate-knowledge-bases tests). |

---

## Links

- [SSOT.md](SSOT.md) — orientation and repo tree  
- [ARCHITECTURE.md](ARCHITECTURE.md) — subsystems and network  
- [invariants.md](invariants.md) — invariants that must not break  
- [configuration.md](configuration.md) — config schema and sources  
- [reference/debugging.md](reference/debugging.md) — debugging tips
