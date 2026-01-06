# Refactor Ticket: Extract Design Critique Handler

**Priority:** 🟡 Medium  
**Risk Level:** 🟡 Medium  
**Estimated Effort:** 3 hours  
**Status:** Pending

---

## Intent

Extract Design Critique-specific JSON parsing and canvas placement logic from `main.ts` into a dedicated handler. This removes tight coupling and makes it easier to add similar handlers for other assistants.

---

## Affected Files

- `src/core/assistants/handlers/designCritiqueHandler.ts` - **NEW** (create)
- `src/core/assistants/handlers/index.ts` - **NEW** (handler registry)
- `src/main.ts` - Remove hardcoded logic (lines 442-505)

---

## Current State

```typescript
// src/main.ts (lines 442-505)
if (assistant.id === 'design_critique' && action.id === 'give-critique') {
  console.log('[Main] Processing Design Critique response...')
  
  if (selection.hasSelection && selectionOrder.length > 0) {
    const selectedNode = figma.getNodeById(selectionOrder[0])
    // ... 60+ lines of JSON parsing and canvas placement
  }
}
```

**Problem:** Main thread knows about assistant internals, hard to extend.

---

## Target State

```typescript
// src/core/assistants/handlers/designCritiqueHandler.ts
export async function handleDesignCritiqueResponse(
  response: string,
  selection: SelectionState,
  selectionOrder: string[]
): Promise<{ handled: boolean; message?: string }> {
  // JSON parsing and canvas placement logic
  // Returns { handled: true } if processed, { handled: false } otherwise
}

// src/core/assistants/handlers/index.ts
export const assistantHandlers = new Map<string, Handler>([
  ['design_critique', designCritiqueHandler]
])

// src/main.ts
import { getAssistantHandler } from './core/assistants/handlers'

// In quick action handler:
const handler = getAssistantHandler(assistant.id, action.id)
if (handler) {
  const result = await handler.handleResponse(response, selection, selectionOrder)
  if (result.handled) {
    sendAssistantMessage(result.message || 'Response processed')
    return
  }
}
```

---

## Implementation Steps

1. **Create handler directory:**
   ```bash
   mkdir -p src/core/assistants/handlers
   ```

2. **Create handler interface:**
   ```typescript
   // src/core/assistants/handlers/types.ts
   export interface AssistantHandler {
     handleResponse(
       response: string,
       selection: SelectionState,
       selectionOrder: string[],
       actionId?: string
     ): Promise<{ handled: boolean; message?: string }>
   }
   ```

3. **Extract Design Critique handler:**
   - Copy logic from `main.ts` lines 442-505
   - Move to `designCritiqueHandler.ts`
   - Import required utilities (`createCritiqueFrameOnCanvas`, etc.)
   - Return `{ handled: true/false, message? }`

4. **Create handler registry:**
   ```typescript
   // src/core/assistants/handlers/index.ts
   export function getAssistantHandler(
     assistantId: string,
     actionId?: string
   ): AssistantHandler | undefined {
     // Return handler if exists
   }
   ```

5. **Update `main.ts`:**
   - Remove hardcoded Design Critique logic
   - Add handler lookup before sending response
   - Call handler if exists

6. **Test thoroughly:**
   - Design Critique with valid JSON
   - Design Critique with invalid JSON
   - Design Critique with markdown (fallback)
   - Other assistants (should not trigger handler)

---

## Acceptance Criteria

- [ ] Design Critique handler extracted
- [ ] Handler registry created
- [ ] `main.ts` uses handler instead of hardcoded logic
- [ ] Design Critique still works correctly
- [ ] Other assistants unaffected
- [ ] Handler can be tested independently

---

## Risk Mitigation

- **Medium Risk:** Complex logic, needs thorough testing
- **Verification:** Test all Design Critique scenarios
- **Rollback:** Keep old code commented until verified

**Safer Approach:**
1. Create handler but don't use it yet
2. Test handler in isolation
3. Switch `main.ts` to use handler
4. Remove old code after verification

---

## Testing Checklist

- [ ] Design Critique with structured JSON works
- [ ] Design Critique with markdown fallback works
- [ ] Canvas placement works correctly
- [ ] Error handling works (invalid JSON, no selection)
- [ ] Other assistants work normally
- [ ] No regressions in quick actions

---

## Before/After Example

**Before:**
```typescript
// main.ts
if (assistant.id === 'design_critique' && action.id === 'give-critique') {
  // 60+ lines of hardcoded logic
  let critique = null
  let jsonString = response.trim()
  // ... parsing, canvas placement
}
```

**After:**
```typescript
// main.ts
const handler = getAssistantHandler(assistant.id, action.id)
if (handler) {
  const result = await handler.handleResponse(response, selection, selectionOrder)
  if (result.handled) {
    sendAssistantMessage(result.message || 'Response processed')
    return
  }
}

// designCritiqueHandler.ts
export async function handleDesignCritiqueResponse(...) {
  // Isolated handler logic
}
```

---

## Notes

- Part of Phase 2 refactoring
- Sets pattern for future assistant-specific handlers
- Consider adding handler tests
- May want to make handler async for future extensibility

