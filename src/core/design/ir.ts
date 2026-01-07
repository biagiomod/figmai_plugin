/**
 * DesignSpec Intermediate Representation (IR)
 * Unified format for generating Figma nodes from JSON specs
 */

export interface DesignSpec {
  version: number
  root: DesignNode
}

export type DesignNode =
  | FrameSpec
  | TextSpec
  | RectangleSpec
  | ImageSpec
  | ComponentInstanceSpec

export interface FrameSpec {
  type: 'frame'
  name?: string
  width: number
  height: number
  layout?: LayoutSpec
  padding?: PaddingSpec
  gap?: number
  fills?: FillSpec[]
  strokes?: StrokeSpec[]
  cornerRadius?: number
  children?: DesignNode[]
}

export interface TextSpec {
  type: 'text'
  name?: string
  text: string
  fontSize?: number
  fontName?: { family: string; style: string }
  fontWeight?: number
  fills?: FillSpec[]
  lineHeight?: number | { value: number; unit: 'PIXELS' | 'PERCENT' }
  letterSpacing?: { value: number; unit: 'PIXELS' | 'PERCENT' }
  textAlign?: 'LEFT' | 'CENTER' | 'RIGHT' | 'JUSTIFIED'
}

export interface RectangleSpec {
  type: 'rect'
  name?: string
  width: number
  height: number
  fills?: FillSpec[]
  strokes?: StrokeSpec[]
  cornerRadius?: number
}

export interface ImageSpec {
  type: 'image'
  name?: string
  width: number
  height: number
  imageHash?: string
  imageBytesBase64?: string
}

export interface ComponentInstanceSpec {
  type: 'instance'
  componentKey: string
  overrides?: Record<string, unknown>
}

export type LayoutSpec =
  | { mode: 'none' }
  | {
      mode: 'auto'
      direction: 'horizontal' | 'vertical'
      primaryAlign?: 'MIN' | 'CENTER' | 'MAX' | 'SPACE_BETWEEN'
      counterAlign?: 'MIN' | 'CENTER' | 'MAX' | 'BASELINE'
      wrap?: boolean
      sizing?: {
        primaryAxis?: 'FIXED' | 'AUTO' | 'FILL'
        counterAxis?: 'FIXED' | 'AUTO' | 'FILL'
      }
    }

export interface PaddingSpec {
  top?: number
  right?: number
  bottom?: number
  left?: number
  all?: number
}

export interface FillSpec {
  type: 'SOLID'
  color: { r: number; g: number; b: number }
  opacity?: number
}

export interface StrokeSpec {
  type: 'SOLID'
  color: { r: number; g: number; b: number }
  opacity?: number
}

