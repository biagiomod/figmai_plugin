/**
 * Hierarchy utilities for containment-aware classification.
 * Used to suppress nested labels (e.g. link text inside a button) and to gate element emission.
 */

/**
 * Collect all ancestors of a node (parent, parent.parent, ...). Order: nearest first.
 */
export function getAncestors(node: SceneNode): SceneNode[] {
  const out: SceneNode[] = []
  let current: BaseNode | null = node.parent
  while (current) {
    if (current.type === 'PAGE' || current.type === 'DOCUMENT') break
    out.push(current as SceneNode)
    current = current.parent
  }
  return out
}

/**
 * Return the nearest ancestor whose id is in interactiveContainerIds, or null.
 * Short-circuits the parent walk without allocating an ancestors array.
 */
export function findNearestInteractiveAncestor(
  node: SceneNode,
  interactiveContainerIds: Set<string>
): SceneNode | null {
  let current: BaseNode | null = node.parent
  while (current) {
    if (current.type === 'PAGE' || current.type === 'DOCUMENT') break
    if (interactiveContainerIds.has(current.id)) return current as SceneNode
    current = current.parent
  }
  return null
}

/**
 * True when the node has an interactive ancestor (e.g. button container).
 * Short-circuits: walks parent chain directly without allocating an array.
 */
export function hasInteractiveAncestor(node: SceneNode, interactiveContainerIds: Set<string>): boolean {
  let current: BaseNode | null = node.parent
  while (current) {
    if (current.type === 'PAGE' || current.type === 'DOCUMENT') break
    if (interactiveContainerIds.has(current.id)) return true
    current = current.parent
  }
  return false
}
