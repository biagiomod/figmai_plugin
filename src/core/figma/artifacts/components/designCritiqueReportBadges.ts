/**
 * Design Critique Report Badges
 * Shared badge/tag components for the deceptive report. Matches the historical styling reference.
 * Badge text is HUG width (never FILL); do not call setTextFillAndHug on any badge text.
 */

import { createTextNode } from '../../../stage/primitives'

export type OverallSeverity = 'High' | 'Medium' | 'Low' | 'Pass'
export type FindingSeverity = 'High' | 'Medium' | 'Low'

export interface Fonts {
  regular: FontName
  bold: FontName
}

// Reference: Overall severity — fill = solid severity color, text = white (Low uses dark text)
const OVERALL_FILL: Record<OverallSeverity, { r: number; g: number; b: number }> = {
  High: { r: 1, g: 0, b: 0 },
  Medium: { r: 1, g: 0.38333332538604736, b: 0 },
  Low: { r: 1, g: 0.7038756012916565, b: 0.2275014966726303 },
  Pass: { r: 0.20000000298023224, g: 0.6000000238418579, b: 0.30000001192092896 }
}
const OVERALL_TEXT: Record<OverallSeverity, { r: number; g: number; b: number }> = {
  High: { r: 1, g: 1, b: 1 },
  Medium: { r: 1, g: 1, b: 1 },
  Low: { r: 0.36012619733810425, g: 0.22207783162593842, b: 0 },
  Pass: { r: 1, g: 1, b: 1 }
}

// Dimension tag: pass = green; fail = severity color (High/Medium/Low)
const DIMENSION_PASS_FILL = { r: 0.20000000298023224, g: 0.6000000238418579, b: 0.30000001192092896 }
const DIMENSION_FAIL_FILL: Record<FindingSeverity, { r: number; g: number; b: number }> = {
  High: { r: 1, g: 0, b: 0 },
  Medium: { r: 1, g: 0.38333332538604736, b: 0 },
  Low: { r: 1, g: 0.7038756012916565, b: 0.2275014966726303 }
}
const DIMENSION_TEXT_COLOR = { r: 1, g: 1, b: 1 }
const DIMENSION_INDICATOR_PASS = { r: 1, g: 1, b: 1 }
const DIMENSION_INDICATOR_FAIL = { r: 1, g: 1, b: 1 }

// Finding severity tag: same fill as overall; Low uses dark text
const FINDING_FILL: Record<FindingSeverity, { r: number; g: number; b: number }> = {
  High: { r: 1, g: 0, b: 0 },
  Medium: { r: 1, g: 0.38333332538604736, b: 0 },
  Low: { r: 1, g: 0.7038756012916565, b: 0.2275014966726303 }
}
const FINDING_TEXT: Record<FindingSeverity, { r: number; g: number; b: number }> = {
  High: { r: 1, g: 1, b: 1 },
  Medium: { r: 1, g: 1, b: 1 },
  Low: { r: 0.36012619733810425, g: 0.22207783162593842, b: 0 }
}

/**
 * Overall severity badge (top of report). Reference: padding 6/12/6/12, itemSpacing 6, cornerRadius 8.
 * Badge text: HUG only (do not set FILL).
 */
export async function createOverallSeverityBadge(
  severity: OverallSeverity,
  fonts: Fonts
): Promise<FrameNode> {
  const frame = figma.createFrame()
  frame.name = `Severity Badge - ${severity}`
  frame.layoutMode = 'HORIZONTAL'
  frame.primaryAxisSizingMode = 'AUTO'
  frame.counterAxisSizingMode = 'AUTO'
  frame.paddingTop = 6
  frame.paddingRight = 12
  frame.paddingBottom = 6
  frame.paddingLeft = 12
  frame.itemSpacing = 6
  frame.cornerRadius = 8
  frame.strokeWeight = 1
  frame.strokeAlign = 'INSIDE'

  const fill = OVERALL_FILL[severity]
  const textColor = OVERALL_TEXT[severity]
  frame.fills = [{ type: 'SOLID', color: fill }]
  frame.strokes = [{ type: 'SOLID', color: fill, opacity: 1 }]

  const label = severity === 'Pass' ? 'Pass!' : `Severity: ${severity}`
  const text = await createTextNode(label, {
    fontSize: 12,
    fontName: fonts.bold,
    fills: [{ type: 'SOLID', color: textColor }]
  })
  frame.appendChild(text)
  text.textAutoResize = 'HEIGHT'
  // Do not set layoutSizingHorizontal = FILL; badge text stays HUG

  return frame
}

