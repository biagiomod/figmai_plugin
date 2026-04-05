# Design Workshop Assistant — Iteration Design

**Date:** 2026-04-04  
**Status:** Approved — ready for implementation planning  
**Scope:** DW-A fidelity gap fix, scan/refine loop, UX restoration, Jazz/Wireframe mode

---

## Context and Problem Statement

The Design Workshop Assistant (DW-A) has a split-quality problem:

- **Demo mode** renders rich, high-fidelity screens using hand-crafted presets with `metricsGrid`, `chart`, `watchlist`, `allocation` blocks and full Jazz chrome.
- **Prompt-generated mode** consistently produces lower-quality output: generic heading/card/button stacks, no rich blocks, weaker Jazz fidelity.

**Root cause confirmed:** `prepareMessages()` sends a schema template showing only 7 basic block types. The LLM learns to output those. The richer block types exist in the renderer and in `JAZZ_CONTEXT_BLOCK`'s vocabulary line, but the LLM is never shown *when* or *how* to use them. Demo mode bypasses the LLM entirely — so demo quality > prompt quality structurally.

**Additional gaps identified:**
- No scan/refine loop — users cannot iterate on canvas edits
- Bottom toolbar (selection indicator + assistant switcher) disappears when DW-A is active because `DesignWorkshopPanel` replaces the entire input area including shell controls
- No explicit Jazz vs Wireframe mode — wireframe detection is keyword-only with no real rendering or prompting distinction
- Tab bar hardcoded to FiFi labels for all Jazz screens

---

## Goals

1. Close the prompt/demo fidelity gap — prompt-generated screens must materially improve
2. Add a coherent scan → refine loop as a first-class workflow
3. Restore the bottom toolbar without coupling DW-A to plugin-shell responsibilities
4. Make Jazz vs Wireframe a real mode distinction in prompting, generation, and rendering
5. Clean up DW panel UX (Option A state machine, distinct clear actions)

---

## Section 1 — Fidelity Gap Fix

### 1a. Schema template in `prepareMessages()`

**Change:** Replace the 7-block schema example with all 12 block types including key fields.

The current template omits `chart`, `metricsGrid`, `allocation`, `watchlist`, `darkSection`. These must appear in the schema section so the LLM knows they are valid output.

Keep the schema lean — show shape and key fields, not exhaustive examples. The goal is to make all 12 blocks visible to the model, not to over-constrain it.

**Files:** `src/core/assistants/handlers/designWorkshop.ts` → `prepareMessages()`

### 1b. Archetype recipe injection

After `extractIntent()` runs, if a recognized archetype is detected, a short recipe block is prepended to the generation prompt. Four recipes cover the majority of real usage:

| Archetype | Trigger keywords | Recipe summary |
|---|---|---|
| **FinTech / dashboard** | fintech, banking, portfolio, trading, investment, brokerage | `metricsGrid(4) → chart → heading+cards(positions) → allocation → watchlist → CTA` |
| **Onboarding / splash** | onboarding, welcome, splash, intro, get started | `spacer → h1 → bodyText → spacer → primary CTA → tertiary` |
| **Login / auth** | login, sign in, auth, register, signup, password | `h2 → input×2 → primary → tertiary×2` |
| **Settings / profile** | settings, profile, account, preferences, manage | `h3 sections → card rows → save CTA` |

**Recipe format rules:**
- 4–8 lines maximum per recipe
- Archetype-oriented, not prescriptive — give a structural pattern, not exact values
- The model retains freedom to vary content, screen count, and block details
- No recipe injected for open-ended prompts without a recognized archetype
- Recipes inject in both Jazz and Wireframe mode (adjusted — see Section 4)

**Files:** `src/core/assistants/handlers/designWorkshop.ts` → `prepareMessages()`, new `ARCHETYPE_RECIPES` map

### 1c. Update `JAZZ_CONTEXT_BLOCK` archetype descriptions

