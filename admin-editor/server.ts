/**
 * Admin Config Editor – local server.
 * GET /api/model, POST /api/validate, POST /api/save.
 * Serves static files from admin-editor/public.
 * Does NOT build or publish the plugin; runs generators after save only.
 */

import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import { loadModel } from './src/model'
import { validateModel, adminEditableModelSchema, saveRequestBodySchema } from './src/schema'
import { saveModel, saveModelDryRun } from './src/save'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const adminEditorDir = __dirname
const repoRoot = path.resolve(adminEditorDir, '..')
const backupRootDir = path.join(adminEditorDir, '.backups')

const ACE_DEBUG = process.env.ACE_DEBUG === '1' || process.env.ACE_DEBUG === 'true'
const app = express()
app.use(express.json({ limit: '10mb' }))
app.use(express.static(path.join(adminEditorDir, 'public')))

// GET /api/model – load single AdminEditableModel from repo files.
// Cache-Control: no-store so client never gets a cached revision (avoids false 409 on Save).
app.get('/api/model', (_req, res) => {
  res.set('Cache-Control', 'no-store')
  try {
    const { model, meta } = loadModel(repoRoot)
    const validation = validateModel(model)
    res.json({
      model,
      meta: {
        repoRoot: meta.repoRoot,
        filePaths: meta.filePaths,
        lastModified: meta.lastModified,
        revision: meta.revision,
        files: meta.files
      },
      validation: {
        errors: validation.errors,
        warnings: validation.warnings
      }
    })
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? String(err) })
  }
})

// POST /api/validate – validate payload; do not write. Body must match AdminEditableModel (strict).
app.post('/api/validate', (req, res) => {
  try {
    const parsed = adminEditableModelSchema.safeParse(req.body)
    if (!parsed.success) {
      const errors = parsed.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`)
      return res.status(400).json({ errors, warnings: [] })
    }
    const result = validateModel(parsed.data)
    res.json({ errors: result.errors, warnings: result.warnings })
  } catch (err: any) {
    res.status(500).json({ error: err?.message ?? String(err) })
  }
})

// POST /api/save – validate, backup, write, run generators; return summary.
// Query ?dryRun=1: preview only (filesWouldWrite, generatorsWouldRun, backupsWouldCreateAt).
// Body: { model: AdminEditableModel, meta: { revision } }. On revision mismatch returns 409.
// Conflict check is done once at request start (before any writes); generators cannot cause a false 409.
app.post('/api/save', (req, res) => {
  const dryRun = req.query.dryRun === '1' || req.query.dryRun === 'true'
  try {
    const parsed = saveRequestBodySchema.safeParse(req.body)
    if (!parsed.success) {
      const errors = parsed.error.errors.map((e) => `${e.path.join('.')}: ${e.message}`)
      return res.status(400).json({ errors, success: false })
    }
    const { meta: currentMeta } = loadModel(repoRoot)
    const clientRevision = parsed.data.meta.revision
    if (ACE_DEBUG) {
      const match = currentMeta.revision === clientRevision
      console.log('[ACE /api/save] start: clientRevisionLength=' + (typeof clientRevision === 'string' ? clientRevision.length : 0) + ', currentMeta.revisionLength=' + (typeof currentMeta.revision === 'string' ? currentMeta.revision.length : 0) + ', match=' + match)
    }
    if (currentMeta.revision !== clientRevision) {
      return res.status(409).json({
        error: 'Files changed since load; reload to avoid overwriting.',
        meta: {
          repoRoot: currentMeta.repoRoot,
          filePaths: currentMeta.filePaths,
          lastModified: currentMeta.lastModified,
          revision: currentMeta.revision,
          files: currentMeta.files
        }
      })
    }
    const m = parsed.data.model
    const toSave = {
      config: m.config,
      assistantsManifest: m.assistantsManifest,
      customKnowledge: m.customKnowledge,
      contentModelsRaw: m.contentModelsRaw,
      designSystemRegistries: m.designSystemRegistries
    }
    if (dryRun) {
      const summary = saveModelDryRun(toSave, currentMeta, backupRootDir)
      if (!summary.success) {
        return res.status(400).json(summary)
      }
      return res.json(summary)
    }
    const summary = saveModel(toSave, currentMeta, backupRootDir)
    if (!summary.success) {
      res.status(400).json(summary)
      return
    }
    const { meta: newMeta } = loadModel(repoRoot)
    if (ACE_DEBUG) {
      console.log('[ACE /api/save] 200: newMeta.revisionLength=' + (typeof newMeta.revision === 'string' ? newMeta.revision.length : 0))
    }
    res.json({ ...summary, meta: newMeta })
  } catch (err: any) {
    res.status(500).json({
      success: false,
      filesWritten: [],
      backupsCreatedAt: '',
      backupRoot: '',
      generatorsRun: [],
      errors: [err?.message ?? String(err)],
      nextSteps: 'Ask the plugin owner to run `npm run build` and then publish via the normal process.'
    })
  }
})

const PORT = process.env.ADMIN_EDITOR_PORT ? parseInt(process.env.ADMIN_EDITOR_PORT, 10) : 3333
app.listen(PORT, () => {
  console.log(`Admin Config Editor server at http://localhost:${PORT}`)
  console.log(`Repo root: ${repoRoot}`)
  console.log('Endpoints: GET /api/model, POST /api/validate, POST /api/save')
})
