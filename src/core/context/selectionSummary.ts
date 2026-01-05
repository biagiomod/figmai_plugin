/**
 * Selection Summary
 * Builds a detailed, structured summary of the current selection for AI context
 * Optimized for signal quality: extracts meaningful, interpretable context
 */

export interface SelectionSummary {
  count: number
  nodes: Array<{
    id: string
    name: string
    type: string
    width?: number
    height?: number
    x?: number
    y?: number
    textContent?: string
    fontSize?: number
    fontFamily?: string
    fontWeight?: string
    lineHeight?: number
    letterSpacing?: number
    textAlign?: string
    layoutMode?: string
    layoutAlign?: string
    layoutGrow?: number
    primaryAxisSizingMode?: string
    counterAxisSizingMode?: string
    padding?: { top: number; right: number; bottom: number; left: number }
    itemSpacing?: number
    primaryAxisAlignItems?: string
    counterAxisAlignItems?: string
    fills?: string[]
    strokes?: string[]
    strokeWeight?: number
    cornerRadius?: number
    opacity?: number
    isComponent?: boolean
    isInstance?: boolean
    componentName?: string
    componentProperties?: Record<string, unknown>
    childCount?: number
    hasText?: boolean
    allTextContent?: string
  }>
}

/**
 * Extract all text content from a node and its children (recursive, limited depth)
 */
function extractAllText(node: SceneNode, maxDepth: number = 3, currentDepth: number = 0): string[] {
  const texts: string[] = []
  
  if (currentDepth >= maxDepth) {
    return texts
  }
  
  if (node.type === 'TEXT') {
    const textNode = node as TextNode
    const content = textNode.characters.trim()
    if (content.length > 0) {
      texts.push(content)
    }
  }
  
  // Recurse into children
  if ('children' in node) {
    const parentNode = node as ChildrenMixin
    for (const child of parentNode.children) {
      texts.push(...extractAllText(child, maxDepth, currentDepth + 1))
    }
  }
  
  return texts
}

/**
 * Extract component properties from an instance
 */
function extractComponentProperties(node: InstanceNode): Record<string, unknown> | undefined {
  try {
    const props: Record<string, unknown> = {}
    
    // Get variant properties
    if (node.variantProperties) {
      Object.assign(props, node.variantProperties)
    }
    
    // Get component property values
    if (node.componentProperties) {
      for (const [key, value] of Object.entries(node.componentProperties)) {
        if (value.type === 'BOOLEAN') {
          props[key] = value.value
        } else if (value.type === 'TEXT') {
          props[key] = value.value
        } else if (value.type === 'INSTANCE_SWAP') {
          // value.value can be SceneNode (with name) or string/boolean
          if (value.value && typeof value.value === 'object' && 'name' in value.value) {
            props[key] = (value.value as { name: string }).name
          } else if (typeof value.value === 'string') {
            props[key] = value.value
          } else if (typeof value.value === 'boolean') {
            props[key] = value.value ? 'True' : 'False'
          } else {
            props[key] = 'None'
          }
        } else if (value.type === 'VARIANT') {
          props[key] = value.value
        }
      }
    }
    
    return Object.keys(props).length > 0 ? props : undefined
  } catch {
    return undefined
  }
}

/**
 * Extract detailed selection summary
 * Optimized for signal quality: extracts meaningful, interpretable context
 * Keeps output concise and deterministic with truncation
 */
