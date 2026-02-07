# Errors Assistant — End-to-End Audit and Implementation Plan

**Agent:** Architect | **Mode:** Agent (read-only audit + plan; no code changes this run)

**Goals:** (1) Audit current Errors assistant configuration and runtime behavior; (2) Identify all relevant code paths, handlers, tools, and Figma mutation utilities; (3) Produce a concrete implementation plan for new quick actions.

**Constraints:** No architectural changes; follow existing FigmAI invariants (assistants from generated TS only, dispatch key `(assistantId, actionId)`, executionType semantics, KB reference-only, no runtime JSON reads). Evidence-based with exact file paths and snippets.

---

# Part 1 — Current-State Audit

## A) Assistant definition and wiring

### Manifest entry

**File:** `figmai_plugin/custom/assistants.manifest.json`

The Errors assistant is defined in the `assistants` array (lines 305–341). Evidence:

```json
{
  "id": "errors",
  "label": "Errors",
  "hoverSummary": "Error screen specialist",
  "iconId": "CautionIcon",
  "kind": "ai",
  "intro": "I identify design errors, inconsistencies, and quality issues. Select elements to find problems before handoff.",
  "tag": { "isVisible": true, "label": "Alpha", "variant": "alpha" },
  "instructionBlocks": [],
  "promptTemplate": "# Errors Assistant\n\nYou are **FigmAI's Errors Assistant**...",
  "knowledgeBaseRefs": ["errors"],
  "quickActions": [
    {
      "id": "find-errors",
      "label": "Find errors",
      "templateMessage": "Identify all design errors including layout issues...",
      "executionType": "llm",
      "requiresSelection": true,
      "requiresVision": true,
      "maxImages": 1,
      "imageScale": 2
    },
    {
      "id": "check-consistency",
      "label": "Check consistency",
      "templateMessage": "Check for style inconsistencies...",
      "executionType": "llm",
      "requiresSelection": true,
      "requiresVision": true,
      "maxImages": 1,
      "imageScale": 2
    }
  ]
}
```

### Generated output

**File:** `figmai_plugin/src/assistants/assistants.generated.ts`

The manifest is consumed by `scripts/generate-assistants-from-manifest.ts`; the Errors entry appears in the generated array (lines 145–158) with the same fields. Runtime list is built in `src/assistants/index.ts`: `ASSISTANTS = ASSISTANTS_MANIFEST.map(...)` with `promptMarkdown = appendDesignSystemKnowledge(mergeKnowledgeBase(entry.id, promptTemplate))`.

**Report — Errors assistant fields:**

| Field | Value |
|-------|--------|
| **promptTemplate** | Inline markdown: identity + role (“design quality assurance specialist”), no JSON/output contract in manifest. |
| **instructionBlocks** | `[]` (empty). |
| **knowledgeBaseRefs** | `["errors"]` — structured KB from `custom/knowledge-bases/errors.kb.json` (registry + generate-knowledge-bases → `knowledgeBases.generated.ts`). |
| **quickActions** | `find-errors`, `check-consistency`; both **executionType:** `llm`, **requiresSelection:** true, **requiresVision:** true, **maxImages:** 1, **imageScale:** 2; each has **templateMessage**. |

---

## B) Runtime prompt assembly and KB injection

### resolveKnowledgeBaseDocs and buildAssistantInstructionSegments

- **File:** `src/main.ts`  
  For RUN_QUICK_ACTION (and SEND_MESSAGE), before building chat messages:
  - `kbDocs = resolveKnowledgeBaseDocs(assistant.knowledgeBaseRefs ?? [])`  
  - **Evidence:** `src/main.ts` lines 935–940 (quick action) and 553–558 (SEND_MESSAGE).
- **File:** `src/core/knowledgeBases/resolveKb.ts`  
  `resolveKnowledgeBaseDocs(refs)` returns documents from `KB_DOCS` (generated) in ref order; missing ids skipped with dev warning.
- **File:** `src/core/assistants/instructionAssembly.ts`  
  `buildAssistantInstructionSegments({ assistantEntry, actionId, legacyInstructionsSource, kbDocs })`:
  - When `kbDocs` has length > 0, appends a single “## Knowledge Base” segment (truncated: 12k chars total, per-section cap, “+N more” for long arrays).
  - For Errors, `instructionBlocks` is empty, so base preamble is **legacy path**: `legacyInstructionsSource` only.

