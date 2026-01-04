/**
 * Export Selection as Images
 * Exports selected Figma nodes as PNG images (base64 data URLs)
 * Optimized for signal quality: prefers meaningful frames, respects size limits
 */

export interface ImageExport {
  dataUrl: string
  name?: string
  width?: number
  height?: number
}

export interface ExportOptions {
  maxImages?: number
  imageScale?: number
  preferFrames?: boolean
  maxWidth?: number
  maxHeight?: number
  maxSizeBytes?: number
}

/**
 * Check if a node is a meaningful frame (has reasonable size and content)
 */
function isMeaningfulFrame(node: SceneNode): boolean {
  if (node.type !== 'FRAME' && node.type !== 'COMPONENT' && node.type !== 'INSTANCE') {
    return false
  }
  
  const frameNode = node as FrameNode | ComponentNode | InstanceNode
  
  // Check dimensions (avoid tiny or empty frames)
  if ('width' in frameNode && 'height' in frameNode) {
    const width = frameNode.width
    const height = frameNode.height
    
    // Reject frames that are too small (likely not meaningful)
    if (width < 10 || height < 10) {
      return false
    }
    
    // Reject frames that are too large (likely entire pages)
    if (width > 10000 || height > 10000) {
      return false
    }
  }
  
  // Prefer frames with children (more likely to be meaningful containers)
  if ('children' in frameNode) {
    return frameNode.children.length > 0
  }
  
  return true
}

/**
 * Calculate approximate image size in bytes
 */
function estimateImageSize(width: number, height: number, scale: number): number {
  // Rough estimate: PNG with compression, ~4 bytes per pixel at scale 1
  const pixels = width * height * scale * scale
  return Math.ceil(pixels * 4)
}

/**
 * Find the best frame to export from selection
 * Prefers: frames > components > instances > other nodes
 * Within frames: prefers larger, more meaningful frames
 */
function selectBestFrame(selection: readonly SceneNode[]): SceneNode | null {
  if (selection.length === 0) {
    return null
  }
  
  // Separate by type
  const frames: SceneNode[] = []
  const components: SceneNode[] = []
  const instances: SceneNode[] = []
  const others: SceneNode[] = []
  
  for (const node of selection) {
    if (node.type === 'FRAME') {
      frames.push(node)
    } else if (node.type === 'COMPONENT') {
      components.push(node)
    } else if (node.type === 'INSTANCE') {
      instances.push(node)
    } else {
      others.push(node)
    }
  }
  
  // Prioritize meaningful frames
  const meaningfulFrames = frames.filter(isMeaningfulFrame)
  if (meaningfulFrames.length > 0) {
    // Sort by area (larger = better, but not too large)
    meaningfulFrames.sort((a, b) => {
      const aArea = ('width' in a && 'height' in a) ? a.width * a.height : 0
      const bArea = ('width' in b && 'height' in b) ? b.width * b.height : 0
      return bArea - aArea
    })
    return meaningfulFrames[0]
  }
  
  // Fallback to any frame
  if (frames.length > 0) {
    return frames[0]
  }
  
  // Then components
  if (components.length > 0) {
    return components[0]
  }
  
  // Then instances
  if (instances.length > 0) {
    return instances[0]
  }
  
  // Finally, any other node
  if (others.length > 0) {
    return others[0]
  }
  
  return selection[0]
}

/**
 * Export selected nodes as PNG images
 * Returns base64 data URLs ready for LLM vision APIs
 * Provides graceful fallbacks when export fails or selection is weak
 */
export async function exportSelectionAsImages(
  options: ExportOptions = {}
): Promise<ImageExport[]> {
  const {
    maxImages = 1,
    imageScale = 2,
    preferFrames = true,
    maxWidth = 4096,
    maxHeight = 4096,
    maxSizeBytes = 20 * 1024 * 1024 // 20MB default limit
  } = options

  const selection = figma.currentPage.selection

  if (selection.length === 0) {
    return []
  }

  // Filter and sort: prefer meaningful frames if preferFrames is true
  let nodesToExport: SceneNode[] = []
  
  if (preferFrames) {
    // Use smart frame selection
    const bestFrame = selectBestFrame(selection)
    if (bestFrame) {
      nodesToExport = [bestFrame]
    } else {
      // Fallback: use all selection
      nodesToExport = [...selection]
    }
  } else {
    nodesToExport = [...selection]
  }

  // Limit to maxImages
  nodesToExport = nodesToExport.slice(0, maxImages)

  const exports: ImageExport[] = []

  for (const node of nodesToExport) {
    try {
      // Check dimensions before export
      let exportWidth: number | undefined
      let exportHeight: number | undefined
      let actualScale = imageScale
      
      if ('width' in node && 'height' in node) {
        exportWidth = node.width
        exportHeight = node.height
        
        // Calculate scaled dimensions
        const scaledWidth = exportWidth * actualScale
        const scaledHeight = exportHeight * actualScale
        
        // Adjust scale if dimensions exceed limits
        if (scaledWidth > maxWidth || scaledHeight > maxHeight) {
          const widthScale = maxWidth / exportWidth
          const heightScale = maxHeight / exportHeight
          actualScale = Math.min(widthScale, heightScale, imageScale)
          
          // Don't export if still too large even at minimum scale
          if (actualScale < 0.5) {
            console.warn(`[Export] Node ${node.id} too large, skipping export`)
            continue
          }
        }
        
        // Estimate size and adjust if needed
        const estimatedSize = estimateImageSize(exportWidth, exportHeight, actualScale)
        if (estimatedSize > maxSizeBytes) {
          // Reduce scale to fit within size limit
          const targetPixels = maxSizeBytes / 4
          const maxScaleFromSize = Math.sqrt(targetPixels / (exportWidth * exportHeight))
          actualScale = Math.min(actualScale, maxScaleFromSize)
          
          if (actualScale < 0.5) {
            console.warn(`[Export] Node ${node.id} would exceed size limit, skipping export`)
            continue
          }
        }
      }
      
      // Export as PNG
      const bytes = await node.exportAsync({
        format: 'PNG',
        constraint: {
          type: 'SCALE',
          value: actualScale
        }
      })
      
      // Check actual size
      if (bytes.length > maxSizeBytes) {
        console.warn(`[Export] Exported image for node ${node.id} exceeds size limit (${bytes.length} bytes), skipping`)
        continue
      }

      // Convert to base64
      const base64 = figma.base64Encode(bytes)
      const dataUrl = `data:image/png;base64,${base64}`

      // Get final dimensions
      let width: number | undefined
      let height: number | undefined
      if (exportWidth && exportHeight) {
        width = Math.round(exportWidth * actualScale)
        height = Math.round(exportHeight * actualScale)
      }

      exports.push({
        dataUrl,
        name: node.name || 'Unnamed',
        width,
        height
      })
      
      console.log(`[Export] Successfully exported ${node.name || 'Unnamed'}: ${width}x${height}px at ${actualScale}x scale, ${Math.round(bytes.length / 1024)}KB`)
    } catch (error) {
      console.error(`[Export] Failed to export node ${node.id} (${node.name || 'Unnamed'}):`, error)
      // Continue with other nodes even if one fails
      // This provides graceful fallback: if image export fails, structured summary is still available
    }
  }

  return exports
}

