# Invariants

**Purpose:** Document confirmed, implemented invariants that must not be broken. All invariants are enforced by `scripts/assert-invariants.ts` (run: `npm run invariants`).

---

## 0. "Internal" terminology

- **"Internal API" / "internal provider"** refer to the **plugin feature**: the option to send LLM/chat requests to a user-configured backend URL (Internal API) instead of Proxy. They do **not** refer to an employer or corporate environment.
- **Prohibited:** Do not use "internal" to mean employer-specific internal tools, networks, or environments. Documentation must remain employer-agnostic.

---

## 1. Internal API routing precedence

When Internal API is enabled (settings: `connectionType === 'internal-api'` and `internalApiUrl` is set):

- **All** LLM/chat requests **must** go through **InternalApiProvider only**.
- Proxy and other providers are not used for that session.
- If proxy settings exist at the same time, they are inactive; the plugin may show a non-blocking notice ("Internal API active; proxy ignored").

**Details:** [Internal API Routing and Stability](plans/internal-api-routing-and-stability-implementation.md)

---

## 2. Message history and handler contract

- Main thread (`main.ts`) is the single source of truth for message history.
- Assistant-specific logic lives in handlers; `main.ts` orchestrates and does not implement assistant behavior.
- All LLM requests go through the provider interface (single provider instance from the factory).
- Handler dispatch uses `getHandler(assistantId, actionId)` — both parameters are required.

**Details:** [Getting Started](01-getting-started.md), [Project README](../README.md)

---

## 3. Artifact placement and replacement

Placement and replace behavior (e.g. scorecard, deceptive report, critique) are defined in `placeArtifact.ts` and in the Smart Placement v2 plan. Do not change replacement semantics without updating the plan.

**Details:** [`placeArtifact.ts`](../src/core/figma/artifacts/placeArtifact.ts), [Smart Placement v2 Plan](smart-placement-v2-plan.md)

---

## 4. Execution type routing

Quick action dispatch routes by `executionType` from the manifest:

- **`ui-only`**: returns immediately — main thread does nothing.
- **`tool-only`**: routed to a registered handler, returns before any LLM provider call.
- **`llm`**: routed to the LLM path with `sendChatWithRecovery`.
- **`hybrid`**: handled inline (currently `code2design` only).

The invariant enforces that `ui-only` and `tool-only` branches return **before** any `sendChatWithRecovery` call.

---

## 5. Assistants sourced from generated TypeScript only

The plugin must never `require()` or `readFileSync()` `assistants.manifest.json` or `config.json` at runtime. All assistant data is consumed from `assistants.generated.ts`, which is produced at build time by `scripts/compile-skills.ts`.

---

## 6. Image gating in selection context

`buildSelectionContext` includes images only when all three conditions are met:

1. `quickAction.requiresVision === true`
2. Provider supports images (`providerSupportsImages`)
3. `selection.hasSelection === true`

---

## 7. Allowed domains blocklist

The following analytics/monitoring domains must never appear in `manifest.networkAccess.allowedDomains`, `config.networkAccess`, `config.analytics.endpointUrl`, `config.llm.endpoint`, or `config.llm.proxy.baseUrl`:

`statsigapi.net`, `segment.io`, `segment.com`, `amplitude.com`, `posthog.com`, `sentry.io`, `datadoghq.com`

---

## 8. Private-mode domain audit

When `BUILD_ENV=private` (or `BUILD_ENV=work`), the following additional restrictions apply:

- No public LLM services (e.g. `openai.com`)
- No public tunnel services (e.g. `ngrok`)
- No localhost/loopback addresses
- `config.llm.provider` must be `"internal-api"`
- `config.llm.endpoint` must be set

Public display links in `resources.links` (e.g. Figma Community URLs) generate a warning but do not fail the check.

---

## 9. SmartDetector port compliance

No file outside `DefaultSmartDetectionEngine.ts` and the `smartDetector/index.ts` barrel may:

- Call `scanSelectionSmart()` directly
- Import from the `detection/smartDetector` barrel or `detection/smartDetector/index`

All consumers must go through `SmartDetectionPort`. Files within the `smartDetector/` directory may cross-import freely (they are the engine internals).

---

## 10. Design System port compliance

No file outside the designated Default*Engine implementations may import these DS internal modules directly:

- `designSystem/registryLoader`
- `designSystem/assistantApi`
- `designSystem/componentService`
- `designSystem/searchIndex`

**Exempted files** (with documented reasons):
- `DefaultDSPromptEnrichmentEngine.ts`, `DefaultDSQueryEngine.ts`, `DefaultDSPlacementEngine.ts` — they ARE the port adapters
- `custom/knowledge.ts` — implementation layer for DSPromptEnrichmentPort (routing through engine would be circular)
- `core/tools/designSystemTools.ts` — covers operations not yet on the port
- `core/designWorkshop/renderer.ts` — demo-only nuxt flow

---

## 11. Manifest-handler drift

Every `tool-only` quick action in the generated manifest must have a registered handler via `getHandler(assistantId, actionId)`. This is currently a warning (not a hard failure) to allow incremental addition of new actions.
