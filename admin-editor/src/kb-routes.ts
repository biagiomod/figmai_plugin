/**
 * ACE KB API: registry, get doc, normalize, create, update, delete.
 * All paths built from validated id only (no user-supplied paths). Route order: registry before :id.
 */

import { Router, Request, Response } from 'express'
import path from 'path'
import fs from 'fs'
import { z } from 'zod'
import {
  KB_ID_REGEX,
  knowledgeBaseDocumentSchema,
  type KnowledgeBaseDocument
} from './kbSchema'
import { parseMarkdown, normalizeLooseJson } from './kbNormalize'

const idParamSchema = z.object({
  id: z.string().min(1).regex(KB_ID_REGEX, 'id must be kebab-case: [a-z0-9]+(?:-[a-z0-9]+)*')
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

type RegistryEntry = z.infer<typeof registryEntrySchema>

function formatZodErrors(err: z.ZodError): string[] {
  return err.errors.map((e) => `${e.path.join('.')}: ${e.message}`)
}

export function createKbRouter(repoRoot: string): Router {
  const router = Router()
  const baseDir = path.join(repoRoot, 'custom', 'knowledge-bases')
  const registryPath = path.join(baseDir, 'registry.json')

  function getDocPath(id: string): string {
    return path.join(baseDir, `${id}.kb.json`)
  }

  function readRegistry(): { knowledgeBases: RegistryEntry[] } {
    if (!fs.existsSync(registryPath)) return { knowledgeBases: [] }
    try {
      const raw = fs.readFileSync(registryPath, 'utf-8')
      const data = JSON.parse(raw) as unknown
      const parsed = registrySchema.safeParse(data)
      if (!parsed.success) {
        console.error('[kb] Registry validation failed:', parsed.error.errors)
        return { knowledgeBases: [] }
      }
      return parsed.data
    } catch (err) {
      console.error('[kb] Registry parse error:', err)
      return { knowledgeBases: [] }
    }
  }

  function writeRegistry(registry: { knowledgeBases: RegistryEntry[] }): void {
    fs.mkdirSync(baseDir, { recursive: true })
    fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2), 'utf-8')
  }

  function upsertRegistryEntry(doc: KnowledgeBaseDocument): void {
    const registry = readRegistry()
    const filePath = `${doc.id}.kb.json`
    const entry: RegistryEntry = {
      id: doc.id,
      title: doc.title || doc.id,
      filePath,
      ...(doc.tags?.length ? { tags: doc.tags } : {}),
      ...(doc.version ? { version: doc.version } : {}),
      ...(doc.updatedAt ? { updatedAt: doc.updatedAt } : {})
    }
    const existing = registry.knowledgeBases.find((e) => e.id === doc.id)
    if (existing) {
      const i = registry.knowledgeBases.indexOf(existing)
      registry.knowledgeBases[i] = entry
    } else {
      registry.knowledgeBases.push(entry)
    }
    writeRegistry(registry)
  }

  function removeRegistryEntry(id: string): void {
    const registry = readRegistry()
    registry.knowledgeBases = registry.knowledgeBases.filter((e) => e.id !== id)
    writeRegistry(registry)
  }

  // GET /api/kb/registry — must be before GET /:id
  router.get('/registry', (_req: Request, res: Response) => {
    try {
      const registry = readRegistry()
      res.json(registry)
    } catch (err: unknown) {
      res.status(500).json({ error: (err as Error).message })
    }
  })

  // GET /api/kb/:id
  router.get('/:id', (req: Request, res: Response) => {
    const parsed = idParamSchema.safeParse({ id: req.params.id })
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid id', details: formatZodErrors(parsed.error) })
    }
    const { id } = parsed.data
    const filePath = getDocPath(id)
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Not found' })
    try {
      const raw = fs.readFileSync(filePath, 'utf-8')
      const doc = JSON.parse(raw) as unknown
      const validated = knowledgeBaseDocumentSchema.safeParse(doc)
      if (!validated.success) {
        return res.status(500).json({ error: 'Invalid document on disk', details: formatZodErrors(validated.error) })
      }
      res.json(validated.data)
    } catch (err: unknown) {
      res.status(500).json({ error: (err as Error).message })
    }
  })

  // POST /api/kb/normalize
  const normalizeBodySchema = z.object({
    type: z.enum(['md', 'json']),
    content: z.string(),
    id: z.string().optional(),
    title: z.string().optional()
  })
  router.post('/normalize', (req: Request, res: Response) => {
    const parsedBody = normalizeBodySchema.safeParse(req.body)
    if (!parsedBody.success) {
      return res.status(400).json({ errors: formatZodErrors(parsedBody.error) })
    }
    const { type, content, id: rawId, title } = parsedBody.data
    const id = (rawId || 'draft').trim()
    const idCheck = idParamSchema.safeParse({ id })
    if (!idCheck.success) {
      return res.json({ errors: formatZodErrors(idCheck.error) })
    }
    try {
      if (type === 'md') {
        const doc = parseMarkdown(content, idCheck.data.id, title)
        return res.json({ doc })
      }
      const json = JSON.parse(content) as Record<string, unknown>
      const doc = normalizeLooseJson(json, idCheck.data.id, title)
      return res.json({ doc })
    } catch (err: unknown) {
      const msg = err instanceof SyntaxError ? 'Invalid JSON' : (err as Error).message
      return res.json({ errors: [msg] })
    }
  })

  // POST /api/kb (create; 409 if exists and !forceOverwrite)
  const createBodySchema = z.object({
    doc: knowledgeBaseDocumentSchema,
    forceOverwrite: z.boolean().optional()
  })
  router.post('/', (req: Request, res: Response) => {
    const parsed = createBodySchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ errors: formatZodErrors(parsed.error) })
    }
    const { doc, forceOverwrite } = parsed.data
    const filePath = getDocPath(doc.id)
    if (fs.existsSync(filePath) && forceOverwrite !== true) {
      return res.status(409).json({ error: 'File exists', code: 'OVERWRITE_REQUIRED' })
    }
    const withUpdated = { ...doc, updatedAt: new Date().toISOString() }
    const validated = knowledgeBaseDocumentSchema.safeParse(withUpdated)
    if (!validated.success) {
      return res.status(400).json({ errors: formatZodErrors(validated.error) })
    }
    try {
      fs.mkdirSync(baseDir, { recursive: true })
      fs.writeFileSync(filePath, JSON.stringify(validated.data, null, 2), 'utf-8')
      upsertRegistryEntry(validated.data)
      res.status(201).json({ doc: validated.data, registry: readRegistry() })
    } catch (err: unknown) {
      res.status(500).json({ error: (err as Error).message })
    }
  })

  // PATCH /api/kb/:id
  const patchBodySchema = z.object({ doc: knowledgeBaseDocumentSchema })
  router.patch('/:id', (req: Request, res: Response) => {
    const paramCheck = idParamSchema.safeParse({ id: req.params.id })
    if (!paramCheck.success) {
      return res.status(400).json({ error: 'Invalid id', details: formatZodErrors(paramCheck.error) })
    }
    const { id } = paramCheck.data
    const parsed = patchBodySchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ errors: formatZodErrors(parsed.error) })
    }
    const { doc } = parsed.data
    if (doc.id !== id) {
      return res.status(400).json({ error: 'doc.id must match URL :id' })
    }
    const filePath = getDocPath(id)
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Not found' })
    const withUpdated = { ...doc, updatedAt: new Date().toISOString() }
    const validated = knowledgeBaseDocumentSchema.safeParse(withUpdated)
    if (!validated.success) {
      return res.status(400).json({ errors: formatZodErrors(validated.error) })
    }
    try {
      fs.writeFileSync(filePath, JSON.stringify(validated.data, null, 2), 'utf-8')
      upsertRegistryEntry(validated.data)
      res.json({ doc: validated.data })
    } catch (err: unknown) {
      res.status(500).json({ error: (err as Error).message })
    }
  })

  // DELETE /api/kb/:id
  router.delete('/:id', (req: Request, res: Response) => {
    const parsed = idParamSchema.safeParse({ id: req.params.id })
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid id', details: formatZodErrors(parsed.error) })
    }
    const { id } = parsed.data
    const filePath = getDocPath(id)
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Not found' })
    try {
      fs.unlinkSync(filePath)
      removeRegistryEntry(id)
      res.status(204).send()
    } catch (err: unknown) {
      res.status(500).json({ error: (err as Error).message })
    }
  })

  return router
}
