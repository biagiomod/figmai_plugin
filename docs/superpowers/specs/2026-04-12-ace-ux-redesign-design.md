# ACE Admin UX Redesign — Design Spec

> **Status:** Brainstorming complete. Ready for implementation planning.
>
> **Scope note:** This spec covers Subsystem A — the ACE editor UX, SKILL.md authoring, navigation IA, and test harness. Subsystem B (site data management) is deferred to a follow-on spec pending architecture resolution on the JSON-layer-vs-TypeScript-authoring question.

---

## Goal

Redesign the ACE Admin Editor UI to reflect the Phase 5 SKILL.md migration and the updated product direction. The redesign changes the navigation structure, replaces the raw-JSON-first editing model with a structured form wizard for SKILL.md authoring, introduces a Resources tab (Shared Skills + Internal KBs), upgrades the Registries tab to a proper Design Systems editor, and adds an assistant test harness with fixture-library and context simulation.

The guiding design rule throughout is **progressive disclosure**: optimize for the common editing path, keep advanced capability available but not visually primary.

---

## Design Rule: Progressive Disclosure

This principle applies to every panel in the redesign:

- Default state shows the most-used fields only
- Structural complexity (raw JSON, keyword overrides, payload details) lives behind secondary toggles or collapsed sections
- "Advanced — Raw JSON" is always available but never the first thing shown
- Dense information is revealed on demand, not presented upfront
- Labels, hints, and notes are concise — system knowledge goes in docs, not in the UI

---

## Navigation IA

### Top-level tabs (7 total)

| Tab | Status | Notes |
|-----|--------|-------|
| **General** | Renamed | Was "Config". Simpler scope — plugin display settings only |
| **AI** | Simplified | Endpoint + default kbName + proxy only. Per-assistant kbName moves to each assistant's Knowledge sub-tab |
| **Assistants** | Restructured | SKILL.md is now the primary editing surface; 5 sub-tabs per assistant |
| **Resources** | Restructured | Was "Knowledge Bases". Now: Shared Skills + Internal KBs |
| **Design Systems** | Major expansion | Was "Registries". Now: top-level SKILL.md + full per-DS editor |
| **Usage** | Renamed | Was "Analytics". Same content, name only |
| **Users** | Major UX update | Roles, permissions, scoped tab access |

### Changes from previous IA

| Was | Now | Reason |
|-----|-----|--------|
| Config | General | Scope reduced; "Config" implied more control than it has |
| LLM tab with Helpers | AI tab — endpoint + kbName + proxy only | Helpers concept removed; per-assistant kbName lives in Knowledge sub-tab |
| Knowledge Bases | Resources — Shared Skills + Internal KBs | Large embedding docs are not per-assistant; Shared Skills are a new concept |
| Registries (raw JSON) | Design Systems — structured editor | Raw JSON was developer-only; new editor is approachable |
| Analytics | Usage | More accurate name for the content |

---

## General Tab

### Overview

Lightweight settings page — not a configuration workbench. Two sub-tabs: Plugin (live) and Site (deferred placeholder).

### Plugin sub-tab

**Display Mode section:**
- Default Mode: select between "Advanced (full assistant list)" and "Simple (curated list only)"
- Simple Mode — visible assistants: checkbox grid of all assistants; only shown/relevant when default mode is Simple

**Branding section:**
- Toggle: Show app name (on/off)
- Toggle: Show logo (on/off)
- Toggle: Show logline (on/off)
- Text field: App Name
- Text field: Logline (visible only when show-logline is on)
- Text field: Logo path (visible only when show-logo is on)

**Advanced section (collapsed):**
- Raw JSON editor for the full config — same as today's raw mode, demoted behind a disclosure toggle
- Label: "Advanced — Raw JSON"

**What is NOT in the Plugin tab:**
- Network Access: system-controlled via code/config. Not exposed as a UI toggle. The `networkAccess` field continues to exist in config JSON but is not editable through ACE's General tab.
- HAT (Accessibility HAT-required components): removed from the General tab. If HAT configuration is needed, it lives in the assistant's Settings sub-tab or in raw JSON.

### Site sub-tab

Placeholder only — deferred to follow-on spec. Content: a clear placeholder panel explaining what will appear here (tagline, accent color, video filename, howToUse steps, quickAction chips, per-assistant resource links, bestPractices, strike team slots) and noting that `site/src/data/assistants.ts` is the current authoring location.

The tab is visible but clearly labeled "Upcoming" and not editable. No partial implementation.

