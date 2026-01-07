/**
 * Render Scorecard
 * Creates structured scorecard frames for Design Critique responses
 * v1: Legacy renderer (kept for compatibility)
 * v2: New 2-column layout, tighter card, colored score pill
 */

import { placeArtifactFrame, removeExistingArtifacts } from './artifacts/placeArtifact'
import { loadFonts, createTextNode } from '../stage/primitives'

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
 * Truncate text to max lines (approximate)
 */
function truncateText(text: string, maxLines: number, fontSize: number): string {
  const charsPerLine = 60 // Approximate
  const maxChars = charsPerLine * maxLines
  if (text.length <= maxChars) {
    return text
  }
  return text.substring(0, maxChars - 3) + '...'
}

/**
 * Type guard: Check if node has an auto-layout parent
 */
function isAutoLayoutParent(node: SceneNode): node is SceneNode & { parent: FrameNode } {
  if (!node.parent) {
    return false
  }
  if (node.parent.type !== 'FRAME') {
    return false
  }
  const parentFrame = node.parent as FrameNode
  return parentFrame.layoutMode !== 'NONE'
}

/**
 * Safely set layoutSizingHorizontal to FILL
 * Only sets FILL if parent is an auto-layout frame and node is already appended
 */
function safeSetFillX(node: SceneNode): void {
  // Only FrameNode, ComponentNode, InstanceNode, and TextNode support layoutSizingHorizontal
  if (node.type !== 'FRAME' && node.type !== 'COMPONENT' && node.type !== 'INSTANCE' && node.type !== 'TEXT') {
    return
  }
  
  // Check if parent exists and is auto-layout
  if (!isAutoLayoutParent(node)) {
    const parentName = node.parent?.type === 'FRAME' ? (node.parent as FrameNode).name : 'none'
    const parentLayoutMode = node.parent?.type === 'FRAME' ? (node.parent as FrameNode).layoutMode : 'NONE'
    console.log(`[safeSetFillX] Skipping FILL for ${node.name} (${node.type}): parent=${parentName}, layoutMode=${parentLayoutMode}`)
    return
  }
  
  // Node is already appended to auto-layout parent - safe to set FILL
  if (node.type === 'FRAME') {
    (node as FrameNode).layoutSizingHorizontal = 'FILL'
  } else if (node.type === 'COMPONENT') {
    (node as ComponentNode).layoutSizingHorizontal = 'FILL'
  } else if (node.type === 'INSTANCE') {
    (node as InstanceNode).layoutSizingHorizontal = 'FILL'
  } else if (node.type === 'TEXT') {
    (node as TextNode).layoutSizingHorizontal = 'FILL'
  }
}

/**
 * Set build marker on a node to track v2-created nodes
 */
function setBuildMarker(node: SceneNode): void {
  node.setPluginData('figmai.buildScope', 'scorecard_v2')
}

/**
 * Find and remove stray v2 nodes that ended up at page root
 */
function removeStrayV2Nodes(root: FrameNode): void {
  const page = figma.currentPage
  const strayNodes: SceneNode[] = []
  
  for (const child of page.children) {
    if (child === root) continue // Skip the actual root
    
    // Check if this node has the v2 build marker
    const buildScope = child.getPluginData('figmai.buildScope')
    if (buildScope === 'scorecard_v2') {
      strayNodes.push(child)
    }
    
    // Also check for nodes named "Header" that might be orphaned
    if (child.name === 'Header' && child.type === 'FRAME') {
      const artifactType = child.getPluginData('figmai.artifactType')
      if (!artifactType || artifactType === '') {
        // This is likely a stray Header frame
        strayNodes.push(child)
      }
    }
  }
  
  for (const stray of strayNodes) {
    console.warn(`[renderScorecardV2] Removing stray node: ${stray.name} (${stray.id})`)
    stray.remove()
  }
  
  if (strayNodes.length > 0) {
    console.log(`[renderScorecardV2] Cleaned up ${strayNodes.length} stray node(s)`)
  }
}

