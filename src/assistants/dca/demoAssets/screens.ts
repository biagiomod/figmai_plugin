/**
 * Demo Screen Builders
 * 
 * Each function creates a complete demo screen for a specific deceptive UX dimension.
 * Screens are deterministic and use the component builders and text styles.
 */

import { createBadge, createText, createSection, createButton, createButtonRow, createCheckbox, createBanner, createCardFrame } from './components'
import { colors, spacing } from './tokens'

/**
 * Create a demo screen frame (360x720, with badge, title, hint, and content area)
 */
async function createDemoScreenFrame(
  title: string,
  hint: string
): Promise<FrameNode> {
  const frame = figma.createFrame()
  frame.name = title
  frame.layoutMode = 'VERTICAL'
  frame.primaryAxisSizingMode = 'FIXED'
  frame.counterAxisSizingMode = 'FIXED'
  frame.paddingTop = spacing['3xl']
  frame.paddingRight = spacing['3xl']
  frame.paddingBottom = spacing['3xl']
  frame.paddingLeft = spacing['3xl']
  frame.itemSpacing = spacing.xl
  frame.resize(360, 720)

  const badge = await createBadge()
  const titleNode = await createText(title, 'title16Bold')
  const hintNode = await createText(hint, 'body12Regular', { name: undefined })

  frame.appendChild(badge)
  frame.appendChild(titleNode)
  frame.appendChild(hintNode)

  return frame
}

/**
 * 1. Forced Action demo screen
 */
export async function createForcedActionDemoScreen(): Promise<FrameNode> {
  const frame = await createDemoScreenFrame(
    'Deceptive Demo — Forced Action',
    'Blocking content until unrelated account creation is completed.'
  )

  const modal = createSection('ForcedAction_Modal', {
    padding: spacing['3xl'],
    spacing: spacing.xl,
    fill: colors.bgBanner
  })

  const heading = await createText('Create an account to continue', 'title16Bold')
  const body = await createText('Access to the article requires account creation.', 'body12Regular')
  const checkbox = await createCheckbox('Email me updates')
  const buttons = await createButtonRow([
    { label: 'Create Account', variant: 'primary' },
    { label: 'Not now', variant: 'secondary' }
  ])

  modal.appendChild(heading)
  modal.appendChild(body)
  modal.appendChild(checkbox)
  modal.appendChild(buttons)
  frame.appendChild(modal)

  frame.locked = true
  return frame
}

/**
 * 2. Nagging demo screen
 */
export async function createNaggingDemoScreen(): Promise<FrameNode> {
  const frame = await createDemoScreenFrame(
    'Deceptive Demo — Nagging',
    'Repeated prompts that reappear after dismissal.'
  )

  const stack = createSection('Nagging_PromptStack', {
    padding: spacing.xl,
    spacing: spacing.md,
    fill: colors.bgBannerAlt
  })

  const prompt1 = await createBanner('Enable Notifications', 'Stay updated with alerts.')
  const prompt2 = await createBanner('Enable Location?', 'We need your location for better results.')

  stack.appendChild(prompt1)
  stack.appendChild(prompt2)
  frame.appendChild(stack)

  frame.locked = true
  return frame
}

/**
 * 3. Obstruction demo screen
 */
export async function createObstructionDemoScreen(): Promise<FrameNode> {
  const frame = await createDemoScreenFrame(
    'Deceptive Demo — Obstruction',
    'Making cancellation difficult through tiny links and extra steps.'
  )

  const info = await createText('Cancel subscription flow requires multiple steps.', 'body12Regular')
  const primary = await createButton('Continue', 'primary')
  const tinyLink = await createText('Cancel subscription', 'helper10Regular', {
    name: 'Obstruction_CancelLinkTiny',
    fillContainer: false
  })

  frame.appendChild(info)
  frame.appendChild(primary)
  frame.appendChild(tinyLink)

  frame.locked = true
  return frame
}

/**
 * 4. Sneaking demo screen
 */
export async function createSneakingDemoScreen(): Promise<FrameNode> {
  const frame = await createDemoScreenFrame(
    'Deceptive Demo — Sneaking',
    'Add-on included without clear disclosure.'
  )

  const summary = await createText('Checkout summary', 'body12Bold')
  const addOn = createSection('Sneaking_AddOnHidden', {
    padding: spacing.lg,
    spacing: spacing.sm,
    fill: colors.bgLighter
  })

  const line = await createText('Protection Plan — already added', 'body12Regular')
  const silent = await createCheckbox('Add to cart (auto-selected)', true)

  addOn.appendChild(line)
  addOn.appendChild(silent)
  frame.appendChild(summary)
  frame.appendChild(addOn)

  frame.locked = true
  return frame
}

/**
 * 5. Interface Interference demo screen
 */
