# FigmAI Assistant SDK — Strike Team Guide

This guide covers everything you need to build and maintain an assistant in FigmAI.

---

## Quick Start

For assistants with custom handler logic, copy `evergreens/` as your starting template:

```bash
cp -r src/assistants/evergreens/ src/assistants/your-assistant-name/
```

For AI-only assistants (no custom logic), just create `src/assistants/your-assistant-name/index.ts` directly.

Update the `assistantId` in `index.ts` to match your assistant's ID in the manifest.

---

## Your Two Directories

You own exactly two directories:

| Directory | Purpose |
|-----------|---------|
| `src/assistants/{name}/` | Handler code — TypeScript, built and validated |
| `custom/assistants/{name}/` | Config — `manifest.json` (structure and quick actions), `SKILL.md` (prompt authoring), knowledge files (ACE-editable) |

Never modify files outside these two directories without a Core Code Team review.

## Context Authoring Guidance

For guidance on what should live in assistant-local `SKILL.md` files versus retrieval-backed reference content, see [`llm-context-authoring.md`](llm-context-authoring.md).

Short version:
- put durable behavior, role, and output rules in `SKILL.md`
- put large or fast-changing reference material in `internalKBs`
- do not solve context problems by stuffing long documents into the prompt

---

## The index.ts Contract

Every assistant must have `src/assistants/{name}/index.ts` that exports a default `AssistantModule`:

```typescript
import type { AssistantModule } from '../../sdk'
// If you have custom logic, import your handler:
// import { YourHandler } from './handler'

const module: AssistantModule = {
  assistantId: 'your_assistant_id',   // must match id in custom/assistants.manifest.json
  // handler: new YourHandler(),      // omit if AI-only
}

export default module
```

**AI-only assistants** (just a prompt, no custom logic): omit `handler`.

**Tool assistants** (custom pre-LLM logic): include `handler`.

---

## The Handler Contract

If your assistant needs custom logic, create `handler.ts` in your directory:

```typescript
import type { AssistantHandler, HandlerContext, HandlerResult } from '../../sdk'

export class YourHandler implements AssistantHandler {
  canHandle(assistantId: string, actionId: string | undefined): boolean {
    return assistantId === 'your_assistant_id'
      && actionId === 'your-action-id'
  }

  async handleResponse(ctx: HandlerContext): Promise<HandlerResult> {
    // Your logic here. Use ctx.selectionOrder, ctx.provider, etc.
    return { handled: true }
  }
}
```

Import ONLY from `../../sdk`. Do not import from `../../core/...` directly.
Exception: if you need deep core utilities (scanners, adapters), ask Core Code Team to add them to the SDK.

---

## Testing Locally

```bash
npm run build          # full build — runs compile gate, shows per-assistant report
npm run build:offline  # same but skips S3 sync
```

The compile gate report tells you immediately if your handler has TypeScript errors:

```
── build-assistants ──────────────────────────────────
✓ your-assistant   updated
⚠ analytics        kept previous     handler.ts:14 — Type 'string' is not assignable
```

Errors in other assistants do not block your build. Fix your own errors and ship.

---

## What Core Code Team Owns

The Core Code Team owns everything outside your two directories. You should never need to touch:

- `src/core/`
- `src/sdk/`
- `scripts/`
- `src/main.ts`, `src/ui.tsx`
- `package.json`

If you need a new type exported from the SDK, open a PR to `src/sdk/index.ts` and request Core review.

---

## Onboarding a New Team

1. Core Team admin creates an ACE user with `role: "editor"` and `assistantScope: ["your_assistant_id"]`
2. Create `src/assistants/{name}/` with `index.ts` (and `handler.ts` if needed)
3. Add an entry to `custom/assistants.manifest.json` for your assistant. For per-directory assistants (with `manifest.json` + `SKILL.md` in `custom/assistants/{name}/`), you do not need to include `promptTemplate` in the flat manifest — the build system derives it from your `SKILL.md` automatically.
4. Add CODEOWNERS entries for your directories
5. Run `npm run build` — if it passes, your assistant is live

---

## Annotations

FigmAI exposes a unified annotation API via the SDK. All functions are available to Strike Team assistants by importing from `../sdk`.

### Types

- `AnnotationEntry` — raw annotation entry shape `{ label?, labelMarkdown?, categoryId? }`
- `ResolvedAnnotationEntry` — annotation with resolved category label and normalized plain text:
  - `categoryId?: string` — Figma-internal category ID
  - `categoryLabel?: string` — human-readable category label (undefined if category not in cache)
  - `label?: string` — raw plain-text label
  - `labelMarkdown?: string` — raw markdown label
  - `plainText: string` — normalized plain text (always present, may be empty)
- `VisibleAnnotationCardOptions` — options for `createVisibleAnnotationCard`

### Write API

```typescript
import { ensureAnnotationCategory, safeSetNativeAnnotations, createVisibleAnnotationCard } from '../sdk'
```

**`ensureAnnotationCategory(label, color?)`** — Ensures a Figma annotation category with the given label exists. Returns the category ID, or `undefined` if the Figma annotations API is unavailable. Default color is `'orange'`. Best-effort: does not throw.

**`safeSetNativeAnnotations(node, entries)`** — Sets native Figma annotations on a node (full replacement). Returns `false` if the node does not support annotations. Best-effort.

**`createVisibleAnnotationCard(options)`** — Creates a visible in-canvas annotation card frame. Returns the created `FrameNode`.

### Read API

```typescript
import { readAnnotationValue, readResolvedAnnotations, clearAnnotationCategoryCache } from '../sdk'
```

**`readAnnotationValue(node, categoryLabel)`** — Returns the `plainText` of the first annotation matching `categoryLabel` (case-insensitive), or `null` if no match.

**`readResolvedAnnotations(node)`** — Returns all annotations on `node` as `ResolvedAnnotationEntry[]`. Returns `[]` if the node does not support annotations.

**`clearAnnotationCategoryCache()`** — Clears the shared category cache. Call after file changes or when cache staleness is a concern.

### Category namespacing

Annotation categories are document-scoped in Figma. Use specific labels to avoid cross-assistant contamination (e.g., `"DW-A Review"`, `"Content Review"` rather than `"Review"`).

### Important: safeSetNativeAnnotations overwrites

`safeSetNativeAnnotations` does a full replacement — calling it twice on the same node will erase the first write. If you need to preserve existing annotations, use `readResolvedAnnotations` first, then merge, then write.
