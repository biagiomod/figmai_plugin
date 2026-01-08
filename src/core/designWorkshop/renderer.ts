/**
 * Design Workshop Renderer
 * 
 * Renders DesignSpecV1 to Figma canvas as a Section containing 1-5 screen frames.
 * Section placement: below lowest existing node + 120px, or at origin if no nodes.
 */

import type { DesignSpecV1, BlockSpec } from './types'
import { loadFonts, createTextNode, createAutoLayoutFrameSafe } from '../stage/primitives'

/**
 * Render Design Spec to Section
 * 
 * Creates a new Section (FrameNode) on the current page and places 1-5 screen frames inside it.
 * Screens are arranged horizontally with 80px spacing.
 * 
 * @param spec - Normalized DesignSpecV1
 * @returns Section node and array of screen frames
 */
export async function renderDesignSpecToSection(spec: DesignSpecV1): Promise<{ section: FrameNode, screens: FrameNode[] }> {
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

  for (const screenSpec of spec.screens) {
    const screenFrame = await renderScreen(screenSpec, spec.canvas.device, fidelity)
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

  return { section, screens }
}

/**
 * Render a single screen frame
 */
async function renderScreen(
  screenSpec: DesignSpecV1['screens'][0],
  device: DesignSpecV1['canvas']['device'],
  fidelity: DesignSpecV1['render']['intent']['fidelity']
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
    const blockNode = await renderBlock(block, fidelity, device.width - (screenFrame.paddingLeft + screenFrame.paddingRight))
    screenFrame.appendChild(blockNode)
  }

  // Apply fidelity-specific styling to screen frame
  applyFidelityStyling(screenFrame, fidelity)

  return screenFrame
}

/**
 * Render a block to a Figma node
 */
async function renderBlock(
  block: BlockSpec,
  fidelity: DesignSpecV1['render']['intent']['fidelity'],
  maxWidth: number
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
      
      // Apply button styling
      buttonFrame.fills = [getButtonFill(block.variant || 'primary', fidelity)]
      buttonFrame.strokes = [getButtonStroke(block.variant || 'primary', fidelity)]
      buttonFrame.cornerRadius = getCornerRadius(fidelity)
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
      inputFrame.strokes = [getInputStroke(fidelity)]
      inputFrame.cornerRadius = getCornerRadius(fidelity)
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
      cardFrame.strokes = [getCardStroke(fidelity)]
      cardFrame.cornerRadius = getCornerRadius(fidelity)
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
      imageFrame.strokes = [getImageStroke(fidelity)]
      imageFrame.cornerRadius = getCornerRadius(fidelity)
      
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
function applyFidelityStyling(frame: FrameNode, fidelity: DesignSpecV1['render']['intent']['fidelity']): void {
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

function getButtonFill(variant: 'primary' | 'secondary' | 'tertiary', fidelity: DesignSpecV1['render']['intent']['fidelity']): Paint {
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

function getButtonStroke(variant: 'primary' | 'secondary' | 'tertiary', fidelity: DesignSpecV1['render']['intent']['fidelity']): Paint {
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

function getInputStroke(fidelity: DesignSpecV1['render']['intent']['fidelity']): Paint {
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

function getCardStroke(fidelity: DesignSpecV1['render']['intent']['fidelity']): Paint {
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

function getImageStroke(fidelity: DesignSpecV1['render']['intent']['fidelity']): Paint {
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

function getCornerRadius(fidelity: DesignSpecV1['render']['intent']['fidelity']): number {
  switch (fidelity) {
    case 'wireframe':
      return 0
    case 'medium':
      return 6
    case 'hi':
      return 12
    case 'creative':
      return 20
  }
}
