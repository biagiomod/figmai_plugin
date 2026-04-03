# DW-A Upgrade Design Spec
**Date:** 2026-04-02
**Priority:** Demo-ready by Monday morning (3 days)

---

## Goal

Upgrade the Design Workshop Assistant (DW-A / `design_workshop`) to deliver a polished, reliable, demo-safe prompt-to-design experience that generates Jazz-design-system-aligned screens on the Figma canvas.

Demo scenario: FiFi FinTech app — mobile onboarding + dashboard screens, Jazz DS, green accent on primary CTAs only.

---

## Architecture

Three independently shippable stages. If time pressure mounts, Stages 1 and 2 ship; Stage 3 is cut.

| Stage | Name | Priority | Cuttable |
|---|---|---|---|
| 1 | Jazz Output Quality | Critical | No |
| 2 | Plugin UX Overhaul | Critical | No |
| 3 | HTML Prototype Export | Optional | Yes |

---

## Stage 1 — Jazz Output Quality

### 1.1 Canonical block vocabulary

The LLM is constrained to the existing renderer's supported block types only:

```
heading | bodyText | button | input | card | spacer | image
```

No new block types are introduced. The system prompt explicitly enumerates the allowed types and forbids any other. If higher-level semantic blocks are ever desired in the future, they must be compiled to canonical blocks in a normalization layer before the renderer receives them. This layer does not exist in v1.

### 1.2 Jazz DS context block

A static Jazz context block is appended to the DW-A system prompt at instruction assembly time. It encodes:

- **Tokens**: `#005EB8` primary blue, `#002F6C` navy, `#101820` body text, `#FFFFFF` surface, `#128842` success/CTA green, `4px` border radius throughout
- **Typography**: Open Sans, weights 400 and 600. Font is referenced by name in the output — the renderer is responsible for applying it.
- **Green rule**: `#128842` appears on primary CTA buttons only. No other element uses green.
- **Spacing**: use `spacer` blocks to create vertical rhythm — do not rely on implicit spacing.
- **Card style**: `border-left: 4px solid #005EB8`, conservative `4px` radius.
- **A short JSON example** of a correctly styled Jazz screen is embedded in the context block for few-shot grounding.

The context block is a TypeScript string constant compiled into the instruction assembly. No runtime fetch.

### 1.3 Validation and failure ladder

A single ordered failure ladder applies to all error types. No overlapping or independent retry paths.

```
Step 1 — JSON.parse()
  failure → one retry (re-prompt with repair instruction)
  second failure → trigger Demo fallback, show toast

Step 2 — Zod .safeParse() against canonical block schema
  failure → one retry
  second failure → trigger Demo fallback, show toast

Step 3 — Renderer execution
  exception → trigger Demo fallback, show toast
  (no retry at render stage)
```

The Zod schemas are added as a pre-render gate alongside the existing validation. This is not a migration — the existing `validateDesignWorkshopOutput` path is preserved. Zod is an additional typed guard that short-circuits the repair spiral on structurally malformed output.

### 1.4 Demo preset

The demo preset is a typed static TypeScript constant:

```typescript
const FIFI_DEMO_PRESET: DesignSpecV1 = { ... }
```

Shaped to the `DesignSpecV1` / `BlockSpec` schema. Validated once with Zod `.parse()` at module load time (throws at startup if the constant is malformed — compile-time safety net).

When Demo mode is active:
- The LLM call is skipped entirely
- The repair path is skipped entirely
- `FIFI_DEMO_PRESET` is passed directly to the renderer
- One Zod `.parse()` confirms validity before rendering (type-safe, no surprises)

The preset contains the full FiFi FinTech demo: welcome screen, onboarding step, and account dashboard — all styled with Jazz tokens and green CTAs.

### 1.5 Observability gating

All debug/repair artifacts (console logs for parse errors, retry indicators, Zod failure details, validation repair attempts) are gated behind `isDemoMode`:

```typescript
if (!isDemoMode) {
  console.debug('[DW-A] Zod validation failed:', result.error)
}
```

In Demo mode: silent pipeline, clean canvas, success toast on completion only.

---

## Stage 2 — Plugin UX Overhaul

### 2.1 Layout: Command Center

The DW-A panel adopts an Option B "Command Center" layout:

- **Header row**: "Design Workshop" title + active design system badge (e.g. "Jazz DS") + settings gear
- **Prompt textarea**: front-and-center, multi-line, focused on entry. Placeholder: _"Describe the screens you want to generate…"_
- **Prompt chips**: quick-insert tags below the textarea — "Mobile", "Onboarding", "Dashboard", "Login", "Settings". Clicking inserts the tag into the prompt.
- **Primary action row**: `Generate Screens` button (Jazz `#005EB8`) + `Demo` toggle button (clearly visible, not hidden in settings)
- **Recent prompts**: collapsible list of the last 3 prompts, one-click to re-run

Post-generation, the layout switches to an action bar:

- `Refine` — re-prompt with the same screens selected
- `Regenerate` — re-run the same prompt from scratch
- `Export HTML` (Stage 3, shown only if Stage 3 ships) — download self-contained HTML
- `New` — clears state, returns to prompt entry

### 2.2 Generation state display

Three states, each with clear UI:

| State | UI |
|---|---|
| **Idle** | Prompt textarea + action row |
| **Generating** | Spinner + status label ("Generating screens…"), prompt disabled, Cancel button |
| **Success** | Brief success toast, then action bar |
| **Fallback fired** | Toast: "Used demo preset — open-ended generation failed" |
| **Error (unrecoverable)** | Error banner with retry option |

