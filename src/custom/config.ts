/**
 * Custom Config Helper Functions
 * 
 * Provides helper functions to access custom configuration.
 * All functions return safe defaults when custom config is not present.
 */

import { customConfig } from './generated/customConfig'
import type { CustomConfig } from './generated/customConfig'

export type { CustomConfig }

/**
 * Get the full custom config object
 */
export function getCustomConfig(): CustomConfig | null {
  return customConfig
}

/**
 * Check if Content-MVP mode should be hidden in the UI
 */
export function shouldHideContentMvpMode(): boolean {
  return customConfig?.ui?.hideContentMvpMode === true
}

/**
 * Get the custom LLM endpoint URL if configured
 */
export function getCustomLlmEndpoint(): string | null {
  return customConfig?.llm?.endpoint || null
}

/**
 * Get LLM provider from config ('internal-api' | 'proxy').
 * When undefined, plugin falls back to clientStorage settings (current behavior).
 */
export function getLlmProvider(): 'internal-api' | 'proxy' | undefined {
  return customConfig?.llm?.provider
}

/**
 * Get proxy settings from config when provider is 'proxy'.
 * Returns undefined when config.llm.proxy is not set.
 */
export function getConfigProxySettings(): {
  baseUrl: string
  defaultModel?: string
  authMode?: 'shared_token' | 'session_token'
  sharedToken?: string
} | undefined {
  const proxy = customConfig?.llm?.proxy
  if (!proxy || typeof proxy.baseUrl !== 'string') return undefined
  return {
    baseUrl: proxy.baseUrl,
    defaultModel: typeof proxy.defaultModel === 'string' ? proxy.defaultModel : undefined,
    authMode: proxy.authMode === 'session_token' ? 'session_token' : proxy.authMode === 'shared_token' ? 'shared_token' : undefined,
    sharedToken: typeof proxy.sharedToken === 'string' ? proxy.sharedToken : undefined
  }
}

/**
 * Whether to hide Internal API settings in the plugin Settings modal.
 * When new keys absent and showTestConnection === false: hide (true).
 * When new key present: use it. Otherwise: show (false).
 */
export function getHideInternalApiSettings(): boolean {
  if (customConfig?.llm?.hideInternalApiSettings === true) return true
  if (customConfig?.llm?.hideInternalApiSettings === false) return false
  if (customConfig?.llm?.showTestConnection === false) return true
  return false
}

/**
 * Whether to hide Proxy settings in the plugin Settings modal.
 */
export function getHideProxySettings(): boolean {
  if (customConfig?.llm?.hideProxySettings === true) return true
  if (customConfig?.llm?.hideProxySettings === false) return false
  if (customConfig?.llm?.showTestConnection === false) return true
  return false
}

/**
 * Whether to hide the Test Connection button in the plugin Settings modal.
 */
export function getHideTestConnectionButton(): boolean {
  if (customConfig?.llm?.hideTestConnectionButton === true) return true
  if (customConfig?.llm?.hideTestConnectionButton === false) return false
  if (customConfig?.llm?.showTestConnection === false) return true
  return false
}

/**
 * Check if LLM Model Settings should be hidden (when custom endpoint is provided)
 */
export function shouldHideLlmModelSettings(): boolean {
  return customConfig?.llm?.hideModelSettings === true && !!customConfig?.llm?.endpoint
}

/**
 * Get LLM UI mode (defaults to 'full' if not specified)
 */
export function getLlmUiMode(): 'full' | 'connection-only' {
  return customConfig?.llm?.uiMode || 'full'
}

/**
 * Whether prompt diagnostics are enabled (default false)
 */
export function isPromptDiagnosticsEnabled(): boolean {
  return customConfig?.llm?.promptDiagnostics?.enabled === true
}

/**
 * Prompt diagnostics level (default 'compact' when enabled)
 */
export function getPromptDiagnosticsLevel(): 'off' | 'compact' | 'details' {
  const level = customConfig?.llm?.promptDiagnostics?.level
  if (level === 'off' || level === 'compact' || level === 'details') return level
  return 'compact'
}

/**
 * Safety toggles for work/Azure isolation (defaults: forceNoKbName false, forceNoSelectionSummary false, forceNoImages true)
 */
export function getSafetyToggles(): {
  forceNoKbName: boolean
  forceNoSelectionSummary: boolean
  forceNoImages: boolean
} {
  return {
    forceNoKbName: customConfig?.llm?.safety?.forceNoKbName === true,
    forceNoSelectionSummary: customConfig?.llm?.safety?.forceNoSelectionSummary === true,
    forceNoImages: customConfig?.llm?.safety?.forceNoImages !== false
  }
}

/**
 * Get resources links (defensive: returns empty objects if not configured)
 */
export function getResourcesLinks(): {
  about?: { label: string; url: string }
  feedback?: { label: string; url: string }
  meetup?: { label: string; url: string }
} {
  return customConfig?.resources?.links || {}
}

/**
 * Get resources credits (defensive: returns empty arrays if not configured)
 */
export function getResourcesCredits(): {
  createdBy: Array<{ label: string; url: string }>
  apiTeam: Array<{ label: string; url: string }>
  llmInstruct: Array<{ label: string; url: string }>
} {
  return {
    createdBy: customConfig?.resources?.credits?.createdBy || [],
    apiTeam: customConfig?.resources?.credits?.apiTeam || [],
    llmInstruct: customConfig?.resources?.credits?.llmInstruct || []
  }
}

/**
 * Get design system configuration (defensive: returns safe defaults)
 */
export function getDesignSystemConfig(): {
  enabled: boolean
  activeRegistries: string[]
  allowlist: string[] | undefined
  denylist: string[] | undefined
  strictMode: boolean
} {
  return {
    enabled: customConfig?.designSystems?.enabled === true,
    activeRegistries: customConfig?.designSystems?.activeRegistries || [],
    allowlist: customConfig?.designSystems?.allowlist,
    denylist: customConfig?.designSystems?.denylist,
    strictMode: customConfig?.designSystems?.strictMode === true
  }
}
