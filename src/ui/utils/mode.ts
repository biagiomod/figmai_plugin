/**
 * Mode Initialization Utilities (UI Thread Only)
 * 
 * Centralized mode initialization logic for UI components.
 * Uses localStorage (UI-only) and respects custom config.
 * 
 * IMPORTANT: This module is UI-only and must NOT be imported in main thread code.
 */

import type { Mode } from '../../core/types'
import { CONFIG } from '../../core/config'
import { getCustomConfig } from '../../custom/config'
import { debugLog } from './debug'

/**
 * Valid mode values
 */
export const VALID_MODES: Mode[] = ['simple', 'advanced', 'content-mvp']

/**
 * Storage key for mode in localStorage
 */
const MODE_STORAGE_KEY = 'figmai-mode'

/**
 * Check if a value is a valid mode
 * 
 * @param value - Value to check
 * @param options - Options including hideContentMvpMode flag
 * @returns true if value is a valid mode under current config
 */
export function isValidMode(
  value: unknown,
  options: { hideContentMvpMode?: boolean } = {}
): value is Mode {
  if (typeof value !== 'string') {
    return false
  }
  
  if (!VALID_MODES.includes(value as Mode)) {
    return false
  }
  
  // If content-mvp is hidden, treat it as invalid even if stored
  if (value === 'content-mvp' && options.hideContentMvpMode === true) {
    return false
  }
  
  return true
}

/**
 * Get initial mode with priority:
 * 1. localStorage (if valid under current config)
 * 2. customConfig.ui.defaultMode (if provided and valid under current config) - Phase 2
 * 3. CONFIG.defaultMode
 * 
 * Never writes to localStorage (read-only).
 * 
 * @param options - Options including customConfig and hideContentMvpMode
 * @returns Initial mode value
 */
export function getInitialMode(options: {
  customConfig?: { ui?: { defaultMode?: Mode; [key: string]: any } } | null
  configDefault?: Mode
  hideContentMvpMode?: boolean
} = {}): Mode {
  const { customConfig, configDefault, hideContentMvpMode = false } = options
  
  // Priority 1: Check localStorage
  try {
    const saved = localStorage.getItem(MODE_STORAGE_KEY)
    debugLog('mode', 'getInitialMode: localStorage value', { saved, hideContentMvpMode })
    if (saved && isValidMode(saved, { hideContentMvpMode })) {
      debugLog('mode', 'getInitialMode: using localStorage', { mode: saved, source: 'localStorage' })
      return saved as Mode
    } else if (saved) {
      debugLog('mode', 'getInitialMode: localStorage value invalid', { saved, reason: hideContentMvpMode && saved === 'content-mvp' ? 'content-mvp hidden' : 'not a valid mode' })
    }
  } catch (error) {
    console.warn('[Mode] Failed to read from localStorage:', error)
  }
  
  // Priority 2: Check customConfig.ui.defaultMode (Phase 2 - will be available after config expansion)
  if (customConfig?.ui && 'defaultMode' in customConfig.ui && customConfig.ui.defaultMode) {
    const customDefault = customConfig.ui.defaultMode as Mode
    debugLog('mode', 'getInitialMode: checking customConfig.ui.defaultMode', { customDefault })
    if (isValidMode(customDefault, { hideContentMvpMode })) {
      debugLog('mode', 'getInitialMode: using customConfig.ui.defaultMode', { mode: customDefault, source: 'customConfig' })
      return customDefault
    }
  }
  
  // Priority 3: Fall back to CONFIG.defaultMode or provided configDefault
  const fallback = configDefault ?? CONFIG.defaultMode
  debugLog('mode', 'getInitialMode: using fallback', { fallback, source: 'CONFIG.defaultMode' })
  if (isValidMode(fallback, { hideContentMvpMode })) {
    return fallback
  }
  
  // Last resort: if fallback is invalid (e.g., content-mvp when hidden),
  // use 'advanced' as safe default
  debugLog('mode', 'getInitialMode: using last resort default', { mode: 'advanced', source: 'hardcoded fallback' })
  return 'advanced'
}
