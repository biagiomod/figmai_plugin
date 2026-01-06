/**
 * Rich Text Parser
 * Converts Markdown-like text into a structured AST
 */

import type { RichTextNode, InlineNode } from './types'

/**
 * Parse inline formatting (bold, italic, code) within a text string
 */
function parseInline(text: string): InlineNode[] {
  const nodes: InlineNode[] = []
  let currentIndex = 0

  // Patterns for inline formatting
  const patterns = [
    { regex: /\*\*([^*]+)\*\*/g, type: 'bold' as const },
    { regex: /\*([^*]+)\*/g, type: 'italic' as const },
    { regex: /`([^`]+)`/g, type: 'code' as const },
    { regex: /\[([^\]]+)\]\(([^)]+)\)/g, type: 'link' as const }
  ]

  // Find all matches with their positions
  const matches: Array<{
    start: number
    end: number
    type: 'bold' | 'italic' | 'code' | 'link'
    text: string
    url?: string
  }> = []

  for (const pattern of patterns) {
    let match
    const regex = new RegExp(pattern.regex.source, 'g')
    while ((match = regex.exec(text)) !== null) {
      matches.push({
        start: match.index,
        end: match.index + match[0].length,
        type: pattern.type,
        text: pattern.type === 'link' ? match[1] : match[1],
        url: pattern.type === 'link' ? match[2] : undefined
      })
    }
  }

  // Sort matches by position
  matches.sort((a, b) => a.start - b.start)

  // Build nodes, handling overlaps (first match wins)
  for (const match of matches) {
    // Add text before match
    if (match.start > currentIndex) {
      const beforeText = text.substring(currentIndex, match.start)
      if (beforeText) {
        nodes.push({ type: 'text', text: beforeText })
      }
    }

    // Skip if this match overlaps with a previous one
    if (match.start < currentIndex) {
      continue
    }

    // Add formatted node
    if (match.type === 'link') {
      nodes.push({ type: 'link', text: match.text, url: match.url || '' })
    } else {
      nodes.push({ type: match.type, text: match.text })
    }

    currentIndex = match.end
  }

  // Add remaining text
  if (currentIndex < text.length) {
    const remaining = text.substring(currentIndex)
    if (remaining) {
      nodes.push({ type: 'text', text: remaining })
    }
  }

  // If no formatting found, return single text node
  if (nodes.length === 0) {
    return [{ type: 'text', text }]
  }

  return nodes
}

/**
 * Parse a single line for inline formatting
 */
function parseLine(line: string): InlineNode[] {
  return parseInline(line.trim())
}

/**
 * Main parser: Convert Markdown-like text into RichTextNode[]
 */
export function parseRichText(input: string): RichTextNode[] {
  if (!input || typeof input !== 'string') {
    return [{ type: 'paragraph', text: '' }]
  }

  const nodes: RichTextNode[] = []
  const lines = input.split('\n')
  let i = 0

  while (i < lines.length) {
    const line = lines[i]
    const trimmed = line.trim()

    // Empty line
    if (!trimmed) {
      i++
      continue
    }

    // Heading (#, ##, ###)
    const headingMatch = trimmed.match(/^(#{1,3})\s+(.+)$/)
    if (headingMatch) {
      const level = headingMatch[1].length as 1 | 2 | 3
      const text = headingMatch[2].trim()
      nodes.push({ type: 'heading', level, text })
      i++
      continue
    }

    // Code block (```)
    if (trimmed.startsWith('```')) {
      const language = trimmed.slice(3).trim()
      const codeLines: string[] = []
      i++

      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i])
        i++
      }

      const codeText = codeLines.join('\n').trim()
      nodes.push({ type: 'code', inline: false, text: codeText })
      i++
      continue
    }

    // Blockquote (>)
    if (trimmed.startsWith('>')) {
      const quoteText = trimmed.slice(1).trim()
      const inline = parseLine(quoteText)
      nodes.push({ type: 'quote', text: quoteText, inline })
      i++
      continue
    }

    // Unordered list (-, *)
    if (/^[-*]\s+/.test(trimmed)) {
      const items: InlineNode[][] = []
      while (i < lines.length && /^[-*]\s+/.test(lines[i].trim())) {
        const itemText = lines[i].trim().replace(/^[-*]\s+/, '')
        items.push(parseLine(itemText))
        i++
      }
      nodes.push({ type: 'list', ordered: false, items })
      continue
    }

    // Ordered list (1., 2., etc.)
    if (/^\d+\.\s+/.test(trimmed)) {
      const items: InlineNode[][] = []
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        const itemText = lines[i].trim().replace(/^\d+\.\s+/, '')
        items.push(parseLine(itemText))
        i++
      }
      nodes.push({ type: 'list', ordered: true, items })
      continue
    }

    // Horizontal rule (---)
    if (/^---+$/.test(trimmed)) {
      nodes.push({ type: 'divider' })
      i++
      continue
    }

    // Regular paragraph
    // Collect consecutive non-empty lines into a paragraph
    const paragraphLines: string[] = []
    while (i < lines.length) {
      const currentLine = lines[i].trim()
      if (!currentLine) break
      if (
        currentLine.startsWith('#') ||
        currentLine.startsWith('```') ||
        currentLine.startsWith('>') ||
        currentLine.startsWith('-') ||
        currentLine.startsWith('*') ||
        /^\d+\.\s+/.test(currentLine) ||
        /^---+$/.test(currentLine)
      ) {
        break
      }
      paragraphLines.push(lines[i])
      i++
    }

    if (paragraphLines.length > 0) {
      const paragraphText = paragraphLines.join(' ').trim()
      const inline = parseLine(paragraphText)
      nodes.push({ type: 'paragraph', text: paragraphText, inline })
    } else {
      i++
    }
  }

  // If no nodes were created, return a single paragraph
  if (nodes.length === 0) {
    return [{ type: 'paragraph', text: input.trim(), inline: parseLine(input.trim()) }]
  }

  return nodes
}



