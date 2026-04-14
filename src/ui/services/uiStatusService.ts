/**
 * uiStatusService.ts — Status display management for the plugin UI.
 *
 * Manages the active status indicator (spinner + typewriter step text)
 * shown while a request is in-flight.
 */

export interface ActiveStatus {
  requestId: string
  text: string
  step?: string
}

/**
 * Process a STATUS_STEP message and return updated status.
 * Returns null if the status should not be updated.
 */
export function processStatusStep(
  current: ActiveStatus | null,
  requestId: string,
  step: string
): ActiveStatus | null {
  if (!current || current.requestId !== requestId) return null
  return { requestId: current.requestId, text: current.text, step }
}

/**
 * Create a new active status from an assistant status message.
 */
export function createActiveStatus(requestId: string, text: string): ActiveStatus {
  return { requestId: requestId || '', text: text || 'Processing...' }
}

/**
 * Check if a status should be cleared by an incoming assistant message.
 */
export function shouldClearStatus(
  current: ActiveStatus | null,
  incomingRequestId: string | undefined
): boolean {
  if (!current || !incomingRequestId) return false
  return current.requestId === incomingRequestId
}
