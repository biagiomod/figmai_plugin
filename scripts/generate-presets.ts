#!/usr/bin/env node
/**
 * Generate TypeScript preset definitions from content-models.md
 * 
 * This script parses content-models.md and generates presets.generated.ts
 * Run this before building: npm run generate-presets
 */

import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'

interface ModelDef {
  id: string
  label: string
  description: string
  enabled: boolean
  columns: Array<{ key: string; label: string; path: string }>
}

function parseMarkdown(content: string): ModelDef[] {
  const models: ModelDef[] = []
  const lines = content.split('\n')
  
  let currentModel: ModelDef | null = null
  let inColumns = false
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    
    // Skip empty lines
    if (!line) {
      continue
    }
    
    // Detect model section start (## Model Name) - check this BEFORE skipping other # lines
    if (line.startsWith('## ')) {
      const sectionName = line.replace('## ', '').trim()
      
      // Skip non-model sections
      if (sectionName === 'Content Models' || 
          sectionName === 'Format' || 
          sectionName === 'Value Path Expressions') {
        // Reset state when hitting a non-model section
        if (currentModel) {
          models.push(currentModel)
          currentModel = null
        }
        continue
      }
      
      // Save previous model if exists
      if (currentModel) {
        models.push(currentModel)
      }
      
      // Start new model
      currentModel = {
        id: '',
        label: '',
        description: '',
        enabled: false,
        columns: []
      }
      inColumns = false
      continue
    }
    
    // Skip other markdown headers and separators
    if (line.startsWith('#') || line.startsWith('---')) {
      continue
    }
    
    if (!currentModel) continue
    
    // Parse model properties
    if (line.startsWith('**id:**')) {
      currentModel.id = line.replace('**id:**', '').trim()
    } else if (line.startsWith('**label:**')) {
      currentModel.label = line.replace('**label:**', '').trim()
    } else if (line.startsWith('**description:**')) {
      currentModel.description = line.replace('**description:**', '').trim()
    } else if (line.startsWith('**enabled:**')) {
      const enabledStr = line.replace('**enabled:**', '').trim().toLowerCase()
      currentModel.enabled = enabledStr === 'true'
    } else if (line === '**columns:**') {
      inColumns = true
    } else if (inColumns && line.startsWith('- key:')) {
      // Parse column definition: - key: id, label: ID, path: id
      const match = line.match(/key:\s*([^,]+),\s*label:\s*([^,]+),\s*path:\s*(.+)/)
      if (match) {
        currentModel.columns.push({
          key: match[1].trim(),
          label: match[2].trim(),
          path: match[3].trim()
        })
      }
    } else if (inColumns && (line.includes('(empty') || line.includes('not yet defined'))) {
      // Empty columns section - keep columns array empty
      inColumns = false
    } else if (inColumns && line && !line.startsWith('-')) {
      // End of columns section
      inColumns = false
    }
  }
  
  // Don't forget the last model
  if (currentModel) {
    models.push(currentModel)
  }
  
  return models
}

function generateTypeScript(models: ModelDef[]): string {
  const timestamp = new Date().toISOString()
  
  let output = `/**
 * Generated Content Table Presets
 * 
 * This file is auto-generated from content-models.md
 * DO NOT EDIT MANUALLY - edit content-models.md instead
 * 
 * Generated at: ${timestamp}
 */

import type { ContentItemV1, TableFormatPreset } from './types'

export interface PresetInfo {
  id: TableFormatPreset
  label: string
  description: string
  enabled: boolean
}

export const PRESET_INFO: PresetInfo[] = [
${models.map(m => `  {
    id: '${m.id}' as TableFormatPreset,
    label: ${JSON.stringify(m.label)},
    description: ${JSON.stringify(m.description)},
    enabled: ${m.enabled}
  }`).join(',\n')}
]


export interface ColumnDef {
  key: string
  label: string
  extract: (item: ContentItemV1) => string
}


/**
 * Resolve a value path expression from a ContentItemV1
 * Returns empty string if path is missing
 * 
 * Supported paths:
 * - id, nodeId, nodeUrl (top-level)
 * - component.name, component.kind, component.key
 * - field.label, field.path
 * - content.value
 * - meta.visible, meta.locked (returns "Yes"/"No")
 * - variantProperties.<key> (e.g., variantProperties.Size)
 */
function resolvePath(item: ContentItemV1, path: string): string {
  // Handle variantProperties.<key> syntax
  if (path.startsWith('variantProperties.')) {
    const key = path.replace('variantProperties.', '')
    return item.component.variantProperties?.[key] || ''
  }
  
  // Split path into parts
  const parts = path.split('.')
  let current: any = item
  
  for (const part of parts) {
    if (current === null || current === undefined) {
      return ''
    }
    
    current = current[part]
    
    if (current === null || current === undefined) {
      return ''
    }
  }
  
  // Handle boolean values (meta.visible, meta.locked)
  if (typeof current === 'boolean') {
    return current ? 'Yes' : 'No'
  }
  
  return String(current || '')
}

export const PRESET_COLUMNS: Record<TableFormatPreset, ColumnDef[]> = {
${models.map(m => {
    const columns = m.columns.length > 0
      ? m.columns.map(col => `    {
      key: ${JSON.stringify(col.key)},
      label: ${JSON.stringify(col.label)},
      extract: (item) => resolvePath(item, ${JSON.stringify(col.path)})
    }`).join(',\n')
      : ''
    
    return `  '${m.id}': [
${columns}
  ]`
  }).join(',\n')}
}
`

  return output
}

// Main execution
const projectRoot = join(__dirname, '..')
const markdownPath = join(projectRoot, 'content-models.md')
const outputPath = join(projectRoot, 'src', 'core', 'contentTable', 'presets.generated.ts')

try {
  console.log('Reading content-models.md...')
  const markdown = readFileSync(markdownPath, 'utf-8')
  
  console.log('Parsing markdown...')
  const models = parseMarkdown(markdown)
  
  if (models.length === 0) {
    throw new Error('No models found in content-models.md')
  }
  
  console.log(`Found ${models.length} model(s)`)
  
  console.log('Generating TypeScript...')
  const ts = generateTypeScript(models)
  
  console.log('Writing presets.generated.ts...')
  writeFileSync(outputPath, ts, 'utf-8')
  
  console.log(`✅ Successfully generated ${outputPath}`)
} catch (error) {
  console.error('❌ Error generating presets:', error)
  process.exit(1)
}

