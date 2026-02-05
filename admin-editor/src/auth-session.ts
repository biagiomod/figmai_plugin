/**
 * ACE session store: in-memory Map, cookie name "ace_sid".
 * httpOnly, sameSite; secure only when HTTPS/production.
 */

import { randomBytes } from 'crypto'

export const SESSION_COOKIE_NAME = 'ace_sid'

export interface SessionData {
  userId: string
  username: string
  role: string
  createdAt: number
}

const sessions = new Map<string, SessionData>()

export function createSessionId(): string {
  return randomBytes(24).toString('hex')
}

export function setSession(sid: string, data: SessionData): void {
  sessions.set(sid, data)
}

export function getSession(sid: string): SessionData | null {
  return sessions.get(sid) ?? null
}

export function deleteSession(sid: string): void {
  sessions.delete(sid)
}

export function getCookieOptions(secure: boolean): {
  httpOnly: boolean
  sameSite: 'lax' | 'strict'
  secure: boolean
  maxAge: number
  path: string
} {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure,
    maxAge: 7 * 24 * 60 * 60, // 7 days
    path: '/'
  }
}
