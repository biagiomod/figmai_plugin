# FigmAI Plugin Backlog

## Purpose

This file is the **canonical backlog** for the FigmAI plugin project. It serves as the single source of truth for all planned work, active tasks, bugs, technical debt, and experimental ideas.

**What this backlog is:**
- The authoritative list of all work items (features, bugs, improvements, experiments)
- A prioritized, status-tracked view of project work
- A reference for planning, estimation, and progress tracking
- A historical record of completed work

**What this backlog is not:**
- A task management system (use GitHub Issues, Linear, Jira, etc. for day-to-day execution)
- A replacement for code documentation or architecture decisions
- A place for detailed technical specifications (use plan files for that)
- A duplicate of commit history or PR descriptions

**Single Source of Truth Statement:**
This file is the canonical backlog. All work items must be tracked here before implementation. Code changes must reference a Backlog ID (BL-XXX) in commit messages and PR descriptions.

---

## Index (by category)

Quick links to backlog items, grouped by theme. **Plugin** = FigmAI plugin (Figma side). **ACE** = Admin Config Editor (local web app). **Shared** = both or infrastructure.

| Category | ID | Title | Link |
|----------|-----|-------|------|
| **A — Architecture audit** | A1 | Full Plugin + LLM interaction audit | [BL-020](#bl-020) |
| **B — Assistant configuration** | B1 | Editor-friendly assistant configuration model | [BL-021](#bl-021) |
| | B2 | Assistant query structure definition | [BL-022](#bl-022) |
| **C — Knowledge base** | C1 | KB structure standard | [BL-023](#bl-023) |
| | C2 | KB builder template | [BL-024](#bl-024) |
| | C3 | External KB import/parsing | [BL-025](#bl-025) |
| **D — Design system** | D1 | Design system KB and guardrails (first-class type + DS-only enforcement) | [BL-026](#bl-026) |
| | D2 | Component library import | [BL-027](#bl-027) |
| | D3 | Multi-design-system switching | [BL-028](#bl-028) |
| **E — ACE config safety & versioning** | E1–E3 | Backups, build-linked snapshots, user attribution | [BL-016](#bl-016-expanded) (merged) |
| **F — LLM accuracy testing** | F1 | Assistant test harness | [BL-029](#bl-029) |
| | F2 | Automated evaluation metrics | [BL-030](#bl-030) |
| **G — Hosting & deployment** | G1 | ACE local → intranet hosting | [BL-017](#bl-017-expanded) (merged) |
| | G2 | Source control workflow | [BL-031](#bl-031) |
| | G3 | Config isolation outside code dir | [BL-032](#bl-032) |
| **H — Built-in analytics** | H1 | First-party analytics | [BL-033](#bl-033) |
| | H2 | ACE analytics dashboard | [BL-034](#bl-034) |
| **I — Assistant contribution** | I1 | Submission intake | [BL-035](#bl-035) |
| | I2 | Validation pipeline | [BL-036](#bl-036) |
| **J — Content & analytics tables admin** | J1 | Content table manager | [BL-037](#bl-037) |
| | J2 | Analytics tag table manager | [BL-038](#bl-038) |
| | J3 | Multi-format export | [BL-039](#bl-039) |
| | J4 | DB-level versioning | [BL-040](#bl-040) |
| **K — Continuous improvement** | K1 | External architecture review agent | [BL-041](#bl-041) |
| **L — Errors assistant (post-demo bugs)** | L1 | GROUP selection → sub-screen duplication | [BL-042](#bl-042) |
| | L2 | Intermittent "not a function" on Quick Action | [BL-043](#bl-043) |
| **M — Scanning & enrichment** | M1 | Smart Detector as canonical scan enrichment layer | [BL-050](#bl-050) |
| **N — Code architecture** | N1 | `main.ts` monolith extraction | [BL-051](#bl-051) |
| | N2 | `ui.tsx` monolith extraction | [BL-052](#bl-052) |
| **O — Testing & CI** | O1 | Wire excluded test files into `npm test` | [BL-054](#bl-054) |
| | O2 | Adopt test framework + coverage | [BL-055](#bl-055) |
| | O3 | Provider routing integration tests | [BL-056](#bl-056) |
| **P — Infrastructure** | P1 | Lambda API convergence | [BL-053](#bl-053) |
| | P2 | Lambda Node.js 22 + ARM64 upgrade | [BL-059](#bl-059) |
| | P3 | Upgrade `@figma/plugin-typings` | [BL-060](#bl-060) |
| | P4 | Archive deprecated Spring wrapper | [BL-065](#bl-065) |
| **Q — Documentation hygiene** | Q1 | Knowledge system guide | [BL-057](#bl-057) |
| | Q2 | Archive or update ASSISTANT_DESIGN.md | [BL-058](#bl-058) |
| | Q3 | Build pipeline + watch-mode documentation | [BL-064](#bl-064) |
| | Q4 | Standardize error handling patterns | [BL-061](#bl-061) |
| | Q5 | Fix README React→Preact reference | [BL-066](#bl-066) |
| | Q6 | Fix invariants.md authority link | [BL-069](#bl-069) |
| **R — Technology opportunities** | R1 | FigmAI MCP server for external agent access | [BL-070](#bl-070) |
| | R2 | Multi-model routing strategy | [BL-071](#bl-071) |
| | R3 | Claude 4.6 structured outputs for JSON flows | [BL-072](#bl-072) |
| | R4 | Figma Dev Mode focusedNode | [BL-073](#bl-073) |

**Strategy initiatives (2026)** — Seven prioritized initiatives aligned to backlog:

| Initiative | ID | Link |
|------------|-----|------|
| Design System Guardrails | BL-026 | [BL-026](#bl-026) |
| Dev Handoff Pack | BL-044 | [BL-044](#bl-044) |
| Document Ops | BL-045 | [BL-045](#bl-045) |
| Prompt-to-Flow | BL-046 | [BL-046](#bl-046) |
| Inline Copy Ops | BL-047 | [BL-047](#bl-047) |
| Research-to-Design Bridge | BL-048 | [BL-048](#bl-048) |
| Creative Micro-Tools | BL-049 | [BL-049](#bl-049) |

---

## Backlog Governance

### Modification Rules

1. **Only the Backlog Maintainer may modify this file**
   - The Backlog Maintainer is the Code Steward agent in Execute mode, or an approved human maintainer.
   - Other contributors should propose changes via PRs or issue tracking.
   - AI agents (except Code Steward in Execute mode when applying approved backlog updates) should treat this file read-only and reference items by ID.
   - Direct edits to this file should be rare and deliberate.

2. **Code changes must reference a Backlog ID**
   - Commit messages: `feat: Add feature X (BL-001)`
   - PR titles: `[BL-001] Add feature X`
   - PR descriptions: `Implements BL-001: Add feature X`

3. **Backlog items are promoted, not duplicated**
   - When an item moves from "Later" to "Next", update its status and section
   - Do not create duplicate entries in multiple sections
   - Use status and section changes to track progression

4. **Closed items are archived, not deleted**
   - Move completed items to an "Archived" section or mark as "Done"
   - Preserve historical context and acceptance criteria
   - Archive helps track project velocity and completed work

5. **IDs are never reused**
   - Each Backlog ID (BL-XXX) is unique and permanent
   - Even if an item is cancelled or superseded, its ID remains
   - This ensures traceability and prevents confusion

---

## Scanning Policy

### Canonical Rule

All scan pipelines (CT-A, AT-A, Smart Selector, and any future scan/extraction tool) must pass results through Smart Detector as an enrichment step before delivering data to projections (table views, exports, stage renders).

This rule is gated behind a config flag (`config.contentTable.smartDetectorEnrichment.enabled`, default OFF) until validated end-to-end. When the flag is OFF, scan behavior is unchanged.

### Acceptance Checklist for New Scan Features

Before a new scan feature is merged:

- [ ] Scan output conforms to the canonical item schema (ContentItemV1 or equivalent)
- [ ] Smart Detector enrichment is wired as a post-scan step
- [ ] Enrichment is gated behind config flag (default OFF until validated)
- [ ] Raw fields are preserved; `smart` and `derived` fields are additive only
- [ ] Projections degrade gracefully when enrichment is absent (raw-only mode)
- [ ] Round-trip test: scan → enrich → project produces stable, deterministic output
- [ ] No-op test: flag OFF produces identical output to pre-enrichment baseline

---

## Backlog Workflow

### Item Lifecycle

```
Ideas → Later → Next → Now → Done → Archived
```

**Ideas / Experiments**
- New proposals, research questions, or experimental concepts
- Low commitment, exploratory items
- May be promoted to "Later" if validated

**Later**
- Validated ideas that are not yet prioritized
- Items with clear value but no immediate timeline
- May be promoted to "Next" when capacity allows

**Next**
- Prioritized items ready for implementation
- Clear scope, acceptance criteria, and dependencies resolved
- Promoted to "Now" when work begins

**Now**
- Currently active work items
- Should be limited to 2-5 items to maintain focus
- Moved to "Done" when acceptance criteria are met

**Done**
- Completed items awaiting verification or archival
- Should be moved to "Archived" after verification period

**Archived**
- Historical record of completed work
- Maintained for reference and velocity tracking

### Plan Files

When an item moves from "Next" to "Now":
1. Create a plan file in `docs/plans/` (see Plan File Convention below)
2. Link the plan file in the backlog item's "Notes / Links" column
3. Use the plan file for detailed implementation steps
4. Keep the backlog item updated with status changes

### Relationship to Commits and PRs

- **Backlog Item**: High-level work item with acceptance criteria
- **Plan File**: Detailed implementation steps and technical approach
- **Commit**: Atomic code change referencing Backlog ID
- **PR**: Collection of commits implementing a Backlog item

Example flow:
1. Item BL-001 in "Next" section
2. Plan file created: `docs/plans/BL-001_add-feature-x.plan.md`
3. Commits: `feat: Add feature X (BL-001)`, `test: Add tests for feature X (BL-001)`
4. PR: `[BL-001] Add feature X` with link to plan file
5. Item BL-001 moved to "Done" after PR merge

---

## Status Definitions

| Status | Description | When to Use |
|--------|-------------|-------------|
| **Proposed** | Item is suggested but not yet approved | Initial state for new items in Ideas section |
| **Approved** | Item is validated and ready for prioritization | Item has clear value and acceptance criteria |
| **In Progress** | Active work is happening | Item is in "Now" section and being worked on |
| **Blocked** | Work cannot proceed due to dependency or issue | External blocker or prerequisite missing |
| **Done** | Work is complete, awaiting verification | Acceptance criteria met, PR merged |
| **Archived** | Item is complete and verified | Historical record, no further action needed |
| **Cancelled** | Item is no longer relevant or superseded | Work abandoned or replaced by another item |

---

## Priority Definitions

| Priority | Description | Examples |
|----------|-------------|----------|
| **P0 - Critical** | Blocks core functionality or security issue | Security vulnerabilities, data loss bugs |
| **P1 - High** | Significant user impact or major feature | Core feature improvements, performance issues |
| **P2 - Medium** | Moderate impact or nice-to-have feature | UI polish, minor feature additions |
| **P3 - Low** | Low impact or experimental | Nice-to-have improvements, research items |

**Priority Guidelines:**
- P0 items should be addressed immediately
- P1 items should be planned for next sprint/cycle
- P2 items can be scheduled when capacity allows
- P3 items are optional and may be deferred indefinitely

---

## Backlog Sections

### Now

Active work items currently being implemented. Limit to 2-5 items to maintain focus.

| ID | Title | Priority | Status | Owner | Acceptance Criteria | Notes / Links |
|----|-------|----------|--------|-------|---------------------|---------------|
| BL-004 | Display build/version number in Settings modal | P1 | Proposed | Unassigned | Settings modal shows plugin version/build that matches build artifacts and git tag | |
| BL-054 | Wire excluded test files into `npm test` | P0 | Proposed | Unassigned | All 5 excluded test files (`smartDetector`, `projection`, `reportFormat`, `enhancers`, `auth-middleware`) run in `npm test`; failures fixed or documented | Source: O1 / audit C5. See [details](#bl-054). |

---

### Next

Prioritized items ready for implementation. These should have clear scope and acceptance criteria.

| ID | Title | Priority | Status | Owner | Acceptance Criteria | Notes / Links |
|----|-------|----------|--------|-------|---------------------|---------------|
| BL-007 | Improve assistant accuracy and usefulness across all assistants | P1 | Proposed | Unassigned | Each assistant has clearer scope, fewer ambiguous responses, and better task completion rates | Umbrella. Related: [BL-026](#bl-026) (DS guardrails), [BL-044](#bl-044)–[BL-049](#bl-049) (strategy initiatives). |
| BL-008 | Create Figma-stage UI components aligned to plugin design direction | P2 | Proposed | Unassigned | Components feel cohesive, usable, and ready for real design workflows | |
| BL-026 | Design system KB and guardrails (first-class type + DS-only enforcement) | P1 | Backlog | Unassigned | Design system as first-class KB type; enforce DS-only components/tokens where DS is active; nearest-DS-match suggestions; DS compliance auditing (tool-only where possible). | Source: D1. Depends on BL-001 for full guardrails. See [details](#bl-026). |
| BL-050 | Smart Detector as canonical scan enrichment layer | P1 | Proposed | Unassigned | Every scan pipeline passes through Smart Detector enrichment; SSOT schema gains optional `smart`/`derived` fields; flag-gated (default OFF); projections degrade gracefully. | Source: M1. See [details](#bl-050). |
| BL-053 | Resolve config-api vs ace-lambda convergence | P1 | Proposed | Unassigned | Single canonical Lambda API serves ACE; duplicate API retired or explicitly scoped; JS schema duplication eliminated | Source: P1 / audit C4. See [details](#bl-053). |
| BL-055 | Adopt test framework with coverage reporting | P1 | Proposed | Unassigned | Vitest (or equivalent) replaces ad-hoc `tsx` test runner; coverage reports generated; non-blocking metric initially | Source: O2 / audit H1. See [details](#bl-055). |
| BL-056 | Add provider routing integration tests | P1 | Proposed | Unassigned | Integration test validates all connection mode × provider combinations; no silent routing regressions | Source: O3 / audit H2. See [details](#bl-056). |
| BL-057 | Create knowledge system documentation | P2 | Proposed | Unassigned | `docs/knowledge-system.md` explains three knowledge layers, build-time flow, and current wiring status | Source: Q1 / audit H3. See [details](#bl-057). |
| BL-059 | Upgrade Lambda to Node.js 22 + ARM64 | P1 | Proposed | Unassigned | Both SAM templates use `nodejs22.x` and `arm64`; cold start and cost improvements verified | Source: P2 / audit H5. See [details](#bl-059). |
| BL-060 | Upgrade `@figma/plugin-typings` to latest | P1 | Proposed | Unassigned | Typings updated; new APIs (Auto Layout v5, variables, Dev Mode focusedNode) audited for applicability | Source: P3 / audit H6. See [details](#bl-060). |
| BL-072 | Evaluate Claude 4.6 structured outputs for JSON flows | P1 | Proposed | Unassigned | PoC replaces repair/retry ladder for scorecard/design-spec JSON with constrained decoding; measures reliability delta | Source: R3 / audit. See [details](#bl-072). |

---

### Later

Validated items that are not yet prioritized. May be promoted to "Next" when capacity allows.

| ID | Title | Priority | Status | Owner | Acceptance Criteria | Notes / Links |
|----|-------|----------|--------|-------|---------------------|---------------|
| BL-005 | Public HTML marketing website for FigmAI plugin | P2 | Proposed | Unassigned | Static site exists with overview, feature list, screenshots, docs links, and contact info | |
| BL-006 | HTML admin/editor interface for custom config and knowledge files | P2 | Done | Unassigned | Editors can update content through UI, with validation and export back to source format | Implemented via ACE (Admin Config Editor). |
| BL-011 | AT-A (Analytics Tagging Assistant) placeholder — improvements/known issues, details TBD | P2 | Proposed | Unassigned | Placeholder tracked; scope and acceptance criteria to be defined. | |
| BL-012 | ACE: AI settings tab + Internal API activation without requiring Test Connection | P2 | Proposed | Unassigned | ACE has an AI settings tab; internal API can be activated without mandatory Test Connection. | |
| BL-013 | ACE: Assistants wizard UX + "How Assistants work" documentation | P2 | Proposed | Unassigned | Wizard UX is improved; "How Assistants work" doc exists and is discoverable. | |
| BL-014 | ACE: Apply same UX improvements to Design Systems section | P2 | Proposed | Unassigned | Design Systems section has UX improvements aligned with other ACE sections. | |
| BL-015 | ACE: Roles/permissions (Owner/Editor/Reviewer) | P2 | Proposed | Unassigned | ACE supports Owner, Editor, and Reviewer roles with appropriate permissions. | |
| BL-016 | ACE: Versioning, backup, and revert | P2 | Backlog | Unassigned | Backups/snapshots (build #, timestamp, user, summary, diff); build-linked snapshots; user attribution (change set, before/after). Users can create backups, view version history, and revert. | Merged: E1, E2, E3. See [details](#bl-016-expanded). |
| BL-017 | ACE: Internal hosting guidance (local → intranet) | P2 | Backlog | Unassigned | Secure intranet hosting: multi-user, auth, roles. Documentation or tooling for local → internal work environment. | Merged: G1. See [details](#bl-017-expanded). |
| BL-018 | ACE: Upgrade strategy + visible ACE build/version number in ACE UI | P2 | Proposed | Unassigned | Upgrade strategy is documented; ACE UI displays build/version number. | |
| BL-019 | ACE: Simple backlog page viewer/editor | P2 | Proposed | Unassigned | ACE has a dedicated page that views backlog.md; editing limited to Owner/Editor when roles exist (viewer-only acceptable initially). Scope limited to backlog.md only. | |
| BL-020 | Full Plugin + LLM interaction audit | P1 | Backlog | Unassigned | Sequence diagram, file/module map, prompt + response pipeline breakdown; audit request packaging, KB attachment, parsing, errors, retry, token limits. | Source: A1. See [details](#bl-020). |
| BL-021 | Editor-friendly assistant configuration model | P2 | Backlog | Unassigned | Structured fields, presets, advanced mode, inline examples for non-technical editors. | Source: B1. Partially implemented: toolSettings + structured instructions exist in manifest/ACE. See [details](#bl-021). |
| BL-022 | Assistant query structure definition | P2 | Backlog | Unassigned | Canonical JSON prompt schema: system/task/context/KB/schema/validation. | Source: B2. See [details](#bl-022). |
| BL-023 | KB structure standard | P2 | Backlog | Unassigned | Standard sections: purpose, scope, definitions, rules, do/don't, examples, edge, accessibility, dark-mode, compliance. | Source: C1. See [details](#bl-023). |
| BL-024 | KB builder template | P2 | Backlog | Unassigned | ACE guided builder → markdown/JSON output. | Source: C2. See [details](#bl-024). |
| BL-025 | External KB import/parsing | P2 | Backlog | Unassigned | Upload, preview, normalize, approval, save for external KBs. | Source: C3. See [details](#bl-025). |
| BL-027 | Component library import | P2 | Backlog | Unassigned | Scrape libraries; JSON import; bulk import; manual fallback. | Source: D2. See [details](#bl-027). |
| BL-028 | Multi-design-system switching | P2 | Backlog | Unassigned | Profiles; active selector; DS-scoped KB/registry/rules. | Source: D3. See [details](#bl-028). |
| BL-029 | Assistant test harness | P2 | Backlog | Unassigned | Prompt sets, expected patterns, schema validation, scorecards, regression. | Source: F1. See [details](#bl-029). |
| BL-030 | Automated LLM evaluation metrics | P2 | Backlog | Unassigned | Format/rule compliance, KB citation use, hallucination flags, missing fields. | Source: F2. See [details](#bl-030). |
| BL-031 | Source control workflow | P2 | Backlog | Unassigned | OSS repo + internal fork/mirror; safe update flow. | Source: G2. See [details](#bl-031). |
| BL-032 | Config isolation outside code dir | P2 | Backlog | Unassigned | Separate /plugin-code, /ace-config, /design-system-data, /kb-data. | Source: G3. See [details](#bl-032). |
| BL-033 | First-party analytics | P2 | Backlog | Unassigned | Usage, errors, latency, outcomes (no third-party tools). | Source: H1. See [details](#bl-033). |
| BL-034 | ACE analytics dashboard | P2 | Backlog | Unassigned | Charts, logs, assistant performance, adoption. | Source: H2. See [details](#bl-034). |
| BL-035 | Assistant contribution intake | P2 | Backlog | Unassigned | Submission intake: assistant config, KB, schema, tests. | Source: I1. See [details](#bl-035). |
| BL-036 | Contribution validation pipeline | P2 | Backlog | Unassigned | Automated tests, schema checks, safety checks, manual approval. | Source: I2. See [details](#bl-036). |
| BL-037 | Content table manager | P2 | Backlog | Unassigned | Sync from plugin, editable, export. | Source: J1. Partially implemented: ACE structured editor for content models exists. See [details](#bl-037). |
| BL-038 | Analytics tag table manager | P2 | Backlog | Unassigned | Registry, rules, sync. | Source: J2. See [details](#bl-038). |
| BL-039 | Multi-format export (content/analytics) | P2 | Backlog | Unassigned | JSON/XML/mobile/CMS export. | Source: J3. See [details](#bl-039). |
| BL-040 | DB-level versioning (content/analytics) | P2 | Backlog | Unassigned | History, diff, rollback, attribution, locking/conflicts. | Source: J4. See [details](#bl-040). |
| BL-041 | External architecture review agent | P2 | Backlog | Unassigned | Tooling/scalability/safety/UX/automation review; run at major releases/quarterly/milestones. | Source: K1. See [details](#bl-041). |
| BL-044 | Dev Handoff Pack | P2 | Backlog | Unassigned | Structured handoff artifacts (specs, tokens, components) for dev consumption. | Strategy 2026. See [details](#bl-044). |
| BL-045 | Document Ops | P2 | Backlog | Unassigned | Document operations with tool-only where possible; optional LLM suggestions clearly separated. | Strategy 2026. See [details](#bl-045). |
| BL-046 | Prompt-to-Flow | P2 | Backlog | Unassigned | Bounded flow generation from prompts; DS-constrained and schema-driven; demos/workshops scope. | Strategy 2026. See [details](#bl-046). |
| BL-047 | Inline Copy Ops | P2 | Backlog | Unassigned | Inline copy editing and operations in design context. | Strategy 2026. See [details](#bl-047). |
| BL-048 | Research-to-Design Bridge | P2 | Backlog | Unassigned | Bridge research insights into design artifacts and assistant context. | Strategy 2026. See [details](#bl-048). |
| BL-049 | Creative Micro-Tools | P3 | Backlog | Unassigned | Optional micro-tools and ideas for creative workflows. | Strategy 2026. See [details](#bl-049). |
| BL-058 | Archive or update ASSISTANT_DESIGN.md | P2 | Backlog | Unassigned | `ASSISTANT_DESIGN.md` either archived with "historical" banner or updated to match actual handler registry (8 active assistants) | Source: Q2 / audit H4. See [details](#bl-058). |
| BL-061 | Standardize error handling patterns | P2 | Backlog | Unassigned | Shared error helpers (`isContentFilterError`, `toUserMessage`) created; applied incrementally across main thread and UI | Source: Q4 / audit M1. See [details](#bl-061). |
| BL-063 | Resolve disabled content model placeholders | P3 | Backlog | Unassigned | Content models 2–5 either implemented or removed; no placeholder entries cause confusion | Source: audit M4. See [details](#bl-063). |
| BL-064 | Document build pipeline ordering and watch-mode gaps | P2 | Backlog | Unassigned | Generator ordering documented in `docs/build-pipeline.md` or `package.json`; watch-mode skip list documented | Source: Q3 / audit M5+M6. See [details](#bl-064). |
| BL-065 | Archive deprecated Spring wrapper | P2 | Backlog | Unassigned | `enterprise/ace-spring-wrapper/` moved to `_deprecated/` or separate archive repo; deprecation banners already in place | Source: P4 / audit M7. See [details](#bl-065). |

#### Merged & new item details

Standard fields for merged and newly added items: **Problem/Goal**, **Scope**, **Deliverables**, **Dependencies**, **Owner**, **Status**.

##### BL-016 (expanded) {#bl-016-expanded}

- **Problem / Goal:** ACE config changes need safety and traceability: backups, version history, and user attribution so teams can revert and audit.
- **Scope:** ACE only. Backups/snapshots; build-linked snapshots; user attribution on change sets.
- **Deliverables:** (E1) Backups/snapshots with build #, timestamp, user, summary, diff. (E2) Build-linked snapshots tied to last successful compile/install. (E3) User attribution: change set + before/after.
- **Dependencies:** ACE save/load pipeline; optional build-info integration.
- **Owner:** Unassigned. **Status:** Backlog.

##### BL-017 (expanded) {#bl-017-expanded}

- **Problem / Goal:** Teams need to host ACE on intranet with secure access, multi-user, auth, and roles—not just local.
- **Scope:** ACE hosting and deployment. Documentation and/or tooling.
- **Deliverables:** Guidance or implementation for secure intranet hosting: multi-user, auth, roles. Clear path from local → internal work environment.
- **Dependencies:** ACE auth/RBAC; deployment docs.
- **Owner:** Unassigned. **Status:** Backlog.

##### BL-020 {#bl-020}

- **Problem / Goal:** Document and audit the full Plugin + LLM interaction so the pipeline is understandable and improvable.
- **Scope:** Plugin: UI → assistant layer → prompt builder → LLM → parser → renderer. Shared: request/response contracts.
- **Deliverables:** Sequence diagram; file/module responsibility map; prompt construction pipeline breakdown; response parsing pipeline breakdown. Audit: request packaging, instruction injection, response format requirements, KB attachment/ref, metadata, parsing/rendering, error handling, retry, token/size limits.
- **Dependencies:** None. **Owner:** Unassigned. **Status:** Backlog.

##### BL-021 {#bl-021}

- **Problem / Goal:** Non-technical editors need to configure assistants without editing raw JSON.
- **Scope:** ACE assistant configuration UI. Plugin may consume the resulting config.
- **Deliverables:** Editor-friendly model: structured fields, presets, advanced mode, inline examples.
- **Dependencies:** Assistant schema and ACE config model. **Owner:** Unassigned. **Status:** Backlog.

##### BL-022 {#bl-022}

- **Problem / Goal:** Standardize how assistant prompts are structured for consistency and tooling.
- **Scope:** Canonical prompt schema used by Plugin and optionally ACE.
- **Deliverables:** Assistant query structure definition: canonical JSON prompt schema (system/task/context/KB/schema/validation).
- **Dependencies:** BL-020 (audit) helps inform schema. **Owner:** Unassigned. **Status:** Backlog.

##### BL-023 {#bl-023}

- **Problem / Goal:** Knowledge bases need a consistent structure for quality and tooling.
- **Scope:** KB content standard (Plugin + ACE).
- **Deliverables:** KB structure standard: purpose, scope, definitions, rules, do/don't, examples, edge cases, accessibility, dark-mode, compliance.
- **Dependencies:** None. **Owner:** Unassigned. **Status:** Backlog.

##### BL-024 {#bl-024}

- **Problem / Goal:** Enable guided creation of KBs in ACE.
- **Scope:** ACE. Output: markdown/JSON compatible with Plugin.
- **Deliverables:** KB builder template: ACE guided builder → markdown/JSON.
- **Dependencies:** BL-023 (structure standard). **Owner:** Unassigned. **Status:** Backlog.

##### BL-025 {#bl-025}

- **Problem / Goal:** Support importing external KBs into ACE with validation.
- **Scope:** ACE: upload, preview, normalize, approval, save.
- **Deliverables:** External KB import/parsing: upload, preview, normalize, approval, save.
- **Dependencies:** BL-023. **Owner:** Unassigned. **Status:** Backlog.

##### BL-026 {#bl-026}

- **Problem / Goal:** Treat design system as a first-class KB type and enforce guardrails so assistant outputs stay within the active design system where DS is enabled.
- **Scope:** ACE + Plugin. Design system KB type; enforcement and auditing in plugin (tool-only where possible).
- **Deliverables:** (1) Design system KB as first-class KB type in ACE and Plugin. (2) Enforce DS-only components/tokens in assistant outputs when a design system is active. (3) "Nearest DS match" suggestions on violations/deviations. (4) DS compliance auditing exposed as tool-only actions (no LLM where possible). (5) Clear separation of tool-only vs LLM-assisted paths.
- **Dependencies:** BL-001 must be completed for full DS guardrails (tool invocation for DS availability). Design system registry and KB structure. **Owner:** Unassigned. **Status:** Backlog.

##### BL-027 {#bl-027}

- **Problem / Goal:** Ingest component libraries into the design system layer.
- **Scope:** Plugin/ACE. Multiple ingestion paths.
- **Deliverables:** Component library import: scrape libraries; JSON import; bulk import; manual fallback.
- **Dependencies:** BL-026; design system registry. **Owner:** Unassigned. **Status:** Backlog.

##### BL-028 {#bl-028}

- **Problem / Goal:** Support multiple design systems with clear active context.
- **Scope:** Plugin + ACE. Profiles and scoping.
- **Deliverables:** Multi-design-system switching: profiles; active selector; DS-scoped KB/registry/rules.
- **Dependencies:** BL-026; registry model. **Owner:** Unassigned. **Status:** Backlog.

##### BL-029 {#bl-029}

- **Problem / Goal:** Regress and validate assistant behavior with repeatable tests.
- **Scope:** Shared/Plugin. Test harness for assistants.
- **Deliverables:** Assistant test harness: prompt sets, expected patterns, schema validation, scorecards, regression.
- **Dependencies:** BL-022 (query structure). **Owner:** Unassigned. **Status:** Backlog.

##### BL-030 {#bl-030}

- **Problem / Goal:** Measure assistant output quality automatically.
- **Scope:** Shared. Metrics and tooling.
- **Deliverables:** Automated evaluation metrics: format/rule compliance, KB citation use, hallucination flags, missing fields.
- **Dependencies:** BL-029 (harness). **Owner:** Unassigned. **Status:** Backlog.

##### BL-031 {#bl-031}

- **Problem / Goal:** Safe source control for OSS + internal use.
- **Scope:** Repo and deployment workflow.
- **Deliverables:** Source control workflow: OSS repo + internal fork/mirror; safe update flow.
- **Dependencies:** None. **Owner:** Unassigned. **Status:** Backlog.

##### BL-032 {#bl-032}

- **Problem / Goal:** Keep config and data outside plugin code dir for security and portability.
- **Scope:** Deployment and directory layout.
- **Deliverables:** Config isolation: /plugin-code, /ace-config, /design-system-data, /kb-data (or equivalent).
- **Dependencies:** BL-017; deployment docs. **Owner:** Unassigned. **Status:** Backlog.

##### BL-033 {#bl-033}

- **Problem / Goal:** First-party analytics only—no third-party tools.
- **Scope:** Plugin + ACE. Usage, errors, latency, outcomes.
- **Deliverables:** First-party analytics: usage, errors, latency, outcomes.
- **Dependencies:** Analytics endpoint and schema. **Owner:** Unassigned. **Status:** Backlog.

##### BL-034 {#bl-034}

- **Problem / Goal:** Give operators a single place to see ACE analytics.
- **Scope:** ACE. Dashboard UI.
- **Deliverables:** ACE analytics dashboard: charts, logs, assistant performance, adoption.
- **Dependencies:** BL-033. **Owner:** Unassigned. **Status:** Backlog.

##### BL-035 {#bl-035}

- **Problem / Goal:** Accept assistant contributions in a structured way.
- **Scope:** Intake system (ACE or standalone).
- **Deliverables:** Submission intake: assistant config, KB, schema, tests.
- **Dependencies:** Assistant schema; BL-021/BL-022. **Owner:** Unassigned. **Status:** Backlog.

##### BL-036 {#bl-036}

- **Problem / Goal:** Validate contributions before adoption.
- **Scope:** Pipeline after intake.
- **Deliverables:** Validation pipeline: automated tests, schema checks, safety checks, manual approval.
- **Dependencies:** BL-029; BL-035. **Owner:** Unassigned. **Status:** Backlog.

##### BL-037 {#bl-037}

- **Problem / Goal:** Manage content tables in ACE with sync from plugin.
- **Scope:** ACE. Content table manager.
- **Deliverables:** Content table manager: sync from plugin, editable, export.
- **Dependencies:** Content models and plugin sync. **Owner:** Unassigned. **Status:** Backlog.

##### BL-038 {#bl-038}

- **Problem / Goal:** Manage analytics tag tables (registry, rules, sync).
- **Scope:** ACE. Analytics tag table manager.
- **Deliverables:** Analytics tag table manager: registry, rules, sync.
- **Dependencies:** Analytics tagging spec. **Owner:** Unassigned. **Status:** Backlog.

##### BL-039 {#bl-039}

- **Problem / Goal:** Export content and analytics data in multiple formats.
- **Scope:** ACE (and plugin export if applicable).
- **Deliverables:** Multi-format export: JSON/XML/mobile/CMS.
- **Dependencies:** BL-037; BL-038. **Owner:** Unassigned. **Status:** Backlog.

##### BL-040 {#bl-040}

- **Problem / Goal:** Version content/analytics tables with history, rollback, attribution.
- **Scope:** ACE (and storage layer). DB-level versioning.
- **Deliverables:** DB-level versioning: history, diff, rollback, attribution, locking/conflicts.
- **Dependencies:** BL-037; BL-038. **Owner:** Unassigned. **Status:** Backlog.

##### BL-041 {#bl-041}

- **Problem / Goal:** Periodic external review of architecture for tooling, scalability, safety, UX, automation.
- **Scope:** Process. No code ownership in backlog.
- **Deliverables:** External architecture review agent (or process): tooling, scalability, safety, UX, automation; run at major releases/quarterly/milestones.
- **Dependencies:** None. **Owner:** Unassigned. **Status:** Backlog.

##### BL-044 {#bl-044}

- **Problem / Goal:** Provide structured handoff artifacts for developers (specs, tokens, components).
- **Scope:** Plugin (and optionally ACE). Outputs consumed by dev tooling.
- **Deliverables:** Dev Handoff Pack: structured artifacts (specs, design tokens, component metadata) suitable for dev consumption. executionType and scope TBD per action (tool-only preferred where possible).
- **Dependencies:** None. **Owner:** Unassigned. **Status:** Backlog.

##### BL-045 {#bl-045}

- **Problem / Goal:** Document operations (export, sync, format) with minimal LLM use where deterministic behavior is sufficient.
- **Scope:** Plugin. Document ops as tool-only where possible; LLM only for optional suggestions.
- **Deliverables:** Document Ops: tool-only operations clearly separated from optional LLM-suggestion paths. No runtime JSON reads or dynamic prompt mutation; assistants and KBs remain reference-only and build-time configured.
- **Dependencies:** None. **Owner:** Unassigned. **Status:** Backlog.

##### BL-046 {#bl-046}

- **Problem / Goal:** Bounded flow/screen generation from natural-language prompts for demos and workshops.
- **Scope:** Plugin. Bounded; DS-constrained and schema-driven. Demos/workshops only (not general-purpose).
- **Deliverables:** Prompt-to-Flow: generate flows/screens from prompts within DS and schema constraints. Scope limited to demos and workshops; no open-ended generation.
- **Dependencies:** BL-026 (DS guardrails) for DS-constrained output. **Owner:** Unassigned. **Status:** Backlog.

##### BL-047 {#bl-047}

- **Problem / Goal:** Inline copy editing and operations in design context.
- **Scope:** Plugin. Inline copy ops (edit, suggest, replace) in Figma text/copy context.
- **Deliverables:** Inline Copy Ops: operations on copy within design layers; executionType and scope TBD (tool-only vs LLM per action).
- **Dependencies:** None. **Owner:** Unassigned. **Status:** Backlog.

##### BL-048 {#bl-048}

- **Problem / Goal:** Bridge research insights into design artifacts and assistant context.
- **Scope:** Plugin (and optionally ACE). Research inputs → design-relevant context.
- **Deliverables:** Research-to-Design Bridge: ingest or reference research (user studies, findings) and surface to design assistants/context; no tone or output-shape rules in KBs (reference-only).
- **Dependencies:** None. **Owner:** Unassigned. **Status:** Backlog.

##### BL-049 {#bl-049}

- **Problem / Goal:** Optional micro-tools and ideas for creative workflows.
- **Scope:** Plugin. Ideas/experiments; low commitment.
- **Deliverables:** Creative Micro-Tools: optional ideas for small creative utilities (e.g. variations, naming, micro-edits). P3; may be deferred or refined into concrete items.
- **Dependencies:** None. **Owner:** Unassigned. **Status:** Backlog.

##### BL-050 {#bl-050}

- **Problem / Goal:** CT-A, AT-A, Smart Selector, and future scan tools each extract raw data independently. Smart Detector classifications (element kind, confidence, content role) are not available to other scan pipelines, leading to duplicated heuristics and inconsistent enrichment. All scans must run through Smart Detector going forward.
- **Scope — In:**
  - Define `SmartEnrichmentBlock` type (kind, confidence, derivedRole, flags).
  - Add optional `smart` field to `ContentItemV1` (non-breaking; existing raw fields preserved).
  - Add optional `derived` fields (e.g. `derived.role`, `derived.category`).
  - Create `enrichScanResults(items)` pure function that calls SD classifier.
  - Gate behind config flag: `config.contentTable.smartDetectorEnrichment.enabled` (default OFF).
  - Wire into CT-A handler post-scan (after exclusion rules, before UI delivery).
  - Wire into AT-A handler post-scan (same pattern).
  - Projections consume either raw-only or smart-enriched data.
  - Tests: scan → enrich → projection stable and deterministic; no behavior change when flag OFF.
- **Scope — Out:** Refactoring Smart Detector internals; changing SD classification logic; cross-session persistence; any LLM involvement.
- **Deliverables:** SmartEnrichmentBlock type, enrichScanResults function, config flag, handler wiring, projection fallback, tests.
- **Dependencies:** None (Smart Detector already exists and is callable). **Owner:** Unassigned. **Status:** Proposed.
- **Risk level:** Demo-safe when flag is OFF (default). Feature-flag gated.

##### BL-051 {#bl-051}

- **Problem / Goal:** `main.ts` is a 2,114-line monolith containing all message routing, provider lifecycle, chat history, tool dispatch, stage rendering, and settings. Extremely hard to test in isolation, review safely, or onboard new contributors. High risk of silent regressions.
- **Scope:** Plugin `src/main.ts` extraction. Preserve orchestrator pattern.
- **Deliverables:** Extract message handlers, provider lifecycle, chat state, and tool dispatch into focused modules. `main.ts` becomes a thin orchestrator. Each extracted concern independently testable.
- **Dependencies:** None. **Owner:** Unassigned. **Status:** Proposed.

##### BL-052 {#bl-052}

- **Problem / Goal:** `ui.tsx` is 5,553 lines — the entire plugin UI in one Preact component file. Contains duplicated logic (`cleanChatContent` exists in both `main.ts` and `ui.tsx` with different behavior). A global `fetch` wrapper at module load affects all network calls.
- **Scope:** Plugin `src/ui.tsx` extraction.
- **Deliverables:** Extract panel components (settings, analytics tagging, content table, chat) into dedicated files. Unify `cleanChatContent` into a shared utility.
- **Dependencies:** None. **Owner:** Unassigned. **Status:** Proposed.

##### BL-053 {#bl-053}

- **Problem / Goal:** Two parallel Lambda APIs with different contracts. `infra/config-api/` (TypeScript, `/api/*`) and `infra/ace-lambda/` (JavaScript, `/figma-admin/api/*`) serve overlapping purposes with different auth models, path prefixes, and feature sets. `ace-lambda` ports schemas from `shared/ace-config/` as JS copies, creating drift risk.
- **Scope:** Infrastructure convergence decision + implementation.
- **Deliverables:** Converge on single canonical Lambda API; retire or explicitly scope the other; eliminate JS schema duplication by having the canonical API consume the shared TS package at build time.
- **Dependencies:** None. **Owner:** Unassigned. **Status:** Proposed.

##### BL-054 {#bl-054}

- **Problem / Goal:** Five test files exist but are not wired into `npm test`: `smartDetector.test.ts`, `projection.test.ts`, `reportFormat.test.ts`, `enhancers.test.ts`, and `auth-middleware.test.ts`. These tests never run in CI or local validation.
- **Scope:** Test configuration in `package.json`.
- **Deliverables:** All 5 test files included in `npm test`. Failures fixed or documented.
- **Dependencies:** None. **Owner:** Unassigned. **Status:** Proposed.

##### BL-055 {#bl-055}

- **Problem / Goal:** No test coverage tooling. Tests are `tsx` scripts with `console.log` assertions. No way to measure regression safety or track coverage trends.
- **Scope:** Test infrastructure upgrade.
- **Deliverables:** Adopt Vitest (lightweight, TS-native, compatible with current `tsx` runner). Add coverage reporting as a non-blocking metric initially.
- **Dependencies:** BL-054 (wire existing tests first). **Owner:** Unassigned. **Status:** Proposed.

##### BL-056 {#bl-056}

- **Problem / Goal:** Five provider implementations (InternalApi, Proxy, Claude, Copilot, Stub) with precedence rules that differ by connection mode. No integration tests validate the routing matrix.
- **Scope:** Provider routing test suite.
- **Deliverables:** Integration test that validates all connection mode × provider combinations against expected provider selection. No silent routing regressions.
- **Dependencies:** None. **Owner:** Unassigned. **Status:** Proposed.

##### BL-057 {#bl-057}

- **Problem / Goal:** Three separate knowledge mechanisms exist: `src/assistants/*.md` (base prompts), `custom/knowledge/*.md` (overlays), `custom/knowledge-bases/*.kb.json` (structured KBs). No single document explains when to use which, how they interact in the build pipeline, or what "not yet runtime-wired" means for KB contribution.
- **Scope:** Documentation only.
- **Deliverables:** `docs/knowledge-system.md` guide explaining the three layers, their build-time flow, and current wiring status.
- **Dependencies:** None. **Owner:** Unassigned. **Status:** Proposed.

##### BL-058 {#bl-058}

- **Problem / Goal:** `ASSISTANT_DESIGN.md` documents 9 assistants; the actual handler registry runs 8 different ones. UX Copy Review, Dev Handoff, and Accessibility have KB markdown but no handlers. Code2Design and Spell Check are catalogued but have no handler or KB.
- **Scope:** Documentation hygiene.
- **Deliverables:** Archive `ASSISTANT_DESIGN.md` with "historical" banner, or update to match actual handler registry. Reference `src/assistants/assistants.md` as the new registry authority.
- **Dependencies:** None. **Owner:** Unassigned. **Status:** Proposed.

##### BL-059 {#bl-059}

- **Problem / Goal:** SAM templates specify `nodejs20.x`. Node 22 is now the recommended Lambda runtime with better cold start performance and active LTS support.
- **Scope:** Both SAM templates (`infra/config-api/template.yaml`, `infra/ace-lambda/template.yaml`).
- **Deliverables:** Upgrade to `nodejs22.x` and `arm64` (Graviton) architecture. Verify cold start and cost improvements.
- **Dependencies:** None. **Owner:** Unassigned. **Status:** Proposed.

##### BL-060 {#bl-060}

- **Problem / Goal:** `@figma/plugin-typings` at v1.109.0. Figma has released significant API updates in 2026 including Auto Layout v5, extended variable collections, draw features, and Dev Mode focused-node support.
- **Scope:** Plugin typings upgrade and API audit.
- **Deliverables:** Upgrade to latest typings. Audit changelog for new APIs that enable better selection context, design token extraction, and annotation capabilities. Document applicable new APIs.
- **Dependencies:** None. **Owner:** Unassigned. **Status:** Proposed.

##### BL-061 {#bl-061}

- **Problem / Goal:** Error handling inconsistency. Main thread uses `ProviderError` + `errorToString` + `categorizeError`. UI uses mixed `error: unknown`, `clipboardError`, and empty catches. No shared error policy.
- **Scope:** Incremental error handling standardization.
- **Deliverables:** Small shared error helpers (`isContentFilterError`, `toUserMessage`). Applied incrementally, not as a sweeping refactor.
- **Dependencies:** None. **Owner:** Unassigned. **Status:** Proposed.

##### BL-062 {#bl-062}

- **Problem / Goal:** `preparePayloadTier1` exported from `contentSafety/index.ts` but apparently unused. Recovery path goes through the prompt pipeline, not Tier 1 directly.
- **Scope:** Dead code audit.
- **Deliverables:** Verify if dead code. If so, remove from exports. If reserved for future use, add comment explaining why.
- **Dependencies:** None. **Owner:** Unassigned. **Status:** Proposed.

##### BL-063 {#bl-063}

- **Problem / Goal:** Content models 2–5 in `docs/content-models.md` are disabled placeholders. Only universal, mobile, simple-worksheet, content-only, and analytics-tagging presets are enabled.
- **Scope:** Content model cleanup.
- **Deliverables:** Either implement or remove placeholder entries to reduce confusion.
- **Dependencies:** None. **Owner:** Unassigned. **Status:** Proposed.

##### BL-064 {#bl-064}

- **Problem / Goal:** The `prebuild` chain is a single long `&&`-chained command. Generator order matters (assistants before custom overlay, etc.) but this is implicit, not documented. `watch` mode runs a partial prebuild, which can cause stale generated code during development.
- **Scope:** Documentation.
- **Deliverables:** Brief `docs/build-pipeline.md` or `package.json` comment explaining generator ordering and dependencies. Document which generators are skipped in watch mode and when a full rebuild is needed.
- **Dependencies:** None. **Owner:** Unassigned. **Status:** Proposed.

##### BL-065 {#bl-065}

- **Problem / Goal:** `enterprise/ace-spring-wrapper/` is deprecated but substantial (Java/Spring Boot, Docker, Maven, tests). Adds repo size and confusion despite deprecation banners.
- **Scope:** Repo hygiene.
- **Deliverables:** Move to `_deprecated/` directory or separate archive repo. Deprecation banners already in place in docs.
- **Dependencies:** None. **Owner:** Unassigned. **Status:** Proposed.

##### BL-070 {#bl-070}

- **Problem / Goal:** Figma has an official MCP server (Feb 2026). FigmAI could expose its own MCP server surface to let external AI agents (Claude Code, Cursor) trigger FigmAI assistants, read content tables, or query DS compliance from IDE contexts. This would position FigmAI as the "design intelligence API."
- **Scope:** Exploration / PoC.
- **Deliverables:** PoC MCP server that exposes at least one assistant action and one data query (e.g., content table read, DS compliance check) to external agents.
- **Dependencies:** None. **Owner:** Unassigned. **Status:** Proposed.

##### BL-071 {#bl-071}

- **Problem / Goal:** With Claude 4.6 Opus/Sonnet and GPT-5/5.4/5-mini/5-nano all available, FigmAI could offer model selection per assistant or auto-routing based on task complexity. Structured output tasks → Claude Opus w/ structured outputs. Fast chat → GPT-5-mini. Vision → best vision model.
- **Scope:** Architecture design + PoC.
- **Deliverables:** Architecture doc for per-assistant or auto-routed model selection. PoC with at least two models for different task types.
- **Dependencies:** Provider routing system. **Owner:** Unassigned. **Status:** Proposed.

##### BL-072 {#bl-072}

- **Problem / Goal:** Claude 4.6 Structured Outputs (GA) guarantees schema-compliant JSON via constrained decoding. This eliminates the repair/retry ladder currently needed for Design Critique scorecards, Design Workshop specs, and other structured outputs.
- **Scope:** PoC for scorecard and design-spec JSON flows.
- **Deliverables:** PoC replacing `parseScorecardJson` repair logic with constrained decoding. Measure reliability improvement. If successful, apply to all structured-response flows.
- **Dependencies:** Claude 4.6 provider support. **Owner:** Unassigned. **Status:** Proposed.

##### BL-073 {#bl-073}

- **Problem / Goal:** Figma Dev Mode now exposes `focusedNode` API. Plugins can read the focused node in Dev Mode, enabling contextual assistant actions in the developer workflow.
- **Scope:** Exploration / PoC.
- **Deliverables:** PoC demonstrating contextual assistant action triggered by Dev Mode focused node (e.g., show component specs, DS compliance, or content extraction for focused element).
- **Dependencies:** BL-060 (typings upgrade). **Owner:** Unassigned. **Status:** Proposed.

---

### Bugs

Known issues and defects that need to be addressed.

| ID | Title | Priority | Status | Owner | Acceptance Criteria | Notes / Links |
|----|-------|----------|--------|-------|---------------------|---------------|
| BL-001 | DCA does not invoke DESIGN_SYSTEM_QUERY for DS availability questions | P1 | Blocked | Unassigned | See details below | DS enforcement implementation session |
| BL-002 | Plugin-generated elements are not placed at intended canvas locations | P2 | Approved | Unassigned | Generated elements appear in predictable, user-intended positions (substantially improved). Remaining edge-case testing and refinements deferred. | Partially addressed; placement now working much better. Remaining testing/refinements deferred; deprioritized for now. |
| BL-003 | Processing animation donut does not animate | P2 | Proposed | Unassigned | Processing indicator animates smoothly while async operations are running | |
| BL-042 | Errors: GROUP selection causes sub-screen duplication (post-demo) | P2 | Proposed | Unassigned | See details below | Post-demo; selection resolution |
| BL-043 | Errors: Intermittent "Error: not a function" on Quick Action click (post-demo) | P2 | Proposed | Unassigned | See details below | Post-demo; handler init/guard |

#### BL-001: DCA does not invoke DESIGN_SYSTEM_QUERY for DS availability questions

**Summary / Problem Statement:**

When asking the Design Critique Assistant (DCA) "What design system components are available?", the assistant responds with a generic clarification request (e.g., asking about Material, Ant, etc.) instead of calling the DESIGN_SYSTEM_QUERY tool and listing the active registry. Despite prompt-level and handler-level enforcement being added, the tool is not being invoked at runtime.

**Expected Behavior:**

When `designSystems.enabled=true` and `activeRegistries` is non-empty, DCA should:
- Call DESIGN_SYSTEM_QUERY with action "list"
- Respond using real registry/component data from the tool result
- Only ask clarifying questions if multiple registries exist and the request is ambiguous

**Actual Behavior:**

DCA ignores tool-first enforcement and responds as a generic chatbot, suggesting Material/Ant/etc., indicating tool invocation is not occurring at runtime.

**What's Already Verified:**

- Registry is compiled and present in `customRegistries.ts`
- DESIGN_SYSTEM_QUERY tool exists and is registered in `toolRegistry.ts`
- Prompt-level enforcement was added to DCA prompt in `src/assistants/index.ts`
- Handler-level enforcement logic was added in `src/core/assistants/handlers/designCritique.ts` `prepareMessages()`
- Build passes and plugin installs successfully
- Debug logging was added to `src/core/tools/designSystemTools.ts`
- Despite all this, runtime behavior still does not trigger tool usage

**Likely Cause (Hypothesis):**

Assistant orchestration or message preparation path is not correctly forcing tool execution for DS availability queries. The tool call result may be bypassed by the LLM response path, or the tool calling mechanism may not be properly integrated with the provider/LLM interface.

**Acceptance Criteria:**

- Asking "What design system components are available?" results in a tool call
- Console logs confirm DESIGN_SYSTEM_QUERY execution with action "list"
- Response lists only real active registries/components (no generic suggestions)
- No hallucinated or invented component lists

#### BL-042: Errors — GROUP selection causes sub-screen duplication (post-demo) {#bl-042}

**Priority:** P2 (post-demo). **Impact:** When the user selects a GROUP that visually represents a screen, Generate Error Screens may duplicate only a subsection (e.g. a small sub-frame like an icon row) instead of the intended full screen. Converting the GROUP to a FRAME makes it work. Not a demo blocker but causes confusion.

**Repro steps:**

1. In Figma, create or open a design where a "screen" is represented by a **GROUP** (e.g. a GROUP containing a FRAME and other elements, or a GROUP that wraps the whole screen).
2. Select that GROUP (single selection).
3. Run **Errors → Generate Error Screens**.
4. Observe: duplicated content is only a subsection (e.g. one small FRAME inside the GROUP) rather than the full screen.
5. Optional: Convert the GROUP to a FRAME (right-click → Frame selection). Run Generate Error Screens again on the new FRAME. Observe: full screen is duplicated correctly.

**Expected behavior:**

- User can select a screen in any form (Frame, Group, Section, Instance) or select an element *within* a screen (e.g. one text field).
- Plugin analyzes errors in the context of the full screen.
- Plugin duplicates the correct screen container deterministically (full screen, not a subsection).
- Optionally, recommendations can be scoped to the selected element (e.g. "Applies to: Email input").

**Actual behavior:**

- Selecting a GROUP that represents a screen leads to duplication of a subsection (e.g. largest-area FRAME inside the GROUP, which may be a small sub-frame like an icon row).
- Selecting a nested element (e.g. TextNode) can work if resolution finds the right ancestor; GROUP at top level triggers descendant search and can pick the wrong node.

**Notes / suspected root cause:**

- Prior resolution order and use of placement target: when selection is a GROUP (or SECTION) that is a direct child of PAGE, the code falls back to *descendant* search and picks the largest-area FRAME/COMPONENT/INSTANCE. That can be a small sub-frame inside the GROUP rather than the "screen" the user sees.
- Missing explicit "screen container" selection policy: no clear rule that "screen" = page-level visual container or that GROUP should never be treated as the duplication source without further heuristics (e.g. prefer the single direct FRAME child of the GROUP when it represents the full layout).

**Proposed direction (not implementation):**

- Screen container resolution should prefer the page-level visual container (e.g. direct child of PAGE that is FRAME/COMPONENT/INSTANCE). When selection is a GROUP, do not use GROUP as the duplication source; either walk up past GROUP to find a cloneable ancestor, or when GROUP is top-level, prefer a single "primary" frame (e.g. largest direct child FRAME, or the frame that covers the group bounds).
- Add an explicit UX affordance for "duplicate selection only" vs "duplicate screen" so power users can force subsection duplication when intended.

**Acceptance criteria (testable):**

- Select a GROUP that visually represents a full screen → Generate Error Screens duplicates the full screen (or the intended primary frame), not a subsection.
- Select a nested element (e.g. TextNode) inside a screen → full screen is duplicated; annotations can reference the selected element where the LLM scopes recommendations.
- Select a SECTION containing multiple screens → duplicated node is the intended screen (e.g. largest frame or user-discoverable rule); no regression for direct FRAME/COMPONENT/INSTANCE selection.

**Relevant code (paths only):**

- `figmai_plugin/src/core/assistants/handlers/errors.ts` — `getDuplicationSourceNode`, selection resolution, clone/placement flow.
- `figmai_plugin/src/core/figma/placement.ts` — `getPlacementTarget`, `getTopLevelContainerNode` (via anchor).
- `figmai_plugin/src/core/stage/anchor.ts` — `getTopLevelContainerNode`.

---

#### BL-043: Errors — Intermittent "Error: not a function" on Quick Action click (post-demo) {#bl-043}

**Priority:** P2 (post-demo). **Impact:** Occasionally, clicking **Generate Error Screens** (or possibly other Quick Actions) produces "Error: not a function" on the first attempt; retry succeeds. Not a demo blocker but undermines confidence and suggests a race or initialization issue.

**Repro steps:**

1. Open the Figma plugin and ensure a frame or component is selected.
2. Switch to the **Errors** assistant and click **Generate Error Screens** (or another LLM quick action).
3. Observe: sometimes the first click results in a toast or status message "Error: not a function"; no clones or rationale frame are created.
4. Click **Generate Error Screens** again (no change to selection). Observe: the second attempt often succeeds (clones and annotation cards appear).
5. Repeat steps 2–4 multiple times (e.g. 5–10 runs) to capture intermittency.

**Expected behavior:**

- Every click on Generate Error Screens (with valid selection and provider) runs the handler and either completes successfully or fails with a clear, actionable error (e.g. network, parsing, or selection error).

**Actual behavior:**

- Intermittently, the first click yields "Error: not a function"; retry succeeds. No consistent pattern (may depend on load, timing, or first-run vs subsequent run).

**Notes / suspected root cause:**

- Handler registration appears synchronous in `handlers/index.ts` (array of `new ErrorsHandler()`, etc.); no conditional exports or dynamic imports for handlers. So the handler object and `handleResponse` method should be present at call time.
- Likely causes: (1) transient runtime state (e.g. handler reference or prototype not yet fully initialized in some code path), (2) stale bundle (old build where handler shape differed), (3) handler shape mismatch (e.g. a code path that receives a different object than the registered handler), (4) race/initialization (e.g. quick action firing before handlers or provider is ready).
- A guard was added in main to throw a clearer internal error if `typeof handler.handleResponse !== 'function'` (with assistantId/actionId). If the intermittent failure persists, the new message should indicate exactly which handler and call site are involved.
- Next steps: add instrumentation to capture the exact missing function and call site when the error occurs; ensure robust error reporting; consider debouncing or disabling the quick action button until handlers (and provider) are ready.

**Proposed direction (not implementation):**

- Instrument: when "not a function" (or the new guard) fires, log assistantId, actionId, and `typeof handler.handleResponse` (and handler constructor name if available) so the root cause can be pinned down.
- Ensure robust error reporting: surface the internal error message in development or in a way that can be captured (e.g. console + optional telemetry).
- Consider: debounce quick action click or disable the button until handler and provider are confirmed ready (e.g. after first successful handler lookup or after plugin init completes).

**Acceptance criteria (testable):**

- Run Generate Error Screens 10 times in a row (with valid selection and provider). Zero "Error: not a function" (or equivalent) occurrences.
- If any handler call fails, the error message includes assistantId and actionId so the failing handler and action are identifiable.
- No regression: direct FRAME/COMPONENT/INSTANCE selection and Check Errors still work as before.

**Relevant code (paths only):**

- `figmai_plugin/src/main.ts` — RUN_QUICK_ACTION handler, `getHandler(assistantId, actionId)`, `handler.handleResponse(handlerContext)` call sites, guard `typeof handler.handleResponse !== 'function'`.
- `figmai_plugin/src/core/assistants/handlers/index.ts` — handler registry, `getHandler`, `ErrorsHandler` import and registration.
- `figmai_plugin/src/core/assistants/handlers/errors.ts` — `ErrorsHandler.handleResponse`, `handleGenerateErrorScreens`.

---

### Tech Debt

Technical improvements, refactoring, and code quality improvements.

| ID | Title | Priority | Status | Owner | Acceptance Criteria | Notes / Links |
|----|-------|----------|--------|-------|---------------------|---------------|
| BL-009 | Documentation cleanup (remove bloat/redundancy, normalize filename/formatting) | P2 | Proposed | Unassigned | Docs have less redundancy; filenames and formatting are normalized; no unnecessary bloat. | |
| BL-010 | Code cleanup (remove bloat/redundancy, normalize filename/formatting) | P2 | Proposed | Unassigned | Code has less redundancy; filenames and formatting are normalized; no unnecessary bloat. | |
| BL-051 | Extract `main.ts` monolith into focused modules | P1 | Proposed | Unassigned | Message handlers, provider lifecycle, chat state, and tool dispatch extracted into focused modules; `main.ts` becomes an orchestrator; each concern independently testable | Source: N1 / audit C1. See [details](#bl-051). |
| BL-052 | Extract `ui.tsx` monolith into focused components | P1 | Proposed | Unassigned | Panel components (settings, analytics tagging, content table, chat) extracted into dedicated files; `cleanChatContent` unified into shared utility | Source: N2 / audit C2. See [details](#bl-052). |
| BL-062 | Audit and remove dead code exports | P3 | Proposed | Unassigned | `preparePayloadTier1` and other unreferenced exports verified; dead code removed or documented if reserved | Source: audit M2. See [details](#bl-062). |
| BL-066 | Fix README React→Preact reference | P3 | Proposed | Unassigned | README accurately says "Preact" instead of "React-based UI" | Source: Q5 / audit L1. |
| BL-067 | Remove or implement stub UI buttons | P3 | Proposed | Unassigned | About/Feedback/Meetup buttons either link to real URLs or are removed; no "URL not configured" TODOs | Source: audit L2. |
| BL-068 | Clean up vendored artifacts in infra/ | P3 | Proposed | Unassigned | `infra/config-api/node_modules/` and `dist/` removed from disk if gitignored; confirmed not tracked | Source: audit L3. |
| BL-069 | Fix invariants.md authority link | P3 | Proposed | Unassigned | Invariant #3 links to `placeArtifact.ts` code as authority, plan doc as supporting context | Source: Q6 / audit L5. |

---

### Ideas / Experiments

Exploratory ideas, research questions, and experimental concepts. Low commitment items.

| ID | Title | Priority | Status | Owner | Acceptance Criteria | Notes / Links |
|----|-------|----------|--------|-------|---------------------|---------------|
| BL-070 | Explore FigmAI MCP server for external agent access | P2 | Proposed | Unassigned | PoC MCP server surface lets external AI agents (Claude Code, Cursor) trigger FigmAI assistants, read content tables, or query DS compliance from IDE | Source: R1 / audit. See [details](#bl-070). |
| BL-071 | Design multi-model routing strategy | P2 | Proposed | Unassigned | Architecture for per-assistant or auto-routed model selection (Claude 4.6 Opus/Sonnet, GPT-5 family); structured output tasks vs fast chat vs vision analysis | Source: R2 / audit. See [details](#bl-071). |
| BL-073 | Explore Figma Dev Mode focusedNode for contextual actions | P3 | Proposed | Unassigned | PoC using Dev Mode `focusedNode` API for contextual assistant actions in developer workflow | Source: R4 / audit. See [details](#bl-073). |

---

### Archived

Historical record of completed work. Items are moved here after verification period.

| ID | Title | Priority | Status | Owner | Acceptance Criteria | Notes / Links |
|----|-------|----------|--------|-------|---------------------|---------------|
| *No archived items* | | | | | | |

---

## ID Convention

### Format

Backlog IDs follow the format: **BL-XXX**

Where:
- `BL` = Backlog prefix
- `XXX` = Sequential number (001, 002, 003, ...)

Examples:
- `BL-001`
- `BL-002`
- `BL-123`

### Assignment Rules

1. **Sequential assignment**: IDs are assigned in order (001, 002, 003, ...)
2. **Never reused**: Once assigned, an ID is permanent and never reused
3. **No gaps required**: If BL-005 is cancelled, BL-006 still follows (no need to backfill)
4. **Single source**: Only this file assigns Backlog IDs

### How to Assign

1. Find the highest existing ID in all sections
2. Increment by 1
3. Use the new ID for the new item
4. Add the item to the appropriate section

Example:
- Highest existing ID: BL-073
- New item ID: BL-074

---

## Plan File Convention

### When to Create a Plan File

Create a plan file when:
- An item moves from "Next" to "Now" (work is starting)
- Detailed implementation steps are needed
- Multiple commits or PRs will be required
- Technical approach needs documentation

Do not create a plan file for:
- Simple, single-commit changes
- Items still in "Later" or "Ideas"
- Items that are self-explanatory

### Location

All plan files are stored in: `docs/plans/`

### Naming Format

```
<id>_<short-slug>.plan.md
```

Examples:
- `BL-001_add-feature-x.plan.md`
- `BL-042_refactor-handlers.plan.md`
- `BL-123_fix-bug-y.plan.md`

### Plan File Structure

A plan file should contain:

1. **Title**: Brief description of the work
2. **Goal**: What this plan achieves
3. **Scope**: What is included and excluded
4. **Constraints**: Limitations, requirements, or dependencies
5. **Implementation Steps**: Detailed steps to complete the work
6. **Verification**: How to verify the work is complete
7. **Links**: Related backlog items, issues, or documentation

### Example Plan File

```markdown
# BL-001: Add Feature X

## Goal
Add feature X to enable Y capability for users.

## Scope
- Include: Core feature implementation, basic tests
- Exclude: Advanced features, UI polish (deferred to BL-002)

## Constraints
- Must maintain backward compatibility
- Must not break existing tests
- Performance impact must be < 10ms

## Implementation Steps
1. Create feature module
2. Add tests
3. Update documentation
4. Integration testing

## Verification
- All tests pass
- Manual testing confirms feature works
- Documentation updated

## Links
- Related: BL-002 (UI polish)
- References: [01-getting-started.md](01-getting-started.md)
```

---

## Commit / PR Convention

### Commit Messages

All commits implementing backlog items must reference the Backlog ID:

**Format:**
```
<type>: <description> (BL-XXX)
```

**Examples:**
```
feat: Add feature X (BL-001)
fix: Resolve bug in handler (BL-042)
refactor: Extract common logic (BL-123)
test: Add tests for feature X (BL-001)
docs: Update architecture docs (BL-001)
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code refactoring
- `test`: Test additions or changes
- `docs`: Documentation changes
- `chore`: Maintenance tasks

### PR Titles

**Format:**
```
[BL-XXX] <description>
```

**Examples:**
```
[BL-001] Add feature X
[BL-042] Fix bug in handler
[BL-123] Refactor common logic
```

### PR Descriptions

PR descriptions should include:

1. **Backlog Reference**: `Implements BL-XXX: <title>`
2. **Summary**: Brief description of changes
3. **Plan File Link**: Link to plan file if one exists
4. **Testing**: How the changes were tested
5. **Related Items**: Links to related backlog items or issues

**Example:**
```markdown
Implements BL-001: Add feature X

## Summary
Adds feature X to enable Y capability for users.

## Plan
See docs/plans/BL-001_add-feature-x.plan.md

## Testing
- Unit tests added and passing
- Manual testing completed
- Integration tests verified

## Related
- Related to BL-002 (UI polish)
```

---

## Maintenance Guidelines

### Regular Updates

- **Weekly**: Review "Now" section, update statuses, move completed items to "Done"
- **Monthly**: Review "Next" and "Later" sections, promote items as needed
- **Quarterly**: Archive "Done" items older than 3 months

### Item Quality

Each backlog item should have:
- Clear, actionable title
- Appropriate priority
- Current status
- Acceptance criteria (what "done" looks like)
- Owner (if applicable)

### Section Limits

- **Now**: 2-5 items maximum
- **Next**: 10-20 items maximum
- **Later**: No limit, but review quarterly
- **Bugs**: All known bugs should be tracked
- **Tech Debt**: Prioritized tech debt items only
- **Ideas**: No limit, but review quarterly

---

## Merge notes (backlog merge 2026-01-21)

Summary of dedup and structure decisions when merging the new categorized backlog (A1–K1) into this SSOT:

- **Canonical backlog:** This file (`docs/backlog.md`) remains the single source of truth. No other backlog files were created; no other docs were deprecated.
- **ID mapping:** New items use BL-020 through BL-041. Category IDs (A1, B1, … K1) are preserved in the "Source" column and Index for traceability.
- **Merged items (no new BL-XXX):**
  - **E1, E2, E3 → BL-016.** ACE versioning/backup/revert already existed; E1 (backups/snapshots), E2 (build-linked snapshots), E3 (user attribution) were merged into BL-016. Acceptance criteria and details expanded; BL-016 row and a "BL-016 (expanded)" details subsection added.
  - **G1 → BL-017.** ACE internal hosting guidance already existed; G1 (ACE local → intranet hosting: secure access, multi-user, auth, roles) was merged into BL-017. Wording strengthened; "BL-017 (expanded)" details subsection added.
- **New items:** All other category items (A1, B1, B2, C1–C3, D1–D3, F1, F2, G2, G3, H1, H2, I1, I2, J1–J4, K1) added as new rows BL-020–BL-041 with standard fields (Problem/Goal, Scope, Deliverables, Dependencies, Owner, Status).
- **Index:** New "Index (by category)" section at top groups items by category (A–K) with quick links to BL-XXX and to merged BL-016/BL-017.
- **Separation:** Index and item details clarify scope where relevant: **Plugin** (Figma side), **ACE** (admin-editor), **Shared** (both or infrastructure).

---

## Changelog

This section tracks significant changes to the backlog structure itself.

| Date | Change | Reason |
|------|--------|--------|
| 2026-01-26 | Initial backlog structure created | Establish canonical backlog system |
| 2026-01-21 | Governance rule updated (Editor → Backlog Maintainer); BL-002 updated (deprioritized, partially addressed); new items added (AT-A placeholder, ACE roadmap including backlog viewer/editor, Tech Debt) | Apply approved Backlog Update execution plan |
| 2026-01-21 | Index (by category) added; E1–E3 merged into BL-016, G1 merged into BL-017; BL-020–BL-041 added (A1–K1); merged & new item details section; Merge notes added | Merge categorized backlog (Architect mode); preserve traceability A1–K1 ↔ BL-020–BL-041 |
| 2026-01-21 | BL-042, BL-043 added (Errors assistant post-demo bugs); Index L1/L2 added | Architect: GROUP selection sub-screen duplication; intermittent "not a function" on Quick Action |
| 2026-01-21 | Backlog aligned to 2026 strategy initiatives | Backlog Strategy Alignment: BL-026 expanded (Design System Guardrails, P1, moved to Next); BL-044–BL-049 added (Dev Handoff Pack, Document Ops, Prompt-to-Flow, Inline Copy Ops, Research-to-Design Bridge, Creative Micro-Tools); BL-006 marked Done (ACE); BL-007 cross-links; Index strategy subsection; Changelog entry |
| 2026-02-22 | Scanning policy + BL-050 added; BL-021/BL-037 notes updated | Added "Scanning Policy" section (canonical rule: all scans through Smart Detector); BL-050 (Smart Detector enrichment layer) added to Next; Index category M added; BL-021 updated (partially implemented); BL-037 updated (partially implemented) |
| 2026-04-04 | Full repo audit: BL-051–BL-073 added; Index categories N–R added | Comprehensive repo audit covering code architecture (C1–C5), testing/CI (H1–H2), infrastructure (H5–H6, M7), documentation hygiene (H3–H4, M5–M6), error handling (M1–M2), tech debt (L1–L5), and technology opportunities (MCP server, multi-model routing, Claude 4.6 structured outputs, Figma Dev Mode). 23 new items across Now, Next, Later, Tech Debt, and Ideas sections. Audit plan: `.cursor/plans/figmai_full_repo_audit_357700e8.plan.md` |

---

## Questions or Issues?

If you have questions about the backlog or need to propose changes to this structure:
1. Create an issue or discussion item
2. Reference this file in your proposal
3. Wait for approval before modifying this file

**Remember**: This file is the single source of truth. Keep it accurate, up-to-date, and well-maintained.
