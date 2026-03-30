# ACE Overhaul — Design Spec

> **For agentic workers:** This spec covers three sequential sub-projects. Each has its own implementation plan. Do not combine them. Build in order: SP2 → SP3 → SP4.

**Goal:** Transform ACE from an internal config tool into a professional-grade admin experience that UX/Product Designers trust and adopt, with a clean Skills/Instructions framework and an interactive prompt playground for Strike Team iteration.

**Architecture:** Three independent sub-projects building on each other. SP2 is UI/UX. SP3 adds the Skills data model and assembly engine. SP4 adds the test environment that exercises SP3.

**Tech Stack:** Vanilla JS (admin-editor/public/app.js + dist/app.js), AWS Lambda (infra/ace-lambda), S3 (modstar-figmai-config, prefix figmai/), existing instructionAssembly.ts for plugin-side assembly.

---

## Sub-project 2: ACE UX/UI Overhaul

### Information Architecture

**Navigation (left sidebar):**

| Old label | New label | Reason |
|---|---|---|
| General | General | Unchanged |
| AI | AI | Unchanged |
| Assistants | Assistants | Now includes all assistants (Evergreens folded in) |
| Resources | Resources | Houses Knowledge Bases + future Skills |
| Design Systems | Design Systems | Unchanged |
| Evergreens | *(removed)* | Content Table assistant folds into Assistants |
| Analytics | Usage Report | Disambiguates from the Analytics Tagging assistant |

The "Evergreens" tab is removed as a separate tab. The Content Table assistant (`content_table`) appears in the Assistants tab list like all other assistants, with a `Code` type badge.

### Assistants Tab — Master-Detail Layout

Replaces the current flat scrolling list of edit forms.

**Left column — assistant list:**
- Each row: icon + label + type badge (`Code` / `LLM` / `Hybrid`) + optional tag (`Beta`)
- Clicking a row loads the detail editor on the right
- List is sorted by label alphabetically; no grouping needed at this scale (11 assistants)

**Right column — assistant detail editor with four tabs:**

#### Overview tab
- Label (editable text field)
- ID (read-only, shown for reference)
- Icon picker (existing iconId options)
- Intro text (short description shown in plugin UI)
- Type badge selector: Code / LLM / Hybrid — admin-set, informs the plugin's execution routing
- Optional tag: visible, label, variant (Beta / New / etc.)
- "How it appears to users" preview card — renders the assistant card as it looks in the plugin

#### Instructions tab
Plugin-facing configuration. The plugin reads this deterministically before any LLM call.

Fields:
- **Execution model** — dropdown: `Code` / `LLM` / `Hybrid`
  - Helper: *"Code: plugin handles everything without calling the LLM. LLM: all logic goes to the LLM. Hybrid: plugin runs code first, then calls the LLM."*
- **Figma context — requires selection** — checkbox
- **Figma context — selection types** — multi-select: Frame, Component, Text, Group, any
- **Figma context — inject vision** — checkbox; includes screenshot of selected element as image input
  - Helper: *"Only enable if the assistant needs to visually analyse the design."*
- **Output schema** — dropdown of registered schemas, or "None"
  - Helper: *"If set, the LLM response will be validated against this JSON schema before the plugin processes it."*
- **Safety overrides** — collapsed section; allowImages toggle + safetyToggles map

#### Skills tab
LLM-facing content. Everything here ends up in the assembled prompt.

Two sections:

**Universal Skills** (from Resources):
- Required skills: listed with lock icon — always included, cannot be toggled off
- Optional skills: listed with toggle — can be activated per interaction or Quick Action
- "Attach skill" button — opens a picker showing all skills from `custom/skills/registry.json`

**Assistant Skills** (per-assistant):
- List of skill blocks, each showing: kind badge (`system` / `behavior` / `rules` / `examples` / `format` / `context`), enable/disable toggle, editable content inline
- "Add skill block" button with kind selector
- Helper per kind:
  - `system` — *"Sets the assistant's core identity and purpose. Usually one block."*
  - `behavior` — *"Describes how the assistant should act and what it should prioritise."*
  - `rules` — *"Hard constraints the assistant must follow."*
  - `examples` — *"Sample inputs and outputs to guide the LLM's response style."*
  - `format` — *"Specifies the output format (prose, JSON, markdown list, etc.)."*
  - `context` — *"Background information the assistant should know."*

**Assemble & Preview button** — renders the full assembled prompt in a read-only monospace panel. Shows segments in order with separator labels: `[Universal: use-brand-voice]`, `[Assistant: system]`, `[Assistant: rules]`, etc.

#### Knowledge tab
Two clearly labelled tracks:

**LLM-native KB (recommended for large documents):**
- **Default kbName** — text field
  - Helper: *"Passed as the kbName parameter on every LLM request for this assistant. The Internal LLM uses this to retrieve its own reference material server-side. Keeps the prompt lean."*

**Injected KB refs (for experimentation):**
- List of attached KBs (existing `knowledgeBaseRefs` system)
- Each shows: KB title + one-line purpose description
- "Add KB" button with searchable picker
- Helper: *"KB content is injected directly into the prompt. Use for smaller reference material or when the Internal LLM kbName option is not available."*

