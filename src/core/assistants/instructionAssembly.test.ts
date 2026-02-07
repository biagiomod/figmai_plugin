/**
 * Unit tests for buildAssistantInstructionSegments.
 * Run: npx tsx src/core/assistants/instructionAssembly.test.ts
 * No Figma runtime required.
 */

import assert from 'node:assert'
import { buildAssistantInstructionSegments } from './instructionAssembly'
import type { Assistant } from '../types'
import type { KnowledgeBaseDocument } from '../knowledgeBases/types'

function minimalAssistant(overrides: Partial<Assistant> = {}): Assistant {
  return {
    id: 'test',
    label: 'Test',
    intro: 'Intro',
    promptMarkdown: '# Test\n\nLegacy prompt.',
    iconId: 'Icon',
    kind: 'ai',
    quickActions: [],
    ...overrides
  }
}

// --- blocks present vs absent ---
function test_legacyWhenNoBlocks() {
  const a = minimalAssistant()
  const out = buildAssistantInstructionSegments({
    assistantEntry: a,
    legacyInstructionsSource: 'Short legacy text'
  })
  assert.strictEqual(out.instructionPreambleText, 'Short legacy text')
  assert.strictEqual(out.allowImagesOverride, undefined)
  assert.strictEqual(out.schemaId, undefined)
  assert.strictEqual(out.kbRefs, undefined)
}

function test_usesBlocksWhenPresentAndEnabled() {
  const a = minimalAssistant({
    instructionBlocks: [
      { id: 'b1', kind: 'behavior', content: 'Be helpful.', enabled: true },
      { id: 'b2', kind: 'rules', content: 'Stay on topic.', enabled: true }
    ]
  })
  const out = buildAssistantInstructionSegments({
    assistantEntry: a,
    legacyInstructionsSource: 'Legacy'
  })
  assert.ok(out.instructionPreambleText.includes('Be helpful.'))
  assert.ok(out.instructionPreambleText.includes('Stay on topic.'))
  assert.strictEqual(out.instructionPreambleText, '## Behavior\nBe helpful.\n\n## Rules\nStay on topic.')
}

function test_skipsDisabledBlocks() {
  const a = minimalAssistant({
    instructionBlocks: [
      { id: 'b1', kind: 'system', content: 'Enabled.', enabled: true },
      { id: 'b2', kind: 'behavior', content: 'Disabled.', enabled: false }
    ]
  })
  const out = buildAssistantInstructionSegments({
    assistantEntry: a,
    legacyInstructionsSource: 'Legacy'
  })
  assert.ok(out.instructionPreambleText.includes('Enabled.'))
  assert.ok(!out.instructionPreambleText.includes('Disabled.'))
}

function test_allDisabledFallsBackToLegacy() {
  const a = minimalAssistant({
    instructionBlocks: [
      { id: 'b1', kind: 'system', content: 'Only.', enabled: false }
    ]
  })
  const out = buildAssistantInstructionSegments({
    assistantEntry: a,
    legacyInstructionsSource: 'Legacy fallback'
  })
  assert.strictEqual(out.instructionPreambleText, 'Legacy fallback')
}

function test_emptyBlocksArrayFallsBackToLegacy() {
  const a = minimalAssistant({ instructionBlocks: [] })
  const out = buildAssistantInstructionSegments({
    assistantEntry: a,
    legacyInstructionsSource: 'Legacy'
  })
  assert.strictEqual(out.instructionPreambleText, 'Legacy')
}

// --- allowImages override ---
function test_allowImagesOverride() {
  const a = minimalAssistant({
    safetyOverrides: { allowImages: true }
  })
  const out = buildAssistantInstructionSegments({
    assistantEntry: a,
    legacyInstructionsSource: 'Legacy'
  })
  assert.strictEqual(out.allowImagesOverride, true)
}

function test_noAllowImagesWhenUnset() {
  const a = minimalAssistant()
  const out = buildAssistantInstructionSegments({
    assistantEntry: a,
    legacyInstructionsSource: 'Legacy'
  })
  assert.strictEqual(out.allowImagesOverride, undefined)
}

// --- schemaId passthrough ---
function test_schemaIdPassthrough() {
  const a = minimalAssistant({ outputSchemaId: 'my-schema-id' })
  const out = buildAssistantInstructionSegments({
    assistantEntry: a,
    legacyInstructionsSource: 'Legacy'
  })
  assert.strictEqual(out.schemaId, 'my-schema-id')
}

function test_schemaIdInPreambleWhenUsingBlocks() {
  const a = minimalAssistant({
    instructionBlocks: [{ id: 'b1', kind: 'system', content: 'Hi.', enabled: true }],
    outputSchemaId: 'format-1'
  })
  const out = buildAssistantInstructionSegments({
    assistantEntry: a,
    legacyInstructionsSource: 'Legacy'
  })
  assert.strictEqual(out.schemaId, 'format-1')
  assert.ok(out.instructionPreambleText.includes('format-1'))
}

