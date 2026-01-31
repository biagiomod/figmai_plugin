#!/usr/bin/env node
/**
 * Assistants Generator
 *
 * Reads custom/assistants.manifest.json and generates src/assistants/assistants.generated.ts
 * so the runtime can build the ASSISTANTS array without editing TypeScript.
 * Used by Admin Config Editor (Phase 0). Deterministic output; fails clearly if manifest is invalid.
 */

import * as fs from 'fs'
import * as path from 'path'

const KIND_VALUES = ['ai', 'tool', 'hybrid'] as const
const TAG_VARIANTS = ['new', 'beta', 'alpha'] as const

interface QuickActionEntry {
  id: string
  label: string
  templateMessage: string
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
}

interface ManifestRoot {
  assistants: AssistantManifestEntry[]
}

function loadManifest(rootDir: string): ManifestRoot {
  const manifestPath = path.join(rootDir, 'custom', 'assistants.manifest.json')
  if (!fs.existsSync(manifestPath)) {
    console.error('[generate-assistants] Missing custom/assistants.manifest.json')
    process.exit(1)
  }
  try {
    const content = fs.readFileSync(manifestPath, 'utf-8')
    return JSON.parse(content) as ManifestRoot
  } catch (err) {
    console.error('[generate-assistants] Failed to read or parse manifest:', err)
    process.exit(1)
  }
}

function validateManifest(manifest: ManifestRoot): void {
  if (!Array.isArray(manifest.assistants) || manifest.assistants.length === 0) {
    console.error('[generate-assistants] Manifest must have a non-empty "assistants" array')
    process.exit(1)
  }
  const ids = new Set<string>()
  for (let i = 0; i < manifest.assistants.length; i++) {
    const a = manifest.assistants[i]
    if (!a.id || typeof a.id !== 'string') {
      console.error(`[generate-assistants] Assistant at index ${i}: missing or invalid "id"`)
      process.exit(1)
    }
    if (ids.has(a.id)) {
      console.error(`[generate-assistants] Duplicate assistant id: ${a.id}`)
      process.exit(1)
    }
    ids.add(a.id)
    if (!a.label || typeof a.label !== 'string') {
      console.error(`[generate-assistants] Assistant "${a.id}": missing or invalid "label"`)
      process.exit(1)
    }
    if (typeof a.intro !== 'string') {
      console.error(`[generate-assistants] Assistant "${a.id}": "intro" must be a string`)
      process.exit(1)
    }
    if (!a.iconId || typeof a.iconId !== 'string') {
      console.error(`[generate-assistants] Assistant "${a.id}": missing or invalid "iconId"`)
      process.exit(1)
    }
    if (!KIND_VALUES.includes(a.kind)) {
      console.error(`[generate-assistants] Assistant "${a.id}": "kind" must be one of ${KIND_VALUES.join(', ')}`)
      process.exit(1)
    }
    if (!Array.isArray(a.quickActions)) {
      console.error(`[generate-assistants] Assistant "${a.id}": "quickActions" must be an array`)
      process.exit(1)
    }
    if (typeof a.promptTemplate !== 'string') {
      console.error(`[generate-assistants] Assistant "${a.id}": "promptTemplate" must be a string`)
      process.exit(1)
    }
    if (a.tag?.variant && !TAG_VARIANTS.includes(a.tag.variant)) {
      console.error(`[generate-assistants] Assistant "${a.id}": tag.variant must be one of ${TAG_VARIANTS.join(', ')}`)
      process.exit(1)
    }
    for (let j = 0; j < a.quickActions.length; j++) {
      const q = a.quickActions[j]
      if (!q.id || !q.label || typeof q.templateMessage !== 'string') {
        console.error(`[generate-assistants] Assistant "${a.id}" quickActions[${j}]: id, label, templateMessage required`)
        process.exit(1)
      }
    }
  }
}

function escapeForTs(str: string): string {
  return JSON.stringify(str)
}

function emitQuickAction(q: QuickActionEntry): string {
  const parts = [
    `id: ${escapeForTs(q.id)}`,
    `label: ${escapeForTs(q.label)}`,
    `templateMessage: ${escapeForTs(q.templateMessage)}`
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
  lines.push('  }')
  return lines.join('\n')
}

function generateTs(manifest: ManifestRoot): string {
  const entries = manifest.assistants.map((e) => emitEntry(e)).join(',\n')
  return `/**
 * Generated Assistants (from custom/assistants.manifest.json)
 *
 * DO NOT EDIT MANUALLY - edit custom/assistants.manifest.json and run npm run generate-assistants
 *
 * Generated by scripts/generate-assistants-from-manifest.ts
 */

import type { QuickAction, AssistantTag } from '../core/types'

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
}

export const ASSISTANTS_MANIFEST: AssistantManifestEntry[] = [
${entries}
]
`
}

function main(): void {
  const rootDir = path.resolve(__dirname, '..')
  const manifest = loadManifest(rootDir)
  validateManifest(manifest)
  const code = generateTs(manifest)
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
    console.log('[generate-assistants] No changes detected, skipping write')
  } else {
    fs.writeFileSync(outputPath, code, 'utf-8')
    console.log(`[generate-assistants] Generated: ${outputPath}`)
  }
  console.log('[generate-assistants] ✓ Done')
}

main()
