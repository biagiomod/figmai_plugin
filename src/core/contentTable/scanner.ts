/**
 * Content Table Scanner
 * Extracts text nodes from a selected container and builds Universal Content Table
 */

import type { UniversalContentTableV1, ContentItemV1 } from './types'
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
 * Build canonical Figma URL
 * Format: https://www.figma.com/design/<FILE_KEY>/<FILE_NAME>?node-id=<NODE_ID>&t=<TOKEN>
 * 
 * Requirements:
 * - FILE_KEY from figma.fileKey
 * - FILE_NAME from figma.root.name, URL-encoded
 * - NODE_ID from node.id with : replaced by -
 * - TOKEN: Prefer stable token if available, otherwise omit &t= entirely
 */
function buildCanonicalFigmaUrl(nodeId: string): string {
  try {
    // Get file key (may not be in types but exists in runtime)
    // @ts-ignore - fileKey may not be in types but exists in runtime
    const fileKey = figma.fileKey
    
    if (!fileKey) {
      // Fallback to figma:// protocol if fileKey not available
      return `figma://node-id=${nodeId}`
    }
    
    // Get root name (file name)
    const rootName = figma.root.name || 'Untitled'
    
    // URL-encode the file name
    const encodedFileName = encodeURIComponent(rootName)
    
    // Convert node ID from format "123:456" to "123-456"
    const normalizedNodeId = nodeId.replace(/:/g, '-')
    
    // Build base URL
    let url = `https://www.figma.com/design/${fileKey}/${encodedFileName}?node-id=${normalizedNodeId}`
    
    // Try to get stable token if available (some Figma APIs provide this)
    // For now, we omit &t= as it's not reliably available in plugin context
    // The URL will work without the token parameter
    
    return url
  } catch (error) {
    // Fallback to figma:// protocol on any error
    console.warn('[Scanner] Failed to build canonical Figma URL:', error)
    return `figma://node-id=${nodeId}`
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
 * Recursively collect all text nodes from a node's subtree
 * Enhanced with deterministic ordering (top-to-bottom, left-to-right)
 */
function collectTextNodes(rootNode: SceneNode, items: ContentItemV1[], currentPath: string[] = []): void {
  // If this is a text node, add it to items
  if (rootNode.type === 'TEXT') {
    const textNode = rootNode as TextNode
    const breadcrumb = currentPath.length > 0 
      ? currentPath.join(' / ')
      : textNode.name
    
    const componentContext = getComponentContext(textNode)
    const nodeUrl = buildCanonicalFigmaUrl(textNode.id)
    
    const item: ContentItemV1 = {
      id: textNode.id,
      nodeId: textNode.id,
      nodeUrl: nodeUrl,
      component: componentContext,
      field: {
        label: textNode.name,
        path: breadcrumb
      },
      content: {
        type: 'text',
        value: textNode.characters
      },
      meta: {
        visible: textNode.visible !== false,
        locked: textNode.locked === true
      }
    }
    
    items.push(item)
  }
  
  // Traverse children if node has them
  if ('children' in rootNode) {
    // Sort children deterministically (top-to-bottom, left-to-right)
    const sortedChildren = sortNodesDeterministically(rootNode.children)
    
    for (const child of sortedChildren) {
      if (child.type === 'TEXT') {
        const textNode = child as TextNode
        const childPath = [...currentPath, textNode.name]
        const breadcrumb = childPath.join(' / ')
        
        const componentContext = getComponentContext(textNode)
        const nodeUrl = buildCanonicalFigmaUrl(textNode.id)
        
        const item: ContentItemV1 = {
          id: textNode.id,
          nodeId: textNode.id,
          nodeUrl: nodeUrl,
          component: componentContext,
          field: {
            label: textNode.name,
            path: breadcrumb
          },
          content: {
            type: 'text',
            value: textNode.characters
          },
          meta: {
            visible: textNode.visible !== false,
            locked: textNode.locked === true
          }
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
 * Scan selected container and generate Universal Content Table
 */
export function scanContentTable(selectedNode: SceneNode): UniversalContentTableV1 {
  const page = selectedNode.parent
  const pageName = page && page.type === 'PAGE' ? page.name : 'Unknown Page'
  const pageId = page && page.type === 'PAGE' ? page.id : ''
  
  const items: ContentItemV1[] = []
  
  // Collect all text nodes from the selected container
  // Start with root node name in path
  collectTextNodes(selectedNode, items, [selectedNode.name])
  
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
    items: items
  }
}

