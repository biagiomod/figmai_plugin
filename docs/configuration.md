# Configuration Reference

> **This document is authoritative only for the HAT accessibility config section below.**
> The rest of this file (EnvironmentConfig schema, config.work.json, FIGMAI_ENVIRONMENT env vars, runtime extension-point paths) described an aspirational architecture that was never implemented and has been removed.
>
> **For the real configuration system, see:**
> - [`docs/security-audit.md`](security-audit.md) — config layering: `custom/config.json` (committed baseline) + `custom/config.local.json` (gitignored overrides) + S3 snapshots for private builds
> - [`../custom/README.md`](../custom/README.md) — custom overlay file layout and editing workflow
> - [`../admin-editor/README.md`](../admin-editor/README.md) — ACE local dev workflow (`npm run admin`)
> - [`architecture/ace-static-s3-migration.md`](architecture/ace-static-s3-migration.md) — ACE + Config API + S3 architecture

---

## Custom config (ACE) — Accessibility (HAT)

When using the Admin Config Editor (ACE), you can configure **HAT-required components** so the Content Review Assistant's **Add HAT** quick action treats them as always requiring an accessible label.

- **Config path:** `custom/config.json` → `accessibility.hatRequiredComponents`
- **Type:** `string[]` (component or instance names)
- **Flow:** ACE edits `custom/config.json`; the build runs `generate-custom-overlay`, which emits `src/custom/generated/customConfig.ts`. The plugin reads this at runtime (no runtime JSON).
- **Usage:** In Content Review, select one or more frames and run **Add HAT**. Any `INSTANCE` whose main component name matches an entry in `hatRequiredComponents` (case-insensitive) gets a HAT annotation with a suggested accessible label.
- **ACE UI:** General Plugin Settings → **Accessibility — HAT-required components**: add/remove component names (e.g. `IconButton`, `ToolbarIconOnly`, `AvatarButton`).
- **Add HAT (tool-only):** Content Review Assistant quick action **Add HAT** routes through the generic tool-only path (`getHandler` → `handleResponse`). No per-action branch in main. Matching uses (a) `instance.mainComponent?.name` then (b) `instance.name`; invisible nodes are skipped; scan is capped at 2000 instances with a message when capped.
