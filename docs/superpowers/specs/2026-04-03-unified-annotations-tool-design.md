# Unified Annotations Tool — Design Spec
**Date:** 2026-04-03
**Status:** Ready for implementation planning

---

## Summary

This spec promotes Figma annotations from a ContentReview-specific capability to a shared, SDK-accessible tool surface available to all FigmAI assistants and Strike Teams. It consolidates a duplicated category cache, adds a general-purpose read API, replaces a naive text-node annotation tool with two properly backed tool definitions, and exports the full surface through the SDK.

---

## Goals

- Any assistant handler can read and write Figma annotations using shared primitives — no copy-paste from ContentReview.
- The read API is plain-text-first for everyday use, with resolved/raw fields available for advanced consumers.
- Category cache ownership is unified in one place; writes invalidate it immediately so same-session reads are correct.
- Two registered `ToolDefinition` entries (`ANNOTATE_NODES`, `READ_ANNOTATIONS`) back the LLM-callable surface via the existing `RUN_TOOL` → `routeToolCall` dispatch path.
- Handler code can also call the programmatic core functions directly, without going through the tool registry.
- SDK exports give Strike Team assistants access to both the programmatic and tool surfaces.
- Existing ContentReview / HAT behavior is fully preserved with no logic changes.

---

## Non-Goals

- No UI changes.
- No assistant manifest changes (unless the assistant access model analysis below identifies a required exception — see that section).
- No changes to ContentReview handler logic. It may optionally adopt shared primitives in a follow-up, but that is not in scope here.
- No provider-level tool_use schema injection (OpenAI function calling / Anthropic tool_use). The current plugin architecture dispatches tools via `RUN_TOOL` from the UI layer and handler-mediated calls from the main thread, not via LLM-native tool schemas. This spec does not change that architecture.
- No demo-only behavior.
- No unrelated refactors to other modules.

---

## Current State

### What exists

| File | Role |
|---|---|
| `src/core/figma/annotations.ts` | Core write primitives: `ensureAnnotationCategory`, `safeSetNativeAnnotations`, `createVisibleAnnotationCard`, `showOnceUserHint`. Types: `AnnotationEntry`, `VisibleAnnotationCardOptions`. |
| `src/core/analyticsTagging/annotations.ts` | Analytics-specific read functions (`readScreenIdFromNode`, `readActionIdFromNode`) backed by a module-level category cache (`cachedCategoryMap`) and a private `getCategoryMap()` resolver. Exports `clearAnnotationCategoryCache`. |
| `src/core/tools/figmaTools.ts` | `annotateSelectionTool` (id: `ANNOTATE_SELECTION`) — creates raw text nodes near selected nodes. Does not use any core annotation primitives. |
| `src/core/tools/toolRegistry.ts` | Registers `ANNOTATE_SELECTION` and four other tools. Exposes `getTool`, `getAllTools`, `getToolsRequiringSelection`. |
| `src/core/tools/toolRouter.ts` | `routeToolCall(toolCall, selection)` — looks up a `ToolDefinition` by name from the registry and calls `execute`. |
| `src/main.ts` | `on<RunToolHandler>('RUN_TOOL', ...)` — receives tool requests from the UI layer and dispatches via `routeToolCall`. |
| `src/sdk/index.ts` | Exports handler contract types only. No annotation surface. |
| `src/core/assistants/handlers/contentReview.ts` | Uses `ensureAnnotationCategory` + `safeSetNativeAnnotations` directly for HAT. Does not go through the tool registry. |

### Current tool invocation model

It is important to be precise about this before designing the "LLM-callable" surface.

Tools in this codebase are **not** wired through OpenAI/Anthropic native tool_use schemas. There is no system prompt injection of tool schemas into LLM requests. The two real invocation paths are:

1. **UI-driven**: The plugin UI emits `RUN_TOOL` with a tool ID and payload. `main.ts` receives it and calls `routeToolCall`. This is how `EXPORT_SELECTION_TO_TEMPLATE_JSON` and `CREATE_FROM_TEMPLATE_JSON` are used — UI buttons trigger them directly.

2. **Handler-mediated**: A handler's `handleResponse` method receives the LLM text response, parses structured instructions from it (e.g. the DW-A handler parses JSON screen specs), and then calls Figma APIs or other functions directly. A handler can call `routeToolCall` programmatically with constructed args — the LLM's text informs what to call, but the handler drives the invocation.

