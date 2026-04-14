---
version: "1.0"
tags: [accessibility, wcag-2-2, a11y, inclusive-design, annotation-kit, keyboard, focus, contrast, forms, screen-readers]
updatedAt: "2026-04-13"
---

## Purpose
Authoritative reference for evaluating and annotating accessibility in UI/UX designs. Grounds reviews in WCAG 2.2 (AA baseline), covering structure, focus, keyboard, touch targets, contrast, form labeling, error handling, and assistive-technology compatibility. Supports consistent greenline annotation practice aligned with enterprise annotation kits (e.g., CVS Web Accessibility Annotation Kit).

## Scope
Applies to user-facing UI design review: visual structure, navigation, focus order, keyboard interaction, touch targets, color contrast, text alternatives, form labeling and errors, authentication usability, and AT compatibility. Includes annotation workflow guidance. Excludes assistant behavior, output formatting, schema enforcement, and runtime or DS rules.

## Definitions

- ### WCAG 2.2
  Web Content Accessibility Guidelines 2.2: a W3C standard organized by four principles (Perceivable, Operable, Understandable, Robust) with testable Success Criteria at A/AA/AAA levels.

- ### POUR
  The four WCAG principles: Perceivable (can be sensed), Operable (can be used), Understandable (can be understood), Robust (works with assistive tech).

- ### Focus Indicator
  A visible styling change that shows which element is currently focused for keyboard interaction (e.g., outline/ring).

- ### Accessible Name
  The programmatic label announced by assistive technologies for a control (derived from label text, aria-label, etc.).

- ### Greenlines (Annotation)
  An accessibility annotation technique that visually documents requirements on a design (labels, headings, focus order, landmarks, states) so engineers can implement them consistently.

## Rules
- Default target level is WCAG 2.2 AA unless explicitly stated otherwise.
- Evaluate using POUR: perceivable, operable via keyboard, understandable, robust with assistive tech.
- Do not rely on color alone to convey meaning (errors, selection, status); always pair with text or iconography.
- Every interactive element must have a clear keyboard focus indicator and a logical focus order matching visual/reading order.
- Focus must not be hidden by sticky headers, modals, or overlays — WCAG 2.2 adds AA focus-not-obscured minimum.
- Touch targets must meet minimum size and spacing requirements — WCAG 2.2 adds AA target size minimum.
- Drag-only interactions must have a non-drag alternative — WCAG 2.2 adds AA dragging movements.
- Forms must provide labels/instructions, identify errors in text, and suggest corrections when possible.
- Authentication flows must not rely solely on memory or complex puzzles; allow password managers — WCAG 2.2 adds accessible authentication minimum at AA.
- Annotate requirements not reliably inferable from visuals alone: accessible name, role, state, focus order, error associations, keyboard behavior.

## Do
- Use semantic structure: headings, sections, and groups must have meaningful hierarchy and labels.
- Provide sufficient color contrast for text and UI elements; ensure non-text contrast for icons, focus rings, and control borders.
- Design keyboard-first: all controls operable without a mouse, tab order follows task flow, no keyboard traps.
- Make focus visible and consistent across components; ensure focus is never clipped or obscured.
- Use persistent, explicit field labels; pair with helper text and field-level error messages bound to the field.
- For errors: state what is wrong, where it occurred, and how to fix it; move focus to the first invalid field on submit.
- Ensure accessible names match visible labels exactly; avoid mismatches between visible text and what AT announces.
- Pad touch targets to meet minimum sizing; avoid tiny icon-only tap targets without adequate spacing.
- Provide alternatives to drag-only interactions (buttons, stepper controls, menus).
- Annotate: focus order, landmark/region intent, accessible names for ambiguous controls, error announcement requirements, and state behaviors (disabled, loading, expanded).

## Don't
- Don't use placeholder text as the only input label — placeholders disappear and reduce accessibility and usability.
- Don't rely on color alone for errors or selection (e.g., red outline only).
- Don't hide or overly subtle focus indicators against backgrounds.
- Don't place key actions behind hover-only UI on touch-first surfaces without an alternative.
- Don't require drag-only interactions without an equivalent keyboard/button control.
- Don't design authentication flows that block password managers or require memorization without alternatives.
- Don't ship forms that fail silently or return generic errors without field-level guidance.

## Examples

- ### Focus order annotation
  Number interactive elements in tab order: 1=Primary nav, 2=Search, 3=Primary CTA. Note skip-link expectation for long navs.

- ### Accessible name annotation
  Icon-only magnifying glass button: annotate accessible name "Search". If visible text is adjacent, ensure the accessible name matches it exactly.

- ### Error identification annotation
  Field-level error: "Enter a valid email address (for example, name@example.com)." Annotate that the message is programmatically associated with the input and announced on submit.

- ### Drag alternative annotation
  Card reorder with drag handles: "Provide Move up/down buttons or menu actions as a non-drag alternative."

## Edge Cases
- Custom components: explicitly annotate expected role, name, state, and keyboard interactions (e.g., custom dropdown: arrow keys, Enter/Escape behavior).
- Dense content (tables, dashboards): annotate reading order, keyboard navigation expectations, and sticky headers that could obscure focus.
- Modals: annotate initial focus location, focus trap behavior, Escape-to-close (if supported), and focus return target on close.
- Multi-step flows with errors: annotate input preservation across steps, progress saving, and error summary links to fields.
- Localization: ensure labels and errors remain concise; annotate truncation behavior for text that expands in translation.
- CAPTCHAs, MFA, security challenges: annotate accessible alternatives and compatibility with password managers and autofill.
