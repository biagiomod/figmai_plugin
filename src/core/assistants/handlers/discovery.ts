/**
 * Discovery Copilot Assistant Handler
 * Handles Discovery Copilot assistant with incremental document updates
 */

import type { AssistantHandler, HandlerContext, HandlerResult } from './base'
import type { NormalizedMessage } from '../../provider/provider'
import type { DiscoverySpecV1, DocumentStatus } from '../../discovery/types'
import { deriveTitle } from '../../discovery/validate'
import { createDiscoveryDocument, updateDiscoveryDocument } from '../../discovery/renderer'
import { extractDiscoveryData, calculateDocumentStatus } from '../../discovery/extract'

export class DiscoveryCopilotHandler implements AssistantHandler {
  // Store document frame reference
  private documentFrame: FrameNode | null = null
  private documentTitle: string = 'Discovery Session'
  // Store message history for extraction
  private messageHistory: NormalizedMessage[] = []

  canHandle(assistantId: string, actionId: string | undefined): boolean {
    return assistantId === 'discovery_copilot' && (actionId === 'start-discovery' || actionId === undefined)
  }

  prepareMessages(messages: NormalizedMessage[]): NormalizedMessage[] {
    // Store message history for extraction
    this.messageHistory = messages

    // Extract the latest user message
    const userMessages = messages.filter(m => m.role === 'user')
    const latestUserRequest = userMessages.length > 0 
      ? userMessages[userMessages.length - 1].content 
      : 'Start discovery session'

    // Update document title from first user message
    if (userMessages.length > 0 && !this.documentFrame) {
      this.documentTitle = deriveTitle(userMessages[0].content, 48)
    }

    // Guide the user through structured discovery process
    return [
      {
        role: 'system',
        content: 'You are a Discovery Copilot assistant. Guide users through a structured 3-step discovery process:\n\n**Step 1: Problem Frame** - Ask about What, Who, Why, and Success\n**Step 2: Risks & Assumptions** - Ask about risks and assumptions\n**Step 3: Hypotheses & Experiments** - Ask about hypotheses and experiments\n\nAfter collecting all information, ask if they want to add Decision Log or Async Tasks.\n\nBe conversational and guide them step-by-step. Show progress indicators like "Step 1 of 3: Problem Frame".'
      },
      ...messages
    ]
  }

  async handleResponse(context: HandlerContext): Promise<HandlerResult> {
    const { response, sendAssistantMessage, replaceStatusMessage } = context
    const runId = `dc_${Date.now()}`
    console.log(`[DC ${runId}] START`, { assistantId: context.assistantId, actionId: context.actionId })
    
    try {
      // Add current response to message history for extraction
      // Include the latest assistant response in the history
      const allMessages: NormalizedMessage[] = [
        ...this.messageHistory,
        {
          role: 'assistant',
          content: response
        }
      ]

      // Find or create document frame
      // If handler instance was recreated, find existing frame by name pattern
      if (!this.documentFrame) {
        // Try to find existing document frame
        const existingFrame = figma.currentPage.children.find(
          child => child.type === 'FRAME' && child.name.startsWith('Discovery —')
        ) as FrameNode | undefined
        
        if (existingFrame) {
          console.log(`[DC ${runId}] Found existing document frame`)
          this.documentFrame = existingFrame
        } else {
          console.log(`[DC ${runId}] Creating initial document`)
          this.documentFrame = await createDiscoveryDocument(this.documentTitle, 'IN_PROGRESS')
        }
      }

      // Extract data from conversation
      console.log(`[DC ${runId}] Extracting data from conversation`)
      const extractedData = extractDiscoveryData(allMessages)
      
      // Add meta information
      if (!extractedData.meta) {
        extractedData.meta = { title: this.documentTitle }
      } else {
        extractedData.meta.title = this.documentTitle
      }
      
      // Calculate status
      const status = calculateDocumentStatus(extractedData)
      console.log(`[DC ${runId}] Status: ${status}`)

      // Update document with extracted data
      if (this.documentFrame) {
        console.log(`[DC ${runId}] Updating document`)
        await updateDiscoveryDocument(this.documentFrame, extractedData, status)
        
        // Update frame name if title changed
        if (extractedData.meta?.title) {
          this.documentFrame.name = `Discovery — ${extractedData.meta.title}`
        }
      }

      // Always return handled: false to let conversation continue
      // The document updates incrementally in the background
      console.log(`[DC ${runId}] Document updated, continuing conversation`)
      return { handled: false }
    } catch (error) {
      console.error(`[DC ${runId}] Error:`, error)
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Unknown error processing discovery document'
      
      replaceStatusMessage(`Error: ${errorMessage}`, true)
      figma.notify(`Error updating discovery document: ${errorMessage}`)
      
      return { handled: false } // Still let conversation continue
    }
  }
}
