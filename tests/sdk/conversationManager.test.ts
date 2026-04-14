// tests/sdk/conversationManager.test.ts
import { createConversationManager } from '../../src/core/sdk/conversationManager'

function assert(condition: boolean, msg: string): void {
  if (!condition) throw new Error(`FAIL: ${msg}`)
}

function test(name: string, fn: () => void): void {
  try { fn(); console.log(`  ✓ ${name}`) }
  catch (e) { console.error(`  ✗ ${name}:`, (e as Error).message); process.exit(1) }
}

test('creates with empty history', () => {
  const cm = createConversationManager()
  assert(cm.getHistory().length === 0, 'initial history is empty')
})

test('pushUserMessage adds to history', () => {
  const cm = createConversationManager()
  cm.pushUserMessage('req1', 'assistant1', 'hello')
  assert(cm.getHistory().length === 1, 'history has one entry')
  assert(cm.getHistory()[0].role === 'user', 'role is user')
  assert(cm.getHistory()[0].content === 'hello', 'content matches')
})

test('getCurrentAssistantSegment returns only messages for that assistant', () => {
  const cm = createConversationManager()
  cm.pushUserMessage('req1', 'assistant_a', 'msg-a')
  cm.pushAssistantMessage('req1', 'assistant_a', 'response-a')
  cm.pushBoundary('assistant_b')
  cm.pushUserMessage('req2', 'assistant_b', 'msg-b')
  const segmentB = cm.getCurrentAssistantSegment('assistant_b')
  assert(segmentB.length === 1, 'segment B has 1 message')
  assert(segmentB[0].content === 'msg-b', 'segment B has correct content')
})

test('clearHistory resets to empty', () => {
  const cm = createConversationManager()
  cm.pushUserMessage('req1', 'assistant_a', 'hello')
  cm.clearHistory()
  assert(cm.getHistory().length === 0, 'history cleared')
})

test('replaceStatusForRequest preserves assistantId', () => {
  const cm = createConversationManager()
  const msg = cm.pushAssistantMessage('req1', 'assistant_a', 'Working...', true)
  const replaced = cm.replaceStatusForRequest('req1', 'Done.')
  assert(replaced !== null, 'replacement found')
  assert((replaced as { assistantId?: string }).assistantId === 'assistant_a', 'assistantId preserved')
})

console.log('ConversationManager tests passed')
