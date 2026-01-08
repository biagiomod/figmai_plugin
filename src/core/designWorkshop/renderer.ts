/**
 * Design Workshop Renderer
 * 
 * Renders DesignSpecV1 to Figma canvas as a Section containing 1-5 screen frames.
 * Section placement: below lowest existing node + 120px, or at origin if no nodes.
 */

import type { DesignSpecV1, BlockSpec, RenderReport } from './types'
import { loadFonts, createTextNode, createAutoLayoutFrameSafe } from '../stage/primitives'

/**
 * Render Design Spec to Section
 * 
 * Creates a new Section (FrameNode) on the current page and places 1-5 screen frames inside it.
 * Screens are arranged horizontally with 80px spacing.
 * 
 * @param spec - Normalized DesignSpecV1
 * @param runId - Run identifier for logging
 * @returns Section node, array of screen frames, and render report
 */
export async function renderDesignSpecToSection(
  spec: DesignSpecV1,
  runId?: string
): Promise<{ section: FrameNode, screens: FrameNode[], report: RenderReport }> {
  // Initialize render report
  const report: RenderReport = {
    consumedFields: [],
    unusedFields: [],
    fallbacks: []
  }
  
  // Track consumed fields
  const consumedFields = new Set<string>()
  
  // Track fidelity usage
  if (spec.render?.intent?.fidelity) {
    consumedFields.add('render.intent.fidelity')
    report.consumedFields.push({
      field: 'render.intent.fidelity',
      value: spec.render.intent.fidelity,
      influence: `Applied ${spec.render.intent.fidelity} fidelity styling (typography, corners, shadows)`
    })
  }
  
  // Track intent usage
  if (spec.meta?.intent) {
    const intent = spec.meta.intent
    if (intent.appType) {
      consumedFields.add('meta.intent.appType')
      report.consumedFields.push({
        field: 'meta.intent.appType',
        value: intent.appType,
        influence: `Influenced screen content and naming for ${intent.appType} app type`
      })
    }
    if (intent.tone) {
      consumedFields.add('meta.intent.tone')
      report.consumedFields.push({
        field: 'meta.intent.tone',
        value: intent.tone,
        influence: `Applied ${intent.tone} tone styling (corner radius, color palette)`
      })
    }
    if (intent.primaryColor) {
      consumedFields.add('meta.intent.primaryColor')
      report.consumedFields.push({
        field: 'meta.intent.primaryColor',
        value: intent.primaryColor,
        influence: `Used ${intent.primaryColor} as primary color in buttons and accents`
      })
    }
    if (intent.accentColors && intent.accentColors.length > 0) {
      consumedFields.add('meta.intent.accentColors')
      // Note: Currently only first accent color is used
      if (intent.accentColors.length > 1) {
        report.unusedFields.push({
          field: 'meta.intent.accentColors[1+]',
          value: intent.accentColors.slice(1),
          reason: 'Only first accent color is currently supported in rendering'
        })
      }
      report.consumedFields.push({
        field: 'meta.intent.accentColors[0]',
        value: intent.accentColors[0],
        influence: `Used ${intent.accentColors[0]} as accent color`
      })
    }
  }
  
  // Track style keywords
  if (spec.render?.intent?.styleKeywords && spec.render.intent.styleKeywords.length > 0) {
    consumedFields.add('render.intent.styleKeywords')
    report.consumedFields.push({
      field: 'render.intent.styleKeywords',
      value: spec.render.intent.styleKeywords,
      influence: `Applied style keywords: ${spec.render.intent.styleKeywords.join(', ')}`
    })
  }
  
  // Track brand tone
  if (spec.render?.intent?.brandTone) {
    consumedFields.add('render.intent.brandTone')
    report.consumedFields.push({
      field: 'render.intent.brandTone',
      value: spec.render.intent.brandTone,
      influence: `Applied brand tone: ${spec.render.intent.brandTone}`
    })
  }
  
  // Track density
  if (spec.render?.intent?.density) {
    consumedFields.add('render.intent.density')
    report.consumedFields.push({
      field: 'render.intent.density',
      value: spec.render.intent.density,
      influence: `Applied ${spec.render.intent.density} density (spacing adjustments)`
    })
  } else {
    report.fallbacks.push({
      field: 'render.intent.density',
      fallback: 'default comfortable density'
    })
  }
  
  // Check for unused fields
  if (spec.meta?.intent?.keywords && spec.meta.intent.keywords.length > 0) {
    if (!consumedFields.has('meta.intent.keywords')) {
      report.unusedFields.push({
        field: 'meta.intent.keywords',
        value: spec.meta.intent.keywords,
        reason: 'Keywords are extracted but not yet used in rendering logic'
      })
    }
  }
  
  if (spec.meta?.intent?.avoidColors && spec.meta.intent.avoidColors.length > 0) {
    report.unusedFields.push({
      field: 'meta.intent.avoidColors',
      value: spec.meta.intent.avoidColors,
      reason: 'Avoid colors not yet implemented in rendering'
    })
  }
  
  if (spec.meta?.intent?.theme) {
    report.unusedFields.push({
      field: 'meta.intent.theme',
      value: spec.meta.intent.theme,
      reason: 'Theme (light/dark) not yet implemented in rendering'
    })
  }
  // Create Section (using FrameNode as SectionNode may not be available)
  const section = figma.createFrame()
  section.name = `Design Workshop — ${spec.meta.title || 'Screens'}`
  
  // Set up section with horizontal auto-layout for screens
  section.layoutMode = 'HORIZONTAL'
  section.primaryAxisSizingMode = 'AUTO'
  section.counterAxisSizingMode = 'AUTO'
  section.itemSpacing = 80
  section.paddingTop = 40
  section.paddingRight = 40
  section.paddingBottom = 40
  section.paddingLeft = 40

  // Create screen frames
  const screens: FrameNode[] = []
  const fidelity = spec.render.intent.fidelity
  const intent = spec.meta?.intent

  for (const screenSpec of spec.screens) {
    const screenFrame = await renderScreen(screenSpec, spec.canvas.device, fidelity, intent)
    section.appendChild(screenFrame)
    screens.push(screenFrame)
  }

  // Calculate section placement
  const placement = calculateSectionPlacement(section)
  section.x = placement.x
  section.y = placement.y

  // Append to current page
  figma.currentPage.appendChild(section)

  // Scroll into view and select
  figma.currentPage.selection = [section]
  figma.viewport.scrollAndZoomIntoView([section])

  return { section, screens, report }
}