#### Quick Actions tab
- List of Quick Actions: label, executionType badge, requiresSelection indicator
- Expanding a Quick Action reveals:
  - Label, templateMessage, executionType (LLM / tool-only / hybrid)
  - requiresSelection, requiresVision, maxImages, imageScale
  - **kbName override** — optional text field: *"Leave blank to use the assistant's default kbName."*
  - **"Test this action"** button — opens Prompt Playground pre-loaded with this action

### Visual Polish Principles

Applied consistently across all tabs and panels:

- **Helper text on every field** — one line explaining what the field does and how it affects plugin or LLM behaviour. Never hidden behind a tooltip alone.
- **Section hierarchy** — clear `<h3>` headings within panels; accordions only for genuinely optional/advanced content
- **Inline validation** — errors appear next to the field that caused them, not only in the top banner
- **Empty states are instructive** — e.g., *"No assistant skills yet — add a skill block to define how this assistant thinks"*
- **Type badges** use consistent colour coding throughout: Code = blue, LLM = purple, Hybrid = teal, Beta = amber
- **Assembled prompt preview** uses monospace font in a visually distinct panel — makes it obvious this is "what the LLM receives", not an editable form

---

## Sub-project 3: Skills/Instructions Framework

### Conceptual Definitions

> **Instructions** = what the *plugin* needs to know to manage an assistant interaction. Deterministic. Read before any LLM call. Stored as `instructions.json` per assistant.

> **Skills** = what the *LLM* needs to know to do its job. Prompt segments assembled at query time. Both per-assistant skills (in the manifest) and universal skills (in `custom/skills/`) are "Skills."

> **Knowledge** = supporting reference material. Either injected into the prompt (knowledgeBaseRefs) or retrieved server-side by the Internal LLM (kbName parameter).

### Data Model

#### Per-assistant Instructions — `custom/assistants/{id}/instructions.json`

```json
{
  "execution": "hybrid",
  "figmaContext": {
    "requiresSelection": true,
    "selectionTypes": ["FRAME", "COMPONENT"],
    "injectVision": false
  },
  "outputSchemaId": "design-critique-v1",
  "defaultKbName": "design-critique",
  "universalSkills": {
    "required": ["use-brand-voice"],
    "optional": ["apply-accessibility-lens"]
  },
  "safetyOverrides": {}
}
```

Valid `execution` values: `"code"` | `"llm"` | `"hybrid"`

If `instructions.json` is absent for an assistant, the plugin falls back to the existing behaviour (reads `promptTemplate` and `instructionBlocks` from the manifest). Full backward compatibility.

#### Universal Skills — `custom/skills/`

```
custom/skills/
  registry.json          ← index of all universal skills
  use-brand-voice.md
  apply-accessibility-lens.md
  respond-in-json.md
```

**registry.json:**
```json
{
  "skills": [
    { "id": "use-brand-voice", "title": "Use Brand Voice", "kind": "behavior", "filePath": "use-brand-voice.md" },
    { "id": "apply-accessibility-lens", "title": "Apply Accessibility Lens", "kind": "rules", "filePath": "apply-accessibility-lens.md" }
  ]
}
```

**Skill file format (e.g., `use-brand-voice.md`):**
```markdown
---
id: use-brand-voice
title: Use Brand Voice
kind: behavior
version: 1.0
---

Apply the organisation's brand voice guidelines to all written output.
Use clear, direct language. Avoid jargon. Write for designers, not engineers.
```

Valid `kind` values: `system` | `behavior` | `rules` | `examples` | `format` | `context`

#### Per-assistant Skills
Remain inside `custom/assistants/{id}/manifest.json` as the `skills` array (renamed from `instructionBlocks`). Same structure, same kind values. The rename is semantic only — no data migration required if the assembly engine accepts both field names.

### Assembly Engine

The plugin assembles the LLM package in this deterministic order:

```
1. Load instructions.json for the assistant
   └── execution = "code"?  → run code path, skip LLM

2. Assemble skill segments:
   a. Required universal skills  (from custom/skills/, always included)
   b. Per-assistant skills        (enabled blocks only, in manifest order)
   c. Optional universal skills   (if activated for this interaction)
   d. Injected KB content         (if knowledgeBaseRefs set; truncated at 12K chars)

3. Build LLM request:
   system:  joined skill segments with newline separators
   kbName:  defaultKbName (or per-query override from Quick Action)
   user:    Quick Action templateMessage | user-typed message | both
   images:  Figma selection screenshot (if injectVision: true)

4. Send to Internal LLM

5. Validate response:
   - If outputSchemaId set: parse JSON, validate against schema
   - Pass structured output to plugin code path
   - Pass plain text to render path
```

**Rules:**
- Required universal skills cannot be disabled per query
- Optional universal skills can be activated by a Quick Action, a plugin code path, or a future user toggle in the plugin UI
- `kbName` is a top-level LLM request parameter — not injected into prompt text
- Disabled per-assistant skill blocks are skipped at assembly time
- `promptTemplate` fallback: if no skills array exists, use `promptTemplate` field (backward compat)

