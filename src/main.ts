/**
 * @license MIT
 * Copyright (c) 2026 Biagio Goetzke
 */

/**
 * FigmAI Plugin - Main Thread
 * 
 * ARCHITECTURE OVERVIEW
 * =====================
 * 
 * This file is the orchestrator for the FigmAI plugin's main thread. It runs in Figma's
 * plugin sandbox and has access to the Figma API. It communicates with the UI thread
 * (ui.tsx) via postMessage.
 * 
 * ROLE OF MAIN.TS
 * ---------------
 * - Message routing: Receives events from UI, routes to appropriate handlers
 * - Handler orchestration: Looks up and executes assistant handlers
 * - Provider management: Creates and manages LLM provider instances
 * - Selection context building: Builds selection state, summary, and images
 * - Canvas rendering: Delegates rendering to handlers or default flow
 * - Message history: Maintains conversation history (single source of truth)
 * 
 * MESSAGE ROUTING RESPONSIBILITIES
 * --------------------------------
 * - Receives events via `on<HandlerType>()` from UI thread
 * - Routes quick actions to handlers via `getHandler()`
 * - Sends responses back to UI via `figma.ui.postMessage()`
 * - Maintains message history in `messageHistory` array
 * 
 * HANDLER EXECUTION LIFECYCLE
 * ----------------------------
 * 1. Handler lookup: `getHandler(assistantId, actionId)`
 * 2. Pre-LLM handler (optional): Some handlers run before provider call
 *    - Example: Content Table scanning (no LLM needed)
 *    - Returns `{ handled: true }` to skip LLM call
 * 3. Message preparation: Build selection context, normalize messages
 * 4. Handler.prepareMessages() (optional): Modify messages before LLM call
 *    - Example: Design Critique adds JSON enforcement messages
 * 5. Provider call: `provider.sendChat()` with normalized messages
 * 6. Post-LLM handler (optional): Process provider response
 *    - Example: Design Critique parses JSON, renders scorecard
 *    - Returns `{ handled: true }` to skip default message display
 * 7. Default flow: If handler didn't handle, send response to UI as chat message
 * 
 * WHERE ADAPTERS ARE INVOKED
 * ---------------------------
 * - Work adapter is imported dynamically in UI thread (ui.tsx)
 * - Main thread does not directly call work adapter
 * - Extension points are called in:
 *   - Content Table scanner: `workAdapter.designSystem?.shouldIgnore(node)`
 *   - UI Confluence integration: `workAdapter.confluenceApi?.sendTable(table, format)`
 * 
 * WHAT MUST REMAIN STABLE FOR WORK MIGRATION
 * ------------------------------------------
 * - Handler pattern: Work Plugin can add handlers, but not modify core
 * - Provider system: Work Plugin can add providers, but not modify core
 * - Rendering systems: Work Plugin should reuse as-is
 * - Message flow: Work Plugin should not change message contract
 * - Selection context: Work Plugin can extend, but not modify core
 * 
 * IMPORTANT ASSUMPTIONS
 * ---------------------
 * - Main thread is the single source of truth for message history
 * - UI thread is stateless and displays messages as they arrive
 * - Handlers are responsible for assistant-specific logic
 * - Providers normalize all requests/responses
 * - Selection context is built once per request
 */

import { on, once, showUI } from '@create-figma-plugin/utilities'
import { getAnalytics } from './core/analytics'
import { categorizeError } from './core/analytics/errorCodes'

import { BRAND } from './core/brand'
import { CONFIG } from './core/config'
import { debug } from './core/debug/logger'
import { getDefaultAssistant, getAssistant, getWelcomeMessage, listAssistants, getShortInstructions } from './assistants'
import { buildAssistantInstructionSegments } from './core/assistants/instructionAssembly'
import { resolveKnowledgeBaseDocs } from './core/knowledgeBases/resolveKb'
import type { Assistant } from './assistants'
import { createProvider } from './core/provider/providerFactory'
import type { Provider, ChatRequest } from './core/provider/provider'
import { StubProvider } from './core/provider/stubProvider'
import { InternalApiProvider } from './core/provider/internalApiProvider'
import { normalizeMessages } from './core/provider/normalize'
import { sendChatWithRecovery } from './core/contentSafety'
import { routeToolCall } from './core/tools/toolRouter'
import { summarizeSelection } from './core/context/selection'
import { buildSelectionContext } from './core/context/selectionContext'
import { saveSettings, getSettings, getEffectiveSettings, getDefaultSettingsForResponse } from './core/settings'
import { ProxyError } from './core/proxy/client'
import { ProviderError, ProviderErrorType, errorToString } from './core/provider/provider'
import type {
  ResetHandler,
  RequestSelectionStateHandler,
  RequestSettingsHandler,
  SendMessageHandler,
  SetAssistantHandler,
  SetModeHandler,
  SetLlmProviderHandler,
  RunQuickActionHandler,
  RunToolHandler,
  SaveSettingsHandler,
  TestProxyConnectionHandler,
  ResetDoneHandler,
  SelectionStateHandler,
  AssistantMessageHandler,
  ToolResultHandler,
  TestResultHandler,
  SettingsResponseHandler,
  ScorecardPlacedHandler,
  UniversalContentTableV1,
  Message,
  SelectionState,
  LlmProviderId,
  ToolCall,
  CopyTableStatusHandler,
  ExportContentTableRefImageHandler,
  RunPlaceholderScorecardHandler,
  RunScorecardV2PlaceholderHandler,
  RequestAnalyticsTaggingSessionHandler,
  AnalyticsTaggingUpdateRowHandler,
  RequestAnalyticsTaggingScreenshotHandler,
  RequestAnalyticsTaggingScreenshotByMetaHandler,
  ExportAnalyticsTaggingScreenshotsHandler,
  ExportAnalyticsTaggingOneRowHandler
} from './core/types'
import { loadSession, saveSession } from './core/analyticsTagging/storage'
import { captureVisibleInArea, exportNodeThumbnailPngBytes } from './core/analyticsTagging/screenshot'
import type { Row, Session, ScreenshotRef } from './core/analyticsTagging/types'
import { scanContentTable } from './core/contentTable/scanner'
import { normalizeDesignCritique, fromDesignCritiqueJson, parseScorecardJson } from './core/output/normalize'
import { renderDocumentToStage } from './core/stage/renderDocument'
import { parseDesignSpecJson, renderDesignSpecToStage } from './core/stage/renderDesignSpec'
import { renderPlaceholderScorecard } from './core/figma/renderPlaceholderScorecard'
import { renderScorecard, renderScorecardV2, type ScorecardData } from './core/figma/renderScorecard'
import { getHandler } from './core/assistants/handlers'
import { getTopLevelContainerNode } from './core/stage/anchor'
import { BUILD_VERSION } from './core/build'
import type { ExecutionType } from './core/types'

/**
 * Convert an error to a human-readable string with actionable feedback
 * Uses ProviderError for consistent error handling across all providers
 */
// State
let currentAssistant: Assistant = getDefaultAssistant()
let currentMode: 'simple' | 'advanced' | 'content-mvp' = CONFIG.defaultMode
let currentProviderId: LlmProviderId = CONFIG.provider
let currentProvider: Provider | null = null
let messageHistory: Message[] = []
let selectionOrder: string[] = []
let lastAssistantId: string | null = null
let preambleSentForSegment: string | null = null // Track if preamble sent for current segment (segmentId = assistantId)

/** Safe session header: neutral framing for providers (e.g. Internal API). No instruction-override or jailbreak-style language. */
const SESSION_HEADER_SAFE =
  'Start a new conversation.'

// Initialize provider
async function initializeProvider() {
  try {
    currentProvider = await createProvider(currentProviderId)
    // Optional: one-time background health check when effective provider is internal-api with endpoint
    const effective = await getEffectiveSettings()
    if (effective.connectionType === 'internal-api' && effective.internalApiUrl?.trim()) {
      const provider = currentProvider
      if (provider && typeof provider.testConnection === 'function') {
        provider.testConnection({ internalApiUrl: effective.internalApiUrl }).then(
          (result) => {
            if (!result.success) {
              figma.notify('Connection check failed. Check Settings if AI actions do not work.', { timeout: 5000 })
            }
          },
          () => {
            figma.notify('Connection check failed. Check Settings if AI actions do not work.', { timeout: 5000 })
          }
        )
      }
    }
  } catch (error) {
    console.error('[Main] Failed to initialize provider:', error)
    // Fallback to stub provider
    currentProvider = new StubProvider()
  }
}

