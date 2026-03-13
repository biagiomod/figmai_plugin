/**
 * Canonicalization helpers for ACE config files.
 * Shared between local Express server and hosted Lambda.
 *
 * Does NOT include file I/O utilities (those remain in admin-editor/src/fs.ts).
 */

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
 * Recursively sort object keys alphabetically.
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
  const rest = Object.keys(record)
    .filter((k) => !CONFIG_KEYS_ORDER.includes(k as (typeof CONFIG_KEYS_ORDER)[number]))
    .sort()
  for (const k of rest) {
    out[k] = sortKeys(record[k])
  }
  return out
}

/**
 * Canonicalize for assistants.manifest.json: top-level "assistants" key first;
 * array order preserved; object keys sorted alphabetically.
 */
export function canonicalizeAssistantsManifest(obj: unknown): unknown {
  if (obj === null || typeof obj !== 'object') return obj
  const record = obj as Record<string, unknown>
  const out: Record<string, unknown> = {}
  for (const k of MANIFEST_KEYS_ORDER) {
    if (record[k] !== undefined) out[k] = sortKeys(record[k])
  }
  const rest = Object.keys(record)
    .filter((k) => !MANIFEST_KEYS_ORDER.includes(k as (typeof MANIFEST_KEYS_ORDER)[number]))
    .sort()
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
