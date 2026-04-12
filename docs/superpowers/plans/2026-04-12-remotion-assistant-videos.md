# Remotion Assistant Videos — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Remotion package at `site/remotion/` that generates an 18-second branded MP4 video for each of the 5 live Design AI Toolkit assistants, replacing the stub files at `site/public/videos/{id}.mp4`.

**Architecture:** Single data-driven `AssistantVideo` Remotion composition that accepts `{ assistantId }` as an input prop and routes to three acts (Intro / Steps / Closing) based on the current frame. A `render.mjs` Node script bundles the composition once and calls `renderMedia` for each of the 5 assistants in sequence. All assistant content (name, tagline, accent, icon, steps, quick actions) flows from the existing `site/src/data/assistants.ts`.

**Tech Stack:** Remotion 4.x, `@remotion/renderer`, `@remotion/bundler`, `@remotion/google-fonts`, lucide-react, React 18, TypeScript, Vitest + @testing-library/react (component tests).

---

## File Map

```
site/remotion/
├── package.json                        CREATE — remotion package manifest
├── tsconfig.json                       CREATE — extends ../tsconfig.app.json, adds bundler moduleResolution
├── vitest.config.ts                    CREATE — jsdom + globals + react plugin
├── render.mjs                          CREATE — bundles once, renders 5 assistants to public/videos/
├── src/
│   ├── Root.tsx                        CREATE — registers AssistantVideo composition (1280×720, 30fps, 540fr)
│   ├── AssistantVideo.tsx              CREATE — top-level comp, routes acts by frame, loads Inter font
│   ├── acts/
│   │   ├── Intro.tsx                   CREATE — act 1 (frames 0–89): glow bg, icon spring, name, tagline
│   │   ├── Steps.tsx                   CREATE — act 2 (frames 90–419): step walkthrough + progress bar
│   │   └── Closing.tsx                 CREATE — act 3 (frames 420–539): chips stagger, name, CTA
│   ├── components/
│   │   ├── GlowBackground.tsx          CREATE — radial glow with Math.sin breath pulse
│   │   ├── ProgressBar.tsx             CREATE — accent-color bar, width driven by interpolate
│   │   └── Chip.tsx                    CREATE — quick-action pill with spring-in
│   ├── utils/
│   │   └── stepFrames.ts               CREATE — pure fn getStepFrameRange(localFrame, stepCount)
│   ├── data.ts                         CREATE — re-exports LIVE_ASSISTANTS + Assistant type
│   └── __tests__/
│       ├── setup.ts                    CREATE — jest-dom import
│       ├── data.test.ts                CREATE
│       ├── stepFrames.test.ts          CREATE
│       ├── GlowBackground.test.tsx     CREATE
│       ├── ProgressBar.test.tsx        CREATE
│       ├── Chip.test.tsx               CREATE
│       ├── Intro.test.tsx              CREATE
│       ├── Steps.test.tsx              CREATE
│       ├── Closing.test.tsx            CREATE
│       └── AssistantVideo.test.tsx     CREATE
```

**Existing file modified:**
- `site/.gitignore` or root `.gitignore` — add `site/public/videos/*.mp4` (rendered artifacts, not committed)

---

## Timing Reference

| Act | Frames | Seconds | Description |
|---|---|---|---|
| Intro | 0–89 | 0–3s | Icon spring, name, tagline on glow background |
| Steps | 90–419 | 3–14s | Step walkthrough, progress bar crawls across top |
| Closing | 420–539 | 14–18s | Chips stagger in, name, CTA on glow background |

Steps act duration: 330 frames. Each step gets `floor(330 / stepCount)` frames (max 4 steps shown).

---

## Task 1: Scaffold the Remotion package

**Files:**
- Create: `site/remotion/package.json`
- Create: `site/remotion/tsconfig.json`
- Create: `site/remotion/vitest.config.ts`
- Create: `site/remotion/src/__tests__/setup.ts`

- [ ] **Step 1: Create `site/remotion/package.json`**

```json
{
  "name": "design-ai-toolkit-remotion",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "studio": "remotion studio src/Root.tsx",
    "render": "node render.mjs",
    "test": "vitest",
    "test:run": "vitest run"
  },
  "dependencies": {
    "lucide-react": "^0.441.0",
    "react": "^18.3.1",
    "react-dom": "^18.3.1",
    "remotion": "^4.0.0",
    "@remotion/bundler": "^4.0.0",
    "@remotion/renderer": "^4.0.0",
    "@remotion/google-fonts": "^4.0.0"
  },
  "devDependencies": {
    "@testing-library/jest-dom": "^6.4.8",
    "@testing-library/react": "^16.0.1",
    "@types/react": "^18.3.3",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.1",
    "jsdom": "^25.0.0",
    "typescript": "^5.5.3",
    "vite": "^5.4.0",
    "vitest": "^2.0.5"
  }
}
```

- [ ] **Step 2: Create `site/remotion/tsconfig.json`**

The site's `tsconfig.app.json` uses `"moduleResolution": "bundler"` which is Vite-specific. Remotion's bundler expects `"node"`. Override it here.

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "useDefineForClassFields": true,
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "skipLibCheck": true,
    "moduleResolution": "node",
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "strict": true,
    "baseUrl": "."
  },
  "include": ["src", "render.mjs"]
}
```

- [ ] **Step 3: Create `site/remotion/vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/__tests__/setup.ts'],
  },
})
```

- [ ] **Step 4: Create `site/remotion/src/__tests__/setup.ts`**

```ts
import '@testing-library/jest-dom'
```

- [ ] **Step 5: Install dependencies**

Run from `site/remotion/`:
```bash
cd site/remotion && npm install
```

Expected: `node_modules/` created, no peer-dep errors. Remotion 4.x installs may warn about optional Chromium — that's fine, it will download Chromium on first render.

- [ ] **Step 6: Verify TypeScript compiles**

```bash
cd site/remotion && npx tsc --noEmit
```

Expected: no errors (no source files yet, so zero errors).

- [ ] **Step 7: Commit**

```bash
git add site/remotion/package.json site/remotion/tsconfig.json site/remotion/vitest.config.ts site/remotion/src/__tests__/setup.ts site/remotion/package-lock.json
git commit -m "feat(remotion): scaffold package with deps and vitest config"
```

---

## Task 2: Data layer

**Files:**
- Create: `site/remotion/src/data.ts`
- Create: `site/remotion/src/__tests__/data.test.ts`

- [ ] **Step 1: Write the failing test**

`site/remotion/src/__tests__/data.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { VIDEO_ASSISTANTS } from '../data'

