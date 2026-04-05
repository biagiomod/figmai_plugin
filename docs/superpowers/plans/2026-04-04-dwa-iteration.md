# DW-A Iteration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the DW-A fidelity gap, add a scan→refine loop, restore the bottom toolbar, and make Jazz/Wireframe a real mode distinction.

**Architecture:** Pure testable helpers are extracted to `designWorkshop.helpers.ts`. All mode-driving state lives in `designWorkshopScanStore.ts` (already exists). The renderer gains a `useWireframe` flag that changes visual treatment without altering block semantics. A new `BottomToolbar` component is rendered unconditionally in `ui.tsx` after the DW panel branch.

**Tech Stack:** TypeScript, Figma Plugin API, Preact (for UI), `@create-figma-plugin/utilities` (`on`, `emit`), `node:assert` tests run with `npx tsx`.

**Note on scan store:** `src/core/designWorkshop/designWorkshopScanStore.ts` already exists with `ScannedDesignContext`, `setScanContext`, `getScanContext`, `setDwDesignMode`, `getDwDesignMode`. No task needed.

---

## File Structure

**New files:**
- `src/core/designWorkshop/designWorkshop.helpers.ts` — Pure testable functions: `ARCHETYPE_RECIPES`, `detectArchetypeRecipe()`, `applyFintechFallback()`
- `src/core/designWorkshop/designWorkshop.helpers.test.ts` — Tests for helpers
- `src/ui/components/BottomToolbar.tsx` — Shared bottom controls (selection indicator + assistant switcher + conditional send)

**Modified files:**
- `src/core/designWorkshop/jazzContext.ts` — Update JAZZ_CONTEXT_BLOCK dashboard archetype; add `WIREFRAME_CONTEXT_BLOCK`
- `src/core/assistants/handlers/designWorkshop.ts` — Schema template (12 blocks), repair prompt, wireframe context, archetype recipes, scan context injection, mode reads, fidelity enforcement, fintech fallback
- `src/core/designWorkshop/renderer.ts` — `useWireframe` option, plugin data markers, wireframe visual paths, archetype tab bar, `useChrome` condition update
- `src/core/types.ts` — Add `DwScanScreensHandler`, `DwClearScanHandler`, `DwSetDesignModeHandler`
- `src/main.ts` — Handle `DW_SCAN_SCREENS`, `DW_CLEAR_SCAN`, `DW_SET_DESIGN_MODE`
- `src/ui/components/DesignWorkshopPanel.tsx` — Mode toggle, scan button, Option A state machine, scan summary chip, distinct clear actions
- `src/ui.tsx` — BottomToolbar integration, DW panel new props, `dwDesignMode` state, `dwHasScanContext` state, `DW_SCAN_RESULT` handler, `DW_SET_DESIGN_MODE` emit
- `src/core/designWorkshop/htmlRenderer.ts` — Document wireframe parity deferral

---

### Task 1: Context Blocks (jazzContext.ts)

**Files:**
- Modify: `src/core/designWorkshop/jazzContext.ts`
- Test: `src/core/designWorkshop/jazzContext.test.ts` (new)

- [ ] **Step 1: Write the failing test**

```ts
// src/core/designWorkshop/jazzContext.test.ts
/**
 * Jazz/Wireframe context blocks — exported and correct.
 * Run: npx tsx src/core/designWorkshop/jazzContext.test.ts
 */
import assert from 'node:assert'
import { JAZZ_CONTEXT_BLOCK, WIREFRAME_CONTEXT_BLOCK } from './jazzContext'

function test_WIREFRAME_CONTEXT_BLOCK_is_exported() {
  assert.ok(typeof WIREFRAME_CONTEXT_BLOCK === 'string', 'WIREFRAME_CONTEXT_BLOCK must be a string')
  assert.ok(WIREFRAME_CONTEXT_BLOCK.length > 0, 'WIREFRAME_CONTEXT_BLOCK must not be empty')
}

function test_WIREFRAME_CONTEXT_BLOCK_no_Jazz_colors() {
  assert.ok(!WIREFRAME_CONTEXT_BLOCK.includes('#005EB8'), 'Wireframe block must not reference Jazz primary blue')
  assert.ok(!WIREFRAME_CONTEXT_BLOCK.includes('#128842'), 'Wireframe block must not reference Jazz CTA green')
}

function test_WIREFRAME_CONTEXT_BLOCK_key_constraints() {
  assert.ok(WIREFRAME_CONTEXT_BLOCK.includes('8px'), 'Wireframe block must specify 8px corner radius')
  assert.ok(WIREFRAME_CONTEXT_BLOCK.includes('wireframe'), 'Wireframe block must specify wireframe fidelity')
  assert.ok(WIREFRAME_CONTEXT_BLOCK.includes('semantic'), 'Wireframe block must mention semantic content preservation')
}

function test_JAZZ_CONTEXT_BLOCK_includes_rich_block_types() {
  assert.ok(JAZZ_CONTEXT_BLOCK.includes('metricsGrid'), 'JAZZ_CONTEXT_BLOCK must show metricsGrid example')
  assert.ok(JAZZ_CONTEXT_BLOCK.includes('watchlist'), 'JAZZ_CONTEXT_BLOCK must show watchlist example')
  assert.ok(JAZZ_CONTEXT_BLOCK.includes('allocation'), 'JAZZ_CONTEXT_BLOCK must show allocation example')
}

;[
  test_WIREFRAME_CONTEXT_BLOCK_is_exported,
  test_WIREFRAME_CONTEXT_BLOCK_no_Jazz_colors,
  test_WIREFRAME_CONTEXT_BLOCK_key_constraints,
  test_JAZZ_CONTEXT_BLOCK_includes_rich_block_types,
].forEach(t => { t(); console.log(`✓ ${t.name}`) })
console.log('All jazzContext tests passed.')
```

- [ ] **Step 2: Run test to verify it fails**

```
npx tsx src/core/designWorkshop/jazzContext.test.ts
```

Expected: FAIL — `WIREFRAME_CONTEXT_BLOCK is not exported` or assertions fail.

- [ ] **Step 3: Update `JAZZ_CONTEXT_BLOCK` and add `WIREFRAME_CONTEXT_BLOCK`**

In `src/core/designWorkshop/jazzContext.ts`, replace the `SCREEN ARCHETYPES` section from `DASHBOARD / OVERVIEW:` through the end of that section with:

```ts
SCREEN ARCHETYPES:

DASHBOARD / OVERVIEW — use rich data blocks:
- Lead directly with a metricsGrid (4 cells: portfolio/account value, gain/loss, day change, YTD).
  Example: { "type": "metricsGrid", "items": [{"label":"Portfolio","value":"$91,917"},{"label":"Today","value":"−$412","gain":false},{"label":"YTD","value":"+12.3%","gain":true},{"label":"Invested","value":"$81,500"}] }
- Follow with a chart block:
  Example: { "type": "chart", "height": 150, "caption": "Portfolio Performance" }
- Add 2–3 position cards or a heading + watchlist:
  Example: { "type": "watchlist", "title": "Watchlist", "items": [{"ticker":"AAPL","price":"$182.50","change":"+1.2%","gain":true},{"ticker":"TSLA","price":"$248.00","change":"−0.8%","gain":false}] }
- Close with an allocation block:
  Example: { "type": "allocation", "equity": 65.0, "fixedIncome": 25.0, "altAssets": 10.0, "total": "$91,917" }
- DO NOT lead with a heading. DO NOT use card stacks for metric data.

POSITIONS / LIST SCREENS:
- Start with a summary card (total count or total value).
- Compact list: gap 8, each card uses title for the primary identifier and content for one-line details.
- Detail line format: "X units · $X.XX · +X.X%" or "X units · $X.XX · −X.X%"
- Positive delta in content: prefix with "+" — renderer will color gain (#128842).
- Negative delta in content: prefix with "−" — renderer will color loss (#DA0B16).

FORM / AUTH SCREENS:
- h2 or h3 for the form title.
- Inputs stacked with gap 12.
- Primary CTA button below inputs with spacer before it.
- Secondary action (link-style) as a tertiary button below primary.

ONBOARDING / SPLASH SCREENS:
- Only screens where h1 is appropriate.
- Large spacer at top, h1, bodyText subtitle, spacer, primary CTA, secondary button.
```

Then add the `WIREFRAME_CONTEXT_BLOCK` export after the closing backtick of `JAZZ_CONTEXT_BLOCK`:

```ts
/** System prompt context block for Wireframe mode — shorter, structurally focused. */
export const WIREFRAME_CONTEXT_BLOCK = `
=== WIREFRAME MODE — STRUCTURAL DESIGN ===
You are generating wireframe screens. Apply these rules strictly:

