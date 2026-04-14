/**
 * Load AdminEditableModel from repo files.
 * Reads only agreed sources-of-truth; no TS edits.
 * Computes revision (hash of path + mtimeMs + size) for concurrency guard.
 */

import * as crypto from 'crypto'
import * as fs from 'fs'
import * as path from 'path'
import type { AdminEditableModel } from './schema'

export interface ModelMeta {
  repoRoot: string
  filePaths: {
    config: string
    assistantsManifest: string
    customKnowledge: Record<string, string> // assistantId -> absolute path
    contentModels: string
    designSystemRegistries: Record<string, string> // registryId -> absolute path
    skillMd: Record<string, string> // assistantId -> absolute path
    dsSkillMd: Record<string, string> // dsId -> absolute path ('__top_level__' for top-level)
  }
  lastModified: Record<string, string> // path -> ISO string (best-effort)
  /** path -> { mtimeMs, size } for all loaded editable files */
  files: Record<string, { mtimeMs: number; size: number }>
  /** Stable hash of path + mtimeMs + size for concurrency guard */
  revision: string
}

function safeStatMtime(filePath: string): string | undefined {
  try {
    const stat = fs.statSync(filePath)
    return stat.mtime.toISOString()
  } catch {
    return undefined
  }
}

function readJson<T>(filePath: string): T | null {
  try {
    if (!fs.existsSync(filePath)) return null
    const content = fs.readFileSync(filePath, 'utf-8')
    return JSON.parse(content) as T
  } catch {
    return null
  }
}

function readText(filePath: string): string {
  try {
    if (!fs.existsSync(filePath)) return ''
    return fs.readFileSync(filePath, 'utf-8')
  } catch {
    return ''
  }
}

/**
 * Load assistants from per-directory manifests (custom/assistants/<id>/manifest.json).
 * Used as fallback when the root assistants.manifest.json exists but has an empty assistants array.
 */
function loadPerDirectoryAssistants(repoRoot: string): unknown[] {
  const assistantsDir = path.join(repoRoot, 'custom', 'assistants')
  if (!fs.existsSync(assistantsDir)) return []
  let entries: string[]
  try {
    entries = fs.readdirSync(assistantsDir)
  } catch {
    return []
  }
  const results: unknown[] = []
  for (const entry of entries) {
    const manifestPath = path.join(assistantsDir, entry, 'manifest.json')
    if (!fs.existsSync(manifestPath)) continue
    try {
      const parsed = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'))
      if (parsed && typeof parsed.id === 'string' && typeof parsed.label === 'string') {
        results.push(parsed)
      }
    } catch {
      // skip malformed manifest
    }
  }
  return results
}

/**
 * Load custom/knowledge/*.md (skip README, *.example.md).
 * Returns map by assistantId (filename without .md).
 */
function loadCustomKnowledge(repoRoot: string): { byId: Record<string, string>; paths: Record<string, string> } {
  const knowledgeDir = path.join(repoRoot, 'custom', 'knowledge')
  const byId: Record<string, string> = {}
  const paths: Record<string, string> = {}
  if (!fs.existsSync(knowledgeDir)) return { byId, paths }
  try {
    const files = fs.readdirSync(knowledgeDir)
    for (const file of files) {
      if (file === 'README.md' || file.endsWith('.example.md')) continue
      if (file.endsWith('.md')) {
        const assistantId = file.replace(/\.md$/, '')
        const filePath = path.join(knowledgeDir, file)
        byId[assistantId] = readText(filePath)
        paths[assistantId] = filePath
      }
    }
  } catch {
    // ignore
  }
  return { byId, paths }
}

/**
 * Load custom/design-systems/<id>/registry.json.
 */
function loadDesignSystemRegistries(repoRoot: string): {
  registries: Record<string, unknown>
  paths: Record<string, string>
} {
  const dsDir = path.join(repoRoot, 'custom', 'design-systems')
  const registries: Record<string, unknown> = {}
  const paths: Record<string, string> = {}
  if (!fs.existsSync(dsDir)) return { registries, paths }
  try {
    const entries = fs.readdirSync(dsDir, { withFileTypes: true })
    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      const registryPath = path.join(dsDir, entry.name, 'registry.json')
      if (fs.existsSync(registryPath)) {
        const data = readJson<unknown>(registryPath)
        if (data !== null) {
          registries[entry.name] = data
          paths[entry.name] = registryPath
        }
      }
    }
  } catch {
    // ignore
  }
  return { registries, paths }
}

/**
 * Load custom/assistants/<id>/SKILL.md for each migrated assistant directory.
 * Returns map by assistantId -> content, and assistantId -> absolute path.
 */
function loadSkillMdContent(repoRoot: string): { byId: Record<string, string>; paths: Record<string, string> } {
  const assistantsDir = path.join(repoRoot, 'custom', 'assistants')
  const byId: Record<string, string> = {}
  const paths: Record<string, string> = {}
  if (!fs.existsSync(assistantsDir)) return { byId, paths }
  try {
    const entries = fs.readdirSync(assistantsDir, { withFileTypes: true })
    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      const skillPath = path.join(assistantsDir, entry.name, 'SKILL.md')
      if (fs.existsSync(skillPath)) {
        byId[entry.name] = readText(skillPath)
        paths[entry.name] = skillPath
      }
    }
  } catch {
    // ignore
  }
  return { byId, paths }
}

