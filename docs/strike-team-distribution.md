# Strike Team Distribution

> **Audience:** Core Team (Code Strike Team) distributing scoped plugin packages to Assistant Strike Teams.
>
> **Script:** `scripts/pack-strike-team.ts` (npm script: `pack-strike-team`)
>
> **Output:** `dist/strike-teams/figmai-strike-<id>-YYYYMMDD.tar.gz`

## What this produces

One tarball per assistant, each containing:

- The shared plugin runtime (`src/core/`, `src/ui/`, `src/sdk/`, `src/work/`, `build/`, `vendor/`, `shared/`)
- Build and test infra (`package.json`, `package-lock.json`, `tsconfig*.json`, shared `scripts/`, `tests/sdk/`)
- The team's editable files: their `custom/assistants/<id>/`, their `custom/knowledge/<id>.md` overlay, and their handler file(s) per the explicit map in `scripts/pack-strike-team.config.ts`
- Read-only shared content needed for the build: `custom/config.json`, `custom/assistants.manifest.json`, `custom/knowledge-bases/`, `custom/skills/`, `custom/design-systems/`
- A generated `STRIKE_TEAM.md` at the tarball root explaining what is editable vs read-only and the PR workflow
- Selected docs: `docs/assistant-sdk.md`, `docs/skills-and-knowledge-bases.md`, etc.

Explicitly excluded: `admin-editor/`, `infra/`, `deploy/`, `site/`, `enterprise/`, S3/publish scripts.

Other teams' per-directory assistants (`custom/assistants/<other-id>/`), knowledge overlays (`custom/knowledge/<other-id>.md`), and handler files are **included** in every tarball — the shared build chain needs them to resolve the full flat manifest and the handler registry. Edit-ownership (only-your-own) is enforced by `STRIKE_TEAM.md` and PR review, not by file removal.

## Usage

```bash
# One assistant (verify build before tarball — default)
npm run pack-strike-team -- --assistant design_critique

# All assistants
npm run pack-strike-team -- --all

# Skip the npm ci && npm run build verification step (fast, less safe)
npm run pack-strike-team -- --assistant design_critique --no-verify

# Custom output directory
npm run pack-strike-team -- --assistant design_critique --out /tmp/packages
```

## How teams exist

The packer finds assistants in this order:

1. **Per-assistant directories** — `custom/assistants/<id>/manifest.json` is the primary source of truth
2. **Flat manifest fallback** — `custom/assistants.manifest.json` entries not yet migrated to per-directory format

Any assistant in either source is packable. The `source` (per-directory vs flat-manifest) is logged for each pack.

## Handler mapping

Which handler files ship with which team is declared in `scripts/pack-strike-team.config.ts` under `ASSISTANT_HANDLER_MAP`. Current mappings:

| Assistant | Handler file(s) |
|-----------|-----------------|
| `content_table` | `src/assistants/evergreens/*` |
| `design_critique` | `src/core/assistants/handlers/designCritique.ts` |
| `design_workshop` | `src/core/assistants/handlers/designWorkshop.ts` |
| `discovery_copilot` | `src/core/assistants/handlers/discovery.ts` |
| `analytics_tagging` | `src/core/assistants/handlers/analyticsTagging.ts` |
| `errors` | `src/core/assistants/handlers/errors.ts` |

Assistants without an entry are pure-LLM (no handler code). If a new handler is added or ownership changes, edit the config file — do not edit the packer script.

Note: the shared handler registry (`src/core/assistants/handlers/index.ts`) imports every handler, so teams receive all handler files so the registry resolves. Edit-ownership is enforced by `STRIKE_TEAM.md` and PR review, not by file removal.

## Verify step

By default, `pack-strike-team` runs `npm ci && npm run build` inside the staged directory before producing the tarball. This takes ~30–60s per team on fresh install. On failure, the staging directory is kept at `.pack-staging/strike-<id>-YYYYMMDD/` for inspection.

Use `--no-verify` only for quick iteration on the packer itself.

## PR flow back to core

Teams submit changes as PRs against the core repo. Expected scope of a strike team PR:

- `custom/assistants/<id>/` (manifest.json, SKILL.md, knowledge files)
- `custom/knowledge/<id>.md` (if the team uses the knowledge overlay)
- Their handler file(s) listed in `ASSISTANT_HANDLER_MAP`

Any PR touching files outside that set should be reviewed as a core change, not a strike team change.

## Config editing (ACE, not direct edits)

Teams are explicitly asked NOT to edit `custom/config.json` in their package. Configuration changes (model settings, UI modes, KB policies, etc.) go through **ACE** with user accounts and role-based access. The packaged `config.json` is read-only for build purposes only.

## Cadence

Tarballs are frozen snapshots. Reissue packages when:

- Shared plugin runtime changes (new SDK features, contract changes)
- A team's handler assignment changes
- A new KB or Skill is added that many teams depend on
- Security fixes in shared infra

Weekly or per-milestone cadence is reasonable. Teams should re-sync on re-issue by unpacking the new tarball and merging their local changes.
