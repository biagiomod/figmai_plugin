#!/usr/bin/env node
/**
 * Generate src/knowledge-bases/knowledgeBases.generated.ts from custom/knowledge-bases/
 * (registry.json + *.kb.json). Build-time only; no runtime file reads.
 * PR11c1. Fails with clear messages if registry references missing files or invalid docs.
 */

import * as fs from 'fs'
import * as path from 'path'
import { knowledgeBaseDocumentSchema } from '../shared/ace-config/schemas'
import type { KnowledgeBaseDocument } from '../shared/ace-config/schemas'
import type { ZodError } from 'zod'

/** Allow override for tests (e.g. KB_GENERATOR_ROOT=/tmp/kb-test). */
const ROOT = process.env.KB_GENERATOR_ROOT ? path.resolve(process.env.KB_GENERATOR_ROOT) : path.resolve(__dirname, '..')
const KB_DIR = path.join(ROOT, 'custom', 'knowledge-bases')
const REGISTRY_PATH = path.join(KB_DIR, 'registry.json')
const SKILLS_DIR = path.join(ROOT, 'custom', 'skills')
const SKILLS_REGISTRY_PATH = path.join(SKILLS_DIR, 'registry.json')
const OUT_PATH = path.join(ROOT, 'src', 'knowledge-bases', 'knowledgeBases.generated.ts')

interface RegistryEntry {
  id: string
  title: string
  filePath: string
  tags?: string[]
  version?: string
  updatedAt?: string
}

function formatZodErrors(err: ZodError): string[] {
  return err.errors.map((e) => `${e.path.join('.')}: ${e.message}`)
}

function loadRegistry(): RegistryEntry[] {
  if (!fs.existsSync(REGISTRY_PATH)) return []
  const raw = fs.readFileSync(REGISTRY_PATH, 'utf-8')
  const data = JSON.parse(raw) as { knowledgeBases?: RegistryEntry[] }
  return Array.isArray(data.knowledgeBases) ? data.knowledgeBases : []
}

function loadDoc(
  filePath: string
): { doc: KnowledgeBaseDocument } | { error: string } | { missing: true } {
  const fullPath = path.join(KB_DIR, filePath)
  if (!fs.existsSync(fullPath)) return { missing: true }
  let raw: string
  let parsed: unknown
  try {
    raw = fs.readFileSync(fullPath, 'utf-8')
    parsed = JSON.parse(raw)
  } catch (e) {
    return { error: (e as Error).message }
  }
  const result = knowledgeBaseDocumentSchema.safeParse(parsed)
  if (!result.success) {
    return { error: formatZodErrors(result.error).join('; ') }
  }
  return { doc: result.data }
}

function escapeForTs(s: string): string {
  return JSON.stringify(s)
}

function emitRegistry(entries: RegistryEntry[]): string {
  const lines: string[] = ['export const KB_REGISTRY: Record<string, { id: string; title: string; filePath: string; tags?: string[]; version?: string; updatedAt?: string }> = {']
  for (const e of entries) {
    const parts = [
      `id: ${escapeForTs(e.id)}`,
      `title: ${escapeForTs(e.title)}`,
      `filePath: ${escapeForTs(e.filePath)}`
    ]
    if (e.tags?.length) parts.push(`tags: [${e.tags.map(escapeForTs).join(', ')}]`)
    if (e.version) parts.push(`version: ${escapeForTs(e.version)}`)
    if (e.updatedAt) parts.push(`updatedAt: ${escapeForTs(e.updatedAt)}`)
    lines.push(`  ${escapeForTs(e.id)}: { ${parts.join(', ')} },`)
  }
  lines.push('}')
  return lines.join('\n')
}

