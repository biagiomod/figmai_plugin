# Admin Config Editor – Audit

This document lists every relevant config source, assistant source, and derived artifact in the FigmAI plugin codebase, with file paths and read/write flow. It supports the design of a local “Admin Config Editor” that lets non-technical editors safely edit plugin settings and assistant configurations.

---

## 1. Plugin-wide configuration

### 1.1 custom/config.json

| Attribute | Value |
|-----------|--------|
| **Path** | `figmai_plugin/custom/config.json` |
| **Format** | JSON |
| **Read by** | `scripts/generate-custom-overlay.ts` (at build/generate time) |
| **Write** | Manual or (future) Admin Config Editor only. Not written by plugin at runtime. |

**Contents (current shape):**

- **ui**: `defaultMode` ('simple' \| 'advanced' \| 'content-mvp'), `hideContentMvpMode` (boolean)
- **llm**: `endpoint`, `hideModelSettings`, `uiMode` ('full' \| 'connection-only')
- **knowledgeBases**: `Record<assistantId, { policy: 'append' \| 'override', file: string }>` — which custom KB files to merge per assistant
- **networkAccess**: `baseAllowedDomains`, `extraAllowedDomains`
- **resources**: `links` (about, feedback, meetup), `credits` (createdBy, apiTeam, llmInstruct)
- **designSystems**: `enabled`, `activeRegistries`, `denylist`, `strictMode`
- **analytics**: (optional) `enabled`, `endpointUrl`, `flushIntervalMs`, `maxBatchSize`, `maxBuffer`, `retryMaxAttempts`, `retryBaseDelayMs`, `debug` — generator interface supports it; add to config.json if analytics is to be editor-configurable

**Flow:** Generator reads `custom/config.json` → emits `src/custom/generated/customConfig.ts` (embedded `customConfig` object). Runtime never reads the JSON file; it imports `customConfig` from the generated TS.

### 1.2 src/custom/generated/customConfig.ts

| Attribute | Value |
|-----------|--------|
| **Path** | `figmai_plugin/src/custom/generated/customConfig.ts` |
| **Produced by** | `scripts/generate-custom-overlay.ts` from `custom/config.json` |
| **Read by** | `src/custom/config.ts`, `src/custom/knowledge.ts`, `src/core/analytics/index.ts`, and any code that imports `customConfig` |
| **Write** | Only by generator. Do not edit manually. |

### 1.3 src/custom/config.ts

| Attribute | Value |
|-----------|--------|
| **Path** | `figmai_plugin/src/custom/config.ts` |
| **Role** | Helper API over `customConfig`: `getCustomConfig()`, `shouldHideContentMvpMode()`, `getCustomLlmEndpoint()`, `shouldHideLlmModelSettings()`, `getLlmUiMode()`, `getResourcesLinks()`, `getResourcesCredits()`, `getDesignSystemConfig()` |
| **Read** | Imports `customConfig` from `./generated/customConfig` |
| **Write** | N/A (code only) |

### 1.4 src/core/config.ts (CONFIG)

| Attribute | Value |
|-----------|--------|
| **Path** | `figmai_plugin/src/core/config.ts` |
| **Role** | Hardcoded defaults: `provider`, `features` (enableToolCalls, enableVision, enableSelectionExportPng), `defaultMode`, `dev.*` (logging, debug scopes, etc.) |
| **Read by** | main.ts, ui.tsx, providerFactory, settings, logger, contentTable validate, selectionSummary, renderScorecard, etc. |
| **Write** | Source code only. No JSON or file-based override today. |

**Scattered usage:** CONFIG is the single TS constant; usage is spread across the repo (see grep CONFIG). Feature flags and dev flags live only here.

### 1.5 src/core/settings.ts (user settings in clientStorage)

| Attribute | Value |
|-----------|--------|
| **Path** | `figmai_plugin/src/core/settings.ts` |
| **Role** | User-facing settings stored in `figma.clientStorage` (key `figmai_settings`): connectionType, proxyBaseUrl, internalApiUrl, authMode, defaultModel, requestTimeoutMs |
| **Read/Write** | Runtime only (getSettings, saveSettings). Plugin UI and provider code read these. |
| **Admin Editor** | Should **not** edit these (per-user, runtime-only). Out of scope for Admin Config Editor. |

---

## 2. Assistant definitions and “Select Assistant” modal

### 2.1 src/assistants/index.ts

| Attribute | Value |
|-----------|--------|
| **Path** | `figmai_plugin/src/assistants/index.ts` |
| **Role** | Single source of truth for assistant list and metadata. Exports `ASSISTANTS`, `getAssistant`, `listAssistants`, `listAssistantsByMode`, `getDefaultAssistant`, `getWelcomeMessage`, `getHoverSummary`, `getShortInstructions`. |
| **Read by** | `src/ui.tsx` (Select Assistant modal: `listAssistantsByMode(mode)`), `src/main.ts` (getAssistant, getWelcomeMessage, getShortInstructions), handler resolution |
| **Write** | Source code only. All metadata and inline prompt text live here. |

