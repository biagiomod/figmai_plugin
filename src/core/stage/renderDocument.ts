/**
 * Render Document IR to Stage
 * Converts Document blocks to Figma nodes and places them on canvas
 */

import type { Document, Block, ScorecardBlock } from '../output/ir'
import { getTopLevelContainerNode, getAnchorBounds, computePlacement } from './anchor'
import { loadFonts, createContainerFrame, createTextNode, applyInlineStyles, stackVertically, createAutoLayoutFrameSafe } from './primitives'

export interface RenderDocumentOptions {
  selectedNode?: SceneNode
  width?: number
}

/**
 * Render document to stage
 */
export async function renderDocumentToStage(doc: Document, options: RenderDocumentOptions = {}): Promise<FrameNode> {
  const width = options.width ?? 640
  const selectedNode = options.selectedNode

  // Determine anchor
  const anchorNode = selectedNode ? getTopLevelContainerNode(selectedNode) : undefined
  const anchorBounds = anchorNode ? getAnchorBounds(anchorNode) : null

  // Create container frame (no auto-layout for now, use simple stacking)
  const container = createContainerFrame('Document Output', 0, 0, width, 100) // Height will be adjusted

  // Render blocks
  const renderedNodes: SceneNode[] = []
  let currentY = 24 // Top padding

  for (const block of doc.blocks) {
    if (block.type === 'scorecard') {
      const scorecardFrame = await renderScorecardBlock(block, width)
      scorecardFrame.y = currentY
      container.appendChild(scorecardFrame)
      renderedNodes.push(scorecardFrame)
      currentY += scorecardFrame.height + 24
    } else {
      const blockNodes = await renderGenericBlock(block, width)
      for (const node of blockNodes) {
        node.y = currentY
        container.appendChild(node)
        renderedNodes.push(node)
        currentY += ('height' in node ? node.height : 0) + 12
      }
    }
  }

  // Resize container to fit content
  container.resize(width, currentY + 24)

  // Position container
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

  return container
}

/**
 * Render scorecard block
 */
