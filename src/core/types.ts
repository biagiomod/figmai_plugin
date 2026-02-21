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

export type Mode = 'simple' | 'advanced' | 'content-mvp'

export type AssistantKind = 'ai' | 'tool' | 'hybrid'

// ============================================================================
// Selection State
// ============================================================================

export interface SelectionState {
  count: number
  summary: string
  hasSelection: boolean
  names: string[]
  /** Node IDs of selected items (used for rescan detection in CT-A). */
  nodeIds?: string[]
}

// ============================================================================
// Assistant Types
// ============================================================================

/** Required. Drives routing and handler selection (see docs/audits/refactor-kickoff-runtime-assistants-kb.md). */
export type ExecutionType = 'ui-only' | 'tool-only' | 'llm' | 'hybrid'

export interface QuickAction {
  id: string
  label: string
  templateMessage: string
  executionType: ExecutionType
  requiresSelection?: boolean
  requiresVision?: boolean
  maxImages?: number
  imageScale?: number
}

export interface AssistantTag {
  isVisible?: boolean
  label?: string
  variant?: 'new' | 'beta' | 'alpha'
}

/** Optional instruction block (manifest/ACE only; not wired to runtime in initial PR). */
export interface InstructionBlock {
  id: string
  label?: string
  kind: 'system' | 'behavior' | 'rules' | 'examples' | 'format' | 'context'
  content: string
  enabled?: boolean
}

/** Optional safety overrides (manifest/ACE only; not wired to runtime in initial PR). */
export interface SafetyOverrides {
  allowImages?: boolean
  safetyToggles?: Record<string, boolean>
}

export interface Assistant {
  id: string
  label: string
  intro: string
  /** Shown in chat when assistant is selected or chat resets. Falls back to intro if absent. */
  welcomeMessage?: string
  /** Shown in Select Assistant modal on hover. Falls back to intro if absent. */
  hoverSummary?: string
  /** Optional tag badge on assistant button in Select Assistant modal. */
  tag?: AssistantTag
  promptMarkdown: string
  iconId: string
  kind: AssistantKind
  quickActions: QuickAction[]
  /** Optional structured instructions (from manifest; not used by runtime in initial PR). */
  instructionBlocks?: InstructionBlock[]
  /** Optional tone/style preset (from manifest; not used by runtime in initial PR). */
  toneStylePreset?: string
  /** Optional output schema id (from manifest; not used by runtime in initial PR). */
  outputSchemaId?: string
  /** Optional safety overrides (from manifest; not used by runtime in initial PR). */
  safetyOverrides?: SafetyOverrides
  /** Optional KB refs by id (from manifest; not used by runtime in initial PR). */
  knowledgeBaseRefs?: string[]
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
  // Assistant switching context boundary fields
  assistantId?: string
  isBoundary?: boolean
  isGreeting?: boolean
  isInstructions?: boolean
  // Request lifecycle tracking
  requestId?: string
  /**
   * When true, main has already applied sanitizeForChat + cleanChatContent.
   * UI must store and render content as-is (no re-clean in reducer).
   */
  contentNormalized?: true
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
  handler: (options?: {
    connectionType?: 'proxy' | 'internal-api'
    internalApiUrl?: string
    proxyBaseUrl?: string
  }) => void
}

export interface RequestSettingsHandler extends EventHandler {
  name: 'REQUEST_SETTINGS'
  handler: (requestId?: string) => void
}

export interface CopyTableStatusHandler extends EventHandler {
  name: 'COPY_TABLE_STATUS'
  handler: (status: 'success' | 'error', message?: string) => void
}

export interface ExportContentTableRefImageHandler extends EventHandler {
  name: 'EXPORT_CONTENT_TABLE_REF_IMAGE'
  handler: (rootNodeId: string) => void
}

export interface RenderTableOnStagePayload {
  headers: string[]
  rows: string[][]
  title: string
  existingFrameId: string | null
  columnKeys?: string[]
}

export interface RenderTableOnStageHandler extends EventHandler {
  name: 'RENDER_TABLE_ON_STAGE'
  handler: (payload: RenderTableOnStagePayload) => void
}

