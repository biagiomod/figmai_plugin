/**
 * ACE users CRUD: admin only. List, create, disable, change role, reset password.
 */

import type { Request, Response } from 'express'
import { loadUsers, createUser, updateUser } from './auth-users'
import type { Role } from './auth-users'
import type { AuthLocals } from './auth-middleware'

/**
 * GET /api/users
 * Returns list of users (admin only). Include disabled.
 */
export function handleListUsers(req: Request, res: Response, dataDir: string): void {
  const users = loadUsers(dataDir, true)
  res.json({
    users: users.map((u) => ({
      id: u.id,
      username: u.username,
      role: u.role,
      disabled: !!u.disabled,
      allowedTabs: u.allowedTabs,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt
    }))
  })
}

/**
 * POST /api/users
 * Body: { username, password, role }. Create user (admin only).
 */
export async function handleCreateUser(
  req: Request,
  res: Response,
  dataDir: string
): Promise<void> {
  const { username, password, role } = req.body || {}
  const r = (typeof role === 'string' ? role : 'reviewer') as Role
  const result = await createUser(dataDir, username || '', password || '', r)
  if (!result.ok) {
    res.status(400).json({ error: result.error })
    return
  }
  res.status(201).json({
    user: {
      id: result.user.id,
      username: result.user.username,
      role: result.user.role,
      disabled: false,
      createdAt: result.user.createdAt,
      updatedAt: result.user.updatedAt
    }
  })
}

/**
 * PATCH /api/users/:id
 * Body: { disabled?, role?, password?, allowedTabs? }. Update user (admin only).
 * Handler: admin-editor/src/users-routes.ts handleUpdateUser
 */
export async function handleUpdateUser(
  req: Request,
  res: Response,
  dataDir: string
): Promise<void> {
  const id = req.params.id
  const requestId = req.headers['x-ace-request-id'] ?? req.headers['X-ACE-Request-Id']
  // #region agent log (gated by ACE_DEBUG=1)
  if (process.env.ACE_DEBUG === '1') {
    const logPayload = {
      requestId,
      method: req.method,
      path: req.path,
      route: 'PATCH /api/users/:id (users-routes.ts handleUpdateUser)',
      paramsId: id,
      contentType: req.headers['content-type'],
      body: req.body,
      bodyStringify: JSON.stringify(req.body),
      typeofBody: typeof req.body
    }
    console.log('[PATCH /api/users/:id] received', logPayload)
    fetch('http://127.0.0.1:7242/ingest/5cbaa6c2-4815-4212-80f6-d608747f90a6', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ location: 'users-routes.ts:handleUpdateUser', message: 'PATCH received', data: logPayload, timestamp: Date.now(), sessionId: 'debug-session' })
    }).catch(() => {})
  }
  // #endregion
  if (!id) {
    res.status(400).json({ error: 'User id required' })
    return
  }
  const auth = res.locals.auth as AuthLocals
  if (auth.userId === id) {
    // Prevent self-disable or self-role demotion if we want; for now allow role change
    // Block self-disable to avoid lockout
    if (req.body && req.body.disabled === true) {
      res.status(400).json({ error: 'Cannot disable your own account.' })
      return
    }
  }
  const updates: { disabled?: boolean; role?: Role; password?: string; allowedTabs?: string[] } = {}
  if (typeof req.body?.disabled === 'boolean') updates.disabled = req.body.disabled
  if (typeof req.body?.role === 'string') updates.role = req.body.role as Role
  if (typeof req.body?.password === 'string') updates.password = req.body.password
  if (Array.isArray(req.body?.allowedTabs)) updates.allowedTabs = req.body.allowedTabs
  // #region agent log
  if (process.env.ACE_DEBUG === '1') {
    console.log('[PATCH /api/users/:id] computed updates:', { requestId, updates, keys: Object.keys(updates) })
  }
  // #endregion
  if (Object.keys(updates).length === 0) {
    // #region agent log
    if (process.env.ACE_DEBUG === '1') {
      const noUpdatesPayload = { requestId, status: 400, message: 'No updates provided', aboutToSend: true }
      console.log('[PATCH /api/users/:id] returning error', noUpdatesPayload)
      fetch('http://127.0.0.1:7242/ingest/5cbaa6c2-4815-4212-80f6-d608747f90a6', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ location: 'users-routes.ts:handleUpdateUser', message: 'No updates provided response', data: noUpdatesPayload, timestamp: Date.now(), sessionId: 'debug-session' })
      }).catch(() => {})
    }
    // #endregion
    res.status(400).json({ error: 'No updates provided' })
    return
  }
  const result = await updateUser(dataDir, id, updates)
  if (!result.ok) {
    res.status(400).json({ error: result.error })
    return
  }
  res.json({
    user: {
      id: result.user.id,
      username: result.user.username,
      role: result.user.role,
      disabled: !!result.user.disabled,
      allowedTabs: result.user.allowedTabs,
      createdAt: result.user.createdAt,
      updatedAt: result.user.updatedAt
    }
  })
}
