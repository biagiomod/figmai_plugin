/**
 * Selection policy resolver.
 * Normalizes selection order for assistants that require a specific pair (e.g. container, target).
 */

export enum SelectionPolicy {
  NORMAL = 'NORMAL',
  ANALYTICS_TAGGING_PAIR = 'ANALYTICS_TAGGING_PAIR'
}

export type ResolveSelectionResult =
  | { ok: true; selectionOrder: string[] }
  | { ok: false; message: string }

/** Returns true only when ancestor appears in node.parent chain (strict: node is not a descendant of itself). */
function isDescendant(ancestor: BaseNode, node: BaseNode): boolean {
  let current: BaseNode | null = node.parent
  while (current) {
    if (current === ancestor) return true
    current = current.parent
  }
  return false
}

/**
 * Resolve selection order according to the given policy.
 * - NORMAL: passthrough.
 * - ANALYTICS_TAGGING_PAIR: require exactly 2 nodes; if one is ancestor of the other, return [ancestor.id, descendant.id]; else as-is.
 */
export async function resolveSelectionWithPolicy(
  selectionOrder: string[],
  policy: SelectionPolicy
): Promise<ResolveSelectionResult> {
  if (policy === SelectionPolicy.NORMAL) {
    return { ok: true, selectionOrder }
  }

  if (policy === SelectionPolicy.ANALYTICS_TAGGING_PAIR) {
    if (selectionOrder.length !== 2) {
      return {
        ok: false,
        message: 'Select exactly two nodes: interaction area (container), then interaction target. Tip: use Shift-click in the Layers panel to multi-select.'
      }
    }

    const nodeA = await figma.getNodeByIdAsync(selectionOrder[0])
    const nodeB = await figma.getNodeByIdAsync(selectionOrder[1])
    if (!nodeA || !nodeB) {
      return {
        ok: false,
        message: 'One or both selected nodes could not be found.'
      }
    }

    if (isDescendant(nodeA, nodeB)) {
      return { ok: true, selectionOrder: [nodeA.id, nodeB.id] }
    }
    if (isDescendant(nodeB, nodeA)) {
      return { ok: true, selectionOrder: [nodeB.id, nodeA.id] }
    }

    return { ok: true, selectionOrder }
  }

  return { ok: true, selectionOrder }
}
