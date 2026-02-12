/**
 * Smart Detector element classifier.
 * Lanes: DS mapping > structural heuristics (icon/image) > button/link structure > nameKindRules.
 * LabelGuess: DS/component tokens > visible text inside > nearby text.
 */

import {
  getMainComponentNameAsync,
  isIconNamedNoText,
  nameMatchesImage,
  nodeHasNoVisibleTextDescendants,
  parseNameTokens
} from '../../assistants/handlers/contentReview'
import { getDetectorElementClassifierConfig, getDetectorContentClassifierConfig } from '../../../custom/config'
import {
  getAbsoluteBounds,
  getVisibleTextDescendants,
  getDominantTextNode,
  computeInset,
  hasBackground
} from './utils'
import type { DetectedElement, ElementKind, Confidence } from './types'

const IMAGE_ELIGIBLE_TYPES = new Set<SceneNode['type']>(['RECTANGLE', 'FRAME', 'INSTANCE', 'GROUP'])
const BUTTON_CONTAINER_TYPES = new Set<SceneNode['type']>(['FRAME', 'GROUP', 'COMPONENT', 'INSTANCE'])
const MAX_NEARBY_SNIPPETS = 8
const MAX_SNIPPET_LEN = 80
const MAX_BUTTON_TEXT_LEN = 24
const MIN_BUTTON_PADDING_PX = 4
const DEFAULT_CTA_VERBS = ['Enter', 'Continue', 'Next', 'Submit', 'Save', 'Done']
const MAX_LINK_TEXT_LEN = 60

function getVisibleTextInside(node: SceneNode): string[] {
  const out: string[] = []
  if (node.type === 'TEXT') {
    if ((node as TextNode).visible !== false && (node as TextNode).characters?.trim()) {
      out.push(String((node as TextNode).characters).trim().slice(0, MAX_SNIPPET_LEN))
    }
    return out
  }
  if (!('children' in node)) return out
  for (const child of node.children) {
    if ((child as SceneNode).visible === false) continue
    out.push(...getVisibleTextInside(child as SceneNode))
    if (out.length >= MAX_NEARBY_SNIPPETS) break
  }
  return out
}

function getNearbyLabelText(node: SceneNode): string | undefined {
  let parent = node.parent
  const seen = new Set<string>()
  for (let depth = 0; depth < 2 && parent && 'children' in parent; depth++) {
    for (const child of parent.children) {
      if (child.type !== 'TEXT' || seen.has(child.id)) continue
      if ((child as TextNode).visible === false) continue
      const chars = (child as TextNode).characters
      if (chars == null) continue
      const trimmed = String(chars).trim()
      if (trimmed) return trimmed.slice(0, MAX_SNIPPET_LEN)
    }
    parent = parent.parent
  }
  return undefined
}

function inferLabelGuess(node: SceneNode, componentName: string | undefined): string | undefined {
  const fromComponent = componentName?.trim()
  if (fromComponent) {
    const tokens = parseNameTokens(fromComponent).filter(t => t !== 'icon' && t.length > 1)
    if (tokens.length > 0) return tokens.join(' ')
  }
  const inside = getVisibleTextInside(node)
  if (inside.length > 0) return inside[0]
  return getNearbyLabelText(node)
}

function matchNameKindRules(name: string, rules: Array<{ contains: string[]; kind: string }>): string | undefined {
  const lower = name.toLowerCase()
  for (const rule of rules) {
    if (!Array.isArray(rule.contains)) continue
    const all = rule.contains.every(t => lower.includes(String(t).toLowerCase()))
    if (all && rule.kind) return rule.kind
  }
  return undefined
}

/** Plausible as interactive: INSTANCE, or has visible text, or matches icon/image heuristics. Avoids geometry noise. */
function isPlausibleInteractive(node: SceneNode): boolean {
  if (node.type === 'INSTANCE') return true
  if (getVisibleTextInside(node).length > 0) return true
  if (isIconNamedNoText(node)) return true
  if (IMAGE_ELIGIBLE_TYPES.has(node.type) && nameMatchesImage(node.name) && nodeHasNoVisibleTextDescendants(node)) return true
  return false
}

