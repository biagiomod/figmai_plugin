/**
 * Render Scorecard
 * Creates a structured scorecard frame for Design Critique responses
 * Uses shared placement utilities to position 40px left of root container
 */

import { findRootContainer, calculateLeftPlacement, applyPlacement } from './placement'

/**
 * Scorecard Data
 * Structured JSON schema for Design Critique responses
 */
export interface ScorecardData {
  score: number | null
  summary: string
  wins: string[]
  fixes: string[]
  checklist: string[]
  notes?: string[]
}

/**
 * Safely set layoutSizingHorizontal to FILL only if parent is auto-layout
 */
function safeSetFill(node: SceneNode): void {
  // Only FrameNode and TextNode support layoutSizingHorizontal
  if (node.type !== 'FRAME' && node.type !== 'TEXT') {
    return
  }
  
  if (node.parent?.type === 'FRAME' && node.parent.layoutMode !== 'NONE') {
    if (node.type === 'FRAME') {
      (node as FrameNode).layoutSizingHorizontal = 'FILL'
    } else if (node.type === 'TEXT') {
      (node as TextNode).layoutSizingHorizontal = 'FILL'
    }
  } else {
    if (node.type === 'FRAME') {
      (node as FrameNode).layoutSizingHorizontal = 'FIXED'
    } else if (node.type === 'TEXT') {
      (node as TextNode).layoutSizingHorizontal = 'FIXED'
    }
  }
}

/**
 * Create a scorecard frame with structured critique data
 * Positions it 40px to the left of the root container
 */
