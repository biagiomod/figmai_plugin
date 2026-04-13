# How-To Videos Design Spec

**Date:** 2026-04-13  
**Status:** Approved

---

## Goal

Produce two Remotion-animated videos that onboard contributors and document the system architecture — no screen recordings, fully data-driven so content can be updated by editing a script file and re-rendering.

---

## Videos Overview

| Video | Audience | Duration | Chapters | Location in ACE |
|-------|----------|----------|----------|-----------------|
| **Strike Team Onboarding** | Vibe coders / junior devs on Strike Teams | ~7 min | 6 | Assistants section (top level) |
| **Core Team Architecture** | Core Team developers | ~13 min | 7 | Help section (permission-gated) |

---

## Approach: Data-Driven, Single-File Per Audience

Each video is a single Remotion composition. All on-screen text, bullet points, terminal commands, diagram labels, and chapter titles live in a structured TypeScript script file. The composition reads from the script — updating content requires only editing the script and re-rendering. No composition code changes needed for content updates.

**Update workflow:**
```
Edit site/remotion/scripts/strike-team-script.ts
  → node render.mjs strike-team
  → upload new strike-team.mp4 to ACE
```

---

## File Structure

```
site/remotion/
  scripts/
    strike-team-script.ts       # Chapter + scene data for Strike Team video
    core-team-script.ts         # Chapter + scene data for Core Team video
  src/
    compositions/
      StrikeTeamVideo.tsx        # Composition — reads strike-team-script.ts
      CoreTeamVideo.tsx          # Composition — reads core-team-script.ts
      how-to/
        ChapterTitle.tsx         # Chapter opener with title + progress bar
        Terminal.tsx             # Typewriter terminal command animation
        FileTree.tsx             # Animated directory tree reveal
        FlowDiagram.tsx          # Nodes + arrows draw-in animation
        BulletList.tsx           # Staggered bullet point list
        ArchDiagram.tsx          # Multi-box architecture diagram (Core Team)

site/public/videos/
  strike-team.mp4               # Rendered output → ACE Assistants section
  strike-team-poster.jpg        # Poster frame at 0:02
  core-team.mp4                 # Rendered output → ACE Help section
  core-team-poster.jpg          # Poster frame at 0:02
```

---

## Script File Contract

Each script file exports a typed `HowToScript` with chapters and scenes:

```typescript
// site/remotion/scripts/strike-team-script.ts
import type { HowToScript } from '../src/compositions/how-to/types'

export const STRIKE_TEAM_SCRIPT: HowToScript = {
  title: 'Strike Team Onboarding',
  accentColor: '#ef4477',       // Pink — matches site accent
  chapters: [
    {
      id: 'welcome',
      title: 'Welcome & What You\'re Building',
      durationSeconds: 45,
      scenes: [
        { type: 'bullets', heading: 'You are a Strike Team', points: [...] },
        { type: 'flow',    nodes: [...], arrows: [...] },
      ]
    },
    // ...
  ]
}
```

```typescript
// site/remotion/scripts/core-team-script.ts
export const CORE_TEAM_SCRIPT: HowToScript = {
  title: 'Core Team Architecture',
  accentColor: '#60a5fa',       // Blue
  chapters: [...],
}
```

### Scene Types

| Type | Component | Used for |
|------|-----------|----------|
| `bullets` | `BulletList.tsx` | Text talking points, staggered reveal |
| `terminal` | `Terminal.tsx` | CLI commands with typewriter animation |
| `filetree` | `FileTree.tsx` | Directory structure animated reveal |
| `flow` | `FlowDiagram.tsx` | Multi-step process (PR flow, message flow) |
| `arch` | `ArchDiagram.tsx` | Multi-box system diagrams (Core Team only) |
| `chapter` | `ChapterTitle.tsx` | Chapter opener — always the first scene in each chapter |

---

## Remotion Specs

| Property | Strike Team | Core Team |
|----------|-------------|-----------|
| Duration | 12,600 frames (7 min × 30fps) | 23,400 frames (13 min × 30fps) |
| FPS | 30 | 30 |
| Resolution | 1280 × 720 | 1280 × 720 |
| Background | `#0a0a0a` | `#0d1117` |
| Accent | `#ef4477` (pink) | `#60a5fa` (blue) |
| Font | Inter (via `@remotion/google-fonts`) | Inter |
| Composition ID | `StrikeTeamVideo` | `CoreTeamVideo` |

Chapter markers: a thin accent-colored progress bar at the bottom of every frame showing position within the current chapter. Chapter number + title fade in at the start of each chapter.

---

## render.mjs CLI

Extend the existing render script with two new targets:

```bash
node render.mjs                  # renders all videos (existing + new)
node render.mjs strike-team      # renders only strike-team.mp4
node render.mjs core-team        # renders only core-team.mp4
node render.mjs overview         # existing
node render.mjs assistants       # existing
```

---

