/**
 * FiFi FinTech Demo Presets
 *
 * Typed static DesignSpecV1 constants for the DW-A demo mode.
 * Bypasses LLM and repair path entirely. Validated by validateDesignSpecV1 at import time.
 *
 * Jazz styling applied by renderer when useJazz=true.
 * - Primary CTA buttons (variant "primary") → #128842 green
 * - Secondary buttons (variant "secondary") → #005EB8 blue
 * - All corner radius → 4px
 *
 * Exports:
 *   FIFI_DEMO_PRESET     — full 4-screen flow (legacy, used by demo-screens)
 *   FIFI_DASHBOARD_PRESET — single Dashboard screen with chart (demo-dashboard)
 *   FIFI_POSITIONS_PRESET — single Positions screen (demo-positions)
 *   FIFI_FLOW_PRESET      — 5-screen onboarding→dashboard→positions flow (demo-flow)
 *   getDemoPreset(tag)    — selector for tag-based demo dispatch
 */

import type { DesignSpecV1 } from './types'
import { validateDesignSpecV1 } from './validate'

// ─── Shared canvas / render metadata ────────────────────────────────────────

const MOBILE_CANVAS: DesignSpecV1['canvas'] = {
  device: { kind: 'mobile', width: 375, height: 812 }
}

const HI_FI_RENDER: DesignSpecV1['render'] = {
  intent: {
    fidelity: 'hi',
    styleKeywords: ['jazz', 'enterprise', 'professional'],
    brandTone: 'serious',
    density: 'comfortable'
  }
}

// ─── Dashboard preset — matches reference Image #7 ───────────────────────────
// YTD area chart + portfolio summary tiles + markets + top positions

export const FIFI_DASHBOARD_PRESET: DesignSpecV1 = {
  type: 'designScreens',
  version: 1,
  meta: {
    title: 'FiFi FinTech — Dashboard',
    userRequest: 'Dashboard screen showing portfolio performance chart, summary tiles, market indices, and top positions.',
    intent: {
      appType: 'fintech',
      tone: 'serious',
      keywords: ['modern', 'professional', 'enterprise'],
      fidelity: 'hi',
      density: 'comfortable',
      screenArchetypes: ['dashboard']
    }
  },
  canvas: MOBILE_CANVAS,
  render: HI_FI_RENDER,
  screens: [
    {
      name: 'Dashboard',
      layout: { direction: 'vertical', padding: 0, gap: 0 },
      blocks: [
        // Hero tile
        { type: 'card', title: 'Account Value', content: '$319,448.13 · ▲ +$5,572.13 (+1.78%) today' },
        // 2×2 summary metrics
        {
          type: 'metricsGrid',
          items: [
            { label: "Day's Gain", value: '$0.00' },
            { label: 'Total Gain', value: '+$13,466.95', gain: true },
            { label: 'Est. Annual Income', value: '$10,997.59' },
            { label: 'Cash & Sweep', value: '$728.46' },
          ]
        },
        // YTD area chart
        { type: 'chart', height: 150, caption: 'YTD performance' },
        // Top positions
        { type: 'heading', text: 'Positions', level: 3 },
        { type: 'card', title: 'VTIP', content: '$97,869.33 · +2.4%' },
        { type: 'card', title: 'BND',  content: '$69,359.97 · +1.1%' },
        { type: 'card', title: 'VCSH', content: '$54,573.91 · +0.8%' },
        { type: 'card', title: 'VOO',  content: '$25,893.55 · +3.2%' },
        { type: 'card', title: 'SCHD', content: '$24,082.26 · +1.9%' },
        { type: 'button', text: 'Showing 5 of 10 positions', variant: 'secondary' },
        // Asset allocation
        { type: 'allocation', equity: 23.32, fixedIncome: 74.89, altAssets: 1.79, total: '$319k' },
        // Watchlist
        {
          type: 'watchlist',
          title: 'Recession Investing',
          items: [
            { ticker: 'SPLV', price: '$67.21', change: '+0.32%', gain: true },
            { ticker: 'TLT',  price: '$88.45', change: '-0.18%', gain: false },
            { ticker: 'VIG',  price: '$185.30', change: '+0.91%', gain: true },
          ]
        }
      ]
    }
  ]
}

// ─── Positions preset — matches reference Image #5 ───────────────────────────
// Full ETF position list with ticker logos