VISUAL TREATMENT:
- No color tokens. Neutral palette only: grays, whites, near-blacks.
- Corner radius: 8px everywhere.
- No mobile chrome (no status bar, nav bar, tab bar).
- Fidelity: "wireframe". Density: "comfortable".
- Button (primary): no color fill — use light gray.
- Card fill: light gray (#F5F5F5). Strokes: medium gray.

SEMANTIC CONTENT:
- Preserve realistic content. Do NOT replace values with generic placeholder text.
- Use real-looking labels, values, and screen names matching the app archetype.
- "Portfolio Value", "$91,917.48", "Today's Gain −$412" is correct wireframe content.
- "Label", "Value", "Text Here" is NOT acceptable.

BLOCK SELECTION:
- Use the same block types as Jazz mode — metricsGrid, watchlist, allocation, chart.
- For data-heavy screens (fintech, dashboard), still use metricsGrid + chart + watchlist + allocation.
- Archetype recipes still apply (see below). Simplified where noted.
- Color field in intent: if user requested a specific color, apply it as one intentional accent on buttons/active states only.

BLOCK VOCABULARY — only these types:
heading | bodyText | button | input | card | spacer | image | chart | metricsGrid | allocation | watchlist

Every screen MUST have at least 3 blocks. Never output an empty blocks array.
`
```

- [ ] **Step 4: Run test to verify it passes**

```
npx tsx src/core/designWorkshop/jazzContext.test.ts
```

Expected: All 4 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/core/designWorkshop/jazzContext.ts src/core/designWorkshop/jazzContext.test.ts
git commit -m "feat: update JAZZ_CONTEXT_BLOCK dashboard archetype + add WIREFRAME_CONTEXT_BLOCK"
```

---

### Task 2: Pure Helpers (designWorkshop.helpers.ts)

**Files:**
- Create: `src/core/designWorkshop/designWorkshop.helpers.ts`
- Create: `src/core/designWorkshop/designWorkshop.helpers.test.ts`

- [ ] **Step 1: Write the failing tests**

```ts
// src/core/designWorkshop/designWorkshop.helpers.test.ts
/**
 * DW-A pure helpers — archetype recipes and fintech fallback.
 * Run: npx tsx src/core/designWorkshop/designWorkshop.helpers.test.ts
 */
import assert from 'node:assert'
import { detectArchetypeRecipe, applyFintechFallback } from './designWorkshop.helpers'
import type { DesignSpecV1 } from './types'

// ── detectArchetypeRecipe ────────────────────────────────────────────────────

function test_detects_fintech_by_intent_appType() {
  const recipe = detectArchetypeRecipe({ appType: 'fintech' }, 'build some screens')
  assert.ok(recipe !== null, 'should detect fintech from intent.appType')
  assert.ok(recipe!.includes('metricsGrid'), 'fintech recipe must mention metricsGrid')
}

function test_detects_fintech_by_request_keyword() {
  const recipe = detectArchetypeRecipe({}, 'create a portfolio trading app')
  assert.ok(recipe !== null, 'should detect fintech from "portfolio" keyword')
}

function test_detects_onboarding_by_request() {
  const recipe = detectArchetypeRecipe({}, 'design a welcome splash screen')
  assert.ok(recipe !== null, 'should detect onboarding from "welcome splash" keywords')
  assert.ok(recipe!.includes('h1'), 'onboarding recipe must mention h1')
}

function test_detects_auth_by_request() {
  const recipe = detectArchetypeRecipe({}, 'login and signup screens')
  assert.ok(recipe !== null, 'should detect auth from "login signup" keywords')
  assert.ok(recipe!.includes('input'), 'auth recipe must mention input')
}

function test_detects_settings_by_request() {
  const recipe = detectArchetypeRecipe({}, 'user profile and account settings')
  assert.ok(recipe !== null, 'should detect settings from "profile account settings" keywords')
}

function test_returns_null_for_unknown_archetype() {
  const recipe = detectArchetypeRecipe({}, 'build something cool')
  assert.strictEqual(recipe, null, 'should return null for unrecognized prompt')
}

function test_returns_null_for_empty_intent_and_empty_request() {
  const recipe = detectArchetypeRecipe({}, '')
  assert.strictEqual(recipe, null, 'should return null for empty inputs')
}

// ── applyFintechFallback ─────────────────────────────────────────────────────

function makeFinTechSpec(screenName: string, blocks: DesignSpecV1['screens'][0]['blocks']): DesignSpecV1 {
  return {
    type: 'designScreens',
    version: 1,
    meta: { title: 'Test', intent: { appType: 'fintech' } },
    canvas: { device: { kind: 'mobile', width: 375, height: 812 } },
    render: { intent: { fidelity: 'hi' } },
    screens: [{ name: screenName, blocks }]
  }
}

function test_does_not_apply_in_wireframe_mode() {
  const spec = makeFinTechSpec('Dashboard', [
    { type: 'card', title: 'A', content: '1' },
    { type: 'card', title: 'B', content: '2' },
    { type: 'card', title: 'C', content: '3' },
    { type: 'card', title: 'D', content: '4' },
  ])
  const result = applyFintechFallback(spec, 'wireframe')
  assert.deepStrictEqual(result.screens[0].blocks, spec.screens[0].blocks,
    'wireframe mode must not trigger fintech fallback')
}

function test_does_not_apply_when_rich_blocks_present() {
  const spec = makeFinTechSpec('Dashboard', [
    { type: 'metricsGrid', items: [{ label: 'A', value: '1' }] },
    { type: 'card', title: 'B', content: '2' },
    { type: 'card', title: 'C', content: '3' },
    { type: 'card', title: 'D', content: '4' },
    { type: 'card', title: 'E', content: '5' },
  ])
  const result = applyFintechFallback(spec, 'jazz')
  // metricsGrid already present → should not modify
  const richBlocks = result.screens[0].blocks.filter(b => b.type === 'metricsGrid')
  assert.strictEqual(richBlocks.length, 1, 'should not add second metricsGrid when one already exists')
  assert.strictEqual(result.screens[0].blocks.length, 5, 'block count unchanged when rich blocks present')
}

function test_does_not_apply_when_fewer_than_4_consecutive_cards() {
  const spec = makeFinTechSpec('Overview', [
    { type: 'card', title: 'A', content: '1' },
    { type: 'card', title: 'B', content: '2' },
    { type: 'card', title: 'C', content: '3' },
  ])
  const result = applyFintechFallback(spec, 'jazz')
  assert.strictEqual(result.screens[0].blocks.length, 3, 'should not modify when fewer than 4 cards')
}

function test_does_not_apply_to_non_dashboard_screen_name() {
  const spec = makeFinTechSpec('Settings', [
    { type: 'card', title: 'A', content: '1' },
    { type: 'card', title: 'B', content: '2' },
    { type: 'card', title: 'C', content: '3' },
    { type: 'card', title: 'D', content: '4' },
  ])
  const result = applyFintechFallback(spec, 'jazz')
  assert.strictEqual(result.screens[0].blocks.length, 4, 'should not apply to non-dashboard screen name')
}

function test_collapses_4_cards_to_metricsGrid_for_dashboard_screen() {
  const spec = makeFinTechSpec('Dashboard', [
    { type: 'card', title: 'Portfolio', content: '$91,917' },
    { type: 'card', title: "Today's Gain", content: '−$412' },
    { type: 'card', title: 'YTD Return', content: '+12.3%' },
    { type: 'card', title: 'Invested', content: '$81,500' },
  ])
  const result = applyFintechFallback(spec, 'jazz')
  assert.ok(result !== spec, 'should return a new spec object, not mutate in place')
  assert.strictEqual(result.screens[0].blocks[0].type, 'metricsGrid',
    'first block should be metricsGrid after collapse')
  assert.strictEqual(result.screens[0].blocks.length, 1,
    'four cards collapsed to single metricsGrid')
  const mg = result.screens[0].blocks[0] as Extract<DesignSpecV1['screens'][0]['blocks'][0], { type: 'metricsGrid' }>
  assert.strictEqual(mg.items.length, 4, 'metricsGrid should have 4 items')
  assert.strictEqual(mg.items[0].label, 'Portfolio', 'first item label comes from card title')
  assert.strictEqual(mg.items[0].value, '$91,917', 'first item value comes from card content')
}

function test_preserves_non_card_blocks_after_collapse() {
  const spec = makeFinTechSpec('Portfolio Overview', [
    { type: 'card', title: 'Portfolio', content: '$91,917' },
    { type: 'card', title: "Today's Gain", content: '−$412' },
    { type: 'card', title: 'YTD Return', content: '+12.3%' },
    { type: 'card', title: 'Invested', content: '$81,500' },
    { type: 'button', text: 'View All', variant: 'primary' },
  ])
  const result = applyFintechFallback(spec, 'jazz')
  assert.strictEqual(result.screens[0].blocks.length, 2,
    'metricsGrid + button = 2 blocks')
  assert.strictEqual(result.screens[0].blocks[0].type, 'metricsGrid')
  assert.strictEqual(result.screens[0].blocks[1].type, 'button')
}

function test_does_not_apply_when_appType_not_fintech_or_banking() {
  const spec: DesignSpecV1 = {
    type: 'designScreens', version: 1,
    meta: { title: 'Test', intent: { appType: 'fitness' } },
    canvas: { device: { kind: 'mobile', width: 375, height: 812 } },
    render: { intent: { fidelity: 'hi' } },
    screens: [{ name: 'Dashboard', blocks: [
      { type: 'card', title: 'A', content: '1' },
      { type: 'card', title: 'B', content: '2' },
      { type: 'card', title: 'C', content: '3' },
      { type: 'card', title: 'D', content: '4' },
    ]}]
  }
  const result = applyFintechFallback(spec, 'jazz')
  assert.strictEqual(result.screens[0].blocks.length, 4, 'should not apply for non-fintech appType')
}

;[
  test_detects_fintech_by_intent_appType,
  test_detects_fintech_by_request_keyword,
  test_detects_onboarding_by_request,
  test_detects_auth_by_request,
  test_detects_settings_by_request,
  test_returns_null_for_unknown_archetype,
  test_returns_null_for_empty_intent_and_empty_request,
  test_does_not_apply_in_wireframe_mode,
  test_does_not_apply_when_rich_blocks_present,
  test_does_not_apply_when_fewer_than_4_consecutive_cards,
  test_does_not_apply_to_non_dashboard_screen_name,
  test_collapses_4_cards_to_metricsGrid_for_dashboard_screen,
  test_preserves_non_card_blocks_after_collapse,
  test_does_not_apply_when_appType_not_fintech_or_banking,
].forEach(t => { t(); console.log(`✓ ${t.name}`) })
console.log('All designWorkshop.helpers tests passed.')
```

- [ ] **Step 2: Run test to verify it fails**

```
npx tsx src/core/designWorkshop/designWorkshop.helpers.test.ts
```

Expected: FAIL — module not found.

- [ ] **Step 3: Write the helpers implementation**

Create `src/core/designWorkshop/designWorkshop.helpers.ts`:

```ts
/**
 * Design Workshop Assistant — Pure Helpers
 *
 * Testable pure functions extracted from the handler.
 * No Figma API, no imports with side-effects.
 */
import type { DesignIntent, DesignSpecV1 } from './types'

// ── Archetype Recipes ────────────────────────────────────────────────────────

const ARCHETYPE_RECIPES: Record<string, { keywords: string[]; recipe: string }> = {
  fintech: {
    keywords: ['fintech', 'banking', 'portfolio', 'trading', 'investment', 'brokerage', 'wealth'],
    recipe: `ARCHETYPE RECIPE — FINTECH / DASHBOARD:
Structure: metricsGrid (4 items: portfolio value, gain/loss, day change, YTD) → chart (performance, height 150) → heading (h3, positions label) → card ×2-3 (top positions: title=ticker, content="N shares · $X.XX · +X.X%") → allocation (equity/fixedIncome/altAssets) → watchlist (3-4 tickers) → spacer → button (primary CTA)
Jazz-specific: use real ticker names (AAPL, TSLA, MSFT, NVDA). Include gain/loss fields on metricsGrid items.`
  },
  onboarding: {
    keywords: ['onboarding', 'welcome', 'splash', 'intro', 'get started', 'tutorial'],
    recipe: `ARCHETYPE RECIPE — ONBOARDING / SPLASH:
Structure: spacer (height 48) → heading (h1, app name or value prop) → bodyText (one-line benefit subtitle) → spacer (height 32) → button (primary, "Get Started") → button (tertiary, "Sign In")
Wireframe: same structure, no colors.`
  },
  auth: {
    keywords: ['login', 'sign in', 'signin', 'auth', 'register', 'signup', 'sign up', 'password', 'forgot password'],
    recipe: `ARCHETYPE RECIPE — LOGIN / AUTH:
Structure: heading (h2, form title) → input (email or username) → input (password, inputType="password") → spacer → button (primary, action label) → button (tertiary, secondary action)
For register: add name/confirm-password inputs.`
  },
  settings: {
    keywords: ['settings', 'profile', 'account', 'preferences', 'manage', 'personal info', 'notifications'],
    recipe: `ARCHETYPE RECIPE — SETTINGS / PROFILE:
Structure: heading (h3, first section label) → card ×2-4 (setting rows: title=setting name, content=current value or description) → heading (h3, next section) → card ×2-3 → spacer → button (primary, "Save Changes")
Compact: padding 16, gap 8.`
  }
}

/**
 * Detect whether a recognized archetype recipe applies to this request.
 * Checks intent.appType first, then scans the request string for archetype keywords.
 * Returns the recipe string, or null if no archetype is detected.
 */
export function detectArchetypeRecipe(
  intent: DesignIntent,
  request: string
): string | null {
  const lower = request.toLowerCase()

  // Check intent.appType against fintech keywords first (most targeted signal)
  if (intent.appType) {
    const appLower = intent.appType.toLowerCase()
    for (const [, { keywords, recipe }] of Object.entries(ARCHETYPE_RECIPES)) {
      if (keywords.includes(appLower)) return recipe
    }
  }

  // Fall back to keyword scan on request text
  for (const [, { keywords, recipe }] of Object.entries(ARCHETYPE_RECIPES)) {
    if (keywords.some(kw => lower.includes(kw))) return recipe
  }

  return null
}

/**
 * Dashboard screen name keywords that trigger the fintech fallback.
 * Lowercase exact-substring match against screen name.
 */
const DASHBOARD_NAME_KEYWORDS = ['dashboard', 'overview', 'portfolio', 'home', 'summary']

/**
 * Rich block types that indicate the LLM already used data blocks.
 * If any of these are present in a screen, the fallback does not apply.
 */
const RICH_BLOCK_TYPES = new Set(['metricsGrid', 'chart', 'watchlist', 'allocation'])

/**
 * Fintech fallback — narrow, deterministic upgrade.
 *
 * Trigger conditions (ALL must be true):
 *   1. designMode === 'jazz'
 *   2. intent.appType is 'fintech' or 'banking'
 *   3. Screen name contains a dashboard keyword
 *   4. No rich blocks (metricsGrid, chart, watchlist, allocation) in the screen
 *   5. 4+ consecutive card blocks exist in the screen
 *
 * Upgrade: collapse the first run of 4+ consecutive cards into a single metricsGrid.
 * Returns a new DesignSpecV1 (does not mutate the input).
 */
export function applyFintechFallback(
  spec: DesignSpecV1,
  designMode: 'jazz' | 'wireframe'
): DesignSpecV1 {
  if (designMode !== 'jazz') return spec

  const appType = spec.meta?.intent?.appType?.toLowerCase()
  if (appType !== 'fintech' && appType !== 'banking') return spec

  const newScreens = spec.screens.map(screen => {
    const nameLower = screen.name.toLowerCase()
    if (!DASHBOARD_NAME_KEYWORDS.some(kw => nameLower.includes(kw))) return screen

    const hasRichBlock = screen.blocks.some(b => RICH_BLOCK_TYPES.has(b.type))
    if (hasRichBlock) return screen

    // Find first run of 4+ consecutive card blocks
    let runStart = -1
    let runLen = 0
    for (let i = 0; i < screen.blocks.length; i++) {
      if (screen.blocks[i].type === 'card') {
        if (runStart === -1) runStart = i
        runLen++
      } else {
        if (runLen >= 4) break
        runStart = -1
        runLen = 0
      }
    }
    if (runLen < 4 || runStart === -1) return screen

    // Collapse the run into a metricsGrid
    const cardRun = screen.blocks.slice(runStart, runStart + runLen) as Array<{ type: 'card'; title?: string; content: string }>
    const metricsItems = cardRun.map(c => ({
      label: c.title ?? '',
      value: c.content
    }))

    const newBlocks = [
      ...screen.blocks.slice(0, runStart),
      { type: 'metricsGrid' as const, items: metricsItems },
      ...screen.blocks.slice(runStart + runLen)
    ]

    return { ...screen, blocks: newBlocks }
  })

  return { ...spec, screens: newScreens }
}
```

- [ ] **Step 4: Run test to verify it passes**

```
npx tsx src/core/designWorkshop/designWorkshop.helpers.test.ts
```

Expected: All 14 tests pass.

- [ ] **Step 5: Commit**

```bash
git add src/core/designWorkshop/designWorkshop.helpers.ts src/core/designWorkshop/designWorkshop.helpers.test.ts
git commit -m "feat: add DW-A archetype recipes and fintech fallback pure helpers"
```

---

### Task 3: Handler Wiring (designWorkshop.ts)

**Files:**
- Modify: `src/core/assistants/handlers/designWorkshop.ts`

Changes: schema template (12 blocks), repair prompt (12 blocks), wireframe context block, archetype recipe injection, scan context injection, mode reads, fidelity enforcement, fintech fallback, `useWireframe` in render call, `setScanContext(null)` on success.

- [ ] **Step 1: Add imports at the top of `designWorkshop.ts`**

After the existing imports, add:

```ts
import { WIREFRAME_CONTEXT_BLOCK } from '../../designWorkshop/jazzContext'
import { detectArchetypeRecipe, applyFintechFallback } from '../../designWorkshop/designWorkshop.helpers'
import { getScanContext, getScanContext as _getScanContext, getDwDesignMode, setScanContext } from '../../designWorkshop/designWorkshopScanStore'
```

Note: remove the `getScanContext as _getScanContext` alias — that was illustrative. The correct import is:

```ts
import { WIREFRAME_CONTEXT_BLOCK } from '../../designWorkshop/jazzContext'
import { detectArchetypeRecipe, applyFintechFallback } from '../../designWorkshop/designWorkshop.helpers'
import { getScanContext, getDwDesignMode, setScanContext } from '../../designWorkshop/designWorkshopScanStore'
```

- [ ] **Step 2: Replace `prepareMessages()` with the updated version**

Replace the entire `prepareMessages()` method (lines 46–129) with:

```ts
  prepareMessages(messages: NormalizedMessage[]): NormalizedMessage[] {
    const userMessages = messages.filter(m => m.role === 'user')
    const latestUserRequest = userMessages.length > 0
      ? userMessages[userMessages.length - 1].content
      : 'Generate design screens'

    this.latestUserRequest = latestUserRequest
    this.useNuxtDsForThisRun = /\@ds-nuxt/i.test(latestUserRequest)

    const intent = this.extractIntent(latestUserRequest, messages)
    this.latestIntent = intent

    const intentSummary = this.formatIntentSummary(intent)

    const designMode = getDwDesignMode()
    const contextBlock = designMode === 'wireframe' ? WIREFRAME_CONTEXT_BLOCK : JAZZ_CONTEXT_BLOCK

    // Archetype recipe injection
    const archetypeRecipe = detectArchetypeRecipe(intent, latestUserRequest)
    const recipeSection = archetypeRecipe
      ? `\n=== ARCHETYPE RECIPE ===\n${archetypeRecipe}\n`
      : ''

    // Scan context injection
    const scanCtx = getScanContext()
    let scanContextSection = ''
    if (scanCtx) {
      const screenLines = scanCtx.screens.map(s => {
        const blockSummary = s.blockTypes.join(', ')
        const textPreview = s.textSnippets.length > 0
          ? `\n  Text: ${s.textSnippets.slice(0, 5).map(t => `"${t}"`).join(', ')}...`
          : ''
        return `Screen "${s.name}": ${blockSummary}${textPreview}`
      }).join('\n')
      scanContextSection = `
=== SCANNED SCREEN CONTEXT ===
These screens are currently on the Figma canvas (generated by DW-A, ${scanCtx.designMode} mode).
Generate a refined version based on the user's request. Preserve the overall structure
unless the request explicitly changes it.

${screenLines}
`
    }

    const fidelityInstruction = designMode === 'wireframe'
      ? 'Use fidelity "wireframe". No Jazz color tokens.'
      : 'Use fidelity "hi" always. Use Jazz Design System styling as specified in the system prompt.'

    return [
      {
        role: 'system',
        content: `You are a Figma screen generator. Generate screens based on user requests. Return ONLY valid JSON. No prose. No markdown. No code fences. Output must be a single JSON object matching the DesignSpecV1 schema.\n${contextBlock}`
      },
      ...messages,
      {
        role: 'user',
        content: `=== USER REQUEST ===
"${latestUserRequest}"

=== EXTRACTED INTENT ===
${intentSummary}
${recipeSection}${scanContextSection}
=== SCHEMA REQUIREMENTS ===
Output must be a single JSON object matching the DesignSpecV1 schema exactly:

{
  "type": "designScreens",
  "version": 1,
  "meta": {
    "title": "string",
    "userRequest": "${latestUserRequest.replace(/"/g, '\\"')}",
    "intent": { /* extracted intent fields */ }
  },
  "canvas": {
    "device": {
      "kind": "mobile" | "tablet" | "desktop",
      "width": number,
      "height": number
    }
  },
  "render": {
    "intent": {
      "fidelity": "hi" | "wireframe",
      "styleKeywords": ["string"],
      "brandTone": "string",
      "density": "comfortable"
    }
  },
  "screens": [
    {
      "name": "string",
      "layout": { "direction": "vertical", "padding": 24, "gap": 16 },
      "blocks": [
        { "type": "heading", "text": "string", "level": 1 | 2 | 3 },
        { "type": "bodyText", "text": "string" },
        { "type": "button", "text": "string", "variant": "primary" | "secondary" | "tertiary" },
        { "type": "input", "label": "string", "placeholder": "string", "inputType": "text" | "email" | "password" },
        { "type": "card", "title": "string", "content": "string" },
        { "type": "spacer", "height": number },
        { "type": "image", "width": number, "height": number },
        { "type": "chart", "height": number, "caption": "string" },
        { "type": "metricsGrid", "items": [{ "label": "string", "value": "string", "gain": true | false }] },
        { "type": "allocation", "equity": number, "fixedIncome": number, "altAssets": number, "total": "string" },
        { "type": "watchlist", "title": "string", "items": [{ "ticker": "string", "price": "string", "change": "string", "gain": true | false }] },
        { "type": "darkSection", "title": "string", "body": "string" }
      ]
    }
  ]
}

CRITICAL:
- Generate 1-5 screens only.
- ${fidelityInstruction}
- Primary CTA button (variant "primary"): one per screen maximum.
- Return JSON only.`
      }
    ]
  }
```

- [ ] **Step 3: Replace `attemptRepair()` prompt block list**

In `attemptRepair()`, replace the block types list in the repair prompt. Find:

```
Block types allowed: heading, bodyText, button, input, card, spacer, image, chart, metricsGrid, allocation, watchlist.
```

Replace with (add `darkSection`):

```
Block types allowed: heading, bodyText, button, input, card, spacer, image, chart, metricsGrid, allocation, watchlist, darkSection.
```

Also update the schema example in the repair prompt to use `fidelity: "hi" | "wireframe"` instead of `fidelity: "hi"`.

- [ ] **Step 4: Update `buildAndRender()` — fidelity enforcement, fintech fallback, mode-aware render, scan clear**

Replace the `buildAndRender()` method with:

```ts
  private async buildAndRender(
    spec: DesignSpecV1,
    context: HandlerContext,
    runId: string,
    isDemoMode: boolean
  ): Promise<HandlerResult> {
    const { sendAssistantMessage, replaceStatusMessage } = context

    if (!spec.meta) spec.meta = { title: 'Screens' }
    spec.meta.userRequest = this.latestUserRequest
    spec.meta.runId = runId

    if (!spec.meta.intent) {
      spec.meta.intent = this.latestIntent
    } else {
      const llmIntent = spec.meta.intent
      spec.meta.intent = {
        ...this.latestIntent,
        ...llmIntent,
        keywords: llmIntent.keywords || this.latestIntent.keywords,
        accentColors: llmIntent.accentColors || this.latestIntent.accentColors,
        screenArchetypes: llmIntent.screenArchetypes || this.latestIntent.screenArchetypes
      }
    }

    // Read mode from store (set by DW_SET_DESIGN_MODE)
    const designMode = getDwDesignMode()
    const useWireframe = designMode === 'wireframe'

    // Enforce fidelity — override whatever the LLM returned
    if (!spec.render) spec.render = { intent: { fidelity: useWireframe ? 'wireframe' : 'hi' } }
    spec.render.intent.fidelity = useWireframe ? 'wireframe' : 'hi'

    // Fintech fallback — narrow deterministic upgrade (Jazz only)
    const specAfterFallback = applyFintechFallback(spec, designMode)

    const normalized = normalizeDesignSpecV1(specAfterFallback)

    // Step 3: Render (failure here → demo fallback, no retry)
    context.updateStatusStep?.('Rendering to canvas...')
    let renderResult: Awaited<ReturnType<typeof renderDesignSpecToSection>>
    try {
      renderResult = await renderDesignSpecToSection(normalized, runId, {
        useNuxtDs: this.useNuxtDsForThisRun,
        useJazz: !useWireframe,
        useWireframe
      })
    } catch (renderError) {
      if (!isDemoMode) console.error(`[DW ${runId}] Render error:`, renderError)
      return this.fireDemoFallback(context, runId, isDemoMode)
    }

    // Consume scan context — successful generation clears it
    setScanContext(null)

    // Post HTML export to UI
    try {
      const html = renderToHtml(normalized)
      figma.ui.postMessage({ pluginMessage: { type: 'DW_HTML_EXPORT_READY', html } })
    } catch { /* HTML export failed silently */ }

    // Observability artifacts — suppressed in demo mode
    if (!isDemoMode) {
      await this.createObservabilityArtifacts(normalized, renderResult.report, runId, renderResult.section)
    }

    if (renderResult.usedDsFallback) {
      await showNuxtDsFallbackHintIfNeeded()
    }

    replaceStatusMessage('Screens placed on stage')
    if (normalized.meta.truncationNotice) {
      sendAssistantMessage(normalized.meta.truncationNotice)
    }

    figma.notify('Screens generated successfully')
    return { handled: true }
  }
```

- [ ] **Step 5: Build to verify TypeScript compiles**

```
npm run build 2>&1 | head -40
```

Expected: Build succeeds (0 TypeScript errors).

- [ ] **Step 6: Commit**

```bash
git add src/core/assistants/handlers/designWorkshop.ts
git commit -m "feat: wire schema 12 blocks, repair prompt, archetype recipes, scan injection, wireframe mode into DW-A handler"
```

---

### Task 4: Renderer — Plugin Data, Wireframe Path, Archetype Tab Bar (renderer.ts)

**Files:**
- Modify: `src/core/designWorkshop/renderer.ts`

Changes: add `useWireframe` to `RenderDesignSpecOptions`, write plugin data markers on section/screen, update `useChrome` condition, add `ARCHETYPE_TABS` lookup, pass `useWireframe` through to `renderBlock()`, add wireframe visual paths for metricsGrid/allocation/watchlist, update screen background for wireframe mode.

- [ ] **Step 1: Add `useWireframe` to `RenderDesignSpecOptions` and plugin data markers**

Find:

```ts
export interface RenderDesignSpecOptions {
  useNuxtDs?: boolean
  useJazz?: boolean
}
```

Replace with:

```ts
export interface RenderDesignSpecOptions {
  useNuxtDs?: boolean
  useJazz?: boolean
  useWireframe?: boolean
}
```

After the section frame is created and named (around line 282-308), add plugin data writes immediately after `section.paddingLeft = 40`:

```ts
  section.paddingLeft = 40

  // DW-A origin markers — used by scan traversal
  section.setPluginData('dwa-origin', '1')
  section.setPluginData('dwa-mode', options?.useWireframe === true ? 'wireframe' : 'jazz')
```

Also update the options unpacking around line 298-299. Find:

```ts
  const useNuxtDs = options?.useNuxtDs === true
  const useJazz = options?.useJazz === true
```

Replace with:

```ts
  const useNuxtDs = options?.useNuxtDs === true
  const useJazz = options?.useJazz === true
  const useWireframe = options?.useWireframe === true
```

Then update the `renderScreen()` call on line 304:

```ts
    const screenResult = await renderScreen(screenSpec, spec.canvas.device, fidelity, intent, useNuxtDs, nuxtAllowlist, useJazz)
```

Replace with:

```ts
    const screenResult = await renderScreen(screenSpec, spec.canvas.device, fidelity, intent, useNuxtDs, nuxtAllowlist, useJazz, useWireframe)
```

- [ ] **Step 2: Add `ARCHETYPE_TABS` and update `renderScreen()` signature + `useChrome` condition + screen plugin data + tab bar**

After the `createNavBar` function definition (after its closing `}`), add:

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

Update `renderScreen()` signature to accept `useWireframe`:

```ts
async function renderScreen(
  screenSpec: DesignSpecV1['screens'][0],
  device: DesignSpecV1['canvas']['device'],
  fidelity: DesignSpecV1['render']['intent']['fidelity'],
  intent?: DesignSpecV1['meta']['intent'],
  useNuxtDs?: boolean,
  nuxtAllowlist: NuxtDemoAllowlistEntry[] = [],
  useJazz?: boolean,
  useWireframe?: boolean
): Promise<{ frame: FrameNode, usedDsFallback: boolean }> {
```

Set plugin data on the screen frame immediately after `screenFrame.name = screenSpec.name || 'Screen'`:

```ts
  screenFrame.setPluginData('dwa-screen', '1')
```

Update `useChrome` condition from:

```ts
  const useChrome = useJazz === true && device.kind === 'mobile'
```

To:

```ts
  const useChrome = useJazz === true && useWireframe !== true && device.kind === 'mobile'
```

Update `renderBlock()` calls in the render loops — both occurrences of:

```ts
      appendBlock(blockContainer, await renderBlock(block, fidelity, maxWidth, intent, useJazz))
```

Replace with:

```ts
      appendBlock(blockContainer, await renderBlock(block, fidelity, maxWidth, intent, useJazz, useWireframe))
```

And the non-chrome loop:

```ts
      blockContainer.appendChild(await renderBlock(block, fidelity, maxWidth, intent, useJazz))
```

Replace with:

```ts
      blockContainer.appendChild(await renderBlock(block, fidelity, maxWidth, intent, useJazz, useWireframe))
```

Update the tab bar to use archetype-aware labels. Find:

```ts
    const tabItems = ['Home', 'Watchlist', 'Transfer', 'Invest', 'More']
```

Replace with:

```ts
    const appType = intent?.appType?.toLowerCase() ?? 'default'
    const tabItems = ARCHETYPE_TABS[appType] ?? ARCHETYPE_TABS['default']
```

Mark chrome nodes with plugin data. Find `tabBar.layoutSizingHorizontal = 'FILL'` (the last line in the tab bar block) and add before it:

```ts
    tabBar.setPluginData('dwa-chrome', '1')
    screenFrame.appendChild(tabBar)
    tabBar.layoutSizingHorizontal = 'FILL'
```

Also mark status bar and nav bar. In `createStatusBar`, add after `bar.itemSpacing = 0`:

```ts
  bar.setPluginData('dwa-chrome', '1')
```

In `createNavBar`, add after `bar.itemSpacing = 0`:

```ts
  bar.setPluginData('dwa-chrome', '1')
```

Update `applyFidelityStyling` for wireframe mode. Find the line after `if (useJazz) {` block closes (`return`), and add a wireframe check before the `switch` statement:

```ts
  if (useWireframe === true) {
    frame.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }]  // #FFFFFF
    frame.strokes = [{ type: 'SOLID', color: { r: 0.86, g: 0.86, b: 0.86 }, opacity: 1 }]  // #DCDCDC
    frame.strokeWeight = 1
    frame.cornerRadius = 8
    frame.effects = []
    return
  }