"LLM-callable" in this spec means: the tool is registered in the registry and reachable via `routeToolCall`, so any handler can invoke it via path 2, and any UI control can invoke it via path 1. It does not mean native LLM function calling.

---

## Problems in Current Design

### P1 — No general-purpose read API

The only annotation read functions are in `src/core/analyticsTagging/annotations.ts` and are hardcoded to "ScreenID" and "ActionID" category labels. Any assistant that wants to read annotations must re-implement the category map resolution or couple itself to the analytics-tagging module.

### P2 — Duplicated category cache

`src/core/analyticsTagging/annotations.ts` owns a module-level `cachedCategoryMap: Map<string, string> | null` and a private `getCategoryMap()` async resolver. `src/core/figma/annotations.ts` — the module that creates categories via `ensureAnnotationCategory` — has no cache and does not update any cache after creation. The two caches are independent: writing a new category via `ensureAnnotationCategory` does not update the ATA cache, so a same-session read after a same-session write may miss the new category.

### P3 — Synchronous raw read is insufficient

A `readAllAnnotations(node): AnnotationEntry[]` that returns only the raw `{ label?, labelMarkdown?, categoryId? }` entries is incomplete for shared consumption. `categoryId` is an opaque string — consumers need the corresponding `categoryLabel` to understand what they are reading. Resolving `categoryId → label` requires an async lookup against the Figma API. A synchronous raw-only read API forces every consumer to implement its own resolution or silently ignore category context.

### P4 — Naive annotation tool

`annotateSelectionTool` creates plain `figma.createText()` nodes placed near selected nodes. It does not use `safeSetNativeAnnotations`, does not create Figma native annotations, and does not support categories, markdown, or visible annotation cards. It is not an annotation tool in the meaningful sense — it is a text-placement tool with an annotation label.

### P5 — No annotation surface in SDK

SDK consumers (Strike Team assistants) cannot access any annotation functions without importing from internal paths, which breaks the SDK contract and is fragile across refactors.

### P6 — No read tool for LLM-callable surface

There is currently no registered `ToolDefinition` that reads annotations. Assistants that want to surface annotation data to an LLM response have no shared tool to call.

---

## Proposed Architecture

### File responsibilities after this change

| File | Change |
|---|---|
| `src/core/figma/annotations.ts` | **Extend.** Add: shared category cache, `getCategoryMapShared()`, `ResolvedAnnotationEntry` type, `readResolvedAnnotations()`, `readAnnotationValue()`, `clearAnnotationCategoryCache()`. Update `ensureAnnotationCategory` to write through to the shared cache. |
| `src/core/analyticsTagging/annotations.ts` | **Slim.** Remove the module-level `cachedCategoryMap` and private `getCategoryMap()`. Import `getCategoryMapShared` from core and use it in the existing read functions. Import and re-export `clearAnnotationCategoryCache` for backwards compatibility with any existing caller. Existing `readScreenIdFromNode` / `readActionIdFromNode` function signatures and behaviour remain unchanged. |
| `src/core/tools/figmaTools.ts` | **Replace + add.** Remove `annotateSelectionTool`. Add `annotateNodesTool` (`ANNOTATE_NODES`) and `readAnnotationsTool` (`READ_ANNOTATIONS`), both backed by core primitives. |
| `src/core/tools/toolRegistry.ts` | **Update registration only.** Replace `annotateSelectionTool` entry with `annotateNodesTool` and `readAnnotationsTool`. No other changes. |
| `src/sdk/index.ts` | **Add exports.** Export `ResolvedAnnotationEntry`, `AnnotationEntry`, `VisibleAnnotationCardOptions`, and the four shared functions: `ensureAnnotationCategory`, `safeSetNativeAnnotations`, `createVisibleAnnotationCard`, `readAnnotationValue`, `readResolvedAnnotations`, `clearAnnotationCategoryCache`. |
| `src/core/assistants/handlers/contentReview.ts` | **No change.** Existing HAT behaviour continues to import `ensureAnnotationCategory` and `safeSetNativeAnnotations` from core. These functions are unchanged. |

No other files require changes for this spec's scope.

---

## API Design

### New type: `ResolvedAnnotationEntry`

Defined in `src/core/figma/annotations.ts`.

