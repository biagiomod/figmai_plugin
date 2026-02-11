/**
 * Rich Text Enhancers — assistant-scoped pipeline
 *
 * Enhancements are opt-in per assistant via ENHANCERS_BY_ASSISTANT.
 * Only design_critique gets score/scorecard; others get no score nodes.
 */

import type { RichTextNode } from './types'
import { jsonToAst } from './jsonToAst'

export type EnhanceRichTextOptions = { assistantId?: string }

export type EnhancerFn = (nodes: RichTextNode[]) => RichTextNode[]

const DESIGN_CRITIQUE_ID = 'design_critique'

function detectScores(text: string): Array<{ value: number; max: number; label?: string; start: number; end: number }> {
  const scores: Array<{ value: number; max: number; label?: string; start: number; end: number }> = []
  const scorePattern = /(?:Score|score|Rating|rating)?\s*:?\s*(\d+)\s*\/\s*(\d+)/g
  let match
  while ((match = scorePattern.exec(text)) !== null) {
    const label = match[0].includes(':') ? match[0].split(':')[0].trim().toLowerCase() : undefined
    if (label && (label === 'generate' || label === 'progress' || label === 'processing')) continue
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
  const percentagePattern = /([A-Za-z]+)\s*:?\s*(\d+)(?:\s*%)?/g
  while ((match = percentagePattern.exec(text)) !== null) {
    const label = match[1].toLowerCase()
    if (label === 'generate' || label === 'progress' || label === 'processing') continue
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

/** Dedupe consecutive score nodes with same value/max/label. Exported for tests. */
export function dedupeScoreNodes(nodes: RichTextNode[]): RichTextNode[] {
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

/** Scorecard/score enhancer: JSON-to-AST + score pattern detection. For design_critique only. */
function scorecardEnhancer(nodes: RichTextNode[]): RichTextNode[] {
  const enhanced: RichTextNode[] = []
  for (const node of nodes) {
    if (node.type === 'paragraph') {
      const text = node.text
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
            if (beforeText) enhanced.push({ type: 'paragraph', text: beforeText, inline: node.inline })
          }
          enhanced.push({ type: 'score', value: score.value, max: score.max, label: score.label })
          lastIndex = score.end
        }
        if (lastIndex < text.length) {
          const remaining = text.substring(lastIndex).trim()
          if (remaining) enhanced.push({ type: 'paragraph', text: remaining, inline: node.inline })
        }
        continue
      }
      enhanced.push(node)
    } else if (node.type === 'heading') {
      const text = node.text
      const scores = detectScores(text)
      if (scores.length > 0) {
        let lastIndex = 0
        for (const score of scores) {
          if (score.start > lastIndex) {
            const beforeText = text.substring(lastIndex, score.start).trim()
            if (beforeText) enhanced.push({ type: 'heading', level: node.level, text: beforeText })
          }
          enhanced.push({ type: 'score', value: score.value, max: score.max, label: score.label })
          lastIndex = score.end
        }
        if (lastIndex < text.length) {
          const remaining = text.substring(lastIndex).trim()
          if (remaining) enhanced.push({ type: 'heading', level: node.level, text: remaining })
        }
        continue
      }
      enhanced.push(node)
    } else {
      enhanced.push(node)
    }
  }
  return dedupeScoreNodes(enhanced)
}

/** Registry: which enhancers run per assistant. Default = no enhancers (passthrough). */
export const ENHANCERS_BY_ASSISTANT: Record<string, EnhancerFn[]> = {
  [DESIGN_CRITIQUE_ID]: [scorecardEnhancer],
  default: []
}

/** Get enhancers for an assistant (or default). */
function getEnhancersForAssistant(assistantId: string | undefined): EnhancerFn[] {
  if (!assistantId) return ENHANCERS_BY_ASSISTANT.default
  return ENHANCERS_BY_ASSISTANT[assistantId] ?? ENHANCERS_BY_ASSISTANT.default
}

/**
 * Run the assistant-scoped enhancer pipeline.
 * Only assistants listed in ENHANCERS_BY_ASSISTANT get enhancements (e.g. design_critique gets scorecard).
 */
export function enhanceRichText(nodes: RichTextNode[], options?: EnhanceRichTextOptions): RichTextNode[] {
  const assistantId = options?.assistantId
  const enhancers = getEnhancersForAssistant(assistantId)
  let result = nodes
  for (const enhancer of enhancers) {
    result = enhancer(result)
  }
  return result
}

/**
 * Estimate total text length from enhanced nodes (for inflation guard).
 * Sums node text lengths; list/scorecard types use a fixed estimate.
 */
export function estimateEnhancedTextLength(nodes: RichTextNode[]): number {
  let len = 0
  for (const node of nodes) {
    const n = node as { text?: string; type?: string; items?: unknown[] }
    if (n.text != null && typeof n.text === 'string') {
      len += n.text.length
    } else if (n.items && Array.isArray(n.items)) {
      for (const item of n.items as unknown[]) {
        if (Array.isArray(item)) {
          for (const inner of item as { text?: string }[]) {
            if (inner?.text) len += inner.text.length
          }
        } else if (typeof item === 'string') {
          len += item.length
        }
      }
    } else {
      len += 80
    }
  }
  return len
}
