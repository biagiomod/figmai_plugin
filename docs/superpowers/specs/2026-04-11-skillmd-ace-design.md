# SKILL.md + ACE Hybrid Editor — Phase 5 Design Spec

**Date:** 2026-04-11
**Branch:** `phase5-skillmd-ace` (to be created from current stable baseline)
**Status:** Approved for implementation — invoke writing-plans to generate implementation plan
**Parent spec:** `docs/superpowers/specs/2026-04-10-sdk-toolkit-foundation-design.md` (Phase 5 gated section)
**Kickoff doc:** `docs/superpowers/plans/2026-04-11-phase5-skillmd-ace-kickoff.md`

---

## Goal

Extract the authored behavioral content from `custom/assistants.manifest.json` into per-assistant `SKILL.md` files, and update the ACE admin editor to support structured + prose hybrid editing of both the manifest fields and SKILL.md content. Introduce a `compile-skills.ts` compiler that merges manifest + SKILL.md into the existing generated artifact shape, maintaining full compile/runtime parity.

---

## Section 1 — File Layout and Ownership

### Directory structure

```
custom/
  assistants/
    <assistantId>/
      manifest.json          ← structural metadata (authoritative for structure)
      SKILL.md               ← authored behavior (authoritative for behavior)
    assistants.manifest.json ← TRANSITIONAL flat manifest (fallback, retirement target)
  skills/                    ← RESERVED for future shared/reusable skills (not compiled in slice 1)
```

**Slice 1 scope:** per-assistant `SKILL.md` only. `custom/skills/` is reserved but not compiled.

### Ownership split

**`manifest.json` owns** — structural metadata and manifest-owned UI/product copy:
- `id`, `name`, `description`, `category`, `tags`
- `enabled`, `isDefault`, `isBuiltin`
- `uiConfig`: `hoverSummary`, `welcomeMessage`, `introMessage`
- `quickActions[]`: `id`, `label`, `executionType`, `requiresSelection`, `requiresVision`, `maxImages`, `imageScale`, `shortcut`
- `instructionBlocks[]`: `kind`, `label`, `enabled` (structural toggle)
- `knowledgeBaseRefs[]` (structural, runtime compatibility)
- `AssistantConfig` fields: deferred scaffolding, no wiring in Phase 5

**`SKILL.md` owns** — authored assistant behavior:
- Identity statement and behavioral principles
- Per-section behavioral guidance (Behavior, Instruction Blocks, Output Guidance)
- Quick action authored overlays: `templateMessage`, `guidance` per quick action ID
- Any prose that would previously live in `promptTemplate`

**Ambiguous fields clarification:**
- `name`, `description`, `hoverSummary`, `welcomeMessage`, `introMessage` are **manifest-owned UI/product copy**. They may be surfaced read-only in the ACE SKILL.md panel for context, but are not editable there. Changes go through the manifest form.
- `promptTemplate` in the flat manifest is the migration source — its content migrates into SKILL.md authored sections. The field is retired once migration is complete.

### Migration authority model

Compiler reads from the per-assistant directory (`custom/assistants/<id>/`) as the primary path. Falls back to the flat manifest (`custom/assistants.manifest.json`) for assistants not yet migrated. Migration is per-assistant and incremental.

Compiler emits a `[SKILL_COMPILER WARNING]` for each assistant resolved via the flat manifest fallback, to make the transition state visible in the build log.

### Flat manifest retirement criteria (all must pass before archiving)

1. All 11 live assistants have a directory with both `manifest.json` and `SKILL.md`
2. Compiler output is byte-for-byte identical whether running against per-directory or flat manifest sources
3. Build output contains zero `[SKILL_COMPILER WARNING]` fallback entries (i.e., no assistant is still resolved via the flat manifest)
4. `npm run build`, `npm test`, `npm run invariants` all pass
5. Flat manifest archived (not deleted) to `custom/assistants.manifest.json.archived`

---

## Section 2 — SKILL.md Canonical Schema

### Full structure

```markdown
---
skillVersion: 1
id: <assistantId>
---

## Identity

<Required. 1–3 sentences. The assistant's core purpose and defining principle.
Lead with what makes this assistant distinct. No vague platitudes.>

## Behavior

<Optional. Specific behavioral rules. Prefer tables and if/then rules over prose.
Each rule should be falsifiable — "Do X when Y" beats "Be helpful".>

## Instruction Blocks

<Optional. Per-block behavioral guidance. Use heading per block label.
Only needed if a block needs behavioral nuance beyond its label.>

## Output Guidance

<Optional. Format, length, tone constraints. Be specific.
"Return a numbered list of at most 5 items" beats "Be concise".>

## Quick Actions

<Optional. Per-quick-action authored overlays. One sub-section per action.>

### <quickActionId>

templateMessage: |
  <multiline template — optional>

guidance: |
  <authoring guidance shown in ACE — optional>
```