**Change:** The FinTech and Dashboard archetype descriptions in `JAZZ_CONTEXT_BLOCK` currently show only `card`, `bodyText`, `spacer` examples. Update to explicitly demonstrate `metricsGrid`, `chart`, `watchlist`, `allocation` with realistic example values. Reinforces recipe injection with pattern-level guidance.

**Files:** `src/core/designWorkshop/jazzContext.ts`

### 1d. Narrow deterministic fallback (fintech only)

If the LLM produces a validated spec that looks like a fintech/dashboard screen but contains *only* `card|heading|bodyText` blocks (no rich blocks at all), apply one narrow upgrade:

**Trigger conditions (ALL must be true):**
- `dwDesignMode === 'jazz'` (Jazz mode only — never applies in wireframe)
- `intent.appType ∈ { 'fintech', 'banking' }`
- Screen name or content suggests dashboard/overview (keyword check on screen name)
- Zero `metricsGrid | chart | watchlist | allocation` blocks exist in the screen
- 4+ consecutive `card` blocks with metric-style content detected

**Upgrade applied:** collapse the 4+ metric cards into a single `metricsGrid`. No other changes.

Single function, single call point in `buildAndRender()`, easy to disable. This is a deterministic rewrite, not a heuristic — it only fires under all conditions simultaneously.

**Files:** `src/core/assistants/handlers/designWorkshop.ts` → `buildAndRender()`, new `applyFintechFallback()` helper

### 1e. Update `attemptRepair()` prompt

**Change:** The repair prompt currently shows only a reduced block list. Update it to include all 12 block types (same list as 1a). Ensures that repaired output is not further regressed to an even smaller vocabulary than the original.

**Files:** `src/core/assistants/handlers/designWorkshop.ts` → `attemptRepair()`

---

## Section 2 — Scan → Refine Loop

### Overview

A one-shot context capture. The scan reads the canvas once, gives the LLM a structured summary of what is structurally present, and the user's refinement prompt tells it what to change. After a successful generation, the context is consumed and cleared.

### Origin Marking

All DW-A generated sections and screen frames are tagged with Figma plugin data at render time:

```ts
section.setPluginData('dwa-origin', '1')
section.setPluginData('dwa-mode', 'jazz' | 'wireframe')
screen.setPluginData('dwa-screen', '1')
```

Scan uses plugin data as the primary identifier — frame names are used only as fallback.

### Data Model — `ScannedDesignContext`

```ts
interface ScannedDesignContext {
  screens: Array<{
    name: string
    blockTypes: string[]      // e.g. ['metricsGrid', 'chart', 'card', 'watchlist']
    textSnippets: string[]    // visible text, truncated — not exhaustive (max 10/screen, 80 chars each)
  }>
  designMode: 'jazz' | 'wireframe'   // preserve mode intent across scan → refine
  rawSummary: string                 // e.g. "3 screens: Portfolio · Watchlist · Allocation"
}
```

`designMode` is captured from plugin data on the scanned section so the refinement run can preserve the original mode intent.

### Node Traversal

Traversal starts from `figma.currentPage.selection`. DW-A sections are identified by plugin data (`dwa-origin === '1'`) first, frame name prefix as fallback.

For each screen frame (identified by `dwa-screen` plugin data or frame name):
- Walk children with **shallow recursion, depth cap of 3**, skipping chrome nodes (`Status Bar`, `Nav Bar`, `Tab Bar` by name, or nodes with `dwa-chrome` plugin data)
- Recurse into `Content` frame to reach block-level children
- Map frame names → block types using the same semantic names the renderer assigns

Frame name → block type mapping (primary key: frame name; fallback: visual heuristics):

| Frame name | Block type |
|---|---|
| `Metrics Grid` | `metricsGrid` |
| `Chart*` | `chart` |
| Any frame name (watchlist frames are named after `block.title` — detected by scanning parent for watchlist row children pattern) | `watchlist` |
| `Asset Allocation` | `allocation` |
| `Card-*`, `Promo-Card` | `card` |
| `Dark Section` | `darkSection` |
| `Heading *` | `heading` |
| `Body Text` | `bodyText` |
| `Button` | `button` |
| `Input` | `input` |

