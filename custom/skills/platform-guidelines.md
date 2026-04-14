---
version: "1.0"
tags: [platform-guidelines, ios, android, web, interaction-design, navigation, components, accessibility, conventions]
updatedAt: "2026-04-13"
---

## Purpose
Reference knowledge for evaluating and aligning UI designs with platform conventions across iOS, Android (Material), and the web. Ensures predictable navigation, appropriate component choices, consistent interaction behaviors, and accessible patterns.

## Scope
Applies to user-facing UI design for iOS/iPadOS, Android/Material, and web apps: navigation patterns, common components, interaction behaviors, states, and web semantic expectations. Excludes assistant behavior, output formatting, schema enforcement, and design-system-specific rules (handled by Design System skills).

## Definitions

- ### Platform Convention
  A widely expected UI behavior or pattern on a platform (e.g., iOS tab bar for top-level destinations; Material bottom navigation for primary destinations).

- ### Top-level Navigation
  Navigation that switches between primary areas of an app (tabs, bottom nav).

- ### Hierarchical Navigation
  Navigation within a section: push to detail, back to list.

- ### Modal
  A temporary overlay requiring the user to complete or dismiss it before returning to the underlying context — used for focused tasks.

- ### Web Semantics
  Using native HTML elements and/or correct ARIA roles/states so assistive technologies can interpret controls and patterns (e.g., combobox behavior, form autocomplete).

## Rules
- Prefer platform-native patterns for navigation and core controls; deviations must have a clear user benefit and be applied consistently.
- Use top-level navigation for switching primary destinations; use hierarchical navigation for drilling in and out within a destination.
- Avoid mixing multiple top-level nav paradigms on the same surface (e.g., tab bar plus bottom nav) unless there is a strong, well-tested rationale.
- Match component choice to platform expectations: use platform-standard controls for switches, selection, dialogs, and navigation where possible.
- Make interactive states clear and consistent across all components (enabled, disabled, pressed, focused).
- Accessibility is not optional: on web, prefer native HTML controls; use WAI-ARIA APG patterns when building custom widgets.
- Web forms must support autofill where appropriate; use standard `autocomplete` attribute tokens and do not invent custom values.
- For cross-platform experiences, standardize the underlying IA and tasks while allowing platform-specific UI conventions to differ.

## Do
- Use iOS tab bars for switching between top-level sections; keep tab destinations stable and recognizable.
- Use Material navigation bars/bottom navigation for 3–5 primary destinations; keep labels clear and consistent.
- Use top app bars for screen-level navigation and contextual actions; keep key actions visible and avoid overcrowding.
- Use dialogs for high-stakes confirmations and complex decisions; prefer non-blocking feedback (snackbars/toasts) for low-risk confirmations and undo.
- On web, use native inputs, buttons, and links when possible; for custom widgets, follow WAI-ARIA APG interaction models (keyboard, roles, states).
- Specify `autocomplete` attributes on web form fields where it improves entry speed and accuracy (e.g., name, email, address).
- Design for back/escape behavior: users must be able to leave or undo safely — especially for modals and destructive actions.

## Don't
- Don't reinvent common platform controls (switches, pickers, navigation) without a strong reason; it increases learning cost and accessibility risk.
- Don't hide primary navigation behind ambiguous gestures or icon-only controls without labels when clarity is needed.
- Don't overuse modals; avoid blocking users for low-risk confirmations or routine feedback.
- Don't create custom web widgets without specifying keyboard behavior, focus management, and ARIA semantics that match an established pattern.
- Don't disable or sabotage web autofill with nonstandard `autocomplete` values or unusual field structures unless explicitly required.
- Don't rely on hover-only interactions for core actions in touch environments.

## Examples

- ### iOS top-level navigation
  Tab bar to switch between primary areas (Home, Search, Profile). Keep the same destinations available throughout typical navigation paths.

- ### Material top app bar + navigation bar
  Top app bar for contextual title and actions; bottom navigation bar for 3–5 primary destinations; avoid placing too many competing actions in the app bar.

- ### Web combobox vs select
  Large list with type-ahead → combobox pattern with correct keyboard support. Small fixed set → native select or radio group.

- ### Web autofill
  Shipping address form: include standard `autocomplete` tokens (`shipping street-address`, `postal-code`) to support browser autofill.

## Edge Cases
- Cross-platform parity: keep IA consistent but allow platform-specific UI differences (iOS tab bars and back conventions vs Material navigation drawer patterns).
- Dense enterprise UIs: prioritize scannability and predictable navigation; avoid hidden actions that require discovery (especially icon-only controls without labels).
- Custom components: when not using native controls, explicitly define keyboard interaction, focus order, and accessible roles/states; reference ARIA APG patterns for web.
- Hybrid apps (web in mobile shells): validate back behavior, modal dismissal, and focus/keyboard interactions carefully when mixing web patterns with native expectations.
- Internationalization: ensure labels accommodate longer translated strings; avoid hard-coded truncation that hides meaning in navigation destinations or key actions.