### Frontmatter fields

| Field | Type | Required | Notes |
|---|---|---|---|
| `skillVersion` | integer | **Yes** | Must be `1` for slice 1. Hard error if missing or wrong type. |
| `id` | string | **Yes** | Must match the parent directory name. Hard error on mismatch. |

### Section rules

- `## Identity` is **required**. Hard compiler error if absent.
- All other sections are **optional**. Sections may appear in any order, but the canonical order above is preferred and what the compiler emits.
- Unknown `## Heading` sections cause a **hard compiler error** (no silently ignored sections).
- The file must begin with the YAML frontmatter block. Hard error if frontmatter is absent or unparseable.

### Quick action overlay guardrails

SKILL.md **MAY** define per quick action:
- `templateMessage` — the message template sent to the AI
- `guidance` — authoring guidance shown in the ACE editor

SKILL.md **MUST NOT** define or override:
- `executionType`, `requiresSelection`, `requiresVision`, `maxImages`, `imageScale`

These structural fields live exclusively in `manifest.json`. If a SKILL.md quick action section contains any structural field, the compiler emits a **hard error**.

### Authoring quality standards (heuristics from Skill Writer docs)

These are authoring guidance principles for whoever writes SKILL.md files, not compiler-enforced schema rules:

- **Lead with core principle.** The Identity section should answer: what is the single most important thing this assistant does? Everything else follows from that.
- **Specific rules over vague aspirations.** "Return at most 5 items unless the user explicitly asks for more" beats "Be helpful and concise".
- **Examples and tables.** Where behavior is conditional, a table or if/then example beats descriptive prose.
- **Keep SKILL.md lean.** Target under 500 lines. If reference material is large (component catalogs, token lists, extensive examples), it belongs in `knowledgeBaseRefs` (retrieval layer), not in the SKILL.md prompt content.
- **Reference supporting files.** `## Output Guidance` may reference a KB doc for format templates rather than inlining them.

---

## Section 3 — Compiler Model

### Script

`scripts/compile-skills.ts` — replaces `scripts/generate-assistants-from-manifest.ts` as the primary artifact generator for assistant entries.

The old script is retained until all 11 assistants are migrated (flat manifest retirement criteria complete).

### Compiler responsibilities

1. **Discover** assistants: scan `custom/assistants/<id>/` for per-assistant directories, union with flat manifest fallback for unmigrated assistants
2. **Parse** `manifest.json` for structural fields
3. **Parse** `SKILL.md` for authored sections (frontmatter + section extraction)
4. **Validate** — emit hard errors for:
   - Missing required frontmatter fields (`skillVersion`, `id`)
   - `id` mismatch between frontmatter and directory name
   - Missing `## Identity` section
   - Unknown `## Heading` sections
   - Structural fields in quick action overlays
   - `skillVersion` not equal to `1`
5. **Merge** manifest fields + SKILL.md authored content into the `AssistantManifestEntry` shape
6. **Emit** `src/assistants/assistants.generated.ts` — same shape as today, same downstream consumers

### Merge model

```
AssistantManifestEntry {
  // from manifest.json — all structural fields verbatim
  id, name, description, category, ...
  quickActions[].{id, label, executionType, requiresSelection, ...}  // structural fields
  instructionBlocks[].{kind, label, enabled}
  knowledgeBaseRefs[]

  // from SKILL.md — authored behavior
  promptTemplate: <Identity + Behavior + InstructionBlocks + OutputGuidance sections, concatenated>
  quickActions[].{templateMessage, guidance}  // authored overlays merged onto structural entries
}
```

`promptTemplate` in the emitted artifact is constructed by concatenating the `## Identity`, `## Behavior`, `## Instruction Blocks`, and `## Output Guidance` sections of SKILL.md in canonical order. The `## Quick Actions` section is **excluded** from `promptTemplate` — it is parsed separately and its per-action overlays (`templateMessage`, `guidance`) are merged per-ID into the corresponding `quickActions[]` entries.

### Hard errors vs warnings

| Condition | Severity |
|---|---|
| Missing frontmatter | Hard error |
| Missing `skillVersion` or wrong type | Hard error |
| `id` mismatch (frontmatter vs directory) | Hard error |
| Missing `## Identity` | Hard error |
| Unknown `## Heading` | Hard error |
| Structural field in SKILL.md quick action | Hard error |
| Quick action overlay references unknown action ID | Hard error |
| Assistant resolved via flat manifest fallback | Warning (`[SKILL_COMPILER WARNING]`) |

