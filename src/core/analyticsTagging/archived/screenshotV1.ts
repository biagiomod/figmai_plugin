/**
 * Analytics Tagging — visible-in-area screenshot capture (ARCHIVED v1)
 * Crop rect = container absolute bounds; collect intersecting nodes (page children + subtrees);
 * temp frame "__figmai_tmp_capture__" off-canvas; clone with offsets; export PNG 2x; always delete frame in finally.
 * No persistent screenshot bytes; caller stores only ScreenshotRef (crop metrics + hotspot ratios).
 */

import { getAbsoluteBounds } from '../../stage/anchor'
import type { ScreenshotRef } from '../types'

const TMP_FRAME_NAME = '__figmai_tmp_capture__'
const EXPORT_SCALE = 2

function rectsIntersect(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number }
): boolean {
  return !(a.x + a.width <= b.x || b.x + b.width <= a.x || a.y + a.height <= b.y || b.y + b.height <= a.y)
}

/** Collect visible nodes intersecting crop rect: traverse page children that intersect, then their subtrees (paint order) */
function collectIntersectingNodes(
  page: PageNode,
  cropRect: { x: number; y: number; width: number; height: number }
): Array<{ node: SceneNode; bounds: { x: number; y: number; width: number; height: number } }> {
  const result: Array<{ node: SceneNode; bounds: { x: number; y: number; width: number; height: number } }> = []

  function walk(nodes: readonly SceneNode[]) {
    for (const node of nodes) {
      if (!('visible' in node) || node.visible === false) continue
      const bounds = getAbsoluteBounds(node)
      if (!bounds || !rectsIntersect(bounds, cropRect)) continue
      result.push({ node, bounds })
      if ('children' in node && node.children.length > 0) {
        walk(node.children)
      }
    }
  }

  walk(page.children)
  return result
}

/** Place temp frame off-canvas (e.g. far left) so it doesn't affect viewport */
function getOffCanvasPosition(): { x: number; y: number } {
  return { x: -20000, y: 0 }
}

/**
 * Capture visible-in-area screenshot and compute hotspot ratios.
 * Returns PNG bytes (for preview/export only; do not store in clientStorage) and ScreenshotRef.
 * Temp frame is always deleted in a finally block.
 */
export async function captureVisibleInArea(args: {
  container: SceneNode
  target: SceneNode
  rootNodeId: string
  screenshotRefId: string
}): Promise<{ bytes: Uint8Array; ref: ScreenshotRef }> {
  const { container, target, rootNodeId, screenshotRefId } = args
  const page = container.parent
  if (!page || page.type !== 'PAGE') {
    throw new Error('Container has no page')
  }
  const cropRect = getAbsoluteBounds(container)
  if (!cropRect || cropRect.width <= 0 || cropRect.height <= 0) {
    throw new Error('Invalid container bounds')
  }
  const targetBounds = getAbsoluteBounds(target)
  if (!targetBounds) {
    throw new Error('Invalid target bounds')
  }

  const hotspotRatioX = (targetBounds.x + targetBounds.width / 2 - cropRect.x) / cropRect.width
  const hotspotRatioY = (targetBounds.y + targetBounds.height / 2 - cropRect.y) / cropRect.height

  const ref: ScreenshotRef = {
    id: screenshotRefId,
    cropWidth: cropRect.width,
    cropHeight: cropRect.height,
    hotspotRatioX: Math.max(0, Math.min(1, hotspotRatioX)),
    hotspotRatioY: Math.max(0, Math.min(1, hotspotRatioY)),
    containerNodeId: container.id,
    targetNodeId: target.id,
    rootNodeId
  }

  const intersecting = collectIntersectingNodes(page as PageNode, cropRect)
  const pos = getOffCanvasPosition()

  const frame = figma.createFrame()
  frame.name = TMP_FRAME_NAME
  frame.resize(cropRect.width, cropRect.height)
  frame.x = pos.x
  frame.y = pos.y
  frame.fills = []

  try {
    (page as PageNode).appendChild(frame)

    for (const { node, bounds } of intersecting) {
      try {
        if (typeof (node as { clone?: () => SceneNode }).clone !== 'function') continue
        const clone = (node as { clone: () => SceneNode }).clone()
        clone.x = bounds.x - cropRect.x
        clone.y = bounds.y - cropRect.y
        frame.appendChild(clone)
      } catch (_) {
        // Skip nodes that can't be cloned
      }
    }

    const bytes = await frame.exportAsync({
      format: 'PNG',
      constraint: { type: 'SCALE', value: EXPORT_SCALE }
    })

    return { bytes, ref }
  } finally {
    if (frame.parent) {
      frame.remove()
    }
  }
}