/**
 * Render a single screen frame
 */
async function renderScreen(
  screenSpec: DesignSpecV1['screens'][0],
  device: DesignSpecV1['canvas']['device'],
  fidelity: DesignSpecV1['render']['intent']['fidelity'],
  intent?: DesignSpecV1['meta']['intent']
): Promise<FrameNode> {
  const screenFrame = figma.createFrame()
  screenFrame.name = screenSpec.name || 'Screen'
  screenFrame.resize(device.width, device.height)

  // Apply layout
  const layout = screenSpec.layout || { direction: 'vertical', padding: 16, gap: 12 }
  screenFrame.layoutMode = layout.direction === 'horizontal' ? 'HORIZONTAL' : 'VERTICAL'
  screenFrame.primaryAxisSizingMode = 'AUTO'
  screenFrame.counterAxisSizingMode = 'AUTO'

  // Apply padding
  if (typeof layout.padding === 'number') {
    screenFrame.paddingTop = layout.padding
    screenFrame.paddingRight = layout.padding
    screenFrame.paddingBottom = layout.padding
    screenFrame.paddingLeft = layout.padding
  } else if (layout.padding) {
    screenFrame.paddingTop = layout.padding.top ?? 16
    screenFrame.paddingRight = layout.padding.right ?? 16
    screenFrame.paddingBottom = layout.padding.bottom ?? 16
    screenFrame.paddingLeft = layout.padding.left ?? 16
  } else {
    screenFrame.paddingTop = 16
    screenFrame.paddingRight = 16
    screenFrame.paddingBottom = 16
    screenFrame.paddingLeft = 16
  }

  // Apply gap
  screenFrame.itemSpacing = layout.gap ?? 12

  // Render blocks
  for (const block of screenSpec.blocks) {
    const blockNode = await renderBlock(block, fidelity, device.width - (screenFrame.paddingLeft + screenFrame.paddingRight), intent)
    screenFrame.appendChild(blockNode)
  }

  // Apply fidelity-specific styling to screen frame
  applyFidelityStyling(screenFrame, fidelity, intent)

  return screenFrame
}

/**
 * Render a block to a Figma node
 */
