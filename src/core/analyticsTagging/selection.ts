/**
 * Analytics Tagging — single-node validation and root screen derivation
 * Step 1: validateTargetOnly(selectedNode) — exactly 1 node (target).
 * Step 2: validateContainerForDraft(selectedContainerNode, draft) — target center inside container rect.
 */

import { getTopLevelContainerNode, getAbsoluteBounds } from '../stage/anchor'
import type { Rect } from '../stage/anchor'
import { readScreenIdFromNode, readActionIdFromNode } from './annotations'
import type { DraftRow } from './types'

function rectContainsPoint(rect: Rect, x: number, y: number): boolean {
  return x >= rect.x && x <= rect.x + rect.width && y >= rect.y && y <= rect.y + rect.height
}

/** Valid container types for interaction area */
function isValidContainer(node: SceneNode): boolean {
  return ['FRAME', 'COMPONENT', 'INSTANCE', 'GROUP'].includes(node.type)
}

export type ValidateTargetOnlyResult =
  | { ok: true; target: SceneNode; rootScreen: SceneNode; screenId: string; actionId: string; component: string; figmaElementLink: string; screenIdWarning?: boolean; actionIdWarning?: boolean }
  | { ok: false; message: string }

export type ValidateContainerForDraftResult =
  | { ok: true; container: SceneNode; target: SceneNode; rootScreen: SceneNode }
  | { ok: false; message: string }

/**
 * Validate single-node selection as target (action item).
 * Returns derived root screen, screenId, actionId, component, figma link.
 */
export async function validateTargetOnly(selectedNode: SceneNode): Promise<ValidateTargetOnlyResult> {
  if ((selectedNode as BaseNode).type === 'DOCUMENT' || (selectedNode as BaseNode).type === 'PAGE') {
    return { ok: false, message: 'Select exactly one node (the action item, e.g. button/link).' }
  }
  const target = selectedNode
  const rootScreen = getTopLevelContainerNode(target)
  const screenIdResult = readScreenIdFromNode(rootScreen, rootScreen.name)
  const actionIdResult = readActionIdFromNode(target)
  const componentName = await getComponentNameForNode(target)
  const figmaElementLink = buildFigmaNodeUrl(target.id)
  return {
    ok: true,
    target,
    rootScreen,
    screenId: screenIdResult.value,
    actionId: actionIdResult.value,
    component: componentName,
    figmaElementLink,
    screenIdWarning: screenIdResult.fromFallback,
    actionIdWarning: actionIdResult.fromFallback
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

function buildFigmaNodeUrl(nodeId: string): string {
  try {
    const fileKey = (figma as { fileKey?: string }).fileKey
    if (!fileKey) return `figma://node-id=${nodeId.replace(/:/g, '-')}`
    return `https://www.figma.com/file/${fileKey}?node-id=${encodeURIComponent(nodeId)}`
  } catch {
    return `figma://node-id=${nodeId.replace(/:/g, '-')}`
  }
}

/**
 * Validate container selection for existing draft: resolve draft target, ensure target center inside container rect.
 */
export async function validateContainerForDraft(
  selectedContainerNode: SceneNode,
  draft: DraftRow
): Promise<ValidateContainerForDraftResult> {
  const targetNodeId = draft.meta?.targetNodeId
  if (!targetNodeId) {
    return { ok: false, message: 'Capture an action item first.' }
  }
  const targetNode = await figma.getNodeByIdAsync(targetNodeId)
  if (!targetNode) {
    return { ok: false, message: 'Action item no longer exists; capture again.' }
  }
  if (targetNode.type === 'DOCUMENT' || targetNode.type === 'PAGE') {
    return { ok: false, message: 'Action item no longer exists; capture again.' }
  }
  const target = targetNode as SceneNode

  if ((selectedContainerNode as BaseNode).type === 'DOCUMENT' || (selectedContainerNode as BaseNode).type === 'PAGE') {
    return { ok: false, message: 'Select exactly one node: the section container.' }
  }
  const container = selectedContainerNode
  if (!isValidContainer(container)) {
    return { ok: false, message: 'Select the section container (frame/component/group) that contains the action item.' }
  }

  const cropRect = getAbsoluteBounds(container)
  const targetBounds = getAbsoluteBounds(target)
  if (!cropRect) {
    return { ok: false, message: 'Could not get bounds for the section container.' }
  }
  if (!targetBounds) {
    return { ok: false, message: 'Could not get bounds for the action item.' }
  }

  const targetCenterX = targetBounds.x + targetBounds.width / 2
  const targetCenterY = targetBounds.y + targetBounds.height / 2
  if (!rectContainsPoint(cropRect, targetCenterX, targetCenterY)) {
    return {
      ok: false,
      message: 'Target must be inside the section. Select the section container that contains the action item.'
    }
  }

  const rootScreen = getTopLevelContainerNode(container)
  return { ok: true, container, target, rootScreen }
}
