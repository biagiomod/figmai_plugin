/**
 * Deceptive Forced Action Card Component
 * 
 * Centralized card component for "Deceptive Demo — Forced Action" pattern.
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
 * Options for creating a Forced Action card
 */
export interface ForcedActionCardOptions {
  /** Card heading text (default: "Create an account to continue") */
  title?: string
  /** Card body text (default: "Access to the article requires account creation.") */
  body?: string
  /** Checkbox label (if provided, checkbox is included) */
  checkboxLabel?: string
  /** Checkbox checked state (default: false) */
  checkboxChecked?: boolean
  /** Primary button label (default: "Create Account") */
  primaryButtonLabel?: string
  /** Secondary button label (default: "Not now") */
  secondaryButtonLabel?: string
  /** Root container frame name (default: "Deceptive Demo — Forced Action") */
  name?: string
  /** Dash pattern for stroke (default: [4, 4]) */
  dashPattern?: number[]
}

/**
 * Create a Forced Action card component
 * 
 * This is the centralized implementation that should be used by all consumers.
 * Creates the full container hierarchy: root frame with badge, details, instructions, and UI Demo.
 * 
 * @param options - Card content and styling options
 * @returns FrameNode containing the complete card container
 */
export async function createDeceptiveForcedActionCard(
  options: ForcedActionCardOptions = {}
): Promise<FrameNode> {
  const componentDebug = debug.scope('subsystem:artifacts')
  
  // Default content matching the JSON spec
  const title = options.title ?? 'Create an account to continue'
  const body = options.body ?? 'Access to the article requires account creation.'
  const checkboxLabel = options.checkboxLabel ?? 'Email me updates'
  const checkboxChecked = options.checkboxChecked ?? false
  const primaryButtonLabel = options.primaryButtonLabel ?? 'Create Account'
  const secondaryButtonLabel = options.secondaryButtonLabel ?? 'Not now'
  const dashPattern = options.dashPattern ?? [4, 4] // Default dash pattern

  // Load required fonts
  await ensureFontsLoaded(fonts.inter, ['Bold', 'Regular'])

  // ============================================
  // ROOT CONTAINER FRAME
  // ============================================
  const root = figma.createFrame()
  root.name = 'Deceptive Demo — Forced Action'
  
  // Configure auto-layout (matches JSON spec: VERTICAL, padding 16, itemSpacing 24)
  // counterAxisSizingMode: 'AUTO' allows children to determine width, enabling text wrapping
  applyAutoLayout(root, {
    direction: 'VERTICAL',
    padding: 16, // JSON spec: padding 16 all sides
    itemSpacing: 24, // JSON spec: itemSpacing 24
    primaryAxisSizingMode: 'AUTO',
    counterAxisSizingMode: 'AUTO' // Allows children to stretch to fill width
  })
  
  // Apply styling (matches JSON spec: white fill, radius 12, clipsContent true)
  root.fills = [rgbToPaint(colors.bgWhite)] // JSON spec: white (#FFFFFF)
  root.cornerRadius = 12 // JSON spec: cornerRadius 12
  root.clipsContent = true // JSON spec: clipsContent true

  // ============================================
  // 1. DEMO BADGE
  // ============================================
  const badge = figma.createFrame()
  badge.name = 'DemoBadge'
  applyAutoLayout(badge, {
    direction: 'HORIZONTAL',
    padding: { top: 8, right: 12, bottom: 8, left: 12 }, // JSON spec: paddingLeft/Right 12, paddingTop/Bottom 8
    itemSpacing: 6, // JSON spec: itemSpacing 6
    primaryAxisSizingMode: 'AUTO',
    counterAxisSizingMode: 'AUTO'
  })
  badge.cornerRadius = 8 // JSON spec: cornerRadius 8
  badge.fills = [rgbToPaint({ r: 1, g: 0.77673286, b: 0.58137393 })] // JSON spec: warm peach
  badge.clipsContent = true // JSON spec: clipsContent true
  
  const badgeText = figma.createText()
  badgeText.fontName = { family: fonts.inter, style: 'Bold' }
  badgeText.fontSize = 11 // JSON spec: Inter Bold, 11
  badgeText.fills = [rgbToPaint({ r: 0.2, g: 0.25, b: 0.32 })] // JSON spec: rgb(0.2, 0.25, 0.32)
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
    itemSpacing: 8, // JSON spec: itemSpacing 8
    primaryAxisSizingMode: 'AUTO',
    counterAxisSizingMode: 'AUTO' // Allows children to stretch to fill width
  })
  details.fills = []
  root.appendChild(details)
  // Set stretch behavior: fill root width
  details.layoutSizingHorizontal = 'FILL'
  
  // Title: "Deceptive Demo — Forced Action"
  const detailsTitle = figma.createText()
  detailsTitle.fontName = { family: fonts.inter, style: 'Bold' }
  detailsTitle.fontSize = 16 // JSON spec: Inter Bold 16
  detailsTitle.fills = [rgbToPaint({ r: 0.1, g: 0.1, b: 0.1 })] // JSON spec: rgb(0.1, 0.1, 0.1)
  detailsTitle.characters = 'Deceptive Demo — Forced Action'
  details.appendChild(detailsTitle)
  // Set stretch behavior: fill width, wrap height
  detailsTitle.layoutSizingHorizontal = 'FILL'
  detailsTitle.textAutoResize = 'HEIGHT'
  
  // Description: "Blocking content until unrelated account creation is completed."
  const detailsDesc = figma.createText()
  detailsDesc.fontName = { family: fonts.inter, style: 'Regular' }
  detailsDesc.fontSize = 12 // JSON spec: Inter Regular 12
  detailsDesc.fills = [rgbToPaint({ r: 0.35, g: 0.35, b: 0.35 })] // JSON spec: rgb(0.35, 0.35, 0.35)
  detailsDesc.characters = 'Blocking content until unrelated account creation is completed.'
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
    itemSpacing: 8, // JSON spec: itemSpacing 8
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
  instructionsLabel.fontSize = 12 // JSON spec: Inter Bold 12
  instructionsLabel.fills = [rgbToPaint({ r: 0.1, g: 0.1, b: 0.1 })] // JSON spec: rgb(0.1, 0.1, 0.1)
  instructionsLabel.characters = 'Instructions'
  instructions.appendChild(instructionsLabel)
  // Set stretch behavior: fill width, wrap height
  instructionsLabel.layoutSizingHorizontal = 'FILL'
  instructionsLabel.textAutoResize = 'HEIGHT'
  
  // Body: "Select the below test content group\nClick the plugin Quick Action "Deceptive Review" to test"
  // Note: Using line break character; if bullet styling is needed, it would require more complex text formatting
  const instructionsBody = figma.createText()
  instructionsBody.fontName = { family: fonts.inter, style: 'Regular' }
  instructionsBody.fontSize = 10 // JSON spec: fontSize 10 (Inter Regular unless specified)
  instructionsBody.fills = [rgbToPaint({ r: 0.35, g: 0.35, b: 0.35 })] // JSON spec: rgb(0.35, 0.35, 0.35)
  instructionsBody.characters = 'Select the below test content group\nClick the plugin Quick Action "Deceptive Review" to test'
  instructions.appendChild(instructionsBody)
  // Set stretch behavior: fill width, wrap height
  instructionsBody.layoutSizingHorizontal = 'FILL'
  instructionsBody.textAutoResize = 'HEIGHT'

  // ============================================
  // 4. UI DEMO BLOCK (inner dashed card)
  // ============================================
  const uiDemo = figma.createFrame()
  uiDemo.name = 'UI Demo'
  
  // Configure auto-layout (matches JSON spec exactly)
  applyAutoLayout(uiDemo, {
    direction: 'VERTICAL',
    padding: 16, // JSON spec: padding 16 all sides
    itemSpacing: 16, // JSON spec: itemSpacing 16
    primaryAxisSizingMode: 'AUTO',
    counterAxisSizingMode: 'AUTO' // Allows children to stretch to fill width
  })

  // Apply styling (matches JSON spec exactly)
  // Fill: rgb(0.96, 0.96, 1.0) - light blue tint
  uiDemo.fills = [rgbToPaint({ r: 0.96, g: 0.96, b: 1.0 })]
  uiDemo.cornerRadius = 12 // JSON spec: cornerRadius 12
  uiDemo.clipsContent = true // JSON spec: clipsContent true

  // Apply dashed stroke (matches JSON spec: stroke rgb(1, 0.56666666, 0.0), strokeWeight 2)
  // Note: JSON doesn't include dash pattern fields, so we use setDashedStroke with configurable pattern
  setDashedStroke(uiDemo, {
    color: { r: 1, g: 0.56666666, b: 0.0 }, // Orange stroke from JSON spec
    weight: 2, // JSON spec: strokeWeight 2
    dashPattern: dashPattern
  })

  // Create heading (matches JSON spec: Inter Bold 16, fill rgb(0.1,0.1,0.1))
  const headingNode = figma.createText()
  headingNode.fontName = { family: fonts.inter, style: 'Bold' }
  headingNode.fontSize = 16
  headingNode.fills = [rgbToPaint({ r: 0.1, g: 0.1, b: 0.1 })] // JSON spec: rgb(0.1,0.1,0.1)
  headingNode.characters = title
  uiDemo.appendChild(headingNode)
  // Set stretch behavior: fill width, wrap height
  headingNode.layoutSizingHorizontal = 'FILL'
  headingNode.textAutoResize = 'HEIGHT'

  // Create body text (matches JSON spec: Inter Regular 12, fill rgb(0.1,0.1,0.1))
  const bodyNode = figma.createText()
  bodyNode.fontName = { family: fonts.inter, style: 'Regular' }
  bodyNode.fontSize = 12
  bodyNode.fills = [rgbToPaint({ r: 0.1, g: 0.1, b: 0.1 })] // JSON spec: rgb(0.1,0.1,0.1)
  bodyNode.characters = body
  uiDemo.appendChild(bodyNode)
  // Set stretch behavior: fill width, wrap height
  bodyNode.layoutSizingHorizontal = 'FILL'
  bodyNode.textAutoResize = 'HEIGHT'

  // Create checkbox if label provided (matches JSON spec exactly)
  if (checkboxLabel) {
    const checkboxRow = figma.createFrame()
    checkboxRow.name = `Checkbox_${checkboxLabel}`
    applyAutoLayout(checkboxRow, {
      direction: 'HORIZONTAL',
      itemSpacing: 8, // JSON spec: itemSpacing 8
      primaryAxisSizingMode: 'AUTO',
      counterAxisSizingMode: 'AUTO'
    })
    checkboxRow.fills = []

    // Checkbox box (matches JSON spec: 14x14, fill white, stroke rgb(0.5,0.5,0.5), strokeWeight 1, cornerRadius 3)
    const box = figma.createRectangle()
    box.resize(14, 14)
    box.cornerRadius = 3 // JSON spec: cornerRadius 3
    box.strokes = [rgbToPaint({ r: 0.5, g: 0.5, b: 0.5 })] // JSON spec: rgb(0.5,0.5,0.5)
    box.strokeWeight = 1 // JSON spec: strokeWeight 1
    box.fills = [rgbToPaint(colors.bgWhite)] // JSON spec: fill white
    checkboxRow.appendChild(box)

    // Checkbox label (matches JSON spec: Inter Regular 12, fill rgb(0.1,0.1,0.1))
    const checkboxLabelNode = figma.createText()
    checkboxLabelNode.fontName = { family: fonts.inter, style: 'Regular' }
    checkboxLabelNode.fontSize = 12
    checkboxLabelNode.fills = [rgbToPaint({ r: 0.1, g: 0.1, b: 0.1 })] // JSON spec: rgb(0.1,0.1,0.1)
    checkboxLabelNode.characters = checkboxLabel
    checkboxLabelNode.layoutGrow = 0
    checkboxLabelNode.textAutoResize = 'WIDTH_AND_HEIGHT'
    checkboxRow.appendChild(checkboxLabelNode)

    uiDemo.appendChild(checkboxRow)
  }

  // Create button row (matches JSON spec: layoutMode HORIZONTAL, itemSpacing 8)
  const buttonRow = figma.createFrame()
  buttonRow.name = 'ButtonRow'
  applyAutoLayout(buttonRow, {
    direction: 'HORIZONTAL',
    itemSpacing: 8, // JSON spec: itemSpacing 8
    primaryAxisSizingMode: 'AUTO',
    counterAxisSizingMode: 'AUTO'
  })
  buttonRow.fills = []

  // Primary button (matches JSON spec: cornerRadius 6, fill rgb(0.16,0.49,0.98), padding 16/12)
  const primaryButton = figma.createFrame()
  primaryButton.name = `Button_${primaryButtonLabel}`
  applyAutoLayout(primaryButton, {
    direction: 'HORIZONTAL',
    padding: { top: 12, right: 16, bottom: 12, left: 16 }, // JSON spec: paddingLeft/Right 16, paddingTop/Bottom 12
    itemSpacing: 0,
    primaryAxisSizingMode: 'AUTO',
    counterAxisSizingMode: 'AUTO'
  })
  primaryButton.cornerRadius = 6 // JSON spec: cornerRadius 6
  primaryButton.fills = [rgbToPaint({ r: 0.16, g: 0.49, b: 0.98 })] // JSON spec: rgb(0.16,0.49,0.98)
  const primaryLabel = figma.createText()
  primaryLabel.fontName = { family: fonts.inter, style: 'Bold' }
  primaryLabel.fontSize = 12
  primaryLabel.fills = [rgbToPaint(colors.textOnPrimary)] // JSON spec: fill white
  primaryLabel.characters = primaryButtonLabel
  primaryLabel.layoutGrow = 0
  primaryLabel.textAutoResize = 'WIDTH_AND_HEIGHT'
  primaryButton.appendChild(primaryLabel)
  buttonRow.appendChild(primaryButton)

  // Secondary button (matches JSON spec: cornerRadius 6, fill rgb(0.9,0.9,0.92), stroke rgb(0.75,0.77,0.8), strokeWeight 1, padding 16/12)
  const secondaryButton = figma.createFrame()
  secondaryButton.name = `Button_${secondaryButtonLabel}`
  applyAutoLayout(secondaryButton, {
    direction: 'HORIZONTAL',
    padding: { top: 12, right: 16, bottom: 12, left: 16 }, // JSON spec: paddingLeft/Right 16, paddingTop/Bottom 12
    itemSpacing: 0,
    primaryAxisSizingMode: 'AUTO',
    counterAxisSizingMode: 'AUTO'
  })
  secondaryButton.cornerRadius = 6 // JSON spec: cornerRadius 6
  secondaryButton.fills = [rgbToPaint({ r: 0.9, g: 0.9, b: 0.92 })] // JSON spec: rgb(0.9,0.9,0.92)
  secondaryButton.strokes = [rgbToPaint({ r: 0.75, g: 0.77, b: 0.8 })] // JSON spec: rgb(0.75,0.77,0.8)
  secondaryButton.strokeWeight = 1 // JSON spec: strokeWeight 1
  const secondaryLabel = figma.createText()
  secondaryLabel.fontName = { family: fonts.inter, style: 'Bold' }
  secondaryLabel.fontSize = 12
  secondaryLabel.fills = [rgbToPaint({ r: 0.15, g: 0.15, b: 0.2 })] // JSON spec: rgb(0.15,0.15,0.2)
  secondaryLabel.characters = secondaryButtonLabel
  secondaryLabel.layoutGrow = 0
  secondaryLabel.textAutoResize = 'WIDTH_AND_HEIGHT'
  secondaryButton.appendChild(secondaryLabel)
  buttonRow.appendChild(secondaryButton)

  uiDemo.appendChild(buttonRow)
  
  // Append UI Demo to root
  root.appendChild(uiDemo)
  // Set stretch behavior: fill root width
  uiDemo.layoutSizingHorizontal = 'FILL'

  // Debug log: confirm structure created
  if (debug.isEnabled('subsystem:artifacts')) {
    componentDebug.log('createDeceptiveForcedActionCard: structure created', {
      rootName: root.name,
      childrenCount: root.children.length,
      children: root.children.map(c => ({ name: c.name, type: c.type }))
    })
  }

  return root
}
