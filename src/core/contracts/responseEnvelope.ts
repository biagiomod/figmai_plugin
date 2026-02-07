/**
 * Frozen Runtime Contract — Response (outputs)
 * Canonical output envelope for LLM responses. No behavior change; documentation + types only.
 * Aligns with SendChatWithRecoveryResult (recovery.ts) and HandlerResult (handlers/base.ts).
 */

/**
 * Known artifact types placed by handlers (for documentation / typing only).
 */
export type ArtifactPlaced =
  | 'scorecard'
  | 'deceptive_report'
  | 'demo_cards'
  | 'content_table'
  | 'screens'
  | 'discovery'
  | 'analytics_session'

/**
 * How the UI should render the result.
 */
export type RenderInstruction =
  | 'replace_status'
  | 'append_chat'
  | 'replace_status_and_show_artifact'

/**
 * Tool result when RUN_TOOL is used (e.g. CREATE_FROM_TEMPLATE_JSON, EXPORT_SELECTION_TO_TEMPLATE_JSON).
 */
export interface ToolResultPayload {
  toolId: string
  payload?: Record<string, unknown>
}

/**
 * Canonical LLM response envelope.
 * Describes outputs from sendChatWithRecovery and handler handling.
 */
export interface LLMResponseEnvelope {
  requestId: string
  /** Raw response text from provider. */
  rawText: string
  /** Content-safety tier used (1, 2, or 3). */
  tierUsed: 1 | 2 | 3
  recoveredWithRedaction?: boolean
  recoveredWithSummary?: boolean

  /** Optional parsed result (handler-specific, e.g. scorecard JSON). */
  parsedJson?: unknown
  parseError?: string

  /** Whether a handler processed the response. */
  handlerHandled: boolean
  /** Message used when handler handled (e.g. for replaceStatusMessage). */
  handlerMessage?: string
  /** Artifacts placed on canvas by handler. */
  artifactsPlaced?: ArtifactPlaced[]
  /** Result from RUN_TOOL when applicable. */
  toolResult?: ToolResultPayload

  /** How to render: replace status message, append to chat, or replace and show artifact. */
  renderInstruction: RenderInstruction
}
