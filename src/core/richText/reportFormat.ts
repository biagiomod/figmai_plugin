/**
 * Canonical report formatting: Markdown-only, no HTML.
 * Build ReportDoc -> toCanonicalMarkdown; adapters: renderForChat, renderForAnnotation.
 * Guardrail: sanitizeForChat strips raw HTML from messages before they reach the UI.
 */

import { debug } from '../debug/logger'

// ---- Types ----

export interface ReportDoc {
  title?: string
  sections: ReportSection[]
}

export interface ReportSection {
  title?: string
  keyValues?: Array<{ key: string; value: string }>
  blocks?: ReportBlock[]
}

export type ReportBlock =
  | { type: 'paragraph'; text: string }
  | { type: 'bullets'; items: string[] }
  | { type: 'numbered'; items: string[] }

// ---- Canonical Markdown ----

const SECTION_HEADING_PREFIX = '## '

function escapeMarkdownBold(s: string): string {
  return s.replace(/\*\*/g, '')
}

function keyValueLine(key: string, value: string): string {
  const k = escapeMarkdownBold(key.trim())
  const v = String(value ?? '').trim()
  if (/^\d+\.$/.test(k)) return `**${k}** ${v}`
  return `**${k}:** ${v}`
}

export function toCanonicalMarkdown(doc: ReportDoc): string {
  const lines: string[] = []
  if (doc.title?.trim()) {
    lines.push(SECTION_HEADING_PREFIX + doc.title.trim())
    lines.push('')
  }
  for (const section of doc.sections) {
    if (section.title?.trim()) {
      lines.push(SECTION_HEADING_PREFIX + section.title.trim())
    }
    if (section.keyValues && section.keyValues.length > 0) {
      for (const { key, value } of section.keyValues) {
        lines.push(keyValueLine(key, value))
        lines.push('') // blank so parser treats each key/value as its own paragraph
      }
    }
    if (section.blocks && section.blocks.length > 0) {
      for (const block of section.blocks) {
        if (block.type === 'paragraph' && block.text.trim()) {
          lines.push(block.text.trim())
        } else if (block.type === 'bullets' && block.items.length > 0) {
          for (const item of block.items) {
            lines.push('- ' + String(item).trim())
          }
        } else if (block.type === 'numbered' && block.items.length > 0) {
          block.items.forEach((item, i) => {
            lines.push(`${i + 1}. ${String(item).trim()}`)
          })
        }
      }
    }
    lines.push('')
  }
  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd()
}

// ---- Adapters ----

export interface RenderForChatOptions {
  maxLength?: number
}

const DEFAULT_CHAT_MAX_LENGTH = 8000
const TRUNCATED_SUFFIX = '\n\n… (truncated)'

export function renderForChat(md: string, opts: RenderForChatOptions = {}): string {
  let out = md.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trimEnd()
  const maxLen = opts.maxLength ?? DEFAULT_CHAT_MAX_LENGTH
  if (out.length > maxLen) {
    out = out.slice(0, maxLen - TRUNCATED_SUFFIX.length) + TRUNCATED_SUFFIX
  }
  return out
}

export interface RenderForAnnotationOptions {
  maxLines?: number
  maxLineLength?: number
  plainOnly?: boolean
}

const DEFAULT_ANNOTATION_MAX_LINES = 10
const DEFAULT_ANNOTATION_MAX_LINE_LENGTH = 400

export function renderForAnnotation(
  md: string,
  opts: RenderForAnnotationOptions = {}
): { label?: string; labelMarkdown?: string } {
  const maxLines = opts.maxLines ?? DEFAULT_ANNOTATION_MAX_LINES
  const maxLineLen = opts.maxLineLength ?? DEFAULT_ANNOTATION_MAX_LINE_LENGTH
  const plainOnly = opts.plainOnly ?? false

  const lines = md
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)
    .slice(0, maxLines)

  if (plainOnly) {
    const plain = lines
      .map(l => stripMarkdownToPlain(l))
      .map(l => l.slice(0, maxLineLen))
      .join('\n')
    return { label: plain }
  }

  const markdownLite = lines
    .map(l => {
      if (l.startsWith('## ')) return l
      return l
    })
    .map(l => l.slice(0, maxLineLen))
    .join('\n')
  return { labelMarkdown: markdownLite }
}

function stripMarkdownToPlain(line: string): string {
  return line
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/\*([^*]+)\*/g, '$1')
    .replace(/^#+\s+/, '')
    .trim()
}

// ---- Smart Detector Report ----

/** Minimal shape for formatSmartDetectorReport; avoids importing detection layer. */
export interface SmartDetectorReportInput {
  stats: {
    nodesScanned: number
    capped?: boolean
    elementsByKind: Record<string, number>
    contentByKind: Record<string, number>
    patternCount: number
  }
  elements: Array<{ kind: string; confidence: string; reasons: string[]; labelGuess?: string }>
  content: Array<{ contentKind: string; confidence: string; text: string }>
}