async function renderBlock(
  block: BlockSpec,
  fidelity: DesignSpecV1['render']['intent']['fidelity'],
  maxWidth: number,
  intent?: DesignSpecV1['meta']['intent']
): Promise<SceneNode> {
  const fonts = await loadFonts()

  switch (block.type) {
    case 'heading': {
      const textNode = await createTextNode(block.text, {
        fontSize: getHeadingSize(block.level || 1, fidelity),
        fontName: fonts.bold,
        fills: [getTextColor(fidelity)]
      })
      textNode.name = `Heading ${block.level || 1}`
      textNode.resize(maxWidth, textNode.height)
      return textNode
    }

    case 'bodyText': {
      const textNode = await createTextNode(block.text, {
        fontSize: getBodyTextSize(fidelity),
        fontName: fonts.regular,
        fills: [getTextColor(fidelity)]
      })
      textNode.name = 'Body Text'
      textNode.resize(maxWidth, textNode.height)
      return textNode
    }

    case 'button': {
      const buttonFrame = createAutoLayoutFrameSafe('Button', 'HORIZONTAL', {
        padding: { top: 12, right: 24, bottom: 12, left: 24 },
        gap: 8,
        primaryAxisAlign: 'CENTER',
        counterAxisAlign: 'CENTER'
      })
      
      const buttonText = await createTextNode(block.text, {
        fontSize: getButtonTextSize(fidelity),
        fontName: fonts.bold,
        fills: [getButtonTextColor(block.variant || 'primary', fidelity)]
      })
      buttonFrame.appendChild(buttonText)
      
      // Apply button styling (use intent colors if available)
      buttonFrame.fills = [getButtonFill(block.variant || 'primary', fidelity, intent)]
      buttonFrame.strokes = [getButtonStroke(block.variant || 'primary', fidelity, intent)]
      buttonFrame.cornerRadius = getCornerRadius(fidelity, intent)
      buttonFrame.effects = getButtonEffects(fidelity)
      
      buttonFrame.resize(maxWidth, buttonFrame.height)
      return buttonFrame
    }

    case 'input': {
      const inputFrame = createAutoLayoutFrameSafe('Input', 'VERTICAL', {
        padding: { top: 12, right: 16, bottom: 12, left: 16 },
        gap: 4
      })
      
      if (block.label) {
        const labelText = await createTextNode(block.label, {
          fontSize: 12,
          fontName: fonts.regular,
          fills: [getTextColor(fidelity)]
        })
        inputFrame.appendChild(labelText)
      }
      
      const inputText = await createTextNode(block.placeholder || '', {
        fontSize: getBodyTextSize(fidelity),
        fontName: fonts.regular,
        fills: [getPlaceholderColor(fidelity)]
      })
      // Note: inputType is available but not used in primitive rendering
      inputFrame.appendChild(inputText)
      
      // Apply input styling
      inputFrame.fills = [getInputFill(fidelity)]
      inputFrame.strokes = [getInputStroke(fidelity, intent)]
      inputFrame.cornerRadius = getCornerRadius(fidelity, intent)
      inputFrame.effects = getInputEffects(fidelity)
      
      inputFrame.resize(maxWidth, inputFrame.height)
      return inputFrame
    }

    case 'card': {
      const cardFrame = createAutoLayoutFrameSafe('Card', 'VERTICAL', {
        padding: { top: 16, right: 16, bottom: 16, left: 16 },
        gap: 8
      })
      
      if (block.title) {
        const titleText = await createTextNode(block.title, {
          fontSize: getHeadingSize(2, fidelity),
          fontName: fonts.bold,
          fills: [getTextColor(fidelity)]
        })
        cardFrame.appendChild(titleText)
      }
      
      const contentText = await createTextNode(block.content, {
        fontSize: getBodyTextSize(fidelity),
        fontName: fonts.regular,
        fills: [getTextColor(fidelity)]
      })
      cardFrame.appendChild(contentText)
      
      // Apply card styling
      cardFrame.fills = [getCardFill(fidelity)]
      cardFrame.strokes = [getCardStroke(fidelity, intent)]
      cardFrame.cornerRadius = getCornerRadius(fidelity, intent)
      cardFrame.effects = getCardEffects(fidelity)
      
      cardFrame.resize(maxWidth, cardFrame.height)
      return cardFrame
    }

    case 'spacer': {
      const spacer = figma.createRectangle()
      spacer.name = 'Spacer'
      spacer.resize(maxWidth, block.height || 16)
      spacer.fills = []
      spacer.strokes = []
      return spacer
    }

    case 'image': {
      const imageFrame = figma.createFrame()
      imageFrame.name = 'Image'
      const imageWidth = block.width || maxWidth
      const imageHeight = block.height || Math.round(imageWidth * 0.75) // 4:3 aspect ratio default
      imageFrame.resize(imageWidth, imageHeight)
      
      // Apply image placeholder styling
      imageFrame.fills = [getImageFill(fidelity)]
      imageFrame.strokes = [getImageStroke(fidelity, intent)]
      imageFrame.cornerRadius = getCornerRadius(fidelity, intent)
      
      // Add placeholder text if wireframe
      if (fidelity === 'wireframe') {
        const placeholderText = await createTextNode('[Image]', {
          fontSize: 12,
          fontName: fonts.regular,
          fills: [getPlaceholderColor(fidelity)]
        })
        placeholderText.textAlignHorizontal = 'CENTER'
        imageFrame.appendChild(placeholderText)
        imageFrame.layoutMode = 'VERTICAL'
        imageFrame.primaryAxisAlignItems = 'CENTER'
        imageFrame.counterAxisAlignItems = 'CENTER'
      }
      
      return imageFrame
    }

    default:
      // Fallback: create empty frame
      const fallback = figma.createFrame()
      fallback.name = 'Unknown Block'
      fallback.resize(maxWidth, 40)
      return fallback
  }
}

