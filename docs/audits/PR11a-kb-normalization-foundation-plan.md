# PR11a — KB Normalization Foundation (schema + import tools)

**Mode:** Audit + Design Plan  
**Constraint:** No plugin runtime behavior change. No changes to prompt assembly, providers, main routing, or handlers.

---

## 1) Canonical KB schema

### 1.1 Section structure

| Section key           | Type           | Required | Default   | Description |
|-----------------------|----------------|----------|-----------|-------------|
| `purpose`             | string         | yes      | `""`      | One-line goal of the KB. |
| `scope`               | string         | yes      | `""`      | What this KB applies to (assistant, use case). |
| `definitions`         | string[]       | yes      | `[]`      | Key terms (e.g. "Term: definition"). |
| `rulesConstraints`    | string[]       | yes      | `[]`      | Must/must-not rules (bulleted or numbered lines). |
| `doDont`              | { do: string[]; dont: string[] } | yes | `{ do: [], dont: [] }` | Short do/don't lists. |
| `examples`            | string[]       | yes      | `[]`      | Code or text examples (inline preserved). |
| `edgeCases`           | string[]       | yes      | `[]`      | Exceptions, limits, caveats. |

### 1.2 Metadata fields

| Field       | Type     | Required | Default / notes |
|------------|----------|----------|------------------|
| `id`       | string   | yes      | —                | Stable id (filename without .kb.json). |
| `title`    | string   | yes      | `""`             | Human-readable title. |
| `source`   | string   | no       | `""`             | Origin (e.g. "Internal doc", "Notion"). |
| `updatedAt`| string   | no       | ISO 8601 when written | Last update time. |
| `version`  | string   | no       | —                | Optional semver or label. |
| `tags`     | string[] | no       | `[]`             | Optional tags for filtering. |

### 1.3 Validation rules

- All section keys must exist (empty arrays/strings allowed).
- `id`: non-empty, safe for filenames (e.g. `[a-z0-9_-]+`).
- `doDont`: must have both `do` and `dont` arrays.
- No extra required keys beyond the list above; unknown keys allowed via `.passthrough()` for forward compatibility.

### 1.4 Zod schema (for ACE / scripts)

Location: **`admin-editor/src/kbSchema.ts`** (new) — shared by ACE validation and by `scripts/convert-kb.ts` so both use the same canonical schema.

```ts
// admin-editor/src/kbSchema.ts
import { z } from 'zod'

export const doDontSchema = z.object({
  do: z.array(z.string()).default([]),
  dont: z.array(z.string()).default([])
}).default({ do: [], dont: [] })

export const knowledgeBaseDocumentSchema = z.object({
  id: z.string().min(1).regex(/^[a-z0-9_-]+$/, 'id must be safe for filenames'),
  title: z.string().default(''),
  source: z.string().optional().default(''),
  updatedAt: z.string().optional(),
  version: z.string().optional(),
  tags: z.array(z.string()).optional().default([]),
  purpose: z.string().default(''),
  scope: z.string().default(''),
  definitions: z.array(z.string()).default([]),
  rulesConstraints: z.array(z.string()).default([]),
  doDont: doDontSchema,
  examples: z.array(z.string()).default([]),
  edgeCases: z.array(z.string()).default([])
}).passthrough()

export type KnowledgeBaseDocument = z.infer<typeof knowledgeBaseDocumentSchema>

export function getDefaultKbDocument(id: string): KnowledgeBaseDocument {
  return {
    id,
    title: '',
    source: '',
    purpose: '',
    scope: '',
    definitions: [],
    rulesConstraints: [],
    doDont: { do: [], dont: [] },
    examples: [],
    edgeCases: [],
    tags: []
  }
}
```

---

## 2) Repository layout and SSOT

### 2.1 Where KB files live