Hard errors abort the build. Warnings are logged but do not abort.

### Generated artifact

Output: `src/assistants/assistants.generated.ts`

The shape is identical to what `generate-assistants-from-manifest.ts` currently emits. No downstream consumer changes required in slice 1. The compiler replaces the generator — same contract out.

---

## Section 4 — ACE Hybrid Editor Model

### Layout (Unified B model)

```
┌─────────────────────────────────────────────────────┐
│  Assistant: [name]               [Save] [Discard]   │
├─────────────────────────────────────────────────────┤
│  MANIFEST FORM                                      │
│  ┌───────────────────────────────────────────────┐  │
│  │ Name: [______]  Category: [______]            │  │
│  │ Enabled: [✓]   Default: [ ]                  │  │
│  │ Hover summary: [______]                       │  │
│  │ Welcome message: [______]                     │  │
│  └───────────────────────────────────────────────┘  │
├─────────────────────────────────────────────────────┤
│  QUICK ACTIONS                                      │
│  ┌────────────────────────────────────────────────┐ │
│  │ [Action label]  executionType: instance  🔒    │ │
│  │ Template message: [editable textarea]          │ │
│  │ Guidance: [editable textarea]                  │ │
│  └────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────┤
│  SKILL PANEL                    [Form] [Source]     │
│  ┌───────────────────────────────────────────────┐  │
│  │ ## Identity [editable textarea]               │  │
│  │ ## Behavior [editable textarea]               │  │
│  │ ## Output Guidance [editable textarea]        │  │
│  └───────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────┘
```

### Panel modes

**Form mode (default):** Skill sections rendered as labeled textareas, one per SKILL.md section heading. Section headings shown as labels (read-only). Textarea content is the section body.

**Source mode:** Raw SKILL.md file content in a single monospace editor. Full authoring control. Useful for bulk edits, copy-paste, or fixing formatting issues.

**Preview mode:** Rendered view of the assembled `promptTemplate` (what the compiler would produce). Read-only. Helps authors verify the merge output before saving.

Switching between modes during an unsaved edit preserves the in-memory state. Source mode parses on switch-away; if parsing fails, ACE shows an inline error and stays in source mode.

### Quick actions panel

Structural fields (`executionType`, `requiresSelection`, `requiresVision`, `maxImages`, `imageScale`) are displayed read-only with a lock icon. They cannot be edited from ACE — changes require editing `manifest.json` directly.

Authored overlay fields (`templateMessage`, `guidance`) are editable textareas.

### Save model

**Atomic save:** When the user clicks Save, ACE writes manifest.json and SKILL.md in a single operation (both files or neither). Then invokes the compiler. If the compiler returns errors, ACE displays them inline and does not commit the write.

No partial saves. No auto-save. Explicit Save/Discard only.

### Round-trip invariant (normalization-stable)

ACE normalizes SKILL.md on the **first write** through the editor:
- Section headings normalized to canonical casing (`## Identity`, `## Behavior`, etc.)
- Trailing whitespace stripped
- Single blank line between sections enforced
- Frontmatter block normalized (consistent quoting, consistent field order: `skillVersion`, then `id`)

After first normalization, a no-op edit + Save produces a **byte-for-byte identical file**. This is the normalization-stable round-trip invariant.

**Not raw-content preservation.** If a SKILL.md is hand-edited with non-canonical whitespace and then opened in ACE, the first Save normalizes it. This is intentional and documented.

### What ACE does NOT do

- Does not allow editing `knowledgeBaseRefs` — **intentional scope cut for slice 1**. `knowledgeBaseRefs` assignments are structural and managed via `manifest.json` directly. ACE editing of KB assignments requires its own design (KB selection UI, runtime resolver alignment) and is deferred.
- Does not allow editing structural quick action fields (`executionType`, etc.)
- Does not allow creating or deleting quick actions (structural change — requires manifest.json edit)
- Does not allow creating or deleting assistants (out of scope)
- Does not compile or run the plugin build — Save invokes the compiler script only

---

## Section 5 — Migration Path

### Overview

Migration is per-assistant, incremental. Flat manifest remains authoritative for unmigrated assistants. No big-bang migration.

### Steps per assistant

1. **Create directory:** `mkdir custom/assistants/<id>/`

