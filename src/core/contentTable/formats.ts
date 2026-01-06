/**
 * Content Table Format Converters
 * Converts Universal Content Table to various pasteable formats
 */

import type { UniversalContentTableV1, TableFormatPreset } from './types'

/**
 * Convert to tab-separated format (works in Excel, Word, Notes, Email)
 */
export function toTabSeparated(
  universalJson: UniversalContentTableV1,
  preset: TableFormatPreset
): string {
  let output = ''
  
  if (preset === 'universal-v2') {
    // Header row - using universal-v2 columns
    output += 'Figma Ref\tComponent Name\tText Layer Name\tField / Role\tContent\tNotes\tContent Key (CMS)\tJira / Ticket\tADA Notes / Flags\tError Message\n'
    
    // Data rows
    for (const item of universalJson.items) {
      const row = [
        item.nodeUrl,
        item.component.name,
        item.textLayerName || '',
        item.field.role || '',
        item.content.value.replace(/\t/g, ' ').replace(/\n/g, ' '), // Replace tabs and newlines
        item.notes || '',
        item.contentKey || '',
        item.jiraTicket || '',
        item.adaNotes || '',
        item.errorMessage || ''
      ]
      output += row.join('\t') + '\n'
    }
  } else if (preset === 'dev-only') {
    // Header row
    output += 'Component\tField Label\tContent\tNode URL\n'
    
    // Data rows
    for (const item of universalJson.items) {
      const row = [
        item.component.name,
        item.field.label,
        item.content.value.replace(/\t/g, ' ').replace(/\n/g, ' '),
        item.nodeUrl
      ]
      output += row.join('\t') + '\n'
    }
  } else {
    // Fallback to universal-v2
    return toTabSeparated(universalJson, 'universal-v2')
  }
  
  return output.trim()
}

/**
 * Convert to formatted plain text table (works in Notes, Email, plain text editors)
 */
export function toPlainTextTable(
  universalJson: UniversalContentTableV1,
  preset: TableFormatPreset
): string {
  let output = ''
  
  if (preset === 'universal-v2') {
    const headers = ['Figma Ref', 'Component Name', 'Text Layer Name', 'Field / Role', 'Content', 'Notes', 'Content Key (CMS)', 'Jira / Ticket', 'ADA Notes / Flags', 'Error Message']
    const rows: string[][] = []
    
    for (const item of universalJson.items) {
      rows.push([
        item.nodeUrl,
        item.component.name,
        item.textLayerName || '',
        item.field.role || '',
        item.content.value.replace(/\n/g, ' '), // Replace newlines with spaces
        item.notes || '',
        item.contentKey || '',
        item.jiraTicket || '',
        item.adaNotes || '',
        item.errorMessage || ''
      ])
    }
    
    // Calculate column widths
    const colWidths = headers.map((h, i) => {
      const maxContent = Math.max(
        h.length,
        ...rows.map(r => (r[i] || '').length)
      )
      return Math.min(maxContent, 50) // Cap at 50 chars
    })
    
    // Print header
    output += headers.map((h, i) => h.padEnd(colWidths[i])).join(' | ') + '\n'
    output += headers.map((_, i) => '-'.repeat(colWidths[i])).join('-+-') + '\n'
    
    // Print rows
    for (const row of rows) {
      output += row.map((cell, i) => {
        const text = (cell || '').substring(0, colWidths[i])
        return text.padEnd(colWidths[i])
      }).join(' | ') + '\n'
    }
  } else if (preset === 'dev-only') {
    const headers = ['Component', 'Field Label', 'Content', 'Node URL']
    const rows: string[][] = []
    
    for (const item of universalJson.items) {
      rows.push([
        item.component.name,
        item.field.label,
        item.content.value.replace(/\n/g, ' '),
        item.nodeUrl
      ])
    }
    
    // Calculate column widths
    const colWidths = headers.map((h, i) => {
      const maxContent = Math.max(
        h.length,
        ...rows.map(r => (r[i] || '').length)
      )
      return Math.min(maxContent, 50)
    })
    
    // Print header
    output += headers.map((h, i) => h.padEnd(colWidths[i])).join(' | ') + '\n'
    output += headers.map((_, i) => '-'.repeat(colWidths[i])).join('-+-') + '\n'
    
    // Print rows
    for (const row of rows) {
      output += row.map((cell, i) => {
        const text = (cell || '').substring(0, colWidths[i])
        return text.padEnd(colWidths[i])
      }).join(' | ') + '\n'
    }
  } else {
    // Fallback to universal-v2
    return toPlainTextTable(universalJson, 'universal-v2')
  }
  
  return output.trim()
}

