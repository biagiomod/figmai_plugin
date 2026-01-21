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
