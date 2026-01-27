/**
 * Deceptive Nagging Card Component
 * 
 * Centralized card component for "Deceptive Demo — Nagging" pattern.
 * This is the single source of truth for this card UI element.
 * 
 * Can be used by:
 * - Demo screen builders
 * - Artifact components
 * - Other assistants/quick actions
 */

import { colors, fonts } from '../../../../assistants/dca/demoAssets/tokens'
import { rgbToPaint, applyAutoLayout, ensureFontsLoaded, setDashedStroke } from '../../../../assistants/dca/demoAssets/primitives'
import { debug } from '../../../debug/logger'

/**
 * Options for creating a Nagging card
 */
export interface NaggingCardOptions {
  /** Root container frame name (default: "Deceptive Demo — Nagging") */
  name?: string
  /** Dash pattern for stroke (default: [4, 4]) */
  dashPattern?: number[]
}

/**
 * Create a Nagging card component
 * 
 * This is the centralized implementation that should be used by all consumers.
 * Creates the full container hierarchy: root frame with badge, details, instructions, and UI Demo.
 * 
 * @param options - Card content and styling options
 * @returns FrameNode containing the complete card container
 */
export async function createDeceptiveNaggingCard(
  options: NaggingCardOptions = {}
): Promise<FrameNode> {
  const componentDebug = debug.scope('subsystem:artifacts')
  
  const dashPattern = options.dashPattern ?? [4, 4] // Default dash pattern

  // Load required fonts
  await ensureFontsLoaded(fonts.inter, ['Bold', 'Regular'])

  // ============================================
  // ROOT CONTAINER FRAME "Deceptive Demo — Nagging"
  // Spec: flex, width 320px, padding 16px, column, align-items flex-start, gap 24px.
  // Height omitted = hug (primaryAxisSizingMode AUTO only; no fixed height).
  // ============================================
  const root = figma.createFrame()
  root.name = options.name ?? 'Deceptive Demo — Nagging'

  applyAutoLayout(root, {
    direction: 'VERTICAL',
    padding: 16,
    itemSpacing: 24,
    primaryAxisSizingMode: 'AUTO', // height: hug (no fixed height)
    counterAxisSizingMode: 'FIXED' // width: 320px (set after children)
  })
  root.counterAxisAlignItems = 'MIN' // align-items: flex-start

  root.fills = [rgbToPaint(colors.bgWhite)]
  root.cornerRadius = 12
  root.clipsContent = true

  // ============================================
  // 1. DEMO BADGE
  // ============================================
  const badge = figma.createFrame()
  badge.name = 'DemoBadge'
  applyAutoLayout(badge, {
    direction: 'HORIZONTAL',
    padding: { top: 8, right: 12, bottom: 8, left: 12 }, // Same as Forced Action
    itemSpacing: 6, // Same as Forced Action
    primaryAxisSizingMode: 'AUTO',
    counterAxisSizingMode: 'AUTO'
  })
  badge.cornerRadius = 8 // Same as Forced Action
  badge.fills = [rgbToPaint({ r: 1, g: 0.77673286, b: 0.58137393 })] // Warm peach
  badge.clipsContent = true
  
  const badgeText = figma.createText()
  badgeText.fontName = { family: fonts.inter, style: 'Bold' }
  badgeText.fontSize = 11 // Same as Forced Action
  badgeText.fills = [rgbToPaint({ r: 0.2, g: 0.25, b: 0.32 })] // Same as Forced Action
  badgeText.characters = 'DEMO — Intentional Dark Pattern'
  badgeText.layoutGrow = 0
  badgeText.textAutoResize = 'WIDTH_AND_HEIGHT'
  badge.appendChild(badgeText)
  root.appendChild(badge)

  // ============================================
  // 2. DETAILS BLOCK
  // ============================================
  const details = figma.createFrame()
  details.name = 'Details'
  applyAutoLayout(details, {
    direction: 'VERTICAL',
    itemSpacing: 8, // Same as Forced Action
    primaryAxisSizingMode: 'AUTO',
    counterAxisSizingMode: 'AUTO' // Allows children to stretch to fill width
  })
  details.fills = []
  root.appendChild(details)
  // Set stretch behavior: fill root width
  details.layoutSizingHorizontal = 'FILL'
  
  // Title: "Nagging"
  const detailsTitle = figma.createText()
  detailsTitle.fontName = { family: fonts.inter, style: 'Bold' }
  detailsTitle.fontSize = 16 // Same as Forced Action
  detailsTitle.fills = [rgbToPaint({ r: 0.1, g: 0.1, b: 0.1 })] // Same as Forced Action
  detailsTitle.characters = 'Nagging'
  details.appendChild(detailsTitle)
  // Set stretch behavior: fill width, wrap height
  detailsTitle.layoutSizingHorizontal = 'FILL'
  detailsTitle.textAutoResize = 'HEIGHT'
  
  // Description: "Repeated prompts that reappear after dismissal."
  const detailsDesc = figma.createText()
  detailsDesc.fontName = { family: fonts.inter, style: 'Regular' }
  detailsDesc.fontSize = 12 // Same as Forced Action
  detailsDesc.fills = [rgbToPaint({ r: 0.35, g: 0.35, b: 0.35 })] // Same as Forced Action
  detailsDesc.characters = 'Repeated prompts that reappear after dismissal.'
  details.appendChild(detailsDesc)
  // Set stretch behavior: fill width, wrap height
  detailsDesc.layoutSizingHorizontal = 'FILL'
  detailsDesc.textAutoResize = 'HEIGHT'

  // ============================================
  // 3. INSTRUCTIONS BLOCK
  // ============================================
  const instructions = figma.createFrame()
  instructions.name = 'Instructions'
  applyAutoLayout(instructions, {
    direction: 'VERTICAL',
    itemSpacing: 8, // Same as Forced Action
    primaryAxisSizingMode: 'AUTO',
    counterAxisSizingMode: 'AUTO' // Allows children to stretch to fill width
  })
  instructions.fills = []
  root.appendChild(instructions)
  // Set stretch behavior: fill root width
  instructions.layoutSizingHorizontal = 'FILL'
  
  // Label: "Instructions"
  const instructionsLabel = figma.createText()
  instructionsLabel.fontName = { family: fonts.inter, style: 'Bold' }
  instructionsLabel.fontSize = 12 // Same as Forced Action
  instructionsLabel.fills = [rgbToPaint({ r: 0.1, g: 0.1, b: 0.1 })] // Same as Forced Action
  instructionsLabel.characters = 'Instructions'
  instructions.appendChild(instructionsLabel)
  // Set stretch behavior: fill width, wrap height
  instructionsLabel.layoutSizingHorizontal = 'FILL'
  instructionsLabel.textAutoResize = 'HEIGHT'
  
  // Body: "Select the below test content group\nClick the plugin Quick Action "Deceptive Review" to test"
  const instructionsBody = figma.createText()
  instructionsBody.fontName = { family: fonts.inter, style: 'Regular' }
  instructionsBody.fontSize = 10 // Same as Forced Action
  instructionsBody.fills = [rgbToPaint({ r: 0.35, g: 0.35, b: 0.35 })] // Same as Forced Action
  instructionsBody.characters = 'Select the below test content group\nClick the plugin Quick Action "Deceptive Review" to test'
  instructions.appendChild(instructionsBody)
  // Set stretch behavior: fill width, wrap height
  instructionsBody.layoutSizingHorizontal = 'FILL'
  instructionsBody.textAutoResize = 'HEIGHT'

  // ============================================
  // 4. UI DEMO BLOCK (inner dashed card)
  // Spec: flex, padding 16px, column, align-items flex-start, gap 16px, align-self stretch.
  // Flex property omitted = no flex: 1 0 0; height must hug (layoutGrow 0).
  // ============================================
  const UI_DEMO_CONTENT_WIDTH = 256 // container width (288 when in root) minus padding (16*2)

  const uiDemo = figma.createFrame()
  uiDemo.name = 'UI Demo'

  applyAutoLayout(uiDemo, {
    direction: 'VERTICAL',
    padding: 16,
    itemSpacing: 16,
    primaryAxisSizingMode: 'AUTO', // height: hug
    counterAxisSizingMode: 'AUTO'   // width from parent (align-self stretch)
  })
  uiDemo.counterAxisAlignItems = 'MIN' // align-items: flex-start

  uiDemo.fills = [rgbToPaint({ r: 0.96, g: 0.96, b: 1.0 })]
  uiDemo.cornerRadius = 12
  uiDemo.clipsContent = true
  uiDemo.strokeAlign = 'INSIDE'
  setDashedStroke(uiDemo, {
    color: { r: 1.0, g: 0.5666667, b: 0.0 },
    weight: 2,
    dashPattern: dashPattern
  })

  // 1) Title: "Enable Notifications" — Inter Bold 16, fill rgb(0.1,0.1,0.1)
  const titleText = figma.createText()
  titleText.fontName = { family: fonts.inter, style: 'Bold' }
  titleText.fontSize = 16
  titleText.fills = [rgbToPaint({ r: 0.1, g: 0.1, b: 0.1 })]
  titleText.characters = 'Enable Notifications'
  titleText.textAlignHorizontal = 'LEFT'
  titleText.textAlignVertical = 'TOP'
  titleText.textAutoResize = 'HEIGHT'
  titleText.resize(UI_DEMO_CONTENT_WIDTH, 19)
  uiDemo.appendChild(titleText)
  titleText.layoutSizingHorizontal = 'FILL'

  // 2) Body line 1
  const body1 = figma.createText()
  body1.fontName = { family: fonts.inter, style: 'Regular' }
  body1.fontSize = 12
  body1.fills = [rgbToPaint({ r: 0.1, g: 0.1, b: 0.1 })]
  body1.characters = "We noticed you didn't enable notifications when you installed the app."
  body1.textAutoResize = 'HEIGHT'
  body1.resize(UI_DEMO_CONTENT_WIDTH, 30)
  uiDemo.appendChild(body1)
  body1.layoutSizingHorizontal = 'FILL'

  // 3) Body line 2
  const body2 = figma.createText()
  body2.fontName = { family: fonts.inter, style: 'Regular' }
  body2.fontSize = 12
  body2.fills = [rgbToPaint({ r: 0.1, g: 0.1, b: 0.1 })]
  body2.characters = 'Notifications help you stay informed about important updates.'
  body2.textAutoResize = 'HEIGHT'
  body2.resize(UI_DEMO_CONTENT_WIDTH, 30)
  uiDemo.appendChild(body2)
  body2.layoutSizingHorizontal = 'FILL'

  // 4) ButtonRow — HORIZONTAL, itemSpacing 8; single "Enable Notifications" button
  const buttonRow = figma.createFrame()
  buttonRow.name = 'ButtonRow'
  applyAutoLayout(buttonRow, {
    direction: 'HORIZONTAL',
    itemSpacing: 8,
    primaryAxisSizingMode: 'AUTO',
    counterAxisSizingMode: 'AUTO'
  })
  buttonRow.fills = []

  const button = figma.createFrame()
  button.name = 'Button_Create Account'
  applyAutoLayout(button, {
    direction: 'HORIZONTAL',
    padding: { top: 12, right: 16, bottom: 12, left: 16 },
    itemSpacing: 0,
    primaryAxisSizingMode: 'AUTO',
    counterAxisSizingMode: 'AUTO'
  })
  button.fills = [rgbToPaint(colors.primary)]
  button.cornerRadius = 6

  const buttonLabel = figma.createText()
  buttonLabel.fontName = { family: fonts.inter, style: 'Bold' }
  buttonLabel.fontSize = 12
  buttonLabel.fills = [rgbToPaint(colors.textOnPrimary)]
  buttonLabel.characters = 'Enable Notifications'
  buttonLabel.textAutoResize = 'WIDTH_AND_HEIGHT'
  button.appendChild(buttonLabel)
  buttonRow.appendChild(button)
  uiDemo.appendChild(buttonRow)

  root.appendChild(uiDemo)
  // Must set layoutGrow = 0 first so UI Demo does not fill vertical space (no flex: 1 0 0)
  uiDemo.layoutGrow = 0
  uiDemo.layoutSizingHorizontal = 'FILL' // align-self: stretch (width only)

  // Fix width 320px; height stays hug (primaryAxisSizingMode AUTO, no fixed height)
  root.resize(320, root.height)

  // Debug log: confirm structure created
  if (debug.isEnabled('subsystem:artifacts')) {
    componentDebug.log('createDeceptiveNaggingCard: structure created', {
      rootName: root.name,
      childrenCount: root.children.length,
      width: root.width,
      height: root.height,
      children: root.children.map(c => ({ name: c.name, type: c.type }))
    })
  }

  return root
}
