// tests/sdk/statusChannel.test.ts
import { createStatusChannel } from '../../src/core/sdk/statusChannel'

function assert(condition: boolean, msg: string): void {
  if (!condition) throw new Error(`FAIL: ${msg}`)
}
function test(name: string, fn: () => void): void {
  try { fn(); console.log(`  ✓ ${name}`) }
  catch (e) { console.error(`  ✗ ${name}:`, (e as Error).message); process.exit(1) }
}

// Collect posted messages for assertions
const posted: Array<{ type: string; payload: unknown }> = []
function mockPost(type: string, payload: unknown) { posted.push({ type, payload }) }

test('replaceStatusMessage emits REPLACE_STATUS event', () => {
  posted.length = 0
  const ch = createStatusChannel(mockPost)
  ch.replaceStatusMessage('req1', 'Done.')
  const ev = posted.find(p => p.type === 'REPLACE_STATUS')
  assert(ev !== undefined, 'REPLACE_STATUS event emitted')
  assert((ev!.payload as { requestId: string }).requestId === 'req1', 'requestId matches')
})

test('sendAssistantMessage emits ASSISTANT_MESSAGE with message wrapper', () => {
  posted.length = 0
  const ch = createStatusChannel(mockPost)
  ch.sendAssistantMessage('Hello world', 'tc1', 'req42')
  const ev = posted.find(p => p.type === 'ASSISTANT_MESSAGE')
  assert(ev !== undefined, 'ASSISTANT_MESSAGE event emitted')
  const payload = ev!.payload as { message: { role: string; content: string; toolCallId?: string; requestId?: string } }
  assert(payload.message !== undefined, 'payload.message exists (not flat)')
  assert(payload.message.role === 'assistant', 'role is assistant')
  assert(payload.message.content === 'Hello world', 'content matches')
  assert(payload.message.toolCallId === 'tc1', 'toolCallId forwarded')
  assert(payload.message.requestId === 'req42', 'requestId forwarded')
})

test('updateStatusStep emits STATUS_STEP event', () => {
  posted.length = 0
  const ch = createStatusChannel(mockPost)
  ch.updateStatusStep('req1', 'Scanning...')
  const ev = posted.find(p => p.type === 'STATUS_STEP')
  assert(ev !== undefined, 'STATUS_STEP event emitted')
})

console.log('StatusChannel tests passed')
