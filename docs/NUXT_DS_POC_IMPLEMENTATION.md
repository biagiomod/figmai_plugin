# Nuxt DS PoC Implementation Summary (Steps 1–5)

**Date:** 2026-01-21  
**Scope:** Design Workshop only; activation via "@ds-nuxt" in latest user message.

---

## Files changed / created

### Created

| Path | Purpose |
|------|---------|
| `custom/design-systems/nuxt-ui-v4/nuxt-ui-v4.catalog.json` | Copy of NuxtComponents.fixed.json (runtime catalog source). |
| `custom/design-systems/nuxt-ui-v4/demo-allowlist.json` | Names list for demo: Alert, Modal, Toast, ButtonPrimary, ButtonGroup, InputOutline, InputSoft, FormField, Card. |
| `scripts/generate-nuxt-ds-catalog.ts` | Build-time script: reads catalog + allowlist, filters by names, emits `nuxtDsCatalog.generated.ts`. |
| `src/custom/generated/nuxtDsCatalog.generated.ts` | Generated; exports `NUxtDemoAllowlist` (array of allowlisted entries with kind, name, key, variantAxes, defaultVariant). |
| `src/core/designSystem/nuxtDsRegistry.ts` | Exports `getNuxtDemoAllowlist()` and `getNuxtComponentByName(name)`. |
| `src/core/designSystem/nuxtDsHint.ts` | One-time hint: clientStorage key `figmai_nuxt_ds_hint_shown`, message when Nuxt DS fallback occurred. |

### Modified

| Path | Change |
|------|--------|
| `package.json` | Added script `generate-nuxt-ds-catalog`; added to `prebuild` after `generate-knowledge-bases`. |
| `src/core/designSystem/componentService.ts` | Added `createInstanceOnly(key, variantProperties?)` — returns instance only; no append, selection, or viewport change. |
| `src/core/assistants/handlers/designWorkshop.ts` | `prepareMessages`: set `useNuxtDsForThisRun = /\@ds-nuxt/i.test(latestUserRequest)`. `handleResponse`: pass `{ useNuxtDs }` to `renderDesignSpecToSection`; after render, if `renderResult.usedDsFallback` call `showNuxtDsFallbackHintIfNeeded()`. |
| `src/core/designWorkshop/renderer.ts` | `renderDesignSpecToSection(spec, runId?, options?)`; when `options.useNuxtDs`, in block loop try `tryCreateNuxtBlock(block, allowlist)` for button/input/card, else fallback to `renderBlock` and set `usedDsFallback`. Returns `usedDsFallback`. `renderScreen` returns `{ frame, usedDsFallback }`. |

---

## Embed pipeline (how allowlist becomes TS)

1. **Source:** `custom/design-systems/nuxt-ui-v4/nuxt-ui-v4.catalog.json` (full catalog) and `demo-allowlist.json` (list of names).
2. **Script:** `npm run generate-nuxt-ds-catalog` → `tsx scripts/generate-nuxt-ds-catalog.ts`.
3. **Logic:** Script reads catalog and allowlist; filters `catalog.components` to entries whose `name` is in `allowlist.names`; writes `src/custom/generated/nuxtDsCatalog.generated.ts` with `NUxtDemoAllowlist` as a JSON-serialized array (Unicode preserved).
4. **Wire:** Script is run in `prebuild` (after generate-knowledge-bases, before generate-build-info). Plugin imports from generated TS at runtime; no runtime file read.

---

## Allowlist names and matching

**Names in `demo-allowlist.json`:** Alert, Modal, Toast, ButtonPrimary, ButtonGroup, InputOutline, InputSoft, FormField, Card.

**Block → component resolution (PoC):**

- **button:** Try in order: ButtonPrimary, ButtonGroup, Button (first name present in allowlist wins).
- **input:** Try: InputOutline, InputSoft, Input.
- **card:** Try: Card.

Variant selection uses `defaultVariant` from the allowlist entry only (no mapping from DesignSpecV1 button variant to Nuxt axes in this PoC).

---

## Manual smoke steps (to run in Figma)

1. **Without tag**  
   - Open Design Workshop, send e.g. "Generate a login screen with a title, email input, password input, and submit button."  
   - **Expected:** Screens appear; all blocks are primitives (frames + text). No Nuxt import attempts.

2. **With tag, library not available**  
   - Send: "@ds-nuxt Generate a login screen with a button and an input."  
   - **Expected:** Screens appear; if Nuxt import fails, primitives are used. Toast once: "Nuxt UI components couldn't be loaded; using built-in shapes. To use Nuxt UI, ensure the Nuxt UI Figma library is available to your team."  
   - Run again with "@ds-nuxt" — hint should **not** show again (clientStorage flag set).

3. **With tag, library available**  
   - Ensure Nuxt UI Figma library is available to the file (same team or linked library).  
   - Send: "@ds-nuxt Generate a screen with a primary button and a text input."  
   - **Expected:** Screen appears; button and input may be Nuxt component instances (if import by key succeeds). Nodes should be inside the generated screen frame; selection/viewport unchanged by DS placement.

---

## Verification commands (already run)

- `npm run build && afplay /System/Library/Sounds/Glass.aiff` — **success**
- `npm run test` — **all tests passed**
