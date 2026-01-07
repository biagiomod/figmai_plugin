/**
 * Work Adapter Interface
 * Public stub implementation for Work-only features
 * Work plugin will override this with real implementations
 */

import type { UniversalContentTableV1 } from '../types'

/**
 * Design System Information
 */
export interface DesignSystemInfo {
  name: string
  version?: string
  tokens?: Record<string, unknown>
}

/**
 * Work Adapter Interface
 * Defines extension points for Work-only features
 */
export interface WorkAdapter {
  /**
   * Confluence API integration
   * Work-only: Send content tables to Confluence
   */
  confluenceApi?: {
    sendTable(table: UniversalContentTableV1, format: string): Promise<void>
  }

  /**
   * Design System Detection
   * Work-only: Detect design system from Figma nodes
   */
  designSystem?: {
    detectSystem(node: SceneNode): Promise<DesignSystemInfo | null>
    shouldIgnore(node: SceneNode): boolean
  }

  /**
   * Enterprise Authentication
   * Work-only: Get enterprise auth tokens
   */
  auth?: {
    getEnterpriseToken(): Promise<string>
  }
}

/**
 * Public stub implementation
 * Work plugin will override this with real implementations
 */
export const workAdapter: WorkAdapter = {
  confluenceApi: undefined, // Work will override
  designSystem: undefined, // Work will override
  auth: undefined // Work will override
}