function emitDoc(doc: KnowledgeBaseDocument): string {
  const doDont = `{ do: [${(doc.doDont?.do ?? []).map(escapeForTs).join(', ')}], dont: [${(doc.doDont?.dont ?? []).map(escapeForTs).join(', ')}] }`
  const parts: string[] = [
    `id: ${escapeForTs(doc.id)}`,
    `title: ${escapeForTs(doc.title ?? '')}`,
    `purpose: ${escapeForTs(doc.purpose ?? '')}`,
    `scope: ${escapeForTs(doc.scope ?? '')}`,
    `definitions: [${(doc.definitions ?? []).map(escapeForTs).join(', ')}]`,
    `rulesConstraints: [${(doc.rulesConstraints ?? []).map(escapeForTs).join(', ')}]`,
    `doDont: ${doDont}`,
    `examples: [${(doc.examples ?? []).map(escapeForTs).join(', ')}]`,
    `edgeCases: [${(doc.edgeCases ?? []).map(escapeForTs).join(', ')}]`
  ]
  if (doc.source != null && doc.source !== '') parts.push(`source: ${escapeForTs(doc.source)}`)
  if (doc.updatedAt) parts.push(`updatedAt: ${escapeForTs(doc.updatedAt)}`)
  if (doc.version) parts.push(`version: ${escapeForTs(doc.version)}`)
  if (doc.tags?.length) parts.push(`tags: [${doc.tags.map(escapeForTs).join(', ')}]`)
  return `  ${escapeForTs(doc.id)}: { ${parts.join(', ')} }`
}

interface SkillRegistryEntry {
  id: string
  title: string
  kind: string
  filePath: string
}

function loadSkillsRegistry(): SkillRegistryEntry[] {
  if (!fs.existsSync(SKILLS_REGISTRY_PATH)) return []
  const raw = fs.readFileSync(SKILLS_REGISTRY_PATH, 'utf-8')
  const data = JSON.parse(raw) as { skills?: SkillRegistryEntry[] }
  return Array.isArray(data.skills) ? data.skills : []
}