describe('VIDEO_ASSISTANTS', () => {
  it('exports exactly 5 live assistants', () => {
    expect(VIDEO_ASSISTANTS).toHaveLength(5)
  })

  it('contains all expected assistant IDs', () => {
    const ids = VIDEO_ASSISTANTS.map(a => a.id)
    expect(ids).toContain('general')
    expect(ids).toContain('evergreens')
    expect(ids).toContain('accessibility')
    expect(ids).toContain('design-workshop')
    expect(ids).toContain('analytics-tagging')
  })

  it('every assistant has required video fields', () => {
    for (const a of VIDEO_ASSISTANTS) {
      expect(a.id).toBeTruthy()
      expect(a.name).toBeTruthy()
      expect(a.tagline).toBeTruthy()
      expect(a.accent).toMatch(/^#[0-9a-f]{6}$/i)
      expect(a.icon).toBeTypeOf('function')
      expect(a.howToUse.length).toBeGreaterThanOrEqual(1)
      expect(a.quickActions.length).toBeGreaterThanOrEqual(1)
    }
  })
})
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd site/remotion && npm run test:run
```

Expected: FAIL — `Cannot find module '../data'`

- [ ] **Step 3: Create `site/remotion/src/data.ts`**

```ts
export { LIVE_ASSISTANTS as VIDEO_ASSISTANTS } from '../../src/data/assistants'
export type { Assistant as VideoAssistant } from '../../src/data/types'
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
cd site/remotion && npm run test:run
```

Expected: PASS — 3 tests

- [ ] **Step 5: Commit**

```bash
git add site/remotion/src/data.ts site/remotion/src/__tests__/data.test.ts
git commit -m "feat(remotion): data layer — re-export LIVE_ASSISTANTS as VIDEO_ASSISTANTS"
```

---

## Task 3: Step frame utility

**Files:**
- Create: `site/remotion/src/utils/stepFrames.ts`
- Create: `site/remotion/src/__tests__/stepFrames.test.ts`

- [ ] **Step 1: Write the failing test**

`site/remotion/src/__tests__/stepFrames.test.ts`:

```ts
import { describe, it, expect } from 'vitest'
import { getStepIndex, getFramesPerStep, isStepExiting } from '../utils/stepFrames'

const ACT_DURATION = 330 // frames 90–419

describe('getFramesPerStep', () => {
  it('divides act evenly for 4 steps', () => {
    expect(getFramesPerStep(4)).toBe(82) // floor(330/4)
  })
  it('divides act evenly for 3 steps', () => {
    expect(getFramesPerStep(3)).toBe(110) // floor(330/3)
  })
  it('divides act evenly for 5 steps (capped display at 4)', () => {
    expect(getFramesPerStep(4)).toBe(82)
  })
})

describe('getStepIndex', () => {
  it('returns 0 for localFrame 0', () => {
    expect(getStepIndex(0, 4)).toBe(0)
  })
  it('advances to next step at the right frame', () => {
    expect(getStepIndex(82, 4)).toBe(1) // frame 82 = start of step 2
  })
  it('clamps at last step', () => {
    expect(getStepIndex(329, 4)).toBe(3) // last step even at last frame
  })
})

describe('isStepExiting', () => {
  it('false before exit window', () => {
    expect(isStepExiting(0, 82, 3)).toBe(false)
  })
  it('true within exit window (last 15 frames of step)', () => {
    expect(isStepExiting(68, 82, 3)).toBe(true) // 82 - 68 = 14 frames left
  })
  it('false for last step (no next step to exit to)', () => {
    expect(isStepExiting(68, 82, 3, true)).toBe(false)
  })
})
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd site/remotion && npm run test:run -- stepFrames
```

Expected: FAIL — `Cannot find module '../utils/stepFrames'`

- [ ] **Step 3: Create `site/remotion/src/utils/stepFrames.ts`**

```ts
/** Total frames available for the steps act (frames 90–419). */
export const STEPS_ACT_DURATION = 330

/** Frames allocated per step based on how many steps are shown (max 4). */
export function getFramesPerStep(stepCount: number): number {
  return Math.floor(STEPS_ACT_DURATION / stepCount)
}

/**
 * Which step index is active at `localFrame` (frame within the steps act, 0-based).
 * Clamps to the last step so the final step holds until the act ends.
 */
export function getStepIndex(localFrame: number, stepCount: number): number {
  const framesPerStep = getFramesPerStep(stepCount)
  return Math.min(Math.floor(localFrame / framesPerStep), stepCount - 1)
}

/**
 * Whether the current step should be playing its exit animation.
 * The exit window starts 15 frames before the next step begins.
 * Always false for the last step (nothing to exit to).
 */
export function isStepExiting(
  stepLocalFrame: number,
  framesPerStep: number,
  stepIndex: number,
  isLastStep = false,
): boolean {
  if (isLastStep) return false
  return stepLocalFrame >= framesPerStep - 15
}
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
cd site/remotion && npm run test:run -- stepFrames
```

Expected: PASS — 7 tests

- [ ] **Step 5: Commit**

```bash
git add site/remotion/src/utils/stepFrames.ts site/remotion/src/__tests__/stepFrames.test.ts
git commit -m "feat(remotion): step frame calculation utilities with tests"
```

---

## Task 4: GlowBackground component

**Files:**
- Create: `site/remotion/src/components/GlowBackground.tsx`
- Create: `site/remotion/src/__tests__/GlowBackground.test.tsx`

- [ ] **Step 1: Write the failing test**

`site/remotion/src/__tests__/GlowBackground.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { GlowBackground } from '../components/GlowBackground'

vi.mock('remotion', () => ({
  useCurrentFrame: vi.fn(() => 0),
}))

import * as remotion from 'remotion'

describe('GlowBackground', () => {
  beforeEach(() => {
    vi.mocked(remotion.useCurrentFrame).mockReturnValue(0)
  })

  it('renders without crashing at frame 0', () => {
    const { container } = render(<GlowBackground accent="#4a90e2" />)
    expect(container.firstChild).toBeTruthy()
  })

  it('renders without crashing mid-animation (frame 45)', () => {
    vi.mocked(remotion.useCurrentFrame).mockReturnValue(45)
    const { container } = render(<GlowBackground accent="#007a39" />)
    expect(container.firstChild).toBeTruthy()
  })

  it('applies light background color', () => {
    const { container } = render(<GlowBackground accent="#e07b00" />)
    const root = container.firstChild as HTMLElement
    expect(root.style.background).toBe('rgb(248, 248, 248)')
  })
})
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd site/remotion && npm run test:run -- GlowBackground
```

Expected: FAIL — `Cannot find module '../components/GlowBackground'`

- [ ] **Step 3: Create `site/remotion/src/components/GlowBackground.tsx`**

```tsx
import { useCurrentFrame } from 'remotion'

type Props = {
  accent: string
  /** Base opacity of the glow blob (0–1). Defaults to 0.35. */
  baseOpacity?: number
}

/**
 * Full-bleed light background (#f8f8f8) with a radial accent-color glow
 * that breathes via Math.sin — never visually static.
 */
export const GlowBackground: React.FC<Props> = ({ accent, baseOpacity = 0.35 }) => {
  const frame = useCurrentFrame()
  const glowScale = 1 + 0.08 * Math.sin(frame / 40)
  const glowOpacity = Math.max(0, baseOpacity + 0.05 * Math.sin(frame / 35))

  return (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        background: '#f8f8f8',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          width: 700,
          height: 700,
          borderRadius: '50%',
          background: accent,
          opacity: glowOpacity,
          transform: `scale(${glowScale})`,
          filter: 'blur(140px)',
          pointerEvents: 'none',
        }}
      />
    </div>
  )
}
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
cd site/remotion && npm run test:run -- GlowBackground
```

Expected: PASS — 3 tests

- [ ] **Step 5: Commit**

```bash
git add site/remotion/src/components/GlowBackground.tsx site/remotion/src/__tests__/GlowBackground.test.tsx
git commit -m "feat(remotion): GlowBackground — breathing radial glow component"
```

---

## Task 5: ProgressBar component

**Files:**
- Create: `site/remotion/src/components/ProgressBar.tsx`
- Create: `site/remotion/src/__tests__/ProgressBar.test.tsx`

- [ ] **Step 1: Write the failing test**

`site/remotion/src/__tests__/ProgressBar.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { ProgressBar } from '../components/ProgressBar'

