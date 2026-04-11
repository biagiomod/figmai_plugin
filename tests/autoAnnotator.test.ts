import assert from 'node:assert'

// Stub figma global so module loads outside the Figma runtime.
;(globalThis as unknown as { figma: unknown }).figma = {
  annotations: undefined,
  getNodeByIdAsync: async () => null,
}

import {
  isAnnotatableKind,
  hasScreenIdAnnotation,
  hasActionIdAnnotation,
  buildSummaryMessage,
  ANNOTATABLE_ELEMENT_KINDS,
} from '../src/core/analyticsTagging/autoAnnotator'
import type { AutoAnnotateResult } from '../src/core/types'

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
  console.log('autoAnnotator.test.ts')

  // ── isAnnotatableKind ───────────────────────────────────────────────────────
  const annotatable = [
    'button','icon_button','link','menu_item',
    'checkbox','radio','switch','slider',
    'text_input','textarea','search_input',
    'select','combobox','date_picker','file_upload','stepper',
    'accordion','chip_tag','card','list_item','unknown_interactive',
  ]
  for (const k of annotatable) {
    await runTest(`isAnnotatableKind: "${k}" → true`, () => {
      assert.strictEqual(isAnnotatableKind(k), true)
    })
  }

  const notAnnotatable = ['navbar','tabs','pagination','sidenav_drawer','breadcrumb',
    'heading','body_text','image','icon','divider','table','list','toolbar',
    'alert','progress','badge','avatar']
  for (const k of notAnnotatable) {
    await runTest(`isAnnotatableKind: "${k}" → false`, () => {
      assert.strictEqual(isAnnotatableKind(k), false)
    })
  }

  // ── hasScreenIdAnnotation ───────────────────────────────────────────────────
  await runTest('hasScreenIdAnnotation: exact "ScreenID" → true', () => {
    const map = new Map([['cat-1', 'ScreenID']])
    assert.strictEqual(hasScreenIdAnnotation([{ categoryId: 'cat-1' }], map), true)
  })

  await runTest('hasScreenIdAnnotation: near-miss "Screen ID" → true', () => {
    const map = new Map([['cat-2', 'Screen ID']])
    assert.strictEqual(hasScreenIdAnnotation([{ categoryId: 'cat-2' }], map), true)
  })

  await runTest('hasScreenIdAnnotation: absent → false', () => {
    const map = new Map<string, string>()
    assert.strictEqual(hasScreenIdAnnotation([], map), false)
  })

  await runTest('hasScreenIdAnnotation: ActionID category → false', () => {
    const map = new Map([['cat-3', 'ActionID']])
    assert.strictEqual(hasScreenIdAnnotation([{ categoryId: 'cat-3' }], map), false)
  })

  await runTest('hasScreenIdAnnotation: annotation without categoryId → false', () => {
    const map = new Map<string, string>()
    // label text "ScreenID" without a categoryId should NOT trigger the skip
    assert.strictEqual(hasScreenIdAnnotation([{ label: 'ScreenID' }], map), false)
  })

  await runTest('hasScreenIdAnnotation: multi-annotation — match is second entry → true', () => {
    const map = new Map([['cat-a', 'ActionID'], ['cat-b', 'ScreenID']])
    assert.strictEqual(hasScreenIdAnnotation([{ categoryId: 'cat-a' }, { categoryId: 'cat-b' }], map), true)
  })

  await runTest('hasScreenIdAnnotation: multi-annotation — neither matches → false', () => {
    const map = new Map([['cat-a', 'ActionID'], ['cat-b', 'SomeOther']])
    assert.strictEqual(hasScreenIdAnnotation([{ categoryId: 'cat-a' }, { categoryId: 'cat-b' }], map), false)
  })

  // ── hasActionIdAnnotation ───────────────────────────────────────────────────
  await runTest('hasActionIdAnnotation: exact "ActionID" → true', () => {
    const map = new Map([['cat-4', 'ActionID']])
    assert.strictEqual(hasActionIdAnnotation([{ categoryId: 'cat-4' }], map), true)
  })

  await runTest('hasActionIdAnnotation: near-miss "Action ID" → true', () => {
    const map = new Map([['cat-5', 'Action ID']])
    assert.strictEqual(hasActionIdAnnotation([{ categoryId: 'cat-5' }], map), true)
  })

  await runTest('hasActionIdAnnotation: absent → false', () => {
    const map = new Map<string, string>()
    assert.strictEqual(hasActionIdAnnotation([], map), false)
  })

  await runTest('hasActionIdAnnotation: ScreenID category → false', () => {
    const map = new Map([['cat-6', 'ScreenID']])
    assert.strictEqual(hasActionIdAnnotation([{ categoryId: 'cat-6' }], map), false)
  })

  await runTest('hasActionIdAnnotation: annotation without categoryId → false', () => {
    const map = new Map<string, string>()
    // label text "ActionID" without a categoryId should NOT trigger the skip
    assert.strictEqual(hasActionIdAnnotation([{ label: 'ActionID' }], map), false)
  })

  await runTest('hasActionIdAnnotation: multi-annotation — match is second entry → true', () => {
    const map = new Map([['cat-x', 'ScreenID'], ['cat-y', 'ActionID']])
    assert.strictEqual(hasActionIdAnnotation([{ categoryId: 'cat-x' }, { categoryId: 'cat-y' }], map), true)
  })

  await runTest('hasActionIdAnnotation: multi-annotation — neither matches → false', () => {
    const map = new Map([['cat-x', 'ScreenID'], ['cat-y', 'SomeOther']])
    assert.strictEqual(hasActionIdAnnotation([{ categoryId: 'cat-x' }, { categoryId: 'cat-y' }], map), false)
  })

  // ── buildSummaryMessage ─────────────────────────────────────────────────────
  const zero: AutoAnnotateResult = { screensProcessed: 0, screenIdAdded: 0, actionIdAdded: 0, skippedExisting: 0, writeFailed: 0 }

  await runTest('buildSummaryMessage: error string → surfaces error directly', () => {
    const msg = buildSummaryMessage(null, "Could not create 'ActionID' annotation category")
    assert.strictEqual(msg, "Could not create 'ActionID' annotation category")
  })

  await runTest('buildSummaryMessage: null result, null error → fallback message', () => {
    const msg = buildSummaryMessage(null, null)
    assert.strictEqual(msg, 'Could not add annotations.')
  })

  await runTest('buildSummaryMessage: screensProcessed=0 → no screens found', () => {
    const msg = buildSummaryMessage({ ...zero }, null)
    assert.strictEqual(msg, 'No screens found in selection.')
  })

  await runTest('buildSummaryMessage: only writeFailed, nothing else → write-fail message', () => {
    const msg = buildSummaryMessage({ ...zero, screensProcessed: 1, writeFailed: 3 }, null)
    assert.strictEqual(msg, '3 annotation write(s) failed — check for locked layers.')
  })

  await runTest('buildSummaryMessage: zero everything (screensProcessed=1) → no elements detected', () => {
    const msg = buildSummaryMessage({ ...zero, screensProcessed: 1 }, null)
    assert.strictEqual(msg, 'No interactive elements detected in the selection.')
  })

  await runTest('buildSummaryMessage: screenIdAdded only → added ScreenID, no elements detected', () => {
    const msg = buildSummaryMessage({ ...zero, screensProcessed: 1, screenIdAdded: 1 }, null)
    assert.strictEqual(msg, 'Added ScreenID to 1 screen(s). No interactive elements detected.')
  })

  await runTest('buildSummaryMessage: screenIdAdded + writeFailed, no actionId → includes write-fail suffix', () => {
    const msg = buildSummaryMessage({ ...zero, screensProcessed: 1, screenIdAdded: 1, writeFailed: 2 }, null)
    assert.strictEqual(msg, 'Added ScreenID to 1 screen(s). No interactive elements detected. (2 write(s) failed.)')
  })

  await runTest('buildSummaryMessage: actionId=0, skippedExisting=2 → all already tagged', () => {
    const msg = buildSummaryMessage({ ...zero, screensProcessed: 1, skippedExisting: 2 }, null)
    assert.strictEqual(msg, 'No new ActionID annotations needed — all detected elements are already tagged.')
  })

  await runTest('buildSummaryMessage: actionId=0, skippedExisting=2, screenIdAdded=1 → prefix', () => {
    const msg = buildSummaryMessage({ ...zero, screensProcessed: 1, screenIdAdded: 1, skippedExisting: 2 }, null)
    assert.ok(msg.startsWith('Added ScreenID to 1 screen(s).'), `got: ${msg}`)
    assert.ok(msg.includes('all detected elements are already tagged'), `got: ${msg}`)
  })

  await runTest('buildSummaryMessage: happy path — base message', () => {
    const msg = buildSummaryMessage({ screensProcessed: 2, screenIdAdded: 1, actionIdAdded: 8, skippedExisting: 0, writeFailed: 0 }, null)
    assert.strictEqual(msg, 'Added ScreenID to 1 screen(s) and ActionID to 8 element(s).')
  })

  await runTest('buildSummaryMessage: happy path with skipped + writeFailed suffixes', () => {
    const msg = buildSummaryMessage({ screensProcessed: 2, screenIdAdded: 2, actionIdAdded: 5, skippedExisting: 3, writeFailed: 1 }, null)
    assert.ok(msg.includes('ActionID to 5 element(s)'), `got: ${msg}`)
    assert.ok(msg.includes('3 already tagged'), `got: ${msg}`)
    assert.ok(msg.includes('1 could not be written'), `got: ${msg}`)
  })

  console.log(`\n${passed} passed, ${failed} failed`)
  if (failed > 0) process.exit(1)
}

run().catch(err => { console.error(err); process.exit(1) })
