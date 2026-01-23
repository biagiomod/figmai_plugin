/**
 * Design Tokens for Demo Assets
 * 
 * Centralized design tokens (colors, spacing, radii, stroke weights) used
 * for building deterministic demo screens.
 */

export interface RGB {
  r: number
  g: number
  b: number
}

export interface Paint {
  type: 'SOLID'
  color: RGB
  opacity?: number
}

/**
 * Color palette
 */
export const colors = {
  // Text colors
  textPrimary: { r: 0.1, g: 0.1, b: 0.1 } as RGB,
  textSecondary: { r: 0.35, g: 0.35, b: 0.35 } as RGB,
  textTertiary: { r: 0.45, g: 0.45, b: 0.45 } as RGB,
  textMuted: { r: 0.5, g: 0.5, b: 0.5 } as RGB,
  textOnPrimary: { r: 1, g: 1, b: 1 } as RGB,
  textBadge: { r: 0.2, g: 0.25, b: 0.32 } as RGB,

  // Background colors
  bgWhite: { r: 1, g: 1, b: 1 } as RGB,
  bgLight: { r: 0.98, g: 0.98, b: 0.98 } as RGB,
  bgLighter: { r: 0.97, g: 0.97, b: 0.97 } as RGB,
  bgLightest: { r: 0.95, g: 0.95, b: 0.95 } as RGB,
  bgBadge: { r: 0.93, g: 0.95, b: 0.98 } as RGB,
  bgBanner: { r: 0.95, g: 0.96, b: 1 } as RGB,
  bgBannerAlt: { r: 0.97, g: 0.97, b: 1 } as RGB,
  bgWarning: { r: 1, g: 0.99, b: 0.95 } as RGB,

  // Interactive colors
  primary: { r: 0.16, g: 0.49, b: 0.98 } as RGB,
  primaryHover: { r: 0.14, g: 0.44, b: 0.88 } as RGB,
  secondary: { r: 0.9, g: 0.9, b: 0.92 } as RGB,
  ghost: { r: 0.95, g: 0.95, b: 0.95 } as RGB,

  // Border colors
  borderLight: { r: 0.8, g: 0.8, b: 0.8 } as RGB,
  borderMedium: { r: 0.75, g: 0.77, b: 0.8 } as RGB,
  borderDark: { r: 0.5, g: 0.5, b: 0.5 } as RGB,

  // Status colors
  error: { r: 0.8, g: 0.2, b: 0.2 } as RGB,
  success: { r: 0.2, g: 0.6, b: 0.3 } as RGB
} as const

/**
 * Spacing scale (in pixels)
 */
export const spacing = {
  xs: 4,
  sm: 6,
  md: 8,
  lg: 10,
  xl: 12,
  '2xl': 14,
  '3xl': 16,
  '4xl': 20,
  '5xl': 24,
  '6xl': 40
} as const

/**
 * Border radius (in pixels)
 */
export const radii = {
  none: 0,
  sm: 3,
  md: 6,
  lg: 8,
  xl: 12,
  '2xl': 16
} as const

/**
 * Stroke weights (in pixels)
 */
export const strokes = {
  none: 0,
  thin: 1,
  medium: 2,
  thick: 3
} as const

/**
 * Font families
 */
export const fonts = {
  inter: 'Inter'
} as const
