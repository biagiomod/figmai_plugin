/**
 * Placement Utilities
 * Shared logic for resolving root container and calculating placement coordinates
 * Used by all canvas rendering functions to ensure consistent positioning
 */

/**
 * Find the top-level container by traversing upward from a selected node
 * Returns the root-level container (frame, group, component, or instance)
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