export interface RenderPluginUIPreviewPayload {
  theme: 'light' | 'dark'
}

export interface RenderPluginUIPreviewHandler extends EventHandler {
  name: 'RENDER_PLUGIN_UI_PREVIEW'
  handler: (payload: RenderPluginUIPreviewPayload) => void
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
  handler: (settings: Record<string, unknown>, requestId?: string) => void
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

export interface AnalyticsTaggingSessionUpdatedHandler extends EventHandler {
  name: 'ANALYTICS_TAGGING_SESSION_UPDATED'
  handler: (session: unknown, warning?: string, screenIdWarning?: boolean, actionIdWarning?: boolean) => void
}

export interface AnalyticsTaggingOpenExportHandler extends EventHandler {
  name: 'ANALYTICS_TAGGING_OPEN_EXPORT'
  handler: (session: unknown) => void
}

export interface RequestAnalyticsTaggingSessionHandler extends EventHandler {
  name: 'REQUEST_ANALYTICS_TAGGING_SESSION'
  handler: () => void
}

export interface StartRowFromTargetSelectionHandler extends EventHandler {
  name: 'START_ROW_FROM_TARGET_SELECTION'
  handler: () => void
}

export interface UpdateDraftRowFieldsHandler extends EventHandler {
  name: 'UPDATE_DRAFT_ROW_FIELDS'
  handler: (updates: Record<string, unknown>) => void
}

export interface RequestSectionScreenshotCaptureHandler extends EventHandler {
  name: 'REQUEST_SECTION_SCREENSHOT_CAPTURE'
  handler: () => void
}

export interface DiscardDraftRowHandler extends EventHandler {
  name: 'DISCARD_DRAFT_ROW'
  handler: () => void
}

export interface AnalyticsTaggingUpdateRowHandler extends EventHandler {
  name: 'ANALYTICS_TAGGING_UPDATE_ROW'
  handler: (rowId: string, updates: Record<string, unknown>) => void
}

export interface RequestAnalyticsTaggingScreenshotHandler extends EventHandler {
  name: 'REQUEST_ANALYTICS_TAGGING_SCREENSHOT'
  handler: (screenshotRef: unknown) => void
}

/** UI→main: capture screenshot by node ids (meta-based); response READY/ERROR keyed by refId=rowId */
export interface RequestAnalyticsTaggingScreenshotByMetaHandler extends EventHandler {
  name: 'REQUEST_ANALYTICS_TAGGING_SCREENSHOT_BY_META'
  handler: (payload: { rowId: string; containerNodeId: string; targetNodeId: string; rootNodeId: string }) => void
}

/** Compact row for export (no full session); main resolves nodes from meta or screenshotRef */
export type AnalyticsTaggingExportCompactRow = {
  rowId: string
  screenId: string
  actionId: string
  meta?: { containerNodeId: string; targetNodeId: string; rootScreenNodeId: string }
  screenshotRef?: { containerNodeId: string; targetNodeId: string; rootNodeId: string }
}

/** UI→main: export screenshots; main streams EXPORT_ITEM then EXPORT_DONE */
export interface ExportAnalyticsTaggingScreenshotsHandler extends EventHandler {
  name: 'EXPORT_ANALYTICS_TAGGING_SCREENSHOTS'
  handler: (payload: { rows: AnalyticsTaggingExportCompactRow[] }) => void
}

/** UI→main: export one row screenshot; main emits single ANALYTICS_TAGGING_EXPORT_ITEM */
export interface ExportAnalyticsTaggingOneRowHandler extends EventHandler {
  name: 'EXPORT_ANALYTICS_TAGGING_ONE_ROW'
  handler: (payload: { row: AnalyticsTaggingExportCompactRow }) => void
}

export interface AnalyticsTaggingScreenshotReadyHandler extends EventHandler {
  name: 'ANALYTICS_TAGGING_SCREENSHOT_READY'
  handler: (refId: string, dataUrl: string) => void
}

export interface AnalyticsTaggingScreenshotErrorHandler extends EventHandler {
  name: 'ANALYTICS_TAGGING_SCREENSHOT_ERROR'
  handler: (refId: string, message: string) => void
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
