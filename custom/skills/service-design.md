---
version: "1.0"
tags: [service-design, service-blueprint, journey-mapping, operations, reliability, sre, incident-management, observability, handoff, systems-thinking]
updatedAt: "2026-04-13"
---

## Purpose
Reference knowledge for designing and evaluating end-to-end services — not just UI: how user journeys, people, processes, and technical systems work together; how failures are handled; and how operational readiness (SLOs, incident response, observability) is designed into the service from the start.

## Scope
Applies to service-level design and validation across channels and systems: service blueprints, touchpoints, backstage processes, ownership, dependencies, environments, reliability targets, failure modes, and operational processes (incident, problem, change management). This is a starter-level skill and should be extended with org-specific architecture, SLAs/SLOs, environment details, and runbooks. Excludes assistant behavior, output formatting, and proprietary infrastructure details.

## Definitions

- ### Service Blueprint
  A diagram visualizing the relationships between touchpoints in the customer journey and the behind-the-scenes people, processes, and technology needed to deliver them.

- ### Frontstage
  Visible interactions and evidence the user experiences (UI, copy, confirmations, notifications).

- ### Backstage
  Behind-the-scenes work and systems enabling the frontstage experience (services, queues, support operations, policies).

- ### SLI (Service Level Indicator)
  A measurable metric of service behavior (availability, latency, correctness).

- ### SLO (Service Level Objective)
  A target level for an SLI over a time window (e.g., 99.9% successful requests over 28 days).

- ### Error Budget
  A reliability allowance derived from an SLO (approximately 1 − SLO target) used to balance shipping velocity with stability.

- ### Incident
  An unplanned interruption or degradation of service requiring response to restore normal operation.

- ### Problem
  The underlying cause of one or more incidents; problem management focuses on preventing recurrence.

- ### Observability
  The ability to understand system state from outputs: logs, metrics, traces, and user-visible health signals.

- ### Runbook
  A step-by-step operational guide to diagnose and resolve known failure modes.

## Rules
- Design for the service, not the screen: validate that each user step has corresponding backstage processes and system dependencies mapped.
- For each critical user journey, document: entry conditions, success outcomes, failure modes, and recovery paths.
- Map ownership: every touchpoint and dependency must have a clear owner (team or role) and escalation path.
- Define reliability targets (SLOs/SLIs) for critical journeys; align release velocity to error budgets when applicable.
- Prefer graceful degradation over hard failure: when dependencies fail, provide partial functionality or clear next steps when feasible.
- Avoid silent failure: user-visible outcomes must reflect real system state (no false-success messages).
- Data integrity and privacy are non-negotiable: define where sensitive data is stored and transmitted and how it is protected.
- Operational readiness is part of definition of done for major service changes: monitoring, alerting, dashboards, and runbooks must exist for critical paths.
- Incident communications must be designed: status messaging, user guidance, and support workflows must be consistent and truthful.
- Changes must be reversible when possible: support rollback strategies, feature flags, and safe migration paths.

## Do
- Create a service blueprint for key journeys: frontstage steps + backstage processes + systems + evidence + handoffs.
- Identify top risks per journey: dependency outages, latency spikes, data conflicts, permission failures, rate limits, and user error.
- Define service contracts for core capabilities: what is supported, what is not, constraints, and expected behavior.
- Define standard failure responses: retry semantics, queuing, offline mode, idempotency, and conflict resolution rules.
- Design support touchpoints: self-serve help, contact support, escalation, and status pages where appropriate.
- Instrument critical paths: success/failure rates, latency, and user-perceived performance signals.
- Provide user-safe defaults and recovery: preserve work, autosave drafts, and allow resuming after interruptions.
- Document environment parity expectations: what differs between staging and production and how to test safely.

## Don't
- Don't treat service design as documentation only; it must influence UI states, backend contracts, and operational readiness.
- Don't ship a journey without defined failure modes and recovery paths (including partial success).
- Don't rely on manual heroics: if something breaks repeatedly, add automation, runbooks, and reduce recurrence.
- Don't hide dependencies: if a feature relies on external systems, design visible states for outages and latency.
- Don't encode operational processes in tribal knowledge; capture them in runbooks and dashboards.
- Don't conflate incidents with problems: restore service first, then investigate root causes and prevention.

## Examples

- ### Service blueprint slice
  Frontstage: User submits payment → sees "Processing…" → receives confirmation. Backstage: API validates → payment processor call → ledger write → receipt email → analytics event. Failure modes: processor timeout, duplicate submit, ledger conflict. Recovery: retry with idempotency key, queued receipt, visible status.

- ### Reliability target
  SLO: 99.9% successful checkout requests over 28 days. SLI: proportion of successful checkout API calls under latency threshold. Gate risky releases when error budget is exhausted.

- ### Incident-ready UI states
  If dependency is down: degraded mode banner + limited actions + retry + link to status/help, while preserving user progress.

- ### Ownership and escalation
  Touchpoint owner: Checkout PM + Checkout Eng. Dependency owner: Payments Platform. Escalation: on-call rotation + incident channel + runbook link.

## Edge Cases
- Cross-channel journeys: user starts in-app, continues via email link, completes on web — ensure identity, state, and permissions remain consistent.
- Partial success: some actions complete but downstream steps fail (e.g., order saved but receipt email fails) — design explicit messaging and back-office reconciliation.
- Long-running operations: provide progress, allow safe cancellation, and ensure users can return later without losing work.
- Offline/degraded networks: clarify what is queued vs what requires connectivity; avoid ambiguous "saved" claims when data is not yet persisted.
- Data migrations and schema changes: design compatibility windows, progressive rollout, and rollback; ensure UI can handle mixed states.
- Multi-tenant or role-based systems: permission boundaries must be validated at every touchpoint; design clear request-access flows.
