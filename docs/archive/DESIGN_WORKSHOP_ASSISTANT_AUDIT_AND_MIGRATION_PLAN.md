> Status: Archived
> Reason: Historical reference / superseded; see docs/README.md for current docs.
> Date: 2026-01-21

# Design Workshop Assistant — Audit and Migration Plan

This document audits the Design Workshop Assistant (DW-A) and plans its migration to the new KB architecture (KB externalized and attached via `knowledgeBaseRefs`), with behavior parity, the requested intro change, optional low-risk robustness improvements, and a design-system–ready extension point (plan only). **No code changes in this run.**

---

## 1. Current-state audit (A–C)

### A) Assistant definition and quick action wiring

**Manifest:** [figmai_plugin/custom/assistants.manifest.json](../../custom/assistants.manifest.json) (Design Workshop entry starts ~line 356)

| Field | Value |
|-------|--------|
| **id** | `design_workshop` |
| **label** | Design Workshop |
| **intro** | `"**Welcome to your Design Workshop Assistant!**\n\nI generate 1-5 Figma screens from a JSON specification. Describe the screens you want, and I'll create them on the canvas."` |
| **hoverSummary** | Screen generator specialist |
| **kind** | ai |
| **tag** | `{ isVisible: true, label: "Alpha", variant: "alpha" }` |
| **iconId** | LightBulbRaysIcon |
| **promptTemplate** | Long: identity + **full output format (STRICT)** inline (type, version, meta, canvas.device, render.intent, screens[].layout, screens[].blocks with all block types). Rules: NO markdown fences, 1–5 screens, raw JSON only. |
| **instructionBlocks** | **None** — DW-A does not use instructionBlocks; it uses the legacy path (full prompt in promptTemplate, but runtime only uses getShortInstructions for preamble). |
| **knowledgeBaseRefs** | **None** — no KB attachment today. |
| **quickActions** | One: `{ id: "generate-screens", label: "Demo: Generate Screens", templateMessage: "Generating demo screen/s using medium fidelity.", executionType: "llm" }`. No requiresSelection, no requiresVision. |

**Generated file:** [figmai_plugin/src/assistants/assistants.generated.ts](../../src/assistants/assistants.generated.ts) (lines 165–176)

- The Design Workshop entry is present and matches the manifest (id, label, intro, promptTemplate, quickActions). No `instructionBlocks` or `knowledgeBaseRefs` in the generated array.

**Config:** [figmai_plugin/custom/config.json](../../custom/config.json) lists `design_workshop` in `ui.simpleModeIds`. `knowledgeBases` is `{}`, so no per-assistant KB policy is set for design_workshop.

---

### B) Instruction source audit

**All instruction sources that influence DW-A:**

1. **Manifest promptTemplate (long)**  
   - **Path:** `custom/assistants.manifest.json` → baked into `assistants.generated.ts` and then into runtime `ASSISTANTS` via [figmai_plugin/src/assistants/index.ts](../../src/assistants/index.ts).  
   - **Usage:** `promptMarkdown = appendDesignSystemKnowledge(mergeKnowledgeBase(entry.id, promptTemplate))`. For DW-A, `mergeKnowledgeBase("design_workshop", promptTemplate)` returns `promptTemplate` when `customConfig.knowledgeBases.design_workshop` is absent (current config has `knowledgeBases: {}`). So `promptMarkdown` = promptTemplate + optional DS index when design systems are enabled.  
   - **Runtime preamble:** [figmai_plugin/src/main.ts](../../src/main.ts) (chat ~553–558, quick action ~947–952) calls `buildAssistantInstructionSegments({ assistantEntry, actionId, legacyInstructionsSource: getShortInstructions(assistant), kbDocs })`. DW-A has **no instructionBlocks**, so `hasEnabledBlocks` is false and the built preamble is **legacy only**: `getShortInstructions(assistant)` = first paragraph (or first 200 chars) of `promptMarkdown`. So the **long promptTemplate is never sent in full** — only the short extract. The long schema and rules are **not** in the assembly output.