```

Update `applyFidelityStyling` signature to accept `useWireframe`:

```ts
function applyFidelityStyling(frame: FrameNode, fidelity: DesignSpecV1['render']['intent']['fidelity'], intent?: DesignSpecV1['meta']['intent'], useJazz?: boolean, useWireframe?: boolean): void {
```

And update the call site in `renderScreen`:

```ts
  applyFidelityStyling(screenFrame, fidelity, intent, useJazz, useWireframe)
```

- [ ] **Step 3: Add wireframe visual paths to `renderBlock()`**

Update `renderBlock()` signature:

```ts
async function renderBlock(
  block: BlockSpec,
  fidelity: DesignSpecV1['render']['intent']['fidelity'],
  maxWidth: number,
  intent?: DesignSpecV1['meta']['intent'],
  useJazz?: boolean,
  useWireframe?: boolean
): Promise<SceneNode> {
```

In the `metricsGrid` case, add a wireframe path after the Jazz path's closing `}` and before `// Non-Jazz placeholder`:

```ts
      // Wireframe: flat rows (label left, value right), gray fills
      if (useWireframe) {
        const gridFrame = figma.createFrame()
        gridFrame.name = 'Metrics Grid'
        gridFrame.layoutMode = 'VERTICAL'
        gridFrame.fills = [{ type: 'SOLID', color: { r: 0.96, g: 0.96, b: 0.96 } }]  // #F5F5F5
        gridFrame.strokes = [{ type: 'SOLID', color: { r: 0.86, g: 0.86, b: 0.86 } }]
        gridFrame.strokeWeight = 1
        gridFrame.cornerRadius = 8
        gridFrame.paddingTop = 10
        gridFrame.paddingRight = 12
        gridFrame.paddingBottom = 10
        gridFrame.paddingLeft = 12
        gridFrame.itemSpacing = 1
        for (const item of block.items) {
          const row = figma.createFrame()
          row.name = item.label
          row.layoutMode = 'HORIZONTAL'
          row.primaryAxisAlignItems = 'SPACE_BETWEEN'
          row.counterAxisAlignItems = 'CENTER'
          row.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }]
          row.paddingTop = 8
          row.paddingRight = 8
          row.paddingBottom = 8
          row.paddingLeft = 8
          const labelText = await createTextNode(item.label, {
            fontSize: 11, fontName: fonts.regular,
            fills: [{ type: 'SOLID', color: { r: 0.53, g: 0.53, b: 0.53 } }]
          })
          row.appendChild(labelText)
          const valueText = await createTextNode(item.value, {
            fontSize: 11, fontName: fonts.bold,
            fills: [{ type: 'SOLID', color: { r: 0.2, g: 0.2, b: 0.2 } }]
          })
          row.appendChild(valueText)
          gridFrame.appendChild(row)
          row.resize(maxWidth - 24, row.height)
          row.primaryAxisSizingMode = 'FIXED'
          row.counterAxisSizingMode = 'AUTO'
          row.layoutSizingHorizontal = 'FILL'
        }
        gridFrame.resize(maxWidth, gridFrame.height || 10)
        gridFrame.counterAxisSizingMode = 'FIXED'
        gridFrame.primaryAxisSizingMode = 'AUTO'
        return gridFrame
      }
```

In the `allocation` case, add wireframe path after Jazz path and before non-Jazz placeholder:

```ts
      // Wireframe: horizontal bar chart + legend rows
      if (useWireframe) {
        const allocFrame = createAutoLayoutFrameSafe('Asset Allocation', 'VERTICAL', {
          padding: { top: 12, right: 12, bottom: 12, left: 12 }, gap: 8
        })
        allocFrame.fills = [{ type: 'SOLID', color: { r: 0.96, g: 0.96, b: 0.96 } }]
        allocFrame.strokes = [{ type: 'SOLID', color: { r: 0.86, g: 0.86, b: 0.86 } }]
        allocFrame.strokeWeight = 1
        allocFrame.cornerRadius = 8
        const total = block.equity + block.fixedIncome + block.altAssets
        const segments = [
          { pct: block.equity / total, color: { r: 0.6, g: 0.6, b: 0.6 }, label: 'Equity' },
          { pct: block.fixedIncome / total, color: { r: 0.72, g: 0.72, b: 0.72 }, label: 'Fixed Income' },
          { pct: block.altAssets / total, color: { r: 0.83, g: 0.83, b: 0.83 }, label: 'Alt Assets' },
        ]
        const barW = maxWidth - 24
        const barFrame = figma.createFrame()
        barFrame.name = 'Bar'
        barFrame.layoutMode = 'HORIZONTAL'
        barFrame.resize(barW, 20)
        barFrame.primaryAxisSizingMode = 'FIXED'
        barFrame.counterAxisSizingMode = 'FIXED'
        barFrame.fills = []
        barFrame.cornerRadius = 4
        barFrame.itemSpacing = 2
        barFrame.clipsContent = true
        for (const seg of segments) {
          const segF = figma.createFrame()
          segF.fills = [{ type: 'SOLID', color: seg.color }]
          segF.resize(Math.max(2, Math.round(barW * seg.pct)), 20)
          segF.primaryAxisSizingMode = 'FIXED'
          segF.counterAxisSizingMode = 'FIXED'
          barFrame.appendChild(segF)
        }
        allocFrame.appendChild(barFrame)
        barFrame.layoutSizingHorizontal = 'FILL'
        const pcts = [block.equity, block.fixedIncome, block.altAssets]
        for (let i = 0; i < 3; i++) {
          const row = createAutoLayoutFrameSafe('Row-' + segments[i].label, 'HORIZONTAL', { gap: 6 })
          row.fills = []
          row.counterAxisAlignItems = 'CENTER'
          const dot = figma.createRectangle()
          dot.resize(8, 8)
          dot.cornerRadius = 4
          dot.fills = [{ type: 'SOLID', color: segments[i].color }]
          row.appendChild(dot)
          const legText = await createTextNode(`${segments[i].label}  ${pcts[i].toFixed(1)}%`, {
            fontSize: 10, fontName: fonts.regular,
            fills: [{ type: 'SOLID', color: { r: 0.53, g: 0.53, b: 0.53 } }]
          })
          row.appendChild(legText)
          allocFrame.appendChild(row)
          row.layoutSizingHorizontal = 'FILL'
        }
        allocFrame.resize(maxWidth, allocFrame.height)
        allocFrame.counterAxisSizingMode = 'FIXED'
        return allocFrame
      }
```

In the `watchlist` case, add wireframe path after Jazz path and before non-Jazz placeholder:

```ts
      // Wireframe: plain rows with letter badge (no brand colors, no Jazz styling)
      if (useWireframe) {
        const wlFrame = figma.createFrame()
        wlFrame.name = block.title
        wlFrame.layoutMode = 'VERTICAL'
        wlFrame.primaryAxisSizingMode = 'AUTO'
        wlFrame.counterAxisSizingMode = 'AUTO'
        wlFrame.fills = [{ type: 'SOLID', color: { r: 0.96, g: 0.96, b: 0.96 } }]
        wlFrame.strokes = [{ type: 'SOLID', color: { r: 0.86, g: 0.86, b: 0.86 } }]
        wlFrame.strokeWeight = 1
        wlFrame.cornerRadius = 8
        wlFrame.paddingTop = 10
        wlFrame.paddingRight = 12
        wlFrame.paddingBottom = 10
        wlFrame.paddingLeft = 12
        wlFrame.itemSpacing = 0
        const titleText = await createTextNode(block.title.toUpperCase(), {
          fontSize: 10, fontName: fonts.bold,
          fills: [{ type: 'SOLID', color: { r: 0.53, g: 0.53, b: 0.53 } }]
        })
        wlFrame.appendChild(titleText)
        titleText.layoutSizingHorizontal = 'FILL'
        for (const item of block.items) {
          const divider = figma.createRectangle()
          divider.name = 'Divider'
          divider.resize(maxWidth - 24, 1)
          divider.fills = [{ type: 'SOLID', color: { r: 0.86, g: 0.86, b: 0.86 } }]
          wlFrame.appendChild(divider)
          divider.layoutSizingHorizontal = 'FILL'
          const row = figma.createFrame()
          row.name = item.ticker
          row.layoutMode = 'HORIZONTAL'
          row.resize(maxWidth - 24, 10)
          row.primaryAxisSizingMode = 'FIXED'
          row.counterAxisSizingMode = 'AUTO'
          row.counterAxisAlignItems = 'CENTER'
          row.fills = []
          row.paddingTop = 8
          row.paddingBottom = 8
          row.itemSpacing = 8
          // Always letter badge in wireframe (neutral gray, no brand colors)
          const badge = figma.createFrame()
          badge.name = 'Badge-' + item.ticker
          badge.layoutMode = 'VERTICAL'
          badge.primaryAxisAlignItems = 'CENTER'
          badge.counterAxisAlignItems = 'CENTER'
          badge.primaryAxisSizingMode = 'FIXED'
          badge.counterAxisSizingMode = 'FIXED'
          badge.resize(28, 28)
          badge.cornerRadius = 4
          badge.fills = [{ type: 'SOLID', color: { r: 0.8, g: 0.8, b: 0.8 } }]
          const abbr = item.ticker.length <= 3 ? item.ticker : item.ticker.slice(0, 3)
          const badgeText = await createTextNode(abbr, {
            fontSize: abbr.length <= 2 ? 11 : 8,
            fontName: fonts.bold,
            fills: [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }]
          })
          badge.appendChild(badgeText)
          row.appendChild(badge)
          const infoCol = createAutoLayoutFrameSafe('Info-' + item.ticker, 'VERTICAL', { gap: 1 })
          infoCol.fills = []
          const tickerText = await createTextNode(item.ticker, {
            fontSize: 12, fontName: fonts.bold,
            fills: [{ type: 'SOLID', color: { r: 0.2, g: 0.2, b: 0.2 } }]
          })
          infoCol.appendChild(tickerText)
          const priceText = await createTextNode(item.price, {
            fontSize: 10, fontName: fonts.regular,
            fills: [{ type: 'SOLID', color: { r: 0.53, g: 0.53, b: 0.53 } }]
          })
          infoCol.appendChild(priceText)
          row.appendChild(infoCol)
          infoCol.layoutGrow = 1
          infoCol.layoutSizingHorizontal = 'FILL'
          const changeText = await createTextNode(item.change, {
            fontSize: 11, fontName: fonts.bold,
            fills: [{ type: 'SOLID', color: { r: 0.4, g: 0.4, b: 0.4 } }]
          })
          row.appendChild(changeText)
          wlFrame.appendChild(row)
          row.layoutSizingHorizontal = 'FILL'
        }
        return wlFrame
      }
```

- [ ] **Step 4: Build to verify TypeScript compiles**

```
npm run build 2>&1 | head -40
```

Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/core/designWorkshop/renderer.ts
git commit -m "feat: add useWireframe to renderer — plugin data markers, wireframe visual paths, archetype tab bar"
```

---

### Task 5: Main Thread Scan Handlers (types.ts + main.ts)

**Files:**
- Modify: `src/core/types.ts`
- Modify: `src/main.ts`

- [ ] **Step 1: Add handler types to `src/core/types.ts`**

Find the last existing `Handler` interface in the file (near `RenderPluginUIPreviewHandler` or similar) and add after it:

```ts
export interface DwScanScreensHandler extends EventHandler {
  name: 'DW_SCAN_SCREENS'
  handler: () => void
}

export interface DwClearScanHandler extends EventHandler {
  name: 'DW_CLEAR_SCAN'
  handler: () => void
}

export interface DwSetDesignModeHandler extends EventHandler {
  name: 'DW_SET_DESIGN_MODE'
  handler: (mode: 'jazz' | 'wireframe') => void
}
```

- [ ] **Step 2: Import new handler types and scan store in `main.ts`**

Find the imports section at the top of `main.ts`. Add the new handler types to the existing import from `./core/types`:

```ts
import type { DwScanScreensHandler, DwClearScanHandler, DwSetDesignModeHandler } from './core/types'
```

Add import for the scan store:

```ts
import { setScanContext, setDwDesignMode } from './core/designWorkshop/designWorkshopScanStore'
import type { ScannedDesignContext } from './core/designWorkshop/designWorkshopScanStore'
```

- [ ] **Step 3: Add the scan handler at the bottom of `main.ts` (before `on<ResizePluginHandler>`)**

```ts
on<DwScanScreensHandler>('DW_SCAN_SCREENS', function () {
  const selection = figma.currentPage.selection

  if (selection.length === 0) {
    figma.ui.postMessage({ pluginMessage: { type: 'ASSISTANT_MESSAGE', message: 'Please select a DW-A section or screen on the canvas first.' } })
    return
  }

  // Collect candidate nodes: sections (dwa-origin) and individual screens (dwa-screen)
  const dwaSections: FrameNode[] = []
  const dwaScreens: FrameNode[] = []
  let nonDwCount = 0

  for (const node of selection) {
    if (node.type !== 'FRAME') { nonDwCount++; continue }
    const frame = node as FrameNode
    if (frame.getPluginData('dwa-origin') === '1') {
      dwaSections.push(frame)
    } else if (frame.getPluginData('dwa-screen') === '1') {
      dwaScreens.push(frame)
    } else {
      // Name fallback: frame whose name starts with "Design Workshop"
      if (frame.name.startsWith('Design Workshop')) {
        dwaSections.push(frame)
      } else {
        nonDwCount++
      }
    }
  }

  // Expand sections to their screen children
  for (const section of dwaSections) {
    for (const child of section.children) {
      if (child.type === 'FRAME') {
        const childFrame = child as FrameNode
        if (childFrame.getPluginData('dwa-screen') === '1' || !childFrame.name.startsWith('Status Bar')) {
          if (!dwaScreens.includes(childFrame)) dwaScreens.push(childFrame)
        }
      }
    }
  }

  if (dwaScreens.length === 0 && dwaSections.length === 0) {
    figma.ui.postMessage({ pluginMessage: { type: 'ASSISTANT_MESSAGE', message: "The selected items weren't created by Design Workshop. Select a DW-A generated section or screen frame." } })
    return
  }

  // Read design mode from the first section's plugin data (fallback: current store value)
  let designMode: 'jazz' | 'wireframe' = 'jazz'
  if (dwaSections.length > 0) {
    const rawMode = dwaSections[0].getPluginData('dwa-mode')
    if (rawMode === 'wireframe') designMode = 'wireframe'
  }

  // Traverse each screen frame — shallow recursion, depth cap 3, skip chrome nodes
  const CHROME_NAMES = new Set(['Status Bar', 'Nav Bar', 'Tab Bar'])
  const BLOCK_NAME_MAP: Record<string, string> = {
    'Metrics Grid': 'metricsGrid',
    'Asset Allocation': 'allocation',
    'Chart': 'chart',
    'Chart Header': 'chart',
    'Dark Section': 'darkSection',
    'Body Text': 'bodyText',
    'Button': 'button',
    'Input': 'input',
    'Spacer': 'spacer',
    'Image': 'image',
  }

  function classifyNode(node: SceneNode): string | null {
    if (node.type !== 'FRAME' && node.type !== 'RECTANGLE' && node.type !== 'TEXT') return null
    if (node.getPluginData?.('dwa-chrome') === '1') return null
    if (CHROME_NAMES.has(node.name)) return null
    const n = node.name
    if (BLOCK_NAME_MAP[n]) return BLOCK_NAME_MAP[n]
    if (n.startsWith('Heading')) return 'heading'
    if (n.startsWith('Card-') || n === 'Card' || n === 'Promo-Card') return 'card'
    return null
  }

  function collectTexts(node: SceneNode, depth: number, out: string[]) {
    if (out.length >= 10) return
    if (depth > 3) return
    if (node.type === 'TEXT') {
      const chars = (node as TextNode).characters?.trim()
      if (chars && chars.length > 0) out.push(chars.slice(0, 80))
    }
    if ('children' in node) {
      for (const child of (node as ChildrenMixin).children) {
        collectTexts(child, depth + 1, out)
      }
    }
  }

  function traverseScreen(screenFrame: FrameNode): { blockTypes: string[]; textSnippets: string[] } {
    const blockTypes: string[] = []
    const textSnippets: string[] = []
    const seen = new Set<string>()

    function walk(node: SceneNode, depth: number) {
      if (depth > 3) return
      if (node.type === 'FRAME') {
        const frame = node as FrameNode
        if (frame.getPluginData('dwa-chrome') === '1' || CHROME_NAMES.has(frame.name)) return
        const bt = classifyNode(frame)
        if (bt && !seen.has(bt + frame.name)) {
          blockTypes.push(bt)
          seen.add(bt + frame.name)
        }
        // Recurse into Content frames and named block frames
        if (frame.name === 'Content' || bt !== null) {
          for (const child of frame.children) walk(child, depth + 1)
        }
      } else if (node.type === 'TEXT') {
        const chars = (node as TextNode).characters?.trim()
        if (chars && chars.length > 0 && textSnippets.length < 10) {
          textSnippets.push(chars.slice(0, 80))
        }
      }
    }

    for (const child of screenFrame.children) walk(child, 0)
    return { blockTypes, textSnippets }
  }

  const screens: ScannedDesignContext['screens'] = []
  for (const screenFrame of dwaScreens) {
    const { blockTypes, textSnippets } = traverseScreen(screenFrame)
    screens.push({ name: screenFrame.name, blockTypes, textSnippets })
  }

  if (screens.length === 0 || screens.every(s => s.blockTypes.length === 0)) {
    figma.ui.postMessage({ pluginMessage: { type: 'ASSISTANT_MESSAGE', message: "The selected screens don't contain recognizable design blocks. Try selecting the outer Design Workshop section frame." } })
    return
  }

  const screenNames = screens.map(s => s.name).join(' · ')
  const rawSummary = `${screens.length} screen${screens.length > 1 ? 's' : ''}: ${screenNames}`
  const ctx: ScannedDesignContext = { screens, designMode, rawSummary }

  setScanContext(ctx)

  const blockInventory = [...new Set(screens.flatMap(s => s.blockTypes))].join(', ')
  const confirmMsg = nonDwCount > 0
    ? `Mixed selection detected — ${screens.length} DW-A screen(s) found and scanned. Non-DW-A items ignored.\n✓ ${rawSummary} (${blockInventory}). What would you like to refine?`
    : `✓ Scanned ${rawSummary} (${blockInventory}). What would you like to refine?`

  figma.ui.postMessage({ pluginMessage: { type: 'ASSISTANT_MESSAGE', message: confirmMsg } })
  figma.ui.postMessage({ pluginMessage: {
    type: 'DW_SCAN_RESULT',
    ok: true,
    summary: rawSummary,
    screenCount: screens.length,
    designMode
  }})
})

on<DwClearScanHandler>('DW_CLEAR_SCAN', function () {
  setScanContext(null)
})

on<DwSetDesignModeHandler>('DW_SET_DESIGN_MODE', function (mode: 'jazz' | 'wireframe') {
  setDwDesignMode(mode)
})
```

- [ ] **Step 4: Build to verify TypeScript compiles**

```
npm run build 2>&1 | head -40
```

Expected: Build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/core/types.ts src/main.ts
git commit -m "feat: add DW_SCAN_SCREENS, DW_CLEAR_SCAN, DW_SET_DESIGN_MODE handlers in main.ts"
```

---

### Task 6: BottomToolbar Component

**Files:**
- Create: `src/ui/components/BottomToolbar.tsx`

- [ ] **Step 1: Create `BottomToolbar.tsx`**

```tsx
// src/ui/components/BottomToolbar.tsx
/**
 * Bottom Toolbar — shared shell component, always visible.
 * Renders selection indicator + assistant switcher + conditional send button.
 * Rendered unconditionally after the input-area branch in ui.tsx.
 * Hidden send button when assistant.id === 'design_workshop' or assistant.uiMode === 'tool'.
 */
import { h } from 'preact'

interface SelectionState {
  hasSelection: boolean
  count?: number
  names?: string[]
}

interface AssistantInfo {
  id: string
  label: string
  iconId?: string
  uiMode?: string
}

interface BottomToolbarProps {
  selectionState: SelectionState
  selectionRequired: boolean
  showSelectionHint: boolean
  onSelectionClick: () => void
  assistant: AssistantInfo
  onAssistantClick: () => void
  onSend: () => void
  isGenerating: boolean
  canSend: boolean
  getSelectionIcon: () => h.JSX.Element | null
  getAssistantIcon: (iconId?: string) => h.JSX.Element | null
}

export function BottomToolbar({
  selectionState,
  selectionRequired,
  showSelectionHint,
  onSelectionClick,
  assistant,
  onAssistantClick,
  onSend,
  isGenerating,
  canSend,
  getSelectionIcon,
  getAssistantIcon,
}: BottomToolbarProps) {
  const hideSendButton = assistant.id === 'design_workshop' || assistant.uiMode === 'tool'

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--spacing-sm)'
    }}>
      {/* Selection Indicator */}
      <button
        onClick={onSelectionClick}
        style={{
          flex: 1,
          height: '36px',
          padding: 'var(--spacing-sm)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          backgroundColor: selectionState.hasSelection
            ? 'var(--success)'
            : (selectionRequired
              ? 'var(--error)'
              : (showSelectionHint
                ? 'var(--hint-bg)'
                : 'var(--bg)')),
          color: selectionState.hasSelection
            ? 'var(--success-text)'
            : selectionRequired
            ? 'var(--error-text)'
            : 'var(--fg)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
          gap: 'var(--spacing-xs)',
          overflow: 'hidden',
          textAlign: 'left'
        }}
        title={
          selectionState.hasSelection && selectionState.names
            ? selectionState.names.join(', ')
            : selectionState.hasSelection
            ? `${selectionState.count} item(s) selected`
            : 'No selection'
        }
      >
        {getSelectionIcon()}
        {showSelectionHint && !selectionState.hasSelection && !selectionRequired ? (
          <span style={{
            fontSize: '10px',
            fontFamily: 'var(--font-family)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            flex: 1,
            minWidth: 0,
            textAlign: 'left'
          }}>
            Select element/s (frame, layer, etc.)
          </span>
        ) : selectionState.hasSelection && selectionState.names && selectionState.names.length > 0 ? (
          <span style={{
            fontSize: 'var(--font-size-sm)',
            fontFamily: 'var(--font-family)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            flex: 1,
            minWidth: 0,
            textAlign: 'left'
          }}>
            {selectionState.names.length === 1
              ? selectionState.names[0]
              : selectionState.names.length <= 3
              ? selectionState.names.join(', ')
              : `${selectionState.names.slice(0, 2).join(', ')} +${selectionState.names.length - 2} more`}
          </span>
        ) : null}
      </button>

      {/* Assistant Selector */}
      <button
        onClick={onAssistantClick}
        style={{
          height: '36px',
          padding: 'var(--spacing-sm) var(--spacing-md)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          backgroundColor: 'var(--bg)',
          color: 'var(--fg)',
          cursor: 'pointer',
          fontSize: 'var(--font-size-sm)',
          fontFamily: 'var(--font-family)',
          whiteSpace: 'nowrap',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--spacing-xs)',
          flexShrink: 0
        }}
        title="Select assistant"
      >
        {getAssistantIcon(assistant.iconId)}
        {assistant.label}
        <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {/* Send Button — hidden for DW-A and tool-mode assistants */}
      {!hideSendButton && (
        <button
          type="button"
          onClick={onSend}
          disabled={isGenerating || !canSend}
          style={{
            width: '36px',
            height: '36px',
            padding: '0',
            border: 'none',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: (isGenerating || !canSend) ? 'var(--muted)' : 'var(--accent)',
            cursor: (isGenerating || !canSend) ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M14 8L2 2l3 6-3 6z" fill="white"/>
          </svg>
        </button>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Build to verify TypeScript compiles**

```
npm run build 2>&1 | head -40
```

Expected: Build succeeds (BottomToolbar not yet used, but no compile errors).

- [ ] **Step 3: Commit**

```bash
git add src/ui/components/BottomToolbar.tsx
git commit -m "feat: add BottomToolbar shared component (selection indicator + assistant switcher + conditional send)"
```

---

### Task 7: DW Panel Redesign (DesignWorkshopPanel.tsx)

**Files:**
- Modify: `src/ui/components/DesignWorkshopPanel.tsx`

Redesign the panel with: mode toggle header, scan button in action row, scan summary chip replacing prompt chips when scanned, `DEMO` button disabled in wireframe mode, distinct `Clear prompt` and `Clear scan` actions, Option A state machine.

- [ ] **Step 1: Replace the entire contents of `DesignWorkshopPanel.tsx`**

```tsx
/**
 * Design Workshop Panel — Command Center UX
 *
 * Option A state machine:
 *   idle → (scan) → scanned → (generate/refine) → idle
 *   idle → (demo toggle) → demo → (generate) → idle
 *
 * Toolbar (selection indicator + assistant switcher) is NOT here.
 * It lives in BottomToolbar, rendered unconditionally by ui.tsx.
 */

import { h } from 'preact'
import { useState, useCallback } from 'preact/hooks'

type DemoTag = 'dashboard' | 'positions' | 'flow' | 'exact'

export interface DesignWorkshopPanelProps {
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

const PROMPT_CHIPS = ['Mobile', 'Onboarding', 'Dashboard', 'Login', 'Settings', 'FinTech']

const DEMO_TAGS: Array<{ key: DemoTag; label: string }> = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'positions', label: 'Positions' },
  { key: 'flow',      label: 'Flow' },
  { key: 'exact',     label: 'Exact' },
]