export async function renderScorecard(
  data: ScorecardData,
  selectedNode: SceneNode
): Promise<void> {
  // Load fonts
  await figma.loadFontAsync({ family: 'Inter', style: 'Regular' })
  await figma.loadFontAsync({ family: 'Inter', style: 'Bold' })
  await figma.loadFontAsync({ family: 'Inter', style: 'Semi Bold' })

  // Create wrapper frame with auto-layout (required for FILL to work)
  const wrapper = figma.createFrame()
  wrapper.name = 'Design Critique — Scorecard'
  wrapper.layoutMode = 'VERTICAL'
  wrapper.primaryAxisSizingMode = 'AUTO'
  wrapper.counterAxisSizingMode = 'FIXED'
  wrapper.resize(640, 600) // Fixed width, auto height
  wrapper.paddingTop = 0
  wrapper.paddingRight = 0
  wrapper.paddingBottom = 0
  wrapper.paddingLeft = 0
  wrapper.itemSpacing = 0

  // Create main content frame (the actual scorecard)
  const frame = figma.createFrame()
  frame.name = 'Scorecard Content'
  frame.layoutMode = 'VERTICAL'
  frame.paddingTop = 16
  frame.paddingRight = 16
  frame.paddingBottom = 16
  frame.paddingLeft = 16
  frame.itemSpacing = 12
  frame.fills = [{ type: 'SOLID', color: { r: 0.98, g: 0.98, b: 0.98 } }]
  frame.strokes = [{ type: 'SOLID', color: { r: 0.85, g: 0.85, b: 0.85 } }]
  frame.strokeWeight = 1
  frame.cornerRadius = 8
  safeSetFill(frame) // Safe to set FILL since wrapper is auto-layout
  wrapper.appendChild(frame)

  // Header row: Title + Score badge
  const headerRow = figma.createFrame()
  headerRow.name = 'Header'
  headerRow.layoutMode = 'HORIZONTAL'
  safeSetFill(headerRow) // Safe to set FILL since frame is auto-layout
  headerRow.layoutSizingVertical = 'HUG'
  headerRow.itemSpacing = 12
  headerRow.counterAxisAlignItems = 'CENTER'
  frame.appendChild(headerRow)

  // Title
  const title = figma.createText()
  title.fontName = { family: 'Inter', style: 'Bold' }
  title.fontSize = 16
  title.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.2, b: 0.2 } }]
  title.characters = 'Design Critique'
  title.layoutSizingHorizontal = 'HUG'
  headerRow.appendChild(title)

  // Score badge
  if (data.score !== null) {
    const scoreBadge = figma.createFrame()
    scoreBadge.name = 'Score Badge'
    scoreBadge.layoutMode = 'HORIZONTAL'
    scoreBadge.paddingTop = 6
    scoreBadge.paddingRight = 12
    scoreBadge.paddingBottom = 6
    scoreBadge.paddingLeft = 12
    scoreBadge.itemSpacing = 4
    scoreBadge.cornerRadius = 12
    scoreBadge.layoutSizingHorizontal = 'HUG'
    
    // Score color based on range
    const scoreColor = data.score >= 85 
      ? { r: 0.16, g: 0.73, b: 0.51 } // green-ish
      : data.score >= 70 
      ? { r: 0.96, g: 0.62, b: 0.04 } // yellow-ish
      : { r: 0.94, g: 0.27, b: 0.27 } // red-ish
    
    scoreBadge.fills = [{ type: 'SOLID', color: { r: scoreColor.r * 0.15, g: scoreColor.g * 0.15, b: scoreColor.b * 0.15 } }]
    scoreBadge.strokes = [{ type: 'SOLID', color: scoreColor, opacity: 0.3 }]
    scoreBadge.strokeWeight = 1
    
    const scoreText = figma.createText()
    scoreText.fontName = { family: 'Inter', style: 'Bold' }
    scoreText.fontSize = 14
    scoreText.fills = [{ type: 'SOLID', color: scoreColor }]
    scoreText.characters = `${data.score}`
    scoreText.layoutSizingHorizontal = 'HUG'
    scoreBadge.appendChild(scoreText)
    
    const scoreLabel = figma.createText()
    scoreLabel.fontName = { family: 'Inter', style: 'Regular' }
    scoreLabel.fontSize = 12
    scoreLabel.fills = [{ type: 'SOLID', color: { r: 0.5, g: 0.5, b: 0.5 } }]
    scoreLabel.characters = '/100'
    scoreLabel.layoutSizingHorizontal = 'HUG'
    scoreBadge.appendChild(scoreLabel)
    
    headerRow.appendChild(scoreBadge)
  }

  // Summary section
  if (data.summary) {
    const summaryText = figma.createText()
    summaryText.fontName = { family: 'Inter', style: 'Regular' }
    summaryText.fontSize = 13
    summaryText.fills = [{ type: 'SOLID', color: { r: 0.3, g: 0.3, b: 0.3 } }]
    summaryText.characters = data.summary
    summaryText.textAutoResize = 'HEIGHT'
    safeSetFill(summaryText) // Safe to set FILL since frame is auto-layout
    frame.appendChild(summaryText)
  }

  // Wins section
  if (data.wins.length > 0) {
    const winsSection = createSection('Wins', data.wins, { r: 0.16, g: 0.73, b: 0.51 })
    frame.appendChild(winsSection)
  }

  // Fixes section
  if (data.fixes.length > 0) {
    const fixesSection = createSection('Fixes', data.fixes, { r: 0.96, g: 0.62, b: 0.04 })
    frame.appendChild(fixesSection)
  }

  // Checklist section
  if (data.checklist.length > 0) {
    const checklistSection = createSection('Checklist', data.checklist, { r: 0.2, g: 0.2, b: 0.2 })
    frame.appendChild(checklistSection)
  }

  // Notes section (optional)
  if (data.notes && data.notes.length > 0) {
    const notesSection = createSection('Notes', data.notes, { r: 0.5, g: 0.5, b: 0.5 })
    frame.appendChild(notesSection)
  }

  // Auto-resize frame to fit content
  frame.layoutSizingHorizontal = 'HUG'
  frame.layoutSizingVertical = 'HUG'

  // Find root container and calculate placement
  const rootContainer = findRootContainer(selectedNode)
  
  // Append wrapper to page first (required for auto-layout to calculate size)
  figma.currentPage.appendChild(wrapper)
  
  // Calculate placement coordinates (use wrapper for placement)
  const placement = calculateLeftPlacement(wrapper, rootContainer)
  
  // Apply placement to wrapper
  applyPlacement(wrapper, placement.x, placement.y)
  
  // Log final position and container info
  console.log('[RenderScorecard] Scorecard positioned:', {
    score: data.score,
    wrapperPosition: { x: wrapper.x, y: wrapper.y, width: wrapper.width, height: wrapper.height },
    framePosition: { x: frame.x, y: frame.y, width: frame.width, height: frame.height },
    anchorContainer: placement.containerInfo
  })
}

/**
 * Create a section with title and bullet list
 */
function createSection(
  title: string,
  items: string[],
  color: { r: number; g: number; b: number }
): FrameNode {
  const section = figma.createFrame()
  section.name = title
  section.layoutMode = 'VERTICAL'
  safeSetFill(section) // Safe to set FILL since parent frame is auto-layout
  section.layoutSizingVertical = 'HUG'
  section.itemSpacing = 8

  // Section title
  const sectionTitle = figma.createText()
  sectionTitle.fontName = { family: 'Inter', style: 'Semi Bold' }
  sectionTitle.fontSize = 14
  sectionTitle.fills = [{ type: 'SOLID', color }]
  sectionTitle.characters = title
  sectionTitle.layoutSizingHorizontal = 'HUG'
  section.appendChild(sectionTitle)

  // Bullet items
  for (const item of items) {
    const itemText = figma.createText()
    itemText.fontName = { family: 'Inter', style: 'Regular' }
    itemText.fontSize = 12
    itemText.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.2, b: 0.2 } }]
    itemText.characters = `• ${item}`
    itemText.textAutoResize = 'HEIGHT'
    safeSetFill(itemText) // Safe to set FILL since section is auto-layout
    section.appendChild(itemText)
  }

  return section
}