2. **Handler-injected schema and rules**  
   - **Path:** [figmai_plugin/src/core/assistants/handlers/designWorkshop.ts](../../src/core/assistants/handlers/designWorkshop.ts) `prepareMessages()`.  
   - **Content:** Prepends a system message (“Return ONLY valid JSON… DesignSpecV1 schema”) and appends a long user message containing: USER REQUEST, EXTRACTED INTENT, SCHEMA REQUIREMENTS (full DesignSpecV1 shape), and **STYLING RULES** (mapping app type/tone/colors/fidelity/density/screen archetypes). This is the **effective** source of output contract and styling behavior for the model.

3. **Legacy markdown / custom overlay**  
   - **Path:** [figmai_plugin/custom/knowledge/design_workshop.md](../../custom/knowledge/design_workshop.md) and [figmai_plugin/src/custom/generated/customKnowledge.ts](../../src/custom/generated/customKnowledge.ts) (`design_workshop` key).  
   - **Content:** Placeholder (“Add your custom knowledge base content here…”, merge policy instructions).  
   - **When used:** Only when `customConfig.knowledgeBases.design_workshop` is set (e.g. `policy: "append"`). Currently **not** applied because `knowledgeBases` is empty.

**Runtime prompt assembly summary:**

- **Preamble:** For DW-A, `buildAssistantInstructionSegments` returns `instructionPreambleText = getShortInstructions(assistant)` (no instructionBlocks, no KB refs). So preamble = first paragraph of promptMarkdown (identity + “CRITICAL: Return ONLY valid JSON…”).  
- **KB segment:** None for DW-A (`knowledgeBaseRefs` empty; `resolveKnowledgeBaseDocs` returns []).  
- **Injection:** Only when `supportsPreambleInjection` and first user message in segment; preamble is prepended to that first user message.  
- **After preamble:** Handler `prepareMessages()` replaces/wraps messages with system + full schema + styling rules. So the **real** output contract and styling guidance are **handler-injected**, not from manifest or KB.

**Selection context / image export:** DW-A quick action has no `requiresSelection` or `requiresVision`; no selection summary or images are required for “Demo: Generate Screens” or chat. Handler and renderer do not use selection for placement (screens are placed below page content).

---

### C) Canvas mutation pipeline audit

**Handlers:** Single handler [figmai_plugin/src/core/assistants/handlers/designWorkshop.ts](../../src/core/assistants/handlers/designWorkshop.ts).

- **canHandle:** `assistantId === 'design_workshop' && (actionId === 'generate-screens' || actionId === undefined)`. So both the quick action “Demo: Generate Screens” and **chat** (actionId undefined) are handled by the same handler.
- **prepareMessages:** As above; injects system + schema + styling rules.
- **handleResponse:** Cleans response (strip “generate: 1/100” style tags) → `extractJsonFromResponse` → strip fences fallback → `JSON.parse` → `validateDesignSpecV1` → on failure `attemptRepair` (one repair round) → `normalizeDesignSpecV1` → `renderDesignSpecToSection` → `createObservabilityArtifacts` → replace status / notify.

**JSON output contract (DesignSpecV1):**

- **Schema:** [figmai_plugin/src/core/designWorkshop/types.ts](../../src/core/designWorkshop/types.ts).  
- **Shape:** `type: "designScreens"`, `version: 1`, `meta: { title, ... }`, `canvas.device: { kind, width, height }`, `render.intent: { fidelity, styleKeywords?, brandTone?, density? }`, `screens: Array<{ name, layout?, blocks }>`. Block types: heading, bodyText, button, input, card, spacer, image.  
- **Versioning:** version must be 1; validation enforces it.

**Parsing / validation / repair:**

