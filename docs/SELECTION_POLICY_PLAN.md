# Selection Policy for Analytics Tagging — Plan

## Problem

Analytics Tagging requires exactly two nodes: **container** (crop region) and **target** (interaction target). The plugin must keep **both** and pass them in canonical order `[container, target]`. Current behavior does not normalize selection for this case: (1) Figma may report only one node when both are in the hierarchy in some flows; (2) when two nodes are selected, their order may be [target, container] so using `selectionOrder[0]` as container would be wrong. We need a minimal **selection policy** that preserves existing behavior for all current assistants and adds a resolver for Analytics Tagging that produces `[ancestor, descendant]` when one node contains the other.

---

## 1. Where selection normalization / pruning occurs

### 1.1 Current flow

- **`main.ts`**
  - **Line ~145:** `selectionOrder: string[]` — holds node IDs in selection order.
  - **Lines ~1269–1287:** `figma.on('selectionchange')` — updates `selectionOrder`: (1) remove IDs no longer in `figma.currentPage.selection`, (2) append newly selected node IDs. **No ancestor-pruning:** order is whatever Figma reports; no filtering by hierarchy.
  - **Lines ~1289–1292:** Initial `selectionOrder = initialSelection.map(node => node.id)` — raw Figma order.
- **Handlers** receive `selectionOrder` in `HandlerContext`. Single-node assistants use `selectionOrder[0]` (Design Critique, Content Table, etc.). Analytics Tagging uses `selectionOrder[0]` as container and `selectionOrder[1]` as target.

### 1.2 Conclusion

- **No explicit “normalization” or “pruning” module** in the codebase. Selection order is raw Figma order.
- **Touchpoint for policy:** The only place we need to change behavior is **before** passing `selectionOrder` into the Analytics Tagging handler (and only for the add-row action). We add a **resolver** that, when policy is `ANALYTICS_TAGGING_PAIR`, takes raw `selectionOrder` and returns either a resolved list `[ancestor, descendant]` or an error. All other code paths continue to receive `selectionOrder` unchanged (NORMAL policy).

### 1.3 Exact touchpoints

| Location | Role |
|----------|------|
| **`main.ts`** | Holds `selectionOrder`; on RUN_QUICK_ACTION for `analytics_tagging` + `add-row`, call resolver with policy `ANALYTICS_TAGGING_PAIR` **before** building handlerContext; pass **resolved** `selectionOrder` (or fail with guidance and do not call handler). |
| **New module (e.g. `core/selection/resolve.ts` or `core/context/selectionPolicy.ts`)** | Defines `SelectionPolicy` enum and `resolveSelectionWithPolicy(selectionOrder, policy)`; implements ANALYTICS_TAGGING_PAIR resolver. |
| **`core/assistants/handlers/analyticsTagging.ts`** | No change to validation logic; it already expects `selectionOrder[0]=container`, `selectionOrder[1]=target`. It will receive the **resolved** order from main. |

---

## 2. SelectionPolicy enum (or equivalent)

- **`NORMAL`** — No resolution. Pass `selectionOrder` through as-is. Used for all assistants/actions except Analytics Tagging add-row.
- **`ANALYTICS_TAGGING_PAIR`** — Require exactly 2 nodes; if one is ancestor of the other, output `[ancestor, descendant]`; else output as-is; if ≠2, return error with guidance (do not guess).

(If the codebase prefers a string union or a const object, same two behaviors: one “passthrough”, one “pair resolver”.)

---

## 3. Resolver behavior for ANALYTICS_TAGGING_PAIR

- **Input:** `selectionOrder: string[]`, current Figma selection order.
- **Output:** Either `{ ok: true, selectionOrder: string[] }` or `{ ok: false, message: string }`.
- **Rules:**
  1. **Exactly 2 nodes:** If `selectionOrder.length !== 2`, return `{ ok: false, message: 'Select exactly two nodes: interaction area (container), then interaction target.' }` (or equivalent guidance). Do not guess (e.g. do not infer second node from hierarchy).
  2. **One is ancestor of the other:** Resolve both nodes by id; if `isDescendant(nodeA, nodeB)` then ancestor = nodeB, descendant = nodeA → return `[nodeB.id, nodeA.id]`. If `isDescendant(nodeB, nodeA)` then return `[nodeA.id, nodeB.id]`. Order in result: `[ancestor, descendant]` so that `selectionOrder[0]` = container (ancestor), `selectionOrder[1]` = target (descendant).
  3. **Neither contains the other:** Return `selectionOrder` as-is. Let the Analytics Tagging handler’s existing `validateSelection` handle geometry (container type, target inside/overlapping crop). No reordering.
  4. **Invalid nodes:** If either id fails to resolve (e.g. node removed), return `{ ok: false, message: 'One or both selected nodes could not be found.' }`.

Helper `isDescendant(ancestor: BaseNode, node: BaseNode): boolean` — walk `node.parent` until null or hit `ancestor`. Reuse the same logic already in `core/analyticsTagging/selection.ts` (e.g. export it or duplicate in the resolver module to avoid circular dependency).

