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
  // ROOT CONTAINER FRAME
  // ============================================
  const root = figma.createFrame()
  root.name = options.name ?? 'Deceptive Demo — Nagging'
  
  // Configure auto-layout (matches Forced Action pattern: VERTICAL, padding 16, itemSpacing 24)
  // Fixed width (320px) enforced for Section container consistency
  applyAutoLayout(root, {
    direction: 'VERTICAL',
    padding: 16, // Same as Forced Action
    itemSpacing: 24, // Same as Forced Action
    primaryAxisSizingMode: 'AUTO', // Height: auto (driven by content)
    counterAxisSizingMode: 'FIXED' // Width: fixed (320px enforced below)
  })
  
  // Apply styling (matches Forced Action: white fill, radius 12, clipsContent true)
  root.fills = [rgbToPaint(colors.bgWhite)] // White fill
  root.cornerRadius = 12 // Same as Forced Action
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
  // ============================================
  // UI Demo JSON scrape 2026-01-27: width 328, height 124, VERTICAL layout, FIXED counterAxis
  const uiDemo = figma.createFrame()
  uiDemo.name = 'UI Demo'
  
  // Configure auto-layout (matches JSON scrape exactly)
  applyAutoLayout(uiDemo, {
    direction: 'VERTICAL',
    padding: 16, // JSON spec: padding 16 all around
    itemSpacing: 16, // JSON spec: itemSpacing 16
    primaryAxisSizingMode: 'AUTO', // JSON spec: primaryAxisSizingMode AUTO
    counterAxisSizingMode: 'FIXED' // JSON spec: counterAxisSizingMode FIXED
  })
  
  // Set fixed size (JSON spec: width 328, height 124)
  uiDemo.resize(328, 124)

  // Apply styling (JSON spec: fill rgb(0.96, 0.96, 1.0), cornerRadius 12, clipsContent true)
  uiDemo.fills = [rgbToPaint({ r: 0.96, g: 0.96, b: 1.0 })] // Light blue tint (JSON spec)
  uiDemo.cornerRadius = 12 // JSON spec: cornerRadius 12
  uiDemo.clipsContent = true // JSON spec: clipsContent true

  // Apply dashed stroke (JSON spec: stroke rgb(1.0, 0.56666666, 0.0), strokeWeight 2)
  // Note: JSON shows SOLID but we use dashed for visual consistency
  setDashedStroke(uiDemo, {
    color: { r: 1.0, g: 0.56666666, b: 0.0 }, // Orange stroke (JSON spec)
    weight: 2, // JSON spec: strokeWeight 2
    dashPattern: dashPattern
  })

  // ============================================
  // PROMPT ROWS (inside UI Demo)
  // JSON scrape 2026-01-27: Row width 296, height 38, HORIZONTAL, FIXED primaryAxis, itemSpacing 8
  // ============================================
  
  // Prompt Row 1: "Enable Notifications"
  const promptRow1 = figma.createFrame()
  promptRow1.name = 'Row' // JSON spec: name "Row"
  applyAutoLayout(promptRow1, {
    direction: 'HORIZONTAL', // JSON spec: layoutMode HORIZONTAL
    itemSpacing: 8, // JSON spec: itemSpacing 8
    primaryAxisSizingMode: 'FIXED', // JSON spec: primaryAxisSizingMode FIXED
    counterAxisSizingMode: 'AUTO' // JSON spec: counterAxisSizingMode AUTO
  })
  promptRow1.fills = [] // JSON spec: no fills
  promptRow1.clipsContent = false // JSON spec: clipsContent false
  // Set fixed size (JSON spec: width 296, height 38)
  promptRow1.resize(296, 38)
  uiDemo.appendChild(promptRow1)
  // Set layoutAlign STRETCH (JSON spec: layoutAlign STRETCH)
  promptRow1.layoutSizingHorizontal = 'FILL'
  
  // Checkbox (JSON spec: size 14x14, fill white, stroke gray, strokeWeight 1, cornerRadius 3)
  const checkbox1 = figma.createRectangle()
  checkbox1.resize(14, 14) // JSON spec: size 14x14
  checkbox1.cornerRadius = 3 // JSON spec: cornerRadius 3
  checkbox1.strokes = [rgbToPaint({ r: 0.5, g: 0.5, b: 0.5 })] // JSON spec: stroke gray rgb(0.5,0.5,0.5)
  checkbox1.strokeWeight = 1 // JSON spec: strokeWeight 1
  checkbox1.fills = [rgbToPaint(colors.bgWhite)] // JSON spec: fill white
  promptRow1.appendChild(checkbox1)
  
  // Text Group (JSON spec: layoutMode VERTICAL, itemSpacing 4, layoutGrow 1, width 274, height 38, counterAxisSizingMode FIXED)
  const textBlock1 = figma.createFrame()
  textBlock1.name = 'Text Group' // JSON spec: name "Text Group"
  applyAutoLayout(textBlock1, {
    direction: 'VERTICAL', // JSON spec: layoutMode VERTICAL
    itemSpacing: 4, // JSON spec: itemSpacing 4
    primaryAxisSizingMode: 'AUTO',
    counterAxisSizingMode: 'FIXED' // JSON spec: counterAxisSizingMode FIXED
  })
  textBlock1.fills = [] // JSON spec: no fills
  // Set fixed size (JSON spec: width 274, height 38)
  textBlock1.resize(274, 38)
  promptRow1.appendChild(textBlock1)
  // Set layoutGrow 1 (JSON spec: layoutGrow 1 - critical for stretching)
  textBlock1.layoutGrow = 1
  
  // Heading: "Enable Notifications" (JSON spec: Bold, 16)
  const heading1 = figma.createText()
  heading1.fontName = { family: fonts.inter, style: 'Bold' }
  heading1.fontSize = 16 // JSON spec: Bold, 16 (not 14)
  heading1.fills = [rgbToPaint({ r: 0.1, g: 0.1, b: 0.1 })]
  heading1.characters = 'Enable Notifications'
  textBlock1.appendChild(heading1)
  // Set stretch behavior: fill Text Group width (274px) - align-self: stretch equivalent
  // Text Group has fixed width 274px, so text will wrap at that width
  heading1.textAutoResize = 'HEIGHT' // Height adjusts based on wrapping, width constrained by parent
  heading1.layoutSizingHorizontal = 'FILL' // Stretch to fill Text Group width (274px)
  
  // Subtext: "Stay updated with alerts." (JSON spec: Regular, 12)
  const subtext1 = figma.createText()
  subtext1.fontName = { family: fonts.inter, style: 'Regular' }
  subtext1.fontSize = 12 // JSON spec: Regular, 12
  subtext1.fills = [rgbToPaint({ r: 0.35, g: 0.35, b: 0.35 })] // Secondary text color
  subtext1.characters = 'Stay updated with alerts.'
  textBlock1.appendChild(subtext1)
  // Set stretch behavior: fill Text Group width (274px) - align-self: stretch equivalent
  subtext1.textAutoResize = 'HEIGHT' // Height adjusts based on wrapping, width constrained by parent
  subtext1.layoutSizingHorizontal = 'FILL' // Stretch to fill Text Group width (274px)

  // Prompt Row 2: "Enable Location?" (same structure as row 1)
  const promptRow2 = figma.createFrame()
  promptRow2.name = 'Row' // JSON spec: name "Row"
  applyAutoLayout(promptRow2, {
    direction: 'HORIZONTAL', // JSON spec: layoutMode HORIZONTAL
    itemSpacing: 8, // JSON spec: itemSpacing 8
    primaryAxisSizingMode: 'FIXED', // JSON spec: primaryAxisSizingMode FIXED
    counterAxisSizingMode: 'AUTO' // JSON spec: counterAxisSizingMode AUTO
  })
  promptRow2.fills = [] // JSON spec: no fills
  promptRow2.clipsContent = false // JSON spec: clipsContent false
  // Set fixed size (JSON spec: width 296, height 38)
  promptRow2.resize(296, 38)
  uiDemo.appendChild(promptRow2)
  // Set layoutAlign STRETCH (JSON spec: layoutAlign STRETCH)
  promptRow2.layoutSizingHorizontal = 'FILL'
  
  // Checkbox (JSON spec: size 14x14, fill white, stroke gray, strokeWeight 1, cornerRadius 3)
  const checkbox2 = figma.createRectangle()
  checkbox2.resize(14, 14) // JSON spec: size 14x14
  checkbox2.cornerRadius = 3 // JSON spec: cornerRadius 3
  checkbox2.strokes = [rgbToPaint({ r: 0.5, g: 0.5, b: 0.5 })] // JSON spec: stroke gray rgb(0.5,0.5,0.5)
  checkbox2.strokeWeight = 1 // JSON spec: strokeWeight 1
  checkbox2.fills = [rgbToPaint(colors.bgWhite)] // JSON spec: fill white
  promptRow2.appendChild(checkbox2)
  
  // Text Group (JSON spec: layoutMode VERTICAL, itemSpacing 4, layoutGrow 1, width 274, height 38, counterAxisSizingMode FIXED)
  const textBlock2 = figma.createFrame()
  textBlock2.name = 'Text Group' // JSON spec: name "Text Group"
  applyAutoLayout(textBlock2, {
    direction: 'VERTICAL', // JSON spec: layoutMode VERTICAL
    itemSpacing: 4, // JSON spec: itemSpacing 4
    primaryAxisSizingMode: 'AUTO',
    counterAxisSizingMode: 'FIXED' // JSON spec: counterAxisSizingMode FIXED
  })
  textBlock2.fills = [] // JSON spec: no fills
  // Set fixed size (JSON spec: width 274, height 38)
  textBlock2.resize(274, 38)
  promptRow2.appendChild(textBlock2)
  // Set layoutGrow 1 (JSON spec: layoutGrow 1 - critical for stretching)
  textBlock2.layoutGrow = 1
  
  // Heading: "Enable Location?" (JSON spec: Bold, 16)
  const heading2 = figma.createText()
  heading2.fontName = { family: fonts.inter, style: 'Bold' }
  heading2.fontSize = 16 // JSON spec: Bold, 16 (not 14)
  heading2.fills = [rgbToPaint({ r: 0.1, g: 0.1, b: 0.1 })]
  heading2.characters = 'Enable Location?'
  textBlock2.appendChild(heading2)
  // Set stretch behavior: fill Text Group width (274px) - align-self: stretch equivalent
  heading2.textAutoResize = 'HEIGHT' // Height adjusts based on wrapping, width constrained by parent
  heading2.layoutSizingHorizontal = 'FILL' // Stretch to fill Text Group width (274px)
  
  // Subtext: "We need your location for better results." (JSON spec: Regular, 12)
  const subtext2 = figma.createText()
  subtext2.fontName = { family: fonts.inter, style: 'Regular' }
  subtext2.fontSize = 12 // JSON spec: Regular, 12
  subtext2.fills = [rgbToPaint({ r: 0.35, g: 0.35, b: 0.35 })] // Secondary text color
  subtext2.characters = 'We need your location for better results.'
  textBlock2.appendChild(subtext2)
  // Set stretch behavior: fill Text Group width (274px) - align-self: stretch equivalent
  subtext2.textAutoResize = 'HEIGHT' // Height adjusts based on wrapping, width constrained by parent
  subtext2.layoutSizingHorizontal = 'FILL' // Stretch to fill Text Group width (274px)
  
  // Append UI Demo to root
  root.appendChild(uiDemo)
  // Set stretch behavior: fill root width
  uiDemo.layoutSizingHorizontal = 'FILL'

  // Enforce fixed 320px width for consistent card sizing in Section container
  // Height remains auto (driven by content) - enforce width after all children are added
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
