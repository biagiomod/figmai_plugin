# Assistant Handlers

This directory contains all assistant-specific response handlers.

**For the full live assistant registry** (manifest IDs, KB files, status) see: `src/assistants/assistants.md`

---

## Handler Map

| Handler file | Assistant ID | Quick actions handled | Notes |
|---|---|---|---|
| `contentTable.ts` | _(legacy, not used in production)_ | _(superseded)_ | Legacy handler kept for reference. Production builds use the **Evergreens module** at `src/assistants/evergreens/handler.ts`. |
| `contentReview.ts` | `ux_copy_review` | `add-hat` | HAT = Heading Alternative Text. Scans selection for icon/image candidates, optionally calls LLM for label text, adds Figma accessibility annotations. **Pre-LLM handler.** |
| `designCritique.ts` | `design_critique` | `give-critique`, `temp-place-forced-action-card` | Parses and renders JSON scorecard to Figma canvas. **Post-LLM handler.** |
| `designWorkshop.ts` | `design_workshop` | `generate-screens`, `generate-new-table`, etc. | Parses `DesignSpecV1` JSON from LLM response and renders design sections to canvas. **Post-LLM handler.** |
| `discovery.ts` | `discovery_copilot` | `start-discovery` | Creates and incrementally updates a structured Discovery document on canvas. **Post-LLM handler.** |
| `analyticsTagging.ts` | `analytics_tagging` | `get-analytics-tags`, `copy-table`, `new-session` | Selection-driven ActionID scan; no LLM call in this flow. **Pre-LLM handler.** |
| `errors.ts` | `errors` | `errors-output-check`, `errors-output-generate` | Parses errors JSON from LLM and renders structured error report. **Post-LLM handler.** |
| `smartDetector.ts` | _(cross-assistant)_ | `run-smart-detector` | Scans selection using `core/detection/smartDetector`. Available from `general` assistant. Routed via `getHandlerByActionId()`, not by assistant ID. **Pre-LLM handler.** |

---

## Handler Contract

All handlers implement `AssistantHandler` from `./base.ts`:

```typescript
interface AssistantHandler {
  canHandle(assistantId: string, actionId: string | undefined): boolean
  handleResponse?(context: HandlerContext): Promise<HandlerResult>
  prepareMessages?(context: HandlerContext): Promise<PrepareResult>
}
```

- **Pre-LLM handlers** implement `prepareMessages()` or return `{ handled: true }` before `provider.sendChat()` is called — they skip or replace the LLM call.
- **Post-LLM handlers** implement `handleResponse()` after `provider.sendChat()` returns — they process and render the LLM output.

Handlers are registered in `index.ts`. `getHandler(assistantId, actionId)` finds the first matching handler.

---

## Testing

- `contentReview.test.ts` — the only existing handler-level test file; covers HAT candidate detection logic.
- Run with: `npm run test`

---

## Evergreens (content_table) is not here

The `content_table` assistant's production handler lives in:
```
src/assistants/evergreens/handler.ts
```
It is loaded as an `AssistantModule` and registered separately from this directory. See `src/assistants/evergreens/README.md`.
