import { z } from 'zod'
import { parseJsonBody } from '../http'
import { KB_ID_REGEX } from '../schemas'
import { deleteObject, getObjectText, putObjectText } from '../s3'
import { logAction } from '../logging'

const idParamSchema = z.object({
  id: z
    .string()
    .min(1)
    .regex(KB_ID_REGEX, 'id must be kebab-case: [a-z0-9]+(?:-[a-z0-9]+)*')
})

const SKILL_FILE_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*\.md$/

const skillRegistryEntrySchema = z.object({
  id: z.string(),
  title: z.string(),
  kind: z.string(),
  filePath: z.string().regex(SKILL_FILE_REGEX, 'filePath must be <kebab-id>.md')
})

const skillsRegistrySchema = z.object({
  skills: z.array(skillRegistryEntrySchema)
})

type SkillRegistryEntry = z.infer<typeof skillRegistryEntrySchema>
type SkillsRegistry = z.infer<typeof skillsRegistrySchema>

function emptyRegistry(): SkillsRegistry {
  return { skills: [] }
}

function formatZodErrors(err: z.ZodError): string[] {
  return err.errors.map((e) => `${e.path.join('.')}: ${e.message}`)
}

async function readRegistry(): Promise<SkillsRegistry> {
  const raw = await getObjectText('draft/skills/registry.json')
  if (!raw) return emptyRegistry()
  try {
    const parsed = skillsRegistrySchema.safeParse(JSON.parse(raw))
    if (!parsed.success) {
      console.error('[skills] Registry validation failed:', parsed.error.errors)
      return emptyRegistry()
    }
    return parsed.data
  } catch (err) {
    console.error('[skills] Registry parse error:', err)
    return emptyRegistry()
  }
}

async function writeRegistry(registry: SkillsRegistry): Promise<void> {
  await putObjectText(
    'draft/skills/registry.json',
    `${JSON.stringify(registry, null, 2)}\n`,
    'application/json'
  )
}

function getSkillPath(filePath: string): string {
  return `draft/skills/${filePath}`
}

export async function getSkillsResponse() {
  const registry = await readRegistry()
  return {
    statusCode: 200,
    payload: { skills: registry.skills }
  }
}

export async function getSkillByIdResponse(id: string) {
  const parsedId = idParamSchema.safeParse({ id })
  if (!parsedId.success) {
    return {
      statusCode: 400,
      payload: { error: 'Invalid id', details: formatZodErrors(parsedId.error) }
    }
  }
  const registry = await readRegistry()
  const entry = registry.skills.find((s) => s.id === parsedId.data.id)
  if (!entry) {
    return { statusCode: 404, payload: { error: 'Not found' } }
  }
  const raw = await getObjectText(getSkillPath(entry.filePath))
  if (!raw) {
    return { statusCode: 404, payload: { error: 'File not found on disk' } }
  }
  return {
    statusCode: 200,
    payload: {
      id: entry.id,
      title: entry.title,
      kind: entry.kind,
      filePath: entry.filePath,
      content: raw
    }
  }
}

const createBodySchema = z.object({
  id: z.string().min(1).regex(KB_ID_REGEX, 'id must be kebab-case'),
  title: z.string().min(1),
  kind: z.string().min(1),
  content: z.string()
})

export async function createSkillResponse(body: string | undefined | null, requestId: string) {
  const parsed = createBodySchema.safeParse(parseJsonBody(body))
  if (!parsed.success) {
    return { statusCode: 400, payload: { errors: formatZodErrors(parsed.error) } }
  }
  const { id, title, kind, content } = parsed.data
  const registry = await readRegistry()
  if (registry.skills.some((s) => s.id === id)) {
    return {
      statusCode: 409,
      payload: { error: 'Skill already exists', code: 'CONFLICT' }
    }
  }
  const filePath = `${id}.md`
  await putObjectText(getSkillPath(filePath), content, 'text/markdown')
  const entry: SkillRegistryEntry = { id, title, kind, filePath }
  registry.skills.push(entry)
  await writeRegistry(registry)
  logAction({
    requestId,
    action: 'skill.create',
    detail: { id }
  })
  return {
    statusCode: 201,
    payload: { id, title, kind, filePath, content }
  }
}

const patchBodySchema = z.object({
  title: z.string().min(1).optional(),
  kind: z.string().min(1).optional(),
  content: z.string().optional()
})

export async function patchSkillResponse(id: string, body: string | undefined | null, requestId: string) {
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
  if (parsedBody.data.title === undefined && parsedBody.data.kind === undefined && parsedBody.data.content === undefined) {
    return { statusCode: 400, payload: { error: 'At least one field (title, kind, content) must be provided' } }
  }
  const registry = await readRegistry()
  const entryIndex = registry.skills.findIndex((s) => s.id === parsedId.data.id)
  if (entryIndex === -1) {
    return { statusCode: 404, payload: { error: 'Not found' } }
  }
  const entry = registry.skills[entryIndex]
  const existing = await getObjectText(getSkillPath(entry.filePath))
  let newContent: string
  if (parsedBody.data.content !== undefined) {
    await putObjectText(getSkillPath(entry.filePath), parsedBody.data.content, 'text/markdown')
    newContent = parsedBody.data.content
  } else {
    newContent = existing ?? ''
  }
  if (parsedBody.data.title !== undefined) entry.title = parsedBody.data.title
  if (parsedBody.data.kind !== undefined) entry.kind = parsedBody.data.kind
  registry.skills[entryIndex] = entry
  await writeRegistry(registry)
  logAction({
    requestId,
    action: 'skill.patch',
    detail: { id: parsedId.data.id }
  })
  return {
    statusCode: 200,
    payload: {
      id: entry.id,
      title: entry.title,
      kind: entry.kind,
      filePath: entry.filePath,
      content: newContent
    }
  }
}

export async function deleteSkillResponse(id: string, requestId: string) {
  const parsedId = idParamSchema.safeParse({ id })
  if (!parsedId.success) {
    return {
      statusCode: 400,
      payload: { error: 'Invalid id', details: formatZodErrors(parsedId.error) }
    }
  }
  const registry = await readRegistry()
  const entryIndex = registry.skills.findIndex((s) => s.id === parsedId.data.id)
  if (entryIndex === -1) {
    return { statusCode: 404, payload: { error: 'Not found' } }
  }
  const entry = registry.skills[entryIndex]
  await deleteObject(getSkillPath(entry.filePath))
  registry.skills.splice(entryIndex, 1)
  await writeRegistry(registry)
  logAction({
    requestId,
    action: 'skill.delete',
    detail: { id: parsedId.data.id }
  })
  return {
    statusCode: 204,
    payload: null
  }
}
