import { z } from 'zod'
import { parseJsonBody, text } from '../http'
import { getObjectText, listRelativeKeys, putObjectText } from '../s3'
import { saveRequestBodySchema, validateModel } from '../schemas'
import { logAction } from '../logging'

interface DraftMeta {
  version: number
  lastModified?: string
  lastAuthor?: string
}

function nowIso(): string {
  return new Date().toISOString()
}

function parseJsonOrDefault<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback
  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

function ensureMarkdownTrailingNewline(input: string): string {
  return input.endsWith('\n') ? input : `${input}\n`
}

async function getDraftMeta(): Promise<DraftMeta> {
  const raw = await getObjectText('draft/_meta.json')
  const parsed = parseJsonOrDefault<Partial<DraftMeta>>(raw, {})
  const version = Number.isFinite(parsed.version) ? Number(parsed.version) : 0
  return {
    version,
    lastModified: parsed.lastModified,
    lastAuthor: parsed.lastAuthor
  }
}

export async function getModelResponse() {
  const [configRaw, manifestRaw, contentModelsRaw] = await Promise.all([
    getObjectText('draft/config.json'),
    getObjectText('draft/assistants.manifest.json'),
    getObjectText('draft/content-models.md')
  ])

  const knowledgeKeys = await listRelativeKeys('draft/knowledge/')
  const customKnowledge: Record<string, string> = {}
  for (const key of knowledgeKeys) {
    if (!key.endsWith('.md')) continue
    const assistantId = key.replace(/^draft\/knowledge\//, '').replace(/\.md$/, '')
    const markdown = await getObjectText(key)
    customKnowledge[assistantId] = markdown || ''
  }

  const dsKeys = await listRelativeKeys('draft/design-systems/')
  const designSystemRegistries: Record<string, unknown> = {}
  for (const key of dsKeys) {
    if (!key.endsWith('/registry.json')) continue
    const registryId = key.replace(/^draft\/design-systems\//, '').replace(/\/registry\.json$/, '')
    const registryRaw = await getObjectText(key)
    if (!registryRaw) continue
    try {
      designSystemRegistries[registryId] = JSON.parse(registryRaw)
    } catch {
      // ignore invalid registry JSON
    }
  }

  const model = {
    config: parseJsonOrDefault<Record<string, unknown>>(configRaw, {}),
    assistantsManifest: parseJsonOrDefault<Record<string, unknown>>(manifestRaw, { assistants: [] }),
    customKnowledge,
    contentModelsRaw: contentModelsRaw || undefined,
    designSystemRegistries:
      Object.keys(designSystemRegistries).length > 0 ? designSystemRegistries : undefined
  }

  const validation = validateModel(model)
  const [meta, publishedRaw] = await Promise.all([getDraftMeta(), getObjectText('published.json')])

  let lastPublishedRevision: number | null = null
  if (publishedRaw) {
    try {
      const p = JSON.parse(publishedRaw) as { publishedRevision?: string }
      const n = Number(p.publishedRevision)
      if (Number.isFinite(n)) lastPublishedRevision = n
    } catch {
      // ignore
    }
  }

  const capabilities = {
    hasUnpublished: lastPublishedRevision === null || meta.version > lastPublishedRevision,
    canPublish: true
  }

  return {
    model,
    meta: {
      revision: String(meta.version),
      capabilities
    },
    validation
  }
}

const savePayloadSchema = z.object({
  username: z.string().optional()
})

export async function saveModelResponse(body: string | undefined | null, requestId: string) {
  const parsedBody = saveRequestBodySchema.safeParse(parseJsonBody(body))
  if (!parsedBody.success) {
    return {
      statusCode: 400,
      payload: {
        errors: parsedBody.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`),
        success: false
      }
    }
  }

  const request = parsedBody.data
  const currentMeta = await getDraftMeta()
  const currentRevision = String(currentMeta.version)
  if (request.meta.revision !== currentRevision) {
    let lastPublishedRevision: string | null = null
    const publishedRaw = await getObjectText('published.json')
    if (publishedRaw) {
      try {
        const published = JSON.parse(publishedRaw) as { publishedRevision?: string }
        lastPublishedRevision = published.publishedRevision || null
      } catch {
        lastPublishedRevision = null
      }
    }
    return {
      statusCode: 409,
      payload: {
        error: 'STALE_REVISION',
        message: 'Files changed on disk. Reload to get the latest.',
        expectedRevision: request.meta.revision,
        currentRevision,
        lastPublishedRevision,
        meta: { revision: currentRevision }
      }
    }
  }

  const semanticValidation = validateModel(request.model)
  if (semanticValidation.errors.length > 0) {
    return {
      statusCode: 400,
      payload: { errors: semanticValidation.errors, warnings: semanticValidation.warnings }
    }
  }

  const filesWritten: string[] = []

  const model = request.model
  await putObjectText(
    'draft/config.json',
    `${JSON.stringify(model.config ?? {}, null, 2)}\n`,
    'application/json'
  )
  filesWritten.push('config.json')

  await putObjectText(
    'draft/assistants.manifest.json',
    `${JSON.stringify(model.assistantsManifest ?? { assistants: [] }, null, 2)}\n`,
    'application/json'
  )
  filesWritten.push('assistants.manifest.json')

  const knowledge = model.customKnowledge || {}
  for (const [assistantId, markdown] of Object.entries(knowledge)) {
    await putObjectText(
      `draft/knowledge/${assistantId}.md`,
      ensureMarkdownTrailingNewline(markdown),
      'text/markdown'
    )
    filesWritten.push(`knowledge/${assistantId}.md`)
  }

  if (typeof model.contentModelsRaw === 'string') {
    await putObjectText(
      'draft/content-models.md',
      ensureMarkdownTrailingNewline(model.contentModelsRaw),
      'text/markdown'
    )
    filesWritten.push('content-models.md')
  }

  if (model.designSystemRegistries && typeof model.designSystemRegistries === 'object') {
    for (const [registryId, registry] of Object.entries(model.designSystemRegistries)) {
      await putObjectText(
        `draft/design-systems/${registryId}/registry.json`,
        `${JSON.stringify(registry ?? {}, null, 2)}\n`,
        'application/json'
      )
      filesWritten.push(`design-systems/${registryId}/registry.json`)
    }
  }

  const nextVersion = currentMeta.version + 1
  const actor = savePayloadSchema.safeParse({ username: '' })
  const nextMeta = {
    version: nextVersion,
    lastModified: nowIso(),
    lastAuthor: actor.success ? actor.data.username || 'api-user' : 'api-user'
  }
  await putObjectText('draft/_meta.json', `${JSON.stringify(nextMeta, null, 2)}\n`, 'application/json')

  logAction({
    requestId,
    action: 'save',
    detail: {
      filesWrittenCount: filesWritten.length,
      revisionFrom: currentRevision,
      revisionTo: String(nextVersion)
    }
  })

  return {
    statusCode: 200,
    payload: {
      success: true,
      meta: { revision: String(nextVersion) },
      filesWritten,
      generatorsRun: []
    }
  }
}

export async function getContentModelsText() {
  const md = await getObjectText('draft/content-models.md')
  return text(200, md || '', 'text/markdown')
}

