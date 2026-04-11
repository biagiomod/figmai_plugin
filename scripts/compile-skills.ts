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

export function compile(rootDir: string): string {
  // coveredIds: Set of assistant IDs already resolved via per-directory scanning.
  // Stubbed as empty in this task — all assistants come from the flat manifest.
  const coveredIds = new Set<string>()

  const { manifest } = loadFlatManifest(rootDir)
  validateManifest(manifest)

  // Warn for each assistant resolved via flat manifest fallback
  for (const a of manifest.assistants) {
    if (!coveredIds.has(a.id)) {
      console.warn(`[SKILL_COMPILER WARNING] "${a.id}" resolved via flat manifest fallback`)
    }
  }

  return generateTs(manifest)
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