/**
 * Calculate section placement
 * Places section below lowest existing node + 120px, or at origin if no nodes
 */
function calculateSectionPlacement(section: FrameNode): { x: number; y: number } {
  const page = figma.currentPage
  const children = page.children.filter(child => child !== section) // Exclude section itself
  
  if (children.length === 0) {
    // No existing nodes: place at origin
    return { x: 0, y: 0 }
  }
  
  // Find lowest/bottom-most bounding box
  let lowestBottom = 0
  
  for (const child of children) {
    let bottom = 0
    
    if ('absoluteBoundingBox' in child && child.absoluteBoundingBox) {
      bottom = child.absoluteBoundingBox.y + child.absoluteBoundingBox.height
    } else if ('absoluteRenderBounds' in child && child.absoluteRenderBounds) {
      bottom = child.absoluteRenderBounds.y + child.absoluteRenderBounds.height
    } else if ('y' in child && 'height' in child) {
      // Calculate absolute position
      let currentY = child.y
      let parent: BaseNode | null = child.parent
      while (parent && parent.type !== 'PAGE' && parent.type !== 'DOCUMENT') {
        if ('y' in parent) {
          currentY += parent.y
        }
        parent = parent.parent
      }
      bottom = currentY + (child.height || 0)
    }
    
    if (bottom > lowestBottom) {
      lowestBottom = bottom
    }
  }
  
  // Place section below lowest node + 120px padding
  const y = lowestBottom + 120
  
  // Ensure y >= 0
  return { x: 0, y: Math.max(0, y) }
}

/**
 * Apply fidelity-specific styling to screen frame
 */