### getShortInstructions

- **File:** `src/assistants/index.ts` lines 152–167  
  `getShortInstructions(assistant)` returns the first paragraph of `assistant.promptMarkdown` (or first 200 chars with “...” if longer). So for Errors, the preamble text used when providers support preamble injection is that short summary, **not** the full promptTemplate or `errors.md`.

### What is actually sent

- **Preamble (Internal API / preamble-injection providers):**  
  `SESSION_HEADER_SAFE + "\n\n" + "${assistant.label} context: " + built.instructionPreambleText + "\n\n"` prepended to the first user message.  
  `instructionPreambleText` = getShortInstructions (first paragraph of promptMarkdown) **plus** the truncated “## Knowledge Base” segment from `kbDocs` when `knowledgeBaseRefs` includes `"errors"`.
- **Full promptTemplate** is in `assistant.promptMarkdown` and is **not** sent as a separate system block in the current flow; it is only used when building the assistant’s promptMarkdown for any logic that reads it (e.g. legacyInstructionsSource is the short form). So the **long-form spec in `src/assistants/errors.md`** (JSON output structure, categories, severity) is **not** loaded or inlined at runtime (see also `docs/ERRORS_ASSISTANT_INSTRUCTION_SOURCES_AUDIT.md`).

### Selection context and images for requiresVision

- **File:** `src/core/context/selectionContext.ts`  
  `buildSelectionContext({ selectionOrder, quickAction, provider })`:
  - Always includes `selection` (summarizeSelection) and, when selection exists, `selectionSummary` (formatSelectionSummary(extractSelectionSummary(...))).
  - **Images** are included only when `quickAction?.requiresVision === true`, `provider.capabilities.supportsImages`, and `selection.hasSelection`; then `exportSelectionAsImages({ maxImages, imageScale, preferFrames: true })` is called; on failure, context continues with summary only (no throw).
- **File:** `src/main.ts`  
  Before building context, main checks `action.requiresSelection && !selection.hasSelection` and `action.requiresVision && !selection.hasSelection` and calls `replaceStatusMessage(..., true)` and returns early (lines 879–889).

**Conclusion:** For Errors quick actions, selection is required and vision is required; images are attached when provider supports images; preamble includes short instructions plus KB segment. No handler modifies messages or response.

---

## C) Existing patterns for artifact-generating quick actions

### Handlers that mutate the canvas

| Handler | File | Canvas mutation pattern |
|--------|------|-------------------------|
| **DesignCritiqueHandler** | `src/core/assistants/handlers/designCritique.ts` | Parses JSON (scorecard / deceptive report); uses `createArtifact(options, data)` → `placeArtifactFrame` + component render; or `placeCritiqueOnCanvas` (fallback); or `placeBatchBelowPageContent` for demo cards. |
| **DesignWorkshopHandler** | `src/core/assistants/handlers/designWorkshop.ts` | `extractJsonFromResponse` → `validateDesignSpecV1` → `normalizeDesignSpecV1` → `renderDesignSpecToSection` → `placeBatchBelowPageContent(section)`; then `createObservabilityArtifacts` (annotation frame with text next to section). |
| **DiscoveryCopilotHandler** | `src/core/assistants/handlers/discovery.ts` | `createDiscoveryDocument` / `updateDiscoveryDocument` (find or create “Discovery —” frame, update content via discovery renderer). |
| **ContentTableHandler** | `src/core/assistants/handlers/contentTable.ts` | No canvas mutation for generate-table (tool-only; table in UI). |
| **AnalyticsTaggingHandler** | `src/core/assistants/handlers/analyticsTagging.ts` | No direct canvas placement; table in UI. |

### Structured JSON output contracts

- **Design Critique:** Scorecard JSON (score, summary, wins, fixes, checklist, notes); parsed in `src/core/output/normalize`; Deceptive report JSON parsed in `src/core/output/normalize/deceptiveReport.ts`.
- **Design Workshop:** DesignSpecV1 (type, version, meta, canvas.device, render.intent, screens[].blocks); validated in `src/core/designWorkshop/validate.ts`; normalized in same module.
- **Discovery:** DiscoverySpecV1; validated in `src/core/discovery/validate.ts`; extracted from conversation in `src/core/discovery/extract.ts`.