- **Parsing:** [designWorkshop.ts](../../src/core/assistants/handlers/designWorkshop.ts) uses `extractJsonFromResponse` from [figmai_plugin/src/core/output/normalize/index.ts](../../src/core/output/normalize/index.ts); then manual fence strip if extraction fails.  
- **Validation:** [figmai_plugin/src/core/designWorkshop/validate.ts](../../src/core/designWorkshop/validate.ts) `validateDesignSpecV1(spec)` — non-throwing, returns `{ ok, warnings, errors, info, severity }`. Checks type, version, meta, canvas.device, render.intent, screens array (0 or >5 → error/warning), each block type and required fields.  
- **Repair:** `attemptRepair()` sends one follow-up request with minimal schema + “Convert to valid JSON… Original: <first 2000 chars>”. After repair: parse → validate again; if still failing, user-facing “Could not parse” / “validation failed” and return.

**Node creation and placement:**

- **Primitives:** [figmai_plugin/src/core/stage/primitives.ts](../../src/core/stage/primitives.ts) — `loadFonts()` (Inter → Roboto → fallback), `createTextNode`, `createAutoLayoutFrameSafe`.  
- **Renderer:** [figmai_plugin/src/core/designWorkshop/renderer.ts](../../src/core/designWorkshop/renderer.ts) — `renderDesignSpecToSection()` creates one Section (FrameNode), then for each screen: `renderScreen()` (frame + layout + blocks via `renderBlock()`). Fidelity/intent drive styling (colors, corners, shadows).  
- **Placement:** `placeBatchBelowPageContent(section, { marginTop: 24 })` from [figmai_plugin/src/core/figma/placement.ts](../../src/core/figma/placement.ts) — appends to page, places below existing content, scrolls into view. No selection-based anchor.  
- **Observability:** Handler creates “Design Workshop — Spec & Intent (runId)” frame with user request, intent, runId, and appends it next to the section (positioned relative to section).

**Caps / limits:**

- **Screens:** 1–5 enforced in [validate.ts](../../src/core/designWorkshop/validate.ts) `normalizeDesignSpecV1`: if `screens.length > 5`, truncate to 5 and set `meta.truncationNotice`. Validation warns if >5.  
- **Blocks per screen:** No explicit cap in renderer; runaway specs could create many nodes (see robustness).  
- **Repair:** Single attempt; then fail with message.  
- **Text/spec size:** Repair prompt uses `originalResponse.substring(0, 2000)`; no cap on total spec size before render (large specs could cause many nodes).

---

## 2. Migration steps to new KB structure

### What becomes KB vs what stays in assistant

- **KB (reference-only):** Screen design guidelines, block semantics (when to use heading vs bodyText, button variants, input types), fidelity meanings (wireframe vs medium vs hi vs creative), layout/density guidance, do/don’t for screen content, and optional examples. **No** output contract enforcement, no “Return ONLY valid JSON”, no schema shape.  
- **Assistant (behavior):** Identity (role, purpose), **output contract** (DesignSpecV1 shape, 1–5 screens, JSON-only), and quick-action semantics. These stay in manifest (promptTemplate shortened to identity + instructionBlocks for format) and/or handler (prepareMessages can keep a compact schema reminder; styling rules can reference “see KB” or stay in handler for parity).  
- **Handler:** Keeps parsing, validation, repair, intent extraction, and canvas mutation. Styling rules in prepareMessages can stay as-is for parity or be trimmed to “follow KB styling guidelines” once KB exists; either way behavior remains deterministic.

### Proposed KB id and file path

- **KB id:** `design_workshop`  
- **File path:** `figmai_plugin/custom/knowledge-bases/design_workshop.kb.json`  
- **Registry:** Add an entry in [figmai_plugin/custom/knowledge-bases/registry.json](../../custom/knowledge-bases/registry.json) with `id: "design_workshop"`, `title: "Design Workshop"`, `filePath: "design_workshop.kb.json"`.

