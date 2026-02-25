/**
 * Content Review Assistant Handler
 * Add HAT: scan + classify candidates, then optional LLM pass for best-guess HAT text; add Figma annotations.
 * Routing: tool-only via getHandler(ux_copy_review, add-hat). No sync mainComponent (dynamic-page safe).
 */

import type { AssistantHandler, HandlerContext, HandlerResult } from './base'
import { getHatRequiredComponents } from '../../../custom/config'
import { ensureAnnotationCategory, safeSetNativeAnnotations } from '../../figma/annotations'
import { resolveSelection } from '../../figma/selectionResolver'

const ACCESSIBILITY_CATEGORY_LABEL = 'Accessibility'
const ACCESSIBILITY_CATEGORY_COLOR = 'blue'
const MAX_NODES_TO_SCAN = 2000
/** Cap candidates sent to LLM for HAT text generation; rest get generic label + needsReview. */
const MAX_CANDIDATES_FOR_LLM = 50
const MAX_NEARBY_TEXT_SNIPPETS = 8
const MAX_SNIPPET_LENGTH = 80
const PARENT_CHAIN_DEPTH = 4

/** Node types we inspect for icon/image/heuristic lanes (includes INSTANCE for DS + icon). */
const INSPECTABLE_TYPES = new Set<SceneNode['type']>([
  'INSTANCE',
  'FRAME',
  'GROUP',
  'VECTOR',
  'BOOLEAN_OPERATION',
  'RECTANGLE',
  'ELLIPSE',
  'POLYGON',
  'STAR',
  'LINE'
])

/** Types eligible for image-named lane. */
const IMAGE_ELIGIBLE_TYPES = new Set<SceneNode['type']>(['RECTANGLE', 'FRAME', 'INSTANCE', 'GROUP'])

const IMAGE_NAME_TOKENS = ['image', 'img', 'photo', 'illustration', 'avatar', 'thumbnail', 'banner']
const BOUNDARY_CHARS = /[\s_\-./]/

export type HatCandidateReason =
  | 'configured_hat_component'
  | 'icon_named_no_text'
  | 'image_named_no_text'

export interface HatCandidate {
  node: SceneNode
  reason: HatCandidateReason
  componentName: string
}

/**
 * Name contains "icon" at word boundary or starts with "icon" (case-insensitive).
 * Exported for tests.
 */
export function nameMatchesIcon(name: string | undefined): boolean {
  if (name == null || typeof name !== 'string') return false
  const n = name.trim().toLowerCase()
  if (n.startsWith('icon')) return true
  const idx = n.indexOf('icon')
  if (idx === -1) return false
  const before = idx === 0 ? ' ' : n[idx - 1]
  const after = idx + 4 >= n.length ? ' ' : n[idx + 4]
  return BOUNDARY_CHARS.test(before) && BOUNDARY_CHARS.test(after)
}

/**
 * True if node has no visible TEXT descendants (hidden TEXT nodes are ignored).
 * Exported for tests.
 */
export function nodeHasNoVisibleTextDescendants(node: SceneNode): boolean {
  if (node.type === 'TEXT') {
    return (node as TextNode).visible === false
  }
  if (!('children' in node)) return true
  for (const child of node.children) {
    if (!nodeHasNoVisibleTextDescendants(child as SceneNode)) return false
  }
  return true
}

/**
 * Unified predicate: icon-named and no visible text. Applied to ALL types including INSTANCE.
 * Exported for tests.
 */
export function isIconNamedNoText(node: SceneNode): boolean {
  return nameMatchesIcon(node.name) && nodeHasNoVisibleTextDescendants(node)
}

/**
 * Name suggests an image/photo (contains any of image, img, photo, etc.).
 * Exported for tests.
 */
export function nameMatchesImage(name: string | undefined): boolean {
  if (name == null || typeof name !== 'string') return false
  const n = name.toLowerCase()
  return IMAGE_NAME_TOKENS.some(t => n.includes(t))
}

/**
 * True if normalized name matches any configured token (exact or safe contains).
 */
export function nameMatchesConfiguredList(normalizedName: string, tokens: string[]): boolean {
  for (const t of tokens) {
    const token = (t || '').trim().toLowerCase()
    if (!token) continue
    if (matchesHatToken(normalizedName, token)) return true
  }
  return false
}

/**
 * Token matches normalized name: exact, or contains at word boundary (token length >= 4).
 * Exported for tests.
 */
