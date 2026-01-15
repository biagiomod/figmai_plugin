/**
 * Rich Text Enhancers
 * Detect and enhance AST nodes with semantic information
 * (e.g., scores, highlights, badges)
 */

import type { RichTextNode } from './types'
import { jsonToAst } from './jsonToAst'

/**
 * Detect score patterns in text and convert to score nodes
 * Patterns: "Score: 82/100", "82/100", "Accessibility: 70"
 */
function detectScores(text: string): Array<{ value: number; max: number; label?: string; start: number; end: number }> {
  const scores: Array<{ value: number; max: number; label?: string; start: number; end: number }> = []

  // Pattern: "Score: 82/100" or "82/100"
  // Exclude progress indicators like "generate: 1/100"
  const scorePattern = /(?:Score|score|Rating|rating)?\s*:?\s*(\d+)\s*\/\s*(\d+)/g
  let match
  while ((match = scorePattern.exec(text)) !== null) {
    const label = match[0].includes(':') ? match[0].split(':')[0].trim().toLowerCase() : undefined
    // Skip progress-related labels (generate, progress, etc.)
    if (label && (label === 'generate' || label === 'progress' || label === 'processing')) {
      continue
    }
    const value = parseInt(match[1], 10)
    const max = parseInt(match[2], 10)
    scores.push({
      value,
      max,
      label: match[0].includes(':') ? match[0].split(':')[0].trim() : undefined,
      start: match.index,
      end: match.index + match[0].length
    })
  }

  // Pattern: "Accessibility: 70" (assumes max 100)
  // Exclude progress indicators like "generate: 1" or "generate: 1/100"
  const percentagePattern = /([A-Za-z]+)\s*:?\s*(\d+)(?:\s*%)?/g
  while ((match = percentagePattern.exec(text)) !== null) {
    const label = match[1].toLowerCase()
    // Skip progress-related labels (generate, progress, etc.)
    if (label === 'generate' || label === 'progress' || label === 'processing') {
      continue
    }
    const value = parseInt(match[2], 10)
    if (value >= 0 && value <= 100) {
      scores.push({
        value,
        max: 100,
        label: match[1],
        start: match.index,
        end: match.index + match[0].length
      })
    }
  }

  return scores
}

/**
 * Enhance AST nodes with semantic information
 * Detects scores, structured JSON, and other patterns
 */
export function enhanceRichText(nodes: RichTextNode[]): RichTextNode[] {
  const enhanced: RichTextNode[] = []

  for (const node of nodes) {
    // Check for structured JSON in paragraph nodes
    if (node.type === 'paragraph') {
      const text = node.text
      
      // Try to convert JSON to structured nodes
      const jsonNodes = jsonToAst(text)
      if (jsonNodes && jsonNodes.length > 0) {
        // If JSON conversion succeeded, use those nodes instead
        enhanced.push(...jsonNodes)
        continue
      }
      
      // Otherwise, check for score patterns
      const scores = detectScores(text)

      if (scores.length > 0) {
        // Split text around scores and create score nodes
        let lastIndex = 0
        for (const score of scores) {
          // Add text before score
          if (score.start > lastIndex) {
            const beforeText = text.substring(lastIndex, score.start).trim()
            if (beforeText) {
              enhanced.push({
                type: 'paragraph',
                text: beforeText,
                inline: node.inline
              })
            }
          }

          // Add score node
          enhanced.push({
            type: 'score',
            value: score.value,
            max: score.max,
            label: score.label
          })

          lastIndex = score.end
        }

        // Add remaining text
        if (lastIndex < text.length) {
          const remaining = text.substring(lastIndex).trim()
          if (remaining) {
            enhanced.push({
              type: 'paragraph',
              text: remaining,
              inline: node.inline
            })
          }
        }
      } else {
        enhanced.push(node)
      }
    } else if (node.type === 'heading') {
      const text = node.text
      const scores = detectScores(text)

      if (scores.length > 0) {
        // Split text around scores and create score nodes
        let lastIndex = 0
        for (const score of scores) {
          // Add text before score
          if (score.start > lastIndex) {
            const beforeText = text.substring(lastIndex, score.start).trim()
            if (beforeText) {
              enhanced.push({
                type: 'heading',
                level: node.level,
                text: beforeText
              })
            }
          }

          // Add score node
          enhanced.push({
            type: 'score',
            value: score.value,
            max: score.max,
            label: score.label
          })

          lastIndex = score.end
        }

        // Add remaining text
        if (lastIndex < text.length) {
          const remaining = text.substring(lastIndex).trim()
          if (remaining) {
            enhanced.push({
              type: 'heading',
              level: node.level,
              text: remaining
            })
          }
        }
      } else {
        enhanced.push(node)
      }
    } else {
      enhanced.push(node)
    }
  }

  return enhanced
}

