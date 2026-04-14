#!/usr/bin/env node
/**
 * migrate-assistant-to-skillmd.ts
 *
 * CLI helper that scaffolds the per-assistant directory structure for a given assistant ID.
 *
 * Usage: npx tsx scripts/migrate-assistant-to-skillmd.ts <assistantId>
 *
 * Given an assistantId:
 *   1. Reads the entry from custom/assistants.manifest.json (the flat manifest)
 *   2. Creates custom/assistants/<id>/ directory (errors if SKILL.md already exists there)
 *   3. Writes custom/assistants/<id>/manifest.json — all fields EXCEPT promptTemplate
 *   4. Writes custom/assistants/<id>/SKILL.md — scaffold wrapping promptTemplate in ## Identity,
 *      with quick action overlays in ## Quick Actions
 *   5. Does NOT remove the entry from the flat manifest (manual step after verification)
 *   6. Prints clear instructions at the end
 */

import * as fs from 'fs'
import * as path from 'path'

interface QuickActionEntry {
  id: string
  label: string
  templateMessage: string
  executionType?: string
  requiresSelection?: boolean
  requiresVision?: boolean
  maxImages?: number
  imageScale?: number
  [key: string]: unknown
}

interface AssistantManifestEntry {
  id: string
  promptTemplate: string
  quickActions: QuickActionEntry[]
  [key: string]: unknown
}

interface ManifestRoot {
  assistants: AssistantManifestEntry[]
}

function usage(): void {
  console.error('Usage: npx tsx scripts/migrate-assistant-to-skillmd.ts <assistantId>')
  console.error('')
  console.error('Example: npx tsx scripts/migrate-assistant-to-skillmd.ts general')
}

function main(): void {
  const args = process.argv.slice(2)

  if (args.length === 0) {
    console.error('Error: missing <assistantId> argument')
    console.error('')
    usage()
    process.exit(1)
  }

  const assistantId = args[0]
  const rootDir = path.resolve(__dirname, '..')
  const manifestPath = path.join(rootDir, 'custom', 'assistants.manifest.json')

  // 1. Read the flat manifest
  if (!fs.existsSync(manifestPath)) {
    console.error(`Error: custom/assistants.manifest.json not found at ${manifestPath}`)
    process.exit(1)
  }

  let manifest: ManifestRoot
  try {
    const content = fs.readFileSync(manifestPath, 'utf-8')
    manifest = JSON.parse(content) as ManifestRoot
  } catch (err) {
    console.error('Error: Failed to read or parse custom/assistants.manifest.json:', err)
    process.exit(1)
  }

  // 2. Find the assistant entry
  if (!Array.isArray(manifest.assistants)) {
    console.error('Error: custom/assistants.manifest.json does not have an "assistants" array')
    process.exit(1)
  }

  const entry = manifest.assistants.find((a) => a.id === assistantId)
  if (!entry) {
    console.error(`Error: assistant "${assistantId}" not found in custom/assistants.manifest.json`)
    console.error('')
    console.error('Available assistants:')
    for (const a of manifest.assistants) {
      console.error(`  - ${a.id}`)
    }
    process.exit(1)
  }

  // 3. Check if target directory already has SKILL.md (already migrated)
  const targetDir = path.join(rootDir, 'custom', 'assistants', assistantId)
  const skillMdPath = path.join(targetDir, 'SKILL.md')
  const newManifestPath = path.join(targetDir, 'manifest.json')

  if (fs.existsSync(skillMdPath)) {
    console.error(`Error: "${assistantId}" already has a SKILL.md at ${skillMdPath}`)
    console.error('Migration already performed. Remove the directory to re-migrate.')
    process.exit(1)
  }

  // Check if a new-format (flat) manifest already exists
  if (fs.existsSync(newManifestPath)) {
    let existing: Record<string, unknown>
    try {
      existing = JSON.parse(fs.readFileSync(newManifestPath, 'utf-8'))
    } catch {
      existing = {}
    }
    // If not old-format (no top-level "assistants" array), it's already migrated to new format
    if (!Array.isArray(existing['assistants'])) {
      console.error(`Error: "${assistantId}" already has a flat-entry manifest.json at ${newManifestPath}`)
      console.error('New-format manifest already exists. Remove the directory to re-migrate.')
      process.exit(1)
    }
  }

  // 4. Create directory if needed
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true })
    console.log(`Created directory: custom/assistants/${assistantId}/`)
  } else {
    console.log(`Directory already exists (old-format): custom/assistants/${assistantId}/`)
  }

  // 5. Build manifest.json — all fields EXCEPT promptTemplate
  const { promptTemplate, ...manifestEntry } = entry
  const manifestJson = JSON.stringify(manifestEntry, null, 2)
  fs.writeFileSync(newManifestPath, manifestJson + '\n', 'utf-8')
  console.log(`Wrote: custom/assistants/${assistantId}/manifest.json`)

  // 6. Build SKILL.md
  const hadH2Headings = /^## /m.test(promptTemplate)
  const skillMdContent = buildSkillMd(assistantId, promptTemplate, entry.quickActions ?? [])
  fs.writeFileSync(skillMdPath, skillMdContent, 'utf-8')
  console.log(`Wrote: custom/assistants/${assistantId}/SKILL.md`)

  // 7. Print instructions
  console.log('')
  console.log('─────────────────────────────────────────────────────────────────')
  console.log(`Migration scaffold complete for: ${assistantId}`)
  console.log('─────────────────────────────────────────────────────────────────')
  console.log('')
  console.log('Next steps:')
  console.log(`  1. Review the generated files:`)
  console.log(`       custom/assistants/${assistantId}/manifest.json`)
  console.log(`       custom/assistants/${assistantId}/SKILL.md`)
  console.log('')
  console.log(`  2. Run the compiler to verify the migration:`)
  console.log(`       npx tsx scripts/compile-skills.ts`)
  console.log('')
  console.log(`  3. After verifying output is correct, remove the entry from:`)
  console.log(`       custom/assistants.manifest.json`)
  console.log(`     (This is a MANUAL step — the script does not remove it automatically)`)
  console.log('')
  console.log('  NOTE: Until the entry is removed from the flat manifest, the compiler')
  console.log('  will use the per-directory files and also emit a warning for the flat entry.')
  console.log('  The warning will disappear once the flat entry is removed.')
  console.log('')
  if (hadH2Headings) {
    console.log('  NOTE: \'## \' headings inside the original promptTemplate have been')
    console.log('  converted to \'### \' in SKILL.md/Identity. This is structurally required —')
    console.log('  the SKILL.md parser uses \'## \' as section boundaries. The compiled output')
    console.log('  will reflect the ### heading levels.')
    console.log('')
  }
  console.log('  NOTE: templateMessage values in manifest.json are superseded by the SKILL.md')
  console.log('  ## Quick Actions overlays. After migration, edit templateMessage only in')
  console.log('  SKILL.md.')
}

