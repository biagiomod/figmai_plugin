/**
 * ACE auth middleware: requireAuth, requireRole (editor+), requireOwner.
 */

import type { Request, Response, NextFunction } from 'express'
import { SESSION_COOKIE_NAME, getSession } from './auth-session'
import { findUserById } from './auth-users'
import type { Role } from './auth-users'

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
    res.locals.auth = {
      userId: user.id,
      username: user.username,
      role: user.role as Role
    }
    next()
  }
}

const ROLE_ORDER: Record<Role, number> = {
  reviewer: 1,
  editor: 2,
  owner: 3
}

function hasRoleAtLeast(role: Role, required: 'editor' | 'owner'): boolean {
  if (required === 'owner') return role === 'owner'
  return ROLE_ORDER[role] >= ROLE_ORDER.editor
}

/**
 * Require editor or owner. Use after requireAuth.
 */
export function requireRole(required: 'editor' | 'owner') {
  return (req: Request, res: Response, next: NextFunction): void => {
    const auth = res.locals.auth as AuthLocals | undefined
    if (!auth) {
      res.status(401).json({ error: 'Unauthorized' })
      return
    }
    if (!hasRoleAtLeast(auth.role, required)) {
      res.status(403).json({ error: 'Forbidden' })
      return
    }
    next()
  }
}

/**
 * Require owner only. Use after requireAuth.
 */
export function requireOwner(_req: Request, res: Response, next: NextFunction): void {
  const auth = res.locals.auth as AuthLocals | undefined
  if (!auth) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  if (auth.role !== 'owner') {
    res.status(403).json({ error: 'Forbidden' })
    return
  }
  next()
}
