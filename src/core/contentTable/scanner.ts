/**
 * Content Table Scanner
 * Extracts text nodes from a selected container and builds Universal Content Table
 */

import type { UniversalContentTableV1, ContentItemV1, TableMetaV1 } from './types'
// Note: SceneNode, TextNode, BaseNode are global types from @figma/plugin-typings (ambient types)

/**
 * Build breadcrumb path from root to node
 */
function buildBreadcrumbPath(rootNode: SceneNode, targetNode: SceneNode): string {
  const path: string[] = []
  let current: BaseNode | null = targetNode
  
  while (current && current !== rootNode) {
    // Skip PAGE and DOCUMENT nodes
    if (current.type === 'PAGE' || current.type === 'DOCUMENT') {
      break
    }
    // Only add SceneNode types to path
    if ('name' in current && current !== rootNode) {
      path.unshift(current.name)
    }
    current = current.parent
  }
  
  // Add root node name at the beginning
  path.unshift(rootNode.name)
  
  return path.join(' / ')
}

/**
 * Get component context for a node
 * Enhanced to detect component instances and extract variant properties
 */
function getComponentContext(node: SceneNode): {
  kind: "component" | "componentSet" | "instance" | "custom"
  name: string
  key?: string
  variantProperties?: Record<string, string>
} {
  let current: BaseNode | null = node
  
  while (current) {
    if (current.type === 'INSTANCE') {
      const instance = current as InstanceNode
      const mainComponent = instance.mainComponent
      if (mainComponent) {
        // Extract variant properties if available
        const variantProperties: Record<string, string> | undefined = 
          instance.variantProperties && Object.keys(instance.variantProperties).length > 0
            ? Object.fromEntries(
                Object.entries(instance.variantProperties).map(([key, value]) => [
                  key,
                  typeof value === 'string' ? value : String(value)
                ])
              )
            : undefined
        
        return {
          kind: 'instance',
          name: mainComponent.name,
          key: mainComponent.key,
          variantProperties
        }
      }
    } else if (current.type === 'COMPONENT') {
      const component = current as ComponentNode
      return {
        kind: 'component',
        name: component.name,
        key: component.key
      }
    } else if (current.type === 'COMPONENT_SET') {
      const componentSet = current as ComponentSetNode
      return {
        kind: 'componentSet',
        name: componentSet.name,
        key: componentSet.key
      }
    }
    
    // Move to parent, but stop at PAGE/DOCUMENT
    if (current.parent) {
      if (current.parent.type === 'PAGE' || current.parent.type === 'DOCUMENT') {
        break
      }
      // Only continue if parent is a SceneNode
      if ('visible' in current.parent) {
        current = current.parent as SceneNode
      } else {
        break
      }
    } else {
      break
    }
  }
  
  return {
    kind: 'custom',
    name: 'Custom'
  }
}

/**
 * Build stable plugin-safe Figma URL for a node
 * Format: https://www.figma.com/file/<FILE_KEY>?node-id=<encodeURIComponent(nodeId)>
 * Uses /file/ endpoint which is more stable and plugin-safe than /design/
 */
function buildCanonicalFigmaUrl(nodeId: string): string {
  try {
    // Get file key (may not be in types but exists in runtime)
    // @ts-ignore - fileKey may not be in types but exists in runtime
    const fileKey = figma.fileKey
    
    if (!fileKey) {
      // Fallback to figma:// protocol if fileKey not available
      return `figma://node-id=${nodeId.replace(/:/g, '-')}`
    }
    
    // Use encodeURIComponent for node ID to ensure proper URL encoding
    const encodedNodeId = encodeURIComponent(nodeId)
    
    return `https://www.figma.com/file/${fileKey}?node-id=${encodedNodeId}`
  } catch (error) {
    // Fallback to figma:// protocol on any error
    console.warn('[Scanner] Failed to build canonical Figma URL:', error)
    return `figma://node-id=${nodeId.replace(/:/g, '-')}`
  }
}

