# AI Comprehension Guide

This guide helps AI coding assistants (DevGPT Cline, GPT-4.1, etc.) understand and work with the FigmAI plugin codebase.

## Quick Start

If you're an AI assistant trying to understand this codebase:

1. **Start here**: Read `README.md` for architecture overview
2. **Understand flow**: Read `main.ts` header comment for message routing
3. **Understand UI**: Read `ui.tsx` header comment for UI architecture
4. **Understand handlers**: Read `core/assistants/handlers/base.ts` for handler contract
5. **Understand Work boundary**: Read `docs/WORK_ADAPTER.md` for Work plugin pattern

## Large Files

The codebase has some large files that might be intimidating:

### `main.ts` (~900 lines)

**Purpose:** Main thread orchestrator

**Key sections:**
- Lines 1-150: Imports, error handling, state management
- Lines 150-350: Event handlers (RESET, SET_ASSISTANT, etc.)
- Lines 350-550: Quick action handler (core logic)
- Lines 550-863: Tool handlers, settings handlers, etc.

**What to know:**
- This file orchestrates, doesn't implement
- Handler pattern extracts assistant-specific logic
- Message history is maintained here (single source of truth)
- Don't add assistant-specific logic here (use handlers)

### `ui.tsx` (~4000 lines)

**Purpose:** React UI component

**Key sections:**
- Lines 1-100: Imports and setup
- Lines 100-500: State management and hooks
- Lines 500-1500: UI rendering logic
- Lines 1500-4000: Event handlers and callbacks

**What to know:**
- This file is stateless (main thread is source of truth)
- Messages arrive via postMessage from main thread
- Don't add business logic here (delegate to main thread)
- UI components are in `ui/components/`

## Similar-Sounding Systems

### Artifact System vs Stage System

**Artifact System** (`core/figma/artifacts/`):
- Purpose: Versioned artifact placement
- Use for: Assistant outputs (scorecards, critiques)
- Key feature: Version scoping (v1 vs v2 replacement)
- Example: Design Critique scorecards

**Stage System** (`core/stage/`):
- Purpose: Document and DesignSpec rendering
- Use for: Document IR, DesignSpec IR
- Key feature: Consistent placement logic
- Example: Code2Design JSON rendering

**When to use which:**
- Artifact System: When you need versioning (Design Critique)
- Stage System: When you need document/design spec rendering (Code2Design)
- Don't confuse them: They serve different purposes

### Selection State vs Selection Summary

**Selection State** (`core/context/selection.ts`):
- Purpose: Basic selection information
- Contains: count, hasSelection, names
- Use for: Quick checks (has selection?)

**Selection Summary** (`core/context/selectionSummary.ts`):
- Purpose: Detailed selection description
- Contains: Formatted text description of selection
- Use for: Sending to LLM as context

**When to use which:**
- Selection State: For UI display, quick checks
- Selection Summary: For LLM context, detailed descriptions

### Handler Execution: Pre-LLM vs Post-LLM

**Pre-LLM Handlers:**
- Run before provider call
- Example: Content Table scanning (no LLM needed)
- Returns `{ handled: true }` to skip LLM call
- Located: Early in quick action handler

**Post-LLM Handlers:**
- Run after provider call
- Example: Design Critique JSON parsing and rendering
- Returns `{ handled: true }` to skip default message display
- Located: After provider.sendChat() call

**How to tell:**
- Pre-LLM: Handler runs before `provider.sendChat()`
- Post-LLM: Handler runs after `provider.sendChat()`

## Implicit Assumptions

### Message History Lifecycle

**Assumption:** Main thread maintains message history, UI is stateless

**Why:** Main thread is single source of truth, UI displays messages as they arrive

**What this means:**
- Don't maintain message state in UI
- Trust messages from main thread
- Don't add messages optimistically in UI

### Handler Execution Order

**Assumption:** Some handlers run pre-LLM, others post-LLM

**Why:** Different assistants need different execution points

**What this means:**
- Check handler.canHandle() early
- Pre-LLM handlers skip provider call
- Post-LLM handlers process provider response

### Provider Normalization

**Assumption:** All requests are normalized before sending to providers

**Why:** Providers have different capabilities (images, markdown, schemas)

**What this means:**
- Don't send raw messages to providers
- Use normalizeMessages() before provider.sendChat()
- Providers handle capability-based filtering

### Artifact Versioning

**Assumption:** Artifacts are versioned, v2 replaces v2, but not v1

**Why:** Allows multiple artifact versions to coexist

**What this means:**
- Use version scoping when removing artifacts
- v2 artifacts don't replace v1 artifacts
- Check pluginData for version information

### Work Adapter Override

**Assumption:** Work plugin overrides adapter via module replacement or direct import

**Why:** Allows Work plugin to inject proprietary logic

**What this means:**
- Public Plugin defines stubs
- Work Plugin overrides stubs
- Use optional chaining when calling adapter methods

## Common Patterns

### Adding a New Assistant

1. **Define assistant** in `assistants/index.ts`:
   ```typescript
   {
     id: 'my_assistant',
     label: 'My Assistant',
     promptMarkdown: '...',
     quickActions: [...]
   }
   ```

2. **Create handler** in `core/assistants/handlers/myAssistant.ts`:
   ```typescript
   export class MyAssistantHandler implements AssistantHandler {
     canHandle(assistantId: string, actionId: string): boolean {
       return assistantId === 'my_assistant' && actionId === 'my_action'
     }
     async handleResponse(context: HandlerContext): Promise<HandlerResult> {
       // Handle response
       return { handled: true }
     }
   }
   ```