function applyFidelityStyling(frame: FrameNode, fidelity: DesignSpecV1['render']['intent']['fidelity'], intent?: DesignSpecV1['meta']['intent']): void {
  switch (fidelity) {
    case 'wireframe':
      frame.fills = [{ type: 'SOLID', color: { r: 0.88, g: 0.88, b: 0.88 } }] // #E0E0E0
      frame.strokes = [{ type: 'SOLID', color: { r: 0.6, g: 0.6, b: 0.6 }, opacity: 1 }] // #999999
      frame.strokeWeight = 1
      frame.cornerRadius = 0
      frame.effects = []
      break
    case 'medium':
      frame.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }] // White
      frame.strokes = [{ type: 'SOLID', color: { r: 0.88, g: 0.88, b: 0.88 }, opacity: 1 }] // #E0E0E0
      frame.strokeWeight = 1
      frame.cornerRadius = 8
      frame.effects = [{
        type: 'DROP_SHADOW',
        color: { r: 0, g: 0, b: 0, a: 0.1 },
        offset: { x: 0, y: 1 },
        radius: 2,
        visible: true,
        blendMode: 'NORMAL'
      }]
      break
    case 'hi':
      frame.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }] // White
      frame.strokes = [{ type: 'SOLID', color: { r: 0.9, g: 0.9, b: 0.9 }, opacity: 1 }]
      frame.strokeWeight = 0.5
      frame.cornerRadius = 12
      frame.effects = [
        {
          type: 'DROP_SHADOW',
          color: { r: 0, g: 0, b: 0, a: 0.08 },
          offset: { x: 0, y: 2 },
          radius: 4,
          visible: true,
          blendMode: 'NORMAL'
        },
        {
          type: 'DROP_SHADOW',
          color: { r: 0, g: 0, b: 0, a: 0.04 },
          offset: { x: 0, y: 8 },
          radius: 16,
          visible: true,
          blendMode: 'NORMAL'
        }
      ]
      break
    case 'creative':
      frame.fills = [{ type: 'SOLID', color: { r: 0.98, g: 0.98, b: 1 } }] // Slight blue tint
      frame.strokes = [{ type: 'SOLID', color: { r: 0.2, g: 0.4, b: 0.8 }, opacity: 1 }] // Blue
      frame.strokeWeight = 2
      frame.cornerRadius = 20
      frame.effects = [
        {
          type: 'DROP_SHADOW',
          color: { r: 0.2, g: 0.4, b: 0.8, a: 0.3 },
          offset: { x: 0, y: 4 },
          radius: 12,
          visible: true,
          blendMode: 'NORMAL'
        },
        {
          type: 'DROP_SHADOW',
          color: { r: 0, g: 0, b: 0, a: 0.1 },
          offset: { x: 0, y: 16 },
          radius: 32,
          visible: true,
          blendMode: 'NORMAL'
        }
      ]
      break
  }
}

// Fidelity-specific styling helpers

function getHeadingSize(level: 1 | 2 | 3, fidelity: DesignSpecV1['render']['intent']['fidelity']): number {
  const baseSizes: Record<1 | 2 | 3, number> = {
    1: 32,
    2: 24,
    3: 18
  }
  
  const base = baseSizes[level]
  
  switch (fidelity) {
    case 'wireframe':
      return base * 0.8
    case 'medium':
      return base
    case 'hi':
      return base * 1.1
    case 'creative':
      return base * 1.3
  }
}

function getBodyTextSize(fidelity: DesignSpecV1['render']['intent']['fidelity']): number {
  switch (fidelity) {
    case 'wireframe':
      return 12
    case 'medium':
      return 14
    case 'hi':
      return 16
    case 'creative':
      return 18
  }
}

function getButtonTextSize(fidelity: DesignSpecV1['render']['intent']['fidelity']): number {
  switch (fidelity) {
    case 'wireframe':
      return 12
    case 'medium':
      return 14
    case 'hi':
      return 15
    case 'creative':
      return 16
  }
}

function getTextColor(fidelity: DesignSpecV1['render']['intent']['fidelity']): Paint {
  switch (fidelity) {
    case 'wireframe':
      return { type: 'SOLID', color: { r: 0.4, g: 0.4, b: 0.4 } } // #666666
    case 'medium':
      return { type: 'SOLID', color: { r: 0.2, g: 0.2, b: 0.2 } } // #333333
    case 'hi':
      return { type: 'SOLID', color: { r: 0.1, g: 0.1, b: 0.1 } } // #1A1A1A
    case 'creative':
      return { type: 'SOLID', color: { r: 0.05, g: 0.05, b: 0.2 } } // Dark blue
  }
}

function getButtonFill(variant: 'primary' | 'secondary' | 'tertiary', fidelity: DesignSpecV1['render']['intent']['fidelity'], intent?: DesignSpecV1['meta']['intent']): Paint {
  // Use intent primary color if available and variant is primary
  if (variant === 'primary' && intent?.primaryColor) {
    const color = parseColor(intent.primaryColor)
    if (color) {
      return { type: 'SOLID', color }
    }
  }
  
  // Use intent accent color for secondary if available
  if (variant === 'secondary' && intent?.accentColors && intent.accentColors.length > 0) {
    const color = parseColor(intent.accentColors[0])
    if (color) {
      return { type: 'SOLID', color }
    }
  }
  switch (fidelity) {
    case 'wireframe':
      return { type: 'SOLID', color: { r: 0.88, g: 0.88, b: 0.88 } } // #E0E0E0
    case 'medium':
      if (variant === 'primary') {
        return { type: 'SOLID', color: { r: 0, g: 0.4, b: 0.8 } } // #0066CC
      } else {
        return { type: 'SOLID', color: { r: 0.95, g: 0.95, b: 0.95 } }
      }
    case 'hi':
      if (variant === 'primary') {
        return { type: 'SOLID', color: { r: 0, g: 0.4, b: 0.8 } } // #0066CC
      } else if (variant === 'secondary') {
        return { type: 'SOLID', color: { r: 0.42, g: 0.46, b: 0.49 } } // #6C757D
      } else {
        return { type: 'SOLID', color: { r: 0.96, g: 0.96, b: 0.96 } }
      }
    case 'creative':
      if (variant === 'primary') {
        return { type: 'SOLID', color: { r: 0.2, g: 0.4, b: 0.9 } } // Vibrant blue
      } else {
        return { type: 'SOLID', color: { r: 0.95, g: 0.7, b: 0.2 } } // Orange
      }
  }
}

