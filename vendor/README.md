# Vendored Toolkit Packages

This directory holds pre-built dist outputs from external toolkits.
Do NOT import toolkit packages directly in port contract files.
Only adapter implementations (src/core/sdk/adapters/) import from here.

## Adding / updating a toolkit

1. Build the toolkit package: `pnpm build` in its repo.
2. Copy the built `dist/` folder here under `vendor/<toolkit-name>/`.
3. Update tsconfig path aliases if needed.
4. Update only the adapter implementation — port contracts and consumers are unchanged.

## Current contents

### DS-T v0.1.0-alpha.0 (adopted 2026-04-11)

2 packages vendored as dist/ directory copies in `vendor/ds-t-schema/` and
`vendor/ds-t-renderer-figma/`. Imported via relative paths (NOT `file:` deps —
renderer-figma uses `workspace:*` for its schema dep, which does not resolve
outside a pnpm workspace).

Source: `design-system-toolkit` repo (sibling to this project), git tag `v0.1.0-alpha.0`

| Package | Vendor path | Adapter |
|---|---|---|
| @design-system-toolkit/schema | `vendor/ds-t-schema/` | `DSTQueryEngine`, `DSTPromptEnrichmentEngine` |
| @design-system-toolkit/renderer-figma | `vendor/ds-t-renderer-figma/` | `DSTPlacementBridge` |

Public API used:
- `searchComponents(query, dsId)` → component search for DESIGN_SYSTEM_QUERY tool
- `getPromptEnrichmentSegment(dsId)` → structured DS context for LLM prompts
- `resolveDesignSystem(dsId, theme)` → RendererDesignSystem for placement
- `createFigmaInstructionTree(root, ds)` → canonical kind → DS component name tree

**Phase 0 constraint:** Active DS id is read from `getDesignSystemConfig().activeRegistries[0]`.
If empty or unknown to DS-T, all engines return graceful no-ops (empty array / undefined).
`DSTPromptEnrichmentEngine.getKnowledgeSegment` wiring into the static instruction assembly
is deferred — use `getKnowledgeSegmentAsync` for async call sites.

**To upgrade:**
1. Copy new `dist/` files from DS-T repo: `cp -r packages/schema/dist/ vendor/ds-t-schema/ && cp -r packages/renderer-figma/dist/ vendor/ds-t-renderer-figma/`
2. Check PUBLIC_API.md for breaking changes; update adapter files if signatures changed
3. Run `npm run build` + `npm test` + `npm run invariants`
4. Update this README with new version and adoption date

---

### SD-T v0.1.0-alpha.0 (adopted 2026-04-11)

8 packages vendored as tarballs in `vendor/sdt/`. Installed via `file:` entries in `package.json`.
Public API stable within minor versions (per SD-T INTEGRATION.md).
Adapter: `src/core/detection/smartDetector/SDToolkitSmartDetectionEngine.ts`

**Phase 0 constraint:** `buildTaxonomyLookup()` returns empty maps; `candidateEntry` is `null` for most
nodes. The adapter handles null gracefully. Full classification activates in SD-T Phase 1.

To upgrade: pack new tarballs from SD-T repo, replace files in `vendor/sdt/`, update version strings in
`package.json`, run `npm install`. Adapter changes (if any) are isolated to `SDToolkitSmartDetectionEngine.ts`.
