/**
 * Analytics Tagging — clientStorage save/load and migrations
 * Stores only lightweight session data (no screenshot bytes).
 */

import type { Session, Row, StoredSessionV1 } from './types'
import { STORAGE_KEY, CURRENT_STORAGE_VERSION } from './types'

function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`
}

function nowISO(): string {
  return new Date().toISOString()
}

/** Create a new empty session */
export function createNewSession(source?: { pageId: string; pageName: string }): Session {
  return {
    id: generateId(),
    rows: [],
    draftRow: null,
    createdAtISO: nowISO(),
    updatedAtISO: nowISO(),
    source
  }
}

/** Migrate v0 (no version) to v1 */
function migrateV0ToV1(raw: unknown): StoredSessionV1 {
  const obj = raw as Record<string, unknown>
  const rows = (Array.isArray(obj.rows) ? obj.rows : []) as Row[]
  const session: Session = {
    id: typeof obj.id === 'string' ? obj.id : generateId(),
    rows: rows.map(row => ({
      ...row,
      actionType: row.actionType || 'Action',
      description: typeof row.description === 'string' ? row.description : '',
      component: typeof row.component === 'string' ? row.component : 'custom',
      actionId: typeof row.actionId === 'string' ? row.actionId : '',
      figmaElementLink: typeof row.figmaElementLink === 'string' ? row.figmaElementLink : '',
      population: typeof row.population === 'string' ? row.population : '',
      note: typeof row.note === 'string' ? row.note : ''
    })),
    draftRow: null,
    createdAtISO: typeof obj.createdAtISO === 'string' ? obj.createdAtISO : nowISO(),
    updatedAtISO: nowISO(),
    source: obj.source as Session['source']
  }
  return { version: 1, session }
}

/** Load session from clientStorage; run migrations if needed */
export async function loadSession(): Promise<Session | null> {
  try {
    const raw = await figma.clientStorage.getAsync(STORAGE_KEY)
    if (raw == null) return null

    const obj = raw as Record<string, unknown>
    const version = typeof obj.version === 'number' ? obj.version : undefined

    if (version === 1) {
      const stored = raw as StoredSessionV1
      const session = stored.session ?? null
      if (session && !('draftRow' in session)) {
        session.draftRow = null
      }
      return session
    }

    // v0 or unknown: migrate to v1
    const migrated = migrateV0ToV1(raw)
    await figma.clientStorage.setAsync(STORAGE_KEY, migrated)
    return migrated.session
  } catch (e) {
    console.error('[analyticsTagging/storage] loadSession error:', e)
    return null
  }
}

/** Save session to clientStorage (lightweight only; no screenshot bytes) */
export async function saveSession(session: Session): Promise<void> {
  const payload: StoredSessionV1 = {
    version: CURRENT_STORAGE_VERSION,
    session: {
      ...session,
      updatedAtISO: nowISO()
    }
  }
  await figma.clientStorage.setAsync(STORAGE_KEY, payload)
}
