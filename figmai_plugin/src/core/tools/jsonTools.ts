import type { SelectionState, ToolDefinition } from '../types'
import { validateTemplate, parseTemplateColor, type TemplateJSON, type TemplateNode } from './jsonTemplate'

/**
 * CREATE_FROM_TEMPLATE_JSON Tool
 * Creates Figma nodes from a JSON template
 */
export const createFromTemplateJsonTool: ToolDefinition = {
  id: 'CREATE_FROM_TEMPLATE_JSON',
  name: 'Create From Template JSON',
  description: 'Creates Figma elements from a JSON template',
  requiresSelection: false,
  async execute(args: Record<string, unknown>): Promise<string> {
    const rawJson = args.rawJson as string
    
    if (!rawJson || typeof rawJson !== 'string') {
      return 'Error: rawJson parameter is required'
    }
    
    // Validate template
    const validation = validateTemplate(rawJson)
    if (!validation.ok) {
      return `Validation failed:\n${validation.errors.join('\n')}`
    }
    
    let template: TemplateJSON
    try {
      template = JSON.parse(rawJson)
    } catch {
      return 'Error: Failed to parse JSON'
    }
    
    // Create nodes recursively
    const nodeCounts: Record<string, number> = {}
    const createdNodes: SceneNode[] = []
    
    try {
      const rootNode = await createNodeFromTemplate(template.root, nodeCounts, createdNodes)
      if (!rootNode) {
        return 'Error: Failed to create root node'
      }
      
      // Position near viewport center
      const viewport = figma.viewport.center
      rootNode.x = viewport.x - rootNode.width / 2
      rootNode.y = viewport.y - rootNode.height / 2
      
      figma.currentPage.appendChild(rootNode)
      figma.currentPage.selection = [rootNode]
      figma.viewport.scrollAndZoomIntoView([rootNode])
      
      const counts = Object.entries(nodeCounts)
        .map(([type, count]) => `${count} ${type}${count > 1 ? 's' : ''}`)
        .join(', ')
      
      return `Successfully created ${counts}`
    } catch (error) {
      return `Error creating nodes: ${error}`
    }
  }
}

/**
 * Create a Figma node from a template node
 */
