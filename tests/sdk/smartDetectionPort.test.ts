// tests/sdk/smartDetectionPort.test.ts
// Note: SceneNode is a Figma API type — we use a minimal mock
import { DefaultSmartDetectionEngine } from '../../src/core/detection/smartDetector/DefaultSmartDetectionEngine'
import type { SmartDetectionPort } from '../../src/core/sdk/ports/SmartDetectionPort'

function assert(condition: boolean, msg: string): void {
  if (!condition) throw new Error(`FAIL: ${msg}`)
}
async function test(name: string, fn: () => Promise<void>): Promise<void> {
  return fn().then(() => console.log(`  ✓ ${name}`)).catch(e => { console.error(`  ✗ ${name}:`, e.message); process.exit(1) })
}

async function run() {
  const engine: SmartDetectionPort = new DefaultSmartDetectionEngine()

  await test('implements SmartDetectionPort interface', async () => {
    assert(typeof engine.detect === 'function', 'detect method exists')
  })

  await test('detect returns array', async () => {
    // Empty roots — engine should return empty array
    const results = await engine.detect([])
    assert(Array.isArray(results), 'returns array')
    assert(results.length === 0, 'empty roots returns empty array')
  })

  console.log('SmartDetectionPort tests passed')
}
run()
