# Phase 5 — SKILL.md + ACE Hybrid Editor: Kickoff Plan

> **Status:** Slice 1 complete ✅ (2026-04-11)
> **Branch:** `sdk-toolkit-foundation`
> **Prerequisite:** SDK stabilization wave complete ✅ (2026-04-11)

## Phase 5 Slice 1 Status (completed 2026-04-11)

- compile-skills.ts: ✅ Live
- migrate-assistant-to-skillmd.ts: ✅ Live
- ACE SKILL.md panel: ✅ Live
- Production migrations: ⏳ Deferred (run per-assistant when ready)
- Authoring quality pass: ⏳ Deferred (use Skill Writer docs when ready)

---

## Goal

Replace the current build-time `promptTemplate` / assistant manifest model with an author-owned
`SKILL.md` format that ACE can read, write, and compile — without breaking the existing plugin runtime.

---

## Why This Matters

The current assistant model is author-hostile:
- Prompt content lives in raw TypeScript strings inside the manifest
- ACE cannot edit prompts without touching generated TS files
- No single source of truth for "what does this assistant do"

`SKILL.md` gives authors a Markdown document they own. The compiler produces the same generated TS
artifacts the runtime already consumes — no runtime change required at adoption time.

---

## Scope for the First Implementation Slice

### In scope
- `SKILL.md` schema and file shape
- Compiler/parser: `SKILL.md` → existing generated TS artifact shape
- ACE hybrid editing surface: read/write `SKILL.md` in admin editor
- Migration path: convert existing `promptTemplate` entries to `SKILL.md` format

### Explicitly out of scope (first slice)
- New runtime behavior not currently available (e.g. dynamic KB overrides, runtime gating via `AssistantConfig`)
- SD-T / DS-T engine swap beyond current Phase 0 adoption
- `AssistantConfig` runtime wiring — remains deferred scaffolding
- Any change to the invariants or port contracts

---

## Architecture Overview

### `SKILL.md` shape (proposed)

```markdown
---
id: analytics_tagging
label: Analytics Tagging
executionType: tool-only
---

## Prompt

{prompt content}

## Quick Actions

### get-analytics-tags
label: Get Analytics Tags
requiresSelection: true

### copy-table
label: Copy Table
```

The frontmatter replaces the TypeScript manifest object. The `## Prompt` section replaces
`promptTemplate`. Quick action metadata replaces the `actions[]` array.

### Compiler responsibilities

- Parse `SKILL.md` frontmatter + sections
- Validate required fields (id, label, executionType)
- Emit the same generated TS shape that `generate-assistants` currently produces
- Fail loudly on missing required fields — never silently emit partial configs

### ACE hybrid editor model

- Admin editor reads `.skill.md` files from a configured directory
- Author edits in a rich text / split-pane interface
- On save: editor writes back to `.skill.md`, triggers compiler
- No direct editing of generated TS files by ACE

### Generated artifact shape

The compiler output must be drop-in compatible with the existing runtime:
- Same `ASSISTANTS_MANIFEST` structure consumed by `getAssistant()`, `getHandler()`
- No new runtime imports required at Phase 5 launch
- `AssistantConfig` fields remain dormant (Phase 5 does NOT wire them)

### Migration path

- Run a one-time migration script: reads existing manifest entries, emits `.skill.md` files
- Compiler replaces `generate-assistants` in the `prebuild` chain
- Existing assistants are preserved exactly — no behavioral change

---

## Design Questions to Resolve Before Implementation

1. **File location**: `src/assistants/<id>.skill.md` or `src/skills/<id>.skill.md`?
2. **Quick action metadata**: inline in `SKILL.md` or separate section per action?
3. **KB assignments**: in `SKILL.md` frontmatter or deferred to `AssistantConfig`?
4. **Compiler errors**: hard fail vs. warning + fallback?
5. **ACE editor layout**: split pane (raw Markdown + preview) or structured form fields?
6. **Versioning**: does `SKILL.md` include a schema version field?

These must be answered in the spec before implementation begins.

---

## First Step

Write a design document (`docs/superpowers/specs/2026-XX-XX-skillmd-ace-design.md`) that answers
the questions above and defines the canonical `SKILL.md` schema, compiler interface, and ACE model.

Use `brainstorming` → `writing-plans` → `subagent-driven-development`.

Do not write any implementation code until the spec is approved.

---

## Permanent Guardrails

Every commit in this workstream must pass:
- `npm test` (68+ tests, 0 failed)
- `npm run invariants` (10/10 pass)
- `npm run build` (typecheck + bundle clean)
- Plugin behavior preserved or improved
