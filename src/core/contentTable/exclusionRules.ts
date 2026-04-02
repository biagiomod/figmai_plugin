/**
 * Content Table Exclusion Rules — pure post-filter for scanned items.
 *
 * One layer:
 *   1. Pattern-based exclusion rules (gated behind config).
 *
 * Numeric/currency classification is now handled by the semantic tokenizer
 * (semanticTokenizer.ts) as a reversible overlay, not by exclusion.
 *
 * Applied after scan, never inside the scanner.
 * Does NOT touch Smart Detector internals.
 */

import type { ContentItemV1 } from './types'

export type ExclusionMatchTarget = 'content' | 'layerName' | 'both'
export type ExclusionMatchType = 'exact' | 'contains' | 'regex'
export type ExclusionAction = 'exclude' | 'flag'
export type ExclusionConfidence = 'high' | 'med' | 'low'

export interface ExclusionRule {
  /** Stable editor-visible name; used in UI + matchedRuleByItemId. */
  name: string
  /** Whether this rule is active. Defaults true when omitted. */
  enabled?: boolean
  /** Optional author note shown in editor (non-functional). */
  note?: string
  /** What field to test. "both" = OR(content, layerName). */
  matchTarget: ExclusionMatchTarget
  /** String matcher type. */
  matchType: ExclusionMatchType
  /** Pattern string (regex source for matchType=regex). */
  pattern: string
  /** Exclude removes row, flag keeps row and marks it in session overlay. */
  action: ExclusionAction
  /** Metadata-only for now; reserved for future confidence-aware UX. */
  confidence: ExclusionConfidence
}

/**
 * Legacy config shape kept for backward compatibility.
 */
export interface LegacyExclusionRule {
  label?: string
  field?: 'component.name' | 'component.kind' | 'field.label' | 'field.role' | 'content.value' | 'textLayerName'
  match?: 'equals' | 'contains' | 'startsWith' | 'regex'
  pattern?: string
}

export interface ExclusionRulesConfig {
  enabled: boolean
  rules: Array<ExclusionRule | LegacyExclusionRule>
}

export interface ExclusionRuntimeDiagnostics {
  excludedCount: number
  flaggedCount: number
  firstMatchedRuleNames: string[]
}

export type ExclusionSource = 'work' | 'custom' | 'default'

export interface ExclusionRulesResult {
  items: ContentItemV1[]
  flaggedIds: Set<string>
  matchedRuleByItemId: Record<string, string>
  diagnostics?: ExclusionRuntimeDiagnostics
}

/**
 * Default config: disabled, no rules. Safe NO-OP.
 */
export const DEFAULT_EXCLUSION_CONFIG: ExclusionRulesConfig = {
  enabled: false,
  rules: []
}

export function resolveExclusionConfigWithSource(
  workExclusion?: ExclusionRulesConfig,
  customExclusion?: ExclusionRulesConfig,
  defaultConfig: ExclusionRulesConfig = { enabled: true, rules: [] }
): { source: ExclusionSource; config: ExclusionRulesConfig } {
  if (workExclusion) return { source: 'work', config: workExclusion }
  if (customExclusion) return { source: 'custom', config: customExclusion }
  return { source: 'default', config: defaultConfig }
}

// ---------------------------------------------------------------------------
// Numeric / currency helpers (deterministic, pure)
// ---------------------------------------------------------------------------

/** Matches standalone numeric values: optional sign, digits with optional comma grouping, optional decimal. */
const STANDALONE_NUMERIC_RE = /^[+-]?\d{1,3}(?:,\d{3})*(?:\.\d+)?$/

/** Matches standalone currency values: optional currency symbol prefix, then numeric core. */
const STANDALONE_CURRENCY_RE = /^[$€£¥₹]?\s*[+-]?\d{1,3}(?:,\d{3})*(?:\.\d+)?$/

/** A numeric/currency token inside mixed text. Captures optional currency symbol + number. */
const NUMERIC_TOKEN_RE = /(?:[$€£¥₹]\s*)?[+-]?\d{1,3}(?:,\d{3})*(?:\.\d+)?/g

/** Returns true if trimmed text is a standalone number with no letters. */
export function isStandaloneNumeric(text: string): boolean {
  const t = text.trim()
  if (!t) return false
  if (/[a-zA-Z]/.test(t)) return false
  return STANDALONE_NUMERIC_RE.test(t)
}

/** Returns true if trimmed text is a standalone currency value with no letters. */
export function isStandaloneCurrency(text: string): boolean {
  const t = text.trim()
  if (!t) return false
  if (/[a-zA-Z]/.test(t)) return false
  return STANDALONE_CURRENCY_RE.test(t)
}

/**
 * Replace numeric/currency tokens in mixed text with {variable}.
 * "Mixed" means the text contains at least one letter AND at least one digit.
 * Returns original text unchanged if not mixed.
 */
export function variableizeNumerics(text: string): string {
  if (!/[a-zA-Z]/.test(text)) return text
  if (!/\d/.test(text)) return text
  return text.replace(NUMERIC_TOKEN_RE, '{variable}')
}

// ---------------------------------------------------------------------------
// Main API
// ---------------------------------------------------------------------------

/**
 * Apply exclusion rules to a list of content items.
 *
 * When config.enabled is true:
 *   1. Pattern-based exclusion rules filter items.
 *
 * Numeric/currency handling is now delegated to the semantic tokenizer
 * as a reversible overlay (see semanticTokenizer.ts).
 *
 * When config.enabled is false: returns items unchanged (NO-OP).
 */