### Annotation / “note” creation

- **Figma Plugin API:** There is no dedicated “sticky note” or “annotation” node type. The codebase implements “annotations” as **frames containing text nodes**.
- **Evidence:** `src/core/assistants/handlers/designWorkshop.ts` (createObservabilityArtifacts): creates a `FrameNode` (“Design Workshop — Spec & Intent (runId)”), adds Auto-Layout, fills, strokes, then `createTextNode` for title, runId, user request, intent, report; positions with `annotationFrame.x = section.x + section.width + 40`, `annotationFrame.y = section.y`, appended to `figma.currentPage`.

---

## D) Figma mutation and annotation capabilities

### Existing helpers (exact names and paths)

| Capability | Function / API | File |
|------------|----------------|------|
| **Duplicate / clone node** | `node.clone()` (Figma API) | Used in `src/core/analyticsTagging/screenshot.ts`, `archived/screenshotV1.ts` for temp frame content. No high-level “duplicate frame N times” helper. |
| **Create frame** | `figma.createFrame()` | Used in placeArtifact, designWorkshop, discovery, scorecard. |
| **Create text** | `createTextNode(text, style)` | `src/core/stage/primitives.ts` — loadFonts, fontSize, fontName, fills, lineHeight, letterSpacing, textAlign. |
| **Create container frame** | `createContainerFrame(name, x, y, width, height)` | `src/core/stage/primitives.ts` — no auto-layout. |
| **Auto-layout frame** | `createAutoLayoutFrameSafe(name, direction, options)` | `src/core/stage/primitives.ts` — padding, gap, primaryAxisAlign, counterAxisAlign. |
| **Positioning / placement** | `getPlacementTarget(selectedNode)`, `getAnchorBounds(node)` | `src/core/figma/placement.ts`, `src/core/stage/anchor.ts`. |
| **Place single artifact near selection** | `placeSingleArtifactNearSelection(node, { selectedNode, preferSide, margin, step })` | `src/core/figma/placement.ts` — collision-aware, appends to page, sets x/y, selection, scrollIntoView. |
| **Place batch below content** | `placeBatchBelowPageContent(node, { marginTop, minX, minY })` | `src/core/figma/placement.ts` — appends, positions below getPageContentBounds. |
| **Place on page (raw coords)** | `placeNodeOnPage(node, { x, y })` | `src/core/figma/placement.ts`. |
| **Artifact frame (named, pluginData)** | `placeArtifactFrame({ type, assistant, selectedNode, width, spacing, version, replace })` | `src/core/figma/artifacts/placeArtifact.ts` — createFrame, Auto-Layout, setPluginData('figmai.artifactType', type), then placeSingleArtifactNearSelection. |
| **Create artifact + component render** | `createArtifact(options, data)` | `src/core/figma/artifacts/index.ts` — placeArtifactFrame + component.render(); registered types: scorecard, deceptive-report. |
| **Styling (fills, strokes)** | Set on FrameNode: `frame.fills`, `frame.strokes`, `frame.strokeWeight`, `frame.cornerRadius` | Used in designWorkshop annotation frame, scorecard, etc. |
| **Stack vertically** | `stackVertically(nodes, startY, gap)` | `src/core/stage/primitives.ts`. |

### “Annotations” or note fallback

- Implement as a **Frame** with text children (and optional rectangles/lines), positioned via `placeSingleArtifactNearSelection` or `placeNodeOnPage(annotationFrame, { x, y })` (e.g. right of or below selection). No Figma “comment” or “sticky” API used in the codebase.

---

## E) Error handling and recovery

### No selection / no vision

- **File:** `src/main.ts` lines 878–889 (RUN_QUICK_ACTION):  
  After adding the template message and before building selection context:  
  - `if (action.requiresSelection && !selection.hasSelection)` → `replaceStatusMessage(requestId, "Error: This action requires a selection...", true)`; return.  
  - `if (action.requiresVision && !selection.hasSelection)` → `replaceStatusMessage(requestId, "Error: This action requires a selection to analyze...", true)`; return.

### Missing images when requiresVision is true

