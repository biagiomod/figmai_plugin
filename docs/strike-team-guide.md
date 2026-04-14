# Strike Team Guide

Everything a new assistant team needs to know.

## What a new assistant needs

1. **A manifest entry** in `assistants/assistants.manifest.json`
2. **A handler** in `src/core/assistants/handlers/<assistantId>.ts` registered in `handlers/index.ts`
3. **Quick actions** defined in the manifest with matching handler support
4. **A SKILL.md** in `custom/assistants/<id>/SKILL.md` — identity, behavior rules, and per-quick-action guidance (see `docs/llm-context-authoring.md`)

## SDK services (safe to use)

Import from the SDK barrel:

```typescript
import type { SmartDetectionPort, DSQueryPort, AssistantConfig } from '../sdk'
// or
import type { SmartDetectionPort } from '../sdk/ports/SmartDetectionPort'
```

Available services via `HandlerContext`:
- `context.replaceStatusMessage(content, isError?)` — update status in the UI
- `context.sendAssistantMessage(content, toolCallId?, requestId?)` — send chat message
- `context.selectionOrder` — current selection node IDs
- `context.provider` — active LLM provider

## What NOT to import

Never import these from a handler or controller:
- `src/core/detection/smartDetector/index.ts` — use `SmartDetectionPort` instead
- `src/core/detection/smartDetector/traversal.ts` etc. — engine internals
- `src/core/designSystem/registryLoader.ts` — use `DSQueryPort` instead
- `src/core/designSystem/assistantApi.ts` — use `DSQueryPort` instead

The invariant check (`npm run invariants`) will catch violations.

## Handler registration pattern

```typescript
// src/core/assistants/handlers/myAssistant.ts
import type { AssistantHandler, HandlerContext, HandlerResult } from './base'

export class MyAssistantHandler implements AssistantHandler {
  canHandle(assistantId: string, actionId: string | undefined): boolean {
    return assistantId === 'my_assistant'
  }

  async handleResponse(context: HandlerContext): Promise<HandlerResult> {
    const { actionId, replaceStatusMessage } = context
    if (actionId === 'my-action') {
      replaceStatusMessage('Working...')
      // do work
      replaceStatusMessage('Done.')
      return { handled: true }
    }
    return { handled: false }
  }
}
```

Register in `src/core/assistants/handlers/index.ts`:
```typescript
import { MyAssistantHandler } from './myAssistant'
// Add to the handlers array
```

## Smart detection in a handler

```typescript
import { DefaultSmartDetectionEngine } from '../../detection/smartDetector/DefaultSmartDetectionEngine'
import type { SmartDetectionPort } from '../../sdk/ports/SmartDetectionPort'

const sdPort: SmartDetectionPort = new DefaultSmartDetectionEngine()

// In handleResponse:
const [result] = await sdPort.detect(context.selectionOrder.map(id => figma.getNodeById(id) as SceneNode).filter(Boolean))
```

## Quick action flow

```
UI click → emit('RUN_QUICK_ACTION', actionId, assistantId)
  → QuickActionExecutor.run(actionId, assistantId)
    → getHandler(assistantId, actionId)
      → handler.handleResponse(context)
```
