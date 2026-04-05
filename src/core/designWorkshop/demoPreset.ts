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

// ─── Dashboard preset ────────────────────────────────────────────────────────
// YTD area chart + portfolio summary tiles + top positions + watchlist

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
            { label: "Day's Gain", value: '$5,572.13', gain: true },
            { label: 'Total Gain', value: '+$13,466.95', gain: true },
            { label: 'Est. Annual Income', value: '$10,997.59' },
            { label: 'Cash & Sweep', value: '$728.46' },
          ]
        },
        // YTD area chart
        { type: 'chart', height: 150, caption: 'YTD performance' },
        // Top positions — all tickers have brand logos in the asset library
        { type: 'heading', text: 'Positions', level: 3 },
        { type: 'card', title: 'AAPL',  content: '$97,869.33 · +2.4%' },
        { type: 'card', title: 'MSFT',  content: '$69,359.97 · +1.1%' },
        { type: 'card', title: 'NVDA',  content: '$54,573.91 · +0.8%' },
        { type: 'card', title: 'AMZN',  content: '$25,893.55 · +3.2%' },
        { type: 'card', title: 'GOOGL', content: '$24,082.26 · +1.9%' },
        { type: 'button', text: 'Showing 5 of 10 positions', variant: 'secondary' },
        // Asset allocation — equity-heavy stock portfolio
        { type: 'allocation', equity: 82.5, fixedIncome: 8.2, altAssets: 9.3, total: '$319k' },
        // Watchlist — defensive stocks, all with brand logos
        {
          type: 'watchlist',
          title: 'Watchlist',
          items: [
            { ticker: 'WMT', price: '$96.34',  change: '+0.44%', gain: true },
            { ticker: 'VZ',  price: '$41.82',  change: '-0.22%', gain: false },
            { ticker: 'MCD', price: '$289.15', change: '+0.67%', gain: true },
          ]
        }
      ]
    }
  ]
}

