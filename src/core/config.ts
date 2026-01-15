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
    enableContentTableValidationLogging: false,
    // Enable clipboard debug logging (console logs and debug UI)
    enableClipboardDebugLogging: false,
    // Enable sync API error detection (catches runtime errors from sync node APIs)
    enableSyncApiErrorDetection: true,
    // Enable Design Critique verbose debug logging
    // DEPRECATED: Use CONFIG.dev.debug.scopes['assistant:design_critique'] instead
    enableDesignCritiqueDebugLogging: false,
    
    // Scoped debug configuration
    debug: {
      // Global enable/disable for all debugging
      enabled: false,
      
      // Scoped enable (supports wildcards: 'assistant:*', 'subsystem:*')
      scopes: {
        // Assistant scopes (use assistant:<assistantId>)
        'assistant:design_critique': false,
        'assistant:content_table': false,
        'assistant:design_workshop': false,
        'assistant:discovery_copilot': false,
        'assistant:general': false,
        
        // Subsystem scopes (use subsystem:<name>)
        'subsystem:provider': false,
        'subsystem:parsing': false,
        'subsystem:canvas': false,
        'subsystem:selection': false,
        'subsystem:clipboard': false,
        
        // Global scope (always checked first)
        'global': false
      },
      
      // Log levels (when enabled, what to show)
      levels: {
        debug: true,
        info: true,
        warn: true,
        error: true  // Always enabled regardless of config
      }
    }
  }
} as const