Text nodes encountered during traversal are collected, deduplicated, and capped (10 per screen, 80 chars each). No deep recursion beyond the depth cap.

### Invalid Scan State UX

All error cases are handled in `main.ts` and shown as `ASSISTANT_MESSAGE` in chat. No modal dialogs or toasts — errors appear inline in the conversation.

| State | Message shown in chat |
|---|---|
| Nothing selected | "Please select a DW-A section or screen on the canvas first." |
| Non-DW-A selection | "The selected items weren't created by Design Workshop. Select a DW-A generated section or screen frame." |
| Mixed selection | "Mixed selection detected — [N] DW-A screen(s) found and scanned. Non-DW-A items ignored." |
| No blocks found | "The selected screens don't contain recognizable design blocks. Try selecting the outer Design Workshop section frame." |

Mixed selection: scan the DW-A frames, ignore the rest, report the partial result. Do not block.

### Scan Store

A minimal module holds the in-flight context to avoid coupling `main.ts` to handler internals:

```ts
// src/core/designWorkshop/designWorkshopScanStore.ts
let ctx: ScannedDesignContext | null = null
export const setScanContext = (c: ScannedDesignContext | null) => { ctx = c }
export const getScanContext = () => ctx
```

`main.ts` calls `setScanContext` when handling `DW_SCAN_SCREENS`.  
`DesignWorkshopHandler.prepareMessages()` calls `getScanContext()` to inject context.  
`DesignWorkshopHandler.buildAndRender()` calls `setScanContext(null)` on success.

### Message Flow

```
UI: user clicks Scan button
  → emit DW_SCAN_SCREENS

main.ts: handles DW_SCAN_SCREENS
  → traverse figma.currentPage.selection
  → validate: check for DW-A origin, mixed selection, no blocks
  → build ScannedDesignContext
  → setScanContext(ctx)
  → postMessage ASSISTANT_MESSAGE: "✓ Scanned N screens — [names] ([block inventory]). What would you like to refine?"
  → postMessage DW_SCAN_RESULT: { ok: true, summary, screenCount }

UI: receives DW_SCAN_RESULT
  → setDwHasScanContext(true)
  → setDwScanSummary(summary)
  → chat shows confirmation message

User: types refinement prompt → clicks Refine Screens / Generate
  → emit SEND_MESSAGE (normal path)

handler: prepareMessages()
  → getScanContext() returns ctx
  → inject SCANNED_CONTEXT block into prompt
  → generation runs normally

handler: buildAndRender() succeeds
  → setScanContext(null)  ← consumed and cleared

UI: receives completion
  → setDwHasScanContext(false)
```

### Scan Context Injection in `prepareMessages()`

When `getScanContext()` returns non-null, insert between the user request and schema requirements:

```
=== SCANNED SCREEN CONTEXT ===
These screens are currently on the Figma canvas (generated by DW-A, [jazz|wireframe] mode).
Generate a refined version based on the user's request. Preserve the overall structure
unless the request explicitly changes it.

Screen "Portfolio": metricsGrid, chart, card ×4, watchlist, allocation, button
  Text: "$91,917.48 · Self-Directed", "Today's Gain/Loss −$412.33", "YTD · 1M · 3M · 1Y"...
Screen "Watchlist": watchlist ×2, button
  Text: "Watchlist", "SPLV $74.12", "TLT $91.82"...
```

Not an LLM call — generated deterministically from `ScannedDesignContext`. Token-efficient.

### Context Clearing Triggers

| Event | Action |
|---|---|
| New scan | `setScanContext(null)` then `setScanContext(newCtx)` |
| Assistant switch (`SET_ASSISTANT`) | `setScanContext(null)`, `setDwHasScanContext(false)` in UI |
| New prompt / RESET | `setScanContext(null)`, `setDwHasScanContext(false)` in UI |
| Clear scan button (`DW_CLEAR_SCAN`) | `setScanContext(null)`, `setDwHasScanContext(false)` in UI |
| Successful generation | `setScanContext(null)` in `buildAndRender()` |

### New Message Types

