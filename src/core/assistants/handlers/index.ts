/**
 * Assistant Handler Registry
 * Central registry for all assistant-specific response handlers
 */

import type { AssistantHandler } from './base'
import { ContentTableHandler } from './contentTable'
import { ContentReviewHandler } from './contentReview'
import { DesignCritiqueHandler } from './designCritique'
import { DesignWorkshopHandler } from './designWorkshop'
import { DiscoveryCopilotHandler } from './discovery'
import { AnalyticsTaggingHandler } from './analyticsTagging'
import { ErrorsHandler } from './errors'
import { SmartDetectorHandler } from './smartDetector'

/**
 * All registered handlers
 */
const handlers: AssistantHandler[] = [
  new ContentTableHandler(),
  new ContentReviewHandler(),
  new DesignCritiqueHandler(),
  new DesignWorkshopHandler(),
  new DiscoveryCopilotHandler(),
  new AnalyticsTaggingHandler(),
  new ErrorsHandler(),
  new SmartDetectorHandler()
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

