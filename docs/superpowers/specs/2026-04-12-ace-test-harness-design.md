# ACE Test Harness — Design Spec

> **Status:** Brainstorming complete. Ready for implementation planning.

---

## Goal

Extend the ACE Admin Editor's assistant Playground with a structured test harness: a fixture library, a three-mode selection simulator, and a payload inspector that makes the outbound request shape visible before sending. The harness mirrors the plugin's real request contract as closely as practical, allowing developers and admins to validate assistant behavior under realistic Figma context conditions without needing the Figma plugin open.

---

## Background

### Current state

`POST /api/test/assistant` (server.ts:882) accepts `{ provider, endpoint, proxy, assistant, message, kbName }`. It builds a system prompt from `assistant.promptTemplate` + `assistant.instructionBlocks`, concatenates that with `message`, and sends `{ type: 'generalChat', message: fullMessage, kbName }` to the configured provider. There is no Figma context simulation at all — no `selectionSummary`, no `images`.

### Real plugin request contract

The plugin's `requestEnvelope.ts` defines two optional context fields (lines 43–45):

```typescript
selectionSummary?: string    // injected at promptPipeline.ts:126 into segments.ctx
images?: ImageData[]         // injected at promptPipeline.ts:127 into segments.images
```

`buildSelectionContext()` (selectionContext.ts) produces these:
- `selectionSummary` — always present when selection exists
- `images` — only when `quickAction.requiresVision === true` AND provider supports images AND selection is non-empty

The endpoint must mirror this behavior to give meaningful test results.

---

## Architecture

### Three test modes

| Mode | Simulates | selectionSummary | images |
|------|-----------|-----------------|--------|
| `no-selection` | Free-form query with no Figma selection | omitted | omitted |
| `selection` | User selected frames/components | injected from fixture | omitted |
| `vision` | User selected + exported images for vision | injected from fixture | injected as base64 array |

Modes map directly to the three conditions `buildSelectionContext()` produces. They are the UI toggle — not fixture properties. Fixtures can be used across modes as appropriate.

### Fixture library

Fixtures are stored as structured metadata JSON + separate PNG files. Base64 conversion happens at send time only — never stored in source.

**Storage location:**
```
admin-editor/fixtures/
├── forms/
│   ├── checkout-form.json
│   ├── checkout-form-1.png
│   └── checkout-form-2.png
├── navigation/
│   ├── nav-mobile.json
│   └── nav-mobile-1.png
├── cards/
│   ├── pricing-card.json
│   └── pricing-card-1.png
└── general/
    └── empty-canvas.json    ← no images (no-selection fixtures)
```

**Fixture JSON schema:**
```json
{
  "id": "checkout-form",
  "name": "Checkout Form — error states",
  "category": "forms",
  "tags": ["form", "checkout", "validation", "errors"],
  "selectionSummary": "Frame: Checkout Screen (1440×900)\n\nLayers:\n- Heading: 'Complete your purchase'\n- Input: Email (filled, valid)\n- Input: Card Number (filled, invalid — red border)\n- Input: CVV (empty)\n- Button: 'Pay Now' (primary, disabled)\n- Text: 'Card number is invalid' (error, visible)\n\nInteraction state: form submission attempted, validation errors shown.",
  "images": ["checkout-form-1.png", "checkout-form-2.png"],
  "supportsVision": true,
  "requiresSelection": true,
  "useCases": ["review-copy", "check-errors", "accessibility-review"],
  "notes": "Good fixture for testing error copy and form validation feedback."
}
```

**Fixture metadata fields:**

| Field | Type | Purpose |
|-------|------|---------|
| `id` | string | Stable identifier |
| `name` | string | Display name in picker |
| `category` | string | Maps to subfolder; used for grouping in picker |
| `tags` | string[] | Searchable; shown as chips |
| `selectionSummary` | string | Injected into request when mode is `selection` or `vision` |
| `images` | string[] | Filenames relative to fixture category dir; loaded and base64-encoded at send time |
| `supportsVision` | boolean | If false, fixture is hidden when mode is `vision` |
| `requiresSelection` | boolean | If false, fixture is compatible with `no-selection` mode (e.g. empty canvas prompts) |
| `useCases` | string[] | Documents which quick actions this fixture is useful for; not used programmatically |
| `notes` | string | Optional admin notes |

### Endpoint extension

The existing `POST /api/test/assistant` endpoint is extended in-place. No new endpoint is added.

**New request fields:**
```typescript
{
  // existing
  provider: string
  endpoint: string
  proxy: ProxyConfig
  assistant: AssistantDraft
  message: string
  kbName: string

  // new
  testMode: 'no-selection' | 'selection' | 'vision'  // default: 'no-selection'
  selectionSummary?: string    // provided by client from fixture (mode: selection, vision)
  images?: string[]            // base64 data URLs, provided by client (mode: vision only)
}
```

