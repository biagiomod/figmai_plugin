# Toolkit Adoption Checklist

> **Purpose:** Gate for adopting any external toolkit package into FigmAI.
> Apply this before writing any adapter code. All items must be resolved.
>
> **Last updated:** 2026-04-11 (based on SD-T v0.1.0-alpha.0 adoption experience)

---

## Pre-Adoption Gate

Complete every item before writing the adapter. Items in **bold** are hard blockers.

### 1. Contract Alignment

- [ ] **Toolkit author has read the target Port interface (`src/core/sdk/ports/<Port>.ts`)
       and confirmed alignment or proposed changes**
- [ ] All methods the Port requires have a corresponding toolkit API
- [ ] Return types match the Port's type definitions (field names, nullable fields, union types)
- [ ] Async model matches (sync vs. Promise vs. async generator)

### 2. Stability

- [ ] **Toolkit is tagged with a semver version**
- [ ] Toolkit author has confirmed which parts of the API are public/stable vs. internal
- [ ] Breaking changes require a minor or major version bump (documented commitment)
- [ ] No direct dependency on Figma plugin runtime APIs inside the toolkit
  (toolkit must be testable outside the plugin)

### 3. Packaging

- [ ] **Tarballs can be produced via `pnpm pack` (or equivalent)**
- [ ] Tarballs placed in `vendor/<toolkit-name>/` before wiring any `file:` deps
- [ ] `package.json` `file:` entries use exact version-stamped tarball names
- [ ] `vendor/README.md` updated with version, adapter path, and any phase constraints

### 4. Compile and Runtime Compatibility

- [ ] **`npm run build` passes with the toolkit in the dep graph**
- [ ] **`npm test` passes (all tests, 0 failed)** — including any handler/routing tests that
       transitively import the adapter
- [ ] ESM/CJS compatibility verified (pure ESM toolkits require dynamic import pattern in adapter)
- [ ] No circular dependencies introduced

### 5. Test Coverage

- [ ] Toolkit ships tests over the data shapes FigmAI depends on
- [ ] Adapter has unit tests covering: happy path, null/edge values from toolkit, mapping logic
- [ ] Regression: handler tests that exercise the adapter path still pass

### 6. Documentation

- [ ] Phase constraints documented (e.g., "candidateEntry is null in Phase 0")
- [ ] Upgrade procedure documented in `vendor/README.md`
- [ ] Key design decisions recorded (especially non-obvious patterns like dynamic import)

---

## Versioning and Upgrade Strategy

FigmAI uses a **vendored tarball** model for toolkit packages. This is intentional:

- Tarballs are pinned, reproducible, and reviewed before landing
- No surprise upstream changes between builds
- Upgrade is a deliberate, audited operation

**To upgrade a vendored toolkit:**

1. Build new version in the toolkit repo (`pnpm build`)
2. Pack tarballs: `pnpm -r pack` (creates tarballs in repo root)
3. Copy tarballs to `vendor/<toolkit>/`
4. Update version strings in `package.json` `file:` entries
5. `npm install`
6. Run `npm run build` + `npm test` + `npm run invariants`
7. Update `vendor/README.md` with new version and any new phase constraints
8. Update adapter if the toolkit's API changed
9. Commit with message: `feat(vendor): upgrade <toolkit> to vX.Y.Z`

**Never** update a tarball without running the full test suite. Toolkit upgrades touch the
adapter layer — adapter bugs silently pass through to the handler unless tested.

---

## Phase Constraint Pattern

When a toolkit ships in phases (e.g., SD-T Phase 0 / Phase 1), document the constraint in:

1. **`vendor/README.md`** — one-line note under the toolkit entry
2. **The adapter file** — inline comment at the field that returns the constrained value
3. **The port** — comment on the field noting the phase constraint if the null is intentional
4. **This checklist** — add a "Phase N upgrade trigger" note in the toolkit's handoff doc

**Do not adopt a phased toolkit without documenting what changes in each phase and what triggers
the upgrade.** Undocumented phase constraints become invisible technical debt.

---

## Current Toolkit Status

| Toolkit | Version | Phase | Adapter |
|---|---|---|---|
| SD-T (@smart-detector/pipeline) | v0.1.0-alpha.0 | Phase 0 | `SDToolkitSmartDetectionEngine` ✅ |
| DS-T (design system toolkit) | — | Not adopted | `DefaultDesignSystemEngine` (in-repo) |

See `docs/superpowers/plans/2026-04-11-sdt-readiness-handoff.md` for SD-T phase 1 trigger.
See `docs/superpowers/plans/2026-04-11-dst-readiness-handoff.md` for DS-T blocking gaps.
