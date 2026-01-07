/**
 * Default Work Adapter (No-Op Implementation)
 * 
 * This file provides safe no-op implementations for all WorkAdapter hooks.
 * Used when no Work override is present. Contains ZERO work/proprietary knowledge.
 */

import type { WorkAdapter } from './adapter'

/**
 * Creates a default WorkAdapter with no-op implementations
 * All optional hooks return null/false/empty as appropriate
 */
export function createDefaultWorkAdapter(): WorkAdapter {
  return {
    confluenceApi: undefined,
    designSystem: undefined,
    auth: undefined,
    getContentTableIgnoreRules: undefined
  }
}

