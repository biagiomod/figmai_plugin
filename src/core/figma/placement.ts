/**
 * Placement Utilities
 * Shared logic for resolving root container and calculating placement coordinates
 * Used by all canvas rendering functions to ensure consistent positioning
 * 
 * CANONICAL PLACEMENT PATH
 * ========================
 * For new code, use this pattern:
 * 
 * 1. Get placement target: `getPlacementTarget(selectedNode)` → returns SceneNode | null
 * 2. Get target bounds: `getAnchorBounds(placementTarget)` → returns Rect | null
 * 3. Compute placement: `computeRootPlacement(targetBounds, nodeSize, options)` → returns PlacementResult
 * 4. Place on page: `placeNodeOnPage(node, { x, y })` → appends, positions, and scrolls into view
 * 
 * Example:
 * ```typescript
 * const placementTarget = getPlacementTarget(selectedNode)
 * const targetBounds = placementTarget ? getAnchorBounds(placementTarget) : null
 * const placement = computeRootPlacement(targetBounds, { width, height }, { side: 'right', spacing: 40 })
 * placeNodeOnPage(node, { x: placement.x, y: placement.y })
 * ```
 * 
 * DEPRECATED FUNCTIONS
 * ====================
 * - findRootContainer() → use getPlacementTarget() instead
 * - calculateLeftPlacement() → use computeRootPlacement() + placeNodeOnPage() instead
 * - applyPlacement() → use placeNodeOnPage() instead
 */

import { getTopLevelContainerNode, getAnchorBounds, type Rect } from '../stage/anchor'
import { debug } from '../debug/logger'

/**
 * Find the top-level container by traversing upward from a selected node
 * Returns the root-level container (frame, group, component, or instance)
 * 
 * @deprecated Use getPlacementTarget() from this module instead for page-level placement.
 * This function is kept for backward compatibility but should not be used in new code.
 */
export function findRootContainer(selectedNode: SceneNode): SceneNode {
  let topLevelContainer: SceneNode = selectedNode
  let currentNode: BaseNode | null = selectedNode.parent
  
  while (currentNode && currentNode.type !== 'PAGE' && currentNode.type !== 'DOCUMENT') {
    if (currentNode.type === 'FRAME' || currentNode.type === 'GROUP' || currentNode.type === 'COMPONENT' || currentNode.type === 'INSTANCE') {
      topLevelContainer = currentNode as SceneNode
    }
    currentNode = currentNode.parent
  }
  
  return topLevelContainer
}

/**
 * Get the placement target (root container) for a selection
 * Returns the direct child of PAGE that contains the selection
 * 
 * @param selectedNode - The selected node (optional)
 * @returns The direct child of PAGE containing the selection, or null if no selection
 */
export function getPlacementTarget(selectedNode?: SceneNode): SceneNode | null {
  if (!selectedNode) {
    return null
  }
  return getTopLevelContainerNode(selectedNode)
}

// --- Smart Placement v2 primitives (collision-aware, single + batch) ---

/**
 * Returns true if two rectangles overlap in page coordinates.
 */
export function rectsOverlap(a: Rect, b: Rect): boolean {
  return !(a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y)
}

/**
 * Union bounds of all direct children of the page (absolute bounds), excluding optional node.
 * Returns null if no children (or all excluded).
 */
export function getPageContentBounds(page: PageNode, exclude?: SceneNode): Rect | null {
  const obstacles = getObstacles(page, exclude)
  if (obstacles.length === 0) return null
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const r of obstacles) {
    minX = Math.min(minX, r.x)
    minY = Math.min(minY, r.y)
    maxX = Math.max(maxX, r.x + r.width)
    maxY = Math.max(maxY, r.y + r.height)
  }
  if (minX === Infinity) return null
  return { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
}

/**
 * Obstacles = absolute bounds of direct children of the page, excluding optional node.
 * Includes locked nodes (do not place on top of them).
 */
export function getObstacles(page: PageNode, exclude?: SceneNode): Rect[] {
  const out: Rect[] = []
  for (const child of page.children) {
    if (child === exclude) continue
    const bounds = getAnchorBounds(child)
    if (bounds) out.push(bounds)
  }
  return out
}

export interface SinglePlacementOptions {
  anchorBounds?: Rect | null
  preferSide?: 'right' | 'left'
  margin?: number
  step?: number
  obstacles?: Rect[]
}

const MAX_BEYOND_ITERATIONS = 80

