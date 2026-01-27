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
  /** Card frame name (default: "UI Demo") */
  name?: string
  /** Dash pattern for stroke (default: [4, 4]) */
  dashPattern?: number[]
}

/**
 * Create a Forced Action card component
 * 
 * This is the centralized implementation that should be used by all consumers.
 * 
 * @param options - Card content and styling options
 * @returns FrameNode containing the complete card
 */
export async function createDeceptiveForcedActionCard(
  options: ForcedActionCardOptions = {}
): Promise<FrameNode> {
  // Default content matching the JSON spec
  const title = options.title ?? 'Create an account to continue'
  const body = options.body ?? 'Access to the article requires account creation.'
  const checkboxLabel = options.checkboxLabel ?? 'Email me updates'
  const checkboxChecked = options.checkboxChecked ?? false
  const primaryButtonLabel = options.primaryButtonLabel ?? 'Create Account'
  const secondaryButtonLabel = options.secondaryButtonLabel ?? 'Not now'
  const cardName = options.name ?? 'UI Demo'
  const dashPattern = options.dashPattern ?? [4, 4] // Default dash pattern

  // Load required fonts
  await ensureFontsLoaded(fonts.inter, ['Bold', 'Regular'])

  // Create card frame (matches JSON spec: "UI Demo")
  const card = figma.createFrame()
  card.name = cardName

  // Configure auto-layout (matches JSON spec exactly)
  applyAutoLayout(card, {
    direction: 'VERTICAL',
    padding: 16, // JSON spec: padding 16 all sides
    itemSpacing: 16, // JSON spec: itemSpacing 16
    primaryAxisSizingMode: 'AUTO',
    counterAxisSizingMode: 'AUTO'
  })

  // Apply styling (matches JSON spec exactly)
  // Fill: rgb(0.96, 0.96, 1.0) - light blue tint
  card.fills = [rgbToPaint({ r: 0.96, g: 0.96, b: 1.0 })]
  card.cornerRadius = 12 // JSON spec: cornerRadius 12
  card.clipsContent = true // JSON spec: clipsContent true

  // Apply dashed stroke (matches JSON spec: stroke rgb(1, 0.56666666, 0.0), strokeWeight 2)
  // Note: JSON doesn't include dash pattern fields, so we use setDashedStroke with configurable pattern
  setDashedStroke(card, {
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
  headingNode.layoutGrow = 1 // Fill width
  headingNode.textAutoResize = 'NONE'
  card.appendChild(headingNode)

  // Create body text (matches JSON spec: Inter Regular 12, fill rgb(0.1,0.1,0.1))
  const bodyNode = figma.createText()
  bodyNode.fontName = { family: fonts.inter, style: 'Regular' }
  bodyNode.fontSize = 12
  bodyNode.fills = [rgbToPaint({ r: 0.1, g: 0.1, b: 0.1 })] // JSON spec: rgb(0.1,0.1,0.1)
  bodyNode.characters = body
  bodyNode.layoutGrow = 1 // Fill width
  bodyNode.textAutoResize = 'NONE'
  card.appendChild(bodyNode)

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

    card.appendChild(checkboxRow)
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

  card.appendChild(buttonRow)

  return card
}
