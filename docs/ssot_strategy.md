SSOT Strategy

Single Source of Truth for Content, Design, and Code

Purpose

Define a long-term strategy for a Single Source of Truth (SSOT) that enables:
	•	Bi-directional sync between Content, Design (Figma/Web), and Code
	•	AI-assisted text-to-design and rapid discovery workflows
	•	Reduced silos between Product, Design, Content, and Engineering
	•	Enterprise-grade governance, auditability, and rollback

This document is strategic, not tactical. It is not a build plan.

⸻

Guiding Principles
	1.	One model, many projections
SSOT is not a single JSON file. It is a canonical domain model that can be rendered into multiple formats (JSON, MD, PDF, web, Figma, code).
	2.	Event-based, not overwrite-based
Changes are captured as events with provenance, not destructive updates.
	3.	Stable IDs over names
Anything that syncs must have a stable identifier across tools.
	4.	Adapters, not tight coupling
Each system (Figma, CMS, Repo) interacts via adapters. No system becomes “special.”
	5.	Human-centered governance
AI proposes. Humans approve. Rollback is always possible.

⸻

Conceptual Model

            Content (CMS / Content Table)
                     ↕
Design (Figma / Web) ↔  SSOT (Canonical Model + Event Log) ↔ Dev (Code)
                     ↕
               AI / Text-to-Design

The SSOT sits between systems, not above them.

⸻

Canonical Domain Model (High Level)

The SSOT is composed of primitives that can exist across disciplines.

Core Primitives
	•	Project
	•	UIArtifact (screens, flows, components)
	•	ContentItem (copy blocks, labels, messages)
	•	DesignToken (color, typography, spacing, semantics)
	•	Behavior (states, validation rules, interactions)
	•	Spec (requirements, constraints, acceptance criteria)
	•	Decision (why something exists)
	•	Provenance (who/what/when/source)

Example (Conceptual)

{
  "id": "screen_login_01",
  "type": "UIArtifact",
  "stableId": "ui.screen.login",
  "contentRefs": ["content.heading.welcome"],
  "tokenRefs": ["color.primary", "type.heading.lg"],
  "source": "figma",
  "provenance": {
    "author": "designer",
    "timestamp": "2026-02-01",
    "commit": "abc123"
  }
}


⸻

Projections (Outputs)

The canonical model can be projected into:
	•	JSON (machine-readable)
	•	Markdown / Confluence
	•	PDF / Docs
	•	Figma canvas (via plugin)
	•	Code artifacts (components, configs, tests)

Projection ≠ Source of Truth
All projections are derived views.

⸻

Sync Strategy

Three Sync Modes
	1.	Read-only ingestion
	•	Safest starting point
	•	Pull from Figma, CMS, Code into SSOT views
	2.	Assisted write
	•	SSOT proposes changes
	•	Humans approve before write-back
	3.	Bi-directional sync
	•	Role-based permissions
	•	Field-level ownership rules
	•	Full audit + rollback

⸻

Ownership & Conflict Resolution

Ownership is per field, not per file.

Entity	Owned By
Content values	Content / UX Writing
Layout & structure	Design
Tokens	Design System
Runtime behavior	Engineering
Specs & constraints	Product

Conflicts are resolved by:
	•	Ownership rules
	•	Explicit approval workflows
	•	Never by silent overwrite

⸻

Text-to-Design & AI Role

AI (e.g., Design Workshop Assistant) should:
	1.	Generate Design Specs, not raw canvas changes
	2.	Store specs as SSOT events
	3.	Render specs into Figma as projections
	4.	Leave AI output visible on canvas for audit/debugging

This builds trust and debuggability.

⸻

Governance Requirements (Enterprise-Critical)
	•	Role-based permissions
	•	Approval gates
	•	Full audit trail
	•	Entity-level rollback
	•	Snapshot tagging (e.g., “Release v1.2”)

Without these, SSOT becomes a liability.

⸻

Architecture Direction

Short Term (Local / Plugin-Based)
	•	File-based SSOT (JSON + event log)
	•	Stored in repo or workspace
	•	Human-readable exports
	•	Plugin acts as orchestrator

Mid Term (Adapters)
	•	Figma adapter (node IDs, metadata)
	•	Content adapter (Content Table, CMS)
	•	Code adapter (Code Connect, annotations)

Long Term (Service)
	•	Central SSOT service
	•	API-based adapters
	•	Auth, audit, approvals
	•	Multi-project support

⸻

Non-Goals (Important)
	•	Not trying to replace Figma
	•	Not trying to replace CMS
	•	Not forcing developers to edit JSON
	•	Not allowing silent AI changes

⸻

Key Decisions to Lock Early
	1.	Stable ID format
	2.	Event schema + versioning
	3.	Ownership rules
	4.	Diff format (e.g., JSON Patch)
	5.	Token vs component authority

These are hard to change later.

⸻

Why This Matters

This strategy enables:
	•	Faster discovery
	•	Fewer silos
	•	Safer AI usage
	•	Real design ↔ code feedback loops
	•	Enterprise-grade collaboration

It future-proofs the plugin without over-engineering today.

⸻

Status: Strategic reference only
Implementation: Deferred intentionally
Next Review: When SSOT Lite is first needed