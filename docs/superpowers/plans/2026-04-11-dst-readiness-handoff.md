# DS-T Readiness Handoff

> **Status:** v0.1.0-alpha.0 adopted 2026-04-11 (Phase 0). This document tracks what is done,
> what is deferred, and what triggers Phase 1 full wiring.

---

## Current State

**DS-T v0.1.0-alpha.0 is live** as of 2026-04-11.

| Component | Status |
|---|---|
| `vendor/ds-t-schema/` dist copy | ✅ Done |
| `vendor/ds-t-renderer-figma/` dist copy | ✅ Done |
| stub `package.json` files in vendor dirs | ✅ Done |
| `@design-system-toolkit/*` file: deps in `package.json` | ✅ Done |
| `DSTQueryEngine` adapter | ✅ Done |
| `DSTPromptEnrichmentEngine` adapter | ✅ Done |
| `DSTPlacementBridge` adapter | ✅ Done (infrastructure, not yet called) |
| `DSTQueryEngine` wired into `designSystemTools.ts` | ✅ Done |
| `DSTPromptEnrichmentEngine` wired into static instruction assembly | ⏳ Deferred (see below) |
| `DSTPlacementBridge` wired into a handler | ⏳ Deferred (no canonical-tree producer yet) |

---

## Phase 0 Constraints

**Active DS resolution:** Adapters read `getDesignSystemConfig().activeRegistries[0]` as the DS-T
registry id. DS-T returns `[]` / `undefined` for ids it doesn't recognise — graceful no-op.
Known ids: `jazz`, `acme`, `nuxt-ui`, `orbit`.

**Enrichment wiring:** `DSTPromptEnrichmentEngine.getKnowledgeSegment` is synchronous (port
contract). The static `ASSISTANTS` array in `src/assistants/index.ts` evaluates synchronously at
module load time via `appendDesignSystemKnowledge`. Wiring DS-T enrichment there requires either:
- Making `ASSISTANTS` lazy/async (refactor of instruction assembly), OR
- Switching `appendDesignSystemKnowledge` to call DS-T synchronously (requires the schema module
  to be loaded before `assistants/index.ts` evaluates — feasible with bundler if DS-T is bundled
  and the top-level import is static, but not straightforward in test/tsx context)

Use `DSTPromptEnrichmentEngine.getKnowledgeSegmentAsync()` for any async call site (e.g. a future
async instruction assembly refactor).

**Placement wiring:** `DSTPlacementBridge.executeFigmaRenderTree(root, theme)` is ready. It is not
yet called by any handler because no existing handler produces a canonical `FigmaRenderNode` tree.
Wire it when a handler (e.g. a Design Workshop step) constructs a canonical tree and needs DS-T
component name mapping.

---

## Adapter Locations

| Adapter | Path |
|---|---|
| DSQueryPort | `src/core/designSystem/DSTQueryEngine.ts` |
| DSPromptEnrichmentPort | `src/core/designSystem/DSTPromptEnrichmentEngine.ts` |
| DSTPlacementBridge | `src/core/designSystem/DSTPlacementBridge.ts` |

Port contracts: `src/core/sdk/ports/DesignSystemPort.ts`

---

## Key Design Decisions (Permanent)

**Vendor-copy, not file: tarballs:** DS-T uses `workspace:*` for inter-package deps in its source
`package.json`. This makes `file:` tarballs fail outside a pnpm workspace. The fix: copy the
pre-built dist/ directories and add stub `package.json` files in the vendor dirs. Install via
`file:vendor/ds-t-schema` and `file:vendor/ds-t-renderer-figma` in the main `package.json`.

**ESM + dynamic import pattern:** Same as SD-T. `import type` for compile-time types (erased);
cached `await import('@design-system-toolkit/schema')` inside engine methods for runtime loading.

**`renderer-figma/dist/index.d.ts` cross-package import:** The renderer-figma .d.ts imports from
`"@design-system-toolkit/schema"`. This resolves correctly because `@design-system-toolkit/schema`
is now in node_modules (installed via `file:vendor/ds-t-schema`). The `DSTPlacementBridge` defines
`FigmaRenderNode` and `FigmaLayerInstruction` locally to avoid direct type imports from
renderer-figma .d.ts (which historically caused issues). This is intentional.

**No tsconfig path aliases needed:** file: deps put the packages in node_modules, so TypeScript's
Node module resolution finds them without path aliases.

---

## Upgrade Procedure

1. Copy new dist/ files: `cp -r packages/schema/dist/ figmai_plugin/vendor/ds-t-schema/ && cp -r packages/renderer-figma/dist/ figmai_plugin/vendor/ds-t-renderer-figma/`
2. Keep the stub `package.json` files in the vendor dirs (update version field)
3. Update version strings in main `package.json` file: entries if needed (for file: deps the version in the stub package.json is what matters)
4. `npm install`
5. Check `PUBLIC_API.md` for breaking changes — update adapter files if signatures changed
6. `npm run build` + `npm test` + `npm run invariants`
7. Update this handoff doc with new version and date

---

## Guardrails

Every DS-T-related commit must pass:
- `npm test` (all tests, 0 failed)
- `npm run invariants` (10/10 pass)
- `npm run build` (typecheck + bundle clean)
