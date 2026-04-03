# Documentation Governance

## Purpose

Keep the `docs/` surface accurate, navigable, and explicit about what is current versus historical.

## Current Authority Rules

### General repo docs
- [`README.md`](README.md) is the main documentation index.
- [`01-getting-started.md`](01-getting-started.md) is the primary repo-orientation doc.
- [`invariants.md`](invariants.md) is a hard guardrail doc.

### ACE / Config API topics
For ACE migration and hosting topics, use this authority order:

1. [`architecture/ace-static-s3-migration.md`](architecture/ace-static-s3-migration.md)
2. Current code in `infra/config-api/`, `admin-editor/`, and `scripts/`
3. [`setup/ace-private-env-setup.md`](setup/ace-private-env-setup.md) — current generic private/work environment setup

[`setup/ace-public-replica.md`](setup/ace-public-replica.md) is a thinner reference retained for compatibility but is not the primary current setup guide.

Older ACE planning docs are historical or reference-only unless they are explicitly restated as current.

## Document Classes

- **Authoritative** — current source of truth for a topic
- **Reference** — useful supporting material, but not the first authority
- **Historical** — preserved for context, audit trail, or implementation history
- **Generated / build artifact** — not maintained as part of the active docs surface

## Naming Rules

- New active human-facing docs should use `lowercase-kebab-case.md`.
- Existing historical docs may retain legacy names, especially inside `docs/archive/`.
- Archive moves should preserve original filenames when that reduces historical confusion.

## Navigation Rules

- Every active doc should either appear in [`README.md`](README.md) or be intentionally linked from a narrower index such as `setup/README.md`.
- Historical docs should not present as current in the main index.
- If a doc is stale but still worth keeping, mark it clearly as historical rather than letting it imply current authority.

## Link Audit Rules

When adding, moving, or renaming docs:

1. Verify markdown links resolve with exact case.
2. Update inbound links in the same change.
3. Remove references to deleted or phantom authority files.
4. Prefer fixing the navigation layer before doing broader content cleanup.

## Generated Output Policy

The following paths are build artifacts and should not be treated as maintained docs:

- `admin-editor/dist/`
- `infra/config-api/dist/`

Doc-like files inside generated output should be excluded from active documentation inventories and repo navigation.

## Scope

This governance applies to:

- `docs/**`
- linked human-facing docs outside `docs/` when they are intentionally part of the navigation surface (for example `admin-editor/README.md` and `custom/README.md`)

It does not make runtime content sources under `custom/knowledge/` or `custom/knowledge-bases/` part of the normal documentation surface.