- **Path:** `custom/knowledge-bases/<id>.kb.json`
- **One file per KB;** id = filename without `.kb.json`.
- **Existing** `custom/knowledge/<assistantId>.md` remains the current SSOT for *assistant-scoped* custom knowledge (generate-custom-overlay, ACE Knowledge tab). PR11a adds a *parallel* layout for *normalized* KBs that can be referenced by id via `knowledgeBaseRefs` later.

### 2.2 KB registry (SSOT for id → metadata)

- **Path:** `custom/knowledge-bases/registry.json`
- **Shape:**

```json
{
  "knowledgeBases": [
    {
      "id": "design-guidelines",
      "title": "Design guidelines",
      "filePath": "design-guidelines.kb.json",
      "tags": ["design", "brand"],
      "version": "1.0.0"
    }
  ]
}
```

- **Validation:** Each entry must have `id`, `title`, `filePath`. `filePath` is relative to `custom/knowledge-bases/` (e.g. `design-guidelines.kb.json`). Optional: `tags`, `version`.
- **Consistency:** Scripts that add/update a KB should update the registry (or a script `scripts/ensure-kb-registry.ts` can sync registry from existing `.kb.json` files).

### 2.3 Assistants referencing KBs

- Assistants already have optional `knowledgeBaseRefs?: string[]` (IDs). In PR11a we do **not** fetch or merge these at runtime; we only ensure:
  - Registry lists KBs by id.
  - `knowledgeBaseRefs` in the manifest are ids that can exist in the registry (no validation in this PR that the id exists; optional follow-up).

---

## 3) Import paths

### 3.1 Script conversion: `scripts/convert-kb.ts`

**Responsibilities:**

- **Markdown → normalized KB JSON:** Parse markdown; map headings to sections; bullet lists → arrays; preserve inline examples.
- **Loose JSON → normalized KB JSON:** Accept partial JSON; merge into default document; validate with Zod; output full schema.
- **Modes:** `--preview` (print to stdout, no write) and `--write` (write to `custom/knowledge-bases/<id>.kb.json` and optionally update registry).

**CLI usage examples:**

```bash
# Markdown → normalized JSON (preview)
npx tsx scripts/convert-kb.ts --from md --input ./path/to/doc.md --id my-kb --preview

# Markdown → write file + update registry
npx tsx scripts/convert-kb.ts --from md --input ./path/to/doc.md --id my-kb --write

# Loose JSON → normalized JSON (preview)
npx tsx scripts/convert-kb.ts --from json --input ./loose.json --id my-kb --preview

# Loose JSON → write
npx tsx scripts/convert-kb.ts --from json --input ./loose.json --id my-kb --write --title "My KB"
```

**Deterministic normalization (Markdown):**

- Top-level heading (`# Title`) → `title` if no `title` in metadata.
- `## Purpose` → `purpose` (single block of text until next heading).
- `## Scope` → `scope`.
- `## Definitions` → `definitions` (each list item or paragraph line → array element).
- `## Rules` or `## Rules & constraints` → `rulesConstraints`.
- `## Do` / `## Don't` (or `## Do's and Don'ts` with subsections) → `doDont.do` / `doDont.dont`.
- `## Examples` → `examples` (each fenced block or list item → one element).
- `## Edge cases` → `edgeCases`.
- Unknown sections: preserve as extra content in a catch-all or append to closest section (e.g. append to `edgeCases` or drop for strict schema).

**Deterministic normalization (Loose JSON):**

- Parse JSON; overlay onto `getDefaultKbDocument(id)`; run `knowledgeBaseDocumentSchema.parse()`; output with sorted keys and `updatedAt: new Date().toISOString()` when writing.

### 3.2 LLM prompt-based conversion

- **File:** `docs/kb-import-prompt.md`
- **Content:** A copy/paste prompt that:
  - Instructs the LLM to take raw KB text (from colleague docs, Notion, etc.).
  - Asks for output as a single JSON object matching the canonical KB schema (id, title, purpose, scope, definitions, rulesConstraints, doDont, examples, edgeCases, plus optional source, tags, version).
  - Includes a minimal example input → output so the model sees the exact shape.
  - Says to return only the JSON (no markdown fences if possible, or "if you must use markdown, use ```json ... ```").