export function matchesHatToken(normalizedName: string, token: string): boolean {
  if (!normalizedName || !token) return false
  if (normalizedName === token) return true
  if (token.length < 4) return false
  const idx = normalizedName.indexOf(token)
  if (idx === -1) return false
  const before = idx === 0 ? ' ' : normalizedName[idx - 1]
  const after = idx + token.length >= normalizedName.length ? ' ' : normalizedName[idx + token.length]
  return BOUNDARY_CHARS.test(before) && BOUNDARY_CHARS.test(after)
}

/**
 * Get main component name safely (dynamic-page: getMainComponentAsync only).
 * Exported for tests.
 */
export async function getMainComponentNameAsync(node: InstanceNode): Promise<string> {
  if (node.type !== 'INSTANCE') return ''
  try {
    const mc = await node.getMainComponentAsync()
    const fromMc = mc?.name != null ? String(mc.name).trim() : ''
    if (fromMc) return fromMc
    return node.name ?? ''
  } catch {
    return node.name ?? ''
  }
}

/**
 * Collect all inspectable nodes (INSTANCE, FRAME, GROUP, VECTOR, etc.) under roots.
 * Skips invisible. Stops at maxCount. De-dupes by id (via Set in caller if needed).
 */
function collectInspectableNodes(
  node: SceneNode,
  maxCount: number,
  out: SceneNode[] = []
): void {
  if (out.length >= maxCount) return
  if (node.visible === false) return
  if (INSPECTABLE_TYPES.has(node.type)) {
    out.push(node)
    if (out.length >= maxCount) return
  }
  if ('children' in node) {
    for (const child of node.children) {
      collectInspectableNodes(child as SceneNode, maxCount, out)
      if (out.length >= maxCount) return
    }
  }
}

const HEADING_LIKE_NAME = /heading|title|h1|h2|h3|subtitle|caption/i

/** Visible TEXT nodes under parent (siblings) or parent's parent; characters trimmed, max N snippets. Optionally capture nearest heading-like text. */
function getNearbyVisibleTextSnippets(
  node: SceneNode,
  maxSnippets: number = MAX_NEARBY_TEXT_SNIPPETS
): string[] {
  const { snippets } = getNearbyVisibleTextSnippetsAndHeading(node, maxSnippets)
  return snippets
}

/** Returns snippets and optional headingContext (first nearby TEXT whose layer name looks like a heading/title). */
function getNearbyVisibleTextSnippetsAndHeading(
  node: SceneNode,
  maxSnippets: number = MAX_NEARBY_TEXT_SNIPPETS
): { snippets: string[]; headingContext?: string } {
  const snippets: string[] = []
  let headingContext: string | undefined
  let parent = node.parent
  const seen = new Set<string>()
  for (let depth = 0; depth < 2 && parent && 'children' in parent; depth++) {
    for (const child of parent.children) {
      if (child.type !== 'TEXT' || seen.has(child.id)) continue
      if ((child as TextNode).visible === false) continue
      const chars = (child as TextNode).characters
      if (chars == null) continue
      const trimmed = String(chars).trim()
      if (trimmed) {
        seen.add(child.id)
        const name = (child as SceneNode).name ?? ''
        if (!headingContext && HEADING_LIKE_NAME.test(name)) {
          headingContext = trimmed.slice(0, MAX_SNIPPET_LENGTH)
        }
        snippets.push(trimmed.slice(0, MAX_SNIPPET_LENGTH))
        if (snippets.length >= maxSnippets) {
          return { snippets, headingContext }
        }
      }
    }
    parent = parent.parent
  }
  return { snippets, headingContext }
}

function getParentChainNames(node: SceneNode, maxDepth: number = PARENT_CHAIN_DEPTH): string[] {
  const names: string[] = []
  let p: BaseNode | null = node.parent
  while (p && names.length < maxDepth) {
    if (p.type !== 'DOCUMENT' && p.type !== 'PAGE' && 'name' in p) {
      const n = (p as SceneNode).name
      if (n != null && String(n).trim()) names.push(String(n).trim())
    }
    p = p.parent
  }
  return names
}