async function createNodeFromTemplate(
  template: TemplateNode,
  nodeCounts: Record<string, number>,
  createdNodes: SceneNode[]
): Promise<SceneNode | null> {
  const type = template.type
  
  if (!nodeCounts[type]) {
    nodeCounts[type] = 0
  }
  nodeCounts[type]++
  
  if (type === 'FRAME') {
    const frame = figma.createFrame()
    frame.name = template.name || 'Frame'
    
    // Apply layout
    if (template.layout) {
      frame.layoutMode = template.layout.direction === 'HORIZONTAL' ? 'HORIZONTAL' : 'VERTICAL'
      if (template.layout.padding) {
        frame.paddingLeft = template.layout.padding.left || 0
        frame.paddingRight = template.layout.padding.right || 0
        frame.paddingTop = template.layout.padding.top || 0
        frame.paddingBottom = template.layout.padding.bottom || 0
      }
      if (template.layout.gap !== undefined) {
        frame.itemSpacing = template.layout.gap
      }
      if (template.layout.sizing) {
        if (typeof template.layout.sizing.width === 'number') {
          frame.resize(template.layout.sizing.width, frame.height)
        }
        if (typeof template.layout.sizing.height === 'number') {
          frame.resize(frame.width, template.layout.sizing.height)
        }
      }
    }
    
    // Apply style
    if (template.style) {
      if (template.style.fills && template.style.fills.length > 0) {
        const fill = template.style.fills[0]
        const color = parseTemplateColor(fill.color)
        frame.fills = [{ type: 'SOLID', color }]
      }
      if (template.style.strokes && template.style.strokes.length > 0) {
        const stroke = template.style.strokes[0]
        const color = parseTemplateColor(stroke.color)
        frame.strokes = [{ type: 'SOLID', color }]
        frame.strokeWeight = stroke.weight || 1
      }
      if (template.style.radius !== undefined) {
        frame.cornerRadius = template.style.radius
      }
    }
    
    // Create children
    if (template.children) {
      for (const childTemplate of template.children) {
        const childNode = await createNodeFromTemplate(childTemplate, nodeCounts, createdNodes)
        if (childNode) {
          frame.appendChild(childNode)
        }
      }
    }
    
    createdNodes.push(frame)
    return frame
  }
  
  if (type === 'TEXT') {
    const text = figma.createText()
    text.name = template.name || 'Text'
    
    if (!template.text) {
      return null
    }
    
    // Load font
    const fontFamily = template.text.fontFamily || 'Inter'
    const fontStyle = template.text.fontStyle || 'Regular'
    
    try {
      await figma.loadFontAsync({ family: fontFamily, style: fontStyle })
      text.fontName = { family: fontFamily, style: fontStyle }
    } catch {
      // Fallback to Inter Regular
      try {
        await figma.loadFontAsync({ family: 'Inter', style: 'Regular' })
        text.fontName = { family: 'Inter', style: 'Regular' }
      } catch {
        return null
      }
    }
    
    text.characters = template.text.value
    text.fontSize = template.text.fontSize || 14
    
    // Apply style
    if (template.style) {
      if (template.style.fills && template.style.fills.length > 0) {
        const fill = template.style.fills[0]
        const color = parseTemplateColor(fill.color)
        text.fills = [{ type: 'SOLID', color }]
      }
    }
    
    createdNodes.push(text)
    return text
  }
  
  if (type === 'RECTANGLE') {
    const rect = figma.createRectangle()
    rect.name = template.name || 'Rectangle'
    
    // Default size
    rect.resize(100, 100)
    
    // Apply style
    if (template.style) {
      if (template.style.fills && template.style.fills.length > 0) {
        const fill = template.style.fills[0]
        const color = parseTemplateColor(fill.color)
        rect.fills = [{ type: 'SOLID', color }]
      }
      if (template.style.strokes && template.style.strokes.length > 0) {
        const stroke = template.style.strokes[0]
        const color = parseTemplateColor(stroke.color)
        rect.strokes = [{ type: 'SOLID', color }]
        rect.strokeWeight = stroke.weight || 1
      }
      if (template.style.radius !== undefined) {
        rect.cornerRadius = template.style.radius
      }
    }
    
    createdNodes.push(rect)
    return rect
  }
  
  return null
}

/**
 * EXPORT_SELECTION_TO_TEMPLATE_JSON Tool
 * Exports selected frames to JSON template format
 */
export const exportSelectionToTemplateJsonTool: ToolDefinition = {
  id: 'EXPORT_SELECTION_TO_TEMPLATE_JSON',
  name: 'Export Selection to Template JSON',
  description: 'Exports selected frames to JSON template format',
  requiresSelection: true,
  async execute(args: Record<string, unknown>, selection?: SelectionState): Promise<string> {
    if (!selection?.hasSelection) {
      return 'Error: Selection required for export'
    }
    
    const nodes = figma.currentPage.selection
    
    if (nodes.length === 0) {
      return 'Error: No nodes selected'
    }
    
    try {
      let template: TemplateJSON
      
      // If multiple frames, wrap in a single FRAME named "Export"
      if (nodes.length > 1) {
        const roots = nodes.map(node => nodeToTemplate(node))
        template = {
          schemaVersion: '1.0',
          meta: { name: 'Export' },
          root: {
            type: 'FRAME',
            name: 'Export',
            children: roots.filter(r => r !== null) as TemplateNode[]
          }
        }
      } else {
        // Single node
        const root = nodeToTemplate(nodes[0])
        if (!root) {
          return 'Error: Selected node cannot be exported'
        }
        template = {
          schemaVersion: '1.0',
          meta: { name: root.name || 'Export' },
          root
        }
      }
      
      // Return JSON string with special prefix so main.ts can extract it
      const jsonString = JSON.stringify(template, null, 2)
      return `JSON_EXPORT:${jsonString}`
    } catch (error) {
      return `Error exporting: ${error}`
    }
  }
}

/**
 * Convert a Figma node to a template node
 */