## Strike Team Video — Chapter Detail

**Video tone:** Approachable, encouraging, jargon-light. Assumes Git and Node at junior level. Names specific assistants (general, evergreens, accessibility) to ground abstract concepts.

### Ch. 1 — Welcome & What You're Building (0:00–0:45)
- **Scenes:** bullets + flow diagram
- What is a Strike Team? What is an Assistant in FigmAI?
- Animated flow: `Strike Team` → `Plugin` → `Designer in Figma`
- "Your job: build and maintain one Assistant. The Core Team handles everything else."

### Ch. 2 — Get Set Up (0:45–2:00)
- **Scenes:** terminal
- Clone the starter repo
- `npm install`
- Open in your editor (VS Code recommended)
- Terminal typewriter animation: each command appears, then a ✓ confirms it ran

### Ch. 3 — Your Two Directories (2:00–3:30)
- **Scenes:** filetree + bullets
- Animated file tree reveals the full repo, then zooms/highlights only two nodes:
  - `src/assistants/your-name/` — your TypeScript handler code
  - `custom/assistants/your-name/` — your config, knowledge files, SKILL.md
- Examples shown: `general`, `evergreens`, `accessibility`
- "Everything outside these two directories is owned by the Core Team. Don't touch it."
- SKILL.md explained: "This file controls your assistant's behavior and personality in the plugin."

### Ch. 4 — Build & Test in Figma (3:30–4:45)
- **Scenes:** terminal + bullets
- Run `npm run build`
- Animated compile report: `✓ your-assistant updated` / `⚠ other-assistant kept previous`
- "Errors in other assistants don't block you — fix your own and ship."
- Load the built plugin in Figma desktop: Plugins → Development → Import plugin from manifest
- Test your assistant in a Figma file

### Ch. 5 — Submit Your Work — Pull Request (4:45–6:00)
- **Scenes:** flow + bullets
- Create a feature branch: `git checkout -b feat/my-update`
- Make changes only in your two directories
- `git add src/assistants/your-name/ custom/assistants/your-name/`
- Open a Pull Request
- Animated PR flow: `Branch` → `PR opened` → `Core Team reviews` → `Merged ✓`
- If PR fails: Core Team comments with proposed fixes. Fix → push → auto re-review.
- "The Core Team will never reject without explaining why and offering a solution."

### Ch. 6 — ACE Admin: Edit & Configure (6:00–7:00)
- **Scenes:** bullets + flow
- Log into ACE (link provided by Core Team)
- Navigate to Assistants → your assistant
- Edit the content shown on the Main Site (description, features, examples)
- Configure your assistant: SKILL.md, knowledge base entries, quick actions
- Publish changes — no code deploy, no PR needed
- "Content changes go live without touching code."

---

## Core Team Video — Chapter Detail

**Video tone:** Technical, precise. Assumes strong developer context. Diagram-heavy. Each chapter covers one subsystem in depth.

### Ch. 1 — System Overview: The Big Picture (0:00–1:30)
- **Scenes:** arch diagram + bullets
- Animated four-box architecture diagram:
  ```
  [Figma Plugin] ←→ [AWS: Lambda + S3] ←→ [ACE Admin SPA]
       ↑
  [Main Site]
  ```
- Arrows animate in showing data flows: config pull, LLM requests, content publish
- Who owns what: Strike Teams (two dirs), Core Team (everything else)
- "The plugin has zero runtime dependency on ACE or S3 — config is baked in at build time."

### Ch. 2 — Plugin Architecture (1:30–3:30)
- **Scenes:** flow + filetree + bullets
- `main.ts` as the message-routing orchestrator (never add business logic here)
- `ui.tsx` as stateless display (main thread is source of truth)
- Handler pattern: `canHandle()` → `handleResponse()` — pre-LLM vs post-LLM
- Provider abstraction: Proxy mode vs Internal API mode
- Animated message flow: `UI emits RUN_QUICK_ACTION` → `main.ts` → `Handler lookup` → `Provider.sendChat()` → `Post-LLM Handler` → `UI displays result`
- SDK barrel: `src/sdk/index.ts` — only stable surface for assistant code

### Ch. 3 — Assistant System & SDK (3:30–5:30)
- **Scenes:** filetree + bullets + flow
- Two-directory model — Strike Team owns exactly two paths
- `index.ts` contract: `AssistantModule` with optional `handler`
- SDK imports only: `import { ... } from '../../sdk'` — never `../../core`
- CODEOWNERS: auto-assigns Strike Team as reviewer for their directories
- Compile gate: `build-assistants` script generates per-assistant report
- Manifest wiring: `custom/assistants.manifest.json` → `_registry.generated.ts`
- Ports-and-adapters: replaceable engines behind stable port interfaces

