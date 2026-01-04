import { EventHandler } from '@create-figma-plugin/utilities'

// ============================================================================
// LLM Provider Types
// ============================================================================
export type LlmProviderId = 'openai' | 'claude' | 'copilot'

// ============================================================================
// Assistant Types
// ============================================================================
export type AssistantKind = 'ai' | 'tool' | 'hybrid'

export interface QuickAction {
  id: string
  label: string
  prompt: string
  requiresSelection?: boolean
}

export interface Assistant {
  id: string
  name: string
  description: string
  kind: AssistantKind
  iconId?: string
  quickActions: QuickAction[]
}

// ============================================================================
// Message Types
// ============================================================================
export type MessageRole = 'user' | 'assistant' | 'system' | 'tool'

export interface Message {
  id: string
  role: MessageRole
  content: string
  timestamp: number
  toolCallId?: string
}

// ============================================================================
// Selection Types
// ============================================================================
export interface SelectionState {
  count: number
  summary: string
  hasSelection: boolean
  names?: string[]
}

// ============================================================================
// Mode Types
// ============================================================================
export type Mode = 'simple' | 'advanced'

// ============================================================================
// UI → Main Events
// ============================================================================
export interface ResetHandler extends EventHandler {
  name: 'RESET'
  handler: () => void
}

export interface RequestSelectionStateHandler extends EventHandler {
  name: 'REQUEST_SELECTION_STATE'
  handler: () => void
}

export interface SendMessageHandler extends EventHandler {
  name: 'SEND_MESSAGE'
  handler: (message: string, includeSelection?: boolean) => void
}

export interface SetAssistantHandler extends EventHandler {
  name: 'SET_ASSISTANT'
  handler: (assistantId: string) => void
}

export interface SetModeHandler extends EventHandler {
  name: 'SET_MODE'
  handler: (mode: Mode) => void
}

export interface SetLlmProviderHandler extends EventHandler {
  name: 'SET_LLM_PROVIDER'
  handler: (providerId: LlmProviderId) => void
}

export interface RunQuickActionHandler extends EventHandler {
  name: 'RUN_QUICK_ACTION'
  handler: (actionId: string, assistantId: string) => void
}

export interface RunToolHandler extends EventHandler {
  name: 'RUN_TOOL'
  handler: (toolId: string, payload: Record<string, unknown>) => void
}

export interface SaveSettingsHandler extends EventHandler {
  name: 'SAVE_SETTINGS'
  handler: (settings: Record<string, unknown>) => void
}

export interface TestProxyConnectionHandler extends EventHandler {
  name: 'TEST_PROXY_CONNECTION'
  handler: () => void
}

// ============================================================================
// Main → UI Events
// ============================================================================
export interface ResetDoneHandler extends EventHandler {
  name: 'RESET_DONE'
  handler: () => void
}

export interface SelectionStateHandler extends EventHandler {
  name: 'SELECTION_STATE'
  handler: (state: SelectionState) => void
}

export interface AssistantMessageHandler extends EventHandler {
  name: 'ASSISTANT_MESSAGE'
  handler: (message: Message) => void
}

export interface ToolResultHandler extends EventHandler {
  name: 'TOOL_RESULT'
  handler: (message: Message, data?: Record<string, unknown>) => void
}

export interface TestResultHandler extends EventHandler {
  name: 'TEST_RESULT'
  handler: (success: boolean, message: string) => void
}

export interface RequestSettingsHandler extends EventHandler {
  name: 'REQUEST_SETTINGS'
  handler: () => void
}

export interface SettingsResponseHandler extends EventHandler {
  name: 'SETTINGS_RESPONSE'
  handler: (settings: Record<string, unknown>) => void
}

// ============================================================================
// Tool Types
// ============================================================================
export interface ToolCall {
  id: string
  name: string
  arguments: Record<string, unknown>
}

export interface ToolDefinition {
  id: string
  name: string
  description: string
  requiresSelection: boolean
  execute: (args: Record<string, unknown>, selection?: SelectionState) => Promise<string>
}

