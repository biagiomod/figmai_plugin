> Status: Archived
> Reason: Historical reference / superseded; see docs/README.md for current docs.
> Date: 2026-01-21

# Design Critique Assistant — Audit and Migration Plan

**Status: Implemented (2026-01-21).** [HISTORICAL] — Migration completed; Design Critique uses knowledgeBaseRefs and structured KBs. Kept for reference.

This document audits the Design Critique assistant and plans its migration to the new KB architecture (KB externalized and attached via `knowledgeBaseRefs`), with behavior parity and safety for deceptive-related actions. **No code changes in this run.**

---

## 1. Current-state audit (A–D)

### A) Assistant definition (manifest + generated)

**Manifest:** [figmai_plugin/custom/assistants.manifest.json](figmai_plugin/custom/assistants.manifest.json) — Design Critique entry (lines ~134–183).

| Field | Value |
|-------|--------|
| **id** | `design_critique` |
| **label** | Design Critique |
| **intro** | "I provide detailed design critiques with scores, wins, fixes, and actionable feedback. Select a design element to get started." |
| **hoverSummary** | Design review specialist plus dark pattern detection |
| **iconId** | ArtIcon |
| **kind** | ai |
| **tag** | Beta, Alpha variant |
| **promptTemplate** | Long: identity + **Design System Component Queries (CRITICAL)** block (DESIGN_SYSTEM_QUERY tool rules) + **Output Format (STRICT)** scorecard JSON schema. Includes `[Full knowledge base available in: src/assistants/designCritique.md]`. |
| **instructionBlocks** | One block: `id: "legacy-parity"`, `kind: "system"`, `content: "# Design Critique Assistant"`. |
| **knowledgeBaseRefs** | **None** (not present). |
| **quickActions** | (1) **give-critique** — executionType llm, requiresSelection true, requiresVision true, maxImages 1, imageScale 2; templateMessage "Provide a comprehensive design critique of the selected elements." (2) **deceptive-review** — same; templateMessage "Evaluate this design for Dark & Deceptive UX practices. Identify any patterns that manipulate, mislead, or harm users." (3) **temp-place-forced-action-card** — executionType tool-only; label "Add Deceptive Demos"; templateMessage "Place deceptive demo cards on the stage for testing dark pattern examples." |

**Generated file:** [figmai_plugin/src/assistants/assistants.generated.ts](figmai_plugin/src/assistants/assistants.generated.ts) (lines 82–98) — Design Critique entry matches manifest; no knowledgeBaseRefs.

---

### B) Instruction source audit

**All instruction sources that influence Design Critique:**

1. **Legacy markdown** — [figmai_plugin/src/assistants/designCritique.md](figmai_plugin/src/assistants/designCritique.md)  
   - Referenced in promptTemplate as `[Full knowledge base available in: src/assistants/designCritique.md]`.  
   - Contains: role, output format (scorecard schema), scoring guidelines (90–100 exceptional, etc.), core evaluation dimensions (Hierarchy, Layout, Spacing, Typography, Color/Contrast, Affordance, Consistency, Accessibility, States), wins/fixes/checklist rules and examples, missing-selection fallback JSON.  
   - **Not** loaded at runtime via `resolveKnowledgeBaseDocs` (no knowledgeBaseRefs). Only the first paragraph of promptMarkdown (via getShortInstructions) is used when preamble is built.

2. **Custom overlay** — [figmai_plugin/custom/knowledge/design_critique.md](figmai_plugin/custom/knowledge/design_critique.md), [figmai_plugin/src/custom/generated/customKnowledge.ts](figmai_plugin/src/custom/generated/customKnowledge.ts)  
   - Placeholder text ("Add your custom knowledge base content here…").  
   - Applied only when `customConfig.knowledgeBases.design_critique` is set (append/override). Typically not set.