const JAZZ_BLUE    = '#005EB8'
const JAZZ_GREEN   = '#128842'
const JAZZ_TEXT    = '#0F171F'
const JAZZ_MUTED   = '#5B6C7B'
const JAZZ_BORDER  = '#E2E4E5'
const JAZZ_SURFACE1 = '#F5F7F8'
const JAZZ_ICON_BG = '#E8F0FA'

export function DesignWorkshopPanel({
  isGenerating,
  onGenerate,
  onDemoMode,
  onNewPrompt,
  exportHtml,
  onExportHtml,
  designMode,
  onDesignModeChange,
  hasScanContext,
  scanSummary,
  onScan,
  onClearScan,
  hasSelection,
}: DesignWorkshopPanelProps) {
  const [prompt, setPrompt]       = useState('')
  const [demoActive, setDemoActive] = useState(false)
  const [demoTag, setDemoTag]     = useState<DemoTag>('flow')

  const isWireframe = designMode === 'wireframe'

  const handleGenerate = useCallback(() => {
    if (demoActive) {
      onDemoMode(demoTag)
      return
    }
    const trimmed = prompt.trim()
    if (!trimmed) return
    onGenerate(trimmed)
  }, [prompt, demoActive, demoTag, onGenerate, onDemoMode])

  const handleChipClick = useCallback((chip: string) => {
    setPrompt(prev => {
      const trimmed = prev.trim()
      if (!trimmed) return chip
      if (trimmed.toLowerCase().includes(chip.toLowerCase())) return prev
      return `${trimmed} ${chip}`
    })
  }, [])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !isGenerating) {
      e.preventDefault()
      handleGenerate()
    }
  }, [handleGenerate, isGenerating])

  const handleModeToggle = useCallback(() => {
    if (isGenerating) return
    onDesignModeChange(isWireframe ? 'jazz' : 'wireframe')
  }, [isWireframe, isGenerating, onDesignModeChange])

  const canGenerate = demoActive || prompt.trim().length > 0

  const generateLabel = isGenerating
    ? 'Generating…'
    : hasScanContext
    ? 'Refine Screens'
    : 'Generate Screens'

  return (
    <div style={{
      borderTop: '1px solid ' + JAZZ_BORDER,
      padding: '12px',
      backgroundColor: '#ffffff',
      flexShrink: 0,
      display: 'flex',
      flexDirection: 'column',
      gap: '8px'
    }}>
      {/* Header row: title + mode toggle */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '2px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '11px', fontWeight: 600, color: JAZZ_TEXT }}>Design Workshop</span>
          <span style={{
            background: JAZZ_ICON_BG,
            color: JAZZ_BLUE,
            fontSize: '9px',
            fontWeight: 600,
            padding: '1px 6px',
            borderRadius: '2px',
            letterSpacing: '0.04em'
          }}>
            {isWireframe ? 'Wireframe' : 'Jazz DS'}
          </span>
        </div>
        {/* Jazz / Wireframe mode toggle */}
        <button
          type="button"
          onClick={handleModeToggle}
          disabled={isGenerating}
          title={isWireframe ? 'Switch to Jazz DS mode' : 'Switch to Wireframe mode'}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            background: 'none',
            border: '1px solid ' + JAZZ_BORDER,
            borderRadius: '4px',
            padding: '2px 7px',
            cursor: isGenerating ? 'not-allowed' : 'pointer',
            fontSize: '9px',
            fontWeight: 600,
            color: isWireframe ? JAZZ_MUTED : JAZZ_BLUE,
            fontFamily: 'var(--font-family)',
            opacity: isGenerating ? 0.5 : 1
          }}
        >
          {isWireframe ? 'Wireframe' : 'Jazz DS'}
        </button>
      </div>

      {/* Prompt textarea */}
      <textarea
        value={prompt}
        onInput={(e) => setPrompt((e.target as HTMLTextAreaElement).value)}
        onKeyDown={handleKeyDown}
        disabled={isGenerating || demoActive}
        placeholder={
          demoActive
            ? 'Demo mode active — select a tag below, then click Generate Screens'
            : hasScanContext
            ? 'Describe refinements to the scanned screens…'
            : 'Describe the screens you want to generate…'
        }
        rows={3}
        style={{
          width: '100%',
          fontSize: '11px',
          fontFamily: 'var(--font-family)',
          color: (isGenerating || demoActive) ? JAZZ_MUTED : JAZZ_TEXT,
          backgroundColor: demoActive ? JAZZ_SURFACE1 : '#ffffff',
          border: '1px solid ' + JAZZ_BORDER,
          borderRadius: '4px',
          padding: '8px 10px',
          resize: 'none',
          outline: 'none',
          lineHeight: '1.5',
          boxSizing: 'border-box',
          cursor: (isGenerating || demoActive) ? 'not-allowed' : 'text',
          opacity: (isGenerating || demoActive) ? 0.7 : 1
        }}
      />

      {/* Chips row: scan summary chip OR prompt chips */}
      {!demoActive && hasScanContext ? (
        /* Scan summary chip */
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          background: JAZZ_ICON_BG,
          borderRadius: '4px',
          padding: '4px 8px'
        }}>
          <span style={{ color: JAZZ_BLUE, fontSize: '10px', fontWeight: 600, flex: 1 }}>
            ✓ {scanSummary ?? 'Screens scanned'}
          </span>
          <button
            type="button"
            onClick={onClearScan}
            disabled={isGenerating}
            title="Clear scan context"
            style={{
              background: 'none',
              border: 'none',
              color: JAZZ_MUTED,
              fontSize: '12px',
              cursor: isGenerating ? 'not-allowed' : 'pointer',
              padding: '0 2px',
              lineHeight: 1,
              fontFamily: 'var(--font-family)'
            }}
          >
            ×
          </button>
        </div>
      ) : !demoActive ? (
        /* Prompt chips */
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
          {PROMPT_CHIPS.map(chip => (
            <button
              key={chip}
              type="button"
              onClick={() => handleChipClick(chip)}
              disabled={isGenerating}
              style={{
                background: JAZZ_ICON_BG,
                color: JAZZ_BLUE,
                border: 'none',
                borderRadius: '2px',
                fontSize: '9px',
                fontWeight: 600,
                padding: '2px 7px',
                cursor: isGenerating ? 'not-allowed' : 'pointer',
                fontFamily: 'var(--font-family)',
                opacity: isGenerating ? 0.5 : 1
              }}
            >
              {chip}
            </button>
          ))}
        </div>
      ) : null}

      {/* Demo tag row — shown only when demo is active */}
      {demoActive && (
        <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
          {DEMO_TAGS.map(({ key, label }) => {
            const isActive = demoTag === key
            return (
              <button
                key={key}
                type="button"
                onClick={() => setDemoTag(key)}
                disabled={isGenerating}
                style={{
                  background: isActive ? JAZZ_GREEN : '#ffffff',
                  color: isActive ? '#ffffff' : JAZZ_MUTED,
                  border: '1px solid ' + (isActive ? JAZZ_GREEN : JAZZ_BORDER),
                  borderRadius: '20px',
                  fontSize: '10px',
                  fontWeight: 600,
                  padding: '3px 10px',
                  cursor: isGenerating ? 'not-allowed' : 'pointer',
                  fontFamily: 'var(--font-family)',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.12s ease'
                }}
              >
                {label}
              </button>
            )
          })}
        </div>
      )}

      {/* Action row: Generate + Scan + Demo + HTML export */}
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
        {/* Generate / Refine Screens button */}
        <button
          type="button"
          onClick={handleGenerate}
          disabled={isGenerating || (!demoActive && !canGenerate)}
          style={{
            flex: 1,
            backgroundColor: isGenerating
              ? JAZZ_BORDER
              : demoActive
              ? JAZZ_GREEN
              : JAZZ_BLUE,
            color: '#ffffff',
            border: 'none',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: 600,
            padding: '8px 12px',
            cursor: (isGenerating || (!demoActive && !canGenerate)) ? 'not-allowed' : 'pointer',
            fontFamily: 'var(--font-family)',
            opacity: (!canGenerate && !isGenerating && !demoActive) ? 0.5 : 1,
            transition: 'background-color 0.15s'
          }}
        >
          {generateLabel}
        </button>

        {/* Scan button — always visible, disabled when no selection */}
        <button
          type="button"
          onClick={onScan}
          disabled={isGenerating || !hasSelection}
          title={
            !hasSelection
              ? 'Select a DW-A section on the canvas to scan'
              : hasScanContext
              ? 'Re-scan selection'
              : 'Scan selected screens'
          }
          style={{
            backgroundColor: hasScanContext ? JAZZ_ICON_BG : '#ffffff',
            color: hasScanContext ? JAZZ_BLUE : JAZZ_MUTED,
            border: '1px solid ' + (hasScanContext ? JAZZ_BLUE : JAZZ_BORDER),
            borderRadius: '4px',
            fontSize: '9px',
            fontWeight: 700,
            padding: '8px 10px',
            cursor: (isGenerating || !hasSelection) ? 'not-allowed' : 'pointer',
            fontFamily: 'var(--font-family)',
            whiteSpace: 'nowrap',
            opacity: !hasSelection ? 0.4 : 1
          }}
        >
          Scan
        </button>

        {/* Demo toggle — disabled in wireframe mode */}
        <button
          type="button"
          onClick={() => !isWireframe && setDemoActive(d => !d)}
          disabled={isGenerating || isWireframe}
          title={
            isWireframe
              ? 'Demo presets are Jazz DS only'
              : demoActive
              ? 'Demo mode ON — click to disable'
              : 'Demo mode OFF — click to enable'
          }
          style={{
            backgroundColor: demoActive ? JAZZ_GREEN : '#ffffff',
            color: demoActive ? '#ffffff' : (isWireframe ? JAZZ_BORDER : JAZZ_MUTED),
            border: '1px solid ' + (demoActive ? JAZZ_GREEN : JAZZ_BORDER),
            borderRadius: '4px',
            fontSize: '9px',
            fontWeight: 700,
            padding: '8px 10px',
            cursor: (isGenerating || isWireframe) ? 'not-allowed' : 'pointer',
            fontFamily: 'var(--font-family)',
            whiteSpace: 'nowrap',
            letterSpacing: '0.04em',
            opacity: isWireframe ? 0.4 : 1
          }}
        >
          {demoActive ? 'DEMO ON' : 'DEMO'}
        </button>

        {/* Send to HTML — shown once screens have been generated */}
        {exportHtml && (
          <button
            type="button"
            onClick={onExportHtml}
            disabled={isGenerating}
            style={{
              background: '#ffffff',
              color: JAZZ_BLUE,
              border: '1px solid ' + JAZZ_BORDER,
              borderRadius: '4px',
              fontSize: '9px',
              fontWeight: 600,
              padding: '8px 10px',
              cursor: isGenerating ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--font-family)',
              whiteSpace: 'nowrap'
            }}
          >
            HTML
          </button>
        )}
      </div>

      {/* Footer: Clear prompt + Clear scan (when both relevant) */}
      {!isGenerating && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '12px' }}>
          <button
            type="button"
            onClick={onNewPrompt}
            style={{
              background: 'none',
              border: 'none',
              color: JAZZ_MUTED,
              fontSize: '10px',
              cursor: 'pointer',
              padding: '2px 4px',
              fontFamily: 'var(--font-family)'
            }}
          >
            Clear prompt
          </button>
          {hasScanContext && (
            <button
              type="button"
              onClick={onClearScan}
              style={{
                background: 'none',
                border: 'none',
                color: JAZZ_MUTED,
                fontSize: '10px',
                cursor: 'pointer',
                padding: '2px 4px',
                fontFamily: 'var(--font-family)'
              }}
            >
              Clear scan
            </button>
          )}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Build to verify TypeScript compiles**

