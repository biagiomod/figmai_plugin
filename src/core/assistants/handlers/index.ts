/**
 * Assistant Handler Registry
 * Central registry for all assistant-specific response handlers
 */

import type { AssistantHandler } from './base'
import { ContentTableHandler } from './contentTable'
import { DesignCritiqueHandler } from './designCritique'
import { DesignWorkshopHandler } from './designWorkshop'
import { DiscoveryCopilotHandler } from './discovery'

/**
 * All registered handlers
 */
const handlers: AssistantHandler[] = [
  new ContentTableHandler(),
  new DesignCritiqueHandler(),
  new DesignWorkshopHandler(),
  new DiscoveryCopilotHandler()
]

/**
 * Get handler for assistant/action combination
 * actionId is undefined for chat messages, or a string for quick actions
 */
export function getHandler(assistantId: string, actionId: string | undefined): AssistantHandler | undefined {
  return handlers.find(handler => handler.canHandle(assistantId, actionId))
}

/**
 * Get all handlers
 */
export function getAllHandlers(): AssistantHandler[] {
  return handlers
}

