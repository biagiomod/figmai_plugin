/**
 * Shared geometry/text helpers for Smart Detector (button/link heuristics).
 */

import { getAbsoluteBounds } from '../../stage/anchor'

export type Bounds = { x: number; y: number; width: number; height: number }

const MAX_TEXT_DESCENDANTS = 16

/** Collect visible TEXT descendants with non-empty characters (up to limit). */
export function getVisibleTextDescendants(node: SceneNode, limit = MAX_TEXT_DESCENDANTS): TextNode[] {
  const out: TextNode[] = []
  if (node.type === 'TEXT') {
    const t = node as TextNode
    if (t.visible !== false && (t.characters ?? '').trim().length > 0) out.push(t)
    return out
  }
  if (!('children' in node)) return out
  for (const child of node.children) {
    if ((child as SceneNode).visible === false) continue
    out.push(...getVisibleTextDescendants(child as SceneNode, limit - out.length))
    if (out.length >= limit) break
  }
  return out
}

/** Return the dominant TEXT node: largest fontSize, or largest bbox area if fontSize missing. */
export function getDominantTextNode(textNodes: TextNode[]): TextNode | undefined {
  if (textNodes.length === 0) return undefined
  if (textNodes.length === 1) return textNodes[0]
  let best: TextNode | undefined
  let bestScore = -1
  for (const n of textNodes) {
    let score = 0
    if (typeof (n as unknown as { fontSize?: number }).fontSize === 'number') {
      score = (n as unknown as { fontSize: number }).fontSize
    }
    if (score <= 0) {
      const b = getAbsoluteBounds(n)
      score = b ? b.width * b.height : 0
    }
    if (score > bestScore) {
      bestScore = score
      best = n
    }
  }
  return best
}

/** Inset of inner relative to outer (positive = inner is inside). */
export function computeInset(
  outer: Bounds,
  inner: Bounds
): { left: number; top: number; right: number; bottom: number } {
  return {
    left: inner.x - outer.x,
    top: inner.y - outer.y,
    right: outer.x + outer.width - (inner.x + inner.width),
    bottom: outer.y + outer.height - (inner.y + inner.height)
  }
}

/** True if container has fill (FRAME/COMPONENT/INSTANCE) or a RECTANGLE child that acts as background. */
export function hasBackground(container: SceneNode): boolean {
  if ('fills' in container) {
    const fills = (container as FrameNode | InstanceNode | ComponentNode).fills
    if (fills && Array.isArray(fills) && fills.length > 0) return true
  }
  if (!('children' in container)) return false
  const containerBounds = getAbsoluteBounds(container)
  if (!containerBounds) return false
  const area = containerBounds.width * containerBounds.height
  if (area <= 0) return false
  for (const child of container.children) {
    const c = child as SceneNode
    if (c.visible === false) continue
    if (c.type === 'RECTANGLE') {
      const childBounds = getAbsoluteBounds(c)
      if (childBounds && childBounds.width > 0 && childBounds.height > 0) {
        const overlap =
          Math.max(0, Math.min(containerBounds.x + containerBounds.width, childBounds.x + childBounds.width) - Math.max(containerBounds.x, childBounds.x)) *
          Math.max(0, Math.min(containerBounds.y + containerBounds.height, childBounds.y + childBounds.height) - Math.max(containerBounds.y, childBounds.y))
        if (overlap >= area * 0.5) return true
      }
    }
  }
  return false
}

export { getAbsoluteBounds }