- **File:** `src/core/context/selectionContext.ts`: Image export is best-effort; on failure, `context.images` is left undefined and request continues with `selectionSummary` only (no throw). So the LLM still receives the request; no separate “missing images” error path in main.

### Invalid LLM output (schema/parse failures)

- **Design Workshop:** `designWorkshop.ts` handleResponse: JSON parse failure or `validateDesignSpecV1` failure → `attemptRepair(context, cleanedResponse, runId)` (second LLM call to fix JSON); if still failing, `replaceStatusMessage(..., true)` and return `{ handled: true }`.
- **Design Critique:** Parsing and validation in output/normalize; fallback to placeholder or error message in handler.
- **Errors (current):** No handler; raw response is shown. Invalid JSON would just appear as text.

### Content filter recovery tiers

- **File:** `src/core/contentSafety/recovery.ts`  
  `sendChatWithRecovery(provider, request, options)` runs the prompt pipeline (assemble → sanitize → budgets → safety assertions); on provider throw with content policy, Tier 2 (redacted payload) then Tier 3 (screen index) retries. Used by both SEND_MESSAGE and RUN_QUICK_ACTION; entry point for quick actions: `main.ts` around line 1007, `sendChatWithRecovery(currentProvider, { messages, ... }, { assistantPreamble, allowImages, ... })`.

### Handler response handling in main

- **File:** `src/main.ts` lines 1028–1052: If `handler` exists, `handler.handleResponse(handlerContext)` is called; if result is `handled: true`, status is replaced and the branch returns. Otherwise, default: `replaceStatusMessage(requestId, response)`.

---

# Part 2 — Proposed Implementation Plan

## Objective

1. **Replace** current Errors quick actions with:
   - **Generate Error Screens** — Requires selection; duplicates selected frame/component into multiple variants; adds UX error-handling UI + copy (inline validation, banner/toast, disabled states, error icons, helper text); adds per-variant rationale via annotation frame (or text-note fallback).
   - **Check Errors** — Requires selection; produces PASS/FAIL + concise summary; writes result as an annotation frame or note near selection.

2. **Chat behavior:** No canvas mutation in chat. Without selection: concise guidance. With selection: concise guidance grounded in selection context. Only quick actions mutate the canvas.

## Invariants (unchanged)

- Assistants from generated TS only (manifest → generate-assistants → assistants.generated.ts).
- Dispatch key `(assistantId, actionId)` for handler routing.
- executionType: llm for both new actions (LLM produces structured output; handler parses and mutates).
- KB remains reference-only; behavior and output contracts live in promptTemplate/instructionBlocks + handler validation.
- No runtime JSON file reads.

---

## Step-by-step flow per action

### Generate Error Screens

1. **User:** Selects one frame or component, runs “Generate Error Screens.”
2. **Main:** RUN_QUICK_ACTION; no handler yet for (errors, generate-error-screens); selection/vision checks (requiresSelection: true; requiresVision recommended for best results).
3. **Context:** buildSelectionContext with quickAction (requiresVision, maxImages, imageScale); preamble + KB segment via existing path.
4. **Handler (new):** ErrorsHandler.canHandle('errors', 'generate-error-screens') → true. prepareMessages: inject system + user message requiring **only** JSON in GenerateErrorScreensSpec shape (see Part 3).
5. **LLM:** Returns JSON (variants with labels, copy, rationale).
6. **Handler handleResponse:**  
   - Resolve first selected node → getPlacementTarget (top-level container).  
   - For each variant: clone source frame (node.clone()); rename; optional: add overlay frame/children for error UI (text nodes, rectangles) from spec; position variants (e.g. horizontal with spacing via placeBatchBelowPageContent or manual x/y).  
   - For each variant (or grouped): create “annotation” frame (createFrame + createTextNode for rationale); place with placeSingleArtifactNearSelection or to the right of variant row (similar to designWorkshop annotation).  
   - replaceStatusMessage('Error screens generated'); figma.notify(...); return { handled: true }.
7. **Parse/validation failure:** Either attemptRepair (one retry with schema hint) or replaceStatusMessage with clear error and return { handled: true }.

### Check Errors

