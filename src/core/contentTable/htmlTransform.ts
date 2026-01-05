/**
 * HTML Table Conversion
 * Converts Universal Content Table to HTML and back
 */

import type { UniversalContentTableV1, TableFormatPreset } from './types'

/**
 * Convert Universal Content Table to HTML table
 */
export function toHtmlTable(
  universalJson: UniversalContentTableV1,
  preset: TableFormatPreset,
  options?: { forView?: boolean }
): string {
  // For in-plugin view, return just the table HTML (no full document)
  // For clipboard copy, return full HTML document
  const isForView = options?.forView ?? false
  let html = isForView ? '' : '<!DOCTYPE html>\n<html>\n<head>\n<meta charset="UTF-8">\n<title>Content Table</title>\n</head>\n<body>\n'
  
  if (preset === 'universal') {
    // Universal Table: All columns
    html += '<table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse; width: 100%;">\n'
    html += '<thead>\n<tr>\n'
    html += '<th>ID</th>\n'
    html += '<th>Component</th>\n'
    html += '<th>Field Label</th>\n'
    html += '<th>Path</th>\n'
    html += '<th>Content</th>\n'
    html += '<th>Visible</th>\n'
    html += '<th>Locked</th>\n'
    html += '<th>Node URL</th>\n'
    html += '</tr>\n</thead>\n<tbody>\n'
    
    for (const item of universalJson.items) {
      html += '<tr>\n'
      html += `<td>${escapeHtml(item.id)}</td>\n`
      html += `<td>${escapeHtml(item.component.name)} (${item.component.kind})</td>\n`
      html += `<td>${escapeHtml(item.field.label)}</td>\n`
      html += `<td>${escapeHtml(item.field.path)}</td>\n`
      html += `<td>${escapeHtml(item.content.value)}</td>\n`
      html += `<td>${item.meta.visible ? 'Yes' : 'No'}</td>\n`
      html += `<td>${item.meta.locked ? 'Yes' : 'No'}</td>\n`
      html += `<td><a href="${escapeHtml(item.nodeUrl)}">${escapeHtml(item.nodeUrl)}</a></td>\n`
      html += '</tr>\n'
    }
    
    html += '</tbody>\n</table>\n'
  } else if (preset === 'dev-only') {
    // Dev Only: Fewer columns
    html += '<table border="1" cellpadding="8" cellspacing="0" style="border-collapse: collapse; width: 100%;">\n'
    html += '<thead>\n<tr>\n'
    html += '<th>Component</th>\n'
    html += '<th>Field Label</th>\n'
    html += '<th>Content</th>\n'
    html += '<th>Node URL</th>\n'
    html += '</tr>\n</thead>\n<tbody>\n'
    
    for (const item of universalJson.items) {
      html += '<tr>\n'
      html += `<td>${escapeHtml(item.component.name)}</td>\n`
      html += `<td>${escapeHtml(item.field.label)}</td>\n`
      html += `<td>${escapeHtml(item.content.value)}</td>\n`
      html += `<td><a href="${escapeHtml(item.nodeUrl)}">${escapeHtml(item.nodeUrl)}</a></td>\n`
      html += '</tr>\n'
    }
    
    html += '</tbody>\n</table>\n'
  } else {
    // Other presets: Not implemented yet
    html += '<p>Format preset "' + preset + '" not implemented yet (v1).</p>\n'
    html += '<p>Showing Universal Table format instead:</p>\n'
    return toHtmlTable(universalJson, 'universal')
  }
  
  // Embed JSON payload
  html += '\n<script type="application/json" id="universal-content-json">\n'
  html += JSON.stringify(universalJson, null, 2)
  html += '\n</script>\n'
  
  if (!isForView) {
    html += '</body>\n</html>'
  }
  
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

