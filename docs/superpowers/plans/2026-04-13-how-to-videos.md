# How-To Videos Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build two data-driven Remotion videos — a 7-min Strike Team onboarding video and a 13-min Core Team architecture video — using shared animated scene components driven by structured TypeScript script files.

**Architecture:** Each video is a single Remotion composition that reads chapter and scene data from a sibling `scripts/` file. A `buildTimeline()` utility converts chapter durations into per-frame routing. Shared components (`BulletList`, `Terminal`, `FileTree`, `FlowDiagram`, `ArchDiagram`, `ChapterTitle`) live in `how-to/` and are selected by a `SceneRenderer` switch. Updating video content means editing the script file and re-rendering — no composition code changes needed.

**Tech Stack:** Remotion 4.x, React 18, TypeScript, `@remotion/google-fonts/Inter`, Vitest + Testing Library (tests), ffmpeg (poster frame extraction)

---

## File Map

**Create:**
- `site/remotion/src/compositions/how-to/types.ts` — all shared TypeScript types
- `site/remotion/src/compositions/how-to/buildTimeline.ts` — frame allocation utility
- `site/remotion/src/compositions/how-to/ChapterTitle.tsx` — full-screen chapter opener
- `site/remotion/src/compositions/how-to/BulletList.tsx` — staggered bullet points
- `site/remotion/src/compositions/how-to/Terminal.tsx` — typewriter CLI animation
- `site/remotion/src/compositions/how-to/FileTree.tsx` — directory tree reveal
- `site/remotion/src/compositions/how-to/FlowDiagram.tsx` — nodes + arrows draw-in
- `site/remotion/src/compositions/how-to/ArchDiagram.tsx` — multi-box system diagram
- `site/remotion/scripts/strike-team-script.ts` — Strike Team video content
- `site/remotion/scripts/core-team-script.ts` — Core Team video content
- `site/remotion/src/compositions/StrikeTeamVideo.tsx` — Strike Team composition
- `site/remotion/src/compositions/CoreTeamVideo.tsx` — Core Team composition
- `site/remotion/src/__tests__/buildTimeline.test.ts` — buildTimeline unit tests
- `site/remotion/src/__tests__/StrikeTeamVideo.test.tsx` — composition tests
- `site/remotion/src/__tests__/CoreTeamVideo.test.tsx` — composition tests

**Modify:**
- `site/remotion/src/Root.tsx` — register two new compositions
- `site/remotion/render.mjs` — add `strike-team` and `core-team` CLI targets
- `.gitignore` — add poster jpg patterns

---

## Task 1: Types + buildTimeline utility

**Files:**
- Create: `site/remotion/src/compositions/how-to/types.ts`
- Create: `site/remotion/src/compositions/how-to/buildTimeline.ts`
- Create: `site/remotion/src/__tests__/buildTimeline.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// site/remotion/src/__tests__/buildTimeline.test.ts
import { describe, it, expect } from 'vitest'
import { buildTimeline } from '../compositions/how-to/buildTimeline'
import type { HowToScript } from '../compositions/how-to/types'

const MOCK_SCRIPT: HowToScript = {
  title: 'Test',
  accentColor: '#ff0000',
  chapters: [
    {
      id: 'ch1',
      title: 'Chapter One',
      durationSeconds: 10,
      scenes: [
        { type: 'bullets', heading: 'H1', points: ['p1'] },
        { type: 'bullets', heading: 'H2', points: ['p2'] },
      ],
    },
    {
      id: 'ch2',
      title: 'Chapter Two',
      durationSeconds: 6,
      scenes: [{ type: 'terminal', commands: [{ cmd: 'ls' }] }],
    },
  ],
}

describe('buildTimeline', () => {
  it('allocates 60 title frames per chapter', () => {
    const tl = buildTimeline(MOCK_SCRIPT)
    const titles = tl.filter(t => t.isTitle)
    expect(titles).toHaveLength(2)
    titles.forEach(t => expect(t.endFrame - t.startFrame).toBe(60))
  })

  it('starts at frame 0', () => {
    const tl = buildTimeline(MOCK_SCRIPT)
    expect(tl[0].startFrame).toBe(0)
  })

  it('total duration equals sum of chapter durationSeconds × 30', () => {
    const tl = buildTimeline(MOCK_SCRIPT)
    expect(tl[tl.length - 1].endFrame).toBe((10 + 6) * 30)
  })

  it('returns correct entry count per chapter (title + scenes)', () => {
    const tl = buildTimeline(MOCK_SCRIPT)
    expect(tl.filter(t => t.chapterIdx === 0)).toHaveLength(3) // title + 2 scenes
    expect(tl.filter(t => t.chapterIdx === 1)).toHaveLength(2) // title + 1 scene
  })

  it('scene entries use sceneIdx -1 for titles, 0-based index for scenes', () => {
    const tl = buildTimeline(MOCK_SCRIPT)
    expect(tl[0].sceneIdx).toBe(-1)
    expect(tl[1].sceneIdx).toBe(0)
    expect(tl[2].sceneIdx).toBe(1)
  })

  it('entries are contiguous (no frame gaps)', () => {
    const tl = buildTimeline(MOCK_SCRIPT)
    for (let i = 1; i < tl.length; i++) {
      expect(tl[i].startFrame).toBe(tl[i - 1].endFrame)
    }
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd site && npm test -- buildTimeline 2>&1 | tail -20
```

Expected: FAIL with "Cannot find module '../compositions/how-to/buildTimeline'"

- [ ] **Step 3: Create the types file**

```typescript
// site/remotion/src/compositions/how-to/types.ts

export type BulletsScene = {
  type: 'bullets'
  heading: string
  points: string[]
}

export type TerminalCommand = {
  cmd: string
  output?: string[]
}

export type TerminalScene = {
  type: 'terminal'
  commands: TerminalCommand[]
}

export type TreeLine = {
  text: string
  highlight?: boolean
  dim?: boolean
}

export type FileTreeScene = {
  type: 'filetree'
  lines: TreeLine[]
}

export type FlowNode = { id: string; label: string }
export type FlowArrow = { from: string; to: string }

export type FlowScene = {
  type: 'flow'
  nodes: FlowNode[]
  arrows: FlowArrow[]
}

export type ArchBox = {
  id: string
  label: string
  sublabel?: string
  color: string
}

export type ArchConnection = {
  from: string
  to: string
  label?: string
}

export type ArchScene = {
  type: 'arch'
  boxes: ArchBox[]
  connections: ArchConnection[]
}

export type Scene = BulletsScene | TerminalScene | FileTreeScene | FlowScene | ArchScene

export type Chapter = {
  id: string
  title: string
  durationSeconds: number
  scenes: Scene[]
}

export type HowToScript = {
  title: string
  accentColor: string
  chapters: Chapter[]
}

export type TimelineEntry = {
  startFrame: number
  endFrame: number
  chapterIdx: number
  sceneIdx: number   // -1 for chapter title
  isTitle: boolean
}
```

- [ ] **Step 4: Create the buildTimeline utility**

```typescript
// site/remotion/src/compositions/how-to/buildTimeline.ts
import type { HowToScript, TimelineEntry } from './types'

const TITLE_FRAMES = 60

export function buildTimeline(script: HowToScript): TimelineEntry[] {
  const entries: TimelineEntry[] = []
  let frame = 0

  for (let ci = 0; ci < script.chapters.length; ci++) {
    const chapter = script.chapters[ci]
    const totalFrames = chapter.durationSeconds * 30
    const contentFrames = totalFrames - TITLE_FRAMES
    const sceneCount = chapter.scenes.length
    const framesPerScene = Math.floor(contentFrames / sceneCount)

    entries.push({
      startFrame: frame,
      endFrame: frame + TITLE_FRAMES,
      chapterIdx: ci,
      sceneIdx: -1,
      isTitle: true,
    })
    frame += TITLE_FRAMES

    for (let si = 0; si < sceneCount; si++) {
      const isLast = si === sceneCount - 1
      const sceneFrames = isLast
        ? contentFrames - framesPerScene * (sceneCount - 1)
        : framesPerScene
      entries.push({
        startFrame: frame,
        endFrame: frame + sceneFrames,
        chapterIdx: ci,
        sceneIdx: si,
        isTitle: false,
      })
      frame += sceneFrames
    }
  }

  return entries
}
```

- [ ] **Step 5: Run the tests and verify they pass**

```bash
cd site && npm test -- buildTimeline 2>&1 | tail -20
```

Expected: 6 tests pass, 0 fail.

- [ ] **Step 6: Commit**