1. **User:** Selects frame(s)/components, runs “Check Errors.”
2. **Main:** Same as above; handler canHandle('errors', 'check-errors') → true.
3. **Handler prepareMessages:** Inject strict JSON-only instruction for CheckErrorsResult shape (PASS/FAIL, summary, optional items).
4. **LLM:** Returns JSON.
5. **Handler handleResponse:**  
   - Parse and validate CheckErrorsResult.  
   - Create one annotation frame (e.g. “FigmAI — Errors Check”) with title (PASS/FAIL), summary text, optional list; style similarly to designWorkshop annotation (frame + text nodes).  
   - placeSingleArtifactNearSelection(annotationFrame, { selectedNode }) so it appears near selection.  
   - replaceStatusMessage(summary or “Check complete”); return { handled: true }.
6. **Parse failure:** replaceStatusMessage with error; optionally show raw response in chat; return { handled: true }.

---

## Recommended executionType and why

| Action | executionType | Reason |
|--------|----------------|--------|
| **Generate Error Screens** | **llm** | LLM must generate structured spec (variants, copy, rationale); handler then performs deterministic canvas edits (clone, add nodes, place). Same pattern as Design Workshop / Design Critique. |
| **Check Errors** | **llm** | LLM evaluates selection and returns PASS/FAIL + summary; handler only places one artifact (annotation frame). No tool-only or ui-only path. |

---

## Where constraints live

- **Prompt/instruction:** In `custom/assistants.manifest.json` for the Errors assistant: extend promptTemplate and/or instructionBlocks with strict “Return ONLY valid JSON…” and the schema summary (or reference a single block that describes both contracts). Optionally keep knowledgeBaseRefs ["errors"] for UX error-handling knowledge.
- **Handler validation:** In the new handler (and optionally in a small validation module): parse JSON, validate shape (e.g. with a zod schema or explicit checks), then apply mutations. Schema details can live in a shared types file (e.g. `src/core/errorsAssistant/types.ts` or next to the handler) for use by both prompt text and handler.

---

# Part 3 — Proposed Output Contracts (JSON shapes)

## Generate Error Screens (GenerateErrorScreensSpec)

- **type:** `"generateErrorScreens"`  
- **version:** 1  
- **meta:** `{ "title": string (optional), "sourceName": string (optional) }`  
- **variants:** array of:
  - **id:** string (e.g. "inline-validation", "banner", "toast", "disabled", "error-icon", "helper-text")
  - **label:** string (short label for the frame name)
  - **rationale:** string (1–2 sentences for annotation)
  - **copy:** object (optional): **inlineMessage**, **bannerTitle**, **bannerBody**, **toastMessage**, **helperText**, **disabledLabel** (strings as needed per variant)
  - **uiElements:** array (optional): **type** ("inline" | "banner" | "toast" | "disabled" | "error-icon" | "helper-text"), **text** string — to drive what the handler adds (labels/badges) if we keep it simple

Constraints: 1–8 variants; each variant must have id, label, rationale. Handler may cap at 6 variants and truncate copy length.

## Check Errors (CheckErrorsResult)

- **type:** `"checkErrors"`  
- **version:** 1  
- **result:** `"PASS"` | `"FAIL"`  
- **summary:** string (2–4 sentences)  
- **items:** array (optional) of **{ "severity": "critical"|"high"|"medium"|"low", "title": string, "fix": string }** — max 10 items for display in note

Handler uses result + summary for the annotation frame; items can be rendered as a short list in the same frame.

---

# Part 4 — File-Change List

## Files to create

| Path | Purpose |
|------|--------|
| `src/core/assistants/handlers/errors.ts` | ErrorsHandler: canHandle('errors', 'generate-error-screens' \| 'check-errors'), prepareMessages (inject JSON-only + schema hint), handleResponse (parse, validate, clone+place variants + annotations for Generate; create annotation frame for Check). |
| `src/core/errorsAssistant/types.ts` (or `src/core/assistants/handlers/errorsTypes.ts`) | Types and/or zod schemas for GenerateErrorScreensSpec and CheckErrorsResult; used by handler and referenced in prompt text. |
| `src/core/errorsAssistant/validate.ts` (optional) | validateGenerateErrorScreensSpec, validateCheckErrorsResult — called from handler after parse. |
| `src/core/errorsAssistant/renderErrorScreens.ts` (optional) | Pure function: given source node + GenerateErrorScreensSpec, build variant frames (clone + add text/rect nodes) and return nodes; handler places them. |
| `src/core/figma/artifacts/components/errorsCheckNote.ts` (optional) | Small component that renders CheckErrorsResult into a frame (like scorecard component); or inline the frame creation in handler. |