---

## 4. How to route policy

- **Recommendation: by (assistantId, actionId) in main.**  
  When handling RUN_QUICK_ACTION, immediately after resolving `assistantId` and `actionId`, compute policy:
  - If `assistantId === 'analytics_tagging' && actionId === 'add-row'` → policy = `ANALYTICS_TAGGING_PAIR`.
  - Else → policy = `NORMAL`.
- **Single call site:** In the block where we build `handlerContext` for analytics_tagging (e.g. lines ~743–774 in main.ts), **before** creating the context:
  1. If `actionId === 'add-row'`, call `resolveSelectionWithPolicy(selectionOrder, SelectionPolicy.ANALYTICS_TAGGING_PAIR)`.
  2. If result is `ok: false`, call `replaceStatusMessage(requestId, result.message, true)`, optionally `figma.notify(result.message)`, and `return` (do not call handler).
  3. If `ok: true`, use `result.selectionOrder` as the `selectionOrder` passed in `handlerContext`. For `export` and `new-session` we do **not** need resolution (no selection requirement); keep passing raw `selectionOrder` or pass as-is with NORMAL.

So: **route by (assistantId, actionId)**; only `analytics_tagging` + `add-row` uses `ANALYTICS_TAGGING_PAIR`; all other paths use NORMAL and see no change.

---

## 5. Call-site changes (minimal diff)

### 5.1 main.ts

- **Import:** `SelectionPolicy`, `resolveSelectionWithPolicy` from the new policy module.
- **Inside the `analytics_tagging` quick-action block (e.g. before building handlerContext):**
  - If `actionId === 'add-row'`:
    1. `const resolved = resolveSelectionWithPolicy(selectionOrder, SelectionPolicy.ANALYTICS_TAGGING_PAIR)`.
    2. If `!resolved.ok`: `replaceStatusMessage(requestId, resolved.message, true)`, optional `figma.notify(resolved.message)`, `return`.
    3. Set local variable `resolvedSelectionOrder = resolved.selectionOrder` (or reuse name for clarity).
  - Build `handlerContext` with `selectionOrder: actionId === 'add-row' ? resolvedSelectionOrder : selectionOrder` (so export/new-session still get raw selectionOrder; add-row gets resolved).
- **No other changes in main.ts:** selectionchange listener and initial selection remain unchanged; all other assistants continue to receive `selectionOrder` unchanged.

### 5.2 New module (e.g. `src/core/context/selectionPolicy.ts` or `src/core/selection/resolve.ts`)

- Export `SelectionPolicy` enum: `NORMAL`, `ANALYTICS_TAGGING_PAIR`.
- Export `resolveSelectionWithPolicy(selectionOrder: string[], policy: SelectionPolicy): { ok: true, selectionOrder: string[] } | { ok: false, message: string }`.
  - For `NORMAL`: return `{ ok: true, selectionOrder }` immediately.
  - For `ANALYTICS_TAGGING_PAIR`: implement the rules in §3 (length 2, ancestor/descendant reorder, else as-is, invalid nodes).

### 5.3 analyticsTagging handler

- **No change.** It already expects `selectionOrder[0]` = container, `selectionOrder[1]` = target and calls `validateSelection(selectionOrder)`. It will receive the resolved order from main.

### 5.4 Other handlers / buildSelectionContext

- **No change.** They keep receiving `selectionOrder` from main; main only replaces it with resolved order for analytics_tagging add-row. All other code paths still get the same `selectionOrder` as today (NORMAL).

---

## 6. Minimal diff strategy

- **Add:** One new file (selection policy module) with enum + resolver.
- **Change:** One block in main.ts (analytics_tagging + add-row): add ~5–10 lines to call resolver and, on failure, replaceStatusMessage + return; on success, pass `resolved.selectionOrder` into handlerContext.
- **Do not change:** selectionchange listener, summarizeSelection, buildSelectionContext, any other handler, or Analytics Tagging’s validateSelection. Existing selection behavior for Design Critique, Content Table, etc. is preserved.

---

## 7. Summary

| Item | Decision |
|------|----------|
| **Where normalization occurs** | No current pruning in code; raw selectionOrder in main. Policy applied only at main → handler handoff for analytics_tagging add-row. |
| **SelectionPolicy** | NORMAL (passthrough) \| ANALYTICS_TAGGING_PAIR (require 2; output [ancestor, descendant] when applicable). |
| **ANALYTICS_TAGGING_PAIR resolver** | Exactly 2 nodes; if one ancestor of the other → [ancestor, descendant]; else as-is; ≠2 or invalid → error with guidance; no guessing. |
| **Routing** | By (assistantId, actionId) in main: analytics_tagging + add-row → ANALYTICS_TAGGING_PAIR; else NORMAL. |
| **Call-site** | main.ts: for add-row only, resolve then pass resolved selectionOrder to handlerContext; new selectionPolicy module with enum + resolver. Handler and rest of app unchanged. |

No code changes in this deliverable; plan only.
