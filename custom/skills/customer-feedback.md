---
version: "1.0"
tags: [voice-of-customer, customer-feedback, ux-research, qualitative, quantitative, insights, prioritization, jobs-to-be-done, product-discovery]
updatedAt: "2026-04-13"
---

## Purpose
Reference knowledge for turning customer feedback into actionable product and design decisions. Covers collection principles, synthesis methods, insight framing, and prioritization heuristics — enabling teams to validate designs against real user goals, pain points, and jobs to be done.

## Scope
Applies to collecting, analyzing, and applying customer feedback to UX/product decisions: surveys, in-product feedback, interviews, support tickets, reviews, and usability findings. Includes synthesis (thematic analysis, affinity mapping), insight statements, JTBD framing, and prioritization. Excludes company-specific customer data — this skill defines how to structure and use feedback, not proprietary insights.

## Definitions

- ### Voice of Customer (VoC)
  A programmatic view of customer needs and perceptions derived from multiple feedback channels (in-product, surveys, interviews, support, analytics).

- ### Feedback Item
  A single piece of user-reported input (quote, ticket, comment, survey response) that may indicate a need, pain point, bug, or expectation.

- ### Theme
  A meaningful pattern across multiple feedback items identified through coding and synthesis (e.g., "confusing pricing," "can't find export").

- ### Thematic Analysis
  A systematic approach to organizing qualitative data by tagging observations with codes to discover themes.

- ### Affinity Diagramming
  A collaborative method for clustering research findings into groups to reveal patterns and inform decisions.

- ### Jobs To Be Done (JTBD)
  What users are trying to accomplish (the "job") and the outcome they want, independent of any specific solution.

- ### Insight Statement
  A decision-ready statement linking evidence to a user need and its impact (observation + evidence + implication).

## Rules
- Collect feedback after meaningful user activity ("task, then ask"); avoid interrupting before users can form an opinion.
- Treat qualitative feedback as directional, not statistically representative unless the sample is designed for it; avoid over-generalizing from a few comments.
- Always preserve evidence: retain the original quote/snippet and context (who, where, when) when creating themes.
- Use a consistent synthesis method: coding → themes → insights → actions. Thematic analysis and affinity mapping are acceptable defaults.
- Separate user needs from proposed solutions: capture what users are trying to do and what blocks them before deciding on features.
- Prioritize by impact on task success and frequency, not intensity of wording alone — loud complaints can be outliers.
- When feedback conflicts, document the segments and contexts where each is true; do not average away meaningful differences.
- Convert themes into decision-ready outputs: design requirements, backlog items, experiment hypotheses, or usability acceptance criteria.
- Respect privacy and consent: avoid storing sensitive personal data in design artifacts; redact where needed; minimize collection to what is necessary.

## Do
- Capture each feedback item with: channel, user segment (if known), task/context, severity, and evidence (quote or snippet).
- Use thematic analysis to code feedback items and identify recurring themes.
- Use affinity diagramming to cluster findings and align teams on patterns.
- Frame insights as: user goal → obstacle/pain → impact → evidence → opportunity.
- Use JTBD-style phrasing to keep needs solution-agnostic (what users want to accomplish and why).
- Tie feedback to design validation checks (e.g., "Users can find export in under 10 seconds").
- Quantify where possible: pair themes with a signal or metric (task success, drop-off rate, ticket volume).
- Close the loop: if you ask for feedback, acknowledge it and share outcomes when feasible — builds trust.

## Don't
- Don't treat a single anecdote as a universal truth without corroboration.
- Don't rewrite feedback into a solution prematurely ("Add feature X") without clarifying the underlying need.
- Don't ignore context: the same comment can mean different things across flows, segments, or devices.
- Don't mix bugs, usability issues, and feature requests into one bucket — classify them distinctly.
- Don't prioritize solely by the loudest stakeholder or the most emotionally phrased feedback.
- Don't store raw sensitive data (account numbers, personal identifiers) in design files or KBs.

## Examples

- ### Feedback item (raw)
  "I keep getting logged out while I'm filling this form." Channel: support ticket. Context: long form. Device: mobile.

- ### Theme (coded)
  Session expiration interrupts long tasks.

- ### Insight statement
  Users attempting long tasks lose progress due to session timeouts, causing frustration and repeat work. Evidence: multiple tickets referencing logout during form completion. Impact: task abandonment and increased support load.

- ### JTBD framing
  Job: "Complete a multi-step form without losing progress." Outcome: "Finish confidently, even if I'm interrupted."

- ### Validation criterion derived from feedback
  If a session expires mid-form, preserve inputs and provide a re-auth flow that returns users to the same step.

## Edge Cases
- Conflicting feedback: segment it (new vs expert users, mobile vs desktop, region, plan tier) and design for the dominant workflow while providing escape hatches for edge cases.
- Low-frequency, high-severity issues: prioritize even if rare when the consequence is major (security, payment failures, data loss).
- Feedback driven by misunderstanding: treat as a clarity or usability problem first (labels, affordances, onboarding), not necessarily a feature gap.
- Channel bias: support tickets skew toward problems; reviews skew toward extremes; in-product prompts skew toward engaged users. Account for channel bias in synthesis.
- Solution requests from users: translate to the underlying need; keep the request as a candidate solution, not the requirement.
- Regulated or sensitive domains: redact and minimize data; store only what is needed to make a design decision; document consent boundaries.
