/**
 * Deterministic file write and backup utilities.
 * Stable key ordering for JSON; trailing newline; backup before write.
 */

import * as fs from 'fs'
import * as path from 'path'

/** Known top-level keys for config.json (order preserved). */
const CONFIG_KEYS_ORDER = [
  'ui',
  'llm',
  'knowledgeBases',
  'networkAccess',
  'resources',
  'designSystems',
  'analytics'
] as const

/** Known top-level keys for assistants.manifest.json. */
const MANIFEST_KEYS_ORDER = ['assistants'] as const

/**
 * Recursively sort object keys: use known order for known roots, else alphabetical.
 */
function sortKeys(obj: unknown): unknown {
  if (obj === null || typeof obj !== 'object') return obj
  if (Array.isArray(obj)) return obj.map(sortKeys)
  const record = obj as Record<string, unknown>
  const keys = Object.keys(record).sort((a, b) => a.localeCompare(b))
  const out: Record<string, unknown> = {}
  for (const k of keys) {
    out[k] = sortKeys(record[k])
  }
  return out
}

/**
 * Canonicalize for config.json: stable key order at top level, then alphabetical nested.
 */
export function canonicalizeConfig(obj: unknown): unknown {
  if (obj === null || typeof obj !== 'object') return obj
  const record = obj as Record<string, unknown>
  const out: Record<string, unknown> = {}
  for (const k of CONFIG_KEYS_ORDER) {
    if (record[k] !== undefined) out[k] = sortKeys(record[k])
  }
  const rest = Object.keys(record).filter((k) => !CONFIG_KEYS_ORDER.includes(k as any)).sort()
  for (const k of rest) {
    out[k] = sortKeys(record[k])
  }
  return out
}

/**
 * Canonicalize for assistants.manifest.json: top-level "assistants" only; array order preserved; object keys sorted.
 */
export function canonicalizeAssistantsManifest(obj: unknown): unknown {
  if (obj === null || typeof obj !== 'object') return obj
  const record = obj as Record<string, unknown>
  const out: Record<string, unknown> = {}
  for (const k of MANIFEST_KEYS_ORDER) {
    if (record[k] !== undefined) out[k] = sortKeys(record[k])
  }
  const rest = Object.keys(record).filter((k) => !MANIFEST_KEYS_ORDER.includes(k as any)).sort()
  for (const k of rest) {
    out[k] = sortKeys(record[k])
  }
  return out
}

/**
 * Generic JSON canonicalize: sort all keys alphabetically.
 */
export function canonicalizeJson(obj: unknown): unknown {
  return sortKeys(obj)
}

export function ensureTrailingNewline(s: string): string {
  if (s.length === 0) return '\n'
  return s.endsWith('\n') ? s : s + '\n'
}

/**
 * Write content to path only if it differs from existing content.
 * Returns true if written, false if unchanged.
 */
export function writeFileIfChanged(filePath: string, content: string): boolean {
  const dir = path.dirname(filePath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  let existing = ''
  try {
    existing = fs.readFileSync(filePath, 'utf-8')
  } catch {
    // file does not exist
  }
  if (existing === content) return false
  fs.writeFileSync(filePath, content, 'utf-8')
  return true
}

/**
 * Copy file to backupRoot, mirroring path relative to repoRoot.
 * e.g. backupFile('/repo/custom/config.json', '/repo/admin-editor/.backups/2025-01-21T12-00-00Z', '/repo')
 * -> backup at /repo/admin-editor/.backups/2025-01-21T12-00-00Z/custom/config.json
 */
export function backupFile(absoluteFilePath: string, backupRoot: string, repoRoot: string): string {
  const relative = path.relative(repoRoot, absoluteFilePath)
  const backupPath = path.join(backupRoot, relative)
  const backupDir = path.dirname(backupPath)
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true })
  }
  fs.copyFileSync(absoluteFilePath, backupPath)
  return backupPath
}

/**
 * Create a timestamp string for backup directory (ISO-like, filesystem-safe).
 */
export function backupTimestamp(): string {
  const d = new Date()
  return d.toISOString().replace(/[:.]/g, '-').slice(0, 19)
}