function getButtonTextColor(variant: 'primary' | 'secondary' | 'tertiary', fidelity: DesignSpecV1['render']['intent']['fidelity']): Paint {
  switch (fidelity) {
    case 'wireframe':
      return { type: 'SOLID', color: { r: 0.4, g: 0.4, b: 0.4 } } // #666666
    case 'medium':
    case 'hi':
      if (variant === 'primary') {
        return { type: 'SOLID', color: { r: 1, g: 1, b: 1 } } // White
      } else {
        return { type: 'SOLID', color: { r: 0.2, g: 0.2, b: 0.2 } } // Dark
      }
    case 'creative':
      return { type: 'SOLID', color: { r: 1, g: 1, b: 1 } } // White
  }
}

function getButtonStroke(variant: 'primary' | 'secondary' | 'tertiary', fidelity: DesignSpecV1['render']['intent']['fidelity'], intent?: DesignSpecV1['meta']['intent']): Paint {
  // Use intent primary color for stroke if available and variant is primary
  if (variant === 'primary' && intent?.primaryColor) {
    const color = parseColor(intent.primaryColor)
    if (color) {
      return { type: 'SOLID', color, opacity: 0.3 }
    }
  }
  switch (fidelity) {
    case 'wireframe':
      return { type: 'SOLID', color: { r: 0.6, g: 0.6, b: 0.6 }, opacity: 1 } // #999999
    case 'medium':
      return { type: 'SOLID', color: { r: 0.88, g: 0.88, b: 0.88 }, opacity: 1 } // #E0E0E0
    case 'hi':
      return { type: 'SOLID', color: { r: 0.9, g: 0.9, b: 0.9 }, opacity: 1 }
    case 'creative':
      return { type: 'SOLID', color: { r: 0.2, g: 0.4, b: 0.8 }, opacity: 1 } // Blue
  }
}

function getButtonEffects(fidelity: DesignSpecV1['render']['intent']['fidelity']): Effect[] {
  switch (fidelity) {
    case 'wireframe':
      return []
    case 'medium':
      return [{
        type: 'DROP_SHADOW',
        color: { r: 0, g: 0, b: 0, a: 0.1 },
        offset: { x: 0, y: 1 },
        radius: 2,
        visible: true,
        blendMode: 'NORMAL'
      }]
    case 'hi':
      return [
        {
          type: 'DROP_SHADOW',
          color: { r: 0, g: 0, b: 0, a: 0.12 },
          offset: { x: 0, y: 2 },
          radius: 4,
          visible: true,
          blendMode: 'NORMAL'
        }
      ]
    case 'creative':
      return [
        {
          type: 'DROP_SHADOW',
          color: { r: 0.2, g: 0.4, b: 0.8, a: 0.4 },
          offset: { x: 0, y: 4 },
          radius: 8,
          visible: true,
          blendMode: 'NORMAL'
        }
      ]
  }
}

function getInputFill(fidelity: DesignSpecV1['render']['intent']['fidelity']): Paint {
  switch (fidelity) {
    case 'wireframe':
      return { type: 'SOLID', color: { r: 0.95, g: 0.95, b: 0.95 } }
    case 'medium':
    case 'hi':
      return { type: 'SOLID', color: { r: 1, g: 1, b: 1 } } // White
    case 'creative':
      return { type: 'SOLID', color: { r: 0.98, g: 0.98, b: 1 } } // Slight blue
  }
}

