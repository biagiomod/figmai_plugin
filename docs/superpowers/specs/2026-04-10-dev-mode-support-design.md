# Dev Mode Support — AT-A, Content Table, General

**Date:** 2026-04-10
**Status:** Approved for implementation

## Overview

Enable FigmAI to run in Figma Dev Mode for developers who have Dev Mode access but not Design-edit access. The feature is additive: zero behavior changes in Design Mode. Three assistants are available in Dev Mode — Analytics Tagging, Content Table, and General — each operating in read-only mode.

Dev Mode plugins are read-only with respect to document nodes: they cannot create, delete, or modify nodes. They CAN read nodes, call `exportAsync`, write `pluginData`/`relaunchData`, show UI, and make network calls.

---

## Architecture

```
Figma Host (Dev Mode)
  └─ figma.editorType === 'dev'
       │
       ▼
main.ts (plugin init)
  ├─ setEditorType('dev')          ← src/core/editorMode.ts
  └─ postMessage EDITOR_TYPE → ui.tsx
       │
       ▼
ui.tsx
  ├─ editorType state = 'dev'
  ├─ listAssistantsByMode(mode, 'dev') → only AT-A, Content Table, General
  └─ DESIGN_MODE_ONLY_ACTIONS filtered out of rendered quick actions

Handlers (analyticsTagging.ts)
  └─ isDevMode() guard before any write operation
       ← imported from src/core/editorMode.ts (no circular dep)

main.ts RENDER_TABLE_ON_STAGE handler
  └─ isDevMode() guard → figma.notify + early return
```

---

## Phase 1: Manifest

**File:** `manifest.json`

Change `editorType` from `["figma"]` to `["figma", "dev"]`.

`documentAccess: "dynamic-page"` is already set and is the default for Dev Mode plugins — no change needed.

---

## Phase 2: Mode Detection and Propagation

### 2a. `src/core/editorMode.ts` (new file)

A tiny shared module that holds the editor type state. Placing it here — not in `main.ts` — avoids the circular import that would result from handlers importing from the plugin entry point.

```ts
let _type: 'figma' | 'dev' = 'figma'
export function setEditorType(t: 'figma' | 'dev'): void { _type = t }
export function isDevMode(): boolean { return _type === 'dev' }
```

### 2b. `src/main.ts`

Inside the default export function (around line 1652), after `showUI()`:

```ts
import { setEditorType } from './core/editorMode'

// In default export:
setEditorType(figma.editorType as 'figma' | 'dev')
figma.ui.postMessage({ pluginMessage: { type: 'EDITOR_TYPE', editorType: figma.editorType } })
```

### 2c. `src/ui.tsx`

Add state and handle the message:

```ts
const [editorType, setEditorType] = useState<'figma' | 'dev'>('figma')

// In onmessage:
case 'EDITOR_TYPE':
  setEditorType(message.editorType)
  break
```

### 2d. `src/core/types.ts`

Add the message type to the plugin message union (wherever PluginMessage or similar is defined).

---

## Phase 3: Assistant Filtering

### 3a. `src/assistants/index.ts`

Add a constant next to `DEFAULT_SIMPLE_MODE_IDS` (line 58):

```ts
const DEV_MODE_ASSISTANT_IDS = ['analytics_tagging', 'content_table', 'general']
```

Extend `listAssistantsByMode` with an optional `editorType` parameter. When `editorType === 'dev'`, filter the result to only include Dev Mode assistants:

```ts
export function listAssistantsByMode(
  mode: 'simple' | 'advanced' | 'content-mvp',
  editorType?: 'figma' | 'dev'
): Assistant[] {
  let result = /* existing logic */
  if (editorType === 'dev') {
    result = result.filter(a => DEV_MODE_ASSISTANT_IDS.includes(a.id))
  }
  return result
}
```

Update `getDefaultAssistant` to return `general` as default when in Dev Mode (not `content_table`):

```ts
export function getDefaultAssistant(
  mode?: 'simple' | 'advanced' | 'content-mvp',
  editorType?: 'figma' | 'dev'
): Assistant { ... }
```

### 3b. `src/ui.tsx`

Pass `editorType` to `listAssistantsByMode` in the picker modal (~line 3796):

