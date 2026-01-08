/**
 * Design Workshop Validation and Normalization
 * 
 * Provides validation and normalization utilities for DesignSpecV1.
 * Ensures schema invariants are maintained and provides safe defaults for missing fields.
 * 
 * Validation is non-throwing (returns errors/warnings, never throws).
 * Normalization ensures required fields exist with safe defaults.
 */

import type { DesignSpecV1, BlockSpec } from './types'

/**
 * Validation result
 */
export interface ValidationResult {
  ok: boolean
  warnings: string[]
  errors: string[]
}

/**
 * Validate a Design Spec against schema invariants
 * 
 * Checks:
 * - Required top-level fields exist
 * - Device kind and dimensions are valid
 * - Fidelity enum is valid
 * - Screen count is 1-5 (warn if >5)
 * - Each block has required fields
 * 
 * Never throws - returns warnings/errors in result.
 */
export function validateDesignSpecV1(spec: unknown): ValidationResult {
  const warnings: string[] = []
  const errors: string[] = []

  // Check if spec is an object
  if (!spec || typeof spec !== 'object') {
    errors.push('Spec is not an object')
    return { ok: false, warnings, errors }
  }

  const s = spec as Record<string, unknown>

  // Check required top-level fields
  if (s.type !== 'designScreens') {
    errors.push('Missing or invalid type field (must be "designScreens")')
  }

  if (typeof s.version !== 'number' || s.version !== 1) {
    errors.push('Missing or invalid version field (must be 1)')
  }

  if (!s.meta || typeof s.meta !== 'object') {
    errors.push('Missing or invalid meta field')
  } else {
    const meta = s.meta as Record<string, unknown>
    if (typeof meta.title !== 'string') {
      errors.push('meta.title is missing or invalid')
    }
  }

  if (!s.canvas || typeof s.canvas !== 'object') {
    errors.push('Missing or invalid canvas field')
  } else {
    const canvas = s.canvas as Record<string, unknown>
    if (!canvas.device || typeof canvas.device !== 'object') {
      errors.push('canvas.device is missing or invalid')
    } else {
      const device = canvas.device as Record<string, unknown>
      if (!['mobile', 'tablet', 'desktop'].includes(device.kind as string)) {
        errors.push('canvas.device.kind is missing or invalid (must be "mobile", "tablet", or "desktop")')
      }
      if (typeof device.width !== 'number' || device.width <= 0) {
        errors.push('canvas.device.width is missing or invalid (must be positive number)')
      }
      if (typeof device.height !== 'number' || device.height <= 0) {
        errors.push('canvas.device.height is missing or invalid (must be positive number)')
      }
    }
  }

  if (!s.render || typeof s.render !== 'object') {
    errors.push('Missing or invalid render field')
  } else {
    const render = s.render as Record<string, unknown>
    if (!render.intent || typeof render.intent !== 'object') {
      errors.push('render.intent is missing or invalid')
    } else {
      const intent = render.intent as Record<string, unknown>
      if (!['wireframe', 'medium', 'hi', 'creative'].includes(intent.fidelity as string)) {
        errors.push('render.intent.fidelity is missing or invalid (must be "wireframe", "medium", "hi", or "creative")')
      }
    }
  }

  // Check screens array
  if (!Array.isArray(s.screens)) {
    errors.push('screens is not an array')
    return { ok: errors.length === 0, warnings, errors }
  }

  const screens = s.screens as unknown[]
  
  // Check screen count
  if (screens.length === 0) {
    errors.push('screens array is empty (must have at least 1 screen)')
  } else if (screens.length > 5) {
    warnings.push(`screens array has ${screens.length} items (will be truncated to 5)`)
  }

  // Validate each screen
  screens.forEach((screen, index) => {
    if (!screen || typeof screen !== 'object') {
      errors.push(`screens[${index}] is not an object`)
      return
    }

    const screenObj = screen as Record<string, unknown>

    if (typeof screenObj.name !== 'string') {
      errors.push(`screens[${index}].name is missing or invalid`)
    }

    if (!Array.isArray(screenObj.blocks)) {
      errors.push(`screens[${index}].blocks is missing or not an array`)
      return
    }

    // Validate each block
    const blocks = screenObj.blocks as unknown[]
    blocks.forEach((block, blockIndex) => {
      if (!block || typeof block !== 'object') {
        errors.push(`screens[${index}].blocks[${blockIndex}] is not an object`)
        return
      }

      const blockObj = block as Record<string, unknown>
      const blockType = blockObj.type as string

      switch (blockType) {
        case 'heading':
          if (typeof blockObj.text !== 'string') {
            errors.push(`screens[${index}].blocks[${blockIndex}].text is missing or invalid`)
          }
          if (blockObj.level !== undefined && ![1, 2, 3].includes(blockObj.level as number)) {
            errors.push(`screens[${index}].blocks[${blockIndex}].level is invalid (must be 1, 2, or 3)`)
          }
          break
        case 'bodyText':
          if (typeof blockObj.text !== 'string') {
            errors.push(`screens[${index}].blocks[${blockIndex}].text is missing or invalid`)
          }
          break
        case 'button':
          if (typeof blockObj.text !== 'string') {
            errors.push(`screens[${index}].blocks[${blockIndex}].text is missing or invalid`)
          }
          break
        case 'input':
          // label, placeholder, and inputType are optional
          if (blockObj.inputType !== undefined && !['text', 'email', 'password'].includes(blockObj.inputType as string)) {
            errors.push(`screens[${index}].blocks[${blockIndex}].inputType is invalid (must be "text", "email", or "password")`)
          }
          break
        case 'card':
          if (typeof blockObj.content !== 'string') {
            errors.push(`screens[${index}].blocks[${blockIndex}].content is missing or invalid`)
          }
          break
        case 'spacer':
          // height is optional
          break
        case 'image':
          // All fields are optional (placeholder)
          break
        default:
          errors.push(`screens[${index}].blocks[${blockIndex}].type is invalid or unsupported: ${blockType}`)
      }
    })
  })

  return {
    ok: errors.length === 0,
    warnings,
    errors
  }
}

