/**
 * Render Placeholder Scorecard
 * 
 * Manual Test Checklist:
 * 1. Select a nested node inside a container frame. Click "Scorecard (Placeholder)".
 *    - Scorecard appears 40px LEFT of the TOPMOST page-level container.
 * 2. Select a top-level frame on the page. Click the action.
 *    - Scorecard appears 40px LEFT of that frame.
 * 3. No selection. Click the action.
 *    - Scorecard appears centered in viewport.
 * 4. No console errors. No auto-layout sizing errors.
 * 5. Home reset clears any placeholder error banners if one appears.
 */

import { getTopLevelContainerNode, getAnchorBounds, computePlacement } from '../stage/anchor'
import { loadFonts, createContainerFrame, createTextNode } from '../stage/primitives'

/**
 * Placeholder scorecard data
 */
const PLACEHOLDER_SCORECARD = {
  score: 82,
  summary: 'This is a placeholder scorecard for visual design iteration. It demonstrates the scorecard layout without calling the LLM.',
  wins: [
    'Clear visual hierarchy with consistent spacing',
    'Strong color contrast meets WCAG AA standards',
    'Interactive elements have clear affordances'
  ],
  fixes: [
    'Increase text contrast for body text (currently #666, suggest #333)',
    'Add 8px spacing between related form fields to improve grouping',
    'Make hover states more obvious with visual feedback'
  ],
  checklist: [
    '✓ Primary action is visually dominant',
    '✓ Related elements are grouped using spacing',
    '✗ Interactive elements need hover states',
    '✓ Text is readable without zooming'
  ],
  notes: [
    'Overall solid design with room for improvement in micro-interactions',
    'Consider adding loading states for async actions'
  ]
}

/**
 * Render placeholder scorecard on canvas
 * Uses simple absolute layout (no auto-layout) for robustness
 */
