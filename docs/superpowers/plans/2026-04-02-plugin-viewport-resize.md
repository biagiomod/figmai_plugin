# Plugin Viewport Resize Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a `ResizeIcon` button to the top nav bar that cycles the plugin window through three presets (portrait 400×600, landscape 760×500, expanded 1000×700), scoped to EG-A for now, resetting to portrait when the user navigates away.

**Architecture:** The UI iframe emits a `RESIZE_PLUGIN(width, height)` message; `main.ts` receives it and calls `figma.ui.resize()` — identical to every other plugin message. State (`pluginSizeMode`) lives in `ui.tsx`; a `useEffect` watching `assistant?.id` auto-resets to portrait when EG-A is left.

**Tech Stack:** Preact + TypeScript, `@create-figma-plugin/utilities` emit/on pattern, Figma Plugin API `figma.ui.resize()`.

---

## File Map

| File | Change |
|---|---|
| `src/core/types.ts` | Add `ResizePluginHandler` interface (line 458, before re-export) |
| `src/ui/icons.tsx` | Append `ResizeIcon` Preact component (after line 353) |
| `src/ui.tsx` | Add import, preset constants, state, effect, reset call, nav button |
| `src/main.ts` | Add import + `on<ResizePluginHandler>` handler (after line 2098) |

---

### Task 1: Add `ResizePluginHandler` to types.ts

**Files:**
- Modify: `src/core/types.ts:454-460`

- [ ] **Step 1: Add the handler interface**

Open `src/core/types.ts`. After line 457 (the closing `}` of `PlaceholderScorecardErrorHandler`) and before the `// Re-export` comment on line 459, insert:

```typescript
export interface ResizePluginHandler extends EventHandler {
  name: 'RESIZE_PLUGIN'
  handler: (width: number, height: number) => void
}
```

The file at lines 454–461 should look like this after the edit:

```typescript
export interface PlaceholderScorecardErrorHandler extends EventHandler {
  name: 'PLACEHOLDER_SCORECARD_ERROR'
  handler: (message: string) => void
}

export interface ResizePluginHandler extends EventHandler {
  name: 'RESIZE_PLUGIN'
  handler: (width: number, height: number) => void
}

// Re-export content table types
export type { UniversalContentTableV1, TableFormatPreset }
```

- [ ] **Step 2: Verify types compile**

```bash
cd /Users/biagio/Desktop/Dev_Figma/figmai/figmai_plugin
npx tsc --noEmit 2>&1 | head -20
```

Expected: no new errors (existing errors, if any, are pre-existing).

- [ ] **Step 3: Commit**

```bash
git add src/core/types.ts
git commit -m "feat: add ResizePluginHandler message type"
```

---

### Task 2: Add `ResizeIcon` to icons.tsx

**Files:**
- Modify: `src/ui/icons.tsx:353` (append at end of file)

- [ ] **Step 1: Append the ResizeIcon component**

Open `src/ui/icons.tsx`. After the closing `}` of `RefreshIcon` (currently the last function, line 353), append:

```tsx
export function ResizeIcon(props: IconProps = {}) {
  const { width = 24, height = 24, ...rest } = props
  return (
    <svg width={width} height={height} viewBox="0 0 24 24" fill="none"
      xmlns="http://www.w3.org/2000/svg" {...rest}>
      <path d="M5 12.25C5.41421 12.25 5.75 12.5858 5.75 13V17.1895L9.46973 13.4697C9.76262 13.1768 10.2374 13.1768 10.5303 13.4697C10.8232 13.7626 10.8232 14.2374 10.5303 14.5303L6.81055 18.25H11C11.4142 18.25 11.75 18.5858 11.75 19C11.75 19.4142 11.4142 19.75 11 19.75H5C4.58579 19.75 4.25 19.4142 4.25 19V13C4.25 12.5858 4.58579 12.25 5 12.25ZM19 4.25C19.4142 4.25 19.75 4.58579 19.75 5V11C19.75 11.4142 19.4142 11.75 19 11.75C18.5858 11.75 18.25 11.4142 18.25 11V6.81055L14.5303 10.5303C14.2374 10.8232 13.7626 10.8232 13.4697 10.5303C13.1768 10.2374 13.1768 9.76262 13.4697 9.46973L17.1895 5.75H13C12.5858 5.75 12.25 5.41421 12.25 5C12.25 4.58579 12.5858 4.25 13 4.25H19Z"
        fill="currentColor" />
    </svg>
  )
}
```

Note: the original SVG has `fill="black"` — use `fill="currentColor"` so it respects the theme's `var(--fg)` color.

