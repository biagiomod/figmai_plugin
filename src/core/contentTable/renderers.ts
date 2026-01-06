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
  
  const thumbnailCell = `<td style="border: 1px solid #ddd; padding: 8px; vertical-align: top; width: 100px;">
    <a href="${escapeHtml(meta.rootNodeUrl)}" target="_blank" rel="noopener noreferrer">
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
  const metadataCell = `<td colspan="${colSpan}" style="border: 1px solid #ddd; padding: 8px; vertical-align: top;">
    <div style="font-size: 12px; line-height: 1.6;">
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
  return `<a href="${escapeHtml(value)}" target="_blank" rel="noopener noreferrer">View Element</a>`
}

/**
 * Render Content Model 1 with custom layout (merged cells, staggered rows)
 */
function renderContentModel1(universalTable: UniversalContentTableV1): string {
  const items = universalTable.items
  const totalBodyRows = items.length * 2 // Two rows per item: title row + value row
  
  // Get root node URL for merged cell
  const rootNodeUrl = universalTable.meta?.rootNodeUrl || (items.length > 0 ? items[0].nodeUrl : '')
  const contentModel = universalTable.meta?.contentModel || 'ContentList'
  
  let html = '<table style="border-collapse: collapse; width: 100%; font-size: 12px;">'
  
  // <thead> with column numbers row and header labels row
  html += '<thead>'
  
  // Row 1: Column numbers
  html += '<tr>'
  for (let i = 1; i <= 9; i++) {
    html += `<th style="border: 1px solid #000000; padding: 6px 8px; vertical-align: top; font-weight: 600; background-color: #f0f0f0;">Column ${i}</th>`
  }
  html += '</tr>'
  
  // Row 2: Header labels
  const headers = ['Figma Ref', 'Tag', 'Source', 'Model', 'Metadata Key', 'Content Key', 'Content', 'Rules/Comment', 'Notes/Jira']
  html += '<tr>'
  for (const header of headers) {
    html += `<th style="border: 1px solid #000000; padding: 6px 8px; vertical-align: top; font-weight: 600; background-color: #f0f0f0;">${escapeHtml(header)}</th>`
  }
  html += '</tr></thead>'
  
  // <tbody> with merged cells and staggered rows
  html += '<tbody>'
  
  // First body row with merged cells (columns 1-4)
  html += '<tr>'
  
  // Col 1: Figma Ref (merged, rowspan = totalBodyRows)
  html += `<td rowspan="${totalBodyRows}" style="border: 1px solid #000000; padding: 6px 8px; vertical-align: top;">${renderFigmaRef(rootNodeUrl)}</td>`
  
  // Col 2: Tag (merged, blank)
  html += `<td rowspan="${totalBodyRows}" style="border: 1px solid #000000; padding: 6px 8px; vertical-align: top;"></td>`
  
  // Col 3: Source (merged, blank)
  html += `<td rowspan="${totalBodyRows}" style="border: 1px solid #000000; padding: 6px 8px; vertical-align: top;"></td>`
  
  // Col 4: Model (merged, use "Content Model 1" label)
  html += `<td rowspan="${totalBodyRows}" style="border: 1px solid #000000; padding: 6px 8px; vertical-align: top;">${escapeHtml('Content Model 1')}</td>`
  
  // For each content item, output 2 rows (Row A: key row, Row B: value row)
  // Staggering: Row A has key in Column 5, empty 6-7; Row B has empty Column 5, value in 6, content in 7
  const metadataKeyPattern = ['id', 'title', 'key']
  
  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    const isFirstItem = i === 0
    
    // Determine metadata key for this item (alternating pattern: id, title, key)
    const metadataKeyIndex = i % 3
    const metadataKey = metadataKeyPattern[metadataKeyIndex]
    
    // Row A: Key row (only for first item, since merged cells are in first row)
    if (isFirstItem) {
      // Col 5: Metadata Key (id / title / key)
      html += `<td style="border: 1px solid #000000; padding: 6px 8px; vertical-align: top;">${escapeHtml(metadataKey)}</td>`
      
      // Col 6: Content Key (empty)
      html += `<td style="border: 1px solid #000000; padding: 6px 8px; vertical-align: top;"></td>`
      
      // Col 7: Content (empty)
      html += `<td style="border: 1px solid #000000; padding: 6px 8px; vertical-align: top;"></td>`
      
      // Col 8: Rules/Comment (blank)
      html += `<td style="border: 1px solid #000000; padding: 6px 8px; vertical-align: top;"></td>`
      
      // Col 9: Notes/Jira (blank)
      html += `<td style="border: 1px solid #000000; padding: 6px 8px; vertical-align: top;"></td>`
      html += '</tr>'
      
      // Row B: Value row
      html += '<tr>'
      // Col 5: Metadata Key (empty)
      html += `<td style="border: 1px solid #000000; padding: 6px 8px; vertical-align: top;"></td>`
      
      // Col 6: Content Key (value)
      html += `<td style="border: 1px solid #000000; padding: 6px 8px; vertical-align: top;">${escapeHtml('value')}</td>`
      
      // Col 7: Content (actual content value)
      const content = item.content.value || ''
      html += `<td style="border: 1px solid #000000; padding: 6px 8px; vertical-align: top;">${escapeHtml(content)}</td>`
      
      // Col 8: Rules/Comment (blank)
      html += `<td style="border: 1px solid #000000; padding: 6px 8px; vertical-align: top;"></td>`
      
      // Col 9: Notes/Jira (blank)
      html += `<td style="border: 1px solid #000000; padding: 6px 8px; vertical-align: top;"></td>`
      html += '</tr>'
    } else {
      // For subsequent items, create new rows without merged cells (they're already in first row)
      // Row A: Key row
      html += '<tr>'
      // Col 5: Metadata Key (id / title / key)
      html += `<td style="border: 1px solid #000000; padding: 6px 8px; vertical-align: top;">${escapeHtml(metadataKey)}</td>`
      
      // Col 6: Content Key (empty)
      html += `<td style="border: 1px solid #000000; padding: 6px 8px; vertical-align: top;"></td>`
      
      // Col 7: Content (empty)
      html += `<td style="border: 1px solid #000000; padding: 6px 8px; vertical-align: top;"></td>`
      
      // Col 8: Rules/Comment (blank)
      html += `<td style="border: 1px solid #000000; padding: 6px 8px; vertical-align: top;"></td>`
      
      // Col 9: Notes/Jira (blank)
      html += `<td style="border: 1px solid #000000; padding: 6px 8px; vertical-align: top;"></td>`
      html += '</tr>'
      
      // Row B: Value row
      html += '<tr>'
      // Col 5: Metadata Key (empty)
      html += `<td style="border: 1px solid #000000; padding: 6px 8px; vertical-align: top;"></td>`
      
      // Col 6: Content Key (value)
      html += `<td style="border: 1px solid #000000; padding: 6px 8px; vertical-align: top;">${escapeHtml('value')}</td>`
      
      // Col 7: Content (actual content value)
      const content = item.content.value || ''
      html += `<td style="border: 1px solid #000000; padding: 6px 8px; vertical-align: top;">${escapeHtml(content)}</td>`
      
      // Col 8: Rules/Comment (blank)
      html += `<td style="border: 1px solid #000000; padding: 6px 8px; vertical-align: top;"></td>`
      
      // Col 9: Notes/Jira (blank)
      html += `<td style="border: 1px solid #000000; padding: 6px 8px; vertical-align: top;"></td>`
      html += '</tr>'
    }
  }
  
  html += '</tbody></table>'
  return html
}

