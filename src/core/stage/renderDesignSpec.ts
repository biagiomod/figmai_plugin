/**
 * Render DesignSpec IR to Stage
 * Converts DesignSpec JSON to real Figma nodes
 */

import type { DesignSpec, DesignNode, FrameSpec, TextSpec, RectangleSpec } from '../design/ir'
import { getTopLevelContainerNode, getAnchorBounds, computePlacement } from './anchor'
import { loadFonts, createContainerFrame, createTextNode } from './primitives'

export interface RenderDesignSpecOptions {
  selectedNode?: SceneNode
  placement?: 'left' | 'right' | 'above' | 'below' | 'center'
  offset?: number
}

/**
 * Parse DesignSpec JSON
 */
export function parseDesignSpecJson(input: string): DesignSpec | null {
  let parsed: any
  try {
    parsed = JSON.parse(input)
  } catch {
    return null
  }

  // Validate version and root
  if (typeof parsed.version !== 'number' || !parsed.root || typeof parsed.root !== 'object') {
    return null
  }

  return parsed as DesignSpec
}

/**
 * Render DesignSpec to stage
 */
export async function renderDesignSpecToStage(
  spec: DesignSpec,
  options: RenderDesignSpecOptions = {}
): Promise<SceneNode> {
  // Build root node from spec
  const rootNode = await buildNodeFromSpec(spec.root)

  // Determine anchor
  const selectedNode = options.selectedNode
  const anchorNode = selectedNode ? getTopLevelContainerNode(selectedNode) : undefined
  const anchorBounds = anchorNode ? getAnchorBounds(anchorNode) : null

  // Position root node
  const placement = computePlacement(
    anchorBounds,
    'width' in rootNode ? rootNode.width : 0,
    'height' in rootNode ? rootNode.height : 0,
    {
      mode: options.placement ?? 'left',
      offset: options.offset ?? 40
    }
  )
  rootNode.x = placement.x
  rootNode.y = placement.y

  // Append to page
  figma.currentPage.appendChild(rootNode)

  // Scroll into view and select
  figma.currentPage.selection = [rootNode]
  figma.viewport.scrollAndZoomIntoView([rootNode])

  return rootNode
}

/**
 * Build Figma node from DesignNode spec
 */
async function buildNodeFromSpec(nodeSpec: DesignNode): Promise<SceneNode> {
  switch (nodeSpec.type) {
    case 'frame':
      return await buildFrameFromSpec(nodeSpec)
    case 'text':
      return await buildTextFromSpec(nodeSpec)
    case 'rect':
      return await buildRectangleFromSpec(nodeSpec)
    case 'image':
      // Placeholder: not implemented yet
      throw new Error('ImageSpec not yet implemented')
    case 'instance':
      // Placeholder: not implemented yet
      throw new Error('ComponentInstanceSpec not yet implemented')
    default:
      throw new Error(`Unknown DesignNode type: ${(nodeSpec as any).type}`)
  }
}

/**
 * Build FrameNode from FrameSpec
 */
async function buildFrameFromSpec(spec: FrameSpec): Promise<FrameNode> {
  const frame = figma.createFrame()
  frame.name = spec.name ?? 'Frame'
  frame.resize(spec.width, spec.height)

  // Apply layout if specified
  if (spec.layout) {
    if (spec.layout.mode === 'auto') {
      frame.layoutMode = spec.layout.direction === 'horizontal' ? 'HORIZONTAL' : 'VERTICAL'
      frame.primaryAxisSizingMode = 'AUTO'
      frame.counterAxisSizingMode = 'AUTO'

      if (spec.layout.primaryAlign) {
        frame.primaryAxisAlignItems = spec.layout.primaryAlign
      }
      if (spec.layout.counterAlign) {
        frame.counterAxisAlignItems = spec.layout.counterAlign
      }
    } else {
      frame.layoutMode = 'NONE'
    }
  } else {
    frame.layoutMode = 'NONE'
  }

  // Apply padding
  if (spec.padding) {
    if (spec.padding.all !== undefined) {
      frame.paddingTop = spec.padding.all
      frame.paddingRight = spec.padding.all
      frame.paddingBottom = spec.padding.all
      frame.paddingLeft = spec.padding.all
    } else {
      frame.paddingTop = spec.padding.top ?? 0
      frame.paddingRight = spec.padding.right ?? 0
      frame.paddingBottom = spec.padding.bottom ?? 0
      frame.paddingLeft = spec.padding.left ?? 0
    }
  }

  // Apply gap
  if (spec.gap !== undefined) {
    frame.itemSpacing = spec.gap
  }

  // Apply common styles
  applyCommonStyles(frame, spec)

  // Build children
  if (spec.children) {
    let currentY = frame.paddingTop ?? 0
    let currentX = frame.paddingLeft ?? 0

    for (const childSpec of spec.children) {
      const childNode = await buildNodeFromSpec(childSpec)

      if (frame.layoutMode === 'NONE') {
        // Absolute positioning
        childNode.x = currentX
        childNode.y = currentY
        currentY += ('height' in childNode ? childNode.height : 0) + (spec.gap ?? 12)
      }
      
      // Append to frame (auto-layout will handle positioning if enabled)
      frame.appendChild(childNode)
    }
  }

  return frame
}

/**
 * Build TextNode from TextSpec
 */
async function buildTextFromSpec(spec: TextSpec): Promise<TextNode> {
  const fonts = await loadFonts()

  // Convert lineHeight to proper format
  let lineHeight: LineHeight | undefined
  if (spec.lineHeight !== undefined) {
    if (typeof spec.lineHeight === 'number') {
      lineHeight = { value: spec.lineHeight, unit: 'PIXELS' }
    } else {
      lineHeight = spec.lineHeight
    }
  }

  const textNode = await createTextNode(spec.text, {
    fontSize: spec.fontSize ?? 12,
    fontName: spec.fontName ?? fonts.regular,
    fills: spec.fills ?? [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }],
    lineHeight: lineHeight,
    letterSpacing: spec.letterSpacing,
    textAlign: spec.textAlign
  })

  if (spec.name) {
    textNode.name = spec.name
  }

  return textNode
}

/**
 * Build RectangleNode from RectangleSpec
 */
async function buildRectangleFromSpec(spec: RectangleSpec): Promise<RectangleNode> {
  const rect = figma.createRectangle()
  rect.name = spec.name ?? 'Rectangle'
  rect.resize(spec.width, spec.height)

  applyCommonStyles(rect, spec)

  return rect
}

/**
 * Apply common styles (fills, strokes, cornerRadius)
 */
function applyCommonStyles(
  node: FrameNode | RectangleNode,
  spec: FrameSpec | RectangleSpec
): void {
  if (spec.fills) {
    node.fills = spec.fills as Paint[]
  }

  if (spec.strokes) {
    node.strokes = spec.strokes as Paint[]
    // Apply strokeWeight from first stroke if it has weight property
    for (const stroke of spec.strokes) {
      if ('weight' in stroke && typeof stroke.weight === 'number') {
        node.strokeWeight = stroke.weight
        break
      }
    }
  }

  if (spec.cornerRadius !== undefined) {
    if (node.type === 'FRAME') {
      node.cornerRadius = spec.cornerRadius
    } else if (node.type === 'RECTANGLE') {
      node.cornerRadius = spec.cornerRadius
    }
  }
}