```typescript
export interface ResolvedAnnotationEntry {
  /** Category ID as stored on the annotation (opaque, Figma-internal). */
  categoryId?: string
  /** Human-readable label for the category, resolved from the session cache. */
  categoryLabel?: string
  /** Raw plain-text label as set on the annotation, if present. */
  label?: string
  /** Raw markdown label as set on the annotation, if present. */
  labelMarkdown?: string
  /**
   * Normalized plain-text value. Derived by:
   *   1. If label is non-empty: use label as-is.
   *   2. Else if labelMarkdown is non-empty: strip markdown to plain text.
   *   3. Else: empty string.
   * This is the primary field for everyday consumption.
   */
  plainText: string
}
```

**Why plain-text-first:** Annotation content is typically short (HAT labels, screen IDs, review notes). Consumers like assistants building summaries, DW-A generating report cards, and tool output strings do not benefit from preserving markdown structure — they need readable text. Markdown is preserved in `labelMarkdown` for SDK consumers or advanced cases that need it.

**Markdown normalization rule:** Strip `**`, `*`, `_`, `#`, backticks, and leading/trailing whitespace. Collapse runs of whitespace to single space. Do not parse Markdown structure (lists, headings) — flatten to a single plain-text line. This is intentionally minimal. Annotations are not documents.

### Shared category cache (in `src/core/figma/annotations.ts`)

A module-level cache owned entirely in core:

```typescript
let _sharedCategoryCache: Map<string, string> | null = null
// key: categoryId, value: categoryLabel
```

**`getCategoryMapShared(): Promise<Map<string, string>>`** — exported for use by `analyticsTagging/annotations.ts`. Lazy-loads on first call; returns cached result on subsequent calls within the same session.

**`clearAnnotationCategoryCache(): void`** — exported function that sets `_sharedCategoryCache = null`. Callers use this after file changes or when cache staleness is a concern.

**Cache write-through on create:** `ensureAnnotationCategory(label, color)` must update `_sharedCategoryCache` immediately after a successful `addAnnotationCategoryAsync` call:

```typescript
// After successful creation:
if (_sharedCategoryCache !== null) {
  _sharedCategoryCache.set(created.id, label)
}
// If cache is null (not yet loaded), do not initialise it here —
// the next getCategoryMapShared() call will load it fresh and include the new category.
```

This ensures same-session write → read is correct without requiring a full cache invalidation and re-fetch.

### `readAnnotationValue(node, categoryLabel): Promise<string | null>`

Convenience function for simple use cases. Returns the normalized `plainText` of the first annotation on `node` whose `categoryLabel` matches the argument (case-insensitive). Returns `null` if no match or if annotations are not supported on the node.

Internally delegates to `readResolvedAnnotations` and filters by `categoryLabel`.

```typescript
export async function readAnnotationValue(
  node: BaseNode,
  categoryLabel: string
): Promise<string | null>
```

### `readResolvedAnnotations(node): Promise<ResolvedAnnotationEntry[]>`

Full resolved read. Returns all annotation entries on `node` with `categoryLabel` resolved from the shared cache.

- If `node` does not support annotations (no `annotations` property), returns `[]`.
- If the node has annotations but the cache does not contain a `categoryId`'s label, `categoryLabel` is `undefined` for that entry (not an error).
- `plainText` is always present (may be empty string if both `label` and `labelMarkdown` are empty or absent).

```typescript
export async function readResolvedAnnotations(
  node: BaseNode
): Promise<ResolvedAnnotationEntry[]>
```

### Existing functions — unchanged

`ensureAnnotationCategory`, `safeSetNativeAnnotations`, `createVisibleAnnotationCard`, `showOnceUserHint`, `AnnotationEntry`, `VisibleAnnotationCardOptions` — all remain with identical signatures. The only internal change is the write-through in `ensureAnnotationCategory` described above.

---

## Tool Design

### `ANNOTATE_NODES` (id: `'ANNOTATE_NODES'`)

**Purpose:** Write native Figma annotations to all currently selected nodes. Optionally also create a visible in-canvas annotation card adjacent to each selected node.

**Replaces:** `ANNOTATE_SELECTION` (which is removed).

**Args shape** (`Record<string, unknown>` per `ToolDefinition.execute`):

```
categoryLabel    string   required  e.g. "Accessibility", "Review", "Handoff"
categoryColor    string   optional  default: "blue". Passed to ensureAnnotationCategory.
labelMarkdown    string   optional  Preferred. Rich annotation text (markdown).
label            string   optional  Plain text fallback. Used if labelMarkdown absent.
addVisibleCard   boolean  optional  default: false. If true, creates a visible card per node.
cardTitle        string   conditional  Required when addVisibleCard is true.
cardLines        string[] optional  Body lines for the visible card.
```