/**
 * Render Content Only with same structure as CM1 but only Column 7 populated
 */
function renderContentOnly(universalTable: UniversalContentTableV1): string {
  const items = universalTable.items
  const totalBodyRows = items.length // One row per content item (not two like CM1)
  
  // Get root node URL for merged cell
  const rootNodeUrl = universalTable.meta?.rootNodeUrl || (items.length > 0 ? items[0].nodeUrl : '')
  
  let html = '<table style="border-collapse: collapse; width: 100%; font-size: 12px;">'
  
  // <thead> with column numbers row and header labels row
  html += '<thead>'
  
  // Row 1: Column numbers
  html += '<tr>'
  for (let i = 1; i <= 9; i++) {
    html += `<th style="border: 1px solid #000000; padding: 6px 8px; vertical-align: top; font-weight: 600; background-color: #f0f0f0;">Column ${i}</th>`
  }
  html += '</tr>'
  
  // Row 2: Header labels
  const headers = ['Figma Ref', 'Tag', 'Source', 'Model', 'Metadata Key', 'Content Key', 'Content', 'Rules/Comment', 'Notes/Jira']
  html += '<tr>'
  for (const header of headers) {
    html += `<th style="border: 1px solid #000000; padding: 6px 8px; vertical-align: top; font-weight: 600; background-color: #f0f0f0;">${escapeHtml(header)}</th>`
  }
  html += '</tr></thead>'
  
  // <tbody> with merged cells and content rows
  html += '<tbody>'
  
  // First body row with merged cells (columns 1-4)
  html += '<tr>'
  
  // Col 1: Figma Ref (merged, rowspan = totalBodyRows)
  html += `<td rowspan="${totalBodyRows}" style="border: 1px solid #000000; padding: 6px 8px; vertical-align: top;">${renderFigmaRef(rootNodeUrl)}</td>`
  
  // Col 2: Tag (merged, blank)
  html += `<td rowspan="${totalBodyRows}" style="border: 1px solid #000000; padding: 6px 8px; vertical-align: top;"></td>`
  
  // Col 3: Source (merged, blank)
  html += `<td rowspan="${totalBodyRows}" style="border: 1px solid #000000; padding: 6px 8px; vertical-align: top;"></td>`
  
  // Col 4: Model (merged, blank for Content Only)
  html += `<td rowspan="${totalBodyRows}" style="border: 1px solid #000000; padding: 6px 8px; vertical-align: top;"></td>`
  
  // For each content item, output 1 row with only Column 7 populated
  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    const isFirstItem = i === 0
    
    if (!isFirstItem) {
      html += '<tr>'
    }
    
    // Col 5: Metadata Key (blank)
    html += `<td style="border: 1px solid #000000; padding: 6px 8px; vertical-align: top;"></td>`
    
    // Col 6: Content Key (blank)
    html += `<td style="border: 1px solid #000000; padding: 6px 8px; vertical-align: top;"></td>`
    
    // Col 7: Content (populated with actual content value)
    const content = item.content.value || ''
    html += `<td style="border: 1px solid #000000; padding: 6px 8px; vertical-align: top;">${escapeHtml(content)}</td>`
    
    // Col 8: Rules/Comment (blank)
    html += `<td style="border: 1px solid #000000; padding: 6px 8px; vertical-align: top;"></td>`
    
    // Col 9: Notes/Jira (blank)
    html += `<td style="border: 1px solid #000000; padding: 6px 8px; vertical-align: top;"></td>`
    html += '</tr>'
  }
  
  html += '</tbody></table>'
  return html
}

