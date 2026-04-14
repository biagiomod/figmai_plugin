// src/core/detection/smartDetector/DefaultSmartDetectionEngine.ts
/**
 * DefaultSmartDetectionEngine — wraps the current in-repo smart detector behind SmartDetectionPort.
 * Consumers import SmartDetectionPort — never this class directly.
 * Replace with SDToolkitSmartDetectionEngine when SD-T is ready.
 */
import type {
  SmartDetectionPort,
  SmartDetectionResult,
  DetectedElement,
  SmartDetectionSummary,
  DetectionCertainty,
} from '../../sdk/ports/SmartDetectionPort'
import { scanSelectionSmart } from './index'
import type { SmartDetectorResult, DetectedElement as InternalDetectedElement, Confidence } from './types'

function mapCertainty(confidence: Confidence): DetectionCertainty {
  switch (confidence) {
    case 'high': return 'exact'
    case 'med': return 'inferred'
    case 'low': return 'weak'
    default: return 'unknown'
  }
}

function mapElement(el: InternalDetectedElement): DetectedElement {
  return {
    id: el.nodeId,
    candidateType: el.kind,
    category: null,
    certainty: mapCertainty(el.confidence),
    rationale: el.reasons.join('; '),
    matchedSignals: el.reasons,
    ambiguous: el.confidence === 'low',
    children: [],
  }
}

function buildSummary(elements: DetectedElement[]): SmartDetectionSummary {
  const summary: SmartDetectionSummary = { total: elements.length, exact: 0, inferred: 0, weak: 0, unknown: 0, ambiguous: 0 }
  for (const el of elements) {
    summary[el.certainty] = (summary[el.certainty] ?? 0) + 1
  }
  return summary
}

function buildResult(root: SceneNode, result: SmartDetectorResult): SmartDetectionResult {
  const mappedElements = result.elements.map(mapElement)
  const summary = buildSummary(mappedElements)

  const rootElement: DetectedElement = {
    id: root.id,
    candidateType: null,
    category: null,
    certainty: 'unknown',
    rationale: 'scan root',
    matchedSignals: [],
    ambiguous: false,
    children: mappedElements,
  }

  return {
    sourceRef: root.id,
    root: rootElement,
    summary,
  }
}

export class DefaultSmartDetectionEngine implements SmartDetectionPort {
  async detect(roots: readonly SceneNode[]): Promise<SmartDetectionResult[]> {
    return Promise.all(
      [...roots].map(async root => {
        const result = await scanSelectionSmart([root], {})
        return buildResult(root, result)
      })
    )
  }
}