3. **Handler-injected** — [figmai_plugin/src/core/assistants/handlers/designCritique.ts](figmai_plugin/src/core/assistants/handlers/designCritique.ts) `prepareMessages()`:  
   - **Tool/DS path:** When last user message indicates tool request or DS availability query, prepends tool-enforcement system message and modifies last user message (CRITICAL: call DESIGN_SYSTEM_QUERY, no hallucination).  
   - **Deceptive path:** When `isDeceptiveReview` (last user content includes "Dark & Deceptive UX practices"), returns system (JSON only) + messages with prepended JSON hint + **getDarkUxEvaluationPrompt()** as final user message (full deceptive report schema, 10 dimensions, evaluation principles).  
   - **Scorecard path:** Otherwise returns system (JSON only) + messages + final user message with score/summary/wins/fixes/checklist/notes schema hint.

4. **appendDesignSystemKnowledge** — [figmai_plugin/src/assistants/index.ts](figmai_plugin/src/assistants/index.ts)  
   - Applied to all assistants’ promptMarkdown when design systems are enabled. Design Critique receives DS component index in promptMarkdown; getShortInstructions uses first paragraph of that.

5. **Runtime assembly** — [figmai_plugin/src/main.ts](figmai_plugin/src/main.ts) (chat ~553–558, quick action ~947–952):  
   - `buildAssistantInstructionSegments({ assistantEntry, actionId, legacyInstructionsSource: getShortInstructions(assistant), kbDocs })`.  
   - Design Critique has instructionBlocks, so preamble = enabled blocks (one system block "# Design Critique Assistant") + optional tone/schema. **No KB segment** (knowledgeBaseRefs empty; kbDocs not passed for this assistant).  
   - After preamble injection (when supportsPreambleInjection and first user message), handler.prepareMessages() overrides/extends messages with action-specific injection (tool, deceptive, or scorecard).

---

### C) Handler and runtime behavior per quick action

**Handler:** [figmai_plugin/src/core/assistants/handlers/designCritique.ts](figmai_plugin/src/core/assistants/handlers/designCritique.ts)

**Routing:** [figmai_plugin/src/main.ts](figmai_plugin/src/main.ts) (lines 730–773): When `executionType === 'tool-only'` and `assistantId === 'design_critique'` and `actionId === 'temp-place-forced-action-card'`, main builds handlerContext (response empty), calls `handler.handleResponse(handlerContext)`, and returns after handled — **no sendChat**. LLM actions (give-critique, deceptive-review) go through normal sendChatWithRecovery then handler.handleResponse.

| Quick action | Type | Output contract | Canvas mutation | Parsing / repair / fallback |
|--------------|------|-----------------|-----------------|----------------------------|
| **give-critique** | llm | Strict JSON: score (0–100), summary, wins[], fixes[], checklist[], notes[]. | On success: `createArtifact({ type: 'scorecard', assistant: 'design_critique', version: 'v2' }, result.data)`. Placement via artifacts system (placeArtifact). | `parseScorecardJson` ([figmai_plugin/src/core/output/normalize/index.ts](figmai_plugin/src/core/output/normalize/index.ts)). On failure: one repair round (sendChatWithRecovery with repair prompt); then fallback `placeCritiqueOnCanvas(response, selectedNode, runId)`. |
| **deceptive-review** | llm | Strict JSON: summary, overallSeverity (None/Low/Medium/High), findings[], dimensionsChecklist[10]. | On success: `createArtifact({ type: 'deceptive-report', assistant: 'design_critique', version: 'v1' }, result.data)`. | `parseDeceptiveReportJson` ([figmai_plugin/src/core/output/normalize/deceptiveReport.ts](figmai_plugin/src/core/output/normalize/deceptiveReport.ts)). On failure: fallback `placeCritiqueOnCanvas(response, selectedNode, runId)` (no repair). |
| **temp-place-forced-action-card** (Add Deceptive Demos) | tool-only | None (no LLM). | Builds frames from DARK_DEMO_CARDS ([figmai_plugin/src/core/figma/artifacts/components/darkDemoCards.generated.ts](figmai_plugin/src/core/figma/artifacts/components/darkDemoCards.generated.ts), source [refs_for_cursor/dark_demo_cards.json](figmai_plugin/refs_for_cursor/dark_demo_cards.json)); `createDemoCardContainer`, `placeBatchBelowPageContent(container, { marginTop: 24 })`. Fixed educational demo cards only. | N/A. |