/**
 * Render scorecard v1 (legacy - kept for compatibility)
 * Creates a wrapper frame with a separate card frame inside
 */
export async function renderScorecard(
  data: ScorecardData,
  selectedNode?: SceneNode
): Promise<void> {
  // Remove any existing scorecard artifacts first (legacy - removes all versions)
  removeExistingArtifacts('scorecard')
  
  // Place artifact root frame (no version specified for v1)
  const root = await placeArtifactFrame({
    type: 'scorecard',
    assistant: 'design_critique',
    selectedNode,
    width: 640,
    spacing: 40,
    replace: true
  })
  
  // Load fonts
  const fonts = await loadFonts()
  await figma.loadFontAsync({ family: 'Inter', style: 'Semi Bold' })
  
  // Card shell (Auto-Layout vertical) - separate frame for v1
  const cardFrame = figma.createFrame()
  cardFrame.name = 'Scorecard Card'
  cardFrame.layoutMode = 'VERTICAL'
  cardFrame.primaryAxisSizingMode = 'AUTO'
  cardFrame.counterAxisSizingMode = 'FIXED'
  cardFrame.resize(640, 100) // Will auto-resize
  cardFrame.paddingTop = 24
  cardFrame.paddingRight = 24
  cardFrame.paddingBottom = 24
  cardFrame.paddingLeft = 24
  cardFrame.itemSpacing = 16
  cardFrame.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }]
  cardFrame.strokes = [{ type: 'SOLID', color: { r: 0.85, g: 0.85, b: 0.85 } }]
  cardFrame.strokeWeight = 1
  cardFrame.cornerRadius = 8
  root.appendChild(cardFrame)
  safeSetFillX(cardFrame)
  
  // Header row: Title + Context label + Score badge (Auto-Layout, horizontal)
  const headerRow = figma.createFrame()
  headerRow.name = 'Header'
  headerRow.layoutMode = 'HORIZONTAL'
  headerRow.primaryAxisSizingMode = 'AUTO'
  headerRow.counterAxisSizingMode = 'AUTO'
  headerRow.itemSpacing = 12
  headerRow.counterAxisAlignItems = 'CENTER'
  cardFrame.appendChild(headerRow)
  safeSetFillX(headerRow)
  
  // Title + Context column (Auto-Layout, vertical)
  const titleColumn = figma.createFrame()
  titleColumn.name = 'Title Column'
  titleColumn.layoutMode = 'VERTICAL'
  titleColumn.primaryAxisSizingMode = 'AUTO'
  titleColumn.counterAxisSizingMode = 'AUTO'
  titleColumn.itemSpacing = 4
  headerRow.appendChild(titleColumn)
  // HUG sizing doesn't need safeSetFillX
  
  // Title: "Design Critique"
  const title = await createTextNode('Design Critique', {
    fontSize: 24,
    fontName: fonts.bold,
    fills: [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }]
  })
  titleColumn.appendChild(title)
  // HUG sizing doesn't need safeSetFillX
  
  // Context label: "Heuristic evaluation"
  const contextLabel = await createTextNode('Heuristic evaluation', {
    fontSize: 12,
    fontName: fonts.regular,
    fills: [{ type: 'SOLID', color: { r: 0.5, g: 0.5, b: 0.5 } }]
  })
  titleColumn.appendChild(contextLabel)
  // HUG sizing doesn't need safeSetFillX
  
  // Score badge (Auto-Layout, horizontal)
  if (data.score !== null) {
    const scoreBadge = figma.createFrame()
    scoreBadge.name = 'Score Badge'
    scoreBadge.layoutMode = 'HORIZONTAL'
    scoreBadge.primaryAxisSizingMode = 'AUTO'
    scoreBadge.counterAxisSizingMode = 'AUTO'
    scoreBadge.paddingTop = 8
    scoreBadge.paddingRight = 12
    scoreBadge.paddingBottom = 8
    scoreBadge.paddingLeft = 12
    scoreBadge.itemSpacing = 4
    scoreBadge.cornerRadius = 12
    headerRow.appendChild(scoreBadge)
    // HUG sizing doesn't need safeSetFillX
    
    // Score color based on range
    const scoreColor = data.score >= 85 
      ? { r: 0.16, g: 0.73, b: 0.51 } // green-ish
      : data.score >= 70 
      ? { r: 0.96, g: 0.62, b: 0.04 } // yellow-ish
      : { r: 0.94, g: 0.27, b: 0.27 } // red-ish
    
    scoreBadge.fills = [{ type: 'SOLID', color: { r: scoreColor.r * 0.15, g: scoreColor.g * 0.15, b: scoreColor.b * 0.15 } }]
    scoreBadge.strokes = [{ type: 'SOLID', color: scoreColor, opacity: 0.3 }]
    scoreBadge.strokeWeight = 1
    
    // Score text: "82 / 100"
    const scoreText = await createTextNode(`${data.score} / 100`, {
      fontSize: 14,
      fontName: fonts.bold,
      fills: [{ type: 'SOLID', color: scoreColor }]
    })
    scoreBadge.appendChild(scoreText)
    // HUG sizing doesn't need safeSetFillX
  }
  
  // Summary section (text node)
  if (data.summary) {
    const summaryText = await createTextNode(data.summary, {
      fontSize: 14,
      fontName: fonts.regular,
      fills: [{ type: 'SOLID', color: { r: 0.2, g: 0.2, b: 0.2 } }]
    })
    cardFrame.appendChild(summaryText)
    safeSetFillX(summaryText)
  }
  
  // Wins section (Auto-Layout, vertical)
  if (data.wins.length > 0) {
    const winsSection = await createSection('Wins', data.wins, { r: 0.16, g: 0.73, b: 0.51 }, fonts)
    cardFrame.appendChild(winsSection)
    safeSetFillX(winsSection)
  }
  
  // Fixes section (Auto-Layout, vertical)
  if (data.fixes.length > 0) {
    const fixesSection = await createSection('Fixes', data.fixes, { r: 0.96, g: 0.62, b: 0.04 }, fonts)
    cardFrame.appendChild(fixesSection)
    safeSetFillX(fixesSection)
  }
  
  // Checklist section (Auto-Layout, vertical)
  if (data.checklist.length > 0) {
    const checklistSection = await createSection('Checklist', data.checklist, { r: 0.2, g: 0.2, b: 0.2 }, fonts)
    cardFrame.appendChild(checklistSection)
    safeSetFillX(checklistSection)
  }
  
  // Notes section (optional, Auto-Layout, vertical)
  if (data.notes && data.notes.length > 0) {
    const notesSection = await createSection('Notes', data.notes, { r: 0.5, g: 0.5, b: 0.5 }, fonts)
    cardFrame.appendChild(notesSection)
    safeSetFillX(notesSection)
  }
}

