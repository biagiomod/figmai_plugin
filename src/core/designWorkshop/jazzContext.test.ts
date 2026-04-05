/**
 * Tests for jazzContext.ts — JAZZ_CONTEXT_BLOCK and WIREFRAME_CONTEXT_BLOCK exports.
 * Run: npx tsx src/core/designWorkshop/jazzContext.test.ts
 */

import assert from 'node:assert'
import { JAZZ_CONTEXT_BLOCK, WIREFRAME_CONTEXT_BLOCK } from './jazzContext'

function test_WIREFRAME_CONTEXT_BLOCK_is_exported_as_non_empty_string() {
  assert.strictEqual(typeof WIREFRAME_CONTEXT_BLOCK, 'string')
  assert.ok(WIREFRAME_CONTEXT_BLOCK.length > 0, 'WIREFRAME_CONTEXT_BLOCK must be non-empty')
}

function test_WIREFRAME_CONTEXT_BLOCK_contains_no_jazz_color_tokens() {
  assert.ok(
    !WIREFRAME_CONTEXT_BLOCK.includes('#005EB8'),
    'WIREFRAME_CONTEXT_BLOCK must not contain Jazz primary blue #005EB8'
  )
  assert.ok(
    !WIREFRAME_CONTEXT_BLOCK.includes('#128842'),
    'WIREFRAME_CONTEXT_BLOCK must not contain Jazz CTA green #128842'
  )
}

function test_WIREFRAME_CONTEXT_BLOCK_contains_required_keywords() {
  assert.ok(
    WIREFRAME_CONTEXT_BLOCK.includes('8px'),
    'WIREFRAME_CONTEXT_BLOCK must mention 8px corner radius'
  )
  assert.ok(
    WIREFRAME_CONTEXT_BLOCK.includes('wireframe'),
    'WIREFRAME_CONTEXT_BLOCK must mention wireframe fidelity'
  )
  assert.ok(
    WIREFRAME_CONTEXT_BLOCK.includes('semantic'),
    'WIREFRAME_CONTEXT_BLOCK must mention semantic content preservation'
  )
}

function test_JAZZ_CONTEXT_BLOCK_contains_dashboard_data_blocks() {
  assert.ok(
    JAZZ_CONTEXT_BLOCK.includes('metricsGrid'),
    'JAZZ_CONTEXT_BLOCK must contain metricsGrid in dashboard archetype'
  )
  assert.ok(
    JAZZ_CONTEXT_BLOCK.includes('watchlist'),
    'JAZZ_CONTEXT_BLOCK must contain watchlist in dashboard archetype'
  )
  assert.ok(
    JAZZ_CONTEXT_BLOCK.includes('allocation'),
    'JAZZ_CONTEXT_BLOCK must contain allocation in dashboard archetype'
  )
}

function main() {
  test_WIREFRAME_CONTEXT_BLOCK_is_exported_as_non_empty_string()
  test_WIREFRAME_CONTEXT_BLOCK_contains_no_jazz_color_tokens()
  test_WIREFRAME_CONTEXT_BLOCK_contains_required_keywords()
  test_JAZZ_CONTEXT_BLOCK_contains_dashboard_data_blocks()
  console.log('[jazzContext] All tests passed.')
}

main()
