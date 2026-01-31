# Admin Config Editor – Plan V3

**Status:** Audit + planning only. No implementation yet.  
**Supersedes:** [Admin Config Editor – Revised Plan (V2)](ADMIN_CONFIG_EDITOR_PLAN_V2.md). V2 remains as reference with a superseded banner.  
**Audience:** Contributors (including non-technical editors) and plugin owners.

This document confirms sources of truth, classifies what is editable vs out of scope, refines Phases 0–3, states Go/No-Go criteria, risks and mitigations, and a **doc hygiene policy**. The Admin Config Editor is a **local-only, browser-based, file-backed** tool so contributors can safely edit plugin customizations **without editing TypeScript**. The editor **runs generators after save** and **never compiles or publishes** the plugin; it tells the owner to build and publish.

---

## 1. Re-audit summary: sources of truth

### 1.1 Plugin-wide config

| Source | Path | Editable by editor? |
|--------|------|---------------------|
| Custom config | `custom/config.json` | **Yes** (direct). Read by `scripts/generate-custom-overlay.ts` → `src/custom/generated/customConfig.ts`; runtime imports generated TS. |
| Generated config | `src/custom/generated/customConfig.ts` | No (generator only). |
| Core CONFIG (code) | `src/core/config.ts` | No (code-only). Feature flags, defaultMode fallback, dev flags, debug scopes. |
| User settings | `src/core/settings.ts` (clientStorage) | **No** (out of scope; per-user runtime). |

**custom/config.json** current shape: `ui` (defaultMode, hideContentMvpMode), `llm` (endpoint, hideModelSettings, uiMode), `knowledgeBases`, `networkAccess`, `resources`, `designSystems`. Optional: `analytics` (generator supports it; Phase 1 editable only if present in config). **Not yet in config:** `ui.simpleModeIds`, `ui.contentMvpAssistantId` (proposed in Phase 0).

### 1.2 Assistants

| Source | Path | Editable by editor? |
|--------|------|---------------------|
| Assistant registry | `src/assistants/index.ts` | **No** (today). Single source of truth: ASSISTANTS array, inline prompts, listAssistantsByMode with hardcoded simpleModeIds and content_table filter. |
| Custom KB overlay | `custom/knowledge/*.md` | **Yes** (direct). generate-custom-overlay → customKnowledge.ts; mergeKnowledgeBase() at runtime. |
| Generated knowledge | `src/custom/generated/customKnowledge.ts` | No (generator only). |

For editor safety, Phase 0 proposes a file-based manifest (`custom/assistants.manifest.json`) + generator so the editor never edits TypeScript.

### 1.3 Content models and design system registries

| Source | Path | Editable by editor? |
|--------|------|---------------------|
| Content models | `docs/content-models.md` | **Yes**. Read by `scripts/generate-presets.ts` → `src/core/contentTable/presets.generated.ts`. Editor writes back deterministic format. |
| Design system registries | `custom/design-systems/<id>/registry.json` | **Yes** (direct). generate-custom-overlay → customRegistries.ts. |

### 1.4 Generators (no direct edits by editor)

