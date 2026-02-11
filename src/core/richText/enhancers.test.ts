/**
 * Regression: score/scorecard enhancement gated to design_critique; dedupeScoreNodes collapses duplicates.
 */

import { parseRichText } from './parseRichText'
import { enhanceRichText, dedupeScoreNodes } from './enhancers'
import type { RichTextNode } from './types'

function hasScoreNodes(nodes: RichTextNode[]): boolean {
  return nodes.some(n => n.type === 'score')
}

// --- Gating: non-critique must not get score nodes ---
const textWithScoreLikePattern = 'First: 3/100 (3%). Summary of findings.'
const astWithPattern = parseRichText(textWithScoreLikePattern)

const enhancedGeneral = enhanceRichText(astWithPattern, { assistantId: 'general' })
const enhancedSmartDetector = enhanceRichText(astWithPattern, { assistantId: 'general' })

if (hasScoreNodes(enhancedGeneral) || hasScoreNodes(enhancedSmartDetector)) {
  console.error('[enhancers.test] FAIL: non-critique assistant got score nodes', {
    general: hasScoreNodes(enhancedGeneral),
    enhancedGeneralTypes: enhancedGeneral.map(n => n.type),
    enhancedSmartDetectorTypes: enhancedSmartDetector.map(n => n.type)
  })
  process.exit(1)
}

// Design critique: may produce score nodes when pattern exists
const enhancedCritique = enhanceRichText(astWithPattern, { assistantId: 'design_critique' })
if (enhancedCritique.length === 0) {
  console.error('[enhancers.test] FAIL: design_critique produced no nodes')
  process.exit(1)
}

// --- Dedupe: consecutive identical score nodes collapse to one ---
const duplicateScores: RichTextNode[] = [
  { type: 'score', value: 82, max: 100, label: 'Score' },
  { type: 'score', value: 82, max: 100, label: 'Score' },
  { type: 'score', value: 82, max: 100, label: 'Score' }
]
const deduped = dedupeScoreNodes(duplicateScores)
const scoreCount = deduped.filter(n => n.type === 'score').length
if (deduped.length !== 1 || scoreCount !== 1) {
  console.error('[enhancers.test] FAIL: dedupeScoreNodes should collapse 3 identical scores to 1', {
    dedupedLength: deduped.length,
    scoreCount
  })
  process.exit(1)
}

// Dedupe preserves distinct score nodes
const mixed: RichTextNode[] = [
  { type: 'score', value: 80, max: 100 },
  { type: 'score', value: 80, max: 100 },
  { type: 'score', value: 90, max: 100 }
]
const dedupedMixed = dedupeScoreNodes(mixed)
if (dedupedMixed.length !== 2) {
  console.error('[enhancers.test] FAIL: dedupeScoreNodes should keep two distinct scores', { dedupedLength: dedupedMixed.length })
  process.exit(1)
}

console.log('[enhancers.test] PASS: score gating + dedupeScoreNodes')
