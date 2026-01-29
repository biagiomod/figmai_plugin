/**
 * Content Safety — Tier 1/2/3 prepare and detection
 * Purely local; no external calls. No raw content in return values.
 */

import type { ChatRequest, NormalizedMessage } from '../provider/provider'
import type { DetectionSignals, PreparedRequest, ScreenChunk } from './types'

const LONG_BLOCK_THRESHOLD = 200
const BLOB_MIN_LENGTH = 80
const BASE64_ALPHABET = /^[A-Za-z0-9+/=]+$/
const HEX_ALPHABET = /^[0-9A-Fa-f]+$/
const URL_QUERY_FRAGMENT = /\?[^#\s]*|#[^\s]*/g
const EMAIL_PATTERN = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g
const PHONE_PATTERN = /\b(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}\b/g
const LONG_NUMERIC_RUN = /[0-9]{12,}/g
const TOKEN_LIKE = /\b(?:sk-[A-Za-z0-9]{20,}|Bearer\s+[A-Za-z0-9._-]{20,}|api[_-]?key["\s:=]+["']?[A-Za-z0-9._-]{20,})/gi

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
 * Strip URL query params and fragments in text. Deterministic, idempotent.
 */
function stripUrlParamsAndFragments(text: string): string {
  return text.replace(URL_QUERY_FRAGMENT, '')
}

/**
 * Collapse obvious base64/hex blobs into a short placeholder. Preserves structure.
 */
function collapseBlobs(text: string): string {
  const segments: string[] = []
  let lastIndex = 0
  const re = /(?:data:[^;]+;base64,)?([A-Za-z0-9+/=]{80,})|([0-9A-Fa-f]{80,})/g
  let m: RegExpExecArray | null
  while ((m = re.exec(text)) !== null) {
    const full = m[0]
    const g1 = m[1]
    const g2 = m[2]
    const isBase64 = g1 != null && BASE64_ALPHABET.test(g1)
    const isHex = g2 != null && HEX_ALPHABET.test(g2)
    if (isBase64 || isHex) {
      segments.push(text.slice(lastIndex, m.index))
      const len = (g1 ?? g2 ?? '').length
      const approxKb = Math.round(len * 0.75 / 1024)
      segments.push(approxKb >= 1 ? `[base64 data, ~${approxKb}KB]` : '[base64 data]')
      lastIndex = m.index + full.length
    }
  }
  if (lastIndex === 0) return text
  segments.push(text.slice(lastIndex))
  return segments.join('')
}

/**
 * De-duplicate long repeated blocks: keep first occurrence, replace repeats with "[same as above]".
 */
function deduplicateLongBlocks(text: string): string {
  const lines = text.split('\n')
  const seen = new Map<string, number>()
  const out: string[] = []
  for (const line of lines) {
    if (line.length > LONG_BLOCK_THRESHOLD) {
      const idx = seen.get(line)
      if (idx !== undefined) {
        out.push('[same as above]')
        continue
      }
      seen.set(line, out.length)
    }
    out.push(line)
  }
  return out.join('\n')
}

/**
 * Tier 1: value-neutral optimizations. Deterministic, idempotent.
 */
function applyTier1ToText(text: string): string {
  let s = stripUrlParamsAndFragments(text)
  s = collapseBlobs(s)
  s = deduplicateLongBlocks(s)
  return s
}

/**
 * Detect sensitive patterns (metadata only). No raw content returned.
 */
export function detectSensitivePatterns(text: string): Partial<DetectionSignals> {
  const signals: Partial<DetectionSignals> = {}
  EMAIL_PATTERN.lastIndex = 0
  PHONE_PATTERN.lastIndex = 0
  if (EMAIL_PATTERN.test(text) || PHONE_PATTERN.test(text)) {
    signals.hadSensitivePatterns = true
  }
  LONG_NUMERIC_RUN.lastIndex = 0
  if (LONG_NUMERIC_RUN.test(text)) {
    signals.hadLongNumericRuns = true
  }
  TOKEN_LIKE.lastIndex = 0
  if (TOKEN_LIKE.test(text)) {
    signals.hadTokenLikeStrings = true
  }
  if (/\?[^#\s]|#[^\s]/.test(text) && /https?:\/\//i.test(text)) {
    signals.hadUrlsWithParams = true
  }
  const blobRe = /(?:base64,)?[A-Za-z0-9+/=]{80,}|[0-9A-Fa-f]{80,}/
  if (blobRe.test(text)) {
    signals.hadBlobContent = true
  }
  return signals
}

/**
 * Merge detection signals from multiple text blocks.
 */
export function mergeSignals(signals: Partial<DetectionSignals>[]): DetectionSignals {
  const out = emptySignals()
  let count = 0
  for (const s of signals) {
    if (s.hadSensitivePatterns) out.hadSensitivePatterns = true
    if (s.hadBlobContent) out.hadBlobContent = true
    if (s.hadTokenLikeStrings) out.hadTokenLikeStrings = true
    if (s.hadLongNumericRuns) out.hadLongNumericRuns = true
    if (s.hadUrlsWithParams) out.hadUrlsWithParams = true
    if (s.textBlockCount != null) count += s.textBlockCount
  }
  out.textBlockCount = count
  return out
}

/**
 * Tier 1 prepare: URL strip, blob placeholder, de-dupe. No PII masking, no hard caps.
 */
export function preparePayloadTier1(request: ChatRequest): PreparedRequest {
  const messages: NormalizedMessage[] = request.messages.map(m => ({
    role: m.role,
    content: applyTier1ToText(m.content)
  }))
  const selectionSummary = request.selectionSummary != null
    ? applyTier1ToText(request.selectionSummary)
    : request.selectionSummary
  return {
    ...request,
    messages,
    selectionSummary
  }
}

/**
 * Tier 2: minimal pattern masking (emails, phones, long numbers, token-like). Preserve structure.
 */
function applyTier2ToText(text: string): string {
  let s = text
  s = s.replace(EMAIL_PATTERN, '[EMAIL]')
  s = s.replace(PHONE_PATTERN, '[PHONE]')
  s = s.replace(LONG_NUMERIC_RUN, '[LONG_NUMBER]')
  s = s.replace(TOKEN_LIKE, '[TOKEN]')
  return s
}

/**
 * Tier 2 prepare: targeted redaction only. Applied on CONTENT_FILTER retry.
 */
export function preparePayloadTier2(request: ChatRequest): PreparedRequest {
  const messages: NormalizedMessage[] = request.messages.map(m => ({
    role: m.role,
    content: applyTier2ToText(m.content)
  }))
  const selectionSummary = request.selectionSummary != null
    ? applyTier2ToText(request.selectionSummary)
    : request.selectionSummary
  return {
    ...request,
    messages,
    selectionSummary
  }
}

/**
 * Build screen index chunks deterministically from an existing selectionSummary string.
 *
 * Parser contract:
 * - Expects the output format of formatSelectionSummary in core/context/selectionSummary.ts.
 * - Only parses lines containing " | " (node lines); other lines are skipped.
 * - If zero chunks are produced (empty input, unknown format, or no " | " lines), Tier 3
 *   falls back to a safe placeholder string in recovery.
 * No Figma API; purely string-based.
 */
export function buildScreenChunksFromSelectionSummaryString(selectionSummaryText: string): ScreenChunk[] {
  if (!selectionSummaryText || selectionSummaryText.trim() === '' || selectionSummaryText.startsWith('No selection')) {
    return []
  }
  const lines = selectionSummaryText.split('\n').map(l => l.trim()).filter(Boolean)
  const chunks: ScreenChunk[] = []
  let index = 0
  for (const line of lines) {
    if (line.startsWith('Selected ') && line.includes('node')) continue
    if (!line.includes(' | ')) continue
    const firstPart = line.split(' | ')[0] ?? ''
    const nameMatch = firstPart.match(/^(.+?)\s*\([A-Z_]+\)\s*$/) || [null, firstPart]
    const name = (nameMatch[1] ?? firstPart).trim() || `Item ${index + 1}`
    const summary = line
    const metrics: ScreenChunk['metrics'] = {}
    const sizeMatch = line.match(/Size:\s*(\d+)×(\d+)px/)
    if (sizeMatch) {
      metrics.width = parseInt(sizeMatch[1], 10)
      metrics.height = parseInt(sizeMatch[2], 10)
    }
    const childrenMatch = line.match(/Children:\s*(\d+)/)
    if (childrenMatch) metrics.childCount = parseInt(childrenMatch[1], 10)
    if (/Text:|Contains text:/i.test(line)) metrics.hasText = true
    chunks.push({ id: String(index), name, summary, metrics })
    index++
  }
  return chunks
}

/**
 * Format screen index as a single string for inclusion in request.
 */
export function formatScreenIndex(chunks: ScreenChunk[]): string {
  if (chunks.length === 0) return 'No selection'
  const lines = [`Screen index (${chunks.length} items):`]
  for (const c of chunks) {
    const m = Object.entries(c.metrics)
      .filter(([, v]) => v !== undefined)
      .map(([k, v]) => `${k}:${v}`)
      .join(', ')
    lines.push(`${c.id} | ${c.name} | ${c.summary}${m ? ` | ${m}` : ''}`)
  }
  return lines.join('\n')
}

/**
 * Tier 3 prepare: replace selection with screen index; keep last user message, append neutral line.
 * Only neutralize last user message if detection signals suggest it likely triggered the filter.
 */
export function preparePayloadTier3(
  request: ChatRequest,
  selectionSummaryReplacement: string,
  options?: { neutralizeLastUserMessage?: boolean }
): PreparedRequest {
  const neutralizeLast = options?.neutralizeLastUserMessage === true
  const messages: NormalizedMessage[] = request.messages.map((m, i) => {
    const isLastUser = m.role === 'user' && i === request.messages.length - 1
    if (!isLastUser) return { role: m.role, content: m.content }
    if (neutralizeLast) {
      return {
        role: m.role,
        content: `User requested analysis of the selected frames. Selection context summarized below.\n\n${selectionSummaryReplacement}`
      }
    }
    return {
      role: m.role,
      content: `${m.content}\n\nSelection context summarized below.\n\n${selectionSummaryReplacement}`
    }
  })
  return {
    ...request,
    messages,
    selectionSummary: selectionSummaryReplacement
  }
}
