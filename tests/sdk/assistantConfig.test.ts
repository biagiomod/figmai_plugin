// tests/sdk/assistantConfig.test.ts
import { defaultAssistantConfig, validateAssistantConfig } from '../../src/core/sdk/assistantConfig'

function assert(condition: boolean, msg: string): void {
  if (!condition) throw new Error(`FAIL: ${msg}`)
}
function test(name: string, fn: () => void): void {
  try { fn(); console.log(`  ✓ ${name}`) }
  catch (e) { console.error(`  ✗ ${name}:`, (e as Error).message); process.exit(1) }
}

test('defaultAssistantConfig has required fields', () => {
  const cfg = defaultAssistantConfig('general')
  assert(typeof cfg.assistantId === 'string', 'assistantId is string')
  assert(cfg.assistantId === 'general', 'assistantId matches input')
  assert(typeof cfg.llmEnabled === 'boolean', 'llmEnabled is boolean')
  assert(Array.isArray(cfg.kbAssignments), 'kbAssignments is array')
  assert(typeof cfg.visionEnabled === 'boolean', 'visionEnabled is boolean')
  assert(typeof cfg.smartDetectionEnabled === 'boolean', 'smartDetectionEnabled is boolean')
  assert(Array.isArray(cfg.hiddenQuickActionIds), 'hiddenQuickActionIds is array')
})

test('validateAssistantConfig returns true for valid config', () => {
  const cfg = defaultAssistantConfig('general')
  assert(validateAssistantConfig(cfg) === true, 'valid config passes validation')
})

test('validateAssistantConfig returns false for missing assistantId', () => {
  const cfg = { ...defaultAssistantConfig('general'), assistantId: '' }
  assert(validateAssistantConfig(cfg) === false, 'missing assistantId fails validation')
})

test('validateAssistantConfig returns false for missing kbAssignments', () => {
  const cfg = { ...defaultAssistantConfig('general'), kbAssignments: null as unknown as string[] }
  assert(validateAssistantConfig(cfg) === false, 'missing kbAssignments fails validation')
})

console.log('AssistantConfig tests passed')