// Initialize on startup
console.log('[Main] Build version:', BUILD_VERSION)
initializeProvider()

// Runtime error detection for sync API calls (dev mode only)
if (CONFIG.dev.enableSyncApiErrorDetection) {
  // Wrap console.error to catch sync API errors
  const originalConsoleError = console.error
  console.error = function(...args: any[]) {
    const errorMessage = args.join(' ')
    // Detect sync API errors
    if (errorMessage.includes('getNodeById') && 
        errorMessage.includes('Cannot call with documentAccess: dynamic-page')) {
      console.error('[SYNC_API_ERROR] ⚠️ Detected sync getNodeById call!')
      console.error('[SYNC_API_ERROR] Error message:', errorMessage)
      console.error('[SYNC_API_ERROR] Stack trace:', new Error().stack)
      console.error('[SYNC_API_ERROR] This indicates a sync API call exists somewhere in the codebase')
      console.error('[SYNC_API_ERROR] Please search for: figma.getNodeById( or .getNodeById(')
    }
    if (errorMessage.includes('getStyleById') && 
        errorMessage.includes('Cannot call with documentAccess: dynamic-page')) {
      console.error('[SYNC_API_ERROR] ⚠️ Detected sync getStyleById call!')
      console.error('[SYNC_API_ERROR] Error message:', errorMessage)
      console.error('[SYNC_API_ERROR] Stack trace:', new Error().stack)
    }
    if (errorMessage.includes('getVariableById') && 
        errorMessage.includes('Cannot call with documentAccess: dynamic-page')) {
      console.error('[SYNC_API_ERROR] ⚠️ Detected sync getVariableById call!')
      console.error('[SYNC_API_ERROR] Error message:', errorMessage)
      console.error('[SYNC_API_ERROR] Stack trace:', new Error().stack)
    }
    // Call original console.error
    originalConsoleError.apply(console, args)
  }
}

// Generate unique message ID
function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// Generate unique request ID
function generateRequestId(): string {
  return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Get current assistant segment from message history
 * Returns only messages from the current assistant segment, excluding UI-only messages
 */
function getCurrentAssistantSegment(messages: Message[], currentAssistantId: string): Message[] {
  // Find the last boundary message for the current assistant
  let segmentStartIndex = 0
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].isBoundary && messages[i].assistantId === currentAssistantId) {
      segmentStartIndex = i + 1
      break
    }
  }
  
  // Get messages from segment start to end, excluding UI-only messages
  const segment = messages.slice(segmentStartIndex).filter(m => {
    // Exclude UI-only messages (boundary, greeting, instructions, status)
    if (m.isBoundary || m.isGreeting || m.isInstructions || m.isStatus) {
      return false
    }
    // Only include user and assistant messages (exclude tool messages for now)
    return m.role === 'user' || m.role === 'assistant'
  })
  
  return segment
}

// Send selection state to UI
function sendSelectionState() {
  const state = summarizeSelection(selectionOrder)
  figma.ui.postMessage({ pluginMessage: { type: 'SELECTION_STATE', state } })
}

// Clean chat content by removing internal generation metadata tags
// Removes patterns like "generate: 1/100 (1%)" that should not appear in user-facing chat
// Also removes duplicate lines/paragraphs within the same message
function cleanChatContent(raw: string): string {
  if (!raw) return ''

  // Strip internal generation metadata like: "generate: 1/100 (1%)"
  let text = raw
    .replace(/generate:\s*\d+\/\d+\s*\(\d+%\)/gi, '') // generate: X/Y (Z%)
    .replace(/generate:\s*\d+\/\d+/gi, '')            // generate: X/Y
    .replace(/\(\d+%\)/g, '')                         // standalone "(Z%)"
    .trim()

  // Remove duplicate lines (split by newlines, keep unique)
  // Do this BEFORE collapsing whitespace to preserve line structure
  const lines = text.split(/\n+/).filter(line => line.trim().length > 0)
  const uniqueLines: string[] = []
  const seen = new Set<string>()
  
  for (const line of lines) {
    const normalized = line.trim().toLowerCase().replace(/\s+/g, ' ')
    // Only skip if we've seen this exact normalized line before
    if (!seen.has(normalized)) {
      seen.add(normalized)
      uniqueLines.push(line.trim())
    }
  }

  text = uniqueLines.join('\n')
  
  // Collapse multiple spaces to single space (but preserve newlines)
  text = text.replace(/[ \t]+/g, ' ').trim()

  return text
}

// Send assistant message to UI
function sendAssistantMessage(content: string, toolCallId?: string, requestId?: string) {
  // Clean content before sending to remove internal metadata tags
  const cleanedContent = cleanChatContent(content)
  
  const message: Message = {
    id: generateMessageId(),
    role: 'assistant',
    content: cleanedContent,
    timestamp: Date.now(),
    toolCallId,
    requestId
  }
  messageHistory.push(message)
  
  figma.ui.postMessage({ pluginMessage: { type: 'ASSISTANT_MESSAGE', message } })
}

// Send status message (UI-only, excluded from outbound context)
function sendStatusMessage(requestId: string, content: string = 'Processing...'): Message {
  const statusMessage: Message = {
    id: generateMessageId(),
    role: 'assistant',
    content,
    timestamp: Date.now(),
    isStatus: true,
    statusStyle: 'loading',
    requestId
  }
  messageHistory.push(statusMessage)
  figma.ui.postMessage({ pluginMessage: { type: 'ASSISTANT_MESSAGE', message: statusMessage } })
  return statusMessage
}

// Guard: only replace status once per requestId (avoids duplicate final message from repeat events).
const replacedStatusRequestIds = new Set<string>()
// Guard: only run final status update once per requestId for tool-only (avoids duplicate "Add HAT: …" lines).
const completedToolOnlyRequestIds = new Set<string>()

let mainTraceCounter = 0
function qaTrace(marker: string, data: Record<string, unknown>) {
  if (!debug.isEnabled('trace:chat')) return
  mainTraceCounter += 1
  debug.scope('trace:chat').log(`QA_TRACE ${marker}`, { n: mainTraceCounter, ...data })
}

// Replace status message in-place with final message. Dedupe: replace first matching status, remove any other status entries for same requestId, then post once.
function replaceStatusMessage(requestId: string, finalContent: string, isError: boolean = false) {
  if (replacedStatusRequestIds.has(requestId)) return
  replacedStatusRequestIds.add(requestId)

  const indices = messageHistory
    .map((m, i) => (m.requestId === requestId && m.isStatus === true ? i : -1))
    .filter(i => i >= 0)

  if (indices.length === 0) {
    // Replace any existing message with this requestId so we don't append a duplicate line
    const anyWithRequestId = messageHistory.findIndex(m => m.requestId === requestId)
    if (anyWithRequestId !== -1) {
      const cleanedContent = cleanChatContent(finalContent)
      const summaryHash = cleanedContent.slice(0, 40) + '_' + cleanedContent.length
      qaTrace('MAIN_POST_FINAL', { requestId, summaryHash, messageLength: cleanedContent.length, messagePreviewEnd: cleanedContent.slice(-40) })
      const finalMessage: Message = {
        ...messageHistory[anyWithRequestId],
        content: cleanedContent,
        timestamp: Date.now(),
        isStatus: false,
        statusStyle: isError ? 'error' : undefined
      }
      messageHistory[anyWithRequestId] = finalMessage
      figma.ui.postMessage({ pluginMessage: { type: 'ASSISTANT_MESSAGE', message: finalMessage } })
    } else {
      replacedStatusRequestIds.delete(requestId)
      console.warn('[Main] Status message not found for requestId:', requestId)
      sendAssistantMessage(finalContent, undefined, requestId)
    }
    return
  }

  const cleanedContent = cleanChatContent(finalContent)
  const summaryHash = cleanedContent.slice(0, 40) + '_' + cleanedContent.length
  qaTrace('MAIN_POST_FINAL', { requestId, summaryHash, messageLength: cleanedContent.length, messagePreviewEnd: cleanedContent.slice(-40) })
  const finalMessage: Message = {
    id: messageHistory[indices[0]].id,
    role: 'assistant',
    content: cleanedContent,
    timestamp: Date.now(),
    requestId,
    isStatus: false,
    statusStyle: isError ? 'error' : undefined
  }
  messageHistory[indices[0]] = finalMessage
  const toRemove = indices.slice(1).sort((a, b) => b - a)
  for (const idx of toRemove) {
    messageHistory.splice(idx, 1)
  }
  figma.ui.postMessage({ pluginMessage: { type: 'ASSISTANT_MESSAGE', message: finalMessage } })
}