function nodeToTemplate(node: SceneNode): TemplateNode | null {
  if (node.type === 'FRAME') {
    const template: TemplateNode = {
      type: 'FRAME',
      name: node.name
    }
    
    // Layout
    if (node.layoutMode !== 'NONE') {
      template.layout = {
        mode: 'AUTO_LAYOUT',
        direction: node.layoutMode === 'HORIZONTAL' ? 'HORIZONTAL' : 'VERTICAL',
        padding: {
          top: node.paddingTop,
          right: node.paddingRight,
          bottom: node.paddingBottom,
          left: node.paddingLeft
        },
        gap: node.itemSpacing,
        sizing: {
          width: node.width,
          height: node.height
        }
      }
    }
    
    // Style
    const style: { fills?: any[]; strokes?: any[]; radius?: number } = {}
    if (node.fills && Array.isArray(node.fills) && node.fills.length > 0) {
      const fill = node.fills[0] as SolidPaint
      if (fill.type === 'SOLID') {
        style.fills = [{
          type: 'SOLID',
          color: {
            r: fill.color.r,
            g: fill.color.g,
            b: fill.color.b
          }
        }]
      }
    }
    if (node.strokes && Array.isArray(node.strokes) && node.strokes.length > 0) {
      const stroke = node.strokes[0] as SolidPaint
      if (stroke.type === 'SOLID') {
        style.strokes = [{
          type: 'SOLID',
          color: {
            r: stroke.color.r,
            g: stroke.color.g,
            b: stroke.color.b
          },
          weight: node.strokeWeight
        }]
      }
    }
    if (node.cornerRadius !== undefined && typeof node.cornerRadius === 'number') {
      style.radius = node.cornerRadius
    }
    if (Object.keys(style).length > 0) {
      template.style = style
    }
    
    // Children
    if (node.children && node.children.length > 0) {
      template.children = node.children
        .map(child => nodeToTemplate(child))
        .filter(child => child !== null) as TemplateNode[]
    }
    
    return template
  }
  
  if (node.type === 'TEXT') {
    const template: TemplateNode = {
      type: 'TEXT',
      name: node.name,
      text: {
        value: node.characters,
        fontSize: typeof node.fontSize === 'number' ? node.fontSize : undefined,
        fontFamily: node.fontName && typeof node.fontName !== 'symbol' ? node.fontName.family : undefined,
        fontStyle: node.fontName && typeof node.fontName !== 'symbol' ? node.fontName.style : undefined
      }
    }
    
    // Style
    const style: { fills?: any[] } = {}
    if (node.fills && Array.isArray(node.fills) && node.fills.length > 0) {
      const fill = node.fills[0] as SolidPaint
      if (fill.type === 'SOLID') {
        style.fills = [{
          type: 'SOLID',
          color: {
            r: fill.color.r,
            g: fill.color.g,
            b: fill.color.b
          }
        }]
      }
    }
    if (Object.keys(style).length > 0) {
      template.style = style
    }
    
    return template
  }
  
  if (node.type === 'RECTANGLE') {
    const template: TemplateNode = {
      type: 'RECTANGLE',
      name: node.name
    }
    
    // Style
    const style: { fills?: any[]; strokes?: any[]; radius?: number } = {}
    if (node.fills && Array.isArray(node.fills) && node.fills.length > 0) {
      const fill = node.fills[0] as SolidPaint
      if (fill.type === 'SOLID') {
        style.fills = [{
          type: 'SOLID',
          color: {
            r: fill.color.r,
            g: fill.color.g,
            b: fill.color.b
          }
        }]
      }
    }
    if (node.strokes && Array.isArray(node.strokes) && node.strokes.length > 0) {
      const stroke = node.strokes[0] as SolidPaint
      if (stroke.type === 'SOLID') {
        style.strokes = [{
          type: 'SOLID',
          color: {
            r: stroke.color.r,
            g: stroke.color.g,
            b: stroke.color.b
          },
          weight: node.strokeWeight
        }]
      }
    }
    if (node.cornerRadius !== undefined && typeof node.cornerRadius === 'number') {
      style.radius = node.cornerRadius
    }
    if (Object.keys(style).length > 0) {
      template.style = style
    }
    
    return template
  }
  
  return null
}

