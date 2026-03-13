> Status: Archived
> Reason: Historical reference / superseded; see docs/README.md for current docs.
> Date: 2026-01-21

# Admin Config Editor – Revised Plan (V2)

**Superseded by:** [Admin Config Editor – Plan V3](./ADMIN_CONFIG_EDITOR_PLAN_V3.md). Use the V3 plan for the current authoritative scope, classification, phases, Go/No-Go, and doc hygiene policy. This V2 document is kept as reference.

---

**Status:** Audit + planning only. No implementation yet.  
**Supersedes:** ADMIN_CONFIG_EDITOR_IMPLEMENTATION_PLAN.md (this document refines and replaces it; AUDIT and ARCHITECTURE remain as reference and are summarized here).  
**Audience:** Contributors (including non-technical editors) and plugin owners.

This document re-audits configuration surfaces, classifies what is editable vs out of scope, proposes a refined phased plan, addresses documentation hygiene, and states Go/No-Go criteria. The Admin Config Editor is a **local-only, browser-based, file-backed** tool so contributors can safely edit plugin customizations **without editing TypeScript**. The editor **never compiles or publishes** the plugin; it runs generators and tells the owner to build and publish.

---

## 1. Re-audit: sources of truth (confirmed)

### 1.1 Plugin-wide config

| Source | Path | Read by | Writable by editor |
|--------|------|---------|--------------------|
| Custom config | `custom/config.json` | `scripts/generate-custom-overlay.ts` → `src/custom/generated/customConfig.ts`; runtime imports generated TS | **Yes** (direct) |
| Generated config | `src/custom/generated/customConfig.ts` | `src/custom/config.ts`, analytics, knowledge merger | No (generator only) |
| Core CONFIG (code) | `src/core/config.ts` | main, UI, providers, logger, etc. | No (code-only) |
| User settings | `src/core/settings.ts` (clientStorage) | Runtime only, per user | **No** (out of scope) |

**custom/config.json** current shape: `ui` (defaultMode, hideContentMvpMode), `llm` (endpoint, hideModelSettings, uiMode), `knowledgeBases`, `networkAccess`, `resources`, `designSystems`. Optional: `analytics` (generator supports it; add to JSON if editors should toggle it).

### 1.2 Assistant definitions and Select Assistant modal

| Source | Path | Read by | Writable by editor |
|--------|------|---------|--------------------|
| Assistant registry | `src/assistants/index.ts` | UI (listAssistantsByMode), main (getAssistant, etc.) | **No** (avoid direct TS edits) |
| Public KB (reference) | `src/assistants/*.md` | Not loaded at runtime; prompts are inline in index.ts | No (reference only) |
| Custom KB overlay | `custom/knowledge/*.md` | generate-custom-overlay → customKnowledge.ts; runtime mergeKnowledgeBase() | **Yes** (direct) |
| Generated knowledge | `src/custom/generated/customKnowledge.ts` | `src/custom/knowledge.ts` | No (generator only) |

Modal visibility/order: today **hardcoded** in `src/assistants/index.ts` (`simpleModeIds`, content-mvp filter). Not in config. **Proposed:** move to config (Phase 0) and add assistants manifest so the editor has file-based targets.

### 1.3 Content Table presets and design system registries

| Source | Path | Read by | Writable by editor |
|--------|------|---------|--------------------|
| Content models | `docs/content-models.md` | `scripts/generate-presets.ts` → `src/core/contentTable/presets.generated.ts` | **Yes** (direct or via JSON source) |
| Design system registries | `custom/design-systems/<id>/registry.json` | generate-custom-overlay → customRegistries.ts | **Yes** (direct) |

### 1.4 Generators (no direct edits by editor)

