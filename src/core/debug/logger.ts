/**
 * Scoped Debug Logger
 * 
 * Bundle-safe logger that works in both main thread and UI thread.
 * No DOM or Figma API dependencies - uses only standard JavaScript.
 * 
 * Usage:
 *   import { debug } from '../debug/logger'
 *   const dcDebug = debug.scope('assistant:design_critique')
 *   dcDebug.log('message', data)
 * 
 * For expensive computations:
 *   if (debug.isEnabled('assistant:design_critique')) {
 *     const expensive = computeDebugData()
 *     debug.scope('assistant:design_critique').log('Expensive', expensive)
 *   }
 */

import { CONFIG } from '../config'

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface DebugScope {
  log(message: string, data?: unknown): void
  info(message: string, data?: unknown): void
  warn(message: string, data?: unknown): void
  error(message: string, data?: unknown): void
}

/**
 * Check if a scope is enabled (supports wildcards and backward compatibility)
 */
function isScopeEnabled(scope: string): boolean {
  const debugConfig = CONFIG.dev.debug
  
  // Backward compatibility: Map old flags to new scopes
  // This allows old CONFIG.dev.enableDesignCritiqueDebugLogging to work
  if (scope === 'assistant:design_critique' && CONFIG.dev.enableDesignCritiqueDebugLogging) {
    return true
  }
  if (scope === 'subsystem:clipboard' && CONFIG.dev.enableClipboardDebugLogging) {
    return true
  }
  
  // Fast path: if debugging is globally disabled, return false immediately
  if (!debugConfig.enabled) {
    return false
  }
  
  const scopes = debugConfig.scopes
  
  // Check exact match first (use type assertion for dynamic access)
  if ((scopes as Record<string, boolean>)[scope] === true) {
    return true
  }
  
  // Check wildcards
  // 'assistant:*' matches 'assistant:design_critique'
  if ((scopes as Record<string, boolean>)['assistant:*'] === true && scope.startsWith('assistant:')) {
    return true
  }
  if ((scopes as Record<string, boolean>)['subsystem:*'] === true && scope.startsWith('subsystem:')) {
    return true
  }
  
  // Check global scope
  if ((scopes as Record<string, boolean>).global === true) {
    return true
  }
  
  return false
}

/**
 * Check if a log level should be shown
 */
function shouldShowLevel(level: LogLevel): boolean {
  const debugConfig = CONFIG.dev.debug
  
  // Error is always enabled (even if debugging is off)
  if (level === 'error') {
    return true
  }
  
  // If debugging is disabled, only errors show
  if (!debugConfig.enabled) {
    return false
  }
  
  // Check level configuration
  return debugConfig.levels[level] === true
}

/**
 * Format log message with scope prefix
 */
function formatMessage(scope: string, level: LogLevel, message: string): string {
  const prefix = `[${scope}]`
  const levelPrefix = level === 'error' ? '[ERROR]' : level === 'warn' ? '[WARN]' : ''
  return `${prefix}${levelPrefix ? ' ' + levelPrefix : ''} ${message}`
}

/**
 * Create a scoped logger
 */
function createScope(scope: string): DebugScope {
  return {
    log(message: string, data?: unknown): void {
      if (!isScopeEnabled(scope) || !shouldShowLevel('debug')) {
        return
      }
      console.log(formatMessage(scope, 'debug', message), data ?? '')
    },
    
    info(message: string, data?: unknown): void {
      if (!isScopeEnabled(scope) || !shouldShowLevel('info')) {
        return
      }
      console.info(formatMessage(scope, 'info', message), data ?? '')
    },
    
    warn(message: string, data?: unknown): void {
      if (!isScopeEnabled(scope) || !shouldShowLevel('warn')) {
        return
      }
      console.warn(formatMessage(scope, 'warn', message), data ?? '')
    },
    
    error(message: string, data?: unknown): void {
      // Errors are always shown (even if debugging is disabled)
      if (!shouldShowLevel('error')) {
        return
      }
      console.error(formatMessage(scope, 'error', message), data ?? '')
    }
  }
}

/**
 * Main debug logger interface
 */
export const debug = {
  /**
   * Check if a scope is enabled (for lazy evaluation of expensive debug data)
   */
  isEnabled(scope: string): boolean {
    return isScopeEnabled(scope)
  },
  
  /**
   * Get a scoped logger
   */
  scope(scope: string): DebugScope {
    return createScope(scope)
  },
  
  /**
   * Global logging methods (use 'global' scope)
   */
  log(message: string, data?: unknown): void {
    createScope('global').log(message, data)
  },
  
  info(message: string, data?: unknown): void {
    createScope('global').info(message, data)
  },
  
  warn(message: string, data?: unknown): void {
    createScope('global').warn(message, data)
  },
  
  error(message: string, data?: unknown): void {
    createScope('global').error(message, data)
  }
}