### 2.3 Demo mode button

The `Demo` button is a persistent, clearly labelled toggle — not buried in settings. Active state is visually distinct (filled, labeled "Demo ON"). When active, the Generate button label changes to "Run Demo" to reinforce that a preset is being used.

### 2.4 Private mode asset requirements

For private mode, the plugin must not make external network calls for assets. This applies to the plugin UI iframe:

- **Open Sans**: must be bundled as local font assets or embedded as base64 `@font-face` declarations. Not loaded from Google Fonts.
- **Tabler Icons**: if used in the plugin UI, must be bundled locally or replaced with inline SVGs. Not loaded from CDN.

Audit of current asset loading is required in Stage 2 implementation. Any external CDN references are replaced with local equivalents.

---

## Stage 3 — HTML Prototype Export (Cuttable)

**Cut condition**: if Stage 1 or Stage 2 implementation runs over, Stage 3 is dropped. Nothing in Stage 1 or 2 depends on Stage 3.

### 3.1 Scope

After a successful generation (open-ended or demo preset), an "Export HTML" button appears in the post-generation action bar. It triggers a browser-side file download of a single self-contained `.html` file.

### 3.2 Output requirements

- Single `.html` file
- No framework
- No external runtime dependencies (no CDN, no network calls)
- Open Sans embedded as base64 `@font-face` (woff2, weights 400 and 600 only — minimal subset)
- Icons as inline SVG (not Tabler webfont CDN)
- Jazz tokens applied as CSS custom properties in a `<style>` tag
- Visual parity with the Figma canvas output is the goal

### 3.3 Architecture

A new `htmlRenderer.ts` module, separate from the existing Figma renderer. It:

1. Receives the same canonical block JSON that was passed to the Figma renderer
2. Maps each block type to a Jazz-styled HTML element:
   - `heading` → `<h1>`/`<h2>` with Jazz type scale
   - `bodyText` → `<p>` with `#101820` text
   - `button` → `<button>` with Jazz `#005EB8` or `#128842` (CTA) styling per the block's `variant` field
   - `input` → `<input>` with `4px` radius, Jazz border style
   - `card` → `<div>` with `border-left: 4px solid #005EB8`
   - `spacer` → `<div>` with explicit `height`
   - `image` → `<img>` with placeholder if no src
3. Wraps in a full HTML document with all CSS inlined in `<style>`
4. Returns the HTML string — the UI layer triggers the download

The module is a pure function: `renderToHtml(output: DesignSpecV1): string`. No side effects, no Figma API calls.

### 3.4 Plugin download wiring

The "Export HTML" button calls a plugin UI handler that:
1. Calls `renderToHtml(currentOutput: DesignSpecV1)`
2. Creates a `Blob` with `type: 'text/html'`
3. Triggers a download via a temporary `<a>` element with `download="fifi-screens.html"`

This runs entirely in the plugin UI layer. No main thread involvement required.

---

## Mode compatibility

Both public mode and private mode must work.

| Concern | Public mode | Private mode |
|---|---|---|
| LLM API calls | Standard public endpoint | Internal API endpoint |
| Demo preset | Works (no API call) | Works (no API call) |
| Font loading | Can use bundled assets | Must use bundled assets — no Google Fonts |
| Icon loading | Can use bundled assets | Must use bundled assets — no CDN |
| HTML export | Self-contained, no deps | Same — no external deps by design |

---

## Files affected

| File | Change |
|---|---|
| `src/core/assistants/handlers/designWorkshop.ts` | Failure ladder, Zod gate, demo preset integration, observability gating |
| `src/core/designWorkshop/renderer.ts` | Jazz token constants, block style updates |
| `src/core/designWorkshop/jazzContext.ts` | New — Jazz DS context block string constant |
| `src/core/designWorkshop/demoPreset.ts` | New — typed static FIFI_DEMO_PRESET constant |
| `src/core/designWorkshop/validation.ts` | New or extended — Zod schemas for canonical block types |
| `src/core/designWorkshop/htmlRenderer.ts` | New (Stage 3) — canonical block → self-contained HTML |
| `src/ui/components/DesignWorkshopPanel.tsx` | New or refactored — Command Center UX |
| `src/ui.tsx` | Wire new panel component, handle export download |
| Plugin font/icon assets | Audit + replace CDN references with local assets |

---

## Success criteria

- A user can type a prompt and get Jazz-styled screens on the Figma canvas quickly
- The Demo button always produces the FiFi preset reliably with no LLM dependency
- Open-ended generation uses canonical block types and Jazz tokens
- Failures fall through the ladder cleanly with one retry and a fallback — no spiral
- Private mode makes no external network calls for fonts or icons
- Canvas is presentation-clean in Demo mode (no debug artifacts)
- Stage 3: if shipped, exported HTML is self-contained and visually matches the canvas

---

## Risks and tradeoffs

| Risk | Mitigation |
|---|---|
| LLM ignores canonical block constraint | Few-shot example in context block + system prompt instruction |
| Demo preset gets stale | Preset validated with Zod at module load — any drift caught at build time |
| Open Sans embed increases bundle size | woff2 subset for 400+600 only — acceptable increase |
| Stage 3 time overrun | Explicit cut condition defined — Stage 1+2 ship regardless |
| Private mode audit finds many CDN references | Scoped to plugin UI iframe only — bounded work |