- [ ] **Step 2: Verify types compile**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/ui/icons.tsx
git commit -m "feat: add ResizeIcon component to icons"
```

---

### Task 3: Wire resize state, button, and reset into ui.tsx

**Files:**
- Modify: `src/ui.tsx:98-130` (import block), `src/ui.tsx:194` (icons import), `src/ui.tsx:470` (state), `src/ui.tsx:~530` (useEffect area), `src/ui.tsx:1226-1233` (handleReset), `src/ui.tsx:2550-2596` (Right nav)

This is the largest task. Make each sub-step independently and verify as you go.

#### 3a — Add imports

- [ ] **Step 1: Add `ResizePluginHandler` to the types import block**

In `src/ui.tsx` at line 129, the last item in the `from './core/types'` import block is `RequestSettingsHandler`. Add `ResizePluginHandler` after it:

```typescript
  SaveSettingsHandler,
  RequestSettingsHandler,
  ResizePluginHandler
} from './core/types'
```

- [ ] **Step 2: Add `ResizeIcon` to the icons import block**

In `src/ui.tsx` at line 194, the last item before `} from './ui/icons'` is `AppLogo`. Add `ResizeIcon` after it:

```typescript
  AppLogo,
  ResizeIcon
} from './ui/icons'
```

- [ ] **Step 3: Verify import changes compile**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no new errors.

#### 3b — Add preset constants

- [ ] **Step 4: Add preset constants just before the component function**

Find the line `const isCode2Design = assistant.id === 'code2design'` (around line 2450) — this is inside the component. Instead, add the constants at **module level**, just above the component's `export default function App()` (or equivalent top-level function declaration). Search for the line that begins the component definition and place the constants directly above it:

```typescript
// ---------------------------------------------------------------------------
// Plugin size presets
// ---------------------------------------------------------------------------

const PLUGIN_SIZES = {
  portrait:  { width: 400,  height: 600 },
  landscape: { width: 760,  height: 500 },
  expanded:  { width: 1000, height: 700 },
} as const
type PluginSizeMode = keyof typeof PLUGIN_SIZES
const SIZE_CYCLE: PluginSizeMode[] = ['portrait', 'landscape', 'expanded']
```

To find the exact insertion point:

```bash
grep -n "^export default function\|^function App\|^const App" src/ui.tsx | head -5
```

Place the block on the line immediately before whatever that returns.

- [ ] **Step 5: Verify constants compile**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no new errors.

#### 3c — Add state

- [ ] **Step 6: Add `pluginSizeMode` state**

In `src/ui.tsx`, after line 468 (`const [confluenceFormat, setConfluenceFormat] = useState<TableFormatPreset>('universal')`), add:

```typescript
const [pluginSizeMode, setPluginSizeMode] = useState<PluginSizeMode>('portrait')
```

#### 3d — Add reset helper and wire into handleReset

- [ ] **Step 7: Define `resetPluginSize` before `handleReset`**

In `src/ui.tsx`, find `handleReset` at line 1226. On the line immediately before it (line 1225), insert:

```typescript
  const resetPluginSize = () => {
    emit<ResizePluginHandler>('RESIZE_PLUGIN', 400, 600)
    setPluginSizeMode('portrait')
  }

```

- [ ] **Step 8: Call `resetPluginSize()` inside `handleReset`**

`handleReset` currently reads (lines 1229–1233):

```typescript
  const handleReset = useCallback(() => {
    // Perform local UI reset immediately
    // Use modeRef.current for consistency with RESET_DONE handler (avoids stale closure)
    resetUIState(modeRef.current)

    // Also emit RESET to main thread (for main thread state cleanup)
    emit<ResetHandler>('RESET')
  }, [resetUIState])
```

Add `resetPluginSize()` as the first call in the body:

```typescript
  const handleReset = useCallback(() => {
    resetPluginSize()
    // Perform local UI reset immediately
    // Use modeRef.current for consistency with RESET_DONE handler (avoids stale closure)
    resetUIState(modeRef.current)

    // Also emit RESET to main thread (for main thread state cleanup)
    emit<ResetHandler>('RESET')
  }, [resetUIState])
```

#### 3e — Add useEffect to reset when leaving EG-A

- [ ] **Step 9: Add the assistant-change effect**

In `src/ui.tsx`, find the cluster of `useEffect` calls around lines 485–530. Add this effect after the last existing `useEffect` in that cluster:

```typescript
  // Reset plugin window size when navigating away from EG-A (content_table)
  useEffect(() => {
    if (assistant?.id !== 'content_table') {
      resetPluginSize()
    }
  }, [assistant?.id])
