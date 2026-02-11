/**
 * Regression: score/scorecard enhancement must only run for design_critique.
 * Non-critique assistants (e.g. Smart Detector / general) must not get score nodes.
 */

import { parseRichText } from './parseRichText'
import { enhanceRichText } from './enhancers'

function hasScoreNodes(nodes: ReturnType<typeof enhanceRichText>): boolean {
  return nodes.some(n => n.type === 'score')
}

// Text that would match score pattern (e.g. Smart Detector summary containing "First: 3/100 (3%)")
const textWithScoreLikePattern = 'First: 3/100 (3%). Summary of findings.'

const astWithPattern = parseRichText(textWithScoreLikePattern)

// Non-critique: must NOT produce any score nodes
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
// Just ensure we don't crash; score nodes are allowed
if (enhancedCritique.length === 0) {
  console.error('[enhancers.test] FAIL: design_critique produced no nodes')
  process.exit(1)
}

console.log('[enhancers.test] PASS: score enhancement gated to design_critique')