/**
 * Create a section with title and bullet list (Auto-Layout, vertical) - v1 style
 */
async function createSection(
  title: string,
  items: string[],
  color: { r: number; g: number; b: number },
  fonts: Awaited<ReturnType<typeof loadFonts>>
): Promise<FrameNode> {
  const section = figma.createFrame()
  section.name = title
  section.layoutMode = 'VERTICAL'
  section.primaryAxisSizingMode = 'AUTO'
  section.counterAxisSizingMode = 'AUTO'
  section.itemSpacing = 8
  
  // Section title
  const sectionTitle = await createTextNode(title, {
    fontSize: 16,
    fontName: { family: 'Inter', style: 'Semi Bold' },
    fills: [{ type: 'SOLID', color }]
  })
  section.appendChild(sectionTitle)
  // HUG sizing doesn't need safeSetFillX
  
  // Bullet items
  for (const item of items) {
    const itemText = await createTextNode(`• ${item}`, {
      fontSize: 14,
      fontName: fonts.regular,
      fills: [{ type: 'SOLID', color: { r: 0.2, g: 0.2, b: 0.2 } }]
    })
    section.appendChild(itemText)
    safeSetFillX(itemText)
  }
  
  return section
}

/**
 * Build header row for v2 scorecard
 * Appends directly to parent and returns the header frame
 */
