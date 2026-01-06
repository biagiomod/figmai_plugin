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
  
  if (preset === 'universal') {
    // Header row
    output += 'ID\tComponent\tComponent Kind\tField Label\tPath\tContent\tVisible\tLocked\tNode URL\n'
    
    // Data rows
    for (const item of universalJson.items) {
      const row = [
        item.id,
        item.component.name,
        item.component.kind,
        item.field.label,
        item.field.path,
        item.content.value.replace(/\t/g, ' ').replace(/\n/g, ' '), // Replace tabs and newlines
        item.meta.visible ? 'Yes' : 'No',
        item.meta.locked ? 'Yes' : 'No',
        item.nodeUrl
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
    // Fallback to universal
    return toTabSeparated(universalJson, 'universal')
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
  
  if (preset === 'universal') {
    const headers = ['ID', 'Component', 'Field Label', 'Path', 'Content', 'Visible', 'Locked', 'Node URL']
    const rows: string[][] = []
    
    for (const item of universalJson.items) {
      rows.push([
        item.id,
        `${item.component.name} (${item.component.kind})`,
        item.field.label,
        item.field.path,
        item.content.value.replace(/\n/g, ' '), // Replace newlines with spaces
        item.meta.visible ? 'Yes' : 'No',
        item.meta.locked ? 'Yes' : 'No',
        item.nodeUrl
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
    // Fallback to universal
    return toPlainTextTable(universalJson, 'universal')
  }
  
  return output.trim()
}