```
npm run build 2>&1 | head -40
```

Expected: Build succeeds (new props not yet wired, but no compile errors because DesignWorkshopPanel is used in ui.tsx — expect type errors until Task 8).

- [ ] **Step 3: Commit**

```bash
git add src/ui/components/DesignWorkshopPanel.tsx
git commit -m "feat: redesign DW panel — mode toggle, scan button, Option A state machine, distinct clear actions"
```

---

### Task 8: ui.tsx Integration

**Files:**
- Modify: `src/ui.tsx`

Changes: import `BottomToolbar` and `DesignWorkshopPanelProps`; add `dwDesignMode`, `dwHasScanContext`, `dwScanSummary` state; handle `DW_SCAN_RESULT` message; emit `DW_SET_DESIGN_MODE` on mode change; emit `DW_CLEAR_SCAN` on scan clear; clear scan context on assistant switch; replace bottom controls inline JSX with `<BottomToolbar>`; pass all new props to `<DesignWorkshopPanel>`.

- [ ] **Step 1: Add imports**

Near the top of `src/ui.tsx`, add imports for the new components:

```ts
import { BottomToolbar } from './ui/components/BottomToolbar'
```

The `DesignWorkshopPanel` import already exists — just update it to import the named export (it already does).

Add handler type imports. Find the existing handler type imports (lines like `import type { ... } from './core/types'`) and add:

