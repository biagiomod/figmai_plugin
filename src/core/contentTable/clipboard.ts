/**
 * Clipboard Format Builders
 * Builds HTML table and TSV formats for clipboard copy
 */

import type { UniversalContentTableV1, TableFormatPreset } from './types'

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
 * Build standards-compliant HTML table with minimal inline styles
 * Optimized for paste fidelity in Word, Notes, Confluence
 */
export function buildHtmlTable(
  universalJson: UniversalContentTableV1,
  preset: TableFormatPreset
): string {
  let headers: string[] = []
  let rows: string[][] = []
  
  if (preset === 'universal') {
    headers = ['ID', 'Component', 'Component Kind', 'Field Label', 'Path', 'Content', 'Visible', 'Locked', 'Node URL']
    
    for (const item of universalJson.items) {
      rows.push([
        item.id,
        item.component.name,
        item.component.kind,
        item.field.label,
        item.field.path,
        item.content.value,
        item.meta.visible ? 'Yes' : 'No',
        item.meta.locked ? 'Yes' : 'No',
        item.nodeUrl
      ])
    }
  } else if (preset === 'dev-only') {
    headers = ['Component', 'Field Label', 'Content', 'Node URL']
    
    for (const item of universalJson.items) {
      rows.push([
        item.component.name,
        item.field.label,
        item.content.value,
        item.nodeUrl
      ])
    }
  } else {
    // Fallback to universal
    return buildHtmlTable(universalJson, 'universal')
  }
  
  // Build HTML table with minimal inline styles
  // Format optimized for Word, Apple Notes, and Confluence
  // Requirements: <table><thead>…</thead><tbody>…</tbody></table>
  // Inline styles only, no classes, no external CSS, no <style> tag
  // Use border-collapse, 1px borders, padding, font-size for readability
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
  
  return html
}

/**
 * Build TSV (tab-separated values) format
 * Optimized for paste into spreadsheet applications
 */
export function buildTsv(
  universalJson: UniversalContentTableV1,
  preset: TableFormatPreset
): string {
  let headers: string[] = []
  let rows: string[][] = []
  
  if (preset === 'universal') {
    headers = ['ID', 'Component', 'Component Kind', 'Field Label', 'Path', 'Content', 'Visible', 'Locked', 'Node URL']
    
    for (const item of universalJson.items) {
      rows.push([
        item.id,
        item.component.name,
        item.component.kind,
        item.field.label,
        item.field.path,
        item.content.value.replace(/\t/g, ' ').replace(/\n/g, ' '), // Replace tabs and newlines
        item.meta.visible ? 'Yes' : 'No',
        item.meta.locked ? 'Yes' : 'No',
        item.nodeUrl
      ])
    }
  } else if (preset === 'dev-only') {
    headers = ['Component', 'Field Label', 'Content', 'Node URL']
    
    for (const item of universalJson.items) {
      rows.push([
        item.component.name,
        item.field.label,
        item.content.value.replace(/\t/g, ' ').replace(/\n/g, ' '),
        item.nodeUrl
      ])
    }
  } else {
    // Fallback to universal
    return buildTsv(universalJson, 'universal')
  }
  
  // Build TSV
  let tsv = headers.join('\t') + '\n'
  for (const row of rows) {
    tsv += row.join('\t') + '\n'
  }
  
  return tsv.trim()
}

/**
 * Build JSON format
 * Returns the Universal Content Table as formatted JSON string
 */
export function buildJson(
  universalJson: UniversalContentTableV1
): string {
  return JSON.stringify(universalJson, null, 2)
}

