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
    const existing = categories.find(c => c.label === label)
    if (existing?.id) return existing.id
    if (api.addAnnotationCategoryAsync) {
      const created = await api.addAnnotationCategoryAsync({ label, color })
      return created?.id
    }
  } catch {
    // Proceed without categoryId
  }
  return undefined
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
