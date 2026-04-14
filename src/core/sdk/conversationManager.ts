// src/core/sdk/conversationManager.ts
/**
 * ConversationManager — owns the message history for the current plugin session.
 * Main thread creates one instance at startup and passes it to handlers/executor.
 * figma.ui.postMessage calls for UI updates remain in main.ts (not here).
 */

import type { Message } from '../types'

export type { Message }

export interface ConversationManager {
  getHistory(): Message[]
  getCurrentAssistantSegment(assistantId: string): Message[]
  pushUserMessage(requestId: string, assistantId: string, content: string): Message
  pushAssistantMessage(requestId: string, assistantId: string, content: string, isStatus?: boolean): Message
  pushBoundary(nextAssistantId: string): void
  replaceStatusForRequest(requestId: string, content: string, isError?: boolean): Message | null
  clearHistory(): void
  generateRequestId(): string
  push(message: Message): void
}

function generateId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

export function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

export function createConversationManager(): ConversationManager {
  let history: Message[] = []

  return {
    getHistory: () => [...history],

    getCurrentAssistantSegment(assistantId: string): Message[] {
      // Find last boundary for this assistant, return messages after it
      let segmentStart = 0
      for (let i = history.length - 1; i >= 0; i--) {
        if (history[i].isBoundary && history[i].assistantId === assistantId) {
          segmentStart = i + 1
          break
        }
      }
      return history.slice(segmentStart).filter(
        m => !m.isBoundary && (m.assistantId === assistantId || m.assistantId == null)
      )
    },

    pushUserMessage(requestId: string, assistantId: string, content: string): Message {
      const msg: Message = {
        id: generateId(),
        role: 'user',
        content,
        timestamp: Date.now(),
        assistantId,
        requestId
      }
      history.push(msg)
      return msg
    },

    pushAssistantMessage(requestId: string, assistantId: string, content: string, isStatus = false): Message {
      const msg: Message = {
        id: generateId(),
        role: 'assistant',
        content,
        timestamp: Date.now(),
        assistantId,
        requestId,
        isStatus
      }
      history.push(msg)
      return msg
    },

    pushBoundary(nextAssistantId: string): void {
      history.push({
        id: generateId(),
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
        assistantId: nextAssistantId,
        isBoundary: true
      })
    },

    replaceStatusForRequest(requestId: string, content: string, isError = false): Message | null {
      // Find all status messages for this requestId
      const statusIndices = history
        .map((m, i) => (m.requestId === requestId && m.isStatus === true ? i : -1))
        .filter(i => i >= 0)

      if (statusIndices.length > 0) {
        // Replace first status message, remove any extras (in reverse order to preserve indices)
        const updated: Message = {
          ...history[statusIndices[0]],
          content,
          timestamp: Date.now(),
          isStatus: false,
          statusStyle: isError ? 'error' : undefined,
          contentNormalized: true
        }
        history[statusIndices[0]] = updated
        const toRemove = statusIndices.slice(1).sort((a, b) => b - a)
        for (const idx of toRemove) {
          history.splice(idx, 1)
        }
        return updated
      }

      // Fallback: no status found — replace any message with this requestId
      const fallbackIdx = history.findIndex(m => m.requestId === requestId)
      if (fallbackIdx === -1) return null
      const updated: Message = {
        ...history[fallbackIdx],
        content,
        timestamp: Date.now(),
        isStatus: false,
        statusStyle: isError ? 'error' : undefined,
        contentNormalized: true
      }
      history[fallbackIdx] = updated
      return updated
    },

    clearHistory(): void { history = [] },

    generateRequestId,

    /** Push an arbitrary pre-constructed message (internal use by main.ts only; not part of ConversationManager interface) */
    push(message: Message): void {
      history.push(message)
    },
  }
}