/**
 * Sort nodes deterministically: top-to-bottom, left-to-right
 * This ensures consistent ordering across scans
 */
function sortNodesDeterministically(nodes: readonly SceneNode[]): SceneNode[] {
  return [...nodes].sort((a, b) => {
    // First sort by Y position (top to bottom)
    const yDiff = a.y - b.y
    if (Math.abs(yDiff) > 1) { // Allow 1px tolerance for alignment
      return yDiff
    }
    // Then sort by X position (left to right)
    return a.x - b.x
  })
}

/**
 * Infer field role from node name and content
 * Returns: CTA | Headline | Body | Helper | Placeholder | Tooltip | Error | etc.
 */
function inferFieldRole(node: TextNode, path: string): string | undefined {
  const name = node.name.toLowerCase()
  const content = node.characters.toLowerCase()
  
  // Error messages
  if (name.includes('error') || content.includes('error') || name.includes('invalid')) {
    return 'Error'
  }
  
  // CTAs
  if (name.includes('cta') || name.includes('button') || name.includes('action')) {
    return 'CTA'
  }
  
  // Headlines
  if (name.includes('headline') || name.includes('title') || name.includes('heading')) {
    return 'Headline'
  }
  
  // Placeholders
  if (name.includes('placeholder') || content.includes('enter') || content.includes('type')) {
    return 'Placeholder'
  }
  
  // Tooltips
  if (name.includes('tooltip') || name.includes('hint')) {
    return 'Tooltip'
  }
  
  // Helper text
  if (name.includes('helper') || name.includes('help') || name.includes('description')) {
    return 'Helper'
  }
  
  // Body text
  if (name.includes('body') || name.includes('text') || name.includes('content')) {
    return 'Body'
  }
  
  // Default: unknown (leave blank)
  return undefined
}

/**
 * Recursively collect all text nodes from a node's subtree
 * Enhanced with deterministic ordering (top-to-bottom, left-to-right)
 * CRITICAL: Ignores hidden layers (node.visible === false) and does NOT traverse their children
 */
function collectTextNodes(rootNode: SceneNode, items: ContentItemV1[], currentPath: string[] = []): void {
  // CRITICAL RULE: Skip hidden nodes entirely
  if (!rootNode.visible) {
    return // Do NOT traverse children of hidden nodes
  }
  
  // If this is a text node, add it to items
  if (rootNode.type === 'TEXT') {
    const textNode = rootNode as TextNode
    const breadcrumb = currentPath.length > 0 
      ? currentPath.join(' / ')
      : textNode.name
    
    const componentContext = getComponentContext(textNode)
    const nodeUrl = buildCanonicalFigmaUrl(textNode.id)
    const role = inferFieldRole(textNode, breadcrumb)
    
    const item: ContentItemV1 = {
      id: textNode.id,
      nodeId: textNode.id,
      nodeUrl: nodeUrl,
      component: componentContext,
      field: {
        label: textNode.name,
        path: breadcrumb,
        role: role
      },
      content: {
        type: 'text',
        value: textNode.characters
      },
      textLayerName: textNode.name, // For TEXT nodes only
      meta: {
        visible: textNode.visible !== false,
        locked: textNode.locked === true
      },
      // Optional fields (blank by default)
      notes: '',
      contentKey: '',
      jiraTicket: '',
      adaNotes: '',
      // Error message: populate if role === "Error"
      errorMessage: role === 'Error' ? textNode.characters : ''
    }
    
    items.push(item)
  }
  
  // Traverse children if node has them
  if ('children' in rootNode) {
    // Sort children deterministically (top-to-bottom, left-to-right)
    const sortedChildren = sortNodesDeterministically(rootNode.children)
    
    for (const child of sortedChildren) {
      // CRITICAL RULE: Skip hidden nodes entirely
      if (!child.visible) {
        continue // Do NOT traverse children of hidden nodes
      }
      
      if (child.type === 'TEXT') {
        const textNode = child as TextNode
        const childPath = [...currentPath, textNode.name]
        const breadcrumb = childPath.join(' / ')
        
        const componentContext = getComponentContext(textNode)
        const nodeUrl = buildCanonicalFigmaUrl(textNode.id)
        const role = inferFieldRole(textNode, breadcrumb)
        
        const item: ContentItemV1 = {
          id: textNode.id,
          nodeId: textNode.id,
          nodeUrl: nodeUrl,
          component: componentContext,
          field: {
            label: textNode.name,
            path: breadcrumb,
            role: role
          },
          content: {
            type: 'text',
            value: textNode.characters
          },
          textLayerName: textNode.name, // For TEXT nodes only
          meta: {
            visible: textNode.visible !== false,
            locked: textNode.locked === true
          },
          // Optional fields (blank by default)
          notes: '',
          contentKey: '',
          jiraTicket: '',
          adaNotes: '',
          // Error message: populate if role === "Error"
          errorMessage: role === 'Error' ? textNode.characters : ''
        }
        
        items.push(item)
      } else if ('children' in child) {
        // Recursively scan child containers
        const childPath = [...currentPath, child.name]
        collectTextNodes(child as SceneNode, items, childPath)
      }
    }
  }
}

