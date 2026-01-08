/**
 * Content Table Validation and Normalization
 * 
 * Provides validation and normalization utilities for UniversalContentTableV1.
 * Ensures schema invariants are maintained and provides safe defaults for missing fields.
 * 
 * Validation is dev-only (warnings/errors logged, never throws).
 * Normalization ensures required fields exist with safe defaults.
 */

import type { UniversalContentTableV1, ContentItemV1 } from './types'
import { CONFIG } from '../config'

/**
 * Dev-only logging flag
 * Controlled by CONFIG.dev.enableContentTableValidationLogging
 */
const ENABLE_VALIDATION_LOGGING = CONFIG.dev.enableContentTableValidationLogging

/**
 * Validation result
 */
export interface ValidationResult {
  ok: boolean
  warnings: string[]
  errors: string[]
}

/**
 * Validate a Content Table against schema invariants
 * 
 * Checks:
 * - Required top-level fields exist
 * - items is an array
 * - Each item has required fields
 * - designSystemByNodeId is an object map (if present)
 * - No invalid types
 * 
 * Never throws - returns warnings/errors in result.
 */
export function validateContentTableV1(table: unknown): ValidationResult {
  const warnings: string[] = []
  const errors: string[] = []

  // Check if table is an object
  if (!table || typeof table !== 'object') {
    errors.push('Table is not an object')
    return { ok: false, warnings, errors }
  }

  const t = table as Record<string, unknown>

  // Check required top-level fields
  if (t.type !== 'universal-content-table') {
    errors.push('Missing or invalid type field (must be "universal-content-table")')
  }

  if (typeof t.version !== 'number' || t.version !== 1) {
    errors.push('Missing or invalid version field (must be 1)')
  }

  if (!t.generatedAtISO || typeof t.generatedAtISO !== 'string') {
    errors.push('Missing or invalid generatedAtISO field')
  }

  if (!t.source || typeof t.source !== 'object') {
    errors.push('Missing or invalid source field')
  } else {
    const source = t.source as Record<string, unknown>
    if (typeof source.pageId !== 'string') errors.push('source.pageId is missing or invalid')
    if (typeof source.pageName !== 'string') errors.push('source.pageName is missing or invalid')
    if (typeof source.selectionNodeId !== 'string') errors.push('source.selectionNodeId is missing or invalid')
    if (typeof source.selectionName !== 'string') errors.push('source.selectionName is missing or invalid')
  }

  if (!t.meta || typeof t.meta !== 'object') {
    errors.push('Missing or invalid meta field')
  } else {
    const meta = t.meta as Record<string, unknown>
    const requiredMetaFields = ['contentModel', 'contentStage', 'adaStatus', 'legalStatus', 'lastUpdated', 'version', 'rootNodeId', 'rootNodeName', 'rootNodeUrl']
    for (const field of requiredMetaFields) {
      if (typeof meta[field] !== 'string') {
        errors.push(`meta.${field} is missing or invalid`)
      }
    }
  }

  // Check items array
  if (!Array.isArray(t.items)) {
    errors.push('items is not an array')
    return { ok: errors.length === 0, warnings, errors }
  }

  // Validate each item
  const items = t.items as unknown[]
  items.forEach((item, index) => {
    if (!item || typeof item !== 'object') {
      errors.push(`items[${index}] is not an object`)
      return
    }

    const itemObj = item as Record<string, unknown>

    // Required fields
    const requiredFields = ['id', 'nodeId', 'nodeUrl', 'component', 'field', 'content', 'meta']
    for (const field of requiredFields) {
      if (!(field in itemObj)) {
        errors.push(`items[${index}].${field} is missing`)
      }
    }

    // Validate component
    if (itemObj.component && typeof itemObj.component === 'object') {
      const component = itemObj.component as Record<string, unknown>
      if (typeof component.kind !== 'string') {
        errors.push(`items[${index}].component.kind is missing or invalid`)
      }
      if (typeof component.name !== 'string') {
        errors.push(`items[${index}].component.name is missing or invalid`)
      }
    }

    // Validate field
    if (itemObj.field && typeof itemObj.field === 'object') {
      const field = itemObj.field as Record<string, unknown>
      if (typeof field.label !== 'string') {
        errors.push(`items[${index}].field.label is missing or invalid`)
      }
      if (typeof field.path !== 'string') {
        errors.push(`items[${index}].field.path is missing or invalid`)
      }
    }

    // Validate content
    if (itemObj.content && typeof itemObj.content === 'object') {
      const content = itemObj.content as Record<string, unknown>
      if (content.type !== 'text') {
        errors.push(`items[${index}].content.type is missing or invalid (must be "text")`)
      }
      if (typeof content.value !== 'string') {
        errors.push(`items[${index}].content.value is missing or invalid`)
      }
    }

    // Validate meta
    if (itemObj.meta && typeof itemObj.meta === 'object') {
      const meta = itemObj.meta as Record<string, unknown>
      if (typeof meta.visible !== 'boolean') {
        errors.push(`items[${index}].meta.visible is missing or invalid`)
      }
      if (typeof meta.locked !== 'boolean') {
        errors.push(`items[${index}].meta.locked is missing or invalid`)
      }
    }
  })

  // Check designSystemByNodeId if present
  if (t.designSystemByNodeId !== undefined) {
    if (typeof t.designSystemByNodeId !== 'object' || Array.isArray(t.designSystemByNodeId) || t.designSystemByNodeId === null) {
      errors.push('designSystemByNodeId must be an object map (Record<string, DesignSystemDetectionResult>)')
    }
  }

  // Log warnings/errors if enabled
  if (ENABLE_VALIDATION_LOGGING) {
    if (warnings.length > 0) {
      console.warn('[ContentTableValidation] Warnings:', warnings)
    }
    if (errors.length > 0) {
      console.error('[ContentTableValidation] Errors:', errors)
    }
  }

  return {
    ok: errors.length === 0,
    warnings,
    errors
  }
}

