/**
 * Create Text Frame on Canvas
 * Creates a text frame with the response content on the Figma canvas
 */

/**
 * Create a text frame with the response content on the canvas
 * Positions it to the left of the selected element
 */
export async function createTextFrameOnCanvas(
  content: string,
  selectedNode: SceneNode
): Promise<void> {
  // Load Inter font
  await figma.loadFontAsync({ family: 'Inter', style: 'Regular' })

  // Create a frame to contain the text
  const frame = figma.createFrame()
  frame.name = 'Design Critique'
  frame.layoutMode = 'VERTICAL'
  frame.paddingTop = 24
  frame.paddingRight = 24
  frame.paddingBottom = 24
  frame.paddingLeft = 24
  frame.itemSpacing = 12
  frame.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }]
  frame.strokes = [{ type: 'SOLID', color: { r: 0.9, g: 0.9, b: 0.9 } }]
  frame.strokeWeight = 1
  frame.cornerRadius = 8
  frame.resize(400, 600) // Initial size, will auto-resize

  // Create text node with the content
  const textNode = figma.createText()
  textNode.fontName = { family: 'Inter', style: 'Regular' }
  textNode.fontSize = 12
  textNode.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.2, b: 0.2 } }]
  textNode.characters = content
  textNode.textAutoResize = 'HEIGHT'
  
  // Set text constraints
  textNode.resize(352, textNode.height) // Width matches frame padding
  
  frame.appendChild(textNode)

  // Auto-resize frame to fit content
  frame.layoutSizingHorizontal = 'HUG'
  frame.layoutSizingVertical = 'HUG'

  // Find the top-level container (travel up until we reach the page)
  let topLevelContainer: SceneNode = selectedNode
  let currentNode: BaseNode | null = selectedNode.parent
  
  while (currentNode && currentNode.type !== 'PAGE' && currentNode.type !== 'DOCUMENT') {
    if (currentNode.type === 'FRAME' || currentNode.type === 'GROUP' || currentNode.type === 'COMPONENT' || currentNode.type === 'INSTANCE') {
      topLevelContainer = currentNode as SceneNode
    }
    currentNode = currentNode.parent
  }

  // Always add frame to the page level (root level) FIRST
  // This is required for auto-layout to calculate the frame size
  figma.currentPage.appendChild(frame)

  // Get absolute position of the top-level container
  // We need to calculate the absolute position by traversing up the tree
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

  const containerAbsolutePos = getAbsolutePosition(topLevelContainer)
  const containerBounds = {
    x: containerAbsolutePos.x,
    y: containerAbsolutePos.y,
    width: 'width' in topLevelContainer ? topLevelContainer.width : 0,
    height: 'height' in topLevelContainer ? topLevelContainer.height : 0
  }

  // Wait for frame to calculate its size (auto-layout needs to run)
  // Force a layout pass by accessing the width property
  // Note: With HUG sizing, the width should be calculated after appending to page
  let frameWidth = frame.width
  let frameHeight = frame.height
  
  // If frame width is still the initial resize value (400), it means auto-layout hasn't calculated yet
  // In this case, we'll use a reasonable default width for positioning
  if (frameWidth <= 0 || frameWidth === 400) {
    // Estimate width based on content (paddings + reasonable content width)
    frameWidth = 400 // Use initial size as fallback
    console.log('[CreateTextFrame] Using fallback width:', frameWidth)
  } else {
    console.log('[CreateTextFrame] Frame calculated width:', frameWidth, 'height:', frameHeight)
  }

  // Position to the left of the top-level container with 40px spacing
  const spacing = 40
  const targetX = containerBounds.x - frameWidth - spacing
  const targetY = containerBounds.y
  
  console.log('[CreateTextFrame] Positioning frame:', {
    containerX: containerBounds.x,
    containerY: containerBounds.y,
    frameWidth,
    spacing,
    targetX,
    targetY
  })
  
  frame.x = targetX
  frame.y = targetY

  // Ensure frame is visible and select it
  figma.currentPage.selection = [frame]
  figma.viewport.scrollAndZoomIntoView([frame])
  
  console.log('[CreateTextFrame] Frame positioned at:', { x: frame.x, y: frame.y, width: frame.width, height: frame.height })
}