/** Obstacles that overlap the anchor's y-range (vertical band). Used for RIGHT/LEFT gap-fit. */
function obstaclesInVerticalBand(obstacles: Rect[], anchor: Rect): Rect[] {
  const bandTop = anchor.y
  const bandBottom = anchor.y + anchor.height
  return obstacles.filter(o => !(o.y + o.height <= bandTop || o.y >= bandBottom))
}

/** Obstacles that overlap the anchor's x-range (horizontal band). Used for BELOW/ABOVE gap-fit. */
function obstaclesInHorizontalBand(obstacles: Rect[], anchor: Rect): Rect[] {
  const bandLeft = anchor.x
  const bandRight = anchor.x + anchor.width
  return obstacles.filter(o => !(o.x + o.width <= bandLeft || o.x >= bandRight))
}

/**
 * Low-level: compute position for a single item with collision avoidance.
 * Uses explicit gap-fit: for each direction we only accept if the gap between anchor and nearest
 * obstacle in that band fits the placed size (vertical band for RIGHT/LEFT, horizontal band for BELOW/ABOVE).
 * Candidate order: RIGHT → LEFT → BELOW → ABOVE → beyond rightmost in anchor band.
 * Placement is "closest possible" (tight to anchor + margin) when a gap fits.
 */
export function computeSinglePlacement(
  placedSize: { width: number; height: number },
  options: SinglePlacementOptions = {}
): PlacementResult {
  const margin = options.margin ?? 24
  const step = options.step ?? 24
  const preferSide = options.preferSide ?? 'right'
  const obstacles = options.obstacles ?? []
  const anchor = options.anchorBounds ?? null
  const minX = 0
  const minY = 40
  const placementDebug = debug.scope('subsystem:placement')

  function collides(candidate: Rect): boolean {
    for (const o of obstacles) {
      if (rectsOverlap(candidate, o)) return true
    }
    return false
  }

  if (!anchor) {
    const viewport = figma.viewport.center
    const x = Math.max(viewport.x - placedSize.width / 2, minX)
    const y = Math.max(viewport.y - placedSize.height / 2, minY)
    return { x, y, method: 'viewport-center', reason: 'no_selection' }
  }

  const a = anchor
  const anchorRight = a.x + a.width
  const anchorBottom = a.y + a.height

  /** Returns true if RIGHT candidate fits: no obstacle in band to the right, or gap >= width. */
  function rightGapFits(): boolean {
    const vert = obstaclesInVerticalBand(obstacles, a)
    const toRight = vert.filter(o => o.x >= anchorRight)
    if (toRight.length === 0) return true
    const nearestLeft = Math.min(...toRight.map(o => o.x))
    const gap = (nearestLeft - margin) - (anchorRight + margin)
    if (debug.isEnabled('subsystem:placement')) {
      placementDebug.log('RIGHT gap-fit', { gap, need: placedSize.width, fits: gap >= placedSize.width })
    }
    return gap >= placedSize.width
  }

  /** Returns true if LEFT candidate fits. */
  function leftGapFits(): boolean {
    const vert = obstaclesInVerticalBand(obstacles, a)
    const toLeft = vert.filter(o => o.x + o.width <= a.x)
    if (toLeft.length === 0) return true
    const nearestRight = Math.max(...toLeft.map(o => o.x + o.width))
    const gap = (a.x - margin) - (nearestRight + margin)
    if (debug.isEnabled('subsystem:placement')) {
      placementDebug.log('LEFT gap-fit', { gap, need: placedSize.width, fits: gap >= placedSize.width })
    }
    return gap >= placedSize.width
  }

  /** Returns true if BELOW candidate fits. */
  function belowGapFits(): boolean {
    const horiz = obstaclesInHorizontalBand(obstacles, a)
    const below = horiz.filter(o => o.y >= anchorBottom)
    if (below.length === 0) return true
    const nearestTop = Math.min(...below.map(o => o.y))
    const gap = (nearestTop - margin) - (anchorBottom + margin)
    if (debug.isEnabled('subsystem:placement')) {
      placementDebug.log('BELOW gap-fit', { gap, need: placedSize.height, fits: gap >= placedSize.height })
    }
    return gap >= placedSize.height
  }

  /** Returns true if ABOVE candidate fits. */
  function aboveGapFits(): boolean {
    const horiz = obstaclesInHorizontalBand(obstacles, a)
    const above = horiz.filter(o => o.y + o.height <= a.y)
    if (above.length === 0) return true
    const nearestBottom = Math.max(...above.map(o => o.y + o.height))
    const gap = (a.y - margin - placedSize.height) - (nearestBottom + margin)
    if (debug.isEnabled('subsystem:placement')) {
      placementDebug.log('ABOVE gap-fit', { gap, need: placedSize.height, fits: gap >= placedSize.height })
    }
    return gap >= placedSize.height
  }

  const candidates: { rect: Rect; method: PlacementResult['method']; gapFits: () => boolean }[] = []
  if (preferSide === 'right') {
    candidates.push(
      { rect: { x: anchorRight + margin, y: a.y, width: placedSize.width, height: placedSize.height }, method: 'right', gapFits: rightGapFits },
      { rect: { x: a.x - margin - placedSize.width, y: a.y, width: placedSize.width, height: placedSize.height }, method: 'left', gapFits: leftGapFits },
      { rect: { x: a.x, y: anchorBottom + margin, width: placedSize.width, height: placedSize.height }, method: 'below', gapFits: belowGapFits },
      { rect: { x: a.x, y: a.y - margin - placedSize.height, width: placedSize.width, height: placedSize.height }, method: 'above', gapFits: aboveGapFits }
    )
  } else {
    candidates.push(
      { rect: { x: a.x - margin - placedSize.width, y: a.y, width: placedSize.width, height: placedSize.height }, method: 'left', gapFits: leftGapFits },
      { rect: { x: anchorRight + margin, y: a.y, width: placedSize.width, height: placedSize.height }, method: 'right', gapFits: rightGapFits },
      { rect: { x: a.x, y: anchorBottom + margin, width: placedSize.width, height: placedSize.height }, method: 'below', gapFits: belowGapFits },
      { rect: { x: a.x, y: a.y - margin - placedSize.height, width: placedSize.width, height: placedSize.height }, method: 'above', gapFits: aboveGapFits }
    )
  }

  for (const { rect, method, gapFits } of candidates) {
    if (!gapFits()) {
      if (debug.isEnabled('subsystem:placement')) {
        placementDebug.log(`${method} skipped: gap insufficient`)
      }
      continue
    }
    const x = Math.max(rect.x, minX)
    const y = Math.max(rect.y, minY)
    const r: Rect = { x, y, width: placedSize.width, height: placedSize.height }
    if (!collides(r)) {
      if (debug.isEnabled('subsystem:placement')) {
        placementDebug.log('placement chosen', { method, x, y })
      }
      return { x, y, method }
    }
  }

  // Beyond rightmost in anchor vertical band
  const bandTop = a.y
  const bandBottom = a.y + a.height
  let rightmost = a.x + a.width
  for (const o of obstacles) {
    const oBottom = o.y + o.height
    const oTop = o.y
    if (oBottom <= bandTop || oTop >= bandBottom) continue
    rightmost = Math.max(rightmost, o.x + o.width)
  }
  let startX = rightmost + margin
  startX = Math.ceil(startX / step) * step
  for (let i = 0; i < MAX_BEYOND_ITERATIONS; i++) {
    const x = startX + i * step
    const y = Math.max(a.y, minY)
    const r: Rect = { x, y, width: placedSize.width, height: placedSize.height }
    if (!collides(r)) return { x, y, method: 'beyond-right', reason: 'all_sides_blocked' }
  }
  const x = startX
  const y = Math.max(a.y, minY)
  return { x, y, method: 'beyond-right', reason: 'max_iterations' }
}

