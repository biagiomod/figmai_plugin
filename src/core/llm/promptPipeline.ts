/**
 * LLM Prompt Pipeline — assemble, sanitize, budget, build, diagnose
 * Single code path before send; no raw prompt in diagnostics.
 */

import type { ChatRequest, NormalizedMessage, ImageData } from '../provider/provider'

export type DiagFlag = 'DATA_URL' | 'BASE64_RUN' | 'LONG_LINE' | 'HUGE_JSON' | 'MANY_URLS' | 'OVER_BUDGET'

export interface PromptSegments {
  sys?: string
  asst?: string
  user?: string
  ctx?: string
  images?: ImageData[]
  logs?: string
}

export interface PromptBudgets {
  total: number
  sys: number
  asst: number
  user: number
  ctx: number
  logs: number
  /** Max bytes for images (sum of dataUrl lengths); 0 = drop all */
  imagesBytes: number
  /** Max image count when imagesBytes > 0; e.g. 2 for allowImages mode */
  maxImages?: number
}

export const DEFAULT_BUDGETS: PromptBudgets = {
  total: 40_000,
  sys: 8_000,
  asst: 8_000,
  user: 8_000,
  ctx: 8_000,
  logs: 2_000,
  imagesBytes: 0
}

/** Budgets when allowImages=true: small cap for quality without risk */
export const ALLOW_IMAGES_BUDGETS: PromptBudgets = {
  ...DEFAULT_BUDGETS,
  imagesBytes: 100_000,
  maxImages: 2
}

export interface AssembleOptions {
  /** When set, first user message is split: preamble = asst, rest = user (for budgeting/flags) */
  assistantPreamble?: string
}

export interface SanitizeResult {
  segments: PromptSegments
  flags: DiagFlag[]
}

export interface SafetyForced {
  noKbName?: boolean
  noCtx?: boolean
  noImages?: boolean
}

export interface DiagnoseInput {
  segmentsBefore: PromptSegments
  segmentsAfter: PromptSegments
  providerId: string
  kbName: string | undefined
  fallback: 0 | 1
  trims: string[]
  flags: DiagFlag[]
  /** When set, diagnostics show off-forced / 0-forced for isolation toggles */
  forced?: SafetyForced
}

const LONG_LINE_CHARS = 500
const HUGE_JSON_CHARS = 12_000
const DATA_URL_PLACEHOLDER = '[DATA_URL_REMOVED]'
const BASE64_MIN_RUN = 80
const HTML_TAG = /<[^>]+>/g
const DATA_URL_RE = /data:image\/[^;]+;base64,[A-Za-z0-9+/=]+/gi
const BASE64_RUN_RE = /(?:data:[^;]+;base64,)?([A-Za-z0-9+/=]{80,})/g
const BASE64_ALPHABET = /^[A-Za-z0-9+/=]+$/

function simpleHash(input: string): string {
  let h = 0
  for (let i = 0; i < input.length; i++) {
    h = ((h << 5) - h + input.charCodeAt(i)) | 0
  }
  return Math.abs(h).toString(16).slice(0, 6)
}

/**
 * Assemble request into segments. Treats preamble separately when provided.
 */
export function assembleSegments(
  request: ChatRequest,
  options?: AssembleOptions
): { segments: PromptSegments; rawMessages: NormalizedMessage[] } {
  const preamble = options?.assistantPreamble
  const segments: PromptSegments = {}

  const sysParts: string[] = []
  const userParts: string[] = []
  let asst = ''

  for (const m of request.messages) {
    if (m.role === 'system') {
      sysParts.push(m.content)
    } else if (m.role === 'assistant') {
      asst = (asst ? asst + '\n\n' : '') + m.content
    } else if (m.role === 'user') {
      let content = m.content
      if (preamble && userParts.length === 0 && content.startsWith(preamble)) {
        asst = preamble
        content = content.slice(preamble.length).replace(/^\s+/, '')
      }
      userParts.push(content)
    }
  }

  if (sysParts.length > 0) segments.sys = sysParts.join('\n\n')
  if (asst) segments.asst = asst
  if (userParts.length > 0) segments.user = userParts.join('\n\n')
  if (request.selectionSummary) segments.ctx = request.selectionSummary
  if (request.images && request.images.length > 0) segments.images = request.images
  // logs: not populated from request today

  return { segments, rawMessages: request.messages }
}

/**
 * Strip HTML, remove or replace data URLs, clamp base64 runs, shorten huge JSON, dedupe long repeats.
 */