## Files to edit

| Path | Change |
|------|--------|
| `custom/assistants.manifest.json` | Replace Errors quickActions with two entries: `generate-error-screens` (label “Generate Error Screens”, executionType llm, requiresSelection true, requiresVision true, maxImages 1, imageScale 2, templateMessage “Generate error-handling variants…”) and `check-errors` (label “Check Errors”, executionType llm, requiresSelection true, requiresVision true, templateMessage “Check selected design for errors…”). Extend promptTemplate or add instructionBlocks with “Return ONLY valid JSON…” and short schema description for both actions (or one block per action). |
| `src/core/assistants/handlers/index.ts` | Import and register ErrorsHandler in handlers array. |
| `src/assistants/assistants.generated.ts` | No direct edit; regenerated via `npm run generate-assistants` after manifest change. |
| (Optional) `src/assistants/errors.md` | Align long-form spec with new JSON contracts if this file is later wired for inlining or reference. |

## No changes

- Provider/recovery tier logic (contentSafety/recovery.ts).
- main.ts dispatch (already calls getHandler and handleResponse).
- KB resolution or instructionAssembly (already supports Errors via knowledgeBaseRefs).
- designWorkshop, designCritique, discovery handlers (only add ErrorsHandler).

---

# Part 5 — Risks and Mitigations (demo-focused)

| Risk | Mitigation |
|------|------------|
| LLM returns prose or markdown instead of JSON | prepareMessages injects “Return ONLY valid JSON. No markdown fences. No other text.” plus schema summary; handler strips fences via extractJsonFromResponse (reuse from designWorkshop); on parse failure, one attemptRepair or clear error message. |
| Clone + add nodes is slow or fails on complex selection | Use single top-level container (getPlacementTarget); limit to one source node; cap variants (e.g. 6); wrap in try/catch and replaceStatusMessage on error. |
| “Annotation” frame clutters canvas | Use a single annotation frame per run; place to the right of selection (placeSingleArtifactNearSelection) or below (placeBatchBelowPageContent); name clearly (“FigmAI — Errors Check”, “FigmAI — Error Screens (runId)”). |
| Vision required but image export fails | Existing behavior: buildSelectionContext continues with selectionSummary only; LLM still gets request. Document that results may be less accurate without images. |
| Content filter on error copy or rationale | Rely on existing sendChatWithRecovery (Tier 2/3); no change to recovery logic. |

---

# Part 6 — Test Plan

## Automated

1. **Generate assistants:** Run `npm run generate-assistants` after editing `custom/assistants.manifest.json`; confirm no script error and `src/assistants/assistants.generated.ts` contains Errors with two quick actions `generate-error-screens` and `check-errors`.
2. **Generate KB (if needed):** Run `npm run generate-knowledge-bases` if registry or errors.kb.json changed; confirm `knowledgeBases.generated.ts` still has `errors` id.
3. **Build:** Run `npm run build` (prebuild + build + postbuild); must pass.
4. **Tests:** Run `npm run test` (instructionAssembly, instructionParity, routing.regression, resolveKb, kb-normalization, kb-routes, generate-knowledge-bases). Add a small test for ErrorsHandler if desired (e.g. canHandle true for ('errors','generate-error-screens') and ('errors','check-errors'); false for other ids).
5. **Invariants:** Part of postbuild; confirm `npm run invariants` passes.

## Manual

1. **ACE:** Restart `npm run admin`; open Assistants, confirm Errors shows two quick actions and correct labels.
2. **Figma plugin:** Reload plugin; select Errors assistant; confirm “Generate Error Screens” and “Check Errors” in UI.
3. **No selection:** Run “Check Errors” with no selection → expect error message in status; no canvas change.
4. **With selection:** Select a frame; run “Generate Error Screens” → expect variants placed (and annotation if implemented); run “Check Errors” → expect PASS/FAIL note frame near selection.
5. **Chat:** Send “How do I design error states?” with no selection → concise guidance only; with selection → guidance grounded in selection; confirm no canvas mutation from chat.

---

**End of document.** No code changes were made in this run; this is an audit and implementation plan only.