```ts
import type { DwScanScreensHandler, DwClearScanHandler, DwSetDesignModeHandler } from './core/types'
```

- [ ] **Step 2: Add new DW-A state variables**

Find the existing `dwExportHtml` state declaration. Add immediately after it:

```ts
const [dwDesignMode, setDwDesignMode] = useState<'jazz' | 'wireframe'>('jazz')
const [dwHasScanContext, setDwHasScanContext] = useState(false)
const [dwScanSummary, setDwScanSummary] = useState<string | null>(null)
```

- [ ] **Step 3: Handle `DW_SCAN_RESULT` message**

In the `handleMessage` function, find the `case 'DW_HTML_EXPORT_READY':` block. Add immediately before it:

```ts
        case 'DW_SCAN_RESULT':
          if (message.ok) {
            setDwHasScanContext(true)
            setDwScanSummary(message.summary ?? null)
            if (message.designMode === 'wireframe' || message.designMode === 'jazz') {
              setDwDesignMode(message.designMode)
              emit<DwSetDesignModeHandler>('DW_SET_DESIGN_MODE', message.designMode)
            }
          }
          break
```

- [ ] **Step 4: Clear scan context on assistant switch**

Find the `SET_ASSISTANT` handler in ui.tsx (where `setAssistant` is called). Add after the assistant switch logic:

