/**
 * Routing regression matrix (audit-derived). Ensures every (assistantId, actionId)
 * has correct executionType, getHandler presence, and route classification.
 * Run: npm run test (or npx tsx src/core/assistants/routing.regression.test.ts)
 * No Figma runtime required (minimal mock if handlers load figma).
 */

import assert from 'node:assert'

// Minimal Figma mock so handler modules can load without Figma runtime
if (typeof (globalThis as unknown as { figma?: unknown }).figma === 'undefined') {
  (globalThis as unknown as { figma: { notify: () => void; ui: { postMessage: () => void } } }).figma = {
    notify: () => {},
    ui: { postMessage: () => {} }
  }
}

import { ASSISTANTS_MANIFEST } from '../../assistants/assistants.generated'
import { getHandler } from './handlers'
import type { ExecutionType } from '../types'

/** Route classification from audit (main.ts behavior). */
export type RouteClassification = 'ui-only' | 'tool-only' | 'llm' | 'hybrid-noop' | 'canned'

/**
 * Expected route for (assistantId, actionId). Encodes audit matrix; update when adding assistants/actions.
 * - ui-only: main returns before any provider call.
 * - tool-only: handler exists, main calls handler and returns (no sendChat).
 * - llm: main uses sendChatWithRecovery (handler may exist for parse/render).
 * - hybrid-noop: code2design send-json/get-json; main returns without provider.
 * - canned: code2design json-format-help; main shows canned message and returns.
 */
function expectedRoute(
  assistantId: string,
  actionId: string,
  executionType: ExecutionType | string
): RouteClassification {
  if (executionType === 'ui-only') return 'ui-only'
  if (executionType === 'tool-only') return 'tool-only'
  if (assistantId === 'code2design') {
    if (actionId === 'send-json' || actionId === 'get-json') return 'hybrid-noop'
    if (actionId === 'json-format-help') return 'canned'
  }
  if (executionType === 'hybrid') {
    if (assistantId === 'code2design' && (actionId === 'send-json' || actionId === 'get-json')) return 'hybrid-noop'
  }
  return 'llm'
}

/** Whether a handler is expected for this (assistantId, actionId) per audit. */
function expectHandler(assistantId: string, actionId: string, route: RouteClassification): boolean {
  if (route === 'tool-only') return true
  if (route === 'llm') {
    return (
      (assistantId === 'design_critique' && (actionId === 'give-critique' || actionId === 'deceptive-review')) ||
      (assistantId === 'design_workshop' && actionId === 'generate-screens') ||
      (assistantId === 'discovery_copilot' && actionId === 'start-discovery')
    )
  }
  return false
}

function main(): void {
  let passed = 0
  let failed = 0
  for (const assistant of ASSISTANTS_MANIFEST) {
    const assistantId = assistant.id
    for (const action of assistant.quickActions) {
      const actionId = action.id
      const executionType = action.executionType as ExecutionType
      const route = expectedRoute(assistantId, actionId, executionType)
      const handler = getHandler(assistantId, actionId)
      const expectedHasHandler = expectHandler(assistantId, actionId, route)

      try {
        assert.strictEqual(
          executionType,
          action.executionType,
          `[${assistantId}/${actionId}] executionType must match manifest (required field)`
        )
        assert(
          handler !== undefined === expectedHasHandler,
          `[${assistantId}/${actionId}] getHandler: expected ${expectedHasHandler ? 'handler' : 'no handler'}, got ${handler !== undefined ? 'handler' : 'undefined'} (route=${route})`
        )
        passed++
      } catch (e) {
        failed++
        console.error((e as Error).message)
      }
    }
  }
  if (failed > 0) {
    console.error(`[routing.regression] ${failed} failed, ${passed} passed`)
    process.exit(1)
  }
  console.log(`[routing.regression] All ${passed} (assistantId, actionId) entries passed.`)
  process.exit(0)
}

main()