### Ch. 4 — ACE Admin & Config Pipeline (5:30–7:30)
- **Scenes:** arch diagram + flow + bullets
- ACE SPA: pure static HTML/CSS/JS, deployed to any static host, zero server logic
- Config API: stateless Node Lambda, reads/writes S3, validates models, manages Draft/Publish lifecycle
- S3 layout animated: `draft/` → `snapshots/<id>/` → `published.json`
- `sync-config` script: pulls `published.json` snapshot into `custom/` at build time
- "The plugin is never connected to S3 at runtime — it only reads what was baked in at build."
- Draft/Publish lifecycle: Edit in ACE → Save to S3 draft → Publish → snapshot created → pointer updated → next build picks it up

### Ch. 5 — AWS Infrastructure (7:30–9:30)
- **Scenes:** arch diagram + bullets
- Lambda: Config API — stateless, no filesystem, scales to zero
- S3: private bucket, versioning enabled, `figmai/` prefix
- CloudFront + static hosting: serves ACE SPA
- `manifest.json.networkAccess.allowedDomains`: only allowlisted domains can be called at runtime — enforced by Figma
- No telemetry, no third-party SDKs, no background sync
- Network call inventory: only `POST /v1/chat` (LLM), `GET /health` (proxy check), `POST {internalApiUrl}` (internal API mode)
- Security model: no secrets in source, custom endpoints in `custom/config.json` only

### Ch. 6 — Main Site (9:30–11:00)
- **Scenes:** bullets + flow
- React + Vite static site — no server-side rendering
- Pages: Home, AssistantPage (per assistant), Roadmap, Resources, StrikeTeamProfile
- VideoPlayer: teaser thumbnail (poster@2s) → expand full-width on click
- Remotion pipeline: compositions in `site/remotion/` → rendered `.mp4` → `site/public/videos/`
- Site hosted as static files — deploy by uploading `dist/` to any CDN
- 1200px max-width constraint via CSS formula across all sections

### Ch. 7 — Extending the System (11:00–13:00)
- **Scenes:** flow + bullets + terminal
- Adding a new assistant end-to-end:
  1. Create `src/assistants/name/index.ts` + optional `handler.ts`
  2. Add entry to `custom/assistants.manifest.json`
  3. Add CODEOWNERS entries
  4. `npm run build` — compile gate validates
- Evolving the SDK: add to `src/sdk/index.ts`, get Core review, bump exports
- Managing Strike Team PRs: CODEOWNERS auto-assigns reviewers, compile gate blocks broken TypeScript, review checklist
- Deploying plugin updates: build → distribute updated `manifest.json` + bundle
- Common failure modes and debug paths: broken handler (check `canHandle()`), config not updating (check `sync-config` + S3 publish state), network blocked (check `manifest.json.networkAccess`)

---

## Animation Primitives

All shared components live in `site/remotion/src/compositions/how-to/`:

### `Terminal.tsx`
- Dark terminal window (`#0d1117` bg, green prompt)
- Commands appear via typewriter (character by character, ~8 chars/frame)
- Each command followed by simulated output lines fading in
- Cursor blink on last line

### `FileTree.tsx`
- Monospace, dark bg
- Lines reveal top-to-bottom with staggered spring
- Highlighted nodes use accent-color background flash
- Dimmed non-owned paths use reduced opacity

### `FlowDiagram.tsx`
- Boxes spring in left-to-right, staggered by 10 frames
- Arrows draw in using SVG stroke-dashoffset animation
- Labels fade in after arrow completes

### `ArchDiagram.tsx` (Core Team only)
- Multi-row system diagram with labeled subsystem boxes
- Color-coded by domain: Plugin (pink), AWS (blue), ACE (purple), Site (green)
- Connection lines animate with flowing dots to show data direction

### `BulletList.tsx`
- Points spring in one by one, staggered by 12 frames
- Heading appears first with slight scale spring
- Supporting text fades in 6 frames after heading

### `ChapterTitle.tsx`
- Full-screen chapter opener: chapter number + title
- Background pulse glow in accent color
- Progress bar at bottom: thin line tracking position within current video
- Auto-transitions to first scene after 60 frames (2s)

---

## render.mjs Changes

Add `strike-team` and `core-team` as valid CLI targets alongside existing `overview` and `assistants`. Each renders the corresponding composition and extracts a poster frame at 2 seconds using ffmpeg.

Composition registrations to add to `site/remotion/src/Root.tsx`:

```tsx
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
```

---

## Testing

- `npm run build` must pass with no TypeScript errors before rendering
- Each composition must be previewable in Remotion Studio (`npx remotion studio`)
- Rendered videos must load in the existing `VideoPlayer` component (teaser + expand)
- Poster frames must exist at `public/videos/strike-team-poster.jpg` and `public/videos/core-team-poster.jpg`

---

## Out of Scope

- Screen recordings or narration audio (text-only animated video)
- ACE UI changes to support video embedding (Core Team handles separately)
- Per-assistant variants of the Strike Team video (one generic video covers all)
- Closed captions (future iteration)
