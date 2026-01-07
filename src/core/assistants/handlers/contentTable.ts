/**
 * Content Table Assistant Handler
 * Handles Content Table assistant quick actions
 */

import type { AssistantHandler, HandlerContext, HandlerResult } from './base'
import { scanContentTable } from '../../contentTable/scanner'

export class ContentTableHandler implements AssistantHandler {
  canHandle(assistantId: string, actionId: string): boolean {
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
    const selectedNode = figma.getNodeById(selectionOrder[0])
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

      // Scan the container (now async for thumbnail export)
      const contentTable = await scanContentTable(selectedNode as SceneNode)

      // Send success message
      const itemCount = contentTable.items.length
      if (itemCount === 0) {
        sendAssistantMessage('No text items found in the selected container.')
      } else {
        sendAssistantMessage(`Found ${itemCount} text item${itemCount === 1 ? '' : 's'}`)
        sendAssistantMessage('Table generated')
      }

      // Send table to UI
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