export const FIFI_POSITIONS_PRESET: DesignSpecV1 = {
  type: 'designScreens',
  version: 1,
  meta: {
    title: 'FiFi FinTech — Positions',
    userRequest: 'Positions list screen showing all portfolio holdings with ticker logos and performance data.',
    intent: {
      appType: 'fintech',
      tone: 'serious',
      keywords: ['modern', 'professional', 'enterprise'],
      fidelity: 'hi',
      density: 'comfortable',
      screenArchetypes: ['list']
    }
  },
  canvas: MOBILE_CANVAS,
  render: HI_FI_RENDER,
  screens: [
    {
      name: 'Positions',
      layout: { direction: 'vertical', padding: 16, gap: 8 },
      blocks: [
        { type: 'card', title: 'Portfolio Value', content: '$319,448.13 · 10 positions' },
        { type: 'card', title: 'Total Gain / Loss', content: '+$13,466.95 (+4.40%)' },
        { type: 'spacer', height: 4 },
        { type: 'card', title: 'VTIP',  content: '$97,869.33 · +2.4%' },
        { type: 'card', title: 'BND',   content: '$69,359.97 · +1.1%' },
        { type: 'card', title: 'VCSH',  content: '$54,573.91 · +0.8%' },
        { type: 'card', title: 'VOO',   content: '$25,893.55 · +3.2%' },
        { type: 'card', title: 'SCHD',  content: '$24,082.26 · +1.9%' },
        { type: 'card', title: 'VDC',   content: '$18,200.00 · -0.6%' },
        { type: 'card', title: 'SGOV',  content: '$9,948.30 · +0.1%' },
        { type: 'card', title: 'GLDM',  content: '$8,760.00 · +3.4%' },
        { type: 'card', title: 'JPM',   content: '$2,100.28 · +0.9%' },
        { type: 'spacer', height: 8 },
        { type: 'button', text: 'Add Position', variant: 'primary' }
      ]
    }
  ]
}

// ─── Flow preset — 5-screen onboarding → dashboard → positions ───────────────

export const FIFI_FLOW_PRESET: DesignSpecV1 = {
  type: 'designScreens',
  version: 1,
  meta: {
    title: 'FiFi FinTech — Full Flow',
    userRequest: 'Complete user journey: splash screen → sign in → dashboard with chart → positions list → add position.',
    intent: {
      appType: 'fintech',
      tone: 'serious',
      keywords: ['modern', 'professional', 'enterprise'],
      fidelity: 'hi',
      density: 'comfortable',
      screenArchetypes: ['onboarding', 'auth', 'dashboard', 'list', 'form']
    }
  },
  canvas: MOBILE_CANVAS,
  render: HI_FI_RENDER,
  screens: [
    // 1 — Splash (h1 is correct here — only splash)
    {
      name: 'Welcome',
      layout: { direction: 'vertical', padding: 24, gap: 16 },
      blocks: [
        { type: 'spacer', height: 48 },
        { type: 'heading', text: 'Manage your portfolio', level: 1 },
        { type: 'bodyText', text: 'Track positions, monitor performance, and act on opportunities — all in one place.' },
        { type: 'spacer', height: 32 },
        { type: 'button', text: 'Get Started', variant: 'primary' },
        { type: 'button', text: 'Sign In', variant: 'secondary' }
      ]
    },
    // 2 — Auth
    {
      name: 'Sign In',
      layout: { direction: 'vertical', padding: 24, gap: 12 },
      blocks: [
        { type: 'spacer', height: 24 },
        { type: 'heading', text: 'Welcome back', level: 2 },
        { type: 'bodyText', text: 'Sign in to your FiFi account.' },
        { type: 'spacer', height: 8 },
        { type: 'input', label: 'Email Address', placeholder: 'your@email.com', inputType: 'email' },
        { type: 'input', label: 'Password', placeholder: 'Enter your password', inputType: 'password' },
        { type: 'spacer', height: 16 },
        { type: 'button', text: 'Sign In', variant: 'primary' },
        { type: 'button', text: 'Forgot password?', variant: 'tertiary' }
      ]
    },
    // 3 — Dashboard with chart
    {
      name: 'Dashboard',
      layout: { direction: 'vertical', padding: 0, gap: 0 },
      blocks: [
        { type: 'card', title: 'Account Value', content: '$319,448.13 · ▲ +$5,572.13 (+1.78%)' },
        {
          type: 'metricsGrid',
          items: [
            { label: "Day's Gain", value: '$0.00' },
            { label: 'Total Gain', value: '+$13,466.95', gain: true },
            { label: 'Est. Annual Income', value: '$10,997.59' },
            { label: 'Cash & Sweep', value: '$728.46' },
          ]
        },
        { type: 'chart', height: 120, caption: 'YTD performance' },
        { type: 'heading', text: 'Top Positions', level: 3 },
        { type: 'card', title: 'VTIP', content: '$97,869.33 · +2.4%' },
        { type: 'card', title: 'BND',  content: '$69,359.97 · +1.1%' },
        { type: 'button', text: 'See All Positions', variant: 'primary' }
      ]
    },
    // 4 — Positions list
    {
      name: 'Positions',
      layout: { direction: 'vertical', padding: 16, gap: 8 },
      blocks: [
        { type: 'card', title: 'Portfolio Value', content: '$319,448.13 · 9 positions' },
        { type: 'card', title: 'Total Gain / Loss', content: '+$13,466.95 (+4.40%)' },
        { type: 'spacer', height: 4 },
        { type: 'card', title: 'VTIP',  content: '$97,869.33 · +1.2%' },
        { type: 'card', title: 'BND',   content: '$69,359.97 · −0.3%' },
        { type: 'card', title: 'VCSH',  content: '$48,210.50 · +0.4%' },
        { type: 'card', title: 'VOO',   content: '$44,820.00 · +2.1%' },
        { type: 'card', title: 'SCHD',  content: '$28,540.75 · +1.8%' },
        { type: 'card', title: 'VDC',   content: '$18,200.00 · −0.6%' },
        { type: 'card', title: 'SGOV',  content: '$9,948.30 · +0.1%' },
        { type: 'card', title: 'GLDM',  content: '$8,760.00 · +3.4%' },
        { type: 'card', title: 'JPM',   content: '$2,100.28 · +0.9%' },
        { type: 'button', text: 'Add Position', variant: 'primary' }
      ]
    },
    // 5 — Add Position form
    {
      name: 'Add Position',
      layout: { direction: 'vertical', padding: 24, gap: 12 },
      blocks: [
        { type: 'spacer', height: 8 },
        { type: 'heading', text: 'Add Position', level: 2 },
        { type: 'bodyText', text: 'Enter the ticker symbol and number of shares to add to your portfolio.' },
        { type: 'spacer', height: 8 },
        { type: 'input', label: 'Ticker Symbol', placeholder: 'e.g. AAPL', inputType: 'text' },
        { type: 'input', label: 'Shares', placeholder: 'Number of shares', inputType: 'text' },
        { type: 'input', label: 'Purchase Price (per share)', placeholder: '$0.00', inputType: 'text' },
        { type: 'input', label: 'Purchase Date', placeholder: 'MM/DD/YYYY', inputType: 'text' },
        { type: 'spacer', height: 16 },
        { type: 'button', text: 'Add to Portfolio', variant: 'primary' },
        { type: 'button', text: 'Cancel', variant: 'tertiary' }
      ]
    }
  ]
}

