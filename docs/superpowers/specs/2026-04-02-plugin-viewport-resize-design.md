# Plugin Viewport Resize Design

## Goal

Add a resize toggle button to the top nav bar that lets the user cycle the plugin window through three preset sizes. For now the button is only shown when EG-A (content_table) is active. The implementation is written generically so removing the EG-A guard later makes it plugin-wide.

## Architecture

Figma's `figma.ui.resize(width, height)` must be called from the main thread (`main.ts`). The UI iframe emits a `RESIZE_PLUGIN` message; main.ts handles it. This follows the exact same pattern as every other plugin operation.

**Tech stack:** Preact + TypeScript, `@create-figma-plugin/utilities` emit/on pattern.

---

## Presets

| Mode | Width | Height | Purpose |
|---|---|---|---|
| `portrait` | 400px | 600px | Default — all assistants, home screen |
| `landscape` | 760px | 500px | Wide table, compact vertical |
| `expanded` | 1000px | 700px | Maximum useful space for dense tables |

Cycles on each click: portrait → landscape → expanded → portrait (wraps).

---

## Files

### 1. `src/core/types.ts` — new handler type

Add one entry to the handler union:

```typescript
export type ResizePluginHandler = EventHandler & {
  name: 'RESIZE_PLUGIN'
  handler: (width: number, height: number) => void
}
```

Export it alongside the existing handler types.

### 2. `src/ui/icons.tsx` — ResizeIcon component

Add `ResizeIcon` at the end of the file, converting `src/svgs/ResizeIcon.svg` to a Preact component. The SVG `fill="black"` must be replaced with `fill="currentColor"` so the icon respects the theme variable `var(--fg)`.

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

### 3. `src/ui.tsx` — state, button, and reset logic

**a) Preset constants** (module-level, above the component):

```typescript
const PLUGIN_SIZES = {
  portrait:  { width: 400,  height: 600 },
  landscape: { width: 760,  height: 500 },
  expanded:  { width: 1000, height: 700 },
} as const
type PluginSizeMode = keyof typeof PLUGIN_SIZES
const SIZE_CYCLE: PluginSizeMode[] = ['portrait', 'landscape', 'expanded']
```

**b) State** (inside the main component, near other `useState` declarations):

```typescript
const [pluginSizeMode, setPluginSizeMode] = useState<PluginSizeMode>('portrait')
```

**c) Reset helper** (inline function, reused by effect and handleReset):

```typescript
function resetPluginSize() {
  emit<ResizePluginHandler>('RESIZE_PLUGIN', 400, 600)
  setPluginSizeMode('portrait')
}
```

**d) Effect — reset when leaving EG-A:**

```typescript
useEffect(() => {
  if (assistant?.id !== 'content_table') {
    resetPluginSize()
  }
}, [assistant?.id])
```

**e) handleReset integration** — call `resetPluginSize()` at the top of `handleReset` so the Home button also resets the window size.

**f) Resize button** — inserted into the Right nav section (`/* Right: Mode Toggle */`), before the theme toggle button. Only rendered when `assistant?.id === 'content_table'`:

```tsx
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
      width: '24px', height: '24px', padding: '4px',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-sm)',
      backgroundColor: 'var(--bg)',
      color: 'var(--fg)',
      cursor: 'pointer', display: 'flex',
      alignItems: 'center', justifyContent: 'center'
    }}
    title={`Size: ${pluginSizeMode} — click to cycle`}
  >
    <ResizeIcon width={16} height={16} />
  </button>
)}
```

**g) Imports to add:** `ResizeIcon` from `./ui/icons`, `ResizePluginHandler` from `./core/types`.

### 4. `src/main.ts` — resize handler

Add a single `on` call in the handler registration block (near other `on<...>` calls):

```typescript
on<ResizePluginHandler>('RESIZE_PLUGIN', (width, height) => {
  figma.ui.resize(width, height)
})
```

---

## ContentTableView — no changes required

The table already uses `minWidth` with horizontal overflow scroll. A wider plugin window automatically provides more visible column space. No layout changes needed.

---

## Reset behaviour summary

| Trigger | Action |
|---|---|
| User clicks Home button | `resetPluginSize()` → portrait (400×600) |
| User switches to any other assistant | `useEffect` → `resetPluginSize()` → portrait |
| User clicks ResizeIcon | cycles to next preset, emits new dimensions |
| Plugin first opens | `showUI({ width: 400, height: 600 })` in main.ts — no change needed |

---

## Future: making this plugin-wide

Remove the `assistant?.id === 'content_table'` guard on the button. Remove the `useEffect` reset (or change it to only reset when entering specific assistants that don't support wide modes). The presets, message type, and main.ts handler need no changes.

---

## Out of scope

- Persisting size preference across plugin sessions
- Per-assistant size memory
- Drag-to-resize UI
- Sizes beyond 1000×700
