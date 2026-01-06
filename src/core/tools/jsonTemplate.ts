/**
 * JSON Template Types and Validation
 * Defines the schema for FigmAI Template JSON v1.0
 */

export interface TemplateColor {
  r?: number
  g?: number
  b?: number
  a?: number
  hex?: string
}

export interface TemplateFill {
  type: 'SOLID'
  color: TemplateColor
}

export interface TemplateStroke {
  type: 'SOLID'
  color: TemplateColor
  weight?: number
}

export interface TemplateStyle {
  fills?: TemplateFill[]
  strokes?: TemplateStroke[]
  radius?: number
}

export interface TemplateText {
  value: string
  fontSize?: number
  fontFamily?: string
  fontStyle?: string
}

export interface TemplateLayout {
  mode: 'AUTO_LAYOUT'
  direction?: 'HORIZONTAL' | 'VERTICAL'
  padding?: {
    top?: number
    right?: number
    bottom?: number
    left?: number
  }
  gap?: number
  sizing?: {
    width?: number | 'HUG' | 'FILL'
    height?: number | 'HUG' | 'FILL'
  }
}

export interface TemplateNode {
  type: 'FRAME' | 'TEXT' | 'RECTANGLE'
  name?: string
  layout?: TemplateLayout
  style?: TemplateStyle
  text?: TemplateText
  children?: TemplateNode[]
}

export interface TemplateMeta {
  name?: string
  [key: string]: unknown
}

export interface TemplateJSON {
  schemaVersion: string
  meta?: TemplateMeta
  root: TemplateNode
}

export interface ValidationResult {
  ok: boolean
  errors: string[]
  summary?: string
}

/**
 * Parse hex color to RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? {
        r: parseInt(result[1], 16) / 255,
        g: parseInt(result[2], 16) / 255,
        b: parseInt(result[3], 16) / 255
      }
    : null
}

/**
 * Parse color string (hex or rgb)
 */
function parseColor(color: TemplateColor): { r: number; g: number; b: number } | null {
  if (color.hex) {
    return hexToRgb(color.hex)
  }
  if (color.r !== undefined && color.g !== undefined && color.b !== undefined) {
    return {
      r: Math.max(0, Math.min(1, color.r)),
      g: Math.max(0, Math.min(1, color.g)),
      b: Math.max(0, Math.min(1, color.b))
    }
  }
  return null
}

/**
 * Validate a template node recursively
 */
function validateNode(
  node: unknown,
  depth: number,
  nodeCount: { count: number },
  errors: string[],
  path: string
): node is TemplateNode {
  if (depth > 12) {
    errors.push(`${path}: Maximum depth of 12 exceeded`)
    return false
  }
  
  if (nodeCount.count > 300) {
    errors.push(`${path}: Maximum node count of 300 exceeded`)
    return false
  }
  
  if (typeof node !== 'object' || node === null) {
    errors.push(`${path}: Must be an object`)
    return false
  }
  
  const n = node as Record<string, unknown>
  
  if (typeof n.type !== 'string') {
    errors.push(`${path}.type: Must be a string`)
    return false
  }
  
  if (!['FRAME', 'TEXT', 'RECTANGLE'].includes(n.type)) {
    errors.push(`${path}.type: Must be one of FRAME, TEXT, RECTANGLE`)
    return false
  }
  
  nodeCount.count++
  
  // Validate TEXT node
  if (n.type === 'TEXT') {
    if (!n.text || typeof n.text !== 'object') {
      errors.push(`${path}.text: TEXT nodes require a text object`)
      return false
    }
    const text = n.text as Record<string, unknown>
    if (typeof text.value !== 'string') {
      errors.push(`${path}.text.value: Must be a string`)
      return false
    }
    if (text.fontSize !== undefined && (typeof text.fontSize !== 'number' || text.fontSize < 1 || text.fontSize > 500)) {
      errors.push(`${path}.text.fontSize: Must be a number between 1 and 500`)
      return false
    }
  }
  
  // Validate FRAME node
  if (n.type === 'FRAME') {
    if (n.layout !== undefined) {
      if (typeof n.layout !== 'object' || n.layout === null) {
        errors.push(`${path}.layout: Must be an object`)
        return false
      }
      const layout = n.layout as Record<string, unknown>
      if (layout.mode !== 'AUTO_LAYOUT') {
        errors.push(`${path}.layout.mode: Must be AUTO_LAYOUT`)
        return false
      }
    }
    
    // Validate children
    if (n.children !== undefined) {
      if (!Array.isArray(n.children)) {
        errors.push(`${path}.children: Must be an array`)
        return false
      }
      for (let i = 0; i < n.children.length; i++) {
        validateNode(n.children[i], depth + 1, nodeCount, errors, `${path}.children[${i}]`)
      }
    }
  }
  
  // Validate style
  if (n.style !== undefined) {
    if (typeof n.style !== 'object' || n.style === null) {
      errors.push(`${path}.style: Must be an object`)
      return false
    }
    const style = n.style as Record<string, unknown>
    
    if (style.fills !== undefined) {
      if (!Array.isArray(style.fills)) {
        errors.push(`${path}.style.fills: Must be an array`)
        return false
      }
      for (let i = 0; i < style.fills.length; i++) {
        const fill = style.fills[i] as Record<string, unknown>
        if (fill.type !== 'SOLID') {
          errors.push(`${path}.style.fills[${i}].type: Must be SOLID`)
          return false
        }
        if (!fill.color || typeof fill.color !== 'object') {
          errors.push(`${path}.style.fills[${i}].color: Must be an object`)
          return false
        }
        const color = fill.color as TemplateColor
        const parsed = parseColor(color)
        if (!parsed) {
          errors.push(`${path}.style.fills[${i}].color: Invalid color format`)
          return false
        }
      }
    }
    
    if (style.radius !== undefined && (typeof style.radius !== 'number' || style.radius < 0 || style.radius > 1000)) {
      errors.push(`${path}.style.radius: Must be a number between 0 and 1000`)
      return false
    }
  }
  
  return true
}

/**
 * Validate a template JSON
 */
export function validateTemplate(rawJson: string): ValidationResult {
  const errors: string[] = []
  
  // Parse JSON
  let template: TemplateJSON
  try {
    template = JSON.parse(rawJson)
  } catch (error) {
    return {
      ok: false,
      errors: [`Invalid JSON: ${error}`]
    }
  }
  
  // Validate schema version
  if (typeof template.schemaVersion !== 'string') {
    errors.push('schemaVersion: Must be a string')
  } else if (template.schemaVersion !== '1.0') {
    errors.push('schemaVersion: Must be "1.0"')
  }
  
  // Validate root
  if (!template.root) {
    errors.push('root: Required')
  } else {
    const nodeCount = { count: 0 }
    validateNode(template.root, 0, nodeCount, errors, 'root')
  }
  
  if (errors.length > 0) {
    return {
      ok: false,
      errors,
      summary: `Validation failed with ${errors.length} error(s)`
    }
  }
  
  return {
    ok: true,
    errors: [],
    summary: 'Template is valid'
  }
}

/**
 * Parse color from template
 */
export function parseTemplateColor(color: TemplateColor): { r: number; g: number; b: number } {
  const parsed = parseColor(color)
  if (parsed) {
    return parsed
  }
  // Default to black
  return { r: 0, g: 0, b: 0 }
}



