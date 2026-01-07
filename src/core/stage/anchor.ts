/**
 * Stage Anchor & Placement System
 * Unified placement logic for all stage outputs
 */

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export interface PlacementOptions {
  mode?: 'left' | 'right' | 'above' | 'below' | 'center'
  offset?: number
  minX?: number
}

/**
 * Get topmost container node that is a direct child of the page
 */
export function getTopLevelContainerNode(node: SceneNode): SceneNode {
  let topLevelNode: SceneNode = node
  let currentNode: BaseNode | null = node

  while (currentNode && currentNode.parent) {
    if (currentNode.parent.type === 'PAGE') {
      topLevelNode = currentNode as SceneNode
      break
    }
    currentNode = currentNode.parent
  }

  return topLevelNode
}

/**
 * Get anchor bounds (absoluteBoundingBox -> absoluteRenderBounds -> fallback)
 */
export function getAnchorBounds(node: SceneNode): Rect | null {
  if ('absoluteBoundingBox' in node && node.absoluteBoundingBox) {
    return node.absoluteBoundingBox
  }

  if ('absoluteRenderBounds' in node && node.absoluteRenderBounds) {
    return node.absoluteRenderBounds
  }

  // Fallback: use node position
  if ('x' in node && 'y' in node && 'width' in node && 'height' in node) {
    return {
      x: node.x,
      y: node.y,
      width: node.width,
      height: node.height
    }
  }

  return null
}

/**
 * Compute placement coordinates
 */
export function computePlacement(
  anchorBounds: Rect | null,
  outputWidth: number,
  outputHeight: number,
  options: PlacementOptions = {}
): { x: number; y: number } {
  const mode = options.mode ?? 'left'
  const offset = options.offset ?? 40
  const minX = options.minX ?? 0

  if (!anchorBounds) {
    // No anchor: center in viewport
    const viewport = figma.viewport.center
    return {
      x: viewport.x - outputWidth / 2,
      y: viewport.y - outputHeight / 2
    }
  }

  let x: number
  let y: number

  switch (mode) {
    case 'left':
      x = anchorBounds.x - outputWidth - offset
      y = anchorBounds.y
      break
    case 'right':
      x = anchorBounds.x + anchorBounds.width + offset
      y = anchorBounds.y
      break
    case 'above':
      x = anchorBounds.x
      y = anchorBounds.y - outputHeight - offset
      break
    case 'below':
      x = anchorBounds.x
      y = anchorBounds.y + anchorBounds.height + offset
      break
    case 'center':
      x = anchorBounds.x + anchorBounds.width / 2 - outputWidth / 2
      y = anchorBounds.y + anchorBounds.height / 2 - outputHeight / 2
      break
    default:
      x = anchorBounds.x - outputWidth - offset
      y = anchorBounds.y
  }

  // Clamp x to prevent going off-screen
  x = Math.max(x, minX)

  return { x, y }
}

