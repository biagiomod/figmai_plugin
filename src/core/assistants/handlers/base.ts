/**
 * Assistant Handler Base Interface
 * Defines the contract for assistant-specific response handling
 */

import type { SelectionState } from '../../types'
import type { Provider, NormalizedMessage, ChatRequest } from '../../provider/provider'
import type { OutcomeRecord } from '../../sdk/types'

/**
 * Context passed to handler for processing responses
 */
export interface HandlerContext {
  assistantId: string
  actionId: string | undefined
  response: string
  selectionOrder: string[]
  selection: SelectionState
  provider: Provider
  /** Send chat with content-safety recovery (use for repair/follow-up flows). */
  sendChatWithRecovery: (request: ChatRequest) => Promise<string>
  sendAssistantMessage: (message: string) => void
  replaceStatusMessage: (finalContent: string, isError?: boolean) => void
  /** Update the processing step shown in the spinner indicator (typewriter effect in UI). */
  updateStatusStep?: (step: string) => void
  requestId: string
}

/**
 * Result from handler processing
 */
export interface HandlerResult {
  handled: boolean
  message?: string
  /** Reserved for north star review loop — unused today, populated by future handlers. */
  outcome?: OutcomeRecord
}

/**
 * Assistant Handler Interface
 * Handlers process assistant-specific responses and may handle them completely
 * or return handled: false to let the default flow continue
 */
export interface AssistantHandler {
  /**
   * Check if this handler can handle the given assistant/action combination
   * actionId is undefined for chat messages, or a string for quick actions
   */
  canHandle(assistantId: string, actionId: string | undefined): boolean

  /**
   * Optionally modify messages before sending to provider
   * Returns modified messages array, or undefined to use original messages
   */
  prepareMessages?(messages: NormalizedMessage[]): NormalizedMessage[] | undefined

  /**
   * Handle the assistant response
   * Returns { handled: true } if the handler processed the response completely
   * Returns { handled: false } if the handler did not process it (default flow continues)
   */
  handleResponse(context: HandlerContext): Promise<HandlerResult>
}

