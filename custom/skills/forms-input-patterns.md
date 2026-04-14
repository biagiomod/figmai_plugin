---
version: "1.0"
tags: [ux, forms, input-patterns, ui, interaction-design, usability, accessibility, mobile, autofill]
updatedAt: "2026-04-13"
---

## Purpose
Reference knowledge for designing and evaluating forms and data-entry experiences: field structure, labeling, input selection, progressive disclosure, mobile-friendly entry, and accessibility fundamentals. Reduces friction, prevents mistakes, and improves completion rates.

## Scope
Applies to user-facing form and input experiences across web and mobile: field layout, labels, helper text, required/optional signaling, input types, formatting, grouping, multi-step forms, review/confirm steps, and assistive-technology compatibility. Excludes general error-state patterns beyond forms (covered by the errors and interaction-patterns-states skills), and excludes assistant behavior, output formatting, schema enforcement, and runtime or DS rules.

## Definitions

- ### Form
  A structured interaction where users enter or confirm information to complete a task (sign up, checkout, profile update, etc.).

- ### Field Label
  Persistent text that identifies what data is expected for an input. Labels must be visible and located close to the field at all times.

- ### Helper / Hint Text
  Supporting guidance clarifying what to enter or how the data will be used; use only when it reduces confusion or errors.

- ### Placeholder
  Optional in-field hint text. Not a substitute for a label; disappears on entry, reducing usability and accessibility.

- ### Progressive Disclosure
  Revealing complexity only when needed (e.g., showing additional fields after a selection) to reduce cognitive load.

- ### Autofill
  Browser/OS capability that pre-fills known user data (name, address, etc.). Good form design supports autofill and avoids breaking it.

## Rules
- Every input must have a clear, persistent label or instructions identifying what data is expected; each radio/checkbox option must also have a label.
- Do not rely on placeholder-only labels; placeholders disappear and reduce accessibility and usability.
- Place labels close to the fields they describe; avoid ambiguous spacing where a label could map to multiple fields.
- Group related fields visually and conceptually (sections, headings, spacing) to reduce cognitive load.
- Signal required vs optional clearly and consistently (e.g., mark required fields with *; do not force users to infer).
- Choose the simplest input that satisfies the requirement: short list → radio; long list → select/autocomplete; free text only when no constraint applies.
- Minimize typing: use defaults, smart suggestions, autofill, and constrained inputs where appropriate.
- Use appropriate input modes/keyboards for mobile (email, numeric) and avoid patterns that cause invalid entry (e.g., numeric spinners for phone numbers or ZIP codes).
- Avoid overly strict validation when you can accept flexible input and normalize it server-side (e.g., phone number formatting).
- For sensitive fields (passwords, payment), ensure compatibility with password managers; never disable paste without a strong justification.

## Do
- Use clear, specific labels in plain language, consistently aligned (typically above inputs for mobile and short forms).
- Group fields into meaningful sections with short headings (e.g., "Billing address", "Payment details").
- Ask only what you need; remove non-essential fields or make them optional.
- Use helper text when users commonly make mistakes or need context (format examples, data usage explanations).
- Prefer selection controls (radio, select, autocomplete) over free text when the valid answer set is known and small.
- Support autofill: keep predictable field names; avoid splitting fields in ways that break autofill unless necessary.
- Support copy/paste and password managers for credentials; provide a show/hide toggle for password fields.
- Accept real-world input formatting (spaces/dashes in phone numbers, upper/lowercase emails) and normalize where feasible.
- Make the primary action clear ("Continue", "Save changes") and align it to a clear step boundary.
- For multi-step flows, show progress and allow back navigation without losing entered data.

## Don't
- Don't use placeholder text as the only label or rely on disappearing hints.
- Don't scatter labels far from their inputs or use ambiguous alignment.
- Don't ask for information you don't need at that point in the flow.
- Don't force users into repeated submit-fail cycles; prevent mistakes up front with constraints, examples, and defaults.
- Don't use dropdowns for short, common mutually exclusive choices — radios are faster and more scannable.
- Don't require users to remember information from previous steps if you can show or summarize it.
- Don't break autofill or password managers with unusual field structures or by blocking paste without strong justification.
- Don't use numeric steppers or spinners for identifiers (phone, ZIP code, credit card number).

## Examples

- ### Label and hint (good)
  Label: "Phone number". Hint: "Include country code if outside the US (for example, +44 20 1234 5678)."

- ### Required fields (good)
  Use a consistent required indicator (* Required) and explain it once at the top of the form. Mark required fields rather than only optional ones.

- ### Input choice (good)
  2–6 mutually exclusive choices → radio buttons (visible options). Long list → autocomplete with search.

- ### Password entry (good)
  Label: "Password". Helper: "At least 12 characters." Provide show/hide toggle; allow paste; avoid overly complex rules unless required.

## Edge Cases
- Identifiers (account numbers, phone, card): avoid controls that imply arithmetic; allow common formatting characters (spaces, dashes) where possible.
- Long forms: prefer multi-step with clear grouping and a review step; preserve data across steps and allow back navigation without data loss.
- Conditional fields (e.g., billing differs from shipping): use progressive disclosure with clear toggles; preserve hidden-field values when toggled off.
- Custom components (custom date picker, select): define keyboard interaction and focus behavior explicitly; ensure accessible labeling.
- Localization: keep labels short, avoid idioms, and ensure layouts can expand for longer translated strings.
- Sensitive data collection: add trust cues and transparent explanations (why needed, how used); avoid unnecessary collection.