function parseSkillMarkdown(id: string, title: string, content: string): KnowledgeBaseDocument {
  let frontmatterVersion = ''
  let frontmatterTags: string[] = []
  let frontmatterUpdatedAt = ''
  let body = content

  // Extract frontmatter between first --- and second ---
  const fmMatch = content.match(/^---\s*\n([\s\S]*?)\n---\s*\n([\s\S]*)$/)
  if (fmMatch) {
    const fmBlock = fmMatch[1]
    body = fmMatch[2]
    // Parse version
    const versionMatch = fmBlock.match(/^version:\s*["']?(.+?)["']?\s*$/m)
    if (versionMatch) frontmatterVersion = versionMatch[1].trim()
    // Parse updatedAt
    const updatedAtMatch = fmBlock.match(/^updatedAt:\s*["']?(.+?)["']?\s*$/m)
    if (updatedAtMatch) frontmatterUpdatedAt = updatedAtMatch[1].trim()
    // Parse tags
    const tagsMatch = fmBlock.match(/^tags:\s*\[([^\]]*)\]/m)
    if (tagsMatch) {
      frontmatterTags = tagsMatch[1]
        .split(',')
        .map((t) => t.trim().replace(/^["']|["']$/g, ''))
        .filter(Boolean)
    }
  }

  // Split body into sections by ## Heading
  const sections: Record<string, string> = {}
  const sectionRegex = /^## (.+)$/m
  const parts = body.split(sectionRegex)
  // parts[0] is before the first section; then alternating: heading, content
  for (let i = 1; i < parts.length; i += 2) {
    const heading = parts[i].trim()
    const sectionBody = parts[i + 1] ?? ''
    sections[heading] = sectionBody.trim()
  }

  function extractList(sectionBody: string): string[] {
    if (!sectionBody) return []
    return sectionBody
      .split('\n')
      .filter((line) => line.startsWith('- '))
      .map((line) => line.slice(2).trim())
      .filter(Boolean)
  }

  const purpose = sections['Purpose'] ?? ''
  const scope = sections['Scope'] ?? ''
  const definitions = extractList(sections['Definitions'] ?? '')
  const rulesConstraints = extractList(sections['Rules'] ?? '')
  const doDo = extractList(sections['Do'] ?? '')
  const doDont = extractList(sections["Don't"] ?? "")
  const examples = extractList(sections['Examples'] ?? '')
  const edgeCases = extractList(sections['Edge Cases'] ?? '')

  const doc: KnowledgeBaseDocument = {
    id,
    title,
    purpose,
    scope,
    definitions,
    rulesConstraints,
    doDont: { do: doDo, dont: doDont },
    examples,
    edgeCases,
    ...(frontmatterVersion ? { version: frontmatterVersion } : {}),
    ...(frontmatterTags.length ? { tags: frontmatterTags } : {}),
    ...(frontmatterUpdatedAt ? { updatedAt: frontmatterUpdatedAt } : {})
  }

  return doc
}

function main(): void {
  const registry = loadRegistry()
  const registryMap: Record<string, RegistryEntry> = {}
  const docsMap: Record<string, KnowledgeBaseDocument> = {}
  const missingFiles: { id: string; filePath: string }[] = []
  const invalidDocs: { id: string; message: string }[] = []

  for (const entry of registry) {
    registryMap[entry.id] = entry
    const result = loadDoc(entry.filePath)
    if ('missing' in result) {
      missingFiles.push({ id: entry.id, filePath: entry.filePath })
      continue
    }
    if ('error' in result) {
      invalidDocs.push({ id: entry.id, message: result.error })
      continue
    }
    docsMap[entry.id] = result.doc
  }

  if (missingFiles.length > 0) {
    const list = missingFiles.map((m) => `${m.id} (${m.filePath})`).join(', ')
    console.error('[generate-knowledge-bases] Missing KB files:', list)
    process.exit(1)
  }
  if (invalidDocs.length > 0) {
    const list = invalidDocs.map((d) => `${d.id}: ${d.message}`).join('\n  ')
    console.error('[generate-knowledge-bases] Invalid KB document(s):\n  ', list)
    process.exit(1)
  }

  // Load and process skills
  const skillsRegistry = loadSkillsRegistry()
  const allRegistryEntries: RegistryEntry[] = [...registry]
  const skillErrors: { id: string; message: string }[] = []

  for (const skill of skillsRegistry) {
    if (docsMap[skill.id] || registryMap[skill.id]) {
      throw new Error(`[generate-knowledge-bases] Skill ID '${skill.id}' conflicts with an existing KB ID. Skill IDs must be unique across KBs and skills.`)
    }
    const skillPath = path.join(SKILLS_DIR, skill.filePath)
    if (!fs.existsSync(skillPath)) {
      skillErrors.push({ id: skill.id, message: `Missing skill file: ${skill.filePath}` })
      continue
    }
    try {
      const content = fs.readFileSync(skillPath, 'utf-8')
      const doc = parseSkillMarkdown(skill.id, skill.title, content)
      docsMap[skill.id] = doc
      allRegistryEntries.push({ id: skill.id, title: skill.title, filePath: skill.filePath })
    } catch (e) {
      skillErrors.push({ id: skill.id, message: (e as Error).message })
    }
  }

  if (skillErrors.length > 0) {
    const list = skillErrors.map((d) => `${d.id}: ${d.message}`).join('\n  ')
    console.error('[generate-knowledge-bases] Skill error(s):\n  ', list)
    process.exit(1)
  }

  const header = `/**
 * Generated from custom/knowledge-bases/ (registry + *.kb.json) and custom/skills/ (registry + *.md).
 * Do not edit by hand. Run: npm run generate-knowledge-bases
 * PR11c1.
 */

import type { KnowledgeBaseDocument } from '../core/knowledgeBases/types'
`

  const registryCode = emitRegistry(allRegistryEntries)
  const docsLines = ['export const KB_DOCS: Record<string, KnowledgeBaseDocument> = {']
  for (const id of Object.keys(docsMap).sort()) {
    docsLines.push(emitDoc(docsMap[id]) + ',')
  }
  docsLines.push('}')

  const out = header + '\n' + registryCode + '\n\n' + docsLines.join('\n') + '\n'

  const dir = path.dirname(OUT_PATH)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

  let existing = ''
  try {
    existing = fs.readFileSync(OUT_PATH, 'utf-8')
  } catch {
    // nop
  }
  if (existing === out) {
    console.log('[generate-knowledge-bases] No changes detected, skipping write')
  } else {
    fs.writeFileSync(OUT_PATH, out, 'utf-8')
    console.log('[generate-knowledge-bases] Generated:', OUT_PATH)
  }
  console.log('[generate-knowledge-bases] ✓ Done')
}

main()