- `scripts/generate-custom-overlay.ts`: config.json, custom/knowledge/*.md, design-systems → generated TS.
- `scripts/generate-presets.ts`: docs/content-models.md → presets.generated.ts.
- **Future (Phase 0):** `scripts/generate-assistants-from-manifest.ts`: assistants manifest → ASSISTANTS in TS.

**Explicit:** The editor **runs generators after save**. The editor **never runs plugin build or publish**.

---

## 2. Classification table

Every setting is classified as: **Phase 1 editable**, **Read-only / documented only**, or **Explicitly out of scope**.

### 2.1 Phase 1 editable (editor reads/writes these)

| Setting / surface | Location | Notes |
|-------------------|----------|--------|
| UI default mode, hide Content-MVP | custom/config.json `ui` | Already in config. |
| Simple-mode assistant list and order | custom/config.json `ui` (new: simpleModeIds) | Phase 0: add to config. |
| Content-MVP assistant id | custom/config.json `ui` (new: contentMvpAssistantId) | Phase 0: add to config. |
| LLM endpoint, hide model settings, UI mode | custom/config.json `llm` | Already in config. |
| Knowledge base policies (append/override per assistant) | custom/config.json `knowledgeBases` | Already in config. |
| Network allowed domains | custom/config.json `networkAccess` | Already in config. |
| Resources (links, credits) | custom/config.json `resources` | Already in config. |
| Design systems (enabled, registries, denylist, strictMode) | custom/config.json `designSystems` | Already in config. |
| Analytics (optional) | custom/config.json `analytics` | Phase 1 editable **only if** present in config; add to JSON if editors should toggle. |
| Assistant list and metadata | custom/assistants.manifest.json (new) | Phase 0: add manifest + generator. |
| Per-assistant: id, label, intro, welcomeMessage, hoverSummary, tag, iconId, kind, quickActions, promptTemplate | assistants.manifest.json | No direct TS edits. |
| Custom knowledge overlay body | custom/knowledge/<assistantId>.md | Already files. |
| Content Table presets (models and columns) | docs/content-models.md (or content-models.json if added later) | Editor writes back deterministic format. |
| Design system registry JSON | custom/design-systems/<id>/registry.json | Already files. |

### 2.2 Read-only / documented only (editor does not change these; document for owners)

| Setting / surface | Location | Rationale |
|-------------------|----------|-----------|
| Feature flags (enableToolCalls, enableVision, enableSelectionExportPng) | src/core/config.ts CONFIG.features | Code-only; owner changes in code. Document in reference. |
| Default provider, defaultMode fallback | src/core/config.ts CONFIG | Overridden by customConfig when set; CONFIG is fallback. Document. |
| Dev flags (validation logging, clipboard debug, sync API detection, Design Critique debug) | src/core/config.ts CONFIG.dev | Developer-only. Document; do not expose in Phase 1. |
| Debug scopes and levels | src/core/config.ts CONFIG.dev.debug | Developer-only. Document; do not expose in Phase 1. |
| Selection policy (NORMAL, ANALYTICS_TAGGING_PAIR) | src/core/context/selectionPolicy.ts | Behavior is code-driven; no config file. Document. |
| Request timeout, default model (user-facing) | src/core/settings.ts (clientStorage) | Per-user runtime settings; not customization. Out of scope. |

### 2.3 Explicitly out of scope

| Item | Reason |
|------|--------|
| User settings (clientStorage) | Per-user; not plugin customization. |
| Plugin build or publish | Editor never runs build/publish; only generators and file writes. |
| CONFIG.dev / CONFIG.features in editor UI | Reduces scope creep; owners edit in code. Optional later phase. |
| Direct edits to any .ts file | Editor only touches JSON, Markdown, and manifest; generators produce TS. |
| Renaming or refactoring work-plugin folder or code | Out of scope for this plan; use “custom” in new docs only. |

---

## 3. Phases 0–3 (refined)

**Explicit rule:** The editor **runs generators after save**. The editor **never builds or publishes** the plugin.

### Phase 0: Prerequisites (manifest + config-driven modal)

**Goal:** Provide file-based assistant source and modal visibility in config so the editor never edits TypeScript.

**Scope:** Add custom/assistants.manifest.json and scripts/generate-assistants-from-manifest.ts; src/assistants/index.ts imports ASSISTANTS from generated; listAssistantsByMode uses config (customConfig.ui.simpleModeIds, contentMvpAssistantId); custom/config.json gains ui.simpleModeIds and ui.contentMvpAssistantId; generate-custom-overlay extended to emit these with defaults if missing.

**What editors can change after Phase 0:** config.json (including simpleModeIds, contentMvpAssistantId) and assistants.manifest.json (with generator run afterward). No TS edits.

**What remains code-only:** CONFIG (src/core/config.ts), selection policy, handlers, UI logic.

**Validation and rollback:** Manifest schema (ids unique, required fields, enums); config schema; generator must succeed or prebuild fails. Keep last N backups under custom/.backups/ before overwriting; document backup path in save summary.

### Phase 1: Admin Config Editor – server and model

**Goal:** Local Node server: GET /api/model, POST /api/validate, POST /api/save; deterministic writes and backups.

**Scope:** Server reads config.json, assistants.manifest.json, custom/knowledge/*.md, docs/content-models.md, custom/design-systems/*/registry.json; builds AdminEditableModel; on save: validate, write to files (with backups), **run generate-assistants, generate-custom-overlay, generate-presets**; return success and summary. **Do not** run plugin build or publish.

**What editors can change:** Via API: all Phase 1 editable surfaces. UI not yet built.

### Phase 2: Admin Config Editor – UI

**Goal:** Browser UI: load model, schema-driven forms, Validate and Save with confirmation and “next steps.”

**Scope:** Static HTML + JS; fetch GET /api/model; render sections; Validate only and Save (with confirmation). After save: show files touched, backup path, **Next steps**: “Ask the plugin owner to run `npm run prebuild` (if not run automatically), then `npm run build`, test in Figma, and publish if appropriate.” **Never** run build or publish from the editor.

### Phase 3: Polish and documentation

