import type { SelectionState, ToolDefinition } from '../types'
import {
  ensureAnnotationCategory,
  safeSetNativeAnnotations,
  createVisibleAnnotationCard,
  readResolvedAnnotations
} from '../figma/annotations'

/**
 * ANNOTATE_NODES Tool
 * Writes native Figma annotations to all currently selected nodes using shared core primitives.
 * Optionally creates a visible in-canvas annotation card adjacent to each node.
 */
export const annotateNodesTool: ToolDefinition = {
  id: 'ANNOTATE_NODES',
  name: 'Annotate Nodes',
  description: 'Writes native Figma annotations to all currently selected nodes',
  requiresSelection: true,
  async execute(args: Record<string, unknown>, selection?: SelectionState): Promise<string> {
    if (!selection?.hasSelection) {
      return 'Error: Selection required for ANNOTATE_NODES'
    }

    const nodes = figma.currentPage.selection
    if (nodes.length === 0) {
      return 'Error: No nodes selected'
    }

    const categoryLabel = typeof args.categoryLabel === 'string' ? args.categoryLabel.trim() : ''
    const categoryColor = typeof args.categoryColor === 'string' ? args.categoryColor.trim() : 'orange'
    const labelMarkdown = typeof args.labelMarkdown === 'string' ? args.labelMarkdown.trim() : ''
    const label = typeof args.label === 'string' ? args.label.trim() : ''
    const addVisibleCard = args.addVisibleCard === true
    const cardTitle = typeof args.cardTitle === 'string' ? args.cardTitle.trim() : ''
    const cardLines = Array.isArray(args.cardLines) ? (args.cardLines as unknown[]).map(l => String(l)) : []

    if (!categoryLabel) {
      return 'Error: categoryLabel is required for ANNOTATE_NODES'
    }
    if (!labelMarkdown && !label) {
      return 'Error: at least one of labelMarkdown or label must be non-empty'
    }
    if (addVisibleCard && !cardTitle) {
      return 'Error: cardTitle is required when addVisibleCard is true'
    }

    const categoryId = await ensureAnnotationCategory(categoryLabel, categoryColor)

    let annotated = 0
    for (const node of nodes) {
      safeSetNativeAnnotations(node, [{ labelMarkdown: labelMarkdown || undefined, label: label || undefined, categoryId }])
      if (addVisibleCard) {
        await createVisibleAnnotationCard({
          title: cardTitle,
          lines: cardLines,
          x: node.x + node.width + 16,
          y: node.y
        })
      }
      annotated++
    }

    if (annotated === 0) {
      return 'No nodes were annotated'
    }
    return `Annotated ${annotated} node(s) with category '${categoryLabel}'`
  }
}

/**
 * READ_ANNOTATIONS Tool
 * Reads annotations from all currently selected nodes and returns a plain-text summary.
 */
export const readAnnotationsTool: ToolDefinition = {
  id: 'READ_ANNOTATIONS',
  name: 'Read Annotations',
  description: 'Reads annotations from all currently selected nodes',
  requiresSelection: true,
  async execute(args: Record<string, unknown>, selection?: SelectionState): Promise<string> {
    if (!selection?.hasSelection) {
      return 'Error: Selection required for READ_ANNOTATIONS'
    }

    const nodes = figma.currentPage.selection
    if (nodes.length === 0) {
      return 'Error: No nodes selected'
    }

    const filterCategory = typeof args.categoryLabel === 'string' ? args.categoryLabel.trim().toLowerCase() : ''

    const lines: string[] = []
    for (const node of nodes) {
      const entries = await readResolvedAnnotations(node)
      const filtered = filterCategory
        ? entries.filter(e => e.categoryLabel?.toLowerCase() === filterCategory)
        : entries

      const nodeName = node.name || node.id
      if (filtered.length === 0) {
        lines.push(`${nodeName}: (no annotations)`)
      } else {
        for (const entry of filtered) {
          const cat = entry.categoryLabel ? `[${entry.categoryLabel}] ` : ''
          lines.push(`${nodeName}: ${cat}${entry.plainText}`)
        }
      }
    }

    return lines.join('\n')
  }
}

/**
 * CREATE_CHECKLIST_FRAME Tool
 * Creates a new auto-layout frame with checklist items
 */
export const createChecklistFrameTool: ToolDefinition = {
  id: 'CREATE_CHECKLIST_FRAME',
  name: 'Create Checklist Frame',
  description: 'Creates a new auto-layout frame with checklist items',
  requiresSelection: false,
  async execute(args: Record<string, unknown>): Promise<string> {
    const items = (args.items as string[]) || ['Item 1', 'Item 2', 'Item 3']

    // Create frame
    const frame = figma.createFrame()
    frame.name = 'Checklist'
    frame.layoutMode = 'VERTICAL'
    frame.paddingLeft = 16
    frame.paddingRight = 16
    frame.paddingTop = 16
    frame.paddingBottom = 16
    frame.itemSpacing = 8
    frame.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }]

    // Load font
    try {
      await figma.loadFontAsync({ family: 'Inter', style: 'Regular' })

      // Create checklist items
      for (const itemText of items) {
        const text = figma.createText()
        text.fontName = { family: 'Inter', style: 'Regular' }
        text.fontSize = 14
        text.characters = `☐ ${itemText}`
        text.fills = [{ type: 'SOLID', color: { r: 0, g: 0, b: 0 } }]

        frame.appendChild(text)
      }

      // Position frame
      frame.x = figma.viewport.center.x - 100
      frame.y = figma.viewport.center.y - 100

      figma.currentPage.appendChild(frame)
      figma.currentPage.selection = [frame]
      figma.viewport.scrollAndZoomIntoView([frame])

      return `Successfully created checklist frame with ${items.length} item(s)`
    } catch (error) {
      return `Error creating checklist: ${error}`
    }
  }
}
