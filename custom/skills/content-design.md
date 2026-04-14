---
version: "1.0"
tags: [ux-writing, content-design, microcopy, plain-language, labels, forms, empty-states, error-messages, accessibility, product-copy]
updatedAt: "2026-04-13"
---

## Purpose
Reference knowledge for writing and validating product UI copy: microcopy, labels, helper text, error messages, empty states, and system messaging. Supports consistent, clear, accessible, user-centered content that reduces friction and builds trust across web and mobile interfaces.

## Scope
Applies to user-facing interface content: labels, buttons, helper text, validation and error messages, empty and loading states, confirmations, notifications, and informational guidance. Excludes assistant behavior, tone control rules, output formatting, schema syntax, and runtime or DS enforcement.

## Definitions

- ### Content Design
  Designing the words in an experience to help users accomplish their goals; grounded in user needs, clarity, and accessibility. Content is a structural part of the interface, not a final layer.

- ### Microcopy
  Short UI text that guides users through an interaction (field labels, helper text, error messages, button text).

- ### Helper Text
  Supporting text that clarifies expected input or how information will be used; often shown near a field. Typically swapped with error text when validation triggers.

- ### Empty State
  A screen or region with no content yet (zero results, no messages). Must explain why it is empty and what to do next.

- ### Error Message
  A message that explains what went wrong and how to recover; must be visible, specific, constructive, and efficient.

## Rules
- Write for user needs and tasks first; content must help users understand and complete what they came to do.
- Use plain language: common words, short sentences, active voice; avoid internal jargon, acronyms, and legalese unless required.
- Be specific and concrete: reference the object, action, or location rather than making generic statements.
- Front-load the most important words in headings, labels, and buttons to optimize for scanning.
- Prefer recognition over recall: show users what is needed (formats, examples, constraints) at the point of action.
- Never blame or shame the user; use neutral, respectful language in all states, especially errors.
- For input errors: identify the item in error and describe it in text; provide suggestions for correction when possible.
- Time validation feedback after interaction (on blur or submit), not before the user has acted.
- Minimize copy while preserving clarity; include helper text only when it reduces errors or increases confidence.
- Maintain terminology consistency: one term per concept across labels, help content, errors, and confirmations.

## Do
- Use action-led button labels that describe outcomes ("Save changes", "Create account") rather than vague verbs ("Submit").
- Use explicit, persistent field labels; never rely on placeholder text as the only label.
- For helper text, explain constraints and intent: format examples, character limits, or how data will be used.
- For errors, include: (1) what went wrong, (2) where it happened, (3) how to fix or recover.
- Keep microcopy short and skimmable; use consistent voice and terminology across the product.
- For empty states, explain why it is empty and provide a primary next action; for zero-results states, suggest how to broaden the query.
- For confirmations, match the level of interruption to the risk level (quiet for safe actions; explicit for destructive/irreversible ones).
- Communicate system status clearly (saving, syncing, offline, retrying) using concise, user-meaningful language.

## Don't
- Don't use vague messages like "Something went wrong" without actionable next steps.
- Don't use jargon, stack traces, internal error codes, or blameful phrasing in user-facing messages.
- Don't use double negatives or trick phrasing in consent or opt-out copy — they increase mistakes.
- Don't overuse helper text or tooltips; if many fields need explanation, the form or flow likely needs simplification.
- Don't hide critical information (fees, consequences, cancellation terms) behind ambiguous microcopy or low-salience UI.
- Don't rely on color alone to communicate meaning (errors, warnings, status).

## Examples

- ### Buttons
  Good: "Save changes" (clear outcome). Poor: "Submit" (ambiguous).

- ### Labels and helper text
  Label: "Work email". Helper: "We'll use this to send account updates." (clarifies intent without over-explaining).

- ### Validation error (field-level)
  "Enter a valid email address (for example, name@example.com)." States what is wrong and how to fix it.

- ### System error (recoverable)
  "We couldn't save your changes. Check your connection and try again." Provides status and a recovery action.

- ### Empty state (no items yet)
  "No invoices yet. Create an invoice to get paid faster." Primary action: "Create invoice."

- ### Zero results
  "No results for 'knee brace'. Try removing filters or searching for a broader term."

## Edge Cases
- High-stress contexts (payments, security, account access): prioritize clarity and recovery over friendliness; keep language calm and direct.
- Multiple simultaneous errors: show the most important errors first; where feasible, show all field-level errors at once to avoid repeated submit-fail cycles.
- Partial success: clearly distinguish what succeeded from what failed and what the user must do next; avoid ambiguous mixed-state messaging.
- Offline/degraded: acknowledge the state, preserve user input, and clarify whether actions are queued or must be retried.
- Legal/compliance language: present a short plain-language summary first, then provide full details via progressive disclosure.
- Localization: avoid idioms, culture-specific metaphors, and humor; keep strings short and structurally simple for translation.
