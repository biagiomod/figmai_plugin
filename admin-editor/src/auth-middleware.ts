/**
 * ACE auth middleware: requireAuth, requireAdmin, requireRoleValidateSave (admin/manager/editor).
 */

import type { Request, Response, NextFunction } from 'express'
import { SESSION_COOKIE_NAME, getSession } from './auth-session'
import { findUserById } from './auth-users'
import type { Role } from './auth-users'
import { normalizeRole, canManageUsers, canValidateAndSave } from './permissions'

export interface AuthLocals {
  userId: string
  username: string
  role: Role
}

declare global {
  namespace Express {
    interface Response {
      locals: Record<string, unknown> & { auth?: AuthLocals }
    }
  }
}

function getSessionFromRequest(req: Request): { sid: string; data: { userId: string; username: string; role: string } } | null {
  const sid = req.cookies?.[SESSION_COOKIE_NAME]
  if (!sid || typeof sid !== 'string') return null
  const data = getSession(sid)
  if (!data) return null
  return { sid, data }
}

/**
 * Require any authenticated user. Sets res.locals.auth.
 */
export function requireAuth(dataDir: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    const session = getSessionFromRequest(req)
    if (!session) {
      res.status(401).json({ error: 'Unauthorized' })
      return
    }
    const user = findUserById(dataDir, session.data.userId)
    if (!user || user.disabled) {
      res.status(401).json({ error: 'Unauthorized' })
      return
    }
    const role = normalizeRole(user.role) as Role
    res.locals.auth = {
      userId: user.id,
      username: user.username,
      role
    }
    next()
  }
}

/**
 * Require admin only. Use after requireAuth. For users CRUD.
 */
export function requireAdmin(_req: Request, res: Response, next: NextFunction): void {
  const auth = res.locals.auth as AuthLocals | undefined
  if (!auth) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  if (!canManageUsers(auth.role)) {
    res.status(403).json({ error: 'Forbidden' })
    return
  }
  next()
}

/**
 * Require admin, manager, or editor (validate/preview/save). Reviewer returns 403.
 */
export function requireRoleValidateSave(_req: Request, res: Response, next: NextFunction): void {
  const auth = res.locals.auth as AuthLocals | undefined
  if (!auth) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  if (!canValidateAndSave(auth.role)) {
    res.status(403).json({ error: 'Forbidden' })
    return
  }
  next()
}