async function buildHeaderV2(
  parent: FrameNode,
  data: ScorecardData,
  fonts: Awaited<ReturnType<typeof loadFonts>>
): Promise<FrameNode> {
  // Header (Auto-Layout horizontal, space-between)
  const headerRow = figma.createFrame()
  headerRow.name = 'Header'
  headerRow.layoutMode = 'HORIZONTAL'
  headerRow.primaryAxisSizingMode = 'AUTO'
  headerRow.counterAxisSizingMode = 'AUTO'
  headerRow.primaryAxisAlignItems = 'SPACE_BETWEEN'
  headerRow.counterAxisAlignItems = 'CENTER'
  setBuildMarker(headerRow)
  
  // CRITICAL: Append to parent FIRST, THEN set FILL
  parent.appendChild(headerRow)
  safeSetFillX(headerRow)
  
  // Left column: Title + Subtitle (Auto-Layout vertical)
  const titleColumn = figma.createFrame()
  titleColumn.name = 'Title Column'
  titleColumn.layoutMode = 'VERTICAL'
  titleColumn.primaryAxisSizingMode = 'AUTO'
  titleColumn.counterAxisSizingMode = 'AUTO'
  titleColumn.itemSpacing = 4
  setBuildMarker(titleColumn)
  headerRow.appendChild(titleColumn)
  // HUG sizing doesn't need safeSetFillX
  
  // Title: "Design Critique" 22px Bold
  const title = await createTextNode('Design Critique', {
    fontSize: 22,
    fontName: fonts.bold,
    fills: [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }]
  })
  setBuildMarker(title)
  titleColumn.appendChild(title)
  // HUG sizing doesn't need safeSetFillX
  
  // Subtitle: "Heuristic evaluation" 12px Regular, #6B7280
  const subtitle = await createTextNode('Heuristic evaluation', {
    fontSize: 12,
    fontName: fonts.regular,
    fills: [{ type: 'SOLID', color: { r: 0.42, g: 0.45, b: 0.50 } }] // #6B7280
  })
  setBuildMarker(subtitle)
  titleColumn.appendChild(subtitle)
  // HUG sizing doesn't need safeSetFillX
  
  // Right: Score badge (Auto-Layout horizontal)
  if (data.score !== null) {
    const scoreBadge = figma.createFrame()
    scoreBadge.name = 'Score Badge'
    scoreBadge.layoutMode = 'HORIZONTAL'
    scoreBadge.primaryAxisSizingMode = 'AUTO'
    scoreBadge.counterAxisSizingMode = 'AUTO'
    scoreBadge.paddingTop = 6
    scoreBadge.paddingRight = 12
    scoreBadge.paddingBottom = 6
    scoreBadge.paddingLeft = 12
    scoreBadge.cornerRadius = 999 // Pill shape
    setBuildMarker(scoreBadge)
    headerRow.appendChild(scoreBadge)
    // HUG sizing doesn't need safeSetFillX
    
    // Score color based on range
    let fillColor: { r: number; g: number; b: number }
    let textColor: { r: number; g: number; b: number }
    
    if (data.score >= 85) {
      // Green: #E8F7EE fill, #166534 text
      fillColor = { r: 0.91, g: 0.97, b: 0.93 } // #E8F7EE
      textColor = { r: 0.09, g: 0.40, b: 0.20 } // #166534
    } else if (data.score >= 70) {
      // Amber: #FFF7ED fill, #9A3412 text
      fillColor = { r: 1.0, g: 0.97, b: 0.93 } // #FFF7ED
      textColor = { r: 0.60, g: 0.20, b: 0.07 } // #9A3412
    } else {
      // Red: #FEE2E2 fill, #991B1B text
      fillColor = { r: 1.0, g: 0.88, b: 0.88 } // #FEE2E2
      textColor = { r: 0.60, g: 0.11, b: 0.11 } // #991B1B
    }
    
    scoreBadge.fills = [{ type: 'SOLID', color: fillColor }]
    
    // Score text: "82 / 100" 12-14px Bold
    const scoreText = await createTextNode(`${data.score} / 100`, {
      fontSize: 13,
      fontName: fonts.bold,
      fills: [{ type: 'SOLID', color: textColor }]
    })
    setBuildMarker(scoreText)
    scoreBadge.appendChild(scoreText)
    // HUG sizing doesn't need safeSetFillX
  }
  
  return headerRow
}

