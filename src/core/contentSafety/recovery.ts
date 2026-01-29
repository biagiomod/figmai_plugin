/**
 * Content Safety — Send with recovery
 * Orchestrates Tier 1 → send; on CONTENT_FILTER, Tier 2 → send; on CONTENT_FILTER, Tier 3 → send.
 * Does not change provider selection or add external calls.
 */

import type { Provider, ChatRequest } from '../provider/provider'
import { ProviderError, ProviderErrorType } from '../provider/provider'
import { preparePayloadTier1, preparePayloadTier2, preparePayloadTier3, detectSensitivePatterns, mergeSignals, buildScreenChunksFromSelectionSummaryString, formatScreenIndex } from './prepare'
import type { DetectionSignals, ContentBlockContext } from './types'

const CONTENT_POLICY_PHRASES = ['content_filter', 'content policy', 'content filtering', 'content_policy', 'blocked by content']

export interface SendChatWithRecoveryOptions {
  /** Selection summary string from the request (used for Tier 3 screen index; no Figma API). */
  selectionSummary?: string
  /** For metadata-only logging: assistantId, quickActionId. */
  assistantId?: string
  quickActionId?: string
}

export interface SendChatWithRecoveryResult {
  response: string
  tierUsed: 1 | 2 | 3
  recoveredWithRedaction?: boolean
  recoveredWithSummary?: boolean
}

function emptySignals(): DetectionSignals {
  return {
    hadSensitivePatterns: false,
    hadBlobContent: false,
    hadTokenLikeStrings: false,
    hadLongNumericRuns: false,
    hadUrlsWithParams: false,
    textBlockCount: 0
  }
}

/**
 * Build "possible reasons" string from detection signals only. No raw content.
 */
export function formatContentBlockMessage(signals: DetectionSignals): string {
  const lines = ['Blocked by content policy.']
  const reasons: string[] = []
  if (signals.hadSensitivePatterns) reasons.push('email/phone')
  if (signals.hadLongNumericRuns) reasons.push('long numbers')
  if (signals.hadTokenLikeStrings) reasons.push('credential-like text')
  if (signals.hadBlobContent) reasons.push('large encoded data')
  if (signals.hadUrlsWithParams) reasons.push('URLs with parameters')
  if (reasons.length > 0) {
    lines.push(`Possible reasons: ${reasons.join(', ')}.`)
  }
  return lines.join(' ')
}

/**
 * Collect detection signals from request (metadata only).
 */
function collectSignals(request: ChatRequest): DetectionSignals {
  const parts: Partial<DetectionSignals>[] = []
  for (const m of request.messages) {
    parts.push({ ...detectSensitivePatterns(m.content), textBlockCount: 1 })
  }
  if (request.selectionSummary) {
    parts.push({ ...detectSensitivePatterns(request.selectionSummary), textBlockCount: 1 })
  }
  if (parts.length === 0) return emptySignals()
  return mergeSignals(parts)
}

/**
 * Metadata-only log. Never log message content or selectionSummary.
 */
function logRecoveryMeta(
  tierUsed: 1 | 2 | 3,
  success: boolean,
  payloadCharCount: number,
  chunkCount?: number,
  signals?: DetectionSignals,
  assistantId?: string,
  quickActionId?: string
): void {
  const meta: Record<string, unknown> = {
    contentSafetyTier: tierUsed,
    success,
    payloadCharCount,
    assistantId,
    quickActionId
  }
  if (chunkCount != null) meta.chunkCount = chunkCount
  if (signals) {
    meta.hadSensitivePatterns = signals.hadSensitivePatterns
    meta.hadBlobContent = signals.hadBlobContent
    meta.hadTokenLikeStrings = signals.hadTokenLikeStrings
    meta.hadLongNumericRuns = signals.hadLongNumericRuns
    meta.hadUrlsWithParams = signals.hadUrlsWithParams
  }
  console.log('[ContentSafety]', meta)
}

