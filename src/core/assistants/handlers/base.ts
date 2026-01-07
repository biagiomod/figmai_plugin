/**
 * Assistant Handler Base Interface
 * Defines the contract for assistant-specific response handling
 */

import type { SelectionState } from '../../types'
import type { Provider, NormalizedMessage } from '../../provider/provider'

/**
 * Context passed to handler for processing responses
 */
export interface HandlerContext {
  assistantId: string
  actionId: string
  response: string
  selectionOrder: string[]
  selection: SelectionState
  provider: Provider
  sendAssistantMessage: (message: string) => void
}

/**
 * Result from handler processing
 */
export interface HandlerResult {
  handled: boolean
  message?: string
}

/**
 * Assistant Handler Interface
 * Handlers process assistant-specific responses and may handle them completely
 * or return handled: false to let the default flow continue
 */
export interface AssistantHandler {
  /**
   * Check if this handler can handle the given assistant/action combination
   */
  canHandle(assistantId: string, actionId: string): boolean

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