| Direction | Type | Payload |
|---|---|---|
| UI → Main | `DW_SCAN_SCREENS` | (none) |
| Main → UI | `DW_SCAN_RESULT` | `{ ok: boolean; summary?: string; screenCount?: number; designMode?: 'jazz' \| 'wireframe'; error?: string }` |
| UI → Main | `DW_CLEAR_SCAN` | (none) |
| UI → Main | `DW_SET_DESIGN_MODE` | `{ mode: 'jazz' \| 'wireframe' }` |

`DW_SCAN_RESULT` includes `designMode` (read from the scanned section's plugin data) so that `ui.tsx` can sync `dwDesignMode` to match the scanned screens — enabling scan/refine continuity when the user hasn't explicitly changed the toggle.

---

## Section 3 — DW Panel Redesign

### Option A State Machine

The Scan button is always present in the action row. It is disabled when `hasSelection` is false. Validation of whether the selection is DW-A origin happens in `main.ts` when the scan runs (not in the UI upfront).

**Panel states:**

| State | Textarea | Chips row | Generate button | Scan button |
|---|---|---|---|---|
| Idle, no selection | enabled | prompt chips | enabled if prompt | disabled |
| Idle, has selection | enabled | prompt chips | enabled if prompt | enabled (outlined blue) |
| Scanned | enabled, placeholder "Describe refinements…" | scan summary chip (full-width) | "Refine Screens" | enabled (filled light blue — re-scan) |
| Demo mode | disabled | demo tags | "Generate Screens" | disabled |
| Generating | disabled | frozen | "Generating…" | disabled |

### Bottom Toolbar Architecture

**The toolbar is NOT inside `DesignWorkshopPanel`.** It is extracted as a `BottomToolbar` shared component rendered unconditionally in `ui.tsx` after the input-area branch:

```tsx
{/* Input area — assistant-specific */}
{assistant.id === 'design_workshop' ? (
  <DesignWorkshopPanel ... />
) : (
  <div> {/* quick actions, text input */} </div>
)}

{/* Shell bottom controls — always rendered */}
<BottomToolbar
  selectionState={selectionState}
  assistant={assistant}
  onAssistantClick={handleAssistantClick}
  onSend={handleSend}
  isGenerating={activeStatus !== null}
/>
```

`BottomToolbar` hides the Send button when `assistant.id === 'design_workshop'` (same pattern as the existing `uiMode !== 'tool'` gate). Selection indicator and assistant switcher always show.

### Design Mode Source of Truth

- **Primary source:** `dwDesignMode: 'jazz' | 'wireframe'` in `ui.tsx` state (what the user sees and controls)
- **Mirror:** module-level variable in `main.ts`, set by `DW_SET_DESIGN_MODE` handler
- **Handler reads:** the main.ts variable during `prepareMessages()` and `handleResponse()`
- **Derived everywhere else:** `useWireframe` is `dwDesignMode === 'wireframe'`, not independent state

When the user toggles the mode, `onDesignModeChange` fires → `ui.tsx` updates state → emits `DW_SET_DESIGN_MODE`. No generation is triggered by the toggle itself.

### Distinct Clear Actions

- **Clear prompt:** resets textarea to empty (internal panel state, no message to main)
- **Clear scan:** calls `onClearScan` → `setScanContext(null)` in scan store → emits `DW_CLEAR_SCAN` → resets `dwHasScanContext` in `ui.tsx`

Both actions are visible simultaneously when relevant. They are never conflated.

### `DesignWorkshopPanel` Props (final)

```ts
interface DesignWorkshopPanelProps {
  isGenerating: boolean
  onGenerate: (prompt: string) => void
  onDemoMode: (tag: DemoTag) => void
  onNewPrompt: () => void
  exportHtml?: string | null
  onExportHtml: () => void
  designMode: 'jazz' | 'wireframe'
  onDesignModeChange: (mode: 'jazz' | 'wireframe') => void
  hasScanContext: boolean
  scanSummary?: string | null
  onScan: () => void
  onClearScan: () => void
  hasSelection: boolean
}
```

No toolbar props. `BottomToolbar` owns those.

### Scan Summary Chip

When `hasScanContext` is true, the prompt chips row is replaced by a single full-width chip:

```
[✓  3 screens scanned — Portfolio · Watchlist · Allocation    ×]
```

`JAZZ_ICON_BG` background, `JAZZ_BLUE` text, `×` calls `onClearScan`. Dismissed cleanly. Prompt chips return on clear.

### DEMO Button

Disabled when `designMode === 'wireframe'` with tooltip "Demo presets are Jazz DS only". Demo always runs in Jazz regardless of the mode toggle state (demo path is `useJazz: true` hardcoded).

---

## Section 4 — Jazz vs Wireframe as a Real Mode

### 4a. Prompt Construction

**Jazz mode:** existing `JAZZ_CONTEXT_BLOCK`, full archetype recipes, fidelity `"hi"`.

**Wireframe mode:** `WIREFRAME_CONTEXT_BLOCK` replaces `JAZZ_CONTEXT_BLOCK` entirely. Shorter. Structurally focused. Key rules injected:

- No Jazz color tokens — neutral palette only
- Color: none unless user explicitly requests it; if requested, one intentional accent color
- Corner radius: 8px
- No chrome (no status bar, nav bar, tab bar)
- Fidelity: `"wireframe"`, density: `"comfortable"`
- **Keep semantic content** — do not replace with placeholder labels by default. Use realistic content appropriate to the archetype.
- Archetype recipes still inject, but simplified: prefer `card` rows and `metricsGrid` for data-heavy screens rather than the full fintech stack

If `intent.primaryColor` is set (user requested color), the wireframe context appends: *"User requested accent color: [color]. Apply it intentionally as the single accent — buttons, active indicators only."*

### 4b. Single Mode Source of Truth

`dwDesignMode` in `ui.tsx` is authoritative. Everywhere else derives from it:

- `useWireframe = dwDesignMode === 'wireframe'` (computed at call sites, not stored separately)
- Handler reads the main.ts mirror variable to determine `useJazz` and `useWireframe` for `renderDesignSpecToSection`
- Spec `render.intent.fidelity` is enforced in `buildAndRender()` after LLM output: `'wireframe'` for wireframe mode, `'hi'` for Jazz — overrides whatever the LLM returned if inconsistent

### 4c. Renderer — Wireframe Path

`renderDesignSpecToSection` gains `useWireframe` option (derived, not independently configured):

```ts
renderDesignSpecToSection(spec, runId, {
  useNuxtDs: false,
  useJazz: dwDesignMode === 'jazz',
  useWireframe: dwDesignMode === 'wireframe'
})
```

`useChrome` becomes: `useJazz && !useWireframe && device.kind === 'mobile'`

**Wireframe visual treatment:**

| Feature | Jazz | Wireframe |
|---|---|---|
| Mobile chrome | ✓ | ✗ — skipped entirely |
| `useJazz` block rendering | ✓ | ✗ — non-Jazz path |
| Corner radius | 4px | **8px** |
| Button fill (primary) | `#128842` | **#E0E0E0** (or accent if requested) |
| Card fill | `#FFFFFF` | **#F5F5F5** |
| Card stroke | `#E2E4E5` | **#DCDCDC** |
| Text | `#0F171F` | **#333333** |
| Muted text | `#5B6C7B` | **#888888** |
| Screen background | `#F5F7F8` | **#FFFFFF** |
| metricsGrid | Full Jazz grid | **Flat rows, gray fills** |
| allocation | Donut + legend | **Simple bar + legend, gray** |
| watchlist | Branded badge + styled rows | **Letter badge + plain rows** |

**Semantic content is preserved in wireframe mode.** The labels, values, and screen names come from the LLM output unchanged — only the visual treatment is simplified.

### 4d. Scan/Refine Continuity in Wireframe Mode

`ScannedDesignContext.designMode` captures the mode from the scanned section's plugin data. When the refinement generation runs:

- `DW_SCAN_RESULT.designMode` is used to sync `dwDesignMode` in `ui.tsx` at scan time — so the mode is already correct when the user types their refinement prompt. If the user changes the toggle between scan and generate, the most recently set toggle value wins (no lock-in).
- Rich structures (`metricsGrid`, `watchlist`, `allocation`) found in a wireframe scan are preserved in the scanned context and injected as-is — they render in simplified wireframe form, not collapsed to cards

### 4e. Archetype-Aware Tab Bar (Jazz only, lower priority)

Tab bar labels are determined deterministically at render time from `intent.appType`. No LLM involvement. Jazz chrome only (wireframe has no tab bar). FiFi demo presets continue to use hardcoded tab labels.

```ts
const ARCHETYPE_TABS: Record<string, string[]> = {
  fintech:   ['Portfolio', 'Markets', 'Transfer', 'Invest', 'More'],
  banking:   ['Home', 'Accounts', 'Transfer', 'Cards', 'More'],
  fitness:   ['Home', 'Workout', 'Progress', 'Profile', 'More'],
  health:    ['Home', 'Vitals', 'Activity', 'Profile', 'More'],
  social:    ['Home', 'Explore', 'Post', 'Notifications', 'Profile'],
  ecommerce: ['Home', 'Search', 'Cart', 'Orders', 'Profile'],
  dashboard: ['Dashboard', 'Analytics', 'Reports', 'Settings', 'Profile'],
  default:   ['Home', 'Explore', 'Activity', 'Profile', 'More'],
}
```

---

## Files Changed

| File | Changes |
|---|---|
| `src/core/designWorkshop/jazzContext.ts` | Update JAZZ_CONTEXT_BLOCK archetype descriptions; add WIREFRAME_CONTEXT_BLOCK |
| `src/core/designWorkshop/types.ts` | Add ScannedDesignContext type; add designMode to DesignIntent |
| `src/core/designWorkshop/designWorkshopScanStore.ts` | New — tiny scan context store |
| `src/core/designWorkshop/renderer.ts` | Add useWireframe option; wireframe visual path; archetype tab bar; origin marker writes; chrome condition update |
| `src/core/assistants/handlers/designWorkshop.ts` | Schema template (all 12 blocks); archetype recipes; repair prompt; fintech fallback; scan context injection; mode reads |
| `src/ui/components/DesignWorkshopPanel.tsx` | Option A state machine; mode toggle; scan button; scan summary chip; distinct clear actions; no toolbar props |
| `src/ui/components/BottomToolbar.tsx` | New — extracted shared bottom controls (selection indicator + assistant switcher + conditional send) |
| `src/ui.tsx` | Use BottomToolbar; pass new DW panel props; dwDesignMode state; dwHasScanContext state; DW_SCAN_RESULT handler; DW_SET_DESIGN_MODE emit |
| `src/main.ts` | Handle DW_SCAN_SCREENS; handle DW_CLEAR_SCAN; handle DW_SET_DESIGN_MODE; write plugin data on section/screen creation |

---

## Success Criteria

- [ ] Prompt-generated screens use `metricsGrid`, `chart`, `watchlist`, `allocation` when appropriate — not just card stacks
- [ ] FinTech archetype recipe fires and produces richer block output
- [ ] Repair prompt includes all 12 block types
- [ ] Select a DW-A section → click Scan → chat shows confirmation → type refinement → Refine Screens generates new screens with context
- [ ] Invalid scan states (no selection, non-DW, mixed, no blocks) all show clear chat messages
- [ ] Scan context clears on all 5 triggers
- [ ] Bottom toolbar (selection indicator + assistant switcher) is visible in DW-A without regression in other assistants
- [ ] Jazz/Wireframe toggle affects prompt, fidelity enforcement, and renderer path
- [ ] Wireframe mode: no chrome, 8px radius, neutral palette, semantic content preserved
- [ ] Jazz/Wireframe intent preserved across scan → refine
- [ ] DEMO button disabled in wireframe mode
- [ ] `Clear prompt` and `Clear scan` remain distinct actions
- [ ] Demo mode still works as before
- [ ] No regressions in other assistants
