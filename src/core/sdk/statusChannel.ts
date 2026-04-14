// src/core/sdk/statusChannel.ts
/**
 * StatusChannel — typed wrapper for all UI status/message posting.
 * Receives a post function (wrapping figma.ui.postMessage) injected by main.ts.
 * Keeps all message type strings in one place and out of main.ts.
 *
 * NOTE: HandlerContext.sendAssistantMessage and HandlerContext.replaceStatusMessage
 * are wired to module-level helpers in main.ts / quickActionExecutor.ts (not to
 * StatusChannel) so that proper Message objects with history push are used.
 * StatusChannel methods remain available for direct callers; sendAssistantMessage
 * posts a minimal anonymous Message (no history push), and replaceStatusMessage
 * posts REPLACE_STATUS which ui.tsx handles via a dedicated case.
 */

export type PostFn = (type: string, payload: unknown) => void

export interface StatusChannel {
  replaceStatusMessage(requestId: string, content: string, isError?: boolean): void
  sendAssistantMessage(content: string, toolCallId?: string, requestId?: string): void
  updateStatusStep(requestId: string, step: string): void
}

export function createStatusChannel(post: PostFn): StatusChannel {
  return {
    replaceStatusMessage(requestId, content, isError = false): void {
      post('REPLACE_STATUS', { requestId, content, isError })
    },
    sendAssistantMessage(content, toolCallId, requestId): void {
      // Wrap in a Message object so ui.tsx ASSISTANT_MESSAGE handler can read message.message.
      // This path does NOT push to conversationManager history — use the module-level
      // sendAssistantMessage helper (main.ts / quickActionExecutor.ts) when history tracking matters.
      const message = {
        id: `sc_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
        role: 'assistant' as const,
        content,
        timestamp: Date.now(),
        contentNormalized: false,
        ...(toolCallId !== undefined ? { toolCallId } : {}),
        ...(requestId !== undefined ? { requestId } : {}),
      }
      post('ASSISTANT_MESSAGE', { message })
    },
    updateStatusStep(requestId, step): void {
      post('STATUS_STEP', { requestId, step })
    },
  }
}
