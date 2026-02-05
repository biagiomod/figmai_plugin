/**
 * Analytics Tagging — selection-driven flow
 * Validate single ScreenID-annotated selection; scan visible descendants for ActionID; build rows (no screenshot).
 * ActionID callouts may sit outside the screen frame bounds (e.g. right-side callouts); we include all descendants
 * that are visible (node.visible and no hidden ancestor), with no bounding-box filtering.
 */

import { readScreenIdFromNode, readActionIdFromNode } from './annotations'
import type { Row, ActionType } from './types'
import { debug } from '../debug/logger'

function buildFigmaNodeUrl(nodeId: string): string {
  try {
    const fileKey = (figma as { fileKey?: string }).fileKey
    if (!fileKey) return `figma://node-id=${nodeId.replace(/:/g, '-')}`
    return `https://www.figma.com/file/${fileKey}?node-id=${encodeURIComponent(nodeId)}`
  } catch {
    return `figma://node-id=${nodeId.replace(/:/g, '-')}`
  }
}

async function getComponentNameForNode(node: SceneNode): Promise<string> {
  let current: BaseNode | null = node
  while (current) {
    if (current.type === 'INSTANCE') {
      try {
        const main = await (current as InstanceNode).getMainComponentAsync().catch(() => null)
        if (main) return main.name
      } catch (_) {
        // ignore
      }
    }
    if (current.type === 'COMPONENT') return (current as ComponentNode).name
    if (current.type === 'COMPONENT_SET') return (current as ComponentSetNode).name
    if (current.parent && current.parent.type !== 'PAGE' && current.parent.type !== 'DOCUMENT') {
      current = current.parent
    } else {
      break
    }
  }
  return 'custom'
}

/**
 * True if node is a descendant of root and node and every ancestor up to (but not including) root have visible === true.
 * Used so we include ActionID callouts that are outside the screen frame bounds but still visible in the tree.
 */
function isVisibleUnderRoot(node: SceneNode, root: SceneNode): boolean {
  let current: BaseNode | null = node
  while (current && current !== root) {
    if ('visible' in current && (current as SceneNode).visible === false) return false
    current = current.parent
  }
  return current === root
}

export type ValidateEligibleScreenSelectionResult =
  | { ok: true; screenNode: SceneNode; screenId: string }
  | { ok: false; message: string }

/**
 * Validate that selection is exactly one node with a ScreenID (annotation or layer name fallback).
 * Rejects PAGE and DOCUMENT.
 */
export async function validateEligibleScreenSelection(
  selection: readonly SceneNode[]
): Promise<ValidateEligibleScreenSelectionResult> {
  if (selection.length !== 1) {
    return { ok: false, message: 'Select exactly one frame or component with a ScreenID annotation.' }
  }
  const node = selection[0]
  if ((node as BaseNode).type === 'DOCUMENT' || (node as BaseNode).type === 'PAGE') {
    return { ok: false, message: 'Select a frame or component (not the page).' }
  }
  const screenNode = node as SceneNode
  const screenIdResult = await readScreenIdFromNode(screenNode, screenNode.name)
  return {
    ok: true,
    screenNode,
    screenId: screenIdResult.value
  }
}

export type ActionIdFinding = {
  node: SceneNode
  actionId: string
  actionName: string
  component: string
  figmaElementLink: string
}

/**
 * Traverse ALL descendants of screenNode; include only nodes that are visible (node.visible and no hidden ancestor)
 * and have a real ActionID annotation (category or legacy label). Node-name fallback is excluded so only
 * annotated nodes generate rows. No bounding-box or in-frame filtering. De-duplicate by ActionID value (first wins).
 */
export async function scanVisibleActionIds(screenNode: SceneNode): Promise<ActionIdFinding[]> {
  const seen = new Set<string>()
  const result: ActionIdFinding[] = []
  if (debug.isEnabled('subsystem:analytics_tagging')) {
    debug.scope('subsystem:analytics_tagging').log('scanVisibleActionIds START', {
      screenNodeId: screenNode.id,
      screenNodeType: screenNode.type,
      screenNodeName: screenNode.name
    })
  }

  async function walk(n: SceneNode): Promise<void> {
    if (!isVisibleUnderRoot(n, screenNode)) return
    const actionIdResult = await readActionIdFromNode(n)
    const actionId = (actionIdResult.value || '').trim()
    // Only include nodes with real ActionID annotations (category or legacyLabel). Exclude fallback (node.name).
    const fromAnnotation = !actionIdResult.fromFallback
    if (actionId && actionId !== 'Unknown' && fromAnnotation && !seen.has(actionId)) {
      seen.add(actionId)
      const component = await getComponentNameForNode(n)
      const actionName = 'name' in n ? (n as SceneNode).name : actionId
      result.push({
        node: n,
        actionId,
        actionName,
        component,
        figmaElementLink: buildFigmaNodeUrl(n.id)
      })
    }
    if ('children' in n && n.children.length > 0) {
      for (const child of n.children) {
        await walk(child as SceneNode)
      }
    }
  }

  await walk(screenNode)
  if (debug.isEnabled('subsystem:analytics_tagging')) {
    debug.scope('subsystem:analytics_tagging').log('scanVisibleActionIds DONE', {
      findingsCount: result.length,
      nodeIds: result.map(f => f.node.id)
    })
  }
  return result
}

function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`
}

/**
 * Map scan results to Row[] (no screenshotRef). Same schema as existing table.
 */
export async function actionIdFindingsToRows(
  screenId: string,
  screenNodeId: string,
  findings: ActionIdFinding[]
): Promise<Row[]> {
  const rows: Row[] = []
  for (const f of findings) {
    rows.push({
      id: generateId(),
      screenId,
      description: '',
      actionType: 'Action' as ActionType,
      component: f.component,
      actionId: f.actionId,
      actionName: f.actionName,
      figmaElementLink: f.figmaElementLink,
      population: '',
      note: '',
      meta: {
        containerNodeId: screenNodeId,
        targetNodeId: f.node.id,
        rootScreenNodeId: screenNodeId,
        capturedAtISO: new Date().toISOString()
      }
    })
  }
  return rows
}
