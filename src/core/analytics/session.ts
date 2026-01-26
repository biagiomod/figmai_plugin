/**
 * Analytics Session Management
 * 
 * Manages analytics session lifecycle:
 * - UUID per session
 * - 24h expiry
 * - Stored in figma.clientStorage
 */

const SESSION_KEY = 'figmai.analytics.session'
const SESSION_EXPIRY_MS = 24 * 60 * 60 * 1000 // 24 hours

interface SessionData {
  sessionId: string
  createdAt: number
}

/**
 * Get or create analytics session
 * 
 * @returns Session ID
 */
export async function getOrCreateSession(): Promise<string> {
  try {
    const stored = await figma.clientStorage.getAsync(SESSION_KEY) as SessionData | undefined

    if (stored && stored.sessionId && stored.createdAt) {
      const age = Date.now() - stored.createdAt
      if (age < SESSION_EXPIRY_MS) {
        return stored.sessionId
      }
    }

    // Create new session
    const newSessionId = generateUUID()
    const newSession: SessionData = {
      sessionId: newSessionId,
      createdAt: Date.now()
    }

    await figma.clientStorage.setAsync(SESSION_KEY, newSession)
    return newSessionId
  } catch (error) {
    // If storage fails, generate a temporary session ID (not persisted)
    // This ensures analytics can still function even if storage is unavailable
    return generateUUID()
  }
}

/**
 * Generate a UUID v4
 */
function generateUUID(): string {
  // Simple UUID v4 generator (works in Figma plugin context)
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0
    const v = c === 'x' ? r : (r & 0x3) | 0x8
    return v.toString(16)
  })
}
