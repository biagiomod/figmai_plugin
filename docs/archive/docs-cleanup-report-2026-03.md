> Status: Archived maintenance note
> Scope: Documentation and generated-artifact surface cleanup for `figmai_plugin`

# Docs Cleanup Report (2026-03)

## Kept authoritative

- `docs/README.md`
- `docs/01-getting-started.md`
- `docs/invariants.md`
- `docs/architecture/ace-static-s3-migration.md`
- current code in `infra/config-api/`, `admin-editor/`, and `scripts/`
- `docs/setup/ace-public-replica.md`

## Further archive normalization

- `docs/archive/ADMIN_CONFIG_EDITOR_PLAN_V3.md` — moved fully into archive after the initial historical relabeling pass
- `docs/archive/health-report.md` — moved fully into archive after the initial historical relabeling pass
- `docs/archive/documentation-cleanup-summary.md` — moved fully into archive after the initial historical relabeling pass

## Renamed active docs

- `docs/AI_CONTEXT.md` → `docs/ai-context.md`
- `docs/ADMIN_CONFIG_EDITOR_AUDIT.md` → `docs/admin-config-editor-audit.md`
- `docs/ADMIN_CONFIG_EDITOR_ARCHITECTURE.md` → `docs/admin-config-editor-architecture.md`

## Archived from active root

- `docs/PR11c1-deliverable.md`
- `docs/PR11c2-note.md`
- `docs/PR8-pilot-migration-note.md`
- `docs/admin-config-editor-phase0-migration.md`

## Excluded as generated/build noise

- `admin-editor/dist/`
- `infra/config-api/dist/`

## Follow-up normalization pass

- Renamed remaining mixed-case active docs to lowercase kebab-case, including feature plans and audits kept outside the archive.
- Moved clearly historical docs fully into `docs/archive/` instead of leaving them in the active root with historical banners only.
- Repaired legacy archive links whose intended repo targets were still clear after the cleanup pass.
- Removed stale references to deleted `refs_for_cursor/` reference files from docs and inline repo notes.

## Remaining human-judgment items

- Whether additional historical setup summaries should move into `docs/archive/` once their operational value drops
- Whether `docs/setup/ace-public-replica.md` should eventually absorb more of the current operational guidance once the ACE migration path stabilizes
