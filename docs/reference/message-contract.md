# Message Contract

**Purpose:** Reference for UI ↔ Main thread message types and payloads  
**For:** Developers and AI assistants working with message routing

---

## Overview

The plugin uses a two-thread architecture:
- **Main Thread** (`main.ts`): Runs in Figma plugin sandbox, has Figma API access
- **UI Thread** (`ui.tsx`): Runs in iframe, React-based UI

Communication via:
- **UI → Main:** `emit('EVENT_TYPE', ...data)` (using `@create-figma-plugin/utilities`)
- **Main → UI:** `figma.ui.postMessage({ pluginMessage: { type: 'MESSAGE_TYPE', ...data } })`

**Important:** Main thread is the **single source of truth** for message history. UI thread is stateless.

---

## UI → Main Messages

### `SEND_MESSAGE`
**Purpose:** User sends a text message

**Payload:**
```typescript
emit<SendMessageHandler>('SEND_MESSAGE', message: string, includeSelection?: boolean)
```

**Handler:** `main.ts` → Adds to messageHistory, calls provider, sends response

---

### `RUN_QUICK_ACTION`
**Purpose:** User clicks a quick action button

**Payload:**
```typescript
emit<RunQuickActionHandler>('RUN_QUICK_ACTION', actionId: string, assistantId: string)
```

**Handler:** `main.ts` → Looks up handler, executes action, may call provider or tool

---

### `SET_ASSISTANT`
**Purpose:** User selects an assistant

**Payload:**
```typescript
emit<SetAssistantHandler>('SET_ASSISTANT', assistantId: string)
```

**Handler:** `main.ts` → Updates current assistant

---

### `SET_MODE`
**Purpose:** User changes mode (simple/advanced)

**Payload:**
```typescript
emit<SetModeHandler>('SET_MODE', mode: 'simple' | 'advanced')
```

**Handler:** `main.ts` → Updates mode

---

### `SET_LLM_PROVIDER`
**Purpose:** User changes LLM provider

**Payload:**
```typescript
emit<SetLlmProviderHandler>('SET_LLM_PROVIDER', providerId: 'openai' | 'claude' | 'copilot')
```

**Handler:** `main.ts` → Updates provider

---

### `RESET`
**Purpose:** Reset conversation

**Payload:**
```typescript
emit<ResetHandler>('RESET')
```

**Handler:** `main.ts` → Clears messageHistory, sends `RESET_DONE`

---

### `REQUEST_SELECTION_STATE`
**Purpose:** Request current selection state

**Payload:**
```typescript
emit<RequestSelectionStateHandler>('REQUEST_SELECTION_STATE')
```

**Handler:** `main.ts` → Sends `SELECTION_STATE`

---

### `REQUEST_SETTINGS`
**Purpose:** Request current settings

**Payload:**
```typescript
emit<RequestSettingsHandler>('REQUEST_SETTINGS')
```

**Handler:** `main.ts` → Sends `SETTINGS_RESPONSE`

---

### `SAVE_SETTINGS`
**Purpose:** Save settings

**Payload:**
```typescript
emit<SaveSettingsHandler>('SAVE_SETTINGS', settings: Settings)
```

**Handler:** `main.ts` → Saves settings

---

### `RUN_TOOL`
**Purpose:** Execute a tool

**Payload:**
```typescript
emit<RunToolHandler>('RUN_TOOL', toolId: string, payload: Record<string, unknown>)
```

**Handler:** `main.ts` → Executes tool, sends `TOOL_RESULT`

---

## Main → UI Messages

### `ASSISTANT_MESSAGE`
**Purpose:** New message (user or assistant)

**Payload:**
```typescript
figma.ui.postMessage({
  pluginMessage: {
    type: 'ASSISTANT_MESSAGE',
    message: Message,
    resetToken?: number
  }
})
```

**Message Interface:**
```typescript
interface Message {
  id: string
  role: 'user' | 'assistant' | 'tool'
  content: string
  timestamp: number
  toolCallId?: string
  isStatus?: boolean
  statusStyle?: 'loading' | 'success' | 'error'
}
```

**Note:** Main thread is source of truth. UI should not add messages optimistically.

---

### `SELECTION_STATE`
**Purpose:** Current selection state

**Payload:**
```typescript
figma.ui.postMessage({
  pluginMessage: {
    type: 'SELECTION_STATE',
    state: SelectionState
  }
})
```

**SelectionState Interface:**
```typescript
interface SelectionState {
  count: number
  summary: string
  hasSelection: boolean
  names: string[]
}
```

---

### `SETTINGS_RESPONSE`
**Purpose:** Current settings

**Payload:**
```typescript
figma.ui.postMessage({
  pluginMessage: {
    type: 'SETTINGS_RESPONSE',
    settings: Settings
  }
})
```

---

### `TOOL_RESULT`
**Purpose:** Tool execution result

**Payload:**
```typescript
figma.ui.postMessage({
  pluginMessage: {
    type: 'TOOL_RESULT',
    message: Message,
    data?: Record<string, unknown>
  }
})
```

---

### `SCORECARD_PLACED`
**Purpose:** Scorecard rendered to canvas

**Payload:**
```typescript
figma.ui.postMessage({
  pluginMessage: {
    type: 'SCORECARD_PLACED',
    message: string,
    success?: boolean,
    resetToken?: number
  }
})
```

**Note:** Updates status message in UI (if status message exists)

---

### `CONTENT_TABLE_GENERATED`
**Purpose:** Content table generated

**Payload:**
```typescript
figma.ui.postMessage({
  pluginMessage: {
    type: 'CONTENT_TABLE_GENERATED',
    table: UniversalContentTableV1,
    resetToken?: number
  }
})
```

---

### `RESET_DONE`
**Purpose:** Reset completed

**Payload:**
```typescript
figma.ui.postMessage({
  pluginMessage: {
    type: 'RESET_DONE',
    resetToken?: number
  }
})
```

**Note:** UI should reset state when received

---

## Message Flow Patterns

### Quick Action Flow

```
UI: emit('RUN_QUICK_ACTION', actionId, assistantId)
  ↓
Main: Handler lookup → Execute action
  ↓
Main: (Optional) Call provider
  ↓
Main: postMessage('ASSISTANT_MESSAGE' or 'SCORECARD_PLACED' or 'CONTENT_TABLE_GENERATED')
  ↓
UI: Display result
```

### User Message Flow

```
UI: emit('SEND_MESSAGE', message, includeSelection)
  ↓
Main: Add to messageHistory
  ↓
Main: Call provider
  ↓
Main: postMessage('ASSISTANT_MESSAGE')
  ↓
UI: Display message
```

---

## Important Notes

1. **Reset Tokens:** Messages include `resetToken` to ignore late-arriving messages after reset
2. **Status Messages:** UI can show loading states, but main thread sends actual messages
3. **Message History:** Main thread maintains `messageHistory` array (single source of truth)
4. **UI Stateless:** UI thread should not maintain message state locally

---

## Reference

- **Main Thread:** `src/main.ts` (header comment)
- **UI Thread:** `src/ui.tsx` (header comment)
- **Type Definitions:** `src/core/types.ts`