function getInputStroke(fidelity: DesignSpecV1['render']['intent']['fidelity'], intent?: DesignSpecV1['meta']['intent']): Paint {
  // Use intent primary color for input stroke if available
  if (intent?.primaryColor) {
    const color = parseColor(intent.primaryColor)
    if (color) {
      return { type: 'SOLID', color, opacity: 0.2 }
    }
  }
  switch (fidelity) {
    case 'wireframe':
      return { type: 'SOLID', color: { r: 0.6, g: 0.6, b: 0.6 }, opacity: 1 } // #999999
    case 'medium':
      return { type: 'SOLID', color: { r: 0.88, g: 0.88, b: 0.88 }, opacity: 1 } // #E0E0E0
    case 'hi':
      return { type: 'SOLID', color: { r: 0.85, g: 0.85, b: 0.85 }, opacity: 1 }
    case 'creative':
      return { type: 'SOLID', color: { r: 0.2, g: 0.4, b: 0.8 }, opacity: 1 } // Blue
  }
}

function getInputEffects(fidelity: DesignSpecV1['render']['intent']['fidelity']): Effect[] {
  switch (fidelity) {
    case 'wireframe':
      return []
    case 'medium':
      return []
    case 'hi':
      return [{
        type: 'DROP_SHADOW',
        color: { r: 0, g: 0, b: 0, a: 0.05 },
        offset: { x: 0, y: 1 },
        radius: 2,
        visible: true,
        blendMode: 'NORMAL'
      }]
    case 'creative':
      return [{
        type: 'DROP_SHADOW',
        color: { r: 0.2, g: 0.4, b: 0.8, a: 0.2 },
        offset: { x: 0, y: 2 },
        radius: 4,
        visible: true,
        blendMode: 'NORMAL'
      }]
  }
}

function getCardFill(fidelity: DesignSpecV1['render']['intent']['fidelity']): Paint {
  switch (fidelity) {
    case 'wireframe':
      return { type: 'SOLID', color: { r: 0.95, g: 0.95, b: 0.95 } }
    case 'medium':
    case 'hi':
      return { type: 'SOLID', color: { r: 1, g: 1, b: 1 } } // White
    case 'creative':
      return { type: 'SOLID', color: { r: 0.98, g: 0.98, b: 1 } } // Slight blue
  }
}

function getCardStroke(fidelity: DesignSpecV1['render']['intent']['fidelity'], intent?: DesignSpecV1['meta']['intent']): Paint {
  // Use intent primary color for card stroke if available
  if (intent?.primaryColor) {
    const color = parseColor(intent.primaryColor)
    if (color) {
      return { type: 'SOLID', color, opacity: 0.15 }
    }
  }
  switch (fidelity) {
    case 'wireframe':
      return { type: 'SOLID', color: { r: 0.6, g: 0.6, b: 0.6 }, opacity: 1 } // #999999
    case 'medium':
      return { type: 'SOLID', color: { r: 0.88, g: 0.88, b: 0.88 }, opacity: 1 } // #E0E0E0
    case 'hi':
      return { type: 'SOLID', color: { r: 0.9, g: 0.9, b: 0.9 }, opacity: 1 }
    case 'creative':
      return { type: 'SOLID', color: { r: 0.2, g: 0.4, b: 0.8 }, opacity: 1 } // Blue
  }
}

function getCardEffects(fidelity: DesignSpecV1['render']['intent']['fidelity']): Effect[] {
  switch (fidelity) {
    case 'wireframe':
      return []
    case 'medium':
      return [{
        type: 'DROP_SHADOW',
        color: { r: 0, g: 0, b: 0, a: 0.1 },
        offset: { x: 0, y: 1 },
        radius: 2,
        visible: true,
        blendMode: 'NORMAL'
      }]
    case 'hi':
      return [
        {
          type: 'DROP_SHADOW',
          color: { r: 0, g: 0, b: 0, a: 0.08 },
          offset: { x: 0, y: 2 },
          radius: 4,
          visible: true,
          blendMode: 'NORMAL'
        }
      ]
    case 'creative':
      return [
        {
          type: 'DROP_SHADOW',
          color: { r: 0.2, g: 0.4, b: 0.8, a: 0.3 },
          offset: { x: 0, y: 4 },
          radius: 8,
          visible: true,
          blendMode: 'NORMAL'
        }
      ]
  }
}

