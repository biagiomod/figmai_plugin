/**
 * Content Safety — Send with recovery
 * Pipeline (assemble → sanitize → budget → assert) → send; on CONTENT_FILTER, one fallback with minimal payload; then Tier 2 → Tier 3.
 * Does not change provider selection or add external calls.
 */

import type { Provider, ChatRequest } from '../provider/provider'
import { ProviderError, ProviderErrorType } from '../provider/provider'
import { preparePayloadTier2, preparePayloadTier3, detectSensitivePatterns, mergeSignals, buildScreenChunksFromSelectionSummaryString, formatScreenIndex } from './prepare'
import type { DetectionSignals, ContentBlockContext } from './types'
import {
  assembleSegments,
  sanitizeSegments,
  applyBudgets,
  buildMessages,
  applySafetyAssertions,
  diagnose,
  DEFAULT_BUDGETS,
  ALLOW_IMAGES_BUDGETS,
  type PromptSegments,
  type DiagFlag
} from '../llm/promptPipeline'
import { isPromptDiagnosticsEnabled, getSafetyToggles } from '../../custom/config'

const CONTENT_POLICY_PHRASES = ['content_filter', 'content policy', 'content filtering', 'content_policy', 'blocked by content']

export interface SendChatWithRecoveryOptions {
  /** Selection summary string from the request (used for Tier 3 screen index; no Figma API). */
  selectionSummary?: string
  /** For metadata-only logging: assistantId, quickActionId. */
  assistantId?: string
  quickActionId?: string
  /** When set, pipeline treats preamble separately for budgeting/flags (split from first user message). */
  assistantPreamble?: string
  /** When true, use ALLOW_IMAGES_BUDGETS (small cap) so up to 2 images under byte cap can be sent; still subject to forceNoImages. */
  allowImages?: boolean
}

export interface SendChatWithRecoveryResult {
  response: string
  tierUsed: 1 | 2 | 3
  recoveredWithRedaction?: boolean
  recoveredWithSummary?: boolean
  /** When prompt diagnostics enabled: one-line compact string, optional details, and safety toggles for Work mode UI. */
  diagnostics?: {
    compact: string
    details?: Record<string, number | string>
    safety?: { noKbName?: boolean; noCtx?: boolean; noImages?: boolean }
  }
  /** True when CONTENT_FILTER was recovered via minimal-payload fallback. */
  fallbackUsed?: boolean
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
  const diagnosticsEnabled = isPromptDiagnosticsEnabled()
  const kbName = provider.id === 'internal-api' ? 'figma' : 'none'

  // Attempt 1: Pipeline (assemble → sanitize → budget → assert) then send
  const { segments: segmentsBefore } = assembleSegments(originalRequest, {
    assistantPreamble: options?.assistantPreamble
  })
  const { segments: segmentsSanitized, flags: sanitizeFlags } = sanitizeSegments(segmentsBefore)
  const budgets = options?.allowImages === true ? ALLOW_IMAGES_BUDGETS : DEFAULT_BUDGETS
  const { segments: segmentsAfter, flags: budgetFlags, trims } = applyBudgets(segmentsSanitized, budgets)
  const allFlags: DiagFlag[] = Array.from(new Set([...sanitizeFlags, ...budgetFlags]))
  const request1 = buildMessages(segmentsAfter, originalRequest)
  const { request: payload1Raw } = applySafetyAssertions(request1)
  const safety = getSafetyToggles()
  const payload1: ChatRequest = {
    ...payload1Raw,
    ...(safety.forceNoKbName ? { minimalForContentFilter: true } : {}),
    ...(safety.forceNoSelectionSummary ? { selectionSummary: undefined } : {}),
    ...(safety.forceNoImages ? { images: undefined } : {})
  }
  const forced = {
    noKbName: safety.forceNoKbName,
    noCtx: safety.forceNoSelectionSummary,
    noImages: safety.forceNoImages
  }
  const charCount1 = payload1.messages.reduce((n, m) => n + m.content.length, 0) + (payload1.selectionSummary?.length ?? 0)
  try {
    const response = await provider.sendChat(payload1)
    logRecoveryMeta(1, true, charCount1, undefined, undefined, assistantId, quickActionId)
    const result: SendChatWithRecoveryResult = { response, tierUsed: 1 }
    if (diagnosticsEnabled) {
      const { compact, details } = diagnose({
        segmentsBefore,
        segmentsAfter,
        providerId: provider.id,
        kbName,
        fallback: 0,
        trims,
        flags: allFlags,
        forced
      })
      result.diagnostics = { compact, details, safety: forced }
    }
    return result
  } catch (err) {
    if (!(err instanceof ProviderError) || err.type !== ProviderErrorType.CONTENT_FILTER) {
      throw err
    }
  }

  // Fallback: one retry with minimal payload (no selectionSummary, no images; minimal message)
  const lastUserContentForFallback = originalRequest.messages.length > 0
    ? (originalRequest.messages[originalRequest.messages.length - 1]?.content ?? '')
    : ''
  const minimalMessage =
    'User requested assistance. Context was reduced for policy compliance.\n\n' + lastUserContentForFallback
  const minimalRequest: ChatRequest = {
    ...originalRequest,
    messages: [{ role: 'user', content: minimalMessage }],
    selectionSummary: undefined,
    images: undefined,
    minimalForContentFilter: true
  }
  const { segments: minSegmentsBefore } = assembleSegments(minimalRequest)
  const { segments: minSanitized } = sanitizeSegments(minSegmentsBefore)
  const { segments: minAfter, trims: minTrims, flags: minFlags } = applyBudgets(minSanitized)
  const payloadFallback = applySafetyAssertions(buildMessages(minAfter, minimalRequest)).request
  try {
    const response = await provider.sendChat(payloadFallback)
    logRecoveryMeta(1, true, payloadFallback.messages.reduce((n, m) => n + m.content.length, 0), undefined, undefined, assistantId, quickActionId)
    const result: SendChatWithRecoveryResult = { response, tierUsed: 1, fallbackUsed: true }
    if (diagnosticsEnabled) {
      const { compact, details } = diagnose({
        segmentsBefore: minSegmentsBefore,
        segmentsAfter: minAfter,
        providerId: provider.id,
        kbName,
        fallback: 1,
        trims: minTrims,
        flags: minFlags
      })
      result.diagnostics = { compact, details }
    }
    return result
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
  const lastUserContentForTier3 = originalRequest.messages.length > 0
    ? (originalRequest.messages[originalRequest.messages.length - 1]?.content ?? '')
    : ''
  const lastUserHadSignals = lastUserContentForTier3
    ? Object.values(detectSensitivePatterns(lastUserContentForTier3)).some(Boolean)
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
