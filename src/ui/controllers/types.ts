/**
 * Shared controller interface for per-assistant UI logic.
 * Controllers own state, message handling, and view rendering for one assistant.
 */

export interface ControllerMessageResult {
  handled: boolean
}

export interface AssistantController {
  /** Handle a plugin message. Returns {handled: true} if this controller handled it. */
  onPluginMessage(type: string, payload: unknown): ControllerMessageResult
  /** Handle a quick action click. Returns true if this controller handled it. */
  onQuickAction(actionId: string): boolean
}
