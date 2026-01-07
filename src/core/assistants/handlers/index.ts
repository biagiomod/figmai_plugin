/**
 * Assistant Handler Registry
 * Central registry for all assistant-specific response handlers
 */

import type { AssistantHandler } from './base'
import { ContentTableHandler } from './contentTable'
import { DesignCritiqueHandler } from './designCritique'

/**
 * All registered handlers
 */
const handlers: AssistantHandler[] = [
  new ContentTableHandler(),
  new DesignCritiqueHandler()
]

/**
 * Get handler for assistant/action combination
 */
export function getHandler(assistantId: string, actionId: string): AssistantHandler | undefined {
  return handlers.find(handler => handler.canHandle(assistantId, actionId))
}

/**
 * Get all handlers
 */
export function getAllHandlers(): AssistantHandler[] {
  return handlers
}