### ACE Editor — Resources Tab

**Universal Skills panel:**
- List: skill title + kind badge + count of assistants using it
- Click → edit markdown content inline (same editor as custom knowledge)
- "New skill" button → kind selector, ID field, title field, content editor
- Delete: blocked if any assistant has the skill in `required`; warns if in `optional` use

**Skills S3 paths (ace-lambda):**
- Registry: `draft/skills/registry.json`
- Skill files: `draft/skills/{id}.md`

**ace-lambda new routes:**
- `GET /api/skills` — returns registry
- `POST /api/skills` — create skill
- `GET /api/skills/:id` — get skill content
- `PATCH /api/skills/:id` — update skill
- `DELETE /api/skills/:id` — delete skill (blocked if in required use)

**Per-assistant instructions.json routes (ace-lambda):**
- Served as part of `GET /api/model` — `instructions` field keyed by assistant ID
- Saved via `POST /api/save` — `model.instructions` map included in save payload

---

## Sub-project 4: Strike Team Test Environment (Prompt Playground)

### Entry Points

1. **Assistant detail header** — "Test" button: opens playground pre-loaded with the selected assistant's current assembled prompt
2. **Quick Actions tab** — "Test this action" button on each action: pre-fills the action's templateMessage and kbName override

### Playground Layout

Three-column panel, accessible within the ACE assistant editor:

#### BUILD column (left)
- Assembled prompt preview — read-only monospace, shows skill segments in order with separator labels
- Skill toggles — each segment has an on/off toggle for this test session only (does not save)
- "Edit copy" mode — detaches the prompt from source files for free-form editing; changes are test-only

#### SEND column (centre)
- **kbName override** — text field (blank = use assistant default)
- **User message** — free text input
- **Quick Action message** — dropdown of the assistant's Quick Actions, pre-fills templateMessage
- **Figma mock input** — JSON textarea for pasting a mock Figma node structure
- **Vision** — toggle to include/exclude image input
- **FIRE** button — sends the assembled request to `/api/test/assistant`

#### RESULT column (right)
- Raw LLM response (scrollable)
- Validation section:
  - **Structural** (if outputSchemaId set): JSON parse status + schema validation with field-level diff
  - **Rubric**: editable checklist of pass/fail criteria, defined per assistant in ACE, manually checked
  - **Comparison** (if golden exists): structure diff against saved golden response
- Metadata: latency, token count
- **"Save as golden"** button — stores this response as the reference snapshot for this assistant/action

### Rubric System

- Rubric checklists are defined per assistant in ACE (inline in the Prompt Playground, or via a dedicated section in the assistant detail)
- Stored at `admin/rubrics/{assistantId}.json` in S3
- Each item: `{ "id": "...", "label": "Contains at least one actionable recommendation", "autoCheck": false }`
- `autoCheck: false` = manual pass/fail after reading response (initial implementation)
- Future: `autoCheck: true` with a regex or keyword check

### Session History

- Each FIRE appends an entry to an in-session log below the result panel
- Entry shows: timestamp, skills active, kbName used, response length, validation summary
- Log is session-only — not persisted to S3
- Allows the Strike Team to scroll back through a session's attempts without losing work

### Backend Changes

**Extend `/api/test/assistant`:**
- Accept: `skillSegments[]` (array of text segments), `kbName`, `mockFigmaJson`, `visionEnabled`
- Returns: response text, latency, token count, validation result

**New routes:**
- `GET /api/test/rubrics/:assistantId` — returns rubric checklist
- `PUT /api/test/rubrics/:assistantId` — saves rubric checklist
- `GET /api/test/golden/:assistantId/:actionId` — returns golden response
- `PUT /api/test/golden/:assistantId/:actionId` — saves golden response
- Storage: `admin/rubrics/{assistantId}.json`, `admin/golden/{assistantId}/{actionId}.json`

---

## Implementation Order

Build in strict sequence — each sub-project depends on the previous:

1. **SP2 — ACE UX/UI Overhaul** — nav restructure, master-detail assistant editor, visual polish, helper text. No data model changes, no new backend routes. Frontend only.

2. **SP3 — Skills/Instructions Framework** — `instructions.json` per assistant, `custom/skills/` directory, assembly engine update, new ace-lambda skills routes, Resources tab Skills panel, Instructions + Skills tabs in assistant editor.

3. **SP4 — Prompt Playground** — Playground UI, extended `/api/test/assistant`, rubric and golden routes. Depends on SP3 skill segments being available.

---

## What This Spec Intentionally Defers

- **Usage Report tab:** Content exists (demo data). Rename only in SP2. Live usage tracking is a future project.
- **`autoCheck` rubric items:** Rubric system ships as manual-only. Automated checks added later.
- **Golden response diff algorithm:** Ships as structure diff. Semantic similarity scoring deferred.
- **Universal skills for existing assistants:** Existing assistants continue using their current `instructionBlocks` / `promptTemplate`. Migration to reference universal skills is done assistant-by-assistant, not as part of SP3.