// --- kbRefs and safetyToggles ---
function test_kbRefsPassthrough() {
  const a = minimalAssistant({ knowledgeBaseRefs: ['kb1', 'kb2'] })
  const out = buildAssistantInstructionSegments({
    assistantEntry: a,
    legacyInstructionsSource: 'Legacy'
  })
  assert.deepStrictEqual(out.kbRefs, ['kb1', 'kb2'])
}

function test_safetyTogglesPassthrough() {
  const a = minimalAssistant({
    safetyOverrides: { safetyToggles: { noImages: true } }
  })
  const out = buildAssistantInstructionSegments({
    assistantEntry: a,
    legacyInstructionsSource: 'Legacy'
  })
  assert.deepStrictEqual(out.safetyToggles, { noImages: true })
}

// --- PR11c1: Knowledge Base segment ---
function minimalKbDoc(overrides: Partial<KnowledgeBaseDocument> = {}): KnowledgeBaseDocument {
  return {
    id: 'test-kb',
    title: 'Test KB',
    purpose: 'For tests',
    scope: 'Unit tests',
    definitions: [],
    rulesConstraints: [],
    doDont: { do: [], dont: [] },
    examples: [],
    edgeCases: [],
    ...overrides
  }
}

function test_noKbDocs_noKnowledgeBaseSegment() {
  const a = minimalAssistant()
  const out = buildAssistantInstructionSegments({
    assistantEntry: a,
    legacyInstructionsSource: 'Legacy'
  })
  assert.ok(!out.instructionPreambleText.includes('## Knowledge Base'))
}

function test_emptyKbDocsArray_noKnowledgeBaseSegment() {
  const a = minimalAssistant()
  const out = buildAssistantInstructionSegments({
    assistantEntry: a,
    legacyInstructionsSource: 'Legacy',
    kbDocs: []
  })
  assert.ok(!out.instructionPreambleText.includes('## Knowledge Base'))
}

function test_withKbDocs_appendsKnowledgeBaseSegment() {
  const a = minimalAssistant()
  const doc = minimalKbDoc({ id: 'd1', title: 'Design System', purpose: 'Design rules.', scope: 'Figma.' })
  const out = buildAssistantInstructionSegments({
    assistantEntry: a,
    legacyInstructionsSource: 'Legacy',
    kbDocs: [doc]
  })
  assert.ok(out.instructionPreambleText.includes('## Knowledge Base'))
  assert.ok(out.instructionPreambleText.includes('### Design System'))
  assert.ok(out.instructionPreambleText.includes('Design rules.'))
}

function test_kbSegmentDeterministicOrderAndFormat() {
  const doc1 = minimalKbDoc({ id: 'a', title: 'First', purpose: 'P1', scope: 'S1' })
  const doc2 = minimalKbDoc({ id: 'b', title: 'Second', purpose: 'P2', scope: 'S2' })
  const out1 = buildAssistantInstructionSegments({
    assistantEntry: minimalAssistant(),
    legacyInstructionsSource: 'L',
    kbDocs: [doc1, doc2]
  })
  const out2 = buildAssistantInstructionSegments({
    assistantEntry: minimalAssistant(),
    legacyInstructionsSource: 'L',
    kbDocs: [doc1, doc2]
  })
  assert.strictEqual(out1.instructionPreambleText, out2.instructionPreambleText)
  const kbPart = out1.instructionPreambleText.split('## Knowledge Base')[1] ?? ''
  assert.ok(kbPart.includes('### First'))
  assert.ok(kbPart.includes('### Second'))
  assert.ok(kbPart.indexOf('First') < kbPart.indexOf('Second'))
}

function test_kbSegmentTruncationArraysWithMore() {
  const doc = minimalKbDoc({
    id: 'many',
    title: 'Many',
    purpose: 'P',
    scope: 'S',
    definitions: ['d1', 'd2', 'd3', 'd4', 'd5', 'd6', 'd7', 'd8', 'd9', 'd10']
  })
  const out = buildAssistantInstructionSegments({
    assistantEntry: minimalAssistant(),
    legacyInstructionsSource: 'L',
    kbDocs: [doc]
  })
  assert.ok(out.instructionPreambleText.includes('(+2 more)'))
}

// --- run all ---
function run() {
  const tests = [
    test_legacyWhenNoBlocks,
    test_usesBlocksWhenPresentAndEnabled,
    test_skipsDisabledBlocks,
    test_allDisabledFallsBackToLegacy,
    test_emptyBlocksArrayFallsBackToLegacy,
    test_allowImagesOverride,
    test_noAllowImagesWhenUnset,
    test_schemaIdPassthrough,
    test_schemaIdInPreambleWhenUsingBlocks,
    test_kbRefsPassthrough,
    test_safetyTogglesPassthrough,
    test_noKbDocs_noKnowledgeBaseSegment,
    test_emptyKbDocsArray_noKnowledgeBaseSegment,
    test_withKbDocs_appendsKnowledgeBaseSegment,
    test_kbSegmentDeterministicOrderAndFormat,
    test_kbSegmentTruncationArraysWithMore
  ]
  for (const t of tests) {
    t()
  }
  console.log('All instructionAssembly tests passed.')
}

run()
