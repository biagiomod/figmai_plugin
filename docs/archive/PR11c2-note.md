> Status: Archived
> Reason: Historical PR note. Preserve for implementation context only.

# PR11c2: ACE KB refs UX + Referenced by (no runtime JSON / contract change)

## What changed

### A) PR11c1 hardening (build-time safety)

- **scripts/generate-knowledge-bases.ts**
  - If the registry references a missing `*.kb.json` file → generator exits with code 1 and message: `Missing KB files: id (filePath), ...`
  - If a KB document fails schema validation → generator exits with code 1 and message: `Invalid KB document(s): id: field path: message; ...`
  - Optional `KB_GENERATOR_ROOT` env var for tests (temp dir).
- **tests/generate-knowledge-bases.test.ts**
  - Two cases: (1) registry points to missing file → exit 1 and stderr contains "Missing KB files"; (2) registry points to file with invalid schema → exit 1 and stderr contains "Invalid KB document".
- **docs/archive/PR11c1-QA-evidence.md**
  - Short QA checklist and results; commands for generate/prebuild/build/test.

### B) PR11c2 (ACE usability)

- **Assistants tab — Knowledge base refs**
  - Replaced the comma-separated text input with a **registry-backed multi-select**:
    - On opening the Assistants tab with an assistant selected, ACE loads `/api/kb/registry` once (`state.kbRegistryFetched`).
    - Editor shows a list of KBs (title + id) as checkboxes; "Selected (order)" with up/down to reorder; selection and order are persisted as `knowledgeBaseRefs: string[]` in the assistant (manifest).
  - No runtime JSON reads: registry is loaded via existing API; persist goes through save model → `custom/assistants.manifest.json`.
- **Knowledge Bases tab — Referenced by**
  - For each KB in the list, a line **"Referenced by: Assistant A, Assistant B"** or **"Not referenced"** is shown, derived from `state.editedModel.assistantsManifest.assistants` (which assistants have this KB id in `knowledgeBaseRefs`).
- **Role gating**
  - The knowledge-bases tab remains visible for the same roles as other editable tabs (admin, manager, editor); no change (already in `ALL_TAB_IDS` and `roleToAllowedTabs`).

## Constraints kept

- No runtime reading of `custom/knowledge-bases/*.json` in the plugin; ACE uses `/api/kb/registry` and save model only.
- Frozen runtime contract and dispatch key unchanged.

## How to QA

1. **Generator:** Create a registry entry pointing to a non-existent file → run `npm run generate-knowledge-bases` → must exit 1 with "Missing KB files". Create a `*.kb.json` with invalid id (e.g. `"invalid id"`) and reference it in registry → generator must exit 1 with "Invalid KB document".
2. **ACE Assistants:** Open Assistants, select an assistant → KB list loads from registry; select/deselect KBs, reorder with Up/Down → save → reload model → confirm `knowledgeBaseRefs` in manifest matches selection and order.
3. **ACE Knowledge Bases:** Open Knowledge Bases → each KB row shows "Referenced by: …" or "Not referenced" according to current assistants manifest in memory.
4. **Tests:** `npm run test` (includes generate-knowledge-bases.test.ts). **Build:** `npm run build` (prebuild + invariants).
