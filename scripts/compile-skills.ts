#!/usr/bin/env node
/**
 * Skills Compiler
 *
 * Reads custom/assistants.manifest.json and generates src/assistants/assistants.generated.ts
 * so the runtime can build the ASSISTANTS array without editing TypeScript.
 * Drop-in replacement for scripts/generate-assistants-from-manifest.ts (Phase 5).
 * Deterministic output; fails clearly if manifest is invalid.
 */

import * as fs from 'fs'
import * as path from 'path'

const KIND_VALUES = ['ai', 'tool', 'hybrid'] as const
const TAG_VARIANTS = ['new', 'beta', 'alpha'] as const
const EXECUTION_TYPE_VALUES = ['ui-only', 'tool-only', 'llm', 'hybrid'] as const

interface QuickActionEntry {
  id: string
  label: string
  templateMessage: string
  executionType: (typeof EXECUTION_TYPE_VALUES)[number]
  requiresSelection?: boolean
  requiresVision?: boolean
  maxImages?: number
  imageScale?: number
}

interface TagEntry {
  isVisible?: boolean
  label?: string
  variant?: 'new' | 'beta' | 'alpha'
}

const INSTRUCTION_BLOCK_KINDS = ['system', 'behavior', 'rules', 'examples', 'format', 'context'] as const

interface InstructionBlockEntry {
  id: string
  label?: string
  kind: (typeof INSTRUCTION_BLOCK_KINDS)[number]
  content: string
  enabled?: boolean
}

interface SafetyOverridesEntry {
  allowImages?: boolean
  safetyToggles?: Record<string, boolean>
}

interface ToolSettingsEntry {
  defaultContentModel?: string
  dedupeDefault?: boolean
  quickActionsLocation?: 'top' | 'bottom' | 'inline'
  showInput?: boolean
}

interface AssistantManifestEntry {
  id: string
  label: string
  intro: string
  welcomeMessage?: string
  hoverSummary?: string
  tag?: TagEntry
  iconId: string
  kind: 'ai' | 'tool' | 'hybrid'
  quickActions: QuickActionEntry[]
  promptTemplate: string
  instructionBlocks?: InstructionBlockEntry[]
  toneStylePreset?: string
  outputSchemaId?: string
  safetyOverrides?: SafetyOverridesEntry
  knowledgeBaseRefs?: string[]
  toolSettings?: ToolSettingsEntry
}

interface ManifestRoot {
  assistants: AssistantManifestEntry[]
}

function loadFlatManifest(rootDir: string): { manifest: ManifestRoot; ids: Set<string> } {
  const singleManifestPath = path.join(rootDir, 'custom', 'assistants.manifest.json')

  if (!fs.existsSync(singleManifestPath)) {
    console.error('[SKILL_COMPILER] Missing custom/assistants.manifest.json')
    process.exit(1)
  }
  try {
    const content = fs.readFileSync(singleManifestPath, 'utf-8')
    const manifest = JSON.parse(content) as ManifestRoot
    return { manifest, ids: new Set<string>() }
  } catch (err) {
    console.error('[SKILL_COMPILER] Failed to read or parse manifest:', err)
    process.exit(1)
  }
}

