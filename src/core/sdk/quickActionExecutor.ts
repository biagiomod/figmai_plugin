// src/core/sdk/quickActionExecutor.ts
/**
 * QuickActionExecutor — owns the RUN_QUICK_ACTION dispatch logic.
 * Receives injected dependencies so it has no direct plugin globals.
 * main.ts calls executor.run(actionId, assistantId) and awaits it.
 */

import { getAnalytics } from '../analytics'
import { categorizeError } from '../analytics/errorCodes'
import { debug } from '../debug/logger'
import { sanitizeForChat } from '../richText/reportFormat'
import type { Assistant } from '../types'
import { buildAssistantInstructionSegments } from '../assistants/instructionAssembly'
import { resolveKnowledgeBaseDocs } from '../knowledgeBases/resolveKb'
import { createProvider } from '../provider/providerFactory'
import type { Provider, ChatRequest } from '../provider/provider'
import { ProviderError, ProviderErrorType, errorToString } from '../provider/provider'
import { normalizeMessages } from '../provider/normalize'
import { sendChatWithRecovery } from '../contentSafety'
import { summarizeSelection } from '../context/selection'
import { getHandler, getHandlerByActionId } from '../assistants/handlers'
import { getTopLevelContainerNode } from '../stage/anchor'
import type { ExecutionType, Message, LlmProviderId } from '../types'
import type { ConversationManager } from './conversationManager'
import type { StatusChannel } from './statusChannel'
import type { SelectionResolverService, SelectionContext } from './selectionResolver'
import { generateMessageId, cleanChatContent } from './messageHelpers'

export interface QuickActionExecutorDeps {
  conversationManager: ConversationManager
  statusChannel: StatusChannel
  selectionResolver: SelectionResolverService
  getProvider: () => Provider | null
  getProviderId: () => LlmProviderId
  setProvider: (p: Provider) => void
  selectionOrder: () => string[]
  getPreambleSentForSegment: () => string | null
  setPreambleSentForSegment: (id: string | null) => void
  postMessage: (type: string, payload: unknown) => void
  /** Look up an assistant by ID. Injected from the assistant registry (src/assistants). */
  getAssistant: (id: string) => Assistant | undefined
  /** Extract short instructions text from an assistant. Injected from the assistant registry. */
  getShortInstructions: (assistant: Assistant) => string
}

export interface QuickActionExecutor {
  run(actionId: string, assistantId: string): Promise<void>
}

/** Safe session header: neutral framing for providers (e.g. Internal API). No instruction-override or jailbreak-style language. */
const SESSION_HEADER_SAFE = 'Start a new conversation.'

/**
 * Resolve executionType from quick action metadata for RUN_QUICK_ACTION routing.
 * Returns 'unknown' if executionType missing (legacy fallback).
 */
function resolveExecutionType(action: { executionType?: string }): ExecutionType | 'unknown' {
  const t = action.executionType
  if (t === 'ui-only' || t === 'tool-only' || t === 'llm' || t === 'hybrid') return t as ExecutionType
  return 'unknown'
}

