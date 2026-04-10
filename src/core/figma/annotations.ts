/**
 * Plugin-wide annotation utilities: native Dev Mode annotations (best-effort) and visible in-canvas cards.
 * Callers should treat visible cards as canonical; native annotations are additive when supported.
 */

import { loadFonts, createTextNode, createAutoLayoutFrameSafe } from '../stage/primitives'

/** Single annotation entry: only one of label or labelMarkdown (Figma API constraint). */
export type AnnotationEntry = { label?: string; labelMarkdown?: string; categoryId?: string }

/** Figma annotations API (getAnnotationCategoriesAsync, addAnnotationCategoryAsync). */
type FigmaAnnotationsAPI = {
  annotations?: {
    getAnnotationCategoriesAsync?: () => Promise<Array<{ id: string; label: string }>>
    addAnnotationCategoryAsync?: (input: { label: string; color: string }) => Promise<{ id: string; label: string }>
  }
}

const DEFAULT_CATEGORY_COLOR = 'orange'

/** Shared annotation category cache: categoryId → categoryLabel. null = not yet loaded. */
let _sharedCategoryCache: Map<string, string> | null = null

/**
 * Get shared annotation category map (id → label). Lazy-loads on first call; returns cached result subsequently.
 * Returns empty map if Figma annotations API is unavailable.
 */
export async function getCategoryMapShared(): Promise<Map<string, string>> {
  if (_sharedCategoryCache !== null) return _sharedCategoryCache
  try {
    const api = (figma as unknown as FigmaAnnotationsAPI).annotations
    if (api?.getAnnotationCategoriesAsync) {
      const categories = await api.getAnnotationCategoriesAsync()
      const map = new Map<string, string>()
      for (const cat of categories) {
        if (cat?.id != null && cat?.label != null) {
          map.set(cat.id, String(cat.label).trim())
        }
      }
      _sharedCategoryCache = map
      return map
    }
  } catch {
    // API not available
  }
  _sharedCategoryCache = new Map()
  return _sharedCategoryCache
}

/** Clear the shared annotation category cache. Call after file changes or when cache staleness is a concern. */
export function clearAnnotationCategoryCache(): void {
  _sharedCategoryCache = null
}

/**
 * Ensure an annotation category exists; return its id. Reuses existing category with same label.
 * Returns undefined if API unavailable or creation fails; callers should still set annotations without categoryId.
 */
export async function ensureAnnotationCategory(
  label: string,
  color: string = DEFAULT_CATEGORY_COLOR
): Promise<string | undefined> {
  try {
    const api = (figma as unknown as FigmaAnnotationsAPI).annotations
    if (!api?.getAnnotationCategoriesAsync) return undefined
    const categories = await api.getAnnotationCategoriesAsync()
    const needle = label.trim().toLowerCase()
    const existing = categories.find(c => c.label.trim().toLowerCase() === needle)
    if (existing?.id) return existing.id
    if (api.addAnnotationCategoryAsync) {
      const created = await api.addAnnotationCategoryAsync({ label: label.trim(), color })
      if (created?.id) {
        if (_sharedCategoryCache !== null) {
          _sharedCategoryCache.set(created.id, label)
        }
        return created.id
      }
    }
  } catch {
    // Proceed without categoryId
  }
  return undefined
}

/**
 * Annotation entry with resolved category label and normalized plain text.
 * plainText is always present (may be empty string if both label and labelMarkdown are absent).
 */
export interface ResolvedAnnotationEntry {
  /** Category ID as stored on the annotation (opaque, Figma-internal). */
  categoryId?: string
  /** Human-readable label for the category, resolved from the session cache. undefined if category not found in cache. */
  categoryLabel?: string
  /** Raw plain-text label as set on the annotation, if present. */
  label?: string
  /** Raw markdown label as set on the annotation, if present. */
  labelMarkdown?: string
  /**
   * Normalized plain-text value. Derived by:
   *   1. If label is non-empty: use label as-is.
   *   2. Else if labelMarkdown is non-empty: strip markdown to plain text.
   *   3. Else: empty string.
   */
  plainText: string
}

