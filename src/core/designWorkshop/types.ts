/**
 * Design Workshop Types
 * Type definitions for DesignSpecV1 schema
 */

/**
 * Design Intent
 * Structured representation of user intent extracted from natural language
 */
export interface DesignIntent {
  /** App type/genre (e.g., "game", "fintech", "mindfulness", "dashboard") */
  appType?: string
  /** Tone/mood (e.g., "playful", "serious", "calm") */
  tone?: string
  /** Style keywords (e.g., "fun", "minimalist", "bold") */
  keywords?: string[]
  /** Primary color hint (hex or semantic name) */
  primaryColor?: string
  /** Accent colors (hex or semantic names) */
  accentColors?: string[]
  /** Colors to avoid */
  avoidColors?: string[]
  /** Theme preference (light/dark) */
  theme?: "light" | "dark"
  /** Fidelity preference */
  fidelity?: "wireframe" | "medium" | "hi" | "creative"
  /** Layout density */
  density?: "compact" | "comfortable" | "spacious"
  /** Screen archetypes requested (e.g., "onboarding", "home", "profile") */
  screenArchetypes?: string[]
}

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
    /** Raw user request for traceability */
    userRequest?: string
    /** Extracted design intent */
    intent?: DesignIntent
    /** Run identifier for observability */
    runId?: string
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

/**
 * Render Report
 * Tracks which schema fields were consumed, unused, or triggered fallbacks during rendering
 */
export interface RenderReport {
  /** Fields that were consumed and influenced rendering */
  consumedFields: Array<{
    field: string
    value: unknown
    influence: string // e.g., "render.intent.fidelity=hi → applied HiFidelityStylesetA"
  }>
  /** Fields that were present but not used */
  unusedFields: Array<{
    field: string
    value: unknown
    reason?: string // e.g., "only one accent color supported in current palette"
  }>
  /** Fallbacks that were triggered */
  fallbacks: Array<{
    field: string
    fallback: string // e.g., "default color palette", "default typography"
  }>
}
