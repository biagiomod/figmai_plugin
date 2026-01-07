/**
 * Normalizers: Convert LLM responses to Document IR
 */

import type { Document, ScorecardBlock } from '../ir'
import type { ScorecardData } from '../../figma/renderScorecard'

/**
 * Extract JSON from response (handles multiple formats)
 * Returns the extracted JSON string, or null if not found
 */
export function extractJsonFromResponse(response: string): string | null {
  const raw = response.trim()
  
  // Step 1: Try direct parse (response is already valid JSON)
  try {
    const parsed = JSON.parse(raw)
    if (typeof parsed === 'object' && parsed !== null) {
      return raw
    }
  } catch {
    // Continue to extraction
  }
  
  // Step 2: Try to find JSON in markdown code fence
  const jsonFenceMatch = raw.match(/```(?:json)?\s*([\s\S]*?)```/)
  if (jsonFenceMatch && jsonFenceMatch[1]) {
    const extracted = jsonFenceMatch[1].trim()
    // Validate it's actually JSON
    try {
      JSON.parse(extracted)
      return extracted
    } catch {
      // Not valid JSON, continue
    }
  }
  
  // Step 3: Find first balanced JSON object
  const firstBrace = raw.indexOf('{')
  if (firstBrace === -1) {
    return null
  }
  
  // Track depth, handle strings and escaped quotes
  let depth = 0
  let inString = false
  let escapeNext = false
  let start = firstBrace
  let end = -1
  
  for (let i = firstBrace; i < raw.length; i++) {
    const char = raw[i]
    
    if (escapeNext) {
      escapeNext = false
      continue
    }
    
    if (char === '\\') {
      escapeNext = true
      continue
    }
    
    if (char === '"') {
      inString = !inString
      continue
    }
    
    if (inString) {
      continue
    }
    
    if (char === '{') {
      depth++
    } else if (char === '}') {
      depth--
      if (depth === 0) {
        end = i
        break
      }
    }
  }
  
  if (depth !== 0 || end === -1) {
    return null
  }
  
  const extracted = raw.substring(start, end + 1).trim()
  
  // Validate it's actually JSON
  try {
    JSON.parse(extracted)
    return extracted
  } catch {
    return null
  }
}

/**
 * Parse Design Critique JSON response into Scorecard block (IR format)
 */
export function fromDesignCritiqueJson(response: string): ScorecardBlock | null {
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
 * Parse and validate Design Critique JSON into ScorecardData
 * Returns ScorecardData if valid, null if invalid
 * Logs explicit validation errors for debugging
 */
export function parseScorecardJson(
  response: string,
  debug: boolean = false
): { data: ScorecardData } | { error: string } {
  const raw = response.trim()
  
  if (debug) {
    console.log('[parseScorecardJson] Raw response (first 500 chars):', raw.substring(0, 500))
  }
  
  // Extract JSON
  const jsonString = extractJsonFromResponse(raw)
  if (!jsonString) {
    const extractionMethod = raw.match(/```(?:json)?\s*([\s\S]*?)```/) ? 'code fence' : 'balanced JSON'
    if (debug) {
      console.log('[parseScorecardJson] ❌ Failed to extract JSON, method attempted:', extractionMethod)
    }
    return { error: 'No valid JSON object found in response' }
  }
  
  if (debug) {
    const extractionMethod = raw.startsWith('{') ? 'direct' : raw.match(/```(?:json)?\s*([\s\S]*?)```/) ? 'code fence' : 'balanced'
    console.log('[parseScorecardJson] ✅ JSON extracted, method:', extractionMethod)
  }
  
  // Parse JSON
  let parsed: any
  try {
    parsed = JSON.parse(jsonString)
  } catch (e) {
    if (debug) {
      console.log('[parseScorecardJson] ❌ JSON parse error:', e)
    }
    return { error: 'JSON parse error: ' + (e instanceof Error ? e.message : String(e)) }
  }
  
  if (debug) {
    console.log('[parseScorecardJson] Parsed top-level keys:', Object.keys(parsed))
  }
  
  // Validate required fields
  const score = parsed.score ?? parsed.overallScore
  if (score === undefined || score === null) {
    if (debug) {
      console.log('[parseScorecardJson] ❌ Validation failure: Missing score field')
    }
    return { error: 'Missing required field: score' }
  }
  
  if (typeof score !== 'number') {
    if (debug) {
      console.log('[parseScorecardJson] ❌ Validation failure: score is not a number:', typeof score, score)
    }
    return { error: 'Invalid score: must be a number' }
  }
  
  if (score < 0 || score > 100) {
    if (debug) {
      console.log('[parseScorecardJson] ❌ Validation failure: score out of range:', score)
    }
    return { error: `Invalid score: must be between 0 and 100, got ${score}` }
  }
  
  if (!Array.isArray(parsed.wins)) {
    if (debug) {
      console.log('[parseScorecardJson] ❌ Validation failure: wins is not an array:', typeof parsed.wins)
    }
    return { error: 'Missing or invalid wins: must be an array' }
  }
  
  if (!Array.isArray(parsed.fixes)) {
    if (debug) {
      console.log('[parseScorecardJson] ❌ Validation failure: fixes is not an array:', typeof parsed.fixes)
    }
    return { error: 'Missing or invalid fixes: must be an array' }
  }
  
  // Build ScorecardData
  const data: ScorecardData = {
    score: score,
    summary: typeof parsed.summary === 'string' ? parsed.summary : '',
    wins: parsed.wins.map((w: any) => String(w)),
    fixes: parsed.fixes.map((f: any) => String(f)),
    checklist: Array.isArray(parsed.checklist) ? parsed.checklist.map((c: any) => String(c)) : [],
    notes: Array.isArray(parsed.notes) ? parsed.notes.map((n: any) => String(n)) : undefined
  }
  
  if (debug) {
    console.log('[parseScorecardJson] ✅ Validation passed')
    console.log('[parseScorecardJson] Score:', data.score)
    console.log('[parseScorecardJson] Wins:', data.wins.length)
    console.log('[parseScorecardJson] Fixes:', data.fixes.length)
    console.log('[parseScorecardJson] Checklist:', data.checklist.length)
    console.log('[parseScorecardJson] Notes:', data.notes?.length ?? 0)
  }
  
  return { data }
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