async function renderScorecardBlock(block: ScorecardBlock, containerWidth: number): Promise<FrameNode> {
  const fonts = await loadFonts()
  await figma.loadFontAsync({ family: 'Inter', style: 'Semi Bold' })

  // Create wrapper frame with auto-layout
  const wrapper = createAutoLayoutFrameSafe('Scorecard', 'VERTICAL', {
    padding: { top: 16, right: 16, bottom: 16, left: 16 },
    gap: 12
  })
  wrapper.resize(containerWidth, 100) // Height will auto-adjust
  wrapper.fills = [{ type: 'SOLID', color: { r: 0.98, g: 0.98, b: 0.98 } }]
  wrapper.strokes = [{ type: 'SOLID', color: { r: 0.85, g: 0.85, b: 0.85 } }]
  wrapper.strokeWeight = 1
  wrapper.cornerRadius = 8

  // Header row: Title + Score badge
  const headerRow = createAutoLayoutFrameSafe('Header', 'HORIZONTAL', {
    gap: 12,
    counterAxisAlign: 'CENTER'
  })
  headerRow.layoutSizingVertical = 'HUG'

  const title = await createTextNode('Design Critique', {
    fontSize: 16,
    fontName: fonts.bold,
    fills: [{ type: 'SOLID', color: { r: 0.2, g: 0.2, b: 0.2 } }]
  })
  title.layoutSizingHorizontal = 'HUG'
  headerRow.appendChild(title)

  // Score badge
  if (block.score !== null && block.score !== undefined) {
    const scoreBadge = createAutoLayoutFrameSafe('Score Badge', 'HORIZONTAL', {
      padding: { top: 6, right: 12, bottom: 6, left: 12 },
      gap: 4
    })
    scoreBadge.layoutSizingHorizontal = 'HUG'
    scoreBadge.cornerRadius = 12

    const scoreColor = block.score >= 85
      ? { r: 0.16, g: 0.73, b: 0.51 }
      : block.score >= 70
      ? { r: 0.96, g: 0.62, b: 0.04 }
      : { r: 0.94, g: 0.27, b: 0.27 }

    scoreBadge.fills = [{ type: 'SOLID', color: { r: scoreColor.r * 0.15, g: scoreColor.g * 0.15, b: scoreColor.b * 0.15 } }]
    scoreBadge.strokes = [{ type: 'SOLID', color: scoreColor, opacity: 0.3 }]
    scoreBadge.strokeWeight = 1

    const scoreText = await createTextNode(`${block.score}`, {
      fontSize: 14,
      fontName: fonts.bold,
      fills: [{ type: 'SOLID', color: scoreColor }]
    })
    scoreText.layoutSizingHorizontal = 'HUG'
    scoreBadge.appendChild(scoreText)

    const scoreLabel = await createTextNode('/100', {
      fontSize: 12,
      fontName: fonts.regular,
      fills: [{ type: 'SOLID', color: { r: 0.5, g: 0.5, b: 0.5 } }]
    })
    scoreLabel.layoutSizingHorizontal = 'HUG'
    scoreBadge.appendChild(scoreLabel)

    headerRow.appendChild(scoreBadge)
  }

  wrapper.appendChild(headerRow)

  // Summary
  if (block.summary) {
    const summaryText = await createTextNode(block.summary, {
      fontSize: 13,
      fontName: fonts.regular,
      fills: [{ type: 'SOLID', color: { r: 0.3, g: 0.3, b: 0.3 } }]
    })
    summaryText.layoutSizingHorizontal = 'FILL'
    wrapper.appendChild(summaryText)
  }

  // Wins section
  if (block.wins.length > 0) {
    const winsSection = await createSection('Wins', block.wins, { r: 0.16, g: 0.73, b: 0.51 }, fonts)
    wrapper.appendChild(winsSection)
  }

  // Fixes section
  if (block.fixes.length > 0) {
    const fixesSection = await createSection('Fixes', block.fixes, { r: 0.96, g: 0.62, b: 0.04 }, fonts)
    wrapper.appendChild(fixesSection)
  }

  // Checklist section
  if (block.checklist && block.checklist.length > 0) {
    const checklistSection = await createSection('Checklist', block.checklist, { r: 0.2, g: 0.2, b: 0.2 }, fonts)
    wrapper.appendChild(checklistSection)
  }

  // Notes section
  if (block.notes && block.notes.length > 0) {
    const notesSection = await createSection('Notes', block.notes, { r: 0.5, g: 0.5, b: 0.5 }, fonts)
    wrapper.appendChild(notesSection)
  }

  // Auto-resize wrapper
  wrapper.layoutSizingHorizontal = 'HUG'
  wrapper.layoutSizingVertical = 'HUG'

  return wrapper
}

/**
 * Create a section with title and bullet list
 */
async function createSection(
  title: string,
  items: string[],
  color: { r: number; g: number; b: number },
  fonts: { regular: FontName; bold: FontName; italic: FontName; boldItalic: FontName }
): Promise<FrameNode> {
  const section = createAutoLayoutFrameSafe(title, 'VERTICAL', {
    gap: 8
  })
  section.layoutSizingHorizontal = 'FILL'
  section.layoutSizingVertical = 'HUG'

  // Section title
  const sectionTitle = await createTextNode(title, {
    fontSize: 14,
    fontName: { family: 'Inter', style: 'Semi Bold' },
    fills: [{ type: 'SOLID', color }]
  })
  sectionTitle.layoutSizingHorizontal = 'HUG'
  section.appendChild(sectionTitle)

  // Bullet items
  for (const item of items) {
    const itemText = await createTextNode(`• ${item}`, {
      fontSize: 12,
      fontName: fonts.regular,
      fills: [{ type: 'SOLID', color: { r: 0.2, g: 0.2, b: 0.2 } }]
    })
    itemText.layoutSizingHorizontal = 'FILL'
    section.appendChild(itemText)
  }

  return section
}

