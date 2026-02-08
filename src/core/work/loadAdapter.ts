/**
 * Work Adapter Loader
 * 
 * Loads the Work adapter from the override file (static import for Figma-compatible bundle).
 * The override file can export default WorkAdapter or createWorkAdapter(); falls back to default no-op.
 */

import type { WorkAdapter } from './adapter'
import { createDefaultWorkAdapter } from './defaultAdapter'
import * as overrideModule from '../../work/workAdapter.override'

/**
 * Loads the Work adapter from the statically imported override module.
 *
 * Override file: `src/work/workAdapter.override.ts`
 * - `default: WorkAdapter` or `createWorkAdapter(): WorkAdapter`
 */
export function loadWorkAdapter(): Promise<WorkAdapter> {
  if (overrideModule.default && typeof overrideModule.default === 'object') {
    return Promise.resolve(overrideModule.default as WorkAdapter)
  }
  if ('createWorkAdapter' in overrideModule && typeof overrideModule.createWorkAdapter === 'function') {
    return Promise.resolve(overrideModule.createWorkAdapter())
  }
  return Promise.resolve(createDefaultWorkAdapter())
}

