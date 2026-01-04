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
import { extractSelectionSummary, formatSelectionSummary } from './core/context/selectionSummary'
import { exportSelectionAsImages } from './core/figma/exportSelectionAsImages'
import { createCritiqueFrameOnCanvas } from './core/figma/createCritiqueFrame'
import { createTextFrameOnCanvas } from './core/figma/createTextFrameOnCanvas'
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
  Message,
  SelectionState,
  LlmProviderId,
  ToolCall
} from './core/types'

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
  sendSelectionState()
})

// Handle set assistant
on<SetAssistantHandler>('SET_ASSISTANT', function (assistantId: string) {
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
  // Add user message to history
  const userMessage: Message = {
    id: generateMessageId(),
    role: 'user',
    content: message,
    timestamp: Date.now()
  }
  messageHistory.push(userMessage)
  
  // Get selection if needed
  const selection = includeSelection ? summarizeSelection(selectionOrder) : undefined
  const selectionSummary = includeSelection && selection?.hasSelection
    ? formatSelectionSummary(extractSelectionSummary(selectionOrder))
    : undefined
  
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
    }
    const response = await currentProvider.sendChat({
      messages: chatMessages,
      assistantId: currentAssistant.id,
      assistantName: currentAssistant.label,
      selection,
      selectionSummary,
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
  const assistant = getAssistant(assistantId)
  if (!assistant) {
    return
  }
  
  const action = assistant.quickActions.find((a: import('./assistants').QuickAction) => a.id === actionId)
  if (!action) {
    return
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
  
  // Check selection requirement
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
  
  // Send "thinking..." message for vision requests
  if (action.requiresVision) {
    const thinkingMessage: Message = {
      id: generateMessageId(),
      role: 'assistant',
      content: 'Analyzing your design...',
      timestamp: Date.now()
    }
    messageHistory.push(thinkingMessage)
    figma.ui.postMessage({ pluginMessage: { type: 'ASSISTANT_MESSAGE', message: thinkingMessage } })
  }
  
  // Add user message (the template message from quick action)
  const userMessage: Message = {
    id: generateMessageId(),
    role: 'user',
    content: action.templateMessage,
    timestamp: Date.now()
  }
  messageHistory.push(userMessage)
  
  // Send user message to UI immediately
  figma.ui.postMessage({ pluginMessage: { type: 'ASSISTANT_MESSAGE', message: userMessage } })
  
  // Handle tool-only assistants
  if (assistant.kind === 'tool') {
    sendAssistantMessage(`Tool-only assistant "${assistant.label}" is active. Tool execution would happen here.`)
    return
  }
  
  // Export images if vision is required
  // Graceful fallback: if image export fails, continue with structured summary
  let images: Array<{ dataUrl: string; name?: string; width?: number; height?: number }> | undefined
  if (action.requiresVision && selection.hasSelection) {
    try {
      const exportedImages = await exportSelectionAsImages({
        maxImages: action.maxImages || 1,
        imageScale: action.imageScale || 2,
        preferFrames: true
      })
      
      if (exportedImages.length > 0) {
        images = exportedImages
        console.log(`[Main] Exported ${exportedImages.length} image(s) for vision analysis`)
        exportedImages.forEach((img, i) => {
          const sizeBytes = img.dataUrl.length * 0.75 // Approximate base64 size
          const preview = img.dataUrl.substring(0, 80) + '...'
          console.log(`[Main] Image ${i + 1}: ${img.name || 'Unnamed'}, ${img.width}x${img.height}, ~${Math.round(sizeBytes / 1024)}KB, preview: ${preview}`)
        })
      } else {
        console.warn('[Main] Vision required but no images exported - continuing with structured summary only')
      }
    } catch (error) {
      // Graceful fallback: log error but continue with structured summary
      // This ensures assistants still receive meaningful context even without images
      console.error('[Main] Failed to export images (continuing with structured summary):', error)
      // Don't return early - allow structured summary to be sent
    }
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
  
  // Get selection summary if selection exists (always include if available, not just when required)
  const selectionSummary = selection.hasSelection
    ? formatSelectionSummary(extractSelectionSummary(selectionOrder))
    : undefined
  
  // Debug logging
  if (selectionSummary) {
    console.log('[Main] Selection summary for quick action:', selectionSummary.substring(0, 200) + '...')
  } else {
    console.log('[Main] No selection summary - hasSelection:', selection.hasSelection)
  }
  
  // Call provider with quick action context
  try {
    if (!currentProvider) {
      currentProvider = await createProvider(currentProviderId)
    }
    const response = await currentProvider.sendChat({
      messages: chatMessages,
      assistantId: assistant.id,
      assistantName: assistant.label,
      selection: action.requiresSelection ? selection : undefined,
      selectionSummary,
      images,
      quickActionId: action.id
    })
    
    // Remove thinking message if it exists
    if (action.requiresVision) {
      messageHistory = messageHistory.filter(m => m.content !== 'Analyzing your design...')
    }
    
    // Check if this is a Design Critique response and place it on canvas
    if (assistant.id === 'design_critique' && action.id === 'give-critique') {
      console.log('[Main] Processing Design Critique response, length:', response.length)
      
      // Always place Design Critique response on canvas if selection exists
      if (selection.hasSelection && selectionOrder.length > 0) {
        const selectedNode = figma.getNodeById(selectionOrder[0])
        if (selectedNode && selectedNode.type !== 'DOCUMENT' && selectedNode.type !== 'PAGE') {
          console.log('[Main] Placing critique on canvas for node:', selectedNode.id, selectedNode.name)
          
          try {
            // First, try to parse as structured JSON critique
            let critique: { score?: number; wins?: string[]; fixes?: string[]; checklist?: string[]; notes?: string } | null = null
            let jsonString = response.trim()
            
            // Remove markdown code blocks if present
            jsonString = jsonString.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '')
            
            // Try to find JSON object in the response
            const jsonMatch = jsonString.match(/\{[\s\S]*\}/)
            if (jsonMatch) {
              try {
                critique = JSON.parse(jsonMatch[0])
                console.log('[Main] Successfully parsed JSON from response')
              } catch (parseError) {
                // Not JSON, will use text format
              }
            }
            
            // If we have valid structured JSON, use the formatted frame
            if (critique && 
                typeof critique.score === 'number' && 
                Array.isArray(critique.wins) && 
                Array.isArray(critique.fixes) &&
                Array.isArray(critique.checklist) &&
                typeof critique.notes === 'string') {
              console.log('[Main] Using structured critique format. Score:', critique.score)
              await createCritiqueFrameOnCanvas({
                score: critique.score,
                wins: critique.wins,
                fixes: critique.fixes,
                checklist: critique.checklist,
                notes: critique.notes
              }, selectedNode as SceneNode)
            } else {
              // Use plain text frame for markdown or unstructured responses
              console.log('[Main] Using plain text frame for response')
              await createTextFrameOnCanvas(response, selectedNode as SceneNode)
            }
            
            console.log('[Main] Critique frame created successfully on canvas')
            // Send simple message to chat instead of full response
            sendAssistantMessage('Critique added to stage')
            return
          } catch (canvasError) {
            console.error('[Main] Error creating critique frame on canvas:', canvasError)
            // Fall through to show in chat if canvas placement fails
          }
        } else {
          console.warn('[Main] Selected node is not a valid SceneNode:', selectedNode?.type)
        }
      } else {
        console.warn('[Main] No selection available for placing critique on canvas. hasSelection:', selection.hasSelection, 'selectionOrder length:', selectionOrder.length)
      }
    }
    
    sendAssistantMessage(response)
  } catch (error) {
    const errorMessage = errorToString(error)
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
