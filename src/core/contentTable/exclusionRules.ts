/**
 * Content Table Exclusion Rules — pure post-filter for scanned items.
 *
 * Two layers:
 *   1. Pattern-based exclusion rules (gated behind config).
 *   2. Numeric/currency handling (always active when config.enabled):
 *      - Standalone numbers/currency → EXCLUDE.
 *      - Mixed text+number → INCLUDE with numbers replaced by {variable}.
 *
 * Applied after scan, never inside the scanner.
 * Does NOT touch Smart Detector internals.
 */

import type { ContentItemV1 } from './types'

export interface ExclusionRule {
  /** Human-readable label for the rule. */
  label: string
  /** Field to match against. */
  field: 'component.name' | 'component.kind' | 'field.label' | 'field.role' | 'content.value' | 'textLayerName'
  /** Match type. */
  match: 'equals' | 'contains' | 'startsWith' | 'regex'
  /** Pattern string. For regex, this is the regex source (flags: 'i'). */
  pattern: string
}

export interface ExclusionRulesConfig {
  enabled: boolean
  rules: ExclusionRule[]
}

/**
 * Default config: disabled, no rules. Safe NO-OP.
 */
export const DEFAULT_EXCLUSION_CONFIG: ExclusionRulesConfig = {
  enabled: false,
  rules: []
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
 * Apply exclusion rules + numeric/currency handling to a list of content items.
 *
 * When config.enabled is true:
 *   1. Pattern-based exclusion rules filter items.
 *   2. Standalone numeric/currency items are excluded.
 *   3. Mixed text+number items have numbers replaced with {variable}.
 *
 * When config.enabled is false: returns items unchanged (NO-OP).
 */
export function applyExclusionRules(
  items: ContentItemV1[],
  config: ExclusionRulesConfig = DEFAULT_EXCLUSION_CONFIG
): ContentItemV1[] {
  if (!config.enabled) return items

  const result: ContentItemV1[] = []

  for (const item of items) {
    // Step 1: pattern-based exclusion
    if (config.rules.length > 0) {
      let excluded = false
      for (const rule of config.rules) {
        if (matchesRule(item, rule)) { excluded = true; break }
      }
      if (excluded) continue
    }

    const val = item.content.value.trim()

    // Step 2: standalone numeric/currency → exclude
    if (isStandaloneNumeric(val) || isStandaloneCurrency(val)) continue

    // Step 3: mixed text+number → variableize
    const transformed = variableizeNumerics(val)
    if (transformed !== val) {
      result.push({ ...item, content: { ...item.content, value: transformed } })
    } else {
      result.push(item)
    }
  }

  return result
}

function resolveField(item: ContentItemV1, field: ExclusionRule['field']): string {
  switch (field) {
    case 'component.name': return item.component.name
    case 'component.kind': return item.component.kind
    case 'field.label': return item.field.label
    case 'field.role': return item.field.role || ''
    case 'content.value': return item.content.value
    case 'textLayerName': return item.textLayerName || ''
  }
}

function matchesRule(item: ContentItemV1, rule: ExclusionRule): boolean {
  const value = resolveField(item, rule.field)

  switch (rule.match) {
    case 'equals':
      return value === rule.pattern
    case 'contains':
      return value.includes(rule.pattern)
    case 'startsWith':
      return value.startsWith(rule.pattern)
    case 'regex':
      try {
        return new RegExp(rule.pattern, 'i').test(value)
      } catch {
        return false
      }
  }
}
