/**
 * Normalizers: Convert LLM responses to Document IR
 */

import type { Document, ScorecardBlock } from '../ir'

/**
 * Parse Design Critique JSON response into Scorecard block
 */
export function fromDesignCritiqueJson(response: string): ScorecardBlock | null {
  // Extract JSON string (handles markdown fences)
  const jsonString = extractJsonFromResponse(response)
  if (!jsonString) {
    return null
  }

  // Parse JSON
  let parsed: any
  try {
    parsed = JSON.parse(jsonString)
  } catch {
    return null
  }

  // Validate minimal shape
  const score = parsed.score ?? parsed.overallScore
  if (typeof score !== 'number' || score < 0 || score > 100) {
    return null
  }

  if (!Array.isArray(parsed.wins) || !Array.isArray(parsed.fixes)) {
    return null
  }

  // Map to ScorecardBlock
  return {
    type: 'scorecard',
    score: score,
    summary: parsed.summary ?? '',
    wins: parsed.wins.map((w: any) => String(w)),
    fixes: parsed.fixes.map((f: any) => String(f)),
    checklist: Array.isArray(parsed.checklist) ? parsed.checklist.map((c: any) => String(c)) : undefined,
    notes: Array.isArray(parsed.notes) ? parsed.notes.map((n: any) => String(n)) : undefined
  }
}

/**
 * Extract JSON from response (handles markdown fences)
 */
function extractJsonFromResponse(response: string): string | null {
  // Try to find JSON in markdown code fence
  const jsonFenceMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (jsonFenceMatch && jsonFenceMatch[1]) {
    return jsonFenceMatch[1].trim()
  }

  // Find first { and last } and extract substring
  const firstBrace = response.indexOf('{')
  if (firstBrace === -1) {
    return null
  }

  // Find matching closing brace by tracking depth
  let depth = 0
  let lastBrace = firstBrace
  for (let i = firstBrace; i < response.length; i++) {
    if (response[i] === '{') {
      depth++
    } else if (response[i] === '}') {
      depth--
      if (depth === 0) {
        lastBrace = i
        break
      }
    }
  }

  if (depth !== 0) {
    return null
  }

  return response.substring(firstBrace, lastBrace + 1).trim()
}

/**
 * Convert markdown to Document blocks
 */
export function fromMarkdown(md: string): Document {
  const lines = md.split('\n')
  const blocks: Document['blocks'] = []
  let currentParagraph: string[] = []
  let currentList: string[] = []
  let listType: 'bullets' | 'numbered' | null = null

  function flushParagraph() {
    if (currentParagraph.length > 0) {
      const text = currentParagraph.join(' ').trim()
      if (text) {
        blocks.push({
          type: 'paragraph',
          text: text
        })
      }
      currentParagraph = []
    }
  }

  function flushList() {
    if (currentList.length > 0) {
      if (listType === 'bullets') {
        blocks.push({
          type: 'bullets',
          items: currentList
        })
      } else if (listType === 'numbered') {
        blocks.push({
          type: 'numbered',
          items: currentList
        })
      }
      currentList = []
      listType = null
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()

    // Empty line: flush current blocks
    if (!line) {
      flushParagraph()
      flushList()
      continue
    }

    // Heading
    const headingMatch = line.match(/^(#{1,3})\s+(.+)$/)
    if (headingMatch) {
      flushParagraph()
      flushList()
      const level = headingMatch[1].length as 1 | 2 | 3
      blocks.push({
        type: 'heading',
        level: level,
        text: headingMatch[2]
      })
      continue
    }

    // Unordered list
    const bulletMatch = line.match(/^[-*]\s+(.+)$/)
    if (bulletMatch) {
      flushParagraph()
      if (listType !== 'bullets') {
        flushList()
        listType = 'bullets'
      }
      currentList.push(bulletMatch[1])
      continue
    }

    // Ordered list
    const numberedMatch = line.match(/^\d+\.\s+(.+)$/)
    if (numberedMatch) {
      flushParagraph()
      if (listType !== 'numbered') {
        flushList()
        listType = 'numbered'
      }
      currentList.push(numberedMatch[1])
      continue
    }

    // Regular paragraph line
    flushList()
    currentParagraph.push(line)
  }

  // Flush remaining
  flushParagraph()
  flushList()

  return { blocks }
}

/**
 * Normalize Design Critique response to Document
 * Tries JSON scorecard first, falls back to markdown
 */
export function normalizeDesignCritique(response: string): Document {
  // Try JSON scorecard first
  const scorecard = fromDesignCritiqueJson(response)
  if (scorecard) {
    return {
      blocks: [scorecard]
    }
  }

  // Fallback to markdown
  return fromMarkdown(response)
}

