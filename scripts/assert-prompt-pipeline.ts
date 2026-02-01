#!/usr/bin/env node
/**
 * Deterministic internal checks for prompt pipeline: sanitize + applySafetyAssertions.
 * Asserts flags and stripping on representative strings (data URLs, long base64, huge JSON).
 * Run: npx tsx scripts/assert-prompt-pipeline.ts
 * Exit 0 = pass, 1 = fail.
 */

import {
  assertNoDataUrlsOrLongBase64,
  sanitizeSegments,
  applySafetyAssertions,
  buildMessages,
  applyBudgets,
  DEFAULT_BUDGETS
} from '../src/core/llm/promptPipeline'

const DATA_URL_SAMPLE = 'prefix data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg== suffix'
const LONG_BASE64_SAMPLE = 'x' + 'A'.repeat(250) + 'y'
const HUGE_JSON_SAMPLE = '{"a":"' + 'b'.repeat(15000) + '"}'

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error('[assert-prompt-pipeline] FAIL:', message)
    process.exit(1)
  }
}

function main(): void {
  // 1. assertNoDataUrlsOrLongBase64: data URL stripped, hadDataUrl true
  const r1 = assertNoDataUrlsOrLongBase64(DATA_URL_SAMPLE)
  assert(r1.hadDataUrl === true, 'data URL: hadDataUrl should be true')
  assert(!/data:image\//i.test(r1.cleaned), 'data URL: cleaned must not contain data:image/')
  assert(r1.cleaned.includes('[DATA_URL_REMOVED]') || r1.cleaned.includes('suffix'), 'data URL: placeholder or suffix present')
  console.log('[assert-prompt-pipeline] assertNoDataUrlsOrLongBase64 (data URL): pass')

  // 2. assertNoDataUrlsOrLongBase64: long base64 stripped, hadLongBase64 true
  const r2 = assertNoDataUrlsOrLongBase64(LONG_BASE64_SAMPLE)
  assert(r2.hadLongBase64 === true, 'long base64: hadLongBase64 should be true')
  assert(!/[A-Za-z0-9+/=]{200,}/.test(r2.cleaned) || r2.cleaned.includes('[BASE64_STRIPPED]'), 'long base64: no long run or placeholder')
  console.log('[assert-prompt-pipeline] assertNoDataUrlsOrLongBase64 (long base64): pass')

  // 3. sanitizeSegments: DATA_URL flag and no data:image/ in output
  const segWithDataUrl = { ctx: DATA_URL_SAMPLE }
  const out3 = sanitizeSegments(segWithDataUrl)
  assert(out3.flags.includes('DATA_URL'), 'sanitizeSegments: DATA_URL flag when ctx has data URL')
  assert(!(out3.segments.ctx && /data:image\//i.test(out3.segments.ctx)), 'sanitizeSegments: output must not contain data:image/')
  console.log('[assert-prompt-pipeline] sanitizeSegments (data URL in ctx): pass')

  // 4. sanitizeSegments: HUGE_JSON flag when segment is huge JSON
  const segHuge = { user: HUGE_JSON_SAMPLE }
  const out4 = sanitizeSegments(segHuge)
  assert(out4.flags.includes('HUGE_JSON') || out4.segments.user!.length <= 12000 + 50, 'sanitizeSegments: HUGE_JSON or clamped size')
  console.log('[assert-prompt-pipeline] sanitizeSegments (huge JSON): pass')

  // 5. applySafetyAssertions: request has no data:image/ and no long base64
  const reqWithDataUrl = {
    messages: [{ role: 'user' as const, content: DATA_URL_SAMPLE }],
    selectionSummary: LONG_BASE64_SAMPLE
  }
  const out5 = applySafetyAssertions(reqWithDataUrl)
  assert(!out5.request.messages.some(m => /data:image\//i.test(m.content)), 'applySafetyAssertions: messages must not contain data:image/')
  assert(!(out5.request.selectionSummary && /data:image\//i.test(out5.request.selectionSummary)), 'applySafetyAssertions: selectionSummary must not contain data:image/')
  assert(!(out5.request.selectionSummary && /[A-Za-z0-9+/=]{200,}/.test(out5.request.selectionSummary)), 'applySafetyAssertions: selectionSummary must not contain long base64')
  console.log('[assert-prompt-pipeline] applySafetyAssertions (data URL + long base64): pass')

  // 6. applyBudgets with imagesBytes 0 drops images
  const segWithImages = {
    user: 'hello',
    images: [{ dataUrl: 'data:image/png;base64,abc', name: 'x' }]
  }
  const out6 = applyBudgets(segWithImages, DEFAULT_BUDGETS)
  assert((out6.segments.images?.length ?? 0) === 0, 'applyBudgets (imagesBytes 0): images must be dropped')
  assert(out6.flags.includes('OVER_BUDGET'), 'applyBudgets (imagesBytes 0): OVER_BUDGET when images dropped')
  console.log('[assert-prompt-pipeline] applyBudgets (images dropped): pass')

  console.log('[assert-prompt-pipeline] All checks passed.')
  process.exit(0)
}

main()