/**
 * Build summary text for v2 scorecard
 * Appends directly to parent and returns the text node
 */
async function buildSummaryV2(
  parent: FrameNode,
  data: ScorecardData,
  fonts: Awaited<ReturnType<typeof loadFonts>>
): Promise<TextNode | null> {
  if (!data.summary) {
    return null
  }
  
  const summaryText = await createTextNode(truncateText(data.summary, 3, 14), {
    fontSize: 14,
    fontName: fonts.regular,
    fills: [{ type: 'SOLID', color: { r: 0.07, g: 0.09, b: 0.15 } }] // #111827
  })
  setBuildMarker(summaryText)
  
  // CRITICAL: Append to parent FIRST, THEN set FILL
  parent.appendChild(summaryText)
  safeSetFillX(summaryText)
  
  return summaryText
}

/**
 * Build two-column body (Wins/Fixes) for v2 scorecard
 * Appends directly to parent and returns the two-column frame
 */
async function buildTwoColumnBodyV2(
  parent: FrameNode,
  data: ScorecardData,
  fonts: Awaited<ReturnType<typeof loadFonts>>
): Promise<FrameNode> {
  // Two-column body (Auto-Layout horizontal)
  const twoColumnFrame = figma.createFrame()
  twoColumnFrame.name = 'Two Column Body'
  twoColumnFrame.layoutMode = 'HORIZONTAL'
  twoColumnFrame.primaryAxisSizingMode = 'AUTO'
  twoColumnFrame.counterAxisSizingMode = 'AUTO'
  twoColumnFrame.itemSpacing = 16
  setBuildMarker(twoColumnFrame)
  
  // CRITICAL: Append to parent FIRST, THEN set FILL
  parent.appendChild(twoColumnFrame)
  safeSetFillX(twoColumnFrame)
  
  // Left column: Wins (Auto-Layout vertical)
  if (data.wins.length > 0) {
    const winsColumn = await buildColumnSectionV2('Wins', data.wins.slice(0, 4), data.wins.length, fonts, twoColumnFrame)
    safeSetFillX(winsColumn)
  }
  
  // Right column: Fixes (Auto-Layout vertical)
  if (data.fixes.length > 0) {
    const fixesColumn = await buildColumnSectionV2('Fixes', data.fixes.slice(0, 4), data.fixes.length, fonts, twoColumnFrame)
    safeSetFillX(fixesColumn)
  }
  
  return twoColumnFrame
}

/**
 * Build checklist section for v2 scorecard
 * Appends directly to parent and returns the checklist frame
 */
