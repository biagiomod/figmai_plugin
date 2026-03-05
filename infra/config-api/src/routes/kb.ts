import { z } from 'zod'
import { parseJsonBody } from '../http'
import { parseMarkdown, normalizeLooseJson } from '../kbNormalize'
import {
  KB_ID_REGEX,
  knowledgeBaseDocumentSchema,
  type KnowledgeBaseDocument
} from '../schemas'
import { deleteObject, getObjectText, putObjectText } from '../s3'

const idParamSchema = z.object({
  id: z
    .string()
    .min(1)
    .regex(KB_ID_REGEX, 'id must be kebab-case: [a-z0-9]+(?:-[a-z0-9]+)*')
})

const registryEntrySchema = z.object({
  id: z.string(),
  title: z.string(),
  filePath: z.string(),
  tags: z.array(z.string()).optional(),
  version: z.string().optional(),
  updatedAt: z.string().optional()
})

const registrySchema = z.object({
  knowledgeBases: z.array(registryEntrySchema)
})

type Registry = z.infer<typeof registrySchema>

function emptyRegistry(): Registry {
  return { knowledgeBases: [] }
}

function formatZodErrors(err: z.ZodError): string[] {
  return err.errors.map((e) => `${e.path.join('.')}: ${e.message}`)
}

async function readRegistry(): Promise<Registry> {
  const raw = await getObjectText('draft/knowledge-bases/registry.json')
  if (!raw) return emptyRegistry()
  try {
    const parsed = registrySchema.safeParse(JSON.parse(raw))
    return parsed.success ? parsed.data : emptyRegistry()
  } catch {
    return emptyRegistry()
  }
}

async function writeRegistry(registry: Registry): Promise<void> {
  await putObjectText(
    'draft/knowledge-bases/registry.json',
    `${JSON.stringify(registry, null, 2)}\n`,
    'application/json'
  )
}

function getKbPath(id: string): string {
  return `draft/knowledge-bases/${id}.kb.json`
}

async function upsertRegistryEntry(doc: KnowledgeBaseDocument): Promise<void> {
  const registry = await readRegistry()
  const entry = {
    id: doc.id,
    title: doc.title || doc.id,
    filePath: `${doc.id}.kb.json`,
    ...(doc.tags?.length ? { tags: doc.tags } : {}),
    ...(doc.version ? { version: doc.version } : {}),
    ...(doc.updatedAt ? { updatedAt: doc.updatedAt } : {})
  }
  const idx = registry.knowledgeBases.findIndex((e) => e.id === doc.id)
  if (idx >= 0) registry.knowledgeBases[idx] = entry
  else registry.knowledgeBases.push(entry)
  await writeRegistry(registry)
}

async function removeRegistryEntry(id: string): Promise<void> {
  const registry = await readRegistry()
  registry.knowledgeBases = registry.knowledgeBases.filter((e) => e.id !== id)
  await writeRegistry(registry)
}

export async function getKbRegistryResponse() {
  const registry = await readRegistry()
  return {
    statusCode: 200,
    payload: registry
  }
}

export async function getKbByIdResponse(id: string) {
  const parsedId = idParamSchema.safeParse({ id })
  if (!parsedId.success) {
    return {
      statusCode: 400,
      payload: { error: 'Invalid id', details: formatZodErrors(parsedId.error) }
    }
  }
  const raw = await getObjectText(getKbPath(parsedId.data.id))
  if (!raw) {
    return { statusCode: 404, payload: { error: 'Not found' } }
  }
  try {
    const parsedDoc = knowledgeBaseDocumentSchema.safeParse(JSON.parse(raw))
    if (!parsedDoc.success) {
      return {
        statusCode: 500,
        payload: { error: 'Invalid document on disk', details: formatZodErrors(parsedDoc.error) }
      }
    }
    return { statusCode: 200, payload: parsedDoc.data }
  } catch (e) {
    return { statusCode: 500, payload: { error: (e as Error).message } }
  }
}

const normalizeBodySchema = z.object({
  type: z.enum(['md', 'json']),
  content: z.string(),
  id: z.string().optional(),
  title: z.string().optional()
})

