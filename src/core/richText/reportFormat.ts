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
