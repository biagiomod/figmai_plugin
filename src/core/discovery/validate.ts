/**
 * Discovery Copilot Validation and Normalization
 * 
 * Provides validation and normalization utilities for DiscoverySpecV1.
 * Ensures schema invariants are maintained and provides safe defaults for missing fields.
 * 
 * Validation is non-throwing (returns errors/warnings, never throws).
 * Normalization ensures required fields exist with safe defaults.
 */

import type { DiscoverySpecV1 } from './types'

/**
 * Validation result with severity levels
 */
export interface ValidationResult {
  ok: boolean
  warnings: string[]
  errors: string[]
  /** Info-level messages (non-critical) */
  info: string[]
  /** Severity levels: 'error' | 'warning' | 'info' */
  severity: Array<{ level: 'error' | 'warning' | 'info'; message: string; field?: string }>
}

/**
 * Derive title from user request
 * Truncates to maxLength and adds "..." if needed
 */
export function deriveTitle(userRequest: string, maxLength: number = 48): string {
  if (!userRequest || userRequest.trim().length === 0) {
    return 'Discovery Session'
  }
  
  const trimmed = userRequest.trim()
  if (trimmed.length <= maxLength) {
    return trimmed
  }
  
  return trimmed.substring(0, maxLength - 3) + '...'
}

/**
 * Validate a Discovery Spec against schema invariants
 * 
 * Checks:
 * - Required top-level fields exist
 * - Problem frame fields are valid
 * - Arrays have valid items and respect limits
 * - Optional fields are valid if present
 * 
 * Never throws - returns warnings/errors in result.
 */
