import type { SelectionState } from '../types'

/**
 * Summarize current selection
 * @param selectionOrder Optional array of node IDs in selection order. If provided, names will be returned in this order.
 */
export function summarizeSelection(selectionOrder?: string[]): SelectionState {
  const selection = figma.currentPage.selection
  const count = selection.length
  
  if (count === 0) {
    return {
      count: 0,
      summary: 'No selection',
      hasSelection: false,
      names: []
    }
  }
  
  // Create a map of node ID to node for quick lookup
  const nodeMap = new Map<string, SceneNode>()
  for (const node of selection) {
    nodeMap.set(node.id, node)
  }
  
  // Collect names in selection order if order is provided
  const names: string[] = []
  if (selectionOrder && selectionOrder.length > 0) {
    // Use the provided order, but only include nodes that are still selected
    for (const nodeId of selectionOrder) {
      const node = nodeMap.get(nodeId)
      if (node) {
        names.push(node.name || 'Unnamed')
      }
    }
    // Add any nodes that are selected but not in the order (shouldn't happen, but safety check)
    for (const node of selection) {
      if (!selectionOrder.includes(node.id)) {
        names.push(node.name || 'Unnamed')
      }
    }
  } else {
    // No order provided, use current selection order
    for (const node of selection) {
      names.push(node.name || 'Unnamed')
    }
  }
  
  // Build summary string
  const types = new Map<string, number>()
  for (const node of selection) {
    const type = node.type
    types.set(type, (types.get(type) || 0) + 1)
  }
  
  const typeStrings: string[] = []
  types.forEach((count, type) => {
    typeStrings.push(`${count} ${type}${count > 1 ? 's' : ''}`)
  })
  
  const summary = typeStrings.join(', ')
  
  return {
    count,
    summary,
    hasSelection: true,
    names
  }
}