// Send tool result to UI
function sendToolResult(content: string, toolId: string, data?: Record<string, unknown>) {
  const message: Message = {
    id: generateMessageId(),
    role: 'tool',
    content,
    timestamp: Date.now(),
    toolCallId: toolId
  }
  messageHistory.push(message)
  
  figma.ui.postMessage({ pluginMessage: { type: 'TOOL_RESULT', message, data } })
}

// Handle reset
once<ResetHandler>('RESET', async function () {
  messageHistory = []
  currentAssistant = getDefaultAssistant()
  currentMode = CONFIG.defaultMode
  currentProviderId = CONFIG.provider
  currentProvider = await createProvider(currentProviderId)
  selectionOrder = []
  
  // Send assistant intro on reset
  const introMessage: Message = {
    id: generateMessageId(),
    role: 'assistant',
    content: getWelcomeMessage(currentAssistant),
    timestamp: Date.now()
  }
  messageHistory.push(introMessage)
  figma.ui.postMessage({ pluginMessage: { type: 'ASSISTANT_MESSAGE', message: introMessage } })
  
  sendSelectionState()
  
  figma.ui.postMessage({ pluginMessage: { type: 'RESET_DONE' } })
})

// Handle selection state request
on<RequestSelectionStateHandler>('REQUEST_SELECTION_STATE', function () {
  console.log('[Main] onmessage REQUEST_SELECTION_STATE')
  sendSelectionState()
})

// Helper to check if a message looks like a Design Workshop intro (local to main.ts)
function isDesignWorkshopIntroMessage(content: string): boolean {
  const normalized = content.toLowerCase()
  return (
    normalized.includes('welcome to your design workshop assistant') ||
    normalized.includes('i generate 1-5 figma screens from a json specification')
  )
}

// Helper to check if a message looks like a Content Table Assistant intro (local to main.ts)
function isContentTableIntroMessage(content: string): boolean {
  const normalized = content.toLowerCase()
  return normalized.includes('welcome to your content table assistant')
}

// Handle set assistant
on<SetAssistantHandler>('SET_ASSISTANT', function (assistantId: string) {
  console.log('[Main] onmessage SET_ASSISTANT', { assistantId, lastAssistantId })
  const assistant = getAssistant(assistantId)
  if (assistant) {
    const assistantChanged = lastAssistantId !== assistantId
    currentAssistant = assistant
    
    // If assistant changed, insert boundary + greeting + instructions
    if (assistantChanged) {
      // Reset preamble tracking for new segment
      preambleSentForSegment = null
      
      // Insert boundary marker
      const boundaryMessage: Message = {
        id: generateMessageId(),
        role: 'assistant',
        content: '', // Empty content, UI will render divider
        timestamp: Date.now(),
        assistantId: assistantId,
        isBoundary: true
      }
      messageHistory.push(boundaryMessage)
      figma.ui.postMessage({ pluginMessage: { type: 'ASSISTANT_MESSAGE', message: boundaryMessage } })
      
      // Insert greeting message (assistant name/label)
      const greetingMessage: Message = {
        id: generateMessageId(),
        role: 'assistant',
        content: `Hi! I'm your ${assistant.label} Assistant!`,
        timestamp: Date.now(),
        assistantId: assistantId,
        isGreeting: true
      }
      messageHistory.push(greetingMessage)
      figma.ui.postMessage({ pluginMessage: { type: 'ASSISTANT_MESSAGE', message: greetingMessage } })
      
      // Insert instructions message (assistant intro/usage instructions)
      const instructionsMessage: Message = {
        id: generateMessageId(),
        role: 'assistant',
        content: getWelcomeMessage(assistant),
        timestamp: Date.now(),
        assistantId: assistantId,
        isInstructions: true
      }
      messageHistory.push(instructionsMessage)
      figma.ui.postMessage({ pluginMessage: { type: 'ASSISTANT_MESSAGE', message: instructionsMessage } })
      
      console.log('[Main] Inserted boundary + greeting + instructions for assistant:', assistantId)
    } else {
      console.log('[Main] Assistant unchanged, skipping boundary insertion:', assistantId)
    }
    
    lastAssistantId = assistantId
  }
})

// Handle set mode
on<SetModeHandler>('SET_MODE', function (mode: 'simple' | 'advanced' | 'content-mvp') {
  currentMode = mode
})

// Handle set LLM provider
on<SetLlmProviderHandler>('SET_LLM_PROVIDER', async function (providerId: LlmProviderId) {
  currentProviderId = providerId
  currentProvider = await createProvider(providerId)
})

