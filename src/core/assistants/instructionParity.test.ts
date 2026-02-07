/**
 * Parity tests: migrated assistants (instructionBlocks) must produce the same
 * instructionPreambleText as legacy getShortInstructions.
 * Run: npx tsx src/core/assistants/instructionParity.test.ts
 * No Figma runtime required.
 */

import assert from 'node:assert'
import { getAssistant } from '../../assistants'
import { getShortInstructions } from '../../assistants'
import { buildAssistantInstructionSegments } from './instructionAssembly'

const MIGRATED_ASSISTANT_IDS = ['ux_copy_review', 'design_critique'] as const

function test_instructionBlocks_parity_for_migrated_assistants() {
  for (const id of MIGRATED_ASSISTANT_IDS) {
    const assistant = getAssistant(id)
    assert(assistant, `Assistant ${id} not found`)
    const legacy = getShortInstructions(assistant)
    const built = buildAssistantInstructionSegments({
      assistantEntry: assistant,
      actionId: undefined,
      legacyInstructionsSource: legacy
    }).instructionPreambleText
    assert.strictEqual(
      built,
      legacy,
      `Parity failed for ${id}: built !== legacy`
    )
  }
}

function test_all_blocks_disabled_falls_back_to_legacy() {
  for (const id of MIGRATED_ASSISTANT_IDS) {
    const assistant = getAssistant(id)
    assert(assistant, `Assistant ${id} not found`)
    const legacy = getShortInstructions(assistant)
    const withDisabledBlocks: typeof assistant = {
      ...assistant,
      instructionBlocks: (assistant.instructionBlocks ?? []).map((b) => ({
        ...b,
        enabled: false
      }))
    }
    const built = buildAssistantInstructionSegments({
      assistantEntry: withDisabledBlocks,
      actionId: undefined,
      legacyInstructionsSource: legacy
    }).instructionPreambleText
    assert.strictEqual(
      built,
      legacy,
      `All-blocks-disabled fallback failed for ${id}: built !== legacy`
    )
  }
}

function run() {
  test_instructionBlocks_parity_for_migrated_assistants()
  test_all_blocks_disabled_falls_back_to_legacy()
  console.log('All instructionParity tests passed.')
}

run()
