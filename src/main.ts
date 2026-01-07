import { on, once, showUI } from '@create-figma-plugin/utilities'

import { BRAND } from './core/brand'
import { CONFIG } from './core/config'
import { getDefaultAssistant, getAssistant, listAssistants } from './assistants'
import type { Assistant } from './assistants'
import { createProvider } from './core/provider/providerFactory'
import type { Provider, ChatRequest } from './core/provider/provider'
import { normalizeMessages } from './core/provider/normalize'
import { routeToolCall } from './core/tools/toolRouter'
import { summarizeSelection } from './core/context/selection'
import { buildSelectionContext } from './core/context/selectionContext'
import { saveSettings, getSettings } from './core/settings'
import { ProxyError } from './core/proxy/client'
import { ProviderError, ProviderErrorType } from './core/provider/provider'
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
  RunScorecardV2PlaceholderHandler
} from './core/types'
import { scanContentTable } from './core/contentTable/scanner'
import { normalizeDesignCritique, fromDesignCritiqueJson, parseScorecardJson } from './core/output/normalize'
import { renderDocumentToStage } from './core/stage/renderDocument'
import { parseDesignSpecJson, renderDesignSpecToStage } from './core/stage/renderDesignSpec'
import { renderPlaceholderScorecard } from './core/figma/renderPlaceholderScorecard'
import { renderScorecard, renderScorecardV2, type ScorecardData } from './core/figma/renderScorecard'
import { removeExistingArtifacts } from './core/figma/artifacts/placeArtifact'
import { getHandler } from './core/assistants/handlers'
import { getTopLevelContainerNode } from './core/stage/anchor'

/**
 * Convert an error to a human-readable string with actionable feedback
 * Uses ProviderError for consistent error handling across all providers
 */
function errorToString(error: unknown): string {
  // Handle ProviderError (includes ProxyError which extends it)
  if (error instanceof ProviderError) {
    // Provide actionable error messages based on error type
    switch (error.type) {
      case ProviderErrorType.AUTHENTICATION:
        return 'Authentication failed. Please check your token in Settings.'
      case ProviderErrorType.RATE_LIMIT:
        return 'Rate limit exceeded. Please try again in a moment.'
      case ProviderErrorType.NETWORK:
        return `Network error: ${error.message}`
      case ProviderErrorType.TIMEOUT:
        return 'Request timeout. The server took too long to respond. Please try again.'
      case ProviderErrorType.INVALID_REQUEST:
        return `Invalid request: ${error.message}`
      case ProviderErrorType.PROVIDER_ERROR:
        if (error.statusCode && error.statusCode >= 500) {
          return `Server error (${error.statusCode}): The server encountered an error. Please try again later.`
        }
        return `Provider error: ${error.message}`
      default:
        return error.message
    }
  }
  
  if (error instanceof Error) {
    return error.message
  }
  
  if (error && typeof error === 'object' && 'status' in error && 'statusText' in error) {
    const response = error as { status: number; statusText: string }
    return `HTTP ${response.status}: ${response.statusText}`
  }
  
  if (error && typeof error === 'object') {
    try {
      const stringified = JSON.stringify(error, null, 2)
      return stringified.length > 500 ? stringified.substring(0, 500) + '...' : stringified
    } catch {
      return String(error)
    }
  }
  
  return String(error)
}

// State
let currentAssistant: Assistant = getDefaultAssistant()
let currentMode: 'simple' | 'advanced' = CONFIG.defaultMode
let currentProviderId: LlmProviderId = CONFIG.provider
let currentProvider: Provider | null = null
let messageHistory: Message[] = []
let selectionOrder: string[] = []

// Initialize provider
async function initializeProvider() {
  try {
    currentProvider = await createProvider(currentProviderId)
  } catch (error) {
    console.error('[Main] Failed to initialize provider:', error)
    // Fallback to stub provider
    const { StubProvider } = await import('./core/provider/stubProvider')
    currentProvider = new StubProvider()
  }
}

