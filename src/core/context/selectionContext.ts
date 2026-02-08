/**
 * Selection Context Builder
 * Consolidates selection state, summary, and image export logic
 * Ensures consistent selection context across all assistant interactions
 */

import type { SelectionState } from '../types'
import type { QuickAction } from '../types'
import type { Provider, ImageData } from '../provider/provider'
import { summarizeSelection } from './selection'
import { extractSelectionSummary, formatSelectionSummary } from './selectionSummary'
import { exportSelectionAsImages } from '../figma/exportSelectionAsImages'
import { debug } from '../debug/logger'

/**
 * Selection Context
 * Complete selection context for assistant requests
 */
export interface SelectionContext {
  selection: SelectionState
  selectionSummary?: string
  images?: ImageData[]
}

/**
 * Options for building selection context
 */
export interface BuildSelectionContextOptions {
  selectionOrder: string[]
  quickAction?: QuickAction
  provider: Provider
}

/**
 * Build selection context according to contract:
 * - Always include selection state
 * - Include summary when selection exists
 * - Include images only when:
 *   1. QuickAction.requiresVision === true
 *   2. Provider.capabilities.supportsImages === true
 *   3. Selection exists
 * - Enforce quickAction.maxImages and provider.capabilities.maxImages
 * - Image export failures must NOT block request (fallback to summary only)
 */
export async function buildSelectionContext(
  options: BuildSelectionContextOptions
): Promise<SelectionContext> {
  const { selectionOrder, quickAction, provider } = options
  
  // Always compute selection state
  const selection = summarizeSelection(selectionOrder)
  
  const context: SelectionContext = { selection }
  
  // Always include summary when selection exists
  if (selection.hasSelection) {
    context.selectionSummary = formatSelectionSummary(await extractSelectionSummary(selectionOrder))
  }
  
  // Include images only when vision is required AND provider supports it
  const needsVision = quickAction?.requiresVision === true
  const providerSupportsImages = provider.capabilities.supportsImages
  
  if (needsVision && providerSupportsImages && selection.hasSelection) {
    try {
      const maxImages = quickAction.maxImages ?? 1
      const imageScale = quickAction.imageScale ?? 2
      
      const exportedImages = await exportSelectionAsImages({
        maxImages,
        imageScale,
        preferFrames: true
      })
      
      if (exportedImages.length > 0) {
        // Enforce provider limits
        const providerMaxImages = provider.capabilities.maxImages
        if (providerMaxImages !== undefined) {
          context.images = exportedImages.slice(0, providerMaxImages)
        } else {
          context.images = exportedImages
        }
        
        // Diagnostics-only: log image count and per-image metadata (no dataUrl/base64)
        if (debug.isEnabled('subsystem:provider')) {
          const selectionDebug = debug.scope('subsystem:provider')
          selectionDebug.log('SelectionContext image export', {
            imageCount: context.images.length,
            images: context.images.map((img, i) => ({
              index: i + 1,
              name: img.name ?? 'Unnamed',
              width: img.width,
              height: img.height,
              approxSizeKB: Math.round((img.dataUrl.length * 0.75) / 1024)
            }))
          })
        }
      } else {
        console.warn('[SelectionContext] Vision required but no images exported - continuing with summary only')
      }
    } catch (error) {
      // Graceful fallback: log error but continue with summary only
      // This ensures assistants still receive meaningful context even without images
      console.error('[SelectionContext] Failed to export images (continuing with summary only):', error)
      // Don't set images - context will have summary only
    }
  }
  
  return context
}

