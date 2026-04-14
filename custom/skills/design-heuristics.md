---
version: "1.0"
tags: [ux, ui, heuristics, usability, design-review, accessibility, information-architecture, interaction-design]
updatedAt: "2026-04-13"
---

## Purpose
Reference knowledge for evaluating and improving UI/UX quality using established heuristics and standards. Grounds design critique, QA reviews, discovery, and expert evaluation in Nielsen's 10 Usability Heuristics, ISO 9241-110 interaction principles, and WCAG 2.2 — producing consistent, evidence-based findings with actionable fixes.

## Scope
Applies to user-facing interfaces across web and mobile: interaction design, layout, navigation, forms, feedback, states, accessibility, and content clarity. Excludes assistant behavior, tone control, output formatting, JSON/schema enforcement, and runtime execution rules.

## Definitions

- ### Usability Heuristic
  A general design principle used to evaluate interface usability and identify likely issues — especially effective for expert reviews.

- ### Nielsen's 10 Usability Heuristics
  A widely used set of 10 principles for interface design evaluation (e.g., visibility of system status, consistency and standards, error prevention, recognition rather than recall).

- ### ISO 9241-110 Interaction Principles
  International standard describing qualities of usable interactive systems (suitability for the task, self-descriptiveness, controllability, conformity with user expectations).

- ### WCAG POUR
  Accessibility principles: Perceivable, Operable, Understandable, Robust — used to evaluate whether experiences work for people with disabilities and assistive tech.

## Rules
- Tie every finding to an observed UI element, user goal, and a specific heuristic or principle — no evidence-free critique.
- Prioritize by user impact and frequency: blockers (task failure) first, then high friction, then polish.
- Frame recommendations as concrete design changes (what to change, where, and how) — not vague advice.
- Always evaluate key states: empty, loading, error, success, disabled, focus, hover, offline, and partial success.
- Accessibility is a baseline, not a bonus: evaluate against WCAG AA (contrast, keyboard, focus visibility, labels).
- When two heuristics trade off (e.g., minimalist design vs discoverability), choose the option that best supports the user's task and prevents critical errors.

## Do
- Map each finding to a heuristic (Nielsen/ISO/WCAG) to make critiques consistent and teachable.
- Check navigation and wayfinding: users must always know where they are, what happened, and what to do next.
- Check recognition over recall: reduce memory load with visible options, previews, defaults, and sensible constraints.
- Check control and freedom: provide undo/back/cancel, safe exits, and reversible actions for risky steps.
- Check consistency: patterns, components, spacing, terminology, and behaviors must match within the product and platform conventions.
- Check feedback loops: show system status, progress, and confirmations promptly and proportionately.
- Check error prevention and recovery: prevent mistakes; when failures happen, explain what happened and how to recover.
- Check accessibility early: labels, focus order, keyboard access, contrast, and error announcement patterns.

## Don't
- Don't give generic feedback like "improve hierarchy" without pointing to specific elements and proposed changes.
- Don't optimize aesthetics at the expense of comprehension, task success, and accessibility.
- Don't hide critical actions, costs, or consequences behind ambiguous UI or copy.
- Don't require users to remember information between steps when it can be shown or inferred.
- Don't rely on color alone to communicate meaning (errors, selected states, statuses).
- Don't introduce new interaction patterns without a clear user benefit and consistent application across the product.

## Examples

- ### Visibility of system status (Nielsen)
  Finding: Save action provides no feedback; users cannot tell if it worked. Fix: Add inline "Saved" confirmation and/or a toast; for long operations show progress and disable repeated submission.

- ### Recognition rather than recall (Nielsen)
  Finding: Users must remember filter criteria after navigating back. Fix: Persist filter chips and show active filters above results with a clear reset control.

- ### User control and freedom (Nielsen / ISO Controllability)
  Finding: Deleting an item is immediate with no undo. Fix: Provide an undo snackbar for a short window; for destructive actions, require confirmation with clear consequences stated.

- ### WCAG Understandable
  Finding: Form errors are shown only in a red top banner; screen reader users don't receive field-level guidance. Fix: Add field-level messages bound to inputs, focus the first invalid field on submit, and ensure errors are programmatically announced.

## Edge Cases
- Missing context: provide general heuristics and ask for the specific screen, flow, or element to evaluate before issuing specific findings.
- Single component review: evaluate local usability first, then note likely upstream/downstream dependencies (validation, empty states, permissions).
- Wireframe reviews: prioritize structure, flow, and clarity over visual polish.
- Speed vs safety tradeoffs: choose the least-friction option that still prevents high-impact errors (undo often beats confirmation dialogs).
- Platform divergence: prefer the target platform's norms for navigation patterns, affordances, and system feedback when conventions differ.