// Handle send message
on<SendMessageHandler>('SEND_MESSAGE', async function (message: string, includeSelection?: boolean) {
  console.log('[Main] onmessage SEND_MESSAGE', { messageLength: message.length, includeSelection })
  
  // Generate request ID for this request
  const requestId = generateRequestId()
  
  // Add user message to history
  const userMessage: Message = {
    id: generateMessageId(),
    role: 'user',
    content: message,
    timestamp: Date.now()
  }
  messageHistory.push(userMessage)
  
  // Send user message to UI (main thread is source of truth)
  console.log('[Main] Sending user message to UI (single source of truth):', userMessage.id)
  figma.ui.postMessage({ pluginMessage: { type: 'ASSISTANT_MESSAGE', message: userMessage } })
  
  // Create status message immediately
  sendStatusMessage(requestId, 'Processing...')
  
  // Build selection context if needed
  let selectionContext: Awaited<ReturnType<typeof buildSelectionContext>> | undefined
  if (includeSelection && currentProvider) {
    selectionContext = await buildSelectionContext({
      selectionOrder,
      quickAction: undefined, // No quick action for manual messages
      provider: currentProvider
    })
  }
  
  // Handle tool-only assistants
  if (currentAssistant.kind === 'tool') {
    replaceStatusMessage(requestId, `Tool-only assistant "${currentAssistant.label}" is active. Tool execution would happen here.`)
    return
  }
  
  // Build chat messages from current assistant segment only
  // This ensures old assistant instructions don't bleed into new assistant context
  const segmentMessages = getCurrentAssistantSegment(messageHistory, currentAssistant.id)
  const chatMessages = normalizeMessages(
    segmentMessages.map(m => ({
      role: m.role,
      content: m.content
    }))
  )
  
  // Apply preamble injection for providers that support it (Internal API only)
  let finalChatMessages = chatMessages
  let assistantPreambleForRecovery: string | undefined
  let allowImagesForRecovery: boolean | undefined
  if (currentProvider && currentProvider.capabilities.supportsPreambleInjection) {
    // Check if this is the first user message in the segment
    const isFirstUserMessage = segmentMessages.length > 0 &&
      segmentMessages[0].role === 'user' &&
      preambleSentForSegment !== currentAssistant.id

    if (isFirstUserMessage && finalChatMessages.length > 0 && finalChatMessages[0].role === 'user') {
      const kbDocs = resolveKnowledgeBaseDocs(currentAssistant.knowledgeBaseRefs ?? [])
      const built = buildAssistantInstructionSegments({
        assistantEntry: currentAssistant,
        actionId: undefined,
        legacyInstructionsSource: getShortInstructions(currentAssistant),
        kbDocs
      })
      const preamble =
        SESSION_HEADER_SAFE +
        '\n\n' +
        `${currentAssistant.label} context: ${built.instructionPreambleText}\n\n`
      assistantPreambleForRecovery = preamble
      if (built.allowImagesOverride === true) allowImagesForRecovery = true
      finalChatMessages[0] = {
        ...finalChatMessages[0],
        content: preamble + finalChatMessages[0].content
      }
      preambleSentForSegment = currentAssistant.id
      console.log('[Main] Injected preamble for Internal API (first message in segment)')
    }
  }
  
  // Check if handler exists for chat messages (actionId: undefined)
  const handler = getHandler(currentAssistant.id, undefined)
  if (handler && handler.prepareMessages) {
    const prepared = handler.prepareMessages(finalChatMessages)
    if (prepared) {
      finalChatMessages = prepared
    }
  }
  
  // Call provider
  try {
    if (!currentProvider) {
      currentProvider = await createProvider(currentProviderId)
      // Rebuild context if provider was just created
      if (includeSelection) {
        selectionContext = await buildSelectionContext({
          selectionOrder,
          quickAction: undefined,
          provider: currentProvider
        })
      }
    }
    const recoveryResult = await sendChatWithRecovery(currentProvider, {
      messages: finalChatMessages,
      assistantId: currentAssistant.id,
      assistantName: currentAssistant.label,
      selection: selectionContext?.selection,
      selectionSummary: selectionContext?.selectionSummary,
      images: selectionContext?.images,
      quickActionId: undefined
    }, {
      selectionSummary: selectionContext?.selectionSummary,
      assistantId: currentAssistant.id,
      quickActionId: undefined,
      assistantPreamble: assistantPreambleForRecovery,
      allowImages: allowImagesForRecovery
    })
    if (recoveryResult.diagnostics) {
      figma.ui.postMessage({ pluginMessage: { type: 'PROMPT_DIAG', diagnostics: recoveryResult.diagnostics } })
    }
    const response = recoveryResult.response
    const contentSimplified = recoveryResult.recoveredWithSummary === true

    // Check if handler can process the response
    if (handler) {
      const handlerContext = {
        assistantId: currentAssistant.id,
        actionId: undefined as string | undefined,
        response,
        selectionOrder,
        selection: selectionContext?.selection || summarizeSelection(selectionOrder),
        provider: currentProvider!,
        sendChatWithRecovery: async (req: ChatRequest) => {
          const r = await sendChatWithRecovery(currentProvider!, req, {
            selectionSummary: req.selectionSummary ?? selectionContext?.selectionSummary,
            assistantId: currentAssistant.id,
            quickActionId: undefined
          })
          return r.response
        },
        sendAssistantMessage,
        replaceStatusMessage: (finalContent: string, isError?: boolean) => replaceStatusMessage(requestId, finalContent, isError),
        requestId
      }
      
      if (typeof handler.handleResponse !== 'function') {
        throw new Error(`[Handlers] Handler for ${currentAssistant.id}/undefined has no handleResponse function`)
      }
      const result = await handler.handleResponse(handlerContext)
      if (result.handled) {
        // Handler should have called replaceStatusMessage itself
        // If not, replace with default completion message
        const statusIndex = messageHistory.findIndex(m => m.requestId === requestId && m.isStatus === true)
        if (statusIndex !== -1) {
          replaceStatusMessage(requestId, result.message || 'Completed')
        }
        return
      }
    }
    
    // Only send to chat if handler didn't handle it
    replaceStatusMessage(requestId, contentSimplified ? `${response}\n\nSome content was simplified to obtain this response.` : response)

    // Track assistant complete (success) for chat messages
    getAnalytics().track('assistant_complete', {
      assistantId: currentAssistant.id,
      success: true
    })
  } catch (error) {
    const isContentPolicy = error instanceof ProviderError && error.type === ProviderErrorType.CONTENT_FILTER
    const displayMessage = isContentPolicy ? (error as ProviderError).message : `Error: ${errorToString(error)}`
    replaceStatusMessage(requestId, displayMessage, true)

    // Track error
    getAnalytics().track('error', {
      category: categorizeError(error),
      assistantId: currentAssistant.id
    })

    // Track assistant complete (failure)
    getAnalytics().track('assistant_complete', {
      assistantId: currentAssistant.id,
      success: false
    })
  }
})


/**
 * Resolve executionType from quick action metadata for RUN_QUICK_ACTION routing.
 * Returns 'unknown' if executionType missing (legacy fallback).
 */
function resolveExecutionType (action: { executionType?: string }): ExecutionType | 'unknown' {
  const t = action.executionType
  if (t === 'ui-only' || t === 'tool-only' || t === 'llm' || t === 'hybrid') return t as ExecutionType
  return 'unknown'
}