async function buildChecklistV2(
  parent: FrameNode,
  data: ScorecardData,
  fonts: Awaited<ReturnType<typeof loadFonts>>
): Promise<FrameNode | null> {
  if (data.checklist.length === 0) {
    return null
  }
  
  const section = figma.createFrame()
  section.name = 'Checklist'
  section.layoutMode = 'VERTICAL'
  section.primaryAxisSizingMode = 'AUTO'
  section.counterAxisSizingMode = 'AUTO'
  section.itemSpacing = 8
  setBuildMarker(section)
  
  // CRITICAL: Append to parent FIRST, THEN set FILL
  parent.appendChild(section)
  safeSetFillX(section)
  
  // Heading: "Checklist" 14px Bold
  const heading = await createTextNode('Checklist', {
    fontSize: 14,
    fontName: fonts.bold,
    fills: [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }]
  })
  setBuildMarker(heading)
  section.appendChild(heading)
  // HUG sizing doesn't need safeSetFillX
  
  // Rows: Auto-Layout horizontal with status icon + item label
  const items = data.checklist.slice(0, 5)
  for (const item of items) {
    const row = figma.createFrame()
    row.name = 'Checklist Row'
    row.layoutMode = 'HORIZONTAL'
    row.primaryAxisSizingMode = 'AUTO'
    row.counterAxisSizingMode = 'AUTO'
    row.itemSpacing = 8
    row.counterAxisAlignItems = 'CENTER'
    setBuildMarker(row)
    section.appendChild(row)
    safeSetFillX(row)
    
    // Determine status icon (✓ or ✕)
    const isComplete = item.trim().startsWith('✓') || item.trim().startsWith('✔')
    const statusIcon = isComplete ? '✓' : '✕'
    const itemLabel = item.replace(/^[✓✔✗✕]\s*/, '').trim()
    
    // Status icon text
    const iconText = await createTextNode(statusIcon, {
      fontSize: 14,
      fontName: fonts.bold,
      fills: [{ type: 'SOLID', color: isComplete ? { r: 0.16, g: 0.73, b: 0.51 } : { r: 0.94, g: 0.27, b: 0.27 } }]
    })
    setBuildMarker(iconText)
    row.appendChild(iconText)
    // HUG sizing doesn't need safeSetFillX
    
    // Item label
    const labelText = await createTextNode(itemLabel, {
      fontSize: 13,
      fontName: fonts.regular,
      fills: [{ type: 'SOLID', color: { r: 0.2, g: 0.2, b: 0.2 } }]
    })
    setBuildMarker(labelText)
    row.appendChild(labelText)
    safeSetFillX(labelText)
  }
  
  // Truncate indicator if more items
  if (data.checklist.length > 5) {
    const moreText = await createTextNode(`+ ${data.checklist.length - 5} more`, {
      fontSize: 12,
      fontName: fonts.regular,
      fills: [{ type: 'SOLID', color: { r: 0.5, g: 0.5, b: 0.5 } }]
    })
    setBuildMarker(moreText)
    section.appendChild(moreText)
    // HUG sizing doesn't need safeSetFillX
  }
  
  return section
}

/**
 * Build notes section for v2 scorecard
 * Appends directly to parent and returns the notes frame
 */
async function buildNotesV2(
  parent: FrameNode,
  data: ScorecardData,
  fonts: Awaited<ReturnType<typeof loadFonts>>
): Promise<FrameNode | null> {
  if (!data.notes || data.notes.length === 0) {
    return null
  }
  
  const section = figma.createFrame()
  section.name = 'Notes'
  section.layoutMode = 'VERTICAL'
  section.primaryAxisSizingMode = 'AUTO'
  section.counterAxisSizingMode = 'AUTO'
  section.itemSpacing = 6
  setBuildMarker(section)
  
  // CRITICAL: Append to parent FIRST, THEN set FILL
  parent.appendChild(section)
  safeSetFillX(section)
  
  // Heading: "Notes" 14px Bold
  const heading = await createTextNode('Notes', {
    fontSize: 14,
    fontName: fonts.bold,
    fills: [{ type: 'SOLID', color: { r: 0.5, g: 0.5, b: 0.5 } }]
  })
  setBuildMarker(heading)
  section.appendChild(heading)
  // HUG sizing doesn't need safeSetFillX
  
  // Bullets (limit to 2)
  const items = data.notes.slice(0, 2)
  for (const item of items) {
    const itemText = await createTextNode(`• ${item}`, {
      fontSize: 13,
      fontName: fonts.regular,
      fills: [{ type: 'SOLID', color: { r: 0.4, g: 0.4, b: 0.4 } }]
    })
    setBuildMarker(itemText)
    section.appendChild(itemText)
    safeSetFillX(itemText)
  }
  
  return section
}