export function validateDiscoverySpecV1(spec: unknown): ValidationResult {
  const warnings: string[] = []
  const errors: string[] = []
  const info: string[] = []
  const severity: Array<{ level: 'error' | 'warning' | 'info'; message: string; field?: string }> = []

  // Check if spec is an object
  if (!spec || typeof spec !== 'object') {
    errors.push('Spec is not an object')
    severity.push({ level: 'error', message: 'Spec is not an object' })
    return { ok: false, warnings, errors, info, severity }
  }

  const specObj = spec as Record<string, unknown>

  // Check required top-level fields
  if (specObj.type !== 'discovery') {
    errors.push('Missing or invalid type field (must be "discovery")')
    severity.push({ level: 'error', message: 'Missing or invalid type field (must be "discovery")', field: 'type' })
  }

  if (typeof specObj.version !== 'number' || specObj.version !== 1) {
    errors.push('Missing or invalid version field (must be 1)')
    severity.push({ level: 'error', message: 'Missing or invalid version field (must be 1)', field: 'version' })
  }

  // Warn on unknown top-level keys (but don't error)
  const knownKeys = ['type', 'version', 'meta', 'problemFrame', 'risksAndAssumptions', 'hypothesesAndExperiments', 'decisionLog', 'asyncTasks']
  for (const key in specObj) {
    if (!knownKeys.includes(key)) {
      warnings.push(`Unknown top-level key: ${key}`)
      severity.push({ level: 'warning', message: `Unknown top-level key: ${key}`, field: key })
    }
  }

  // Validate meta
  if (!specObj.meta || typeof specObj.meta !== 'object') {
    errors.push('Missing or invalid meta field')
    severity.push({ level: 'error', message: 'Missing or invalid meta field', field: 'meta' })
  } else {
    const meta = specObj.meta as Record<string, unknown>
    if (typeof meta.title !== 'string' || meta.title.trim().length === 0) {
      errors.push('meta.title is missing or invalid')
      severity.push({ level: 'error', message: 'meta.title is missing or invalid', field: 'meta.title' })
    } else if (meta.title.length > 48) {
      warnings.push('meta.title exceeds 48 characters (will be truncated in normalization)')
      severity.push({ level: 'warning', message: 'meta.title exceeds 48 characters', field: 'meta.title' })
    }
  }

  // Validate problemFrame
  if (!specObj.problemFrame || typeof specObj.problemFrame !== 'object') {
    errors.push('Missing or invalid problemFrame field')
    severity.push({ level: 'error', message: 'Missing or invalid problemFrame field', field: 'problemFrame' })
  } else {
    const problemFrame = specObj.problemFrame as Record<string, unknown>
    const requiredFields = ['what', 'who', 'why', 'success']
    for (const field of requiredFields) {
      if (typeof problemFrame[field] !== 'string' || (problemFrame[field] as string).trim().length === 0) {
        errors.push(`problemFrame.${field} is missing or invalid`)
        severity.push({ level: 'error', message: `problemFrame.${field} is missing or invalid`, field: `problemFrame.${field}` })
      }
    }
  }

  // Validate risksAndAssumptions
  if (!Array.isArray(specObj.risksAndAssumptions)) {
    errors.push('risksAndAssumptions is not an array')
    severity.push({ level: 'error', message: 'risksAndAssumptions is not an array', field: 'risksAndAssumptions' })
  } else {
    const risks = specObj.risksAndAssumptions as unknown[]
    if (risks.length === 0) {
      info.push('risksAndAssumptions array is empty')
      severity.push({ level: 'info', message: 'risksAndAssumptions array is empty', field: 'risksAndAssumptions' })
    } else if (risks.length > 12) {
      warnings.push(`risksAndAssumptions array has ${risks.length} items (will be truncated to 12)`)
      severity.push({ level: 'warning', message: `risksAndAssumptions array has ${risks.length} items (will be truncated to 12)`, field: 'risksAndAssumptions' })
    }

    risks.forEach((risk, index) => {
      if (!risk || typeof risk !== 'object') {
        errors.push(`risksAndAssumptions[${index}] is not an object`)
        severity.push({ level: 'error', message: `risksAndAssumptions[${index}] is not an object`, field: `risksAndAssumptions[${index}]` })
        return
      }

      const riskObj = risk as Record<string, unknown>
      if (typeof riskObj.id !== 'string') {
        errors.push(`risksAndAssumptions[${index}].id is missing or invalid`)
        severity.push({ level: 'error', message: `risksAndAssumptions[${index}].id is missing or invalid`, field: `risksAndAssumptions[${index}].id` })
      }
      if (riskObj.type !== 'risk' && riskObj.type !== 'assumption') {
        errors.push(`risksAndAssumptions[${index}].type is invalid (must be "risk" or "assumption")`)
        severity.push({ level: 'error', message: `risksAndAssumptions[${index}].type is invalid`, field: `risksAndAssumptions[${index}].type` })
      }
      if (typeof riskObj.description !== 'string' || (riskObj.description as string).trim().length === 0) {
        errors.push(`risksAndAssumptions[${index}].description is missing or invalid`)
        severity.push({ level: 'error', message: `risksAndAssumptions[${index}].description is missing or invalid`, field: `risksAndAssumptions[${index}].description` })
      }
      if (riskObj.impact !== undefined && !['high', 'medium', 'low'].includes(riskObj.impact as string)) {
        errors.push(`risksAndAssumptions[${index}].impact is invalid (must be "high", "medium", or "low")`)
        severity.push({ level: 'error', message: `risksAndAssumptions[${index}].impact is invalid`, field: `risksAndAssumptions[${index}].impact` })
      }
    })
  }

  // Validate hypothesesAndExperiments
  if (!Array.isArray(specObj.hypothesesAndExperiments)) {
    errors.push('hypothesesAndExperiments is not an array')
    severity.push({ level: 'error', message: 'hypothesesAndExperiments is not an array', field: 'hypothesesAndExperiments' })
  } else {
    const hypotheses = specObj.hypothesesAndExperiments as unknown[]
    if (hypotheses.length === 0) {
      info.push('hypothesesAndExperiments array is empty')
      severity.push({ level: 'info', message: 'hypothesesAndExperiments array is empty', field: 'hypothesesAndExperiments' })
    } else if (hypotheses.length > 12) {
      warnings.push(`hypothesesAndExperiments array has ${hypotheses.length} items (will be truncated to 12)`)
      severity.push({ level: 'warning', message: `hypothesesAndExperiments array has ${hypotheses.length} items (will be truncated to 12)`, field: 'hypothesesAndExperiments' })
    }

    hypotheses.forEach((hyp, index) => {
      if (!hyp || typeof hyp !== 'object') {
        errors.push(`hypothesesAndExperiments[${index}] is not an object`)
        severity.push({ level: 'error', message: `hypothesesAndExperiments[${index}] is not an object`, field: `hypothesesAndExperiments[${index}]` })
        return
      }

      const hypObj = hyp as Record<string, unknown>
      if (typeof hypObj.id !== 'string') {
        errors.push(`hypothesesAndExperiments[${index}].id is missing or invalid`)
        severity.push({ level: 'error', message: `hypothesesAndExperiments[${index}].id is missing or invalid`, field: `hypothesesAndExperiments[${index}].id` })
      }
      if (typeof hypObj.hypothesis !== 'string' || (hypObj.hypothesis as string).trim().length === 0) {
        errors.push(`hypothesesAndExperiments[${index}].hypothesis is missing or invalid`)
        severity.push({ level: 'error', message: `hypothesesAndExperiments[${index}].hypothesis is missing or invalid`, field: `hypothesesAndExperiments[${index}].hypothesis` })
      }
      if (hypObj.status !== undefined && !['untested', 'testing', 'validated', 'invalidated'].includes(hypObj.status as string)) {
        errors.push(`hypothesesAndExperiments[${index}].status is invalid`)
        severity.push({ level: 'error', message: `hypothesesAndExperiments[${index}].status is invalid`, field: `hypothesesAndExperiments[${index}].status` })
      }
    })
  }

  // Validate decisionLog (optional)
  if (specObj.decisionLog !== undefined) {
    if (!Array.isArray(specObj.decisionLog)) {
      errors.push('decisionLog is not an array')
      severity.push({ level: 'error', message: 'decisionLog is not an array', field: 'decisionLog' })
    } else {
      const decisions = specObj.decisionLog as unknown[]
      if (decisions.length > 20) {
        warnings.push(`decisionLog array has ${decisions.length} items (will be truncated to 20)`)
        severity.push({ level: 'warning', message: `decisionLog array has ${decisions.length} items (will be truncated to 20)`, field: 'decisionLog' })
      }

      decisions.forEach((decision, index) => {
        if (!decision || typeof decision !== 'object') {
          errors.push(`decisionLog[${index}] is not an object`)
          severity.push({ level: 'error', message: `decisionLog[${index}] is not an object`, field: `decisionLog[${index}]` })
          return
        }

        const decisionObj = decision as Record<string, unknown>
        if (typeof decisionObj.timestamp !== 'string') {
          errors.push(`decisionLog[${index}].timestamp is missing or invalid`)
          severity.push({ level: 'error', message: `decisionLog[${index}].timestamp is missing or invalid`, field: `decisionLog[${index}].timestamp` })
        }
        if (typeof decisionObj.decision !== 'string' || (decisionObj.decision as string).trim().length === 0) {
          errors.push(`decisionLog[${index}].decision is missing or invalid`)
          severity.push({ level: 'error', message: `decisionLog[${index}].decision is missing or invalid`, field: `decisionLog[${index}].decision` })
        }
      })
    }
  }

  // Validate asyncTasks (optional)
  if (specObj.asyncTasks !== undefined) {
    if (!Array.isArray(specObj.asyncTasks)) {
      errors.push('asyncTasks is not an array')
      severity.push({ level: 'error', message: 'asyncTasks is not an array', field: 'asyncTasks' })
    } else {
      const tasks = specObj.asyncTasks as unknown[]
      if (tasks.length > 6) {
        warnings.push(`asyncTasks array has ${tasks.length} items (will be truncated to 6)`)
        severity.push({ level: 'warning', message: `asyncTasks array has ${tasks.length} items (will be truncated to 6)`, field: 'asyncTasks' })
      }

      tasks.forEach((task, index) => {
        if (!task || typeof task !== 'object') {
          errors.push(`asyncTasks[${index}] is not an object`)
          severity.push({ level: 'error', message: `asyncTasks[${index}] is not an object`, field: `asyncTasks[${index}]` })
          return
        }

        const taskObj = task as Record<string, unknown>
        if (!['Design', 'Product', 'Dev', 'Research', 'Analytics', 'Other'].includes(taskObj.ownerRole as string)) {
          errors.push(`asyncTasks[${index}].ownerRole is invalid`)
          severity.push({ level: 'error', message: `asyncTasks[${index}].ownerRole is invalid`, field: `asyncTasks[${index}].ownerRole` })
        }
        if (typeof taskObj.task !== 'string' || (taskObj.task as string).trim().length === 0) {
          errors.push(`asyncTasks[${index}].task is missing or invalid`)
          severity.push({ level: 'error', message: `asyncTasks[${index}].task is missing or invalid`, field: `asyncTasks[${index}].task` })
        }
        if (taskObj.dueInHours !== undefined && (typeof taskObj.dueInHours !== 'number' || taskObj.dueInHours <= 0)) {
          errors.push(`asyncTasks[${index}].dueInHours is invalid (must be positive number)`)
          severity.push({ level: 'error', message: `asyncTasks[${index}].dueInHours is invalid`, field: `asyncTasks[${index}].dueInHours` })
        }
      })
    }
  }

  return {
    ok: errors.length === 0,
    warnings,
    errors,
    info,
    severity
  }
}

