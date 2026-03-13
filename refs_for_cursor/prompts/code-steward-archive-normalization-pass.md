# Code Steward Prompt: Archive Normalization Pass

Agent: Code Steward
Mode: Agent
Model: GPT-5.4

## Task

Perform a follow-up documentation normalization pass for `figmai_plugin` focused on:

1. broken historical links in archived docs
2. remaining mixed-case active doc names
3. regressions or inconsistencies introduced by the recent spring-cleaning pass
4. filename consistency driven by best practices

## Scope

Limit all work to:

- `/Users/biagio/Desktop/Dev_Figma/figmai/figmai_plugin`

Do not expand the task to the outer workspace.

## Current Context

A previous cleanup already improved the active docs surface. That pass:

- repaired the active docs authority map
- archived some stale root docs
- renamed some active docs to lowercase kebab-case
- excluded generated output noise from the maintained docs surface

That cleanup intentionally did not fully normalize older historical archive links when they appeared inside legacy plan and audit docs.

## Naming Direction

Use best-practice consistency as the default:

- Active human-facing docs should use `lowercase-kebab-case.md`
- Do not preserve ALL_CAPS or mixed-case names in the active docs surface unless there is a strong reason
- For archive docs, prefer consistency when safe, but keep legacy names if renaming would create disproportionate churn or reduce historical traceability

If any mixed-case filenames remain after your pass, explain each exception explicitly in the final summary.

## Authority Rules

Preserve repository invariants and keep ACE migration guidance aligned with current repo governance.

For ACE migration and hosting topics, preserve this authority order:

1. `docs/architecture/ace-static-s3-migration.md`
2. current code in `infra/config-api/`, `admin-editor/`, and `scripts/`
3. `docs/setup/ace-public-replica.md`

Do not accidentally re-promote historical docs as current.

## Generated Output Policy

Do not treat generated output as maintained documentation. In particular:

- `admin-editor/dist/`
- `infra/config-api/dist/`

Doc-like files under those paths should remain excluded from maintained docs inventories and repo navigation.

## What To Do

1. Build a delta inventory from the previous cleanup:
   - remaining mixed-case active docs
   - archive docs with broken links
   - stale references to pre-cleanup filenames
   - index drift or navigation gaps introduced by the earlier rename and archive pass

2. Audit `docs/archive/**` for broken markdown links:
   - prioritize links that should still resolve inside the repo
   - repair outdated repo-relative deep links where the intended target is clear
   - if a historical link is too ambiguous to fix safely, document it rather than guessing

3. Normalize remaining active human-facing docs to lowercase kebab-case where safe:
   - update inbound links in the same change
   - keep `docs/README.md`, sub-indexes, and related references accurate

4. Review archive naming consistency:
   - apply obvious low-risk normalizations only if the value outweighs the churn
   - otherwise preserve the archive filename and document why it remains an exception

5. Check for issues caused by the spring-cleaning pass:
   - links still pointing to old uppercase or mixed-case names
   - stale references in governance, setup, or backlog docs
   - orphaned docs
   - docs moved into archive but still referenced as current
   - authority labels that no longer match actual status

6. Re-run markdown validation on:
   - the active docs surface
   - the archive surface
   - linked human-facing docs outside `docs/` when they are part of the docs navigation surface

## Deliverables

Leave the repo in a cleaner and more internally consistent documentation state, including:

- repaired archive links where safe and justified
- normalized remaining active mixed-case doc names
- any additional safe naming consistency improvements
- updated indexes and cross-links
- a concise final summary covering:
  - active files renamed
  - archive files renamed, if any
  - archive links repaired
  - spring-cleaning regressions found and fixed
  - naming exceptions that remain and why

## Decision Rule

Prefer best-practice consistency over legacy casing by default, but do not create churn without value.

When uncertain:

- choose the least risky path
- preserve historical meaning
- document the exception clearly in the final summary
