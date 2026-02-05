/**
 * Analytics Tagging — read ScreenID / ActionID from node annotations
 * Supports native Dev Mode annotations (category = ActionID/ScreenID, value in label) and legacy label parsing.
 * Fallbacks: layer name (ScreenID), node name (ActionID).
 */

import { debug } from '../debug/logger'

/** Annotation with optional category (native Dev Mode) */
type AnnotationWithCategory = {
  label?: string
  labelMarkdown?: string
  categoryId?: string
}

/** Cached category id → label map for the plugin session */
let cachedCategoryMap: Map<string, string> | null = null

/**
 * Get annotation category map (id → label). Cached for the session.
 * Uses figma.annotations.getAnnotationCategoriesAsync() when available.
 */
async function getCategoryMap(): Promise<Map<string, string>> {
  if (cachedCategoryMap !== null) return cachedCategoryMap
  try {
    const figmaAnnotations = (figma as { annotations?: { getAnnotationCategoriesAsync?: () => Promise<Array<{ id: string; label: string }>> } }).annotations
    if (figmaAnnotations?.getAnnotationCategoriesAsync) {
      const categories = await figmaAnnotations.getAnnotationCategoriesAsync()
      const map = new Map<string, string>()
      for (const cat of categories) {
        if (cat?.id != null && cat?.label != null) {
          map.set(cat.id, String(cat.label).trim())
        }
      }
      cachedCategoryMap = map
      return map
    }
  } catch (_) {
    // API not available or failed; use empty map
  }
  cachedCategoryMap = new Map()
  return cachedCategoryMap
}

/** Optional: clear cache so next call refetches categories (e.g. after file change). */
export function clearAnnotationCategoryCache(): void {
  cachedCategoryMap = null
}

/** Strip markdown to plain text minimally (collapse whitespace, trim). */
function labelToPlainText(s: string): string {
  return s.replace(/\s+/g, ' ').trim()
}

/**
 * Find first annotation value by category label (native Dev Mode: category = "ActionID" or "ScreenID", value in label).
 * Returns null if none found.
 */
async function findAnnotationValueByCategory(
  node: BaseNode,
  wantedCategoryLabel: 'ActionID' | 'ScreenID'
): Promise<string | null> {
  if (!('annotations' in node) || !Array.isArray((node as SceneNode & { annotations?: unknown }).annotations)) {
    return null
  }
  const annotations = (node as SceneNode & { annotations?: AnnotationWithCategory[] }).annotations ?? []
  if (annotations.length === 0) return null

  const categoryMap = await getCategoryMap()
  const wanted = wantedCategoryLabel

  for (const a of annotations) {
    const catLabel = a.categoryId ? categoryMap.get(a.categoryId)?.trim() : undefined
    if (catLabel !== wanted) continue

    const fromLabel = typeof a.label === 'string' ? a.label.trim() : ''
    if (fromLabel) return fromLabel

    const fromMarkdown = typeof a.labelMarkdown === 'string' ? labelToPlainText(a.labelMarkdown) : ''
    if (fromMarkdown) return fromMarkdown
  }
  return null
}

/** Parse tag from annotation label: "ScreenID: Home" or "ActionID=submit-button" (legacy). */
function parseTagFromLabel(label: string, tagKey: string): string | null {
  const keyLower = tagKey.toLowerCase()
  const normalized = String(label || '').trim()
  for (const sep of [':', '=']) {
    const idx = normalized.indexOf(sep)
    if (idx === -1) continue
    const key = normalized.slice(0, idx).trim().toLowerCase()
    if (key === keyLower) {
      return normalized.slice(idx + 1).trim() || null
    }
  }
  return null
}

function getAnnotationLabels(node: BaseNode): string[] {
  const labels: string[] = []
  if (!('annotations' in node) || !Array.isArray((node as SceneNode & { annotations?: unknown }).annotations)) {
    return labels
  }
  const annotations = (node as SceneNode & { annotations?: Array<{ label?: string; labelMarkdown?: string }> }).annotations ?? []
  for (const a of annotations) {
    if (typeof a.label === 'string' && a.label.trim()) {
      labels.push(a.label.trim())
    }
    if (typeof a.labelMarkdown === 'string' && a.labelMarkdown.trim()) {
      const plain = labelToPlainText(a.labelMarkdown)
      if (plain && !labels.includes(plain)) labels.push(plain)
    }
  }
  return labels
}