const TOP_PREVIEW = 5
const MAX_PER_KIND = 2

type ElementLike = { kind: string; confidence: string; reasons: string[]; labelGuess?: string }

/** Select elements so kinds with count > 1 get up to min(2, count) entries; then fill remaining slots. */
function selectTopElements(
  elements: ElementLike[],
  elementsByKind: Record<string, number>,
  maxTotal: number
): ElementLike[] {
  const confidenceRank = (c: string) => (c === 'high' ? 2 : c === 'med' ? 1 : 0)
  const byKind = new Map<string, ElementLike[]>()
  for (const e of elements) {
    const list = byKind.get(e.kind) ?? []
    list.push(e)
    byKind.set(e.kind, list)
  }
  for (const list of Array.from(byKind.values())) {
    list.sort((a: ElementLike, b: ElementLike) => confidenceRank(b.confidence) - confidenceRank(a.confidence))
  }

  const selected: ElementLike[] = []
  const used = new Set<number>()

  const takeFromKind = (kind: string, max: number) => {
    const list = byKind.get(kind) ?? []
    let taken = 0
    for (let i = 0; i < list.length && taken < max; i++) {
      const idx = elements.indexOf(list[i])
      if (idx >= 0 && !used.has(idx)) {
        used.add(idx)
        selected.push(list[i])
        taken++
      }
    }
  }

  for (const [kind, count] of Object.entries(elementsByKind)) {
    if (count > 1) {
      takeFromKind(kind, Math.min(MAX_PER_KIND, count))
    }
  }

  const remaining = elements
    .map((e, i) => ({ e, i }))
    .filter(({ i }) => !used.has(i))
    .sort((a, b) => confidenceRank(b.e.confidence) - confidenceRank(a.e.confidence))

  for (const { e, i } of remaining) {
    if (selected.length >= maxTotal) break
    selected.push(e)
    used.add(i)
  }

  return selected
}

export function formatSmartDetectorReport(input: SmartDetectorReportInput): string {
  const { stats, elements, content } = input
  const lines: string[] = []

  lines.push('## Smart Detector')
  lines.push('')
  lines.push(
    `**Scanned:** ${stats.nodesScanned} nodes${stats.capped ? ' (capped)' : ''}\n` +
      `**Elements:** ${Object.entries(stats.elementsByKind).map(([k, v]) => `${k}=${v}`).join(', ') || '0'}\n` +
      `**Content:** ${Object.entries(stats.contentByKind).map(([k, v]) => `${k}=${v}`).join(', ') || '0'}\n` +
      `**Patterns:** ${stats.patternCount}`
  )
  lines.push('')

  const topElements = selectTopElements(elements, stats.elementsByKind, TOP_PREVIEW)
  if (topElements.length > 0) {
    lines.push('### Top Elements')
    lines.push('')
    for (const e of topElements) {
      const reasons = e.reasons.length ? e.reasons.join(', ') : 'none'
      const label = e.labelGuess ? e.labelGuess.slice(0, 60) : '—'
      lines.push(
        `**Kind:** ${e.kind}\n` +
          `**Confidence:** ${e.confidence}\n` +
          `**Label:** ${label}\n` +
          `**Reasons:** ${reasons}`
      )
      lines.push('')
    }
  }

  if (content.length > 0) {
    lines.push('### Top Content')
    lines.push('')
    for (let i = 0; i < Math.min(content.length, TOP_PREVIEW); i++) {
      const c = content[i]
      const preview = c.text.slice(0, 50) + (c.text.length > 50 ? '…' : '')
      lines.push(
        `**Kind:** ${c.contentKind}\n` +
          `**Confidence:** ${c.confidence}\n` +
          `**Text:** ${preview}`
      )
      lines.push('')
    }
  }

  return lines.join('\n').replace(/\n{3,}/g, '\n\n').trimEnd()
}

// ---- Guardrail: no raw HTML in Chat ----

export function sanitizeForChat(s: string): string {
  if (typeof s !== 'string') return ''
  const out = s
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/?b\b[^>]*>/gi, '')
    .replace(/<\/?i\b[^>]*>/gi, '')
    .replace(/<\/?strong\b[^>]*>/gi, '')
    .replace(/<\/?em\b[^>]*>/gi, '')
    .replace(/<[a-zA-Z][^>]*>/g, '')
    .replace(/<\/[a-zA-Z][^>]*>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  if (out !== s) {
    if (debug.isEnabled('trace:chat') || debug.isEnabled('richText')) {
      debug.scope('richText').log('sanitizeForChat: stripped raw HTML from message', { preview: s.slice(0, 80) })
    }
  }
  return out
}