function getCtaVerbs(): string[] {
  const config = getDetectorContentClassifierConfig()
  const list = config.ctaVerbs
  return Array.isArray(list) && list.length > 0 ? list : DEFAULT_CTA_VERBS
}

function textMatchesCta(text: string, ctaVerbs: string[]): boolean {
  const t = text.trim().toLowerCase()
  if (!t) return false
  return ctaVerbs.some(v => v.trim().toLowerCase() === t)
}

/** Button structural: one short text + background + padding. Returns kind/reasons/confidence/labelGuess or null. */
function tryButtonStructural(node: SceneNode): {
  kind: 'button'
  confidence: Confidence
  reasons: string[]
  labelGuess: string
} | null {
  if (!BUTTON_CONTAINER_TYPES.has(node.type) || node.visible === false) return null
  const textNodes = getVisibleTextDescendants(node, 8)
  if (textNodes.length === 0) return null
  const dominant = getDominantTextNode(textNodes)
  if (!dominant) return null
  const text = String(dominant.characters ?? '').trim()
  if (text.length === 0 || text.length > MAX_BUTTON_TEXT_LEN) return null
  if (text.includes('\n')) return null
  if (!hasBackground(node)) return null
  const containerBounds = getAbsoluteBounds(node)
  const textBounds = getAbsoluteBounds(dominant)
  if (!containerBounds || !textBounds) return null
  const inset = computeInset(containerBounds, textBounds)
  if (
    inset.left < MIN_BUTTON_PADDING_PX ||
    inset.right < MIN_BUTTON_PADDING_PX ||
    inset.top < MIN_BUTTON_PADDING_PX ||
    inset.bottom < MIN_BUTTON_PADDING_PX
  )
    return null
  const reasons: string[] = ['heuristic:text_over_bg', 'heuristic:button_padding']
  const ctaVerbs = getCtaVerbs()
  if (textMatchesCta(text, ctaVerbs)) reasons.push('heuristic:cta_text')
  let confidence: Confidence = 'med'
  if (reasons.includes('heuristic:cta_text') && textNodes.length <= 2) confidence = 'high'
  return { kind: 'button', confidence, reasons, labelGuess: text }
}

/** Link heuristic: TEXT node, short, with underline or name contains link/hyperlink or CTA verb. */
function tryLinkHeuristic(textNode: TextNode): {
  kind: 'link'
  confidence: Confidence
  reasons: string[]
  labelGuess: string
} | null {
  const text = String(textNode.characters ?? '').trim()
  if (text.length === 0 || text.length > MAX_LINK_TEXT_LEN) return null
  const name = (textNode.name ?? '').toLowerCase()
  const hasUnderline =
    typeof (textNode as unknown as { textDecoration?: string }).textDecoration === 'string' &&
    (textNode as unknown as { textDecoration: string }).textDecoration === 'UNDERLINE'
  const nameHasLink = name.includes('link') || name.includes('hyperlink')
  const ctaVerbs = getCtaVerbs()
  const isCtaLike = textMatchesCta(text, ctaVerbs)
  if (!hasUnderline && !nameHasLink && !isCtaLike) return null
  const reasons: string[] = ['heuristic:text_link_candidate']
  if (hasUnderline) reasons.push('heuristic:underline')
  if (nameHasLink) reasons.push('name:contains_link')
  const confidence: Confidence = hasUnderline || nameHasLink ? 'med' : 'low'
  return { kind: 'link', confidence, reasons, labelGuess: text }
}

export type ElementClassifierConfig = {
  componentKindMap: Record<string, string>
  nameKindRules: Array<{ contains: string[]; kind: string }>
  maxNodes?: number
}