function validateManifest(manifest: ManifestRoot): void {
  if (!Array.isArray(manifest.assistants) || manifest.assistants.length === 0) {
    console.error('[SKILL_COMPILER] Manifest must have a non-empty "assistants" array')
    process.exit(1)
  }
  const ids = new Set<string>()
  const missingExecutionType: { assistantId: string; actionId: string }[] = []
  for (let i = 0; i < manifest.assistants.length; i++) {
    const a = manifest.assistants[i]
    if (!a.id || typeof a.id !== 'string') {
      console.error(`[SKILL_COMPILER] Assistant at index ${i}: missing or invalid "id"`)
      process.exit(1)
    }
    if (ids.has(a.id)) {
      console.error(`[SKILL_COMPILER] Duplicate assistant id: ${a.id}`)
      process.exit(1)
    }
    ids.add(a.id)
    if (!a.label || typeof a.label !== 'string') {
      console.error(`[SKILL_COMPILER] Assistant "${a.id}": missing or invalid "label"`)
      process.exit(1)
    }
    if (typeof a.intro !== 'string') {
      console.error(`[SKILL_COMPILER] Assistant "${a.id}": "intro" must be a string`)
      process.exit(1)
    }
    if (!a.iconId || typeof a.iconId !== 'string') {
      console.error(`[SKILL_COMPILER] Assistant "${a.id}": missing or invalid "iconId"`)
      process.exit(1)
    }
    if (!KIND_VALUES.includes(a.kind)) {
      console.error(`[SKILL_COMPILER] Assistant "${a.id}": "kind" must be one of ${KIND_VALUES.join(', ')}`)
      process.exit(1)
    }
    if (!Array.isArray(a.quickActions)) {
      console.error(`[SKILL_COMPILER] Assistant "${a.id}": "quickActions" must be an array`)
      process.exit(1)
    }
    if (typeof a.promptTemplate !== 'string') {
      console.error(`[SKILL_COMPILER] Assistant "${a.id}": "promptTemplate" must be a string`)
      process.exit(1)
    }
    if (a.tag?.variant && !TAG_VARIANTS.includes(a.tag.variant)) {
      console.error(`[SKILL_COMPILER] Assistant "${a.id}": tag.variant must be one of ${TAG_VARIANTS.join(', ')}`)
      process.exit(1)
    }
    for (let j = 0; j < a.quickActions.length; j++) {
      const q = a.quickActions[j]
      if (!q.id || !q.label || typeof q.templateMessage !== 'string') {
        console.error(`[SKILL_COMPILER] Assistant "${a.id}" quickActions[${j}]: id, label, templateMessage required`)
        process.exit(1)
      }
      if (q.executionType === undefined || q.executionType === null || q.executionType === '') {
        missingExecutionType.push({ assistantId: a.id, actionId: q.id })
      } else if (!EXECUTION_TYPE_VALUES.includes(q.executionType as (typeof EXECUTION_TYPE_VALUES)[number])) {
        console.error(
          `[SKILL_COMPILER] Quick action "${q.id}" of assistant "${a.id}" has invalid executionType: "${q.executionType}". ` +
            `Must be one of: ${EXECUTION_TYPE_VALUES.join(', ')}.`
        )
        process.exit(1)
      }
    }
  }
  if (missingExecutionType.length > 0) {
    console.error('[SKILL_COMPILER] Missing required "executionType" on the following quick actions:')
    for (const { assistantId, actionId } of missingExecutionType) {
      console.error(`  - assistantId="${assistantId}", actionId="${actionId}"`)
    }
    console.error(
      'Add executionType: "ui-only" | "tool-only" | "llm" | "hybrid" to each quick action in custom/assistants.manifest.json (see docs/audits/assistants-architecture-audit-verified.md). PR3 will backfill; this PR only enforces the requirement.'
    )
    process.exit(1)
  }
}

function escapeForTs(str: string): string {
  return JSON.stringify(str)
}

function emitQuickAction(q: QuickActionEntry): string {
  const parts = [
    `id: ${escapeForTs(q.id)}`,
    `label: ${escapeForTs(q.label)}`,
    `templateMessage: ${escapeForTs(q.templateMessage)}`,
    `executionType: ${escapeForTs(q.executionType)}`
  ]
  if (q.requiresSelection === true) parts.push('requiresSelection: true')
  if (q.requiresVision === true) parts.push('requiresVision: true')
  if (q.maxImages !== undefined) parts.push(`maxImages: ${q.maxImages}`)
  if (q.imageScale !== undefined) parts.push(`imageScale: ${q.imageScale}`)
  return `{ ${parts.join(', ')} }`
}

function emitTag(tag: TagEntry): string {
  const parts: string[] = []
  if (tag.isVisible === true) parts.push('isVisible: true')
  if (tag.label !== undefined) parts.push(`label: ${escapeForTs(tag.label)}`)
  if (tag.variant !== undefined) parts.push(`variant: ${escapeForTs(tag.variant)}`)
  return `{ ${parts.join(', ')} }`
}

function emitInstructionBlock(block: InstructionBlockEntry): string {
  const parts = [
    `id: ${escapeForTs(block.id)}`,
    `kind: ${escapeForTs(block.kind)}`,
    `content: ${escapeForTs(block.content)}`
  ]
  if (block.label !== undefined) parts.push(`label: ${escapeForTs(block.label)}`)
  if (block.enabled === false) parts.push('enabled: false')
  return `{ ${parts.join(', ')} }`
}