**Scope:** admin-editor/README (how to run server, Validate/Save, where backups live). Optional: light auth, audit log. Update docs index to link to Admin Config Editor. No plugin build or publish from editor.

---

## 4. Go/No-Go criteria

**Go** if all of the following hold:

1. **Phase 0 is agreed:** Assistants manifest (custom/assistants.manifest.json) + generator (generate-assistants-from-manifest) + modal visibility in config (simpleModeIds, contentMvpAssistantId). No editor yet; plugin behavior unchanged after refactor.
2. **Editor boundaries are fixed:** Editor only reads/writes the files listed in §2.1; never edits .ts; never runs plugin build or publish; **only runs generators after save**.
3. **Backup and rollback:** Every write is preceded by a backup under custom/.backups/; save response includes backup path; owner can restore and re-run generators.

**No-Go** if: Phase 0 refactor is rejected (e.g. must keep all assistant data in TS only), or editor is required to compile/publish the plugin, or CONFIG/selection policy must be editable in Phase 1 without a clear writable source.

---

## 5. Risks and mitigations

| Risk | Mitigation |
|------|-------------|
| **Migration and generator correctness** | One-time migration script from current index.ts → assistants.manifest.json. Compare runtime ASSISTANTS (or promptMarkdown) before/after; add manual or automated check. |
| **Round-trip stability (content-models.md)** | Option A: Editor writes back strict deterministic Markdown (same section order, format). Option B (later): Introduce content-models.json; editor only touches JSON; generator accepts JSON. |
| **Scope creep** | Phase 1 editor only touches: config.json, assistants.manifest.json, custom/knowledge/*.md, content-models.md, design-systems registry.json. Document CONFIG and selection policy as read-only; do not add dev/features to editor in Phase 1. |
| **Orphaned or unlinked docs** | Link all plan/summary docs from docs/README (e.g. “Other plans and summaries”); or move clearly obsolete docs to docs/archive/ with an “Archived” header. Prefer linking over moving to avoid churn. |

---

## 6. Doc hygiene policy

- **CONTRIBUTING.md:** Keep at repo root. It is the standard contribution guide. No change required for the Admin Config Editor.
- **Naming:** **New** docs use **lowercase-with-hyphens** (e.g. admin-config-editor-changelog.md). **Existing** plan/audit docs may remain UPPERCASE; do not rename in this plan. If a full normalize-to-lowercase pass is done, do it as a separate change with a complete link-update checklist.
- **Orphan handling:** Every doc should be linked from docs/README.md or placed in docs/archive/ with an “Archived” / superseded note. Prefer adding links over moving files.
- **Terminology:** In **new** Admin Config Editor docs and this plan, use the term **“custom”** (e.g. custom overlay, custom config, custom knowledge). When referencing literal existing paths or identifiers that must remain unchanged (e.g. work-plugin/, core/work/, workAdapter), keep those names as-is.
- **Sensitive content:** Do not introduce any sensitive org or employer names anywhere in docs.

---

## 7. Changes from V2

| Aspect | V2 | V3 (this document) |
|--------|-----|---------------------|
| **Authority** | V2 was authoritative | V3 is authoritative; V2 is superseded reference. |
| **Re-audit** | Summary in plan | Re-audit summary confirmed; explicit “editor runs generators after save; never build/publish” in phases. |
| **Classification** | Phase 1 editable / read-only / out of scope | Same; analytics clarified as “Phase 1 editable only if present in config.” |
| **Phases** | 0–3 with scope and files touched | Same; each phase states explicitly that the editor runs generators after save and never builds or publishes. |
| **Risks** | Three risks + mitigations | Fourth mitigation added: orphaned/unlinked docs (link or archive). |
| **Doc hygiene** | CONTRIBUTING keep; naming keep-as-is or normalize; custom terminology | Codified as “Doc hygiene policy” (§6): CONTRIBUTING at root; new docs lowercase-with-hyphens; existing may remain; link-or-archive rule; “custom” in new prose; no sensitive names. |
| **README** | Linked V2 as AUTHORITATIVE | README updated to link V3 as AUTHORITATIVE, V2 as SUPERSEDED REFERENCE; “Other plans and summaries” added for previously unlinked docs. |

---

## 8. Recommendation

- **Ready to proceed to implementation?** Yes, provided Phase 0 is approved and the Go criteria in §4 are accepted.
- **Which phase first?** Phase 0. Then Phase 1 (server and model), then Phase 2 (UI), then Phase 3 (polish and docs).
- **Do not** start Phase 1 (editor server) until Phase 0 is done and verified; otherwise the editor has no writable assistant source and would require direct TS edits.

---

*End of Plan V3. Audit + planning only; no implementation or refactor in this task.*
