#!/usr/bin/env node

import * as fs from 'fs'
import * as path from 'path'
import { defaultAssistantConfig, AssistantConfig } from '../src/core/sdk/assistantConfig'

type AceAssistantEntry = {
  id: string
  llmEnabled?: boolean
  kbs?: string[]
  designSystemId?: string
  visionEnabled?: boolean
  smartDetectionEnabled?: boolean
  hiddenActions?: string[]
}

type AceAssistantsManifest = {
  assistants?: AceAssistantEntry[]
}

type AceModelResponse = {
  model: {
    config: unknown
    assistantsManifest: AceAssistantsManifest | unknown
    customKnowledge?: Record<string, string>
    contentModelsRaw?: string
    designSystemRegistries?: Record<string, unknown>
  }
  meta?: {
    revision?: string
  }
}

function buildAssistantConfigs(aceManifest: AceAssistantsManifest | unknown): AssistantConfig[] {
  const manifest = aceManifest as AceAssistantsManifest
  const assistants = manifest?.assistants ?? []
  return assistants.map(a => ({
    ...defaultAssistantConfig(a.id),
    llmEnabled: a.llmEnabled ?? true,
    kbAssignments: a.kbs ?? [],
    designSystemId: a.designSystemId,
    visionEnabled: a.visionEnabled ?? true,
    smartDetectionEnabled: a.smartDetectionEnabled ?? true,
    hiddenQuickActionIds: a.hiddenActions ?? [],
  }))
}

function writeIfChanged(filePath: string, content: string): boolean {
  let current = ''
  try {
    current = fs.readFileSync(filePath, 'utf-8')
  } catch {
    // file does not exist
  }
  if (current === content) {
    return false
  }
  fs.mkdirSync(path.dirname(filePath), { recursive: true })
  fs.writeFileSync(filePath, content, 'utf-8')
  return true
}

function normalizeBaseUrl(input: string): string {
  const trimmed = input.trim()
  if (!trimmed) return 'http://localhost:8080'
  return trimmed.replace(/\/+$/, '')
}

function hasFlag(flag: string): boolean {
  return process.argv.includes(flag)
}

async function main(): Promise<void> {
  const repoRoot = path.resolve(__dirname, '..')
  const aceUrl = normalizeBaseUrl(process.env.ACE_URL ?? 'http://localhost:8080')
  const token = (process.env.ACE_TOKEN ?? process.env.ACE_WRAPPER_TOKEN ?? process.env.WRAPPER_TOKEN ?? '').trim()
  const force = hasFlag('--force')

  const revisionPath = path.join(repoRoot, 'custom', '.ace-revision')
  const existingRevision = fs.existsSync(revisionPath)
    ? fs.readFileSync(revisionPath, 'utf-8').trim()
    : ''

  const headers: Record<string, string> = {
    Accept: 'application/json'
  }
  // Wrapper-mode friendly auth for local/custom deployments.
  if (token) {
    headers['X-ACE-Wrapper-Token'] = token
  }

  console.log(`[pull-config] Fetching model from ${aceUrl}/api/model`)
  const response = await fetch(`${aceUrl}/api/model`, {
    method: 'GET',
    headers
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`[pull-config] Failed GET /api/model (${response.status}): ${body.slice(0, 400)}`)
  }

  const payload = (await response.json()) as AceModelResponse
  if (!payload || typeof payload !== 'object' || !payload.model) {
    throw new Error('[pull-config] Invalid payload: missing model object')
  }

  const remoteRevision = (payload.meta?.revision ?? '').trim()
  if (!remoteRevision) {
    throw new Error('[pull-config] Invalid payload: missing meta.revision')
  }

  if (existingRevision && existingRevision === remoteRevision) {
    console.log(`[pull-config] Up-to-date at revision ${remoteRevision}; nothing to pull.`)
    return
  }

  if (existingRevision && existingRevision !== remoteRevision && !force) {
    throw new Error(
      `[pull-config] Revision changed (${existingRevision} -> ${remoteRevision}). ` +
      'Run again with --force to overwrite local files.'
    )
  }

  const configPath = path.join(repoRoot, 'custom', 'config.json')
  const assistantsManifestPath = path.join(repoRoot, 'custom', 'assistants.manifest.json')
  const knowledgeDir = path.join(repoRoot, 'custom', 'knowledge')
  const designSystemsDir = path.join(repoRoot, 'custom', 'design-systems')
  const contentModelsPath = path.join(repoRoot, 'docs', 'content-models.md')

  let writes = 0

  if (writeIfChanged(configPath, `${JSON.stringify(payload.model.config ?? {}, null, 2)}\n`)) writes++
  if (writeIfChanged(assistantsManifestPath, `${JSON.stringify(payload.model.assistantsManifest ?? { assistants: [] }, null, 2)}\n`)) writes++

  const knowledge = payload.model.customKnowledge ?? {}
  fs.mkdirSync(knowledgeDir, { recursive: true })
  for (const [assistantId, markdown] of Object.entries(knowledge)) {
    const outPath = path.join(knowledgeDir, `${assistantId}.md`)
    if (writeIfChanged(outPath, markdown ?? '')) writes++
  }

  const registries = payload.model.designSystemRegistries ?? {}
  for (const [registryId, registry] of Object.entries(registries)) {
    const outPath = path.join(designSystemsDir, registryId, 'registry.json')
    if (writeIfChanged(outPath, `${JSON.stringify(registry ?? {}, null, 2)}\n`)) writes++
  }

  // Keep content model presets in sync because build reads docs/content-models.md.
  if (typeof payload.model.contentModelsRaw === 'string') {
    if (writeIfChanged(contentModelsPath, payload.model.contentModelsRaw)) writes++
  }

  // Emit per-assistant config as a generated TypeScript file.
  // NOTE: ASSISTANT_CONFIGS is written here but is NOT imported by any runtime path yet.
  // It is scaffolded for Phase 5 (SKILL.md + ACE hybrid editing wave), at which point
  // runtime modules (quickActionExecutor, instructionAssembly, UI manifest) will import
  // and consume these values. Until then, this file is produced but dormant.
  const assistantConfigs = buildAssistantConfigs(payload.model.assistantsManifest)
  const assistantConfigsPath = path.join(repoRoot, 'src', 'custom', 'assistantConfigs.generated.ts')
  const assistantConfigsContent = [
    '// Generated by pull-ace-config — do not edit manually.',
    '// Phase 5 (SKILL.md + ACE hybrid wave) will wire these into runtime decisions.',
    "import type { AssistantConfig } from '../core/sdk/assistantConfig'",
    '',
    'export const ASSISTANT_CONFIGS: AssistantConfig[] = ' + JSON.stringify(assistantConfigs, null, 2),
    '',
  ].join('\n')
  if (writeIfChanged(assistantConfigsPath, assistantConfigsContent)) writes++

  if (writeIfChanged(revisionPath, `${remoteRevision}\n`)) writes++

  console.log(`[pull-config] Pulled revision ${remoteRevision}. Updated ${writes} file(s).`)
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error))
  process.exit(1)
})
