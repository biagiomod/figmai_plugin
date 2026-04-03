/**
 * FiFi FinTech Demo Preset
 *
 * Typed static DesignSpecV1 constant for the DW-A demo mode.
 * Bypasses LLM and repair path entirely. Validated by validateDesignSpecV1 at import time.
 *
 * Jazz styling applied by renderer when useJazz=true.
 * - Primary CTA buttons (variant "primary") → #128842 green
 * - Secondary buttons (variant "secondary") → #005EB8 blue
 * - All corner radius → 4px
 */

import type { DesignSpecV1 } from './types'
import { validateDesignSpecV1 } from './validate'

export const FIFI_DEMO_PRESET: DesignSpecV1 = {
  type: 'designScreens',
  version: 1,
  meta: {
    title: 'FiFi FinTech — Demo',
    userRequest: 'Generate mobile screens for the onboarding experience and a dashboard for a FinTech app called FiFi using the accent color green.',
    intent: {
      appType: 'fintech',
      tone: 'serious',
      keywords: ['modern', 'professional'],
      fidelity: 'hi',
      density: 'comfortable',
      screenArchetypes: ['onboarding', 'dashboard']
    }
  },
  canvas: {
    device: {
      kind: 'mobile',
      width: 375,
      height: 812
    }
  },
  render: {
    intent: {
      fidelity: 'hi',
      styleKeywords: ['jazz', 'enterprise', 'professional'],
      brandTone: 'serious',
      density: 'comfortable'
    }
  },
  screens: [
    {
      name: 'Welcome',
      layout: { direction: 'vertical', padding: 24, gap: 16 },
      blocks: [
        { type: 'spacer', height: 48 },
        { type: 'heading', text: 'Welcome to FiFi', level: 1 },
        { type: 'bodyText', text: 'Your intelligent financial companion. Manage accounts, track spending, and grow your wealth.' },
        { type: 'spacer', height: 32 },
        { type: 'button', text: 'Get Started', variant: 'primary' },
        { type: 'button', text: 'Sign In', variant: 'secondary' },
        { type: 'spacer', height: 24 },
        { type: 'bodyText', text: 'Trusted by over 50,000 users worldwide.' }
      ]
    },
    {
      name: 'Set Up Your Account',
      layout: { direction: 'vertical', padding: 24, gap: 16 },
      blocks: [
        { type: 'heading', text: 'Set Up Your Account', level: 1 },
        { type: 'bodyText', text: 'Tell us a bit about yourself to personalise your FiFi experience.' },
        { type: 'spacer', height: 16 },
        { type: 'input', label: 'Full Name', placeholder: 'Enter your full name', inputType: 'text' },
        { type: 'input', label: 'Email Address', placeholder: 'your@email.com', inputType: 'email' },
        { type: 'input', label: 'Password', placeholder: 'Create a password', inputType: 'password' },
        { type: 'spacer', height: 8 },
        { type: 'button', text: 'Continue', variant: 'primary' },
        { type: 'button', text: 'Back', variant: 'secondary' }
      ]
    },
    {
      name: 'Dashboard',
      layout: { direction: 'vertical', padding: 24, gap: 16 },
      blocks: [
        { type: 'heading', text: 'Good Morning', level: 1 },
        { type: 'bodyText', text: "Here's your financial summary for today." },
        { type: 'spacer', height: 8 },
        { type: 'card', title: 'Total Balance', content: '$24,530.00' },
        { type: 'card', title: 'Monthly Spending', content: '$1,842.50 spent this month' },
        { type: 'card', title: 'Savings Goal', content: '72% of $10,000 goal reached' },
        { type: 'spacer', height: 16 },
        { type: 'button', text: 'Transfer Funds', variant: 'primary' },
        { type: 'button', text: 'View Transactions', variant: 'secondary' }
      ]
    }
  ]
}

// Validate preset at module load — throws if constant is malformed.
// This is a build-time safety net: any drift in the constant is caught immediately.
const _presetValidation = validateDesignSpecV1(FIFI_DEMO_PRESET)
if (!_presetValidation.ok) {
  throw new Error(
    `[DW-A] FIFI_DEMO_PRESET is invalid: ${_presetValidation.errors.join(', ')}`
  )
}
