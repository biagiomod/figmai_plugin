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
 * Used to detect when a TEXT node is inside a button/container so we can suppress emitting it as a separate link.
 */
export function findNearestInteractiveAncestor(
  node: SceneNode,
  interactiveContainerIds: Set<string>
): SceneNode | null {
  for (const ancestor of getAncestors(node)) {
    if (interactiveContainerIds.has(ancestor.id)) return ancestor
  }
  return null
}

/**
 * True when the node has an interactive ancestor (e.g. button container).
 * Use to gate link emission: do not emit TEXT as link when it is nested inside a button.
 */
export function hasInteractiveAncestor(node: SceneNode, interactiveContainerIds: Set<string>): boolean {
  return findNearestInteractiveAncestor(node, interactiveContainerIds) !== null
}