2. **Extract manifest:** Copy the assistant's entry from `custom/assistants.manifest.json` into `custom/assistants/<id>/manifest.json`, retaining all structural fields.

3. **Extract SKILL.md:** Take the `promptTemplate` content and restructure it as SKILL.md authored sections. Minimum required: frontmatter + `## Identity`. Remaining content goes into `## Behavior` and/or `## Output Guidance` as appropriate.

4. **Remove from flat manifest:** Once the per-directory entry passes compilation (`npm run build` clean, compiler emits no errors for this assistant), remove the assistant's entry from `custom/assistants.manifest.json`.

5. **Verify:** `npm test && npm run invariants` — 0 failures.

### Migration script

A migration script `scripts/migrate-assistant-to-skillmd.ts` will be provided as part of the implementation. Usage:

```bash
tsx scripts/migrate-assistant-to-skillmd.ts <assistantId>
```

The script:
- Creates the per-directory structure
- Copies manifest fields into `manifest.json`
- Wraps `promptTemplate` content in a minimal SKILL.md (`## Identity` + `## Behavior`)
- Does NOT remove from the flat manifest (operator reviews first, then removes manually)

The generated SKILL.md from the migration script is a mechanical scaffold, not a polished authored file. An authoring quality pass (applying Skill Writer heuristics) is deferred from slice 1.

### Migration gate

The compiler emits `[SKILL_COMPILER WARNING]` for each flat-manifest fallback. The count of warnings in the build log tracks migration progress. Target: 0 warnings when all 11 assistants are migrated.

---

## Section 6 — Out of Scope (Phase 5 Slice 1)

The following are explicitly excluded from this implementation:

| Item | Reason deferred |
|---|---|
| `custom/skills/` shared reusable skills | Directory reserved, not compiled. Requires its own spec. |
| `AssistantConfig` field wiring (`llmEnabled`, `kbAssignments`, `visionEnabled`, `smartDetectionEnabled`, `designSystemId`, `designSystemTheme`) | Deferred scaffolding. Explicit gate: no wiring without approved Phase 6 design document. |
| `internalKBs` → `knowledgeBaseRefs` rename | The two systems (custom per-assistant knowledge overlay vs structured KB resolution) must not be conflated. `knowledgeBaseRefs` stays in manifest.json for slice 1 runtime compatibility. |
| Authoring quality pass on migrated SKILL.md files | Migration script produces a mechanical scaffold. Applying Skill Writer heuristics to each assistant's SKILL.md is deferred. When ready, use these docs as the source: `Skill Writer/skillwriter/docs/skill-writing-guide.md`, `skill-writing-reference-card.md`, `skill-writing-tutorial.md`. |
| New assistant creation via ACE | Structural change requiring manifest authoring. Out of scope. |
| Deleting assistants via ACE | Same. |
| Bulk migration of all 11 assistants in one commit | Migration is per-assistant and incremental. No big-bang. |
| SKILL.md linting or style enforcement in the compiler | Compiler enforces schema (hard errors on structural violations). Authoring quality is a heuristic guide, not a compiler gate. |
| Previewing KB content in ACE | KB resolution is runtime — preview would require a separate pipeline. Deferred. |
| `promptTemplate` field removal from `AssistantManifestEntry` interface | The interface retains `promptTemplate` as the field populated by the compiler merge. The SKILL.md source sections are an implementation detail of the compiler. |

---

## Compile / Runtime Parity Gate

Every commit in Phase 5 must pass:

- `npm run build` — typecheck + bundle clean (0 errors, 0 type errors)
- `npm test` — all tests pass (0 failed)
- `npm run invariants` — 10/10 pass

The generated artifact shape (`AssistantManifestEntry`, `ASSISTANTS_MANIFEST`) must be identical before and after compiler swap. Downstream consumers (`instructionAssembly.ts`, `routing.ts`, ACE schemas) must require zero changes.

---

## Architecture Guardrails

- **No runtime reads.** `SKILL.md` files are consumed at build time by the compiler. The plugin runtime sees only `assistants.generated.ts`. No runtime filesystem reads.
- **No backward-compat shims.** The compiler replaces the generator. The old generator script is archived, not kept as a parallel path.
- **No silent behavior changes.** Unknown SKILL.md sections are hard errors, not silent no-ops. The compiler is strict.
- **Preserve custom knowledge separation.** SKILL.md authored behavior and structured KB resolution (`knowledgeBaseRefs` / KB pipeline) are distinct mechanisms. Do not merge them.
- **Toolkit boundaries unchanged.** DS-T and SD-T adapters are not touched in Phase 5. Phase 0 adoption status is preserved.
