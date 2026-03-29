# FigmAI Extensibility Architecture Design

**Date:** 2026-03-26
**Status:** Approved — pending implementation plan
**Author:** Core Code Team

---

## Overview

This spec defines how the FigmAI plugin codebase becomes extensible — allowing a Core Code Team to own the platform layer while individual Strike Teams own their own Assistant code in isolated directories, with typed build-time contracts, per-assistant compile isolation, scoped ACE admin access, and a local-only testing workflow.

The chosen approach: **Directory SDK + per-assistant compile gate** (Option A from brainstorm).

---

## 1. Repository Structure

The codebase splits into two protected zones: Core (owned by Core Code Team) and Strike Team directories (each owned by the respective team). All changes are migrations — nothing is deleted.

### Source code

**Today:**
```
src/core/assistants/handlers/
  contentTable.ts       ← Evergreens handler
  analytics.ts
  accessibility.ts
  index.ts              ← all handlers wired here

src/assistants/
  contentTable.md       ← Evergreens KB
  assistants.generated.ts
  index.ts
```

**After migration:**
```
src/sdk/index.ts                               ← NEW: public SDK contract (Core owns)

src/assistants/
  evergreens/                                  ← Evergreens Team owns this directory
    handler.ts                                 ← moved from core/assistants/handlers/
    knowledge.md                               ← moved from src/assistants/
    index.ts                                   ← NEW: module entry point
    evergreens.generated.ts                    ← NEW: generated at build time
  analytics/                                   ← Analytics Team
  accessibility/                               ← A11y Team
  prompt-to-screen/                            ← P2S Team
  _registry.generated.ts                       ← NEW: assembled from all .generated.ts

CODEOWNERS                                     ← NEW: enforces per-directory ownership
docs/ASSISTANT_SDK.md                          ← NEW: SDK documentation for Strike Teams
```

### Config structure (custom/)

**Today:**
```
custom/
  assistants.manifest.json    ← all teams edit one file; merge conflicts guaranteed
  knowledge/
    content_table.md
  knowledge-bases/
    registry.json             ← shared
    evergreens.kb.json
    analytics.kb.json
```

**After migration:**
```
custom/assistants/
  evergreens/                 ← Evergreens Team owns this
    manifest.json             ← split from big manifest
    knowledge/content_table.md
    knowledge-bases/registry.json
    knowledge-bases/evergreens.kb.json
  analytics/
    manifest.json
    knowledge/analytics.md
    knowledge-bases/analytics.kb.json
  accessibility/
    ...
```

### Ownership enforcement

A `CODEOWNERS` file assigns each Strike Team directory to their team:

```
src/assistants/evergreens/   @evergreens-team
src/assistants/analytics/    @analytics-team
custom/assistants/evergreens/ @evergreens-team
custom/assistants/analytics/  @analytics-team

# Core owns everything else
src/core/                    @core-code-team
src/sdk/                     @core-code-team
scripts/                     @core-code-team
```

