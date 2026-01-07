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
 * - If selected node's parent is PAGE, returns selected node
 * - Otherwise, walks up parent chain until finding a node whose parent is PAGE
 * - Returns that topmost page-level container
 */
export function getTopLevelContainerNode(node: SceneNode): SceneNode {
  let currentNode: BaseNode | null = node

  // Walk up parent chain until we find a node whose parent is PAGE
  while (currentNode && currentNode.parent) {
    if (currentNode.parent.type === 'PAGE') {
      // Found the topmost container (direct child of PAGE)
      return currentNode as SceneNode
    }
    currentNode = currentNode.parent
  }

  // Fallback: if we somehow didn't find a PAGE parent, return the original node
  // This should never happen in normal Figma usage, but provides safety
  return node
}

/**
 * Bounds type for absolute positioning
 */
export type Bounds = { x: number; y: number; width: number; height: number }

/**
 * Get absolute bounds for a node using multiple fallback strategies
 * Priority:
 * 1) absoluteBoundingBox (most accurate)
 * 2) absoluteRenderBounds (accurate for visible content)
 * 3) absoluteTransform + width/height (works for most nodes including TEXT/FRAME/INSTANCE/COMPONENT)
 * Returns null only if truly impossible to compute
 */
export function getAbsoluteBounds(node: SceneNode): Bounds | null {
  let bounds: Bounds | null = null
  
  // Priority 1: absoluteBoundingBox
  if ('absoluteBoundingBox' in node && node.absoluteBoundingBox) {
    const bbox = node.absoluteBoundingBox
    bounds = {
      x: bbox.x,
      y: bbox.y,
      width: bbox.width,
      height: bbox.height
    }
  }
  // Priority 2: absoluteRenderBounds
  else if ('absoluteRenderBounds' in node && node.absoluteRenderBounds) {
    const renderBounds = node.absoluteRenderBounds
    bounds = {
      x: renderBounds.x,
      y: renderBounds.y,
      width: renderBounds.width,
      height: renderBounds.height
    }
  }
  // Priority 3: absoluteTransform + width/height
  else if ('absoluteTransform' in node && 'width' in node && 'height' in node) {
    const transform = node.absoluteTransform
    // absoluteTransform is a 2x3 matrix: [[a, c, tx], [b, d, ty]]
    // tx and ty are the translation (x, y) coordinates
    const x = transform[0][2]
    const y = transform[1][2]
    const width = node.width
    const height = node.height
    
    // Validate that we got reasonable values
    if (typeof x === 'number' && typeof y === 'number' && 
        typeof width === 'number' && typeof height === 'number' &&
        !isNaN(x) && !isNaN(y) && !isNaN(width) && !isNaN(height) &&
        width > 0 && height > 0) {
      bounds = { x, y, width, height }
    }
  }
  // Priority 4: Accumulate relative positions up the tree
  else if ('x' in node && 'y' in node && 'width' in node && 'height' in node) {
    // Accumulate absolute position by walking up parent chain
    let absoluteX = 0
    let absoluteY = 0
    // Type assertion: we know node has x/y/width/height from the condition above
    let current: BaseNode | null = node as BaseNode
    
    while (current) {
      // Check if we've reached PAGE or DOCUMENT level
      if (!current.parent || current.parent.type === 'PAGE' || current.parent.type === 'DOCUMENT') {
        break
      }
      // Accumulate position if node has x/y properties
      if ('x' in current && 'y' in current) {
        const posNode = current as SceneNode & { x: number; y: number }
        absoluteX += posNode.x
        absoluteY += posNode.y
      }
      current = current.parent
    }
    
    const posNode = node as SceneNode & { width: number; height: number }
    const width = posNode.width
    const height = posNode.height
    
    // Only use if values are valid
    if (typeof absoluteX === 'number' && typeof absoluteY === 'number' && 
        typeof width === 'number' && typeof height === 'number' &&
        !isNaN(absoluteX) && !isNaN(absoluteY) && !isNaN(width) && !isNaN(height) &&
        width > 0 && height > 0) {
      bounds = { x: absoluteX, y: absoluteY, width, height }
    }
  }

  // Validate bounds: reject (0,0) if node has non-page parent (likely invalid)
  if (bounds && bounds.x === 0 && bounds.y === 0) {
    if (node.parent && node.parent.type !== 'PAGE') {
      // (0,0) with non-page parent is suspicious - likely invalid
      console.warn(`[getAbsoluteBounds] Rejecting (0,0) bounds for node ${node.name} with parent ${node.parent.type}`)
      return null
    }
  }

  return bounds
}

/**
 * Get anchor bounds (uses getAbsoluteBounds for robust computation)
 */
export function getAnchorBounds(node: SceneNode): Rect | null {
  return getAbsoluteBounds(node)
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
    // No anchor bounds available: center in viewport (NOT 0,40)
    const viewport = figma.viewport.center
    const centeredX = viewport.x - outputWidth / 2
    const centeredY = viewport.y - outputHeight / 2
    return {
      x: Math.max(centeredX, minX), // Still clamp X to prevent off-screen
      y: Math.max(centeredY, 40) // Still clamp Y to prevent negative
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
  
  // Clamp y to prevent going off-screen (negative Y)
  const minY = 40 // Minimum Y position to keep content visible
  y = Math.max(y, minY)

  return { x, y }
}

