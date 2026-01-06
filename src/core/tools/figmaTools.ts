import type { SelectionState, ToolDefinition } from '../types'

/**
 * ANNOTATE_SELECTION Tool
 * Adds non-destructive annotation notes near selected nodes
 */
export const annotateSelectionTool: ToolDefinition = {
  id: 'ANNOTATE_SELECTION',
  name: 'Annotate Selection',
  description: 'Adds annotation notes near selected nodes',
  requiresSelection: true,
  async execute(args: Record<string, unknown>, selection?: SelectionState): Promise<string> {
    if (!selection?.hasSelection) {
      return 'Error: Selection required for annotation tool'
    }
    
    const nodes = figma.currentPage.selection
    
    if (nodes.length === 0) {
      return 'Error: No nodes selected'
    }
    
    const annotationText = (args.text as string) || 'Annotation'
    const annotations: SceneNode[] = []
    
    for (const node of nodes) {
      // Create a text node for annotation
      const annotation = figma.createText()
      
      // Load a font (use default if available)
      try {
        await figma.loadFontAsync({ family: 'Inter', style: 'Regular' })
        annotation.fontName = { family: 'Inter', style: 'Regular' }
        annotation.fontSize = 12
        annotation.characters = annotationText
        annotation.fills = [{ type: 'SOLID', color: { r: 0.2, g: 0.2, b: 0.2 } }]
        
        // Position annotation near the node
        annotation.x = node.x + node.width + 10
        annotation.y = node.y
        
        figma.currentPage.appendChild(annotation)
        annotations.push(annotation)
      } catch (error) {
        // If font loading fails, skip this annotation
        console.warn('Failed to create annotation:', error)
      }
    }
    
    if (annotations.length > 0) {
      figma.currentPage.selection = annotations
      return `Successfully added ${annotations.length} annotation(s)`
    }
    
    return 'Failed to create annotations'
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