/**
 * High-level: append node to page, place it near selection with collision avoidance, select and scroll.
 */
export function placeSingleArtifactNearSelection(
  node: FrameNode,
  options: {
    selectedNode?: SceneNode
    preferSide?: 'right' | 'left'
    margin?: number
    step?: number
  } = {}
): PlacementResult {
  if (node.parent !== figma.currentPage) {
    figma.currentPage.appendChild(node)
  }
  const placementTarget = getPlacementTarget(options.selectedNode)
  const anchorBounds = placementTarget ? getAnchorBounds(placementTarget) : null
  const obstacles = getObstacles(figma.currentPage, node)
  const placement = computeSinglePlacement(
    { width: node.width, height: node.height },
    {
      anchorBounds,
      preferSide: options.preferSide ?? 'right',
      margin: options.margin ?? 24,
      step: options.step ?? 24,
      obstacles
    }
  )
  node.x = placement.x
  node.y = placement.y
  figma.currentPage.selection = [node]
  figma.viewport.scrollAndZoomIntoView([node])
  return placement
}

/**
 * High-level: append node to page, place it below all existing page content (batch placement).
 */
export function placeBatchBelowPageContent(
  node: FrameNode,
  options: { marginTop?: number; minX?: number; minY?: number } = {}
): PlacementResult {
  if (node.parent !== figma.currentPage) {
    figma.currentPage.appendChild(node)
  }
  const marginTop = options.marginTop ?? 24
  const minX = options.minX ?? 0
  const minY = options.minY ?? 0
  const contentBounds = getPageContentBounds(figma.currentPage, node)
  const y = contentBounds ? Math.max(minY, contentBounds.y + contentBounds.height + marginTop) : marginTop
  const x = minX
  node.x = x
  node.y = y
  figma.currentPage.selection = [node]
  figma.viewport.scrollAndZoomIntoView([node])
  return { x, y, method: 'below' }
}

