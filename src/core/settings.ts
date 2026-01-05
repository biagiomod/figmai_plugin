/**
 * Settings Module
 * Centralized configuration and storage management
 */

export interface Settings {
  mode?: 'simple' | 'advanced'
  proxyBaseUrl: string
  authMode: 'shared_token' | 'session_token'
  sharedToken?: string
  sessionToken?: string
  defaultModel: string
  requestTimeoutMs: number
}

const SETTINGS_KEY = 'figmai_settings'

const DEFAULT_SETTINGS: Settings = {
  proxyBaseUrl: '',
  authMode: 'shared_token',
  defaultModel: 'gpt-4.1-mini',
  requestTimeoutMs: 30000
}

/**
 * Normalize proxy base URL: trim whitespace and remove trailing slashes
 */
function normalizeProxyBaseUrl(url: string): string {
  return url.trim().replace(/\/+$/, '')
}

/**
 * Get settings from storage with defaults
 */
export async function getSettings(): Promise<Settings> {
  try {
    const stored = await figma.clientStorage.getAsync(SETTINGS_KEY)
    if (stored) {
      const merged = {
        ...DEFAULT_SETTINGS,
        ...stored
      } as Settings
      // Normalize proxyBaseUrl when loading
      if (merged.proxyBaseUrl) {
        merged.proxyBaseUrl = normalizeProxyBaseUrl(merged.proxyBaseUrl)
      }
      return merged
    }
  } catch (error) {
    console.warn('[Settings] Failed to load from storage:', error)
  }
  
  return { ...DEFAULT_SETTINGS }
}

/**
 * Save settings to storage
 */
export async function saveSettings(settings: Partial<Settings>): Promise<void> {
  try {
    const current = await getSettings()
    const updated: Settings = {
      ...current,
      ...settings
    }
    
    // Normalize proxyBaseUrl before saving
    if (updated.proxyBaseUrl) {
      updated.proxyBaseUrl = normalizeProxyBaseUrl(updated.proxyBaseUrl)
    }
    
    await figma.clientStorage.setAsync(SETTINGS_KEY, updated)
  } catch (error) {
    console.error('[Settings] Failed to save:', error)
    throw error
  }
}

/**
 * Clear all settings (reset to defaults)
 */
export async function clearSettings(): Promise<void> {
  try {
    await figma.clientStorage.deleteAsync(SETTINGS_KEY)
  } catch (error) {
    console.error('[Settings] Failed to clear:', error)
    throw error
  }
}