**KB content (reference-only):** Suggested sections aligned with [errors.kb.json](../../custom/knowledge-bases/errors.kb.json) and existing docs:

- **purpose:** e.g. “Reference knowledge for generating screen layouts and UI blocks (headings, buttons, inputs, cards, etc.) from user descriptions.”
- **scope:** Applies to screen layout, block types, fidelity, and styling guidance. Excludes output format enforcement, schema syntax, and runtime execution rules.
- **definitions:** Short definitions for fidelity (wireframe, medium, hi, creative), block types (heading, bodyText, button, input, card, spacer, image), and layout/density.
- **rulesConstraints:** e.g. “Use 1–5 screens per request.” “Map user app type and tone to screen names and content.” “Use fidelity to drive visual style (grayscale vs color, corners, shadows).”
- **doDont:** Do: clear hierarchy, consistent spacing, match fidelity to request. Don’t: exceed 5 screens, ignore user tone/color hints.
- **examples:** Optional 1–2 short examples (e.g. “wireframe → grayscale placeholders”).
- **edgeCases:** Optional (e.g. “When user asks for many screens, generate up to 5 and note truncation.”).

No schema or “Return ONLY valid JSON” in the KB.

### Assistant changes (manifest + generated)

- **knowledgeBaseRefs:** Add `"knowledgeBaseRefs": ["design_workshop"]` to the Design Workshop entry in `custom/assistants.manifest.json`.
- **instructionBlocks:** Add one format block (e.g. `id: "design_workshop-output", kind: "format"`) with content that states: return only valid JSON, no prose/no fences, DesignSpecV1 shape (type, version, meta, canvas.device, render.intent, screens with blocks), 1–5 screens only. This aligns with Errors and ensures the output contract is in the manifest and included in preamble when blocks are used.
- **promptTemplate:** Shorten to **identity/purpose only** (e.g. “You are FigmAI’s Design Workshop Assistant, a screen generator. You generate 1–5 Figma screens from user descriptions.”). Remove the long inline schema from promptTemplate; schema lives in instructionBlocks and handler.
- **Remove legacy pointers:** Do **not** reference `src/assistants/designWorkshop.md` or “Full knowledge base in…” in the new promptTemplate. KB is attached via `knowledgeBaseRefs` and resolved at runtime. The existing `custom/knowledge/design_workshop.md` overlay can remain for custom merges (if config uses `knowledgeBases.design_workshop`) or be deprecated in favor of the new KB file; recommend documenting “for custom overlay use config knowledgeBases.design_workshop; for standard KB use knowledgeBaseRefs”.
- **Generation:** Run `npm run generate-assistants` so `assistants.generated.ts` gets `instructionBlocks` and `knowledgeBaseRefs`. Run `npm run generate-knowledge-bases` after adding `design_workshop.kb.json` and registry entry so `knowledgeBases.generated.ts` includes the new KB.

---

## 3. Required change: update intro / welcome text

**Current intro (manifest and generated):**

```text
**Welcome to your Design Workshop Assistant!**

I generate 1-5 Figma screens from a JSON specification. Describe the screens you want, and I'll create them on the canvas.
```

**Requested intro:**

```text
**Welcome to your Design Workshop Assistant!**

I can generate 1-5 Figma screens. Describe the screens you want, and I'll create them on the canvas.
```

**Files to update:**

- [figmai_plugin/custom/assistants.manifest.json](../../custom/assistants.manifest.json) — `intro` field for the Design Workshop entry.
- After regeneration, [figmai_plugin/src/assistants/assistants.generated.ts](../../src/assistants/assistants.generated.ts) will reflect the new intro automatically.

**Deduplication / intro detection:** The phrase “welcome to your design workshop assistant” is used in:

- [figmai_plugin/src/main.ts](../../src/main.ts) (helper “Design Workshop intro”) — no change needed; still matches.
- [figmai_plugin/src/ui.tsx](../../src/ui.tsx) (intro message deduplication) — no change needed; still matches. The second line change does not affect these checks.