export function sanitizeSegments(segments: PromptSegments): SanitizeResult {
  const flags: DiagFlag[] = []
  const out: PromptSegments = {}

  function sanitizeText(text: string): string {
    let s = text
    if (HTML_TAG.test(s)) {
      s = s.replace(HTML_TAG, '')
      // Don't add a flag for HTML; it's routine cleanup
    }
    if (DATA_URL_RE.test(s)) {
      flags.push('DATA_URL')
      s = s.replace(DATA_URL_RE, DATA_URL_PLACEHOLDER)
    }
    if (BASE64_RUN_RE.test(s)) {
      flags.push('BASE64_RUN')
      s = s.replace(/(?:data:[^;]+;base64,)?([A-Za-z0-9+/=]{80,})/g, (_, g1) => {
        if (g1 && BASE64_ALPHABET.test(g1)) {
          const kb = Math.round(g1.length * 0.75 / 1024)
          return kb >= 1 ? `[base64 ~${kb}KB]` : '[base64]'
        }
        return _
      })
    }
    const lines = s.split('\n')
    for (const line of lines) {
      if (line.length > LONG_LINE_CHARS) {
        flags.push('LONG_LINE')
        break
      }
    }
    if (s.length > HUGE_JSON_CHARS && (s.trimStart().startsWith('{') || s.trimStart().startsWith('['))) {
      flags.push('HUGE_JSON')
      s = s.slice(0, HUGE_JSON_CHARS) + '\n[... truncated]'
    }
    const urlCount = (s.match(/https?:\/\/[^\s]+/g) || []).length
    if (urlCount > 20) flags.push('MANY_URLS')
    return s
  }

  if (segments.sys != null) out.sys = sanitizeText(segments.sys)
  if (segments.asst != null) out.asst = sanitizeText(segments.asst)
  if (segments.user != null) out.user = sanitizeText(segments.user)
  if (segments.ctx != null) out.ctx = sanitizeText(segments.ctx)
  if (segments.logs != null) out.logs = sanitizeText(segments.logs)

  if (segments.images && segments.images.length > 0) {
    flags.push('DATA_URL')
    out.images = []
  }

  return { segments: out, flags: Array.from(new Set(flags)) }
}

/**
 * Safety: ensure no data:image/ or long base64 runs remain in text. Strip and flag.
 */
export function assertNoDataUrlsOrLongBase64(text: string): { cleaned: string; hadDataUrl: boolean; hadLongBase64: boolean } {
  let hadDataUrl = false
  let hadLongBase64 = false
  let cleaned = text
  if (/data:image\//i.test(cleaned)) {
    hadDataUrl = true
    cleaned = cleaned.replace(/data:image\/[^;]+;base64,[A-Za-z0-9+/=]+/gi, DATA_URL_PLACEHOLDER)
  }
  const base64Match = cleaned.match(/[A-Za-z0-9+/=]{200,}/g)
  if (base64Match && base64Match.some(run => BASE64_ALPHABET.test(run))) {
    hadLongBase64 = true
    cleaned = cleaned.replace(/([A-Za-z0-9+/=]{200,})/g, (m) =>
      BASE64_ALPHABET.test(m) ? '[BASE64_STRIPPED]' : m
    )
  }
  return { cleaned, hadDataUrl, hadLongBase64 }
}

/**
 * Apply per-segment and total budgets. Deterministic truncation with marker.
 */
export function applyBudgets(
  segments: PromptSegments,
  budgets: PromptBudgets = DEFAULT_BUDGETS
): { segments: PromptSegments; flags: DiagFlag[]; trims: string[] } {
  const trims: string[] = []
  const flags: DiagFlag[] = []
  const out: PromptSegments = { ...segments }

  function cap(key: keyof PromptSegments, value: string | undefined, max: number): string | undefined {
    if (value == null) return value
    if (value.length <= max) return value
    trims.push(`${key}:-${value.length - max}`)
    flags.push('OVER_BUDGET')
    return value.slice(0, max) + ' [... truncated]'
  }

  if (out.sys != null) out.sys = cap('sys', out.sys, budgets.sys) ?? undefined
  if (out.asst != null) out.asst = cap('asst', out.asst, budgets.asst) ?? undefined
  if (out.user != null) out.user = cap('user', out.user, budgets.user) ?? undefined
  if (out.ctx != null) out.ctx = cap('ctx', out.ctx, budgets.ctx) ?? undefined
  if (out.logs != null) out.logs = cap('logs', out.logs, budgets.logs) ?? undefined

  if (out.images && out.images.length > 0 && budgets.imagesBytes === 0) {
    trims.push('images:dropped')
    flags.push('OVER_BUDGET')
    out.images = []
  } else if (out.images && out.images.length > 0 && budgets.imagesBytes > 0) {
    const maxCount = budgets.maxImages ?? 2
    let total = 0
    const kept: ImageData[] = []
    for (const img of out.images) {
      if (kept.length >= maxCount) {
        trims.push('images:count-cap')
        flags.push('OVER_BUDGET')
        break
      }
      const len = (img.dataUrl || '').length
      if (total + len <= budgets.imagesBytes) {
        kept.push(img)
        total += len
      } else {
        trims.push(`images:-${len}`)
        flags.push('OVER_BUDGET')
      }
    }
    out.images = kept
  }

  let totalChars = 0
  if (out.sys) totalChars += out.sys.length
  if (out.asst) totalChars += out.asst.length
  if (out.user) totalChars += out.user.length
  if (out.ctx) totalChars += (out.ctx || '').length
  if (out.logs) totalChars += out.logs.length
  if (totalChars > budgets.total) {
    trims.push(`total:-${totalChars - budgets.total}`)
    flags.push('OVER_BUDGET')
  }

  return { segments: out, flags: Array.from(new Set(flags)), trims }
}