vi.mock('remotion', () => ({
  useCurrentFrame: vi.fn(() => 90),
  interpolate: vi.fn((val: number, input: number[], output: number[]) => {
    // Simple linear interpolation for testing
    const t = (val - input[0]) / (input[input.length - 1] - input[0])
    return output[0] + t * (output[output.length - 1] - output[0])
  }),
}))

import * as remotion from 'remotion'

describe('ProgressBar', () => {
  it('renders without crashing at start of steps act (frame 90)', () => {
    const { container } = render(<ProgressBar accent="#4a90e2" />)
    expect(container.firstChild).toBeTruthy()
  })

  it('renders a filled bar element', () => {
    const { container } = render(<ProgressBar accent="#007a39" />)
    // Should have outer track + inner fill
    const divs = container.querySelectorAll('div')
    expect(divs.length).toBeGreaterThanOrEqual(2)
  })

  it('renders without crashing at last frame of steps act (frame 419)', () => {
    vi.mocked(remotion.useCurrentFrame).mockReturnValue(419)
    const { container } = render(<ProgressBar accent="#e07b00" />)
    expect(container.firstChild).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd site/remotion && npm run test:run -- ProgressBar
```

Expected: FAIL — `Cannot find module '../components/ProgressBar'`

- [ ] **Step 3: Create `site/remotion/src/components/ProgressBar.tsx`**

```tsx
import { useCurrentFrame, interpolate } from 'remotion'

type Props = { accent: string }

/**
 * Thin accent-color bar pinned to the top of the frame.
 * Width crawls from 0% → 100% across the full steps act (frames 90–419).
 * Always visible during Act 2, keeping the screen alive.
 */
export const ProgressBar: React.FC<Props> = ({ accent }) => {
  const frame = useCurrentFrame()
  const widthPct = interpolate(frame, [90, 419], [0, 100], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 4,
        background: 'rgba(0,0,0,0.08)',
        zIndex: 10,
      }}
    >
      <div
        style={{
          height: '100%',
          width: `${widthPct}%`,
          background: accent,
          borderRadius: '0 2px 2px 0',
        }}
      />
    </div>
  )
}
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
cd site/remotion && npm run test:run -- ProgressBar
```

Expected: PASS — 3 tests

- [ ] **Step 5: Commit**

```bash
git add site/remotion/src/components/ProgressBar.tsx site/remotion/src/__tests__/ProgressBar.test.tsx
git commit -m "feat(remotion): ProgressBar — accent-color crawl across steps act"
```

---

## Task 6: Chip component

**Files:**
- Create: `site/remotion/src/components/Chip.tsx`
- Create: `site/remotion/src/__tests__/Chip.test.tsx`

- [ ] **Step 1: Write the failing test**

`site/remotion/src/__tests__/Chip.test.tsx`:

```tsx
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Chip } from '../components/Chip'

vi.mock('remotion', () => ({
  useCurrentFrame: vi.fn(() => 440),
  useVideoConfig: vi.fn(() => ({ fps: 30 })),
  spring: vi.fn(() => 1), // fully sprung = visible
}))

describe('Chip', () => {
  it('renders the label text', () => {
    render(<Chip label="Generate Table" accent="#007a39" index={0} startFrame={440} />)
    expect(screen.getByText('Generate Table')).toBeInTheDocument()
  })

  it('renders without crashing for each index 0–3', () => {
    for (let i = 0; i < 4; i++) {
      const { unmount } = render(
        <Chip label={`Action ${i}`} accent="#4a90e2" index={i} startFrame={440} />
      )
      unmount()
    }
  })

  it('is invisible (scale 0) before startFrame', () => {
    const { spring: mockSpring } = await import('remotion')
    vi.mocked(mockSpring).mockReturnValue(0)
    const { container } = render(
      <Chip label="Run Demo" accent="#7c3aed" index={0} startFrame={500} />
    )
    const chip = container.firstChild as HTMLElement
    expect(chip.style.transform).toBe('scale(0)')
  })
})
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd site/remotion && npm run test:run -- Chip
```

Expected: FAIL — `Cannot find module '../components/Chip'`

- [ ] **Step 3: Create `site/remotion/src/components/Chip.tsx`**

```tsx
import { useCurrentFrame, useVideoConfig, spring } from 'remotion'

type Props = {
  label: string
  accent: string
  /** Zero-based index — used to stagger the spring entrance. */
  index: number
  /** Absolute frame (in the full video) when the first chip should begin springing in. */
  startFrame: number
}

/**
 * Quick-action pill that springs in with a staggered delay per index.
 * Each chip is delayed by index * 8 frames from startFrame.
 */
export const Chip: React.FC<Props> = ({ label, accent, index, startFrame }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const delay = index * 8

  const scale = spring({
    frame: frame - startFrame - delay,
    fps,
    config: { damping: 14, stiffness: 220 },
    from: 0,
    to: 1,
  })

  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '10px 22px',
        borderRadius: 999,
        border: `2px solid ${accent}`,
        background: '#fff',
        color: accent,
        fontSize: 18,
        fontWeight: 700,
        letterSpacing: '0.01em',
        transform: `scale(${scale})`,
        opacity: scale,
        boxShadow: `0 2px 12px ${accent}22`,
      }}
    >
      {label}
    </div>
  )
}
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
cd site/remotion && npm run test:run -- Chip
```

Expected: PASS — 3 tests

- [ ] **Step 5: Commit**

```bash
git add site/remotion/src/components/Chip.tsx site/remotion/src/__tests__/Chip.test.tsx
git commit -m "feat(remotion): Chip — staggered spring-in quick-action pill"
```

---

## Task 7: Intro act

**Files:**
- Create: `site/remotion/src/acts/Intro.tsx`
- Create: `site/remotion/src/__tests__/Intro.test.tsx`

- [ ] **Step 1: Write the failing test**

`site/remotion/src/__tests__/Intro.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Intro } from '../acts/Intro'
import type { VideoAssistant } from '../data'
import { MessageSquare } from 'lucide-react'

