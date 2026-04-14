---
version: "1.0"
tags: ["ux", "design-review", "usability", "accessibility", "visual-hierarchy"]
updatedAt: "2026-01-21"
---

## Purpose
Reference knowledge for evaluating UI and UX quality: critique heuristics, evaluation dimensions, scoring guidance, and review checklists. Supports consistent, actionable design feedback.

## Scope
Applies to design review and critique: usability, clarity, information architecture, visual hierarchy, accessibility, composition, and content quality. Excludes output format enforcement, schema syntax, and tool/DS rules.

## Definitions
- ### Hierarchy and focus: The degree to which the most important information or action is immediately clear. Primary actions and key content should dominate; secondary elements should support without competing.
- ### Layout and alignment: Intentional structure and alignment of elements. Consistent grids and alignment create order and reduce cognitive load.
- ### Spacing and proximity: Related elements grouped clearly; unrelated elements separated. Use spacing to signal relationships and create rhythm.
- ### Affordance: The quality of suggesting how an element can be used. Buttons should look clickable; inputs should invite entry; links distinguishable.
- ### Consistency: Reuse of components, styles, and spacing patterns. Reduces learning effort and builds trust.

## Rules
- Base scores on overall usability impact, not visual polish alone. Consider clarity, hierarchy, and friction.
- Wins must be specific and tied to dimensions (e.g. hierarchy, spacing). Avoid vague praise.
- Fixes must be specific (values, measurements, references), actionable in Figma, and ordered by impact.
- Checklist items should be reusable validation steps the user can apply to future designs.
- Evaluate: Hierarchy, Layout, Spacing, Typography, Color/Contrast, Affordance, Consistency, Accessibility, States (hover, focus, disabled, error, loading).
- Scoring guidance: 90-100 exceptional; 80-89 strong; 70-79 solid; 60-69 functional; below 60 major issues.

## Do
- Tie wins to specific dimensions (hierarchy, spacing, clarity).
- Give concrete fixes (e.g. 'Add 16px padding between sections', 'Increase contrast to meet WCAG AA').
- Order fixes by impact (most critical first).
- Reference specific elements by name or type when context is available.
- Consider accessibility: contrast, legibility, hit targets, states.

## Don't
- Use vague advice such as 'Clean this up' or 'Improve hierarchy' without specifics.
- Praise vaguely (e.g. 'Looks good').
- Omit actionable guidance (e.g. suggest 'fix spacing' without saying how much or where).
- Ignore states (disabled, error, loading) when they are relevant.

## Examples
- ### Good win: 'Primary CTA is visually dominant and clearly separated from secondary actions.'
- ### Good fix: 'Increase text contrast for body text to meet WCAG AA (currently #666, suggest #333).'
- ### Good checklist item: 'Primary action is visually dominant.'
- ### Poor fix: 'Improve spacing.' (Prefer: 'Add 8px spacing between related form fields.')

## Edge Cases
- When selection context is missing, recommend selecting one or more design elements before critiquing.
- When the design is minimal (e.g. wireframe), focus on structure and hierarchy rather than polish.
- When multiple screens or flows are in view, clarify which area the critique addresses or provide a per-area summary.
