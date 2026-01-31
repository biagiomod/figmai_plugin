/**
 * Analytics Tagging — read ScreenID / ActionID from node annotations
 * Fallbacks: layer name (ScreenID), node name (ActionID).
 */

/** Parse tag from annotation label: "ScreenID: Home" or "ActionID=submit-button" */
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
      const plain = a.labelMarkdown.replace(/\s+/g, ' ').trim()
      if (plain && !labels.includes(plain)) labels.push(plain)
    }
  }
  return labels
}

/** Read first ScreenID from node annotations; fallback to layer name */
export function readScreenIdFromNode(node: BaseNode, fallbackName: string): { value: string; fromFallback: boolean } {
  const labels = getAnnotationLabels(node)
  for (const label of labels) {
    const value = parseTagFromLabel(label, 'ScreenID')
    if (value != null) return { value, fromFallback: false }
  }
  return { value: fallbackName || node.name || 'Unknown', fromFallback: true }
}

/** Read first ActionID from node annotations; fallback to node name */
export function readActionIdFromNode(node: BaseNode): { value: string; fromFallback: boolean } {
  const labels = getAnnotationLabels(node)
  for (const label of labels) {
    const value = parseTagFromLabel(label, 'ActionID')
    if (value != null) return { value, fromFallback: false }
  }
  const name = 'name' in node ? (node as SceneNode).name : ''
  return { value: name || 'Unknown', fromFallback: true }
}
