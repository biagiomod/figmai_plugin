# Remotion Assistant Videos — Design Spec

## Goal

Generate a unique 18-second MP4 intro video for each of the 5 live Design AI Toolkit assistants using Remotion, replacing the current 2KB placeholder stubs at `site/public/videos/{id}.mp4`.

## Architecture

Single data-driven Remotion composition (`AssistantVideo`) that accepts an assistant ID as an input prop. One render script loops over all 5 assistants and calls `renderMedia` for each. The template is shared; the content (name, tagline, accent color, icon, steps, quick actions) is unique per assistant.

**Tech stack:** Remotion 4.x, `@remotion/renderer` (headless render), `@remotion/google-fonts` (Inter), TypeScript, React 18.

**Location:** `site/remotion/` — a self-contained package nested inside the existing Vite site directory. Renders output directly to `site/public/videos/{id}.mp4`.

---

## File Structure

```
site/remotion/
├── package.json               # remotion, @remotion/renderer, @remotion/google-fonts
├── tsconfig.json              # extends ../tsconfig.app.json
├── render.mjs                 # Node script: loops 5 assistants, calls renderMedia
├── src/
│   ├── Root.tsx               # Registers AssistantVideo composition (1280×720, 30fps, 540 frames)
│   ├── AssistantVideo.tsx     # Routes to Intro / Steps / Closing by frame range
│   ├── acts/
│   │   ├── Intro.tsx          # Act 1: icon, name, tagline on glow background
│   │   ├── Steps.tsx          # Act 2: step walkthrough with progress bar
│   │   └── Closing.tsx        # Act 3: quick action chips, assistant name, CTA
│   ├── components/
│   │   ├── GlowBackground.tsx # Radial glow with slow breath pulse
│   │   ├── ProgressBar.tsx    # Accent-color bar across top of frame
│   │   └── Chip.tsx           # Quick action pill with spring-in animation
│   └── data.ts                # Re-exports LIVE_ASSISTANTS from ../../src/data/assistants.ts
```

---

## Video Spec

| Property | Value |
|---|---|
| Resolution | 1280 × 720 (16:9) |
| Frame rate | 30 fps |
| Duration | 18 seconds (540 frames) |
| Format | MP4 (H.264) |
| Output | `site/public/videos/{id}.mp4` |

---

## Visual Style

**Contrast from the site:** The site uses a dark theme (`#0f0f0f` backgrounds). Videos use a light base with cinematic accent-color glow — visually distinct but on-brand.

- **Background (Intro & Closing):** Near-white `#f8f8f8` with a soft radial glow in the assistant's accent color. Glow breathes slowly via `Math.sin` scale pulse (1.0–1.08) — never fully static.
- **Background (Steps):** Light warm gray `#f0f0f0` with a faint accent gradient in one corner.
- **Text:** Dark (`#111`) for names and step titles; muted gray (`#555`) for descriptions and taglines.
- **Accent:** Each assistant's unique `accent` hex color for icons, progress bar, chip borders, step numbers.
- **Font:** Inter via `@remotion/google-fonts` — matches the site's `--font-sans`.

---

## Act Breakdown

### Act 1 — Branded Intro (frames 0–89, 0–3s)

**Purpose:** Establish assistant identity.

**Animations (nothing holds static):**
- Frame 0–30: glow opacity `interpolate(frame, [0, 30], [0, 1])` fade-in
- Frame 10+: icon spring scale `0.6 → 1.0`, opacity `0 → 1`
- Frame 20+: assistant name spring `translateY(+20px → 0)`, opacity fade-in
- Frame 35+: tagline `translateY(+10px → 0)`, opacity `0 → 1`
- Throughout: glow scale `1.0 + 0.08 * Math.sin(frame / 40)` — continuous pulse

### Act 2 — Step Walkthrough (frames 90–419, 3–14s)

**Purpose:** Show the workflow for this specific assistant (3–4 steps).

**Animations:**
- Progress bar: accent-color bar at top, width `interpolate(frame, [90, 419], [0, 100])%` — crawls continuously
- Each step gets `~75 frames` (2.5s). Steps are distributed evenly across available frames based on `howToUse.length`.
- Step enter: `translateX(-30px → 0)` + opacity fade-in over 20 frames
- Step exit: `translateY(-20px)` + opacity fade-out over 15 frames before next step enters
- Step layout: accent-color filled circle with step number (left), bold title, muted description below
- No frame is ever fully static — the progress bar ensures continuous visible motion

### Act 3 — Closing Card (frames 420–539, 14–18s)

**Purpose:** Reinforce the assistant and show quick actions.

**Animations:**
- Frame 420–440: glow background fades back in
- Frame 440+: quick action chips spring in staggered, each delayed by `index * 8` frames
- Chip style: white background, accent-color border + text, rounded pill (`border-radius: 999px`)
- Frame 460+: assistant name fades in
- Frame 490+: CTA text "Open in Figma" fades in
- Throughout: glow pulse continues — final frame is never frozen

---

## Data Flow

`data.ts` re-exports `LIVE_ASSISTANTS` from the site's existing `src/data/assistants.ts`. Each assistant provides:

```ts
{
  id: string          // used for output filename
  name: string        // displayed in Intro and Closing
  tagline: string     // displayed in Intro
  accent: string      // hex color for all accent elements
  icon: LucideIcon    // rendered directly as a React component (Lucide works in Remotion natively)
  howToUse: Step[]    // drives Act 2 content (max 4 steps shown)
  quickActions: string[]  // drives Act 3 chips (max 4 shown)
}
```

The composition receives `{ assistantId: string }` as its input prop. It resolves the full assistant object from `LIVE_ASSISTANTS` at render time.

---

## Render Script (`render.mjs`)

```js
// Pseudocode — actual implementation in plan
for (const assistant of LIVE_ASSISTANTS) {
  await renderMedia({
    composition: 'AssistantVideo',
    inputProps: { assistantId: assistant.id },
    outputLocation: `../public/videos/${assistant.id}.mp4`,
    codec: 'h264',
  })
}
```

Runs with `node render.mjs` from `site/remotion/`. No Remotion Studio required. Studio can be launched separately with `npx remotion studio` for preview during development.

---

## Constraints

- No static screen may hold for more than ~2 seconds without visible motion
- Glow pulse (`Math.sin` oscillation) must be present on every frame of Acts 1 and 3
- Progress bar must be present on every frame of Act 2
- Max 4 steps shown in Act 2 (first 4 from `howToUse` if more exist)
- Max 4 quick action chips in Act 3 (first 4 from `quickActions`)
- Font loaded via `@remotion/google-fonts` — no local font file dependency
- Output files written to `site/public/videos/` — existing filenames, in-place replacement of stubs
