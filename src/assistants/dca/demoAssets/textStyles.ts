/**
 * Text Style Definitions for Demo Assets
 * 
 * Named text styles that map typography specifications to Figma text node properties.
 * Each style defines fontFamily, fontSize, fontWeight, and color.
 * 
 * Line height: Uses Figma AUTO (unit: "AUTO") for "normal" line-height unless
 * explicitly overridden with a fixed pixel value.
 */

import type { RGB } from './tokens'
import { colors, fonts } from './tokens'

export interface TextStyle {
  fontFamily: string
  fontSize: number
  fontWeight: 'Regular' | 'Bold' | 'Medium' | 'SemiBold'
  color: RGB
  lineHeight?: { unit: 'AUTO' | 'PIXELS'; value?: number }
}

/**
 * Text style definitions
 */
export const textStyles = {
  // Badge text
  badgeLabel: {
    fontFamily: fonts.inter,
    fontSize: 11,
    fontWeight: 'Bold' as const,
    color: colors.textBadge,
    lineHeight: { unit: 'AUTO' as const }
  } as TextStyle,

  // Titles
  title16Bold: {
    fontFamily: fonts.inter,
    fontSize: 16,
    fontWeight: 'Bold' as const,
    color: colors.textPrimary,
    lineHeight: { unit: 'AUTO' as const }
  } as TextStyle,

  title14Bold: {
    fontFamily: fonts.inter,
    fontSize: 14,
    fontWeight: 'Bold' as const,
    color: colors.textPrimary,
    lineHeight: { unit: 'AUTO' as const }
  } as TextStyle,

  // Body text
  body13Bold: {
    fontFamily: fonts.inter,
    fontSize: 13,
    fontWeight: 'Bold' as const,
    color: colors.textPrimary,
    lineHeight: { unit: 'AUTO' as const }
  } as TextStyle,

  body12Regular: {
    fontFamily: fonts.inter,
    fontSize: 12,
    fontWeight: 'Regular' as const,
    color: colors.textPrimary,
    lineHeight: { unit: 'AUTO' as const }
  } as TextStyle,

  body12Bold: {
    fontFamily: fonts.inter,
    fontSize: 12,
    fontWeight: 'Bold' as const,
    color: colors.textPrimary,
    lineHeight: { unit: 'AUTO' as const }
  } as TextStyle,

  // Helper/secondary text
  helper11Regular: {
    fontFamily: fonts.inter,
    fontSize: 11,
    fontWeight: 'Regular' as const,
    color: colors.textSecondary,
    lineHeight: { unit: 'AUTO' as const }
  } as TextStyle,

  helper10Regular: {
    fontFamily: fonts.inter,
    fontSize: 10,
    fontWeight: 'Regular' as const,
    color: colors.textTertiary,
    lineHeight: { unit: 'AUTO' as const }
  } as TextStyle,

  // Button labels
  buttonLabel: {
    fontFamily: fonts.inter,
    fontSize: 12,
    fontWeight: 'Bold' as const,
    color: colors.textOnPrimary,
    lineHeight: { unit: 'AUTO' as const }
  } as TextStyle,

  buttonLabelSecondary: {
    fontFamily: fonts.inter,
    fontSize: 12,
    fontWeight: 'Bold' as const,
    color: colors.textPrimary,
    lineHeight: { unit: 'AUTO' as const }
  } as TextStyle,

  // Status/urgency text
  urgency14Bold: {
    fontFamily: fonts.inter,
    fontSize: 14,
    fontWeight: 'Bold' as const,
    color: colors.error,
    lineHeight: { unit: 'AUTO' as const }
  } as TextStyle,

  urgency12Bold: {
    fontFamily: fonts.inter,
    fontSize: 12,
    fontWeight: 'Bold' as const,
    color: colors.error,
    lineHeight: { unit: 'AUTO' as const }
  } as TextStyle
} as const

/**
 * Type for text style keys
 */
export type TextStyleKey = keyof typeof textStyles
