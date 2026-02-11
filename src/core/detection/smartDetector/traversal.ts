/**
 * Smart Detector traversal: single pass, visibility skip, dedupe, maxNodes cap.
 * Reuses patterns from contentReview (collectInspectableNodes, visibility).
 */

const INSPECTABLE_TYPES = new Set<SceneNode['type']>([
  'INSTANCE',
  'FRAME',
  'GROUP',
  'VECTOR',
  'BOOLEAN_OPERATION',
  'RECTANGLE',
  'ELLIPSE',
  'POLYGON',
  'STAR',
  'LINE',
  'TEXT'
])

export interface TraversalResult {
  /** Non-TEXT nodes for element classification (INSTANCE, FRAME, GROUP, etc.). */
  inspectable: SceneNode[]
  /** TEXT nodes for content classification. */
  textNodes: TextNode[]
  capped: boolean
}

/**
 * Single pass over roots: skip invisible, dedupe by id, stop when total collected >= maxNodes.
 */
export function traverseSelection(
  roots: SceneNode[],
  maxNodes: number
): TraversalResult {
  const inspectable: SceneNode[] = []
  const textNodes: TextNode[] = []
  const seen = new Set<string>()

  function walk(node: SceneNode): void {
    if (inspectable.length + textNodes.length >= maxNodes) return
    if (node.visible === false) return
    if (seen.has(node.id)) return
    seen.add(node.id)

    if (node.type === 'TEXT') {
      textNodes.push(node as TextNode)
      if (inspectable.length + textNodes.length >= maxNodes) return
    } else if (INSPECTABLE_TYPES.has(node.type)) {
      inspectable.push(node)
      if (inspectable.length + textNodes.length >= maxNodes) return
    }

    if ('children' in node) {
      for (const child of node.children) {
        walk(child as SceneNode)
        if (inspectable.length + textNodes.length >= maxNodes) return
      }
    }
  }

  for (const root of roots) {
    walk(root)
    if (inspectable.length + textNodes.length >= maxNodes) break
  }

  return {
    inspectable,
    textNodes,
    capped: inspectable.length + textNodes.length >= maxNodes
  }
}
