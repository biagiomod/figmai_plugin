// src/core/sdk/ports/SmartDetectionPort.ts
/**
 * SmartDetectionPort — host-owned interface for element detection.
 * No imports from toolkit packages. Adapter implementations map to/from toolkit types.
 */

// 'ambiguous' is NOT a certainty level — it is an orthogonal boolean on DetectedElement.
// Gate review-queue logic on el.ambiguous === true, not on a certainty value.
export type DetectionCertainty = 'exact' | 'inferred' | 'weak' | 'unknown'

export interface DetectedElement {
  id: string
  candidateType: string | null   // element classification (e.g. 'button', 'input')
  category: string | null        // broad category
  certainty: DetectionCertainty
  rationale: string
  matchedSignals: string[]
  ambiguous: boolean
  children: DetectedElement[]
}

export interface SmartDetectionSummary {
  total: number
  exact: number
  inferred: number
  weak: number
  unknown: number
  ambiguous: number
}

export interface SmartDetectionResult {
  sourceRef: string              // Figma node ID of the scanned root
  root: DetectedElement
  summary: SmartDetectionSummary
}

/**
 * Port interface for smart element detection.
 * Default engine: DefaultSmartDetectionEngine (wraps current in-repo detector).
 * Future engine: SDToolkitSmartDetectionEngine (uses SD-T pipeline via vendored dist).
 */
export interface SmartDetectionPort {
  /**
   * Detect elements in the given selection roots.
   * Returns one result per root in the same order as input.
   */
  detect(roots: readonly SceneNode[]): Promise<SmartDetectionResult[]>
}
