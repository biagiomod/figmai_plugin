---
version: "1.0"
tags: [business-strategy, okrs, north-star, kpis, roadmap, decision-log, assumptions, risks, stakeholders, governance]
updatedAt: "2026-04-13"
---

## Purpose
Reference knowledge for capturing, reviewing, and applying business context to product and design work: organizational intent (why), goals (OKRs), measures (KPIs), plans (roadmaps), and decision governance. Enables teams to validate design decisions against strategy without context-switching.

## Scope
Applies to product/business context used to guide design and development: why statement/vision, strategy pillars, OKRs, KPIs, initiatives, roadmap, risks, assumptions, and decision history. Defines structure and best practices only — does not contain org-specific confidential content; add that via private KBs.

## Definitions

- ### Why Statement
  A concise statement of the organization's reason for existing and the customer value it aims to create — distinct from revenue goals.

- ### Vision
  A description of the desired future state; long-term and directional.

- ### Strategy Pillar
  A major theme that focuses investment and clarifies priorities (e.g., "Trust & reliability", "Self-serve growth").

- ### OKR (Objective + Key Results)
  Objective: a qualitative, outcome-oriented goal describing what impact is desired — not a task list. Key Results: measurable outcomes indicating progress toward the objective; specific and verifiable.

- ### KPI
  A metric measuring performance over time (health of a product or business outcome). KPIs can inform OKRs but are not the same as OKRs.

- ### North Star Metric
  A primary metric representing value delivered to customers; used to align teams on value creation.

- ### Assumption
  A belief taken as true for planning that should be validated (user behavior, market conditions, etc.).

- ### Decision Log
  A record of key decisions including context, alternatives, and rationale — prevents re-litigation and preserves institutional memory.

## Rules
- Treat OKRs as outcomes, not task lists; define impact first and allow teams to choose methods.
- Each Objective should have 2–5 Key Results; each Key Result must be measurable and time-bound.
- Key Results must measure outcomes (behavior, success, quality), not outputs (shipping features) unless output is the only verifiable proxy.
- Avoid metric overload: maintain a small, decision-driving KPI set; define each with formula, data source, and cadence.
- Always capture tradeoffs: what will not be done, what is deprioritized, and why.
- Tie initiatives and roadmap items to objectives; if work cannot be traced to strategy or operational necessity, challenge it.
- Document assumptions explicitly and define validation plans before large investments.
- Maintain a decision log for major product/design decisions: context, options, decision, and rationale.
- Keep strategy artifacts current: include dates, owners, and review cadence; stale strategy is worse than no strategy.
- Do not store sensitive customer or employee personal data in public/shared business-review KBs.

## Do
- Write a crisp Why/Vision statement that is stable enough to evaluate decisions against.
- Define 3–6 strategy pillars that clearly guide prioritization and tradeoffs.
- Use OKRs to align on outcomes; use initiatives/roadmap to describe the work to pursue those outcomes.
- Define each KPI with a one-line meaning, formula, data source, and owner to prevent metric confusion.
- Create a clear mapping: Pillar → Objective → Key Results → Initiatives → UX/Engineering deliverables.
- Maintain an assumptions list; validate highest-risk assumptions early via research, prototype tests, or experiments.
- Maintain a decision log to reduce churn and preserve rationale; include evidence links when available.
- Include leading indicators (early signals) and lagging indicators (business outcomes) in measurement plans.
- Run a regular review cadence (monthly/quarterly) to track OKR progress and update priorities.

## Don't
- Don't treat OKRs as a backlog or checklist of tasks.
- Don't use vague objectives (e.g., "Improve UX") without defining what improvement means and how it will be measured.
- Don't optimize for one metric at the expense of trust, quality, or accessibility; define counter-metrics where needed.
- Don't ship initiatives without a clear link to strategy or to operational requirements (security, compliance, reliability).
- Don't overwrite or delete history; maintain versioning and keep prior decisions accessible.
- Don't mix confidential org strategy into a public starter KB; keep org-specific content in private KBs with governance.

## Examples

- ### Why statement
  "Help people accomplish complex work with clarity, confidence, and control."

- ### OKR (good)
  Objective: "Reduce friction for first-time users completing their first project." Key Results: (1) Increase first-project completion rate from 35% to 50%; (2) Reduce median time-to-first-success from 12 min to 7 min; (3) Reduce onboarding-related support contacts by 20%.

- ### KPI definition
  Activation rate = % of new users completing the first success action within 7 days. Source: event analytics. Cadence: weekly. Owner: Growth PM.

- ### Decision log entry
  Decision: Multi-step onboarding flow over a single long form. Rationale: reduces cognitive load, supports progressive disclosure, aligns with time-to-value pillar. Evidence: usability sessions (n=8) showed fewer errors and higher completion confidence.

## Edge Cases
- Conflicting goals: when an OKR conflicts with a quality/safety constraint (growth vs trust), define explicit counter-metrics and guardrails.
- Ambiguous ownership: a KPI or OKR with no clear owner will drift; assign owners and review cadence before relying on it.
- Data gaps: if metrics are uninstrumented or unreliable, define temporary proxies and an instrumentation initiative; document uncertainty.
- Multi-product orgs: use a top-level strategy + product-level OKRs; avoid forcing one North Star across unrelated products.
- Volatile markets: treat competitive/trend insights as time-bound; include updatedAt and a refresh cadence; document assumptions that may change.
- Strategy churn: if leadership changes direction frequently, preserve history via decision logs and explicitly note what changed and why.
