/**
 * AT-A Near-Miss Detector
 * Pure functions for detecting annotation category labels that are close to
 * "ScreenID" or "ActionID" but not exact — e.g. "Screen ID", "screen_id".
 * normalizeTagKey, isNearMissScreenId, isNearMissActionId are pure with no external deps.
 * detectNearMisses reads annotation categories via getCategoryMapShared (requires Figma runtime).
 */

import { getCategoryMapShared } from '../figma/annotations'

// ============================================================================
// Public interfaces
// ============================================================================

export interface NearMissResult {
  node: SceneNode
  nodeName: string
  nodeId: string
  /** Raw category label found on the annotation, e.g. "Screen ID" */
  nearMissLabel: string
  canonicalLabel: 'ScreenID' | 'ActionID'
}

// ============================================================================
// Normalization + detection
// ============================================================================

/** Normalize a category label for near-miss comparison: strip spaces + underscores, lowercase. */
export function normalizeTagKey(s: string): string {
  return s.replace(/[\s_]/g, '').toLowerCase()
}

/** True if label normalizes to "screenid" but is NOT the exact string "ScreenID". */
export function isNearMissScreenId(label: string): boolean {
  if (label === 'ScreenID') return false
  return normalizeTagKey(label) === 'screenid'
}

/** True if label normalizes to "actionid" but is NOT the exact string "ActionID". */
export function isNearMissActionId(label: string): boolean {
  if (label === 'ActionID') return false
  return normalizeTagKey(label) === 'actionid'
}

// ============================================================================
// Scan
// ============================================================================

type AnnotationEntry = { categoryId?: string }

function getAnnotations(node: SceneNode): AnnotationEntry[] {
  if (!('annotations' in node)) return []
  const raw = (node as SceneNode & { annotations?: AnnotationEntry[] }).annotations
  return Array.isArray(raw) ? raw : []
}

/**
 * Check a node's annotation categories for near-misses of the given canonical label.
 * Returns the first near-miss label found, or null.
 * Uses the shared category cache — caller should ensure cache is warm.
 */
function checkNodeForNearMiss(
  node: SceneNode,
  categoryMap: Map<string, string>,
  canonicalLabel: 'ScreenID' | 'ActionID'
): string | null {
  const annotations = getAnnotations(node)
  const check = canonicalLabel === 'ScreenID' ? isNearMissScreenId : isNearMissActionId
  for (const entry of annotations) {
    if (!entry.categoryId) continue
    const catLabel = categoryMap.get(entry.categoryId)
    if (catLabel && check(catLabel)) return catLabel
  }
  return null
}

/**
 * True if node is a descendant of root (or is root itself) and node and every ancestor
 * up to (but not including) root have visible === true.
 */
function isVisibleUnderRoot(node: SceneNode, root: SceneNode): boolean {
  let current: BaseNode | null = node
  while (current && current !== root) {
    if ('visible' in current && (current as SceneNode).visible === false) return false
    current = current.parent
  }
  return current === root
}

/**
 * Scan rootNodes for ScreenID near-misses, and all their visible descendants for
 * ActionID near-misses. Returns all near-miss findings.
 *
 * De-duplicates by nodeId + canonicalLabel: first near-miss label found wins.
 * Expects the shared category cache to be warm (call getCategoryMapShared() before this
 * function if scanning was not preceded by another annotation read).
 */
export async function detectNearMisses(
  rootNodes: readonly SceneNode[]
): Promise<NearMissResult[]> {
  const categoryMap = await getCategoryMapShared()
  const seen = new Set<string>()  // `${nodeId}:${canonicalLabel}`
  const results: NearMissResult[] = []

  const walkDescendants = async (n: SceneNode, root: SceneNode): Promise<void> => {
    if (!isVisibleUnderRoot(n, root)) return
    const actionNearMiss = checkNodeForNearMiss(n, categoryMap, 'ActionID')
    if (actionNearMiss) {
      const key = `${n.id}:ActionID`
      if (!seen.has(key)) {
        seen.add(key)
        results.push({
          node: n,
          nodeName: n.name,
          nodeId: n.id,
          nearMissLabel: actionNearMiss,
          canonicalLabel: 'ActionID'
        })
      }
    }
    if ('children' in n) {
      for (const child of n.children) {
        await walkDescendants(child as SceneNode, root)
      }
    }
  }

  for (const root of rootNodes) {
    // Check root node for ScreenID near-miss
    const screenNearMiss = checkNodeForNearMiss(root, categoryMap, 'ScreenID')
    if (screenNearMiss) {
      const key = `${root.id}:ScreenID`
      if (!seen.has(key)) {
        seen.add(key)
        results.push({
          node: root,
          nodeName: root.name,
          nodeId: root.id,
          nearMissLabel: screenNearMiss,
          canonicalLabel: 'ScreenID'
        })
      }
    }

    // Check all visible descendants for ActionID near-misses
    await walkDescendants(root, root)
  }

  return results
}