3. **Register handler** in `core/assistants/handlers/index.ts`:
   ```typescript
   const handlers = [
     new MyAssistantHandler(),
     // ...
   ]
   ```

### Understanding Message Flow

```
UI emits('RUN_QUICK_ACTION')
  ↓
main.ts receives event
  ↓
Handler lookup
  ↓
[Pre-LLM handler] (if exists)
  ↓
Build selection context
  ↓
Normalize messages
  ↓
[Handler.prepareMessages()] (if exists)
  ↓
Provider.sendChat()
  ↓
[Post-LLM handler] (if exists)
  ↓
Default: Send to UI as chat message
```

### Rendering to Canvas

**Artifact System:**
```typescript
import { placeArtifactFrame } from './core/figma/artifacts/placeArtifact'

const frame = figma.createFrame()
// ... configure frame
await placeArtifactFrame(frame, {
  type: 'scorecard',
  assistant: 'design_critique',
  version: 'v2',
  selectedNode: selectedNode
})
```

**Stage System:**
```typescript
import { renderDocumentToStage } from './core/stage/renderDocument'

await renderDocumentToStage(documentIR, {
  selectedNode: selectedNode,
  width: 640
})
```

## Anti-Patterns

### ❌ Don't Add Assistant-Specific Logic to main.ts

**Wrong:**
```typescript
if (assistantId === 'design_critique') {
  // Design Critique specific logic
}
```

**Right:**
```typescript
const handler = getHandler(assistantId, actionId)
if (handler) {
  await handler.handleResponse(context)
}
```

### ❌ Don't Send Raw Messages to Providers

**Wrong:**
```typescript
await provider.sendChat({
  messages: messageHistory // Raw messages
})
```

**Right:**
```typescript
const normalizedMessages = normalizeMessages(
  messageHistory.filter(m => m.role === 'user' || m.role === 'assistant')
)
await provider.sendChat({
  messages: normalizedMessages
})
```

### ❌ Don't Maintain State in UI Thread

**Wrong:**
```typescript
const [messages, setMessages] = useState<Message[]>([])
// Add messages locally
```

**Right:**
```typescript
// Listen to messages from main thread
on('ASSISTANT_MESSAGE', (message) => {
  setMessages(prev => [...prev, message])
})
```

### ❌ Don't Duplicate Placement Logic

**Wrong:**
```typescript
// Custom placement logic
frame.x = selectedNode.x - 40
frame.y = selectedNode.y
```

**Right:**
```typescript
import { placeArtifactFrame } from './core/figma/artifacts/placeArtifact'
await placeArtifactFrame(frame, { selectedNode })
```

## Entry Points for Common Tasks

### Adding a New Assistant
1. `assistants/index.ts` - Define assistant
2. `core/assistants/handlers/{assistantId}.ts` - Create handler
3. `core/assistants/handlers/index.ts` - Register handler

### Understanding Message Flow
1. `main.ts` - Quick action handler (lines 350-550)
2. `core/assistants/handlers/` - Handler implementations
3. `core/provider/provider.ts` - Provider interface

### Rendering Output
1. `core/figma/artifacts/placeArtifact.ts` - Artifact system
2. `core/stage/renderDocument.ts` - Stage system
3. `core/assistants/handlers/designCritique.ts` - Example handler

### Work Features
1. `core/work/adapter.ts` - Adapter interface
2. `docs/WORK_ADAPTER.md` - Work adapter documentation
3. `docs/EXTENSION_POINTS.md` - Extension points

## Key Files to Understand

### Must Understand
- `main.ts` - Orchestration
- `assistants/index.ts` - Assistant registry
- `core/assistants/handlers/base.ts` - Handler contract
- `core/provider/provider.ts` - Provider contract
- `core/work/adapter.ts` - Work boundary

### Should Understand
- `ui.tsx` - UI architecture
- `core/context/selectionContext.ts` - Selection context
- `core/figma/artifacts/placeArtifact.ts` - Artifact system
- `core/stage/anchor.ts` - Placement logic

### Nice to Understand
- `core/output/normalize/index.ts` - Response normalization
- `core/tools/toolRouter.ts` - Tool routing
- `core/contentTable/scanner.ts` - Content table scanning

## Troubleshooting

### Handler not being called
- Check handler is registered in `core/assistants/handlers/index.ts`
- Check `canHandle()` returns true for assistant/action
- Check handler runs at correct point (pre-LLM vs post-LLM)

### Messages not appearing in UI
- Check main thread is sending messages via `figma.ui.postMessage()`
- Check UI is listening for 'ASSISTANT_MESSAGE' events
- Check message format matches expected type

### Rendering not working
- Check if using correct system (artifact vs stage)
- Check placement logic (anchor, bounds calculation)
- Check version scoping (if using artifact system)

### Work adapter not working
- Check Work Plugin is overriding adapter in `work/adapter.ts`
- Check adapter methods are called with optional chaining (`?.`)
- Check fallbacks are provided when adapter is undefined

## Summary

This codebase follows clear patterns:

- **Handler pattern**: Extract assistant-specific logic
- **Provider abstraction**: All LLM calls go through provider interface
- **Selection context**: Build once, use everywhere
- **Artifact versioning**: Use version scoping for artifact replacement
- **Work adapter**: Single-file boundary for Work-only features

When in doubt:
1. Check handler pattern first
2. Check provider abstraction
3. Check Work adapter documentation
4. Read file header comments

