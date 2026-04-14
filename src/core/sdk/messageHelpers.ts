// src/core/sdk/messageHelpers.ts
/**
 * Shared pure helpers for plugin-runtime message building.
 * Imported by main.ts and quickActionExecutor.ts.
 *
 * NOTE: ui.tsx keeps its own cleanChatContent — it has extra welcome-line
 * preservation logic that is UI-specific and not needed on the runtime side.
 */

/**
 * Generate a unique message ID.
 * Request IDs come from conversationManager; this is for individual message objects.
 */
export function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 11)}`
}

/**
 * Clean chat content by stripping internal generation metadata tags and
 * collapsing duplicate lines/paragraphs.
 */
export function cleanChatContent(raw: string): string {
  if (!raw) return ''

  // Strip internal generation metadata like: "generate: 1/100 (1%)"
  let text = raw
    .replace(/generate:\s*\d+\/\d+\s*\(\d+%\)/gi, '') // generate: X/Y (Z%)
    .replace(/generate:\s*\d+\/\d+/gi, '')             // generate: X/Y
    .replace(/\(\d+%\)/g, '')                          // standalone "(Z%)"
    .trim()

  // Remove duplicate lines (split by newlines, keep unique).
  // Preserve single blank lines for paragraph separation; collapse multiple consecutive blanks.
  // Never dedupe report key/value lines (e.g. "**Scanned:** 16 nodes") so Smart Detector body is preserved.
  const lines = text.split('\n')
  const uniqueLines: string[] = []
  const seen = new Set<string>()
  const keyValueLike = /^\s*\*\*[^*]+\*\*:?\s*.+/

  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed === '') {
      if (uniqueLines[uniqueLines.length - 1] !== '') uniqueLines.push('')
      continue
    }
    const normalized = trimmed.toLowerCase().replace(/\s+/g, ' ')
    if (keyValueLike.test(trimmed)) {
      uniqueLines.push(trimmed)
      continue
    }
    if (!seen.has(normalized)) {
      seen.add(normalized)
      uniqueLines.push(trimmed)
    }
  }

  text = uniqueLines.join('\n')
  text = text.replace(/[ \t]+/g, ' ').trim()

  return text
}
