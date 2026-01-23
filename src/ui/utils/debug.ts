/**
 * Debug Logger for UI Subsystem
 * 
 * Gated by CONFIG.dev.debug.scopes['subsystem:ui']
 * Use this for temporary instrumentation that can be cleanly removed.
 */

import { CONFIG } from '../../core/config'

/**
 * Check if UI subsystem debugging is enabled
 * 
 * Uses boolean casting to avoid TS2367 errors with literal 'as const' types.
 * Reads scopes through Record<string, boolean> to avoid literal type issues.
 */
function isDebugEnabled(): boolean {
  const enabled = Boolean(CONFIG.dev.debug.enabled)
  if (!enabled) {
    return false
  }
  
  // Read scopes as Record to avoid literal type issues with 'as const'
  const scopes = CONFIG.dev.debug.scopes as Record<string, boolean>
  return Boolean(scopes['subsystem:ui']) || Boolean(scopes['global'])
}

/**
 * Debug log (only if subsystem:ui is enabled)
 * 
 * Supports 2-argument usage: debugLog(scope, message)
 * Supports 3-argument usage: debugLog(scope, message, data)
 */
export function debugLog(scope: string, message: string, data?: unknown): void {
  if (isDebugEnabled()) {
    if (data !== undefined) {
      console.log(`[UI:${scope}]`, message, data)
    } else {
      console.log(`[UI:${scope}]`, message)
    }
  }
}

/**
 * Debug warn (always enabled for warnings)
 * 
 * Supports 2-argument usage: debugWarn(scope, message)
 * Supports 3-argument usage: debugWarn(scope, message, data)
 */
export function debugWarn(scope: string, message: string, data?: unknown): void {
  if (isDebugEnabled()) {
    if (data !== undefined) {
      console.warn(`[UI:${scope}]`, message, data)
    } else {
      console.warn(`[UI:${scope}]`, message)
    }
  } else {
    // Warnings are always logged, but without prefix if debug is off
    if (data !== undefined) {
      console.warn(message, data)
    } else {
      console.warn(message)
    }
  }
}
