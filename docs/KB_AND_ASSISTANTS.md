# Knowledge Bases and Assistants

**Purpose:** Inventory of assistants, KB-related generators, file locations, and a migration checklist template. Do not execute migration from this doc; use the checklist as a template when planning.

---

## Generators (build-time)

| Script | Input(s) | Output | Purpose |
|--------|----------|--------|---------|
| `generate-assistants-from-manifest.ts` | `custom/assistants.manifest.json` | `src/assistants/assistants.generated.ts` | ASSISTANTS_MANIFEST (id, label, promptTemplate, quickActions, instructionBlocks, knowledgeBaseRefs, etc.) |
| `generate-custom-overlay.ts` | `custom/config.json`, `custom/knowledge/*.md`, `custom/design-systems/*/registry.json` (+ components) | `src/custom/generated/customConfig.ts`, `customKnowledge.ts`, `customRegistries.ts` | Config, per-assistant custom knowledge strings, design system registries |
| `generate-knowledge-bases.ts` | `custom/knowledge-bases/registry.json`, `custom/knowledge-bases/*.kb.json` (referenced by registry) | `src/knowledge-bases/knowledgeBases.generated.ts` | KB_REGISTRY, KB_DOCS (structured KB docs for runtime preamble segment) |
| `generate-presets.ts` | `docs/content-models.md` | `src/core/contentTable/presets.generated.ts` | Content table presets |
| `generate-dark-demo-cards.ts` | `refs_for_cursor/dark_demo_cards.json` | `src/core/figma/artifacts/components/darkDemoCards.generated.ts` | Demo card definitions |
| `generate-build-info.ts` | (build env) | `build/build-info.json`, `src/generated/buildInfo.ts` | Build version / info |
| `update-manifest-network-access.ts` | `custom/config.json` (networkAccess), fallback defaults | `manifest.json` → `networkAccess.allowedDomains` | Patch allowed domains for Figma runtime |

---

## File locations

### Assistants

| Location | Role |
|----------|------|
| `custom/assistants.manifest.json` | **SSOT** for assistant list, quick actions, promptTemplate, instructionBlocks, knowledgeBaseRefs. Edited via ACE or by hand. |
| `src/assistants/assistants.generated.ts` | Generated; do not edit. Exports ASSISTANTS_MANIFEST. |
| `src/assistants/index.ts` | Builds ASSISTANTS from manifest: promptMarkdown = mergeKnowledgeBase(id, promptTemplate) + appendDesignSystemKnowledge(). Re-exports getAssistant, listAssistants, listAssistantsByMode, getHandler. |
| `src/assistants/*.md` | Legacy long-form prompts (e.g. contentTable.md, designCritique.md); some assistants may reference them in promptTemplate text. Runtime instruction assembly uses **knowledgeBaseRefs** and KB_DOCS for the preamble; Design Critique and others use knowledgeBaseRefs + structured KBs where configured (legacy .md files may still exist for other assistants). |
| `src/core/assistants/handlers/*.ts` | Per-assistant/action handlers (contentTable, designCritique, designWorkshop, discovery, analyticsTagging). Registered in `handlers/index.ts` via getHandler(assistantId, actionId). |
| `src/core/assistants/instructionAssembly.ts` | buildAssistantInstructionSegments(assistantEntry, legacyInstructionsSource, kbDocs?) → instructionPreambleText + metadata; appends "Knowledge Base" segment when kbDocs provided. |

### Knowledge (two systems)

**1) Custom knowledge (markdown, per-assistant)**  
- `custom/knowledge/*.md` — e.g. `general.md`, `design_critique.md`, `content_table.md`.  
- Consumed by `generate-custom-overlay.ts` → `customKnowledge.ts` → mergeKnowledgeBase() in `src/assistants/index.ts`.  
- Policy (append/override) per assistant in `custom/config.json` → `knowledgeBases[assistantId].policy`.