function emitSafetyOverrides(o: SafetyOverridesEntry): string {
  const parts: string[] = []
  if (o.allowImages === true) parts.push('allowImages: true')
  if (o.safetyToggles !== undefined && Object.keys(o.safetyToggles).length > 0) {
    parts.push(`safetyToggles: ${JSON.stringify(o.safetyToggles)}`)
  }
  return `{ ${parts.join(', ')} }`
}

function emitEntry(entry: AssistantManifestEntry): string {
  const lines: string[] = [
    '  {',
    `    id: ${escapeForTs(entry.id)},`,
    `    label: ${escapeForTs(entry.label)},`,
    `    intro: ${escapeForTs(entry.intro)},`
  ]
  if (entry.welcomeMessage !== undefined && entry.welcomeMessage !== '') {
    lines.push(`    welcomeMessage: ${escapeForTs(entry.welcomeMessage)},`)
  }
  if (entry.hoverSummary !== undefined && entry.hoverSummary !== '') {
    lines.push(`    hoverSummary: ${escapeForTs(entry.hoverSummary)},`)
  }
  if (entry.tag !== undefined && (entry.tag.isVisible || entry.tag.label || entry.tag.variant !== undefined)) {
    lines.push(`    tag: ${emitTag(entry.tag)},`)
  }
  lines.push(`    iconId: ${escapeForTs(entry.iconId)},`)
  lines.push(`    kind: ${escapeForTs(entry.kind)},`)
  lines.push('    quickActions: [')
  for (const q of entry.quickActions) {
    lines.push(`      ${emitQuickAction(q)},`)
  }
  lines.push('    ],')
  lines.push(`    promptTemplate: ${escapeForTs(entry.promptTemplate)}`)
  if (entry.instructionBlocks !== undefined && entry.instructionBlocks.length > 0) {
    lines.push('    , instructionBlocks: [')
    for (const b of entry.instructionBlocks) {
      lines.push(`      ${emitInstructionBlock(b)},`)
    }
    lines.push('    ]')
  }
  if (entry.toneStylePreset !== undefined && entry.toneStylePreset !== '') {
    lines.push(`    , toneStylePreset: ${escapeForTs(entry.toneStylePreset)}`)
  }
  if (entry.outputSchemaId !== undefined && entry.outputSchemaId !== '') {
    lines.push(`    , outputSchemaId: ${escapeForTs(entry.outputSchemaId)}`)
  }
  if (entry.safetyOverrides !== undefined && (entry.safetyOverrides.allowImages === true || (entry.safetyOverrides.safetyToggles && Object.keys(entry.safetyOverrides.safetyToggles).length > 0))) {
    lines.push(`    , safetyOverrides: ${emitSafetyOverrides(entry.safetyOverrides)}`)
  }
  if (entry.knowledgeBaseRefs !== undefined && entry.knowledgeBaseRefs.length > 0) {
    lines.push(`    , knowledgeBaseRefs: [${entry.knowledgeBaseRefs.map((id) => escapeForTs(id)).join(', ')}]`)
  }
  if (entry.toolSettings !== undefined) {
    const tsParts: string[] = []
    if (entry.toolSettings.defaultContentModel !== undefined) tsParts.push(`defaultContentModel: ${escapeForTs(entry.toolSettings.defaultContentModel)}`)
    if (entry.toolSettings.dedupeDefault !== undefined) tsParts.push(`dedupeDefault: ${entry.toolSettings.dedupeDefault}`)
    if (entry.toolSettings.quickActionsLocation !== undefined) tsParts.push(`quickActionsLocation: ${escapeForTs(entry.toolSettings.quickActionsLocation)}`)
    if (entry.toolSettings.showInput !== undefined) tsParts.push(`showInput: ${entry.toolSettings.showInput}`)
    if (tsParts.length > 0) lines.push(`    , toolSettings: { ${tsParts.join(', ')} }`)
  }
  lines.push('  }')
  return lines.join('\n')
}

function generateTs(manifest: ManifestRoot): string {
  const entries = manifest.assistants.map((e) => emitEntry(e)).join(',\n')
  return `/**
 * Generated Assistants (from custom/assistants.manifest.json)
 *
 * DO NOT EDIT MANUALLY - edit custom/assistants/<id>/manifest.json + SKILL.md (or custom/assistants.manifest.json for unmigrated assistants)
 *
 * Generated by scripts/compile-skills.ts
 */

import type { QuickAction, AssistantTag, InstructionBlock, SafetyOverrides, ToolSettings } from '../core/types'

export interface AssistantManifestEntry {
  id: string
  label: string
  intro: string
  welcomeMessage?: string
  hoverSummary?: string
  tag?: AssistantTag
  iconId: string
  kind: 'ai' | 'tool' | 'hybrid'
  quickActions: QuickAction[]
  promptTemplate: string
  instructionBlocks?: InstructionBlock[]
  toneStylePreset?: string
  outputSchemaId?: string
  safetyOverrides?: SafetyOverrides
  knowledgeBaseRefs?: string[]
  toolSettings?: ToolSettings
}

export const ASSISTANTS_MANIFEST: AssistantManifestEntry[] = [
${entries}
]
`
}