/** Strip markdown formatting to plain text (minimal: removes **, *, _, #, backticks; collapses whitespace). */
function stripMarkdown(s: string): string {
  return s
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[*_#`]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/**
 * Read all annotations from node with resolved category labels and normalized plain text.
 * Returns [] if node does not support annotations or has no annotations.
 * categoryLabel is undefined for entries whose categoryId is not in the cache (not an error).
 */
export async function readResolvedAnnotations(node: BaseNode): Promise<ResolvedAnnotationEntry[]> {
  if (!('annotations' in node)) return []
  const annotatable = node as SceneNode & { annotations?: AnnotationEntry[] }
  const raw = annotatable.annotations
  if (!Array.isArray(raw) || raw.length === 0) return []

  const categoryMap = await getCategoryMapShared()
  return raw.map(entry => {
    const categoryLabel = entry.categoryId ? categoryMap.get(entry.categoryId) : undefined
    const label = typeof entry.label === 'string' ? entry.label : undefined
    const labelMarkdown = typeof entry.labelMarkdown === 'string' ? entry.labelMarkdown : undefined
    let plainText = ''
    if (label && label.trim()) {
      plainText = label.trim()
    } else if (labelMarkdown && labelMarkdown.trim()) {
      plainText = stripMarkdown(labelMarkdown)
    }
    return { categoryId: entry.categoryId, categoryLabel, label, labelMarkdown, plainText }
  })
}

/**
 * Read the plainText value of the first annotation matching categoryLabel (case-insensitive).
 * Returns null if no match or if annotations are not supported.
 */
export async function readAnnotationValue(node: BaseNode, categoryLabel: string): Promise<string | null> {
  const entries = await readResolvedAnnotations(node)
  const wanted = categoryLabel.trim().toLowerCase()
  const match = entries.find(e => e.categoryLabel?.toLowerCase() === wanted)
  return match ? match.plainText : null
}

/**
 * Normalize entry to only label OR labelMarkdown (Figma allows only one per entry).
 * Prefers labelMarkdown if both present.
 */
function normalizeEntry(entry: AnnotationEntry): AnnotationEntry {
  if (entry.labelMarkdown != null && String(entry.labelMarkdown).trim() !== '') {
    return { labelMarkdown: entry.labelMarkdown.trim(), categoryId: entry.categoryId }
  }
  if (entry.label != null && String(entry.label).trim() !== '') {
    return { label: entry.label.trim(), categoryId: entry.categoryId }
  }
  return { label: '—', categoryId: entry.categoryId }
}

/**
 * Set native annotations on a node if it supports annotations. Enforces one of label/labelMarkdown per entry.
 * Does not throw; returns true if assignment was attempted and did not throw.
 */
export function safeSetNativeAnnotations(node: SceneNode, entries: AnnotationEntry[]): boolean {
  if (!('annotations' in node)) return false
  const normalized = entries.map(normalizeEntry).filter(e => e.label || e.labelMarkdown)
  if (normalized.length === 0) return false
  try {
    const n = node as SceneNode & { annotations: AnnotationEntry[] }
    n.annotations = normalized
    return true
  } catch {
    return false
  }
}

export interface VisibleAnnotationCardOptions {
  title: string
  /** Lines of body text (plain); will be rendered as separate text nodes. */
  lines: string[]
  /** Optional: if provided, card will be appended here and position ignored. */
  parent?: FrameNode
  /** Optional position when parent is not provided (caller appends to page). */
  x?: number
  y?: number
  /** Max width for text wrapping (default 240). */
  maxWidth?: number
}

/**
 * Create a visible in-canvas annotation card (frame + title + body lines). Styled for readability.
 * Uses loadFonts and createTextNode. Caller is responsible for appending to page/parent and positioning if needed.
 */
export async function createVisibleAnnotationCard(options: VisibleAnnotationCardOptions): Promise<FrameNode> {
  const { title, lines, parent, x = 0, y = 0, maxWidth = 240 } = options
  const fonts = await loadFonts()
  const card = createAutoLayoutFrameSafe('Annotation card', 'VERTICAL', {
    gap: 6,
    padding: { top: 10, right: 12, bottom: 10, left: 12 }
  })
  card.fills = [{ type: 'SOLID', color: { r: 0.98, g: 0.98, b: 0.98 } }]
  card.strokes = [{ type: 'SOLID', color: { r: 0.8, g: 0.8, b: 0.8 }, opacity: 1 }]
  card.strokeWeight = 1
  card.cornerRadius = 8

  const titleNode = await createTextNode(title, { fontSize: 11, fontName: fonts.bold })
  titleNode.name = 'Title'
  if (maxWidth > 0) titleNode.resize(maxWidth, titleNode.height)
  card.appendChild(titleNode)

  for (const line of lines) {
    const text = line.trim()
    if (!text) continue
    const lineNode = await createTextNode(text.slice(0, 400), { fontSize: 10, fontName: fonts.regular })
    lineNode.name = 'Line'
    if (maxWidth > 0) lineNode.resize(maxWidth, lineNode.height)
    card.appendChild(lineNode)
  }

  if (parent) {
    parent.appendChild(card)
  } else {
    card.x = x
    card.y = y
  }
  return card
}

const shownHintKeys = new Set<string>()

/**
 * Return true if the hint for this key should be shown this session (and mark it as shown).
 * Use for one-time messages (e.g. "enable View → Annotations"). In-memory only.
 */
export function showOnceUserHint(key: string, _message: string): boolean {
  if (shownHintKeys.has(key)) return false
  shownHintKeys.add(key)
  return true
}

/**
 * Fix near-miss annotations on a set of nodes.
 * For each result:
 *   1. ensureAnnotationCategory(canonicalLabel) → canonical category ID (resolved once per unique label)
 *   2. Read node.annotations
 *   3. Find entries whose resolved category label is the near-miss label
 *   4. Replace their categoryId with the canonical ID (preserve array order)
 *   5. safeSetNativeAnnotations(node, updatedAnnotations)
 * After all nodes processed: clears the shared category cache.
 * Returns count of nodes successfully updated.
 */
export async function repairNearMissAnnotations(
  nearMisses: import('../analyticsTagging/nearMissDetector').NearMissResult[]
): Promise<number> {
  if (nearMisses.length === 0) return 0

  // Resolve canonical category IDs once per unique canonicalLabel (at most 2 API calls)
  const canonicalIds = new Map<'ScreenID' | 'ActionID', string>()
  for (const label of ['ScreenID', 'ActionID'] as const) {
    if (nearMisses.some(r => r.canonicalLabel === label)) {
      const id = await ensureAnnotationCategory(label)
      if (id) canonicalIds.set(label, id)
    }
  }

  // Re-read category map after category creation
  const categoryMap = await getCategoryMapShared()

  let repaired = 0
  for (const result of nearMisses) {
    try {
      const canonicalId = canonicalIds.get(result.canonicalLabel)
      if (!canonicalId) continue

      const node = result.node
      if (!('annotations' in node)) continue
      const annotatable = node as SceneNode & { annotations?: AnnotationEntry[] }
      const raw = annotatable.annotations
      if (!Array.isArray(raw) || raw.length === 0) continue

      // Build updated array — preserve order, only replace matching categoryId entries
      const nearMissLabelLower = result.nearMissLabel.toLowerCase().trim()
      const updated = raw.map(entry => {
        if (!entry.categoryId) return entry
        const resolvedLabel = categoryMap.get(entry.categoryId)?.trim().toLowerCase()
        if (resolvedLabel !== nearMissLabelLower) return entry
        return { ...entry, categoryId: canonicalId }
      })

      const wrote = safeSetNativeAnnotations(node, updated)
      if (wrote) repaired++
    } catch {
      // Skip this node; continue with others
    }
  }

  clearAnnotationCategoryCache()
  return repaired
}