---

## AI Tab

Simplified. Three fields only:

- **Internal LLM Endpoint**: URL field with connection test
- **Default kbName**: text field — global fallback kbName used when an assistant has no override
- **Proxy settings**: existing proxy configuration (URL, auth)

Per-assistant kbName moves out of this tab and into each assistant's Knowledge sub-tab (see Assistants section).

---

## Assistants Tab

### Assistant list (sidebar)

Unchanged pattern: list of assistants on the left, editor on the right. Each assistant now has **5 sub-tabs** in the editor.

### Assistant editor — 5 sub-tabs

| Sub-tab | Content | Primary/Secondary |
|---------|---------|------------------|
| **SKILL.md** | Behavior editor — Form Wizard or Raw | Primary (shown first) |
| **Identity** | label, iconId, intro text, kind, optional tag badge | Secondary |
| **Site** | tagline, accent, video, howToUse, chips, resources, bestPractices, strike team | Deferred (same placeholder as General/Site) |
| **Knowledge** | kbName override, Shared Skills attached, quick action config | Secondary |
| **Settings** | execution model, vision toggle, output schema ID, safety overrides | Secondary |

### SKILL.md sub-tab

This is the primary authoring surface. It replaces the current `promptTemplate` + `instructionBlocks` model as the single source of truth for assistant behavior.

**Two modes, toggled with a Form/Raw pill in the panel header:**

#### Form Wizard (default)

Sections (each collapsible after initial setup, ordered by importance):

**Identity** (required):
- Assistant Name field — appears as "You are Design AI Toolkit's **X** Assistant"
- Core Principle field — one sentence shown in bold in the identity block
- Identity Preview: live-rendered preview of the generated identity paragraph

**Behavior Rules** (optional):
- Drag-reorderable list of text inputs
- Each rule becomes a bullet in the `## Behavior` section
- "Add behavior rule" button
- Order matters — highest priority rules first

**Quick Actions** (optional):
- Accordion list; each action is collapsed by default showing only its name and collapsed summary pill
- Expanding an action reveals:
  - Template Message (required): the pre-filled message sent when user clicks the action
  - Guidance (required): system-level instruction injected alongside the message
  - LLM Package box: which SKILL.md files are included in this action's LLM request (see Package Composition below)

#### Collapsed Quick Action summary pill

The collapsed state of a Quick Action shows a summary pill instead of full detail. Pill variants:

| Variant | Example | When |
|---------|---------|------|
| Clean | `📦 1 skill · 2 kw` | One attached skill, few keywords |
| Heavy | `📦 4 skills · 12 kw · 3 overrides` | Multiple skills and keywords |
| Customized | `📦 2 skills · 5 kw · 2 customized` | Keywords differ from inherited defaults |
| Own only | `📦 own SKILL.md only` | No shared skills attached |

"Customized" replaces "⚠ overrides" — softer language, same meaning.

#### Raw Editor (advanced)

Full-width dark code editor rendering the SKILL.md file contents directly. Syntax-highlighted. Reads and writes the same file as the form wizard — switching modes reflects the current state.

Toggling from Form to Raw is always available. Toggling back from Raw to Form parses the markdown and re-populates the form fields; if the raw content has sections the form doesn't understand, they are preserved in the file but not shown in the form.

#### LLM Package Composition (per Quick Action)

Stored in `manifest.json`, not in the SKILL.md markdown. The Package box inside each expanded Quick Action shows:

- **Locked**: "🔒 This assistant's SKILL.md" — always included, cannot be removed
- **Attached Shared Skills**: chips for each attached Shared Skill (from Resources). Remove button per chip. "Add Shared Skill" button opens a picker.
- **Keyword triggers (free-form queries)**: a table showing: Skill → Inherited Keywords → Overrides. Overrides are per-action local keyword additions or replacements. Inherited keywords come from the Shared Skill's definition in Resources; if there are no overrides the Override column shows "—".

The assembly logic (which SKILL.md files get concatenated into the LLM system prompt) is visible here, not hidden. This is intentional: admins need to understand what gets sent.

---

## Resources Tab

Two sub-tabs: **Shared Skills** and **Internal KBs**.

### Shared Skills sub-tab

Two-pane layout: skill list on left, skill editor on right.

**Skill editor fields:**
- Skill ID (required, stable — not renamed after creation)
- Title (required)
- Kind (required): `behavior`, `format`, `context`, or `rule`
- Content (required): the prompt block injected when this skill is included
- Keywords: tags that trigger auto-inclusion in free-form queries when present in user message
- Used by: read-only list of assistants that reference this skill

