/**
 * Artifact Placement System
 * Shared utilities for placing and managing FigmAI artifacts on the Figma stage
 */

import { getPlacementTarget, computeRootPlacement, placeNodeOnPage } from '../placement'
import { getTopLevelContainerNode, getAnchorBounds } from '../../stage/anchor'
import { debug } from '../../debug/logger'

export interface PlaceArtifactOptions {
  type: string
  assistant: string
  selectedNode?: SceneNode
  width?: number
  spacing?: number
  version?: string
  replace?: boolean
}

/**
 * Get topmost container node (re-export from anchor.ts for backward compatibility)
 * @deprecated Use getPlacementTarget() from placement.ts directly for new code
 */
export function getTopLevelContainerNodeForArtifact(selectedNode: SceneNode): SceneNode {
  return getTopLevelContainerNode(selectedNode)
}

/**
 * Compute anchor bounds (re-export from anchor.ts for convenience)
 */
export const computeAnchorBoundsForArtifact = getAnchorBounds

/**
 * Find existing artifacts by type and optionally by version
 * If version is provided, matches both artifactType and artifactVersion
 * If version is not provided, matches only artifactType (legacy behavior)
 */
export function findExistingArtifactsByType(page: PageNode, type: string, version?: string): SceneNode[] {
  const artifacts: SceneNode[] = []
  
  function traverse(node: BaseNode) {
    if (node.type === 'FRAME') {
      const frame = node as FrameNode
      // Check naming convention: "FigmAI Artifact — <Type>" or "FigmAI Artifact — <Type> (v2)"
      if (frame.name.startsWith('FigmAI Artifact — ')) {
        // Check pluginData for type
        const artifactType = frame.getPluginData('figmai.artifactType')
        if (artifactType === type) {
          // If version is specified, also check version
          if (version !== undefined) {
            const artifactVersion = frame.getPluginData('figmai.artifactVersion')
            if (artifactVersion === version) {
              artifacts.push(frame)
            }
          } else {
            // No version specified - match any version (or no version)
            artifacts.push(frame)
          }
        }
      }
    }
    
    // Traverse children
    if ('children' in node) {
      for (const child of node.children) {
        traverse(child)
      }
    }
  }
  
  traverse(page)
  return artifacts
}

/**
 * Remove existing artifacts by type and optionally by version
 * If version is provided, removes only artifacts matching both type and version
 * If version is not provided, removes all artifacts matching type (legacy behavior)
 * Also removes frames by name convention if they match the type pattern
 */
export function removeExistingArtifacts(type: string, version?: string): void {
  const page = figma.currentPage
  const artifacts = findExistingArtifactsByType(page, type, version)
  
  // Also check for frames by name (for critique fallback frames)
  if (type === 'critique') {
    const traverse = (node: BaseNode): void => {
      if (node.type === 'FRAME') {
        const frame = node as FrameNode
        // Check for critique fallback frames
        if (frame.name === 'FigmAI — Critique' || frame.name === 'FigmAI — Critique (fallback)') {
          const artifactType = frame.getPluginData('figmai.artifactType')
          if (artifactType === 'critique' || !artifactType) {
            artifacts.push(frame)
          }
        }
      }
      
      // Traverse children
      if ('children' in node) {
        for (const child of node.children) {
          traverse(child)
        }
      }
    }
    traverse(page)
  }
  
  // Remove duplicates
  const uniqueArtifacts = Array.from(new Set(artifacts))
  
  for (const artifact of uniqueArtifacts) {
    artifact.remove()
  }
  
  if (uniqueArtifacts.length > 0) {
    const versionLabel = version ? ` (${version})` : ''
    console.log(`[Artifacts] Removed ${uniqueArtifacts.length} existing artifact(s) of type: ${type}${versionLabel}`)
  }
}

/**
 * Place artifact frame on the stage
 * Creates a top-level Auto-Layout frame container with proper naming and pluginData
 */
export async function placeArtifactFrame(options: PlaceArtifactOptions): Promise<FrameNode> {
  const { type, assistant, selectedNode, width = 640, spacing = 40, version, replace = true } = options
  
  // Remove existing artifacts if replace is true
  if (replace) {
    removeExistingArtifacts(type, version)
  }
  
  // Create root frame with Auto-Layout
  const root = figma.createFrame()
  
  // Build frame name with version if provided
  const typeCapitalized = type.charAt(0).toUpperCase() + type.slice(1)
  if (version) {
    root.name = `FigmAI Artifact — ${typeCapitalized} (${version})`
  } else {
    root.name = `FigmAI Artifact — ${typeCapitalized}`
  }
  
  root.layoutMode = 'VERTICAL'
  root.primaryAxisSizingMode = 'AUTO'
  root.counterAxisSizingMode = 'FIXED'
  root.resize(width, 100) // Initial size, will auto-resize
  root.paddingTop = 0
  root.paddingRight = 0
  root.paddingBottom = 0
  root.paddingLeft = 0
  root.itemSpacing = 0
  
  // Set pluginData for artifact identification
  root.setPluginData('figmai.artifactType', type)
  root.setPluginData('figmai.assistant', assistant)
  if (version) {
    root.setPluginData('figmai.artifactVersion', version)
  }
  
  // Append to page first (required for auto-layout to calculate size)
  figma.currentPage.appendChild(root)
  
  // Get placement target and bounds using new utility
  const placementTarget = getPlacementTarget(selectedNode)
  const targetBounds = placementTarget ? getAnchorBounds(placementTarget) : null
  
  // Compute placement using new utility with fallback logic
  const placement = computeRootPlacement(
    targetBounds,
    { width: root.width, height: root.height },
    {
      spacing,
      side: 'left',
      minX: 0,
      minY: 40
    }
  )
  
  // Log placement method if fallback was used (using debug scope)
  const artifactDebug = debug.scope('subsystem:placement')
  if (placement.method !== 'anchor-left') {
    artifactDebug.log('Placement fallback used', {
      method: placement.method,
      reason: placement.reason,
      position: { x: placement.x, y: placement.y },
      targetBounds: targetBounds ? {
        x: targetBounds.x,
        y: targetBounds.y,
        width: targetBounds.width,
        height: targetBounds.height
      } : null
    })
  }
  
  // Apply placement using new utility
  placeNodeOnPage(root, { x: placement.x, y: placement.y })
  
  return root
}
