import assert from 'node:assert'

// nearMissDetector.ts imports getCategoryMapShared from ../figma/annotations.ts which
// references the figma global. Set up a minimal stub so the module loads outside the
// Figma runtime. getCategoryMapShared is lazy, so this stub is never actually called
// during these pure-function tests.
;(globalThis as unknown as { figma: unknown }).figma = { annotations: undefined }

import {
  normalizeTagKey,
  isNearMissScreenId,
  isNearMissActionId
} from '../src/core/analyticsTagging/nearMissDetector'

let passed = 0
let failed = 0

async function runTest(name: string, fn: () => void | Promise<void>) {
  try {
    await fn()
    passed++
    console.log(`  ✓ ${name}`)
  } catch (e: unknown) {
    failed++
    const err = e as Error
    console.error(`  ✗ ${name}`)
    console.error(`    ${err.message}`)
  }
}

async function run() {
  console.log('nearMissDetector.test.ts')

  // normalizeTagKey
  await runTest('normalizeTagKey: strips spaces', () => {
    assert.strictEqual(normalizeTagKey('Screen ID'), 'screenid')
  })
  await runTest('normalizeTagKey: strips underscores', () => {
    assert.strictEqual(normalizeTagKey('screen_id'), 'screenid')
  })
  await runTest('normalizeTagKey: lowercases', () => {
    assert.strictEqual(normalizeTagKey('SCREENID'), 'screenid')
  })
  await runTest('normalizeTagKey: mixed spaces+underscores+case', () => {
    assert.strictEqual(normalizeTagKey('Action_ID'), 'actionid')
  })

  // isNearMissScreenId
  await runTest('isNearMissScreenId: "Screen ID" (space)', () => {
    assert.strictEqual(isNearMissScreenId('Screen ID'), true)
  })
  await runTest('isNearMissScreenId: "screen id" (lowercase space)', () => {
    assert.strictEqual(isNearMissScreenId('screen id'), true)
  })
  await runTest('isNearMissScreenId: "ScreenId" (wrong case)', () => {
    assert.strictEqual(isNearMissScreenId('ScreenId'), true)
  })
  await runTest('isNearMissScreenId: "screen_id" (underscore)', () => {
    assert.strictEqual(isNearMissScreenId('screen_id'), true)
  })
  await runTest('isNearMissScreenId: "screenid" (all lower)', () => {
    assert.strictEqual(isNearMissScreenId('screenid'), true)
  })
  await runTest('isNearMissScreenId: "SCREENID" (all upper)', () => {
    assert.strictEqual(isNearMissScreenId('SCREENID'), true)
  })
  await runTest('isNearMissScreenId: exact "ScreenID" is NOT a near-miss', () => {
    assert.strictEqual(isNearMissScreenId('ScreenID'), false)
  })
  await runTest('isNearMissScreenId: "ActionID" is not a near-miss', () => {
    assert.strictEqual(isNearMissScreenId('ActionID'), false)
  })
  await runTest('isNearMissScreenId: unrelated label is false', () => {
    assert.strictEqual(isNearMissScreenId('Description'), false)
  })

  // isNearMissActionId
  await runTest('isNearMissActionId: "Action ID" (space)', () => {
    assert.strictEqual(isNearMissActionId('Action ID'), true)
  })
  await runTest('isNearMissActionId: "action id" (lowercase space)', () => {
    assert.strictEqual(isNearMissActionId('action id'), true)
  })
  await runTest('isNearMissActionId: "ActionId" (wrong case)', () => {
    assert.strictEqual(isNearMissActionId('ActionId'), true)
  })
  await runTest('isNearMissActionId: "action_id" (underscore)', () => {
    assert.strictEqual(isNearMissActionId('action_id'), true)
  })
  await runTest('isNearMissActionId: "actionid" (all lower)', () => {
    assert.strictEqual(isNearMissActionId('actionid'), true)
  })
  await runTest('isNearMissActionId: "ACTIONID" (all upper)', () => {
    assert.strictEqual(isNearMissActionId('ACTIONID'), true)
  })
  await runTest('isNearMissActionId: exact "ActionID" is NOT a near-miss', () => {
    assert.strictEqual(isNearMissActionId('ActionID'), false)
  })
  await runTest('isNearMissActionId: "ScreenID" is not a near-miss', () => {
    assert.strictEqual(isNearMissActionId('ScreenID'), false)
  })
  await runTest('isNearMissActionId: unrelated label is false', () => {
    assert.strictEqual(isNearMissActionId('Description'), false)
  })

  // No cross-contamination
  await runTest('isNearMissScreenId: "ActionID" → false (no cross-contamination)', () => {
    assert.strictEqual(isNearMissScreenId('ActionID'), false)
  })
  await runTest('isNearMissActionId: "ScreenID" → false (no cross-contamination)', () => {
    assert.strictEqual(isNearMissActionId('ScreenID'), false)
  })

  console.log(`\n${passed} passed, ${failed} failed`)
  if (failed > 0) process.exit(1)
}

run().catch(err => { console.error(err); process.exit(1) })
