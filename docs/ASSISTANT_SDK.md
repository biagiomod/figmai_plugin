# FigmAI Assistant SDK — Strike Team Guide

This guide covers everything you need to build and maintain an assistant in FigmAI.

---

## Quick Start

Copy the `analytics/` template directory (when it exists) and rename it to your assistant name. If you need custom logic (like Evergreens), copy `evergreens/` instead.

```bash
cp -r src/assistants/analytics/ src/assistants/your-assistant-name/
```

Update the `assistantId` in `index.ts` to match your assistant's ID in the manifest.

---

## Your Two Directories

You own exactly two directories:

| Directory | Purpose |
|-----------|---------|
| `src/assistants/{name}/` | Handler code — TypeScript, built and validated |
| `custom/assistants/{name}/` | Config — manifest JSON, knowledge files, KB files (ACE-editable) |

Never modify files outside these two directories without a Core Code Team review.

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
3. Add an entry to `custom/assistants.manifest.json` for your assistant
4. Add CODEOWNERS entries for your directories
5. Run `npm run build` — if it passes, your assistant is live
