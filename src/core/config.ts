import type { LlmProviderId } from './types'

/**
 * Configuration - Single source of truth for all integration knobs
 * This is the ONLY file that should need editing when porting to work.
 */
export const CONFIG = {
  // Provider selection
  provider: 'openai' as LlmProviderId,
  
  // Feature flags
  features: {
    enableToolCalls: true,
    enableVision: false,
    enableSelectionExportPng: false
  },
  
  // Default mode
  defaultMode: 'advanced' as const,
  
  // Dev-only flags
  dev: {
    // Enable Content Table validation logging (warnings/errors in console)
    enableContentTableValidationLogging: false
  }
} as const
