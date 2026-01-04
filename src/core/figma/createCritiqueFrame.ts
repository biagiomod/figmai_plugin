/**
 * Create Critique Frame on Canvas
 * Creates a formatted text frame with the design critique on the Figma canvas
 */

export interface CritiqueData {
  score: number
  wins: string[]
  fixes: string[]
  checklist: string[]
  notes: string
}

/**
 * Create a formatted text frame with the critique on the canvas
 * Positions it to the left of the selected element
 */
export async function createCritiqueFrameOnCanvas(
  critique: CritiqueData,
  selectedNode: SceneNode
): Promise<void> {
  // Load Inter font (Figma default)
  await figma.loadFontAsync({ family: 'Inter', style: 'Regular' })
  await figma.loadFontAsync({ family: 'Inter', style: 'Bold' })
  await figma.loadFontAsync({ family: 'Inter', style: 'Semi Bold' })

  // Create a frame to contain the critique
  const frame = figma.createFrame()
  frame.name = 'Design Critique'
  frame.layoutMode = 'VERTICAL'
  frame.paddingTop = 24
  frame.paddingRight = 24
  frame.paddingBottom = 24
  frame.paddingLeft = 24
  frame.itemSpacing = 16
  frame.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }]
  frame.strokes = [{ type: 'SOLID', color: { r: 0.9, g: 0.9, b: 0.9 } }]
  frame.strokeWeight = 1
  frame.cornerRadius = 8
  frame.resize(400, 600) // Will auto-resize based on content

  // Score section
  const scoreText = figma.createText()
  await figma.loadFontAsync({ family: 'Inter', style: 'Bold' })
  scoreText.fontName = { family: 'Inter', style: 'Bold' }
  scoreText.fontSize = 48
  const scoreColor = critique.score >= 80 ? { r: 0.06, g: 0.73, b: 0.51 } : // green
                     critique.score >= 60 ? { r: 0.96, g: 0.62, b: 0.04 } : // orange
                     { r: 0.94, g: 0.27, b: 0.27 } // red
  scoreText.fills = [{ type: 'SOLID', color: scoreColor }]
  scoreText.characters = `${critique.score}`
  frame.appendChild(scoreText)

  const scoreLabel = figma.createText()
  await figma.loadFontAsync({ family: 'Inter', style: 'Regular' })
  scoreLabel.fontName = { family: 'Inter', style: 'Regular' }
  scoreLabel.fontSize = 14
  scoreLabel.fills = [{ type: 'SOLID', color: { r: 0.5, g: 0.5, b: 0.5 } }]
  scoreLabel.characters = '/ 100'
  frame.appendChild(scoreLabel)

  // Divider
  const divider = figma.createRectangle()
  divider.resize(352, 1)
  divider.fills = [{ type: 'SOLID', color: { r: 0.9, g: 0.9, b: 0.9 } }]
  frame.appendChild(divider)

  // Wins section
  if (critique.wins.length > 0) {
    const winsTitle = figma.createText()
    await figma.loadFontAsync({ family: 'Inter', style: 'Semi Bold' })
    winsTitle.fontName = { family: 'Inter', style: 'Semi Bold' }
    winsTitle.fontSize = 14
    winsTitle.fills = [{ type: 'SOLID', color: { r: 0.06, g: 0.73, b: 0.51 } }]
    winsTitle.characters = 'Wins'
    frame.appendChild(winsTitle)

    for (const win of critique.wins) {
      const winText = figma.createText()
      await figma.loadFontAsync({ family: 'Inter', style: 'Regular' })
      winText.fontName = { family: 'Inter', style: 'Regular' }
      winText.fontSize = 12
      winText.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.2, b: 0.2 } }]
      winText.characters = `• ${win}`
      winText.textAutoResize = 'HEIGHT'
      frame.appendChild(winText)
    }
  }

  // Fixes section
  if (critique.fixes.length > 0) {
    const fixesTitle = figma.createText()
    await figma.loadFontAsync({ family: 'Inter', style: 'Semi Bold' })
    fixesTitle.fontName = { family: 'Inter', style: 'Semi Bold' }
    fixesTitle.fontSize = 14
    fixesTitle.fills = [{ type: 'SOLID', color: { r: 0.96, g: 0.62, b: 0.04 } }]
    fixesTitle.characters = 'Fixes'
    frame.appendChild(fixesTitle)

    for (const fix of critique.fixes) {
      const fixText = figma.createText()
      await figma.loadFontAsync({ family: 'Inter', style: 'Regular' })
      fixText.fontName = { family: 'Inter', style: 'Regular' }
      fixText.fontSize = 12
      fixText.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.2, b: 0.2 } }]
      fixText.characters = `• ${fix}`
      fixText.textAutoResize = 'HEIGHT'
      frame.appendChild(fixText)
    }
  }

  // Checklist section
  if (critique.checklist.length > 0) {
    const checklistTitle = figma.createText()
    await figma.loadFontAsync({ family: 'Inter', style: 'Semi Bold' })
    checklistTitle.fontName = { family: 'Inter', style: 'Semi Bold' }
    checklistTitle.fontSize = 14
    checklistTitle.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.2, b: 0.2 } }]
    checklistTitle.characters = 'Checklist'
    frame.appendChild(checklistTitle)

    for (const item of critique.checklist) {
      const itemText = figma.createText()
      await figma.loadFontAsync({ family: 'Inter', style: 'Regular' })
      itemText.fontName = { family: 'Inter', style: 'Regular' }
      itemText.fontSize = 12
      itemText.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.2, b: 0.2 } }]
      itemText.characters = item
      itemText.textAutoResize = 'HEIGHT'
      frame.appendChild(itemText)
    }
  }

  // Notes section
  if (critique.notes) {
    const notesDivider = figma.createRectangle()
    notesDivider.resize(352, 1)
    notesDivider.fills = [{ type: 'SOLID', color: { r: 0.9, g: 0.9, b: 0.9 } }]
    frame.appendChild(notesDivider)

    const notesText = figma.createText()
    await figma.loadFontAsync({ family: 'Inter', style: 'Italic' })
    notesText.fontName = { family: 'Inter', style: 'Italic' }
    notesText.fontSize = 12
    notesText.fills = [{ type: 'SOLID', color: { r: 0.5, g: 0.5, b: 0.5 } }]
    notesText.characters = critique.notes
    notesText.textAutoResize = 'HEIGHT'
    frame.appendChild(notesText)
  }

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
    console.log('[CreateCritiqueFrame] Using fallback width:', frameWidth)
  } else {
    console.log('[CreateCritiqueFrame] Frame calculated width:', frameWidth, 'height:', frameHeight)
  }

  // Position to the left of the top-level container with 40px spacing
  const spacing = 40
  const targetX = containerBounds.x - frameWidth - spacing
  const targetY = containerBounds.y
  
  console.log('[CreateCritiqueFrame] Positioning frame:', {
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
  
  console.log('[CreateCritiqueFrame] Frame positioned at:', { x: frame.x, y: frame.y, width: frame.width, height: frame.height })
}

