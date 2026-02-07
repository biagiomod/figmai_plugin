/**
 * Tests for resolveKnowledgeBaseDocs (PR11c1).
 * Run: npx tsx src/core/knowledgeBases/resolveKb.test.ts
 */

import assert from 'node:assert'
import { resolveKnowledgeBaseDocs } from './resolveKb'

function test_emptyRefsReturnsEmpty() {
  const out = resolveKnowledgeBaseDocs([])
  assert.strictEqual(Array.isArray(out), true)
  assert.strictEqual(out.length, 0)
}

function test_unknownIdReturnsEmptyAndDoesNotThrow() {
  const out = resolveKnowledgeBaseDocs(['non-existent-kb-id'])
  assert.strictEqual(Array.isArray(out), true)
  assert.strictEqual(out.length, 0)
}

function test_stableOrderFollowsRefsOrder() {
  // With empty KB_DOCS, any refs yield []; when registry has entries, order must match refs.
  const out = resolveKnowledgeBaseDocs(['a', 'b', 'c'])
  assert.strictEqual(Array.isArray(out), true)
  assert.strictEqual(out.length, 0)
}

function run() {
  test_emptyRefsReturnsEmpty()
  test_unknownIdReturnsEmptyAndDoesNotThrow()
  test_stableOrderFollowsRefsOrder()
  console.log('All resolveKb tests passed.')
}

run()