// --- End Smart Placement v2 ---

export interface PlacementResult {
  x: number
  y: number
  method: 'anchor-left' | 'anchor-right' | 'viewport-center' | 'right' | 'left' | 'below' | 'above' | 'beyond-right'
  reason?: string
}

/**
 * Options for root-level placement
 */
export interface RootPlacementOptions {
  spacing?: number        // Default: 40px
  side?: 'left' | 'right' // Default: 'left'
  minX?: number          // Default: 0
  minY?: number          // Default: 40
}

/**
 * Compute placement coordinates for a node to be placed at page root level.
 * No collision checks; left/right then viewport center only.
 * @deprecated Prefer computeSinglePlacement + placeSingleArtifactNearSelection for collision-aware placement. Kept for backward compatibility.
 */
export function computeRootPlacement(
  targetBounds: Rect | null,
  placedNodeSize: { width: number; height: number },
  options: RootPlacementOptions = {}
): PlacementResult {
  const spacing = options.spacing ?? 40
  const side = options.side ?? 'left'
  const minX = options.minX ?? 0
  const minY = options.minY ?? 40
  
  const placementDebug = debug.scope('subsystem:placement')
  
  // No target bounds: use viewport center
  if (!targetBounds) {
    const viewport = figma.viewport.center
    const centeredX = Math.max(viewport.x - placedNodeSize.width / 2, minX)
    const centeredY = Math.max(viewport.y - placedNodeSize.height / 2, minY)
    
    placementDebug.log('No target bounds, using viewport center', {
      x: centeredX,
      y: centeredY,
      viewport: { x: viewport.x, y: viewport.y }
    })
    
    return {
      x: centeredX,
      y: centeredY,
      method: 'viewport-center',
      reason: 'no_selection'
    }
  }
  
  // Try primary side (left or right)
  const requiredSpace = placedNodeSize.width + spacing
  let primaryX: number
  let primaryY: number
  let canPlacePrimary: boolean
  
  if (side === 'left') {
    primaryX = targetBounds.x - requiredSpace
    primaryY = targetBounds.y
    canPlacePrimary = primaryX >= minX
  } else {
    primaryX = targetBounds.x + targetBounds.width + spacing
    primaryY = targetBounds.y
    // Check if right side fits in viewport (rough estimate: viewport width)
    const viewportWidth = figma.viewport.bounds.width || 1920
    canPlacePrimary = primaryX + placedNodeSize.width <= viewportWidth
  }
  
  if (canPlacePrimary) {
    placementDebug.log('Placing on primary side', {
      side,
      x: primaryX,
      y: primaryY,
      targetBounds: { x: targetBounds.x, y: targetBounds.y, width: targetBounds.width, height: targetBounds.height }
    })
    
    return {
      x: Math.max(primaryX, minX),
      y: Math.max(primaryY, minY),
      method: side === 'left' ? 'anchor-left' : 'anchor-right'
    }
  }
  
  // Fallback 1: Try opposite side
  const oppositeSide = side === 'left' ? 'right' : 'left'
  let fallbackX: number
  let fallbackY: number
  let canPlaceFallback: boolean
  
  if (oppositeSide === 'left') {
    fallbackX = targetBounds.x - requiredSpace
    fallbackY = targetBounds.y
    canPlaceFallback = fallbackX >= minX
  } else {
    fallbackX = targetBounds.x + targetBounds.width + spacing
    fallbackY = targetBounds.y
    const viewportWidth = figma.viewport.bounds.width || 1920
    canPlaceFallback = fallbackX + placedNodeSize.width <= viewportWidth
  }
  
  if (canPlaceFallback) {
    placementDebug.log('Primary side failed, using opposite side', {
      primarySide: side,
      fallbackSide: oppositeSide,
      x: fallbackX,
      y: fallbackY,
      reason: side === 'left' ? 'insufficient_left_space' : 'insufficient_right_space'
    })
    
    return {
      x: Math.max(fallbackX, minX),
      y: Math.max(fallbackY, minY),
      method: oppositeSide === 'left' ? 'anchor-left' : 'anchor-right',
      reason: side === 'left' ? 'insufficient_left_space' : 'insufficient_right_space'
    }
  }
  
  // Fallback 2: Use viewport center
  const viewport = figma.viewport.center
  const centeredX = Math.max(viewport.x - placedNodeSize.width / 2, minX)
  const centeredY = Math.max(viewport.y - placedNodeSize.height / 2, minY)
  
  placementDebug.warn('Both sides failed, using viewport center', {
    primarySide: side,
    fallbackSide: oppositeSide,
    primaryX,
    fallbackX,
    viewportCenter: { x: centeredX, y: centeredY },
    reason: 'insufficient_space_both_sides'
  })
  
  return {
    x: centeredX,
    y: centeredY,
    method: 'viewport-center',
    reason: 'insufficient_space_both_sides'
  }
}

