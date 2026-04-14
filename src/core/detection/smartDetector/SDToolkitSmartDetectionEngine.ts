// src/core/detection/smartDetector/SDToolkitSmartDetectionEngine.ts
/**
 * SDToolkitSmartDetectionEngine — implements SmartDetectionPort using
 * the SD-T pipeline package (@smart-detector/pipeline v0.1.0-alpha.0).
 *
 * Replaces DefaultSmartDetectionEngine for the Smart Detector handler.
 * DefaultSmartDetectionEngine remains active for autoAnnotator until
 * SD-T Phase 1 wires taxonomy data (candidateEntry is null for most nodes
 * in Phase 0, which would silently disable auto-annotation).
 *
 * Phase 0 behavior:
 *   - detectElements runs the full pipeline (traverse → normalize → score → review)
 *   - buildTaxonomyLookup() returns empty maps; candidateEntry is null for most nodes
 *   - The adapter maps null candidateEntry → candidateType: null (handled gracefully by consumers)
 *   - ambiguous is orthogonal to certainty — use el.ambiguous for review-queue logic,
 *     not a certainty value
 *
 * Import strategy: `import type` is erased at compile time (no runtime ESM loading).
 * The actual module is loaded via dynamic import() inside detect() — cached after first call.
 * This keeps the test suite compatible with tsx/CJS while esbuild bundles it statically
 * at plugin build time.
 */

import type { DetectionTree, DetectionNode } from '@smart-detector/pipeline'
import type {
  SmartDetectionPort,
  SmartDetectionResult,
  DetectedElement,
  SmartDetectionSummary,
  DetectionCertainty,
} from '../../sdk/ports/SmartDetectionPort'
import { serializeFigmaNode } from '../../sdk/adapters/figmaNodeSerializer'

// Cached module reference — loaded once on first detect() call.
type PipelineMod = typeof import('@smart-detector/pipeline')
let _pipeline: PipelineMod | null = null
async function getPipeline(): Promise<PipelineMod> {
  if (!_pipeline) _pipeline = await import('@smart-detector/pipeline')
  return _pipeline
}

/** Map SD-T CertaintyLevel → FigmAI DetectionCertainty (same string values, just a cast). */
function mapCertainty(level: string): DetectionCertainty {
  if (level === 'exact' || level === 'inferred' || level === 'weak') return level
  return 'unknown'
}

/** Recursively map a DetectionNode tree to DetectedElement. */
function mapNode(node: DetectionNode): DetectedElement {
  return {
    id: node.id,
    candidateType: node.candidateEntry ?? null,    // null is valid in Phase 0
    category: node.candidateCategory ?? null,
    certainty: mapCertainty(node.certainty),
    rationale: node.rationale,
    matchedSignals: node.matchedSignals,
    ambiguous: node.ambiguous,                     // orthogonal to certainty
    children: node.children.map(mapNode),
  }
}

/** Map SD-T DetectionTree summary → SmartDetectionSummary. */
function mapSummary(tree: DetectionTree): SmartDetectionSummary {
  const s = tree.summary
  return {
    total: s.total,
    exact: s.exact,
    inferred: s.inferred,
    weak: s.weak,
    unknown: s.unknown,
    ambiguous: s.ambiguous,
  }
}

export class SDToolkitSmartDetectionEngine implements SmartDetectionPort {
  async detect(roots: readonly SceneNode[]): Promise<SmartDetectionResult[]> {
    const { detectElements } = await getPipeline()
    return Promise.all(
      [...roots].map(async root => {
        const figmaJson = serializeFigmaNode(root) as unknown as Record<string, unknown>
        const tree = await detectElements(figmaJson, { sourceRef: root.id })
        return {
          sourceRef: root.id,
          root: mapNode(tree.root),
          summary: mapSummary(tree),
        }
      })
    )
  }
}
