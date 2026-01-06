/**
 * Settings Storage
 * Manages settings persistence using figma.clientStorage
 */

export interface ProxySettings {
  proxyBaseUrl: string
  proxyAuthMode: 'shared_token' | 'session_token'
  proxySharedToken?: string
  proxySessionToken?: string
  requestTimeoutMs?: number
  enableStreaming?: boolean
}

const SETTINGS_KEY = 'figmai_settings'

/**
 * Get settings from storage, with defaults from config
 */
export async function getSettings(defaults: Partial<ProxySettings>): Promise<ProxySettings> {
  try {
    const stored = await figma.clientStorage.getAsync(SETTINGS_KEY)
    if (stored) {
      return {
        ...defaults,
        ...stored
      } as ProxySettings
    }
  } catch (error) {
    console.warn('Failed to load settings from storage:', error)
  }
  
  return defaults as ProxySettings
}

/**
 * Save settings to storage
 */
export async function saveSettings(settings: Partial<ProxySettings>): Promise<void> {
  try {
    const current = await getSettings({})
    const updated = {
      ...current,
      ...settings
    }
    await figma.clientStorage.setAsync(SETTINGS_KEY, updated)
  } catch (error) {
    console.error('Failed to save settings to storage:', error)
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
    console.error('Failed to clear settings:', error)
    throw error
  }
}