/**
 * sendChatWithRecovery: Tier 1 → send; on CONTENT_FILTER, Tier 2 → send; on CONTENT_FILTER, Tier 3 → send.
 * Non-CONTENT_FILTER errors are thrown immediately. Final failure after attempt 3 throws with content-policy message.
 */
export async function sendChatWithRecovery(
  provider: Provider,
  request: ChatRequest,
  options?: SendChatWithRecoveryOptions
): Promise<SendChatWithRecoveryResult> {
  const originalRequest = request
  const signals = collectSignals(originalRequest)
  const assistantId = options?.assistantId
  const quickActionId = options?.quickActionId

  // Attempt 1: Tier 1
  const payload1 = preparePayloadTier1(originalRequest)
  const charCount1 = payload1.messages.reduce((n, m) => n + m.content.length, 0) + (payload1.selectionSummary?.length ?? 0)
  try {
    const response = await provider.sendChat(payload1)
    logRecoveryMeta(1, true, charCount1, undefined, undefined, assistantId, quickActionId)
    return { response, tierUsed: 1 }
  } catch (err) {
    if (!(err instanceof ProviderError) || err.type !== ProviderErrorType.CONTENT_FILTER) {
      throw err
    }
  }

  // Attempt 2: Tier 2
  const payload2 = preparePayloadTier2(originalRequest)
  const charCount2 = payload2.messages.reduce((n, m) => n + m.content.length, 0) + (payload2.selectionSummary?.length ?? 0)
  try {
    const response = await provider.sendChat(payload2)
    logRecoveryMeta(2, true, charCount2, undefined, undefined, assistantId, quickActionId)
    return { response, tierUsed: 2, recoveredWithRedaction: true }
  } catch (err) {
    if (!(err instanceof ProviderError) || err.type !== ProviderErrorType.CONTENT_FILTER) {
      throw err
    }
  }

  // Attempt 3: Tier 3 — summary-first (no Figma API; use provided selectionSummary string)
  const selectionSummaryForTier3 = options?.selectionSummary ?? originalRequest.selectionSummary ?? ''
  const chunks = selectionSummaryForTier3
    ? buildScreenChunksFromSelectionSummaryString(selectionSummaryForTier3)
    : []
  const indexString = chunks.length > 0 ? formatScreenIndex(chunks) : 'Selection context omitted for policy compliance.'
  const lastUserContent = originalRequest.messages.length > 0
    ? (originalRequest.messages[originalRequest.messages.length - 1]?.content ?? '')
    : ''
  const lastUserHadSignals = lastUserContent
    ? Object.values(detectSensitivePatterns(lastUserContent)).some(Boolean)
    : false
  const payload3 = preparePayloadTier3(originalRequest, indexString, {
    neutralizeLastUserMessage: lastUserHadSignals
  })
  const charCount3 = payload3.messages.reduce((n, m) => n + m.content.length, 0) + (payload3.selectionSummary?.length ?? 0)
  try {
    const response = await provider.sendChat(payload3)
    logRecoveryMeta(3, true, charCount3, chunks.length, undefined, assistantId, quickActionId)
    return { response, tierUsed: 3, recoveredWithSummary: true }
  } catch (err) {
    const ctx: ContentBlockContext = { detectionSignals: signals, attemptedTiers: [1, 2, 3] }
    logRecoveryMeta(3, false, charCount3, chunks.length, signals, assistantId, quickActionId)
    const message = formatContentBlockMessage(ctx.detectionSignals)
    throw new ProviderError(message, ProviderErrorType.CONTENT_FILTER, undefined, undefined, false)
  }
}

/**
 * Check if response body indicates content policy / content filter (conservative).
 * Only status 400 is treated as content-filter; 429 remains rate-limit.
 */
export function isContentFilterResponse(status: number, bodyLower: string): boolean {
  if (status !== 400) return false
  return CONTENT_POLICY_PHRASES.some(phrase => bodyLower.includes(phrase))
}
