/**
 * ACE auth middleware: requireAuth, requireAdmin, requireRoleValidateSave (admin/manager/editor).
 *
 * Supports two auth modes (ACE_AUTH_MODE env var):
 *   - "local" (default): cookie/session auth with file-backed users.
 *   - "wrapper": trusts Spring-injected X-ACE-User / X-ACE-Groups headers.
 *     In wrapper mode Node never creates sessions or cookies; Spring is the
 *     sole auth authority.
 */

import type { Request, Response, NextFunction } from 'express'
import { timingSafeEqual } from 'crypto'
import { SESSION_COOKIE_NAME, getSession } from './auth-session'
import { findUserById } from './auth-users'
import type { Role } from './auth-users'
import { normalizeRole, canManageUsers, canValidateAndSave } from './permissions'

/** Auth mode: "local" (default) or "wrapper" (Spring proxy). */
const ACE_AUTH_MODE = process.env.ACE_AUTH_MODE || 'local'
const ACE_WRAPPER_TOKEN = process.env.ACE_WRAPPER_TOKEN || ''
const ACE_ALLOW_GROUPS_FALLBACK = process.env.ACE_ALLOW_GROUPS_FALLBACK === '1' || process.env.ACE_ALLOW_GROUPS_FALLBACK === 'true'

/** Placeholder values that indicate misconfiguration. */
const PLACEHOLDER_TOKENS = new Set(['', 'REPLACE_ME_LONG_RANDOM', 'REPLACE_ME', 'changeme', 'test', 'secret'])

export function isWrapperMode (): boolean {
  return ACE_AUTH_MODE === 'wrapper'
}

/** Validate wrapper mode configuration at import time. */
export function validateWrapperConfig (): void {
  if (!isWrapperMode()) return
  if (PLACEHOLDER_TOKENS.has(ACE_WRAPPER_TOKEN.trim())) {
    console.error(
      '[FATAL] ACE_AUTH_MODE=wrapper requires ACE_WRAPPER_TOKEN to be set to a strong random value.\n' +
      'Current value is missing or a placeholder. Generate one with: openssl rand -hex 32\n' +
      'Set it as an environment variable: ACE_WRAPPER_TOKEN=<your-token>'
    )
    process.exit(1)
  }
}

/** Constant-time comparison for wrapper token. Prevents timing attacks. */
function verifyWrapperToken (incoming: string): boolean {
  if (!ACE_WRAPPER_TOKEN || !incoming) return false
  const expected = Buffer.from(ACE_WRAPPER_TOKEN, 'utf-8')
  const actual = Buffer.from(incoming, 'utf-8')
  if (expected.length !== actual.length) return false
  return timingSafeEqual(expected, actual)
}

/** Map Spring-injected group names to the nearest ACE role. */
function resolveRoleFromGroups (groups: string[]): Role {
  const set = new Set(groups.map(g => g.toLowerCase()))
  if (set.has('ace-admins')) return 'admin'
  if (set.has('ace-managers')) return 'manager'
  if (set.has('ace-editors')) return 'editor'
  return 'reviewer'
}

function resolveRoleFromHeader (rawRole: string | undefined): Role | null {
  if (!rawRole) return null
  const normalized = rawRole.trim().toLowerCase()
  if (normalized === 'owner') return 'admin'
  if (normalized === 'admin' || normalized === 'manager' || normalized === 'editor' || normalized === 'reviewer') {
    return normalized as Role
  }
  return null
}

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
 * In wrapper mode: reads identity from X-ACE-User / X-ACE-Groups headers.
 * In local mode: reads identity from ace_sid cookie / session store.
 */
export function requireAuth(dataDir: string) {
  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    // --- Wrapper mode: trust Spring-injected identity headers ---
    if (isWrapperMode()) {
      const aceUser = req.headers['x-ace-user']
      const wrapperToken = req.headers['x-ace-wrapper-token']
      if (!aceUser || typeof aceUser !== 'string') {
        res.status(403).json({ error: 'Forbidden: missing X-ACE-User header (wrapper mode).' })
        return
      }
      if (!wrapperToken || typeof wrapperToken !== 'string') {
        res.status(403).json({ error: 'Forbidden: missing X-ACE-Wrapper-Token header (wrapper mode).' })
        return
      }
      if (!verifyWrapperToken(wrapperToken)) {
        res.status(403).json({ error: 'Forbidden: invalid X-ACE-Wrapper-Token (wrapper mode).' })
        return
      }
      const roleHeader = typeof req.headers['x-ace-role'] === 'string' ? req.headers['x-ace-role'] : undefined
      const roleFromHeader = resolveRoleFromHeader(roleHeader)
      if (!roleFromHeader && !ACE_ALLOW_GROUPS_FALLBACK) {
        res.status(403).json({ error: 'Forbidden: missing or invalid X-ACE-Role header (wrapper mode).' })
        return
      }
      const groupsRaw = (typeof req.headers['x-ace-groups'] === 'string' ? req.headers['x-ace-groups'] : '') || ''
      const groups = groupsRaw.split(',').map(g => g.trim()).filter(Boolean)
      res.locals.auth = {
        userId: aceUser,
        username: aceUser,
        role: roleFromHeader ?? resolveRoleFromGroups(groups)
      }
      next()
      return
    }
    // --- Local mode: existing cookie/session flow (unchanged) ---
    const session = getSessionFromRequest(req)
    if (!session) {
      console.log(`[ACE auth] 401 missing session: ${req.method} ${req.path}`)
      res.status(401).json({ error: 'Unauthorized' })
      return
    }
    const user = findUserById(dataDir, session.data.userId)
    if (!user || user.disabled) {
      console.log(`[ACE auth] 401 invalid/disabled user: ${req.method} ${req.path} userId=${session.data.userId}`)
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
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  const auth = res.locals.auth as AuthLocals | undefined
  if (!auth) {
    console.log(`[ACE auth] 401 no auth context: ${req.method} ${req.path}`)
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  if (!canManageUsers(auth.role)) {
    console.log(`[ACE auth] 403 role=${auth.role} user=${auth.username} blocked from admin-only route: ${req.method} ${req.path}`)
    res.status(403).json({ error: 'Forbidden' })
    return
  }
  next()
}

/**
 * Require admin, manager, or editor (validate/preview/save). Reviewer returns 403.
 */
export function requireRoleValidateSave(req: Request, res: Response, next: NextFunction): void {
  const auth = res.locals.auth as AuthLocals | undefined
  if (!auth) {
    console.log(`[ACE auth] 401 no auth context: ${req.method} ${req.path}`)
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  if (!canValidateAndSave(auth.role)) {
    console.log(`[ACE auth] 403 role=${auth.role} user=${auth.username} blocked from save/validate route: ${req.method} ${req.path}`)
    res.status(403).json({ error: 'Forbidden' })
    return
  }
  next()
}