// ─── Full-flow preset (legacy — used by demo-screens) ────────────────────────

export const FIFI_DEMO_PRESET: DesignSpecV1 = {
  type: 'designScreens',
  version: 1,
  meta: {
    title: 'FiFi FinTech — Demo',
    userRequest: 'Generate mobile screens for an investment portfolio app called FiFi: a splash screen, sign-in form, dashboard with portfolio metrics, and a positions list.',
    intent: {
      appType: 'fintech',
      tone: 'serious',
      keywords: ['modern', 'professional', 'enterprise'],
      fidelity: 'hi',
      density: 'comfortable',
      screenArchetypes: ['onboarding', 'auth', 'dashboard', 'list']
    }
  },
  canvas: MOBILE_CANVAS,
  render: HI_FI_RENDER,
  screens: FIFI_FLOW_PRESET.screens.slice(0, 4)   // Welcome, Sign In, Dashboard, Positions
}

// ─── Tag-based selector ──────────────────────────────────────────────────────

export function getDemoPreset(tag: 'dashboard' | 'positions' | 'flow' | 'screens'): DesignSpecV1 {
  switch (tag) {
    case 'dashboard': return FIFI_DASHBOARD_PRESET
    case 'positions': return FIFI_POSITIONS_PRESET
    case 'flow':      return FIFI_FLOW_PRESET
    default:          return FIFI_DEMO_PRESET
  }
}

// ─── Build-time validation — throws if any constant is malformed ─────────────

const _presets: Array<[string, DesignSpecV1]> = [
  ['FIFI_DASHBOARD_PRESET', FIFI_DASHBOARD_PRESET],
  ['FIFI_POSITIONS_PRESET', FIFI_POSITIONS_PRESET],
  ['FIFI_FLOW_PRESET',      FIFI_FLOW_PRESET],
  ['FIFI_DEMO_PRESET',      FIFI_DEMO_PRESET],
]

for (const [name, preset] of _presets) {
  const result = validateDesignSpecV1(preset)
  if (!result.ok) {
    throw new Error(`[DW-A] ${name} is invalid: ${result.errors.join(', ')}`)
  }
}
