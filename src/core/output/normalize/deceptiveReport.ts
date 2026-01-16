/**
 * Parse Deceptive Report JSON
 * Extracts and validates Dark & Deceptive UX report data from LLM responses
 */

import { extractJsonFromResponse } from './index'
import { debug } from '../../debug/logger'

/**
 * Deceptive Finding
 */
export interface DeceptiveFinding {
  category: string
  severity: 'Low' | 'Medium' | 'High'
  description: string
  whyDeceptive: string
  userHarm: string
  remediation: string
  evidence?: string
}

/**
 * Dimension Check
 * Represents pass/fail status for a Dark UX dimension
 */
export interface DimensionCheck {
  dimension: string
  passed: boolean  // true = no issues found, false = issues found
}

/**
 * Required Dark UX dimensions (must all be present in checklist)
 */
export const REQUIRED_DIMENSIONS = [
  'Forced Action',
  'Nagging',
  'Obstruction',
  'Sneaking',
  'Interface Interference',
  'False Urgency/Scarcity',
  'Confirmshaming',
  'Trick Questions',
  'Hidden Subscription/Roach Motel',
  'Misleading Defaults'
] as const

/**
 * Deceptive Report Data
 */
export interface DeceptiveReportData {
  summary: string
  overallSeverity: 'None' | 'Low' | 'Medium' | 'High'
  findings: DeceptiveFinding[]
  dimensionsChecklist: DimensionCheck[]  // Exactly 10 items, one per dimension
}

/**
 * Parse and validate Deceptive Report JSON response
 * Handles markdown fences, stray text, and validates structure
 * 
 * @param response - Raw LLM response string
 * @param enableDebug - Whether to enable debug logging
 * @returns Parsed data or error
 */
