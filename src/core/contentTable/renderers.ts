/**
 * Content Table Renderers
 * Single Source of Truth for converting UniversalContentTableV1 to various formats
 * 
 * All outputs (HTML, TSV, JSON) are generated from the same UniversalContentTableV1 JSON
 * to prevent drift and ensure consistency.
 * 
 * Column definitions are generated from content-models.md via presets.generated.ts
 */

import type { UniversalContentTableV1, TableFormatPreset } from './types'
import { PRESET_COLUMNS, type ColumnDef } from './presets.generated'

/**
 * Get column definitions for a preset
 * Falls back to universal if preset not implemented or has no columns
 */
function getColumnsForPreset(preset: TableFormatPreset): ColumnDef[] {
  const columns = PRESET_COLUMNS[preset]
  if (!columns || columns.length === 0) {
    // Fallback to universal for unimplemented presets
    return PRESET_COLUMNS.universal
  }
  return columns
}

/**
 * Escape HTML special characters
 */
function escapeHtml(text: string): string {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

/**
 * Convert Universal Content Table to HTML table
 * Returns both HTML table and plain text fallback
 */
export function universalTableToHtml(
  universalTable: UniversalContentTableV1,
  preset: TableFormatPreset
): { html: string; plainText: string } {
  const columns = getColumnsForPreset(preset)
  const headers = columns.map(col => col.label)
  
  // Build rows
  const rows: string[][] = []
  for (const item of universalTable.items) {
    rows.push(columns.map(col => col.extract(item)))
  }
  
  // Build HTML table with minimal inline styles
  // Format optimized for Word, Apple Notes, and Confluence
  let html = '<table style="border-collapse: collapse; width: 100%; font-size: 12px;">'
  
  // Header row
  html += '<thead><tr>'
  for (const header of headers) {
    html += `<th style="border: 1px solid #000000; padding: 6px 8px; vertical-align: top; font-weight: 600; background-color: #f0f0f0;">${escapeHtml(header)}</th>`
  }
  html += '</tr></thead>'
  
  // Body rows
  html += '<tbody>'
  for (const row of rows) {
    html += '<tr>'
    for (const cell of row) {
      // Escape cell content and preserve newlines as <br>
      const cellStr = String(cell || '')
      const escapedCell = escapeHtml(cellStr).replace(/\n/g, '<br>')
      html += `<td style="border: 1px solid #000000; padding: 6px 8px; vertical-align: top;">${escapedCell}</td>`
    }
    html += '</tr>'
  }
  html += '</tbody></table>'
  
  // Build plain text fallback (tab-separated for better paste compatibility)
  const plainText = headers.join('\t') + '\n' + rows.map(row => row.join('\t')).join('\n')
  
  return { html, plainText }
}

/**
 * Convert Universal Content Table to TSV (tab-separated values)
 */
export function universalTableToTsv(
  universalTable: UniversalContentTableV1,
  preset: TableFormatPreset
): string {
  const columns = getColumnsForPreset(preset)
  const headers = columns.map(col => col.label)
  
  // Build rows
  const rows: string[][] = []
  for (const item of universalTable.items) {
    rows.push(
      columns.map(col => {
        const value = col.extract(item)
        // Replace tabs and newlines in TSV to prevent breaking the format
        return value.replace(/\t/g, ' ').replace(/\n/g, ' ')
      })
    )
  }
  
  // Build TSV
  let tsv = headers.join('\t') + '\n'
  for (const row of rows) {
    tsv += row.join('\t') + '\n'
  }
  
  return tsv.trim()
}

/**
 * Convert Universal Content Table to JSON
 * Returns the exact JSON.stringify output
 */
export function universalTableToJson(
  universalTable: UniversalContentTableV1
): string {
  return JSON.stringify(universalTable, null, 2)
}