```ts
          // Clear DW-A scan context when switching assistants
          setDwHasScanContext(false)
          setDwScanSummary(null)
          emit<DwClearScanHandler>('DW_CLEAR_SCAN')
```

- [ ] **Step 5: Replace `<DesignWorkshopPanel>` usage with new props**

Find the existing `<DesignWorkshopPanel>` JSX block (around line 3394). Replace with:

```tsx
      {assistant.id === 'design_workshop' ? (
        <DesignWorkshopPanel
          isGenerating={activeStatus !== null}
          onGenerate={(prompt) => {
            emit<SendMessageHandler>('SEND_MESSAGE', prompt, false)
          }}
          onDemoMode={(tag) => {
            emit<RunQuickActionHandler>('RUN_QUICK_ACTION', `demo-${tag}`, 'design_workshop')
          }}
          onNewPrompt={() => {
            /* panel manages its own prompt state */
          }}
          exportHtml={dwExportHtml}
          onExportHtml={handleDwExportHtml}
          designMode={dwDesignMode}
          onDesignModeChange={(mode) => {
            setDwDesignMode(mode)
            emit<DwSetDesignModeHandler>('DW_SET_DESIGN_MODE', mode)
          }}
          hasScanContext={dwHasScanContext}
          scanSummary={dwScanSummary}
          onScan={() => {
            emit<DwScanScreensHandler>('DW_SCAN_SCREENS')
          }}
          onClearScan={() => {
            setDwHasScanContext(false)
            setDwScanSummary(null)
            emit<DwClearScanHandler>('DW_CLEAR_SCAN')
          }}
          hasSelection={selectionState.hasSelection}
        />
      ) : (
```

