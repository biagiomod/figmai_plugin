/**
 * Config schema and HAT-required components.
 * Run: npx tsx tests/accessibility-config.test.ts (or npm run test)
 */

import assert from 'node:assert'
import { configSchema } from '../admin-editor/src/schema'

function test_configSchema_accepts_accessibility_hatRequiredComponents() {
  const parsed = configSchema.parse({
    accessibility: {
      hatRequiredComponents: ['IconButton', 'ToolbarIconOnly', 'AvatarButton']
    }
  })
  assert.ok(parsed.accessibility != null)
  assert.deepStrictEqual(parsed.accessibility!.hatRequiredComponents, ['IconButton', 'ToolbarIconOnly', 'AvatarButton'])
}

function test_configSchema_accepts_empty_hatRequiredComponents() {
  const parsed = configSchema.parse({
    accessibility: {
      hatRequiredComponents: []
    }
  })
  assert.ok(parsed.accessibility != null)
  assert.deepStrictEqual(parsed.accessibility!.hatRequiredComponents, [])
}

function test_configSchema_accepts_missing_accessibility() {
  const parsed = configSchema.parse({})
  assert.strictEqual(parsed.accessibility, undefined)
}

function test_configSchema_passthrough_keeps_extra_accessibility_keys() {
  const parsed = configSchema.parse({
    accessibility: {
      hatRequiredComponents: ['X'],
      extraKey: 'ignored-by-inference-but-present'
    }
  })
  assert.ok(parsed.accessibility != null)
  assert.deepStrictEqual(parsed.accessibility!.hatRequiredComponents, ['X'])
}

function main() {
  test_configSchema_accepts_accessibility_hatRequiredComponents()
  test_configSchema_accepts_empty_hatRequiredComponents()
  test_configSchema_accepts_missing_accessibility()
  test_configSchema_passthrough_keeps_extra_accessibility_keys()
  console.log('[accessibility-config] All tests passed.')
}

main()