/**
 * Build a column section (Wins or Fixes) for v2 scorecard
 * Appends directly to parent and returns the column frame
 */
async function buildColumnSectionV2(
  title: string,
  items: string[],
  totalCount: number,
  fonts: Awaited<ReturnType<typeof loadFonts>>,
  parent: FrameNode
): Promise<FrameNode> {
  const section = figma.createFrame()
  section.name = title
  section.layoutMode = 'VERTICAL'
  section.primaryAxisSizingMode = 'AUTO'
  section.counterAxisSizingMode = 'AUTO'
  section.itemSpacing = 8
  setBuildMarker(section)
  
  // CRITICAL: Append to parent FIRST, THEN set FILL (will be set by caller)
  parent.appendChild(section)
  
  // Section heading 14px Bold
  const heading = await createTextNode(title, {
    fontSize: 14,
    fontName: fonts.bold,
    fills: [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }]
  })
  setBuildMarker(heading)
  section.appendChild(heading)
  // HUG sizing doesn't need safeSetFillX
  
  // Thin divider (1px line) - use a frame with fixed height
  const divider = figma.createFrame()
  divider.name = 'Divider'
  divider.layoutMode = 'HORIZONTAL'
  divider.primaryAxisSizingMode = 'AUTO'
  divider.counterAxisSizingMode = 'FIXED'
  divider.resize(100, 1)
  divider.fills = [{ type: 'SOLID', color: { r: 0.9, g: 0.9, b: 0.9 } }]
  setBuildMarker(divider)
  section.appendChild(divider)
  safeSetFillX(divider)
  
  // Bullets: use "•" prefix, 13-14px, 8px spacing, limit to 4 items
  for (const item of items) {
    const itemText = await createTextNode(`• ${item}`, {
      fontSize: 13,
      fontName: fonts.regular,
      fills: [{ type: 'SOLID', color: { r: 0.2, g: 0.2, b: 0.2 } }]
    })
    setBuildMarker(itemText)
    section.appendChild(itemText)
    safeSetFillX(itemText)
  }
  
  // Truncate indicator if more items
  if (totalCount > 4) {
    const moreText = await createTextNode(`+ ${totalCount - 4} more`, {
      fontSize: 12,
      fontName: fonts.regular,
      fills: [{ type: 'SOLID', color: { r: 0.5, g: 0.5, b: 0.5 } }]
    })
    setBuildMarker(moreText)
    section.appendChild(moreText)
    // HUG sizing doesn't need safeSetFillX
  }
  
  return section
}

/**
 * Render scorecard v2 to stage using Auto-Layout frames
 * Builds the card UI directly into the artifact root (no wrapper frame)
 * ENFORCES: Only root is appended to page; all other nodes append to root or descendants
 */