export function applyExclusionRules(
  items: ContentItemV1[],
  config: ExclusionRulesConfig = DEFAULT_EXCLUSION_CONFIG,
  debug = false
): ExclusionRulesResult {
  if (!config.enabled) {
    return {
      items,
      flaggedIds: new Set<string>(),
      matchedRuleByItemId: {},
      diagnostics: debug ? { excludedCount: 0, flaggedCount: 0, firstMatchedRuleNames: [] } : undefined
    }
  }

  const result: ContentItemV1[] = []
  const flaggedIds = new Set<string>()
  const matchedRuleByItemId: Record<string, string> = {}
  const normalizedRules = config.rules
    .map((rule, index) => normalizeLegacyRuleToNewRule(rule, index))
    .filter((rule): rule is ExclusionRule => !!rule && rule.enabled !== false && !!(rule.pattern || '').trim())

  for (const item of items) {
    const rawContent = item.content.value || ''

    // Step 1: pattern-based rule actions
    if (normalizedRules.length > 0) {
      let excludedByRule = false
      for (const rule of normalizedRules) {
        if (!matchesRule(item, rule, rawContent)) continue
        matchedRuleByItemId[item.id] = rule.name
        if (rule.action === 'exclude') {
          excludedByRule = true
          break
        }
        if (rule.action === 'flag') {
          flaggedIds.add(item.id)
          break
        }
      }
      if (excludedByRule) continue
    }

    result.push(item)
  }

  return {
    items: result,
    flaggedIds,
    matchedRuleByItemId,
    diagnostics: debug
      ? {
          excludedCount: items.length - result.length,
          flaggedCount: flaggedIds.size,
          firstMatchedRuleNames: Array.from(new Set(Object.values(matchedRuleByItemId))).slice(0, 5)
        }
      : undefined
  }
}

export function normalizeLegacyRuleToNewRule(
  rule: ExclusionRule | LegacyExclusionRule,
  index = 0
): ExclusionRule | null {
  if (!rule || typeof rule !== 'object') return null
  if ('matchTarget' in rule || 'matchType' in rule || 'action' in rule) {
    const modern = rule as ExclusionRule
    const matchTarget = normalizeMatchTarget(modern.matchTarget)
    const matchType = normalizeMatchType(modern.matchType)
    const action = normalizeAction(modern.action)
    const confidence = normalizeConfidence(modern.confidence)
    const pattern = typeof modern.pattern === 'string' ? modern.pattern : ''
    const name = typeof modern.name === 'string' && modern.name.trim()
      ? modern.name.trim()
      : `Rule ${index + 1}`
    return {
      name,
      enabled: modern.enabled !== false,
      note: typeof modern.note === 'string' ? modern.note : '',
      matchTarget,
      matchType,
      pattern,
      action,
      confidence
    }
  }

  const legacy = rule as LegacyExclusionRule
  const field = legacy.field || 'content.value'
  return {
    name: (legacy.label && legacy.label.trim()) || `Legacy Rule ${index + 1}`,
    enabled: true,
    note: '',
    matchTarget: legacyFieldToMatchTarget(field),
    matchType: legacyMatchToMatchType(legacy.match || 'contains'),
    pattern: typeof legacy.pattern === 'string' ? legacy.pattern : '',
    action: 'exclude',
    confidence: 'high'
  }
}

function normalizeMatchTarget(value: unknown): ExclusionMatchTarget {
  if (value === 'content' || value === 'layerName' || value === 'both') return value
  return 'content'
}

function normalizeMatchType(value: unknown): ExclusionMatchType {
  if (value === 'exact' || value === 'contains' || value === 'regex') return value
  return 'contains'
}

function normalizeAction(value: unknown): ExclusionAction {
  if (value === 'exclude' || value === 'flag') return value
  return 'exclude'
}

function normalizeConfidence(value: unknown): ExclusionConfidence {
  if (value === 'high' || value === 'med' || value === 'low') return value
  return 'high'
}

function legacyFieldToMatchTarget(field: NonNullable<LegacyExclusionRule['field']>): ExclusionMatchTarget {
  if (field === 'textLayerName') return 'layerName'
  return 'content'
}

function legacyMatchToMatchType(match: NonNullable<LegacyExclusionRule['match']>): ExclusionMatchType {
  if (match === 'regex') return 'regex'
  if (match === 'equals') return 'exact'
  return 'contains'
}

function normalizeForCompare(value: string): string {
  return value.trim().replace(/\s+/g, ' ').toLowerCase()
}

function targetValues(item: ContentItemV1, target: ExclusionMatchTarget, contentOverride?: string): string[] {
  const content = typeof contentOverride === 'string' ? contentOverride : (item.content.value || '')
  const layerName = item.textLayerName || ''
  if (target === 'content') return [content, normalizeForCompare(content)]
  if (target === 'layerName') return [layerName, normalizeForCompare(layerName)]
  return [content, layerName, normalizeForCompare(content), normalizeForCompare(layerName)]
}

function matchesRule(item: ContentItemV1, rule: ExclusionRule, contentOverride?: string): boolean {
  const values = targetValues(item, rule.matchTarget, contentOverride)
  const pattern = rule.pattern || ''
  if (!pattern.trim()) return false

  switch (rule.matchType) {
    case 'exact': {
      const normalizedPattern = normalizeForCompare(pattern)
      return values.some((value) => value === pattern || value === normalizedPattern)
    }
    case 'contains': {
      const normalizedPattern = normalizeForCompare(pattern)
      return values.some((value) => value.includes(pattern) || value.includes(normalizedPattern))
    }
    case 'regex':
      try {
        const regex = new RegExp(pattern, 'i')
        return values.some((value) => regex.test(value))
      } catch {
        // Invalid regex should never crash matching; fail closed to non-match.
        return false
      }
  }
}