```bash
cd site && git add remotion/src/compositions/how-to/types.ts remotion/src/compositions/how-to/buildTimeline.ts remotion/src/__tests__/buildTimeline.test.ts && git commit -m "feat(remotion): how-to types, buildTimeline utility, and tests"
```

---

## Task 2: ChapterTitle + BulletList components

**Files:**
- Create: `site/remotion/src/compositions/how-to/ChapterTitle.tsx`
- Create: `site/remotion/src/compositions/how-to/BulletList.tsx`

These are visual components. Tests come in Task 8 (composition-level). For now: verify TypeScript compiles cleanly.

- [ ] **Step 1: Create ChapterTitle**

```tsx
// site/remotion/src/compositions/how-to/ChapterTitle.tsx
import { useCurrentFrame, spring, useVideoConfig } from 'remotion'

type Props = {
  chapterNum: number
  totalChapters: number
  title: string
  accentColor: string
  startFrame: number
  globalProgress: number
}

export function ChapterTitle({
  chapterNum,
  totalChapters,
  title,
  accentColor,
  startFrame,
  globalProgress,
}: Props) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const local = frame - startFrame
  const opacity = spring({ fps, frame: local, config: { damping: 20 } })
  const scale = Math.max(0.92, Math.min(1, 0.92 + 0.08 * spring({ fps, frame: local, config: { damping: 15 } })))
  const glow = 0.1 + 0.05 * Math.sin(local / 20)

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0a0a0a',
        opacity,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Glow */}
      <div
        style={{
          position: 'absolute',
          width: 500,
          height: 260,
          borderRadius: '50%',
          background: accentColor,
          filter: 'blur(110px)',
          opacity: glow,
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          pointerEvents: 'none',
        }}
      />
      {/* Content */}
      <div style={{ transform: `scale(${scale})`, textAlign: 'center', position: 'relative', padding: '0 80px' }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: '0.16em',
            textTransform: 'uppercase' as const,
            color: accentColor,
            marginBottom: 14,
          }}
        >
          Chapter {chapterNum} of {totalChapters}
        </div>
        <div
          style={{
            fontSize: 48,
            fontWeight: 800,
            color: '#fff',
            letterSpacing: '-0.025em',
            lineHeight: 1.08,
          }}
        >
          {title}
        </div>
      </div>
      {/* Progress bar */}
      <div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          height: 3,
          background: 'rgba(255,255,255,0.07)',
        }}
      >
        <div
          style={{
            height: 3,
            background: accentColor,
            width: `${Math.max(0, Math.min(1, globalProgress)) * 100}%`,
          }}
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create BulletList**

```tsx
// site/remotion/src/compositions/how-to/BulletList.tsx
import { useCurrentFrame, spring, useVideoConfig } from 'remotion'

type Props = {
  heading: string
  points: string[]
  accentColor: string
  startFrame: number
  globalProgress: number
}

export function BulletList({ heading, points, accentColor, startFrame, globalProgress }: Props) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const local = frame - startFrame
  const headingSpring = spring({ fps, frame: local, config: { damping: 20 } })

  return (
    <div style={{ padding: '56px 80px', width: '100%', boxSizing: 'border-box' as const, position: 'relative' }}>
      <div
        style={{
          fontSize: 30,
          fontWeight: 800,
          color: '#fff',
          marginBottom: 32,
          opacity: headingSpring,
          transform: `translateY(${(1 - headingSpring) * 16}px)`,
        }}
      >
        {heading}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column' as const, gap: 18 }}>
        {points.map((point, i) => {
          const bulletFrame = local - 20 - i * 12
          const bSpring = spring({ fps, frame: bulletFrame, config: { damping: 18 } })
          const clamped = Math.max(0, bSpring)
          return (
            <div
              key={i}
              style={{
                display: 'flex',
                gap: 16,
                alignItems: 'flex-start',
                opacity: clamped,
                transform: `translateX(${(1 - clamped) * 28}px)`,
              }}
            >
              <div
                style={{
                  width: 7,
                  height: 7,
                  borderRadius: '50%',
                  background: accentColor,
                  marginTop: 9,
                  flexShrink: 0,
                }}
              />
              <div style={{ fontSize: 19, color: 'rgba(255,255,255,0.85)', lineHeight: 1.55, fontFamily: 'inherit' }}>
                {point}
              </div>
            </div>
          )
        })}
      </div>
      {/* Progress bar */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: 'rgba(255,255,255,0.07)' }}>
        <div style={{ height: 3, background: accentColor, width: `${Math.max(0, Math.min(1, globalProgress)) * 100}%` }} />
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd site && npx tsc --noEmit -p tsconfig.app.json 2>&1 | grep -E "error|warning" | head -20
```

Expected: no errors related to the new files.

- [ ] **Step 4: Commit**

```bash
cd site && git add remotion/src/compositions/how-to/ChapterTitle.tsx remotion/src/compositions/how-to/BulletList.tsx && git commit -m "feat(remotion): ChapterTitle and BulletList how-to components"
```

---

## Task 3: Terminal component

**Files:**
- Create: `site/remotion/src/compositions/how-to/Terminal.tsx`

- [ ] **Step 1: Create Terminal**

```tsx
// site/remotion/src/compositions/how-to/Terminal.tsx
import { useCurrentFrame } from 'remotion'
import type { TerminalCommand } from './types'

type Props = {
  commands: TerminalCommand[]
  accentColor: string
  startFrame: number
  globalProgress: number
}

const CHARS_PER_FRAME = 8
const OUTPUT_DELAY = 35   // frames after cmd finishes before output appears
const CMD_GAP = 20        // extra frames of pause between commands

