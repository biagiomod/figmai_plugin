> Status: Archived
> Reason: Historical reference / superseded; see docs/README.md for current docs.
> Date: 2026-01-21

# PR11c1 Hardening + PR11c2 Plan — Audit & Implementation

## 1) Concise audit report

### End-to-end flow

1. **Build time**
   - `custom/knowledge-bases/registry.json` lists entries `{ id, title, filePath, ... }`.
   - `scripts/generate-knowledge-bases.ts` reads registry; for each entry loads `KB_DIR/filePath` (*.kb.json); parses JSON and validates with `knowledgeBaseDocumentSchema` (admin-editor); builds `KB_REGISTRY` and `KB_DOCS`; writes `src/knowledge-bases/knowledgeBases.generated.ts`.
   - Prebuild runs this; plugin build consumes the generated file only.

2. **Runtime (plugin)**
   - `resolveKb.ts`: `resolveKnowledgeBaseDocs(refs)` reads only from `KB_DOCS` (no file I/O). Missing ids skipped with dev warning.
   - `main.ts`: SEND_MESSAGE and RUN_QUICK_ACTION both call `resolveKnowledgeBaseDocs(assistant.knowledgeBaseRefs ?? [])` and pass `kbDocs` into `buildAssistantInstructionSegments`.
   - `instructionAssembly.ts`: If `kbDocs.length > 0`, appends a single "## Knowledge Base" segment with per-doc sections, truncation (12k total, 1.5k per section, "+N more" after 8 items).

### Where failures can occur

| Point | Current behavior | Risk |
|-------|-------------------|------|
| Registry references missing file | Generator calls `loadDoc(entry.filePath)`; `fs.existsSync` false → returns `null`; entry skipped silently; no exit 1. | Build “succeeds” with incomplete bundle; runtime missing KB for that id. |
| *.kb.json fails schema | `knowledgeBaseDocumentSchema.safeParse` fails → `loadDoc` returns `null`; entry skipped silently. | Invalid doc not reported; same incomplete bundle. |
| Registry JSON malformed | `JSON.parse(raw)` throws; not caught in generator. | Unhandled exception; prebuild fails with stack trace (acceptable but message could be clearer). |
| Empty registry | Returns `[]`; generator emits empty `KB_REGISTRY` and `KB_DOCS`. | Correct. |
| Runtime unknown ref | `resolveKnowledgeBaseDocs` skips missing id; dev warning only. | By design; no change. |

### Constraints (unchanged)

- No runtime reading of `custom/knowledge-bases/*.json` (plugin uses only generated TS).
- No changes to provider/recovery tiers.
- Dispatch key `(assistantId, actionId)` unchanged.

---

## 2) Step-by-step implementation plan

### A) PR11c1 hardening

| Step | File(s) | Change |
|------|---------|--------|
| A1 | `scripts/generate-knowledge-bases.ts` | Validate every registry entry: (1) If `filePath` missing on disk → collect (id, filePath), then exit 1 with message "Missing KB files: id1 (path1), id2 (path2)". (2) If doc load fails schema → collect (id, formatted zod errors), then exit 1 with "Invalid KB document(s): id1: field path: message; id2: ...". Use a small helper to format zod errors (e.g. path + message per issue). |
| A2 | `scripts/generate-knowledge-bases.test.ts` (new) | Run generator against fixtures: (1) Registry with `filePath` pointing to non-existent file → expect exit code 1 and stderr containing "Missing KB files". (2) Registry with valid file path but invalid JSON/schema in file → expect exit code 1 and stderr containing "Invalid KB document". Use temp dir + fs; run via spawn or invoke main and catch process.exit. |
| A3 | `docs/PR11c1-QA-evidence.md` (new) | Short note: prebuild ran, generated file exists; tests (instructionAssembly, resolveKb, generator error cases) pass; manual checklist items (no refs → no segment; with refs → segment present; ordering; truncation; quick action path; unknown id; regression) with result (e.g. "Pass" or "N/A – minimal KB not added in this run"). |

### B) PR11c2 (ACE KB refs UX + Referenced by)

| Step | File(s) | Change |
|------|---------|--------|
| B1 | `admin-editor/public/app.js` | **KB refs picker:** When rendering assistant editor, replace single text input `ae-knowledgeBaseRefs` with a registry-backed multi-select: (1) Ensure KB registry is loaded when Assistants tab is shown (call `fetchKbRegistry()` from `renderAssistantsTab` or when opening assistant editor if not already loaded). (2) Render a list of KBs (from `state.kbRegistry`) with checkboxes or multi-select; show title + id; optional search filter. (3) Allow reorder (up/down) for selected refs; persist order as `knowledgeBaseRefs: string[]`. (4) On change, set `a.knowledgeBaseRefs` to ordered array of selected ids. |
| B2 | `admin-editor/public/app.js` | **Referenced by:** In KB list or detail view (e.g. in `renderKnowledgeBasesTabContent` for each entry, or in `kbEditFormHtml`), compute `referencedBy = assistants.filter(a => (a.knowledgeBaseRefs || []).includes(entry.id))` from `state.editedModel.assistantsManifest.assistants`. Display "Referenced by: X, Y" or "Not referenced". |
| B3 | Role gating | Confirm knowledge-bases tab is allowed for admin/manager/editor (already in `ALL_TAB_IDS` and `roleToAllowedTabs`). No code change if already correct. |
| B4 | Tests | (1) Generator error tests (see A2). (2) Optional: lightweight test that registry load + selection serialization (e.g. in-memory: given registry JSON, selected ids array → persist as knowledgeBaseRefs) is consistent; can be a small unit test in admin-editor or a shared helper test. |

### File-by-file diff plan (before editing)

1. **scripts/generate-knowledge-bases.ts** — Add validation loop: collect missing files; collect schema errors with formatted messages; `process.exit(1)` with clear message if any. Keep existing emit logic when valid.
2. **scripts/generate-knowledge-bases.test.ts** (new) — Two cases: missing file, invalid schema; run generator in temp dir; assert exit code and stderr content.
3. **docs/PR11c1-QA-evidence.md** (new) — Checklist + results.
4. **admin-editor/public/app.js** — (a) In `renderAssistantsTab` or before rendering assistant form, ensure `state.kbRegistry` is set (fetch if empty). (b) Replace `ae-knowledgeBaseRefs` input with a div containing: list of KBs with checkboxes + reorder controls for selected; bind change to `a.knowledgeBaseRefs`. (c) In KB list/detail, add "Referenced by" using `state.editedModel.assistantsManifest.assistants`.
5. **package.json** — Add `generate-knowledge-bases.test.ts` to test script if we add it; or run generator test as part of existing test command.
6. **docs/PR11c1-deliverable.md** or **docs/PR11c2-note.md** — Short note on what changed (generator fails fast; ACE picker + Referenced by).

**Status:** Implemented. See docs/PR11c1-QA-evidence.md and docs/PR11c2-note.md.
