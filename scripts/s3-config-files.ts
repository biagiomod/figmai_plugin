#!/usr/bin/env node

import * as fs from 'fs'
import * as path from 'path'

export interface LocalConfigFile {
  localPath: string
  relativeKey: string
  body: Buffer
}

export interface S3Env {
  bucket: string
  region: string
  prefix: string
  pinnedSnapshotId?: string
}

export function getRepoRoot(): string {
  return path.resolve(__dirname, '..')
}

export function normalizePrefix(rawPrefix: string | undefined): string {
  const trimmed = (rawPrefix || 'figmai/').trim()
  const normalized = trimmed.replace(/^\/+/, '').replace(/\/+$/, '')
  return normalized ? `${normalized}/` : ''
}

export function getS3Env(): S3Env {
  const bucket = (process.env.S3_BUCKET || '').trim()
  if (!bucket) {
    throw new Error('S3_BUCKET is required for this command.')
  }
  return {
    bucket,
    region: (process.env.S3_REGION || 'us-east-1').trim() || 'us-east-1',
    prefix: normalizePrefix(process.env.S3_PREFIX),
    pinnedSnapshotId: (process.env.CONFIG_SNAPSHOT_ID || '').trim() || undefined
  }
}

export function buildKey(prefix: string, relative: string): string {
  const cleanRelative = relative.replace(/^\/+/, '')
  return `${prefix}${cleanRelative}`
}

export function generateSnapshotId(): string {
  const now = new Date()
  const iso = now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z')
  const compact = iso.replace('T', 'T')
  const rand = Math.random().toString(36).slice(2, 6)
  return `${compact}_${rand}`
}

function ensureFile(filePath: string): void {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Required file not found: ${filePath}`)
  }
}

function maybePushFile(
  files: LocalConfigFile[],
  localPath: string,
  relativeKey: string,
  required: boolean
): void {
  if (!fs.existsSync(localPath)) {
    if (required) {
      throw new Error(`Required file not found: ${localPath}`)
    }
    return
  }
  files.push({
    localPath,
    relativeKey,
    body: fs.readFileSync(localPath)
  })
}

export function collectLocalConfigFiles(rootDir: string): LocalConfigFile[] {
  const files: LocalConfigFile[] = []

  const configPath = path.join(rootDir, 'custom', 'config.json')
  const assistantsPath = path.join(rootDir, 'custom', 'assistants.manifest.json')
  const contentModelsPath = path.join(rootDir, 'docs', 'content-models.md')
  const knowledgeDir = path.join(rootDir, 'custom', 'knowledge')
  const designSystemsDir = path.join(rootDir, 'custom', 'design-systems')
  const kbDir = path.join(rootDir, 'custom', 'knowledge-bases')

  ensureFile(configPath)
  ensureFile(assistantsPath)
  ensureFile(contentModelsPath)

  maybePushFile(files, configPath, 'config.json', true)
  maybePushFile(files, assistantsPath, 'assistants.manifest.json', true)
  maybePushFile(files, contentModelsPath, 'content-models.md', true)

  if (fs.existsSync(knowledgeDir)) {
    const entries = fs.readdirSync(knowledgeDir, { withFileTypes: true })
    for (const entry of entries) {
      if (!entry.isFile()) continue
      if (!entry.name.endsWith('.md')) continue
      if (entry.name === 'README.md' || entry.name.endsWith('.example.md')) continue
      const localPath = path.join(knowledgeDir, entry.name)
      files.push({
        localPath,
        relativeKey: `knowledge/${entry.name}`,
        body: fs.readFileSync(localPath)
      })
    }
  }

  if (fs.existsSync(designSystemsDir)) {
    const entries = fs.readdirSync(designSystemsDir, { withFileTypes: true })
    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      const registryPath = path.join(designSystemsDir, entry.name, 'registry.json')
      if (!fs.existsSync(registryPath)) continue
      files.push({
        localPath: registryPath,
        relativeKey: `design-systems/${entry.name}/registry.json`,
        body: fs.readFileSync(registryPath)
      })
    }
  }

  if (fs.existsSync(kbDir)) {
    const registryPath = path.join(kbDir, 'registry.json')
    if (fs.existsSync(registryPath)) {
      files.push({
        localPath: registryPath,
        relativeKey: 'knowledge-bases/registry.json',
        body: fs.readFileSync(registryPath)
      })
    }
    const entries = fs.readdirSync(kbDir, { withFileTypes: true })
    for (const entry of entries) {
      if (!entry.isFile()) continue
      if (!entry.name.endsWith('.kb.json')) continue
      const localPath = path.join(kbDir, entry.name)
      files.push({
        localPath,
        relativeKey: `knowledge-bases/${entry.name}`,
        body: fs.readFileSync(localPath)
      })
    }
  }

  return files
}
