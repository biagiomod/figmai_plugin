/**
 * Content Table Renderers
 * Single Source of Truth for converting UniversalContentTableV1 to various formats
 * 
 * All outputs (HTML, TSV, JSON) are generated from the same UniversalContentTableV1 JSON
 * to prevent drift and ensure consistency.
 */

import type { UniversalContentTableV1, TableFormatPreset, ContentItemV1 } from './types'

/**
 * Column definition for each preset
 * This is the ONLY place where column mappings are defined
 */
type ColumnDef = {
  key: string
  label: string
  extract: (item: ContentItemV1) => string
}

type PresetColumns = {
  [K in TableFormatPreset]: ColumnDef[]
}

/**
 * Column definitions per preset (single source of truth)
 */
const PRESET_COLUMNS: PresetColumns = {
  universal: [
    {
      key: 'id',
      label: 'ID',
      extract: (item) => item.id
    },
    {
      key: 'component',
      label: 'Component',
      extract: (item) => item.component.name
    },
    {
      key: 'componentKind',
      label: 'Component Kind',
      extract: (item) => item.component.kind
    },
    {
      key: 'fieldLabel',
      label: 'Field Label',
      extract: (item) => item.field.label
    },
    {
      key: 'path',
      label: 'Path',
      extract: (item) => item.field.path
    },
    {
      key: 'content',
      label: 'Content',
      extract: (item) => item.content.value
    },
    {
      key: 'visible',
      label: 'Visible',
      extract: (item) => item.meta.visible ? 'Yes' : 'No'
    },
    {
      key: 'locked',
      label: 'Locked',
      extract: (item) => item.meta.locked ? 'Yes' : 'No'
    },
    {
      key: 'nodeUrl',
      label: 'Node URL',
      extract: (item) => item.nodeUrl
    }
  ],
  'dev-only': [
    {
      key: 'component',
      label: 'Component',
      extract: (item) => item.component.name
    },
    {
      key: 'fieldLabel',
      label: 'Field Label',
      extract: (item) => item.field.label
    },
    {
      key: 'content',
      label: 'Content',
      extract: (item) => item.content.value
    },
    {
      key: 'nodeUrl',
      label: 'Node URL',
      extract: (item) => item.nodeUrl
    }
  ],
  'ada-only': [
    {
      key: 'fieldLabel',
      label: 'Field Label',
      extract: (item) => item.field.label
    },
    {
      key: 'content',
      label: 'Content',
      extract: (item) => item.content.value
    },
    {
      key: 'path',
      label: 'Path',
      extract: (item) => item.field.path
    },
    {
      key: 'nodeUrl',
      label: 'Node URL',
      extract: (item) => item.nodeUrl
    }
  ],
  // Placeholder presets (fallback to universal)
  'content-model-1': [],
  'content-model-2': [],
  'content-model-3': [],
  'content-model-4': [],
  'content-model-5': []
}

/**
 * Get column definitions for a preset
 * Falls back to universal if preset not implemented
 */
function getColumnsForPreset(preset: TableFormatPreset): ColumnDef[] {
  const columns = PRESET_COLUMNS[preset]
  if (columns.length === 0) {
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

