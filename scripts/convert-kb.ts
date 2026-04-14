#!/usr/bin/env node
/**
 * Convert markdown or loose JSON to normalized KB document (PR11a).
 * Usage:
 *   --from md|json  --input <path>  --id <id>  --preview | --write  [--title <string>] [--force]
 * With --write, refuses to overwrite an existing <id>.kb.json unless --force is given.
 */

import * as fs from 'fs'
import * as path from 'path'
import {
  getDefaultKbDocument,
  knowledgeBaseDocumentSchema,
  type KnowledgeBaseDocument
} from '../shared/ace-config/schemas'
import { parseMarkdown, normalizeLooseJson } from '../shared/ace-config/kbNormalize'

const KB_DIR = path.join(process.cwd(), 'custom', 'knowledge-bases')
const REGISTRY_PATH = path.join(KB_DIR, 'registry.json')

// Canonical key order for deterministic output
const KB_KEYS_ORDER: (keyof KnowledgeBaseDocument)[] = [
  'id',
  'title',
  'source',
  'updatedAt',
  'version',
  'tags',
  'purpose',
  'scope',
  'definitions',
  'rulesConstraints',
  'doDont',
  'examples',
  'edgeCases'
]

function parseArgs(): {
  from: 'md' | 'json'
  input: string
  id: string
  preview: boolean
  write: boolean
  force: boolean
  title?: string
} {
  const args = process.argv.slice(2)
  let from: 'md' | 'json' | null = null
  let input: string | null = null
  let id: string | null = null
  let preview = false
  let write = false
  let force = false
  let title: string | undefined

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--from':
        from = args[++i] as 'md' | 'json'
        break
      case '--input':
        input = args[++i]
        break
      case '--id':
        id = args[++i]
        break
      case '--preview':
        preview = true
        break
      case '--write':
        write = true
        break
      case '--force':
        force = true
        break
      case '--title':
        title = args[++i]
        break
    }
  }

  if (!from || from !== 'md' && from !== 'json') {
    console.error('Usage: --from md|json --input <path> --id <id> --preview|--write [--title <string>] [--force]')
    process.exit(1)
  }
  if (!input || !id) {
    console.error('Required: --input <path> and --id <id>')
    process.exit(1)
  }
  if (!preview && !write) {
    console.error('Specify either --preview or --write')
    process.exit(1)
  }
  if (preview && write) {
    console.error('Use either --preview or --write, not both')
    process.exit(1)
  }

  return { from, input, id, preview, write, force, title }
}

function toOrderedDoc(doc: KnowledgeBaseDocument): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const k of KB_KEYS_ORDER) {
    if (k in doc) out[k] = (doc as Record<string, unknown>)[k]
  }
  // passthrough extras at end
  for (const k of Object.keys(doc)) {
    if (!KB_KEYS_ORDER.includes(k as keyof KnowledgeBaseDocument)) out[k] = (doc as Record<string, unknown>)[k]
  }
  return out
}

function stringifyDoc(doc: KnowledgeBaseDocument): string {
  return JSON.stringify(toOrderedDoc(doc), null, 2)
}

// ----- JSON (file) -----

function parseLooseJson(inputPath: string, id: string, titleOverride?: string): KnowledgeBaseDocument {
  const raw = fs.readFileSync(inputPath, 'utf-8')
  const parsed = JSON.parse(raw) as Record<string, unknown>
  return normalizeLooseJson(parsed, id, titleOverride)
}

// ----- Registry -----

interface RegistryEntry {
  id: string
  title: string
  filePath: string
  tags?: string[]
  version?: string
}

function readRegistry(): { knowledgeBases: RegistryEntry[] } {
  if (!fs.existsSync(REGISTRY_PATH)) return { knowledgeBases: [] }
  const data = fs.readFileSync(REGISTRY_PATH, 'utf-8')
  return JSON.parse(data) as { knowledgeBases: RegistryEntry[] }
}

function ensureRegistryEntry(doc: KnowledgeBaseDocument, titleOverride?: string): void {
  const registry = readRegistry()
  const title = (titleOverride ?? doc.title) || doc.id
  const filePath = `${doc.id}.kb.json`
  const existing = registry.knowledgeBases.find((e) => e.id === doc.id)
  const entry: RegistryEntry = {
    id: doc.id,
    title,
    filePath,
    ...(doc.tags?.length ? { tags: doc.tags } : {}),
    ...(doc.version ? { version: doc.version } : {})
  }
  if (existing) {
    const i = registry.knowledgeBases.indexOf(existing)
    registry.knowledgeBases[i] = entry
  } else {
    registry.knowledgeBases.push(entry)
  }
  fs.mkdirSync(KB_DIR, { recursive: true })
  fs.writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2), 'utf-8')
}

// ----- Main (only when run as script) -----

export { parseMarkdown, normalizeLooseJson, stringifyDoc }

function main(): void {
  const { from, input, id, preview, write, force, title } = parseArgs()

  const inputPath = path.isAbsolute(input) ? input : path.join(process.cwd(), input)
  if (!fs.existsSync(inputPath)) {
    console.error('Input file not found:', inputPath)
    process.exit(1)
  }

  let doc: KnowledgeBaseDocument
  if (from === 'md') {
    const md = fs.readFileSync(inputPath, 'utf-8')
    doc = parseMarkdown(md, id, title)
  } else {
    doc = parseLooseJson(inputPath, id, title)
  }

  if (write) {
    doc.updatedAt = new Date().toISOString()
    doc = knowledgeBaseDocumentSchema.parse(doc)
    fs.mkdirSync(KB_DIR, { recursive: true })
    const outPath = path.join(KB_DIR, `${doc.id}.kb.json`)
    if (fs.existsSync(outPath) && !force) {
      console.error(`Target file already exists: ${outPath}. Use --force to overwrite.`)
      process.exit(1)
    }
    fs.writeFileSync(outPath, stringifyDoc(doc), 'utf-8')
    ensureRegistryEntry(doc, title)
    console.log('Wrote', outPath)
  } else {
    console.log(stringifyDoc(doc))
  }
}

const isEntry = process.argv[1]?.includes('convert-kb')
if (isEntry) main()
