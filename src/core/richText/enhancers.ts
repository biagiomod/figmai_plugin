/**
 * Rich Text Enhancers
 * Detect and enhance AST nodes with semantic information
 * (e.g., scores, highlights, badges).
 * Score/scorecard enhancement is gated to design_critique assistant only.
 */

import type { RichTextNode } from './types'
import { jsonToAst } from './jsonToAst'

export type EnhanceRichTextOptions = { assistantId?: string }

const DESIGN_CRITIQUE_ID = 'design_critique'

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

/** Only run score/scorecard enhancement when assistant is Design Critique. */
function allowScorecard(options: EnhanceRichTextOptions | undefined): boolean {
  return options?.assistantId === DESIGN_CRITIQUE_ID
}

/** Dedupe consecutive score nodes with same value/max/label so each score renders at most once. */
function dedupeScoreNodes(nodes: RichTextNode[]): RichTextNode[] {
  const out: RichTextNode[] = []
  for (const node of nodes) {
    if (node.type === 'score') {
      const last = out[out.length - 1]
      if (
        last?.type === 'score' &&
        last.value === node.value &&
        last.max === node.max &&
        (last.label ?? '') === (node.label ?? '')
      ) {
        continue
      }
    }
    out.push(node)
  }
  return out
}

/**
 * Enhance AST nodes with semantic information.
 * Score/scorecard detection and JSON-to-AST conversion run only when assistantId === 'design_critique'.
 */
export function enhanceRichText(nodes: RichTextNode[], options?: EnhanceRichTextOptions): RichTextNode[] {
  const enhanced: RichTextNode[] = []
  const runScorecard = allowScorecard(options)

  for (const node of nodes) {
    if (node.type === 'paragraph') {
      const text = node.text

      if (runScorecard) {
        const jsonNodes = jsonToAst(text)
        if (jsonNodes && jsonNodes.length > 0) {
          enhanced.push(...jsonNodes)
          continue
        }

        const scores = detectScores(text)
        if (scores.length > 0) {
          let lastIndex = 0
          for (const score of scores) {
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
            enhanced.push({
              type: 'score',
              value: score.value,
              max: score.max,
              label: score.label
            })
            lastIndex = score.end
          }
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
          continue
        }
      }

      enhanced.push(node)
    } else if (node.type === 'heading') {
      const text = node.text

      if (runScorecard) {
        const scores = detectScores(text)
        if (scores.length > 0) {
          let lastIndex = 0
          for (const score of scores) {
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
            enhanced.push({
              type: 'score',
              value: score.value,
              max: score.max,
              label: score.label
            })
            lastIndex = score.end
          }
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
          continue
        }
      }

      enhanced.push(node)
    } else {
      enhanced.push(node)
    }
  }

  return dedupeScoreNodes(enhanced)
}