At least one of `labelMarkdown` or `label` must be non-empty; the tool returns an error string if both are absent.

**Execution:**
1. Validate args. If `addVisibleCard` is true and `cardTitle` is absent, return error string.
2. Call `ensureAnnotationCategory(categoryLabel, categoryColor ?? 'blue')` → `categoryId`.
3. For each node in `figma.currentPage.selection`:
   a. Call `safeSetNativeAnnotations(node, [{ labelMarkdown?, label?, categoryId? }])`.
   b. If `addVisibleCard` is true, call `createVisibleAnnotationCard({ title: cardTitle, lines: cardLines ?? [], x: node.x + node.width + 16, y: node.y })`.
4. Return a plain-text result string: `"Annotated N node(s) with category 'X'."` or an error description if nothing was annotated.

**`requiresSelection`: true**

### `READ_ANNOTATIONS` (id: `'READ_ANNOTATIONS'`)

**Purpose:** Read annotations from all currently selected nodes and return a plain-text summary the LLM or handler can reason about.

**Args shape:**

```
categoryLabel    string   optional  If provided, return only entries matching this category label.
```

**Execution:**
1. For each node in `figma.currentPage.selection`, call `readResolvedAnnotations(node)`.
2. If `categoryLabel` arg is present, filter to entries where `entry.categoryLabel` matches (case-insensitive).
3. Build a plain-text summary: per node, list its name and the `plainText` value of each matching entry (or all entries). Nodes with no matching annotations are noted as "(no annotations)".
4. Return the summary string.

**`requiresSelection`: true**

### Registry update (`toolRegistry.ts`)

Remove the `annotateSelectionTool` import and registration. Add imports for `annotateNodesTool` and `readAnnotationsTool` from `figmaTools.ts`. Register both in the `TOOLS` map. No other registry changes.

---

## SDK Surface

The following additions are made to `src/sdk/index.ts`:

```typescript
// Annotation types
export type { AnnotationEntry, ResolvedAnnotationEntry, VisibleAnnotationCardOptions } from '../core/figma/annotations'

// Annotation write primitives
export { ensureAnnotationCategory, safeSetNativeAnnotations, createVisibleAnnotationCard } from '../core/figma/annotations'

// Annotation read API
export { readAnnotationValue, readResolvedAnnotations, clearAnnotationCategoryCache } from '../core/figma/annotations'
```

Strike Team assistants can `import { readAnnotationValue, safeSetNativeAnnotations } from '../sdk'` without touching internal paths.

The two tool definitions (`annotateNodesTool`, `readAnnotationsTool`) are **not** exported from the SDK — they are `ToolDefinition` runtime objects that only make sense within the plugin main thread. SDK consumers call the underlying functions directly.

---

## Assistant Access Model

### The problem with "register and done"

Registering `ANNOTATE_NODES` and `READ_ANNOTATIONS` in `toolRegistry.ts` makes them reachable via `routeToolCall`. It does not mean all assistants can call them. There are three distinct invocation paths, and each has a different access requirement:

**Path 1 — UI-driven (`RUN_TOOL` event).**
Any UI code can call `emit<RunToolHandler>('RUN_TOOL', 'ANNOTATE_NODES', { ... })`. This is available to all assistants whose UI renders controls that emit this event. No assistant manifest changes are required for this path — it is already universally available via the shared event bus. A UI button in any assistant panel can trigger any registered tool by ID.

**Path 2 — Handler-mediated (programmatic from main thread).**
Any assistant handler's `handleResponse` method can import `routeToolCall` from `src/core/tools/toolRouter.ts` and call it with constructed args, or import the core functions directly (e.g. `safeSetNativeAnnotations`, `readResolvedAnnotations`) and call them without going through the registry. This path requires no manifest changes — it is handler code, and any handler can import any core module.

**Path 3 — LLM-driven tool_use (OpenAI/Anthropic native function calling).**
This path does **not** currently exist in this codebase. There is no mechanism to inject tool schemas into LLM prompts or to route LLM-native `tool_use` blocks through `routeToolCall`. If a future change introduces native tool_use, the annotation tools would need to be registered as schemas at the provider level. That is out of scope for this spec.

### What this means in practice

All assistants in the FigmAI plugin **already have access** to the annotation tool surface after this change, via paths 1 and 2, without any manifest or assistant-level configuration:

- Any handler can call `readResolvedAnnotations` or `safeSetNativeAnnotations` directly from a `handleResponse` implementation.
- Any UI panel can emit `RUN_TOOL` with `ANNOTATE_NODES` or `READ_ANNOTATIONS`.
- Any Strike Team SDK assistant can import from `src/sdk/index.ts`.

**No assistant manifest changes are required.**

The only real access concern is discoverability — developers building new handlers need to know these functions exist. The SDK export and the updated `DOCS_ASSISTANT_SDK.md` (already at `docs/ASSISTANT_SDK.md`) are the right places to document the annotation surface. The implementation plan should include updating that doc.

---

## Cache Strategy

### Ownership

Single module-level cache: `_sharedCategoryCache: Map<string, string> | null` in `src/core/figma/annotations.ts`.

- `null` = not yet loaded.
- Non-null = loaded (may be empty map if no categories exist).

### Load

`getCategoryMapShared()` is async. On first call it fetches via `figma.annotations.getAnnotationCategoriesAsync()` (if available), builds the map, stores it, and returns it. On subsequent calls it returns the stored map without a fetch. If the API is unavailable, stores and returns an empty map.

### Write-through on create

When `ensureAnnotationCategory` successfully creates a new category, it writes `_sharedCategoryCache.set(newId, label)` if the cache is non-null. If the cache is null (not yet loaded), it leaves it null — the next `getCategoryMapShared()` call will load fresh data including the new category. This avoids both a stale-read problem and an unnecessary partial load.

### Invalidation

`clearAnnotationCategoryCache()` sets `_sharedCategoryCache = null`. Call this when:
- The Figma file has changed and categories may have been added or removed externally.
- A plugin session restarts (the cache is already null at module load).

`analyticsTagging/annotations.ts` removes its own `cachedCategoryMap` and `getCategoryMap()`. It imports `getCategoryMapShared` from core and calls it in place of `getCategoryMap`. It imports and re-exports `clearAnnotationCategoryCache` for backwards-compatibility with any existing callers. The `clearAnnotationCategoryCache` export in ATA becomes a passthrough re-export — it clears the same underlying cache.

---

## Migration Plan

This change is backwards-compatible. No existing behaviour changes. Execution order:

1. **Extend `src/core/figma/annotations.ts`** — add cache, `getCategoryMapShared`, `ResolvedAnnotationEntry`, `readResolvedAnnotations`, `readAnnotationValue`, `clearAnnotationCategoryCache`. Update `ensureAnnotationCategory` for write-through.

2. **Update `src/core/analyticsTagging/annotations.ts`** — remove module-level cache and private `getCategoryMap`. Import `getCategoryMapShared` and `clearAnnotationCategoryCache` from core. Wire `getCategoryMap` calls to `getCategoryMapShared`. Re-export `clearAnnotationCategoryCache`. Run existing ATA tests to confirm no regression.

3. **Update `src/core/tools/figmaTools.ts`** — remove `annotateSelectionTool`. Add `annotateNodesTool` and `readAnnotationsTool` using core primitives.

4. **Update `src/core/tools/toolRegistry.ts`** — swap `annotateSelectionTool` for the two new tools.

5. **Update `src/sdk/index.ts`** — add annotation exports.

6. **Update `docs/ASSISTANT_SDK.md`** — document the annotation surface for handler authors and Strike Teams.

If any step breaks the build, steps 1-2 are independently verifiable (no tool registry changes) and steps 3-4 are independently verifiable (no annotation API changes). This decoupling makes rollback or partial-ship safe.

---

## Testing Plan

The following cases must be covered. Some require new tests; some verify no regression.

### Category + write + read (new — integration)
- Create a new annotation category → write an annotation to a node using that category → `readAnnotationValue(node, categoryLabel)` in the same session returns the correct plain text.
- Verifies: cache write-through on create, resolver correctness, same-session consistency.

### Bulk resolved read (new — unit)
- `readResolvedAnnotations(node)` returns `ResolvedAnnotationEntry[]` with correct `categoryLabel` (resolved from cache), `label`, `labelMarkdown`, and `plainText` for a node with multiple annotations across multiple categories.
- Verifies: full resolution path, multi-entry correctness.

### Markdown normalization (new — unit)
- `readAnnotationValue` on a node annotated with `labelMarkdown: "**HAT:** Book queue\n\n**Confidence:** high"` returns `"HAT: Book queue Confidence: high"` (or equivalent normalized form per the spec rule).
- Verifies: normalization is consistent and strips formatting without losing content.

