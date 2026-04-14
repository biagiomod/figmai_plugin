---
version: "1.0"
tags: [competitive-analysis, product-strategy, ux-research, benchmarking, positioning, feature-matrix, teardown, differentiation, market-landscape]
updatedAt: "2026-04-13"
---

## Purpose
Reference knowledge for conducting competitive analysis for product and UX: identifying direct and indirect competitors, benchmarking user experiences, comparing capabilities and positioning, and turning findings into actionable opportunities and design requirements.

## Scope
Applies to product and UX competitive work: landscape mapping, feature/experience benchmarking, competitive usability evaluations, positioning analysis, and opportunity identification. Excludes copying competitors' UI directly, IP-sensitive reverse engineering, and any guidance to implement deceptive/dark patterns (the dark-deceptive-practices skill covers detection/remediation only).

## Definitions

- ### Direct Competitor
  A product targeting the same user segments and solving the same core job with a similar solution category.

- ### Indirect Competitor / Substitute
  A different solution category that satisfies the same underlying job (e.g., spreadsheets as a substitute for a workflow tool).

- ### Competitive Review
  A fast expert review of competitors' UI/flows to learn patterns, strengths/weaknesses, and conventions — lower rigor than formal research.

- ### Competitive Usability Evaluation
  A structured study comparing products using tasks, participants, and measures to assess relative UX strengths and weaknesses.

- ### Positioning Map
  A map comparing offerings along meaningful dimensions (e.g., price vs depth of capability) from the customer's perspective.

- ### Feature Matrix
  A structured table comparing capabilities across competitors, paired with depth/quality ratings and evidence.

- ### UX Teardown
  A step-by-step analysis of a product flow (e.g., sign-up, search, checkout) capturing patterns, copy, IA, friction, and differentiators.

## Rules
- Start with the user job: define the primary job-to-be-done, key tasks, and success outcomes before comparing products.
- Separate observation from interpretation: record what you see (evidence) distinctly from your conclusions.
- Use comparable tasks and conditions across products (same user intent, same device context) to avoid biased comparisons.
- Do not optimize for feature count alone; evaluate quality, usability, discoverability, and effectiveness.
- For competitive usability evaluations, use consistent tasks and scoring criteria to compare relative strengths and weaknesses.
- Triangulate sources: combine UI review with user feedback, public documentation, pricing, and measurable behaviors.
- Frame findings as opportunities: where users struggle, what competitors do better/worse, what differentiates meaningfully.
- Avoid copying: replicate the underlying principle, not the surface UI; respect brand, platform guidelines, and your constraints.
- Document assumptions and uncertainty; label unverifiable claims (e.g., paywalled features) as unknown.
- Treat competitive findings as time-bound; include an updatedAt date and plan periodic refresh for key markets.

## Do
- Define scope upfront: products, segments, platforms (iOS/Android/web), and top 3–7 tasks to compare.
- Create a consistent capture template: screenshots, flow steps, notes, and a scoring rubric (clarity, friction, time, errors).
- Classify competitors: direct, adjacent, substitutes, and "best-in-class" inspirations for specific tasks.
- Compare at the right level: user outcomes and task success first, then patterns and components.
- Score experiences with a rubric (e.g., onboarding clarity, navigation, forms, accessibility, states) for defensible comparisons.
- Assess positioning: target persona, key promises, pricing model, and what the product emphasizes in nav and hero content.
- Identify differentiators and "table stakes" separately to avoid chasing parity features unnecessarily.
- Capture both strengths and weaknesses so design decisions are balanced and grounded.

## Don't
- Don't treat competitive analysis as a feature list; assess user experience quality and business model constraints.
- Don't assume a competitor's implementation is optimal just because it's common; validate against user needs.
- Don't include or recommend deceptive/dark patterns; if found, document harm and remediation only.
- Don't ignore accessibility and states (loading, empty, error, permissions) in comparisons — these often reveal real quality differences.
- Don't base conclusions on marketing claims alone; verify with product use and evidence when possible.
- Don't overfit to one competitor; use multiple references to avoid biased direction.

## Examples

- ### UX teardown structure
  Flow: Sign-up → onboarding → first success action. Capture: steps, user questions, friction points, copy patterns, error handling, and time-to-value.

- ### Feature matrix columns
  Capability | Competitor A | Competitor B | Our product | Notes/Evidence | Quality (1–5) | User value (H/M/L) | Differentiation (H/M/L).

- ### Positioning snapshot prompts
  Target user? Core promise? Proof points? Pricing model? Key objections addressed? What is emphasized in nav and hero?

- ### Opportunity statement
  Competitors reduce onboarding time-to-value by guiding a single primary setup path; opportunity: simplify our onboarding to one clear path with progressive disclosure.

## Edge Cases
- Paywalled or enterprise features: document as unknown unless verified; avoid assumptions about capability depth.
- Rapidly changing markets (AI features, pricing): separate stable findings (IA, core flow quality) from volatile ones and refresh more often.
- Platform differences: compare like with like (iOS vs iOS); if a competitor is web-only, note platform constraints explicitly.
- Different target segments: treat a competitor targeting a different persona as inspiration, not direct benchmark; adjust rubrics accordingly.
- Legal/compliance constraints: note where your product must differ due to regulation, privacy, or enterprise requirements.
- Copying risk: when a pattern is valuable, abstract it into principles (reduce steps, clarify hierarchy, improve recovery) rather than replicating UI exactly.