```ts
{listAssistantsByMode(mode, editorType).map(...)}
```

Update mode-switch validation (~lines 1261 and 1421) so when in Dev Mode, the current assistant is validated against `DEV_MODE_ASSISTANT_IDS`. If the current assistant is not in the list, switch to the Dev Mode default.

---

## Phase 4: Quick Action Gating

### Write operations by assistant

| Assistant | Action ID | Write operation |
|---|---|---|
| Analytics Tagging | `fix-annotation-near-misses` | `repairNearMissAnnotations` — writes annotations |
| Analytics Tagging | `add-annotations` | `autoAnnotateScreens` — writes annotations |
| Analytics Tagging | `export-screenshots` | `captureVisibleInArea` — calls `figma.createFrame()` (line 114 of screenshot.ts) |
| Content Table | *(stage render buttons)* | `RENDER_TABLE_ON_STAGE` — creates frames on canvas |
| General | *(none)* | All actions are read-only |

### 4a. `src/ui.tsx` — quick action filtering

Define the set of design-mode-only action IDs (around line 2632):

```ts
const DESIGN_MODE_ONLY_ACTIONS = new Set([
  'fix-annotation-near-misses',
  'add-annotations',
  'export-screenshots',
])
```

When `editorType === 'dev'`, filter these out before rendering:

```ts
const visibleActions = editorType === 'dev'
  ? quickActions.filter(a => !DESIGN_MODE_ONLY_ACTIONS.has(a.id))
  : quickActions
```

For Content Table: hide the "Render on Stage" / "View on Stage" buttons when `editorType === 'dev'`. These are rendered separately from the quick action list.

### 4b. `src/core/assistants/handlers/analyticsTagging.ts` — handler guards

Import `isDevMode` from the shared module:

```ts
import { isDevMode } from '../../editorMode'
```

Add guard at the top of `fix-annotation-near-misses` and `add-annotations` branches:

```ts
if (isDevMode()) {
  replaceStatusMessage('Annotation writes require Design mode.', true)
  return { handled: true }
}
```

This is a belt-and-suspenders guard — the UI already hides these actions, but the handler guard ensures no write ever executes even if a message arrives unexpectedly.

### 4c. `src/main.ts` — RENDER_TABLE_ON_STAGE guard

At the top of the `RENDER_TABLE_ON_STAGE` handler (~line 1882):

```ts
import { isDevMode } from './core/editorMode'

// In handler:
if (isDevMode()) {
  figma.notify('Stage rendering requires Design mode.', { error: true })
  return
}
```

---

## Constraints

- Zero changes to existing Design Mode behavior — all changes are additive/conditional
- No changes to assistant manifest schema
- No new network calls
- `pluginData`, `relaunchData`, and `exportAsync` remain allowed in Dev Mode (Figma permits these)
- `npm run build` and `npm run test` must pass

---

## Files Changed

| File | Change |
|---|---|
| `manifest.json` | Add `"dev"` to `editorType` |
| `src/core/editorMode.ts` | New — `setEditorType`, `isDevMode` |
| `src/main.ts` | Call `setEditorType`, post `EDITOR_TYPE`, guard `RENDER_TABLE_ON_STAGE` |
| `src/ui.tsx` | `editorType` state, message handler, pass to picker, filter quick actions, hide stage buttons |
| `src/assistants/index.ts` | `DEV_MODE_ASSISTANT_IDS`, extend `listAssistantsByMode` and `getDefaultAssistant` |
| `src/core/types.ts` | Add `EDITOR_TYPE` message type |
| `src/core/assistants/handlers/analyticsTagging.ts` | `isDevMode()` guards for write actions |

---

## Verification Checklist

- [ ] Design Mode: all assistants visible, all actions work (no regression)
- [ ] Dev Mode: only AT-A, Content Table, General appear in picker
- [ ] Dev Mode: scan, table, clipboard, chat, Smart Detector all work
- [ ] Dev Mode: `fix-annotation-near-misses`, `add-annotations`, `export-screenshots` not rendered
- [ ] Dev Mode: stage rendering button not rendered
- [ ] Dev Mode: no console errors or runtime exceptions
- [ ] `npm run build` clean
- [ ] `npm run test` passes