- `scripts/generate-custom-overlay.ts`: config.json, custom/knowledge/*.md, design-systems → generated TS.
- `scripts/generate-presets.ts`: docs/content-models.md → presets.generated.ts.
- **Future:** `scripts/generate-assistants-from-manifest.ts`: assistants manifest → ASSISTANTS in TS (Phase 0).

---

## 2. Classification: what is editable vs out of scope

Every setting is classified as: **Phase 1 editable**, **Read-only / documented only**, or **Explicitly out of scope**.

### 2.1 Phase 1 editable (editor reads/writes these)

| Setting / surface | Location | Notes |
|-------------------|----------|--------|
| UI default mode, hide Content-MVP | custom/config.json `ui` | Already in config |
| Simple-mode assistant list and order | custom/config.json `ui` (new: simpleModeIds) | Phase 0: add to config |
| Content-MVP assistant id | custom/config.json `ui` (new: contentMvpAssistantId) | Phase 0: add to config |
| LLM endpoint, hide model settings, UI mode | custom/config.json `llm` | Already in config |
| Knowledge base policies (append/override per assistant) | custom/config.json `knowledgeBases` | Already in config |
| Network allowed domains | custom/config.json `networkAccess` | Already in config |
| Resources (links, credits) | custom/config.json `resources` | Already in config |
| Design systems (enabled, registries, denylist, strictMode) | custom/config.json `designSystems` | Already in config |
| Analytics (optional) | custom/config.json `analytics` | Add to JSON if editors should toggle |
| Assistant list and metadata | custom/assistants.manifest.json (new) | Phase 0: add manifest + generator |
| Per-assistant: id, label, intro, welcomeMessage, hoverSummary, tag, iconId, kind, quickActions, promptTemplate | assistants.manifest.json | No direct TS edits |
| Custom knowledge overlay body | custom/knowledge/<assistantId>.md | Already files |
| Content Table presets (models and columns) | docs/content-models.md (or content-models.json if added) | Editor writes back deterministic format |
| Design system registry JSON | custom/design-systems/<id>/registry.json | Already files |

### 2.2 Read-only / documented only (editor does not change these; document for owners)

| Setting / surface | Location | Rationale |
|-------------------|----------|------------|
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

## 3. Refined phased plan

### Phase 0: Prerequisites (manifest + config-driven modal)

**Goal:** Provide file-based assistant source and modal visibility in config so the editor never edits TypeScript.

**Scope:**

- Add **custom/assistants.manifest.json** with the same data as today’s ASSISTANTS (id, label, intro, welcomeMessage?, hoverSummary?, tag?, iconId, kind, quickActions, **promptTemplate**). promptTemplate = current base string passed to mergeKnowledgeBase (inline prompt in index.ts).
- Add **scripts/generate-assistants-from-manifest.ts** that reads the manifest and emits **src/assistants/assistants.generated.ts** exporting ASSISTANTS with promptMarkdown = appendDesignSystemKnowledge(mergeKnowledgeBase(id, promptTemplate)).
- **src/assistants/index.ts**: import ASSISTANTS from generated; implement listAssistantsByMode using **config** for simple/content-mvp (customConfig.ui.simpleModeIds, customConfig.ui.contentMvpAssistantId) with safe defaults.
- **custom/config.json**: add `ui.simpleModeIds` and `ui.contentMvpAssistantId`. **scripts/generate-custom-overlay.ts**: extend CustomConfig type and output to include these; emit defaults if missing.

**Files touched:**

- **Add:** custom/assistants.manifest.json, scripts/generate-assistants-from-manifest.ts, src/assistants/assistants.generated.ts (generated).
- **Change:** src/assistants/index.ts, custom/config.json, scripts/generate-custom-overlay.ts, package.json (generate-assistants script + prebuild).

**What editors can safely change after Phase 0:** config.json (including simpleModeIds, contentMvpAssistantId) and assistants.manifest.json (with generator run afterward). No TS edits.

**What remains code-only:** CONFIG (src/core/config.ts), selection policy, handlers, UI logic.

**Validation and rollback:**

- Validation: manifest schema (ids unique, required fields, enums); config schema; generator must succeed or prebuild fails.
- Rollback: keep last N backups under custom/.backups/ before overwriting; document backup path in save summary. Owner can restore from backup and re-run generators.

---

### Phase 1: Admin Config Editor – server and model

**Goal:** Local Node server that exposes GET /api/model, POST /api/validate, POST /api/save; deterministic writes and backups.

**Scope:**

- New **admin-editor/** (or **scripts/admin-editor/**): server (e.g. Express), CWD = plugin root. GET /api/model: read config.json, assistants.manifest.json, custom/knowledge/*.md, docs/content-models.md, custom/design-systems/*/registry.json; build single AdminEditableModel; validate on load; return JSON + any validation errors. POST /api/validate: validate body; return { errors, warnings }. POST /api/save: validate; if invalid return 400; else write to config, manifest, knowledge files, content-models, registries (deterministic, with backups); run generate-assistants and generate-custom-overlay and generate-presets; return { success, filesTouched, backupPath, summary }. Do **not** run plugin build or publish.
- Schema (e.g. Zod) for PluginConfig, AssistantDef, AdminEditableModel; deterministic write helpers (fixed key order, 2-space JSON); backup to custom/.backups/ with prune (e.g. last 5 per file).

