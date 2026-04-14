---
version: "1.0"
tags: [ux-research, user-research, usability-testing, qualitative, quantitative, synthesis, interviews, surveys, journey-mapping, metrics]
updatedAt: "2026-04-13"
---

## Purpose
Reference knowledge for planning, running, and applying UX research to produce credible, actionable insights. Covers discovery and evaluative research, synthesis methods, and insight communication — grounding design decisions in evidence. This is a starter skill intended to be extended with internal research repositories, customer segments, prior findings, and domain-specific constraints in private KBs.

## Scope
Applies to UX research activities that inform product and design decisions: discovery (needs, JTBD), evaluative research (usability tests, concept tests), mixed methods, synthesis (coding, themes), and insight communication. Includes guidance for turning findings into design requirements and validation criteria. Excludes company-specific findings and sensitive participant data — those belong in private KBs with governance.

## Definitions

- ### Research Question
  A specific question the study aims to answer (e.g., "Can users find X?" "Why do users abandon Y?") that guides method, tasks, and analysis.

- ### Study Goal
  The outcome the research must enable: the decision to make, the risk to reduce, or the hypothesis to validate.

- ### Discovery Research
  Research to understand user needs, motivations, context, and problems — what to build and why.

- ### Evaluative Research
  Research to evaluate a design or product against tasks and success criteria — how well it works.

- ### Task Scenario
  A realistic prompt that encourages an action without telling the user how to use the interface.

- ### Finding
  An observed issue or behavior supported by evidence (quote, video timecode, metric).

- ### Insight
  A decision-ready interpretation of findings that explains why something happens and what it implies for design.

- ### Recommendation
  An actionable change proposed based on evidence — scoped to what should change and why.

- ### Thematic Analysis
  Analyzing qualitative data by coding and grouping patterns into themes.

- ### HEART Metrics
  A UX measurement framework: Happiness, Engagement, Adoption, Retention, Task Success.

- ### Evidence
  Verifiable support for a claim: direct quote, screenshot, timecode, task outcome, or metric.

## Rules
- Start with the decision: define the decision to make, risk to reduce, and what would change based on results.
- Define 1–3 primary research questions; avoid sprawling studies that cannot be fully analyzed or acted on.
- Use realistic task scenarios that encourage action without giving away the UI path.
- Separate observation from interpretation: document what happened (finding) distinctly from why it matters (insight).
- Capture evidence for each key finding (quote, timecode, task outcome) so results are auditable.
- For evaluative research, define success criteria upfront: task success, time on task, errors, confidence.
- Do not generalize beyond the sample: qualitative studies produce direction, not statistical proof unless specifically designed for it.
- Synthesize systematically: code data → group into themes → validate themes → derive insights and opportunities.
- Prioritize findings by impact on user outcomes and frequency; avoid prioritizing by emotional intensity alone.
- Maintain participant privacy: avoid storing personal identifiers or sensitive data in public KBs or design files.
- Inclusive research: account for accessibility needs and participant diversity; ensure study materials are usable with assistive technologies where relevant.
- Operational discipline: record study date, product/prototype version, method, participants, and constraints so findings remain interpretable over time.

## Do
- Write a short study brief: goals, questions, method, participant criteria, tasks, success metrics, logistics.
- Pilot the session with 1 participant or internal dry-run to catch task ambiguity and prototype issues.
- Use neutral facilitation: avoid leading questions; ask for expectations before showing solutions.
- Take structured notes tagged for synthesis (chronological log + codes).
- Synthesize soon after sessions while context is fresh; use thematic analysis or affinity mapping.
- Turn insights into actions: design requirements, backlog items, experiment hypotheses, or acceptance criteria.
- Communicate results with a tight structure: executive summary, top findings, evidence, recommendations, risks/unknowns.
- Where useful, pair qualitative insights with signals and metrics (e.g., HEART Task Success).
- Maintain a research repository: searchable findings, themes, and links to evidence (in private/work settings).

## Don't
- Don't start with a solution and use research to justify it; treat research as uncertainty reduction.
- Don't use unrealistic tasks or instruct users how to complete them — it invalidates the test.
- Don't collapse findings and recommendations into one statement without evidence.
- Don't treat 5-user qualitative testing as statistically representative; use it to find issues and patterns.
- Don't ignore context: segment differences (new vs expert, mobile vs desktop) often explain conflicting feedback.
- Don't ship research without a clear "so what": what changes, who owns it, and when it will be validated again.
- Don't store raw sensitive participant information in shared artifacts; redact and minimize.

## Examples

- ### Study goal (evaluative)
  Determine whether users can create and share a report in under 2 minutes without assistance.

- ### Task scenario (good)
  "You need to share a weekly report with your team by end of day. Create a new report for this week and share it with a colleague."

- ### Finding with evidence
  Users missed the primary "Create report" action because it was grouped with secondary actions. Evidence: 4/6 participants scanned the sidebar twice and clicked "Templates" first; quote: "I expected it under Reports."

- ### Insight
  Users rely on sidebar label structure more than iconography; when the mental model is category-first, actions hidden in toolbars are less discoverable.

- ### Recommendation
  Move "Create report" to the top of the Reports section as a primary action; keep toolbar actions secondary. Validate with a follow-up test focused on discoverability.

- ### Synthesis output
  Theme: "Navigation labels drive discovery." Codes: "missed primary action," "sidebar scan," "icon confusion."

## Edge Cases
- Conflicting findings across segments: split results by segment (role, experience, device) and design for the dominant workflow while providing escape hatches.
- Prototype fidelity issues: if the prototype lacks realistic data or states, findings may reflect prototype limitations rather than true usability problems; document constraints.
- Artificial tasks: if tasks are not meaningful to participants, behavior will be distorted; rewrite scenarios to match real goals and incentives.
- Remote testing constraints: connectivity, screen sharing, and audio issues can affect results; plan contingencies and note disruptions.
- Sensitive domains: avoid collecting or recording confidential data; use synthetic data sets and redact recordings/transcripts.
- AI-assisted synthesis: if using AI to help code or summarize, treat outputs as drafts; verify against raw evidence and preserve traceability to quotes/timecodes.
- Time pressure: when rapid feedback is needed, run a small evaluative test with tight scope; clearly label confidence level and document what remains unknown.