/**
 * Render Content Model 2 with schema-style layout (rowspans, Dialog/Links sections)
 */
function renderContentModel2(universalTable: UniversalContentTableV1): string {
  // Get root node URL for merged cell
  const rootNodeUrl = universalTable.meta?.rootNodeUrl || (universalTable.items.length > 0 ? universalTable.items[0].nodeUrl : '')
  
  // Define schema rows exactly as specified
  // Dialog section rows
  const dialogRows = [
    { col5: 'id', col6: '', col7: '' },
    { col5: '', col6: 'title', col7: '' },
    { col5: '', col6: 'subtitle', col7: '' },
    { col5: '', col6: 'message', col7: '' },
    { col5: '', col6: 'messageType', col7: '' },
    { col5: '', col6: 'variationId', col7: '' },
    { col5: '', col6: 'screenId', col7: '' },
    { col5: '', col6: 'accessibleTextIcon (HAT)', col7: '' },
    { col5: 'primaryIconIdentifier', col6: '', col7: '' },
    { col5: 'primaryIconImage', col6: '', col7: '' },
    { col5: '', col6: 'primaryIconAltText', col7: '' },
    { col5: 'primaryIconIdentifier', col6: '', col7: '' },
    { col5: 'primaryIconImage', col6: '', col7: '' },
    { col5: '', col6: 'secondaryIconAltText', col7: '' },
  ]
  
  // Links section rows
  const linksRows = [
    { col5: 'link1id', col6: '', col7: '' },
    { col5: '', col6: 'headerText', col7: '' },
    { col5: '', col6: 'linkText', col7: '' },
    { col5: 'url', col6: '', col7: '' },
    { col5: 'navigationkeyID', col6: '', col7: '' },
    { col5: '', col6: 'HAT', col7: '' },
    { col5: 'linkTrackingID', col6: '', col7: '' },
    { col5: 'iconID', col6: '', col7: '' },
    { col5: 'linkType', col6: '', col7: '' },
    { col5: 'linkPresentationType', col6: '', col7: '' },
    { col5: 'linkOpenIn', col6: '', col7: '' },
    { col5: 'link2id', col6: '', col7: '' },
  ]
  
  const dialogRowCount = dialogRows.length
  const linksRowCount = linksRows.length
  const totalBodyRows = dialogRowCount + linksRowCount
  
  let html = '<table style="border-collapse: collapse; width: 100%; font-size: 12px;">'
  
  // <thead> with column numbers row and header labels row
  html += '<thead>'
  
  // Row 1: Column numbers
  html += '<tr>'
  for (let i = 1; i <= 9; i++) {
    html += `<th style="border: 1px solid #000000; padding: 6px 8px; vertical-align: top; font-weight: 600; background-color: #f0f0f0;">Column ${i}</th>`
  }
  html += '</tr>'
  
  // Row 2: Header labels
  const headers = ['Figma Ref', 'Tag', 'Source', 'Model', 'Metadata Key', 'Content Key', 'Content', 'Rules/Comment', 'Notes/Jira']
  html += '<tr>'
  for (const header of headers) {
    html += `<th style="border: 1px solid #000000; padding: 6px 8px; vertical-align: top; font-weight: 600; background-color: #f0f0f0;">${escapeHtml(header)}</th>`
  }
  html += '</tr></thead>'
  
  // <tbody> with merged cells and schema rows
  html += '<tbody>'
  
  // First body row with merged cells (columns 1-4)
  html += '<tr>'
  
  // Col 1: Figma Ref (merged, rowspan = totalBodyRows)
  html += `<td rowspan="${totalBodyRows}" style="border: 1px solid #000000; padding: 6px 8px; vertical-align: top;">${renderFigmaRef(rootNodeUrl)}</td>`
  
  // Col 2: Tag (merged, blank)
  html += `<td rowspan="${totalBodyRows}" style="border: 1px solid #000000; padding: 6px 8px; vertical-align: top;"></td>`
  
  // Col 3: Source (merged, blank)
  html += `<td rowspan="${totalBodyRows}" style="border: 1px solid #000000; padding: 6px 8px; vertical-align: top;"></td>`
  
  // Col 4: Model - Dialog section (merged, rowspan = dialogRowCount)
  html += `<td rowspan="${dialogRowCount}" style="border: 1px solid #000000; padding: 6px 8px; vertical-align: top;">${escapeHtml('Dialog')}</td>`
  
  // Dialog section rows
  for (let i = 0; i < dialogRows.length; i++) {
    const row = dialogRows[i]
    const isFirstRow = i === 0
    
    if (!isFirstRow) {
      html += '<tr>'
    }
    
    // Col 5: Metadata Key
    html += `<td style="border: 1px solid #000000; padding: 6px 8px; vertical-align: top;">${escapeHtml(row.col5)}</td>`
    
    // Col 6: Content Key
    html += `<td style="border: 1px solid #000000; padding: 6px 8px; vertical-align: top;">${escapeHtml(row.col6)}</td>`
    
    // Col 7: Content (blank for now)
    html += `<td style="border: 1px solid #000000; padding: 6px 8px; vertical-align: top;">${escapeHtml(row.col7)}</td>`
    
    // Col 8: Rules/Comment (blank)
    html += `<td style="border: 1px solid #000000; padding: 6px 8px; vertical-align: top;"></td>`
    
    // Col 9: Notes/Jira (blank)
    html += `<td style="border: 1px solid #000000; padding: 6px 8px; vertical-align: top;"></td>`
    html += '</tr>'
  }
  
  // Links section - start new row with Model column
  html += '<tr>'
  // Col 4: Model - Links section (merged, rowspan = linksRowCount)
  html += `<td rowspan="${linksRowCount}" style="border: 1px solid #000000; padding: 6px 8px; vertical-align: top;">${escapeHtml('Links')}</td>`
  
  // Links section rows
  for (let i = 0; i < linksRows.length; i++) {
    const row = linksRows[i]
    const isFirstRow = i === 0
    
    if (!isFirstRow) {
      html += '<tr>'
    }
    
    // Col 5: Metadata Key
    html += `<td style="border: 1px solid #000000; padding: 6px 8px; vertical-align: top;">${escapeHtml(row.col5)}</td>`
    
    // Col 6: Content Key
    html += `<td style="border: 1px solid #000000; padding: 6px 8px; vertical-align: top;">${escapeHtml(row.col6)}</td>`
    
    // Col 7: Content (blank for now)
    html += `<td style="border: 1px solid #000000; padding: 6px 8px; vertical-align: top;">${escapeHtml(row.col7)}</td>`
    
    // Col 8: Rules/Comment (blank)
    html += `<td style="border: 1px solid #000000; padding: 6px 8px; vertical-align: top;"></td>`
    
    // Col 9: Notes/Jira (blank)
    html += `<td style="border: 1px solid #000000; padding: 6px 8px; vertical-align: top;"></td>`
    html += '</tr>'
  }
  
  html += '</tbody></table>'
  return html
}