**Files touched:**

- **Add:** admin-editor/server, admin-editor/schema, admin-editor/write (or equivalent), admin-editor/package.json if separate package.

**What editors can safely change:** Via API only: all Phase 1 editable surfaces (config, assistants manifest, custom knowledge, content models, registries). UI not yet built; use API from browser or curl for Phase 1.

**What remains code-only:** Unchanged from Phase 0.

**Validation and rollback:** Same as Phase 0; plus validate-only endpoint and server-side validation before every save.

---

### Phase 2: Admin Config Editor – UI

**Goal:** Browser UI that loads model, shows schema-driven forms, Validate and Save with confirmation and “next steps.”

**Scope:**

- Static HTML + JS (or minimal framework) in admin-editor: fetch GET /api/model; render sections (Config, Assistants, Custom knowledge, Content models, Registries). Schema-driven forms (from Zod or JSON Schema). Buttons: Validate only, Save (with confirmation). After save: show files touched, backup path, **Next steps**: “Ask the plugin owner to run `npm run prebuild` (if not run automatically), then `npm run build`, test in Figma, and publish if appropriate.” Never run build or publish from the editor.

**Files touched:**

- **Add:** admin-editor/public (or equivalent) with index.html and JS.

**What editors can safely change:** Same as Phase 1, via UI.

**Validation and rollback:** Same; UX adds confirm before save and clear success/error messages.

---

### Phase 3: Polish and documentation

**Scope:** admin-editor/README (how to run server, open browser, Validate/Save, where backups live). Optional: light auth (custom/admin-accounts.json, audit log “who saved last”). Update docs index to link to Admin Config Editor. No plugin build or publish from editor.

**Later phases (optional):** content-models.json as source for presets (generate-presets accepts JSON); CONFIG.dev/features in a separate config file and editable via editor; public prompts in .md per assistant.

---

## 4. Risks and mitigations

