/**
 * Save AdminEditableModel to repo files: backup, write, run generators.
 * Does NOT build or publish the plugin.
 */

import { spawnSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import type { AdminEditableModel } from './schema'
import { validateModel } from './schema'
import {
  canonicalizeConfig,
  canonicalizeAssistantsManifest,
  writeFileIfChanged,
  backupFile,
  backupTimestamp,
  ensureTrailingNewline
} from './fs'
import type { ModelMeta } from './model'

export interface GeneratorRunResult {
  name: string
  success: boolean
  error?: string
  exitCode?: number
  stdout?: string
  stderr?: string
}

export interface SaveSummary {
  success: boolean
  filesWritten: string[]
  backupsCreatedAt: string
  backupRoot: string
  generatorsRun: GeneratorRunResult[]
  errors?: string[]
  nextSteps: string
}

/** Dry-run result: no files written, no generators run. */
export interface SaveDryRunSummary {
  success: boolean
  filesWouldWrite: string[]
  generatorsWouldRun: string[]
  backupsWouldCreateAt: string
  backupRootPreview: string
  nextSteps: string
  errors?: string[]
}

const NEXT_STEPS =
  'Ask an admin to run `npm run build` and then publish via the normal process.'

const NO_CHANGES_MESSAGE =
  'No changes detected. Nothing to build or publish.'

/**
 * Run a generator script (npm run <script>) from repo root.
 * Returns exitCode, stdout, stderr for failure reporting.
 */
function runGenerator(
  repoRoot: string,
  scriptName: string
): { success: boolean; error?: string; exitCode?: number; stdout?: string; stderr?: string } {
  const result = spawnSync('npm', ['run', scriptName], {
    cwd: repoRoot,
    encoding: 'utf-8',
    shell: true
  })
  const stdout = (result.stdout ?? '').trim()
  const stderr = (result.stderr ?? '').trim()
  if (result.status === 0) {
    return { success: true, exitCode: 0, stdout: stdout || undefined, stderr: stderr || undefined }
  }
  const error = result.error
    ? String(result.error.message)
    : stderr || stdout || `Exit code ${result.status}`
  return {
    success: false,
    error,
    exitCode: result.status ?? undefined,
    stdout: stdout || undefined,
    stderr: stderr || undefined
  }
}

/**
 * Compute which paths would be written (content differs from existing).
 * Does not write; uses same canonicalization as saveModel.
 */
function computeFilesWouldWrite(
  model: AdminEditableModel,
  meta: ModelMeta,
  _backupRootDir: string
): string[] {
  const repoRoot = meta.repoRoot
  const wouldWrite: string[] = []

  const configPath = meta.filePaths.config
  const configCanon = canonicalizeConfig(model.config)
  const configStr = JSON.stringify(configCanon, null, 2) + '\n'
  if (getExistingContent(configPath) !== configStr) wouldWrite.push(configPath)

  const manifestPath = meta.filePaths.assistantsManifest
  const manifestCanon = canonicalizeAssistantsManifest(model.assistantsManifest)
  const manifestStr = JSON.stringify(manifestCanon, null, 2) + '\n'
  if (getExistingContent(manifestPath) !== manifestStr) wouldWrite.push(manifestPath)

  const knowledgeDir = path.join(repoRoot, 'custom', 'knowledge')
  for (const [assistantId, body] of Object.entries(model.customKnowledge)) {
    const filePath = meta.filePaths.customKnowledge[assistantId] ?? path.join(knowledgeDir, `${assistantId}.md`)
    const content = ensureTrailingNewline(body.replace(/\r\n/g, '\n'))
    if (getExistingContent(filePath) !== content) wouldWrite.push(filePath)
  }

  if (model.contentModelsRaw !== undefined) {
    const contentModelsPath = meta.filePaths.contentModels
    const content = ensureTrailingNewline(model.contentModelsRaw.replace(/\r\n/g, '\n'))
    if (getExistingContent(contentModelsPath) !== content) wouldWrite.push(contentModelsPath)
  }

  if (model.designSystemRegistries) {
    for (const [registryId, registryJson] of Object.entries(model.designSystemRegistries)) {
      const filePath =
        meta.filePaths.designSystemRegistries[registryId] ??
        path.join(repoRoot, 'custom', 'design-systems', registryId, 'registry.json')
      const fileContent = JSON.stringify(registryJson, null, 2) + '\n'
      if (getExistingContent(filePath) !== fileContent) wouldWrite.push(filePath)
    }
  }

  if (model.skillMdContent) {
    for (const [assistantId, content] of Object.entries(model.skillMdContent)) {
      if (!content) continue
      const filePath =
        meta.filePaths.skillMd[assistantId] ??
        path.join(repoRoot, 'custom', 'assistants', assistantId, 'SKILL.md')
      const normalized = normalizeSkillMd(content)
      if (getExistingContent(filePath) !== normalized) wouldWrite.push(filePath)
    }
  }

  return wouldWrite
}

function getExistingContent(filePath: string): string {
  try {
    return fs.readFileSync(filePath, 'utf-8')
  } catch {
    return ''
  }
}

/**
 * Normalize SKILL.md content:
 * - Normalize ## heading casing to canonical names
 * - Strip trailing whitespace from each line
 * - Collapse 3+ consecutive blank lines to 2
 * - Ensure trailing newline
 */
function normalizeSkillMd(content: string): string {
  const headingMap: Record<string, string> = {
    identity: 'Identity',
    behavior: 'Behavior',
    'instruction blocks': 'Instruction Blocks',
    'output guidance': 'Output Guidance',
    'quick actions': 'Quick Actions'
  }

  let result = content.replace(/\r\n/g, '\n')

  // Normalize ## heading casing
  result = result.replace(/^(## )(.+)$/gm, (_, prefix, heading) => {
    const lower = heading.trim().toLowerCase()
    return prefix + (headingMap[lower] ?? heading)
  })

  // Strip trailing whitespace from each line
  result = result.replace(/[ \t]+$/gm, '')

  // Collapse 3+ consecutive blank lines to 2
  result = result.replace(/\n{3,}/g, '\n\n')

  return ensureTrailingNewline(result)
}

const GENERATOR_SCRIPTS = ['compile-skills', 'generate-custom-overlay', 'generate-presets']

/**
 * Dry-run: validate, compute filesWouldWrite and backupsWouldCreateAt; do not write or run generators.
 */
export function saveModelDryRun(
  model: AdminEditableModel,
  meta: ModelMeta,
  backupRootDir: string
): SaveDryRunSummary {
  const validation = validateModel(model)
  if (validation.errors.length > 0) {
    return {
      success: false,
      filesWouldWrite: [],
      generatorsWouldRun: [],
      backupsWouldCreateAt: '',
      backupRootPreview: '',
      nextSteps: NEXT_STEPS,
      errors: validation.errors
    }
  }
  const filesWouldWrite = computeFilesWouldWrite(model, meta, backupRootDir)
  if (filesWouldWrite.length === 0) {
    return {
      success: true,
      filesWouldWrite: [],
      generatorsWouldRun: [],
      backupsWouldCreateAt: '',
      backupRootPreview: '',
      nextSteps: NO_CHANGES_MESSAGE
    }
  }
  const ts = backupTimestamp()
  const backupRootPreview = path.join(backupRootDir, ts)
  return {
    success: true,
    filesWouldWrite,
    generatorsWouldRun: [...GENERATOR_SCRIPTS],
    backupsWouldCreateAt: ts,
    backupRootPreview,
    nextSteps: NEXT_STEPS
  }
}

/**
 * Save model to disk: validate, backup, write, run generators.
 * Writes only: custom/config.json, custom/assistants.manifest.json,
 * custom/knowledge/<id>.md, docs/content-models.md, custom/design-systems/<id>/registry.json.
 */
export function saveModel(
  model: AdminEditableModel,
  meta: ModelMeta,
  backupRootDir: string
): SaveSummary {
  const validation = validateModel(model)
  if (validation.errors.length > 0) {
    return {
      success: false,
      filesWritten: [],
      backupsCreatedAt: '',
      backupRoot: '',
      generatorsRun: [],
      errors: validation.errors,
      nextSteps: NEXT_STEPS
    }
  }

  const filesWouldWrite = computeFilesWouldWrite(model, meta, backupRootDir)
  if (filesWouldWrite.length === 0) {
    return {
      success: true,
      filesWritten: [],
      generatorsRun: [],
      backupsCreatedAt: '',
      backupRoot: '',
      nextSteps: NO_CHANGES_MESSAGE
    }
  }

  const repoRoot = meta.repoRoot
  const ts = backupTimestamp()
  const backupRoot = path.join(backupRootDir, ts)
  if (!fs.existsSync(backupRoot)) {
    fs.mkdirSync(backupRoot, { recursive: true })
  }

  const filesWritten: string[] = []

  // 1) Backup and write config.json
  const configPath = meta.filePaths.config
  if (fs.existsSync(configPath)) {
    backupFile(configPath, backupRoot, repoRoot)
  }
  const configCanon = canonicalizeConfig(model.config)
  const configStr = JSON.stringify(configCanon, null, 2) + '\n'
  if (writeFileIfChanged(configPath, configStr)) {
    filesWritten.push(configPath)
  }

  // 2) Backup and write assistants.manifest.json
  const manifestPath = meta.filePaths.assistantsManifest
  if (fs.existsSync(manifestPath)) {
    backupFile(manifestPath, backupRoot, repoRoot)
  }
  const manifestCanon = canonicalizeAssistantsManifest(model.assistantsManifest)
  const manifestStr = JSON.stringify(manifestCanon, null, 2) + '\n'
  if (writeFileIfChanged(manifestPath, manifestStr)) {
    filesWritten.push(manifestPath)
  }

  // 3) Backup and write custom/knowledge/<id>.md
  const knowledgeDir = path.join(repoRoot, 'custom', 'knowledge')
  for (const [assistantId, body] of Object.entries(model.customKnowledge)) {
    const filePath = meta.filePaths.customKnowledge[assistantId] ?? path.join(knowledgeDir, `${assistantId}.md`)
    if (fs.existsSync(filePath)) {
      backupFile(filePath, backupRoot, repoRoot)
    }
    const content = ensureTrailingNewline(body.replace(/\r\n/g, '\n'))
    if (writeFileIfChanged(filePath, content)) {
      filesWritten.push(filePath)
    }
  }

  // 4) Backup and write docs/content-models.md (if provided)
  if (model.contentModelsRaw !== undefined) {
    const contentModelsPath = meta.filePaths.contentModels
    if (fs.existsSync(contentModelsPath)) {
      backupFile(contentModelsPath, backupRoot, repoRoot)
    }
    const content = ensureTrailingNewline(model.contentModelsRaw.replace(/\r\n/g, '\n'))
    if (writeFileIfChanged(contentModelsPath, content)) {
      filesWritten.push(contentModelsPath)
    }
  }

  // 5) Backup and write custom/design-systems/<id>/registry.json
  if (model.designSystemRegistries) {
    for (const [registryId, registryJson] of Object.entries(model.designSystemRegistries)) {
      const filePath =
        meta.filePaths.designSystemRegistries[registryId] ??
        path.join(repoRoot, 'custom', 'design-systems', registryId, 'registry.json')
      if (fs.existsSync(filePath)) {
        backupFile(filePath, backupRoot, repoRoot)
      }
      const content = JSON.stringify(registryJson, null, 2) + '\n'
      if (writeFileIfChanged(filePath, content)) {
        filesWritten.push(filePath)
      }
    }
  }

  // 6) Backup and write custom/assistants/<id>/SKILL.md (migrated assistants only)
  if (model.skillMdContent) {
    for (const [assistantId, content] of Object.entries(model.skillMdContent)) {
      if (!content) continue
      const filePath =
        meta.filePaths.skillMd[assistantId] ??
        path.join(repoRoot, 'custom', 'assistants', assistantId, 'SKILL.md')
      fs.mkdirSync(path.dirname(filePath), { recursive: true })
      if (fs.existsSync(filePath)) {
        backupFile(filePath, backupRoot, repoRoot)
      }
      const normalized = normalizeSkillMd(content)
      if (writeFileIfChanged(filePath, normalized)) {
        filesWritten.push(filePath)
      }
    }
  }

  // 7) Run generators (NOT build/publish)
  const generatorsRun: GeneratorRunResult[] = []
  for (const name of GENERATOR_SCRIPTS) {
    const result = runGenerator(repoRoot, name)
    generatorsRun.push({
      name,
      success: result.success,
      error: result.error,
      exitCode: result.exitCode,
      stdout: result.stdout,
      stderr: result.stderr
    })
  }

  return {
    success: true,
    filesWritten,
    backupsCreatedAt: ts,
    backupRoot,
    generatorsRun,
    nextSteps: NEXT_STEPS
  }
}