/**
 * Convert Universal Content Table to HTML table
 * Returns both HTML table and plain text fallback
 */
export function universalTableToHtml(
  universalTable: UniversalContentTableV1,
  preset: TableFormatPreset
): { html: string; plainText: string } {
  // Special handling for content-only
  if (preset === 'content-only') {
    const html = renderContentOnly(universalTable)
    // Plain text fallback (simplified for content-only)
    const plainText = 'Content Only export (use HTML format for full layout)'
    return { html, plainText }
  }
  
  // Special handling for content-model-1
  if (preset === 'content-model-1') {
    const html = renderContentModel1(universalTable)
    // Plain text fallback (simplified for content-model-1)
    const plainText = 'Content Model 1 export (use HTML format for full layout)'
    return { html, plainText }
  }
  
  // Special handling for content-model-2
  if (preset === 'content-model-2') {
    const html = renderContentModel2(universalTable)
    // Plain text fallback (simplified for content-model-2)
    const plainText = 'Content Model 2 export (use HTML format for full layout)'
    return { html, plainText }
  }
  
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
        // Escape cell content and preserve newlines as <br>
        const cellStr = String(cell || '')
        const escapedCell = escapeHtml(cellStr).replace(/\n/g, '<br>')
        cellHtml = escapedCell
      }
      
      html += `<td style="border: 1px solid #000000; padding: 6px 8px; vertical-align: top;">${cellHtml}</td>`
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

