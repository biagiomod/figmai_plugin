/**
 * Design Workshop Helpers
 * Pure TypeScript utilities for archetype recipe detection and fidelity fallbacks.
 * NO Figma API dependencies. No side effects.
 *
 * Run tests: npx tsx src/core/designWorkshop/designWorkshop.helpers.test.ts
 */

import type { DesignIntent, DesignSpecV1, BlockSpec } from './types'

// ---------------------------------------------------------------------------
// Archetype recipes (module-private)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// detectArchetypeRecipe
// ---------------------------------------------------------------------------

/**
 * Returns an archetype recipe string if the intent or request matches a known
 * archetype, or null if no match is found.
 *
 * Resolution order:
 *   1. intent.appType — checked case-insensitively against each archetype's keywords
 *   2. request string — lowercased, scanned against each archetype's keywords
 */
export function detectArchetypeRecipe(intent: DesignIntent, request: string): string | null {
  const appTypeLower = (intent.appType ?? '').toLowerCase()
  const requestLower = request.toLowerCase()

  for (const archetype of Object.values(ARCHETYPE_RECIPES)) {
    if (appTypeLower && archetype.keywords.some(kw => appTypeLower.includes(kw))) {
      return archetype.recipe
    }
  }

  for (const archetype of Object.values(ARCHETYPE_RECIPES)) {
    if (archetype.keywords.some(kw => requestLower.includes(kw))) {
      return archetype.recipe
    }
  }

  return null
}

// ---------------------------------------------------------------------------
// applyFintechFallback
// ---------------------------------------------------------------------------

/** Block types that count as "rich" dashboard blocks — presence means no fallback. */
const RICH_BLOCK_TYPES = new Set(['metricsGrid', 'chart', 'watchlist', 'allocation'])

/** Screen name keywords that qualify a screen for the fallback. */
const DASHBOARD_SCREEN_KEYWORDS = ['dashboard', 'overview', 'portfolio', 'home', 'summary']

/**
 * Deterministic narrow fallback: when an LLM outputs generic card blocks for a
 * fintech/banking dashboard screen but omits richer block types, collapses the
 * first run of 4+ consecutive cards into a single metricsGrid.
 *
 * All 5 conditions must hold to trigger:
 *   1. designMode === 'jazz'
 *   2. spec.meta.intent.appType is 'fintech' or 'banking' (case-insensitive)
 *   3. Screen name (lowercased) contains a dashboard keyword
 *   4. No rich blocks (metricsGrid | chart | watchlist | allocation) in the screen
 *   5. 4+ consecutive card blocks exist in the screen
 *
 * Returns a NEW DesignSpecV1 object — input is never mutated.
 */
export function applyFintechFallback(
  spec: DesignSpecV1,
  designMode: 'jazz' | 'wireframe'
): DesignSpecV1 {
  // Condition 1
  if (designMode !== 'jazz') return spec

  // Condition 2
  const appType = (spec.meta?.intent?.appType ?? '').toLowerCase()
  if (appType !== 'fintech' && appType !== 'banking') return spec

  let anyScreenChanged = false

  const updatedScreens = spec.screens.map(screen => {
    // Condition 3
    const screenNameLower = screen.name.toLowerCase()
    if (!DASHBOARD_SCREEN_KEYWORDS.some(kw => screenNameLower.includes(kw))) {
      return screen
    }

    // Condition 4
    const hasRichBlocks = screen.blocks.some(b => RICH_BLOCK_TYPES.has(b.type))
    if (hasRichBlocks) return screen

    // Condition 5 — find the first run of 4+ consecutive card blocks
    const run = findFirstCardRun(screen.blocks, 4)
    if (run === null) return screen

    // Collapse the run into a metricsGrid
    const { start, end } = run
    const cardBlocks = screen.blocks.slice(start, end + 1)

    const metricsItems = cardBlocks.map(b => {
      // Safe: findFirstCardRun guarantees all blocks in this slice are card type
      const card = b as Extract<BlockSpec, { type: 'card' }>
      return {
        label: card.title ?? '',
        value: card.content
      }
    })

    const newBlocks = [
      ...screen.blocks.slice(0, start),
      { type: 'metricsGrid' as const, items: metricsItems },
      ...screen.blocks.slice(end + 1)
    ]

    anyScreenChanged = true
    return { ...screen, blocks: newBlocks }
  })

  if (!anyScreenChanged) return spec
  return { ...spec, screens: updatedScreens }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Returns the {start, end} indices (inclusive) of the first run of `minLength`
 *  or more consecutive card blocks, or null if no such run exists. */
function findFirstCardRun(
  blocks: DesignSpecV1['screens'][0]['blocks'],
  minLength: number
): { start: number; end: number } | null {
  let runStart = -1
  let runLength = 0

  for (let i = 0; i < blocks.length; i++) {
    if (blocks[i].type === 'card') {
      if (runStart === -1) runStart = i
      runLength++
      if (runLength >= minLength) {
        // Extend to end of full run
        let end = i
        while (end + 1 < blocks.length && blocks[end + 1].type === 'card') {
          end++
        }
        return { start: runStart, end }
      }
    } else {
      runStart = -1
      runLength = 0
    }
  }

  return null
}
