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
