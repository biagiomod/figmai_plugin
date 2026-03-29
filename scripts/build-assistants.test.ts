// scripts/build-assistants.test.ts
import { groupErrorsByAssistant } from './build-assistants'

function test(name: string, fn: () => void) {
  try {
    fn()
    console.log(`  ✓ ${name}`)
  } catch (e: any) {
    console.error(`  ✗ ${name}: ${e.message}`)
    process.exit(1)
  }
}

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message)
}

console.log('build-assistants tests:')

test('groups error by assistant name from file path', () => {
  const output = `src/assistants/analytics/handler.ts(14,5): error TS2345: Type 'string' is not assignable`
  const result = groupErrorsByAssistant(output, 'src/assistants')
  assert(result['analytics'] !== undefined, 'should have analytics key')
  assert(result['analytics'].length === 1, 'should have 1 error')
})

test('returns empty object for clean tsc output', () => {
  const result = groupErrorsByAssistant('', 'src/assistants')
  assert(Object.keys(result).length === 0, 'should be empty')
})

test('ignores errors outside assistants directory', () => {
  const output = `src/core/foo.ts(1,1): error TS9999: some error`
  const result = groupErrorsByAssistant(output, 'src/assistants')
  assert(Object.keys(result).length === 0, 'should ignore core errors')
})

test('groups multiple errors for same assistant', () => {
  const output = [
    `src/assistants/analytics/handler.ts(14,5): error TS2345: first`,
    `src/assistants/analytics/index.ts(3,1): error TS2551: second`,
  ].join('\n')
  const result = groupErrorsByAssistant(output, 'src/assistants')
  assert(result['analytics'].length === 2, 'should have 2 errors for analytics')
})