/**
 * Normalize a Discovery Spec to ensure required fields exist
 * 
 * Safe normalization:
 * - Derives title from userRequest if missing (max 48 chars)
 * - Ensures arrays are arrays
 * - Enforces hard limits (truncates if > limits, sets truncationNotice)
 * - Fills defaults for optional fields
 * - Preserves unknown keys (pass-through)
 * 
 * Returns a normalized copy (never mutates input).
 */
export function normalizeDiscoverySpecV1(spec: DiscoverySpecV1): DiscoverySpecV1 {
  // Deep clone to avoid mutating input
  const normalized = JSON.parse(JSON.stringify(spec)) as DiscoverySpecV1

  // Ensure meta exists
  if (!normalized.meta) {
    normalized.meta = {
      title: 'Discovery Session'
    }
  }

  // Derive title if missing or empty
  if (!normalized.meta.title || normalized.meta.title.trim().length === 0) {
    normalized.meta.title = deriveTitle(normalized.meta.userRequest || '', 48)
  } else if (normalized.meta.title.length > 48) {
    // Truncate title if too long
    normalized.meta.title = normalized.meta.title.substring(0, 45) + '...'
  }

  // Ensure problemFrame exists
  if (!normalized.problemFrame) {
    normalized.problemFrame = {
      what: '',
      who: '',
      why: '',
      success: ''
    }
  } else {
    // Ensure all required fields exist
    normalized.problemFrame = {
      what: normalized.problemFrame.what || '',
      who: normalized.problemFrame.who || '',
      why: normalized.problemFrame.why || '',
      success: normalized.problemFrame.success || ''
    }
  }

  // Ensure risksAndAssumptions array exists
  if (!Array.isArray(normalized.risksAndAssumptions)) {
    normalized.risksAndAssumptions = []
  }

  // Enforce max 12 items
  if (normalized.risksAndAssumptions.length > 12) {
    normalized.risksAndAssumptions = normalized.risksAndAssumptions.slice(0, 12)
    if (!normalized.meta.truncationNotice) {
      normalized.meta.truncationNotice = 'Generated maximum items. Run again with narrower scope for more.'
    }
  }

  // Ensure hypothesesAndExperiments array exists
  if (!Array.isArray(normalized.hypothesesAndExperiments)) {
    normalized.hypothesesAndExperiments = []
  }

  // Enforce max 12 items
  if (normalized.hypothesesAndExperiments.length > 12) {
    normalized.hypothesesAndExperiments = normalized.hypothesesAndExperiments.slice(0, 12)
    if (!normalized.meta.truncationNotice) {
      normalized.meta.truncationNotice = 'Generated maximum items. Run again with narrower scope for more.'
    }
  }

  // Normalize decisionLog (optional)
  if (normalized.decisionLog === undefined) {
    normalized.decisionLog = []
  } else if (Array.isArray(normalized.decisionLog)) {
    // Enforce max 20 items
    if (normalized.decisionLog.length > 20) {
      normalized.decisionLog = normalized.decisionLog.slice(0, 20)
      if (!normalized.meta.truncationNotice) {
        normalized.meta.truncationNotice = 'Generated maximum items. Run again with narrower scope for more.'
      }
    }
  } else {
    // Invalid type, reset to empty array
    normalized.decisionLog = []
  }

  // Normalize asyncTasks (optional)
  if (normalized.asyncTasks === undefined) {
    normalized.asyncTasks = []
  } else if (Array.isArray(normalized.asyncTasks)) {
    // Enforce max 6 items
    if (normalized.asyncTasks.length > 6) {
      normalized.asyncTasks = normalized.asyncTasks.slice(0, 6)
      if (!normalized.meta.truncationNotice) {
        normalized.meta.truncationNotice = 'Generated maximum items. Run again with narrower scope for more.'
      }
    }
  } else {
    // Invalid type, reset to empty array
    normalized.asyncTasks = []
  }

  return normalized
}
