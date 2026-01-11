/**
 * Selection Capture Utilities
 * Unified system for capturing selection context (images + metadata)
 */

/**
 * Get selection context (selected node, anchor node, summary text)
 */
export async function getSelectionContext(selectionOrder: string[]): Promise<{
  selectedNode?: SceneNode
  anchorNode?: SceneNode
  summaryText: string
}> {
  if (selectionOrder.length === 0) {
    return {
      summaryText: 'No selection'
    }
  }

  const selectedNode = await figma.getNodeByIdAsync(selectionOrder[0])
  if (!selectedNode || selectedNode.type === 'DOCUMENT' || selectedNode.type === 'PAGE') {
    return {
      summaryText: 'Invalid selection'
    }
  }

  const sceneNode = selectedNode as SceneNode
  const anchorNode = getTopLevelContainerNode(sceneNode)

  return {
    selectedNode: sceneNode,
    anchorNode: anchorNode,
    summaryText: `Selected: ${sceneNode.name} (${sceneNode.type})`
  }
}

/**
 * Get topmost container node that is a direct child of the page
 */
function getTopLevelContainerNode(node: SceneNode): SceneNode {
  let topLevelNode: SceneNode = node
  let currentNode: BaseNode | null = node

  while (currentNode && currentNode.parent) {
    if (currentNode.parent.type === 'PAGE') {
      topLevelNode = currentNode as SceneNode
      break
    }
    currentNode = currentNode.parent
  }

  return topLevelNode
}

/**
 * Export selection as images
 */
export async function exportSelectionImages(
  selectedNode: SceneNode
): Promise<Array<{ bytes: Uint8Array; width: number; height: number; name: string }>> {
  try {
    const bytes = await selectedNode.exportAsync({
      format: 'PNG',
      constraint: {
        type: 'SCALE',
        value: 1
      }
    })

    const bounds = 'absoluteBoundingBox' in selectedNode && selectedNode.absoluteBoundingBox
      ? selectedNode.absoluteBoundingBox
      : { width: 0, height: 0 }

    return [
      {
        bytes,
        width: bounds.width,
        height: bounds.height,
        name: selectedNode.name
      }
    ]
  } catch (error) {
    console.error('[Selection] Failed to export selection image:', error)
    return []
  }
}

/**
 * Get basic node metadata
 */
export function getNodeMetadata(node: SceneNode): {
  name: string
  type: string
  width: number
  height: number
  hasLayout?: boolean
  layoutMode?: 'HORIZONTAL' | 'VERTICAL' | 'NONE'
} {
  const width = 'width' in node ? node.width : 0
  const height = 'height' in node ? node.height : 0
  const hasLayout = node.type === 'FRAME' && (node as FrameNode).layoutMode !== 'NONE'
  const layoutMode = node.type === 'FRAME' ? (node as FrameNode).layoutMode : undefined

  return {
    name: node.name,
    type: node.type,
    width,
    height,
    hasLayout,
    layoutMode
  }
}

