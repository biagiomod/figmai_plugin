/**
 * Frozen Runtime Contract — Request (inputs)
 * Canonical input envelope for LLM requests. No behavior change; documentation + types only.
 * All fields map to current sources: main.ts, selectionContext.ts, settings.ts, providerFactory.ts, recovery.ts, promptPipeline.ts.
 */

import type { NormalizedMessage, ImageData } from '../provider/provider'
import type { SelectionState } from '../types'
import type { Settings } from '../settings'
import type { PromptBudgets } from '../llm/promptPipeline'

/**
 * Safety toggles applied before send (from custom config / getSafetyToggles).
 */
export interface SafetyToggles {
  forceNoKbName?: boolean
  forceNoSelectionSummary?: boolean
  forceNoImages?: boolean
}

/**
 * Canonical LLM request envelope.
 * Describes all inputs that feed into sendChatWithRecovery and the prompt pipeline.
 */
export interface LLMRequestEnvelope {
  /** Assistant identity (from current assistant or RUN_QUICK_ACTION payload). */
  assistantId: string
  /** Quick action id, or undefined for chat (SEND_MESSAGE). */
  actionId: string | undefined
  /** Request id for status/message correlation. */
  requestId: string

  /** Normalized messages (from getCurrentAssistantSegment + normalizeMessages, or action.templateMessage). */
  messages: NormalizedMessage[]
  /** Override for user message (e.g. quick action templateMessage). */
  userMessageOverride?: string

  /** Selection node ids (from figma.currentPage.selection). */
  selectionOrder: string[]
  /** Summarized selection state (from summarizeSelection). */
  selection: SelectionState
  /** Formatted selection summary for context (from buildSelectionContext). */
  selectionSummary?: string
  /** Exported images only when quickAction?.requiresVision && provider.supportsImages (buildSelectionContext). */
  images?: ImageData[]

  /** Resolved provider id (e.g. 'internal-api' | 'proxy'). */
  providerId: string
  /** Effective settings (getEffectiveSettings: config overrides then clientStorage). */
  settings: Settings

  /** Preamble injected for Internal API (first user message in segment). */
  assistantPreamble?: string
  /** Use ALLOW_IMAGES_BUDGETS when true (recovery options). */
  allowImages?: boolean

  /** Safety toggles applied to payload (getSafetyToggles). */
  safetyToggles: SafetyToggles
  /** Budgets (DEFAULT_BUDGETS or ALLOW_IMAGES_BUDGETS from promptPipeline). */
  budgets: PromptBudgets

  /** Optional output schema hint for validation (e.g. 'scorecard' | 'designScreens' | 'freeform'). */
  schemaId?: string
}
