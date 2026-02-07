# Documentation governance

**Purpose:** Repeatable hygiene and SSOT rules for `docs/`. No code behavior changes. No file deletions. No bulk renames.

---

## 1. Categories and labels

- **AUTHORITATIVE** — Current source of truth; follow this.
- **REFERENCE** — Supporting material; may be updated but is not the primary entry point.
- **CONTEXTUAL** — Deep dives or optional context.
- **SUPERSEDED REFERENCE** — Replaced by a newer doc; kept for history.
- **HISTORICAL** — Implemented or obsolete; kept for audit trail. Prefer "Status: Implemented (YYYY-MM-DD)" or "[HISTORICAL]" at top.

Use these labels in `docs/README.md` and in doc intros where it helps (e.g. "Superseded by: …").

---

## 2. Link and case audit (repeatable)

1. **Scan** all `docs/**/*.md` for markdown links `](path)` where `path` ends in `.md`.
2. **Resolve** each link relative to the file containing it; verify the target file exists under `docs/` with **exact case** (many systems are case-sensitive).
3. **Fix** broken in-docs links: wrong path (e.g. `docs/foo.md` from inside `docs/` → use `foo.md` or `subdir/foo.md`), or wrong case (e.g. `architecture.md` when the file is `ARCHITECTURE.md`).
4. **Do not** convert existing filenames (e.g. UPPERCASE) in bulk; document the rule instead (see §5).
5. Links to files outside `docs/` (e.g. `../README.md`, `../custom/README.md`) are allowed; verify they exist in the repo if you touch them.

**Cadence:** Run this audit when adding or moving docs, or as part of a doc cleanup pass; document "0 broken md links found" or list exceptions with rationale.

---

## 3. Authority and supersession

- **One current authority per topic.** When a new plan or doc replaces an old one:
  - Add a **Supersedes:** line at the top of the new doc (link to the old one).
  - Add a **Superseded by:** line at the top of the old doc (link to the new one).
  - Optionally add **Status: Implemented (YYYY-MM-DD)** or **[HISTORICAL]** on the old doc; do not delete it.
- **Canonical stack** is documented in `docs/README.md`: SSOT → ARCHITECTURE → RUNBOOK → DECISIONS. ACE plan chain: V3 ← V2 ← IMPLEMENTATION_PLAN (each supersedes the previous).

---

## 4. Naming convention and scope

### 4.1 Rule

- **New canonical docs:** Use `lowercase-kebab-case.md`. No UPPERCASE or camelCase for new filenames.
- **Existing ALL_CAPS or mixed-case filenames:** Legacy; remain unchanged unless explicitly migrated in a **dedicated rename pass** (rare, explicit PR with full link updates; no bulk renames ad hoc).
- **Archive:** Files moved to `docs/archive/` keep their **original filenames** (including ALL_CAPS). Do not rename on archive.
- **Primary index:** [README.md](README.md) is the main entry point. **Canonical anchors:** SSOT.md, ARCHITECTURE.md, RUNBOOK.md, DECISIONS.md (these names are legacy and retained).

### 4.2 Examples

- **Do:** New plan → `feature-x-plan.md`. New summary → `migration-summary.md`.
- **Don’t:** New doc → `FEATURE_PLAN.md` or `FeaturePlan.md`. Don’t rename existing `ARCHITECTURE.md` to `architecture.md` unless a dedicated, approved rename pass updates all links.

### 4.3 When renames are allowed

- **Rare, explicit PR only.** Scope: one or a small set of files with a clear reason (e.g. consolidating duplicate names). Requirements: (1) all in-docs links updated, (2) no mass rename of many files in one go, (3) documented in the PR and in this governance doc.

### 4.4 Scope

Governance applies to `figmai_plugin/docs/**` and any referenced docs. Exclude `custom/knowledge/` and `custom/knowledge-bases/` as content sources (only clarify their role in KB_AND_ASSISTANTS.md if needed).

---

## 5. Minimal edits only

- Prefer **one-line corrections** (wrong SSOT ref, wrong path/case), **small banners** (Status, Supersedes/Superseded by), **small index/label edits** in README, and **one governance doc** (this file) or one section in an existing contributing doc.
- Do **not** delete files, do **not** do large rewrites, do **not** bulk rename files.

---

## 6. References

- [README.md](README.md) — Documentation index and canonical stack.
- [SSOT.md](SSOT.md) — Single source of truth and repo tree.
- [ADMIN_CONFIG_EDITOR_PLAN_V3.md](ADMIN_CONFIG_EDITOR_PLAN_V3.md) — Doc hygiene policy (ACE).