// Initialize on startup
initializeProvider()

// Generate unique message ID
function generateMessageId(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// Send selection state to UI
function sendSelectionState() {
  const state = summarizeSelection(selectionOrder)
  figma.ui.postMessage({ pluginMessage: { type: 'SELECTION_STATE', state } })
}

// Send assistant message to UI
function sendAssistantMessage(content: string, toolCallId?: string) {
  const message: Message = {
    id: generateMessageId(),
    role: 'assistant',
    content,
    timestamp: Date.now(),
    toolCallId
  }
  messageHistory.push(message)
  
  figma.ui.postMessage({ pluginMessage: { type: 'ASSISTANT_MESSAGE', message } })
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
    content: currentAssistant.intro,
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

// Handle set assistant
on<SetAssistantHandler>('SET_ASSISTANT', function (assistantId: string) {
  console.log('[Main] onmessage SET_ASSISTANT', { assistantId })
  const assistant = getAssistant(assistantId)
  if (assistant) {
    currentAssistant = assistant
    // Send assistant intro message
    const introMessage: Message = {
      id: generateMessageId(),
      role: 'assistant',
      content: assistant.intro,
      timestamp: Date.now()
    }
    messageHistory.push(introMessage)
    console.log('[Main] postMessage ASSISTANT_MESSAGE (assistant intro)')
    figma.ui.postMessage({ pluginMessage: { type: 'ASSISTANT_MESSAGE', message: introMessage } })
  }
})

// Handle set mode
on<SetModeHandler>('SET_MODE', function (mode: 'simple' | 'advanced') {
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
  // Add user message to history
  const userMessage: Message = {
    id: generateMessageId(),
    role: 'user',
    content: message,
    timestamp: Date.now()
  }
  messageHistory.push(userMessage)
  
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
    sendAssistantMessage(`Tool-only assistant "${currentAssistant.label}" is active. Tool execution would happen here.`)
    return
  }
  
  // Build chat messages (role/content only, no system messages)
  // Filter and normalize messages for provider
  const chatMessages = normalizeMessages(
    messageHistory
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => ({
        role: m.role,
        content: m.content
      }))
  )
  
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
    const response = await currentProvider.sendChat({
      messages: chatMessages,
      assistantId: currentAssistant.id,
      assistantName: currentAssistant.label,
      selection: selectionContext?.selection,
      selectionSummary: selectionContext?.selectionSummary,
      images: selectionContext?.images,
      quickActionId: undefined
    })
    
    sendAssistantMessage(response)
  } catch (error) {
    const errorMessage = errorToString(error)
    sendAssistantMessage(`Error: ${errorMessage}`)
  }
})