/**
 * Render generic block (heading, paragraph, list, callout)
 */
async function renderGenericBlock(block: Block, containerWidth: number): Promise<SceneNode[]> {
  const fonts = await loadFonts()
  const nodes: SceneNode[] = []

  switch (block.type) {
    case 'heading': {
      const heading = await createTextNode(block.text, {
        fontSize: block.level === 1 ? 18 : block.level === 2 ? 16 : 14,
        fontName: fonts.bold,
        fills: [{ type: 'SOLID', color: { r: 0.2, g: 0.2, b: 0.2 } }]
      })
      heading.resize(containerWidth - 48, heading.height) // Account for padding
      nodes.push(heading)
      break
    }

    case 'paragraph': {
      const paragraph = await createTextNode(block.text, {
        fontSize: 12,
        fontName: fonts.regular,
        fills: [{ type: 'SOLID', color: { r: 0.2, g: 0.2, b: 0.2 } }]
      })
      paragraph.resize(containerWidth - 48, paragraph.height)
      if (block.spans) {
        await applyInlineStyles(paragraph, block.spans)
      }
      nodes.push(paragraph)
      break
    }

    case 'bullets': {
      for (const item of block.items) {
        const bullet = await createTextNode(`• ${item}`, {
          fontSize: 12,
          fontName: fonts.regular,
          fills: [{ type: 'SOLID', color: { r: 0.2, g: 0.2, b: 0.2 } }]
        })
        bullet.resize(containerWidth - 48, bullet.height)
        nodes.push(bullet)
      }
      break
    }

    case 'numbered': {
      for (let i = 0; i < block.items.length; i++) {
        const numbered = await createTextNode(`${i + 1}. ${block.items[i]}`, {
          fontSize: 12,
          fontName: fonts.regular,
          fills: [{ type: 'SOLID', color: { r: 0.2, g: 0.2, b: 0.2 } }]
        })
        numbered.resize(containerWidth - 48, numbered.height)
        nodes.push(numbered)
      }
      break
    }

    case 'callout': {
      const calloutFrame = createContainerFrame('Callout', 0, 0, containerWidth - 48, 100)
      const calloutColor = getCalloutColor(block.tone)
      calloutFrame.fills = [{ type: 'SOLID', color: { r: calloutColor.r * 0.1, g: calloutColor.g * 0.1, b: calloutColor.b * 0.1 } }]
      calloutFrame.strokes = [{ type: 'SOLID', color: calloutColor, opacity: 0.3 }]
      calloutFrame.strokeWeight = 1
      calloutFrame.cornerRadius = 8

      if (block.title) {
        const title = await createTextNode(block.title, {
          fontSize: 14,
          fontName: fonts.bold,
          fills: [{ type: 'SOLID', color: calloutColor }]
        })
        title.x = 12
        title.y = 12
        calloutFrame.appendChild(title)
      }

      const body = await createTextNode(block.body, {
        fontSize: 12,
        fontName: fonts.regular,
        fills: [{ type: 'SOLID', color: { r: 0.2, g: 0.2, b: 0.2 } }]
      })
      body.x = 12
      body.y = block.title ? 40 : 12
      body.resize(containerWidth - 72, body.height)
      calloutFrame.appendChild(body)

      calloutFrame.resize(containerWidth - 48, body.y + body.height + 12)
      nodes.push(calloutFrame)
      break
    }
  }

  return nodes
}

function getCalloutColor(tone: 'info' | 'warning' | 'error' | 'success'): { r: number; g: number; b: number } {
  switch (tone) {
    case 'info':
      return { r: 0.2, g: 0.5, b: 1.0 }
    case 'warning':
      return { r: 0.96, g: 0.62, b: 0.04 }
    case 'error':
      return { r: 0.94, g: 0.27, b: 0.27 }
    case 'success':
      return { r: 0.16, g: 0.73, b: 0.51 }
  }
}

