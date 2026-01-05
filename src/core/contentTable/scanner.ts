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
 */
function getComponentContext(node: SceneNode): {
  kind: "component" | "componentSet" | "instance" | "custom"
  name: string
  key?: string
} {
  let current: BaseNode | null = node
  
  while (current) {
    if (current.type === 'INSTANCE') {
      const instance = current as InstanceNode
      const mainComponent = instance.mainComponent
      if (mainComponent) {
        return {
          kind: 'instance',
          name: mainComponent.name,
          key: mainComponent.key
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
 * Build node URL (best effort)
 */
function buildNodeUrl(nodeId: string): string {
  // Try to get file key from figma.fileKey if available
  // Otherwise use figma:// protocol
  try {
    // @ts-ignore - fileKey may not be in types but exists in runtime
    const fileKey = figma.fileKey
    if (fileKey) {
      return `https://www.figma.com/file/${fileKey}?node-id=${encodeURIComponent(nodeId)}`
    }
  } catch {
    // fileKey not available
  }
  
  return `figma://node-id=${nodeId}`
}

/**
 * Recursively collect all text nodes from a node's subtree
 */
function collectTextNodes(rootNode: SceneNode, items: ContentItemV1[], currentPath: string[] = []): void {
  // If this is a text node, add it to items
  if (rootNode.type === 'TEXT') {
    const textNode = rootNode as TextNode
    const breadcrumb = currentPath.length > 0 
      ? currentPath.join(' / ')
      : textNode.name
    
    const componentContext = getComponentContext(textNode)
    const nodeUrl = buildNodeUrl(textNode.id)
    
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
    const children = rootNode.children
    for (const child of children) {
      if (child.type === 'TEXT') {
        const textNode = child as TextNode
        const childPath = [...currentPath, textNode.name]
        const breadcrumb = childPath.join(' / ')
        
        const componentContext = getComponentContext(textNode)
        const nodeUrl = buildNodeUrl(textNode.id)
        
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

