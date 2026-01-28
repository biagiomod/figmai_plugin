# Invariants

**Purpose:** Document confirmed, implemented invariants that must not be broken. For details and rationale, see the linked plan docs.

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

**Details:** [Getting Started](01-getting-started.md), [Project README](../README.md)

---

## 3. Artifact placement and replacement

Placement and replace behavior (e.g. scorecard, deceptive report, critique) are defined in `placeArtifact.ts` and in the Smart Placement v2 plan. Do not change replacement semantics without updating the plan.

**Details:** [Smart Placement v2 Plan](smart-placement-v2-plan.md)
