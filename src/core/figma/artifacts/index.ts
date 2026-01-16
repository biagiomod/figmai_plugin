/**
 * Artifact Components System
 * Orchestrates creation, placement, and rendering of reusable UI artifacts on the Figma stage
 */

import { placeArtifactFrame, type PlaceArtifactOptions } from './placeArtifact'

/**
 * Options for creating an artifact
 */
export interface CreateArtifactOptions {
  type: string                    // Artifact type identifier (e.g., 'scorecard', 'note')
  assistant: string               // Assistant ID that created this artifact
  selectedNode?: SceneNode        // Selection for placement reference
  version?: string                // Optional version (e.g., 'v2')
  replace?: boolean               // Replace existing artifacts of same type/version (default: true)
  placement?: {
    spacing?: number              // Override default spacing (default: 40)
    side?: 'left' | 'right'       // Override default side (default: 'left')
  }
  width?: number                  // Override default width for this artifact type
}

/**
 * Context passed to artifact component render function
 */
export interface ArtifactRenderContext {
  root: FrameNode                 // Pre-created and placed root frame
  selectedNode?: SceneNode        // Original selection
  options: CreateArtifactOptions   // Original options
  data: unknown                    // Component-specific data
}

/**
 * Artifact component interface
 * Each artifact type implements this to render its content
 */
export interface ArtifactComponent {
  /**
   * Render the artifact content into the provided root frame
   * The root frame is already created, placed, and has basic layout properties set
   */
  render(context: ArtifactRenderContext): Promise<void>
  
  /**
   * Get the default width for this artifact type
   */
  getDefaultWidth(): number
}

/**
 * Registry of artifact components by type
 */
const artifactComponents: Map<string, ArtifactComponent> = new Map()

/**
 * Register an artifact component
 * Should be called during module initialization
 */
export function registerArtifactComponent(type: string, component: ArtifactComponent): void {
  if (artifactComponents.has(type)) {
    console.warn(`[Artifacts] Overwriting existing artifact component for type: ${type}`)
  }
  artifactComponents.set(type, component)
}

/**
 * Create and place an artifact on the stage
 * This is the main entry point for assistants to create artifacts
 * 
 * @param options - Artifact creation options
 * @param data - Component-specific data (e.g., ScorecardData)
 * @returns The created and placed root frame
 */
export async function createArtifact(
  options: CreateArtifactOptions,
  data: unknown
): Promise<FrameNode> {
  // Get component for this type
  const component = artifactComponents.get(options.type)
  if (!component) {
    throw new Error(`Unknown artifact type: ${options.type}. Available types: ${Array.from(artifactComponents.keys()).join(', ')}`)
  }
  
  // Determine width (use override, component default, or fallback)
  const width = options.width ?? component.getDefaultWidth()
  
  // Create and place root frame using existing placement utility
  const root = await placeArtifactFrame({
    type: options.type,
    assistant: options.assistant,
    selectedNode: options.selectedNode,
    width,
    spacing: options.placement?.spacing ?? 40,
    version: options.version,
    replace: options.replace ?? true
  })
  
  // Call component's render method
  await component.render({
    root,
    selectedNode: options.selectedNode,
    options,
    data
  })
  
  return root
}

/**
 * Initialize artifact component registry
 * Call this from a single entrypoint to register all components
 * Uses explicit imports to avoid circular dependencies and ensure deterministic registration
 */
export function initializeArtifactComponents(): void {
  // Register scorecard component
  // Using explicit import to ensure deterministic registration order
  import('./components/scorecard').then(({ scorecardComponent }) => {
    registerArtifactComponent('scorecard', scorecardComponent)
  }).catch((error) => {
    console.error('[Artifacts] Failed to register scorecard component:', error)
  })
}

// Auto-initialize on module load
initializeArtifactComponents()
