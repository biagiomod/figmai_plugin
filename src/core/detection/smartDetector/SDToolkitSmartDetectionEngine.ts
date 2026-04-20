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

import type {
  DetectionTree,
  DetectionNode,
  TokenAuditReport,
  TokenAuditFinding,
  SuggestedVariable,
  FixIntent,
} from '@smart-detector/pipeline'
import type {
  SmartDetectionPort,
  SmartDetectionResult,
  DetectedElement,
  SmartDetectionSummary,
  DetectionCertainty,
  TokenAuditResult,
  TokenFinding,
  TokenSuggestion,
  TokenAutoFix,
  TokenAuditSummary,
  TokenFindingKind,
  TokenFindingSeverity,
} from '../../sdk/ports/SmartDetectionPort'
import { serializeFigmaNode } from '../../sdk/adapters/figmaNodeSerializer'
import { buildVariableCatalogSnapshot } from '../../sdk/adapters/figmaVariableCatalogAdapter'
import type { VariableCatalogSnapshot } from '../../sdk/adapters/figmaVariableCatalogAdapter'

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

// ── Token audit mapping ─────────────────────────────────────────────────────

function mapFindingKind(kind: TokenAuditFinding['kind']): TokenFindingKind {
  return kind as TokenFindingKind
}

function mapSeverity(sev: TokenAuditFinding['severity']): TokenFindingSeverity {
  return sev as TokenFindingSeverity
}

function mapSuggestion(s: SuggestedVariable): TokenSuggestion {
  return {
    variableId: s.variableId,
    collectionId: s.collectionId,
    variableName: s.variableName,
    score: s.score,
    confidence: s.confidence,
    reasons: [...s.reasons],
    modeReady: s.modeCoverage.ready,
    missingModes: [...s.modeCoverage.missingModeIds],
  }
}

function mapAutoFix(fix: FixIntent): TokenAutoFix {
  const out: TokenAutoFix = {
    kind: fix.kind,
    nodeId: fix.nodeId,
    field: fix.field,
    safe: fix.safe,
    requiresConfirmation: fix.requiresConfirmation,
  }
  if (fix.variableId !== undefined) out.variableId = fix.variableId
  if (fix.collectionId !== undefined) out.collectionId = fix.collectionId
  if (fix.modeId !== undefined) out.modeId = fix.modeId
  if (fix.skipReason !== undefined) out.skipReason = fix.skipReason
  return out
}

function mapFinding(f: TokenAuditFinding): TokenFinding {
  const out: TokenFinding = {
    id: f.id,
    kind: mapFindingKind(f.kind),
    severity: mapSeverity(f.severity),
    nodeId: f.nodeId,
    field: f.field,
    message: f.message,
    reasons: [...f.reasons],
    suggestions: f.suggestions.map(mapSuggestion),
  }
  if (f.nodeName !== undefined) out.nodeName = f.nodeName
  if (f.autoFix) out.autoFix = mapAutoFix(f.autoFix)
  if (f.modeCoverage) {
    out.modeReady = f.modeCoverage.ready
    out.missingModes = [...f.modeCoverage.missingModeIds]
  }
  return out
}

function mapAuditSummary(report: TokenAuditReport): TokenAuditSummary {
  const byKind: Record<TokenFindingKind, number> = {
    'unbound-color': report.summary.byKind['unbound-color'],
    'orphaned-binding': report.summary.byKind['orphaned-binding'],
    'mode-incomplete': report.summary.byKind['mode-incomplete'],
    'unbound-typography': report.summary.byKind['unbound-typography'],
    'mode-mismatch': report.summary.byKind['mode-mismatch'],
  }
  const bySeverity: Record<TokenFindingSeverity, number> = {
    info: report.summary.bySeverity.info,
    warn: report.summary.bySeverity.warn,
    error: report.summary.bySeverity.error,
  }
  return { total: report.summary.total, byKind, bySeverity }
}

export class SDToolkitSmartDetectionEngine implements SmartDetectionPort {
  /**
   * Optional catalog override — primarily for tests. When omitted, the
   * engine fetches the live catalog via buildVariableCatalogSnapshot().
   */
  constructor(private readonly catalogOverride?: () => Promise<VariableCatalogSnapshot>) {}

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

  async auditTokens(roots: readonly SceneNode[]): Promise<TokenAuditResult[]> {
    const { auditDesignTokens } = await getPipeline()
    const catalog = this.catalogOverride
      ? await this.catalogOverride()
      : await buildVariableCatalogSnapshot()
    return Promise.all(
      [...roots].map(async root => {
        const figmaJson = serializeFigmaNode(root) as unknown as Record<string, unknown>
        const report = await auditDesignTokens(figmaJson, catalog, { sourceRef: root.id })
        return {
          sourceRef: report.sourceRef,
          findings: report.findings.map(mapFinding),
          summary: mapAuditSummary(report),
        }
      })
    )
  }
}