**"+ New Shared Skill" button** in the list sidebar.

### Internal KBs sub-tab

Two-pane layout: KB list on left (grouped by subfolder), KB editor on right.

**KB list:**
- Grouped by subfolder (Design Systems, Assistants, General)
- Each entry shows filename
- "+" Add Internal KB button

**KB editor fields:**
- File Name (required)
- Subfolder (optional)
- Description (optional)
- Content: large textarea — edit locally, publish separately

**Publish section:**
- Status badge: "Local draft" or "Synced"
- Last edited timestamp
- "Copy to clipboard" button
- "Sync to Internal LLM →" button — sends file to configured Internal LLM endpoint or copies to hosted location; repo copy is always the source of truth

**What Internal KBs are NOT:**
- Not compiled into the plugin build
- Not loaded at runtime from the plugin
- Used by LLM Helpers or hosted retrieval only

---

## Design Systems Tab

### Overview

Replaces the "Registries" tab. Two-pane layout matching Resources (sidebar + editor). The sidebar has two sections: Global and Design Systems.

### Sidebar structure

```
Global
  Top-level SKILL.md

Design Systems
  nuxt-ui-v4  [active]
  jazz        [draft]
+ Add Design System
```

### Top-level SKILL.md (Global section)

Full-width SKILL.md editor (Form/Raw toggle) for the routing and selection logic across all design systems. This SKILL.md tells the LLM how to choose which design system is in scope, when to combine them, and how to navigate the registry.

Form Wizard for the top-level DS SKILL.md:
- Identity: DS Router name + core routing principle + identity preview
- Behavior Rules: drag-reorderable list (same pattern as assistant SKILL.md)
- No Quick Actions section (DS SKILL.md does not have them — this is called out explicitly in the form)

Raw Editor: same dark code editor as assistant Raw mode.

### Per-DS editor (4 sub-tabs)

When a specific design system is selected:

**SKILL.md sub-tab** (default, active):
- Form/Raw toggle in the sub-tab header
- Form Wizard:
  - Identity: DS Name + Core Principle + identity preview
  - Behavior Rules: drag-reorderable list
  - Explicit note: "DS SKILL.md does not have Quick Actions — those live in assistant SKILL.md files"
- Default state is compact — DS Name, Core Principle, and behavior rule list. Dense detail is not shown upfront.

**Registry sub-tab**:
- Read-only browse of the `registry.json` / `.catalog.json` component list
- Shows: component count, component rows with name + variant count + "View" to expand detail
- Clear label: "Registry is read-only in ACE. Edit the catalog file directly to add or update components."
- No inline editing of registry JSON in the UI

**Internal KB sub-tab**:
- Same editor as Resources → Internal KBs, scoped to this design system
- File name, description, content textarea, publish section

**Metadata sub-tab**:
- DS name, display name, description, version, active/draft status toggle

---

## Test Harness

See companion spec: `docs/superpowers/specs/2026-04-12-ace-test-harness-design.md`

The test harness lives inside each assistant's Playground section (not a separate tab). It extends the existing `POST /api/test/assistant` endpoint with three simulation modes and a fixture library. Summary:

- **Three modes**: No selection / Selection / Vision
- **Fixture library**: `admin-editor/fixtures/{category}/{id}.json` + separate PNG files
- **Payload Inspector**: shows exact outbound request before sending — `message`, `selectionSummary`, and `images` as distinct fields
- **Plugin-parity**: `selectionSummary` forwarded as a distinct field in the provider payload, not pre-concatenated into `message`

---

## Usage Tab

Renamed from "Analytics". Content unchanged for this spec. Rename only.

---

## Users Tab

Structural UX overhaul (detail deferred to follow-on work). Current scope: roles, permissions, scoped tab access. The `USERS_SET_ACCESS_TAB_IDS` list in `app.js` already maps internal tab IDs to display labels — ensure this mapping reflects the renamed tabs:

```javascript
// Updated labels
'config': 'General'
'knowledge-bases': 'Resources'
'registries': 'Design Systems'
'analytics': 'Usage'
```

---

## Implementation Notes

### What stays the same

- Server auth and role validation (`requireAuth`, `requireRoleValidateSave`)
- Config load/save flow and reset-to-defaults
- Proxy settings and Internal API endpoint configuration
- `kbName` resolution logic in the test endpoint (backward compat: defaults to `'figma'` if absent)
- Assistants list and sidebar pattern
- Knowledge Bases CRUD (underlying API unchanged; only the tab is renamed Resources and the sub-tab structure added)

