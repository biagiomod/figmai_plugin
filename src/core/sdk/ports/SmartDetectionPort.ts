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

// ── Token audit ─────────────────────────────────────────────────────────────
// Host-owned DTOs for the deterministic design-token audit. Mirror the SD-T
// shapes intentionally but stay independent so toolkit refactors don't
// cascade through consumers. Audit is a sibling concern to detect() — it
// has different inputs (needs a variable catalog) and outputs (findings vs
// classifications).

export type TokenFindingKind =
  | 'unbound-color'
  | 'orphaned-binding'
  | 'mode-incomplete'
  | 'unbound-typography'   // reserved in contract; not emitted in V1
  | 'mode-mismatch'        // reserved in contract; not emitted in V1

export type TokenFindingSeverity = 'info' | 'warn' | 'error'

export interface TokenSuggestion {
  variableId: string
  collectionId: string
  variableName: string
  score: number
  confidence: 'high' | 'medium' | 'low'
  reasons: string[]
  modeReady: boolean
  missingModes: string[]
}

export interface TokenAutoFix {
  kind: 'bind-paint-variable' | 'bind-text-variable' | 'bind-text-range-variable' | 'set-explicit-mode'
  nodeId: string
  field: string
  variableId?: string
  collectionId?: string
  modeId?: string
  safe: boolean
  requiresConfirmation: boolean
  skipReason?: string
}

export interface TokenFinding {
  id: string
  kind: TokenFindingKind
  severity: TokenFindingSeverity
  nodeId: string
  nodeName?: string
  field: string
  message: string
  reasons: string[]
  suggestions: TokenSuggestion[]
  autoFix?: TokenAutoFix
  modeReady?: boolean         // present on mode-incomplete
  missingModes?: string[]     // present on mode-incomplete
}

export interface TokenAuditSummary {
  total: number
  byKind: Record<TokenFindingKind, number>
  bySeverity: Record<TokenFindingSeverity, number>
}

export interface TokenAuditResult {
  sourceRef: string
  findings: TokenFinding[]
  summary: TokenAuditSummary
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

  /**
   * Audit design-token usage on the given roots.
   * Optional — engines may not implement token audit (e.g. the in-repo
   * default engine). Consumers check `typeof engine.auditTokens === 'function'`
   * before calling.
   */
  auditTokens?(roots: readonly SceneNode[]): Promise<TokenAuditResult[]>
}