/**
 * Normalize a Design Spec to ensure required fields exist
 * 
 * Safe normalization:
 * - Ensures arrays are arrays
 * - Fills missing required fields with safe defaults
 * - Enforces 1-5 screens (truncates if >5, sets truncationNotice)
 * - Fills block defaults
 * - Does NOT delete information - only adds defaults
 * 
 * Returns a normalized copy (never mutates input).
 */
export function normalizeDesignSpecV1(spec: DesignSpecV1): DesignSpecV1 {
  // Deep clone to avoid mutating input
  const normalized = JSON.parse(JSON.stringify(spec)) as DesignSpecV1

  // Ensure meta exists with required fields
  if (!normalized.meta) {
    normalized.meta = {
      title: 'Screens'
    }
  }

  // Ensure canvas.device exists with defaults
  if (!normalized.canvas) {
    normalized.canvas = {
      device: {
        kind: 'mobile',
        width: 375,
        height: 812
      }
    }
  } else if (!normalized.canvas.device) {
    normalized.canvas.device = {
      kind: 'mobile',
      width: 375,
      height: 812
    }
  } else {
    // Fill device defaults based on kind
    if (!normalized.canvas.device.kind) {
      normalized.canvas.device.kind = 'mobile'
    }
    
    if (!normalized.canvas.device.width || normalized.canvas.device.width <= 0) {
      // Default dimensions based on device kind
      switch (normalized.canvas.device.kind) {
        case 'mobile':
          normalized.canvas.device.width = 375
          break
        case 'tablet':
          normalized.canvas.device.width = 768
          break
        case 'desktop':
          normalized.canvas.device.width = 1920
          break
      }
    }
    
    if (!normalized.canvas.device.height || normalized.canvas.device.height <= 0) {
      // Default dimensions based on device kind
      switch (normalized.canvas.device.kind) {
        case 'mobile':
          normalized.canvas.device.height = 812
          break
        case 'tablet':
          normalized.canvas.device.height = 1024
          break
        case 'desktop':
          normalized.canvas.device.height = 1080
          break
      }
    }
  }

  // Ensure render.intent exists with defaults
  if (!normalized.render) {
    normalized.render = {
      intent: {
        fidelity: 'medium'
      }
    }
  } else if (!normalized.render.intent) {
    normalized.render.intent = {
      fidelity: 'medium'
    }
  } else {
    if (!normalized.render.intent.fidelity) {
      normalized.render.intent.fidelity = 'medium'
    }
  }

  // Ensure screens array exists
  if (!Array.isArray(normalized.screens)) {
    normalized.screens = []
  }

  // Enforce 1-5 screens limit
  if (normalized.screens.length === 0) {
    // Add a default screen if empty
    normalized.screens = [{
      name: 'Screen 1',
      blocks: []
    }]
  } else if (normalized.screens.length > 5) {
    // Truncate to 5 screens and set truncation notice
    normalized.screens = normalized.screens.slice(0, 5)
    normalized.meta.truncationNotice = 'Generated 5 screens. Ask for more to continue.'
  }

  // Normalize each screen
  normalized.screens = normalized.screens.map((screen, index) => {
    const normalizedScreen = { ...screen }

    // Ensure name exists
    if (!normalizedScreen.name) {
      normalizedScreen.name = `Screen ${index + 1}`
    }

    // Ensure layout defaults
    if (!normalizedScreen.layout) {
      normalizedScreen.layout = {
        direction: 'vertical',
        padding: 16,
        gap: 12
      }
    } else {
      if (!normalizedScreen.layout.direction) {
        normalizedScreen.layout.direction = 'vertical'
      }
      if (normalizedScreen.layout.padding === undefined) {
        normalizedScreen.layout.padding = 16
      }
      if (normalizedScreen.layout.gap === undefined) {
        normalizedScreen.layout.gap = 12
      }
    }

    // Ensure blocks array exists
    if (!Array.isArray(normalizedScreen.blocks)) {
      normalizedScreen.blocks = []
    }

    // Normalize each block
    normalizedScreen.blocks = normalizedScreen.blocks.map((block): BlockSpec => {
      const normalizedBlock = { ...block } as BlockSpec

      switch (normalizedBlock.type) {
        case 'heading':
          if (!normalizedBlock.level) {
            normalizedBlock.level = 1
          }
          break
        case 'button':
          if (!normalizedBlock.variant) {
            normalizedBlock.variant = 'primary'
          }
          break
        case 'spacer':
          if (!normalizedBlock.height) {
            normalizedBlock.height = 16
          }
          break
        case 'input':
          if (!normalizedBlock.inputType) {
            normalizedBlock.inputType = 'text'
          }
          break
      }

      return normalizedBlock
    })

    return normalizedScreen
  })

  return normalized
}