// --- SKILL.md parser ---

const STRUCTURAL_QUICK_ACTION_FIELDS = ['executionType', 'requiresSelection', 'requiresVision', 'maxImages', 'imageScale']

const CANONICAL_SECTIONS = ['identity', 'behavior', 'instruction blocks', 'output guidance', 'quick actions']

interface SkillQuickActionOverlay {
  templateMessage?: string
  guidance?: string
}

interface ParsedSkill {
  id: string
  sections: { name: string; content: string }[]
  quickActionOverlays: Map<string, SkillQuickActionOverlay>
}

function parseSkillMd(content: string, dirName: string): ParsedSkill {
  // 1. Extract frontmatter
  const fmMatch = content.match(/^---\n([\s\S]*?)\n---/)
  if (!fmMatch) {
    console.error(`[SKILL_COMPILER] SKILL.md in "${dirName}": missing YAML frontmatter block (--- ... ---)`)
    process.exit(1)
  }
  const frontmatter = fmMatch[1]

  // Parse skillVersion
  const svMatch = frontmatter.match(/^skillVersion:\s+(.+)$/m)
  if (!svMatch || !/^\d+$/.test(svMatch[1].trim()) || parseInt(svMatch[1].trim(), 10) !== 1) {
    console.error(`[SKILL_COMPILER] SKILL.md in "${dirName}": missing or invalid skillVersion (must be exactly integer 1)`)
    process.exit(1)
  }

  // Parse id
  const idMatch = frontmatter.match(/^id:\s+(.+)$/m)
  if (!idMatch) {
    console.error(`[SKILL_COMPILER] SKILL.md in "${dirName}": missing "id" in frontmatter`)
    process.exit(1)
  }
  const skillId = idMatch[1].trim()
  if (skillId !== dirName) {
    console.error(`[SKILL_COMPILER] SKILL.md in "${dirName}": frontmatter id "${skillId}" does not match directory name "${dirName}"`)
    process.exit(1)
  }

  // 2. Parse sections (split by ## headings, after removing frontmatter)
  const afterFrontmatter = content.slice(fmMatch[0].length)
  const sectionChunks = afterFrontmatter.split(/(?=^## )/m).filter(s => s.trim() !== '')

  const sections: { name: string; content: string }[] = []
  let quickActionOverlays = new Map<string, SkillQuickActionOverlay>()
  let hasIdentity = false

  for (const chunk of sectionChunks) {
    const headingMatch = chunk.match(/^## (.+)$/m)
    if (!headingMatch) continue
    const rawHeading = headingMatch[1].trim()
    const lowerHeading = rawHeading.toLowerCase()

    if (!CANONICAL_SECTIONS.includes(lowerHeading)) {
      console.error(`[SKILL_COMPILER] SKILL.md in "${dirName}": unknown section "## ${rawHeading}"`)
      process.exit(1)
    }

    // Content = everything after the heading line
    const sectionContent = chunk.slice(headingMatch.index! + headingMatch[0].length).trim()

    if (lowerHeading === 'identity') {
      hasIdentity = true
      sections.push({ name: 'identity', content: sectionContent })
    } else if (lowerHeading === 'quick actions') {
      // Parse ### subsections
      quickActionOverlays = parseQuickActionsSection(sectionContent, dirName)
    } else {
      sections.push({ name: lowerHeading, content: sectionContent })
    }
  }

  if (!hasIdentity) {
    console.error(`[SKILL_COMPILER] SKILL.md in "${dirName}": missing required "## Identity" section`)
    process.exit(1)
  }

  return { id: skillId, sections, quickActionOverlays }
}

function parseBlockScalar(text: string, fieldName: string): string | undefined {
  // Matches: fieldName: |\n  <indented content>
  const re = new RegExp(`^${fieldName}:\\s*\\|\\n((  [^\\n]*\\n?)*)`, 'm')
  const m = text.match(re)
  if (!m) return undefined
  // Strip 2-space indent from each line
  return m[1]
    .split('\n')
    .map(l => (l.startsWith('  ') ? l.slice(2) : l))
    .join('\n')
    .trimEnd()
}

function parseInlineField(text: string, fieldName: string): string | undefined {
  const re = new RegExp(`^${fieldName}:\\s+(.+)$`, 'm')
  const m = text.match(re)
  return m ? m[1].trim() : undefined
}

function parseQuickActionsSection(sectionContent: string, dirName: string): Map<string, SkillQuickActionOverlay> {
  const overlays = new Map<string, SkillQuickActionOverlay>()

  // Split by ### headings
  const subsectionChunks = sectionContent.split(/(?=^### )/m).filter(s => s.trim() !== '')

  for (const chunk of subsectionChunks) {
    const headingMatch = chunk.match(/^### (.+)$/m)
    if (!headingMatch) continue
    const actionId = headingMatch[1].trim()
    const body = chunk.slice(headingMatch.index! + headingMatch[0].length).trim()

    // Check for structural fields (hard error)
    for (const field of STRUCTURAL_QUICK_ACTION_FIELDS) {
      const re = new RegExp(`^${field}:\\s*`, 'm')
      if (re.test(body)) {
        console.error(`[SKILL_COMPILER] SKILL.md in "${dirName}", quick action "${actionId}": structural field "${field}" is not allowed in SKILL.md`)
        process.exit(1)
      }
    }

    const overlay: SkillQuickActionOverlay = {}

    // Parse templateMessage (block scalar or inline)
    const tmBlock = parseBlockScalar(body, 'templateMessage')
    if (tmBlock !== undefined) {
      overlay.templateMessage = tmBlock
    } else {
      const tmInline = parseInlineField(body, 'templateMessage')
      if (tmInline !== undefined) overlay.templateMessage = tmInline
    }

    // Parse guidance (block scalar or inline)
    const gBlock = parseBlockScalar(body, 'guidance')
    if (gBlock !== undefined) {
      overlay.guidance = gBlock
    } else {
      const gInline = parseInlineField(body, 'guidance')
      if (gInline !== undefined) overlay.guidance = gInline
    }

    overlays.set(actionId, overlay)
  }

  return overlays
}

function assemblePromptTemplate(sections: { name: string; content: string }[]): string {
  // Canonical order: identity, behavior, instruction blocks, output guidance
  const order = ['identity', 'behavior', 'instruction blocks', 'output guidance']
  const sorted = order
    .map(name => sections.find(s => s.name === name))
    .filter((s): s is { name: string; content: string } => s !== undefined && s.content !== '')
  return sorted.map(s => s.content).join('\n\n')
}

function loadPerDirManifest(manifestPath: string, dirName: string): AssistantManifestEntry {
  let raw: unknown
  try {
    raw = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))
  } catch (err) {
    console.error(`[SKILL_COMPILER] Failed to read/parse manifest at ${manifestPath}:`, err)
    process.exit(1)
  }
  const obj = raw as Record<string, unknown>
  if (!obj.id || typeof obj.id !== 'string') {
    console.error(`[SKILL_COMPILER] Per-directory manifest "${manifestPath}": missing "id" field`)
    process.exit(1)
  }
  if (obj.id !== dirName) {
    console.error(`[SKILL_COMPILER] Per-directory manifest "${manifestPath}": id "${obj.id}" does not match directory name "${dirName}"`)
    process.exit(1)
  }
  return raw as AssistantManifestEntry
}

function mergeSkillIntoEntry(entry: AssistantManifestEntry, skill: ParsedSkill, dirName: string): AssistantManifestEntry {
  // Build promptTemplate from SKILL.md sections
  const promptTemplate = assemblePromptTemplate(skill.sections)

  // Merge quick action overlays
  const quickActions = entry.quickActions.map(qa => {
    const overlay = skill.quickActionOverlays.get(qa.id)
    if (!overlay) return qa
    return {
      ...qa,
      ...(overlay.templateMessage !== undefined ? { templateMessage: overlay.templateMessage } : {}),
      ...(overlay.guidance !== undefined ? { guidance: overlay.guidance } : {})
    } as QuickActionEntry
  })

  // Validate: all overlay keys must reference known quick action IDs
  for (const [actionId] of skill.quickActionOverlays) {
    if (!entry.quickActions.find(qa => qa.id === actionId)) {
      console.error(`[SKILL_COMPILER] SKILL.md in "${dirName}": quick action overlay references unknown id "${actionId}" (not in manifest.json)`)
      process.exit(1)
    }
  }

  // Validate: all quick actions must have templateMessage (manifest or overlay)
  for (const qa of quickActions) {
    if (typeof qa.templateMessage !== 'string' || qa.templateMessage === '') {
      console.error(`[SKILL_COMPILER] Assistant "${dirName}", quick action "${qa.id}": missing templateMessage (not in manifest.json and not in SKILL.md overlay)`)
      process.exit(1)
    }
  }

  return { ...entry, promptTemplate, quickActions }
}

function scanPerDirectoryEntries(rootDir: string): { entries: AssistantManifestEntry[]; coveredIds: Set<string> } {
  const assistantsDir = path.join(rootDir, 'custom', 'assistants')
  const coveredIds = new Set<string>()
  const entries: AssistantManifestEntry[] = []

  if (!fs.existsSync(assistantsDir)) return { entries, coveredIds }

  const subdirs = fs.readdirSync(assistantsDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name)

  for (const dirName of subdirs) {
    const dirPath = path.join(assistantsDir, dirName)
    const manifestPath = path.join(dirPath, 'manifest.json')
    const skillPath = path.join(dirPath, 'SKILL.md')

    const hasManifest = fs.existsSync(manifestPath)
    const hasSkill = fs.existsSync(skillPath)

    if (!hasManifest) continue

    // Determine format
    let rawManifest: Record<string, unknown>
    try {
      rawManifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))
    } catch (err) {
      console.error(`[SKILL_COMPILER] Failed to read/parse ${manifestPath}:`, err)
      process.exit(1)
    }

    // Old format: has top-level "assistants" array → silently skip
    if (Array.isArray(rawManifest['assistants'])) {
      continue
    }

    // New flat entry format: has "id" at top level
    // Partial migration error: flat manifest but no SKILL.md
    if (!hasSkill) {
      console.error(`[SKILL_COMPILER] Partial migration error: "${dirName}" has a flat-entry manifest.json but no SKILL.md`)
      process.exit(1)
    }

    // Both manifest.json (flat) + SKILL.md present → process
    const entry = loadPerDirManifest(manifestPath, dirName)
    const skillContent = fs.readFileSync(skillPath, 'utf-8')
    const skill = parseSkillMd(skillContent, dirName)
    const merged = mergeSkillIntoEntry(entry, skill, dirName)

    entries.push(merged)
    coveredIds.add(dirName)
  }

  return { entries, coveredIds }
}

export function compile(rootDir: string): string {
  // 1. Scan custom/assistants/<id>/ for new-format entries (manifest.json flat + SKILL.md)
  // 2. Add found entries to coveredIds + perDirEntries
  // 3. Flat manifest fallback for uncovered IDs (with warnings)
  const { entries: perDirEntries, coveredIds } = scanPerDirectoryEntries(rootDir)

  const { manifest } = loadFlatManifest(rootDir)
  validateManifest(manifest)

  // Warn for each assistant resolved via flat manifest fallback
  const flatEntries: AssistantManifestEntry[] = []
  for (const a of manifest.assistants) {
    if (!coveredIds.has(a.id)) {
      console.warn(`[SKILL_COMPILER WARNING] "${a.id}" resolved via flat manifest fallback`)
      flatEntries.push(a)
    }
  }

  // Merge per-directory entries into manifest for generation
  // Per-directory entries are appended; flat manifest entries that are covered are replaced
  const allEntries: AssistantManifestEntry[] = [...perDirEntries, ...flatEntries]
  const mergedManifest: ManifestRoot = { assistants: allEntries }

  return generateTs(mergedManifest)
}

function main(): void {
  const rootDir = path.resolve(__dirname, '..')
  const code = compile(rootDir)
  const outputPath = path.join(rootDir, 'src/assistants/assistants.generated.ts')
  const dir = path.dirname(outputPath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  let existing = ''
  try {
    existing = fs.readFileSync(outputPath, 'utf-8')
  } catch {
    // file does not exist
  }
  if (existing === code) {
    console.log('[SKILL_COMPILER] No changes detected, skipping write')
  } else {
    fs.writeFileSync(outputPath, code, 'utf-8')
    console.log(`[SKILL_COMPILER] Generated: ${outputPath}`)
  }
  console.log('[SKILL_COMPILER] Done')
}

main()