```

#### 3f — Add the resize button to the nav bar

- [ ] **Step 10: Insert the resize button in the Right nav section**

In `src/ui.tsx`, find the Right nav section comment `{/* Right: Mode Toggle */}` (around line 2549). The section currently starts with:

```tsx
        {/* Right: Mode Toggle */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--spacing-sm)',
          justifyContent: 'flex-end',
          flex: '1 1 0'
        }}>
          <button
            onClick={handleThemeToggle}
```

Insert the resize button **before** the theme toggle button (before the `<button onClick={handleThemeToggle}` block):

```tsx
        {/* Right: Mode Toggle */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--spacing-sm)',
          justifyContent: 'flex-end',
          flex: '1 1 0'
        }}>
          {assistant?.id === 'content_table' && (
            <button
              onClick={() => {
                const nextIdx = (SIZE_CYCLE.indexOf(pluginSizeMode) + 1) % SIZE_CYCLE.length
                const next = SIZE_CYCLE[nextIdx]
                const { width, height } = PLUGIN_SIZES[next]
                emit<ResizePluginHandler>('RESIZE_PLUGIN', width, height)
                setPluginSizeMode(next)
              }}
              style={{
                width: '24px',
                height: '24px',
                padding: '4px',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--bg)',
                color: 'var(--fg)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
              title={`Size: ${pluginSizeMode} — click to cycle`}
            >
              <ResizeIcon width={16} height={16} />
            </button>
          )}
          <button
            onClick={handleThemeToggle}
```

- [ ] **Step 11: Verify all ui.tsx changes compile**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no new errors.

- [ ] **Step 12: Commit**

```bash
git add src/ui.tsx
git commit -m "feat: add resize toggle button and state to EG-A nav"
```

---

### Task 4: Add resize handler to main.ts

**Files:**
- Modify: `src/main.ts:97-137` (import block), `src/main.ts:2098` (end of file)

- [ ] **Step 1: Add `ResizePluginHandler` to the types import in main.ts**

In `src/main.ts` at line 136, the last item before `} from './core/types'` is `ExportAnalyticsTaggingOneRowHandler`. Add `ResizePluginHandler` after it:

```typescript
  ExportAnalyticsTaggingScreenshotsHandler,
  ExportAnalyticsTaggingOneRowHandler,
  ResizePluginHandler
} from './core/types'
```

- [ ] **Step 2: Append the resize handler at the end of main.ts**

After the closing `})` of `on<RenderPluginUIPreviewHandler>` at line 2098 (currently the last handler), append:

```typescript
on<ResizePluginHandler>('RESIZE_PLUGIN', (width, height) => {
  figma.ui.resize(width, height)
})
```

- [ ] **Step 3: Verify main.ts compiles**

```bash
npx tsc --noEmit 2>&1 | head -20
```

Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add src/main.ts
git commit -m "feat: handle RESIZE_PLUGIN message in main thread"
```

---

### Task 5: Full build, tests, and smoke verification

**Files:** none — verification only

- [ ] **Step 1: Run the full test suite**

```bash
cd /Users/biagio/Desktop/Dev_Figma/figmai/figmai_plugin
npm test
```

Expected: all tests pass (no regressions — this feature adds no new testable pure functions).

- [ ] **Step 2: Run the full build**

```bash
npm run build
```

Expected: build completes with no errors. The `dist/` directory is updated.

- [ ] **Step 3: Manual smoke test in Figma**

1. Open Figma desktop and run the plugin
2. Open any non-EG-A assistant (e.g. the default chat) — confirm the ResizeIcon button is **not visible** in the nav bar
3. Switch to EG-A (Evergreens / content_table) — confirm the ResizeIcon button **appears** in the nav bar, to the left of the theme toggle
4. Click the button once — plugin window should resize to **760 × 500** (landscape). Tooltip shows "Size: landscape — click to cycle"
5. Click again — plugin window should resize to **1000 × 700** (expanded). Tooltip shows "Size: expanded — click to cycle"
6. Click again — plugin window should resize back to **400 × 600** (portrait). Tooltip shows "Size: portrait — click to cycle"
7. While in landscape or expanded mode, click the Home button — plugin should snap back to **400 × 600**
8. Switch to EG-A in expanded mode, then switch to another assistant — plugin should snap back to **400 × 600**

- [ ] **Step 4: Commit build artifacts**

```bash
git add dist/
git commit -m "build: viewport resize feature — dist sync"
```