export function createQuickActionExecutor(deps: QuickActionExecutorDeps): QuickActionExecutor {
  // Guard: only replace status once per requestId (avoids duplicate final message from repeat events).
  const replacedStatusRequestIds = new Set<string>()
  // Guard: only run final status update once per requestId for tool-only (avoids duplicate "Add HAT: …" lines).
  const completedToolOnlyRequestIds = new Set<string>()

  let traceCounter = 0

  function qaTrace(marker: string, data: Record<string, unknown>): void {
    if (!debug.isEnabled('trace:chat')) return
    traceCounter += 1
    debug.scope('trace:chat').log(`QA_TRACE ${marker}`, { n: traceCounter, ...data })
  }

  function sendAssistantMessage(content: string, toolCallId?: string, requestId?: string): void {
    const sanitized = sanitizeForChat(content)
    const cleanedContent = cleanChatContent(sanitized)
    if (debug.isEnabled('trace:chat')) {
      const lineCount = cleanedContent.split('\n').length
      const previewTop = cleanedContent.slice(0, 200)
      const jsonSample = JSON.stringify(cleanedContent.slice(0, 400))
      debug.scope('trace:chat').log('CHAT_SEND_TO_UI', { requestId, len: cleanedContent.length, lineCount, previewTop, jsonSample })
    }
    const message: Message = {
      id: generateMessageId(),
      role: 'assistant',
      content: cleanedContent,
      timestamp: Date.now(),
      toolCallId,
      requestId,
      contentNormalized: true
    }
    deps.conversationManager.push(message)
    deps.postMessage('ASSISTANT_MESSAGE', { message })
  }

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
    deps.conversationManager.push(statusMessage)
    deps.postMessage('ASSISTANT_MESSAGE', { message: statusMessage })
    return statusMessage
  }

  function postStatusStep(requestId: string, step: string): void {
    deps.postMessage('STATUS_STEP', { requestId, step })
  }

  function replaceStatusMessage(requestId: string, finalContent: string, isError: boolean = false): void {
    if (replacedStatusRequestIds.has(requestId)) return
    replacedStatusRequestIds.add(requestId)

    const cleanedContent = cleanChatContent(sanitizeForChat(finalContent))
    if (debug.isEnabled('trace:chat')) {
      const lineCount = cleanedContent.split('\n').length
      const previewTop = cleanedContent.slice(0, 200)
      const jsonSample = JSON.stringify(cleanedContent.slice(0, 400))
      debug.scope('trace:chat').log('CHAT_SEND_TO_UI', { requestId, len: cleanedContent.length, lineCount, previewTop, jsonSample })
    }
    const summaryHash = cleanedContent.slice(0, 40) + '_' + cleanedContent.length
    qaTrace('MAIN_POST_FINAL', { requestId, summaryHash, messageLength: cleanedContent.length, messagePreviewEnd: cleanedContent.slice(-40) })

    const finalMessage = deps.conversationManager.replaceStatusForRequest(requestId, cleanedContent, isError)
    if (finalMessage === null) {
      replacedStatusRequestIds.delete(requestId)
      console.warn('[QuickActionExecutor] Status message not found for requestId:', requestId)
      sendAssistantMessage(finalContent, undefined, requestId)
      return
    }

    deps.postMessage('ASSISTANT_MESSAGE', { message: finalMessage })
  }

  function getCurrentAssistantSegment(assistantId: string): Message[] {
    const messages = deps.conversationManager.getHistory()
    let segmentStartIndex = 0
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].isBoundary && messages[i].assistantId === assistantId) {
        segmentStartIndex = i + 1
        break
      }
    }

    const segment = messages.slice(segmentStartIndex).filter(m => {
      if (m.isBoundary || m.isGreeting || m.isInstructions || m.isStatus) {
        return false
      }
      return m.role === 'user' || m.role === 'assistant'
    })

    return segment
  }

  return {
    async run(actionId: string, assistantId: string): Promise<void> {
      console.log('[Main] onmessage RUN_QUICK_ACTION', { actionId, assistantId })

      // Generate request ID for this request
      const requestId = deps.conversationManager.generateRequestId()
      qaTrace('MAIN_RECV_RUN_QUICK_ACTION', { requestId, assistantId, actionId })

      try {
        const assistant = deps.getAssistant(assistantId)
        if (!assistant) {
          console.error('[Main] Assistant not found:', assistantId)
          sendAssistantMessage(`Error: Assistant "${assistantId}" not found`)
          return
        }

        const action = assistant.quickActions.find(a => a.id === actionId)
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
        let executionType = resolveExecutionType(action)
        let handler = getHandler(assistantId, actionId)
        // ActionId-first routing for run-smart-detector so we never rely on assistantId
        if (actionId === 'run-smart-detector') {
          const sdFallback = getHandler('general', 'run-smart-detector')
          handler = getHandlerByActionId('run-smart-detector') ?? sdFallback
          executionType = 'tool-only'
        }

        const selection = summarizeSelection(deps.selectionOrder())
        const resolvedHandlerName = handler ? ((handler as { constructor?: { name?: string } }).constructor?.name ?? 'none') : 'none'
        const qaTraceOn = debug.isEnabled('trace:qa')
        if (qaTraceOn) {
          console.log('[QA_ROUTE]', {
            actionId,
            assistantId,
            resolvedHandler: resolvedHandlerName,
            executionType,
            hasSelection: selection.hasSelection,
            selectionCount: deps.selectionOrder().length
          })
        }

        // ——— ui-only: defensive no-op (UI should not send these to main) ———
        if (executionType === 'ui-only') {
          return
        }

        // ——— tool-only (and legacy unknown): single generic path ———
        // Status lifecycle: only main calls replaceStatusMessage once per requestId (guard prevents duplicate final message).
        if ((executionType === 'tool-only' || executionType === 'unknown') && handler) {
          sendStatusMessage(requestId, 'Processing…')
          let providerForContext = deps.getProvider()
          if (!providerForContext) {
            providerForContext = await createProvider(deps.getProviderId())
            deps.setProvider(providerForContext)
          }
          const handlerContext = {
            assistantId,
            actionId,
            response: '',
            selectionOrder: deps.selectionOrder(),
            selection: summarizeSelection(deps.selectionOrder()),
            provider: providerForContext,
            sendChatWithRecovery: async (req: ChatRequest) => {
              const r = await sendChatWithRecovery(providerForContext!, req, {
                selectionSummary: req.selectionSummary,
                assistantId,
                quickActionId: actionId
              })
              return r.response
            },
            sendAssistantMessage: (message: string) => sendAssistantMessage(message, undefined, requestId),
            replaceStatusMessage: (finalContent: string, isError?: boolean) => replaceStatusMessage(requestId, finalContent, isError),
            updateStatusStep: (step: string) => deps.statusChannel.updateStatusStep(requestId, step),
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

        // Fallthrough to LLM path (General or other assistant) — log so we can confirm run-smart-detector did NOT take this path.
        if (qaTraceOn) {
          console.log('[QA_LLM_PATH]', { actionId, assistantId, note: 'LLM/chat path (not tool-only handler)' })
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
            const helpMessage = `**Design AI Toolkit Template JSON Format**

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
        const selectionForReq = summarizeSelection(deps.selectionOrder())
        if (action.requiresSelection && !selectionForReq.hasSelection) {
          replaceStatusMessage(requestId, `Error: This action requires a selection. Please select one or more nodes first.`, true)
          return
        }

        // Check vision requirement
        if (action.requiresVision && !selectionForReq.hasSelection) {
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
        deps.conversationManager.push(userMessage)

        // Send user message to UI (main thread is source of truth)
        console.log('[Main] Sending user message to UI (single source of truth):', userMessage.id)
        deps.postMessage('ASSISTANT_MESSAGE', { message: userMessage })

        // Create status message immediately
        sendStatusMessage(requestId, 'Processing...')

        // Handle tool-only assistants
        if (assistant.kind === 'tool') {
          replaceStatusMessage(requestId, `Tool-only assistant "${assistant.label}" is active. Tool execution would happen here.`)
          return
        }

        // Build chat messages from current assistant segment only
        // This ensures old assistant instructions don't bleed into new assistant context
        const segmentMessages = getCurrentAssistantSegment(assistant.id)
        let chatMessages = normalizeMessages(
          segmentMessages.map(m => ({
            role: m.role,
            content: m.content
          }))
        )

        let assistantPreambleForQuickAction: string | undefined
        let allowImagesForQuickAction: boolean | undefined
        const currentProvider = deps.getProvider()
        if (currentProvider && currentProvider.capabilities.supportsPreambleInjection) {
          const isFirstUserMessage = segmentMessages.length > 0 &&
            segmentMessages[0].role === 'user' &&
            deps.getPreambleSentForSegment() !== assistant.id

          if (isFirstUserMessage && chatMessages.length > 0 && chatMessages[0].role === 'user') {
            const kbDocs = resolveKnowledgeBaseDocs(assistant.knowledgeBaseRefs ?? [])
            const built = buildAssistantInstructionSegments({
              assistantEntry: assistant,
              actionId: action.id,
              legacyInstructionsSource: deps.getShortInstructions(assistant),
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
            deps.setPreambleSentForSegment(assistant.id)
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
        let selectionContext: SelectionContext | undefined
        let activeProvider = deps.getProvider()
        if (!activeProvider) {
          activeProvider = await createProvider(deps.getProviderId())
          deps.setProvider(activeProvider)
        }
        selectionContext = await deps.selectionResolver.buildContext({
          selectionOrder: deps.selectionOrder(),
          quickAction: action,
          provider: activeProvider
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
            if (selectionContext.selection.hasSelection && deps.selectionOrder().length > 0) {
              const node = await figma.getNodeByIdAsync(deps.selectionOrder()[0])
              if (node && node.type !== 'DOCUMENT' && node.type !== 'PAGE') {
                const anchor = getTopLevelContainerNode(node as SceneNode)
                console.log('[DC] selectedNode=', node.name, 'id=', node.id)
                console.log('[DC] anchor=', anchor.name, 'id=', anchor.id)
              }
            }
          }

          const recoveryResult = await sendChatWithRecovery(activeProvider, {
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
            deps.postMessage('PROMPT_DIAG', { diagnostics: recoveryResult.diagnostics })
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
              selectionOrder: deps.selectionOrder(),
              selection: selectionContext.selection,
              provider: activeProvider!,
              sendChatWithRecovery: async (req: ChatRequest) => {
                const r = await sendChatWithRecovery(activeProvider!, req, {
                  selectionSummary: req.selectionSummary,
                  assistantId: assistant.id,
                  quickActionId: action.id
                })
                return r.response
              },
              sendAssistantMessage: (message: string) => sendAssistantMessage(message, undefined, requestId),
              replaceStatusMessage: (finalContent: string, isError?: boolean) => replaceStatusMessage(requestId, finalContent, isError),
              updateStatusStep: (step: string) => deps.statusChannel.updateStatusStep(requestId, step),
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
              const statusIndex = deps.conversationManager.getHistory().findIndex(m => m.requestId === requestId && m.isStatus === true)
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
    }
  }
}