export async function renderPlaceholderScorecard(selectedNode?: SceneNode): Promise<void> {
  const fonts = await loadFonts()
  await figma.loadFontAsync({ family: 'Inter', style: 'Semi Bold' })

  const CONTAINER_WIDTH = 640
  const PADDING = 16
  const GAP = 12
  const SECTION_GAP = 20

  // Create main container frame (NO auto-layout)
  const container = createContainerFrame('FigmAI — Scorecard', 0, 0, CONTAINER_WIDTH, 100)
  container.fills = [{ type: 'SOLID', color: { r: 0.98, g: 0.98, b: 0.98 } }]
  container.strokes = [{ type: 'SOLID', color: { r: 0.85, g: 0.85, b: 0.85 } }]
  container.strokeWeight = 1
  container.cornerRadius = 8

  let currentY = PADDING

  // Header row: Title + Score badge
  const headerRow = figma.createFrame()
  headerRow.name = 'Header'
  headerRow.resize(CONTAINER_WIDTH - PADDING * 2, 30)
  headerRow.x = PADDING
  headerRow.y = currentY
  headerRow.fills = []
  container.appendChild(headerRow)

  // Title
  const title = await createTextNode('Design Critique', {
    fontSize: 16,
    fontName: fonts.bold,
    fills: [{ type: 'SOLID', color: { r: 0.2, g: 0.2, b: 0.2 } }]
  })
  title.x = 0
  title.y = 0
  headerRow.appendChild(title)

  // Score badge
  const scoreBadge = figma.createFrame()
  scoreBadge.name = 'Score Badge'
  scoreBadge.resize(80, 28)
  scoreBadge.x = CONTAINER_WIDTH - PADDING * 2 - 80
  scoreBadge.y = 1
  scoreBadge.cornerRadius = 12

  const scoreColor = { r: 0.96, g: 0.62, b: 0.04 } // Yellow for score 82
  scoreBadge.fills = [{ type: 'SOLID', color: { r: scoreColor.r * 0.15, g: scoreColor.g * 0.15, b: scoreColor.b * 0.15 } }]
  scoreBadge.strokes = [{ type: 'SOLID', color: scoreColor, opacity: 0.3 }]
  scoreBadge.strokeWeight = 1

  const scoreText = await createTextNode(`${PLACEHOLDER_SCORECARD.score}`, {
    fontSize: 14,
    fontName: fonts.bold,
    fills: [{ type: 'SOLID', color: scoreColor }]
  })
  scoreText.x = 12
  scoreText.y = 6
  scoreBadge.appendChild(scoreText)

  const scoreLabel = await createTextNode('/100', {
    fontSize: 12,
    fontName: fonts.regular,
    fills: [{ type: 'SOLID', color: { r: 0.5, g: 0.5, b: 0.5 } }]
  })
  scoreLabel.x = scoreText.x + scoreText.width + 4
  scoreLabel.y = 7
  scoreBadge.appendChild(scoreLabel)

  headerRow.appendChild(scoreBadge)
  currentY += headerRow.height + GAP

  // Subtitle
  const subtitle = await createTextNode('Placeholder (no LLM)', {
    fontSize: 11,
    fontName: fonts.italic,
    fills: [{ type: 'SOLID', color: { r: 0.5, g: 0.5, b: 0.5 } }]
  })
  subtitle.x = PADDING
  subtitle.y = currentY
  subtitle.resize(CONTAINER_WIDTH - PADDING * 2, subtitle.height)
  container.appendChild(subtitle)
  currentY += subtitle.height + SECTION_GAP

  // Summary
  const summary = await createTextNode(PLACEHOLDER_SCORECARD.summary, {
    fontSize: 13,
    fontName: fonts.regular,
    fills: [{ type: 'SOLID', color: { r: 0.3, g: 0.3, b: 0.3 } }]
  })
  summary.x = PADDING
  summary.y = currentY
  summary.resize(CONTAINER_WIDTH - PADDING * 2, summary.height)
  container.appendChild(summary)
  currentY += summary.height + SECTION_GAP

  // Wins section
  const winsTitle = await createTextNode('Wins', {
    fontSize: 14,
    fontName: { family: 'Inter', style: 'Semi Bold' },
    fills: [{ type: 'SOLID', color: { r: 0.16, g: 0.73, b: 0.51 } }]
  })
  winsTitle.x = PADDING
  winsTitle.y = currentY
  container.appendChild(winsTitle)
  currentY += winsTitle.height + 8

  for (const win of PLACEHOLDER_SCORECARD.wins) {
    const winText = await createTextNode(`• ${win}`, {
      fontSize: 12,
      fontName: fonts.regular,
      fills: [{ type: 'SOLID', color: { r: 0.2, g: 0.2, b: 0.2 } }]
    })
    winText.x = PADDING
    winText.y = currentY
    winText.resize(CONTAINER_WIDTH - PADDING * 2, winText.height)
    container.appendChild(winText)
    currentY += winText.height + 6
  }
  currentY += SECTION_GAP - 6

  // Fixes section
  const fixesTitle = await createTextNode('Fixes', {
    fontSize: 14,
    fontName: { family: 'Inter', style: 'Semi Bold' },
    fills: [{ type: 'SOLID', color: { r: 0.96, g: 0.62, b: 0.04 } }]
  })
  fixesTitle.x = PADDING
  fixesTitle.y = currentY
  container.appendChild(fixesTitle)
  currentY += fixesTitle.height + 8

  for (const fix of PLACEHOLDER_SCORECARD.fixes) {
    const fixText = await createTextNode(`• ${fix}`, {
      fontSize: 12,
      fontName: fonts.regular,
      fills: [{ type: 'SOLID', color: { r: 0.2, g: 0.2, b: 0.2 } }]
    })
    fixText.x = PADDING
    fixText.y = currentY
    fixText.resize(CONTAINER_WIDTH - PADDING * 2, fixText.height)
    container.appendChild(fixText)
    currentY += fixText.height + 6
  }
  currentY += SECTION_GAP - 6

  // Checklist section
  const checklistTitle = await createTextNode('Checklist', {
    fontSize: 14,
    fontName: { family: 'Inter', style: 'Semi Bold' },
    fills: [{ type: 'SOLID', color: { r: 0.2, g: 0.2, b: 0.2 } }]
  })
  checklistTitle.x = PADDING
  checklistTitle.y = currentY
  container.appendChild(checklistTitle)
  currentY += checklistTitle.height + 8

  for (const item of PLACEHOLDER_SCORECARD.checklist) {
    const itemText = await createTextNode(item, {
      fontSize: 12,
      fontName: fonts.regular,
      fills: [{ type: 'SOLID', color: { r: 0.2, g: 0.2, b: 0.2 } }]
    })
    itemText.x = PADDING
    itemText.y = currentY
    itemText.resize(CONTAINER_WIDTH - PADDING * 2, itemText.height)
    container.appendChild(itemText)
    currentY += itemText.height + 6
  }
  currentY += SECTION_GAP - 6

  // Notes section
  const notesTitle = await createTextNode('Notes', {
    fontSize: 14,
    fontName: { family: 'Inter', style: 'Semi Bold' },
    fills: [{ type: 'SOLID', color: { r: 0.5, g: 0.5, b: 0.5 } }]
  })
  notesTitle.x = PADDING
  notesTitle.y = currentY
  container.appendChild(notesTitle)
  currentY += notesTitle.height + 8

  for (const note of PLACEHOLDER_SCORECARD.notes) {
    const noteText = await createTextNode(`• ${note}`, {
      fontSize: 12,
      fontName: fonts.regular,
      fills: [{ type: 'SOLID', color: { r: 0.2, g: 0.2, b: 0.2 } }]
    })
    noteText.x = PADDING
    noteText.y = currentY
    noteText.resize(CONTAINER_WIDTH - PADDING * 2, noteText.height)
    container.appendChild(noteText)
    currentY += noteText.height + 6
  }

  // Resize container to fit content
  currentY += PADDING
  container.resize(CONTAINER_WIDTH, currentY)

  // Position container using anchor logic
  const anchorNode = selectedNode ? getTopLevelContainerNode(selectedNode) : undefined
  const anchorBounds = anchorNode ? getAnchorBounds(anchorNode) : null

  const placement = computePlacement(anchorBounds, container.width, container.height, {
    mode: 'left',
    offset: 40
  })
  container.x = placement.x
  container.y = placement.y

  // Append to page
  figma.currentPage.appendChild(container)

  // Scroll into view and select
  figma.currentPage.selection = [container]
  figma.viewport.scrollAndZoomIntoView([container])
}

