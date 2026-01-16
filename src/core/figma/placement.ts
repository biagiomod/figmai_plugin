/**
 * Placement Utilities
 * Shared logic for resolving root container and calculating placement coordinates
 * Used by all canvas rendering functions to ensure consistent positioning
 */

import { getTopLevelContainerNode, getAnchorBounds, type Rect } from '../stage/anchor'
import { debug } from '../debug/logger'

/**
 * Find the top-level container by traversing upward from a selected node
 * Returns the root-level container (frame, group, component, or instance)
 * @deprecated Use getPlacementTarget() instead for page-level placement
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

/**
 * Placement result with method and optional reason
 */
export interface PlacementResult {
  x: number
  y: number
  method: 'anchor-left' | 'anchor-right' | 'viewport-center'
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
 * Compute placement coordinates for a node to be placed at page root level
 * Handles edge cases: off-canvas, insufficient space, collisions
 * 
 * Fallback logic:
 * 1. Primary: Place on specified side (left/right) of target with spacing
 * 2. Fallback 1: If insufficient space on primary side, try opposite side
 * 3. Fallback 2: If both sides fail, use viewport center
 * 
 * @param targetBounds - Bounds of the target container (null if no selection)
 * @param placedNodeSize - Size of the node to be placed
 * @param options - Placement options
 * @returns Placement result with coordinates, method, and optional reason
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
 */
export function applyPlacement(frame: FrameNode, x: number, y: number): void {
  frame.x = x
  frame.y = y
  
  // Ensure frame is visible and select it
  figma.currentPage.selection = [frame]
  figma.viewport.scrollAndZoomIntoView([frame])
  
  console.log('[Placement] Frame positioned at:', { x: frame.x, y: frame.y, width: frame.width, height: frame.height })
}