/** Parse node name into tokens (split on _ - space; split camelCase). Used for icon label inference. */
export function parseNameTokens(name: string | undefined): string[] {
  if (name == null || typeof name !== 'string') return []
  const normalized = name
    .replace(/[-_\s./]+/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .trim()
    .toLowerCase()
  return normalized.split(/\s+/).filter(Boolean)
}

/** Per-candidate context for LLM. */
export interface HatCandidateContext {
  nodeId: string
  nodeType: string
  nodeName: string
  candidateReason: HatCandidateReason
  componentNameForMatch?: string
  /** Tokens from node name (e.g. Icon_Book Queue → ["icon","book","queue"]) for label inference. */
  nameTokens?: string[]
  /** Same as nameTokens; sent as parsedNameTokens in payload for prompt clarity. */
  parsedNameTokens?: string[]
  nearestTextSnippets: string[]
  /** Nearest visible text from a layer named like heading/title/h1/h2, if present. */
  headingContext?: string
  parentChainNames: string[]
  isIconCandidate: boolean
  isImageCandidate: boolean
}

/** LLM response item. */
export interface HatLlmItem {
  nodeId?: string
  hatText?: string
  confidence?: 'high' | 'med' | 'low'
  type?: 'control-label' | 'image-alt'
  rationaleShort?: string
  needsReview?: boolean
}

function buildHatPrompt(contexts: HatCandidateContext[]): string {
  const payload = JSON.stringify(contexts, null, 0)
  return `You are an accessibility specialist. Generate best-guess HAT text (accessible labels or image alt text) for each design node. Output only the requested JSON array.

CRITICAL: Generate actual label/alt text only. Do NOT output instructions like "Add alt text for X" or "Add accessible label for Y". Each hatText must be the suggested label or alt text itself (e.g. "Book queue", "Illustration of Funville town with colorful buildings").

For each node return one object with: nodeId (string), hatText (string, concise purpose-based label or alt text), confidence ("high"|"med"|"low"), type ("control-label"|"image-alt"), rationaleShort (string, brief), needsReview (boolean).

Rules:
- Icons: infer from parsedNameTokens and nearby text (e.g. Icon_Book Queue with headingContext "Welcome" → "Open book queue" or "Book queue").
- Images: describe what the image likely depicts using headingContext and nearestTextSnippets; if insufficient context use "Illustration related to [section theme]" and set needsReview true.
- Use headingContext when present to anchor meaning.
- Keep hatText concise (a few words). Avoid repeating long adjacent text verbatim.

Return ONLY a JSON array, no markdown or explanation. Example: [{"nodeId":"123:456","hatText":"Book queue","confidence":"med","type":"control-label","rationaleShort":"From name tokens + context","needsReview":false}]

Candidates:
${payload}`
}

/** Result of parsing LLM response; includes diagnostics for fallback reasons. */
export interface ParseHatLlmResult {
  items: HatLlmItem[]
  parseOk: boolean
  /** First 200 chars of raw response when parse failed (for debug). */
  rawPreview?: string
}

/** Extract JSON array from LLM response. Self-reporting: parseOk false and rawPreview when parse fails. */
function parseHatLlmResponse(response: string): ParseHatLlmResult {
  const raw = response.trim()
  const preview = raw.slice(0, 200)

  function tryParse(str: string): HatLlmItem[] | null {
    try {
      const parsed = JSON.parse(str)
      return Array.isArray(parsed) ? (parsed as HatLlmItem[]) : null
    } catch {
      return null
    }
  }

  let items = tryParse(raw)
  if (items) return { items, parseOk: true }

  const fence = raw.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (fence && fence[1]) {
    items = tryParse(fence[1].trim())
    if (items) return { items, parseOk: true }
  }

  const start = raw.indexOf('[')
  if (start === -1) return { items: [], parseOk: false, rawPreview: preview }
  let depth = 0
  let end = -1
  for (let i = start; i < raw.length; i++) {
    if (raw[i] === '[') depth++
    else if (raw[i] === ']') {
      depth--
      if (depth === 0) {
        end = i
        break
      }
    }
  }
  if (end === -1) return { items: [], parseOk: false, rawPreview: preview }
  items = tryParse(raw.slice(start, end + 1))
  if (items) return { items, parseOk: true }
  return { items: [], parseOk: false, rawPreview: preview }
}

/** Normalize nodeId from LLM item (supports "nodeId" or "id" and trims). */
function normalizedNodeId(item: HatLlmItem): string {
  const id = (item as HatLlmItem & { id?: string }).nodeId ?? (item as HatLlmItem & { id?: string }).id
  return (id ?? '').trim()
}

/**
 * Build deterministic status message for main to display.
 */
export function formatAddHatResultMessage(
  scannedCount: number,
  annotatedCount: number,
  capped: boolean
): string {
  if (scannedCount === 0) return 'Add HAT: no HAT candidates found (scanned 0).'
  if (annotatedCount === 0) {
    return capped
      ? `Add HAT: no HAT candidates found (scanned ${scannedCount}, scan capped at 2000).`
      : `Add HAT: no HAT candidates found (scanned ${scannedCount}).`
  }
  const base = `Add HAT: annotated ${annotatedCount} items (scanned ${scannedCount})`
  return capped ? `${base} (scan capped at 2000).` : `${base}.`
}

/** Set to true to log scan/candidate counts and LLM errors. */
const DEBUG_ADD_HAT = false

/** Why a candidate fell back to placeholder (for annotation debug suffix). */
type HatFallbackReason = 'none' | 'no_provider' | 'failed' | 'no_result' | 'parse_failed'

export class ContentReviewHandler implements AssistantHandler {
  canHandle(assistantId: string, actionId: string | undefined): boolean {
    return assistantId === 'ux_copy_review' && actionId === 'add-hat'
  }

  async handleResponse(context: HandlerContext): Promise<HandlerResult> {
    const { selectionOrder, provider, sendChatWithRecovery, replaceStatusMessage } = context

    if (selectionOrder.length === 0) {
      return { handled: true, message: formatAddHatResultMessage(0, 0, false) }
    }

    const hatList = getHatRequiredComponents()
    const tokens = hatList.map(s => (s || '').trim().toLowerCase()).filter(Boolean)

    const resolvedSelection = await resolveSelection(selectionOrder, {
      containerStrategy: 'direct',
      skipHidden: false
    })
    const roots = resolvedSelection.scanRoots
    const inspectable: SceneNode[] = []
    for (const root of roots) {
      collectInspectableNodes(root, MAX_NODES_TO_SCAN, inspectable)
      if (inspectable.length >= MAX_NODES_TO_SCAN) break
    }
    const capped = inspectable.length >= MAX_NODES_TO_SCAN
    const scannedCount = inspectable.length

    const candidates: HatCandidate[] = []
    const seenIds = new Set<string>()
    let dsMatchCandidates = 0
    let iconCandidates = 0
    let imageCandidates = 0

    for (const node of inspectable) {
      if (seenIds.has(node.id)) continue
      const nameFromNode = (node.name ?? '').trim().toLowerCase()
      let reason: HatCandidateReason | null = null
      let displayName = node.name ?? ''

      if (node.type === 'INSTANCE') {
        if (tokens.length > 0 && nameMatchesConfiguredList(nameFromNode, tokens)) {
          reason = 'configured_hat_component'
          displayName = node.name ?? ''
          dsMatchCandidates++
        } else {
          const nameFromMc = await getMainComponentNameAsync(node as InstanceNode)
          const normalizedMc = (nameFromMc ?? '').trim().toLowerCase()
          if (tokens.length > 0 && nameMatchesConfiguredList(normalizedMc, tokens)) {
            reason = 'configured_hat_component'
            displayName = (nameFromMc || node.name) ?? ''
            dsMatchCandidates++
          }
        }
      }

      if (reason == null && isIconNamedNoText(node)) {
        reason = 'icon_named_no_text'
        displayName = node.name ?? 'Icon'
        iconCandidates++
      }

      if (reason == null && IMAGE_ELIGIBLE_TYPES.has(node.type)) {
        if (nameMatchesImage(node.name) && nodeHasNoVisibleTextDescendants(node)) {
          reason = 'image_named_no_text'
          displayName = node.name ?? 'Image'
          imageCandidates++
        }
      }

      if (reason != null) {
        seenIds.add(node.id)
        candidates.push({ node, reason, componentName: displayName })
      }
    }

    if (DEBUG_ADD_HAT) {
      console.log('[Add HAT] roots:', roots.length, 'inspected:', scannedCount, 'capped:', capped)
      console.log('[Add HAT] lanes — dsMatch:', dsMatchCandidates, 'icon:', iconCandidates, 'image:', imageCandidates)
      const first10 = candidates.slice(0, 10).map(c => ({ name: c.node.name, type: c.node.type, reason: c.reason }))
      console.log('[Add HAT] first candidates:', JSON.stringify(first10))
    }

    const forLlm = candidates.slice(0, MAX_CANDIDATES_FOR_LLM)
    const contexts: HatCandidateContext[] = forLlm.map(c => {
      const { snippets, headingContext } = getNearbyVisibleTextSnippetsAndHeading(c.node)
      const nameTokens = parseNameTokens(c.node.name)
      const isIconCandidate = c.reason === 'icon_named_no_text' || (c.reason === 'configured_hat_component' && nameMatchesIcon(c.node.name))
      const isImageCandidate = c.reason === 'image_named_no_text'
      return {
        nodeId: c.node.id,
        nodeType: c.node.type,
        nodeName: c.node.name ?? '',
        candidateReason: c.reason,
        componentNameForMatch: c.componentName || undefined,
        nameTokens,
        parsedNameTokens: nameTokens,
        nearestTextSnippets: snippets,
        headingContext,
        parentChainNames: getParentChainNames(c.node),
        isIconCandidate,
        isImageCandidate
      }
    })

    const providerPresent = provider != null && typeof sendChatWithRecovery === 'function'
    if (contexts.length > 0 && providerPresent) {
      replaceStatusMessage('Add HAT: generating labels with AI…')
    }

    let llmMap: Map<string, HatLlmItem> = new Map()
    let parseOk = true
    let rawPreview: string | undefined
    let llmErrorCode: string | undefined
    let responseLength = 0

    if (contexts.length > 0 && providerPresent) {
      try {
        const prompt = buildHatPrompt(contexts)
        const response = await sendChatWithRecovery({
          messages: [{ role: 'user', content: prompt }],
          assistantId: context.assistantId,
          quickActionId: context.actionId
        })
        responseLength = typeof response === 'string' ? response.length : 0
        const parseResult = parseHatLlmResponse(response)
        parseOk = parseResult.parseOk
        rawPreview = parseResult.rawPreview
        for (const item of parseResult.items) {
          const key = normalizedNodeId(item)
          if (key && item.hatText?.trim()) {
            llmMap.set(key, item)
          }
        }
        if (!parseOk && rawPreview != null) {
          console.warn('[Add HAT] LLM parse failed. Response preview (200 chars):', rawPreview)
        }
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e))
        llmErrorCode = err.name || 'Error'
        if (DEBUG_ADD_HAT) console.warn('[Add HAT] LLM call failed:', err)
      }
    }

    let matchedResultsCount = 0
    for (const c of forLlm) {
      const key = c.node.id.trim()
      const item = llmMap.get(key)
      if (item?.hatText?.trim()) matchedResultsCount++
    }

    console.log('[Add HAT] provider:', !!providerPresent, '| candidates to LLM:', contexts.length, '| response length:', responseLength, '| parseOk:', parseOk, '| results:', llmMap.size, '| matched:', matchedResultsCount)

    const categoryId = await ensureAnnotationCategory(
      ACCESSIBILITY_CATEGORY_LABEL,
      ACCESSIBILITY_CATEGORY_COLOR
    )
    let annotatedCount = 0
    for (const c of candidates) {
      const key = c.node.id.trim()
      const item = llmMap.get(key)
      const aiHatText = item?.hatText?.trim()
      let fallbackReason: HatFallbackReason = 'none'
      if (aiHatText) {
        fallbackReason = 'none'
      } else if (!providerPresent) {
        fallbackReason = 'no_provider'
      } else if (llmErrorCode) {
        fallbackReason = 'failed'
      } else if (!parseOk) {
        fallbackReason = 'parse_failed'
      } else {
        fallbackReason = 'no_result'
      }
      const hatText =
        aiHatText ??
        (c.reason === 'image_named_no_text'
          ? `Add alt text for ${c.componentName}`
          : `Add accessible label for ${c.componentName}`)
      const confidence = item?.confidence ?? 'med'
      const needsReview = item?.needsReview ?? (candidates.indexOf(c) >= MAX_CANDIDATES_FOR_LLM)
      const reasonLine = `**Reason:** ${c.reason}`
      const confLine = `**Confidence:** ${confidence}`
      const reviewLine = `**Review:** ${needsReview ? 'Yes' : 'No'}`
      const debugSuffix = fallbackReason !== 'none' ? `\n\nLLM: ${fallbackReason === 'no_provider' ? 'skipped (no provider)' : fallbackReason === 'failed' ? `failed (${llmErrorCode ?? 'unknown'})` : fallbackReason === 'parse_failed' ? 'parse_failed' : 'no result for nodeId'}` : ''
      const label = `**HAT:** ${hatText}\n\n${reasonLine}\n\n${confLine}\n\n${reviewLine}${debugSuffix}`
      const entries = [{ labelMarkdown: label, ...(categoryId ? { categoryId } : {}) }]
      if (safeSetNativeAnnotations(c.node, entries)) {
        annotatedCount++
      }
    }

    let message = formatAddHatResultMessage(scannedCount, annotatedCount, capped)
    if (!providerPresent && candidates.length > 0) {
      message += ' Provider not configured; using placeholders.'
    } else if (providerPresent && matchedResultsCount === 0 && contexts.length > 0) {
      message += ' AI returned no usable results; using placeholders.'
    } else if (providerPresent && matchedResultsCount > 0) {
      message += ' AI labels applied.'
    }
    return { handled: true, message }
  }
}
