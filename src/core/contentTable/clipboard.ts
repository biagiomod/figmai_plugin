/**
 * Clipboard Format Builders
 * Re-exports from renderers.ts for backward compatibility
 * 
 * @deprecated Use renderers.ts directly for new code
 */

import type { UniversalContentTableV1, TableFormatPreset } from './types'
import { universalTableToHtml, universalTableToTsv, universalTableToJson } from './renderers'

/**
 * Build standards-compliant HTML table with minimal inline styles
 * Optimized for paste fidelity in Word, Notes, Confluence
 * 
 * @deprecated Use universalTableToHtml from renderers.ts
 */
export function buildHtmlTable(
  universalJson: UniversalContentTableV1,
  preset: TableFormatPreset
): string {
  return universalTableToHtml(universalJson, preset).html
}

/**
 * Build TSV (tab-separated values) format
 * Optimized for paste into spreadsheet applications
 * 
 * @deprecated Use universalTableToTsv from renderers.ts
 */
export function buildTsv(
  universalJson: UniversalContentTableV1,
  preset: TableFormatPreset
): string {
  return universalTableToTsv(universalJson, preset)
}

/**
 * Build JSON format
 * Returns the Universal Content Table as formatted JSON string
 * 
 * @deprecated Use universalTableToJson from renderers.ts
 */
export function buildJson(
  universalJson: UniversalContentTableV1
): string {
  return universalTableToJson(universalJson)
}

