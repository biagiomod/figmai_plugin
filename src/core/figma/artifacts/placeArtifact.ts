/**
 * Artifact Placement System
 * Shared utilities for placing and managing FigmAI artifacts on the Figma stage
 */

import { placeSingleArtifactNearSelection } from '../placement'
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
 * 
 * @deprecated Use getPlacementTarget() from placement.ts directly for new code.
 * This re-export is kept for backward compatibility but should not be used in new code.
 * 
 * Migration: Replace `getTopLevelContainerNodeForArtifact(node)` with `getPlacementTarget(node)`
 */
export function getTopLevelContainerNodeForArtifact(selectedNode: SceneNode): SceneNode {
  return getTopLevelContainerNode(selectedNode)
}

/**
 * Compute anchor bounds (re-export from anchor.ts for convenience)
 * 
 * @deprecated Use getAnchorBounds() from stage/anchor.ts directly for new code.
 * This re-export is kept for backward compatibility but should not be used in new code.
 * 
 * Migration: Replace `computeAnchorBoundsForArtifact(node)` with `getAnchorBounds(node)`
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
/**
 * Pick a unique name for the artifact: if base name already exists on page, append (2), (3), etc.
 */
function uniqueArtifactNameOnPage(baseName: string): string {
  const page = figma.currentPage
  const existing = new Set<number>()
  for (const child of page.children) {
    if (child.name === baseName) {
      existing.add(1)
    } else if (child.name.startsWith(baseName + ' (')) {
      const suffix = child.name.slice(baseName.length)
      const m = /^\s*\((\d+)\)\s*$/.exec(suffix)
      if (m) existing.add(parseInt(m[1], 10))
    }
  }
  if (existing.size === 0) return baseName
  let n = 2
  while (existing.has(n)) n++
  return `${baseName} (${n})`
}

export async function placeArtifactFrame(options: PlaceArtifactOptions): Promise<FrameNode> {
  const { type, assistant, selectedNode, width = 640, version, replace = false } = options

  // When replace is false (default), do not remove existing artifacts; re-run creates a new artifact.
  if (replace) {
    removeExistingArtifacts(type, version)
  }

  // Create root frame with Auto-Layout
  const root = figma.createFrame()

  const typeCapitalized = type.charAt(0).toUpperCase() + type.slice(1)
  const baseName = version
    ? `FigmAI Artifact — ${typeCapitalized} (${version})`
    : `FigmAI Artifact — ${typeCapitalized}`
  root.name = replace ? baseName : uniqueArtifactNameOnPage(baseName)

  root.layoutMode = 'VERTICAL'
  root.primaryAxisSizingMode = 'AUTO'
  root.counterAxisSizingMode = 'FIXED'
  root.resize(width, 1)
  root.clipsContent = false
  root.paddingTop = 0
  root.paddingRight = 0
  root.paddingBottom = 0
  root.paddingLeft = 0
  root.itemSpacing = 0

  root.setPluginData('figmai.artifactType', type)
  root.setPluginData('figmai.assistant', assistant)
  if (version) {
    root.setPluginData('figmai.artifactVersion', version)
  }

  figma.currentPage.appendChild(root)

  const placement = placeSingleArtifactNearSelection(root, {
    selectedNode,
    preferSide: 'right',
    margin: 24,
    step: 24
  })

  const artifactDebug = debug.scope('subsystem:placement')
  if (placement.method !== 'right' && placement.method !== 'anchor-right') {
    artifactDebug.log('Placement fallback used', {
      method: placement.method,
      reason: placement.reason,
      position: { x: placement.x, y: placement.y }
    })
  }

  return root
}
