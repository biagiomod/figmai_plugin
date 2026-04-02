/**
 * generate-ignore-rules.ts
 * Parses custom/content-table-ignore-rules.md and writes
 * src/custom/generated/contentTableIgnoreRules.generated.ts
 *
 * Run: npx tsx scripts/generate-ignore-rules.ts
 */

import * as fs from 'fs'
import * as path from 'path'

const SOURCE = path.join(process.cwd(), 'custom', 'content-table-ignore-rules.md')
const OUTPUT = path.join(process.cwd(), 'src', 'custom', 'generated', 'contentTableIgnoreRules.generated.ts')

function parseSection(lines: string[], header: string): string[] {
  const results: string[] = []
  let inSection = false
  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed.startsWith('## ')) {
      inSection = trimmed.toLowerCase().startsWith(`## ${header.toLowerCase()}`)
      continue
    }
    if (!inSection) continue
    // Skip blank lines, comment lines (start with '(' but not regex flags like '(?'), and heading lines
    if (!trimmed || trimmed.startsWith('#')) continue
    if (trimmed.startsWith('(') && !trimmed.startsWith('(?')) continue
    results.push(trimmed)
  }
  return results
}

function main(): void {
  if (!fs.existsSync(SOURCE)) {
    console.log('[generate-ignore-rules] No source file found, writing empty config.')
    const emptyOutput = `// AUTO-GENERATED — do not edit. Source: custom/content-table-ignore-rules.md
// Run: npm run generate-ignore-rules
import type { ContentTableIgnoreRules } from '../../core/work/adapter'

export const CONTENT_TABLE_IGNORE_RULES: ContentTableIgnoreRules | null = null
`
    fs.writeFileSync(OUTPUT, emptyOutput, 'utf8')
    return
  }

  const content = fs.readFileSync(SOURCE, 'utf8')
  const lines = content.split('\n')

  const componentKeyDenylist = parseSection(lines, 'Component Key Denylist')
  const nodeNamePatterns = parseSection(lines, 'Node Name Patterns')
  const textValuePatterns = parseSection(lines, 'Text Value Patterns')
  const nodeIdPrefixes = parseSection(lines, 'Node ID Prefixes')

  const hasRules =
    componentKeyDenylist.length > 0 ||
    nodeNamePatterns.length > 0 ||
    textValuePatterns.length > 0 ||
    nodeIdPrefixes.length > 0

  if (!hasRules) {
    const nullOutput = `// AUTO-GENERATED — do not edit. Source: custom/content-table-ignore-rules.md
// Run: npm run generate-ignore-rules
import type { ContentTableIgnoreRules } from '../../core/work/adapter'

export const CONTENT_TABLE_IGNORE_RULES: ContentTableIgnoreRules | null = null
`
    fs.writeFileSync(OUTPUT, nullOutput, 'utf8')
    console.log('[generate-ignore-rules] No active rules found — CONTENT_TABLE_IGNORE_RULES = null')
    return
  }

  const rulesLines: string[] = []
  if (componentKeyDenylist.length > 0) {
    rulesLines.push(`  componentKeyDenylist: ${JSON.stringify(componentKeyDenylist)},`)
  }
  if (nodeNamePatterns.length > 0) {
    rulesLines.push(`  nodeNamePatterns: ${JSON.stringify(nodeNamePatterns)},`)
  }
  if (textValuePatterns.length > 0) {
    rulesLines.push(`  textValuePatterns: ${JSON.stringify(textValuePatterns)},`)
  }
  if (nodeIdPrefixes.length > 0) {
    rulesLines.push(`  nodeIdPrefixes: ${JSON.stringify(nodeIdPrefixes)},`)
  }

  const output = `// AUTO-GENERATED — do not edit. Source: custom/content-table-ignore-rules.md
// Run: npm run generate-ignore-rules
import type { ContentTableIgnoreRules } from '../../core/work/adapter'

export const CONTENT_TABLE_IGNORE_RULES: ContentTableIgnoreRules = {
${rulesLines.join('\n')}
}
`

  fs.writeFileSync(OUTPUT, output, 'utf8')
  console.log(`[generate-ignore-rules] wrote ${OUTPUT}`)
  if (componentKeyDenylist.length > 0) console.log(`  componentKeyDenylist: ${componentKeyDenylist.length} entries`)
  if (nodeNamePatterns.length > 0) console.log(`  nodeNamePatterns: ${nodeNamePatterns.length} patterns`)
  if (textValuePatterns.length > 0) console.log(`  textValuePatterns: ${textValuePatterns.length} patterns`)
  if (nodeIdPrefixes.length > 0) console.log(`  nodeIdPrefixes: ${nodeIdPrefixes.length} prefixes`)
}

main()