---

## 4. Optional low-risk robustness improvements

Label: **optional**; only if time and risk allow.

1. **Font loading failure (renderer)**  
   - **Current:** [figmai_plugin/src/core/stage/primitives.ts](../../src/core/stage/primitives.ts) `loadFonts()` falls back Inter → Roboto → non-loading fallback (still returns an object). If all loads fail, rendering may use invalid font.  
   - **Improvement:** In renderer (or primitives), after `loadFonts()`, if font load failed, catch at first `createTextNode` and show a single “Fonts unavailable; check Figma font access.” status and skip full render (or render minimal placeholder). Deterministic, testable.

2. **Runaway blocks per screen**  
   - **Current:** No cap on `screen.blocks.length`; very large specs could create hundreds of nodes.  
   - **Improvement:** In `normalizeDesignSpecV1` or in renderer, cap blocks per screen (e.g. 50) and optionally set a flag or truncation notice. Reduces risk of Figma slowness; deterministic and testable.

3. **Placement fallback**  
   - **Current:** [figmai_plugin/src/core/figma/placement.ts](../../src/core/figma/placement.ts) `placeBatchBelowPageContent` does not catch; renderer does not try/catch around it. If `getPageContentBounds` or append fails, error propagates.  
   - **Improvement:** In [renderer.ts](../../src/core/designWorkshop/renderer.ts), wrap `placeBatchBelowPageContent(section, { marginTop: 24 })` in try/catch; on failure set section.x = 0, section.y = 100 (or similar) and log. Same pattern as Errors handler. Low risk, avoids unhandled throw.

4. **Invalid JSON / repair response length**  
   - **Current:** Repair uses `originalResponse.substring(0, 2000)`; repaired response is not length-capped before parse.  
   - **Improvement:** Cap repaired response length before parse (e.g. 50k chars) to avoid huge JSON parse in edge cases. LLM-agnostic, testable.

---

## 5. Design System future-ready extension point (plan only)

**Current:** Design systems enter only via [figmai_plugin/src/assistants/index.ts](../../src/assistants/index.ts) — `appendDesignSystemKnowledge(promptMarkdown)` appends a DS component index to **all** assistants’ promptMarkdown when `designSystems.enabled` and active registries exist. The Design Workshop **renderer** does not use DS: it uses primitives only ([docs/work-plugin/extension-points.md](../work-plugin/extension-points.md) “Design System Reference Packs” is a placeholder). No design token or style mapping in the renderer today.

**Proposed extension point (do not implement in this migration):**

- **Single hook:** `resolveActiveDesignSystem(context): { id: string; doc?: string } | null`  
  - **Context:** Optional `{ assistantId, actionId, userMessage?, selection? }` for future use (e.g. tag, dropdown, LLM).  
  - **Default:** Returns `null` or a single default DS id when “default DS” is configured and no selection logic exists. When not configured, return `null` and renderer uses current primitives.  
- **Where to call:** In the Design Workshop handler, before `renderDesignSpecToSection`, call `resolveActiveDesignSystem(context)`. If non-null, pass `dsId` (and optional `dsDoc`) into renderer. Renderer today ignores them; later, renderer can map block intents to DS components when a pack is present.  
- **Default DS path:** Config could support e.g. `designWorkshop.defaultDesignSystemId` or reuse `designSystems.activeRegistries[0]`. If not set, `resolveActiveDesignSystem` returns null — no change in behavior.  
- **Future selection:**  
  - **Query tag (e.g. @biagiods):** Parser in handler or main detects tag in user message; pass to context; `resolveActiveDesignSystem` maps tag to DS id.  
  - **UI dropdown:** UI stores “active DS for Design Workshop”; main passes it in context; hook returns it.  
  - **LLM-driven:** When multiple DSs exist and user message is ambiguous, optional LLM step or follow-up question to choose; result stored and passed as context.  
