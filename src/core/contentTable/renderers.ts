/**
 * Content Table Renderers
 * Single Source of Truth for converting UniversalContentTableV1 to various formats
 * 
 * All outputs (HTML, TSV, JSON) are generated from the same UniversalContentTableV1 JSON
 * to prevent drift and ensure consistency.
 * 
 * Column definitions are generated from docs/content-models.md via presets.generated.ts
 */

import type { UniversalContentTableV1, TableFormatPreset, ContentItemV1 } from './types'
import { PRESET_COLUMNS, type ColumnDef } from './presets.generated'

/**
 * Get column definitions for a preset
 * Falls back to universal if preset not implemented or has no columns
 */
function getColumnsForPreset(preset: TableFormatPreset): ColumnDef[] {
  const columns = PRESET_COLUMNS[preset]
  if (!columns || columns.length === 0) {
    // Fallback to universal for unimplemented presets
    return PRESET_COLUMNS['universal']
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
 * Render meta row as HTML (Row 1)
 * Cell 1: Thumbnail image wrapped in link
 * Cell 2: Metadata chips (inline) - spans remaining columns
 */
function renderMetaRowHtml(meta: UniversalContentTableV1['meta'], columnCount: number): string {
  const thumbnailHtml = meta.thumbnailDataUrl
    ? `<img src="${escapeHtml(meta.thumbnailDataUrl)}" alt="Preview" style="width: 100px; height: auto; display: block;" />`
    : '<span style="color: #999;">No preview</span>'
  
  const thumbnailCell = `<td style="border: 1px solid #ddd; padding: 8px; vertical-align: top; width: 100px; background-color: #ffffff;">
    <a href="${escapeHtml(meta.rootNodeUrl)}" target="_blank" rel="noopener noreferrer" style="color: #0066ff; text-decoration: underline;">
      ${thumbnailHtml}
    </a>
  </td>`
  
  const metadataChips = [
    `Content Model: ${escapeHtml(meta.contentModel)}`,
    `Content Stage: ${escapeHtml(meta.contentStage)}`,
    `ADA: ${escapeHtml(meta.adaStatus)}`,
    `Legal: ${escapeHtml(meta.legalStatus)}`,
    `Last Updated: ${escapeHtml(new Date(meta.lastUpdated).toLocaleString())}`,
    `Version: ${escapeHtml(meta.version)}`
  ].join(' • ')
  
  // Cell 2 spans the remaining columns (columnCount - 1)
  const colSpan = columnCount - 1
  const metadataCell = `<td colspan="${colSpan}" style="border: 1px solid #ddd; padding: 8px; vertical-align: top; background-color: #ffffff; color: #000000;">
    <div style="font-size: 12px; line-height: 1.6; color: #000000;">
      ${metadataChips}
    </div>
  </td>`
  
  return `<tr>${thumbnailCell}${metadataCell}</tr>`
}

/**
 * Render "Figma Ref" column value as "View Element" hyperlink
 */
function renderFigmaRef(value: string): string {
  if (!value) return ''
  return `<a href="${escapeHtml(value)}" target="_blank" rel="noopener noreferrer" style="color: #0066ff; text-decoration: underline;">View Element</a>`
}

/**
 * Convert Universal Content Table to HTML table
 * Returns both HTML table and plain text fallback
 *
 * @param itemsOverride — when provided, used instead of universalTable.items
 *   so the export reflects session edits/deletions.
 */
export function universalTableToHtml(
  universalTable: UniversalContentTableV1,
  preset: TableFormatPreset,
  itemsOverride?: ContentItemV1[]
): { html: string; plainText: string } {
  const columns = getColumnsForPreset(preset)
  const headers = columns.map(col => col.label)
  const items = itemsOverride ?? universalTable.items

  // Build rows using preset column extractors (single source of truth)
  const rows: string[][] = []
  for (const item of items) {
    rows.push(columns.map(col => col.extract(item)))
  }
  
  // Build HTML table with minimal inline styles
  // Format optimized for Word, Apple Notes, and Confluence
  // Force light mode styling: white background, black text (tables are document artifacts, not UI chrome)
  let html = '<table style="border-collapse: collapse; width: 100%; font-size: 12px; background-color: #ffffff; color: #000000;">'
  
  // <thead> containing meta row (if exists) and header row
  html += '<thead>'
  
  // Row 1: Meta row (only if meta exists)
  if (universalTable.meta) {
    html += renderMetaRowHtml(universalTable.meta, columns.length)
  }
  
  // Row 2: Header labels row
  html += '<tr>'
  for (const header of headers) {
    html += `<th style="border: 1px solid #000000; padding: 6px 8px; vertical-align: top; font-weight: 600; background-color: #f0f0f0;">${escapeHtml(header)}</th>`
  }
  html += '</tr></thead>'
  
  // Row 3+: Body rows
  html += '<tbody>'
  for (const row of rows) {
    html += '<tr>'
    for (let i = 0; i < row.length; i++) {
      const cell = row[i]
      const col = columns[i]
      let cellHtml: string
      
      // Special handling for Figma Ref column
      if (col.key === 'figmaRef') {
        cellHtml = renderFigmaRef(cell)
      } else {
        // Escape cell content and preserve newlines and carriage returns as <br>
        // Handle \r\n (Windows), \n (Unix), and \r (old Mac) line breaks
        const cellStr = String(cell || '')
        const escapedCell = escapeHtml(cellStr).replace(/\r\n|\r|\n/g, '<br>')
        cellHtml = escapedCell
      }
      
      html += `<td style="border: 1px solid #000000; padding: 6px 8px; vertical-align: top; background-color: #ffffff; color: #000000;">${cellHtml}</td>`
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
  preset: TableFormatPreset,
  itemsOverride?: ContentItemV1[]
): string {
  const columns = getColumnsForPreset(preset)
  const headers = columns.map(col => col.label)
  const items = itemsOverride ?? universalTable.items

  // Build rows
  const rows: string[][] = []
  for (const item of items) {
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

