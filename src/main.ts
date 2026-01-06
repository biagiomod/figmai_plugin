import { on, once, showUI } from '@create-figma-plugin/utilities'

import { BRAND } from './core/brand'
import { CONFIG } from './core/config'
import { getDefaultAssistant, getAssistant, listAssistants } from './assistants'
import type { Assistant } from './assistants'
import { createProvider } from './core/provider/providerFactory'
import type { Provider } from './core/provider/provider'
import { normalizeMessages } from './core/provider/normalize'
import { routeToolCall } from './core/tools/toolRouter'
import { summarizeSelection } from './core/context/selection'
import { buildSelectionContext } from './core/context/selectionContext'
import { createTextFrameOnCanvas } from './core/figma/createTextFrameOnCanvas'
import { renderScorecard } from './core/figma/renderScorecard'
import type { ScorecardData } from './core/figma/renderScorecard'
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
  ScorecardResult,
  UniversalContentTableV1,
  Message,
  SelectionState,
  LlmProviderId,
  ToolCall,
  CopyTableStatusHandler
} from './core/types'
import { scanContentTable } from './core/contentTable/scanner'

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
  
  // Special handling for Content Table assistant
  if (assistantId === 'content_table') {
    if (actionId === 'generate-table') {
      // Validate selection: must be exactly one container
      if (selectionOrder.length === 0) {
        const errorMsg = 'Select a single container to scan.'
        sendAssistantMessage(errorMsg)
        figma.notify(errorMsg)
        return
      }
      
      if (selectionOrder.length > 1) {
        const errorMsg = 'Only one selection allowed. Select a single container.'
        sendAssistantMessage(errorMsg)
        figma.notify(errorMsg)
        return
      }
      
      // Get the selected node
      const selectedNode = figma.getNodeById(selectionOrder[0])
      if (!selectedNode) {
        const errorMsg = 'Selected node not found.'
        sendAssistantMessage(errorMsg)
        figma.notify(errorMsg)
        return
      }
      
      // Validate it's a valid container (not DOCUMENT or PAGE)
      if (selectedNode.type === 'DOCUMENT' || selectedNode.type === 'PAGE') {
        const errorMsg = 'Please select a container (frame, component, etc.), not a page or document.'
        sendAssistantMessage(errorMsg)
        figma.notify(errorMsg)
        return
      }
      
      try {
        // Send "Scanning..." message
        sendAssistantMessage('Scanning...')
        
        // Scan the container (now async for thumbnail export)
        const contentTable = await scanContentTable(selectedNode as SceneNode)
        
        // Send success message
        const itemCount = contentTable.items.length
        if (itemCount === 0) {
          sendAssistantMessage('No text items found in the selected container.')
        } else {
          sendAssistantMessage(`Found ${itemCount} text item${itemCount === 1 ? '' : 's'}`)
          sendAssistantMessage('Table generated')
        }
        
        // Send table to UI
        figma.ui.postMessage({
          pluginMessage: {
            type: 'CONTENT_TABLE_GENERATED',
            table: contentTable
          }
        })
        
        console.log('[Main] Content table generated:', itemCount, 'items')
        return
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error'
        sendAssistantMessage(`Error: ${errorMessage}`)
        figma.notify(`Error generating table: ${errorMessage}`)
        
        figma.ui.postMessage({
          pluginMessage: {
            type: 'CONTENT_TABLE_ERROR',
            error: errorMessage
          }
        })
        return
      }
    }
  }
  
  // Special handling for Code2Design quick actions
  if (assistantId === 'code2design') {
    if (actionId === 'send-json' || actionId === 'get-json') {
      // These actions open modals in the UI, not handled here
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
  const chatMessages = normalizeMessages(
    messageHistory
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => ({
        role: m.role,
        content: m.content
      }))
  )
  
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
    const response = await currentProvider.sendChat({
      messages: chatMessages,
      assistantId: assistant.id,
      assistantName: assistant.label,
      selection: action.requiresSelection ? selectionContext.selection : undefined,
      selectionSummary: selectionContext.selectionSummary,
      images: selectionContext.images,
      quickActionId: action.id
    })
    
    // Check if this is a Design Critique response and send to UI
    if (assistant.id === 'design_critique' && action.id === 'give-critique') {
      console.log('[Main] Processing Design Critique response, length:', response.length)
      
      try {
        // Parse JSON from response with resilient fallbacks
        let scorecardResult: ScorecardResult | null = null
        let jsonString = response.trim()
        
        // Defensive parsing: strip markdown fences and extract JSON
        jsonString = jsonString.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '').trim()
        
        // Try to extract JSON object if wrapped in text
        const firstBrace = jsonString.indexOf('{')
        const lastBrace = jsonString.lastIndexOf('}')
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
          jsonString = jsonString.substring(firstBrace, lastBrace + 1)
        }
        
        try {
          const parsed = JSON.parse(jsonString)
          console.log('[Main] JSON parse success for scorecard')
          
          // Validate strict scorecard schema
          if (
            parsed.type === 'scorecard' &&
            typeof parsed.version === 'number' &&
            typeof parsed.summary === 'string' &&
            typeof parsed.overallScore === 'number' &&
            Array.isArray(parsed.items) &&
            Array.isArray(parsed.risks) &&
            Array.isArray(parsed.actions)
          ) {
            scorecardResult = {
              type: 'scorecard',
              version: parsed.version,
              summary: parsed.summary,
              overallScore: parsed.overallScore,
              items: parsed.items.map((item: any) => ({
                label: String(item.label || ''),
                score: Number(item.score || 0),
                outOf: Number(item.outOf || 5),
                notes: String(item.notes || '')
              })),
              risks: parsed.risks.map((r: any) => String(r)),
              actions: parsed.actions.map((a: any) => String(a))
            }
            console.log('[Main] Valid scorecard result parsed. Score:', scorecardResult.overallScore)
            
            // Send scorecard result to UI
            figma.ui.postMessage({
              pluginMessage: {
                type: 'SCORECARD_RESULT',
                payload: scorecardResult
              }
            })
            console.log('[Main] Sent SCORECARD_RESULT to UI')
            
            // Also place on canvas if selection exists (legacy behavior)
            if (selectionContext.selection.hasSelection && selectionOrder.length > 0) {
              const selectedNode = figma.getNodeById(selectionOrder[0])
              if (selectedNode && selectedNode.type !== 'DOCUMENT' && selectedNode.type !== 'PAGE') {
                try {
                  // Convert to legacy format for canvas rendering
                  const legacyScorecardData: ScorecardData = {
                    score: scorecardResult.overallScore,
                    summary: scorecardResult.summary,
                    wins: scorecardResult.items.filter(i => i.score >= 4).map(i => i.label),
                    fixes: scorecardResult.items.filter(i => i.score < 3).map(i => `${i.label}: ${i.notes}`),
                    checklist: scorecardResult.items.map(i => i.label),
                    notes: scorecardResult.risks
                  }
                  await renderScorecard(legacyScorecardData, selectedNode as SceneNode)
                  console.log('[Main] Scorecard frame rendered on canvas')
                } catch (canvasError) {
                  console.error('[Main] Error rendering scorecard on canvas:', canvasError)
                }
              }
            }
            
            // Update status message
            figma.ui.postMessage({
              pluginMessage: {
                type: 'SCORECARD_PLACED',
                success: true,
                message: 'Scorecard added to stage.'
              }
            })
            return
          } else {
            console.warn('[Main] JSON parsed but schema invalid. Expected type=scorecard, got:', parsed)
            throw new Error('Invalid scorecard schema')
          }
        } catch (parseError) {
          console.error('[Main] Failed to parse scorecard JSON:', parseError)
          // Send error to UI
          figma.ui.postMessage({
            pluginMessage: {
              type: 'SCORECARD_ERROR',
              error: 'Failed to parse scorecard JSON',
              raw: response.substring(0, 500) // First 500 chars for debugging
            }
          })
          console.log('[Main] Sent SCORECARD_ERROR to UI')
          
          // Fallback to legacy canvas placement if selection exists
          if (selectionContext.selection.hasSelection && selectionOrder.length > 0) {
            const selectedNode = figma.getNodeById(selectionOrder[0])
            if (selectedNode && selectedNode.type !== 'DOCUMENT' && selectedNode.type !== 'PAGE') {
              try {
                await createTextFrameOnCanvas(response, selectedNode as SceneNode)
                figma.ui.postMessage({
                  pluginMessage: {
                    type: 'SCORECARD_PLACED',
                    success: true,
                    message: 'Couldn\'t parse scorecard JSON; added text critique instead.'
                  }
                })
                return
              } catch (textError) {
                console.error('[Main] Error creating text frame:', textError)
              }
            }
          }
          
          // Update status to error
          figma.ui.postMessage({
            pluginMessage: {
              type: 'SCORECARD_PLACED',
              success: false,
              message: 'Couldn\'t parse scorecard JSON. See console.'
            }
          })
          return
        }
      } catch (error) {
        console.error('[Main] Error processing Design Critique:', error)
        figma.ui.postMessage({
          pluginMessage: {
            type: 'SCORECARD_ERROR',
            error: error instanceof Error ? error.message : 'Unknown error',
            raw: response.substring(0, 500)
          }
        })
        return
      }
    }
    
    sendAssistantMessage(response)
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
