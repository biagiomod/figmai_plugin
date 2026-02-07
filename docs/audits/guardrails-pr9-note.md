# PR9: Guardrails + routing regression matrix (no behavior change)

## What was added

- **`scripts/assert-invariants.ts`** — Script that fails with clear messages if:
  - Dispatch key is not `getHandler(assistantId, actionId)` (spot-check).
  - ui-only branch in main does not return before any `sendChatWithRecovery`.
  - tool-only branches call `sendChatWithRecovery` (they must return before the LLM path).
  - Assistants are not sourced from generated TS (e.g. runtime JSON read in plugin).
  - `buildSelectionContext` does not gate images on `quickAction?.requiresVision` + provider + selection.

- **`src/core/assistants/routing.regression.test.ts`** — Regression matrix for every `(assistantId, actionId)` from the generated manifest. For each entry it asserts:
  - `action.executionType` matches the manifest (required).
  - `getHandler(assistantId, actionId)` returns a handler iff the audit says that pair is tool-only or LLM-with-handler.
  - Expected route: ui-only, tool-only, llm, hybrid-noop (code2design send/get), canned (json-format-help).

- **npm scripts:** `npm run invariants` (runs assert-invariants), `npm run test` (runs instructionAssembly + routing regression), and `postbuild` runs invariants after build.

## What failures mean

- **assert-invariants fails:** One of the structural invariants above was broken (e.g. someone added a code path where ui-only runs the provider, or assistants are loaded from JSON at runtime). Fix the code to restore the invariant; do not change the script to “pass” without fixing the cause.

- **routing.regression.test fails:** Either (1) the manifest and generated TS were updated (new assistant/action or changed `executionType`) and the expected matrix in the test was not, or (2) handler registration or main routing was changed so `getHandler` or route classification no longer matches the audit. Fix either the code (if the change was unintended) or the test matrix (if you added a new assistant/action or intentionally changed routing).

## How to update the matrix when adding new assistants/actions

1. **Manifest:** Add the new assistant or quick action in `custom/assistants.manifest.json` with the correct `executionType` (`ui-only` | `tool-only` | `llm` | `hybrid`). Run `npm run generate-assistants`.

2. **Handler (if tool-only or LLM-with-handler):** Implement a handler that `canHandle(assistantId, actionId)` and register it in `src/core/assistants/handlers/index.ts`. For tool-only actions, ensure main.ts has a branch that calls the handler and returns before `sendChatWithRecovery`.

3. **Regression test:** In `src/core/assistants/routing.regression.test.ts`:
   - `expectedRoute(assistantId, actionId, executionType)` already derives route from `executionType` and code2design special cases. If your new action is a new **special case** (e.g. a new “canned” or “hybrid-noop” pair), add a branch in `expectedRoute`.
   - If the new action should have a handler, add a case in `expectHandler(assistantId, actionId, route)` so the test expects `getHandler` to return a handler.

4. Run `npm run test` and `npm run invariants`; fix any failures.
