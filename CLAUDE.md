# FigmAI — Claude Code Instructions

## Scope
- Treat `figmai_plugin/` as the only project root.
- Do not read, modify, move, or make assumptions about files outside this repo root unless I explicitly ask.

## Core architecture rules
- Preserve the strict separation between the Figma plugin runtime and ACE.
- Plugin runtime must remain deterministic, build-time driven, and enterprise-safe.
- No runtime JSON reads for assistants, KB docs, or config.
- Runtime consumes generated TypeScript artifacts only.
- Do not introduce remote config fetching or hidden runtime behavior.
- Do not bypass documented invariants to make a change "work."
- FigmAI has two separate knowledge mechanisms and they must not be conflated:
  - custom per-assistant markdown knowledge merged via the custom overlay flow
  - structured knowledge bases compiled from `custom/knowledge-bases/*.kb.json` and injected through runtime KB resolution / instruction assembly
- Do not collapse these two systems together unless explicitly asked for an approved architectural migration.
- When working on assistant prompts or KB behavior, verify whether the change affects custom knowledge, structured KBs, or both.

## Source of truth
Before making architectural or cross-cutting changes, check these docs first:
- `docs/README.md` — documentation index and authority map
- `docs/01-getting-started.md` — architecture overview, entry points, and key patterns
- `docs/invariants.md` — hard guardrails that must not be broken
- `src/assistants/assistants.md` — canonical live assistant registry (what is running, what files matter)
- `docs/architecture/ace-static-s3-migration.md` — ACE / Config API / S3 architecture authority

## Working style
- Keep changes minimal, explicit, and reversible.
- Prefer fixing root causes over adding patches.
- Do not edit generated files manually unless explicitly instructed.
- When changing architecture, config flow, assistants, KB flow, or prompt assembly, stop and verify the change against the docs above.
- When uncertain, ask instead of guessing.

## Build and verification
Use these commands as appropriate:
- `npm run build`
- `npm run test`
- `npm run invariants`

## Areas requiring extra care
- `src/main.ts`
- `src/core/assistants/instructionAssembly.ts`
- `src/assistants/`
- `src/knowledge-bases/`
- `src/custom/`
- `scripts/`
- `admin-editor/`

## Avoid
- Runtime shortcuts that break the build-time model
- Silent behavior changes
- Broad refactors without approval
- Editing files outside `figmai_plugin/`