// ─── Positions preset ─────────────────────────────────────────────────────────
// Full position list — all tickers have brand logos in the asset library

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
        { type: 'card', title: 'AAPL',  content: '$97,869.33 · +2.4%' },
        { type: 'card', title: 'MSFT',  content: '$69,359.97 · +1.1%' },
        { type: 'card', title: 'NVDA',  content: '$54,573.91 · +0.8%' },
        { type: 'card', title: 'AMZN',  content: '$25,893.55 · +3.2%' },
        { type: 'card', title: 'GOOGL', content: '$24,082.26 · +1.9%' },
        { type: 'card', title: 'V',     content: '$18,200.00 · -0.6%' },
        { type: 'card', title: 'KO',    content: '$9,948.30 · +0.1%' },
        { type: 'card', title: 'NKE',   content: '$8,760.00 · +3.4%' },
        { type: 'card', title: 'DIS',   content: '$5,264.03 · -1.2%' },
        { type: 'card', title: 'GS',    content: '$2,100.28 · +0.9%' },
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
        { type: 'heading', text: 'Welcome to FiFi', level: 1 },
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
        { type: 'heading', text: 'Welcome back to FiFi', level: 2 },
        { type: 'bodyText', text: 'Sign in to your account.' },
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
            { label: "Day's Gain", value: '$5,572.13', gain: true },
            { label: 'Total Gain', value: '+$13,466.95', gain: true },
            { label: 'Est. Annual Income', value: '$10,997.59' },
            { label: 'Cash & Sweep', value: '$728.46' },
          ]
        },
        { type: 'chart', height: 120, caption: 'YTD performance' },
        { type: 'heading', text: 'Top Positions', level: 3 },
        { type: 'card', title: 'AAPL', content: '$97,869.33 · +2.4%' },
        { type: 'card', title: 'MSFT', content: '$69,359.97 · +1.1%' },
        { type: 'button', text: 'See All Positions', variant: 'primary' }
      ]
    },
    // 4 — Positions list — all tickers have brand logos in the asset library
    {
      name: 'Positions',
      layout: { direction: 'vertical', padding: 16, gap: 8 },
      blocks: [
        { type: 'card', title: 'Portfolio Value', content: '$319,448.13 · 10 positions' },
        { type: 'card', title: 'Total Gain / Loss', content: '+$13,466.95 (+4.40%)' },
        { type: 'spacer', height: 4 },
        { type: 'card', title: 'AAPL',  content: '$97,869.33 · +1.2%' },
        { type: 'card', title: 'MSFT',  content: '$69,359.97 · −0.3%' },
        { type: 'card', title: 'NVDA',  content: '$54,573.91 · +0.4%' },
        { type: 'card', title: 'AMZN',  content: '$25,893.55 · +2.1%' },
        { type: 'card', title: 'GOOGL', content: '$24,082.26 · +1.8%' },
        { type: 'card', title: 'V',     content: '$18,200.00 · −0.6%' },
        { type: 'card', title: 'KO',    content: '$9,948.30 · +0.1%' },
        { type: 'card', title: 'NKE',   content: '$8,760.00 · +3.4%' },
        { type: 'card', title: 'DIS',   content: '$5,264.03 · −1.2%' },
        { type: 'card', title: 'GS',    content: '$2,100.28 · +0.9%' },
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

// ─── Exact reference preset ───────────────────────────────────────────────────
// Single Portfolio screen matching FigmAI Figma reference design
// figma.com/design/FEytUx9taoFZMjai11T8z2 node-id=28233-31104
// Sections: account balance · metrics · chart · markets · positions ·
//           earn promo · asset allocation · watchlist · investing insights

export const FIFI_EXACT_PRESET: DesignSpecV1 = {
  type: 'designScreens',
  version: 1,
  meta: {
    title: 'FiFi FinTech — Exact',
    userRequest: 'Portfolio summary dashboard: account balance with self-directed label, performance chart with time filters, markets overview, positions summary with tickers, earn promo card, asset allocation donut, watchlist, and investing insights section.',
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
      name: 'Portfolio',
      layout: { direction: 'vertical', padding: 0, gap: 0 },
      blocks: [
        // Account hero — matches "$91,917.48 · Self-Directed" at top of reference
        { type: 'card', title: 'Account Value', content: '$91,917.48 · Self-Directed account' },
        // 4-metric summary — Today's gain/loss, return %, cash, total invested
        {
          type: 'metricsGrid',
          items: [
            { label: "Today's Gain/Loss", value: '−$412.33', gain: false },
            { label: "Today's Return",    value: '−0.97%',   gain: false },
            { label: 'Cash & Money Funds', value: '$8.61' },
            { label: 'Total Invested',    value: '$91,908.87' },
          ]
        },
        // Performance chart — time-filter caption matches YTD/1M/3M/1Y row in reference
        { type: 'chart', height: 160, caption: 'YTD · 1M · 3M · 1Y' },
        // Markets row — indices with changes
        { type: 'heading', text: 'Markets', level: 3 },
        {
          type: 'metricsGrid',
          items: [
            { label: 'DJIA',    value: '46,508.67 −0.13%', gain: false },
            { label: 'NASDAQ',  value: '21,879.18 −0.18%', gain: false },
            { label: 'S&P 500', value: '6,582.69 +0.11%',  gain: true  },
          ]
        },
        // Positions summary — bond-heavy ETFs matching reference
        { type: 'heading', text: 'Positions Summary', level: 3 },
        { type: 'card', title: 'VCSH',  content: '$33,948.42 · fixed income' },
        { type: 'card', title: 'BND',   content: '$23,237.78 · fixed income' },
        { type: 'card', title: 'SCHW',  content: '$10,888.43 · equity'       },
        { type: 'card', title: 'SGOV',  content: '$8,588.98 · cash equiv.'   },
        { type: 'card', title: 'GLDM',  content: '$4,928.08 · alt assets'    },
        { type: 'button', text: 'See all positions', variant: 'secondary' },
        // Earn promo — 3.00% APY matches reference
        { type: 'card', title: 'EARN', content: 'Earn 3.00% APY on your cash with Premium Deposit · Learn more', variant: 'promo' },
        // Asset allocation — bond-heavy matching reference (72% fixed income)
        { type: 'allocation', equity: 22.15, fixedIncome: 72.49, altAssets: 5.36, total: '$91.9k' },
        // Watchlist — defensive ETFs matching reference rows
        {
          type: 'watchlist',
          title: 'Watchlist',
          items: [
            { ticker: 'SPLV', price: '$74.12',  change: '+0.18%', gain: true  },
            { ticker: 'TLT',  price: '$91.82',  change: '+0.85%', gain: true  },
            { ticker: 'VIG',  price: '$193.45', change: '+0.22%', gain: true  },
            { ticker: 'IDU',  price: '$112.33', change: '−0.41%', gain: false },
            { ticker: 'VPU',  price: '$163.18', change: '−0.14%', gain: false },
          ]
        },
        // Investing insights dark section
        { type: 'darkSection', title: 'Investing Insights', body: 'Stay informed with curated articles on portfolio strategy, market analysis, and investment research.' },
        // Primary CTA — matches green "Submit Feedback" button at bottom of reference
        { type: 'button', text: 'Submit Feedback', variant: 'primary' },
      ]
    }
  ]
}

// ─── Tag-based selector ──────────────────────────────────────────────────────

export function getDemoPreset(tag: 'dashboard' | 'positions' | 'flow' | 'screens' | 'exact'): DesignSpecV1 {
  const selected = (() => {
    switch (tag) {
      case 'dashboard': return FIFI_DASHBOARD_PRESET
      case 'positions': return FIFI_POSITIONS_PRESET
      case 'flow':      return FIFI_FLOW_PRESET
      case 'exact':     return FIFI_EXACT_PRESET
      default:          return FIFI_DEMO_PRESET
    }
  })()
  return selected
}

// ─── Build-time validation — throws if any constant is malformed ─────────────

const _presets: Array<[string, DesignSpecV1]> = [
  ['FIFI_DASHBOARD_PRESET', FIFI_DASHBOARD_PRESET],
  ['FIFI_POSITIONS_PRESET', FIFI_POSITIONS_PRESET],
  ['FIFI_FLOW_PRESET',      FIFI_FLOW_PRESET],
  ['FIFI_DEMO_PRESET',      FIFI_DEMO_PRESET],
  ['FIFI_EXACT_PRESET',     FIFI_EXACT_PRESET],
]

for (const [name, preset] of _presets) {
  const result = validateDesignSpecV1(preset)
  if (!result.ok) {
    throw new Error(`[DW-A] ${name} is invalid: ${result.errors.join(', ')}`)
  }
}