### ATA regression (existing tests + new)
- `readScreenIdFromNode` and `readActionIdFromNode` continue to return correct values after the cache ownership moves to core.
- `clearAnnotationCategoryCache()` imported from `analyticsTagging/annotations.ts` correctly clears the shared core cache (not a dead no-op).
- Verifies: migration step 2 does not break ATA.

### `ANNOTATE_NODES` — without visible card (new — integration)
- Call `ANNOTATE_NODES` with `addVisibleCard: false` on a selection → node has the expected native annotation → no visible card frame is created on the canvas.

### `ANNOTATE_NODES` — with visible card (new — integration)
- Call `ANNOTATE_NODES` with `addVisibleCard: true`, `cardTitle: "Review"`, `cardLines: ["Issue: contrast"]` → node has the expected native annotation AND a visible annotation card frame is present at `x: node.x + node.width + 16, y: node.y`.

### `READ_ANNOTATIONS` — category filter (new)
- Node has two annotations with different category labels → `READ_ANNOTATIONS` with `categoryLabel: "Review"` returns only the "Review" annotation → response does not include the other category.

### `READ_ANNOTATIONS` — no annotations (new)
- `READ_ANNOTATIONS` on a node with no annotations returns a message noting "(no annotations)", not an error or empty string.

### SDK access proof (new)
- A minimal test or verified code path demonstrates that a handler importing only from `src/sdk/index.ts` can call `readAnnotationValue` and `safeSetNativeAnnotations` successfully — i.e., the SDK export path resolves without needing internal imports.
- This is the "all assistants" proof path. It does not need a full E2E plugin run — a TypeScript compilation check that a stub SDK-only handler compiles cleanly is sufficient.

---

## Risks and Open Questions

### R1 — `figma.annotations` API availability
The native Figma annotations API (`figma.annotations.getAnnotationCategoriesAsync`, `addAnnotationCategoryAsync`) is only available in Dev Mode or when annotations are enabled. All reads and writes must continue to be best-effort with graceful fallback. `readResolvedAnnotations` must not throw if the API is unavailable — it returns `[]`. `ensureAnnotationCategory` must continue to return `undefined` on failure. This is already true of the existing code; the new functions must maintain this invariant.

### R2 — Category label collisions
`ensureAnnotationCategory` reuses an existing category if one with the same label already exists. Two assistants using the same label (e.g. "Review") will share that category. This is intentional — categories are document-scoped in Figma — but assistants should use specific labels to avoid cross-contamination (e.g. "DW-A Review", "Content Review" rather than just "Review"). The spec does not enforce label namespacing but the SDK doc should recommend it.

### R3 — `safeSetNativeAnnotations` overwrites all annotations on a node
The current implementation sets `node.annotations = normalized` — a full replacement. If two assistants independently annotate the same node, the second write will erase the first. A merge strategy (read-then-write) is not implemented and is not in scope for this spec. Callers should be aware of this. If merge semantics are ever needed, `readResolvedAnnotations` provides the read side to build on.

### R4 — Markdown normalization edge cases
The normalization rule (strip `**`, `*`, `_`, `#`, backticks, collapse whitespace) is specified as intentionally minimal. Annotation content that uses markdown structure beyond basic emphasis (e.g. the HAT label format `**HAT:** ... **Confidence:** ...`) will have those markers stripped but text preserved. Callers using `labelMarkdown` for multi-section structured content should accept that `plainText` is a flattened representation, not a structured parse.

### R5 — ATA `clearAnnotationCategoryCache` re-export
The ATA module will re-export `clearAnnotationCategoryCache` from core. Any existing caller of `clearAnnotationCategoryCache` imported from `analyticsTagging/annotations.ts` will continue to work without changes. Verify there are no other callers importing it from elsewhere.

---

## Recommended Implementation Order

1. Extend `src/core/figma/annotations.ts` (cache, types, read API, write-through). Build + unit tests.
2. Slim `src/core/analyticsTagging/annotations.ts` (remove duplicate cache, import from core, re-export). Run ATA regression tests.
3. Replace `annotateSelectionTool` and add `readAnnotationsTool` in `src/core/tools/figmaTools.ts`.
4. Update `src/core/tools/toolRegistry.ts` (swap registrations).
5. Add exports to `src/sdk/index.ts`.
6. Update `docs/ASSISTANT_SDK.md` with the annotation surface.
7. Full build + all tests.