/**
 * Normalize a Content Table to ensure required fields exist
 * 
 * Safe normalization:
 * - Ensures arrays are arrays
 * - Fills missing required fields with safe defaults
 * - Ensures each item has required fields
 * - Does NOT delete information - only adds defaults
 * 
 * Returns a normalized copy (never mutates input).
 */
export function normalizeContentTableV1(table: UniversalContentTableV1): UniversalContentTableV1 {
  // Deep clone to avoid mutating input
  const normalized = JSON.parse(JSON.stringify(table)) as UniversalContentTableV1

  // Ensure items is an array
  if (!Array.isArray(normalized.items)) {
    normalized.items = []
  }

  // Ensure meta exists with required fields
  if (!normalized.meta) {
    normalized.meta = {
      contentModel: 'Universal v2',
      contentStage: 'Draft',
      adaStatus: '⏳ Pending',
      legalStatus: '⏳ Pending',
      lastUpdated: new Date().toISOString(),
      version: 'v1',
      rootNodeId: normalized.source?.selectionNodeId || '',
      rootNodeName: normalized.source?.selectionName || '',
      rootNodeUrl: ''
    }
  }

  // Ensure source exists with required fields
  if (!normalized.source) {
    normalized.source = {
      pageId: '',
      pageName: 'Unknown Page',
      selectionNodeId: '',
      selectionName: 'Unknown Selection'
    }
  }

  // Normalize each item
  normalized.items = normalized.items.map((item, index) => {
    const normalizedItem: ContentItemV1 = { ...item }

    // Ensure required fields exist
    if (!normalizedItem.id) {
      normalizedItem.id = normalizedItem.nodeId || `item_${index}`
    }
    if (!normalizedItem.nodeId) {
      normalizedItem.nodeId = normalizedItem.id
    }
    if (!normalizedItem.nodeUrl) {
      normalizedItem.nodeUrl = ''
    }

    // Ensure component exists
    if (!normalizedItem.component) {
      normalizedItem.component = {
        kind: 'custom',
        name: 'Unknown Component'
      }
    } else {
      normalizedItem.component = {
        kind: normalizedItem.component.kind || 'custom',
        name: normalizedItem.component.name || 'Unknown Component',
        key: normalizedItem.component.key,
        variantProperties: normalizedItem.component.variantProperties
      }
    }

    // Ensure field exists
    if (!normalizedItem.field) {
      normalizedItem.field = {
        label: 'Unknown Field',
        path: ''
      }
    } else {
      normalizedItem.field = {
        label: normalizedItem.field.label || 'Unknown Field',
        path: normalizedItem.field.path || '',
        role: normalizedItem.field.role
      }
    }

    // Ensure content exists
    if (!normalizedItem.content) {
      normalizedItem.content = {
        type: 'text',
        value: ''
      }
    } else {
      normalizedItem.content = {
        type: normalizedItem.content.type || 'text',
        value: normalizedItem.content.value || ''
      }
    }

    // Ensure meta exists
    if (!normalizedItem.meta) {
      normalizedItem.meta = {
        visible: true,
        locked: false
      }
    } else {
      normalizedItem.meta = {
        visible: typeof normalizedItem.meta.visible === 'boolean' ? normalizedItem.meta.visible : true,
        locked: typeof normalizedItem.meta.locked === 'boolean' ? normalizedItem.meta.locked : false
      }
    }

    // Preserve optional fields
    normalizedItem.textLayerName = normalizedItem.textLayerName
    normalizedItem.notes = normalizedItem.notes
    normalizedItem.contentKey = normalizedItem.contentKey
    normalizedItem.jiraTicket = normalizedItem.jiraTicket
    normalizedItem.adaNotes = normalizedItem.adaNotes
    normalizedItem.errorMessage = normalizedItem.errorMessage
    normalizedItem.designSystem = normalizedItem.designSystem

    return normalizedItem
  })

  // Ensure designSystemByNodeId is an object if present
  if (normalized.designSystemByNodeId !== undefined && normalized.designSystemByNodeId !== null) {
    if (typeof normalized.designSystemByNodeId !== 'object' || Array.isArray(normalized.designSystemByNodeId)) {
      // Invalid type - remove it
      delete normalized.designSystemByNodeId
    }
  }

  return normalized
}