// Handle quick action
on<RunQuickActionHandler>('RUN_QUICK_ACTION', async function (actionId: string, assistantId: string) {
  console.log('[Main] onmessage RUN_QUICK_ACTION', { actionId, assistantId })

  // Generate request ID for this request
  const requestId = generateRequestId()
  qaTrace('MAIN_RECV_RUN_QUICK_ACTION', { requestId, assistantId, actionId })

  try {
    const assistant = getAssistant(assistantId)
    if (!assistant) {
      console.error('[Main] Assistant not found:', assistantId)
      sendAssistantMessage(`Error: Assistant "${assistantId}" not found`)
      return
    }

    const action = assistant.quickActions.find((a: import('./assistants').QuickAction) => a.id === actionId)
    if (!action) {
      console.error('[Main] Action not found:', actionId, 'for assistant:', assistantId)
      sendAssistantMessage(`Error: Action "${actionId}" not found`)
      return
    }

    // Track assistant run (after validation)
    getAnalytics().track('assistant_run', {
      assistantId: assistant.id,
      actionId: action.id
    })

    // Route by executionType (from manifest / PR2–PR3). Legacy fallback: 'unknown' uses same tool-only branches.
    const executionType = resolveExecutionType(action)
    const handler = getHandler(assistantId, actionId)

    // ——— ui-only: defensive no-op (UI should not send these to main) ———
    if (executionType === 'ui-only') {
      return
    }

    // ——— tool-only (and legacy unknown): single generic path ———
    // Status lifecycle: only main calls replaceStatusMessage once per requestId (guard prevents duplicate final message).
    if ((executionType === 'tool-only' || executionType === 'unknown') && handler) {
      sendStatusMessage(requestId, 'Processing…')
      const providerForContext = currentProvider || await createProvider(currentProviderId)
      const handlerContext = {
        assistantId,
        actionId,
        response: '',
        selectionOrder,
        selection: summarizeSelection(selectionOrder),
        provider: providerForContext,
        sendChatWithRecovery: async (req: ChatRequest) => {
          const r = await sendChatWithRecovery(providerForContext, req, {
            selectionSummary: req.selectionSummary,
            assistantId,
            quickActionId: actionId
          })
          return r.response
        },
        sendAssistantMessage,
        replaceStatusMessage: (finalContent: string, isError?: boolean) => replaceStatusMessage(requestId, finalContent, isError),
        requestId
      }
      if (typeof handler.handleResponse !== 'function') {
        throw new Error(`[Handlers] Handler for ${assistantId}/${actionId} has no handleResponse function`)
      }
      qaTrace('MAIN_CALL_HANDLER', { requestId })
      const result = await handler.handleResponse(handlerContext)
      qaTrace('MAIN_HANDLER_RETURN', { requestId, handled: result.handled, hasMessage: !!(result as { message?: string }).message })
      if (result.handled) {
        if (completedToolOnlyRequestIds.has(requestId)) {
          console.log('[Main] tool-only already completed for requestId, skipping duplicate status:', requestId)
          return
        }
        completedToolOnlyRequestIds.add(requestId)
        replaceStatusMessage(requestId, result.message ?? 'Done')
        return
      }
    }

    // ——— code2design (hybrid / legacy): main no-op or canned message ———
    if (assistantId === 'code2design') {
      if (actionId === 'send-json') {
        return
      }
      if (actionId === 'get-json') {
        return
      }
      if (actionId === 'json-format-help') {
        const helpMessage = `**FigmAI Template JSON Format**

**Schema Version:** 1.0

**Required Top-Level Keys:**
- \`schemaVersion\`: Must be "1.0"
- \`root\`: The root template node

**Supported Node Types (v1):**
- \`FRAME\`: Container with optional auto-layout
- \`TEXT\`: Text node with content
- \`RECTANGLE\`: Rectangle shape

**Safety Limits:**
- Maximum depth: 12 levels
- Maximum nodes: 300
- Invalid JSON will not modify the canvas

**Example Structure:**
\`\`\`json
{
  "schemaVersion": "1.0",
  "meta": { "name": "My Design" },
  "root": {
    "type": "FRAME",
    "name": "Card",
    "layout": { "mode": "AUTO_LAYOUT", "direction": "VERTICAL" },
    "children": [...]
  }
}
\`\`\`

Use SEND JSON to import or GET JSON to export your designs.`
        replaceStatusMessage(requestId, helpMessage)
        return
      }
    }

    // ——— llm (and any fallthrough): sendChatWithRecovery + handler hooks ———
    // Check selection requirement (need to check before building context)
  const selection = summarizeSelection(selectionOrder)
  if (action.requiresSelection && !selection.hasSelection) {
    replaceStatusMessage(requestId, `Error: This action requires a selection. Please select one or more nodes first.`, true)
    return
  }
  
  // Check vision requirement
  if (action.requiresVision && !selection.hasSelection) {
    replaceStatusMessage(requestId, `Error: This action requires a selection to analyze. Please select a frame or design element first.`, true)
    return
  }
  
  // Note: "Analyzing..." message is now handled in UI before sending the action
  
  // Add user message (the template message from quick action)
  // This is the SINGLE source of truth for user messages - UI should NOT add it optimistically
  // to prevent duplicates (UI was adding it, then main sent it back, causing duplicate)
  const userMessage: Message = {
    id: generateMessageId(),
    role: 'user',
    content: action.templateMessage,
    timestamp: Date.now()
  }
  messageHistory.push(userMessage)
  
  // Send user message to UI (main thread is source of truth)
  console.log('[Main] Sending user message to UI (single source of truth):', userMessage.id)
  figma.ui.postMessage({ pluginMessage: { type: 'ASSISTANT_MESSAGE', message: userMessage } })
  
  // Create status message immediately
  sendStatusMessage(requestId, 'Processing...')
  
  // Handle tool-only assistants
  if (assistant.kind === 'tool') {
    replaceStatusMessage(requestId, `Tool-only assistant "${assistant.label}" is active. Tool execution would happen here.`)
    return
  }
  
  // Build chat messages from current assistant segment only
  // This ensures old assistant instructions don't bleed into new assistant context
  const segmentMessages = getCurrentAssistantSegment(messageHistory, assistant.id)
  let chatMessages = normalizeMessages(
    segmentMessages.map(m => ({
      role: m.role,
      content: m.content
    }))
  )
  
  let assistantPreambleForQuickAction: string | undefined
  let allowImagesForQuickAction: boolean | undefined
  if (currentProvider && currentProvider.capabilities.supportsPreambleInjection) {
    const isFirstUserMessage = segmentMessages.length > 0 &&
      segmentMessages[0].role === 'user' &&
      preambleSentForSegment !== assistant.id

    if (isFirstUserMessage && chatMessages.length > 0 && chatMessages[0].role === 'user') {
      const kbDocs = resolveKnowledgeBaseDocs(assistant.knowledgeBaseRefs ?? [])
      const built = buildAssistantInstructionSegments({
        assistantEntry: assistant,
        actionId: action.id,
        legacyInstructionsSource: getShortInstructions(assistant),
        kbDocs
      })
      const preamble =
        SESSION_HEADER_SAFE +
        '\n\n' +
        `${assistant.label} context: ${built.instructionPreambleText}\n\n`
      assistantPreambleForQuickAction = preamble
      if (built.allowImagesOverride === true) allowImagesForQuickAction = true
      chatMessages[0] = {
        ...chatMessages[0],
        content: preamble + chatMessages[0].content
      }
      preambleSentForSegment = assistant.id
      console.log('[Main] Injected preamble for Internal API (first message in segment, quick action)')
    }
  }

  // Allow handler to modify messages (e.g., Design Critique JSON enforcement)
  if (handler && handler.prepareMessages) {
    const modifiedMessages = handler.prepareMessages(chatMessages)
    if (modifiedMessages) {
      chatMessages = modifiedMessages
      // Log final assembled messages for debugging (if Design Critique)
      if (assistant.id === 'design_critique' && action.id === 'give-critique') {
        console.log('[DC] FINAL_MESSAGES', chatMessages.map(m => ({
          role: m.role,
          contentPreview: m.content.substring(0, 120)
        })))
      }
    }
  }
  
  // Build selection context (includes state, summary, and images if needed)
  let selectionContext: Awaited<ReturnType<typeof buildSelectionContext>> | undefined
  if (!currentProvider) {
    currentProvider = await createProvider(currentProviderId)
  }
  selectionContext = await buildSelectionContext({
    selectionOrder,
    quickAction: action,
    provider: currentProvider
  })
  
  // Debug logging
  if (selectionContext.selectionSummary) {
    console.log('[Main] Selection summary for quick action:', selectionContext.selectionSummary.substring(0, 200) + '...')
  } else {
    console.log('[Main] No selection summary - hasSelection:', selectionContext.selection.hasSelection)
  }
  
  // Call provider with quick action context
  try {
    // Debug logging for Design Critique
    if (assistant.id === 'design_critique' && action.id === 'give-critique') {
      console.log('[DC] Calling provider.sendChat with:')
      console.log('[DC] assistantId=', assistant.id)
      console.log('[DC] quickActionId=', action.id)
      console.log('[DC] hasSelection=', selectionContext.selection.hasSelection)
      if (selectionContext.selection.hasSelection && selectionOrder.length > 0) {
        const node = await figma.getNodeByIdAsync(selectionOrder[0])
        if (node && node.type !== 'DOCUMENT' && node.type !== 'PAGE') {
          const anchor = getTopLevelContainerNode(node as SceneNode)
          console.log('[DC] selectedNode=', node.name, 'id=', node.id)
          console.log('[DC] anchor=', anchor.name, 'id=', anchor.id)
        }
      }
    }
    
    const recoveryResult = await sendChatWithRecovery(currentProvider, {
      messages: chatMessages,
      assistantId: assistant.id,
      assistantName: assistant.label,
      selection: action.requiresSelection ? selectionContext.selection : undefined,
      selectionSummary: selectionContext.selectionSummary,
      images: selectionContext.images,
      quickActionId: action.id
    }, {
      selectionSummary: selectionContext.selectionSummary,
      assistantId: assistant.id,
      quickActionId: action.id,
      assistantPreamble: assistantPreambleForQuickAction,
      allowImages: allowImagesForQuickAction
    })
    if (recoveryResult.diagnostics) {
      figma.ui.postMessage({ pluginMessage: { type: 'PROMPT_DIAG', diagnostics: recoveryResult.diagnostics } })
    }
    const response = recoveryResult.response
    const contentSimplified = recoveryResult.recoveredWithSummary === true

    // Check if handler exists and can handle the response
    let responseHandled = false
    if (handler) {
      const handlerContext = {
        assistantId: assistant.id,
        actionId: action.id,
        response,
        selectionOrder,
        selection: selectionContext.selection,
        provider: currentProvider!,
        sendChatWithRecovery: async (req: ChatRequest) => {
          const r = await sendChatWithRecovery(currentProvider!, req, {
            selectionSummary: req.selectionSummary,
            assistantId: assistant.id,
            quickActionId: action.id
          })
          return r.response
        },
        sendAssistantMessage,
        replaceStatusMessage: (finalContent: string, isError?: boolean) => replaceStatusMessage(requestId, finalContent, isError),
        requestId
      }
      
      if (typeof handler.handleResponse !== 'function') {
        throw new Error(`[Handlers] Handler for ${assistant.id}/${action.id} has no handleResponse function`)
      }
      const result = await handler.handleResponse(handlerContext)
      if (result.handled) {
        responseHandled = true
        // Handler should have called replaceStatusMessage itself
        // If not, replace with default completion message
        const statusIndex = messageHistory.findIndex(m => m.requestId === requestId && m.isStatus === true)
        if (statusIndex !== -1) {
          replaceStatusMessage(requestId, result.message || 'Completed')
        }
      }
    }
    
    // Only send response to chat if handler didn't handle it
    if (!responseHandled) {
      replaceStatusMessage(requestId, contentSimplified ? `${response}\n\nSome content was simplified to obtain this response.` : response)
    }

    // Track assistant complete (success)
    getAnalytics().track('assistant_complete', {
      assistantId: assistant.id,
      actionId: action.id,
      success: true
    })
  } catch (error) {
    const isContentPolicy = error instanceof ProviderError && error.type === ProviderErrorType.CONTENT_FILTER
    const displayMessage = isContentPolicy ? (error as ProviderError).message : `Error: ${errorToString(error)}`
    replaceStatusMessage(requestId, displayMessage, true)

    // Track error
    getAnalytics().track('error', {
      category: categorizeError(error),
      assistantId: assistant.id,
      actionId: action.id
    })

    // Track assistant complete (failure)
    getAnalytics().track('assistant_complete', {
      assistantId: assistant.id,
      actionId: action.id,
      success: false
    })
  }
  } catch (error) {
    // Catch any unhandled errors in the quick action handler
    console.error('[Main] Unhandled error in RUN_QUICK_ACTION:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    replaceStatusMessage(requestId, `Error: ${errorMessage}`, true)
    
    // Track error
    getAnalytics().track('error', {
      category: categorizeError(error)
    })
  }
})

// Handle run tool
on<RunToolHandler>('RUN_TOOL', async function (toolId: string, payload: Record<string, unknown>) {
  const selection = summarizeSelection(selectionOrder)
  const result = await routeToolCall(
    {
      id: generateMessageId(),
      name: toolId,
      arguments: payload
    },
    selection
  )
  
  // Extract JSON from export tool result
  let data: Record<string, unknown> | undefined
  if (toolId === 'EXPORT_SELECTION_TO_TEMPLATE_JSON' && result.startsWith('JSON_EXPORT:')) {
    try {
      const jsonString = result.replace('JSON_EXPORT:', '')
      data = { exportedJson: jsonString }
      // Update result message
      const message = result.includes('frame(s)') 
        ? `Exported ${selection?.count || 0} frame(s) to JSON template.`
        : 'Exported selection to JSON template.'
      sendToolResult(message, toolId, data)
      return
    } catch {
      // Fall through to normal result
    }
  }
  
  sendToolResult(result, toolId, data)
})

// Handle save settings
on<SaveSettingsHandler>('SAVE_SETTINGS', async function (settings: Record<string, unknown>) {
  try {
    await saveSettings(settings as Partial<import('./core/settings').Settings>)
    // Provider re-init ensures all subsequent requests use the newly saved connection.
    // When Internal API is enabled, no other path should serve chat with a stale provider.
    currentProvider = await createProvider(currentProviderId)
  } catch (error) {
    const errorMessage = errorToString(error)
    figma.ui.postMessage({ 
      pluginMessage: { 
        type: 'TEST_RESULT', 
        success: false, 
        message: `Failed to save settings: ${errorMessage}` 
      } 
    })
  }
})

// Handle request settings — use effective settings so modal matches what provider/runtime uses
on<RequestSettingsHandler>('REQUEST_SETTINGS', async function (requestId?: string) {
  try {
    const settings = await getEffectiveSettings()
    figma.ui.postMessage({
      pluginMessage: {
        type: 'SETTINGS_RESPONSE',
        settings,
        requestId
      }
    })
  } catch (_) {
    try {
      const settings = await getEffectiveSettings()
      figma.ui.postMessage({
        pluginMessage: {
          type: 'SETTINGS_RESPONSE',
          settings,
          requestId
        }
      })
    } catch (__) {
      figma.ui.postMessage({
        pluginMessage: {
          type: 'SETTINGS_RESPONSE',
          settings: getDefaultSettingsForResponse(),
          requestId
        }
      })
    }
  }
})

// Handle request analytics tagging session (load and send to UI)
on<RequestAnalyticsTaggingSessionHandler>('REQUEST_ANALYTICS_TAGGING_SESSION', async function () {
  try {
    const session = await loadSession()
    const emptySession = { id: '', rows: [], draftRow: null as null, createdAtISO: '', updatedAtISO: '' }
    figma.ui.postMessage({
      pluginMessage: {
        type: 'ANALYTICS_TAGGING_SESSION_UPDATED',
        session: session ?? emptySession
      }
    })
  } catch (e) {
    figma.ui.postMessage({
      pluginMessage: {
        type: 'ANALYTICS_TAGGING_SESSION_UPDATED',
        session: { id: '', rows: [], draftRow: null, createdAtISO: '', updatedAtISO: '' }
      }
    })
  }
})

// Handle analytics tagging row update (autosave)
on<AnalyticsTaggingUpdateRowHandler>('ANALYTICS_TAGGING_UPDATE_ROW', async function (rowId: string, updates: Record<string, unknown>) {
  try {
    const session = await loadSession()
    if (!session) return
    const index = session.rows.findIndex(r => r.id === rowId)
    if (index === -1) return
    const row = session.rows[index]
    const allowed = ['screenId', 'description', 'actionType', 'component', 'actionId', 'actionName', 'population', 'note']
    const rowAny = row as unknown as Record<string, unknown>
    const updatesAny = updates as Record<string, unknown>
    for (const key of allowed) {
      if (key in updatesAny && typeof updatesAny[key] === 'string') {
        rowAny[key] = updatesAny[key]
      }
    }
    if ('actionType' in updates && typeof updates.actionType === 'string') {
      row.actionType = updates.actionType as Row['actionType']
    }
    session.updatedAtISO = new Date().toISOString()
    await saveSession(session)
    figma.ui.postMessage({
      pluginMessage: {
        type: 'ANALYTICS_TAGGING_SESSION_UPDATED',
        session
      }
    })
  } catch (_) {
    // ignore
  }
})

// Handle request analytics tagging screenshot (regenerate on demand for preview/export)
on<RequestAnalyticsTaggingScreenshotHandler>('REQUEST_ANALYTICS_TAGGING_SCREENSHOT', async function (screenshotRef: unknown) {
  const ref = screenshotRef as ScreenshotRef
  const refId = ref?.id ?? ''
  try {
    const container = await figma.getNodeByIdAsync(ref.containerNodeId)
    const target = await figma.getNodeByIdAsync(ref.targetNodeId)
    if (!container || !target || container.type === 'DOCUMENT' || container.type === 'PAGE' || target.type === 'DOCUMENT' || target.type === 'PAGE') {
      figma.ui.postMessage({
        pluginMessage: {
          type: 'ANALYTICS_TAGGING_SCREENSHOT_ERROR',
          refId,
          message: 'Nodes no longer available.'
        }
      })
      return
    }
    const { bytes } = await captureVisibleInArea({
      container: container as SceneNode,
      target: target as SceneNode,
      rootNodeId: ref.rootNodeId,
      screenshotRefId: refId
    })
    const base64 = figma.base64Encode(bytes)
    const dataUrl = `data:image/png;base64,${base64}`
    figma.ui.postMessage({
      pluginMessage: {
        type: 'ANALYTICS_TAGGING_SCREENSHOT_READY',
        refId,
        dataUrl
      }
    })
  } catch (e) {
    figma.ui.postMessage({
      pluginMessage: {
        type: 'ANALYTICS_TAGGING_SCREENSHOT_ERROR',
        refId,
        message: e instanceof Error ? e.message : 'Screenshot failed.'
      }
    })
  }
})

const AT_A_THUMB_WIDTH = 280
const AT_A_EXPORT_WIDTH = 600

// Capture screenshot by meta (container/target/root node ids); response keyed by refId=rowId
on<RequestAnalyticsTaggingScreenshotByMetaHandler>('REQUEST_ANALYTICS_TAGGING_SCREENSHOT_BY_META', async function (payload: {
  rowId: string
  containerNodeId: string
  targetNodeId: string
  rootNodeId: string
}) {
  const refId = payload.rowId
  try {
    const container = await figma.getNodeByIdAsync(payload.containerNodeId)
    const target = await figma.getNodeByIdAsync(payload.targetNodeId)
    if (!container || !target || container.type === 'DOCUMENT' || container.type === 'PAGE' || target.type === 'DOCUMENT' || target.type === 'PAGE') {
      figma.ui.postMessage({
        pluginMessage: {
          type: 'ANALYTICS_TAGGING_SCREENSHOT_ERROR',
          refId,
          message: 'Nodes no longer available.'
        }
      })
      return
    }
    const targetNode = target as SceneNode
    const containerNode = container as SceneNode
    let bytes: Uint8Array
    try {
      bytes = await exportNodeThumbnailPngBytes(targetNode, AT_A_THUMB_WIDTH)
    } catch (_) {
      const result = await captureVisibleInArea({
        container: containerNode,
        target: targetNode,
        rootNodeId: payload.rootNodeId,
        screenshotRefId: refId
      })
      bytes = result.bytes
    }
    const base64 = figma.base64Encode(bytes)
    const dataUrl = `data:image/png;base64,${base64}`
    figma.ui.postMessage({
      pluginMessage: {
        type: 'ANALYTICS_TAGGING_SCREENSHOT_READY',
        refId,
        dataUrl
      }
    })
  } catch (e) {
    figma.ui.postMessage({
      pluginMessage: {
        type: 'ANALYTICS_TAGGING_SCREENSHOT_ERROR',
        refId,
        message: e instanceof Error ? e.message : 'Screenshot failed.'
      }
    })
  }
})

// Export screenshots: accept compact rows, stream EXPORT_ITEM then EXPORT_DONE
on<ExportAnalyticsTaggingScreenshotsHandler>('EXPORT_ANALYTICS_TAGGING_SCREENSHOTS', async function (payload: { rows: Array<{
  rowId: string
  screenId: string
  actionId: string
  meta?: { containerNodeId: string; targetNodeId: string; rootScreenNodeId: string }
  screenshotRef?: { containerNodeId: string; targetNodeId: string; rootNodeId: string }
}> }) {
  const rows = payload.rows ?? []
  let total = 0
  for (const row of rows) {
    const containerId = row.screenshotRef?.containerNodeId ?? row.meta?.containerNodeId
    const targetId = row.screenshotRef?.targetNodeId ?? row.meta?.targetNodeId
    const rootId = row.screenshotRef?.rootNodeId ?? row.meta?.rootScreenNodeId
    if (!containerId || !targetId || !rootId) {
      figma.ui.postMessage({
        pluginMessage: {
          type: 'ANALYTICS_TAGGING_EXPORT_ITEM',
          rowId: row.rowId,
          screenId: row.screenId,
          actionId: row.actionId,
          base64: '',
          error: 'Row missing container/target/root node ids.'
        }
      })
      total++
      continue
    }
    try {
      const container = await figma.getNodeByIdAsync(containerId)
      const target = await figma.getNodeByIdAsync(targetId)
      if (!container || !target || container.type === 'DOCUMENT' || container.type === 'PAGE' || target.type === 'DOCUMENT' || target.type === 'PAGE') {
        figma.ui.postMessage({
          pluginMessage: {
            type: 'ANALYTICS_TAGGING_EXPORT_ITEM',
            rowId: row.rowId,
            screenId: row.screenId,
            actionId: row.actionId,
            base64: '',
            error: 'Nodes no longer available.'
          }
        })
        total++
        continue
      }
      const targetNode = target as SceneNode
      const containerNode = container as SceneNode
      let bytes: Uint8Array
      try {
        bytes = await exportNodeThumbnailPngBytes(targetNode, AT_A_EXPORT_WIDTH)
      } catch (_) {
        const result = await captureVisibleInArea({
          container: containerNode,
          target: targetNode,
          rootNodeId: rootId,
          screenshotRefId: row.rowId
        })
        bytes = result.bytes
      }
      const base64 = figma.base64Encode(bytes)
      figma.ui.postMessage({
        pluginMessage: {
          type: 'ANALYTICS_TAGGING_EXPORT_ITEM',
          rowId: row.rowId,
          screenId: row.screenId,
          actionId: row.actionId,
          base64
        }
      })
      total++
    } catch (e) {
      figma.ui.postMessage({
        pluginMessage: {
          type: 'ANALYTICS_TAGGING_EXPORT_ITEM',
          rowId: row.rowId,
          screenId: row.screenId,
          actionId: row.actionId,
          base64: '',
          error: e instanceof Error ? e.message : 'Screenshot failed.'
        }
      })
      total++
    }
  }
  figma.ui.postMessage({
    pluginMessage: {
      type: 'ANALYTICS_TAGGING_EXPORT_DONE',
      total
    }
  })
})

// Export one row screenshot; same logic as bulk, emits single EXPORT_ITEM
on<ExportAnalyticsTaggingOneRowHandler>('EXPORT_ANALYTICS_TAGGING_ONE_ROW', async function (payload: { row: {
  rowId: string
  screenId: string
  actionId: string
  meta?: { containerNodeId: string; targetNodeId: string; rootScreenNodeId: string }
  screenshotRef?: { containerNodeId: string; targetNodeId: string; rootNodeId: string }
} }) {
  const row = payload.row
  const containerId = row.screenshotRef?.containerNodeId ?? row.meta?.containerNodeId
  const targetId = row.screenshotRef?.targetNodeId ?? row.meta?.targetNodeId
  const rootId = row.screenshotRef?.rootNodeId ?? row.meta?.rootScreenNodeId
  if (!containerId || !targetId || !rootId) {
    figma.ui.postMessage({
      pluginMessage: {
        type: 'ANALYTICS_TAGGING_EXPORT_ITEM',
        rowId: row.rowId,
        screenId: row.screenId,
        actionId: row.actionId,
        base64: '',
        error: 'Row missing container/target/root node ids.'
      }
    })
    return
  }
  try {
    const container = await figma.getNodeByIdAsync(containerId)
    const target = await figma.getNodeByIdAsync(targetId)
    if (!container || !target || container.type === 'DOCUMENT' || container.type === 'PAGE' || target.type === 'DOCUMENT' || target.type === 'PAGE') {
      figma.ui.postMessage({
        pluginMessage: {
          type: 'ANALYTICS_TAGGING_EXPORT_ITEM',
          rowId: row.rowId,
          screenId: row.screenId,
          actionId: row.actionId,
          base64: '',
          error: 'Nodes no longer available.'
        }
      })
      return
    }
    const targetNode = target as SceneNode
    const containerNode = container as SceneNode
    let bytes: Uint8Array
    try {
      bytes = await exportNodeThumbnailPngBytes(targetNode, AT_A_EXPORT_WIDTH)
    } catch (_) {
      const result = await captureVisibleInArea({
        container: containerNode,
        target: targetNode,
        rootNodeId: rootId,
        screenshotRefId: row.rowId
      })
      bytes = result.bytes
    }
    const base64 = figma.base64Encode(bytes)
    figma.ui.postMessage({
      pluginMessage: {
        type: 'ANALYTICS_TAGGING_EXPORT_ITEM',
        rowId: row.rowId,
        screenId: row.screenId,
        actionId: row.actionId,
        base64
      }
    })
  } catch (e) {
    figma.ui.postMessage({
      pluginMessage: {
        type: 'ANALYTICS_TAGGING_EXPORT_ITEM',
        rowId: row.rowId,
        screenId: row.screenId,
        actionId: row.actionId,
        base64: '',
        error: e instanceof Error ? e.message : 'Screenshot failed.'
      }
    })
  }
})

// Handle test connection — uses same precedence as createProvider(); optional override for unsaved Internal API URL
on<TestProxyConnectionHandler>('TEST_PROXY_CONNECTION', async function (options?: {
  connectionType?: 'proxy' | 'internal-api'
  internalApiUrl?: string
  proxyBaseUrl?: string
}) {
  try {
    let testProvider: Provider
    const testOptions = options?.internalApiUrl != null ? { internalApiUrl: options.internalApiUrl } : undefined

    // When UI passes an unsaved Internal API URL to test, use InternalApiProvider for that test only
    if (testOptions?.internalApiUrl) {
      testProvider = new InternalApiProvider()
    } else {
      testProvider = await createProvider(currentProviderId)
    }

    const result = await testProvider.testConnection(testOptions)
    figma.ui.postMessage({
      pluginMessage: {
        type: 'TEST_RESULT',
        success: result.success,
        message: result.message,
        diagnostics: (result as { diagnostics?: unknown }).diagnostics
      }
    })
  } catch (error) {
    const errorMessage = errorToString(error)
    figma.ui.postMessage({
      pluginMessage: {
        type: 'TEST_RESULT',
        success: false,
        message: `Connection test failed: ${errorMessage}`
      }
    })
  }
})

// Handle copy table status from UI
on<CopyTableStatusHandler>('COPY_TABLE_STATUS', function (status: 'success' | 'error', message?: string) {
  console.log('[Main] onmessage COPY_TABLE_STATUS', { status, message })
  if (status === 'success') {
    figma.notify(message || 'Successfully copied table to clipboard')
  } else if (status === 'error') {
    figma.notify(message || 'Failed to copy table. See console for details.')
  }
})

// Initialize plugin
export default function () {
  // Track plugin open
  getAnalytics().track('plugin_open')

  showUI({
    height: 600,
    width: 400,
    title: BRAND.brandName
  })
  
  // Set up selection change listener
  figma.on('selectionchange', function () {
    // Update selection order: maintain order as items are selected/deselected
    const currentSelection = figma.currentPage.selection
    const currentIds = new Set(currentSelection.map(node => node.id))
    const previousIds = new Set(selectionOrder)
    
    // Remove deselected items from order
    selectionOrder = selectionOrder.filter(id => currentIds.has(id))
    
    // Add newly selected items to the end (right side) of the list
    for (const node of currentSelection) {
      if (!previousIds.has(node.id)) {
        // This is a newly selected item, append it
        selectionOrder.push(node.id)
      }
    }
    
    sendSelectionState()
  })
  
  // Initialize selection order
  const initialSelection = figma.currentPage.selection
  selectionOrder = initialSelection.map(node => node.id)
  
  // Send initial selection state
  sendSelectionState()
}

// Handle Placeholder Scorecard
on<RunPlaceholderScorecardHandler>('RUN_PLACEHOLDER_SCORECARD', async function () {
  console.log('[Main] RUN_PLACEHOLDER_SCORECARD received')
  try {
    // Get selected node if available
    let selectedNode: SceneNode | undefined
    if (selectionOrder.length > 0) {
      const node = await figma.getNodeByIdAsync(selectionOrder[0])
      if (node && node.type !== 'DOCUMENT' && node.type !== 'PAGE') {
        selectedNode = node as SceneNode
      }
    }

    // Render placeholder scorecard
    await renderPlaceholderScorecard(selectedNode)
    
    // Notify UI of success
    figma.ui.postMessage({
      pluginMessage: {
        type: 'PLACEHOLDER_SCORECARD_PLACED'
      }
    })
    
    figma.notify('Placeholder scorecard added to stage')
  } catch (error) {
    console.error('[Main] Error rendering placeholder scorecard:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    // Notify UI of error
    figma.ui.postMessage({
      pluginMessage: {
        type: 'PLACEHOLDER_SCORECARD_ERROR',
        message: errorMessage
      }
    })
    
    figma.notify(`Error: ${errorMessage}`)
  }
})

// Handle Scorecard v2 Placeholder
on<RunScorecardV2PlaceholderHandler>('RUN_SCORECARD_V2_PLACEHOLDER', async function () {
  console.log('[Main] RUN_SCORECARD_V2_PLACEHOLDER received')
  try {
    // Get selected node if available
    let selectedNode: SceneNode | undefined
    if (selectionOrder.length > 0) {
      const node = await figma.getNodeByIdAsync(selectionOrder[0])
      if (node && node.type !== 'DOCUMENT' && node.type !== 'PAGE') {
        selectedNode = node as SceneNode
      }
    }

    // Hardcoded ScorecardData for v2 placeholder
    const placeholderData: ScorecardData = {
      score: 82,
      summary: 'This is a placeholder scorecard v2 for visual design iteration. It demonstrates the new 2-column layout with colored score pill and tighter card design.',
      wins: [
        'Clear visual hierarchy with consistent spacing',
        'Strong color contrast meets WCAG AA standards',
        'Interactive elements have clear affordances',
        'Responsive layout adapts well to different screen sizes'
      ],
      fixes: [
        'Increase text contrast for body text (currently #666, suggest #333)',
        'Add 8px spacing between related form fields to improve grouping',
        'Make hover states more obvious with visual feedback',
        'Consider adding loading states for async actions'
      ],
      checklist: [
        '✓ Primary action is visually dominant',
        '✓ Related elements are grouped using spacing',
        '✗ Interactive elements need hover states',
        '✓ Text is readable without zooming',
        '✓ Color palette is accessible'
      ],
      notes: [
        'Overall solid design with room for improvement in micro-interactions',
        'Consider adding loading states for async actions'
      ]
    }

    // Render scorecard v2 using the dedicated v2 renderer
    await renderScorecardV2(placeholderData, selectedNode)
    
    // Notify UI of success
    figma.ui.postMessage({
      pluginMessage: {
        type: 'PLACEHOLDER_SCORECARD_PLACED'
      }
    })
    
    figma.notify('Scorecard v2 (placeholder) added to stage')
  } catch (error) {
    console.error('[Main] Error rendering scorecard v2 placeholder:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    
    // Notify UI of error
    figma.ui.postMessage({
      pluginMessage: {
        type: 'PLACEHOLDER_SCORECARD_ERROR',
        message: errorMessage
      }
    })
    
    figma.notify(`Error: ${errorMessage}`)
  }
})

// Handle Export Content Table Ref Image
on<ExportContentTableRefImageHandler>('EXPORT_CONTENT_TABLE_REF_IMAGE', async function (rootNodeId: string) {
  console.log('[Main] EXPORT_CONTENT_TABLE_REF_IMAGE received', { rootNodeId })
  try {
    const node = await figma.getNodeByIdAsync(rootNodeId)
    if (!node) {
      console.error('[Main] Export Ref Image: Node not found for rootNodeId:', rootNodeId)
      figma.ui.postMessage({
        pluginMessage: {
          type: 'CONTENT_TABLE_REF_IMAGE_ERROR',
          message: 'Root node not found'
        }
      })
      return
    }
    
    if (node.type === 'DOCUMENT' || node.type === 'PAGE') {
      console.error('[Main] Export Ref Image: Cannot export document or page')
      figma.ui.postMessage({
        pluginMessage: {
          type: 'CONTENT_TABLE_REF_IMAGE_ERROR',
          message: 'Cannot export document or page as image'
        }
      })
      return
    }
    
    const sceneNode = node as SceneNode
    
    // Export as PNG, 600px wide
    // Try WIDTH constraint first, fallback to SCALE if needed
    let bytes: Uint8Array
    try {
      bytes = await sceneNode.exportAsync({
        format: 'PNG',
        constraint: {
          type: 'WIDTH',
          value: 600
        }
      })
    } catch (widthError) {
      // Fallback to SCALE if WIDTH constraint fails
      console.warn('[Main] Export Ref Image: WIDTH constraint failed, trying SCALE:', widthError)
      const nodeWidth = 'width' in sceneNode ? sceneNode.width : 600
      const scale = Math.min(1, 600 / nodeWidth)
      bytes = await sceneNode.exportAsync({
        format: 'PNG',
        constraint: {
          type: 'SCALE',
          value: scale
        }
      })
    }
    
    console.log('[Main] Export Ref Image: Export succeeded, bytes length:', bytes.length)
    
    // Convert to base64 data URL
    const base64 = figma.base64Encode(bytes)
    const dataUrl = `data:image/png;base64,${base64}`
    
    console.log('[Main] Export Ref Image: Sending READY, dataUrl length:', dataUrl.length)
    figma.ui.postMessage({
      pluginMessage: {
        type: 'CONTENT_TABLE_REF_IMAGE_READY',
        dataUrl: dataUrl
      }
    })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    console.error('[Main] Export Ref Image: Failed to export ref image:', error)
    figma.ui.postMessage({
      pluginMessage: {
        type: 'CONTENT_TABLE_REF_IMAGE_ERROR',
        message: `Could not export reference image: ${errorMessage}`
      }
    })
  }
})
