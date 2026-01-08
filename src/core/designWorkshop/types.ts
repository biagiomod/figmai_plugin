/**
 * Design Workshop Types
 * Type definitions for DesignSpecV1 schema
 */

/**
 * Design Specification V1
 * Strict JSON schema for generating Figma screens
 */
export interface DesignSpecV1 {
  type: "designScreens"
  version: 1
  meta: {
    title: string
    truncationNotice?: string
  }
  canvas: {
    device: {
      kind: "mobile" | "tablet" | "desktop"
      width: number
      height: number
      platform?: "ios" | "android" | "web" | "windows" | "macos"
    }
  }
  render: {
    intent: {
      fidelity: "wireframe" | "medium" | "hi" | "creative"
      styleKeywords?: string[]
      brandTone?: string
      density?: "compact" | "comfortable" | "spacious"
    }
  }
  screens: Array<{
    name: string
    layout?: {
      direction?: "vertical" | "horizontal"
      padding?: number | { top?: number; right?: number; bottom?: number; left?: number }
      gap?: number
    }
    blocks: Array<BlockSpec>
  }>
}

/**
 * Block Specification
 * Minimal set of block types for rendering screens
 */
export type BlockSpec = 
  | { type: "heading"; text: string; level?: 1 | 2 | 3 }
  | { type: "bodyText"; text: string }
  | { type: "button"; text: string; variant?: "primary" | "secondary" | "tertiary" }
  | { type: "input"; label?: string; placeholder?: string; inputType?: "text" | "email" | "password" }
  | { type: "card"; title?: string; content: string }
  | { type: "spacer"; height?: number }
  | { type: "image"; src?: string; alt?: string; width?: number; height?: number }