/**
 * Place a node on the page at the computed position
 * Appends to page, positions, and scrolls into view
 * 
 * @param node - The frame node to place
 * @param position - The computed position coordinates
 */
export function placeNodeOnPage(
  node: FrameNode,
  position: { x: number; y: number }
): void {
  // Append to page if not already appended
  if (node.parent !== figma.currentPage) {
    figma.currentPage.appendChild(node)
  }
  
  // Set position
  node.x = position.x
  node.y = position.y
  
  // Select and scroll into view
  figma.currentPage.selection = [node]
  figma.viewport.scrollAndZoomIntoView([node])
}

/**
 * Get absolute position of a node by traversing up the tree
 */
function getAbsolutePosition(node: SceneNode): { x: number; y: number } {
  let x = 0
  let y = 0
  let current: BaseNode | null = node
  
  while (current && current.type !== 'PAGE' && current.type !== 'DOCUMENT') {
    if ('x' in current && 'y' in current) {
      x += current.x
      y += current.y
    }
    current = current.parent
  }
  
  return { x, y }
}

/**
 * Calculate placement coordinates for a frame to be positioned 40px to the left of the root container
 * 
 * @deprecated Use computeRootPlacement() + placeNodeOnPage() instead. This function is kept for backward compatibility but should not be used in new code.
 * 
 * @param frame - The frame to position (must be appended to page first for size calculation)
 * @param rootContainer - The root container to position relative to
 * @returns Placement coordinates { x, y } and container info for logging
 */
export function calculateLeftPlacement(
  frame: FrameNode,
  rootContainer: SceneNode
): { x: number; y: number; containerInfo: { id: string; name: string; x: number; y: number } } {
  const containerAbsolutePos = getAbsolutePosition(rootContainer)
  const containerBounds = {
    x: containerAbsolutePos.x,
    y: containerAbsolutePos.y,
    width: 'width' in rootContainer ? rootContainer.width : 0,
    height: 'height' in rootContainer ? rootContainer.height : 0
  }

  // Wait for frame to calculate its size (auto-layout needs to run)
  let frameWidth = frame.width
  
  // If frame width is still the initial resize value (400), it means auto-layout hasn't calculated yet
  if (frameWidth <= 0 || frameWidth === 400) {
    frameWidth = 400 // Use initial size as fallback
    console.log('[Placement] Using fallback width:', frameWidth)
  } else {
    console.log('[Placement] Frame calculated width:', frameWidth, 'height:', frame.height)
  }

  // Position to the left of the top-level container with 40px spacing
  const spacing = 40
  const targetX = containerBounds.x - frameWidth - spacing
  const targetY = containerBounds.y
  
  console.log('[Placement] Positioning frame:', {
    containerX: containerBounds.x,
    containerY: containerBounds.y,
    containerId: rootContainer.id,
    containerName: rootContainer.name,
    frameWidth,
    spacing,
    targetX,
    targetY
  })
  
  return {
    x: targetX,
    y: targetY,
    containerInfo: {
      id: rootContainer.id,
      name: rootContainer.name,
      x: containerBounds.x,
      y: containerBounds.y
    }
  }
}

/**
 * Apply placement to a frame and make it visible
 * 
 * @deprecated Use placeNodeOnPage() instead. This function is kept for backward compatibility but should not be used in new code.
 */
export function applyPlacement(frame: FrameNode, x: number, y: number): void {
  frame.x = x
  frame.y = y
  
  // Ensure frame is visible and select it
  figma.currentPage.selection = [frame]
  figma.viewport.scrollAndZoomIntoView([frame])
  
  console.log('[Placement] Frame positioned at:', { x: frame.x, y: frame.y, width: frame.width, height: frame.height })
}

