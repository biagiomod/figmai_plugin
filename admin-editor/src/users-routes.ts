/**
 * ACE users CRUD: owner only. List, create, disable, change role, reset password.
 */

import type { Request, Response } from 'express'
import { loadUsers, createUser, updateUser } from './auth-users'
import type { Role } from './auth-users'
import type { AuthLocals } from './auth-middleware'

/**
 * GET /api/users
 * Returns list of users (owner only). Include disabled.
 */
export function handleListUsers(req: Request, res: Response, dataDir: string): void {
  const users = loadUsers(dataDir, true)
  res.json({
    users: users.map((u) => ({
      id: u.id,
      username: u.username,
      role: u.role,
      disabled: !!u.disabled,
      createdAt: u.createdAt,
      updatedAt: u.updatedAt
    }))
  })
}

/**
 * POST /api/users
 * Body: { username, password, role }. Create user (owner only).
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
 * Body: { disabled?, role?, password? }. Update user (owner only).
 */
export async function handleUpdateUser(
  req: Request,
  res: Response,
  dataDir: string
): Promise<void> {
  const id = req.params.id
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
  const updates: { disabled?: boolean; role?: Role; password?: string } = {}
  if (typeof req.body?.disabled === 'boolean') updates.disabled = req.body.disabled
  if (typeof req.body?.role === 'string') updates.role = req.body.role as Role
  if (typeof req.body?.password === 'string') updates.password = req.body.password
  if (Object.keys(updates).length === 0) {
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
      createdAt: result.user.createdAt,
      updatedAt: result.user.updatedAt
    }
  })
}
