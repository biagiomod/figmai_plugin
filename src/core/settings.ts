/**
 * Settings Module
 * Centralized configuration and storage management
 *
 * Precedence: When config.llm.provider is set (via ACE), effective settings use config
 * for provider and connection params; clientStorage is ignored for those fields.
 * When config.llm.provider is undefined, effective settings = clientStorage (current behavior).
 */

import { getLlmProvider, getCustomLlmEndpoint, getConfigProxySettings } from '../custom/config'

export interface Settings {
  /**
   * @deprecated Mode is NOT stored in settings - it lives in localStorage ('figmai-mode')
   * This field exists for backward compatibility but should NOT be read or written by UI code.
   * Mode source of truth: localStorage + explicit user action only.
   */
  mode?: 'simple' | 'advanced' | 'content-mvp'
  connectionType?: 'proxy' | 'internal-api'
  proxyBaseUrl: string
  internalApiUrl?: string
  authMode: 'shared_token' | 'session_token'
  sharedToken?: string
  sessionToken?: string
  defaultModel: string
  requestTimeoutMs: number
}

const SETTINGS_KEY = 'figmai_settings'

const DEFAULT_SETTINGS: Settings = {
  connectionType: 'proxy',
  proxyBaseUrl: '',
  authMode: 'shared_token',
  defaultModel: 'gpt-4.1-mini',
  requestTimeoutMs: 30000
}

/** Safe fallback for SETTINGS_RESPONSE when getEffectiveSettings() fails (e.g. storage error). */
export function getDefaultSettingsForResponse(): Settings {
  return {
    ...DEFAULT_SETTINGS,
    internalApiUrl: '',
    sharedToken: '',
    sessionToken: ''
  }
}

/**
 * Normalize proxy base URL: trim whitespace and remove trailing slashes
 */
function normalizeProxyBaseUrl(url: string): string {
  return url.trim().replace(/\/+$/, '')
}

/**
 * Normalize internal API URL: trim whitespace and remove trailing slashes
 */
function normalizeInternalApiUrl(url: string): string {
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
      // Normalize URLs when loading
      if (merged.proxyBaseUrl) {
        merged.proxyBaseUrl = normalizeProxyBaseUrl(merged.proxyBaseUrl)
      }
      if (merged.internalApiUrl) {
        merged.internalApiUrl = normalizeInternalApiUrl(merged.internalApiUrl)
      }
      // Backward compatibility: if connectionType is undefined, default to proxy
      if (!merged.connectionType) {
        merged.connectionType = 'proxy'
      }
      return merged
    }
  } catch (error) {
    console.warn('[Settings] Failed to load from storage:', error)
  }
  
  return { ...DEFAULT_SETTINGS }
}

/**
 * Get effective settings: config wins when config.llm.provider is set;
 * otherwise clientStorage (getSettings) is used.
 */
export async function getEffectiveSettings(): Promise<Settings> {
  const base = await getSettings()
  const provider = getLlmProvider()
  if (!provider) return base

  if (provider === 'internal-api') {
    const endpoint = getCustomLlmEndpoint()
    return {
      ...base,
      connectionType: 'internal-api',
      internalApiUrl: endpoint || base.internalApiUrl || ''
    }
  }

  if (provider === 'proxy') {
    const proxy = getConfigProxySettings()
    if (!proxy) return { ...base, connectionType: 'proxy' }
    // When config supplies proxy, use config values; omit => show blank in modal (no clientStorage fallback)
    return {
      ...base,
      connectionType: 'proxy',
      proxyBaseUrl: proxy.baseUrl ?? base.proxyBaseUrl,
      defaultModel: proxy.defaultModel ?? '',
      authMode: proxy.authMode ?? base.authMode,
      sharedToken: proxy.sharedToken ?? ''
    }
  }

  return base
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
    
    // Normalize URLs before saving
    if (updated.proxyBaseUrl) {
      updated.proxyBaseUrl = normalizeProxyBaseUrl(updated.proxyBaseUrl)
    }
    if (updated.internalApiUrl) {
      updated.internalApiUrl = normalizeInternalApiUrl(updated.internalApiUrl)
    }
    // Backward compatibility: if connectionType is undefined, default to proxy
    if (!updated.connectionType) {
      updated.connectionType = 'proxy'
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