---

## 4) Sample input → output mappings

### 4.1 Markdown input (minimal)

```markdown
# Design guidelines

## Purpose
Single source of truth for UI and copy standards.

## Scope
All product surfaces and FigmAI-assisted outputs.

## Rules
- Use sentence case for buttons.
- Never use lorem ipsum in production copy.
```

**Expected normalized JSON (preview):**

```json
{
  "id": "design-guidelines",
  "title": "Design guidelines",
  "source": "",
  "purpose": "Single source of truth for UI and copy standards.",
  "scope": "All product surfaces and FigmAI-assisted outputs.",
  "definitions": [],
  "rulesConstraints": [
    "Use sentence case for buttons.",
    "Never use lorem ipsum in production copy."
  ],
  "doDont": { "do": [], "dont": [] },
  "examples": [],
  "edgeCases": [],
  "tags": []
}
```

### 4.2 Loose JSON input

```json
{
  "purpose": "Quick ref for accessibility",
  "rulesConstraints": ["Always provide alt text for images."]
}
```

**With `--id a11y-ref`:**

- Overlay on `getDefaultKbDocument('a11y-ref')`; fill `purpose` and `rulesConstraints`; default `doDont`, `definitions`, etc.; set `updatedAt` on write.

### 4.3 Do / Don't mapping (Markdown)

```markdown
## Do's and Don'ts

### Do
- Use clear labels.
- Test with screen readers.

### Don't
- Rely on color alone.
- Use tiny touch targets.
```

→ `doDont: { do: ["Use clear labels.", "Test with screen readers."], dont: ["Rely on color alone.", "Use tiny touch targets."] }`

---

## 5) Files to add or modify

### 5.1 New files

| File | Purpose |
|------|--------|
| `admin-editor/src/kbSchema.ts` | Zod schema + `getDefaultKbDocument`, export type `KnowledgeBaseDocument`. |
| `scripts/convert-kb.ts` | CLI: `--from md|json`, `--input`, `--id`, `--preview` \| `--write`, `--title` (optional). |
| `docs/kb-import-prompt.md` | Copy/paste LLM prompt for raw text → normalized KB JSON. |
| `custom/knowledge-bases/README.md` | Short explanation: .kb.json format, registry.json, how to add KBs and reference from assistants. |
| `scripts/__tests__/convert-kb.test.ts` or `tests/kb-normalization.test.ts` | Schema validation + conversion mapping tests (see §6). |

### 5.2 New directories / placeholder files

| Path | Purpose |
|------|--------|
| `custom/knowledge-bases/` | Directory for `<id>.kb.json` and `registry.json`. |
| `custom/knowledge-bases/registry.json` | Initial content: `{ "knowledgeBases": [] }`. |

### 5.3 Optional modifications (no runtime)

| File | Change |
|------|--------|
| `admin-editor/src/schema.ts` | Optional: import and re-export `knowledgeBaseDocumentSchema` or add a top-level `knowledgeBasesRegistrySchema` if ACE will later validate the registry. Not required for PR11a if ACE does not yet edit KBs. |
| `package.json` | Add script: `"convert-kb": "tsx scripts/convert-kb.ts"` (and optionally `"test:kb": "tsx tests/kb-normalization.test.ts"` or similar). |

### 5.4 Explicitly unchanged (no edits)

- `src/main.ts`, `src/core/contentSafety/recovery.ts`, `src/core/llm/promptPipeline.ts`, `src/core/assistants/instructionAssembly.ts` (no wiring of KB content into prompts).
- `scripts/generate-custom-overlay.ts` (still reads only `custom/knowledge/*.md` by assistantId).
- `admin-editor` save/model (no save of `.kb.json` or registry in this PR unless we add a minimal “save registry” path; prefer script-only writes for PR11a).