export function extractSelectionSummary(selectionOrder?: string[]): SelectionSummary {
  const selection = figma.currentPage.selection
  const count = selection.length

  if (count === 0) {
    return {
      count: 0,
      nodes: []
    }
  }

  // Create node map for order preservation
  const nodeMap = new Map<string, SceneNode>()
  for (const node of selection) {
    nodeMap.set(node.id, node)
  }

  // Build ordered list
  const orderedNodes: SceneNode[] = []
  if (selectionOrder && selectionOrder.length > 0) {
    for (const nodeId of selectionOrder) {
      const node = nodeMap.get(nodeId)
      if (node) {
        orderedNodes.push(node)
      }
    }
    // Add any remaining nodes
    for (const node of selection) {
      if (!selectionOrder.includes(node.id)) {
        orderedNodes.push(node)
      }
    }
  } else {
    orderedNodes.push(...selection)
  }

  const nodes = orderedNodes.map(node => {
    const summary: SelectionSummary['nodes'][0] = {
      id: node.id,
      name: node.name || 'Unnamed',
      type: node.type
    }

    // Position and dimensions
    if ('width' in node && 'height' in node) {
      summary.width = Math.round(node.width)
      summary.height = Math.round(node.height)
    }
    if ('x' in node && 'y' in node) {
      summary.x = Math.round(node.x)
      summary.y = Math.round(node.y)
    }

    // Text node specifics
    if (node.type === 'TEXT') {
      const textNode = node as TextNode
      const fullText = textNode.characters
      summary.textContent = fullText.substring(0, 500) // Increased to 500 chars for better context
      
      if (typeof textNode.fontSize === 'number') {
        summary.fontSize = Math.round(textNode.fontSize)
      }
      if (typeof textNode.fontName !== 'symbol') {
        summary.fontFamily = `${textNode.fontName.family} ${textNode.fontName.style}`
        // Extract weight from style if available
        const styleMatch = textNode.fontName.style.match(/(\d+)|(Bold|Regular|Light|Medium|SemiBold|Black|Thin)/i)
        if (styleMatch) {
          summary.fontWeight = styleMatch[0]
        }
      }
      if (typeof textNode.lineHeight === 'number') {
        summary.lineHeight = Math.round(textNode.lineHeight * 100) / 100
      } else if (textNode.lineHeight && typeof textNode.lineHeight === 'object') {
        // LineHeight can be { unit: "AUTO" } or { value: number; unit: ... }
        if (textNode.lineHeight.unit === 'AUTO') {
          // Omit lineHeight for AUTO, or set to 'Auto' if needed
          // summary.lineHeight = 'Auto' // Uncomment if you want to show Auto
        } else if ('value' in textNode.lineHeight && typeof textNode.lineHeight.value === 'number') {
          summary.lineHeight = Math.round(textNode.lineHeight.value * 100) / 100
        }
      }
      if (typeof textNode.letterSpacing === 'object' && textNode.letterSpacing.value !== undefined) {
        summary.letterSpacing = Math.round(textNode.letterSpacing.value * 100) / 100
      }
      if (typeof textNode.textAlignHorizontal === 'string') {
        summary.textAlign = textNode.textAlignHorizontal
      }
    }

    // Frame/Component/Instance specifics
    if (node.type === 'FRAME' || node.type === 'COMPONENT' || node.type === 'INSTANCE') {
      const frameNode = node as FrameNode | ComponentNode | InstanceNode
      
      // Child count
      if ('children' in frameNode) {
        summary.childCount = frameNode.children.length
      }
      
      // Check for text content in children
      const allText = extractAllText(frameNode, 3)
      if (allText.length > 0) {
        summary.hasText = true
        // Combine all text, truncate to reasonable length
        const combinedText = allText.join(' ').substring(0, 1000)
        summary.allTextContent = combinedText
        // If no direct text content, use first text node as primary
        if (!summary.textContent && allText[0]) {
          summary.textContent = allText[0].substring(0, 200)
        }
      }
      
      // Layout mode and properties
      if (frameNode.layoutMode !== 'NONE') {
        summary.layoutMode = frameNode.layoutMode
        if (typeof frameNode.itemSpacing === 'number') {
          summary.itemSpacing = Math.round(frameNode.itemSpacing)
        }
        if (typeof frameNode.paddingTop === 'number') {
          summary.padding = {
            top: Math.round(frameNode.paddingTop),
            right: Math.round(frameNode.paddingRight),
            bottom: Math.round(frameNode.paddingBottom),
            left: Math.round(frameNode.paddingLeft)
          }
        }
        if (typeof frameNode.primaryAxisAlignItems === 'string') {
          summary.primaryAxisAlignItems = frameNode.primaryAxisAlignItems
        }
        if (typeof frameNode.counterAxisAlignItems === 'string') {
          summary.counterAxisAlignItems = frameNode.counterAxisAlignItems
        }
        if (typeof frameNode.primaryAxisSizingMode === 'string') {
          summary.primaryAxisSizingMode = frameNode.primaryAxisSizingMode
        }
        if (typeof frameNode.counterAxisSizingMode === 'string') {
          summary.counterAxisSizingMode = frameNode.counterAxisSizingMode
        }
      }
      
      // Layout constraints (for children alignment)
      if ('layoutAlign' in frameNode && typeof frameNode.layoutAlign === 'string') {
        summary.layoutAlign = frameNode.layoutAlign
      }
      if ('layoutGrow' in frameNode && typeof frameNode.layoutGrow === 'number') {
        summary.layoutGrow = frameNode.layoutGrow
      }

      // Component/Instance info
      if (node.type === 'COMPONENT') {
        summary.isComponent = true
      } else if (node.type === 'INSTANCE') {
        summary.isInstance = true
        const instanceNode = node as InstanceNode
        if (instanceNode.mainComponent) {
          summary.componentName = instanceNode.mainComponent.name
        }
        // Extract component properties
        const props = extractComponentProperties(instanceNode)
        if (props) {
          summary.componentProperties = props
        }
      }
    }

    // Fills (extract all solid fills, limit to 3)
    if ('fills' in node && Array.isArray(node.fills) && node.fills.length > 0) {
      const fillColors: string[] = []
      for (const fill of node.fills.slice(0, 3)) {
        if (fill.type === 'SOLID' && fill.color) {
          const r = Math.round(fill.color.r * 255)
          const g = Math.round(fill.color.g * 255)
          const b = Math.round(fill.color.b * 255)
          const a = fill.opacity !== undefined ? Math.round(fill.opacity * 100) / 100 : 1
          if (a < 1) {
            fillColors.push(`rgba(${r}, ${g}, ${b}, ${a})`)
          } else {
            fillColors.push(`rgb(${r}, ${g}, ${b})`)
          }
        }
      }
      if (fillColors.length > 0) {
        summary.fills = fillColors
      }
    }

    // Strokes (extract all solid strokes, limit to 2)
    if ('strokes' in node && Array.isArray(node.strokes) && node.strokes.length > 0) {
      const strokeColors: string[] = []
      for (const stroke of node.strokes.slice(0, 2)) {
        if (stroke.type === 'SOLID' && stroke.color) {
          const r = Math.round(stroke.color.r * 255)
          const g = Math.round(stroke.color.g * 255)
          const b = Math.round(stroke.color.b * 255)
          strokeColors.push(`rgb(${r}, ${g}, ${b})`)
        }
      }
      if (strokeColors.length > 0) {
        summary.strokes = strokeColors
      }
      if (typeof node.strokeWeight === 'number') {
        summary.strokeWeight = Math.round(node.strokeWeight)
      }
    }

    // Corner radius
    if ('cornerRadius' in node && typeof node.cornerRadius === 'number') {
      summary.cornerRadius = Math.round(node.cornerRadius)
    } else if ('topLeftRadius' in node && typeof node.topLeftRadius === 'number') {
      // Individual corner radii - use topLeft as representative
      summary.cornerRadius = Math.round(node.topLeftRadius)
    }

    // Opacity (SliceNode doesn't have opacity)
    if ('opacity' in node && typeof node.opacity === 'number' && node.opacity < 1) {
      summary.opacity = Math.round(node.opacity * 100) / 100
    }

    return summary
  })

  return {
    count,
    nodes
  }
}

