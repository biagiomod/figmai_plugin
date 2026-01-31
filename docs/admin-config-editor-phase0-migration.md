# Admin Config Editor – Phase 0 migration note

## How the manifest was derived from the prior TS source

- **Source:** `src/assistants/index.ts` (before Phase 0), which defined an inline `ASSISTANTS` array and two prompt constants (`generalPrompt`, `designCritiquePrompt`).
- **Process:** A one-time migration script (`scripts/migrate-assistants-to-manifest.mjs`) was run. It:
  - Copied the same prompt strings used in `index.ts` (the strings passed to `mergeKnowledgeBase(assistantId, basePrompt)`) into a single JSON-serializable structure.
  - For each assistant entry, extracted: `id`, `label`, `intro`, `hoverSummary`, `tag`, `iconId`, `kind`, `quickActions` (with `id`, `label`, `templateMessage`, and optional `requiresSelection`, `requiresVision`, `maxImages`, `imageScale`), and `promptTemplate` (the base prompt string).
  - Wrote `custom/assistants.manifest.json` with a deterministic key order.
- **Runtime behavior:** The generator `scripts/generate-assistants-from-manifest.ts` reads the manifest and emits `src/assistants/assistants.generated.ts`, which exports `ASSISTANTS_MANIFEST`. `src/assistants/index.ts` builds `ASSISTANTS` by mapping each manifest entry to an `Assistant`: `promptMarkdown = appendDesignSystemKnowledge(mergeKnowledgeBase(entry.id, entry.promptTemplate))`. So prompt composition is unchanged.
- **After editing the manifest:** Run `npm run generate-assistants` (or `npm run prebuild` / `npm run build`) so the generated TS is updated; the plugin does not read the JSON file at runtime.

## Modal visibility (simple / content-mvp)

- **Previously:** `listAssistantsByMode` used a hardcoded `simpleModeIds` array and a hardcoded content-mvp filter (`id === 'content_table'`).
- **Now:** `custom/config.json` includes `ui.simpleModeIds` and `ui.contentMvpAssistantId`. The overlay generator emits these (with defaults if missing). `listAssistantsByMode` and `getDefaultAssistant` read from `customConfig?.ui` and fall back to the same defaults as before.

## Known differences vs previous behavior

- **None.** Assistant list, prompts, quick actions, and simple/content-mvp filtering and ordering match the prior behavior; only the source of truth is now file-based (manifest + config) instead of inline TS.