**Caps/limits:** Scorecard and deceptive report: no explicit cap on array lengths in parser; handler uses parsed data as-is. Add Deceptive Demos: fixed set of cards from JSON (no user/LLM input to content).

---

### D) Safety / deceptive actions review

- **Deceptive Review:** Purpose is to **evaluate designs against** dark/deceptive UX (identify patterns that manipulate, mislead, or harm users). Prompt in `getDarkUxEvaluationPrompt()`: "Evaluate the design for compliance with ethical UX guidelines. Identify patterns that may pressure, confuse, or harm users"; findings include "remediation: Ethical alternative or fix". No instruction to suggest or implement harmful patterns; output is detection and remediation-oriented.

- **Add Deceptive Demos:** Places **predefined** demo cards from static JSON for "testing dark pattern examples" — educational/reference only; no LLM-generated content; cards are fixed examples (e.g. "Deceptive Demo — Forced Action"). Clearly labeled as demos.

- **Risks to state:** (1) If prompt or KB were to include "how to implement" dark patterns for harm, that would violate safety; current prompts are detection/remediation-focused. (2) Demo cards are static; they should remain clearly labeled as examples.

- **Mitigation in migration:** Keep KB reference-only: definitions of dark UX dimensions, detection-oriented descriptions, do/don’t (e.g. do: identify and remediate; don’t: encourage manipulation). Optional scope disclaimer: content is for identification and remediation only. No output contract or tool syntax in KB.

---

## 2. Migration steps (E)

### KB split proposal

- **Option A (single KB, recommended):** One KB `design-critique` (kebab-case): general critique heuristics, evaluation dimensions, scoring guidance, wins/fixes/checklist rules; plus a **reference-only** section for dark/deceptive UX (definitions of the 10 dimensions, detection-oriented descriptions, do/don’t). No output contract, no tool rules, no schema syntax. Fewer moving parts.

- **Option B (two KBs):** `design-critique` (general critique + scorecard heuristics) and `dark-patterns` or `deceptive-patterns` (dark UX categories, definitions, detection/remediation focus). Attach both via knowledgeBaseRefs. Use if content volume or reuse strongly favors separation.

**Recommendation:** Option A unless reuse of dark-patterns content elsewhere justifies Option B.

### KB content guidelines

- **Reference-only:** Definitions, heuristics, evaluation dimensions, do/don’t, examples. No "Return ONLY valid JSON", no schema syntax, no DESIGN_SYSTEM_QUERY tool rules. No behavioral or tone rules that belong in the assistant/handler.
- **Scope disclaimer (optional):** For dark/deceptive section: "Content is for identification and remediation of deceptive patterns only. Not for implementing or encouraging manipulation."

### Assistant manifest changes

- **promptTemplate:** Shorten to identity/purpose only (e.g. "You are FigmAI's Design Critique Assistant, an expert UX and UI design reviewer. You evaluate the user's selected frame or element and provide clear, structured, actionable critique."). Remove the long Design System Component Queries block and the long scorecard Output Format from promptTemplate; keep DS tool rules and scorecard/deceptive schema in **handler** for parity.
- **knowledgeBaseRefs:** Add `"knowledgeBaseRefs": ["design-critique"]` (and if Option B, add second id).
- **instructionBlocks:** Add or adjust format blocks — e.g. one for scorecard (concise: output valid JSON only, keys score/summary/wins/fixes/checklist/notes; cap 1–5 sentences per item) and optionally one for deceptive report (concise: JSON only, summary/overallSeverity/findings/dimensionsChecklist). **Handler remains source of truth** for full schema and safety wording.
- Remove `[Full knowledge base available in: src/assistants/designCritique.md]` from promptTemplate.

