/**
 * Default Work Adapter (No-op)
 * 
 * Provides a no-op implementation of the WorkAdapter interface.
 * Used when no Work override file is present (Public Plugin).
 */

import type { WorkAdapter } from './adapter'

export function createDefaultWorkAdapter(): WorkAdapter {
  return {
    confluenceApi: undefined,
    designSystem: undefined,
    auth: undefined,
    getContentTableIgnoreRules: undefined,
    detectDesignSystemComponent: undefined
  }
}
