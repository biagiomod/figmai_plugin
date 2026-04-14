---
version: "1.0"
tags: [ux, ui, interaction-design, design-patterns, states, empty-states, loading, progress, notifications, accessibility]
updatedAt: "2026-04-13"
---

## Purpose
Reference knowledge for designing and validating common interaction patterns and UI states: loading, empty, success, failure, partial success, permissions, and offline. Helps teams choose the right feedback pattern, reduce user uncertainty, and improve recoverability and accessibility.

## Scope
Applies to user-facing interfaces across web and mobile: feedback mechanisms, progress indicators, notifications, dialogs, inline messaging, and state coverage for screens, components, and flows. Excludes assistant behavior, tone control, output formatting, schema enforcement, and runtime or DS rules.

## Definitions

- ### UI State
  A distinct condition of a screen or component that affects what users see and can do (loading, empty, error, success, disabled).

- ### Skeleton State
  A placeholder UI approximating the final layout while content loads — improves perceived performance and reduces layout shift.

- ### Determinate Progress
  A progress indicator showing measurable completion (e.g., progress bar with percent). Use when duration or completion can be estimated.

- ### Indeterminate Progress
  A progress indicator showing activity without a completion estimate (e.g., spinner). Use when time is unknown but the system is working.

- ### Empty State
  A screen or region with no data (first use, deleted content, unavailable content). Must explain what is happening and provide a next step.

- ### Zero Results State
  A special empty state triggered by a query or filter returning no matches; must suggest how to broaden or change the query.

- ### Status Message
  An update about success, progress, waiting, or errors that must be programmatically available to assistive tech without forcing a context change.

- ### Snackbar / Toast
  A transient message used for brief feedback that does not block the user; may include a simple action (e.g., Undo).

- ### Dialog
  A blocking overlay requiring user attention or a decision; use for critical confirmations, destructive actions, or complex decisions only.

## Rules
- Always cover core states for key screens and flows: default/content, loading, empty/zero, error, success, disabled, and offline/degraded where relevant.
- Use feedback to reduce uncertainty: users must know what is happening, whether their action worked, and what to do next.
- Choose the least disruptive pattern that still prevents harm: prefer inline feedback or snackbar over modal dialogs unless the decision is high-risk.
- Loading: show an indicator promptly when the user might perceive a stall; use skeletons when content layout is known and load time is noticeable.
- Use determinate progress when you can estimate completion; use indeterminate only when time is genuinely unknown.
- Empty states must: (1) explain why it is empty, (2) provide a learning cue when appropriate, (3) offer a clear next step.
- Error states: if recovery is possible, provide a user action (retry, fix input, adjust filters); do not clear user input on failure.
- For transient notifications, ensure critical information is not lost: persist when necessary or provide a durable log for important events.
- Status messages must be available to assistive technologies without forcing focus changes; do not rely on color alone.
- Interaction states must be visually distinguishable (enabled, disabled, hover, focus, pressed) and consistent across components.

## Do
- Use inline messaging for field-level or component-level issues; use page-level messaging for global failures affecting the whole screen.
- Use snackbars/toasts for lightweight confirmations and reversible actions (e.g., Undo).
- Use dialogs for destructive, irreversible actions or complex decisions requiring explicit confirmation.
- Provide clear success feedback for important actions (save, submit, send) and clarify what changed.
- For empty first-run experiences, provide a primary CTA to create/add/import and a brief explanation of value.
- For zero results, suggest adjustments (remove filters, broaden search, check spelling).
- Preserve user context on failures: retain form inputs, selections, and scroll position when reasonable.
- Design partial success explicitly: show what completed, what failed, and what the user must do next.
- Use consistent visual state patterns for interactive components (hover, focus, pressed, disabled).
- Ensure status messages and confirmations are accessible (screen-reader discoverable) and not communicated by color alone.

## Don't
- Don't show blocking dialogs for low-risk confirmations — creates interruption and habituation to dismiss without reading.
- Don't use spinners for long, predictable operations when a determinate indicator is possible.
- Don't use empty states as dead ends (blank screen with no explanation or next step).
- Don't hide errors behind generic messages without recovery guidance.
- Don't clear user-entered data after an error unless the user explicitly resets it.
- Don't rely on color alone to indicate selection, errors, or status changes.
- Don't make critical status changes ephemeral with no way to find them again (e.g., disappearing toast for a failed payment).

## Examples

- ### Loading (content fetch)
  If a feed takes > ~1 second: show skeleton rows matching the final layout. If duration is unknown: show an indeterminate spinner with brief text like "Loading results…"

- ### Saving (background)
  Inline status near the control: "Saving…" → "Saved". Avoid blocking the user unless there is a conflict risk.

- ### Success (reversible action)
  After deleting an item: snackbar "Item deleted" + action "Undo".

- ### Error (recoverable network)
  Inline banner: "We couldn't load your dashboard. Check your connection and try again." Button: "Retry".

- ### Empty (first run)
  "No projects yet. Create your first project to organize your work." Primary action: "Create project".

- ### Permission state
  "You don't have access to this report." Next steps: "Request access" or "Switch account". Provide a non-blocking path to continue elsewhere.

## Edge Cases
- Offline/degraded mode: clearly indicate offline state, preserve user input, and clarify whether actions are queued or must be retried.
- Long-running operations: show progress, allow safe cancellation when possible, avoid freezing the UI; use determinate progress when feasible.
- Rate limits or repeated failures: after multiple retries, change the guidance (wait, try later, contact support) and avoid infinite retry loops.
- Conflicts (simultaneous edits): explain what changed, show differences if possible, and offer a resolution path (keep mine / keep theirs).
- Multi-pane or complex apps: empty states may be local to a panel; provide local next steps without hijacking the entire screen.
- Security-sensitive actions: require stronger confirmation only when the action is destructive or irreversible; otherwise prefer undo.