/**
 * Export node as thumbnail image (~100px width)
 * Returns base64 data URL or undefined if export fails
 */
async function exportThumbnail(node: SceneNode): Promise<string | undefined> {
  try {
    // Calculate scale to get ~100px width
    const targetWidth = 100
    const nodeWidth = 'width' in node ? node.width : 100
    const scale = Math.min(1, targetWidth / nodeWidth)
    
    // Export as PNG
    const bytes = await node.exportAsync({
      format: 'PNG',
      constraint: {
        type: 'SCALE',
        value: scale
      }
    })
    
    // Convert to base64 data URL
    const base64 = figma.base64Encode(bytes)
    return `data:image/png;base64,${base64}`
  } catch (error) {
    console.warn('[Scanner] Failed to export thumbnail:', error)
    return undefined
  }
}

/**
 * Scan selected container and generate Universal Content Table
 * Now async to support thumbnail export
 */
export async function scanContentTable(selectedNode: SceneNode): Promise<UniversalContentTableV1> {
  const page = selectedNode.parent
  const pageName = page && page.type === 'PAGE' ? page.name : 'Unknown Page'
  const pageId = page && page.type === 'PAGE' ? page.id : ''
  
  const items: ContentItemV1[] = []
  
  // Collect all text nodes from the selected container
  // Start with root node name in path
  // CRITICAL: Hidden nodes are automatically skipped by collectTextNodes
  collectTextNodes(selectedNode, items, [selectedNode.name])
  
  // Export thumbnail for root node
  const thumbnailDataUrl = await exportThumbnail(selectedNode)
  
  // Build table metadata
  const rootNodeUrl = buildCanonicalFigmaUrl(selectedNode.id)
  const meta: TableMetaV1 = {
    contentModel: 'Universal v2',
    contentStage: 'Draft',
    adaStatus: '⏳ Pending',
    legalStatus: '⏳ Pending',
    lastUpdated: new Date().toISOString(),
    version: 'v1',
    rootNodeId: selectedNode.id,
    rootNodeName: selectedNode.name,
    rootNodeUrl: rootNodeUrl,
    thumbnailDataUrl: thumbnailDataUrl
  }
  
  return {
    type: "universal-content-table",
    version: 1,
    generatedAtISO: new Date().toISOString(),
    source: {
      pageId: pageId,
      pageName: pageName,
      selectionNodeId: selectedNode.id,
      selectionName: selectedNode.name
    },
    meta: meta,
    items: items
  }
}