export function Terminal({ commands, accentColor, startFrame, globalProgress }: Props) {
  const frame = useCurrentFrame()
  const local = frame - startFrame

  // Calculate when each command starts
  const cmdStarts: number[] = []
  let t = 0
  for (const cmd of commands) {
    cmdStarts.push(t)
    const typingFrames = Math.ceil(cmd.cmd.length / CHARS_PER_FRAME)
    const outputFrames = cmd.output ? OUTPUT_DELAY + cmd.output.length * 8 : OUTPUT_DELAY
    t += typingFrames + outputFrames + CMD_GAP
  }

  const showCursor = local % 28 < 14

  return (
    <div style={{ margin: '36px 80px', position: 'relative' }}>
      <div
        style={{
          background: '#0d1117',
          borderRadius: 10,
          overflow: 'hidden',
          border: '1px solid #30363d',
          fontFamily: "'Fira Code', 'Courier New', monospace",
        }}
      >
        {/* Title bar */}
        <div
          style={{
            padding: '10px 16px',
            background: '#161b22',
            borderBottom: '1px solid #30363d',
            display: 'flex',
            gap: 8,
            alignItems: 'center',
          }}
        >
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#ff5f57' }} />
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#febc2e' }} />
          <div style={{ width: 12, height: 12, borderRadius: '50%', background: '#28c840' }} />
        </div>
        {/* Content */}
        <div style={{ padding: '20px 24px', fontSize: 14, lineHeight: 1.85 }}>
          {commands.map((cmd, i) => {
            const cmdStart = cmdStarts[i]
            if (local < cmdStart) return null
            const localCmd = local - cmdStart
            const typingFrames = Math.ceil(cmd.cmd.length / CHARS_PER_FRAME)
            const charsToShow = Math.min(cmd.cmd.length, Math.floor(localCmd * CHARS_PER_FRAME))
            const isTyping = charsToShow < cmd.cmd.length
            const showOutput = localCmd > typingFrames + OUTPUT_DELAY

            return (
              <div key={i} style={{ marginBottom: i < commands.length - 1 ? 8 : 0 }}>
                <div>
                  <span style={{ color: '#6c7086' }}>$ </span>
                  <span style={{ color: '#a6e3a1' }}>{cmd.cmd.slice(0, charsToShow)}</span>
                  {isTyping && showCursor && <span style={{ color: accentColor }}>▌</span>}
                </div>
                {showOutput && cmd.output?.map((line, j) => {
                  const lineDelay = j * 8
                  if (localCmd < typingFrames + OUTPUT_DELAY + lineDelay) return null
                  return (
                    <div key={j} style={{ color: 'rgba(255,255,255,0.45)', paddingLeft: 14, fontSize: 13 }}>
                      {line}
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
      </div>
      {/* Progress bar */}
      <div style={{ position: 'absolute', bottom: -3, left: 0, right: 0, height: 3, background: 'rgba(255,255,255,0.07)' }}>
        <div style={{ height: 3, background: accentColor, width: `${Math.max(0, Math.min(1, globalProgress)) * 100}%` }} />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd site && npx tsc --noEmit -p tsconfig.app.json 2>&1 | grep "error" | head -10
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd site && git add remotion/src/compositions/how-to/Terminal.tsx && git commit -m "feat(remotion): Terminal how-to component with typewriter animation"
```

---

## Task 4: FileTree component

**Files:**
- Create: `site/remotion/src/compositions/how-to/FileTree.tsx`

- [ ] **Step 1: Create FileTree**

```tsx
// site/remotion/src/compositions/how-to/FileTree.tsx
import { useCurrentFrame, spring, useVideoConfig } from 'remotion'
import type { TreeLine } from './types'

type Props = {
  lines: TreeLine[]
  accentColor: string
  startFrame: number
  globalProgress: number
}

export function FileTree({ lines, accentColor, startFrame, globalProgress }: Props) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const local = frame - startFrame

  return (
    <div style={{ margin: '36px 80px', position: 'relative' }}>
      <div
        style={{
          background: '#0d1117',
          borderRadius: 10,
          padding: '20px 24px',
          border: '1px solid #30363d',
          fontFamily: "'Fira Code', 'Courier New', monospace",
          fontSize: 13,
          lineHeight: 1.95,
        }}
      >
        {lines.map((line, i) => {
          const lineFrame = local - i * 5
          const s = spring({ fps, frame: lineFrame, config: { damping: 20 } })
          const clamped = Math.max(0, s)
          const color = line.highlight
            ? accentColor
            : line.dim
            ? 'rgba(255,255,255,0.22)'
            : 'rgba(255,255,255,0.78)'
          const bg = line.highlight ? `${accentColor}20` : 'transparent'

          return (
            <div
              key={i}
              style={{
                opacity: clamped,
                color,
                background: bg,
                padding: line.highlight ? '1px 6px' : '0',
                borderRadius: 4,
                transform: `translateX(${(1 - clamped) * 12}px)`,
              }}
            >
              {line.text}
            </div>
          )
        })}
      </div>
      {/* Progress bar */}
      <div style={{ position: 'absolute', bottom: -3, left: 0, right: 0, height: 3, background: 'rgba(255,255,255,0.07)' }}>
        <div style={{ height: 3, background: accentColor, width: `${Math.max(0, Math.min(1, globalProgress)) * 100}%` }} />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd site && npx tsc --noEmit -p tsconfig.app.json 2>&1 | grep "error" | head -10
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd site && git add remotion/src/compositions/how-to/FileTree.tsx && git commit -m "feat(remotion): FileTree how-to component with staggered reveal"
```

---

## Task 5: FlowDiagram + ArchDiagram components

**Files:**
- Create: `site/remotion/src/compositions/how-to/FlowDiagram.tsx`
- Create: `site/remotion/src/compositions/how-to/ArchDiagram.tsx`

- [ ] **Step 1: Create FlowDiagram**

```tsx
// site/remotion/src/compositions/how-to/FlowDiagram.tsx
import { useCurrentFrame, spring, useVideoConfig, interpolate } from 'remotion'
import type { FlowNode, FlowArrow } from './types'

type Props = {
  nodes: FlowNode[]
  arrows: FlowArrow[]
  accentColor: string
  startFrame: number
  globalProgress: number
}

const NODE_STAGGER = 14
const ARROW_START_OFFSET = 10

export function FlowDiagram({ nodes, arrows, accentColor, startFrame, globalProgress }: Props) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const local = frame - startFrame
  const arrowsStart = nodes.length * NODE_STAGGER + ARROW_START_OFFSET

  return (
    <div style={{ padding: '40px 80px', position: 'relative' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexWrap: 'wrap' as const,
          gap: 0,
        }}
      >
        {nodes.map((node, i) => {
          const nodeFrame = local - i * NODE_STAGGER
          const s = spring({ fps, frame: nodeFrame, config: { damping: 18 } })
          const clamped = Math.max(0, s)
          const isLast = i === nodes.length - 1

          // Find arrow for this gap
          const arrow = arrows.find(a => a.from === node.id)
          const arrowFrame = local - arrowsStart - i * 10
          const arrowProgress = interpolate(arrowFrame, [0, 18], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          })

          return (
            <div key={node.id} style={{ display: 'flex', alignItems: 'center' }}>
              <div
                style={{
                  background: 'rgba(255,255,255,0.07)',
                  border: `1px solid ${accentColor}55`,
                  borderRadius: 8,
                  padding: '11px 20px',
                  fontSize: 14,
                  fontWeight: 600,
                  color: '#fff',
                  whiteSpace: 'nowrap' as const,
                  opacity: clamped,
                  transform: `scale(${0.9 + 0.1 * clamped})`,
                }}
              >
                {node.label}
              </div>
              {!isLast && arrow && (
                <div style={{ display: 'flex', alignItems: 'center', margin: '0 6px' }}>
                  <div
                    style={{
                      height: 2,
                      background: accentColor,
                      width: `${arrowProgress * 36}px`,
                    }}
                  />
                  {arrowProgress > 0.85 && (
                    <div style={{ color: accentColor, fontSize: 18, marginLeft: -2, lineHeight: 1 }}>›</div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>
      {/* Progress bar */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: 'rgba(255,255,255,0.07)' }}>
        <div style={{ height: 3, background: accentColor, width: `${Math.max(0, Math.min(1, globalProgress)) * 100}%` }} />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create ArchDiagram**

```tsx
// site/remotion/src/compositions/how-to/ArchDiagram.tsx
import { useCurrentFrame, spring, useVideoConfig } from 'remotion'
import type { ArchBox, ArchConnection } from './types'

type Props = {
  boxes: ArchBox[]
  connections: ArchConnection[]
  accentColor: string
  startFrame: number
  globalProgress: number
}

export function ArchDiagram({ boxes, connections, accentColor, startFrame, globalProgress }: Props) {
  const frame = useCurrentFrame()
  const { fps } = useVideoConfig()
  const local = frame - startFrame
  const connStart = boxes.length * 12 + 10

  return (
    <div style={{ padding: '40px 80px', position: 'relative' }}>
      {/* Boxes */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap' as const,
          gap: 16,
          justifyContent: 'center',
          marginBottom: 20,
        }}
      >
        {boxes.map((box, i) => {
          const s = spring({ fps, frame: local - i * 12, config: { damping: 18 } })
          const clamped = Math.max(0, s)
          return (
            <div
              key={box.id}
              style={{
                background: `${box.color}18`,
                border: `1px solid ${box.color}55`,
                borderRadius: 10,
                padding: '18px 22px',
                minWidth: 155,
                opacity: clamped,
                transform: `translateY(${(1 - clamped) * 18}px)`,
              }}
            >
              <div style={{ fontSize: 13, fontWeight: 700, color: box.color, marginBottom: 4 }}>{box.label}</div>
              {box.sublabel && (
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.38)', lineHeight: 1.4 }}>{box.sublabel}</div>
              )}
            </div>
          )
        })}
      </div>
      {/* Connection labels */}
      {connections.map((conn, i) => {
        const connFrame = local - connStart - i * 8
        const s = spring({ fps, frame: connFrame, config: { damping: 20 } })
        const clamped = Math.max(0, s)
        if (!conn.label) return null
        return (
          <div
            key={i}
            style={{
              textAlign: 'center' as const,
              fontSize: 11,
              color: 'rgba(255,255,255,0.35)',
              opacity: clamped,
              marginTop: 4,
            }}
          >
            {conn.label}
          </div>
        )
      })}
      {/* Progress bar */}
      <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 3, background: 'rgba(255,255,255,0.07)' }}>
        <div style={{ height: 3, background: accentColor, width: `${Math.max(0, Math.min(1, globalProgress)) * 100}%` }} />
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd site && npx tsc --noEmit -p tsconfig.app.json 2>&1 | grep "error" | head -10
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
cd site && git add remotion/src/compositions/how-to/FlowDiagram.tsx remotion/src/compositions/how-to/ArchDiagram.tsx && git commit -m "feat(remotion): FlowDiagram and ArchDiagram how-to components"
```

---

## Task 6: Strike Team script data

**Files:**
- Create: `site/remotion/scripts/strike-team-script.ts`

Note: `site/remotion/scripts/` does not exist yet — create it.

- [ ] **Step 1: Create the scripts directory and Strike Team script**

```typescript
// site/remotion/scripts/strike-team-script.ts
import type { HowToScript } from '../src/compositions/how-to/types'

export const STRIKE_TEAM_SCRIPT: HowToScript = {
  title: 'Strike Team Onboarding',
  accentColor: '#ef4477',
  chapters: [
    // ─────────────────────────────────────────────
    // Ch. 1 — Welcome & What You're Building (45s)
    // ─────────────────────────────────────────────
    {
      id: 'welcome',
      title: "Welcome & What You're Building",
      durationSeconds: 45,
      scenes: [
        {
          type: 'bullets',
          heading: 'You are a Strike Team.',
          points: [
            'A small, focused team that builds and maintains one AI assistant in FigmAI',
            'You work independently in your own corner of the codebase',
            'The Core Team owns everything else — SDK, infrastructure, and the main plugin shell',
            'Your job: make your assistant great. Ship via Pull Request.',
          ],
        },
        {
          type: 'flow',
          nodes: [
            { id: 'team', label: 'Strike Team' },
            { id: 'plugin', label: 'Plugin Build' },
            { id: 'figma', label: 'Designer in Figma' },
          ],
          arrows: [
            { from: 'team', to: 'plugin' },
            { from: 'plugin', to: 'figma' },
          ],
        },
      ],
    },

    // ─────────────────────────────────────────────
    // Ch. 2 — Get Set Up (75s)
    // ─────────────────────────────────────────────
    {
      id: 'setup',
      title: 'Get Set Up',
      durationSeconds: 75,
      scenes: [
        {
          type: 'terminal',
          commands: [
            {
              cmd: 'git clone https://github.com/your-org/figmai-starter',
              output: ["Cloning into 'figmai-starter'...", 'done.'],
            },
            {
              cmd: 'cd figmai-starter && npm install',
              output: ['added 847 packages in 12s'],
            },
            {
              cmd: 'code .',
              output: ['Opening in Visual Studio Code...'],
            },
          ],
        },
      ],
    },

    // ─────────────────────────────────────────────
    // Ch. 3 — Your Two Directories (90s)
    // ─────────────────────────────────────────────
    {
      id: 'directories',
      title: 'Your Two Directories',
      durationSeconds: 90,
      scenes: [
        {
          type: 'filetree',
          lines: [
            { text: 'figmai-starter/', dim: true },
            { text: '  src/', dim: true },
            { text: '    assistants/', dim: true },
            { text: '      general/     ← example', highlight: true },
            { text: '      evergreens/  ← example', highlight: true },
            { text: '      accessibility/ ← example', highlight: true },
            { text: '    core/           (Core Team)', dim: true },
            { text: '    sdk/            (Core Team)', dim: true },
            { text: '  custom/', dim: true },
            { text: '    assistants/', dim: true },
            { text: '      general/     ← example', highlight: true },
            { text: '      evergreens/  ← example', highlight: true },
            { text: '      accessibility/ ← example', highlight: true },
            { text: '    config.json     (Core Team)', dim: true },
          ],
        },
        {
          type: 'bullets',
          heading: 'You own exactly two directories.',
          points: [
            'src/assistants/your-name/  —  your TypeScript handler code',
            'custom/assistants/your-name/  —  config, knowledge files, SKILL.md',
            'Never modify files outside these two without Core Team approval',
            'SKILL.md controls your assistant\'s behavior and personality in the plugin',
          ],
        },
      ],
    },

    // ─────────────────────────────────────────────
    // Ch. 4 — Build & Test in Figma (75s)
    // ─────────────────────────────────────────────
    {
      id: 'build',
      title: 'Build & Test in Figma',
      durationSeconds: 75,
      scenes: [
        {
          type: 'terminal',
          commands: [
            {
              cmd: 'npm run build',
              output: [
                '── build-assistants ───────────────────',
                '✓ general           updated',
                '✓ evergreens        updated',
                '⚠ accessibility     kept previous   handler.ts:14 — fix yours',
                '',
                'Build complete.',
              ],
            },
          ],
        },
        {
          type: 'bullets',
          heading: 'Reading the build report.',
          points: [
            '✓ updated — your assistant compiled and is ready to test',
            '⚠ kept previous — TypeScript error on the line shown. Fix it.',
            'Errors in other assistants do not block your build',
            'Load in Figma: Plugins → Development → Import plugin from manifest.json',
          ],
        },
      ],
    },

    // ─────────────────────────────────────────────
    // Ch. 5 — Submit Your Work (75s)
    // ─────────────────────────────────────────────
    {
      id: 'pr',
      title: 'Submit Your Work — Pull Request',
      durationSeconds: 75,
      scenes: [
        {
          type: 'flow',
          nodes: [
            { id: 'branch', label: 'Create branch' },
            { id: 'pr', label: 'Open PR' },
            { id: 'review', label: 'Core Team reviews' },
            { id: 'merged', label: 'Merged ✓' },
          ],
          arrows: [
            { from: 'branch', to: 'pr' },
            { from: 'pr', to: 'review' },
            { from: 'review', to: 'merged' },
          ],
        },
        {
          type: 'bullets',
          heading: 'Submitting your work.',
          points: [
            'git checkout -b feat/my-update',
            'git add src/assistants/your-name/ custom/assistants/your-name/',
            'Only commit files inside your two directories — nothing else',
            'If your PR fails, Core Team explains why and offers a fix. Push the fix and it\'s re-reviewed.',
          ],
        },
      ],
    },

    // ─────────────────────────────────────────────
    // Ch. 6 — ACE Admin: Edit & Configure (60s)
    // ─────────────────────────────────────────────
    {
      id: 'ace',
      title: 'ACE Admin — Edit & Configure',
      durationSeconds: 60,
      scenes: [
        {
          type: 'bullets',
          heading: 'Content changes. No code needed.',
          points: [
            'Log into ACE using the link your Core Team provided',
            'Navigate to Assistants → your assistant\'s page',
            'Edit description, feature list, SKILL.md, and knowledge base entries',
            'Hit Publish — changes go live on the Main Site without a PR',
          ],
        },
        {
          type: 'flow',
          nodes: [
            { id: 'edit', label: 'Edit in ACE' },
            { id: 'publish', label: 'Publish' },
            { id: 'live', label: 'Live on Main Site' },
          ],
          arrows: [
            { from: 'edit', to: 'publish' },
            { from: 'publish', to: 'live' },
          ],
        },
      ],
    },
  ],
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd site && npx tsc --noEmit -p tsconfig.app.json 2>&1 | grep "error" | head -10
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd site && git add remotion/scripts/strike-team-script.ts && git commit -m "feat(remotion): Strike Team onboarding video script data"
```

---

## Task 7: Core Team script data

**Files:**
- Create: `site/remotion/scripts/core-team-script.ts`

- [ ] **Step 1: Create the Core Team script**

```typescript
// site/remotion/scripts/core-team-script.ts
import type { HowToScript } from '../src/compositions/how-to/types'

export const CORE_TEAM_SCRIPT: HowToScript = {
  title: 'Core Team Architecture',
  accentColor: '#60a5fa',
  chapters: [
    // ─────────────────────────────────────────────
    // Ch. 1 — System Overview (90s)
    // ─────────────────────────────────────────────
    {
      id: 'overview',
      title: 'System Overview — The Big Picture',
      durationSeconds: 90,
      scenes: [
        {
          type: 'arch',
          boxes: [
            { id: 'plugin', label: 'Figma Plugin', sublabel: 'Runs in Figma desktop', color: '#ef4477' },
            { id: 'ace',    label: 'ACE Admin',    sublabel: 'Static SPA + Lambda API', color: '#a78bfa' },
            { id: 'aws',    label: 'AWS: Lambda + S3', sublabel: 'Config API + storage', color: '#60a5fa' },
            { id: 'site',   label: 'Main Site',    sublabel: 'React + Vite static', color: '#34d399' },
          ],
          connections: [
            { from: 'plugin', to: 'aws',    label: 'sync-config (build time only)' },
            { from: 'ace',    to: 'aws',    label: 'reads/writes via Config API' },
            { from: 'aws',    to: 'plugin', label: 'config baked in at build' },
          ],
        },
        {
          type: 'bullets',
          heading: 'Who owns what.',
          points: [
            'Strike Teams: src/assistants/name/ and custom/assistants/name/',
            'Core Team: everything else — SDK, main.ts, infrastructure, site',
            'Plugin has zero runtime dependency on ACE or S3',
            'Config is baked in at build time — never fetched at runtime',
          ],
        },
      ],
    },

    // ─────────────────────────────────────────────
    // Ch. 2 — Plugin Architecture (120s)
    // ─────────────────────────────────────────────
    {
      id: 'plugin-arch',
      title: 'Plugin Architecture',
      durationSeconds: 120,
      scenes: [
        {
          type: 'flow',
          nodes: [
            { id: 'ui',       label: 'UI: RUN_QUICK_ACTION' },
            { id: 'main',     label: 'main.ts routing' },
            { id: 'handler',  label: 'canHandle()?' },
            { id: 'provider', label: 'provider.sendChat()' },
            { id: 'post',     label: 'handleResponse()' },
            { id: 'result',   label: 'UI displays result' },
          ],
          arrows: [
            { from: 'ui',       to: 'main' },
            { from: 'main',     to: 'handler' },
            { from: 'handler',  to: 'provider' },
            { from: 'provider', to: 'post' },
            { from: 'post',     to: 'result' },
          ],
        },
        {
          type: 'filetree',
          lines: [
            { text: 'src/', dim: true },
            { text: '  main.ts         ← orchestrator, routing only', highlight: true },
            { text: '  ui.tsx          ← stateless display', highlight: true },
            { text: '  sdk/            ← stable import surface', highlight: true },
            { text: '  core/           (internal — do not import from assistants)', dim: true },
            { text: '  assistants/     ← Strike Team territory', dim: true },
          ],
        },
        {
          type: 'bullets',
          heading: 'The plugin shell — never add business logic here.',
          points: [
            'main.ts routes messages and maintains history. Never implement features here.',
            'ui.tsx is stateless — listen to main thread, never store state locally',
            'Handler pattern: canHandle() decides ownership, handleResponse() runs logic',
            'SDK barrel: src/sdk/index.ts is the only safe import path for assistants',
          ],
        },
      ],
    },

    // ─────────────────────────────────────────────
    // Ch. 3 — Assistant System & SDK (120s)
    // ─────────────────────────────────────────────
    {
      id: 'assistant-system',
      title: 'Assistant System & SDK',
      durationSeconds: 120,
      scenes: [
        {
          type: 'filetree',
          lines: [
            { text: 'src/assistants/', dim: true },
            { text: '  general/', highlight: true },
            { text: '    index.ts     ← AssistantModule export', highlight: true },
            { text: '    handler.ts   ← optional custom logic', highlight: true },
            { text: '  evergreens/', dim: true },
            { text: '    index.ts', dim: true },
            { text: '    handler.ts', dim: true },
            { text: 'custom/assistants/', dim: true },
            { text: '  general/', highlight: true },
            { text: '    SKILL.md     ← behavior config', highlight: true },
            { text: '    manifest.json', highlight: true },
          ],
        },
        {
          type: 'bullets',
          heading: 'The two-directory model.',
          points: [
            'src/assistants/name/index.ts — AssistantModule with optional handler',
            'Import only from ../../sdk — never ../../core directly',
            'CODEOWNERS auto-assigns the Strike Team as PR reviewer for their directories',
            'build-assistants generates a per-assistant error report at every build',
          ],
        },
        {
          type: 'flow',
          nodes: [
            { id: 'manifest', label: 'manifest.json' },
            { id: 'script',   label: 'build-assistants' },
            { id: 'gen',      label: '_registry.generated.ts' },
            { id: 'runtime',  label: 'Plugin runtime' },
          ],
          arrows: [
            { from: 'manifest', to: 'script' },
            { from: 'script',   to: 'gen' },
            { from: 'gen',      to: 'runtime' },
          ],
        },
      ],
    },

    // ─────────────────────────────────────────────
    // Ch. 4 — ACE Admin & Config Pipeline (120s)
    // ─────────────────────────────────────────────
    {
      id: 'ace-pipeline',
      title: 'ACE Admin & Config Pipeline',
      durationSeconds: 120,
      scenes: [
        {
          type: 'arch',
          boxes: [
            { id: 'spa',   label: 'ACE SPA',      sublabel: 'Static HTML/CSS/JS', color: '#a78bfa' },
            { id: 'api',   label: 'Config API',   sublabel: 'Stateless Lambda',   color: '#60a5fa' },
            { id: 's3',    label: 'S3 Bucket',    sublabel: 'Private, versioned',  color: '#34d399' },
            { id: 'build', label: 'Plugin Build', sublabel: 'sync-config + generators', color: '#ef4477' },
          ],
          connections: [
            { from: 'spa',   to: 'api',   label: 'REST /api/*' },
            { from: 'api',   to: 's3',    label: 'read/write' },
            { from: 's3',    to: 'build', label: 'sync-config pulls published.json' },
          ],
        },
        {
          type: 'flow',
          nodes: [
            { id: 'edit',     label: 'Edit in ACE' },
            { id: 'draft',    label: 'Save to S3 draft/' },
            { id: 'publish',  label: 'Publish' },
            { id: 'snapshot', label: 'Snapshot created' },
            { id: 'sync',     label: 'sync-config pulls' },
            { id: 'bake',     label: 'Config baked into build' },
          ],
          arrows: [
            { from: 'edit',     to: 'draft' },
            { from: 'draft',    to: 'publish' },
            { from: 'publish',  to: 'snapshot' },
            { from: 'snapshot', to: 'sync' },
            { from: 'sync',     to: 'bake' },
          ],
        },
        {
          type: 'bullets',
          heading: 'Config pipeline — never touches the plugin at runtime.',
          points: [
            'ACE SPA: pure static files, zero server logic, deploy anywhere',
            'Config API: stateless Lambda — reads/writes S3, validates, manages versions',
            'Publish creates a timestamped snapshot; published.json points to it',
            'sync-config pulls that snapshot into custom/ before every plugin build',
          ],
        },
      ],
    },

    // ─────────────────────────────────────────────
    // Ch. 5 — AWS Infrastructure (120s)
    // ─────────────────────────────────────────────
    {
      id: 'infrastructure',
      title: 'AWS Infrastructure',
      durationSeconds: 120,
      scenes: [
        {
          type: 'arch',
          boxes: [
            { id: 'lambda', label: 'Lambda',      sublabel: 'Config API — stateless',      color: '#60a5fa' },
            { id: 's3',     label: 'S3',          sublabel: 'Private, versioning enabled', color: '#34d399' },
            { id: 'cf',     label: 'CloudFront',  sublabel: 'Serves ACE SPA',              color: '#a78bfa' },
            { id: 'figma',  label: 'Figma Network', sublabel: 'manifest.json enforces allowlist', color: '#ef4477' },
          ],
          connections: [
            { from: 'lambda', to: 's3' },
            { from: 'cf',     to: 'lambda' },
            { from: 'figma',  to: 'lambda', label: 'only allowlisted domains' },
          ],
        },
        {
          type: 'bullets',
          heading: 'Security model.',
          points: [
            'Lambda: stateless, no persistent disk — scales to zero when idle',
            'S3: private bucket, versioning enabled, all keys under figmai/ prefix',
            'manifest.json.networkAccess.allowedDomains — Figma enforces this at runtime, not us',
            'No telemetry SDKs, no analytics, no background sync anywhere',
            'Outbound calls: POST /v1/chat (LLM), GET /health (proxy), POST internalApiUrl',
          ],
        },
      ],
    },

    // ─────────────────────────────────────────────
    // Ch. 6 — Main Site (90s)
    // ─────────────────────────────────────────────
    {
      id: 'main-site',
      title: 'Main Site',
      durationSeconds: 90,
      scenes: [
        {
          type: 'bullets',
          heading: 'React + Vite static site.',
          points: [
            'Pages: Home, per-Assistant, Roadmap, Resources, Strike Team profiles',
            'VideoPlayer: teaser thumbnail (poster@2s) expands full-width on click',
            'Remotion pipeline: compositions in site/remotion/ → .mp4 → site/public/videos/',
            '1200px max-width via CSS formula: max(40px, calc((100% - 1200px) / 2))',
            'Deploy by uploading dist/ to any CDN — no server required',
          ],
        },
        {
          type: 'flow',
          nodes: [
            { id: 'edit',   label: 'Edit component' },
            { id: 'build',  label: 'npm run build' },
            { id: 'dist',   label: 'dist/ output' },
            { id: 'cdn',    label: 'Upload to CDN' },
            { id: 'live',   label: 'Live' },
          ],
          arrows: [
            { from: 'edit',  to: 'build' },
            { from: 'build', to: 'dist' },
            { from: 'dist',  to: 'cdn' },
            { from: 'cdn',   to: 'live' },
          ],
        },
      ],
    },

    // ─────────────────────────────────────────────
    // Ch. 7 — Extending the System (120s)
    // ─────────────────────────────────────────────
    {
      id: 'extending',
      title: 'Extending the System',
      durationSeconds: 120,
      scenes: [
        {
          type: 'flow',
          nodes: [
            { id: 'index',     label: 'Create index.ts' },
            { id: 'manifest',  label: 'Add to manifest.json' },
            { id: 'codeowners',label: 'Add CODEOWNERS' },
            { id: 'build',     label: 'npm run build' },
            { id: 'gate',      label: 'Compile gate ✓' },
            { id: 'pr',        label: 'Submit PR' },
          ],
          arrows: [
            { from: 'index',      to: 'manifest' },
            { from: 'manifest',   to: 'codeowners' },
            { from: 'codeowners', to: 'build' },
            { from: 'build',      to: 'gate' },
            { from: 'gate',       to: 'pr' },
          ],
        },
        {
          type: 'bullets',
          heading: 'Maintaining and extending.',
          points: [
            'New SDK export: add to src/sdk/index.ts, get Core review, bump exports',
            'PR management: CODEOWNERS auto-assigns, compile gate blocks broken TypeScript',
            'Deploy plugin: build → update manifest.json → distribute new bundle',
            'Debug broken handler: check canHandle() returns true for your assistantId',
            'Config not updating: check sync-config + confirm published.json was updated in S3',
          ],
        },
        {
          type: 'terminal',
          commands: [
            {
              cmd: 'mkdir -p src/assistants/my-assistant',
              output: [],
            },
            {
              cmd: 'cp src/assistants/general/index.ts src/assistants/my-assistant/index.ts',
              output: [],
            },
            {
              cmd: 'npm run build',
              output: [
                '── build-assistants ────────────────────',
                '✓ my-assistant      updated',
                'Build complete.',
              ],
            },
          ],
        },
      ],
    },
  ],
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd site && npx tsc --noEmit -p tsconfig.app.json 2>&1 | grep "error" | head -10
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
cd site && git add remotion/scripts/core-team-script.ts && git commit -m "feat(remotion): Core Team architecture video script data"
```

---

## Task 8: StrikeTeamVideo composition + tests

**Files:**
- Create: `site/remotion/src/compositions/StrikeTeamVideo.tsx`
- Create: `site/remotion/src/__tests__/StrikeTeamVideo.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// site/remotion/src/__tests__/StrikeTeamVideo.test.tsx
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { StrikeTeamVideo } from '../compositions/StrikeTeamVideo'
import { STRIKE_TEAM_SCRIPT } from '../../scripts/strike-team-script'
import { buildTimeline } from '../compositions/how-to/buildTimeline'

vi.mock('remotion', () => ({
  useCurrentFrame: vi.fn(() => 0),
  useVideoConfig: vi.fn(() => ({ fps: 30, width: 1280, height: 720, durationInFrames: 12600 })),
  spring: vi.fn(() => 1),
  interpolate: vi.fn((_v: number, _i: number[], o: number[]) => o[o.length - 1]),
}))

vi.mock('@remotion/google-fonts/Inter', () => ({
  loadFont: vi.fn(() => ({ fontFamily: 'Inter, sans-serif' })),
}))

// Mock all how-to components so tests only verify routing logic
vi.mock('../compositions/how-to/ChapterTitle', () => ({
  ChapterTitle: ({ title }: { title: string }) => (
    <div data-testid="chapter-title">{title}</div>
  ),
}))
vi.mock('../compositions/how-to/BulletList', () => ({
  BulletList: ({ heading }: { heading: string }) => (
    <div data-testid="bullet-list">{heading}</div>
  ),
}))
vi.mock('../compositions/how-to/Terminal', () => ({
  Terminal: () => <div data-testid="terminal" />,
}))
vi.mock('../compositions/how-to/FileTree', () => ({
  FileTree: () => <div data-testid="filetree" />,
}))
vi.mock('../compositions/how-to/FlowDiagram', () => ({
  FlowDiagram: () => <div data-testid="flow" />,
}))
vi.mock('../compositions/how-to/ArchDiagram', () => ({
  ArchDiagram: () => <div data-testid="arch" />,
}))

describe('StrikeTeamVideo', () => {
  afterEach(() => { vi.restoreAllMocks() })

  it('renders without crashing at frame 0', () => {
    const { container } = render(<StrikeTeamVideo />)
    expect(container.firstChild).toBeTruthy()
  })

  it('shows chapter 1 title at frame 0', async () => {
    const remotion = await import('remotion')
    vi.mocked(remotion.useCurrentFrame).mockReturnValue(0)
    render(<StrikeTeamVideo />)
    expect(screen.getByTestId('chapter-title')).toHaveTextContent("Welcome & What You're Building")
  })

  it('shows chapter 2 title at the start of chapter 2', async () => {
    const remotion = await import('remotion')
    const tl = buildTimeline(STRIKE_TEAM_SCRIPT)
    const ch2Start = tl.find(t => t.chapterIdx === 1 && t.isTitle)!.startFrame
    vi.mocked(remotion.useCurrentFrame).mockReturnValue(ch2Start)
    render(<StrikeTeamVideo />)
    expect(screen.getByTestId('chapter-title')).toHaveTextContent('Get Set Up')
  })

  it('shows a scene (not chapter title) after the chapter 1 title frames end', async () => {
    const remotion = await import('remotion')
    const tl = buildTimeline(STRIKE_TEAM_SCRIPT)
    const firstScene = tl.find(t => t.chapterIdx === 0 && !t.isTitle)!
    vi.mocked(remotion.useCurrentFrame).mockReturnValue(firstScene.startFrame)
    render(<StrikeTeamVideo />)
    // Should render a BulletList or FlowDiagram, not a chapter title
    expect(screen.queryByTestId('chapter-title')).toBeNull()
  })

  it('shows chapter 6 title near the end', async () => {
    const remotion = await import('remotion')
    const tl = buildTimeline(STRIKE_TEAM_SCRIPT)
    const ch6Start = tl.find(t => t.chapterIdx === 5 && t.isTitle)!.startFrame
    vi.mocked(remotion.useCurrentFrame).mockReturnValue(ch6Start)
    render(<StrikeTeamVideo />)
    expect(screen.getByTestId('chapter-title')).toHaveTextContent('ACE Admin')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd site && npm test -- StrikeTeamVideo 2>&1 | tail -20
```

Expected: FAIL — "Cannot find module '../compositions/StrikeTeamVideo'"

- [ ] **Step 3: Create StrikeTeamVideo composition**

```tsx
// site/remotion/src/compositions/StrikeTeamVideo.tsx
import { useCurrentFrame } from 'remotion'
import { loadFont } from '@remotion/google-fonts/Inter'
import { STRIKE_TEAM_SCRIPT } from '../../scripts/strike-team-script'
import { buildTimeline } from './how-to/buildTimeline'
import { ChapterTitle } from './how-to/ChapterTitle'
import { BulletList } from './how-to/BulletList'
import { Terminal } from './how-to/Terminal'
import { FileTree } from './how-to/FileTree'
import { FlowDiagram } from './how-to/FlowDiagram'
import type { Scene } from './how-to/types'

const { fontFamily } = loadFont('normal')

const TIMELINE = buildTimeline(STRIKE_TEAM_SCRIPT)
const TOTAL_FRAMES = TIMELINE[TIMELINE.length - 1].endFrame

function SceneRenderer({
  scene,
  accentColor,
  startFrame,
  globalProgress,
}: {
  scene: Scene
  accentColor: string
  startFrame: number
  globalProgress: number
}) {
  const sharedProps = { accentColor, startFrame, globalProgress }
  switch (scene.type) {
    case 'bullets':
      return <BulletList heading={scene.heading} points={scene.points} {...sharedProps} />
    case 'terminal':
      return <Terminal commands={scene.commands} {...sharedProps} />
    case 'filetree':
      return <FileTree lines={scene.lines} {...sharedProps} />
    case 'flow':
      return <FlowDiagram nodes={scene.nodes} arrows={scene.arrows} {...sharedProps} />
    default:
      return null
  }
}

export function StrikeTeamVideo() {
  const frame = useCurrentFrame()
  const globalProgress = frame / TOTAL_FRAMES
  const entry = TIMELINE.find(t => frame >= t.startFrame && frame < t.endFrame)
    ?? TIMELINE[TIMELINE.length - 1]
  const chapter = STRIKE_TEAM_SCRIPT.chapters[entry.chapterIdx]
  const { accentColor } = STRIKE_TEAM_SCRIPT

  return (
    <div
      style={{
        width: 1280,
        height: 720,
        background: '#0a0a0a',
        fontFamily,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {entry.isTitle ? (
        <ChapterTitle
          chapterNum={entry.chapterIdx + 1}
          totalChapters={STRIKE_TEAM_SCRIPT.chapters.length}
          title={chapter.title}
          accentColor={accentColor}
          startFrame={entry.startFrame}
          globalProgress={globalProgress}
        />
      ) : (
        <SceneRenderer
          scene={chapter.scenes[entry.sceneIdx]}
          accentColor={accentColor}
          startFrame={entry.startFrame}
          globalProgress={globalProgress}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run the tests and verify they pass**

```bash
cd site && npm test -- StrikeTeamVideo 2>&1 | tail -20
```

Expected: 5 tests pass, 0 fail.

- [ ] **Step 5: Commit**

```bash
cd site && git add remotion/src/compositions/StrikeTeamVideo.tsx remotion/src/__tests__/StrikeTeamVideo.test.tsx && git commit -m "feat(remotion): StrikeTeamVideo composition and tests"
```

---

## Task 9: CoreTeamVideo composition + tests

**Files:**
- Create: `site/remotion/src/compositions/CoreTeamVideo.tsx`
- Create: `site/remotion/src/__tests__/CoreTeamVideo.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// site/remotion/src/__tests__/CoreTeamVideo.test.tsx
import { describe, it, expect, vi, afterEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { CoreTeamVideo } from '../compositions/CoreTeamVideo'
import { CORE_TEAM_SCRIPT } from '../../scripts/core-team-script'
import { buildTimeline } from '../compositions/how-to/buildTimeline'

vi.mock('remotion', () => ({
  useCurrentFrame: vi.fn(() => 0),
  useVideoConfig: vi.fn(() => ({ fps: 30, width: 1280, height: 720, durationInFrames: 23400 })),
  spring: vi.fn(() => 1),
  interpolate: vi.fn((_v: number, _i: number[], o: number[]) => o[o.length - 1]),
}))

vi.mock('@remotion/google-fonts/Inter', () => ({
  loadFont: vi.fn(() => ({ fontFamily: 'Inter, sans-serif' })),
}))

vi.mock('../compositions/how-to/ChapterTitle', () => ({
  ChapterTitle: ({ title }: { title: string }) => (
    <div data-testid="chapter-title">{title}</div>
  ),
}))
vi.mock('../compositions/how-to/BulletList', () => ({
  BulletList: ({ heading }: { heading: string }) => (
    <div data-testid="bullet-list">{heading}</div>
  ),
}))
vi.mock('../compositions/how-to/Terminal', () => ({
  Terminal: () => <div data-testid="terminal" />,
}))
vi.mock('../compositions/how-to/FileTree', () => ({
  FileTree: () => <div data-testid="filetree" />,
}))
vi.mock('../compositions/how-to/FlowDiagram', () => ({
  FlowDiagram: () => <div data-testid="flow" />,
}))
vi.mock('../compositions/how-to/ArchDiagram', () => ({
  ArchDiagram: () => <div data-testid="arch" />,
}))

describe('CoreTeamVideo', () => {
  afterEach(() => { vi.restoreAllMocks() })

  it('renders without crashing at frame 0', () => {
    const { container } = render(<CoreTeamVideo />)
    expect(container.firstChild).toBeTruthy()
  })

  it('shows chapter 1 title at frame 0', async () => {
    const remotion = await import('remotion')
    vi.mocked(remotion.useCurrentFrame).mockReturnValue(0)
    render(<CoreTeamVideo />)
    expect(screen.getByTestId('chapter-title')).toHaveTextContent('System Overview')
  })

  it('shows chapter 2 title at the start of chapter 2', async () => {
    const remotion = await import('remotion')
    const tl = buildTimeline(CORE_TEAM_SCRIPT)
    const ch2Start = tl.find(t => t.chapterIdx === 1 && t.isTitle)!.startFrame
    vi.mocked(remotion.useCurrentFrame).mockReturnValue(ch2Start)
    render(<CoreTeamVideo />)
    expect(screen.getByTestId('chapter-title')).toHaveTextContent('Plugin Architecture')
  })

  it('shows a scene after the chapter 1 title frames end', async () => {
    const remotion = await import('remotion')
    const tl = buildTimeline(CORE_TEAM_SCRIPT)
    const firstScene = tl.find(t => t.chapterIdx === 0 && !t.isTitle)!
    vi.mocked(remotion.useCurrentFrame).mockReturnValue(firstScene.startFrame)
    render(<CoreTeamVideo />)
    expect(screen.queryByTestId('chapter-title')).toBeNull()
  })

  it('shows chapter 7 title near the end', async () => {
    const remotion = await import('remotion')
    const tl = buildTimeline(CORE_TEAM_SCRIPT)
    const ch7Start = tl.find(t => t.chapterIdx === 6 && t.isTitle)!.startFrame
    vi.mocked(remotion.useCurrentFrame).mockReturnValue(ch7Start)
    render(<CoreTeamVideo />)
    expect(screen.getByTestId('chapter-title')).toHaveTextContent('Extending the System')
  })
})
```

- [ ] **Step 2: Run the test to verify it fails**

```bash
cd site && npm test -- CoreTeamVideo 2>&1 | tail -20
```

Expected: FAIL — "Cannot find module '../compositions/CoreTeamVideo'"

- [ ] **Step 3: Create CoreTeamVideo composition**

```tsx
// site/remotion/src/compositions/CoreTeamVideo.tsx
import { useCurrentFrame } from 'remotion'
import { loadFont } from '@remotion/google-fonts/Inter'
import { CORE_TEAM_SCRIPT } from '../../scripts/core-team-script'
import { buildTimeline } from './how-to/buildTimeline'
import { ChapterTitle } from './how-to/ChapterTitle'
import { BulletList } from './how-to/BulletList'
import { Terminal } from './how-to/Terminal'
import { FileTree } from './how-to/FileTree'
import { FlowDiagram } from './how-to/FlowDiagram'
import { ArchDiagram } from './how-to/ArchDiagram'
import type { Scene } from './how-to/types'

const { fontFamily } = loadFont('normal')

const TIMELINE = buildTimeline(CORE_TEAM_SCRIPT)
const TOTAL_FRAMES = TIMELINE[TIMELINE.length - 1].endFrame

function SceneRenderer({
  scene,
  accentColor,
  startFrame,
  globalProgress,
}: {
  scene: Scene
  accentColor: string
  startFrame: number
  globalProgress: number
}) {
  const sharedProps = { accentColor, startFrame, globalProgress }
  switch (scene.type) {
    case 'bullets':
      return <BulletList heading={scene.heading} points={scene.points} {...sharedProps} />
    case 'terminal':
      return <Terminal commands={scene.commands} {...sharedProps} />
    case 'filetree':
      return <FileTree lines={scene.lines} {...sharedProps} />
    case 'flow':
      return <FlowDiagram nodes={scene.nodes} arrows={scene.arrows} {...sharedProps} />
    case 'arch':
      return <ArchDiagram boxes={scene.boxes} connections={scene.connections} {...sharedProps} />
  }
}

export function CoreTeamVideo() {
  const frame = useCurrentFrame()
  const globalProgress = frame / TOTAL_FRAMES
  const entry = TIMELINE.find(t => frame >= t.startFrame && frame < t.endFrame)
    ?? TIMELINE[TIMELINE.length - 1]
  const chapter = CORE_TEAM_SCRIPT.chapters[entry.chapterIdx]
  const { accentColor } = CORE_TEAM_SCRIPT

  return (
    <div
      style={{
        width: 1280,
        height: 720,
        background: '#0d1117',
        fontFamily,
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {entry.isTitle ? (
        <ChapterTitle
          chapterNum={entry.chapterIdx + 1}
          totalChapters={CORE_TEAM_SCRIPT.chapters.length}
          title={chapter.title}
          accentColor={accentColor}
          startFrame={entry.startFrame}
          globalProgress={globalProgress}
        />
      ) : (
        <SceneRenderer
          scene={chapter.scenes[entry.sceneIdx]}
          accentColor={accentColor}
          startFrame={entry.startFrame}
          globalProgress={globalProgress}
        />
      )}
    </div>
  )
}
```

- [ ] **Step 4: Run the tests and verify they pass**

```bash
cd site && npm test -- CoreTeamVideo 2>&1 | tail -20
```

Expected: 5 tests pass, 0 fail.

- [ ] **Step 5: Run the full test suite to check for regressions**

```bash
cd site && npm test 2>&1 | tail -15
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
cd site && git add remotion/src/compositions/CoreTeamVideo.tsx remotion/src/__tests__/CoreTeamVideo.test.tsx && git commit -m "feat(remotion): CoreTeamVideo composition and tests"
```

---

## Task 10: Root.tsx + render.mjs updates

**Files:**
- Modify: `site/remotion/src/Root.tsx`
- Modify: `site/remotion/render.mjs`
- Modify: `.gitignore`

- [ ] **Step 1: Register new compositions in Root.tsx**

Open `site/remotion/src/Root.tsx`. The current file reads:

```tsx
import { Composition, registerRoot } from 'remotion'
import { AssistantVideo } from './AssistantVideo'
import { OverviewVideo } from './compositions/OverviewVideo'

export function RemotionRoot() {
  return (
    <>
      <Composition
        id="AssistantVideo"
        component={AssistantVideo}
        durationInFrames={540}
        fps={30}
        width={1280}
        height={720}
        defaultProps={{ assistantId: 'general' }}
      />
      <Composition
        id="OverviewVideo"
        component={OverviewVideo}
        durationInFrames={1200}
        fps={30}
        width={1280}
        height={720}
      />
    </>
  )
}

registerRoot(RemotionRoot)
```

Replace with:

```tsx
import { Composition, registerRoot } from 'remotion'
import { AssistantVideo } from './AssistantVideo'
import { OverviewVideo } from './compositions/OverviewVideo'
import { StrikeTeamVideo } from './compositions/StrikeTeamVideo'
import { CoreTeamVideo } from './compositions/CoreTeamVideo'

export function RemotionRoot() {
  return (
    <>
      <Composition
        id="AssistantVideo"
        component={AssistantVideo}
        durationInFrames={540}
        fps={30}
        width={1280}
        height={720}
        defaultProps={{ assistantId: 'general' }}
      />
      <Composition
        id="OverviewVideo"
        component={OverviewVideo}
        durationInFrames={1200}
        fps={30}
        width={1280}
        height={720}
      />
      <Composition
        id="StrikeTeamVideo"
        component={StrikeTeamVideo}
        durationInFrames={12600}
        fps={30}
        width={1280}
        height={720}
      />
      <Composition
        id="CoreTeamVideo"
        component={CoreTeamVideo}
        durationInFrames={23400}
        fps={30}
        width={1280}
        height={720}
      />
    </>
  )
}

registerRoot(RemotionRoot)
```

- [ ] **Step 2: Update render.mjs**

Open `site/remotion/render.mjs`. The current file has:

```js
const arg = process.argv[2]
const renderOverview  = !arg || arg === 'overview'
const renderAssistants = !arg || arg === 'assistants'
```

Replace the entire file with:

```js
import { bundle } from '@remotion/bundler'
import { renderMedia, selectComposition } from '@remotion/renderer'
import { mkdirSync, existsSync } from 'fs'
import { execSync } from 'child_process'
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

// CLI usage:
//   node render.mjs                  → render all videos
//   node render.mjs overview         → overview only
//   node render.mjs assistants       → 5 assistant videos
//   node render.mjs strike-team      → strike-team.mp4
//   node render.mjs core-team        → core-team.mp4
const arg = process.argv[2]
const renderOverview    = !arg || arg === 'overview'
const renderAssistants  = !arg || arg === 'assistants'
const renderStrikeTeam  = !arg || arg === 'strike-team'
const renderCoreTeam    = !arg || arg === 'core-team'

const videosDir = path.resolve(__dirname, '..', 'public', 'videos')

function extractPoster(videoPath, posterPath) {
  try {
    execSync(`ffmpeg -y -ss 00:00:02 -i "${videoPath}" -vframes 1 -q:v 3 "${posterPath}" 2>/dev/null`)
    console.log(`  ✓ poster extracted`)
  } catch {
    console.log(`  ⚠ ffmpeg not available — skipping poster extraction`)
  }
}

async function main() {
  mkdirSync(videosDir, { recursive: true })

  console.log('Bundling Remotion compositions...')
  const bundleLocation = await bundle({
    entryPoint: path.resolve(__dirname, 'src/Root.tsx'),
  })
  console.log('Bundle ready.\n')

  if (renderOverview) {
    const outputPath = path.resolve(videosDir, 'overview.mp4')
    process.stdout.write('  overview (40s)...')
    const composition = await selectComposition({ serveUrl: bundleLocation, id: 'OverviewVideo' })
    await renderMedia({
      composition, serveUrl: bundleLocation, codec: 'h264', outputLocation: outputPath,
      onProgress: ({ progress }) => process.stdout.write(`\r  overview (40s)... ${Math.round(progress * 100)}%`),
    })
    console.log('\r  ✓ overview.mp4')
    extractPoster(outputPath, path.resolve(videosDir, 'overview-poster.jpg'))
  }

  if (renderAssistants) {
    for (const id of ASSISTANT_IDS) {
      const outputPath = path.resolve(videosDir, `${id}.mp4`)
      process.stdout.write(`  ${id}...`)
      const composition = await selectComposition({ serveUrl: bundleLocation, id: 'AssistantVideo', inputProps: { assistantId: id } })
      await renderMedia({
        composition, serveUrl: bundleLocation, codec: 'h264', outputLocation: outputPath,
        inputProps: { assistantId: id },
        onProgress: ({ progress }) => process.stdout.write(`\r  ${id}... ${Math.round(progress * 100)}%`),
      })
      console.log(`\r  ✓ ${id}.mp4`)
      extractPoster(outputPath, path.resolve(videosDir, `${id}-poster.jpg`))
    }
  }

  if (renderStrikeTeam) {
    const outputPath = path.resolve(videosDir, 'strike-team.mp4')
    process.stdout.write('  strike-team (7min)...')
    const composition = await selectComposition({ serveUrl: bundleLocation, id: 'StrikeTeamVideo' })
    await renderMedia({
      composition, serveUrl: bundleLocation, codec: 'h264', outputLocation: outputPath,
      onProgress: ({ progress }) => process.stdout.write(`\r  strike-team (7min)... ${Math.round(progress * 100)}%`),
    })
    console.log('\r  ✓ strike-team.mp4')
    extractPoster(outputPath, path.resolve(videosDir, 'strike-team-poster.jpg'))
  }

  if (renderCoreTeam) {
    const outputPath = path.resolve(videosDir, 'core-team.mp4')
    process.stdout.write('  core-team (13min)...')
    const composition = await selectComposition({ serveUrl: bundleLocation, id: 'CoreTeamVideo' })
    await renderMedia({
      composition, serveUrl: bundleLocation, codec: 'h264', outputLocation: outputPath,
      onProgress: ({ progress }) => process.stdout.write(`\r  core-team (13min)... ${Math.round(progress * 100)}%`),
    })
    console.log('\r  ✓ core-team.mp4')
    extractPoster(outputPath, path.resolve(videosDir, 'core-team-poster.jpg'))
  }

  console.log('\nDone.')
}

main().catch(err => {
  console.error(err)
  process.exit(1)
})
```

- [ ] **Step 3: Update .gitignore to exclude new poster files**

Open `.gitignore`. Find the line:

```
site/public/videos/*.mp4
```

Add below it:

```
site/public/videos/*-poster.jpg
```

(It may already be there — verify with `grep poster .gitignore`. If present, skip.)

- [ ] **Step 4: Run all tests to confirm no regressions**

```bash
cd site && npm test 2>&1 | tail -15
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
cd site && git add remotion/src/Root.tsx remotion/render.mjs ../.gitignore && git commit -m "feat(remotion): register StrikeTeamVideo + CoreTeamVideo, update render.mjs with new targets and poster extraction"
```

---

## Verification

After all tasks are complete, verify the full build and confirm Remotion Studio can preview both compositions:

```bash
# 1. TypeScript clean
cd site && npx tsc --noEmit -p tsconfig.app.json 2>&1 | grep "error"
# Expected: no output

# 2. All tests pass
cd site && npm test 2>&1 | tail -10
# Expected: all pass

# 3. Preview in Remotion Studio (opens browser)
cd site/remotion && npx remotion studio
# Navigate to StrikeTeamVideo and CoreTeamVideo in the sidebar
# Scrub through the timeline to verify chapters and scene transitions

# 4. Optional: render one video to confirm output
cd site/remotion && node render.mjs strike-team
# Expected: site/public/videos/strike-team.mp4 and strike-team-poster.jpg created
```
