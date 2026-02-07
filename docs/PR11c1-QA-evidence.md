# PR11c1 QA evidence

## Build pipeline

- **Prebuild:** `npm run prebuild` runs `generate-knowledge-bases`; `src/knowledge-bases/knowledgeBases.generated.ts` exists (empty when registry is empty).
- **Generator hardening:** If registry references a missing `*.kb.json`, generator exits non-zero with message "Missing KB files: id (filePath)". If a doc fails schema validation, generator exits non-zero with "Invalid KB document(s): id: field path: message".
- **Tests:** `npm run test` includes instructionAssembly (KB segment), resolveKb, generator error cases (missing file, invalid schema), routing regression, kb-normalization, kb-routes.

## Manual QA checklist (PR11c1-deliverable)

| Item | Result |
|------|--------|
| Prebuild | Pass — generate-knowledge-bases runs; generated file exists. |
| No refs → no KB segment | Pass — assistant with no/empty knowledgeBaseRefs; preamble does not contain "## Knowledge Base". |
| With refs → KB segment present | Pass — add KB to registry + *.kb.json; set knowledgeBaseRefs on assistant; preamble includes "## Knowledge Base" and content. |
| Ordering | Pass — multiple refs (e.g. ['kb-a','kb-b']) list in that order in segment. |
| Truncation | Pass — arrays show "(+N more)"; total segment capped (12k). |
| Quick action path | Pass — RUN_QUICK_ACTION with assistant that has knowledgeBaseRefs includes KB segment. |
| Unknown KB id | Pass — valid-id + unknown-id; no crash; only valid KB in segment; dev warning for unknown. |
| Regression | Pass — npm run test and npm run build (incl. invariants) pass. |

## Commands

```bash
npm run generate-knowledge-bases   # Generate KB bundle only (fails if missing file or invalid schema)
npm run prebuild                   # Includes generate-knowledge-bases
npm run build                      # Prebuild + build + invariants
npm run test                       # All tests including KB + generator error cases
```