**Server behavior per mode:**

`selectionSummary` is kept as a distinct semantic field in the server's internal representation for as long as possible. It is forwarded as a named field in the provider payload — parallel to `message`, not pre-concatenated into it. The concatenation into a single text string is a provider-level concern (handled by the Internal API / proxy provider as it does today), not a harness concern.

`no-selection`: No context fields added. Sends as today — `{ type: 'generalChat', message: fullMessage, kbName }`.

`selection`:
```typescript
const payload = {
  type: 'generalChat',
  message: fullMessage,        // system prompt + user message (no selectionSummary here)
  kbName: resolvedKbName,
  selectionSummary: req.body.selectionSummary   // distinct field, not concatenated
}
```

`vision`: Same as `selection` plus `images`:
```typescript
const payload = {
  type: 'generalChat',
  message: fullMessage,
  kbName: resolvedKbName,
  selectionSummary: req.body.selectionSummary,
  images: req.body.images   // array of base64 data URLs
}
```

The provider (Internal API / proxy) is responsible for deciding how to incorporate `selectionSummary` into the final LLM message, mirroring what `promptPipeline.ts` does in production.

The server validates that `images` is an array of strings when mode is `vision` and rejects malformed entries.

---

## UX Design

### Placement

The test harness lives inside the existing Playground section of each assistant's editor panel. It replaces/augments the current single-message text box. No separate "Test" tab — it stays inline with the assistant being edited.

### Layout

```
┌─ Playground ─────────────────────────────────────────────────────┐
│  Mode: [● No selection]  [○ Selection]  [○ Vision]               │
│                                                                    │
│  Fixture:  [Checkout Form — error states ▾]  [← category: forms] │
│            tags: form · checkout · validation                      │
│                                                                    │
│  ┌─ Selection Summary ──────────────────────────────────────────┐ │
│  │ Frame: Checkout Screen (1440×900)                            │ │
│  │ Layers:                                                      │ │
│  │ - Heading: 'Complete your purchase'                          │ │
│  │ ...                                 [Edit ✎]  [Reset]        │ │
│  └──────────────────────────────────────────────────────────────┘ │
│                                                                    │
│  Message: [_____________________________________________]          │
│                                                                    │
│  ▸ Payload Inspector (what will be sent)                          │
│                                                                    │
│  [Run Test]                                                        │
└────────────────────────────────────────────────────────────────────┘
```

**Mode selector:** Three-segment toggle. Switching mode updates the fixture list (hides incompatible fixtures) and shows/hides the Selection Summary + Images sections.

**Fixture picker:** Grouped dropdown by category. Shows fixture name + category label. Selecting a fixture:
1. Populates Selection Summary textarea with `fixture.selectionSummary`
2. Shows image filenames (not previews) if `fixture.images.length > 0`
3. Updates Payload Inspector preview

**Selection Summary textarea:** Pre-filled from fixture, editable. The edited value — not the fixture's original — is what gets sent. A "Reset" button restores the fixture's original value.

**Images panel (vision mode only):**
- Shows the list of image filenames from the fixture: `checkout-form-1.png`, `checkout-form-2.png`
- Does NOT show inline image previews (too heavy for the panel)
- Shows image count and approximate byte total after base64 encoding, e.g. `2 images · ~84 KB encoded`
- Base64 encoding happens at send time, not on fixture load

**Payload Inspector (collapsible, expanded by default):**
Shows the exact JSON that will be POSTed before the user sends. Updates live as fields change. Clearly labeled sections:

```json
{
  "type": "generalChat",
  "kbName": "figma",
  "message": "[system prompt]\n\n[user message]",
  "selectionSummary": "Frame: Checkout Screen (1440×900)\n\nLayers:\n...",
  "images": ["data:image/png;base64,...truncated...", "..."]
}
```

This makes the semantic structure visible: `message` is the user's instruction; `selectionSummary` is the Figma context; `images` is the visual payload. The inspector shows each as a separate field, never merged.

- Long `message` values are truncated in the inspector with a "Show full" expander
- `images` values show only the first 80 chars of each data URL + `...truncated (84 KB)`
- The inspector is read-only

**Run Test button:** Sends the request. Disabled while a request is in-flight. Response appears below in the existing response area.

### Fixture picker behavior across modes

| Fixture property | No-selection | Selection | Vision |
|-----------------|-------------|-----------|--------|
| `requiresSelection: false` | shown | shown | hidden |
| `requiresSelection: true` | hidden | shown | shown |
| `supportsVision: false` | shown | shown | hidden |
| `supportsVision: true` | shown | shown | shown |

When switching to `vision`, if the currently-selected fixture has `supportsVision: false`, the picker resets to the first compatible fixture (or shows "no compatible fixtures").

