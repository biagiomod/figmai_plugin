/**
 * Work Adapter Interface
 * Defines extension points for Work-only features
 * 
 * The Work Plugin can provide implementations via an override file.
 * See loadAdapter.ts for how the adapter is loaded.
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
 * Content Table Ignore Rules
 * Work-only: Rules for filtering nodes during Content Table scanning
 */
export interface ContentTableIgnoreRules {
  /**
   * Regex patterns to match against node names
   * Example: ["^Debug", ".*FPO.*", ".*Test.*"]
   */
  nodeNamePatterns?: string[]

  /**
   * Node ID prefixes to ignore
   * Example: ["I1234:", "I5678:"]
   */
  nodeIdPrefixes?: string[]

  /**
   * Component keys to allow (whitelist)
   * If provided, only nodes with these component keys will be included
   */
  componentKeyAllowlist?: string[]

  /**
   * Component keys to deny (blacklist)
   * Nodes with these component keys will be excluded
   */
  componentKeyDenylist?: string[]

  /**
   * Regex patterns to match against text content values
   * Example: [".*lorem.*", ".*placeholder.*"]
   */
  textValuePatterns?: string[]
}

/**
 * Design System Detection Result
 * Work-only: Result of detecting whether a node is part of a design system
 */
export interface DesignSystemDetectionResult {
  /** Whether this node is identified as a design system component */
  isDesignSystem: boolean
  /** Name of the design system (e.g., "Internal DS", "Material Design") */
  systemName?: string
  /** Component key if detected */
  componentKey?: string
  /** Component name if detected */
  componentName?: string
  /** Reason for detection (e.g., "Matches component key pattern", "Known DS component") */
  reason?: string
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
   * Create Confluence page
   * Work-only: Create a new Confluence page with XHTML content
   * 
   * @param args - Arguments for creating the page
   * @param args.confluenceTitle - Title for the Confluence page
   * @param args.confluenceTemplateXhtml - XHTML-encoded table content
   * @returns Promise resolving to the created page URL (if available)
   */
  createConfluence?: (args: {
    confluenceTitle: string
    confluenceTemplateXhtml: string
  }) => Promise<{ url?: string }>

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

  /**
   * Content Table Ignore Rules
   * Work-only: Get ignore rules for filtering nodes during Content Table scanning
   */
  getContentTableIgnoreRules?: () => ContentTableIgnoreRules

  /**
   * Design System Component Detector
   * Work-only: Detect if a node is part of a design system component
   * Called during Content Table scanning to identify DS components
   * 
   * @param node - The Figma node to check
   * @returns Detection result, or null if not a DS component
   */
  detectDesignSystemComponent?: (node: SceneNode) => DesignSystemDetectionResult | null
}
