/**
 * Types for the dark demo card JSON spec.
 * Used by the renderer; structure matches the generated DARK_DEMO_CARDS.
 */

export interface RGB {
  r: number
  g: number
  b: number
}

export interface SolidPaint {
  type: 'SOLID'
  color: RGB
}

export interface LayoutSpec {
  mode: 'VERTICAL' | 'HORIZONTAL'
  padding?: { top: number; right: number; bottom: number; left: number }
  itemSpacing?: number
  sizing?: { primary?: 'AUTO' | 'FIXED'; counter?: 'AUTO' | 'FIXED' }
  align?: 'STRETCH' | 'MIN' | 'CENTER' | 'MAX'
}

export interface VisualSpec {
  fills?: SolidPaint[]
  strokes?: SolidPaint[]
  strokeWeight?: number
  strokeAlign?: 'INSIDE' | 'OUTSIDE' | 'CENTER'
  cornerRadius?: number
  dashPattern?: number[]
}

export interface TextSpec {
  characters: string
  fontFamily: string
  fontStyle: string
  fontSize: number
  lineHeight?: { unit: 'AUTO' | 'PIXELS'; value?: number }
  letterSpacing?: { unit: string; value?: number }
  textAlignHorizontal?: 'LEFT' | 'CENTER' | 'RIGHT' | 'JUSTIFIED'
  textAlignVertical?: 'TOP' | 'CENTER' | 'BOTTOM'
  textCase?: string
}

export interface DarkDemoNodeSpec {
  type: 'FRAME' | 'TEXT' | 'RECTANGLE' | 'ELLIPSE'
  name: string
  layout?: LayoutSpec
  width?: number
  height?: number
  visual?: VisualSpec
  children?: DarkDemoNodeSpec[]
  text?: TextSpec
}

export type DarkDemoCardSpec = DarkDemoNodeSpec