export async function renderScorecardV2(
  data: ScorecardData,
  selectedNode?: SceneNode
): Promise<FrameNode> {
  const DEBUG = true
  let root: FrameNode | null = null
  
  try {
    // Place artifact root frame with v2 version (removes existing v2 artifacts)
    root = await placeArtifactFrame({
      type: 'scorecard',
      assistant: 'design_critique',
      selectedNode,
      width: 560,
      spacing: 40,
      version: 'v2',
      replace: true
    })
    
    // Load fonts
    const fonts = await loadFonts()
    await figma.loadFontAsync({ family: 'Inter', style: 'Semi Bold' })
    
    // Configure root frame as the card itself (no separate cardFrame wrapper)
    // CRITICAL: Set layoutMode FIRST before appending any children
    root.layoutMode = 'VERTICAL'
    root.paddingTop = 20
    root.paddingRight = 20
    root.paddingBottom = 20
    root.paddingLeft = 20
    root.itemSpacing = 16
    root.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }]
    root.strokes = [{ type: 'SOLID', color: { r: 0.9, g: 0.9, b: 0.9 } }] // #E6E6E6
    root.strokeWeight = 1
    root.cornerRadius = 16
    
    // Build header
    if (DEBUG) console.log('[renderScorecardV2] Building header...')
    await buildHeaderV2(root, data, fonts)
    if (DEBUG) console.log('[renderScorecardV2] Header built, root.children:', root.children.map(c => c.name))
    
    // Build summary
    if (data.summary) {
      if (DEBUG) console.log('[renderScorecardV2] Building summary...')
      await buildSummaryV2(root, data, fonts)
      if (DEBUG) console.log('[renderScorecardV2] Summary built, root.children:', root.children.map(c => c.name))
    }
    
    // Build two-column body
    if (data.wins.length > 0 || data.fixes.length > 0) {
      if (DEBUG) console.log('[renderScorecardV2] Building two-column body...')
      await buildTwoColumnBodyV2(root, data, fonts)
      if (DEBUG) console.log('[renderScorecardV2] Two-column body built, root.children:', root.children.map(c => c.name))
    }
    
    // Build checklist
    if (data.checklist.length > 0) {
      if (DEBUG) console.log('[renderScorecardV2] Building checklist...')
      await buildChecklistV2(root, data, fonts)
      if (DEBUG) console.log('[renderScorecardV2] Checklist built, root.children:', root.children.map(c => c.name))
    }
    
    // Build notes
    if (data.notes && data.notes.length > 0) {
      if (DEBUG) console.log('[renderScorecardV2] Building notes...')
      await buildNotesV2(root, data, fonts)
      if (DEBUG) console.log('[renderScorecardV2] Notes built, root.children:', root.children.map(c => c.name))
    }
    
    // Verify root has content
    if (root.children.length === 0) {
      throw new Error('v2 scorecard rendered empty - no children appended to root')
    }
    
    if (DEBUG) {
      console.log('[renderScorecardV2] ✅ Build complete, root.children:', root.children.map(c => c.name))
      console.log('[renderScorecardV2] Root has', root.children.length, 'direct children')
    }
    
    // Remove any stray nodes that ended up at page root
    removeStrayV2Nodes(root)
    
    // Verify no stray "Header" nodes exist at page root
    const page = figma.currentPage
    for (const child of page.children) {
      if (child === root) continue
      if (child.name === 'Header' && child.type === 'FRAME') {
        const artifactType = child.getPluginData('figmai.artifactType')
        if (!artifactType || artifactType === '') {
          console.error(`[renderScorecardV2] ❌ Found stray Header node at page root: ${child.id}`)
          child.remove()
        }
      }
    }
    
    // Re-select and scroll into view (placeArtifactFrame already did this, but ensure it's still selected)
    figma.currentPage.selection = [root]
    figma.viewport.scrollAndZoomIntoView([root])
    
    return root
  } catch (error) {
    console.error('[renderScorecardV2] Error during render:', error)
    
    // Cleanup: Remove root if it was created
    if (root) {
      try {
        root.remove()
        console.log('[renderScorecardV2] Removed root frame due to error')
      } catch (e) {
        console.error('[renderScorecardV2] Failed to remove root:', e)
      }
    }
    
    // Cleanup: Remove any stray v2 nodes
    const page = figma.currentPage
    const strayNodes: SceneNode[] = []
    for (const child of page.children) {
      const buildScope = child.getPluginData('figmai.buildScope')
      if (buildScope === 'scorecard_v2') {
        strayNodes.push(child)
      }
    }
    for (const stray of strayNodes) {
      try {
        stray.remove()
        console.log(`[renderScorecardV2] Removed stray node: ${stray.name}`)
      } catch (e) {
        console.error(`[renderScorecardV2] Failed to remove stray node ${stray.name}:`, e)
      }
    }
    
    // Re-throw error
    throw error
  }
}