export async function createInterfaceInterferenceDemoScreen(): Promise<FrameNode> {
  const frame = await createDemoScreenFrame(
    'Deceptive Demo — Interface Interference',
    'Visual hierarchy biases toward Accept All.'
  )

  const banner = createSection('Interference_Banner', {
    padding: spacing.xl,
    spacing: spacing.md,
    fill: colors.bgWarning
  })

  const text = await createText('Cookie consent: Choose your preference.', 'body12Regular')
  const actions = await createButtonRow([
    { label: 'Accept all', variant: 'primary' },
    { label: 'Reject', variant: 'ghost', name: 'Interference_RejectDeemphasized' }
  ])

  banner.appendChild(text)
  banner.appendChild(actions)
  frame.appendChild(banner)

  frame.locked = true
  return frame
}

/**
 * 6. False Urgency/Scarcity demo screen
 */
export async function createFalseUrgencyScarcityDemoScreen(): Promise<FrameNode> {
  const frame = await createDemoScreenFrame(
    'Deceptive Demo — False Urgency/Scarcity',
    'Timers and scarcity cues pushing immediate action.'
  )

  const timer = await createText('Offer ends in 04:59', 'urgency14Bold', {
    name: 'FalseUrgency_Timer',
    fillContainer: false
  })
  const badge = await createText('Only 2 left', 'urgency12Bold', {
    name: 'FalseScarcity_Badge',
    fillContainer: false
  })
  const social = await createText('12 people viewing now', 'body12Regular', { fillContainer: false })

  frame.appendChild(timer)
  frame.appendChild(badge)
  frame.appendChild(social)

  frame.locked = true
  return frame
}

/**
 * 7. Confirmshaming demo screen
 */
export async function createConfirmshamingDemoScreen(): Promise<FrameNode> {
  const frame = await createDemoScreenFrame(
    'Deceptive Demo — Confirmshaming',
    'Opt-out text shames the user.'
  )

  const modal = createSection('Confirmshaming_Modal', {
    padding: spacing.xl,
    spacing: spacing.md,
    fill: colors.bgBannerAlt
  })

  const heading = await createText('Subscribe for updates', 'title14Bold')
  const cta = await createButton('Get the deal', 'primary')
  const optOut = await createText('No thanks, I prefer paying full price', 'body12Regular', {
    name: 'Confirmshaming_OptOutCopy',
    fillContainer: false
  })

  modal.appendChild(heading)
  modal.appendChild(cta)
  modal.appendChild(optOut)
  frame.appendChild(modal)

  frame.locked = true
  return frame
}

/**
 * 8. Trick Questions demo screen
 */
export async function createTrickQuestionsDemoScreen(): Promise<FrameNode> {
  const frame = await createDemoScreenFrame(
    'Deceptive Demo — Trick Questions',
    'Inverted meaning and double negatives.'
  )

  const checkbox = await createText('☑ Uncheck this box if you do NOT want to miss updates', 'body12Regular', {
    name: 'TrickQuestions_DoubleNegative',
    fillContainer: false
  })
  const toggle = await createText('Toggle: Off means "Yes, send promos"', 'body12Regular', { fillContainer: false })

  frame.appendChild(checkbox)
  frame.appendChild(toggle)

  frame.locked = true
  return frame
}

/**
 * 9. Hidden Subscription/Roach Motel demo screen
 */
export async function createHiddenSubscriptionDemoScreen(): Promise<FrameNode> {
  const frame = await createDemoScreenFrame(
    'Deceptive Demo — Hidden Subscription',
    'Tiny renewal disclosure; cancel path buried.'
  )

  const trial = await createButton('Start free trial', 'primary')
  const disclosure = await createText('Then $29.99/mo auto-renews', 'helper10Regular', {
    name: 'HiddenSub_TinyDisclosure',
    fillContainer: false
  })
  const maze = await createText('Settings > Account > Manage > Cancel', 'helper11Regular', {
    name: 'RoachMotel_CancelMaze',
    fillContainer: false
  })

  frame.appendChild(trial)
  frame.appendChild(disclosure)
  frame.appendChild(maze)

  frame.locked = true
  return frame
}

/**
 * 10. Misleading Defaults demo screen
 */
export async function createMisleadingDefaultsDemoScreen(): Promise<FrameNode> {
  const frame = await createDemoScreenFrame(
    'Deceptive Demo — Misleading Defaults',
    'Preselected options that favor the business.'
  )

  const group = createSection('MisleadingDefaults_Preselected', {
    padding: spacing.lg,
    spacing: spacing.md,
    fill: colors.bgLighter
  })

  group.appendChild(await createCheckbox('Auto-renew subscription', true))
  group.appendChild(await createCheckbox('Share data with partners', true))
  group.appendChild(await createCheckbox('Add tip 20%', true))

  frame.appendChild(group)

  frame.locked = true
  return frame
}

/**
 * All demo screen builders (ordered by dimension)
 */
export const demoScreenBuilders = [
  createForcedActionDemoScreen,
  createNaggingDemoScreen,
  createObstructionDemoScreen,
  createSneakingDemoScreen,
  createInterfaceInterferenceDemoScreen,
  createFalseUrgencyScarcityDemoScreen,
  createConfirmshamingDemoScreen,
  createTrickQuestionsDemoScreen,
  createHiddenSubscriptionDemoScreen,
  createMisleadingDefaultsDemoScreen
] as const
