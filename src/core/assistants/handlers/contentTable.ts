/**
 * Content Table Assistant Handler
 * Handles Content Table assistant quick actions
 */

import type { AssistantHandler, HandlerContext, HandlerResult } from './base'
import { scanContentTable } from '../../contentTable/scanner'
import { loadWorkAdapter } from '../../work/loadAdapter'
import { normalizeContentTableV1, validateContentTableV1 } from '../../contentTable/validate'

export class ContentTableHandler implements AssistantHandler {
  canHandle(assistantId: string, actionId: string | undefined): boolean {
    return assistantId === 'content_table' && actionId === 'generate-table'
  }

  async handleResponse(context: HandlerContext): Promise<HandlerResult> {
    const { selectionOrder, sendAssistantMessage } = context

    // Validate selection: must be exactly one container
    if (selectionOrder.length === 0) {
      const errorMsg = 'Select a single container to scan.'
      sendAssistantMessage(errorMsg)
      figma.notify(errorMsg)
      return { handled: true }
    }

    if (selectionOrder.length > 1) {
      const errorMsg = 'Only one selection allowed. Select a single container.'
      sendAssistantMessage(errorMsg)
      figma.notify(errorMsg)
      return { handled: true }
    }

    // Get the selected node
    const selectedNode = await figma.getNodeByIdAsync(selectionOrder[0])
    if (!selectedNode) {
      const errorMsg = 'Selected node not found.'
      sendAssistantMessage(errorMsg)
      figma.notify(errorMsg)
      return { handled: true }
    }

    // Validate it's a valid container (not DOCUMENT or PAGE)
    if (selectedNode.type === 'DOCUMENT' || selectedNode.type === 'PAGE') {
      const errorMsg = 'Please select a container (frame, component, etc.), not a page or document.'
      sendAssistantMessage(errorMsg)
      figma.notify(errorMsg)
      return { handled: true }
    }

    try {
      // Send "Scanning..." message
      sendAssistantMessage('Scanning...')

      // Load Work adapter and get ignore rules and design system detector (Work-only features)
      // If no override file exists, adapter will be no-op and rules/detector will be null/undefined
      const workAdapter = await loadWorkAdapter()
      const ignoreRules = workAdapter.getContentTableIgnoreRules?.() || null
      const detectDesignSystemComponent = workAdapter.detectDesignSystemComponent

      // Scan the container (now async for thumbnail export)
      // Pass ignore rules and design system detector to scanner (will be null/undefined in Public Plugin, applied in Work Plugin)
      let contentTable = await scanContentTable(selectedNode as SceneNode, ignoreRules, detectDesignSystemComponent)

      // Post-process Content Table (Work-only hook)
      // Called AFTER scanning but BEFORE sending to UI/export
      // If hook throws, catch and log but continue with original table (never break the flow)
      if (workAdapter.postProcessContentTable) {
        try {
          // Extract selection context from table
          const selectionContext = {
            pageId: contentTable.source.pageId,
            pageName: contentTable.source.pageName,
            rootNodeId: contentTable.meta.rootNodeId
          }

          // Call post-process hook (may be async)
          const processedTable = await workAdapter.postProcessContentTable({
            table: contentTable,
            selectionContext
          })

          // Use processed table if hook returned a modified version
          contentTable = processedTable

          console.log('[ContentTableHandler] Content table post-processed by Work adapter')
        } catch (error) {
          // Log error but continue with original table (never break the flow)
          console.error('[ContentTableHandler] Error in postProcessContentTable hook:', error)
          // Continue with original contentTable
        }
      }

      // Normalize and validate Content Table (schema hardening)
      // Normalize ensures required fields exist with safe defaults
      contentTable = normalizeContentTableV1(contentTable)

      // Validate schema invariants (dev-only warnings/errors, never breaks flow)
      const validation = validateContentTableV1(contentTable)
      if (!validation.ok && validation.errors.length > 0) {
        // Log validation errors (dev-only, controlled by CONFIG.dev.enableContentTableValidationLogging)
        console.error('[ContentTableHandler] Content table validation errors:', validation.errors)
      }
      if (validation.warnings.length > 0) {
        console.warn('[ContentTableHandler] Content table validation warnings:', validation.warnings)
      }

      // Send success message
      const itemCount = contentTable.items.length
      if (itemCount === 0) {
        sendAssistantMessage('No text items found in the selected container.')
      } else {
        sendAssistantMessage(`Found ${itemCount} text item${itemCount === 1 ? '' : 's'}`)
        sendAssistantMessage('Table generated')
      }

      // Send table to UI (normalized and validated)
      figma.ui.postMessage({
        pluginMessage: {
          type: 'CONTENT_TABLE_GENERATED',
          table: contentTable
        }
      })

      console.log('[ContentTableHandler] Content table generated:', itemCount, 'items')
      return { handled: true }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      sendAssistantMessage(`Error: ${errorMessage}`)
      figma.notify(`Error generating table: ${errorMessage}`)

      figma.ui.postMessage({
        pluginMessage: {
          type: 'CONTENT_TABLE_ERROR',
          error: errorMessage
        }
      })
      return { handled: true }
    }
  }
}