/**
 * Format selection summary as a readable string for AI context
 * Optimized for LLM interpretation: structured, concise, meaningful
 */
export function formatSelectionSummary(summary: SelectionSummary): string {
  if (summary.count === 0) {
    return 'No selection'
  }

  const parts: string[] = []
  parts.push(`Selected ${summary.count} node${summary.count > 1 ? 's' : ''}:`)

  for (const node of summary.nodes) {
    const nodeParts: string[] = []
    nodeParts.push(`\n${node.name} (${node.type})`)
    
    // Dimensions and position
    if (node.width && node.height) {
      nodeParts.push(`Size: ${node.width}×${node.height}px`)
    }
    if (node.x !== undefined && node.y !== undefined) {
      nodeParts.push(`Position: (${node.x}, ${node.y})`)
    }
    
    // Text content (prioritize direct text, then all text)
    if (node.textContent) {
      const text = node.textContent.length > 100 
        ? node.textContent.substring(0, 100) + '...'
        : node.textContent
      nodeParts.push(`Text: "${text}"`)
    } else if (node.allTextContent) {
      const text = node.allTextContent.length > 100 
        ? node.allTextContent.substring(0, 100) + '...'
        : node.allTextContent
      nodeParts.push(`Contains text: "${text}"`)
    }
    
    // Typography
    const typoParts: string[] = []
    if (node.fontSize) typoParts.push(`${node.fontSize}px`)
    if (node.fontFamily) typoParts.push(node.fontFamily)
    if (node.fontWeight) typoParts.push(`weight: ${node.fontWeight}`)
    if (node.lineHeight) typoParts.push(`line-height: ${node.lineHeight}`)
    if (node.letterSpacing) typoParts.push(`letter-spacing: ${node.letterSpacing}`)
    if (node.textAlign) typoParts.push(`align: ${node.textAlign}`)
    if (typoParts.length > 0) {
      nodeParts.push(`Typography: ${typoParts.join(', ')}`)
    }
    
    // Layout properties
    if (node.layoutMode) {
      const layoutParts: string[] = []
      layoutParts.push(`Layout: ${node.layoutMode}`)
      if (node.itemSpacing !== undefined) {
        layoutParts.push(`gap: ${node.itemSpacing}px`)
      }
      if (node.padding) {
        layoutParts.push(`padding: ${node.padding.top}/${node.padding.right}/${node.padding.bottom}/${node.padding.left}px`)
      }
      if (node.primaryAxisAlignItems) {
        layoutParts.push(`primary-align: ${node.primaryAxisAlignItems}`)
      }
      if (node.counterAxisAlignItems) {
        layoutParts.push(`counter-align: ${node.counterAxisAlignItems}`)
      }
      if (node.primaryAxisSizingMode) {
        layoutParts.push(`primary-sizing: ${node.primaryAxisSizingMode}`)
      }
      if (node.counterAxisSizingMode) {
        layoutParts.push(`counter-sizing: ${node.counterAxisSizingMode}`)
      }
      nodeParts.push(layoutParts.join(', '))
    }
    
    // Component/Instance info
    if (node.isComponent) {
      nodeParts.push('Type: Component')
    } else if (node.isInstance) {
      nodeParts.push(`Type: Instance of "${node.componentName || 'Unknown'}"`)
      if (node.componentProperties) {
        const propStrings = Object.entries(node.componentProperties)
          .map(([k, v]) => `${k}: ${String(v)}`)
          .join(', ')
        if (propStrings) {
          nodeParts.push(`Properties: ${propStrings}`)
        }
      }
    }
    
    // Structure
    if (node.childCount !== undefined) {
      nodeParts.push(`Children: ${node.childCount}`)
    }
    
    // Visual styles
    if (node.fills && node.fills.length > 0) {
      nodeParts.push(`Fill: ${node.fills.join(', ')}`)
    }
    if (node.strokes && node.strokes.length > 0) {
      const strokeInfo = node.strokeWeight 
        ? `${node.strokes.join(', ')}, ${node.strokeWeight}px`
        : node.strokes.join(', ')
      nodeParts.push(`Stroke: ${strokeInfo}`)
    }
    if (node.cornerRadius !== undefined) {
      nodeParts.push(`Corner radius: ${node.cornerRadius}px`)
    }
    if (node.opacity !== undefined) {
      nodeParts.push(`Opacity: ${node.opacity}`)
    }
    
    parts.push(nodeParts.join(' | '))
  }

  return parts.join('\n')
}

