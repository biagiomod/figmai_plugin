/**
 * Smart Detector: public API.
 * scanSelectionSmart(roots, options) -> { elements, content, patterns, stats }.
 */

import { getDetectorElementClassifierConfig } from '../../../custom/config'
import { traverseSelection } from './traversal'
import { classifyElements } from './elementClassifier'
import { classifyContent } from './contentClassifier'
import type {
  SmartDetectorOptions,
  SmartDetectorResult,
  SmartDetectorStats,
  DetectedPattern
} from './types'

export type {
  SmartDetectorOptions,
  SmartDetectorResult,
  SmartDetectorStats,
  DetectedElement,
  DetectedContent,
  DetectedPattern,
  ElementKind,
  ContentKind,
  PatternKind,
  Confidence
} from './types'

export { traverseSelection } from './traversal'
export { classifyElements } from './elementClassifier'
export { classifyContent } from './contentClassifier'
export { getAncestors, findNearestInteractiveAncestor, hasInteractiveAncestor } from './hierarchy'

/**
 * Run element + content detection on selection roots.
 * Patterns (form_field) are stubbed for Phase 3.
 */
export async function scanSelectionSmart(
  roots: SceneNode[],
  options: SmartDetectorOptions = {}
): Promise<SmartDetectorResult> {
  const config = getDetectorElementClassifierConfig()
  const maxNodes = options.maxNodes ?? config.maxNodes ?? 2000

  const { inspectable, textNodes, capped } = traverseSelection(roots, maxNodes)

  const elements = await classifyElements(inspectable, {
    includeBbox: options.includeBbox,
    textNodesForLinks: textNodes
  })
  const content = classifyContent(textNodes)

  const patterns: DetectedPattern[] = [] // Phase 3: form_field grouping

  const elementsByKind: Record<string, number> = {}
  for (const e of elements) {
    elementsByKind[e.kind] = (elementsByKind[e.kind] ?? 0) + 1
  }
  const contentByKind: Record<string, number> = {}
  for (const c of content) {
    contentByKind[c.contentKind] = (contentByKind[c.contentKind] ?? 0) + 1
  }

  const stats: SmartDetectorStats = {
    nodesScanned: inspectable.length + textNodes.length,
    capped,
    elementsByKind,
    contentByKind,
    patternCount: patterns.length
  }

  return { elements, content, patterns, stats }
}
