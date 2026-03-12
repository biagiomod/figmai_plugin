/**
 * Theme Packs — shared type definitions.
 *
 * A "Theme Pack" is the canonical abstraction for both Skins (tokens-only)
 * and Design Systems (tokens + components + docs).  Both map to the
 * existing UI taxonomy (ElementKind) and Content taxonomy (ContentKind).
 *
 * M1 ships tokens + skin metadata only.  DS integration (M3) and taxonomy
 * mapping (M4) are stubbed here but not yet consumed.
 */

// Re-export taxonomy kinds so consumers don't need a second import
import type { ElementKind, ContentKind } from '../detection/smartDetector/types'
export type { ElementKind, ContentKind }

// ---------------------------------------------------------------------------
// Token sets
// ---------------------------------------------------------------------------

export interface TokenSet {
  /** CSS custom-property name (without `--`) → value.  e.g. { bg: '#0d0d0d' } */
  color: Record<string, string>
  typography?: Record<string, string | number>
  spacing?: Record<string, string>
  radius?: Record<string, string>
  shadow?: Record<string, string>
  transition?: Record<string, string>
}

// ---------------------------------------------------------------------------
// Taxonomy mappings (M4 — stubbed)
// ---------------------------------------------------------------------------

export interface ElementTokenOverrides {
  bgColor?: string
  fgColor?: string
  borderColor?: string
  borderRadius?: string
  fontWeight?: string
  componentKey?: string
}

export interface ContentTokenOverrides {
  fontFamily?: string
  fontSize?: string
  fontWeight?: string
  color?: string
  lineHeight?: string
}

export interface TaxonomyMapping {
  ui?: Partial<Record<ElementKind, ElementTokenOverrides>>
  content?: Partial<Record<ContentKind, ContentTokenOverrides>>
}

export interface UnmappedReport {
  unmappedElementKinds: ElementKind[]
  unmappedContentKinds: ContentKind[]
  coverage: { ui: number; content: number }
}

// ---------------------------------------------------------------------------
// Theme Pack
// ---------------------------------------------------------------------------

export type ThemePackType = 'skin' | 'designSystem'

export interface ThemePack {
  id: string
  name: string
  version: string
  type: ThemePackType
  tokens: TokenSet
  taxonomyMapping?: TaxonomyMapping
  /** Only populated for type === 'designSystem' (M3). */
  components?: unknown[]
  documentation?: string
}

export type SkinPack = ThemePack & { type: 'skin'; components?: never }
