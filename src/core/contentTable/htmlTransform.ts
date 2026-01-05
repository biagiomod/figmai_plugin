/**
 * HTML Table Conversion
 * Converts Universal Content Table to HTML and back
 * 
 * Uses renderers.ts as the single source of truth for table generation
 */

import type { UniversalContentTableV1, TableFormatPreset } from './types'
import { universalTableToHtml } from './renderers'

/**
 * Convert Universal Content Table to HTML table
 * For View Table UI: returns just the table HTML
 * For clipboard: uses the same renderer (consistent column set)
 */
export function toHtmlTable(
  universalJson: UniversalContentTableV1,
  preset: TableFormatPreset,
  options?: { forView?: boolean }
): string {
  // Use the same renderer as clipboard copy (ensures consistency)
  const { html } = universalTableToHtml(universalJson, preset)
  
  // For in-plugin view, return just the table HTML
  // For clipboard copy, the renderer already returns just the table
  return html
}

/**
 * Extract Universal Content Table from HTML
 */
export function fromHtmlTable(html: string): UniversalContentTableV1 | null {
  // Try to extract JSON from script tag
  const scriptMatch = html.match(/<script[^>]*type=["']application\/json["'][^>]*id=["']universal-content-json["'][^>]*>([\s\S]*?)<\/script>/i)
  
  if (scriptMatch && scriptMatch[1]) {
    try {
      const json = JSON.parse(scriptMatch[1].trim())
      // Validate it's a UniversalContentTableV1
      if (json.type === 'universal-content-table' && json.version === 1) {
        return json as UniversalContentTableV1
      }
    } catch (error) {
      console.error('Failed to parse embedded JSON:', error)
    }
  }
  
  return null
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  // Simple HTML escaping (works in both browser and Node-like environments)
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