export type ReadScreenIdResult = { value: string; fromFallback: boolean }
export type ReadActionIdResult = { value: string; fromFallback: boolean }

/** Source of the value for diagnostics (category = native Dev Mode, legacyLabel = "ScreenID: x", fallbackNodeName = layer name). */
export type AnnotationSource = 'category' | 'legacyLabel' | 'fallbackNodeName'

/**
 * Read first ScreenID from node annotations (category-based then legacy label); fallback to layer name.
 */
export async function readScreenIdFromNode(node: BaseNode, fallbackName: string): Promise<ReadScreenIdResult> {
  const nodeId = (node as { id?: string }).id
  const nodeType = (node as { type?: string }).type
  const nodeName = (node as { name?: string }).name

  const fromCategory = await findAnnotationValueByCategory(node, 'ScreenID')
  if (fromCategory != null) {
    if (debug.isEnabled('subsystem:analytics_tagging')) {
      debug.scope('subsystem:analytics_tagging').log('ScreenID', {
        nodeId,
        nodeType,
        nodeName,
        screenIdSource: 'category' as AnnotationSource,
        value: fromCategory
      })
    }
    return { value: fromCategory, fromFallback: false }
  }

  const labels = getAnnotationLabels(node)
  for (const label of labels) {
    const value = parseTagFromLabel(label, 'ScreenID')
    if (value != null) {
      if (debug.isEnabled('subsystem:analytics_tagging')) {
        debug.scope('subsystem:analytics_tagging').log('ScreenID', {
          nodeId,
          nodeType,
          nodeName,
          screenIdSource: 'legacyLabel' as AnnotationSource,
          value
        })
      }
      return { value, fromFallback: false }
    }
  }

  const value = fallbackName || nodeName || 'Unknown'
  if (debug.isEnabled('subsystem:analytics_tagging')) {
    debug.scope('subsystem:analytics_tagging').log('ScreenID', {
      nodeId,
      nodeType,
      nodeName,
      screenIdSource: 'fallbackNodeName' as AnnotationSource,
      value,
      labelsCount: labels.length
    })
  }
  return { value, fromFallback: true }
}

/**
 * Read first ActionID from node annotations (category-based then legacy label); fallback to node name.
 */
export async function readActionIdFromNode(node: BaseNode): Promise<ReadActionIdResult> {
  const nodeId = (node as { id?: string }).id
  const nodeType = (node as { type?: string }).type
  const nodeName = (node as { name?: string }).name

  const fromCategory = await findAnnotationValueByCategory(node, 'ActionID')
  if (fromCategory != null) {
    if (debug.isEnabled('subsystem:analytics_tagging')) {
      debug.scope('subsystem:analytics_tagging').log('ActionID', {
        nodeId,
        nodeType,
        nodeName,
        actionIdSource: 'category' as AnnotationSource,
        value: fromCategory
      })
    }
    return { value: fromCategory, fromFallback: false }
  }

  const labels = getAnnotationLabels(node)
  for (const label of labels) {
    const value = parseTagFromLabel(label, 'ActionID')
    if (value != null) {
      if (debug.isEnabled('subsystem:analytics_tagging')) {
        debug.scope('subsystem:analytics_tagging').log('ActionID', {
          nodeId,
          nodeType,
          nodeName,
          actionIdSource: 'legacyLabel' as AnnotationSource,
          value
        })
      }
      return { value, fromFallback: false }
    }
  }

  const value = nodeName || 'Unknown'
  if (debug.isEnabled('subsystem:analytics_tagging')) {
    debug.scope('subsystem:analytics_tagging').log('ActionID', {
      nodeId,
      nodeType,
      nodeName,
      actionIdSource: 'fallbackNodeName' as AnnotationSource,
      value,
      labelsCount: labels.length
    })
  }
  return { value, fromFallback: true }
}
