# Assistant Registry

**Authority:** This is the canonical reference for all live assistants in FigmAI.

**Source of truth for manifest data:** `custom/assistants.manifest.json` → compiled into `assistants.generated.ts` via `npm run generate-assistants`.

**Building or maintaining an assistant?** Start with **[`docs/assistant-sdk.md`](../../docs/assistant-sdk.md)** — the strike-team guide covering ownership model, file layout, and testing.

---

## Live Assistants

All assistants below are registered in `custom/assistants.manifest.json` and active in production.

| ID | Label | Kind | Handler | Base KB | Custom KB overlay |
|----|-------|------|---------|---------|-------------------|
| `general` | General | ai | _(none — LLM pass-through)_ | `src/assistants/general.md` | `custom/knowledge/general.md` |
| `content_table` | Evergreens | tool | `src/assistants/evergreens/handler.ts` ¹ | `src/assistants/contentTable.md` | `custom/knowledge/content_table.md` |
| `ux_copy_review` | Content Review | ai | `src/core/assistants/handlers/contentReview.ts` ² | `src/assistants/uxCopyReview.md` | `custom/knowledge/ux_copy_review.md` |
| `design_critique` | Design Critique | ai | `src/core/assistants/handlers/designCritique.ts` | `src/assistants/designCritique.md` | `custom/knowledge/design_critique.md` |
| `code2design` | Code2Design | hybrid | _(none — tool-mode LLM)_ | _(none)_ | `custom/knowledge/code2design.md` |
| `dev_handoff` | Dev Handoff | ai | _(none — LLM pass-through)_ | `src/assistants/devHandoff.md` | `custom/knowledge/dev_handoff.md` |
| `accessibility` | Accessibility | ai | _(none — LLM pass-through)_ | `src/assistants/accessibility.md` | `custom/knowledge/accessibility.md` |
| `errors` | Errors | ai | `src/core/assistants/handlers/errors.ts` | `src/assistants/errors.md` | `custom/knowledge/errors.md` |
| `design_workshop` | Design Workshop | ai | `src/core/assistants/handlers/designWorkshop.ts` | _(none)_ | `custom/knowledge/design_workshop.md` |
| `discovery_copilot` | Discovery Copilot | ai | `src/core/assistants/handlers/discovery.ts` | _(none)_ | `custom/knowledge/discovery_copilot.md` |
| `analytics_tagging` | Analytics Tagging | tool | `src/core/assistants/handlers/analyticsTagging.ts` | _(none)_ | _(none)_ |

**Notes:**

¹ `content_table` uses the **Evergreens module** (`src/assistants/evergreens/`), not the legacy `src/core/assistants/handlers/contentTable.ts`. Evergreens is a custom build of the content_table assistant with its own handler and knowledge file. See `src/assistants/evergreens/README.md`.

² `ux_copy_review` uses `contentReview.ts` only for the `add-hat` quick action (HAT = Heading Alternative Text accessibility annotation tool). The base chat experience is LLM pass-through; the handler provides the specialized HAT scan + annotation flow.

---

## Cross-Assistant Features

These are capabilities that cut across multiple assistants rather than belonging to one:

| Feature | Trigger | Handler | Notes |
|---------|---------|---------|-------|
| Smart Detector | `run-smart-detector` action (available from `general`) | `src/core/assistants/handlers/smartDetector.ts` | Scans selection and posts a structured element/content summary. Not a standalone assistant. |
| Demo Assets (DCA) | `deceptive-review` quick action (on `design_critique`) | `src/assistants/dca/` | Builds deterministic demo screens on canvas without LLM. See `src/assistants/dca/demoAssets/README.md`. |

---

## Assistants in assistant-design.md but not in the manifest

These appear in the design specification (`assistant-design.md`) but are **not currently live**:

- **Spell Check** — specified, not implemented
- **Code2Design** has a manifest entry but its quick actions operate in tool/hybrid mode without a dedicated post-LLM handler

If you are implementing one of these, add it to `custom/assistants.manifest.json` and run `npm run generate-assistants`.

---

## How the Knowledge Pipeline Works

For an assistant with ID `my_assistant`, the prompt is assembled at build time as:

1. **Base prompt template** — `promptTemplate` field in `custom/assistants.manifest.json`
2. **Merged with custom KB overlay** — `custom/knowledge/my_assistant.md` (policy: append or override, configured in `custom/config.json`)
3. **Appended with design system knowledge** — injected by `appendDesignSystemKnowledge()` in `src/assistants/index.ts`
4. **Structured KBs** (`custom/knowledge-bases/*.kb.json`) — referenced via `knowledgeBaseRefs` in the manifest; not yet injected at runtime (PR11a foundation laid, wiring pending)

For the `content_table` assistant specifically, the Evergreens module overrides the handler entirely — see `src/assistants/evergreens/`.

---

## Key Files

```
custom/assistants.manifest.json      ← edit this to change assistants (source of truth)
src/assistants/assistants.generated.ts   ← DO NOT EDIT (generated from manifest)
src/assistants/index.ts              ← wires prompt assembly and exports ASSISTANTS
src/core/assistants/handlers/       ← all handler implementations
src/assistants/evergreens/          ← content_table custom module (Evergreens team)
src/assistants/dca/                 ← demo assets used by deceptive-review
custom/knowledge/                   ← per-assistant markdown overlays
custom/knowledge-bases/             ← structured JSON KBs (PR11a)
```

---

## Adding a New Assistant

1. Add an entry to `custom/assistants.manifest.json`
2. Run `npm run generate-assistants` to rebuild `assistants.generated.ts`
3. Add a base KB markdown file in `src/assistants/{id}.md` (or use `promptTemplate` directly in the manifest)
4. If the assistant needs post-LLM or pre-LLM logic: create a handler in `src/core/assistants/handlers/` and register it in `handlers/index.ts`
5. Optionally add a custom KB overlay in `custom/knowledge/{id}.md` and configure merge policy in `custom/config.json`

See `docs/01-getting-started.md` for the full adding-an-assistant walkthrough.
