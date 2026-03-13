# Admin Config Editor Architecture

> Status: Reference.
> This document describes the local/file-backed ACE architecture and its original design assumptions.
> For the current ACE migration authority use `docs/architecture/ace-static-s3-migration.md`, then current code, then `docs/setup/ace-public-replica.md`.

This document defines the single editable model, sources of truth, write targets, minimal refactors, validation strategy, deterministic write rules, and a minimal security/auth recommendation for the local Admin Config Editor.

---

## 1. Primary objective

- Present a **single editable model** to humans in the browser.
- Write updates back to the **correct underlying sources** (custom/config.json, assistant definitions, custom/knowledge/*.md, content-models, registries).
- **Avoid fragile edits**: deterministic writes, validation, backups, diff/preview, validate-only mode.

---

## 2. Single editable model (data shape)

The Admin Config Editor exposes one normalized JSON-like structure that the server builds from disk and can write back. No hand-editing of TypeScript.

### 2.1 Root shape

```ts
interface AdminEditableModel {
  config: PluginConfig           // custom/config.json + optional dev/features overlay
  assistants: AssistantDef[]    // canonical assistant list + modal visibility/order
  customKnowledge: Record<string, string>  // assistantId -> markdown body (custom/knowledge/*.md)
  contentModels?: ContentModelDef[]        // optional: presets from content-models.md (for editor)
  designSystemRegistries?: Record<string, unknown>  // optional: custom/design-systems/<id>/registry.json
}
```

### 2.2 PluginConfig (extends current config.json)

- **ui**: defaultMode, hideContentMvpMode, **simpleModeIds** (string[]), **contentMvpAssistantId** (string) — move modal visibility/order from index.ts into config.
- **llm**: endpoint, hideModelSettings, uiMode
- **knowledgeBases**: Record<assistantId, { policy, file }>
- **networkAccess**: baseAllowedDomains, extraAllowedDomains
- **resources**: links, credits
- **designSystems**: enabled, activeRegistries, denylist, strictMode
- **analytics**: (optional) enabled, endpointUrl, flushIntervalMs, maxBatchSize, maxBuffer, retryMaxAttempts, retryBaseDelayMs, debug
- **dev** (optional, editor-only or separate file): feature flags and debug scopes to mirror CONFIG.dev; only include if we add a writable source for them (e.g. config.dev.json or a section in config.json that the build reads).

### 2.3 AssistantDef (canonical assistant entry)

- **id** (string, stable)
- **label** (string)
- **intro** (string)
- **welcomeMessage?** (string)
- **hoverSummary?** (string)
- **tag?** (AssistantTag: isVisible, label, variant)
- **iconId** (string)
- **kind** ('ai' | 'tool' | 'hybrid')
- **quickActions** (QuickActionDef[])
- **promptTemplate** (string): the “public” prompt text (today inline in index.ts). In the model this is one string per assistant; on disk it can live in a manifest + optional src/assistants/<id>.md or stay in generated TS built from manifest.
- **knowledgeBasePolicy?** (optional): which custom KB policy (append/override) and file — can be derived from config.knowledgeBases[assistantId] or stored per-assistant in manifest.

QuickActionDef: id, label, templateMessage, requiresSelection?, requiresVision?, maxImages?, imageScale?

No “promptMarkdown” at edit time: the editor edits **promptTemplate** (and custom KB separately). Runtime/build composes promptMarkdown = mergeKnowledgeBase(id, promptTemplate) + appendDesignSystemKnowledge(...).

### 2.4 Custom knowledge

- **customKnowledge**: Record<assistantId, string> — raw markdown for custom/knowledge/<assistantId>.md. Keys match assistant ids that have custom overlay. Editor shows/edit these; server writes to custom/knowledge/<id>.md.

### 2.5 Content models (presets)

- **contentModels**: Optional array of { id, label, description, enabled, columns[] } parsed from docs/content-models.md. Editor can edit this; server writes back to docs/content-models.md in the same markdown format (or a canonical JSON that generate-presets can consume — see minimal refactor below).

### 2.6 Design system registries

- **designSystemRegistries**: Optional Record<registryId, registryJson>. Editor can view/edit; server writes to custom/design-systems/<id>/registry.json.

---

## 3. Sources of truth and write targets

| Editable slice | Source of truth (current) | Write target (proposed) |
|----------------|---------------------------|--------------------------|
| Plugin-wide config | custom/config.json | custom/config.json (direct). Extend with ui.simpleModeIds, ui.contentMvpAssistantId. |
| Assistant list + metadata + prompt | src/assistants/index.ts (TS + inline strings) | **New:** src/assistants/assistants.manifest.json (see refactor). Optionally keep .md in src/assistants/ for long-form prompt body and reference from manifest. |
| Custom KB overlay | custom/knowledge/*.md | custom/knowledge/<assistantId>.md (direct). |
| Knowledge policies | custom/config.json knowledgeBases | custom/config.json (unchanged). |
| Content Table presets | docs/content-models.md | docs/content-models.md (direct) or a JSON that generate-presets accepts (see refactor). |
| Design system registries | custom/design-systems/<id>/registry.json | custom/design-systems/<id>/registry.json (direct). |
| Generated TS | src/custom/generated/*.ts, presets.generated.ts | Never written by editor. Regenerate by running npm run generate-custom-overlay (and generate-presets) after save. |

---

## 4. Minimal refactors for feasibility

### 4.1 Introduce assistants.manifest.json (recommended)

**Why:** Assistant metadata and prompt text live in index.ts today. Editing TS from a tool is fragile (key order, formatting, comments). A single JSON manifest gives one place for the editor to read/write.

**What:**

- Add **src/assistants/assistants.manifest.json** (or **custom/assistants.manifest.json** to keep all “editable” sources under custom/). Structure: `{ "assistants": [ AssistantDef ] }` where each entry has id, label, intro, welcomeMessage?, hoverSummary?, tag?, iconId, kind, quickActions, **promptTemplate** (full public prompt string).
- **Build-time or runtime loader:**  
  - **Option A (build):** Add a script (or extend generate-custom-overlay) that reads the manifest and **generates** part of index.ts (ASSISTANTS array) so that promptMarkdown = mergeKnowledgeBase(id, promptTemplate) + appendDesignSystemKnowledge(...). Existing index.ts becomes a thin wrapper that imports generated ASSISTANTS and re-exports listAssistantsByMode etc., with listAssistantsByMode reading **config** (customConfig.ui.simpleModeIds, contentMvpAssistantId) instead of hardcoded simpleModeIds.  
  - **Option B (runtime):** index.ts at runtime reads assistants.manifest.json (if plugin environment can read it; Figma plugin may not have fs). So Option A (generate TS from manifest at build) is the safe choice.
- **Modal visibility/order:** Move from index.ts into config: add **ui.simpleModeIds** (string[]) and **ui.contentMvpAssistantId** (string) to custom/config.json. listAssistantsByMode uses these instead of hardcoded arrays.

**Result:** Editor reads/writes assistants.manifest.json + custom/config.json. Generator produces the same runtime behavior (ASSISTANTS array in TS or a generated module). No hand-editing of index.ts.

### 4.2 Optional: Public prompt in .md files

Today the “public” prompt is inline in index.ts. Optional future: store it in **src/assistants/<id>.md** (or custom/assistants/<id>.md) and have the generator or runtime load it. For minimal change, keep **promptTemplate** inside the manifest as one big string; the editor can show it in a text area. Splitting into .md per assistant is a later UX improvement and would require the generator to read .md and embed or the runtime to load .md (if available in the plugin sandbox).

### 4.3 Content-models: keep Markdown or add JSON source

- **Minimal:** Editor parses docs/content-models.md (existing format) and writes back the same format (deterministic). No change to generate-presets.ts.
- **Alternative:** Introduce content-models.json; editor writes that; generate-presets.ts is extended to accept either .md or .json. Reduces parsing/round-trip fragility.

### 4.4 CONFIG.dev / CONFIG.features (optional)

Keep CONFIG in src/core/config.ts as default. If we want these editable without code changes, add **custom/config.dev.json** (or a "dev" section in config.json) read only at build time by a generator that emits a small TS overlay (e.g. custom/generated/customDevConfig.ts) and have runtime CONFIG merge that. For “minimal-change” we can leave CONFIG as code and **not** expose dev/features in the editor initially; document them in the audit so the owner can change them in code.

---

## 5. Validation strategy

- **Schema:** Define the single editable model (and each slice) with **Zod** schemas. Descriptions on fields drive UI hints.
- **Validate-only endpoint:** POST /api/validate with current model payload; returns { errors: [], warnings: [] }. No disk write.
- **Server-side on load:** When building the model from disk (GET /api/model), validate config.json, manifest, and custom KB files; include validation errors in the response so the UI can show them before any save.
- **Server-side on save:** Before writing, run the same validators; if invalid, return 400 with errors and do not write. After write, run generator (generate-custom-overlay, optionally generate-presets) and return success + summary.
- **Edge cases:** (1) Duplicate assistant id → error. (2) Missing required fields (id, label, kind, quickActions) → error. (3) References to assistantId in config (simpleModeIds, contentMvpAssistantId) that don’t exist in manifest → warning. (4) Orphan custom/knowledge/<id>.md with no assistant id → warning. (5) Invalid enum (kind, variant, policy) → error.

---

## 6. Deterministic write rules

- **JSON files (config.json, assistants.manifest.json, registry.json):**
  - Serialize with a fixed key order (e.g. alphabetical or a defined key order per schema).
  - Use a single formatter (e.g. JSON.stringify with 2-space indent, no trailing newline or one newline at end).
  - No comments (JSON does not support them); if we need comments, use JSONC only where the server parses it and writes back standard JSON.
- **Markdown (custom/knowledge/*.md, content-models.md):**
  - custom/knowledge: write body as-is (UTF-8); preserve line endings (e.g. LF) and avoid inserting BOM.
  - content-models.md: if editor writes back, use a deterministic format (e.g. same section order, same heading levels, same list format) so round-trip doesn’t churn.
- **Backups:** Before any write, copy the target file to a backup path (e.g. custom/.backups/config.json.2025-01-21T12-00-00Z). Keep last N backups per file (e.g. 5). Document backup location in save summary.

---

## 7. Security / auth recommendation (minimal)

- **Default:** No auth. The editor runs locally; only people with repo access can run the server. Document that the tool is for “contributors with local access.”
- **Optional light auth:** If desired, store **custom/admin-accounts.json** (or a single file under custom/) with a list of { user, passwordHash } (e.g. bcrypt). Server checks Basic auth or a simple login form; session cookie or token for subsequent requests. “Who saved last” can be stored in a small **custom/admin-audit.log** (timestamp, user, files touched). No need for owner vs editor roles unless we want to restrict “who can run generator” vs “who can edit”; for a single-owner case, one role is enough.
- **Recommendation:** Ship without auth first; add optional admin-accounts.json + login + audit log only if multiple people use the machine and you want accountability.

---

## 8. Admin Config Editor design requirements (recap)

1. **Local server:** Small Node server (e.g. Express) that reads/writes files. Endpoints: GET /api/model, POST /api/validate, POST /api/save, optional GET /api/diff.
2. **Schema-driven forms:** TypeScript + Zod; render UI from schema.
3. **Safety UX:** Validate-only button; Save with confirmation; Change summary (files touched, timestamp, backup path); “Next steps” panel (run generator, build, test in Figma, publish).
4. **Auth:** Optional; minimal (local accounts file + login + “who saved last” in audit log).

This architecture keeps existing runtime behavior intact while giving the editor a single, writable model and clear write targets and refactors.
