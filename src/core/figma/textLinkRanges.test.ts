import assert from 'node:assert'
import { buildLinkedCellText } from './textLinkRanges'

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

console.log('textLinkRanges.test.ts')

test('suffix present includes newline and keeps link range on first line only', () => {
  const out = buildLinkedCellText('View in Figma', 'Place Image Here')
  assert.strictEqual(out.characters, 'View in Figma\nPlace Image Here')
  assert.strictEqual(out.linkStart, 0)
  assert.strictEqual(out.linkEnd, 'View in Figma'.length)
})

test('suffix absent keeps plain text and full-length link range', () => {
  const out = buildLinkedCellText('View in Figma')
  assert.strictEqual(out.characters, 'View in Figma')
  assert.strictEqual(out.linkStart, 0)
  assert.strictEqual(out.linkEnd, 'View in Figma'.length)
})

console.log(`\n${passed} passed, ${failed} failed`)
if (failed > 0) process.exit(1)
