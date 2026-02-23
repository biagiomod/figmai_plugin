import assert from 'node:assert'
import { CTA_PRESET_ORDER, getOrderedCtaPresets } from './presetOrder'
import { PRESET_INFO } from './presets.generated'

let passed = 0
let failed = 0

function test(name: string, fn: () => void) {
  try {
    fn()
    passed++
    console.log(`  \u2713 ${name}`)
  } catch (e: unknown) {
    failed++
    const err = e as Error
    console.error(`  \u2717 ${name}`)
    console.error(`    ${err.message}`)
  }
}

console.log('presetOrder.test.ts')

test('CTA_PRESET_ORDER puts mobile immediately after content-model-1', () => {
  const idxCm1 = CTA_PRESET_ORDER.indexOf('content-model-1')
  assert.ok(idxCm1 >= 0, 'content-model-1 must exist in preset order')
  assert.strictEqual(CTA_PRESET_ORDER[idxCm1 + 1], 'mobile')
})

test('ordered CTA presets labels follow required sequence', () => {
  const ordered = getOrderedCtaPresets(PRESET_INFO)
  const labels = ordered.map(p => p.label)
  assert.deepStrictEqual(labels, [
    'Universal Table',
    'Simple Worksheet',
    'Content Only',
    'Content Model 1',
    'Mobile',
    'Dev Only',
    'ADA Only'
  ])
})

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