export function parseDeceptiveReportJson(
  response: string,
  enableDebug: boolean = false
): { data: DeceptiveReportData } | { error: string } {
  const debugLog = enableDebug ? debug.scope('normalize:deceptive_report') : null
  
  if (!response || typeof response !== 'string') {
    const error = 'Invalid response: response is not a string'
    debugLog?.error('Parse failed', { error })
    return { error }
  }
  
  const raw = response.trim()
  if (!raw) {
    const error = 'Invalid response: response is empty'
    debugLog?.error('Parse failed', { error })
    return { error }
  }
  
  // Extract JSON from response (handles fences, stray text)
  const jsonString = extractJsonFromResponse(raw)
  if (!jsonString) {
    const error = 'No valid JSON found in response'
    debugLog?.error('Parse failed', { error, responseHead: raw.substring(0, 200) })
    return { error }
  }
  
  debugLog?.log('Extracted JSON', { jsonString: jsonString.substring(0, 200) })
  
  // Parse JSON
  let parsed: unknown
  try {
    parsed = JSON.parse(jsonString)
  } catch (parseError) {
    const error = `JSON parse error: ${parseError instanceof Error ? parseError.message : String(parseError)}`
    debugLog?.error('Parse failed', { error, jsonString: jsonString.substring(0, 200) })
    return { error }
  }
  
  // Validate structure
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    const error = 'Invalid response: root must be an object'
    debugLog?.error('Parse failed', { error })
    return { error }
  }
  
  const obj = parsed as Record<string, unknown>
  
  // Validate required fields
  if (typeof obj.summary !== 'string') {
    const error = 'Invalid response: summary must be a string'
    debugLog?.error('Parse failed', { error })
    return { error }
  }
  
  if (!['None', 'Low', 'Medium', 'High'].includes(obj.overallSeverity as string)) {
    const error = 'Invalid response: overallSeverity must be "None", "Low", "Medium", or "High"'
    debugLog?.error('Parse failed', { error, overallSeverity: obj.overallSeverity })
    return { error }
  }
  
  if (!Array.isArray(obj.findings)) {
    const error = 'Invalid response: findings must be an array'
    debugLog?.error('Parse failed', { error })
    return { error }
  }
  
  // Validate findings array
  const findings: DeceptiveFinding[] = []
  for (let i = 0; i < obj.findings.length; i++) {
    const finding = obj.findings[i]
    if (!finding || typeof finding !== 'object' || Array.isArray(finding)) {
      debugLog?.warn('Invalid finding skipped', { index: i })
      continue
    }
    
    const f = finding as Record<string, unknown>
    
    // Validate required fields
    if (typeof f.category !== 'string' ||
        !['Low', 'Medium', 'High'].includes(f.severity as string) ||
        typeof f.description !== 'string' ||
        typeof f.whyDeceptive !== 'string' ||
        typeof f.userHarm !== 'string' ||
        typeof f.remediation !== 'string') {
      debugLog?.warn('Invalid finding skipped', { index: i, finding: f })
      continue
    }
    
    findings.push({
      category: f.category,
      severity: f.severity as 'Low' | 'Medium' | 'High',
      description: f.description,
      whyDeceptive: f.whyDeceptive,
      userHarm: f.userHarm,
      remediation: f.remediation,
      evidence: typeof f.evidence === 'string' ? f.evidence : undefined
    })
  }
  
  // Validate dimensionsChecklist (required field)
  if (!Array.isArray(obj.dimensionsChecklist)) {
    const error = 'Invalid response: dimensionsChecklist must be an array'
    debugLog?.error('Parse failed', { error })
    return { error }
  }
  
  if (obj.dimensionsChecklist.length !== 10) {
    const error = `Invalid response: dimensionsChecklist must contain exactly 10 items, got ${obj.dimensionsChecklist.length}`
    debugLog?.error('Parse failed', { error, count: obj.dimensionsChecklist.length })
    return { error }
  }
  
  // Validate each dimension check and ensure all 10 dimensions are present
  const dimensionNames = new Set<string>()
  const dimensionsChecklist: Array<{ dimension: string; passed: boolean }> = []
  
  for (let i = 0; i < obj.dimensionsChecklist.length; i++) {
    const check = obj.dimensionsChecklist[i]
    if (!check || typeof check !== 'object' || Array.isArray(check)) {
      const error = `Invalid response: dimensionsChecklist[${i}] must be an object`
      debugLog?.error('Parse failed', { error })
      return { error }
    }
    
    const c = check as Record<string, unknown>
    
    if (typeof c.dimension !== 'string' || typeof c.passed !== 'boolean') {
      const error = `Invalid response: dimensionsChecklist[${i}] must have dimension (string) and passed (boolean)`
      debugLog?.error('Parse failed', { error, check: c })
      return { error }
    }
    
    if (!REQUIRED_DIMENSIONS.includes(c.dimension as any)) {
      const error = `Invalid response: unknown dimension "${c.dimension}" in checklist`
      debugLog?.error('Parse failed', { error, dimension: c.dimension })
      return { error }
    }
    
    if (dimensionNames.has(c.dimension)) {
      const error = `Invalid response: duplicate dimension "${c.dimension}" in checklist`
      debugLog?.error('Parse failed', { error, dimension: c.dimension })
      return { error }
    }
    
    dimensionNames.add(c.dimension)
    dimensionsChecklist.push({
      dimension: c.dimension,
      passed: c.passed
    })
  }
  
  // Ensure all required dimensions are present
  for (const required of REQUIRED_DIMENSIONS) {
    if (!dimensionNames.has(required)) {
      const error = `Invalid response: missing dimension "${required}" in checklist`
      debugLog?.error('Parse failed', { error, missingDimension: required })
      return { error }
    }
  }
  
  // Build validated data
  const data: DeceptiveReportData = {
    summary: obj.summary,
    overallSeverity: obj.overallSeverity as 'None' | 'Low' | 'Medium' | 'High',
    findings,
    dimensionsChecklist
  }
  
  debugLog?.log('Parse success', { 
    summaryLength: data.summary.length,
    overallSeverity: data.overallSeverity,
    findingsCount: data.findings.length,
    dimensionsChecklistCount: data.dimensionsChecklist.length
  })
  
  return { data }
}
