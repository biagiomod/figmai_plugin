# PR11c1: Runtime consumption of Knowledge Bases — Deliverable

## Goal (achieved)

- Assistants with `knowledgeBaseRefs` include those KB documents in the assistant preamble deterministically.
- KBs are resolved from generated TS only (SSOT); no runtime JSON/file reads from `custom/knowledge-bases`.
- Token/size budgets and stable behavior: max total KB segment 12k chars, per-section cap 1.5k, arrays trimmed with “(+N more)” after 8 items.

## Constraints respected

- No runtime JSON file reading (all KB data from `knowledgeBases.generated.ts`).
- No changes to provider/recovery tier logic.
- Dispatch key `(assistantId, actionId)` unchanged.
- Tests added for: KB resolution, ordering, truncation, and “no refs → no KB segment”.

---

## Files changed (summary)

| Area | File | Change |
|------|------|--------|
| **Types** | `src/core/knowledgeBases/types.ts` | **New.** `KnowledgeBaseDocument` and `KbRegistryEntry` (plugin-only; no admin-editor runtime dep). |
| **Generator** | `scripts/generate-knowledge-bases.ts` | **New.** Reads `custom/knowledge-bases/registry.json` + referenced `*.kb.json` at build time; validates with admin-editor schema; emits generated TS. |
| **Generated** | `src/knowledge-bases/knowledgeBases.generated.ts` | **New (generated).** Exports `KB_REGISTRY`, `KB_DOCS`. Created/updated by `npm run generate-knowledge-bases`. |
| **Resolver** | `src/core/knowledgeBases/resolveKb.ts` | **New.** `resolveKnowledgeBaseDocs(refs)` → docs in refs order; missing ids skipped with dev warning. |
| **Assembly** | `src/core/assistants/instructionAssembly.ts` | **Updated.** Optional `kbDocs` param; appends “## Knowledge Base” segment with truncation (max total, per-section, “+N more” for arrays). |
| **Runtime** | `src/main.ts` | **Updated.** Both SEND_MESSAGE and RUN_QUICK_ACTION: resolve `assistant.knowledgeBaseRefs` via `resolveKnowledgeBaseDocs`, pass `kbDocs` into `buildAssistantInstructionSegments`. |
| **Tests** | `src/core/assistants/instructionAssembly.test.ts` | **Updated.** Tests: no kbDocs → no segment; empty kbDocs → no segment; with kbDocs → segment present; deterministic order/format; array truncation “(+N more)”. |
| **Tests** | `src/core/knowledgeBases/resolveKb.test.ts` | **New.** Tests: empty refs → []; unknown id → [] (no throw); stable order. |
| **Scripts** | `package.json` | **Updated.** Added `generate-knowledge-bases` script; included in `prebuild`; added `resolveKb.test.ts` to `test` script. |

---

## Manual QA checklist

- [ ] **Prebuild**  
  - Run `npm run prebuild` (or `npm run build`).  
  - Confirm `generate-knowledge-bases` runs and `src/knowledge-bases/knowledgeBases.generated.ts` exists (empty or with entries per registry).

- [ ] **No refs → no KB segment**  
  - Use an assistant that has no `knowledgeBaseRefs` (or empty array).  
  - Send a message (SEND_MESSAGE path).  
  - In any logging or preamble inspection, confirm the preamble does **not** contain `## Knowledge Base`.

- [ ] **With refs → KB segment present**  
  - Add at least one KB to `custom/knowledge-bases/registry.json` and a corresponding `*.kb.json`; run `npm run generate-knowledge-bases`.  
  - Set that KB id in an assistant’s `knowledgeBaseRefs` in manifest/custom config.  
  - Send a message with that assistant.  
  - Confirm the preamble includes `## Knowledge Base` and content from that KB (e.g. title, purpose, definitions).

- [ ] **Ordering**  
  - Assign multiple KB ids in `knowledgeBaseRefs` (e.g. `['kb-a','kb-b']`).  
  - Confirm the segment lists KBs in that order (e.g. “### Title A” before “### Title B”).

- [ ] **Truncation**  
  - Use a KB with many definitions (e.g. > 8 items) or very long text.  
  - Confirm arrays show “(+N more)” and/or total segment is capped (no runaway size).

- [ ] **Quick action path**  
  - With an assistant that has `knowledgeBaseRefs`, trigger a quick action (RUN_QUICK_ACTION).  
  - Confirm the injected preamble for that request also includes the Knowledge Base segment (same as SEND_MESSAGE).

- [ ] **Unknown KB id**  
  - Set `knowledgeBaseRefs: ['valid-id', 'unknown-id']` where `unknown-id` is not in the registry.  
  - Send a message; confirm no crash and only the valid KB appears in the segment.  
  - In dev, optionally confirm a console warning for the unknown id.

- [ ] **Regression**  
  - Run `npm run test` (instructionAssembly, resolveKb, routing regression, kb-normalization, kb-routes).  
  - Run `npm run build` and any invariant/regression scripts; all pass.

---

## Commands

```bash
npm run generate-knowledge-bases   # Generate KB bundle only
npm run prebuild                   # Includes generate-knowledge-bases
npm run build                     # Prebuild + build + invariants
npm run test                      # All tests including KB
```