**Contents per assistant:**

- **id** (string, stable)
- **label** (display name)
- **intro** (welcome blurb)
- **welcomeMessage?** (chat greeting; falls back to intro)
- **hoverSummary?** (Select Assistant modal hover; falls back to intro)
- **tag?** (badge: isVisible, label, variant 'new'|'beta'|'alpha')
- **promptMarkdown** (string): built in code as `appendDesignSystemKnowledge(mergeKnowledgeBase(assistantId, basePrompt))` where `basePrompt` is an **inline string** in index.ts (e.g. `generalPrompt`, `designCritiquePrompt`). Not loaded from `.md` at runtime.
- **iconId** (e.g. 'AskIcon', 'ContentTableIcon')
- **kind** ('ai' | 'tool' | 'hybrid')
- **quickActions**: array of `{ id, label, templateMessage, requiresSelection?, requiresVision?, maxImages?, imageScale? }`

**Select Assistant modal behavior:**

- **content-mvp**: only assistant with `id === 'content_table'` (hardcoded in `listAssistantsByMode('content-mvp')`).
- **simple**: only assistants whose `id` is in `simpleModeIds = ['general', 'content_table', 'design_critique', 'design_workshop']`, in that order (hardcoded in `listAssistantsByMode('simple')`).
- **advanced**: all `ASSISTANTS` (no filter).

So: “which assistants appear” and “ordering” are currently hardcoded in `index.ts`, not in config.

### 2.2 src/assistants/*.md (public knowledge / documentation)

| Attribute | Value |
|-----------|--------|
| **Paths** | `figmai_plugin/src/assistants/general.md`, `contentTable.md`, `designCritique.md`, `uxCopyReview.md`, `devHandoff.md`, `accessibility.md`, `errors.md`, `design_workshop`-related, etc. |
| **Role** | Documentation / reference. Comments in index.ts say “Full knowledge base available in: src/assistants/&lt;name&gt;.md”. The **runtime does not read these files**; prompt text is inline in index.ts. |
| **Build/runtime** | Not loaded by plugin. Optional future: load these as “public” KB and merge with custom overlay. |

### 2.3 custom/knowledge/*.md (custom knowledge overlay)

| Attribute | Value |
|-----------|--------|
| **Path** | `figmai_plugin/custom/knowledge/*.md` (e.g. `general.md`, `design_critique.md`) |
| **Read by** | `scripts/generate-custom-overlay.ts` → produces `src/custom/generated/customKnowledge.ts` |
| **Merge** | At runtime, `mergeKnowledgeBase(assistantId, publicContent)` in `src/custom/knowledge.ts` uses `customConfig.knowledgeBases[assistantId]` (policy + file) and `customKnowledgeByAssistant[assistantId]`. Public content is the inline string from index.ts. |
| **Write** | Manual or (future) Admin Config Editor. Generator does not write back to .md. |

So: custom KB content is editable via files; “public” prompt text is currently only in TS.

### 2.4 src/custom/generated/customKnowledge.ts

| Attribute | Value |
|-----------|--------|
| **Path** | `figmai_plugin/src/custom/generated/customKnowledge.ts` |
| **Produced by** | `scripts/generate-custom-overlay.ts` from `custom/knowledge/*.md` |
| **Read by** | `src/custom/knowledge.ts` (`mergeKnowledgeBase`) |
| **Write** | Generator only. |

### 2.5 src/core/types.ts (Assistant, QuickAction, AssistantTag)

| Attribute | Value |
|-----------|--------|
| **Path** | `figmai_plugin/src/core/types.ts` |
| **Role** | Canonical TypeScript types for `Assistant`, `QuickAction`, `AssistantTag`. Used by index.ts and UI. |
| **Admin Editor** | Schema source for validation; editor does not edit this file. |

---

## 3. Generator pipeline (scripts)

### 3.1 scripts/generate-custom-overlay.ts

| Inputs | Outputs |
|--------|---------|
| `custom/config.json` | `src/custom/generated/customConfig.ts` |
| `custom/knowledge/*.md` | `src/custom/generated/customKnowledge.ts` |
| `custom/design-systems/<id>/registry.json` | `src/custom/generated/customRegistries.ts` |

**When:** `npm run generate-custom-overlay` or `npm run prebuild` (prebuild also runs generate-presets and generate-dark-demo-cards).

### 3.2 scripts/generate-presets.ts

| Inputs | Outputs |
|--------|---------|
| `docs/content-models.md` | `src/core/contentTable/presets.generated.ts` |

**When:** `npm run generate-presets` or `npm run prebuild`. Defines Content Table (and analytics-tagging) presets: PRESET_INFO, PRESET_COLUMNS, path resolvers.

### 3.3 Other scripts (not config/assistant sources)