### Handler parity

- **No change** to prepareMessages logic (tool enforcement, getDarkUxEvaluationPrompt, scorecard hint) or to handleResponse routing/canvas logic. Schema and safety wording stay in handler.

### Exact file list

| Path | Change |
|------|--------|
| `figmai_plugin/custom/knowledge-bases/design-critique.kb.json` | **Create.** Reference-only (purpose, scope, definitions, rulesConstraints, doDont, examples, edgeCases). Include critique heuristics and dark UX dimensions (detection/remediation only). |
| `figmai_plugin/custom/knowledge-bases/registry.json` | Add entry for id `design-critique`, filePath `design-critique.kb.json`. |
| `figmai_plugin/custom/assistants.manifest.json` | Design Critique entry: shorten promptTemplate; add knowledgeBaseRefs; add/adjust instructionBlocks; remove legacy markdown reference. |
| `figmai_plugin/src/assistants/assistants.generated.ts` | Regenerated by `npm run generate-assistants`. |
| `figmai_plugin/src/knowledge-bases/knowledgeBases.generated.ts` | Regenerated by `npm run generate-knowledge-bases`. |

No changes to handler, artifact, or main.ts logic for this migration.

---

## 3. Risks and mitigations (demo-focused)

| Risk | Mitigation |
|------|------------|
| Scorecard or deceptive report placement regresses | Handler unchanged; same createArtifact/placeCritiqueOnCanvas flow. Run manual smoke for give-critique and deceptive-review after migration. |
| Preamble/KB change alters model behavior for give-critique or deceptive-review | Keep handler-injected schema and prompts as primary; KB additive. If needed, keep promptTemplate slightly longer (identity + one-line reminder) to avoid drift. |
| Design system tool behavior regresses | DS tool rules remain in handler prepareMessages; no removal. |
| Add Deceptive Demos (tool-only) regresses | No code change to handler or main branch; smoke test after build. |
| Safety: KB or prompt could be read as encouraging dark patterns | KB content limited to definitions and detection/remediation; scope disclaimer; no "how to implement" for harm. |

---

## 4. Verification steps (F)

1. **Regenerate**  
   - `npm run generate-assistants`  
   - `npm run generate-knowledge-bases`

2. **Build (with audible alert for future implementation prompts)**  
   - `npm run build && afplay /System/Library/Sounds/Glass.aiff`

3. **Tests**  
   - `npm run test`

4. **Manual smoke**  
   - **Give Design Crit:** Select a frame → run "Give Design Crit" → scorecard artifact appears; placement correct.  
   - **Deceptive Review:** Select a frame → run "Deceptive Review" → deceptive report artifact appears.  
   - **Add Deceptive Demos:** Run "Add Deceptive Demos" → demo cards section placed below content.  
   - **Chat:** Send a design critique or deceptive-style question → appropriate response/artifact.  
   - **Selection/vision gating:** Run give-critique or deceptive-review with no selection → clear error/fallback message.

---

## Summary

- **Current state:** Design Critique has no knowledgeBaseRefs; instructions come from long promptTemplate (identity + DS tool + scorecard schema), one system instructionBlock, and handler-injected tool/deceptive/scorecard prompts. Legacy designCritique.md is referenced but not loaded at runtime. Three quick actions: give-critique and deceptive-review (LLM + canvas), temp-place-forced-action-card (tool-only, canvas).
- **Migration:** Add external KB `design-critique.kb.json` (reference-only), register it, add knowledgeBaseRefs and concise format instructionBlocks, shorten promptTemplate. Handler and main logic unchanged.
- **Safety:** Deceptive Review and Add Deceptive Demos are detection/educational; KB stays reference-only with optional scope disclaimer.