function getImageFill(fidelity: DesignSpecV1['render']['intent']['fidelity']): Paint {
  switch (fidelity) {
    case 'wireframe':
      return { type: 'SOLID', color: { r: 1, g: 1, b: 1 }, opacity: 0 } // Transparent fill, just stroke
    case 'medium':
      return { type: 'SOLID', color: { r: 0.95, g: 0.95, b: 0.95 } } // Light gray
    case 'hi':
      // Gradient fill for hi-fidelity
      return { type: 'SOLID', color: { r: 0.9, g: 0.92, b: 0.95 } } // Light blue-gray
    case 'creative':
      // Gradient-like appearance
      return { type: 'SOLID', color: { r: 0.85, g: 0.9, b: 1 } } // Light blue
  }
}

function getImageStroke(fidelity: DesignSpecV1['render']['intent']['fidelity'], intent?: DesignSpecV1['meta']['intent']): Paint {
  // Use intent primary color for image stroke if available
  if (intent?.primaryColor) {
    const color = parseColor(intent.primaryColor)
    if (color) {
      return { type: 'SOLID', color, opacity: 0.2 }
    }
  }
  switch (fidelity) {
    case 'wireframe':
      return { type: 'SOLID', color: { r: 0.6, g: 0.6, b: 0.6 }, opacity: 1 } // #999999
    case 'medium':
      return { type: 'SOLID', color: { r: 0.88, g: 0.88, b: 0.88 }, opacity: 1 } // #E0E0E0
    case 'hi':
      return { type: 'SOLID', color: { r: 0.85, g: 0.85, b: 0.85 }, opacity: 1 }
    case 'creative':
      return { type: 'SOLID', color: { r: 0.2, g: 0.4, b: 0.8 }, opacity: 1 } // Blue
  }
}

function getPlaceholderColor(fidelity: DesignSpecV1['render']['intent']['fidelity']): Paint {
  switch (fidelity) {
    case 'wireframe':
      return { type: 'SOLID', color: { r: 0.6, g: 0.6, b: 0.6 } } // #999999
    case 'medium':
      return { type: 'SOLID', color: { r: 0.7, g: 0.7, b: 0.7 } } // Light gray
    case 'hi':
      return { type: 'SOLID', color: { r: 0.65, g: 0.65, b: 0.65 } }
    case 'creative':
      return { type: 'SOLID', color: { r: 0.4, g: 0.5, b: 0.7 } } // Blue-gray
  }
}

function getCornerRadius(fidelity: DesignSpecV1['render']['intent']['fidelity'], intent?: DesignSpecV1['meta']['intent']): number {
  let baseRadius: number
  switch (fidelity) {
    case 'wireframe':
      baseRadius = 0
      break
    case 'medium':
      baseRadius = 6
      break
    case 'hi':
      baseRadius = 12
      break
    case 'creative':
      baseRadius = 20
      break
  }
  
  // Adjust based on tone: playful = more rounded, serious = less rounded
  if (intent?.tone === 'playful') {
    return baseRadius * 1.5
  } else if (intent?.tone === 'serious') {
    return baseRadius * 0.7
  }
  
  return baseRadius
}

/**
 * Parse color string to RGB color object
 * Supports semantic color names and hex values
 */
function parseColor(colorStr: string): { r: number; g: number; b: number } | null {
  const lower = colorStr.toLowerCase().trim()
  
  // Semantic color names
  const colorMap: Record<string, { r: number; g: number; b: number }> = {
    pink: { r: 1, g: 0.4, b: 0.7 },
    blue: { r: 0.2, g: 0.4, b: 0.9 },
    green: { r: 0.2, g: 0.7, b: 0.4 },
    purple: { r: 0.6, g: 0.3, b: 0.9 },
    orange: { r: 1, g: 0.5, b: 0.2 },
    red: { r: 0.9, g: 0.2, b: 0.2 },
    yellow: { r: 1, g: 0.9, b: 0.2 },
    navy: { r: 0.1, g: 0.2, b: 0.5 },
    teal: { r: 0.2, g: 0.6, b: 0.6 },
    magenta: { r: 1, g: 0.2, b: 0.8 }
  }
  
  if (colorMap[lower]) {
    return colorMap[lower]
  }
  
  // Try hex parsing
  if (lower.startsWith('#')) {
    const hex = lower.slice(1)
    if (hex.length === 6) {
      const r = parseInt(hex.slice(0, 2), 16) / 255
      const g = parseInt(hex.slice(2, 4), 16) / 255
      const b = parseInt(hex.slice(4, 6), 16) / 255
      return { r, g, b }
    }
  }
  
  return null
}