/**
 * Load custom/design-systems/SKILL.md (top-level) and
 * custom/design-systems/<id>/SKILL.md (per-DS).
 * Returns map by dsId -> content, and dsId -> absolute path.
 * '__top_level__' key is used for the top-level SKILL.md.
 */
function loadDesignSystemSkillMd(repoRoot: string): { byId: Record<string, string>; paths: Record<string, string> } {
  const dsDir = path.join(repoRoot, 'custom', 'design-systems')
  const byId: Record<string, string> = {}
  const paths: Record<string, string> = {}
  if (!fs.existsSync(dsDir)) return { byId, paths }
  try {
    // Top-level SKILL.md
    const topLevelPath = path.join(dsDir, 'SKILL.md')
    if (fs.existsSync(topLevelPath)) {
      byId['__top_level__'] = readText(topLevelPath)
      paths['__top_level__'] = topLevelPath
    }
    // Per-DS SKILL.md
    const entries = fs.readdirSync(dsDir, { withFileTypes: true })
    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      if (entry.name === '__top_level__') continue  // reserved sentinel key
      const skillPath = path.join(dsDir, entry.name, 'SKILL.md')
      if (fs.existsSync(skillPath)) {
        byId[entry.name] = readText(skillPath)
        paths[entry.name] = skillPath
      }
    }
  } catch {
    // ignore errors — DS SKILL.md is optional
  }
  return { byId, paths }
}

export function loadSkillsRegistry(repoRoot: string): { skills: Array<{ id: string; title: string; kind: string; filePath: string }> } {
  const registryPath = path.join(repoRoot, 'custom', 'skills', 'registry.json')
  try {
    if (!fs.existsSync(registryPath)) return { skills: [] }
    const raw = fs.readFileSync(registryPath, 'utf-8')
    const data = JSON.parse(raw) as { skills?: Array<{ id: string; title: string; kind: string; filePath: string }> }
    return { skills: Array.isArray(data.skills) ? data.skills : [] }
  } catch {
    return { skills: [] }
  }
}

export function loadModel(repoRoot: string): { model: AdminEditableModel; meta: ModelMeta } {
  const configPath = path.join(repoRoot, 'custom', 'config.json')
  const manifestPath = path.join(repoRoot, 'custom', 'assistants.manifest.json')
  const contentModelsPath = path.join(repoRoot, 'docs', 'content-models.md')

  const config = readJson<AdminEditableModel['config']>(configPath) ?? {}
  const rawManifest = readJson<AdminEditableModel['assistantsManifest']>(manifestPath) ?? { assistants: [] }
  // Fall back to per-directory manifests when the root file exists but has no assistants
  const manifest: AdminEditableModel['assistantsManifest'] =
    Array.isArray(rawManifest.assistants) && rawManifest.assistants.length > 0
      ? rawManifest
      : { assistants: loadPerDirectoryAssistants(repoRoot) as AdminEditableModel['assistantsManifest']['assistants'] }
  const { byId: customKnowledge, paths: knowledgePaths } = loadCustomKnowledge(repoRoot)
  const contentModelsRaw = readText(contentModelsPath)
  const { registries: designSystemRegistries, paths: registryPaths } = loadDesignSystemRegistries(repoRoot)
  const { byId: skillMdContent, paths: skillMdPaths } = loadSkillMdContent(repoRoot)
  const { byId: dsSkillMdContent, paths: dsSkillMdPaths } = loadDesignSystemSkillMd(repoRoot)

  const model: AdminEditableModel = {
    config,
    assistantsManifest: manifest,
    customKnowledge,
    contentModelsRaw: contentModelsRaw || undefined,
    designSystemRegistries: Object.keys(designSystemRegistries).length > 0 ? designSystemRegistries : undefined,
    skillMdContent: Object.keys(skillMdContent).length > 0 ? skillMdContent : undefined,
    dsSkillMdContent: Object.keys(dsSkillMdContent).length > 0 ? dsSkillMdContent : undefined
  }

  const lastModified: Record<string, string> = {}
  const files: Record<string, { mtimeMs: number; size: number }> = {}

  const allPaths = [
    configPath,
    manifestPath,
    contentModelsPath,
    ...Object.values(knowledgePaths),
    ...Object.values(registryPaths),
    ...Object.values(skillMdPaths),
    ...Object.values(dsSkillMdPaths)
  ]
  for (const p of allPaths) {
    const m = safeStatMtime(p)
    if (m) lastModified[p] = m
    try {
      const stat = fs.statSync(p)
      files[p] = { mtimeMs: stat.mtimeMs, size: stat.size }
    } catch {
      // skip missing
    }
  }

  const revision = computeRevision(files)
  const meta: ModelMeta = {
    repoRoot,
    filePaths: {
      config: configPath,
      assistantsManifest: manifestPath,
      customKnowledge: knowledgePaths,
      contentModels: contentModelsPath,
      designSystemRegistries: registryPaths,
      skillMd: skillMdPaths,
      dsSkillMd: dsSkillMdPaths
    },
    lastModified,
    files,
    revision
  }

  return { model, meta }
}

function computeRevision(files: Record<string, { mtimeMs: number; size: number }>): string {
  const keys = Object.keys(files).sort()
  const parts = keys.map((p) => `${p}:${files[p].mtimeMs}:${files[p].size}`)
  const input = parts.join('|')
  return crypto.createHash('sha256').update(input, 'utf8').digest('hex').slice(0, 16)
}
