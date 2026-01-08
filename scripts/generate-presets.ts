#!/usr/bin/env node
/**
 * Content Models Preset Generator
 * 
 * Parses docs/content-models.md and generates TypeScript preset definitions
 * Run as: npm run generate-presets or as part of build process
 */

import * as fs from 'fs'
import * as path from 'path'

interface ColumnDef {
  key: string
  label: string
  path: string
}

interface ModelDef {
  id: string
  label: string
  description: string
  enabled: boolean
  columns: ColumnDef[]
}

/**
 * Parse docs/content-models.md and extract model definitions
 */
function parseMarkdown(filePath: string): ModelDef[] {
  const content = fs.readFileSync(filePath, 'utf-8')
  const models: ModelDef[] = []
  
  // Split by model separator (---)
  const sections = content.split(/^---$/m).filter(s => s.trim())
  
  for (const section of sections) {
    // Skip the header section (first section with # Content Models)
    if (section.includes('# Content Models') && !section.includes('## ')) {
      continue
    }
    
    const lines = section.split('\n').map(l => l.trim())
    
    let currentModel: Partial<ModelDef> | null = null
    let inColumns = false
    
    for (const line of lines) {
      // Skip empty lines and top-level headers
      if (!line || line === '---' || (line.startsWith('#') && !line.startsWith('##'))) {
        continue
      }
      
      // Model header (## ModelName)
      if (line.startsWith('## ')) {
        // Save previous model
        if (currentModel && currentModel.id) {
          models.push(currentModel as ModelDef)
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
      
      // Skip if no model initialized
      if (!currentModel) {
        continue
      }
      
      // Parse key-value pairs (handle both **key:** and **key:** formats)
      if (line.startsWith('**id:**')) {
        currentModel.id = line.replace(/^\*\*id:\*\*\s*/, '').trim()
      } else if (line.startsWith('**label:**')) {
        currentModel.label = line.replace(/^\*\*label:\*\*\s*/, '').trim()
      } else if (line.startsWith('**description:**')) {
        currentModel.description = line.replace(/^\*\*description:\*\*\s*/, '').trim()
      } else if (line.startsWith('**enabled:**')) {
        const enabledStr = line.replace(/^\*\*enabled:\*\*\s*/, '').trim()
        currentModel.enabled = enabledStr === 'true'
      } else if (line === '**columns:**') {
        inColumns = true
      } else if (inColumns && line.startsWith('- ')) {
        // Parse column: key: id, label: ID, path: id
        const columnLine = line.replace('- ', '')
        const parts = columnLine.split(',').map(p => p.trim())
        
        let key = ''
        let label = ''
        let path = ''
        
        for (const part of parts) {
          if (part.startsWith('key: ')) {
            key = part.replace('key: ', '').trim()
          } else if (part.startsWith('label: ')) {
            label = part.replace('label: ', '').trim()
          } else if (part.startsWith('path: ')) {
            path = part.replace('path: ', '').trim()
          }
        }
        
        if (key && label && path && currentModel.columns) {
          currentModel.columns.push({ key, label, path })
        }
      } else if (line === '(empty - not yet defined)') {
        // Empty columns list
        if (currentModel) {
          currentModel.columns = []
        }
      }
    }
    
    // Push last model in section
    if (currentModel && currentModel.id) {
      models.push(currentModel as ModelDef)
    }
  }
  
  return models
}

/**
 * Generate TypeScript code for presets
 */
function generateTypeScript(models: ModelDef[]): string {
  const imports = `import type { ContentItemV1, TableFormatPreset } from './types'`
  
  const presetInfoType = `
export interface PresetInfo {
  id: TableFormatPreset
  label: string
  description: string
  enabled: boolean
}
`
  
  const columnDefType = `
export interface ColumnDef {
  key: string
  label: string
  extract: (item: ContentItemV1) => string
}
`
  
  // Generate preset info array
  const presetInfoArray = `export const PRESET_INFO: PresetInfo[] = [
${models.map(m => `  {
    id: '${m.id}' as TableFormatPreset,
    label: ${JSON.stringify(m.label)},
    description: ${JSON.stringify(m.description)},
    enabled: ${m.enabled}
  }`).join(',\n')}
]
`
  
  // Generate path resolver function
  const pathResolver = `
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
`
  
  // Generate column definitions
  const columnDefs: string[] = []
  
  for (const model of models) {
    const columns = model.columns.map(col => {
      return `    {
      key: ${JSON.stringify(col.key)},
      label: ${JSON.stringify(col.label)},
      extract: (item) => resolvePath(item, ${JSON.stringify(col.path)})
    }`
    }).join(',\n')
    
    columnDefs.push(`  '${model.id}': [
${columns}
  ]`)
  }
  
  const presetColumns = `export const PRESET_COLUMNS: Record<TableFormatPreset, ColumnDef[]> = {
${columnDefs.join(',\n')}
}
`
  
  return `/**
 * Generated Content Table Presets
 * 
 * This file is auto-generated from docs/content-models.md
 * DO NOT EDIT MANUALLY - edit docs/content-models.md instead
 * 
 * Generated by scripts/generate-presets.ts (deterministic output; no timestamps)
 */

${imports}
${presetInfoType}
${presetInfoArray}
${columnDefType}
${pathResolver}
${presetColumns}
`
}

/**
 * Main execution
 */
function main() {
  const rootDir = path.resolve(__dirname, '..')
  const markdownPath = path.join(rootDir, 'docs', 'content-models.md')
  const outputPath = path.join(rootDir, 'src/core/contentTable/presets.generated.ts')
  
  console.log('Generating presets from docs/content-models.md...')
  
  try {
    const models = parseMarkdown(markdownPath)
    console.log(`Parsed ${models.length} content models`)
    
    const tsCode = generateTypeScript(models)
    
    // Read existing file if it exists
    let existingContent = ''
    try {
      existingContent = fs.readFileSync(outputPath, 'utf-8')
    } catch {
      // File doesn't exist yet, that's fine
    }
    
    // Only write if content has changed
    if (existingContent === tsCode) {
      console.log(`No changes detected, skipping write: ${outputPath}`)
    } else {
      fs.writeFileSync(outputPath, tsCode, 'utf-8')
      console.log(`Generated: ${outputPath}`)
    }
    
    console.log('✓ Preset generation complete')
  } catch (error) {
    console.error('Error generating presets:', error)
    process.exit(1)
  }
}

main()

