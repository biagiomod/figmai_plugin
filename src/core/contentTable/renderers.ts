/**
 * Content Table Renderers
 *
 * Converts UniversalContentTableV1 + ProjectedTable to HTML / TSV / JSON.
 *
 * HTML and TSV renderers receive a ProjectedTable (from projection.ts)
 * so that link detection is data-driven via Cell.href, not heuristic.
 *
 * Column definitions are generated from docs/content-models.md via presets.generated.ts.
 */

import type { UniversalContentTableV1 } from './types'
import type { ProjectedTable, Cell } from './projection'
import { cellText, cellHref } from './projection'

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
  
  const colSpan = columnCount - 1
  const metadataCell = `<td colspan="${colSpan}" style="border: 1px solid #ddd; padding: 8px; vertical-align: top; background-color: #ffffff; color: #000000;">
    <div style="font-size: 12px; line-height: 1.6; color: #000000;">
      ${metadataChips}
    </div>
  </td>`
  
  return `<tr>${thumbnailCell}${metadataCell}</tr>`
}

function renderCellHtml(cell: Cell): string {
  const href = cellHref(cell)
  if (href) {
    const linkText = typeof cell === 'string' ? 'View in Figma' : (cell.text || 'View in Figma')
    const suffix = typeof cell === 'string' ? '' : (cell.suffix || '')
    const suffixHtml = suffix ? escapeHtml(suffix).replace(/\r\n|\r|\n/g, '<br>') : ''
    return `<a href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer" style="color: #0066ff; text-decoration: underline;">${escapeHtml(linkText)}</a>${suffixHtml}`
  }
  const cellStr = String(cellText(cell) || '')
  return escapeHtml(cellStr).replace(/\r\n|\r|\n/g, '<br>')
}

/**
 * Convert Universal Content Table to HTML table using pre-projected data.
 */
export function universalTableToHtml(
  universalTable: UniversalContentTableV1,
  projected: ProjectedTable
): { html: string; plainText: string } {
  const { headerRows, rows } = projected

  let html = '<table style="border-collapse: collapse; width: 100%; font-size: 12px; background-color: #ffffff; color: #000000;">'
  
  html += '<thead>'
  
  if (universalTable.meta) {
    html += renderMetaRowHtml(universalTable.meta, headerRows[0].length)
  }
  
  for (const hRow of headerRows) {
    html += '<tr>'
    for (const header of hRow) {
      html += `<th style="border: 1px solid #000000; padding: 6px 8px; vertical-align: top; font-weight: 600; background-color: #f0f0f0;">${escapeHtml(header)}</th>`
    }
    html += '</tr>'
  }
  html += '</thead>'
  
  html += '<tbody>'
  for (const row of rows) {
    html += '<tr>'
    for (const cell of row) {
      html += `<td style="border: 1px solid #000000; padding: 6px 8px; vertical-align: top; background-color: #ffffff; color: #000000;">${renderCellHtml(cell)}</td>`
    }
    html += '</tr>'
  }
  html += '</tbody></table>'
  
  const primaryHeaders = headerRows[headerRows.length - 1]
  const allHeaderLines = headerRows.map(hr => hr.join('\t')).join('\n')
  const plainText = allHeaderLines + '\n' + rows.map(row => row.map(c => cellText(c)).join('\t')).join('\n')
  
  return { html, plainText }
}

/**
 * Convert Universal Content Table to TSV using pre-projected data.
 */
export function universalTableToTsv(
  universalTable: UniversalContentTableV1,
  projected: ProjectedTable
): string {
  const { headerRows, rows } = projected

  let tsv = headerRows.map(hr => hr.join('\t')).join('\n') + '\n'
  for (const row of rows) {
    tsv += row.map(cell => {
      const value = cellText(cell)
      return value.replace(/\t/g, ' ')
    }).join('\t') + '\n'
  }
  
  return tsv.trim()
}

/**
 * Convert Universal Content Table to JSON.
 * Returns the exact JSON.stringify output of the raw SSOT (not projected).
 */
export function universalTableToJson(
  universalTable: UniversalContentTableV1
): string {
  return JSON.stringify(universalTable, null, 2)
}
