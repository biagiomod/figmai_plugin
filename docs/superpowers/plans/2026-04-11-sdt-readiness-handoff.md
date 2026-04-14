# SD-T Readiness Handoff

> **Status:** Phase 0 adopted 2026-04-11. This document tracks what is done, what is deferred, and
> what triggers the Phase 1 upgrade.

---

## Current State

**SD-T v0.1.0-alpha.0 is live in production code** (`sdk-toolkit-foundation` branch, stabilization
wave complete 2026-04-11).

| Component | Status |
|---|---|
| 8 SD-T packages vendored in `vendor/sdt/` | ✅ Done |
| `@smart-detector/*` file: deps in `package.json` | ✅ Done |
| `SDToolkitSmartDetectionEngine` adapter | ✅ Done |
| `SmartDetectorHandler` wired to SD-T engine | ✅ Done |
| `DetectionCertainty` type corrected (ambiguous is orthogonal boolean) | ✅ Done |
| Dynamic import pattern for ESM/CJS test compat | ✅ Done |
| `vendor/README.md` updated | ✅ Done |
| `autoAnnotator.ts` on DefaultSmartDetectionEngine | ⏳ Deferred to Phase 1 |
| Full taxonomy classification (non-null candidateEntry) | ⏳ SD-T Phase 1 |

---

## Phase 0 Constraints

- `buildTaxonomyLookup()` returns empty maps in Phase 0.
- `candidateEntry` is `null` for most nodes — adapter handles this as `candidateType: null`.
- `autoAnnotator.ts` intentionally stays on `DefaultSmartDetectionEngine` to avoid silently
  zeroing out annotation output. If switched now, `ANNOTATABLE_ELEMENT_KINDS.has(null)` → false
  → zero annotations written. No error, just silent regression.
- `SmartDetectorHandler` (the quick action) is unaffected by the null constraint — it renders
  "unknown" kind buckets in the report, which is correct Phase 0 behavior.

---

## Phase 1 Upgrade Trigger

Upgrade `autoAnnotator.ts` when SD-T ships Phase 1 with taxonomy data wired:

- `buildTaxonomyLookup()` returns non-empty maps
- `candidateEntry` is populated for the FigmAI element kinds listed in
  `ANNOTATABLE_ELEMENT_KINDS`

**Upgrade procedure:**
1. Replace vendor tarballs: build SD-T Phase 1 → `pnpm -r pack` in SD-T root → copy tarballs to
   `vendor/sdt/` → update version strings in `package.json` → `npm install`
2. Update `autoAnnotator.ts` import: swap `DefaultSmartDetectionEngine` →
   `SDToolkitSmartDetectionEngine`
3. Run full test suite + invariants + build
4. Smoke-test annotation on a real Figma selection
5. Update `vendor/README.md` with new version

---

## Adapter Location

```
src/core/detection/smartDetector/SDToolkitSmartDetectionEngine.ts
```

Port contract: `src/core/sdk/ports/SmartDetectionPort.ts`

All adapter changes are isolated to `SDToolkitSmartDetectionEngine.ts`. Port and consumers are
unchanged by toolkit upgrades.

---

## Key Design Decisions (Permanent)

- **`import type` + dynamic import:** SD-T is pure ESM. Static imports break tsx/CJS test runner.
  The adapter uses `import type` (erased at compile time) for type safety and a lazy cached
  `await import('@smart-detector/pipeline')` inside `detect()` for runtime loading. Do not change
  this pattern.
- **`ambiguous` is not a certainty level:** It is an orthogonal boolean on `DetectedElement`.
  `DetectionCertainty` is `'exact' | 'inferred' | 'weak' | 'unknown'` only. Do not add
  `'ambiguous'` to that union.
- **Double cast for FigmaNodeJSON:** `serializeFigmaNode(root) as unknown as Record<string, unknown>`
  — required because `FigmaNodeJSON` has specific typed properties with no index signature.

---

## Guardrails

Every SD-T upgrade commit must pass:
- `npm test` (68+ tests, 0 failed)
- `npm run invariants` (10/10 pass)
- `npm run build` (typecheck + bundle clean)
