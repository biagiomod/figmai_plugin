/**
 * ACE Skills API: CRUD routes for shared skills stored as markdown files.
 * Skills live at custom/skills/<id>.md; registry at custom/skills/registry.json.
 */

import { Router, Request, Response } from 'express'
import path from 'path'
import fs from 'fs'
import { z } from 'zod'

const SKILL_ID_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*$/
const SKILL_FILE_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*\.md$/

const idParamSchema = z.object({
  id: z.string().min(1).regex(SKILL_ID_REGEX, 'id must be kebab-case: [a-z0-9]+(?:-[a-z0-9]+)*')
})

const skillRegistryEntrySchema = z.object({
  id: z.string(),
  title: z.string(),
  kind: z.string(),
  filePath: z.string()
})

const skillsRegistrySchema = z.object({
  skills: z.array(skillRegistryEntrySchema)
})

type SkillRegistryEntry = z.infer<typeof skillRegistryEntrySchema>

function formatZodErrors(err: z.ZodError): string[] {
  return err.errors.map((e) => `${e.path.join('.')}: ${e.message}`)
}

export function createSkillsRouter(repoRoot: string): Router {
  const router = Router()
  const skillsDir = path.join(repoRoot, 'custom', 'skills')
  const registryPath = path.join(skillsDir, 'registry.json')

  /** Resolve entry.filePath safely, rejecting paths that escape skillsDir. */
  function safeEntryPath(filePath: string): string | null {
    if (!SKILL_FILE_REGEX.test(filePath)) return null
    const resolved = path.resolve(skillsDir, filePath)
    if (!resolved.startsWith(skillsDir + path.sep) && resolved !== skillsDir) return null
    return resolved
  }

  function readRegistry(): { skills: SkillRegistryEntry[] } {
    if (!fs.existsSync(registryPath)) return { skills: [] }
    try {
      const raw = fs.readFileSync(registryPath, 'utf-8')
      const data = JSON.parse(raw) as unknown
      const parsed = skillsRegistrySchema.safeParse(data)
      if (!parsed.success) {
        console.error('[skills] Registry validation failed:', parsed.error.errors)
        return { skills: [] }
      }
      return parsed.data
    } catch (err) {
      console.error('[skills] Registry parse error:', err)
      return { skills: [] }
    }
  }

  function writeRegistry(registry: { skills: SkillRegistryEntry[] }): void {
    fs.mkdirSync(skillsDir, { recursive: true })
    fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2), 'utf-8')
  }

  function getFilePath(id: string): string {
    return path.join(skillsDir, `${id}.md`)
  }

  // GET /api/skills — list all skills from registry
  router.get('/', (_req: Request, res: Response) => {
    const registry = readRegistry()
    res.json({ skills: registry.skills })
  })

  // GET /api/skills/:id
  router.get('/:id', (req: Request, res: Response) => {
    const parsed = idParamSchema.safeParse({ id: req.params.id })
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid id', details: formatZodErrors(parsed.error) })
    }
    const { id } = parsed.data
    const registry = readRegistry()
    const entry = registry.skills.find((s) => s.id === id)
    if (!entry) return res.status(404).json({ error: 'Not found' })
    const filePath = safeEntryPath(entry.filePath)
    if (!filePath) return res.status(500).json({ error: 'Invalid registry entry' })
    if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'File not found on disk' })
    try {
      const content = fs.readFileSync(filePath, 'utf-8')
      res.json({ id: entry.id, title: entry.title, kind: entry.kind, filePath: entry.filePath, content })
    } catch (err: unknown) {
      res.status(500).json({ error: (err as Error).message })
    }
  })

  // POST /api/skills — create
  const createBodySchema = z.object({
    id: z.string().min(1).regex(SKILL_ID_REGEX, 'id must be kebab-case'),
    title: z.string().min(1),
    kind: z.string().min(1),
    content: z.string()
  })
  router.post('/', (req: Request, res: Response) => {
    const parsed = createBodySchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed', details: formatZodErrors(parsed.error) })
    }
    const { id, title, kind, content } = parsed.data
    const registry = readRegistry()
    if (registry.skills.some((s) => s.id === id)) {
      return res.status(409).json({ error: 'Skill already exists', code: 'CONFLICT' })
    }
    const filePath = `${id}.md`
    const fullPath = path.join(skillsDir, filePath)
    try {
      fs.mkdirSync(skillsDir, { recursive: true })
      fs.writeFileSync(fullPath, content, 'utf-8')
      const entry: SkillRegistryEntry = { id, title, kind, filePath }
      registry.skills.push(entry)
      writeRegistry(registry)
      res.status(201).json({ id, title, kind, filePath, content })
    } catch (err: unknown) {
      res.status(500).json({ error: (err as Error).message })
    }
  })

  // PATCH /api/skills/:id — update
  const patchBodySchema = z.object({
    title: z.string().min(1).optional(),
    kind: z.string().min(1).optional(),
    content: z.string().optional()
  })
  router.patch('/:id', (req: Request, res: Response) => {
    const paramCheck = idParamSchema.safeParse({ id: req.params.id })
    if (!paramCheck.success) {
      return res.status(400).json({ error: 'Invalid id', details: formatZodErrors(paramCheck.error) })
    }
    const { id } = paramCheck.data
    const parsed = patchBodySchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ error: 'Validation failed', details: formatZodErrors(parsed.error) })
    }
    const registry = readRegistry()
    const entryIndex = registry.skills.findIndex((s) => s.id === id)
    if (entryIndex === -1) return res.status(404).json({ error: 'Not found' })
    const entry = registry.skills[entryIndex]
    const fullPath = safeEntryPath(entry.filePath)
    if (!fullPath) return res.status(500).json({ error: 'Invalid registry entry' })
    try {
      if (parsed.data.content !== undefined) {
        fs.writeFileSync(fullPath, parsed.data.content, 'utf-8')
      }
      if (parsed.data.title !== undefined) entry.title = parsed.data.title
      if (parsed.data.kind !== undefined) entry.kind = parsed.data.kind
      registry.skills[entryIndex] = entry
      writeRegistry(registry)
      const content = fs.existsSync(fullPath) ? fs.readFileSync(fullPath, 'utf-8') : ''
      res.json({ id: entry.id, title: entry.title, kind: entry.kind, filePath: entry.filePath, content })
    } catch (err: unknown) {
      res.status(500).json({ error: (err as Error).message })
    }
  })

  // DELETE /api/skills/:id
  router.delete('/:id', (req: Request, res: Response) => {
    const parsed = idParamSchema.safeParse({ id: req.params.id })
    if (!parsed.success) {
      return res.status(400).json({ error: 'Invalid id', details: formatZodErrors(parsed.error) })
    }
    const { id } = parsed.data
    const registry = readRegistry()
    const entryIndex = registry.skills.findIndex((s) => s.id === id)
    if (entryIndex === -1) return res.status(404).json({ error: 'Not found' })
    const entry = registry.skills[entryIndex]
    const fullPath = safeEntryPath(entry.filePath)
    if (!fullPath) return res.status(500).json({ error: 'Invalid registry entry' })
    try {
      if (fs.existsSync(fullPath)) fs.unlinkSync(fullPath)
      registry.skills.splice(entryIndex, 1)
      writeRegistry(registry)
      res.json({ ok: true })
    } catch (err: unknown) {
      res.status(500).json({ error: (err as Error).message })
    }
  })

  return router
}