| Risk | Mitigation |
|------|-------------|
| **Migration and generator correctness** | One-time migration script from current index.ts → assistants.manifest.json. Compare runtime ASSISTANTS (or promptMarkdown) before/after; add manual or automated check. |
| **Round-trip stability (content-models.md)** | Option A: Editor writes back strict deterministic Markdown (same section order, format). Option B (later): Introduce content-models.json; editor only touches JSON; generator accepts JSON. |
| **Scope creep** | Phase 1 editor only touches: config.json, assistants.manifest.json, custom/knowledge/*.md, content-models.md, design-systems registry.json. Document CONFIG and selection policy as read-only; do not add dev/features to editor in Phase 1. |

---

## 5. Documentation hygiene and “orphaned” files

### 5.1 CONTRIBUTING.md

- **Recommendation:** Keep as-is. It is the contribution guide; it references “work” and “Custom Adapter” and directory layout. No change required for the Admin Config Editor. If a future pass prefers “custom” over “work” in prose, do it in a single terminology pass and update CONTRIBUTING + docs together.

### 5.2 Docs naming (uppercase vs lowercase)

- **Current state:** docs/README says “Use lowercase filenames with hyphens.” Many plan/audit docs are UPPERCASE (e.g. ADMIN_CONFIG_EDITOR_*.md, ANALYTICS_TAGGING_*.md, CONTENT_SAFETY_*.md, selection-policy-plan.md).
- **Recommendation:** **Keep as-is** for existing plan/audit docs (visibility and convention for “plan” docs). For **new** docs added by this project: use **lowercase-with-hyphens** (e.g. admin-config-editor-plan-v2.md) and add to docs/README. Alternatively, **normalize** all docs to lowercase-with-hyphens and update every reference (docs/README, links from other docs, grep); do this in a single dedicated change with a strict rename list and reference update checklist. Prefer “keep as-is” for now to avoid churn; document the rule: “New docs: lowercase-with-hyphens; existing plan docs may remain UPPERCASE.”

### 5.3 work-plugin directory and “custom” terminology

- **Recommendation:** **Keep** docs/work-plugin/ and code paths (e.g. core/work/, workAdapter) **unchanged**. In **new** Admin Config Editor docs and this plan, use the term **“custom”** only (e.g. “custom overlay,” “custom config,” “custom knowledge”). No renaming of folders or code in this plan.

### 5.4 Orphaned or stale docs

- **Plans in docs root** (e.g. ANALYTICS_TAGGING_*, CONTENT_SAFETY_*, SELECTION_POLICY_PLAN, smart-placement-v2-*): Treat as active or historical per their content; link from docs/README or archive if superseded. Admin Config Editor plans: this V2 plan supersedes ADMIN_CONFIG_EDITOR_IMPLEMENTATION_PLAN; keep ADMIN_CONFIG_EDITOR_AUDIT and ADMIN_CONFIG_EDITOR_ARCHITECTURE as reference.
- **archive/:** Keep as-is (historical). No change for Admin Config Editor.

---

## 6. Go/No-Go criteria for implementation

**Go** if all of the following hold:

1. **Phase 0 is agreed:** Assistants manifest (custom/assistants.manifest.json) + generator (generate-assistants-from-manifest) + modal visibility in config (simpleModeIds, contentMvpAssistantId). No editor yet; plugin behavior unchanged after refactor.
2. **Editor boundaries are fixed:** Editor only reads/writes the files listed in §2.1; never edits .ts; never runs plugin build or publish; only runs generators after save.
3. **Backup and rollback:** Every write is preceded by a backup under custom/.backups/; save response includes backup path; owner can restore and re-run generators.

**No-Go** if: Phase 0 refactor is rejected (e.g. must keep all assistant data in TS only), or editor is required to compile/publish the plugin, or CONFIG/selection policy must be editable in Phase 1 without a clear writable source.

---

## 7. Summary of changes from previous plan

| Aspect | Previous plan | V2 (this document) |
|--------|----------------|---------------------|
| **Audit** | Single audit doc; summary in plan | Re-audit confirmed; classification table added (§2): Phase 1 editable / read-only / out of scope. |
| **Scope** | Phase 1 included content models and registries | Same; explicitly **out of scope**: user settings, build/publish, direct TS edits, CONFIG.dev/features in Phase 1. |
| **Phases** | 0 (manifest + config), 1 (server), 2 (UI), 3 (polish) | Same structure; each phase now has: scope, files touched, what editors can change, what stays code-only, validation/rollback. |
| **Documentation** | Not addressed | §5: CONTRIBUTING keep; docs naming (keep as-is or normalize with strict rules); work-plugin keep; new docs use “custom”; orphaned/superseded docs noted. |
| **Risks** | Top 3 in implementation plan | Same three; table format with mitigations. |
| **Go/No-Go** | Single paragraph | §6: explicit criteria list. |
| **Terminology** | — | “Custom” preferred in new docs; no employer-specific or sensitive terms. |
| **Supersedes** | Implementation plan only | This doc supersedes the implementation plan; audit and architecture remain as reference. |

---

## 8. Recommendation

- **Ready to proceed to implementation?** **Yes**, provided Phase 0 is approved and the Go criteria in §6 are accepted.
- **Which phase should be built first?** **Phase 0.** Implement the assistants manifest, generate-assistants-from-manifest script, and config-driven modal (simpleModeIds, contentMvpAssistantId). Validate that the plugin builds and behaves identically. Then implement Phase 1 (server and model), then Phase 2 (UI), then Phase 3 (polish and docs).
- **Do not** start Phase 1 (editor server) until Phase 0 is done and verified; otherwise the editor has no writable assistant source and would require direct TS edits.

---

*End of revised plan. Audit + planning only; no implementation or refactor in this task.*