---

## 6) Guardrails and tests

### 6.1 Schema validation tests

- Valid document: all required keys present, valid `id` regex, `doDont` has `do` and `dont` arrays → parse succeeds.
- Invalid: missing `id`, invalid `id` (e.g. spaces), `doDont` missing or wrong shape → parse throws or returns safeParse error.
- Defaults: empty input merged with `getDefaultKbDocument('x')` passes and produces full shape.

### 6.2 Conversion mapping tests

- **Markdown → JSON:** One fixture markdown with Purpose, Scope, Rules, Do/Don't, Examples, Edge cases → assert output has correct section keys and array lengths / content.
- **Loose JSON → JSON:** Partial JSON with only `purpose` and `rulesConstraints` → assert output has defaults for other sections and provided fields preserved.
- **Determinism:** Same input + same `--id` → same output (e.g. no random keys, stable key order when writing).

### 6.3 Test location and runner

- Prefer **same pattern as instructionAssembly tests:** `tsx path/to/test.ts` with `node:assert`, no Figma runtime. Example: `tests/kb-normalization.test.ts` or `scripts/__tests__/convert-kb.test.ts` (if scripts are the only consumer of the conversion logic, colocate tests next to script).
- Add `npm run test:kb` (or extend `npm run test`) so CI can run KB tests.

---

## 7) QA checklist

- [ ] `npm run build` passes.
- [ ] New script: `npx tsx scripts/convert-kb.ts --from json --input <(echo '{}') --id test --preview` prints valid JSON with all section keys.
- [ ] Markdown fixture with all sections produces expected structure (manual or test).
- [ ] `--write` creates `custom/knowledge-bases/<id>.kb.json` and file validates with Zod.
- [ ] Registry: either script updates `registry.json` when `--write` is used, or README documents manual registry edit; no crash when registry is empty array.
- [ ] No changes to prompt assembly, providers, main, or handlers; no new imports in `src/main.ts` or recovery/pipeline.
- [ ] Assistants can still list `knowledgeBaseRefs: ["some-id"]` in manifest; plugin does not yet resolve "some-id" to content (no behavior change).

---

## 8) Rollback

- Remove new files: `admin-editor/src/kbSchema.ts`, `scripts/convert-kb.ts`, `docs/kb-import-prompt.md`, `custom/knowledge-bases/README.md`, `custom/knowledge-bases/registry.json`, and test file(s).
- Remove `custom/knowledge-bases/` directory if empty of user-added `.kb.json` (or leave directory and registry as optional add-on).
- Revert `package.json` script entries.
- No runtime or generator code is changed, so no rollback of main/generate-custom-overlay/assistants.

---

## 9) Deliverable summary

| Deliverable | Implementation |
|-------------|----------------|
| 1) Canonical KB schema | Zod in `admin-editor/src/kbSchema.ts`; sections purpose, scope, definitions, rulesConstraints, doDont, examples, edgeCases; metadata id, title, source, updatedAt, version?, tags?. Validation rules and defaults as above. |
| 2) Repo layout + SSOT | `custom/knowledge-bases/<id>.kb.json`; `custom/knowledge-bases/registry.json` (id → title, filePath, optional tags, version). Assistants reference by id via `knowledgeBaseRefs`; no runtime fetch in this PR. |
| 3A) Script conversion | `scripts/convert-kb.ts`: md → normalized KB JSON, loose JSON → normalized KB JSON; `--preview` and `--write`; deterministic heading/list → section mapping. |
| 3B) LLM prompt | `docs/kb-import-prompt.md`: copy/paste prompt for raw KB text → normalized KB JSON. |
| 4) Guardrails | Tests for schema validation and conversion mapping; no changes to prompt assembly, providers, main, or handlers. |

**PR title:** `PR11a: KB normalization foundation (schema + import tools), no runtime behavior change`