- **Scope for this task:** Only **identify** the extension point (e.g. in handler: “before render, call resolveActiveDesignSystem(handlerContext); if null, render as today”). Do **not** add multi-DS selection, UI, or new config keys; at most add a no-op or null-returning stub so the call site exists for future wiring.

---

## 6. File-change list (exact paths)

| Path | Change |
|------|--------|
| `figmai_plugin/custom/assistants.manifest.json` | Update Design Workshop `intro`; add `knowledgeBaseRefs: ["design_workshop"]`; add `instructionBlocks` with one format block; shorten `promptTemplate` to identity only. |
| `figmai_plugin/custom/knowledge-bases/design_workshop.kb.json` | **Create.** Reference-only content (purpose, scope, definitions, rulesConstraints, doDont, examples, edgeCases). No output contract. |
| `figmai_plugin/custom/knowledge-bases/registry.json` | Add entry `{ "id": "design_workshop", "title": "Design Workshop", "filePath": "design_workshop.kb.json" }`. |
| `figmai_plugin/src/assistants/assistants.generated.ts` | Regenerated by `npm run generate-assistants` (do not edit by hand). |
| `figmai_plugin/src/knowledge-bases/knowledgeBases.generated.ts` | Regenerated by `npm run generate-knowledge-bases` (do not edit by hand). |
| `figmai_plugin/src/core/assistants/handlers/designWorkshop.ts` | Optional: keep prepareMessages as-is for parity, or trim styling rules to “see KB” once KB exists. Optional robustness: try/catch around placement in renderer (see below). No change required for intro text (intro comes from manifest). |
| `figmai_plugin/src/core/designWorkshop/renderer.ts` | Optional: try/catch around `placeBatchBelowPageContent` with fallback x/y. Optional: cap blocks per screen in normalization or here. |

**No change** (for this migration) to: main.ts, ui.tsx (intro detection still valid), placement.ts, primitives.ts, validate.ts, types.ts. **Do not** implement multi-DS or `resolveActiveDesignSystem` in this migration beyond documenting the plan.

---

## 7. Verification steps

1. **Generate**  
   - `npm run generate-assistants`  
   - `npm run generate-knowledge-bases`

2. **Build**  
   - `npm run build`

3. **Tests**  
   - `npm run test`  
   - If Errors-style instruction test exists for assistants with instructionBlocks, add or extend for design_workshop (preamble contains format block and KB segment when kbDocs provided).

4. **Manual smoke in Figma**  
   - **Quick action:** Select Design Workshop → “Demo: Generate Screens” → confirm 1–5 screens and “Spec & Intent” frame appear; no errors.  
   - **Chat:** Switch to Design Workshop, send a message e.g. “Create 2 mobile screens for a fitness app” → confirm screens and artifact; no errors.  
   - **Intro:** Confirm welcome message shows the new text: “I can generate 1-5 Figma screens. Describe the screens you want…”  
   - **Deduplication:** Confirm no duplicate Design Workshop intro in chat (existing UI/main logic still applies).

---

## Summary

- **Audit:** DW-A is defined in the manifest and generated file; it has no instructionBlocks or knowledgeBaseRefs. Effective instructions come from getShortInstructions (first paragraph) plus handler-injected schema and styling rules. Canvas pipeline is handler → validate → normalize → renderer → placeBatchBelowPageContent; caps are 1–5 screens and one repair.  
- **Migration:** Add external KB `design_workshop.kb.json` (reference-only), register it, add `knowledgeBaseRefs` and one format instructionBlock, shorten promptTemplate to identity.  
- **Required:** Update intro to “I can generate 1-5 Figma screens. Describe the screens you want, and I'll create them on the canvas.”  
- **Optional:** Font failure handling, block cap per screen, placement try/catch, repair response length cap.  
- **DS:** Plan only — identify `resolveActiveDesignSystem(context)` and default DS path; do not implement multi-DS in this task.
