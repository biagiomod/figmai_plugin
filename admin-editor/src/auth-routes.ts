/**
 * ACE auth routes: login, logout, me, bootstrap-allowed.
 */

import type { Request, Response } from 'express'
import { SESSION_COOKIE_NAME, createSessionId, setSession, deleteSession, getCookieOptions } from './auth-session'
import {
  findUserByUsername,
  findUserById,
  verifyPassword,
  bootstrapAdmin,
  isBootstrapAllowed,
  getBootstrapAllowedStatus
} from './auth-users'
import { normalizeRole, getEffectiveAllowedTabs } from './permissions'
import type { AuthLocals } from './auth-middleware'

function isSecure(req: Request): boolean {
  const proto = req.get('x-forwarded-proto') || req.protocol
  return proto === 'https'
}

/**
 * POST /api/auth/login
 * Body: { username, password }
 */
export async function handleLogin(
  req: Request,
  res: Response,
  dataDir: string
): Promise<void> {
  const { username, password } = req.body || {}
  if (!username || typeof password !== 'string') {
    res.status(400).json({ error: 'Username and password required' })
    return
  }
  const user = findUserByUsername(dataDir, username)
  if (!user) {
    res.status(401).json({ error: 'Invalid username or password' })
    return
  }
  const valid = await verifyPassword(password, user.passwordHash)
  if (!valid) {
    res.status(401).json({ error: 'Invalid username or password' })
    return
  }
  const role = normalizeRole(user.role)
  const sid = createSessionId()
  setSession(sid, {
    userId: user.id,
    username: user.username,
    role,
    createdAt: Date.now()
  })
  const opts = getCookieOptions(isSecure(req))
  res.cookie(SESSION_COOKIE_NAME, sid, opts)
  res.json({
    user: {
      id: user.id,
      username: user.username,
      role
    }
  })
}

/**
 * POST /api/auth/logout
 * Clears session cookie and in-memory session.
 */
export function handleLogout(req: Request, res: Response): void {
  const sid = req.cookies?.[SESSION_COOKIE_NAME]
  if (sid) deleteSession(sid)
  res.clearCookie(SESSION_COOKIE_NAME, { path: '/', httpOnly: true, sameSite: 'lax' })
  res.json({ ok: true })
}

/**
 * GET /api/auth/me
 * Returns current user and effective allowedTabs (per-user overrides role default).
 */
export function handleMe(_req: Request, res: Response, dataDir: string): void {
  const auth = res.locals.auth as AuthLocals | undefined
  if (!auth) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  const user = findUserById(dataDir, auth.userId)
  const allowedTabs = user
    ? getEffectiveAllowedTabs(auth.role, user.allowedTabs)
    : getEffectiveAllowedTabs(auth.role, null)
  res.json({
    user: {
      id: auth.userId,
      username: auth.username,
      role: auth.role
    },
    allowedTabs
  })
}

/**
 * GET /api/auth/bootstrap-allowed
 * No auth required. Returns { allowed: true } when no users file, empty list, or all disabled; { allowed: false, reason } otherwise.
 */
export function handleBootstrapAllowed(_req: Request, res: Response, dataDir: string): void {
  const status = getBootstrapAllowedStatus(dataDir)
  const aceDebug = process.env.ACE_DEBUG === '1' || process.env.ACE_DEBUG === 'true'
  if (aceDebug) {
    console.log('[ACE bootstrap-allowed]', status.allowed ? 'allowed' : 'denied', status.reason || '(no active users)')
  }
  if (status.allowed) {
    res.json({ allowed: true })
  } else {
    res.json({ allowed: false, reason: status.reason })
  }
}

/**
 * POST /api/auth/bootstrap
 * Body: { username, password }. Creates first admin. Only when bootstrap-allowed.
 */
export async function handleBootstrap(
  req: Request,
  res: Response,
  dataDir: string
): Promise<void> {
  if (!isBootstrapAllowed(dataDir)) {
    res.status(403).json({ error: 'Bootstrap not allowed; users already exist.' })
    return
  }
  const { username, password } = req.body || {}
  if (!username || typeof password !== 'string') {
    res.status(400).json({ error: 'Username and password required' })
    return
  }
  const result = await bootstrapAdmin(dataDir, username, password)
  if (!result.ok) {
    res.status(400).json({ error: result.error })
    return
  }
  const role = normalizeRole(result.user.role)
  const sid = createSessionId()
  setSession(sid, {
    userId: result.user.id,
    username: result.user.username,
    role,
    createdAt: Date.now()
  })
  const opts = getCookieOptions(isSecure(req))
  res.cookie(SESSION_COOKIE_NAME, sid, opts)
  res.status(201).json({
    user: {
      id: result.user.id,
      username: result.user.username,
      role
    }
  })
}