- `scripts/generate-dark-demo-cards.ts` — demo assets
- `scripts/update-manifest-network-access.ts` — manifest network access from config
- `scripts/check-sync-api.js` — sync API check

---

## 4. Content Table / export presets

### 4.1 docs/content-models.md

| Attribute | Value |
|-----------|--------|
| **Path** | `figmai_plugin/docs/content-models.md` |
| **Format** | Markdown with model blocks (## ModelName, **id:**, **label:**, **description:**, **enabled:**, **columns:** with key/label/path) |
| **Read by** | `scripts/generate-presets.ts` |
| **Write** | Manual or (future) Admin Config Editor. Generator does not write back. |

### 4.2 src/core/contentTable/presets.generated.ts

| Attribute | Value |
|-----------|--------|
| **Path** | `figmai_plugin/src/core/contentTable/presets.generated.ts` |
| **Produced by** | `scripts/generate-presets.ts` from `docs/content-models.md` |
| **Read by** | Content Table and Analytics Tagging export (presets, columns). |
| **Write** | Generator only. |

---

## 5. Design system registries

### 5.1 custom/design-systems/&lt;id&gt;/registry.json

| Attribute | Value |
|-----------|--------|
| **Path** | e.g. `figmai_plugin/custom/design-systems/example/registry.json` |
| **Read by** | `scripts/generate-custom-overlay.ts` → `src/custom/generated/customRegistries.ts` |
| **Runtime** | Registry loader reads from generated TS / design system subsystem. |
| **Write** | Manual or (future) Admin Config Editor. |

### 5.2 src/custom/generated/customRegistries.ts

| Attribute | Value |
|-----------|--------|
| **Path** | `figmai_plugin/src/custom/generated/customRegistries.ts` |
| **Produced by** | `scripts/generate-custom-overlay.ts` |
| **Write** | Generator only. |

---

## 6. Selection policy (code-only)

### 6.1 src/core/context/selectionPolicy.ts

| Attribute | Value |
|-----------|--------|
| **Path** | `figmai_plugin/src/core/context/selectionPolicy.ts` |
| **Role** | Enum `SelectionPolicy.NORMAL`, `ANALYTICS_TAGGING_PAIR`. Used in main.ts for analytics_tagging actions. |
| **Config** | Not driven by config files. Could be made configurable per assistant/action later (out of scope for minimal editor). |

---

## 7. Summary: what the Admin Config Editor must read/write

| Target | Read | Write | Notes |
|--------|------|--------|------|
| **custom/config.json** | Yes (or via GET /api/model) | Yes | Primary plugin-wide config. |
| **src/custom/generated/*.ts** | No (server runs generator after save) | No | Regenerated by running generator after editing sources. |
| **src/assistants/index.ts** | Yes (to build editable model) | **Avoid** direct TS edits; introduce a manifest (see Architecture) and optionally generate index from it. | All assistant metadata and inline prompts live here today. |
| **src/assistants/*.md** | Optional (for display/reference) | No for first version | Not loaded at runtime; could become “public” KB source later. |
| **custom/knowledge/*.md** | Yes | Yes | Custom KB overlay; one file per assistant id. |
| **docs/content-models.md** | Yes | Yes | Source for presets; editor can write back (or a JSON/MD representation). |
| **custom/design-systems/&lt;id&gt;/registry.json** | Yes | Yes | Design system registry definitions. |
| **src/core/config.ts** | Yes (for model) | No (or extend config.json with dev/features and read that) | Feature flags and dev flags; could add optional config.json section later. |

---

## 8. Other important settings (scattered, for editor scope)

- **Feature flags** (`CONFIG.features`): enableToolCalls, enableVision, enableSelectionExportPng — in `src/core/config.ts` only.
- **Dev / logging** (`CONFIG.dev`): enableContentTableValidationLogging, enableClipboardDebugLogging, enableSyncApiErrorDetection, enableDesignCritiqueDebugLogging, `debug.enabled`, `debug.scopes`, `debug.levels` — in `src/core/config.ts` only.
- **Default mode** (`CONFIG.defaultMode`): overridden by `customConfig.ui.defaultMode` when set; UI also uses localStorage `figmai-mode`.
- **Modal visibility/order**: “simple” list and “content-mvp” assistant id are hardcoded in `src/assistants/index.ts` (`simpleModeIds`, and filter for content_table). Not in config.json.
- **Analytics** (optional): `customConfig.analytics` is supported by generator and `src/core/analytics/index.ts`; add to config.json if editors should toggle/configure analytics.
- **Request timeouts / model defaults**: in `src/core/settings.ts` (clientStorage) — per user; do not edit from Admin Editor.
- **Quick action options**: `requiresVision`, `maxImages`, `imageScale` are per quick action in index.ts; no separate config file.

All of the above that are “code only” today can be represented in the single editable model and, where we add a writable source (e.g. config.json or assistants manifest), the editor can write them there; refactors required are described in ADMIN_CONFIG_EDITOR_ARCHITECTURE.md.
