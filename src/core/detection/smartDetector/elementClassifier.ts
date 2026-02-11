/**
 * Smart Detector element classifier.
 * Lanes: DS mapping > structural heuristics (icon/image) > nameKindRules.
 * LabelGuess: DS/component tokens > visible text inside > nearby text.
 */

import {
  getMainComponentNameAsync,
  isIconNamedNoText,
  nameMatchesImage,
  nodeHasNoVisibleTextDescendants,
  parseNameTokens
} from '../../assistants/handlers/contentReview'
import { getDetectorElementClassifierConfig } from '../../../custom/config'
import type { DetectedElement, ElementKind, Confidence } from './types'

const IMAGE_ELIGIBLE_TYPES = new Set<SceneNode['type']>(['RECTANGLE', 'FRAME', 'INSTANCE', 'GROUP'])
const MAX_NEARBY_SNIPPETS = 8
const MAX_SNIPPET_LEN = 80

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

export async function classifyElements(
  nodes: SceneNode[],
  options: { includeBbox?: boolean } = {}
): Promise<DetectedElement[]> {
  const config = getDetectorElementClassifierConfig()
  const { componentKindMap, nameKindRules } = config
  const results: DetectedElement[] = []

  for (const node of nodes) {
    if (node.type === 'TEXT') continue
    let kind: ElementKind | undefined
    let confidence: Confidence = 'med'
    const reasons: string[] = []

    const nodeName = (node.name ?? '').trim()
    const nameLower = nodeName.toLowerCase()

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

    // Lane 3: nameKindRules
    if (kind == null && nameKindRules.length > 0) {
      const fromRules = matchNameKindRules(nodeName, nameKindRules)
      if (fromRules) {
        kind = fromRules as ElementKind
        confidence = 'med'
        reasons.push('name_rules')
      }
    }

    if (kind == null) kind = 'unknown_interactive'

    const componentName = node.type === 'INSTANCE'
      ? await getMainComponentNameAsync(node as InstanceNode).catch(() => undefined)
      : undefined
    const labelGuess = inferLabelGuess(node, componentName ?? (nodeName || undefined))

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

  return results
}