// Handle quick action
on<RunQuickActionHandler>('RUN_QUICK_ACTION', async function (actionId: string, assistantId: string) {
  console.log('[Main] onmessage RUN_QUICK_ACTION', { actionId, assistantId })
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
  
  // Check if handler exists for this assistant/action (handles actions that don't need LLM)
  const handler = getHandler(assistantId, actionId)
  if (handler) {
    // Check if handler can handle the action without LLM call (e.g., Content Table scanning)
    // For now, we'll let handler.handleResponse decide, but we need to check if it needs selection context
    // Content Table handler needs to run before LLM call, so we check it here
    if (assistantId === 'content_table' && actionId === 'generate-table') {
      const handlerContext = {
        assistantId,
        actionId,
        response: '', // Not used for Content Table
        selectionOrder,
        selection: summarizeSelection(selectionOrder),
        provider: currentProvider || await createProvider(currentProviderId),
        sendAssistantMessage
      }
      const result = await handler.handleResponse(handlerContext)
      if (result.handled) {
        return
      }
    }
  }
  
  // Special handling for Code2Design quick actions
  if (assistantId === 'code2design') {
    if (actionId === 'send-json') {
      // This action receives JSON input from UI and renders it to stage
      // The JSON input comes via a separate message handler (to be implemented in UI)
      // For now, this is a placeholder that shows the architecture is ready
      return
    }
    if (actionId === 'get-json') {
      // This action exports selection as JSON (to be implemented)
      return
    }
    if (actionId === 'json-format-help') {
      // Send canned help message
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
      sendAssistantMessage(helpMessage)
      return
    }
  }
  
  // Check selection requirement (need to check before building context)
  const selection = summarizeSelection(selectionOrder)
  if (action.requiresSelection && !selection.hasSelection) {
    sendAssistantMessage(`Error: This action requires a selection. Please select one or more nodes first.`)
    return
  }
  
  // Check vision requirement
  if (action.requiresVision && !selection.hasSelection) {
    sendAssistantMessage(`Error: This action requires a selection to analyze. Please select a frame or design element first.`)
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
  
  // Handle tool-only assistants
  if (assistant.kind === 'tool') {
    sendAssistantMessage(`Tool-only assistant "${assistant.label}" is active. Tool execution would happen here.`)
    return
  }
  
  // Build chat messages
  // Filter and normalize messages for provider
  let chatMessages = normalizeMessages(
    messageHistory
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => ({
        role: m.role,
        content: m.content
      }))
  )
  
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
        const node = figma.getNodeById(selectionOrder[0])
        if (node && node.type !== 'DOCUMENT' && node.type !== 'PAGE') {
          const anchor = getTopLevelContainerNode(node as SceneNode)
          console.log('[DC] selectedNode=', node.name, 'id=', node.id)
          console.log('[DC] anchor=', anchor.name, 'id=', anchor.id)
        }
      }
    }
    
    const response = await currentProvider.sendChat({
      messages: chatMessages,
      assistantId: assistant.id,
      assistantName: assistant.label,
      selection: action.requiresSelection ? selectionContext.selection : undefined,
      selectionSummary: selectionContext.selectionSummary,
      images: selectionContext.images,
      quickActionId: action.id
    })
    
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
        sendAssistantMessage
      }
      
      const result = await handler.handleResponse(handlerContext)
      if (result.handled) {
        responseHandled = true
      }
    }
    
    // Only send response to chat if handler didn't handle it
    if (!responseHandled) {
      sendAssistantMessage(response)
    }
  } catch (error) {
    const errorMessage = errorToString(error)
    sendAssistantMessage(`Error: ${errorMessage}`)
  }
  } catch (error) {
    // Catch any unhandled errors in the quick action handler
    console.error('[Main] Unhandled error in RUN_QUICK_ACTION:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    sendAssistantMessage(`Error: ${errorMessage}`)
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
    // Reinitialize provider with new settings
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

// Handle request settings
on<RequestSettingsHandler>('REQUEST_SETTINGS', async function () {
  try {
    const settings = await getSettings()
    figma.ui.postMessage({ 
      pluginMessage: { 
        type: 'SETTINGS_RESPONSE', 
        settings 
      } 
    })
  } catch (error) {
    figma.ui.postMessage({ 
      pluginMessage: { 
        type: 'SETTINGS_RESPONSE', 
        settings: await getSettings() // Return defaults on error
      } 
    })
  }
})

// Handle test proxy connection
on<TestProxyConnectionHandler>('TEST_PROXY_CONNECTION', async function () {
  try {
    if (!currentProvider) {
      currentProvider = await createProvider(currentProviderId)
    }
    const result = await currentProvider.testConnection()
    figma.ui.postMessage({ 
      pluginMessage: { 
        type: 'TEST_RESULT', 
        success: result.success, 
        message: result.message 
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
      const node = figma.getNodeById(selectionOrder[0])
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
      const node = figma.getNodeById(selectionOrder[0])
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
    const node = figma.getNodeById(rootNodeId)
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
