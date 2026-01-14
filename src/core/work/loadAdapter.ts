/**
 * Work Adapter Loader
 * 
 * Attempts to load a Work-only override file. If not present, falls back to
 * the default no-op adapter. This allows the Public Plugin to run without
 * any Work-specific code, while allowing the Work Plugin to drop in a single
 * override file.
 */

import type { WorkAdapter } from './adapter'
import { createDefaultWorkAdapter } from './defaultAdapter'

/**
 * Loads the Work adapter, attempting to import an override file first.
 * 
 * Override file location: `src/work/workAdapter.override.ts`
 * 
 * The override file can export either:
 * - `default: WorkAdapter` (default export)
 * - `createWorkAdapter(): WorkAdapter` (named export function)
 * 
 * If the override file doesn't exist or fails to load, returns the default
 * no-op adapter.
 * 
 * NOTE: Uses a string-based dynamic import to avoid build-time resolution issues.
 * The import path is constructed at runtime to prevent the bundler from trying
 * to resolve it at build time.
 */
export async function loadWorkAdapter(): Promise<WorkAdapter> {
  try {
    // Import the override file (stub exists in Public Plugin, real impl in Work Plugin)
    const overrideModule = await import('../../work/workAdapter.override')
    
    // Check for default export (WorkAdapter)
    if (overrideModule.default && typeof overrideModule.default === 'object') {
      return overrideModule.default as WorkAdapter
    }
    
    // Check for named export function (createWorkAdapter)
    if ('createWorkAdapter' in overrideModule && typeof overrideModule.createWorkAdapter === 'function') {
      return overrideModule.createWorkAdapter()
    }
    
    // If module loaded but no valid export found, fall back to default
    return createDefaultWorkAdapter()
  } catch (error) {
    // Override file doesn't exist or failed to load - this is expected in Public Plugin
    // In Figma plugins, dynamic imports that fail are caught here
    return createDefaultWorkAdapter()
  }
}

