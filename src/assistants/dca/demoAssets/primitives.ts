/**
 * Primitive Helper Functions for Demo Assets
 * 
 * Low-level utilities for converting values, applying styles, and configuring
 * Figma node properties.
 */

import type { RGB, Paint } from './tokens'
import type { TextStyle } from './textStyles'

/**
 * Convert hex color string to RGB
 * Example: "#334052" -> { r: 0.2, g: 0.25, b: 0.32 }
 */
export function hexToRgb(hex: string): RGB {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  if (!result) {
    throw new Error(`Invalid hex color: ${hex}`)
  }
  return {
    r: parseInt(result[1], 16) / 255,
    g: parseInt(result[2], 16) / 255,
    b: parseInt(result[3], 16) / 255
  }
}

/**
 * Convert RGB to Figma Paint
 */
export function rgbToPaint(rgb: RGB, opacity?: number): Paint {
  return {
    type: 'SOLID',
    color: rgb,
    ...(opacity !== undefined && { opacity })
  }
}

/**
 * Convert hex string to Figma Paint
 */
export function hexToPaint(hex: string, opacity?: number): Paint {
  return rgbToPaint(hexToRgb(hex), opacity)
}

/**
 * Apply auto-layout configuration to a frame
 */
export function applyAutoLayout(
  frame: FrameNode,
  options: {
    direction?: 'HORIZONTAL' | 'VERTICAL'
    padding?: number | { top: number; right: number; bottom: number; left: number }
    itemSpacing?: number
    primaryAxisSizingMode?: 'FIXED' | 'AUTO'
    counterAxisSizingMode?: 'FIXED' | 'AUTO'
  }
): void {
  if (options.direction) {
    frame.layoutMode = options.direction
  }
  if (options.primaryAxisSizingMode) {
    frame.primaryAxisSizingMode = options.primaryAxisSizingMode
  }
  if (options.counterAxisSizingMode) {
    frame.counterAxisSizingMode = options.counterAxisSizingMode
  }
  if (options.itemSpacing !== undefined) {
    frame.itemSpacing = options.itemSpacing
  }
  if (options.padding !== undefined) {
    if (typeof options.padding === 'number') {
      frame.paddingTop = options.padding
      frame.paddingRight = options.padding
      frame.paddingBottom = options.padding
      frame.paddingLeft = options.padding
    } else {
      frame.paddingTop = options.padding.top
      frame.paddingRight = options.padding.right
      frame.paddingBottom = options.padding.bottom
      frame.paddingLeft = options.padding.left
    }
  }
}

/**
 * Set dashed stroke on a node
 */
export function setDashedStroke(
  node: GeometryMixin,
  options: {
    color: RGB
    weight: number
    dashPattern?: number[]
  }
): void {
  node.strokes = [rgbToPaint(options.color)]
  node.strokeWeight = options.weight
  if (options.dashPattern) {
    node.dashPattern = options.dashPattern
  }
}

/**
 * Apply a text style to a text node
 * Note: Font must be loaded before calling this (use ensureFontsLoaded)
 */
export async function setTextStyle(
  node: TextNode,
  style: TextStyle
): Promise<void> {
  node.fontName = {
    family: style.fontFamily,
    style: style.fontWeight
  }
  node.fontSize = style.fontSize
  node.fills = [rgbToPaint(style.color)]
  
  if (style.lineHeight) {
    if (style.lineHeight.unit === 'AUTO') {
      node.lineHeight = { unit: 'AUTO' }
    } else if (style.lineHeight.unit === 'PIXELS' && style.lineHeight.value !== undefined) {
      node.lineHeight = { unit: 'PIXELS', value: style.lineHeight.value }
    }
  }
}

/**
 * Ensure fonts are loaded (call before creating text nodes)
 */
const loadedFonts = new Set<string>()

export async function ensureFontsLoaded(fontFamily: string, styles: string[]): Promise<void> {
  for (const style of styles) {
    const key = `${fontFamily}:${style}`
    if (!loadedFonts.has(key)) {
      await figma.loadFontAsync({ family: fontFamily, style })
      loadedFonts.add(key)
    }
  }
}
