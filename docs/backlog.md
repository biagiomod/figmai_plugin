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
| **D — Design system** | D1 | Design system KB (first-class type) | [BL-026](#bl-026) |
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

---

### Next

Prioritized items ready for implementation. These should have clear scope and acceptance criteria.

| ID | Title | Priority | Status | Owner | Acceptance Criteria | Notes / Links |
|----|-------|----------|--------|-------|---------------------|---------------|
| BL-007 | Improve assistant accuracy and usefulness across all assistants | P1 | Proposed | Unassigned | Each assistant has clearer scope, fewer ambiguous responses, and better task completion rates | |
| BL-008 | Create Figma-stage UI components aligned to plugin design direction | P2 | Proposed | Unassigned | Components feel cohesive, usable, and ready for real design workflows | |

---

### Later

Validated items that are not yet prioritized. May be promoted to "Next" when capacity allows.

| ID | Title | Priority | Status | Owner | Acceptance Criteria | Notes / Links |
|----|-------|----------|--------|-------|---------------------|---------------|
| BL-005 | Public HTML marketing website for FigmAI plugin | P2 | Proposed | Unassigned | Static site exists with overview, feature list, screenshots, docs links, and contact info | |
| BL-006 | HTML admin/editor interface for custom config and knowledge files | P2 | Proposed | Unassigned | Editors can update content through UI, with validation and export back to source format | |
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
| BL-021 | Editor-friendly assistant configuration model | P2 | Backlog | Unassigned | Structured fields, presets, advanced mode, inline examples for non-technical editors. | Source: B1. See [details](#bl-021). |
| BL-022 | Assistant query structure definition | P2 | Backlog | Unassigned | Canonical JSON prompt schema: system/task/context/KB/schema/validation. | Source: B2. See [details](#bl-022). |
| BL-023 | KB structure standard | P2 | Backlog | Unassigned | Standard sections: purpose, scope, definitions, rules, do/don't, examples, edge, accessibility, dark-mode, compliance. | Source: C1. See [details](#bl-023). |
| BL-024 | KB builder template | P2 | Backlog | Unassigned | ACE guided builder → markdown/JSON output. | Source: C2. See [details](#bl-024). |
| BL-025 | External KB import/parsing | P2 | Backlog | Unassigned | Upload, preview, normalize, approval, save for external KBs. | Source: C3. See [details](#bl-025). |
| BL-026 | Design system KB (first-class type) | P2 | Backlog | Unassigned | Design system as first-class KB type in ACE. | Source: D1. See [details](#bl-026). |
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
| BL-037 | Content table manager | P2 | Backlog | Unassigned | Sync from plugin, editable, export. | Source: J1. See [details](#bl-037). |
| BL-038 | Analytics tag table manager | P2 | Backlog | Unassigned | Registry, rules, sync. | Source: J2. See [details](#bl-038). |
| BL-039 | Multi-format export (content/analytics) | P2 | Backlog | Unassigned | JSON/XML/mobile/CMS export. | Source: J3. See [details](#bl-039). |
| BL-040 | DB-level versioning (content/analytics) | P2 | Backlog | Unassigned | History, diff, rollback, attribution, locking/conflicts. | Source: J4. See [details](#bl-040). |
| BL-041 | External architecture review agent | P2 | Backlog | Unassigned | Tooling/scalability/safety/UX/automation review; run at major releases/quarterly/milestones. | Source: K1. See [details](#bl-041). |

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

- **Problem / Goal:** Treat design system as a first-class KB type.
- **Scope:** ACE + Plugin. Design system KB type with same rigor as other KBs.
- **Deliverables:** Design system KB as first-class KB type in ACE and Plugin.
- **Dependencies:** Design system registry and KB structure. **Owner:** Unassigned. **Status:** Backlog.

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

---

### Bugs

Known issues and defects that need to be addressed.

| ID | Title | Priority | Status | Owner | Acceptance Criteria | Notes / Links |
|----|-------|----------|--------|-------|---------------------|---------------|
| BL-001 | DCA does not invoke DESIGN_SYSTEM_QUERY for DS availability questions | P1 | Blocked | Unassigned | See details below | DS enforcement implementation session |
| BL-002 | Plugin-generated elements are not placed at intended canvas locations | P2 | Approved | Unassigned | Generated elements appear in predictable, user-intended positions (substantially improved). Remaining edge-case testing and refinements deferred. | Partially addressed; placement now working much better. Remaining testing/refinements deferred; deprioritized for now. |
| BL-003 | Processing animation donut does not animate | P2 | Proposed | Unassigned | Processing indicator animates smoothly while async operations are running | |

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

---

### Tech Debt

Technical improvements, refactoring, and code quality improvements.

| ID | Title | Priority | Status | Owner | Acceptance Criteria | Notes / Links |
|----|-------|----------|--------|-------|---------------------|---------------|
| BL-009 | Documentation cleanup (remove bloat/redundancy, normalize filename/formatting) | P2 | Proposed | Unassigned | Docs have less redundancy; filenames and formatting are normalized; no unnecessary bloat. | |
| BL-010 | Code cleanup (remove bloat/redundancy, normalize filename/formatting) | P2 | Proposed | Unassigned | Code has less redundancy; filenames and formatting are normalized; no unnecessary bloat. | |

---

### Ideas / Experiments

Exploratory ideas, research questions, and experimental concepts. Low commitment items.

| ID | Title | Priority | Status | Owner | Acceptance Criteria | Notes / Links |
|----|-------|----------|--------|-------|---------------------|---------------|
| *No ideas proposed* | | | | | | |

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
- Highest existing ID: BL-042
- New item ID: BL-043

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
- References: docs/architecture.md
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

---

## Questions or Issues?

If you have questions about the backlog or need to propose changes to this structure:
1. Create an issue or discussion item
2. Reference this file in your proposal
3. Wait for approval before modifying this file

**Remember**: This file is the single source of truth. Keep it accurate, up-to-date, and well-maintained.