export async function classifyElements(
  nodes: SceneNode[],
  options: {
    includeBbox?: boolean
    configOverride?: Partial<ElementClassifierConfig>
    textNodesForLinks?: TextNode[]
  } = {}
): Promise<DetectedElement[]> {
  const base = getDetectorElementClassifierConfig()
  const config: ElementClassifierConfig = options.configOverride
    ? { ...base, ...options.configOverride }
    : base
  const { componentKindMap, nameKindRules } = config
  const results: DetectedElement[] = []

  for (const node of nodes) {
    if (node.type === 'TEXT') continue
    let kind: ElementKind | undefined
    let confidence: Confidence = 'med'
    const reasons: string[] = []
    let labelGuessOverride: string | undefined

    const nodeName = (node.name ?? '').trim()

    // Lane 1: DS mapping (INSTANCE only)
    if (node.type === 'INSTANCE') {
      try {
        const mainName = await getMainComponentNameAsync(node as InstanceNode)
        const mainTrim = mainName?.trim()
        if (mainTrim && componentKindMap[mainTrim]) {
          kind = componentKindMap[mainTrim] as ElementKind
          confidence = 'high'
          reasons.push(`ds:${mainTrim}`)
        }
      } catch {
        // ignore
      }
    }

    // Lane 2: structural heuristics (icon / image)
    if (kind == null) {
      if (isIconNamedNoText(node)) {
        kind = 'icon'
        confidence = 'high'
        reasons.push('heuristic:icon_named_no_text')
      } else if (IMAGE_ELIGIBLE_TYPES.has(node.type) && nameMatchesImage(node.name) && nodeHasNoVisibleTextDescendants(node)) {
        kind = 'image'
        confidence = 'high'
        reasons.push('heuristic:image_named_no_text')
      }
    }

    // Lane 2b: button structural (text + background + padding)
    if (kind == null) {
      const buttonResult = tryButtonStructural(node)
      if (buttonResult) {
        kind = buttonResult.kind
        confidence = buttonResult.confidence
        reasons.push(...buttonResult.reasons)
        labelGuessOverride = buttonResult.labelGuess
      }
    }

    // Lane 3: nameKindRules (only when plausibly interactive)
    if (kind == null && nameKindRules.length > 0 && isPlausibleInteractive(node)) {
      const fromRules = matchNameKindRules(nodeName, nameKindRules)
      if (fromRules) {
        kind = fromRules as ElementKind
        confidence = 'med'
        reasons.push('name_rules')
      }
    }

    if (kind == null) continue

    if (reasons.length === 0) continue

    const componentName = node.type === 'INSTANCE'
      ? await getMainComponentNameAsync(node as InstanceNode).catch(() => undefined)
      : undefined
    const labelGuess = labelGuessOverride ?? inferLabelGuess(node, componentName ?? (nodeName || undefined))

    const bbox = options.includeBbox && 'x' in node && 'y' in node && 'width' in node && 'height' in node
      ? { x: (node as { x: number }).x, y: (node as { y: number }).y, width: (node as { width: number }).width, height: (node as { height: number }).height }
      : undefined

    results.push({
      kind,
      confidence,
      reasons,
      labelGuess,
      nodeId: node.id,
      bbox,
      componentName: componentName ?? (node.type === 'INSTANCE' ? nodeName : undefined)
    })
  }

  // Link heuristic: TEXT nodes passed separately (not in inspectable)
  if (options.textNodesForLinks && options.textNodesForLinks.length > 0) {
    for (const textNode of options.textNodesForLinks) {
      if (textNode.visible === false) continue
      const linkResult = tryLinkHeuristic(textNode)
      if (!linkResult || linkResult.reasons.length === 0) continue
      const textBounds = options.includeBbox ? getAbsoluteBounds(textNode) : null
      const bbox =
        textBounds && options.includeBbox
          ? { x: textBounds.x, y: textBounds.y, width: textBounds.width, height: textBounds.height }
          : undefined
      results.push({
        kind: linkResult.kind,
        confidence: linkResult.confidence,
        reasons: linkResult.reasons,
        labelGuess: linkResult.labelGuess,
        nodeId: textNode.id,
        bbox
      })
    }
  }

  return results
}