function indentLines(text: string, indent: string): string {
  return text
    .split('\n')
    .map((line) => (line.length > 0 ? indent + line : line))
    .join('\n')
}

/**
 * When the promptTemplate contains '## ' headings, those conflict with SKILL.md's
 * section-level heading parser (which splits on ^## ). We downgrade embedded ## headings
 * to ### so they become subsections of ## Identity instead of top-level SKILL.md sections.
 * This is a structural normalisation required for valid SKILL.md syntax — not a content change.
 */
function normaliseIdentityContent(promptTemplate: string): string {
  // Only downgrade lines that start with exactly '## ' (section headings within the template)
  // '#' stays, '###' and deeper stay — only '## ' is elevated to the section level
  return promptTemplate
    .split('\n')
    .map((line) => (line.startsWith('## ') ? '#' + line : line))
    .join('\n')
}

function buildSkillMd(id: string, promptTemplate: string, quickActions: QuickActionEntry[]): string {
  const lines: string[] = []

  // Frontmatter
  lines.push('---')
  lines.push('skillVersion: 1')
  lines.push(`id: ${id}`)
  lines.push('---')
  lines.push('')

  // ## Identity — promptTemplate content (## headings downgraded to ### to avoid
  // conflicting with SKILL.md section-level parsing; all content is preserved verbatim)
  lines.push('## Identity')
  lines.push('')
  lines.push(normaliseIdentityContent(promptTemplate))

  // ## Quick Actions — only if there are quick actions with templateMessage
  const actionsWithTemplate = quickActions.filter(
    (qa) => typeof qa.templateMessage === 'string' && qa.templateMessage !== ''
  )

  if (actionsWithTemplate.length > 0) {
    lines.push('')
    lines.push('## Quick Actions')

    for (const qa of actionsWithTemplate) {
      lines.push('')
      lines.push(`### ${qa.id}`)
      lines.push('')
      // Use block scalar format for templateMessage
      lines.push('templateMessage: |')
      lines.push(indentLines(qa.templateMessage, '  '))
    }
  }

  // Ensure file ends with a newline
  return lines.join('\n') + '\n'
}

main()