**2) Structured knowledge bases (KB docs for preamble)**  
- `custom/knowledge-bases/registry.json` — list of { id, title, filePath } pointing to `*.kb.json`.  
- `custom/knowledge-bases/*.kb.json` — one file per KB; schema in `admin-editor/src/kbSchema.ts`.  
- Consumed by `generate-knowledge-bases.ts` → `src/knowledge-bases/knowledgeBases.generated.ts` (KB_REGISTRY, KB_DOCS).  
- Runtime: assistant.knowledgeBaseRefs → resolveKnowledgeBaseDocs() → buildAssistantInstructionSegments(..., kbDocs) → preamble includes "## Knowledge Base" segment.

### Design systems

- `custom/design-systems/<name>/registry.json` + `custom/design-systems/<name>/components/*.md`  
- `generate-custom-overlay.ts` → customRegistries.ts; runtime appendDesignSystemKnowledge() in assistants/index.ts when designSystems enabled in config.

---

## Assistant list (from manifest)

Assistants are defined in `custom/assistants.manifest.json`. Typical IDs (confirm in manifest): general, content_table, ux_copy_review, design_critique, code2design, dev_handoff, accessibility, errors, design_workshop, discovery_copilot, analytics_tagging. Mode ordering (simple/advanced/content-mvp) is driven by customConfig and defaults in `src/assistants/index.ts` (DEFAULT_SIMPLE_MODE_IDS, ADVANCED_DESIGN_ORDER, DEFAULT_CONTENT_MVP_ASSISTANT_ID).

---

## Migration checklist template

Use this when planning a migration (e.g. moving assistants, renaming KBs, or changing where content lives). **Do not execute migration from this document.**

- [ ] **Scope**
  - [ ] List assistants/KB files/registries affected.
  - [ ] Decide target state (e.g. all assistants in manifest only; all KB via structured .kb.json only).
- [ ] **Assistants**
  - [ ] Backup `custom/assistants.manifest.json`.
  - [ ] Update manifest (add/remove/edit entries, quickActions, knowledgeBaseRefs).
  - [ ] Run `npm run generate-assistants` and fix any schema/validation errors.
  - [ ] Confirm `src/assistants/assistants.generated.ts` and runtime list (e.g. mode order) as expected.
- [ ] **Custom knowledge (.md)**
  - [ ] Backup `custom/knowledge/*.md` and config `knowledgeBases` section if changing.
  - [ ] Update policy (append/override) in `custom/config.json` if needed.
  - [ ] Run `npm run generate-custom-overlay` and confirm customKnowledge.ts.
- [ ] **Structured KB (.kb.json)**
  - [ ] Backup `custom/knowledge-bases/registry.json` and referenced `*.kb.json`.
  - [ ] Update registry and/or .kb.json files; ensure IDs match assistant knowledgeBaseRefs.
  - [ ] Run `npm run generate-knowledge-bases` and confirm knowledgeBases.generated.ts.
- [ ] **Design systems**
  - [ ] If changing registries or components, update `custom/design-systems/` and run generate-custom-overlay.
- [ ] **Network / config**
  - [ ] If adding endpoints, update `custom/config.json` networkAccess and run full build (postbuild patches manifest).
- [ ] **Verification**
  - [ ] `npm run build` and `npm run test` pass.
  - [ ] `npm run invariants` pass.
  - [ ] Manual smoke: open plugin, select assistants, run one quick action and one chat; confirm preamble/KB segment if applicable.

---

## References

- [ARCHITECTURE.md](ARCHITECTURE.md) — data flow and runtime.
- [PR11c1-deliverable.md](PR11c1-deliverable.md) — runtime consumption of structured KBs (no runtime file read).
- [audits/refactor-plan-runtime-assistants-kb-rfc.md](audits/refactor-plan-runtime-assistants-kb-rfc.md) — refactor context for assistants/KB.
