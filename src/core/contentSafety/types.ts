/**
 * Content Safety — Data contracts
 * Same shape as provider ChatRequest; content fields may be transformed by tiers.
 */

import type { ChatRequest, NormalizedMessage, ImageData } from '../provider/provider'
import type { SelectionState } from '../types'

/**
 * Detection signals only (booleans/counts). No raw content.
 * Used for Tier 2 targeting and UI "possible reasons" on final failure.
 */
export interface DetectionSignals {
  hadSensitivePatterns: boolean
  hadBlobContent: boolean
  hadTokenLikeStrings: boolean
  hadLongNumericRuns: boolean
  hadUrlsWithParams: boolean
  /** Count of messages + selectionSummary text blocks analyzed */
  textBlockCount: number
}

/**
 * Prepared request: same shape as ChatRequest.
 * Only messages[].content and selectionSummary may be transformed.
 */
export interface PreparedRequest extends ChatRequest {
  messages: NormalizedMessage[]
  assistantId?: string
  assistantName?: string
  quickActionId?: string
  selection?: SelectionState
  selectionSummary?: string
  images?: ImageData[]
  quickAction?: string
}

/**
 * Context for final content-policy failure (UI messaging / analytics).
 * Metadata only; no raw content.
 */
export interface ContentBlockContext {
  detectionSignals: DetectionSignals
  attemptedTiers: [1, 2, 3]
}

/**
 * One chunk in the Tier 3 screen index.
 * Built from selectionSummary source data (frame/section/component).
 */
export interface ScreenChunk {
  id: string
  name: string
  summary: string
  metrics: { width?: number; height?: number; childCount?: number; hasText?: boolean }
}