### What changes in server.ts

- `POST /api/test/assistant`: accepts `testMode`, `selectionSummary`, `images` (see test harness spec)
- `GET /api/fixtures`: serves fixture catalog from `admin-editor/fixtures/`
- `GET /api/fixtures/:id/images`: returns base64-encoded images for a fixture

### What changes in app.js

- Tab IDs: `config` → rendered as "General", `knowledge-bases` → rendered as "Resources", `registries` → rendered as "Design Systems", `analytics` → rendered as "Usage" (internal IDs unchanged for backward compat with scoped-access config)
- `_renderConfigTab()`: remove HAT section; move Network Access out; demote raw JSON behind Advanced toggle
- `_renderKbTab()` → `_renderResourcesTab()`: add Shared Skills sub-tab alongside existing Internal KBs sub-tab
- `_renderRegistriesTab()` → `_renderDesignSystemsTab()`: full replacement — sidebar, top-level SKILL.md editor, per-DS editor with 4 sub-tabs
- Assistant editor: add SKILL.md sub-tab with Form Wizard + Raw toggle; add Site sub-tab (placeholder); add Knowledge sub-tab (kbName field + Shared Skills + quick actions package config); add Settings sub-tab
- Quick Action expanded view: add Package box (locked SKILL.md chip + Shared Skills picker + keyword table)
- Playground section: add test harness mode selector, fixture picker, selection summary textarea, images summary, payload inspector

### SKILL.md compile-skills alignment

The Form Wizard writes to the SKILL.md file on disk. The `compile-skills.ts` compiler reads it unchanged. No changes to the compiler are required for this UX redesign — the compiler already handles the `skillVersion: 1` frontmatter format.

### Package composition ownership

The Quick Action package config (which Shared Skills are attached, which keyword overrides apply) is stored by ACE in `manifest.json` per assistant. The boundaries are:

**ACE stores:** `manifest.json` — the package config UI reads and writes this file. It is the authoring surface.

**The compiler does NOT consume:** `compile-skills.ts` does not read `manifest.json` and does not wire Shared Skills into the compiled plugin output. The compiler's job is SKILL.md → `assistants.generated.ts`. Package composition is outside its scope.

**The plugin runtime does NOT yet consume:** The plugin's instruction assembly layer (`instructionAssembly.ts`) does not yet read `manifest.json` package config. Package composition as defined in this spec is ACE-visible only — it informs the test harness endpoint (which reads `manifest.json` when assembling the LLM request) but is not yet wired through the full production plugin runtime.

**Future work (out of scope here):** A follow-on spec will define how `manifest.json` package config is consumed by the plugin runtime to compose per-Quick-Action SKILL.md bundles in production. That work requires changes to `instructionAssembly.ts` and the plugin's request assembly pipeline. Implementing the ACE UI for package composition now (this spec) does not imply those runtime changes are complete.

---

## Out of Scope (This Spec)

- Site data write-back architecture (Site sub-tab content): follow-on spec
- Users tab UX overhaul detail: follow-on spec
- Internal KB upload/hosting mechanics beyond the "Sync to Internal LLM" button
- Fixture authoring UI in ACE (fixtures are file-based in v1)
- Multi-turn conversation testing in the test harness
- Streaming response support in the test harness
- Automated regression testing across assistants

---

## Open Questions (Resolved During Brainstorming)

- **Should SKILL.md have a form wizard or be raw-only?** — Form wizard (default) + Raw toggle. Both read/write the same file.
- **Where does package composition config live?** — `manifest.json` per assistant, not in SKILL.md. Shown in the Quick Action expanded view.
- **Where do keyword triggers live?** — In the Shared Skill definition (Resources tab). Per-Quick-Action overrides shown in the package box.
- **Should Internal KBs be per-assistant or global?** — Global (Resources tab). Per-assistant kbName points to which KB to use; KB content is not per-assistant.
- **Should Network Access be a UI toggle?** — No. System-controlled via config. Not exposed in General tab.
- **Should DS registry be editable in ACE?** — No. Read-only browse only. Authoring is file-based.
- **Should the test harness be a separate tab?** — No. Lives in the assistant's existing Playground section.
- **Should `selectionSummary` be concatenated into `message` server-side?** — No. Forwarded as a distinct field. Provider handles injection.