/**
 * Dimension tag (Dimensions Checked section). Reference: padding 2/8/2/8, itemSpacing 6, cornerRadius 8.
 * Indicator ✓/✗ 16px Bold, dimension name 13px Bold. Badge text: HUG only.
 */
export async function createDimensionTag(
  dimensionName: string,
  status: 'pass' | 'fail',
  fonts: Fonts,
  severityForFail?: FindingSeverity
): Promise<FrameNode> {
  const frame = figma.createFrame()
  frame.name = `Dimension: ${dimensionName}`
  frame.layoutMode = 'HORIZONTAL'
  frame.primaryAxisSizingMode = 'AUTO'
  frame.counterAxisSizingMode = 'AUTO'
  frame.paddingTop = 2
  frame.paddingRight = 8
  frame.paddingBottom = 2
  frame.paddingLeft = 8
  frame.itemSpacing = 6
  frame.cornerRadius = 8
  frame.strokeWeight = 1
  frame.strokeAlign = 'INSIDE'

  // Failed dimension with no matching finding: default to Medium (do not assume High).
  const fill = status === 'pass'
    ? DIMENSION_PASS_FILL
    : DIMENSION_FAIL_FILL[severityForFail ?? 'Medium']
  frame.fills = [{ type: 'SOLID', color: fill }]

  const indicatorText = status === 'pass' ? '✓' : '✗'
  const indicatorColor = status === 'pass' ? DIMENSION_INDICATOR_PASS : DIMENSION_INDICATOR_FAIL
  const indicator = await createTextNode(indicatorText, {
    fontSize: 16,
    fontName: fonts.bold,
    fills: [{ type: 'SOLID', color: indicatorColor }]
  })
  frame.appendChild(indicator)
  indicator.textAutoResize = 'HEIGHT'

  const label = await createTextNode(dimensionName, {
    fontSize: 13,
    fontName: fonts.bold,
    fills: [{ type: 'SOLID', color: DIMENSION_TEXT_COLOR }]
  })
  frame.appendChild(label)
  label.textAutoResize = 'HEIGHT'

  return frame
}

/**
 * Finding severity tag (small tag in findings). Reference: padding 4/8/4/8, itemSpacing 0, cornerRadius 8, 11px Bold.
 * Badge text: HUG only.
 */
export async function createFindingSeverityTag(
  severity: FindingSeverity,
  fonts: Fonts
): Promise<FrameNode> {
  const frame = figma.createFrame()
  frame.name = `Severity - ${severity}`
  frame.layoutMode = 'HORIZONTAL'
  frame.primaryAxisSizingMode = 'AUTO'
  frame.counterAxisSizingMode = 'AUTO'
  frame.paddingTop = 4
  frame.paddingRight = 8
  frame.paddingBottom = 4
  frame.paddingLeft = 8
  frame.itemSpacing = 0
  frame.cornerRadius = 8
  frame.strokeWeight = 1
  frame.strokeAlign = 'INSIDE'

  const fill = FINDING_FILL[severity]
  const textColor = FINDING_TEXT[severity]
  frame.fills = [{ type: 'SOLID', color: fill }]

  const text = await createTextNode(severity, {
    fontSize: 11,
    fontName: fonts.bold,
    fills: [{ type: 'SOLID', color: textColor }]
  })
  frame.appendChild(text)
  text.textAutoResize = 'HEIGHT'

  return frame
}