vi.mock('remotion', () => ({
  useCurrentFrame: vi.fn(() => 0),
  useVideoConfig: vi.fn(() => ({ fps: 30 })),
  spring: vi.fn(() => 1),
  interpolate: vi.fn((_v: number, _i: number[], o: number[]) => o[o.length - 1]),
}))

vi.mock('@remotion/google-fonts/Inter', () => ({
  loadFont: vi.fn(() => ({ fontFamily: 'Inter, sans-serif' })),
}))

const mockAssistant: VideoAssistant = {
  id: 'general',
  name: 'General',
  tagline: 'Ask me anything.',
  accent: '#4a90e2',
  icon: MessageSquare,
  status: 'live',
  howToUse: [{ number: 1, title: 'Step 1', description: 'Do the thing.' }],
  quickActions: ['Action 1'],
  resources: [],
  strikeTeam: { members: [], openSlots: [] },
}

describe('Intro', () => {
  it('renders assistant name', () => {
    render(<Intro assistant={mockAssistant} />)
    expect(screen.getByText('General')).toBeInTheDocument()
  })

  it('renders assistant tagline', () => {
    render(<Intro assistant={mockAssistant} />)
    expect(screen.getByText('Ask me anything.')).toBeInTheDocument()
  })

  it('renders without crashing at last intro frame (89)', () => {
    const remotion = await import('remotion')
    vi.mocked(remotion.useCurrentFrame).mockReturnValue(89)
    const { container } = render(<Intro assistant={mockAssistant} />)
    expect(container.firstChild).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd site/remotion && npm run test:run -- Intro
```

Expected: FAIL — `Cannot find module '../acts/Intro'`

- [ ] **Step 3: Create `site/remotion/src/acts/Intro.tsx`**

```tsx
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion'
import { GlowBackground } from '../components/GlowBackground'
import type { VideoAssistant } from '../data'

type Props = { assistant: VideoAssistant }

/**
 * Act 1 — frames 0–89 (3 seconds).
 * Establishes assistant identity: glow background, icon spring, name, tagline.
 * Nothing holds static — glow pulses continuously.
 */
export const Intro: React.FC<Props> = ({ assistant }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const Icon = assistant.icon

  // Glow ramps up over first 30 frames
  const glowOpacity = interpolate(frame, [0, 30], [0, 0.38], {
    extrapolateRight: 'clamp',
  })

  // Icon: spring scale 0.6 → 1, delayed to frame 10
  const iconScale = spring({
    frame: frame - 10,
    fps,
    config: { damping: 14, stiffness: 180 },
    from: 0.6,
    to: 1,
  })
  const iconOpacity = interpolate(frame, [10, 26], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  // Name: slides up from +20px, delayed to frame 20
  const nameY = spring({
    frame: frame - 20,
    fps,
    config: { damping: 16, stiffness: 160 },
    from: 20,
    to: 0,
  })
  const nameOpacity = interpolate(frame, [20, 38], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  // Tagline: subtle slide up, delayed to frame 36
  const taglineY = spring({
    frame: frame - 36,
    fps,
    config: { damping: 18, stiffness: 140 },
    from: 10,
    to: 0,
  })
  const taglineOpacity = interpolate(frame, [36, 56], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <GlowBackground accent={assistant.accent} baseOpacity={glowOpacity} />

      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 28,
          zIndex: 1,
          padding: '0 120px',
        }}
      >
        {/* Icon */}
        <div
          style={{
            width: 88,
            height: 88,
            background: assistant.accent,
            borderRadius: 22,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transform: `scale(${iconScale})`,
            opacity: iconOpacity,
            boxShadow: `0 8px 32px ${assistant.accent}44`,
          }}
        >
          <Icon size={44} color="#fff" strokeWidth={1.8} />
        </div>

        {/* Name */}
        <div
          style={{
            fontSize: 64,
            fontWeight: 800,
            color: '#111',
            letterSpacing: '-0.03em',
            lineHeight: 1,
            transform: `translateY(${nameY}px)`,
            opacity: nameOpacity,
          }}
        >
          {assistant.name}
        </div>

        {/* Tagline */}
        <div
          style={{
            fontSize: 24,
            color: '#555',
            maxWidth: 720,
            textAlign: 'center',
            lineHeight: 1.55,
            transform: `translateY(${taglineY}px)`,
            opacity: taglineOpacity,
          }}
        >
          {assistant.tagline}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
cd site/remotion && npm run test:run -- Intro
```

Expected: PASS — 3 tests

- [ ] **Step 5: Commit**

```bash
git add site/remotion/src/acts/Intro.tsx site/remotion/src/__tests__/Intro.test.tsx
git commit -m "feat(remotion): Intro act — icon spring, name, tagline on glow bg"
```

---

## Task 8: Steps act

**Files:**
- Create: `site/remotion/src/acts/Steps.tsx`
- Create: `site/remotion/src/__tests__/Steps.test.tsx`

- [ ] **Step 1: Write the failing test**

`site/remotion/src/__tests__/Steps.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Steps } from '../acts/Steps'
import type { VideoAssistant } from '../data'
import { MessageSquare } from 'lucide-react'

vi.mock('remotion', () => ({
  useCurrentFrame: vi.fn(() => 90),
  useVideoConfig: vi.fn(() => ({ fps: 30 })),
  spring: vi.fn(() => 0), // no translation
  interpolate: vi.fn((_v: number, _i: number[], o: number[]) => o[o.length - 1]),
}))

const mockAssistant: VideoAssistant = {
  id: 'general',
  name: 'General',
  tagline: 'Ask me anything.',
  accent: '#4a90e2',
  icon: MessageSquare,
  status: 'live',
  howToUse: [
    { number: 1, title: 'Open the plugin', description: 'Launch from Figma.' },
    { number: 2, title: 'Select General', description: 'Choose the assistant.' },
    { number: 3, title: 'Ask your question', description: 'Type anything.' },
  ],
  quickActions: ['Action 1'],
  resources: [],
  strikeTeam: { members: [], openSlots: [] },
}

describe('Steps', () => {
  it('renders a step title at frame 90 (start of act)', () => {
    render(<Steps assistant={mockAssistant} />)
    expect(screen.getByText('Open the plugin')).toBeInTheDocument()
  })

  it('renders step number', () => {
    render(<Steps assistant={mockAssistant} />)
    expect(screen.getByText('1')).toBeInTheDocument()
  })

  it('renders without crashing at last frame of act (419)', () => {
    const remotion = await import('remotion')
    vi.mocked(remotion.useCurrentFrame).mockReturnValue(419)
    const { container } = render(<Steps assistant={mockAssistant} />)
    expect(container.firstChild).toBeTruthy()
  })

  it('shows at most 4 steps regardless of howToUse length', () => {
    const manySteps = Array.from({ length: 6 }, (_, i) => ({
      number: i + 1, title: `Step ${i + 1}`, description: 'desc',
    }))
    // Does not crash with 6 steps — internal slice(0,4) limits display
    const { container } = render(
      <Steps assistant={{ ...mockAssistant, howToUse: manySteps }} />
    )
    expect(container.firstChild).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd site/remotion && npm run test:run -- Steps
```

Expected: FAIL — `Cannot find module '../acts/Steps'`

- [ ] **Step 3: Create `site/remotion/src/acts/Steps.tsx`**

```tsx
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion'
import { ProgressBar } from '../components/ProgressBar'
import { getStepIndex, getFramesPerStep, isStepExiting } from '../utils/stepFrames'
import type { VideoAssistant } from '../data'

const ACT_START = 90

type Props = { assistant: VideoAssistant }

/**
 * Act 2 — frames 90–419 (11 seconds).
 * Shows howToUse steps one at a time, each entering from the left and
 * exiting upward before the next arrives. Progress bar crawls the top.
 * Max 4 steps shown; steps are distributed evenly across 330 frames.
 */
export const Steps: React.FC<Props> = ({ assistant }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()

  const steps = assistant.howToUse.slice(0, 4)
  const stepCount = steps.length
  const framesPerStep = getFramesPerStep(stepCount)
  const localFrame = frame - ACT_START
  const stepIndex = getStepIndex(localFrame, stepCount)
  const stepLocalFrame = localFrame - stepIndex * framesPerStep
  const isLast = stepIndex === stepCount - 1
  const exiting = isStepExiting(stepLocalFrame, framesPerStep, stepIndex, isLast)

  const step = steps[stepIndex]

  // Enter: slide in from left
  const enterX = spring({
    frame: stepLocalFrame,
    fps,
    config: { damping: 18, stiffness: 200 },
    from: -40,
    to: 0,
  })
  const enterOpacity = interpolate(stepLocalFrame, [0, 18], [0, 1], {
    extrapolateRight: 'clamp',
  })

  // Exit: slide up and fade out
  const exitY = exiting
    ? interpolate(stepLocalFrame, [framesPerStep - 15, framesPerStep], [0, -24], {
        extrapolateRight: 'clamp',
      })
    : 0
  const exitOpacity = exiting
    ? interpolate(stepLocalFrame, [framesPerStep - 15, framesPerStep], [1, 0], {
        extrapolateRight: 'clamp',
      })
    : enterOpacity

  return (
    <div style={{ position: 'absolute', inset: 0, background: '#f0f0f0', overflow: 'hidden' }}>
      {/* Subtle accent gradient in top-right corner — keeps background non-static */}
      <div
        style={{
          position: 'absolute',
          top: -100,
          right: -100,
          width: 500,
          height: 500,
          borderRadius: '50%',
          background: assistant.accent,
          opacity: 0.08,
          filter: 'blur(80px)',
          pointerEvents: 'none',
        }}
      />

      <ProgressBar accent={assistant.accent} />

      {/* Step content */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          padding: '60px 140px',
          transform: `translateX(${enterX}px) translateY(${exitY}px)`,
          opacity: exitOpacity,
        }}
      >
        <div style={{ display: 'flex', gap: 40, alignItems: 'flex-start' }}>
          {/* Step number circle */}
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: '50%',
              background: assistant.accent,
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 28,
              fontWeight: 800,
              flexShrink: 0,
              boxShadow: `0 4px 20px ${assistant.accent}44`,
            }}
          >
            {step.number}
          </div>

          {/* Title + description */}
          <div style={{ flex: 1, paddingTop: 6 }}>
            <div
              style={{
                fontSize: 38,
                fontWeight: 800,
                color: '#111',
                lineHeight: 1.15,
                marginBottom: 16,
                letterSpacing: '-0.02em',
              }}
            >
              {step.title}
            </div>
            <div
              style={{
                fontSize: 22,
                color: '#555',
                lineHeight: 1.6,
                maxWidth: 800,
              }}
            >
              {step.description}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
cd site/remotion && npm run test:run -- Steps
```

Expected: PASS — 4 tests

- [ ] **Step 5: Commit**

```bash
git add site/remotion/src/acts/Steps.tsx site/remotion/src/__tests__/Steps.test.tsx
git commit -m "feat(remotion): Steps act — step walkthrough with enter/exit animations"
```

---

## Task 9: Closing act

**Files:**
- Create: `site/remotion/src/acts/Closing.tsx`
- Create: `site/remotion/src/__tests__/Closing.test.tsx`

- [ ] **Step 1: Write the failing test**

`site/remotion/src/__tests__/Closing.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import { Closing } from '../acts/Closing'
import type { VideoAssistant } from '../data'
import { MessageSquare } from 'lucide-react'

vi.mock('remotion', () => ({
  useCurrentFrame: vi.fn(() => 460),
  useVideoConfig: vi.fn(() => ({ fps: 30 })),
  spring: vi.fn(() => 1),
  interpolate: vi.fn((_v: number, _i: number[], o: number[]) => o[o.length - 1]),
}))

const mockAssistant: VideoAssistant = {
  id: 'general',
  name: 'General',
  tagline: 'Ask me anything.',
  accent: '#4a90e2',
  icon: MessageSquare,
  status: 'live',
  howToUse: [{ number: 1, title: 'Step 1', description: 'Do the thing.' }],
  quickActions: ['Explain this design', 'Design suggestions', 'Run Smart Detector'],
  resources: [],
  strikeTeam: { members: [], openSlots: [] },
}

describe('Closing', () => {
  it('renders assistant name', () => {
    render(<Closing assistant={mockAssistant} />)
    expect(screen.getByText('General')).toBeInTheDocument()
  })

  it('renders quick action chips (up to 4)', () => {
    render(<Closing assistant={mockAssistant} />)
    expect(screen.getByText('Explain this design')).toBeInTheDocument()
    expect(screen.getByText('Design suggestions')).toBeInTheDocument()
    expect(screen.getByText('Run Smart Detector')).toBeInTheDocument()
  })

  it('renders "Open in Figma" CTA', () => {
    render(<Closing assistant={mockAssistant} />)
    expect(screen.getByText('Open in Figma')).toBeInTheDocument()
  })

  it('renders without crashing at act start (frame 420)', () => {
    const remotion = await import('remotion')
    vi.mocked(remotion.useCurrentFrame).mockReturnValue(420)
    const { container } = render(<Closing assistant={mockAssistant} />)
    expect(container.firstChild).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd site/remotion && npm run test:run -- Closing
```

Expected: FAIL — `Cannot find module '../acts/Closing'`

- [ ] **Step 3: Create `site/remotion/src/acts/Closing.tsx`**

```tsx
import { useCurrentFrame, useVideoConfig, spring, interpolate } from 'remotion'
import { GlowBackground } from '../components/GlowBackground'
import { Chip } from '../components/Chip'
import type { VideoAssistant } from '../data'

const ACT_START = 420
const CHIP_SPRING_START = ACT_START + 20  // absolute frame 440
const NAME_FADE_START = ACT_START + 40    // absolute frame 460
const CTA_FADE_START = ACT_START + 70     // absolute frame 490

type Props = { assistant: VideoAssistant }

/**
 * Act 3 — frames 420–539 (4 seconds).
 * Returns to the glow background. Quick-action chips spring in staggered,
 * then assistant name fades in, then CTA. Glow continues to pulse — never static.
 */
export const Closing: React.FC<Props> = ({ assistant }) => {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const localFrame = frame - ACT_START

  const chips = assistant.quickActions.slice(0, 4)

  // Glow background fades in over 20 frames
  const bgOpacity = interpolate(localFrame, [0, 20], [0, 1], {
    extrapolateRight: 'clamp',
  })

  // Name slides up and fades in
  const nameY = spring({
    frame: frame - NAME_FADE_START,
    fps,
    config: { damping: 16, stiffness: 160 },
    from: 20,
    to: 0,
  })
  const nameOpacity = interpolate(frame, [NAME_FADE_START, NAME_FADE_START + 20], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  // CTA fades in
  const ctaOpacity = interpolate(frame, [CTA_FADE_START, CTA_FADE_START + 20], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  })

  return (
    <div style={{ position: 'absolute', inset: 0, opacity: bgOpacity }}>
      <GlowBackground accent={assistant.accent} baseOpacity={0.32} />

      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 40,
          zIndex: 1,
          padding: '0 120px',
        }}
      >
        {/* Assistant name */}
        <div
          style={{
            fontSize: 64,
            fontWeight: 800,
            color: '#111',
            letterSpacing: '-0.03em',
            transform: `translateY(${nameY}px)`,
            opacity: nameOpacity,
          }}
        >
          {assistant.name}
        </div>

        {/* Quick action chips */}
        <div
          style={{
            display: 'flex',
            gap: 14,
            flexWrap: 'wrap',
            justifyContent: 'center',
          }}
        >
          {chips.map((action, i) => (
            <Chip
              key={action}
              label={action}
              accent={assistant.accent}
              index={i}
              startFrame={CHIP_SPRING_START}
            />
          ))}
        </div>

        {/* CTA */}
        <div
          style={{
            fontSize: 16,
            color: '#999',
            opacity: ctaOpacity,
            letterSpacing: '0.12em',
            textTransform: 'uppercase',
            fontWeight: 600,
          }}
        >
          Open in Figma
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Run test to confirm it passes**

```bash
cd site/remotion && npm run test:run -- Closing
```

Expected: PASS — 4 tests

- [ ] **Step 5: Commit**

```bash
git add site/remotion/src/acts/Closing.tsx site/remotion/src/__tests__/Closing.test.tsx
git commit -m "feat(remotion): Closing act — staggered chips, name, CTA on glow bg"
```

---

## Task 10: AssistantVideo composition and Root

**Files:**
- Create: `site/remotion/src/AssistantVideo.tsx`
- Create: `site/remotion/src/Root.tsx`
- Create: `site/remotion/src/__tests__/AssistantVideo.test.tsx`

- [ ] **Step 1: Write the failing test**

`site/remotion/src/__tests__/AssistantVideo.test.tsx`:

```tsx
import { describe, it, expect, vi } from 'vitest'
import { render } from '@testing-library/react'
import { AssistantVideo } from '../AssistantVideo'

vi.mock('remotion', () => ({
  useCurrentFrame: vi.fn(() => 0),
  useVideoConfig: vi.fn(() => ({ fps: 30, width: 1280, height: 720, durationInFrames: 540 })),
  spring: vi.fn(() => 1),
  interpolate: vi.fn((_v: number, _i: number[], o: number[]) => o[o.length - 1]),
  Composition: () => null,
}))

vi.mock('@remotion/google-fonts/Inter', () => ({
  loadFont: vi.fn(() => ({ fontFamily: 'Inter, sans-serif' })),
}))

const ASSISTANT_IDS = ['general', 'evergreens', 'accessibility', 'design-workshop', 'analytics-tagging']

describe('AssistantVideo', () => {
  for (const id of ASSISTANT_IDS) {
    it(`renders without crashing for assistantId="${id}" at frame 0 (Intro)`, () => {
      const { container } = render(<AssistantVideo assistantId={id} />)
      expect(container.firstChild).toBeTruthy()
    })
  }

  it('renders Steps act at frame 90', () => {
    const remotion = await import('remotion')
    vi.mocked(remotion.useCurrentFrame).mockReturnValue(90)
    const { container } = render(<AssistantVideo assistantId="general" />)
    expect(container.firstChild).toBeTruthy()
  })

  it('renders Closing act at frame 420', () => {
    const remotion = await import('remotion')
    vi.mocked(remotion.useCurrentFrame).mockReturnValue(420)
    const { container } = render(<AssistantVideo assistantId="evergreens" />)
    expect(container.firstChild).toBeTruthy()
  })
})
```

- [ ] **Step 2: Run test to confirm it fails**

```bash
cd site/remotion && npm run test:run -- AssistantVideo
```

Expected: FAIL — `Cannot find module '../AssistantVideo'`

- [ ] **Step 3: Create `site/remotion/src/AssistantVideo.tsx`**

```tsx
import { useCurrentFrame } from 'remotion'
import { loadFont } from '@remotion/google-fonts/Inter'
import { VIDEO_ASSISTANTS } from './data'
import { Intro } from './acts/Intro'
import { Steps } from './acts/Steps'
import { Closing } from './acts/Closing'

// Load Inter at module level — Remotion's delayRender/continueRender handles font readiness
const { fontFamily } = loadFont('normal')

type Props = { assistantId: string }

/**
 * Top-level 1280×720 composition.
 * Routes to Intro (0–89), Steps (90–419), or Closing (420–539) based on current frame.
 */
export const AssistantVideo: React.FC<Props> = ({ assistantId }) => {
  const frame = useCurrentFrame()
  const assistant = VIDEO_ASSISTANTS.find(a => a.id === assistantId)

  if (!assistant) {
    throw new Error(`AssistantVideo: unknown assistantId "${assistantId}"`)
  }

  return (
    <div
      style={{
        width: 1280,
        height: 720,
        position: 'relative',
        overflow: 'hidden',
        fontFamily,
      }}
    >
      {frame < 90 && <Intro assistant={assistant} />}
      {frame >= 90 && frame < 420 && <Steps assistant={assistant} />}
      {frame >= 420 && <Closing assistant={assistant} />}
    </div>
  )
}
```

- [ ] **Step 4: Create `site/remotion/src/Root.tsx`**

```tsx
import { Composition } from 'remotion'
import { AssistantVideo } from './AssistantVideo'

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="AssistantVideo"
      component={AssistantVideo}
      durationInFrames={540}
      fps={30}
      width={1280}
      height={720}
      defaultProps={{ assistantId: 'general' }}
    />
  )
}
```

- [ ] **Step 5: Run test to confirm it passes**

```bash
cd site/remotion && npm run test:run -- AssistantVideo
```

Expected: PASS — 7 tests

- [ ] **Step 6: Run full test suite to confirm nothing regressed**

```bash
cd site/remotion && npm run test:run
```

Expected: All tests pass.

- [ ] **Step 7: Commit**

```bash
git add site/remotion/src/AssistantVideo.tsx site/remotion/src/Root.tsx site/remotion/src/__tests__/AssistantVideo.test.tsx
git commit -m "feat(remotion): AssistantVideo composition and Root — routes acts by frame"
```

---

## Task 11: Render script

**Files:**
- Create: `site/remotion/render.mjs`

- [ ] **Step 1: Create `site/remotion/render.mjs`**

```js
import { bundle } from '@remotion/bundler'
import { renderMedia, selectComposition } from '@remotion/renderer'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

const ASSISTANT_IDS = [
  'general',
  'evergreens',
  'accessibility',
  'design-workshop',
  'analytics-tagging',
]

async function main() {
  console.log('Bundling Remotion composition...')

  const bundleLocation = await bundle({
    entryPoint: path.resolve(__dirname, 'src/Root.tsx'),
    // No webpack override needed — Remotion's default handles TypeScript + React
  })

  console.log('Bundle ready. Rendering 5 assistants...\n')

  for (const id of ASSISTANT_IDS) {
    const outputPath = path.resolve(__dirname, '..', 'public', 'videos', `${id}.mp4`)
    process.stdout.write(`  ${id}...`)

    const composition = await selectComposition({
      serveUrl: bundleLocation,
      id: 'AssistantVideo',
      inputProps: { assistantId: id },
    })

    await renderMedia({
      composition,
      serveUrl: bundleLocation,
      codec: 'h264',
      outputLocation: outputPath,
      inputProps: { assistantId: id },
      // Suppress per-frame progress — use onProgress instead
      onProgress: ({ progress }) => {
        process.stdout.write(`\r  ${id}... ${Math.round(progress * 100)}%`)
      },
    })

    console.log(`\r  ✓ ${id}.mp4`)
  }

  console.log('\nAll videos rendered.')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
```

- [ ] **Step 2: Add rendered videos to .gitignore**

Open `site/.gitignore` (create if it doesn't exist). Add:

```
# Remotion rendered output — generated artifacts, not committed
public/videos/*.mp4
```

If `site/.gitignore` does not exist, check for a root `.gitignore` and add the same line there instead.

- [ ] **Step 3: Do a trial render of the 'general' assistant only**

To verify the render script works without waiting for all 5, temporarily edit `render.mjs` to only render `general`:

Change `const ASSISTANT_IDS = [...]` to:
```js
const ASSISTANT_IDS = ['general']
```

Run:
```bash
cd site/remotion && node render.mjs
```

Expected output:
```
Bundling Remotion composition...
Bundle ready. Rendering 5 assistants...

  ✓ general.mp4

All videos rendered.
```

Check the output file:
```bash
ls -lh ../public/videos/general.mp4
```

Expected: file size > 500KB (the stub was 2KB — a real render will be several MB).

- [ ] **Step 4: Restore full ASSISTANT_IDS list**

Revert the temporary change:
```js
const ASSISTANT_IDS = [
  'general',
  'evergreens',
  'accessibility',
  'design-workshop',
  'analytics-tagging',
]
```

- [ ] **Step 5: Commit**

```bash
git add site/remotion/render.mjs
git commit -m "feat(remotion): render script — bundle once, render all 5 assistants to public/videos/"
```

---

## Task 12: Render all 5 videos and verify

- [ ] **Step 1: Run the full render**

```bash
cd site/remotion && node render.mjs
```

Expected output (each line appears as rendering completes, ~1–3 minutes total):
```
Bundling Remotion composition...
Bundle ready. Rendering 5 assistants...

  ✓ general.mp4
  ✓ evergreens.mp4
  ✓ accessibility.mp4
  ✓ design-workshop.mp4
  ✓ analytics-tagging.mp4

All videos rendered.
```

- [ ] **Step 2: Verify all 5 output files exist and have real content**

```bash
ls -lh site/public/videos/
```

Expected: all 5 files present with size > 500KB each (stubs were 2KB).

- [ ] **Step 3: Verify videos play in the site**

Start the dev server (`npm run dev` from `site/`). Navigate to each assistant page. The `VideoPlayer` component should load and play the video without showing the "Video coming soon" fallback.

- [ ] **Step 4: Confirm .gitignore is working**

```bash
git status
```

Expected: `site/public/videos/` files do NOT appear as untracked. If they do, the .gitignore entry from Task 11 was missed — add it now.

- [ ] **Step 5: Final test run (site tests, not remotion tests)**

```bash
cd site && npm run test:run
```

Expected: all 42 existing site tests still pass.

- [ ] **Step 6: Commit**

```bash
git add site/.gitignore  # or root .gitignore if that's where the entry was added
git commit -m "chore: ignore rendered MP4 artifacts in public/videos/"
```

---

## Notes for the implementer

**On Remotion version pinning:** Run `npm install` and check what version of `remotion` was installed. All `@remotion/*` packages must be the **same exact version**. If `npm install` resolves different minor versions across packages, pin them explicitly in `package.json`.

**On Chromium:** `@remotion/renderer` downloads Chromium on first use (~170MB). This happens automatically during the first `node render.mjs` run. Subsequent runs use the cached binary.

**On render time:** Each 18-second video takes roughly 30–90 seconds to render depending on machine. All 5 should complete in under 10 minutes. Use the `onProgress` callback already included in the render script to monitor progress.

**On font loading:** `loadFont('normal')` from `@remotion/google-fonts/Inter` loads Inter Regular weight. If you want bold (800) rendering to match, also call `loadFont('800')` and use the returned `fontFamily` for bold text. For simplicity, a single `loadFont()` call with system bold fallback is acceptable.

**On static holds:** Per the design constraint, no screen may appear frozen. The glow pulse (`Math.sin(frame / 40)`) covers Acts 1 and 3. The progress bar covers Act 2. If during review any segment appears to pause, add a subtle continuous animation (shimmer, counter, secondary element pulsing) to that segment.