**Replacement:** `src/assistants/assistants.generated.ts` (today's single generated file) is replaced by `_registry.generated.ts`. The core import in `src/assistants/index.ts` is updated from the old file to the new one — a one-line change, Core Code Team concern.

**Key invariant preserved:** Everything is still compiled at build time. No runtime file reads. The only change is *where* each team's files live and *how* they're assembled.

---

## 2. The SDK Contract

`src/sdk/index.ts` is the **only** import path Strike Teams may use from core internals. It re-exports existing types cleanly — no new logic, no new runtime behavior.

### What the SDK exports

**Types (shape your data):**
```
AssistantModule
AssistantDefinition
AssistantKind
AssistantUIMode
QuickAction
ExecutionType
InstructionBlock
SafetyOverrides
ToolSettings
```

**Handler types (custom logic):**
```
AssistantHandler
HandlerContext
HandlerResult
NormalizedMessage
SelectionState
Message
```

**KB types (knowledge bases):**
```
KnowledgeBaseDocument
KnowledgeBaseRef
```

All sourced from existing core types — the SDK file is a clean re-export with no new definitions.

### AI assistant (chat-based) — minimum required

```typescript
// src/assistants/analytics/index.ts
import type { AssistantModule } from '../../sdk'

const module: AssistantModule = {
  definition: {
    id: 'analytics',
    label: 'Analytics',
    kind: 'ai',
    uiMode: 'chat',
    intro: '...',
    quickActions: [...],
  },
  // No handler needed — core routes to LLM automatically
}

export default module
```

### Tool assistant (custom logic) — handler required

```typescript
// src/assistants/evergreens/index.ts
import type { AssistantModule } from '../../sdk'
import { handler } from './handler'

const module: AssistantModule = {
  definition: {
    id: 'content_table',
    label: 'Evergreens',
    kind: 'tool',
    uiMode: 'tool',
    quickActions: [...],
  },
  handler,  // custom pre-LLM logic
}

export default module
```

### Handler interface (already exists in core — unchanged)

```typescript
// src/assistants/evergreens/handler.ts
import type { AssistantHandler, HandlerContext, HandlerResult } from '../../sdk'

export const handler: AssistantHandler = {

  canHandle(assistantId, actionId) {
    return assistantId === 'content_table'
      && (actionId === 'generate-table' || actionId === 'add-to-table')
  },

  async handleResponse(ctx: HandlerContext): Promise<HandlerResult> {
    // ... Evergreens scanning logic here
    return { handled: true }
  }
}
```

The `AssistantHandler` interface already exists in `src/core/assistants/handlers/base.ts`. The Evergreens handler already implements it. Migration = moving the file and updating the import path. No logic changes.

**New team onboarding:** Copy the `analytics/` template → change the ID, label, quickActions → done. If custom logic is needed (like Evergreens), also copy the handler template and implement `canHandle` + `handleResponse`.

---

## 3. The Compile Gate

A new `build-assistants` script runs before esbuild. It validates each assistant independently. A broken assistant keeps its previous generated file. The plugin always ships.

### Build pipeline

**Today (one failure = full stop):**
```
npm run prebuild
  → generate-assistants    (all or nothing)
  → generate-custom-overlay
  → generate-knowledge-bases
npm run build
  → esbuild  ← ONE TS error anywhere = entire build fails
```

**After (assistant failures isolated):**
```
npm run prebuild
  → build-assistants       ← NEW: per-assistant gate
  → generate-custom-overlay
  → generate-knowledge-bases
  → generate-assistants    (reads .generated.ts files)
npm run build
  → esbuild  ← always has valid inputs
```

### How build-assistants works

For each assistant directory in `src/assistants/*/`:

1. **Scan** `src/assistants/*/index.ts` — finds all teams
2. **For each assistant:** run `tsc --noEmit` on that directory in isolation
3. **Branch on result:**
   - `✓ pass` → write new `{name}.generated.ts`
   - `✗ fail` → keep existing `{name}.generated.ts` (last known-good version)
4. **Assemble** `_registry.generated.ts` from all `.generated.ts` files
5. **Print report** — which assistants updated, which kept previous, who to notify

### Terminal output format

```
── build-assistants ──────────────────────────
✓ evergreens       updated              handler.ts compiled ok
⚠ analytics        kept previous        handler.ts:14 — Type error
✓ accessibility    updated
✓ prompt-to-screen updated
─────────────────────────────────────────────
⚠ 1 assistant kept previous version: analytics
  Notify: analytics-team — see error above
─────────────────────────────────────────────
Registry assembled. Proceeding with build.
```

### Generated file format

```typescript
// evergreens.generated.ts
// DO NOT EDIT — generated by scripts/build-assistants.ts
// Last updated: 2026-03-26T...

export const evergreensModule = {
  definition: { id: 'content_table', ... },
  handler: { canHandle, handleResponse }
}
```

```typescript
// _registry.generated.ts
// Assembled from all .generated.ts

import { evergreensModule } from './evergreens/evergreens.generated'
import { analyticsModule } from './analytics/analytics.generated'

export const ASSISTANT_MODULES = [
  evergreensModule,
  analyticsModule,
  ...
]
```

**Invariant preserved:** Generated files are committed to git, exactly like today's `assistants.generated.ts`. The old file is always there as the fallback. No new runtime behavior — the compile gate only runs at build time.

### Local testing workflow

Strike Teams test their changes using the standard local dev build — no GitHub CI required:

```bash
npm run build      # runs compile gate, shows per-assistant report
npm run build:dev  # watch mode for active development
```

A broken assistant in a Strike Team's branch does not block anyone else. Each team can open the plugin from their branch and test their assistant in isolation. The dev build outputs the compile gate report to the terminal, so errors are immediately visible.

---

## 4. ACE Admin Scoping

Two concrete changes to the ACE admin system to support per-team ownership.

### Change 1 — Config structure splits per assistant

Covered in Section 1 above. The `custom/assistants.manifest.json` single file splits into `custom/assistants/{name}/manifest.json` per team. Each team's `knowledge/` and `knowledge-bases/` directories move into their assistant subdirectory.

### Change 2 — User records gain an assistantScope field

`assistantScope` values are **assistant IDs** (the `id` field from `AssistantDefinition`), not directory names. For Evergreens, the directory is `evergreens/` but the assistant ID is `content_table` — the scope value is `"content_table"`.

```json
// Core Team admin (no scope = all)
{
  "username": "biagio",
  "role": "admin",
  "assistantScope": []     ← empty = all assistants
}

// Strike Team user (scoped)
{
  "username": "alice",
  "role": "editor",
  "assistantScope": ["content_table"]    ← only Evergreens (id = "content_table")
}
```

### Change 3 — ACE UI filters to show only scoped content

When a Strike Team user logs in, the ACE UI shows only:
- Their assistant's configuration tab
- Their assistant's knowledge bases
- Their assistant's knowledge files

Hidden for Strike Team users: Config, Design Systems, Users tabs.

Scoping is enforced at **both** the UI layer and the backend:

| Enforcement point | Behavior |
|---|---|
| `GET /api/model` | Returns only assistant entries + KBs within the user's `assistantScope`. Other assistants stripped from response. |
| `POST /api/save` | Payload validated against `assistantScope`. Write to out-of-scope assistant returns 403. |
| `GET/POST /api/kb/...` | KB reads and writes scoped to the assistant's own `knowledge-bases/` directory. Cross-assistant KB access blocked. |
| `ace-lambda` (private) | Same scoping logic. `assistantScope` stored in `users.json`, checked on every protected route. |

### Onboarding a new Strike Team

Core Team admin:
1. Creates their ACE user account
2. Sets `role: "editor"` and `assistantScope: ["their_assistant_id"]`

That's it. They log in and see only their assistant. No other configuration needed.

---

## 5. Migration Plan (Evergreens First)

Evergreens is the migration target since its handler already exists and implements the correct interface. No logic changes required — only file moves and import path updates.

**Step 1 — File moves:**
- `src/core/assistants/handlers/contentTable.ts` → `src/assistants/evergreens/handler.ts`
- `src/assistants/contentTable.md` → `src/assistants/evergreens/knowledge.md`

**Step 2 — New files:**
- `src/sdk/index.ts` — re-exports existing core types
- `src/assistants/evergreens/index.ts` — wraps definition + handler into AssistantModule

**Step 3 — Update handler imports:**
- `handler.ts` import paths updated from core internals to `../../sdk`

**Step 4 — Build script:**
- `scripts/build-assistants.ts` — new per-assistant compile gate
- `package.json` prebuild step updated

**Step 5 — Config migration:**
- `custom/assistants.manifest.json` split into per-assistant directories
- ACE API updated to read/write new structure

**Step 6 — ACE auth:**
- `assistantScope` field added to `users.json` schema
- API middleware applies scoping filter on every protected route

**Step 7 — Documentation:**
- `docs/ASSISTANT_SDK.md` — Strike Team onboarding guide
- `CODEOWNERS` file created

---

## 6. What Does NOT Change

- Build-time compilation model. Everything is still compiled. No runtime JSON reads.
- `esbuild` pipeline. The plugin bundle is produced identically.
- Existing handler logic. File moves only — no rewrites.
- Existing KB structure for existing assistants (until config migration step).
- Plugin behavior in Figma. Zero user-facing changes from this migration.
- GitHub dependency is **not required** for any part of this workflow. Local `npm run build` is the only required toolchain.
