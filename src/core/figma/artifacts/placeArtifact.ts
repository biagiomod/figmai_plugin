/**
 * Artifact Placement System
 * Shared utilities for placing and managing FigmAI artifacts on the Figma stage
 */

import { getTopLevelContainerNode, getAnchorBounds, computePlacement, type Rect } from '../../stage/anchor'

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
 * Get topmost container node (reuse from anchor.ts)
 */
export function getTopLevelContainerNodeForArtifact(node: SceneNode): SceneNode {
  return getTopLevelContainerNode(node)
}

/**
 * Compute anchor bounds (reuse from anchor.ts)
 */
export function computeAnchorBoundsForArtifact(anchor: SceneNode): Rect | null {
  return getAnchorBounds(anchor)
}

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
 */
export function removeExistingArtifacts(type: string, version?: string): void {
  const page = figma.currentPage
  const artifacts = findExistingArtifactsByType(page, type, version)
  
  for (const artifact of artifacts) {
    artifact.remove()
  }
  
  if (artifacts.length > 0) {
    const versionLabel = version ? ` (${version})` : ''
    console.log(`[Artifacts] Removed ${artifacts.length} existing artifact(s) of type: ${type}${versionLabel}`)
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
  
  // Determine anchor and compute placement
  let anchor: SceneNode | undefined
  let anchorBounds: Rect | null = null
  
  if (selectedNode) {
    anchor = getTopLevelContainerNodeForArtifact(selectedNode)
    anchorBounds = computeAnchorBoundsForArtifact(anchor)
  }
  
  // Append to page first (required for auto-layout to calculate size)
  figma.currentPage.appendChild(root)
  
  // Compute placement coordinates
  const placement = computePlacement(anchorBounds, root.width, root.height, {
    mode: 'left',
    offset: spacing,
    minX: 0
  })
  
  root.x = placement.x
  root.y = placement.y
  
  // Select and scroll into view
  figma.currentPage.selection = [root]
  figma.viewport.scrollAndZoomIntoView([root])
  
  return root
}
