/**
 * JSON to AST Converter
 * Converts structured JSON responses from assistants into RichText AST nodes
 * This enables deterministic rendering of structured data without interpretation
 */

import type { RichTextNode } from './types'

/**
 * Design Critique JSON structure
 */
interface DesignCritiqueJson {
  score?: number
  wins?: string[]
  fixes?: string[]
  checklist?: string[]
  notes?: string
}

/**
 * UX Copy Review JSON structure (example - can be extended)
 */
interface UXCopyReviewJson {
  scores?: {
    clarity?: number
    tone?: number
    conciseness?: number
    actionability?: number
    [key: string]: number | undefined
  }
  strengths?: string[]
  issues?: string[]
  recommendations?: string[]
  notes?: string
}

/**
 * Generic structured JSON that might contain common patterns
 */
type StructuredJson = DesignCritiqueJson | UXCopyReviewJson | Record<string, unknown>

/**
 * Check if a string contains valid JSON
 * Handles JSON that may be wrapped in markdown code blocks or have surrounding text
 */
function tryParseJson(text: string): StructuredJson | null {
  try {
    // First, try to parse the entire text as JSON
    const trimmed = text.trim()
    if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
      return JSON.parse(trimmed) as StructuredJson
    }
    
    // Try to find JSON object in text (may have markdown around it)
    // Look for the first { and matching }
    let braceCount = 0
    let startIndex = -1
    for (let i = 0; i < text.length; i++) {
      if (text[i] === '{') {
        if (startIndex === -1) startIndex = i
        braceCount++
      } else if (text[i] === '}') {
        braceCount--
        if (braceCount === 0 && startIndex !== -1) {
          const jsonStr = text.substring(startIndex, i + 1)
          return JSON.parse(jsonStr) as StructuredJson
        }
      }
    }
    
    // Try regex as fallback
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0]) as StructuredJson
    }
  } catch {
    // Not valid JSON
  }
  return null
}

/**
 * Convert Design Critique JSON to AST nodes
 */
function convertDesignCritique(
  json: DesignCritiqueJson
): RichTextNode[] {
  const nodes: RichTextNode[] = []

  // Create scorecard if score exists
  if (json.score !== undefined) {
    nodes.push({
      type: 'scorecard',
      score: json.score,
      max: 100,
      wins: json.wins || [],
      fixes: json.fixes || [],
      checklist: json.checklist || [],
      notes: json.notes
    })
  } else {
    // If no score, render other fields as separate components
    if (json.wins && json.wins.length > 0) {
      nodes.push({
        type: 'strengths',
        items: json.wins
      })
    }
    if (json.fixes && json.fixes.length > 0) {
      nodes.push({
        type: 'issues',
        items: json.fixes
      })
    }
    if (json.checklist && json.checklist.length > 0) {
      // Render checklist as a regular list
      nodes.push({
        type: 'list',
        ordered: false,
        items: json.checklist.map(item => [{ type: 'text', text: item }])
      })
    }
    if (json.notes) {
      nodes.push({
        type: 'paragraph',
        text: json.notes,
        inline: [{ type: 'text', text: json.notes }]
      })
    }
  }

  return nodes
}

/**
 * Convert UX Copy Review JSON to AST nodes
 */
function convertUXCopyReview(json: UXCopyReviewJson): RichTextNode[] {
  const nodes: RichTextNode[] = []

  // Render scores if present
  if (json.scores) {
    const scoreEntries = Object.entries(json.scores).filter(
      ([_, value]) => typeof value === 'number'
    )
    if (scoreEntries.length > 0) {
      for (const [label, value] of scoreEntries) {
        nodes.push({
          type: 'score',
          value: value as number,
          max: 100,
          label: label.charAt(0).toUpperCase() + label.slice(1)
        })
      }
    }
  }

  // Render strengths
  if (json.strengths && json.strengths.length > 0) {
    nodes.push({
      type: 'strengths',
      items: json.strengths
    })
  }

  // Render issues
  if (json.issues && json.issues.length > 0) {
    nodes.push({
      type: 'issues',
      items: json.issues
    })
  }

  // Render recommendations
  if (json.recommendations && json.recommendations.length > 0) {
    nodes.push({
      type: 'recommendations',
      items: json.recommendations
    })
  }

  // Render notes
  if (json.notes) {
    nodes.push({
      type: 'paragraph',
      text: json.notes,
      inline: [{ type: 'text', text: json.notes }]
    })
  }

  return nodes
}

/**
 * Detect JSON structure type and convert to AST
 */
function detectAndConvert(json: StructuredJson): RichTextNode[] {
  // Check for Design Critique structure
  if (
    typeof (json as DesignCritiqueJson).score === 'number' ||
    ((json as DesignCritiqueJson).wins !== undefined ||
      (json as DesignCritiqueJson).fixes !== undefined ||
      (json as DesignCritiqueJson).checklist !== undefined)
  ) {
    return convertDesignCritique(json as DesignCritiqueJson)
  }

  // Check for UX Copy Review structure
  if (
    (json as UXCopyReviewJson).scores !== undefined ||
    (json as UXCopyReviewJson).strengths !== undefined ||
    (json as UXCopyReviewJson).issues !== undefined ||
    (json as UXCopyReviewJson).recommendations !== undefined
  ) {
    return convertUXCopyReview(json as UXCopyReviewJson)
  }

  // Generic fallback: try to extract common patterns
  const nodes: RichTextNode[] = []
  const obj = json as Record<string, unknown>

  // Look for common field names
  if (Array.isArray(obj.strengths)) {
    nodes.push({
      type: 'strengths',
      items: obj.strengths as string[]
    })
  }
  if (Array.isArray(obj.issues)) {
    nodes.push({
      type: 'issues',
      items: obj.issues as string[]
    })
  }
  if (Array.isArray(obj.recommendations)) {
    nodes.push({
      type: 'recommendations',
      items: obj.recommendations as string[]
    })
  }
  if (Array.isArray(obj.nextSteps)) {
    nodes.push({
      type: 'nextSteps',
      items: obj.nextSteps as string[]
    })
  }
  if (typeof obj.warning === 'string') {
    nodes.push({
      type: 'warning',
      message: obj.warning,
      title: typeof obj.warningTitle === 'string' ? obj.warningTitle : undefined
    })
  }

  return nodes
}

/**
 * Convert JSON string to RichText AST nodes
 * Returns null if no valid JSON found or conversion fails
 */
export function jsonToAst(text: string): RichTextNode[] | null {
  const json = tryParseJson(text)
  if (!json) {
    return null
  }

  const nodes = detectAndConvert(json)
  return nodes.length > 0 ? nodes : null
}

/**
 * Check if text contains structured JSON that should be converted
 */
export function hasStructuredJson(text: string): boolean {
  const json = tryParseJson(text)
  if (!json) {
    return false
  }

  // Check if it matches known structures
  const obj = json as Record<string, unknown>
  return (
    typeof obj.score === 'number' ||
    Array.isArray(obj.wins) ||
    Array.isArray(obj.fixes) ||
    Array.isArray(obj.checklist) ||
    typeof obj.scores === 'object' ||
    Array.isArray(obj.strengths) ||
    Array.isArray(obj.issues) ||
    Array.isArray(obj.recommendations) ||
    Array.isArray(obj.nextSteps) ||
    typeof obj.warning === 'string'
  )
}