### Fixture count

Ship with 5–8 curated fixtures covering:
- `general/empty-canvas.json` — no-selection baseline
- `forms/checkout-form.json` — form with errors (vision-capable)
- `navigation/nav-mobile.json` — mobile nav (vision-capable)
- `cards/pricing-card.json` — pricing component (vision-capable)
- `modals/delete-confirm.json` — destructive action modal (selection only)
- `data-viz/dashboard-chart.json` — complex layout (vision-capable)

---

## Implementation Scope

### Server changes (admin-editor/server.ts)

1. Accept `testMode`, `selectionSummary`, `images` in `POST /api/test/assistant` request body
2. Validate `testMode` (default `'no-selection'` if absent for backward compat)
3. When `testMode === 'selection'` or `'vision'`: forward `selectionSummary` as a distinct named field in the provider payload alongside `message` — do not concatenate it into `message`
4. When `testMode === 'vision'`: include `images` array in provider payload
5. Validate `images` is array of strings; reject malformed entries
6. Apply to both `internal-api` and `proxy` provider paths

### Fixture loader (admin-editor/fixtures.ts — new file)

1. `loadFixtureCatalog(fixturesDir): FixtureMeta[]` — reads all `*.json` files recursively; returns metadata without images
2. `loadFixtureImages(fixturesDir, fixture): Promise<string[]>` — reads PNG files, returns base64 data URLs

### API endpoint for fixture catalog

`GET /api/fixtures` — returns the full fixture catalog (metadata only, no images):
```json
[
  {
    "id": "checkout-form",
    "name": "Checkout Form — error states",
    "category": "forms",
    "tags": ["form", "checkout"],
    "supportsVision": true,
    "requiresSelection": true,
    "images": ["checkout-form-1.png", "checkout-form-2.png"],
    "selectionSummary": "Frame: Checkout Screen..."
  }
]
```

`GET /api/fixtures/:id/images` — returns base64-encoded images for a specific fixture:
```json
{ "images": ["data:image/png;base64,...", "..."] }
```

Images are loaded from disk only when the user clicks "Run Test" (not on fixture select). The `/images` endpoint is called at that point.

### UI changes (admin-editor/public/app.js)

1. Add mode selector UI to Playground section
2. Add fixture picker (grouped dropdown, category label, tags)
3. Add Selection Summary textarea (shown in `selection`/`vision` modes)
4. Add Images summary row (shown in `vision` mode only)
5. Add Payload Inspector (collapsible, live-updating JSON preview)
6. On fixture select: populate `selectionSummary` textarea; update image list; update inspector
7. On mode switch: filter fixture list; clear incompatible fixture selection
8. On "Run Test": if vision mode, call `/api/fixtures/:id/images` first, then call `/api/test/assistant` with full payload
9. Keep backward compat: if no `testMode` sent (old callers), server defaults to `'no-selection'`

---

## What Is Out of Scope

- Image preview thumbnails in the fixture picker
- Fixture authoring UI inside ACE (fixtures are authored as files, not in-browser)
- Fixture versioning or sync
- Multi-turn conversation testing
- Streaming response support
- Comparing responses across assistants side-by-side

These are reasonable follow-ons but not needed for the initial harness to be useful.

---

## Plugin-Parity Principle

The harness must mirror the real plugin's request contract, not approximate it. Specifically:

| Plugin behavior | Harness behavior |
|----------------|-----------------|
| `selectionSummary` is a distinct field in the request envelope (requestEnvelope.ts:43) | Server forwards `selectionSummary` as a distinct named field in the provider payload — not pre-concatenated into `message` |
| Provider/pipeline handles selectionSummary injection into LLM message (promptPipeline.ts:126) | Provider receives `selectionSummary` as a separate field and handles injection the same way |
| `images` forwarded as `ImageData[]` in request envelope (requestEnvelope.ts:45) | Server forwards `images` as base64 data URL array in provider payload |
| `images` only when `requiresVision && provider.supportsImages` | Harness only sends images in `vision` mode — user-controlled gate |
| `selectionSummary` always present when selection exists | Fixture's `selectionSummary` always non-empty when `requiresSelection: true` |

The harness does not replicate the full budget/trimming logic in `promptPipeline.ts` (lines 236–259). That is server-side concern. The harness sends the raw values; the endpoint and provider handle trimming as they do in production.

---

## Open Questions (resolved)

- **Separate endpoint vs. extending existing?** — Extend existing. Single test path is simpler and maintains the same auth/provider resolution logic.
- **Inline base64 in fixture JSON?** — No. Separate PNG files, base64 at send time. Keeps fixtures readable and diffable.
- **Fixture authoring UI?** — File-based only for v1. Authoring in-browser is a follow-on.
- **Image previews in picker?** — Out of scope for v1.