- [ ] **Step 6: Extract bottom controls to `<BottomToolbar>` and add after input area**

Find the closing `)}` of the input area branch (after the existing bottom controls div that contains selection indicator + assistant selector + send button). This is the section from `{/* Bottom Controls */}` through the closing `</div>` of the containing div.

Remove the existing "Bottom Controls" div from inside the `else` branch of the input area.

After the entire input-area conditional block (after the closing `)`), add:

```tsx
      {/* Shell bottom controls — always rendered regardless of active assistant */}
      <BottomToolbar
        selectionState={selectionState}
        selectionRequired={selectionRequired}
        showSelectionHint={showSelectionHint}
        onSelectionClick={handleSelectionIndicatorClick}
        assistant={assistant}
        onAssistantClick={handleAssistantClick}
        onSend={handleSend}
        isGenerating={activeStatus !== null}
        canSend={!(mode === 'content-mvp' || (selectionRequired && !selectionState.hasSelection))}
        getSelectionIcon={getSelectionIcon}
        getAssistantIcon={getAssistantIcon}
      />
```

- [ ] **Step 7: Build to verify TypeScript compiles with 0 errors**

```
npm run build 2>&1 | head -60
```

Expected: Build succeeds.

- [ ] **Step 8: Run tests**

```
npm run test 2>&1 | tail -20
```

Expected: All existing tests still pass.

- [ ] **Step 9: Commit**

```bash
git add src/ui.tsx
git commit -m "feat: wire BottomToolbar + DW panel scan/mode props into ui.tsx"
```

---

### Task 9: HTML Renderer Wireframe Deferral

**Files:**
- Modify: `src/core/designWorkshop/htmlRenderer.ts`

- [ ] **Step 1: Add wireframe parity deferral comment to `renderToHtml()`**

Find the `renderToHtml()` function signature in `htmlRenderer.ts`. Add a comment immediately after the opening `{`:

```ts
  // WIREFRAME HTML PARITY: deferred.
  // The HTML renderer always uses Jazz DS CSS variables (JAZZ_CSS_VARS) regardless of mode.
  // When called from wireframe mode, the output will have Jazz styling — this is a known
  // limitation. Wireframe HTML parity requires a separate CSS variable set and block
  // rendering changes. Defer until wireframe HTML export is explicitly requested.
  // To implement: add a `useWireframe?: boolean` param, swap JAZZ_CSS_VARS for WIREFRAME_CSS_VARS,
  // and add wireframe block renderers for metricsGrid/allocation/watchlist.
```

- [ ] **Step 2: Build to verify**

```
npm run build 2>&1 | head -20
```

- [ ] **Step 3: Commit**

```bash
git add src/core/designWorkshop/htmlRenderer.ts
git commit -m "docs: document wireframe HTML parity deferral in htmlRenderer.ts"
```

---

### Task 10: Build Validation

**Files:** None (verification only)

- [ ] **Step 1: Run full build**

```
npm run build
```

Expected: Build succeeds with 0 errors.

- [ ] **Step 2: Run all tests**

```
npm run test
```

Expected: All tests pass.

- [ ] **Step 3: Run invariants check**

```
npm run invariants
```

Expected: 0 invariant violations.

- [ ] **Step 4: Run the new unit tests individually**

```
npx tsx src/core/designWorkshop/jazzContext.test.ts
npx tsx src/core/designWorkshop/designWorkshop.helpers.test.ts
```

Expected: All tests pass in both files.

- [ ] **Step 5: Manual verification checklist**

Open the plugin in Figma and verify:
- [ ] Prompt generates screens using metricsGrid/chart/watchlist/allocation for "fintech app screens"
- [ ] Bottom toolbar (selection indicator + assistant switcher) visible when Design Workshop is active
- [ ] Jazz/Wireframe toggle shows in the panel header
- [ ] Scan button visible in action row (disabled when nothing selected)
- [ ] DEMO button disabled when Wireframe mode is active
- [ ] Switching to another assistant and back clears scan context
- [ ] Other assistants still work normally (no regression)

- [ ] **Step 6: Commit final validation marker**

```bash
git add -p  # stage any incidental changes from build
git commit -m "chore: build validation — DW-A iteration complete" --allow-empty
```

---

## Self-Review

### Spec Coverage

| Spec requirement | Task |
|---|---|
| Schema template shows all 12 block types | Task 3 |
| Archetype recipes (fintech/onboarding/auth/settings) | Task 2 + Task 3 |
| JAZZ_CONTEXT_BLOCK updated with metricsGrid/chart/watchlist/allocation examples | Task 1 |
| Repair prompt shows all 12 block types | Task 3 |
| Fintech fallback (narrow, jazz-only, collapses 4 cards → metricsGrid) | Task 2 + Task 3 |
| Plugin data markers (dwa-origin, dwa-mode, dwa-screen, dwa-chrome) | Task 4 |
| DW_SCAN_SCREENS handler with traversal + invalid UX | Task 5 |
| ScannedDesignContext injected in prepareMessages | Task 3 |
| Scan context cleared on success, assistant switch, DW_CLEAR_SCAN | Task 3 + Task 5 + Task 8 |
| DW_SCAN_RESULT payload with designMode | Task 5 + Task 8 |
| BottomToolbar rendered unconditionally | Task 6 + Task 8 |
| DW Panel Option A state machine | Task 7 |
| Mode toggle in panel header | Task 7 |
| Scan button always visible, disabled without selection | Task 7 |
| Scan summary chip replaces prompt chips | Task 7 |
| Distinct Clear prompt / Clear scan | Task 7 |
| DEMO disabled in wireframe | Task 7 |
| WIREFRAME_CONTEXT_BLOCK in prepareMessages | Task 1 + Task 3 |
| Fidelity enforcement in buildAndRender | Task 3 |
| useWireframe in renderDesignSpecToSection | Task 3 + Task 4 |
| useChrome condition update | Task 4 |
| Wireframe visual paths (metricsGrid/allocation/watchlist) | Task 4 |
| Archetype-aware tab bar | Task 4 |
| Scan/refine continuity (designMode from scanned section) | Task 5 + Task 8 |
| htmlRenderer wireframe deferral documented | Task 9 |

### Placeholder Scan

No TBD/TODO/placeholder steps. All code blocks contain implementation-ready TypeScript.

### Type Consistency

- `DesignWorkshopPanelProps` defined in Task 7 and consumed in Task 8 — types match.
- `BottomToolbar` props defined in Task 6 and consumed in Task 8 — types match.
- `ScannedDesignContext` from `designWorkshopScanStore.ts` used in Task 5.
- `DwScanScreensHandler / DwClearScanHandler / DwSetDesignModeHandler` defined in `types.ts` (Task 5) and used in `main.ts` (Task 5) and `ui.tsx` (Task 8).
- `detectArchetypeRecipe` / `applyFintechFallback` defined in Task 2, used in Task 3.
- `WIREFRAME_CONTEXT_BLOCK` defined in Task 1, used in Task 3.
- `renderDesignSpecToSection` options gain `useWireframe` in Task 4; Task 3 passes it.