/**
 * Rebuild ChatRequest from segments. Preserves assistantId, assistantName, etc. from original when provided.
 */
export function buildMessages(
  segments: PromptSegments,
  originalRequest?: Partial<ChatRequest>
): ChatRequest {
  const messages: NormalizedMessage[] = []
  if (segments.sys) messages.push({ role: 'system', content: segments.sys })
  const userContent = [segments.asst, segments.user].filter(Boolean).join('\n\n')
  if (userContent) messages.push({ role: 'user', content: userContent })

  return {
    ...originalRequest,
    messages: messages.length > 0 ? messages : (originalRequest?.messages ?? []),
    selectionSummary: segments.ctx,
    images: segments.images && segments.images.length > 0 ? segments.images : undefined
  } as ChatRequest
}

/**
 * Apply safety assertions to final request: strip any remaining data:image/ and long base64 runs.
 */
export function applySafetyAssertions(request: ChatRequest): {
  request: ChatRequest
  hadDataUrl: boolean
  hadLongBase64: boolean
} {
  let hadDataUrl = false
  let hadLongBase64 = false
  const messages = request.messages.map((m) => {
    const { cleaned, hadDataUrl: d, hadLongBase64: b } = assertNoDataUrlsOrLongBase64(m.content)
    hadDataUrl = hadDataUrl || d
    hadLongBase64 = hadLongBase64 || b
    return { role: m.role, content: cleaned }
  })
  let selectionSummary = request.selectionSummary
  if (selectionSummary) {
    const { cleaned, hadDataUrl: d, hadLongBase64: b } = assertNoDataUrlsOrLongBase64(selectionSummary)
    hadDataUrl = hadDataUrl || d
    hadLongBase64 = hadLongBase64 || b
    selectionSummary = cleaned
  }
  const images = request.images?.filter((img) => {
    if (!img.dataUrl || !/data:image\//i.test(img.dataUrl)) return true
    hadDataUrl = true
    return false
  })
  return {
    request: { ...request, messages, selectionSummary, images: images?.length ? images : undefined },
    hadDataUrl,
    hadLongBase64
  }
}

/**
 * Build one-line diagnostic string. No raw prompt content.
 */
export function diagnose(input: DiagnoseInput): { compact: string; details: Record<string, number | string> } {
  const a = input.segmentsAfter
  const total =
    (a.sys?.length ?? 0) +
    (a.asst?.length ?? 0) +
    (a.user?.length ?? 0) +
    (a.ctx?.length ?? 0) +
    (a.logs?.length ?? 0)
  const imageCount = a.images?.length ?? 0
  const imageBytes = (a.images ?? []).reduce((sum, i) => sum + (i.dataUrl?.length ?? 0), 0)

  const flagsStr = input.flags.length ? input.flags.join(',') : 'none'
  const trimsStr = input.trims.length ? input.trims.join(',') : 'none'
  const hash = simpleHash(
    `total=${total} sys=${a.sys?.length ?? 0} asst=${a.asst?.length ?? 0} user=${a.user?.length ?? 0}`
  )
  const f = input.forced
  const kbLabel = f?.noKbName ? 'off-forced' : (input.kbName ?? 'none')
  const ctxLabel = f?.noCtx ? '0-forced' : String(a.ctx?.length ?? 0)
  const imgLabel = f?.noImages ? '0-forced' : `${imageCount}/${imageBytes}`

  const compact =
    `PROMPT_DIAG v1 provider=${input.providerId} total=${total} sys=${a.sys?.length ?? 0} preamble=${a.asst?.length ?? 0} user=${a.user?.length ?? 0} ctx=${ctxLabel} images=${imgLabel} kbName=${kbLabel} flags=[${flagsStr}] trims=[${trimsStr}] fallback=${input.fallback} hash=${hash}`

  const details: Record<string, number | string> = {
    provider: input.providerId,
    total,
    sys: a.sys?.length ?? 0,
    preamble: a.asst?.length ?? 0,
    user: a.user?.length ?? 0,
    ctx: f?.noCtx ? '0-forced' : (a.ctx?.length ?? 0),
    imagesCount: f?.noImages ? '0-forced' : imageCount,
    imagesBytes: f?.noImages ? '0-forced' : imageBytes,
    
    : kbLabel,
    flags: flagsStr,
    trims: trimsStr,
    fallback: input.fallback,
    hash
  }

  return { compact, details }
}