export async function normalizeKbResponse(body: string | undefined | null) {
  const parsed = normalizeBodySchema.safeParse(parseJsonBody(body))
  if (!parsed.success) {
    return { statusCode: 400, payload: { errors: formatZodErrors(parsed.error) } }
  }
  const id = (parsed.data.id || 'draft').trim()
  const idCheck = idParamSchema.safeParse({ id })
  if (!idCheck.success) {
    return { statusCode: 200, payload: { errors: formatZodErrors(idCheck.error) } }
  }
  try {
    if (parsed.data.type === 'md') {
      return {
        statusCode: 200,
        payload: { doc: parseMarkdown(parsed.data.content, idCheck.data.id, parsed.data.title) }
      }
    }
    const json = JSON.parse(parsed.data.content) as Record<string, unknown>
    return {
      statusCode: 200,
      payload: { doc: normalizeLooseJson(json, idCheck.data.id, parsed.data.title) }
    }
  } catch (e) {
    return {
      statusCode: 200,
      payload: { errors: [e instanceof SyntaxError ? 'Invalid JSON' : (e as Error).message] }
    }
  }
}

const createBodySchema = z.object({
  doc: knowledgeBaseDocumentSchema,
  forceOverwrite: z.boolean().optional()
})

export async function createKbResponse(body: string | undefined | null) {
  const parsed = createBodySchema.safeParse(parseJsonBody(body))
  if (!parsed.success) {
    return { statusCode: 400, payload: { errors: formatZodErrors(parsed.error) } }
  }
  const path = getKbPath(parsed.data.doc.id)
  const existing = await getObjectText(path)
  if (existing && parsed.data.forceOverwrite !== true) {
    return {
      statusCode: 409,
      payload: { error: 'File exists', code: 'OVERWRITE_REQUIRED' }
    }
  }
  const withUpdated = {
    ...parsed.data.doc,
    updatedAt: new Date().toISOString()
  }
  const validated = knowledgeBaseDocumentSchema.safeParse(withUpdated)
  if (!validated.success) {
    return { statusCode: 400, payload: { errors: formatZodErrors(validated.error) } }
  }
  await putObjectText(path, `${JSON.stringify(validated.data, null, 2)}\n`, 'application/json')
  await upsertRegistryEntry(validated.data)
  return {
    statusCode: 201,
    payload: { doc: validated.data, registry: await readRegistry() }
  }
}

const patchBodySchema = z.object({ doc: knowledgeBaseDocumentSchema })

export async function patchKbResponse(id: string, body: string | undefined | null) {
  const parsedId = idParamSchema.safeParse({ id })
  if (!parsedId.success) {
    return {
      statusCode: 400,
      payload: { error: 'Invalid id', details: formatZodErrors(parsedId.error) }
    }
  }
  const parsedBody = patchBodySchema.safeParse(parseJsonBody(body))
  if (!parsedBody.success) {
    return { statusCode: 400, payload: { errors: formatZodErrors(parsedBody.error) } }
  }
  if (parsedBody.data.doc.id !== parsedId.data.id) {
    return {
      statusCode: 400,
      payload: { error: 'doc.id must match URL :id' }
    }
  }
  const kbPath = getKbPath(parsedId.data.id)
  const existing = await getObjectText(kbPath)
  if (!existing) {
    return { statusCode: 404, payload: { error: 'Not found' } }
  }
  const withUpdated = {
    ...parsedBody.data.doc,
    updatedAt: new Date().toISOString()
  }
  await putObjectText(kbPath, `${JSON.stringify(withUpdated, null, 2)}\n`, 'application/json')
  await upsertRegistryEntry(withUpdated)
  return {
    statusCode: 200,
    payload: { doc: withUpdated }
  }
}

export async function deleteKbResponse(id: string) {
  const parsedId = idParamSchema.safeParse({ id })
  if (!parsedId.success) {
    return {
      statusCode: 400,
      payload: { error: 'Invalid id', details: formatZodErrors(parsedId.error) }
    }
  }
  const kbPath = getKbPath(parsedId.data.id)
  const existing = await getObjectText(kbPath)
  if (!existing) {
    return { statusCode: 404, payload: { error: 'Not found' } }
  }
  await deleteObject(kbPath)
  await removeRegistryEntry(parsedId.data.id)
  return {
    statusCode: 204,
    payload: null
  }
}

