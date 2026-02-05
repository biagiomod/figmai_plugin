/**
 * Admin Config Editor – local server.
 * GET /api/model, POST /api/validate, POST /api/save (auth + editor+).
 * Auth: cookie ace_sid, file-backed users, RBAC owner/editor/reviewer.
 * Serves static files from admin-editor/public.
 */

import express from 'express'
import path from 'path'
import { fileURLToPath } from 'url'
import cookieParser from 'cookie-parser'
import { loadModel } from './src/model'
import { validateModel, adminEditableModelSchema, saveRequestBodySchema } from './src/schema'
import { saveModel, saveModelDryRun } from './src/save'
import { requireAuth, requireRole, requireOwner } from './src/auth-middleware'
import {
  handleLogin,
  handleLogout,
  handleMe,
  handleBootstrapAllowed,
  handleBootstrap
} from './src/auth-routes'
import {
  handleListUsers,
  handleCreateUser,
  handleUpdateUser
} from './src/users-routes'
import { appendAuditLine } from './src/audit'
import type { AuthLocals } from './src/auth-middleware'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)
const adminEditorDir = __dirname
const repoRoot = path.resolve(adminEditorDir, '..')
const backupRootDir = path.join(adminEditorDir, '.backups')
const dataDir = path.join(adminEditorDir, 'data')

const ACE_DEBUG = process.env.ACE_DEBUG === '1' || process.env.ACE_DEBUG === 'true'
const app = express()
app.use(express.json({ limit: '10mb' }))
app.use(cookieParser())
app.use(express.static(path.join(adminEditorDir, 'public')))

// ——— Auth routes (no auth required) ———
app.get('/api/auth/bootstrap-allowed', (req, res) => {
  handleBootstrapAllowed(req, res, dataDir)
})
app.post('/api/auth/bootstrap', (req, res, next) => {
  handleBootstrap(req, res, dataDir).catch(next)
})
app.post('/api/auth/login', (req, res, next) => {
  handleLogin(req, res, dataDir).catch(next)
})
app.post('/api/auth/logout', handleLogout)

// ——— Auth: me (requires valid session) ———
app.get('/api/auth/me', requireAuth(dataDir), handleMe)

// ——— Users CRUD (owner only) ———
app.get('/api/users', requireAuth(dataDir), requireOwner, (req, res) => {
  handleListUsers(req, res, dataDir)
})
app.post('/api/users', requireAuth(dataDir), requireOwner, (req, res, next) => {
  handleCreateUser(req, res, dataDir).catch(next)
})
app.patch('/api/users/:id', requireAuth(dataDir), requireOwner, (req, res, next) => {
  handleUpdateUser(req, res, dataDir).catch(next)
})

// ——— Model: GET requires auth ———
app.get('/api/model', requireAuth(dataDir), (_req, res) => {
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

// ——— Validate: editor+ ———
app.post('/api/validate', requireAuth(dataDir), requireRole('editor'), (req, res) => {
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

// ——— Save: editor+; audit on success ———
app.post('/api/save', requireAuth(dataDir), requireRole('editor'), (req, res) => {
  const dryRun = req.query.dryRun === '1' || req.query.dryRun === 'true'
  const auth = res.locals.auth as AuthLocals
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
    appendAuditLine(dataDir, {
      timestamp: new Date().toISOString(),
      user: auth.username,
      action: 'save',
      resource: 'model',
      revisionBefore: clientRevision,
      revisionAfter: newMeta.revision,
      filesWritten: summary.filesWritten || [],
      dryRun: false
    })
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
  console.log(`Data dir: ${dataDir}`)
  console.log('Endpoints: GET /api/model, POST /api/validate, POST /api/save; auth: /api/auth/*, users: /api/users (owner)')
})
