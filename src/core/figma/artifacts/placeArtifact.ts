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
 * Get topmost container node (re-export from anchor.ts for convenience)
 */
export const getTopLevelContainerNodeForArtifact = getTopLevelContainerNode

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
  
  // Determine anchor and compute placement
  let anchor: SceneNode | undefined
  let anchorBounds: Rect | null = null
  let boundsUsedMethod: 'bbox' | 'renderBounds' | 'transform' | 'relative' | 'none' = 'none'
  
  if (selectedNode) {
    // Get topmost page-level container (direct child of PAGE)
    anchor = getTopLevelContainerNodeForArtifact(selectedNode)
    
    // Compute bounds using robust helper
    anchorBounds = computeAnchorBoundsForArtifact(anchor)
    
    // Determine which method was used (for debugging) - check in same priority order as getAbsoluteBounds
    if (anchorBounds) {
      if ('absoluteBoundingBox' in anchor && anchor.absoluteBoundingBox) {
        boundsUsedMethod = 'bbox'
      } else if ('absoluteRenderBounds' in anchor && anchor.absoluteRenderBounds) {
        boundsUsedMethod = 'renderBounds'
      } else if ('absoluteTransform' in anchor && 'width' in anchor && 'height' in anchor) {
        boundsUsedMethod = 'transform'
      } else if ('x' in anchor && 'y' in anchor && 'width' in anchor && 'height' in anchor) {
        boundsUsedMethod = 'relative'
      } else {
        boundsUsedMethod = 'none' // Shouldn't happen if getAbsoluteBounds worked
      }
    }
    
    // Enhanced DEBUG: Log raw bounds values and method details
    if (anchorBounds) {
      console.log(`[ArtifactPlacement] raw bounds values`, {
        x: anchorBounds.x,
        y: anchorBounds.y,
        width: anchorBounds.width,
        height: anchorBounds.height,
        method: boundsUsedMethod,
        anchorHasTransform: 'absoluteTransform' in anchor,
        anchorTransform: 'absoluteTransform' in anchor ? anchor.absoluteTransform : null,
        anchorHasBbox: 'absoluteBoundingBox' in anchor,
        anchorBbox: 'absoluteBoundingBox' in anchor ? anchor.absoluteBoundingBox : null,
        anchorHasRenderBounds: 'absoluteRenderBounds' in anchor,
        anchorRenderBounds: 'absoluteRenderBounds' in anchor ? anchor.absoluteRenderBounds : null,
        anchorRelativePos: ('x' in anchor && 'y' in anchor) ? { x: anchor.x, y: anchor.y } : null
      })
    }
    
    // Validate bounds before using: reject (0,0) or bounds too close to left edge
    // For left placement, we need: anchorBounds.x >= (outputWidth + offset)
    // Since we don't know outputWidth yet, reject if x < 600 (reasonable threshold)
    const MIN_X_FOR_LEFT_PLACEMENT = 600
    if (anchorBounds && (anchorBounds.x === 0 || anchorBounds.x < MIN_X_FOR_LEFT_PLACEMENT)) {
      console.warn(`[ArtifactPlacement] Invalid bounds: x=${anchorBounds.x} too small for left placement, using viewport center`)
      anchorBounds = null // Will trigger viewport center placement
    }
    
    // DEBUG: Log anchor calculation details
    const isDirectChild = selectedNode.parent?.type === 'PAGE'
    console.log(`[ArtifactPlacement] selectedNode -> anchor -> bounds`, {
      selectedNode: {
        name: selectedNode.name,
        id: selectedNode.id,
        type: selectedNode.type,
        parentType: selectedNode.parent?.type
      },
      isDirectChild,
      anchor: {
        name: anchor.name,
        id: anchor.id,
        type: anchor.type,
        parentType: anchor.parent?.type
      },
      boundsUsedMethod,
      bounds: anchorBounds ? {
        x: anchorBounds.x,
        y: anchorBounds.y,
        width: anchorBounds.width,
        height: anchorBounds.height
      } : null
    })
  } else {
    console.log(`[ArtifactPlacement] selectedNode -> anchor -> bounds`, {
      selectedNode: null,
      anchor: null,
      boundsUsedMethod: 'none',
      bounds: null,
      reason: 'no_selection'
    })
  }
  
  // Append to page first (required for auto-layout to calculate size)
  figma.currentPage.appendChild(root)
  
  // Check if bounds are valid for left placement (Better approach: check before computing)
  const canPlaceLeft = anchorBounds && anchorBounds.x >= (root.width + spacing)
  let placementMethod: 'anchor' | 'viewport' = 'anchor'
  let placementBeforeClamp: { x: number; y: number } | null = null
  
  if (!canPlaceLeft) {
    placementMethod = 'viewport'
    console.warn(`[ArtifactPlacement] Anchor at x=${anchorBounds?.x} too close to left edge (need ${root.width + spacing}), using viewport center`)
    const viewport = figma.viewport.center
    const centeredX = Math.max(viewport.x - root.width / 2, 0)
    const centeredY = Math.max(viewport.y - root.height / 2, 40)
    root.x = centeredX
    root.y = centeredY
  } else {
    // Normal placement: compute coordinates relative to anchor
    placementBeforeClamp = computePlacement(anchorBounds, root.width, root.height, {
      mode: 'left',
      offset: spacing,
      minX: 0
    })
    
    // Apply clamps
    const minX = 0
    const minY = 40
    const computedX = Math.max(placementBeforeClamp.x, minX)
    const computedY = Math.max(placementBeforeClamp.y, minY)
    
    root.x = computedX
    root.y = computedY
  }
  
  // DEBUG: Log final placement coordinates
  console.log(`[ArtifactPlacement] placement`, {
    method: placementMethod,
    computedXBeforeClamp: placementBeforeClamp?.x ?? null,
    computedYBeforeClamp: placementBeforeClamp?.y ?? null,
    computedXAfterClamp: root.x,
    computedYAfterClamp: root.y,
    rootWidth: root.width,
    rootHeight: root.height,
    anchorBounds: anchorBounds ? {
      x: anchorBounds.x,
      y: anchorBounds.y,
      width: anchorBounds.width,
      height: anchorBounds.height
    } : null,
    offset: spacing,
    mode: 'left',
    clampedX: placementBeforeClamp ? root.x !== placementBeforeClamp.x : false,
    clampedY: placementBeforeClamp ? root.y !== placementBeforeClamp.y : false,
    reason: !canPlaceLeft ? `Anchor x=${anchorBounds?.x} < required ${root.width + spacing}` : null
  })
  
  // Select and scroll into view
  figma.currentPage.selection = [root]
  figma.viewport.scrollAndZoomIntoView([root])
  
  return root
}
