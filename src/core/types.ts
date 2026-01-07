/**
 * Core Types
 * Central type definitions for the Figma assistant platform
 */

import type { EventHandler } from '@create-figma-plugin/utilities'
import type { UniversalContentTableV1, TableFormatPreset } from './contentTable/types'

// ============================================================================
// Basic Types
// ============================================================================

export type LlmProviderId = 'openai' | 'claude' | 'copilot'

export type Mode = 'simple' | 'advanced'

export type AssistantKind = 'ai' | 'tool' | 'hybrid'

// ============================================================================
// Selection State
// ============================================================================

export interface SelectionState {
  count: number
  summary: string
  hasSelection: boolean
  names: string[]
}

// ============================================================================
// Assistant Types
// ============================================================================

export interface QuickAction {
  id: string
  label: string
  templateMessage: string
  requiresSelection?: boolean
  requiresVision?: boolean
  maxImages?: number
  imageScale?: number
}

export interface Assistant {
  id: string
  label: string
  intro: string
  promptMarkdown: string
  iconId: string
  kind: AssistantKind
  quickActions: QuickAction[]
}

// ============================================================================
// Message Types
// ============================================================================

export interface Message {
  id: string
  role: 'user' | 'assistant' | 'tool'
  content: string
  timestamp: number
  toolCallId?: string
  isStatus?: boolean
  statusStyle?: 'loading' | 'success' | 'error'
}

// ============================================================================
// Tool Types
// ============================================================================

export interface ToolDefinition {
  id: string
  name: string
  description: string
  requiresSelection?: boolean
  execute: (args: Record<string, unknown>, selection?: SelectionState) => Promise<string>
}

export interface ToolCall {
  id?: string
  name: string
  arguments: Record<string, unknown>
}

// ============================================================================
// Scorecard Types
// ============================================================================

export interface ScorecardResult {
  type: 'scorecard'
  version: number
  summary: string
  overallScore: number
  items: Array<{
    label: string
    score: number
    outOf: number
    notes: string
  }>
  risks: string[]
  actions: string[]
}

// ============================================================================
// Event Handlers - UI → Main
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

export interface RequestSettingsHandler extends EventHandler {
  name: 'REQUEST_SETTINGS'
  handler: () => void
}

export interface CopyTableStatusHandler extends EventHandler {
  name: 'COPY_TABLE_STATUS'
  handler: (status: 'success' | 'error', message?: string) => void
}

export interface ExportContentTableRefImageHandler extends EventHandler {
  name: 'EXPORT_CONTENT_TABLE_REF_IMAGE'
  handler: (rootNodeId: string) => void
}

// ============================================================================
// Event Handlers - Main → UI
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

export interface SettingsResponseHandler extends EventHandler {
  name: 'SETTINGS_RESPONSE'
  handler: (settings: Record<string, unknown>) => void
}

export interface ScorecardPlacedHandler extends EventHandler {
  name: 'SCORECARD_PLACED'
  handler: (success: boolean, message: string, statusMessageId?: string) => void
}

export interface ScorecardResultHandler extends EventHandler {
  name: 'SCORECARD_RESULT'
  handler: (payload: ScorecardResult) => void
}

export interface ScorecardErrorHandler extends EventHandler {
  name: 'SCORECARD_ERROR'
  handler: (error: string, raw?: string) => void
}

export interface ContentTableGeneratedHandler extends EventHandler {
  name: 'CONTENT_TABLE_GENERATED'
  handler: (table: UniversalContentTableV1) => void
}

export interface ContentTableErrorHandler extends EventHandler {
  name: 'CONTENT_TABLE_ERROR'
  handler: (error: string) => void
}

export interface ContentTableRefImageReadyHandler extends EventHandler {
  name: 'CONTENT_TABLE_REF_IMAGE_READY'
  handler: (dataUrl: string) => void
}

export interface ContentTableRefImageErrorHandler extends EventHandler {
  name: 'CONTENT_TABLE_REF_IMAGE_ERROR'
  handler: (message: string) => void
}

export interface RunPlaceholderScorecardHandler extends EventHandler {
  name: 'RUN_PLACEHOLDER_SCORECARD'
  handler: () => void
}

export interface RunScorecardV2PlaceholderHandler extends EventHandler {
  name: 'RUN_SCORECARD_V2_PLACEHOLDER'
  handler: () => void
}

export interface PlaceholderScorecardPlacedHandler extends EventHandler {
  name: 'PLACEHOLDER_SCORECARD_PLACED'
  handler: () => void
}

export interface PlaceholderScorecardErrorHandler extends EventHandler {
  name: 'PLACEHOLDER_SCORECARD_ERROR'
  handler: (message: string) => void
}

// Re-export content table types
export type { UniversalContentTableV1, TableFormatPreset }
