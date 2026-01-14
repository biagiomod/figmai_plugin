/**
 * FigmAI Plugin - UI Thread
 * 
 * ARCHITECTURE OVERVIEW
 * =====================
 * 
 * This file is the React-based UI component for the FigmAI plugin. It runs in an iframe
 * and communicates with the main thread (main.ts) via postMessage. The UI thread is
 * stateless - the main thread maintains message history and is the single source of truth.
 * 
 * UI ↔ MAIN MESSAGE CONTRACT
 * ---------------------------
 * 
 * UI → Main (emit):
 * - 'SEND_MESSAGE': User sends a message
 * - 'RUN_QUICK_ACTION': User clicks a quick action
 * - 'SET_ASSISTANT': User selects an assistant
 * - 'SET_MODE': User changes mode (simple/advanced)
 * - 'SET_LLM_PROVIDER': User changes provider
 * - 'SAVE_SETTINGS': User saves settings
 * - 'REQUEST_SELECTION_STATE': Request current selection state
 * - 'REQUEST_SETTINGS': Request current settings
 * - 'RESET': Reset conversation
 * 
 * Main → UI (postMessage):
 * - 'ASSISTANT_MESSAGE': New message (user or assistant)
 * - 'SELECTION_STATE': Current selection state
 * - 'SETTINGS_RESPONSE': Current settings
 * - 'TOOL_RESULT': Tool execution result
 * - 'SCORECARD_PLACED': Scorecard rendered to canvas
 * - 'CONTENT_TABLE_GENERATED': Content table generated
 * - 'RESET_DONE': Reset completed
 * 
 * STATUS / PROGRESS MESSAGING PATTERNS
 * ------------------------------------
 * - UI can show loading states optimistically (e.g., "Analyzing...")
 * - Main thread sends actual messages via 'ASSISTANT_MESSAGE'
 * - UI should not add messages optimistically to prevent duplicates
 * - Main thread is the source of truth for message history
 * 
 * WHERE ASSISTANT-SPECIFIC UI LOGIC BELONGS
 * -----------------------------------------
 * - Assistant selection UI: This file (ui.tsx)
 * - Quick action buttons: This file (ui.tsx)
 * - Message display: This file (ui.tsx)
 * - Settings UI: ui/components/SettingsModal.tsx
 * - Rich text rendering: ui/components/RichTextRenderer.tsx
 * - Assistant-specific rendering: Handlers in main thread (not UI)
 * 
 * WHAT SHOULD NEVER BE ADDED HERE
 * --------------------------------
 * - Business logic: Should be in main thread or handlers
 * - Message history management: Main thread maintains this
 * - Provider calls: Should go through main thread
 * - Canvas rendering: Should be in main thread or handlers
 * - Selection processing: Should be in main thread
 * - Work adapter calls: Can be here (e.g., Confluence integration), but should
 *   be minimal and delegate to adapter
 * 
 * IMPORTANT ASSUMPTIONS
 * ---------------------
 * - UI is stateless: Main thread maintains message history
 * - Messages arrive via postMessage: Don't maintain local message state
 * - Main thread is source of truth: Trust messages from main thread
 * - Work adapter is imported dynamically: Use `await import('./core/work/adapter')`
 */

import {
  Button,
  Container,
  render,
  Text,
  TextboxMultiline,
  VerticalSpace
} from '@create-figma-plugin/ui'
import { emit, on } from '@create-figma-plugin/utilities'
import { h } from 'preact'
import { useCallback, useEffect, useRef, useState } from 'preact/hooks'

import { BRAND } from './core/brand'
import { CONFIG } from './core/config'
import { listAssistants, listAssistantsByMode, getAssistant, getDefaultAssistant } from './assistants'
import type { Assistant as AssistantType, QuickAction } from './assistants'
import { SettingsModal } from './ui/components/SettingsModal'
import { ConfluenceModal } from './ui/components/ConfluenceModal'
import { RichTextRenderer } from './ui/components/RichTextRenderer'
import { parseRichText } from './core/richText/parseRichText'
import { enhanceRichText } from './core/richText/enhancers'
import type {
  ResetHandler,
  RequestSelectionStateHandler,
  SendMessageHandler,
  SetAssistantHandler,
  SetModeHandler,
  SetLlmProviderHandler,
  RunQuickActionHandler,
  RunToolHandler,
  ResetDoneHandler,
  SelectionStateHandler,
  AssistantMessageHandler,
  ToolResultHandler,
  TestResultHandler,
  ScorecardPlacedHandler,
  ScorecardResult,
  UniversalContentTableV1,
  TableFormatPreset,
  Message,
  SelectionState,
  Mode,
  LlmProviderId,
  Assistant,
  CopyTableStatusHandler,
  ExportContentTableRefImageHandler,
} from './core/types'
import { toHtmlTable, fromHtmlTable } from './core/contentTable/htmlTransform'
import { universalTableToHtml, universalTableToTsv, universalTableToJson } from './core/contentTable/renderers'
import { PRESET_INFO } from './core/contentTable/presets.generated'
import { BUILD_VERSION } from './core/build'

// Import CSS
import './ui/styles/theme.css'
import './ui/styles/skins/base.css'
import './ui/styles/skins/dark.css'

// Import Icons
import {
  OpenAIIcon,
  ClaudeIcon,
  CopilotIcon,
  HomeIcon,
  SelectionNoneIcon,
  SelectionRequiredIcon,
  SelectionHasIcon,
  ArrowUpIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  DarkmodeIcon,
  LightmodeIcon,
  SettingsIcon,
  ShieldCheckIcon,
  CodeIcon,
  ADAIcon,
  ArtIcon,
  CautionIcon,
  AskIcon,
  ContentTableIcon,
  SpellCheckIcon,
  TrashIcon,
  LightBulbRaysIcon,
  PathIcon
} from './ui/icons'

// --- Chat content helpers for Design Workshop UX cleanup ---

/**
 * Clean chat content by removing internal generation metadata tags
 * Removes patterns like "generate: 1/100 (1%)" that should not appear in user-facing chat
 * Also removes duplicate paragraphs within the same message
 */
function cleanChatContent(raw: string): string {
  if (!raw) return ''

  // Strip internal generation metadata like: "generate: 1/100 (1%)"
  let text = raw
    .replace(/generate:\s*\d+\/\d+\s*\(\d+%\)/gi, '') // generate: X/Y (Z%)
    .replace(/generate:\s*\d+\/\d+/gi, '')            // generate: X/Y
    .replace(/\(\d+%\)/g, '')                         // standalone "(Z%)"
    .trim()

  // CRITICAL: Preserve welcome lines for assistants - never remove these
  const welcomeLinePatterns = [
    /welcome to your content table assistant/i,
    /welcome to your design workshop assistant/i,
    /welcome to your/i
  ]
  
  // Remove duplicate paragraphs (split by newlines, keep unique)
  // Do this BEFORE collapsing whitespace to preserve paragraph structure
  // Note: This preserves markdown formatting (e.g., **bold**) and unique lines
  // The welcome line "**Welcome to your Content Table Assistant**" will be preserved
  // as it's different from the description line when normalized
  const lines = text.split(/\n+/).filter(line => line.trim().length > 0)
  const uniqueLines: string[] = []
  const seen = new Set<string>()
  let welcomeLineFound: string | null = null
  
  for (const line of lines) {
    const normalized = line.trim().toLowerCase().replace(/\s+/g, ' ')
    // Test both original line and normalized line to catch markdown-wrapped welcome lines
    const isWelcomeLine = welcomeLinePatterns.some(pattern => pattern.test(line) || pattern.test(normalized))
    
    // Always preserve welcome lines, even if they appear to be duplicates
    if (isWelcomeLine) {
      if (!welcomeLineFound) {
        welcomeLineFound = line.trim()
        uniqueLines.push(line.trim())
      }
      continue
    }
    
    // Only skip if we've seen this exact normalized line before
    // This preserves the original line with markdown formatting
    if (!seen.has(normalized)) {
      seen.add(normalized)
      uniqueLines.push(line.trim())
    }
  }
  
  // Ensure welcome line is at the beginning if it exists
  if (welcomeLineFound) {
    const welcomeIndex = uniqueLines.findIndex(line => {
      const normalized = line.trim().toLowerCase().replace(/\s+/g, ' ')
      return welcomeLinePatterns.some(pattern => pattern.test(line) || pattern.test(normalized))
    })
    if (welcomeIndex > 0) {
      const welcomeLine = uniqueLines.splice(welcomeIndex, 1)[0]
      uniqueLines.unshift(welcomeLine)
    }
  }

  text = uniqueLines.join('\n')
  
  // Collapse multiple spaces to single space (but preserve newlines)
  text = text.replace(/[ \t]+/g, ' ').trim()

  return text
}

/**
 * Check if a message looks like a Design Workshop intro message
 */
function isDesignWorkshopIntro(text: string): boolean {
  const normalized = cleanChatContent(text).toLowerCase()
  return (
    normalized.includes('welcome to your design workshop assistant') ||
    normalized.includes('i generate 1-5 figma screens from a json specification')
  )
}

function Plugin() {
  // Log build version on component mount
  console.log('[UI] Build version:', BUILD_VERSION)
  
  // Reset token to prevent late-arriving messages from re-hydrating stale state
  const [resetToken, setResetToken] = useState(0)
  
  // State
  const [theme, setTheme] = useState<'light' | 'dark'>('dark')
  
  // Load mode from localStorage, default to 'content-mvp' for first-time users
  const [mode, setMode] = useState<Mode>(() => {
    try {
      const saved = localStorage.getItem('figmai-mode')
      return (saved === 'simple' || saved === 'advanced' || saved === 'content-mvp') ? saved : 'content-mvp'
    } catch {
      return 'content-mvp'
    }
  })
  
  const [provider, setProvider] = useState<LlmProviderId>('openai')
  
  // Default assistant: Content Table in content-mvp mode, General in simple mode, General in advanced mode
  const [assistant, setAssistant] = useState<AssistantType>(() => {
    const currentMode = (() => {
      try {
        const saved = localStorage.getItem('figmai-mode')
        return (saved === 'simple' || saved === 'advanced' || saved === 'content-mvp') ? saved : 'content-mvp'
      } catch {
        return 'content-mvp'
      }
    })()
    
    return getDefaultAssistant(currentMode)
  })
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [selectionState, setSelectionState] = useState<SelectionState>({
    count: 0,
    summary: 'No selection',
    hasSelection: false,
    names: []
  })
  const [includeSelection, setIncludeSelection] = useState(false)
  const [selectionRequired, setSelectionRequired] = useState(false)
  const [showAssistantModal, setShowAssistantModal] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [showClearChatModal, setShowClearChatModal] = useState(false)
  const [showSendJsonModal, setShowSendJsonModal] = useState(false)
  const [showGetJsonModal, setShowGetJsonModal] = useState(false)
  const [jsonInput, setJsonInput] = useState('')
  const [jsonOutput, setJsonOutput] = useState('')
  const [hasShownCode2DesignHelper, setHasShownCode2DesignHelper] = useState(false)
  const [hasAutoOpenedSendJson, setHasAutoOpenedSendJson] = useState(false)
  const [showCopySuccess, setShowCopySuccess] = useState(false)
  const [showSelectionHint, setShowSelectionHint] = useState(false)
  const [showEmptyInputWarning, setShowEmptyInputWarning] = useState(false)
  const [showCredits, setShowCredits] = useState(true)
  const [creditsAutoCollapseTimer, setCreditsAutoCollapseTimer] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isCopyingTable, setIsCopyingTable] = useState(false)
  const hasAutoCollapsedRef = useRef(false)
  // Store latest status message ID for Design Critique quick actions
  const latestStatusMessageIdRef = useRef<string | null>(null)
  // Scorecard state for Design Critique
  const [scorecard, setScorecard] = useState<ScorecardResult | null>(null)
  const [scorecardError, setScorecardError] = useState<{ error: string; raw?: string } | null>(null)
  // Content Table state
  const [contentTable, setContentTable] = useState<UniversalContentTableV1 | null>(null)
  const [showFormatModal, setShowFormatModal] = useState(false)
  const [selectedFormat, setSelectedFormat] = useState<TableFormatPreset>('universal')
  const [showTableView, setShowTableView] = useState(false)
  const [pendingAction, setPendingAction] = useState<'copy' | 'view' | 'confluence' | null>(null)
  const [isCopyingRefImage, setIsCopyingRefImage] = useState(false)
  const [showCopyFormatModal, setShowCopyFormatModal] = useState(false)
  const [showConfluenceModal, setShowConfluenceModal] = useState(false)
  const [confluenceFormat, setConfluenceFormat] = useState<TableFormatPreset>('universal')
  // Clipboard debug state
  const [showPasteDebug, setShowPasteDebug] = useState(false)
  const [debugHtml, setDebugHtml] = useState('')
  const [debugTsv, setDebugTsv] = useState('')
  const [copyStatus, setCopyStatus] = useState<{ success: boolean; message: string } | null>(null)
  
  // Debug logging function (gated behind CONFIG.dev.enableClipboardDebugLogging)
  const debugLog = useCallback((message: string, data?: Record<string, unknown>) => {
    if (CONFIG.dev.enableClipboardDebugLogging) {
      console.log(`[Clipboard] ${message}`, data || '')
    }
  }, [])
  
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  
  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])
  
  // Auto-collapse credits after 3 seconds (only on first open)
  useEffect(() => {
    if (showCredits && !hasAutoCollapsedRef.current) {
      const timer = window.setTimeout(() => {
        setShowCredits(false)
        hasAutoCollapsedRef.current = true
      }, 3000)
      setCreditsAutoCollapseTimer(timer)
      return () => {
        if (timer) clearTimeout(timer)
      }
    }
  }, [showCredits])
  
  // UI mount logging
  useEffect(() => {
    console.log('[UI] mounted')
    
    // Global error handlers
    const handleError = (e: ErrorEvent) => {
      console.error('[UI] window error', e.error || e)
    }
    const handleUnhandledRejection = (e: PromiseRejectionEvent) => {
      console.error('[UI] unhandledrejection', e.reason)
    }
    
    window.addEventListener('error', handleError)
    window.addEventListener('unhandledrejection', handleUnhandledRejection)
    
    return () => {
      window.removeEventListener('error', handleError)
      window.removeEventListener('unhandledrejection', handleUnhandledRejection)
    }
  }, [])
  
  // Listen to events from main thread
  useEffect(() => {
    // Use a generic message handler that routes by type
    function handleMessage(message: any) {
      if (!message || !message.type) return
      
      console.log('[UI] handleMessage', message.type)
      
      switch (message.type) {
        case 'RESET_DONE':
          // RESET_DONE from main thread - ensure UI is fully reset
          // Use current mode (not 'advanced') to preserve user's mode preference
          resetUIState(mode)
          break
        case 'SELECTION_STATE':
          if (message.state) {
            console.log('Received selection state:', message.state)
            setSelectionState(message.state)
          } else {
            console.warn('SELECTION_STATE message missing state:', message)
          }
          break
        case 'ASSISTANT_MESSAGE':
          // Check resetToken to ignore late-arriving messages after reset
          // If resetToken is not provided (old messages), only process if we haven't reset yet (resetToken === 0)
          // Exception: Always process RESET_DONE assistant messages (they come after reset)
          const shouldProcessAssistantMessage = message.message && 
            (message.resetToken === resetToken || 
             (resetToken === 0 && message.resetToken === undefined) ||
             (message.message.role === 'assistant' && message.message.content.includes('intro')))
          
          if (shouldProcessAssistantMessage) {
            console.log('[UI] setThinking false - ASSISTANT_MESSAGE received', { role: message.message.role })
            setMessages(prev => {
              const incoming = message.message as Message

              // User messages: keep existing behavior
              if (incoming.role === 'user') {
                const statusMessages = prev.filter(m => m.isStatus)
                const nonStatusMessages = prev.filter(m => !m.isStatus)
                // Put user message before status messages for correct order
                return [...nonStatusMessages, incoming, ...statusMessages]
              }

              // Assistant messages: clean + dedupe
              const cleanedContent = cleanChatContent(incoming.content)
              const looksLikeWorkshopIntro = isDesignWorkshopIntro(cleanedContent)

              if (looksLikeWorkshopIntro) {
                // Check if we already have a similar intro message (compare cleaned content)
                const hasDuplicate = prev.some(m => {
                  if (m.role !== 'assistant') return false
                  const prevCleaned = cleanChatContent(m.content)
                  return isDesignWorkshopIntro(prevCleaned)
                })

                if (hasDuplicate) {
                  console.log('[UI] Skipping duplicate Design Workshop intro message')
                  return prev
                }
              }

              const cleanedMessage: Message = { ...incoming, content: cleanedContent }
              const newMessages = [...prev, cleanedMessage]
              return newMessages
            })
            setIsLoading(false) // Stop loading when message arrives
          } else {
            console.log('[UI] Ignoring ASSISTANT_MESSAGE - resetToken mismatch or missing message', { 
              messageToken: message.resetToken, 
              currentToken: resetToken 
            })
          }
          break
        case 'SCORECARD_RESULT':
          // Receive scorecard result from main thread
          // Check resetToken to ignore late-arriving messages after reset
          // If resetToken is not provided (old messages), only process if we haven't reset yet (resetToken === 0)
          const shouldProcessScorecardResult = message.payload && 
            (message.resetToken === resetToken || (resetToken === 0 && message.resetToken === undefined))
          
          if (shouldProcessScorecardResult) {
            console.log('[UI] Received SCORECARD_RESULT:', message.payload)
            console.log('[UI] setThinking false - SCORECARD_RESULT')
            setScorecard(message.payload)
            setScorecardError(null)
            setIsLoading(false)
          } else {
            console.log('[UI] Ignoring SCORECARD_RESULT - resetToken mismatch or missing payload', { 
              messageToken: message.resetToken, 
              currentToken: resetToken 
            })
          }
          break
        case 'SCORECARD_ERROR':
          // Receive scorecard error from main thread
          // Check resetToken to ignore late-arriving messages after reset
          // If resetToken is not provided (old messages), only process if we haven't reset yet (resetToken === 0)
          const shouldProcessScorecardError = 
            (message.resetToken === resetToken || (resetToken === 0 && message.resetToken === undefined))
          
          if (shouldProcessScorecardError) {
            console.error('[UI] Received SCORECARD_ERROR:', message.error, message.raw)
            console.log('[UI] setThinking false - SCORECARD_ERROR')
            setScorecardError({ error: message.error || 'Unknown error', raw: message.raw })
            setScorecard(null)
            setIsLoading(false)
          } else {
            console.log('[UI] Ignoring SCORECARD_ERROR - resetToken mismatch', { 
              messageToken: message.resetToken, 
              currentToken: resetToken 
            })
          }
          break
        case 'CONTENT_TABLE_GENERATED':
          // Receive content table from main thread
          // Check resetToken to ignore late-arriving messages after reset
          // If resetToken is not provided (old messages), only process if we haven't reset yet (resetToken === 0)
          const shouldProcessContentTable = message.table && 
            (message.resetToken === resetToken || (resetToken === 0 && message.resetToken === undefined))
          
          if (shouldProcessContentTable) {
            console.log('[UI] Received CONTENT_TABLE_GENERATED:', message.table)
            console.log('[UI] setThinking false - CONTENT_TABLE_GENERATED')
            setContentTable(message.table)
            setIsLoading(false)
          } else {
            console.log('[UI] Ignoring CONTENT_TABLE_GENERATED - resetToken mismatch or missing table', { 
              messageToken: message.resetToken, 
              currentToken: resetToken 
            })
          }
          break
        case 'CONTENT_TABLE_ERROR':
          // Receive content table error from main thread
          // Check resetToken to ignore late-arriving messages after reset
          // If resetToken is not provided (old messages), only process if we haven't reset yet (resetToken === 0)
          const shouldProcessContentTableError = 
            (message.resetToken === resetToken || (resetToken === 0 && message.resetToken === undefined))
          
          if (shouldProcessContentTableError) {
            console.error('[UI] Received CONTENT_TABLE_ERROR:', message.error)
            console.log('[UI] setThinking false - CONTENT_TABLE_ERROR')
            setContentTable(null)
            setIsLoading(false)
          } else {
            console.log('[UI] Ignoring CONTENT_TABLE_ERROR - resetToken mismatch', { 
              messageToken: message.resetToken, 
              currentToken: resetToken 
            })
          }
          break
        case 'CONTENT_TABLE_REF_IMAGE_READY':
          console.log('[UI] Received CONTENT_TABLE_REF_IMAGE_READY, dataUrl length:', message.dataUrl?.length || 0)
          // Don't reset state here - handleCopyRefImageToClipboard will handle it
          handleCopyRefImageToClipboard(message.dataUrl)
          break
        case 'CONTENT_TABLE_REF_IMAGE_ERROR':
          console.log('[UI] Received CONTENT_TABLE_REF_IMAGE_ERROR:', message.message)
          setIsCopyingRefImage(false)
          emit<CopyTableStatusHandler>('COPY_TABLE_STATUS', 'error', message.message || 'Could not copy reference image.')
          break
        case 'PLACEHOLDER_SCORECARD_PLACED':
          console.log('[UI] Received PLACEHOLDER_SCORECARD_PLACED')
          setIsLoading(false)
          break
        case 'PLACEHOLDER_SCORECARD_ERROR':
          console.error('[UI] Received PLACEHOLDER_SCORECARD_ERROR:', message.message)
          setIsLoading(false)
          // Show error toast (figma.notify is handled in main thread)
          break
        case 'SCORECARD_PLACED':
          // Update status message when scorecard placement completes
          // Check resetToken to ignore late-arriving messages after reset
          // If resetToken is not provided (old messages), only process if we haven't reset yet (resetToken === 0)
          const shouldProcessScorecardPlaced = message.message !== undefined && 
            (message.resetToken === resetToken || (resetToken === 0 && message.resetToken === undefined))
          
          if (shouldProcessScorecardPlaced) {
            const success = message.success !== false // Default to success if not specified
            const statusStyle: 'success' | 'error' = success ? 'success' : 'error'
            
            setMessages(prev => {
              // Try to match by stored ID first
              const statusId = latestStatusMessageIdRef.current
              if (statusId) {
                const updated = prev.map(m => {
                  if (m.id === statusId && m.isStatus) {
                    console.log('[UI] Updating status message by ID:', m.id, 'to:', message.message, 'style:', statusStyle)
                    // Update content and change to static success/error (remove loading animation)
                    return { 
                      ...m, 
                      content: message.message, 
                      isStatus: false, // Remove status flag so it becomes a regular message
                      statusStyle: statusStyle // Set final status style
                    }
                  }
                  return m
                })
                // Clear ref after update
                latestStatusMessageIdRef.current = null
                return updated
              }
              
              // Fallback: find latest status message if ID not stored
              const statusMessages = prev.filter(m => m.isStatus)
              if (statusMessages.length > 0) {
                const latestStatus = statusMessages[statusMessages.length - 1]
                console.log('[UI] Updating latest status message (fallback):', latestStatus.id, 'to:', message.message, 'style:', statusStyle)
                return prev.map(m => 
                  m.id === latestStatus.id
                    ? { ...m, content: message.message, isStatus: false, statusStyle: statusStyle }
                    : m
                )
              }
              
              return prev
            })
            console.log('[UI] setThinking false - SCORECARD_PLACED')
            setIsLoading(false)
          } else {
            console.log('[UI] Ignoring SCORECARD_PLACED - resetToken mismatch', { 
              messageToken: message.resetToken, 
              currentToken: resetToken 
            })
          }
          break
        case 'TOOL_RESULT':
          if (message.message) {
            console.log('[UI] setThinking false - TOOL_RESULT')
            setMessages(prev => [...prev, message.message])
            setIsLoading(false) // Stop loading when tool result arrives
          }
          // Handle JSON export data
          if (message.data?.exportedJson) {
            const jsonStr = typeof message.data.exportedJson === 'string' 
              ? message.data.exportedJson 
              : JSON.stringify(message.data.exportedJson, null, 2)
            setJsonOutput(jsonStr)
            setShowGetJsonModal(true)
          }
          break
        case 'TEST_RESULT':
          // Test result is handled in SettingsModal component
          break
        case 'SETTINGS_RESPONSE':
          // Settings response is handled in SettingsModal component
          break
      }
    }
    
    // Listen for all messages from main thread
    function onMessage(event: MessageEvent) {
      // Debug: log all incoming messages
      console.log('[UI] received message:', event.data)
      
      // Handle nested pluginMessage structure
      // event.data might be {pluginMessage: {...}} or the message might be nested deeper
      let pluginMessage = event.data?.pluginMessage || event.data
      
      // If pluginMessage itself has a pluginMessage property, unwrap it
      if (pluginMessage?.pluginMessage) {
        pluginMessage = pluginMessage.pluginMessage
      }
      
      if (pluginMessage && pluginMessage.type) {
        console.log('[UI] Processing plugin message:', pluginMessage.type)
        handleMessage(pluginMessage)
      } else {
        console.warn('[UI] Message received but no valid pluginMessage found:', event.data)
      }
    }
    
    window.addEventListener('message', onMessage)
    
    // Request initial selection state
    console.log('[UI] Requesting initial selection state')
    emit<RequestSelectionStateHandler>('REQUEST_SELECTION_STATE')
    
    // Cleanup
    return () => {
      window.removeEventListener('message', onMessage)
    }
  }, [])
  
  // Set theme on root element
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])
  
  // Send Content Table Assistant intro on initial load if in Content-MVP mode
  // Use a ref to track if we've already sent the initial SET_ASSISTANT to prevent duplicates
  const hasSentInitialSetAssistant = useRef(false)
  useEffect(() => {
    // Only run once on mount, and only if we're in Content-MVP mode with Content Table assistant
    // Also check ref to prevent duplicate calls
    if (mode === 'content-mvp' && assistant.id === 'content_table' && !hasSentInitialSetAssistant.current) {
      console.log('[UI] Content-MVP mode detected, sending SET_ASSISTANT for content_table')
      // Set ref BEFORE emitting to prevent race conditions
      hasSentInitialSetAssistant.current = true
      // Send the intro message - main thread will check for duplicates
      emit<SetAssistantHandler>('SET_ASSISTANT', 'content_table')
    }
  }, []) // Only run on mount

  // Update assistant when mode changes
  useEffect(() => {
    if (mode === 'content-mvp') {
      // In content-mvp mode, ensure we're using Content Table Assistant
      // Only send SET_ASSISTANT if assistant actually changed (not on initial mount when already correct)
      if (assistant.id !== 'content_table') {
        const contentTableAssistant = getDefaultAssistant('content-mvp')
        setAssistant(contentTableAssistant)
        // Mark as sent to prevent the mount useEffect from also sending
        hasSentInitialSetAssistant.current = true
        emit<SetAssistantHandler>('SET_ASSISTANT', contentTableAssistant.id)
      }
    } else if (mode === 'simple') {
      // In simple mode, ensure current assistant is available in simple mode
      // If not, default to General
      const simpleAssistants = listAssistantsByMode('simple')
      const isCurrentAssistantAvailable = simpleAssistants.some(a => a.id === assistant.id)
      if (!isCurrentAssistantAvailable) {
        setAssistant(getDefaultAssistant('simple'))
      }
    }
  }, [mode, assistant.id])
  
  // Comprehensive UI reset function - restores all state to initial values
  const resetUIState = useCallback((currentMode: Mode) => {
    // Clear all chat content
    setMessages([])
    setIsLoading(false)
    
    // Clear all error/success banners
    setScorecardError(null)
    setScorecard(null)
    setContentTable(null)
    setCopyStatus(null)
    
    // Clear input and draft text
    setInput('')
    setJsonInput('')
    setJsonOutput('')
    
    // Reset assistant to default for current mode
    setAssistant(getDefaultAssistant(currentMode))
    
    // Close all modals
    setShowAssistantModal(false)
    setShowSettingsModal(false)
    setShowClearChatModal(false)
    setShowSendJsonModal(false)
    setShowGetJsonModal(false)
    setShowFormatModal(false)
    setShowTableView(false)
    setShowCopyFormatModal(false)
    setShowConfluenceModal(false)
    
    // Reset selection-related state
    setSelectionRequired(false)
    setIncludeSelection(false)
    setShowSelectionHint(false)
    setShowEmptyInputWarning(false)
    
    // Reset Content Table state
    setSelectedFormat('universal')
    setPendingAction(null)
    setIsCopyingTable(false)
    setIsCopyingRefImage(false)
    
    // Reset helper flags
    setHasShownCode2DesignHelper(false)
    setHasAutoOpenedSendJson(false)
    setShowCopySuccess(false)
    
    // Reset status message refs
    latestStatusMessageIdRef.current = null
    
    // Reset credits (show on fresh start)
    setShowCredits(true)
    setCreditsAutoCollapseTimer(null)
    hasAutoCollapsedRef.current = false
    
    // Increment reset token to invalidate late-arriving messages
    setResetToken(prev => prev + 1)
    
    console.log('[UI] UI state reset complete, resetToken incremented')
  }, [])

  // Handlers
  const handleReset = useCallback(() => {
    // Perform local UI reset immediately
    resetUIState(mode)
    
    // Also emit RESET to main thread (for main thread state cleanup)
    emit<ResetHandler>('RESET')
  }, [mode, resetUIState])

  const handleClearChat = useCallback(() => {
    setMessages([])
    setIsLoading(false)
    setShowClearChatModal(false)
  }, [])
  
  const handleProviderClick = useCallback((providerId: LlmProviderId) => {
    if (providerId === 'openai') {
      setProvider(providerId)
      emit<SetLlmProviderHandler>('SET_LLM_PROVIDER', providerId)
    }
    // Claude and Copilot are disabled for now
  }, [])
  
  const handleModeSelect = useCallback((selectedMode: Mode) => {
    setMode(selectedMode)
    // Persist to localStorage
    try {
      localStorage.setItem('figmai-mode', selectedMode)
    } catch (e) {
      console.warn('[UI] Failed to save mode to localStorage:', e)
    }
    
    // Update default assistant when switching modes
    if (selectedMode === 'content-mvp') {
      // In content-mvp mode, always switch to Content Table Assistant
      const contentTableAssistant = getDefaultAssistant('content-mvp')
      setAssistant(contentTableAssistant)
      // Emit SET_ASSISTANT to trigger intro message
      emit<SetAssistantHandler>('SET_ASSISTANT', contentTableAssistant.id)
    } else if (selectedMode === 'simple') {
      // In simple mode, default to General if current assistant is not available in simple mode
      const simpleAssistants = listAssistantsByMode('simple')
      const isCurrentAssistantAvailable = simpleAssistants.some(a => a.id === assistant.id)
      if (!isCurrentAssistantAvailable) {
        setAssistant(getDefaultAssistant('simple'))
      }
    } else if (selectedMode === 'advanced') {
      // In advanced mode, keep current assistant or default to General
      if (assistant.id === 'content_table') {
        const general = getAssistant('general')
        if (general) {
          setAssistant(general)
        }
      }
    }
    
    emit<SetModeHandler>('SET_MODE', selectedMode)
  }, [assistant.id])
  
  const handleThemeToggle = useCallback(() => {
    setTheme(prev => prev === 'light' ? 'dark' : 'light')
  }, [])
  
  const handleAssistantClick = useCallback(() => {
    setShowAssistantModal(true)
  }, [])
  
  const handleAssistantSelect = useCallback((assistantId: string) => {
    const selected = getAssistant(assistantId)
    if (selected) {
      setAssistant(selected)
      emit<SetAssistantHandler>('SET_ASSISTANT', assistantId)
      
      // Code2Design: Auto-open SEND JSON modal on first selection
      if (assistantId === 'code2design' && !hasAutoOpenedSendJson) {
        setHasAutoOpenedSendJson(true)
        setShowSendJsonModal(true)
        setHasShownCode2DesignHelper(true)
      } else if (assistantId === 'code2design') {
        setHasShownCode2DesignHelper(true)
      } else {
        setHasShownCode2DesignHelper(false)
      }
    }
    setShowAssistantModal(false)
  }, [hasAutoOpenedSendJson])

  // Handle Escape key to close assistant modal
  useEffect(() => {
    if (!showAssistantModal) return
    
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setShowAssistantModal(false)
      }
    }
    
    window.addEventListener('keydown', handleEscape)
    return () => {
      window.removeEventListener('keydown', handleEscape)
    }
  }, [showAssistantModal])
  
  const handleSelectionIndicatorClick = useCallback(() => {
    emit<RequestSelectionStateHandler>('REQUEST_SELECTION_STATE')
    
    // If no selection, show hint message and change background to light yellow
    if (!selectionState.hasSelection && !selectionRequired) {
      setShowSelectionHint(true)
      // Auto-hide hint after 5 seconds
      setTimeout(() => {
        setShowSelectionHint(false)
      }, 5000)
    }
    
    if (mode === 'advanced') {
      setIncludeSelection(prev => !prev)
    }
  }, [mode, selectionState.hasSelection, selectionRequired])
  
  // Hide selection hint when selection changes
  useEffect(() => {
    if (selectionState.hasSelection && showSelectionHint) {
      setShowSelectionHint(false)
    }
  }, [selectionState.hasSelection, showSelectionHint])
  
  const handleSend = useCallback(() => {
    // Check for empty input first
    if (!input.trim()) {
      setShowEmptyInputWarning(true)
      setTimeout(() => {
        setShowEmptyInputWarning(false)
      }, 3000)
      return
    }
    
    // Check selection requirement
    if (selectionRequired && !selectionState.hasSelection) return
    
    console.log('[UI] setThinking true - handleSend')
    setIsLoading(true) // Start loading indicator
    console.log('[UI] postMessage SEND_MESSAGE', { input: input.substring(0, 50) + '...', includeSelection: includeSelection || selectionRequired })
    emit<SendMessageHandler>('SEND_MESSAGE', input, includeSelection || selectionRequired)
    setInput('')
    setSelectionRequired(false)
    setIncludeSelection(false)
    inputRef.current?.focus()
  }, [input, includeSelection, selectionRequired, selectionState])
  
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      handleSend()
    }
  }, [handleSend])
  
  const handleQuickAction = useCallback((actionId: string) => {
    console.log('[UI] handleQuickAction called', { actionId, hasContentTable: !!contentTable, assistantId: assistant.id })
    
    // Handle copy-ref-image directly in UI (doesn't need main thread processing)
    if (actionId === 'copy-ref-image') {
      handleCopyRefImage()
      return
    }
    
    // Handle Content Table dynamic actions (these are UI-only, don't send to main thread)
    if (assistant.id === 'content_table' && contentTable) {
      if (actionId === 'send-to-confluence') {
        console.log('[UI] Handling send-to-confluence action')
        setPendingAction('confluence')
        setShowFormatModal(true)
        return
      }
      if (actionId === 'copy-table') {
        console.log('[UI] Handling copy-table action')
        // Show "Copy as" format chooser modal
        setShowCopyFormatModal(true)
        return
      }
      if (actionId === 'view-table') {
        console.log('[UI] Handling view-table action')
        setPendingAction('view')
        setShowFormatModal(true)
        return
      }
      if (actionId === 'generate-new-table') {
        console.log('[UI] Handling generate-new-table action - clearing table')
        setContentTable(null)
        setShowTableView(false)
        setSelectedFormat('universal')
        // Don't return - let it fall through to trigger the generate-table action
        // Actually, we should trigger the generate-table action here
        // But first check if there's a selection
        if (!selectionState.hasSelection) {
          setSelectionRequired(true)
          return
        }
        // Trigger the generate-table action
        actionId = 'generate-table'
      }
    }
    
    const action = assistant.quickActions.find((a: QuickAction) => a.id === actionId)
    if (!action) {
      console.warn('[UI] Action not found:', actionId, 'for assistant:', assistant.id)
      return
    }
    
    // Code2Design special handling
    if (assistant.id === 'code2design') {
      if (actionId === 'send-json') {
        setShowSendJsonModal(true)
        return
      }
      if (actionId === 'get-json') {
        if (!selectionState.hasSelection) {
          setSelectionRequired(true)
          return
        }
        // Run export tool
        emit<RunToolHandler>('RUN_TOOL', 'EXPORT_SELECTION_TO_TEMPLATE_JSON', {})
        setSelectionRequired(false)
        return
      }
    }
    
    // Check selection requirement
    if (action.requiresSelection && !selectionState.hasSelection) {
      setSelectionRequired(true)
      return
    }
    
    // Check vision requirement
    if (action.requiresVision && !selectionState.hasSelection) {
      setSelectionRequired(true)
      return
    }
    
    // FIX: Do NOT add user message here - main thread is the source of truth
    // Main thread will create the user message and send it back via ASSISTANT_MESSAGE
    // This prevents duplicate user bubbles (UI was adding optimistically, then main sent it again)
    
    // Clear previous scorecard when starting new action
    if (assistant.id === 'design_critique' && actionId === 'give-critique') {
      setScorecard(null)
      setScorecardError(null)
    }
    
    // Step 1: Create persistent animated status message for vision actions (Design Critique)
    // Use stable ID based on action so we can update it later
    const statusMessageId = `status_${assistant.id}_${actionId}_${Date.now()}`
    if (action.requiresVision) {
      const statusMessage: Message = {
        id: statusMessageId,
        role: 'assistant',
        content: 'Analyzing your design...',
        timestamp: Date.now(),
        isStatus: true, // Mark as status message so it can be updated in place
        statusStyle: 'loading' // Show animated loading indicator
      }
      setMessages(prev => [...prev, statusMessage])
      // Store status message ID for later update
      latestStatusMessageIdRef.current = statusMessageId
      console.log('[UI] Created animated status message:', statusMessageId)
    }
    
    // Step 2: Send quick action to main thread
    // Main thread will:
    // - Create user message and send it back (single source of truth)
    // - Process the action
    // - Send SCORECARD_PLACED event when scorecard placement completes
    console.log('[UI] setThinking true - handleQuickAction', { actionId, assistantId: assistant.id })
    setIsLoading(true) // Start loading indicator
    console.log('[UI] postMessage RUN_QUICK_ACTION', { actionId, assistantId: assistant.id })
    emit<RunQuickActionHandler>('RUN_QUICK_ACTION', actionId, assistant.id)
    setSelectionRequired(false)
  }, [assistant, selectionState, contentTable])
  
  const handleSendJson = useCallback(() => {
    if (!jsonInput.trim()) return
    
    emit<RunToolHandler>('RUN_TOOL', 'CREATE_FROM_TEMPLATE_JSON', { rawJson: jsonInput })
    setShowSendJsonModal(false)
    setJsonInput('')
  }, [jsonInput])
  
  const handleCopyJson = useCallback(async () => {
    try {
      // Try modern clipboard API first
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(jsonOutput)
        // Show success notification
        setShowCopySuccess(true)
        // Auto-hide after 2 seconds
        setTimeout(() => {
          setShowCopySuccess(false)
        }, 2000)
        return
      }
      
      // Fallback: Use execCommand for older browsers
      const textArea = document.createElement('textarea')
      textArea.value = jsonOutput
      textArea.style.position = 'fixed'
      textArea.style.left = '-999999px'
      textArea.style.top = '-999999px'
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()
      
      try {
        const successful = document.execCommand('copy')
        if (successful) {
          // Show success notification
          setShowCopySuccess(true)
          // Auto-hide after 2 seconds
          setTimeout(() => {
            setShowCopySuccess(false)
          }, 2000)
        } else {
          throw new Error('execCommand copy failed')
        }
      } finally {
        document.body.removeChild(textArea)
      }
    } catch (error) {
      // Clipboard API not available, show error message
      console.error('Failed to copy to clipboard:', error)
      // Try one more fallback: select the textarea content for manual copy
      const textarea = document.querySelector('textarea[readonly]') as HTMLTextAreaElement
      if (textarea) {
        textarea.select()
        textarea.setSelectionRange(0, jsonOutput.length)
        alert('Please use Ctrl+C (or Cmd+C on Mac) to copy the selected text.')
      } else {
        alert('Failed to copy to clipboard. Please select and copy the text manually.')
      }
    }
  }, [jsonOutput])
  
  // Handle Copy Ref Image
  const handleCopyRefImage = useCallback(() => {
    if (!contentTable || !contentTable.meta?.rootNodeId) {
      console.error('[UI] Copy Ref Image: No table or rootNodeId missing', { 
        hasTable: !!contentTable, 
        rootNodeId: contentTable?.meta?.rootNodeId 
      })
      setIsCopyingRefImage(false)
      emit<CopyTableStatusHandler>('COPY_TABLE_STATUS', 'error', 'No table available or root node not found.')
      return
    }
    
    console.log('[UI] Copy Ref Image: Request sent with rootNodeId:', contentTable.meta.rootNodeId)
    setIsCopyingRefImage(true)
    emit<ExportContentTableRefImageHandler>('EXPORT_CONTENT_TABLE_REF_IMAGE', contentTable.meta.rootNodeId)
  }, [contentTable])

  // Copy ref image to clipboard from base64 data URL
  const handleCopyRefImageToClipboard = useCallback(async (dataUrl: string) => {
    console.log('[UI] Copy Ref Image: Received READY, dataUrl length:', dataUrl.length)
    
    try {
      // Convert base64 data URL to Blob
      // Extract base64 string from data URL
      const base64Match = dataUrl.match(/^data:image\/png;base64,(.+)$/)
      if (!base64Match) {
        throw new Error('Invalid data URL format')
      }
      
      const base64String = base64Match[1]
      const binaryString = atob(base64String)
      const bytes = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i)
      }
      const blob = new Blob([bytes], { type: 'image/png' })
      
      console.log('[UI] Copy Ref Image: Blob created, size:', blob.size, 'bytes')
      
      // Primary attempt: ClipboardItem API
      if (typeof ClipboardItem !== 'undefined' && navigator.clipboard && navigator.clipboard.write) {
        try {
          await navigator.clipboard.write([
            new ClipboardItem({
              'image/png': blob
            })
          ])
          console.log('[UI] Copy Ref Image: Clipboard write succeeded')
          setIsCopyingRefImage(false)
          emit<CopyTableStatusHandler>('COPY_TABLE_STATUS', 'success', 'Reference image copied to clipboard')
          return
        } catch (clipboardError) {
          console.warn('[UI] Copy Ref Image: Primary clipboard write failed, trying fallback:', clipboardError)
          // Fall through to fallback
        }
      }
      
      // Fallback A: Create img element, draw to canvas, then toBlob
      try {
        const img = new Image()
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        
        if (!ctx) {
          throw new Error('Canvas context not available')
        }
        
        await new Promise<void>((resolve, reject) => {
          img.onload = () => {
            canvas.width = img.width
            canvas.height = img.height
            ctx.drawImage(img, 0, 0)
            resolve()
          }
          img.onerror = () => reject(new Error('Failed to load image'))
          img.src = dataUrl
        })
        
        const canvasBlob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob((blob) => {
            if (blob) {
              resolve(blob)
            } else {
              reject(new Error('Canvas toBlob failed'))
            }
          }, 'image/png')
        })
        
        if (typeof ClipboardItem !== 'undefined' && navigator.clipboard && navigator.clipboard.write) {
          await navigator.clipboard.write([
            new ClipboardItem({
              'image/png': canvasBlob
            })
          ])
          console.log('[UI] Copy Ref Image: Fallback A clipboard write succeeded')
          setIsCopyingRefImage(false)
          emit<CopyTableStatusHandler>('COPY_TABLE_STATUS', 'success', 'Reference image copied to clipboard')
          return
        }
      } catch (fallbackError) {
        console.warn('[UI] Copy Ref Image: Fallback A failed:', fallbackError)
        // Fall through to fallback B
      }
      
      // Fallback B: Trigger download and show error toast
      const rootNodeId = contentTable?.meta?.rootNodeId
      const filename = rootNodeId 
        ? `CT_RefImage_${rootNodeId.replace(/[:]/g, '-')}_600w.png`
        : 'CT_RefImage_600w.png'
      const link = document.createElement('a')
      link.href = dataUrl
      link.download = filename
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      const errorMsg = 'Clipboard write not permitted. Image downloaded instead.'
      console.error('[UI] Copy Ref Image: All clipboard attempts failed, triggered download')
      setIsCopyingRefImage(false)
      emit<CopyTableStatusHandler>('COPY_TABLE_STATUS', 'error', errorMsg)
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      console.error('[UI] Copy Ref Image: Failed to copy ref image to clipboard:', error)
      setIsCopyingRefImage(false)
      emit<CopyTableStatusHandler>('COPY_TABLE_STATUS', 'error', `Could not copy reference image: ${errorMessage}`)
    }
  }, [contentTable])
  
  // Copy Content Table to clipboard
  // copyFormatType: 'html' | 'tsv' | 'json' - determines what format to copy
  const handleCopyTable = useCallback(async (format: TableFormatPreset, copyFormatType: 'html' | 'tsv' | 'json' = 'html') => {
    console.log('[CopyTable] click')
    
    if (!contentTable) {
      console.error('[CopyTable] No contentTable available')
      setCopyStatus({ success: false, message: 'No table available to copy' })
      console.log('[UI] postMessage COPY_TABLE_STATUS (error - no table)')
      emit<CopyTableStatusHandler>('COPY_TABLE_STATUS', 'error', 'No table available to copy')
      return
    }
    
    setIsCopyingTable(true)
    setCopyStatus(null)
    
    console.log('[Clipboard] Copy Table clicked, format:', format, 'copyFormatType:', copyFormatType)
    console.log('[Clipboard] ClipboardItem available:', typeof ClipboardItem !== 'undefined')
    console.log('[Clipboard] navigator.clipboard available:', !!navigator.clipboard)
    console.log('[Clipboard] navigator.clipboard.write available:', !!(navigator.clipboard && navigator.clipboard.write))
    
    try {
      // Build formats based on copyFormatType using single source of truth renderers
      const { html: htmlTable, plainText } = universalTableToHtml(contentTable, format)
      const tsv = universalTableToTsv(contentTable, format)
      const json = universalTableToJson(contentTable)
      
      console.log('[Clipboard] HTML length:', htmlTable.length, 'TSV length:', tsv.length, 'JSON length:', json.length)
      
      // Instrumentation: Log lengths
      debugLog('Copy attempt started', { format, copyFormatType, htmlLength: htmlTable.length, tsvLength: tsv.length, jsonLength: json.length })
      // Store for debug panel
      setDebugHtml(htmlTable)
      setDebugTsv(tsv)
      
      // Strategy A: Primary - ClipboardItem API with both HTML and plain text MIME types
      // This is the preferred method for rich HTML table paste into Word, Notes, Confluence
      if (copyFormatType === 'html' && typeof ClipboardItem !== 'undefined' && navigator.clipboard && navigator.clipboard.write) {
        console.log('[CopyTable] attempting HTML')
        console.log('[Clipboard] Attempting Strategy A (ClipboardItem with HTML)')
        try {
          // Create Blobs with proper MIME types
          const htmlBlob = new Blob([htmlTable], { type: 'text/html' })
          const textBlob = new Blob([tsv], { type: 'text/plain' })
          
          console.log('[Clipboard] Created blobs - HTML size:', htmlBlob.size, 'Text size:', textBlob.size)
          
          // Create ClipboardItem with both MIME types
          // Note: Some browsers require Blobs to be wrapped in Promises
          // Note: ClipboardItem constructor may throw if MIME types are invalid
          const clipboardItem = new ClipboardItem({
            'text/html': Promise.resolve(htmlBlob),
            'text/plain': Promise.resolve(textBlob)
          })
          
          console.log('[Clipboard] Created ClipboardItem, writing to clipboard...')
          
          // Write to clipboard
          await navigator.clipboard.write([clipboardItem])
          
          console.log('[Clipboard] Strategy A succeeded!')
          
          // Success: Show notification
          debugLog('Strategy A (ClipboardItem) succeeded', { strategy: 'A', format: 'html' })
          setIsCopyingTable(false)
          setCopyStatus({ success: true, message: 'Table copied to clipboard (HTML)' })
          setShowCopySuccess(true)
          console.log('[UI] postMessage COPY_TABLE_STATUS (success)')
          emit<CopyTableStatusHandler>('COPY_TABLE_STATUS', 'success', 'Successfully copied table to clipboard')
          setTimeout(() => {
            setShowCopySuccess(false)
            setCopyStatus(null)
          }, 3000)
          return
        } catch (clipboardError: unknown) {
          // Log error details but continue to fallback
          const error = clipboardError as Error
          console.error('[Clipboard] Strategy A failed:', error.name, error.message)
          console.error('[Clipboard] Error stack:', error.stack)
          debugLog('Strategy A failed', {
            strategy: 'A',
            format: 'html',
            errorName: error.name,
            errorMessage: error.message,
            errorStack: error.stack
          })
          // Don't set error status yet - try fallbacks first
        }
      } else if (copyFormatType === 'tsv' && navigator.clipboard && navigator.clipboard.writeText) {
        // TSV format: Use writeText directly
        console.log('[Clipboard] Attempting TSV copy (writeText)')
        try {
          await navigator.clipboard.writeText(tsv)
          debugLog('TSV copy succeeded', { format: 'tsv' })
          setIsCopyingTable(false)
          setCopyStatus({ success: true, message: 'Table copied to clipboard (TSV)' })
          setShowCopySuccess(true)
          console.log('[UI] postMessage COPY_TABLE_STATUS (success)')
          emit<CopyTableStatusHandler>('COPY_TABLE_STATUS', 'success', 'Successfully copied table to clipboard')
          setTimeout(() => {
            setShowCopySuccess(false)
            setCopyStatus(null)
          }, 3000)
          return
        } catch (error: unknown) {
          const err = error as Error
          console.error('[Clipboard] TSV copy failed:', err.message)
          debugLog('TSV copy failed', { format: 'tsv', error: err.message })
        }
      } else if (copyFormatType === 'json' && navigator.clipboard && navigator.clipboard.writeText) {
        // JSON format: Use writeText directly
        console.log('[Clipboard] Attempting JSON copy (writeText)')
        try {
          await navigator.clipboard.writeText(json)
          debugLog('JSON copy succeeded', { format: 'json' })
          setIsCopyingTable(false)
          setCopyStatus({ success: true, message: 'Table copied to clipboard (JSON)' })
          setShowCopySuccess(true)
          console.log('[UI] postMessage COPY_TABLE_STATUS (success)')
          emit<CopyTableStatusHandler>('COPY_TABLE_STATUS', 'success', 'Successfully copied table to clipboard')
          setTimeout(() => {
            setShowCopySuccess(false)
            setCopyStatus(null)
          }, 3000)
          return
        } catch (error: unknown) {
          const err = error as Error
          console.error('[Clipboard] JSON copy failed:', err.message)
          debugLog('JSON copy failed', { format: 'json', error: err.message })
        }
      } else {
        console.log('[Clipboard] Strategy A not available - ClipboardItem:', typeof ClipboardItem, 'clipboard.write:', !!(navigator.clipboard && navigator.clipboard.write), 'copyFormatType:', copyFormatType)
      }
      
      // Strategy B: Fallback - execCommand with contentEditable div for HTML
      // This preserves HTML table structure when ClipboardItem API is unavailable
      if (copyFormatType === 'html') {
        console.log('[CopyTable] attempting HTML fallback')
        console.log('[Clipboard] Attempting Strategy B (execCommand with contentEditable)')
        try {
          // Create hidden contentEditable div (offscreen)
        const div = document.createElement('div')
        div.contentEditable = 'true'
        div.style.position = 'fixed'
        div.style.left = '-9999px'
        div.style.top = '0'
        div.style.width = '1px'
        div.style.height = '1px'
        div.style.opacity = '0'
        div.style.pointerEvents = 'none'
        div.style.zIndex = '-1'
        // Set innerHTML to the HTML table
        div.innerHTML = htmlTable
        
        document.body.appendChild(div)
        console.log('[Clipboard] Created and appended contentEditable div')
        
        // Small delay to ensure DOM is ready
        await new Promise(resolve => setTimeout(resolve, 10))
        
        // Select all contents via Range API
        const range = document.createRange()
        range.selectNodeContents(div)
        const selection = window.getSelection()
        if (selection) {
          selection.removeAllRanges()
          selection.addRange(range)
          console.log('[Clipboard] Selected div contents, range count:', selection.rangeCount)
        } else {
          console.warn('[Clipboard] window.getSelection() returned null')
        }
        
        // Focus the div
        div.focus()
        console.log('[Clipboard] Focused div, activeElement:', document.activeElement?.tagName)
        
        // Small delay before execCommand
        await new Promise(resolve => setTimeout(resolve, 10))
        
        // Execute copy command
        console.log('[Clipboard] Executing execCommand("copy")...')
        const successful = document.execCommand('copy')
        console.log('[Clipboard] execCommand("copy") returned:', successful)
        
        // Cleanup
        if (selection) {
          selection.removeAllRanges()
        }
        document.body.removeChild(div)
        
        if (successful) {
          console.log('[Clipboard] Strategy B succeeded!')
          debugLog('Strategy B (execCommand with contentEditable) succeeded', { strategy: 'B' })
          setIsCopyingTable(false)
          setCopyStatus({ success: true, message: 'Table copied to clipboard' })
          setShowCopySuccess(true)
          console.log('[UI] postMessage COPY_TABLE_STATUS (success)')
          emit<CopyTableStatusHandler>('COPY_TABLE_STATUS', 'success', 'Successfully copied table to clipboard')
          setTimeout(() => {
            setShowCopySuccess(false)
            setCopyStatus(null)
          }, 3000)
          return
        } else {
          throw new Error('execCommand copy returned false')
        }
      } catch (execError: unknown) {
        const error = execError as Error
        console.error('[Clipboard] Strategy B failed:', error.name, error.message)
        console.error('[Clipboard] Error stack:', error.stack)
        debugLog('Strategy B failed', {
          strategy: 'B',
          errorName: error.name,
          errorMessage: error.message,
          errorStack: error.stack
        })
        // Continue to next fallback
        }
      }
      
      // Strategy C: Use writeText with TSV/JSON (fallback - loses table structure but preserves data)
      if (navigator.clipboard && navigator.clipboard.writeText) {
        const textToCopy = copyFormatType === 'json' ? json : (copyFormatType === 'tsv' ? tsv : htmlTable)
        const formatLabel = copyFormatType === 'json' ? 'JSON' : (copyFormatType === 'tsv' ? 'TSV' : 'HTML')
        console.log(`[CopyTable] attempting ${formatLabel} fallback`)
        try {
          await navigator.clipboard.writeText(textToCopy)
          debugLog(`Strategy C (writeText ${formatLabel}) succeeded`, { strategy: 'C', format: copyFormatType })
          setIsCopyingTable(false)
          setCopyStatus({ success: true, message: `Table copied (${formatLabel} format)` })
          setShowCopySuccess(true)
          console.log('[UI] postMessage COPY_TABLE_STATUS (success)')
          emit<CopyTableStatusHandler>('COPY_TABLE_STATUS', 'success', 'Successfully copied table to clipboard')
          setTimeout(() => {
            setShowCopySuccess(false)
            setCopyStatus(null)
          }, 3000)
          return
        } catch (writeTextError: unknown) {
          const error = writeTextError as Error
          debugLog('Strategy C failed', {
            strategy: 'C',
            format: copyFormatType,
            errorName: error.name,
            errorMessage: error.message,
            errorStack: error.stack
          })
          // Continue to next fallback
        }
      }
      
      // Strategy D: execCommand with textarea (final fallback)
      const textToCopy = copyFormatType === 'json' ? json : (copyFormatType === 'tsv' ? tsv : htmlTable)
      const formatLabel = copyFormatType === 'json' ? 'JSON' : (copyFormatType === 'tsv' ? 'TSV' : 'HTML')
      console.log(`[CopyTable] final fallback (${formatLabel})`)
      try {
        const textArea = document.createElement('textarea')
        textArea.value = textToCopy
        textArea.style.position = 'fixed'
        textArea.style.left = '-9999px'
        textArea.style.top = '0'
        textArea.style.width = '1px'
        textArea.style.height = '1px'
        textArea.style.opacity = '0'
        textArea.style.pointerEvents = 'none'
        textArea.style.zIndex = '-1'
        document.body.appendChild(textArea)
        
        // Small delay
        await new Promise(resolve => setTimeout(resolve, 10))
        
        textArea.focus()
        textArea.select()
        
        // Small delay before execCommand
        await new Promise(resolve => setTimeout(resolve, 10))
        
        const successful = document.execCommand('copy')
        document.body.removeChild(textArea)
        
        if (successful) {
          debugLog(`Strategy D (execCommand textarea ${formatLabel}) succeeded`, { strategy: 'D', format: copyFormatType })
          setIsCopyingTable(false)
          setCopyStatus({ success: true, message: `Table copied (${formatLabel} format)` })
          setShowCopySuccess(true)
          console.log('[UI] postMessage COPY_TABLE_STATUS (success)')
          emit<CopyTableStatusHandler>('COPY_TABLE_STATUS', 'success', 'Successfully copied table to clipboard')
          setTimeout(() => {
            setShowCopySuccess(false)
            setCopyStatus(null)
          }, 3000)
          return
        } else {
          throw new Error('execCommand copy returned false')
        }
      } catch (execError: unknown) {
        const error = execError as Error
        debugLog('Strategy D failed', {
          strategy: 'D',
          format: copyFormatType,
          errorName: error.name,
          errorMessage: error.message,
          errorStack: error.stack
        })
      }
      
      // All strategies failed - show error toast
      debugLog('All clipboard strategies failed', { allStrategiesFailed: true })
      setIsCopyingTable(false)
      const errorMsg = 'Copy failed: All methods failed. Try Download HTML or Copy TSV buttons.'
      setCopyStatus({ 
        success: false, 
        message: errorMsg
      })
      console.log('[UI] postMessage COPY_TABLE_STATUS (error)')
      emit<CopyTableStatusHandler>('COPY_TABLE_STATUS', 'error', 'Failed to copy table. See console for details.')
    } catch (error: unknown) {
      const err = error as Error
      debugLog('Final error catch', {
        errorName: err.name,
        errorMessage: err.message,
        errorStack: err.stack
      })
      setIsCopyingTable(false)
      const errorMsg = `Copy failed: ${err.message || 'Unknown error'}`
      setCopyStatus({ 
        success: false, 
        message: errorMsg
      })
      console.log('[UI] postMessage COPY_TABLE_STATUS (error)')
      emit<CopyTableStatusHandler>('COPY_TABLE_STATUS', 'error', 'Failed to copy table. See console for details.')
      const errorMessage: Message = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        role: 'assistant',
        content: `Failed to copy table to clipboard: ${err.message || 'Unknown error'}`,
        timestamp: Date.now()
      }
      setMessages(prev => [...prev, errorMessage])
    }
  }, [contentTable, debugLog])
  
  // Handle Confluence modal success (add chat bubble)
  const handleConfluenceSuccess = useCallback(() => {
    const message: Message = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      role: 'assistant',
      content: 'Table sent to Confluence',
      timestamp: Date.now()
    }
    setMessages(prev => [...prev, message])
  }, [])
  
  // Download HTML file
  const handleDownloadHtml = useCallback((format: TableFormatPreset) => {
    if (!contentTable) return
    
    const { html: htmlTable } = universalTableToHtml(contentTable, format)
    const fullHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Content Table</title>
</head>
<body>
${htmlTable}
</body>
</html>`
    
    const blob = new Blob([fullHtml], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `content-table-${format}-${Date.now()}.html`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }, [contentTable])
  
  // Copy TSV only
  const handleCopyTsv = useCallback(async (format: TableFormatPreset) => {
    if (!contentTable) return
    
    if (window.focus) {
      window.focus()
    }
    
    try {
      const tsv = universalTableToTsv(contentTable, format)
      
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(tsv)
        setCopyStatus({ success: true, message: 'TSV copied to clipboard' })
        setShowCopySuccess(true)
        setTimeout(() => {
          setShowCopySuccess(false)
          setCopyStatus(null)
        }, 2000)
      } else {
        // Fallback to execCommand
        const textArea = document.createElement('textarea')
        textArea.value = tsv
        textArea.style.position = 'fixed'
        textArea.style.left = '-999999px'
        textArea.style.top = '-999999px'
        document.body.appendChild(textArea)
        textArea.focus()
        textArea.select()
        
        const successful = document.execCommand('copy')
        document.body.removeChild(textArea)
        
        if (successful) {
          setCopyStatus({ success: true, message: 'TSV copied to clipboard' })
          setShowCopySuccess(true)
          setTimeout(() => {
            setShowCopySuccess(false)
            setCopyStatus(null)
          }, 2000)
        } else {
          throw new Error('execCommand copy failed')
        }
      }
    } catch (error: unknown) {
      const err = error as Error
      setCopyStatus({ success: false, message: `TSV copy failed: ${err.message}` })
    }
  }, [contentTable])
  
  const handleCreditsToggle = useCallback(() => {
    setShowCredits(prev => !prev)
    if (creditsAutoCollapseTimer) {
      clearTimeout(creditsAutoCollapseTimer)
      setCreditsAutoCollapseTimer(null)
    }
  }, [creditsAutoCollapseTimer])
  
  const handleAboutClick = useCallback(() => {
    console.log('[TODO] About button clicked - implement About modal')
    // TODO: Open About modal
  }, [])
  
  const handleFeedbackClick = useCallback(() => {
    console.log('[TODO] Feedback button clicked - implement Feedback modal')
    // TODO: Open Feedback modal
  }, [])
  
  const handleJoinMeetupClick = useCallback(() => {
    console.log('[TODO] Join Meetup button clicked - implement Join Meetup modal')
    // TODO: Open Join Meetup modal
  }, [])
  
  // Get selection indicator icon
  const getSelectionIcon = () => {
    const iconSize = 16 // Match Assistant icon size
    if (!selectionState.hasSelection) {
      return <SelectionNoneIcon width={iconSize} height={iconSize} />
    }
    if (selectionRequired) {
      return <SelectionRequiredIcon width={iconSize} height={iconSize} />
    }
    return <SelectionHasIcon width={iconSize} height={iconSize} />
  }
  
  // Get assistant icon component
  const getAssistantIcon = (iconId?: string) => {
    if (!iconId) return null
    
    const iconMap: Record<string, h.JSX.Element> = {
      'ShieldCheckIcon': <ShieldCheckIcon width={16} height={16} />,
      'CodeIcon': <CodeIcon width={16} height={16} />,
      'ADAIcon': <ADAIcon width={16} height={16} />,
      'ArtIcon': <ArtIcon width={16} height={16} />,
      'CautionIcon': <CautionIcon width={16} height={16} />,
      'AskIcon': <AskIcon width={16} height={16} />,
      'ContentTableIcon': <ContentTableIcon width={16} height={16} />,
      'SpellCheckIcon': <SpellCheckIcon width={16} height={16} />,
      'LightBulbRaysIcon': <LightBulbRaysIcon width={16} height={16} />,
      'PathIcon': <PathIcon width={16} height={16} />
    }
    
    return iconMap[iconId] || null
  }
  
  // Get latest assistant message for quick actions
  const latestAssistantMessage = messages
    .filter(m => m.role === 'assistant')
    .pop()
  
  // Content Table: Add dynamic quick actions when table is generated
  const contentTableQuickActions: QuickAction[] = contentTable && assistant.id === 'content_table' ? [
    // Hide "Send to Confluence" in Content-MVP mode
    ...(mode !== 'content-mvp' ? [{
      id: 'send-to-confluence',
      label: 'Send to Confluence',
      templateMessage: 'Send table to Confluence',
      requiresSelection: false
    }] : []),
    {
      id: 'copy-table',
      label: 'Copy Table',
      templateMessage: 'Copy table to clipboard',
      requiresSelection: false
    },
    {
      id: 'view-table',
      label: 'View Table',
      templateMessage: 'View table in plugin',
      requiresSelection: false
    },
    {
      id: 'copy-ref-image',
      label: 'Get Ref Image',
      templateMessage: 'Get reference image',
      requiresSelection: false
    },
    {
      id: 'generate-new-table',
      label: 'Generate New Table',
      templateMessage: 'Generate a new content table',
      requiresSelection: true
    }
  ] : []
  
  // Code2Design: Show all quick actions prominently, not just after assistant message
  const isCode2Design = assistant.id === 'code2design'
  const quickActions = (contentTable && assistant.id === 'content_table' ? contentTableQuickActions : assistant.quickActions).filter((action: QuickAction) => {
    // Filter based on selection requirements
    if (action.requiresSelection && !selectionState.hasSelection) {
      return false
    }
    return true
  })

  
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      height: '100vh',
      width: '100%',
      backgroundColor: 'var(--bg)',
      color: 'var(--fg)',
      fontFamily: 'var(--font-family)',
      fontSize: 'var(--font-size-md)'
    }}>
      {/* Top Navigation */}
      <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 'var(--spacing-md)',
          borderBottom: '1px solid var(--border)',
          backgroundColor: 'var(--bg)',
          flexShrink: 0,
          position: 'relative',
          zIndex: 10
        }}>
        {/* Left: Home */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center',
          flex: '1 1 0',
          justifyContent: 'flex-start'
        }}>
          <button
            onClick={handleReset}
            style={{
              width: '24px',
              height: '24px',
              padding: '4px',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--bg)',
              color: 'var(--fg)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="Home / Reset"
          >
            <HomeIcon />
          </button>
        </div>
        
        {/* Center: Provider Buttons - Absolutely positioned to be centered between Home and Darkmode */}
        <div style={{
            position: 'absolute',
            left: 'calc(50% - 16px)',
            transform: 'translateX(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--spacing-xs)'
          }}>
          {/* OpenAI - Hidden in Content-MVP mode */}
          {mode !== 'content-mvp' && (
            <button
              onClick={() => handleProviderClick('openai')}
              style={{
                height: '24px',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--spacing-xs)',
                padding: '0 var(--spacing-sm)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--bg)',
                color: 'var(--fg)',
                cursor: 'pointer',
                fontSize: 'var(--font-size-xs)',
                fontFamily: 'var(--font-family)',
                whiteSpace: 'nowrap',
                transition: 'all 0.15s ease',
                outline: provider === 'openai' ? 'none' : 'none',
                boxShadow: provider === 'openai' ? '0 0 0 1px rgba(0, 0, 0, 0.1)' : 'none'
              }}
              onMouseEnter={(e) => {
                if (provider !== 'openai') {
                  e.currentTarget.style.borderColor = 'var(--border)'
                  e.currentTarget.style.backgroundColor = 'var(--bg-secondary)'
                }
              }}
              onMouseLeave={(e) => {
                if (provider !== 'openai') {
                  e.currentTarget.style.borderColor = 'var(--border)'
                  e.currentTarget.style.backgroundColor = 'var(--bg)'
                }
              }}
              onFocus={(e) => {
                e.currentTarget.style.outline = '2px solid var(--accent)'
                e.currentTarget.style.outlineOffset = '2px'
              }}
              onBlur={(e) => {
                e.currentTarget.style.outline = 'none'
              }}
              title="OpenAI"
            >
              <OpenAIIcon width={16} height={16} />
              <span>OpenAI</span>
            </button>
          )}
          
          {/* Claude - Hidden in Simple Mode */}
          {mode === 'advanced' && (
          <button
            disabled={true}
            onMouseEnter={(e) => {
              const button = e.currentTarget
              const normalContent = button.querySelector('[data-content="normal"]') as HTMLElement
              const hoverContent = button.querySelector('[data-content="hover"]') as HTMLElement
              if (normalContent) normalContent.style.display = 'none'
              if (hoverContent) hoverContent.style.display = 'flex'
            }}
            onMouseLeave={(e) => {
              const button = e.currentTarget
              const normalContent = button.querySelector('[data-content="normal"]') as HTMLElement
              const hoverContent = button.querySelector('[data-content="hover"]') as HTMLElement
              if (normalContent) normalContent.style.display = 'flex'
              if (hoverContent) hoverContent.style.display = 'none'
            }}
            style={{
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'var(--spacing-xs)',
              padding: '0 var(--spacing-sm)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--bg-secondary)',
              color: 'var(--fg-disabled)',
              cursor: 'not-allowed',
              fontSize: 'var(--font-size-xs)',
              fontFamily: 'var(--font-family)',
              whiteSpace: 'nowrap',
              minWidth: '80px',
              position: 'relative',
              opacity: 0.6
            }}
            title="Claude — Coming soon"
          >
            <div data-content="normal" style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', position: 'absolute' }}>
              <ClaudeIcon width={16} height={16} />
              <span>Claude</span>
            </div>
            <div data-content="hover" style={{ display: 'none', alignItems: 'center', position: 'absolute' }}>
              <span>Coming soon</span>
            </div>
          </button>
          )}
          
          {/* Copilot - Hidden in Simple Mode */}
          {mode === 'advanced' && (
          <button
            disabled={true}
            onMouseEnter={(e) => {
              const button = e.currentTarget
              const normalContent = button.querySelector('[data-content="normal"]') as HTMLElement
              const hoverContent = button.querySelector('[data-content="hover"]') as HTMLElement
              if (normalContent) normalContent.style.display = 'none'
              if (hoverContent) hoverContent.style.display = 'flex'
            }}
            onMouseLeave={(e) => {
              const button = e.currentTarget
              const normalContent = button.querySelector('[data-content="normal"]') as HTMLElement
              const hoverContent = button.querySelector('[data-content="hover"]') as HTMLElement
              if (normalContent) normalContent.style.display = 'flex'
              if (hoverContent) hoverContent.style.display = 'none'
            }}
            style={{
              height: '24px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'var(--spacing-xs)',
              padding: '0 var(--spacing-sm)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--bg-secondary)',
              color: 'var(--fg-disabled)',
              cursor: 'not-allowed',
              fontSize: 'var(--font-size-xs)',
              fontFamily: 'var(--font-family)',
              whiteSpace: 'nowrap',
              minWidth: '80px',
              position: 'relative',
              opacity: 0.6
            }}
            title="Copilot — Coming soon"
          >
            <div data-content="normal" style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', position: 'absolute' }}>
              <CopilotIcon width={16} height={16} />
              <span>Copilot</span>
            </div>
            <div data-content="hover" style={{ display: 'none', alignItems: 'center', position: 'absolute' }}>
              <span>Coming soon</span>
            </div>
          </button>
          )}
        </div>
        
        {/* Right: Mode Toggle */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 'var(--spacing-sm)', 
          justifyContent: 'flex-end',
          flex: '1 1 0'
        }}>
          <button
            onClick={handleThemeToggle}
            style={{
              width: '24px',
              height: '24px',
              padding: '4px',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--bg)',
              color: 'var(--fg)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title={theme === 'light' ? 'Switch to dark' : 'Switch to light'}
          >
            {theme === 'light' ? <DarkmodeIcon width={16} height={16} /> : <LightmodeIcon width={16} height={16} />}
          </button>
          
          <button
            onClick={() => setShowSettingsModal(true)}
            style={{
              width: '24px',
              height: '24px',
              padding: '4px',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--bg)',
              color: 'var(--fg)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="Settings"
          >
            <SettingsIcon width={16} height={16} />
          </button>
        </div>
      </div>
      
      {/* Chat Area */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--bg-secondary)',
        position: 'relative',
        minHeight: 0,
        overflow: 'hidden'
      }}>
        {/* Trash Button - Floating Overlay */}
        {messages.length > 0 && (
          <button
            onClick={() => setShowClearChatModal(true)}
            style={{
              position: 'absolute',
              top: 'var(--spacing-sm)',
              right: 'calc(var(--spacing-md) + 12px)',
              width: '24px',
              height: '24px',
              padding: '4px',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--bg)',
              color: 'var(--fg)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: 0.7,
              zIndex: 10,
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)'
            }}
            title="Clear chat"
          >
            <TrashIcon width={16} height={16} />
          </button>
        )}
        
        {/* Chat Messages - Scrollable Container */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: 'var(--spacing-md)',
          paddingTop: messages.length > 0 ? 'calc(var(--spacing-md) + 32px)' : 'var(--spacing-md)',
          display: 'flex',
          flexDirection: 'column',
          gap: 'var(--spacing-md)',
          minHeight: 0
        }}>
        {messages.length === 0 && !isCode2Design && (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            flex: 1,
            textAlign: 'center',
            color: 'var(--fg)',
            padding: 'var(--spacing-xl)',
            fontSize: 'var(--font-size-xl)',
            lineHeight: '1.5'
          }}>
            All Your Design Tools.
            <br />
            One Place.
          </div>
        )}
        
        {/* Code2Design Helper Message */}
        {isCode2Design && hasShownCode2DesignHelper && messages.length === 0 && (
          <div style={{
            padding: 'var(--spacing-md)',
            marginBottom: 'var(--spacing-sm)',
            backgroundColor: 'var(--bg-secondary)',
            borderRadius: 'var(--radius-md)',
            fontSize: 'var(--font-size-sm)',
            color: 'var(--fg-secondary)',
            border: '1px solid var(--border)'
          }}>
            Paste a FigmAI Template JSON to generate Figma elements, or select frames and click GET JSON.
          </div>
        )}
        
        {messages.map(message => {
          return (
            <div
              key={message.id}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--spacing-xs)',
                alignSelf: message.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '80%'
              }}
            >
              {message.role === 'assistant' ? (
                // Check if this is a status message with loading animation
                message.isStatus && message.statusStyle === 'loading' ? (
                  // Animated loading status message
                  <div style={{
                    padding: 'var(--spacing-sm) var(--spacing-md)',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: 'var(--bg)',
                    border: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--spacing-sm)',
                    fontSize: 'var(--font-size-sm)',
                    color: 'var(--muted)',
                    maxWidth: '100%'
                  }}>
                    <div className="spinner" />
                    <span>{message.content}</span>
                  </div>
                ) : (
                  // Regular assistant message (rich text rendering)
                  <div style={{
                    padding: 'var(--spacing-sm) var(--spacing-md)',
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: message.statusStyle === 'error' ? 'var(--error)' : 'var(--bg)',
                    border: '1px solid var(--border)',
                    color: message.statusStyle === 'error' ? 'var(--error-text)' : 'var(--fg)',
                    maxWidth: '100%',
                    userSelect: 'text',
                    WebkitUserSelect: 'text',
                    MozUserSelect: 'text',
                    msUserSelect: 'text',
                    cursor: 'text'
                  }}>
                    {(() => {
                      try {
                        // Clean content before rendering: remove internal metadata tags
                        const contentToRender = cleanChatContent(message.content)

                        // Always parse and render with RichTextRenderer for assistant messages
                        const ast = parseRichText(contentToRender)
                        const enhanced = enhanceRichText(ast)
                        return <RichTextRenderer nodes={enhanced} />
                      } catch (error) {
                        // Fallback to plain text if parsing fails
                        console.error('[UI] RichText parsing error:', error)
                        const cleanedFallback = cleanChatContent(message.content)
                        return (
                          <div style={{
                            fontSize: 'var(--font-size-sm)',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                            userSelect: 'text',
                            WebkitUserSelect: 'text',
                            MozUserSelect: 'text',
                            msUserSelect: 'text',
                            cursor: 'text'
                          }}>
                            {cleanedFallback}
                          </div>
                        )
                      }
                    })()}
                  </div>
                )
              ) : (
                // User message display (plain text)
                <div style={{
                  padding: 'var(--spacing-sm) var(--spacing-md)',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--accent)',
                  color: 'var(--accent-text)',
                  fontSize: 'var(--font-size-sm)',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  userSelect: 'text',
                  WebkitUserSelect: 'text',
                  MozUserSelect: 'text',
                  msUserSelect: 'text',
                  cursor: 'text'
                }}>
                  {message.content}
                </div>
              )}
              {message.role === 'tool' && (
                <div style={{
                  fontSize: 'var(--font-size-xs)',
                  color: 'var(--muted)'
                }}>
                  Tool result
                </div>
              )}
            </div>
          )
        })}
        
        {/* Scorecard View */}
        {scorecard && (
          <div style={{
            padding: 'var(--spacing-md)',
            backgroundColor: 'var(--bg)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-md)',
            maxWidth: '100%',
            marginBottom: 'var(--spacing-md)'
          }}>
            {/* Overall Score */}
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              marginBottom: 'var(--spacing-lg)',
              paddingBottom: 'var(--spacing-md)',
              borderBottom: '1px solid var(--border)'
            }}>
              <div style={{
                fontSize: '48px',
                fontWeight: 'var(--font-weight-bold)',
                color: scorecard.overallScore >= 80 ? 'var(--success)' : scorecard.overallScore >= 60 ? 'var(--warning)' : 'var(--error)',
                lineHeight: 1
              }}>
                {scorecard.overallScore}
              </div>
              <div style={{
                fontSize: 'var(--font-size-sm)',
                color: 'var(--muted)',
                marginTop: 'var(--spacing-xs)'
              }}>
                Overall Score
              </div>
              {scorecard.summary && (
                <div style={{
                  fontSize: 'var(--font-size-sm)',
                  color: 'var(--fg)',
                  textAlign: 'center',
                  marginTop: 'var(--spacing-sm)',
                  maxWidth: '400px'
                }}>
                  {scorecard.summary}
                </div>
              )}
            </div>
            
            {/* Items List */}
            {scorecard.items && scorecard.items.length > 0 && (
              <div style={{
                marginBottom: 'var(--spacing-md)'
              }}>
                <div style={{
                  fontSize: 'var(--font-size-md)',
                  fontWeight: 'var(--font-weight-semibold)',
                  marginBottom: 'var(--spacing-sm)',
                  color: 'var(--fg)'
                }}>
                  Evaluation Criteria
                </div>
                {scorecard.items.map((item, index) => (
                  <div
                    key={index}
                    style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: 'var(--spacing-sm)',
                      padding: 'var(--spacing-sm)',
                      marginBottom: 'var(--spacing-xs)',
                      backgroundColor: 'var(--bg-secondary)',
                      borderRadius: 'var(--radius-sm)'
                    }}
                  >
                    <div style={{
                      flex: 1,
                      fontSize: 'var(--font-size-sm)',
                      fontWeight: 'var(--font-weight-medium)',
                      color: 'var(--fg)'
                    }}>
                      {item.label}
                    </div>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 'var(--spacing-xs)',
                      marginRight: 'var(--spacing-sm)'
                    }}>
                      <div style={{
                        padding: '2px 8px',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: item.score >= 4 ? 'var(--success)' : item.score >= 3 ? 'var(--warning)' : 'var(--error)',
                        color: item.score >= 4 ? 'var(--success-text)' : item.score >= 3 ? 'var(--warning-text)' : 'var(--error-text)',
                        fontSize: 'var(--font-size-xs)',
                        fontWeight: 'var(--font-weight-semibold)'
                      }}>
                        {item.score}/{item.outOf}
                      </div>
                    </div>
                    {item.notes && (
                      <div style={{
                        flex: 2,
                        fontSize: 'var(--font-size-xs)',
                        color: 'var(--fg-secondary)',
                        fontStyle: 'italic'
                      }}>
                        {item.notes}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            
            {/* Risks Section (Collapsible) */}
            {scorecard.risks && scorecard.risks.length > 0 && (
              <details style={{
                marginBottom: 'var(--spacing-sm)'
              }}>
                <summary style={{
                  fontSize: 'var(--font-size-sm)',
                  fontWeight: 'var(--font-weight-semibold)',
                  color: 'var(--error)',
                  cursor: 'pointer',
                  padding: 'var(--spacing-xs)',
                  listStyle: 'none'
                }}>
                  ⚠️ Risks ({scorecard.risks.length})
                </summary>
                <div style={{
                  padding: 'var(--spacing-sm)',
                  marginTop: 'var(--spacing-xs)',
                  backgroundColor: 'var(--bg-secondary)',
                  borderRadius: 'var(--radius-sm)'
                }}>
                  {scorecard.risks.map((risk, index) => (
                    <div
                      key={index}
                      style={{
                        fontSize: 'var(--font-size-xs)',
                        color: 'var(--fg)',
                        marginBottom: 'var(--spacing-xs)',
                        paddingLeft: 'var(--spacing-sm)'
                      }}
                    >
                      • {risk}
                    </div>
                  ))}
                </div>
              </details>
            )}
            
            {/* Actions Section (Collapsible) */}
            {scorecard.actions && scorecard.actions.length > 0 && (
              <details style={{
                marginBottom: 'var(--spacing-sm)'
              }}>
                <summary style={{
                  fontSize: 'var(--font-size-sm)',
                  fontWeight: 'var(--font-weight-semibold)',
                  color: 'var(--accent)',
                  cursor: 'pointer',
                  padding: 'var(--spacing-xs)',
                  listStyle: 'none'
                }}>
                  ✓ Actions ({scorecard.actions.length})
                </summary>
                <div style={{
                  padding: 'var(--spacing-sm)',
                  marginTop: 'var(--spacing-xs)',
                  backgroundColor: 'var(--bg-secondary)',
                  borderRadius: 'var(--radius-sm)'
                }}>
                  {scorecard.actions.map((action, index) => (
                    <div
                      key={index}
                      style={{
                        fontSize: 'var(--font-size-xs)',
                        color: 'var(--fg)',
                        marginBottom: 'var(--spacing-xs)',
                        paddingLeft: 'var(--spacing-sm)'
                      }}
                    >
                      • {action}
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        )}
        
        {/* Scorecard Error */}
        {scorecardError && (
          <div style={{
            padding: 'var(--spacing-md)',
            backgroundColor: 'var(--error)',
            color: 'var(--error-text)',
            borderRadius: 'var(--radius-md)',
            marginBottom: 'var(--spacing-md)'
          }}>
            <div style={{
              fontSize: 'var(--font-size-sm)',
              fontWeight: 'var(--font-weight-semibold)',
              marginBottom: 'var(--spacing-xs)'
            }}>
              Scorecard Error
            </div>
            <div style={{
              fontSize: 'var(--font-size-xs)',
              marginBottom: 'var(--spacing-xs)'
            }}>
              {scorecardError.error}
            </div>
            {scorecardError.raw && (
              <details style={{
                marginTop: 'var(--spacing-sm)'
              }}>
                <summary style={{
                  fontSize: 'var(--font-size-xs)',
                  cursor: 'pointer',
                  opacity: 0.8
                }}>
                  Show raw response
                </summary>
                <pre style={{
                  fontSize: 'var(--font-size-xs)',
                  marginTop: 'var(--spacing-xs)',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  opacity: 0.9
                }}>
                  {scorecardError.raw}
                </pre>
              </details>
            )}
          </div>
        )}
        
        {/* Loading Indicator */}
        {isLoading && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--spacing-sm)',
            padding: 'var(--spacing-sm) var(--spacing-md)',
            alignSelf: 'flex-start',
            maxWidth: '80%'
          }}>
            <div style={{
              padding: 'var(--spacing-sm) var(--spacing-md)',
              borderRadius: 'var(--radius-md)',
              backgroundColor: 'var(--bg)',
              border: '1px solid var(--border)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--spacing-sm)',
              fontSize: 'var(--font-size-sm)',
              color: 'var(--muted)'
            }}>
              <div style={{
                width: '12px',
                height: '12px',
                border: '2px solid var(--muted)',
                borderTopColor: 'var(--accent)',
                borderRadius: '50%',
                animation: 'spin 0.8s linear infinite'
              }} />
              <span>Thinking...</span>
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
        </div>
      </div>
      
      {/* Input Area */}
      <div style={{
        borderTop: '1px solid var(--border)',
        padding: 'var(--spacing-md)',
        backgroundColor: 'var(--bg)',
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--spacing-sm)'
      }}>
        {/* Quick Actions - Above input */}
        {quickActions.length > 0 && (
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 'var(--spacing-xs)',
            marginBottom: 'var(--spacing-xs)'
          }}>
            {quickActions.map((action: QuickAction) => {
              const isDisabled = action.requiresSelection && !selectionState.hasSelection
              const isPrimary = (assistant.id === 'design_critique' && action.id === 'give-critique') || (assistant.id === 'content_table' && action.id === 'generate-table')
              
              return (
                <button
                  key={action.id}
                  onClick={() => handleQuickAction(action.id)}
                  disabled={isDisabled}
                  style={{
                    padding: isPrimary ? 'var(--spacing-sm) var(--spacing-md)' : 'var(--spacing-xs) var(--spacing-sm)',
                    border: isPrimary ? 'none' : '1px solid var(--border)',
                    borderRadius: isPrimary ? 'var(--radius-sm)' : 'var(--radius-full)',
                    backgroundColor: isDisabled 
                      ? 'var(--muted)' 
                      : isPrimary 
                        ? 'var(--accent)' 
                        : 'var(--bg-secondary)',
                    color: isDisabled 
                      ? 'var(--muted)' 
                      : isPrimary 
                        ? '#ffffff' 
                        : 'var(--fg)',
                    cursor: isDisabled ? 'not-allowed' : 'pointer',
                    fontSize: isPrimary ? 'var(--font-size-sm)' : 'var(--font-size-xs)',
                    fontFamily: 'var(--font-family)',
                    whiteSpace: 'nowrap',
                    fontWeight: isPrimary ? 'var(--font-weight-medium)' : 'var(--font-weight-normal)',
                    opacity: isDisabled ? 0.5 : 1
                  }}
                >
                  {action.label}
                </button>
              )
            })}
          </div>
        )}
        
        {/* Selection Error */}
        {selectionRequired && !selectionState.hasSelection && (
          <div style={{
            padding: 'var(--spacing-sm)',
            backgroundColor: 'var(--error)',
            color: 'var(--error-text)',
            borderRadius: 'var(--radius-sm)',
            fontSize: 'var(--font-size-xs)'
          }}>
            This action requires a selection. Please select one or more nodes.
          </div>
        )}
        
        {/* Text Input */}
        <TextboxMultiline
          ref={inputRef}
          value={input}
          onValueInput={setInput}
          onKeyDown={handleKeyDown}
          disabled={mode === 'content-mvp'}
          placeholder={mode === 'content-mvp' ? 'AI is not available in Content-MVP mode' : 'Ask me anything'}
          style={{
            width: '100%',
            minHeight: '60px',
            maxHeight: '120px',
            resize: 'none',
            fontFamily: 'var(--font-family)',
            fontSize: 'var(--font-size-md)',
            backgroundColor: mode === 'content-mvp' ? 'var(--bg-secondary)' : 'var(--bg)',
            color: mode === 'content-mvp' ? 'var(--fg-disabled)' : 'var(--fg)',
            borderColor: mode === 'content-mvp' ? 'var(--border-subtle)' : 'var(--border)',
            cursor: mode === 'content-mvp' ? 'not-allowed' : 'text'
          }}
        />
        
        {/* Bottom Controls */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--spacing-sm)'
        }}>
          {/* Selection Indicator */}
          <button
            onClick={handleSelectionIndicatorClick}
            style={{
              flex: 1,
              height: '36px',
              padding: 'var(--spacing-sm)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: selectionState.hasSelection 
                ? 'var(--success)' 
                : (selectionRequired 
                  ? 'var(--error)' 
                  : (showSelectionHint 
                    ? 'var(--hint-bg)' 
                    : 'var(--bg)')),
              color: selectionState.hasSelection ? 'var(--success-text)' : selectionRequired ? 'var(--error-text)' : 'var(--fg)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'flex-start',
              gap: 'var(--spacing-xs)',
              overflow: 'hidden',
              textAlign: 'left'
            }}
            title={
              selectionState.hasSelection && selectionState.names
                ? selectionState.names.join(', ')
                : selectionState.hasSelection
                ? `${selectionState.count} item(s) selected`
                : 'No selection'
            }
          >
            {getSelectionIcon()}
            {showSelectionHint && !selectionState.hasSelection && !selectionRequired ? (
              <span style={{
                fontSize: '10px',
                fontFamily: 'var(--font-family)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                flex: 1,
                minWidth: 0,
                textAlign: 'left'
              }}>
                Select element/s (frame, layer, etc.)
              </span>
            ) : selectionState.hasSelection && selectionState.names && selectionState.names.length > 0 ? (
              <span style={{
                fontSize: 'var(--font-size-sm)',
                fontFamily: 'var(--font-family)',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                flex: 1,
                minWidth: 0,
                textAlign: 'left'
              }}>
                {selectionState.names.length === 1 
                  ? selectionState.names[0]
                  : selectionState.names.length <= 3
                  ? selectionState.names.join(', ')
                  : `${selectionState.names.slice(0, 2).join(', ')} +${selectionState.names.length - 2} more`}
              </span>
            ) : null}
          </button>
          
          {/* Assistant Selector */}
          <button
            onClick={handleAssistantClick}
            style={{
              height: '36px',
              padding: 'var(--spacing-sm) var(--spacing-md)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--bg)',
              color: 'var(--fg)',
              cursor: 'pointer',
              fontSize: 'var(--font-size-sm)',
              fontFamily: 'var(--font-family)',
              whiteSpace: 'nowrap',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--spacing-xs)',
              flexShrink: 0
            }}
            title="Select assistant"
          >
            {getAssistantIcon(assistant.iconId)}
            {assistant.label}
            <ChevronDownIcon width={12} height={12} />
          </button>
          
          {/* Send Button */}
          <button
            type="button"
            onClick={handleSend}
            disabled={mode === 'content-mvp' || (selectionRequired && !selectionState.hasSelection)}
            style={{
              width: '36px',
              height: '36px',
              padding: '0',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: (mode === 'content-mvp' || (selectionRequired && !selectionState.hasSelection)) ? 'var(--muted)' : 'var(--accent)',
              cursor: (mode === 'content-mvp' || (selectionRequired && !selectionState.hasSelection)) ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
            title="Send message"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ color: '#ffffff' }}>
              <path d="M11.5264 4.41794C11.8209 4.17763 12.2557 4.19509 12.5303 4.4697L18.5303 10.4697C18.8232 10.7626 18.8232 11.2374 18.5303 11.5302C18.2374 11.8231 17.7626 11.8231 17.4697 11.5302L12.75 6.81052V19C12.75 19.4142 12.4142 19.75 12 19.75C11.5858 19.75 11.25 19.4142 11.25 19V6.81052L6.53027 11.5302C6.23738 11.8231 5.76262 11.8231 5.46973 11.5302C5.17684 11.2374 5.17685 10.7626 5.46973 10.4697L11.4697 4.4697L11.5264 4.41794Z" fill="#ffffff"/>
            </svg>
          </button>
        </div>
      </div>
      
      {/* Assistant Modal */}
      {showAssistantModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          padding: '16px',
          backgroundColor: 'var(--overlay-scrim)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          boxSizing: 'border-box'
        }} onClick={() => setShowAssistantModal(false)}>
          <div style={{
            backgroundColor: 'var(--surface-modal)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--spacing-lg)',
            maxWidth: '500px',
            width: '90%',
            height: 'calc(100% - 32px)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            gap: 'var(--spacing-md)',
            boxSizing: 'border-box',
            boxShadow: 'var(--shadow-elevation)'
          }} onClick={e => e.stopPropagation()}>
            <div style={{
              fontSize: 'var(--font-size-lg)',
              fontWeight: 'var(--font-weight-semibold)',
              flexShrink: 0
            }}>
              Select Assistant
            </div>
            {mode === 'content-mvp' && (
              <div style={{
                fontSize: 'var(--font-size-sm)',
                color: 'var(--fg-secondary)',
                padding: 'var(--spacing-sm)',
                backgroundColor: 'var(--surface-row)',
                borderRadius: 'var(--radius-sm)',
                flexShrink: 0
              }}>
                Please change to another mode to expose additional Assistants
              </div>
            )}
            <div style={{ 
              display: 'flex', 
              flexDirection: 'column', 
              gap: 'var(--spacing-sm)',
              overflowY: 'auto',
              overflowX: 'hidden',
              flex: 1,
              minHeight: 0
            }}>
            {listAssistantsByMode(mode).map((a: AssistantType) => (
              <button
                key={a.id}
                onClick={() => handleAssistantSelect(a.id)}
                onMouseEnter={(e) => {
                  if (assistant.id !== a.id) {
                    e.currentTarget.style.backgroundColor = 'var(--surface-row-hover)'
                  }
                  const button = e.currentTarget
                  const description = button.querySelector('[data-description]') as HTMLElement
                  if (description) description.style.display = 'block'
                }}
                onMouseLeave={(e) => {
                  if (assistant.id !== a.id) {
                    e.currentTarget.style.backgroundColor = 'var(--surface-row)'
                  }
                  const button = e.currentTarget
                  const description = button.querySelector('[data-description]') as HTMLElement
                  if (description) description.style.display = 'none'
                }}
                style={{
                  padding: 'var(--spacing-md)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: assistant.id === a.id 
                    ? 'var(--surface-row-selected)' 
                    : 'var(--surface-row)',
                  color: assistant.id === a.id ? 'var(--accent-text)' : 'var(--fg)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontFamily: 'var(--font-family)',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 'var(--spacing-sm)',
                  position: 'relative',
                  transition: 'background-color 0.2s ease, border-color 0.2s ease'
                }}
              >
                <div style={{
                  flexShrink: 0,
                  display: 'flex',
                  alignItems: 'center',
                  marginTop: '2px'
                }}>
                  {getAssistantIcon(a.iconId)}
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
                  <div style={{
                    fontWeight: 'var(--font-weight-semibold)'
                  }}>
                    {a.label}
                  </div>
                  <div 
                    data-description
                    style={{
                      fontSize: 'var(--font-size-xs)',
                      opacity: assistant.id === a.id ? 0.9 : 0.7,
                      display: 'none',
                      lineHeight: 1.4
                    }}
                  >
                    {a.intro}
                  </div>
                </div>
              </button>
            ))}
            </div>
          </div>
        </div>
      )}
      
      {/* Clear Chat Confirmation Modal */}
      {showClearChatModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'var(--overlay-scrim)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }} onClick={() => setShowClearChatModal(false)}>
          <div style={{
            backgroundColor: 'var(--surface-modal)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--spacing-lg)',
            maxWidth: '400px',
            width: '90%',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--spacing-md)',
            boxShadow: 'var(--shadow-elevation)'
          }} onClick={e => e.stopPropagation()}>
            <div style={{
              fontSize: 'var(--font-size-lg)',
              fontWeight: 'var(--font-weight-semibold)',
              marginBottom: 'var(--spacing-sm)'
            }}>
              Clear chat?
            </div>
            <div style={{
              fontSize: 'var(--font-size-sm)',
              color: 'var(--fg-secondary)',
              lineHeight: 1.5
            }}>
              This removes all messages from this chat session.
            </div>
            <div style={{
              display: 'flex',
              gap: 'var(--spacing-sm)',
              justifyContent: 'flex-end',
              marginTop: 'var(--spacing-sm)'
            }}>
              <button
                onClick={() => setShowClearChatModal(false)}
                style={{
                  padding: 'var(--spacing-sm) var(--spacing-md)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--fg)',
                  cursor: 'pointer',
                  fontSize: 'var(--font-size-sm)',
                  fontFamily: 'var(--font-family)'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleClearChat}
                style={{
                  padding: 'var(--spacing-sm) var(--spacing-md)',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--error)',
                  color: 'var(--error-text)',
                  cursor: 'pointer',
                  fontSize: 'var(--font-size-sm)',
                  fontFamily: 'var(--font-family)',
                  fontWeight: 'var(--font-weight-medium)'
                }}
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Settings Modal */}
      {showSettingsModal && (
        <SettingsModal 
          onClose={() => setShowSettingsModal(false)}
          currentMode={mode}
          onModeChange={handleModeSelect}
        />
      )}
      
      {/* Confluence Modal */}
      {showConfluenceModal && contentTable && (
        <ConfluenceModal
          contentTable={contentTable}
          format={confluenceFormat}
          onClose={() => setShowConfluenceModal(false)}
          onSuccess={handleConfluenceSuccess}
        />
      )}
      
      {/* Format Selection Modal for Content Table */}
      {showFormatModal && contentTable && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'var(--overlay-scrim)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }} onClick={() => setShowFormatModal(false)}>
          <div style={{
            backgroundColor: 'var(--surface-modal)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--spacing-lg)',
            maxWidth: '400px',
            width: '90%',
            maxHeight: '90vh',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--spacing-md)',
            boxShadow: 'var(--shadow-elevation)'
          }} onClick={e => e.stopPropagation()}>
            <div style={{
              fontSize: 'var(--font-size-lg)',
              fontWeight: 'var(--font-weight-semibold)',
              marginBottom: 'var(--spacing-sm)'
            }}>
              What table format do you want?
            </div>
            
            {PRESET_INFO.map(preset => {
              const format = preset.id
              const isEnabled = preset.enabled
              
              return (
                <button
                  key={format}
                  onClick={() => {
                    if (isEnabled) {
                      setSelectedFormat(format)
                      setShowFormatModal(false)
                      
                      // Execute the pending action
                      const action = pendingAction
                      setPendingAction(null) // Clear immediately to prevent double execution
                      
                      if (action === 'copy') {
                        handleCopyTable(format, 'html') // Default to HTML for format modal
                      } else if (action === 'view') {
                        setShowTableView(true)
                        setSelectedFormat(format)
                      } else if (action === 'confluence') {
                        // Show Confluence modal with selected format
                        setConfluenceFormat(format)
                        setShowConfluenceModal(true)
                      }
                    }
                  }}
                  disabled={!isEnabled}
                  style={{
                    padding: 'var(--spacing-sm) var(--spacing-md)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: isEnabled ? 'var(--bg-secondary)' : 'var(--bg)',
                    color: isEnabled ? 'var(--fg)' : 'var(--muted)',
                    cursor: isEnabled ? 'pointer' : 'not-allowed',
                    textAlign: 'left',
                    fontSize: 'var(--font-size-sm)',
                    opacity: isEnabled ? 1 : 0.6
                  }}
                  title={preset.description}
                >
                  {preset.label}
                  {!isEnabled && <span style={{ marginLeft: 'var(--spacing-xs)', fontSize: 'var(--font-size-xs)', fontStyle: 'italic' }}>(Not implemented yet)</span>}
                </button>
              )
            })}
            
            <button
              onClick={() => setShowFormatModal(false)}
              style={{
                padding: 'var(--spacing-sm) var(--spacing-md)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--bg-secondary)',
                color: 'var(--fg)',
                cursor: 'pointer',
                marginTop: 'var(--spacing-sm)'
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      
      {/* Copy Format Modal - "Copy as" chooser */}
      {showCopyFormatModal && contentTable && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'var(--overlay-scrim)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }} onClick={() => setShowCopyFormatModal(false)}>
          <div style={{
            backgroundColor: 'var(--surface-modal)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--spacing-lg)',
            maxWidth: '400px',
            width: '90%',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--spacing-md)',
            boxShadow: 'var(--shadow-elevation)'
          }} onClick={e => e.stopPropagation()}>
            <div style={{
              fontSize: 'var(--font-size-lg)',
              fontWeight: 'var(--font-weight-semibold)',
              marginBottom: 'var(--spacing-sm)'
            }}>
              Copy as
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
              <button
                onClick={async () => {
                  setShowCopyFormatModal(false)
                  // Show format modal first to select table preset
                  setPendingAction('copy')
                  setShowFormatModal(true)
                }}
                style={{
                  padding: 'var(--spacing-sm) var(--spacing-md)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--fg)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: 'var(--font-size-sm)'
                }}
              >
                HTML Table (for Word, Notes, Confluence)
              </button>
              
              <button
                onClick={async () => {
                  setShowCopyFormatModal(false)
                  // Show format modal first to select table preset, then copy as TSV
                  // We'll store the copyFormatType in a ref or state, but for now use a simple approach:
                  // Show format modal, and when format is selected, copy as TSV
                  // For simplicity, copy with universal-v2 format as TSV directly
                  await handleCopyTable('universal', 'tsv')
                }}
                style={{
                  padding: 'var(--spacing-sm) var(--spacing-md)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--fg)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: 'var(--font-size-sm)'
                }}
              >
                TSV (Tab-separated, for spreadsheets)
              </button>
              
              <button
                onClick={async () => {
                  setShowCopyFormatModal(false)
                  // Copy JSON directly (no format preset needed)
                  await handleCopyTable('universal', 'json')
                }}
                style={{
                  padding: 'var(--spacing-sm) var(--spacing-md)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--fg)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontSize: 'var(--font-size-sm)'
                }}
              >
                JSON (Raw data)
              </button>
            </div>
            
            <button
              onClick={() => setShowCopyFormatModal(false)}
              style={{
                padding: 'var(--spacing-sm) var(--spacing-md)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                backgroundColor: 'var(--bg-secondary)',
                color: 'var(--fg)',
                cursor: 'pointer',
                marginTop: 'var(--spacing-sm)'
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      
      {/* Table View Modal */}
      {showTableView && contentTable && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'var(--overlay-scrim)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }} onClick={() => setShowTableView(false)}>
          <div style={{
            backgroundColor: 'var(--surface-modal)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--spacing-lg)',
            maxWidth: '90%',
            maxHeight: '90vh',
            width: '800px',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--spacing-md)',
            overflow: 'hidden',
            boxShadow: 'var(--shadow-elevation)'
          }} onClick={e => e.stopPropagation()}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 'var(--spacing-sm)'
            }}>
              <div style={{
                fontSize: 'var(--font-size-lg)',
                fontWeight: 'var(--font-weight-semibold)'
              }}>
                Content Table
              </div>
              <button
                onClick={() => setShowTableView(false)}
                style={{
                  padding: 'var(--spacing-xs)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--fg)',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
            
            <div style={{
              flex: 1,
              overflowY: 'auto',
              border: '1px solid #e0e0e0',
              borderRadius: 'var(--radius-sm)',
              padding: 'var(--spacing-sm)',
              backgroundColor: '#ffffff',
              userSelect: 'text',
              WebkitUserSelect: 'text',
              MozUserSelect: 'text',
              msUserSelect: 'text',
              cursor: 'text',
              pointerEvents: 'auto'
            }}>
              <div 
                style={{
                  userSelect: 'text',
                  WebkitUserSelect: 'text',
                  MozUserSelect: 'text',
                  msUserSelect: 'text',
                  cursor: 'text',
                  pointerEvents: 'auto',
                  backgroundColor: '#ffffff',
                  color: '#000000'
                }}
                dangerouslySetInnerHTML={{ __html: toHtmlTable(contentTable, selectedFormat, { forView: true }) }} 
              />
            </div>
            
            <div style={{
              display: 'flex',
              gap: 'var(--spacing-sm)',
              justifyContent: 'flex-end'
            }}>
              <div style={{ display: 'flex', gap: 'var(--spacing-xs)', flexWrap: 'wrap' }}>
                <button
                  onClick={() => {
                    handleCopyTable(selectedFormat, 'html') // Default to HTML in view modal
                  }}
                  disabled={isCopyingTable}
                  style={{
                    padding: 'var(--spacing-sm) var(--spacing-md)',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: isCopyingTable ? 'var(--muted)' : 'var(--accent)',
                    color: isCopyingTable ? 'var(--fg)' : 'var(--accent-text)',
                    cursor: isCopyingTable ? 'not-allowed' : 'pointer',
                    fontSize: 'var(--font-size-sm)',
                    fontWeight: 'var(--font-weight-medium)',
                    opacity: isCopyingTable ? 0.6 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--spacing-xs)'
                  }}
                >
                  {isCopyingTable && (
                    <div style={{
                      width: '12px',
                      height: '12px',
                      border: '2px solid #ffffff',
                      borderTopColor: 'transparent',
                      borderRadius: '50%',
                      animation: 'spin 0.8s linear infinite'
                    }} />
                  )}
                  {isCopyingTable ? 'Copying...' : 'Copy Table'}
                </button>
                <button
                  onClick={handleCopyRefImage}
                  disabled={isCopyingRefImage || !contentTable}
                  style={{
                    padding: 'var(--spacing-sm) var(--spacing-md)',
                    border: 'none',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: (isCopyingRefImage || !contentTable) ? 'var(--muted)' : 'var(--accent)',
                    color: (isCopyingRefImage || !contentTable) ? 'var(--fg)' : 'var(--accent-text)',
                    cursor: (isCopyingRefImage || !contentTable) ? 'not-allowed' : 'pointer',
                    fontSize: 'var(--font-size-sm)',
                    fontWeight: 'var(--font-weight-medium)',
                    opacity: (isCopyingRefImage || !contentTable) ? 0.6 : 1,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--spacing-xs)'
                  }}
                >
                  {isCopyingRefImage && (
                    <div style={{
                      width: '12px',
                      height: '12px',
                      border: '2px solid #ffffff',
                      borderTopColor: 'transparent',
                      borderRadius: '50%',
                      animation: 'spin 0.8s linear infinite'
                    }} />
                  )}
                  {isCopyingRefImage ? 'Getting...' : 'Get Ref Image'}
                </button>
                {CONFIG.dev.enableClipboardDebugLogging && (
                  <div style={{ display: 'flex', gap: 'var(--spacing-xs)', flexWrap: 'wrap' }}>
                    <button
                      onClick={() => setShowPasteDebug(true)}
                      style={{
                        padding: 'var(--spacing-sm) var(--spacing-md)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: 'var(--bg-secondary)',
                        color: 'var(--fg)',
                        cursor: 'pointer',
                        fontSize: 'var(--font-size-xs)'
                      }}
                    >
                      Debug
                    </button>
                    <button
                      onClick={() => handleDownloadHtml(selectedFormat)}
                      style={{
                        padding: 'var(--spacing-sm) var(--spacing-md)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: 'var(--bg-secondary)',
                        color: 'var(--fg)',
                        cursor: 'pointer',
                        fontSize: 'var(--font-size-xs)'
                      }}
                    >
                      Download HTML
                    </button>
                    <button
                      onClick={() => handleCopyTsv(selectedFormat)}
                      style={{
                        padding: 'var(--spacing-sm) var(--spacing-md)',
                        border: '1px solid var(--border)',
                        borderRadius: 'var(--radius-sm)',
                        backgroundColor: 'var(--bg-secondary)',
                        color: 'var(--fg)',
                        cursor: 'pointer',
                        fontSize: 'var(--font-size-xs)'
                      }}
                    >
                      Copy TSV
                    </button>
                  </div>
                )}
              </div>
              {copyStatus && (
                <div style={{
                  padding: 'var(--spacing-sm)',
                  backgroundColor: copyStatus.success ? 'var(--success)' : 'var(--error)',
                  color: copyStatus.success ? 'var(--success-text)' : 'var(--error-text)',
                  borderRadius: 'var(--radius-sm)',
                  fontSize: 'var(--font-size-xs)',
                  marginTop: 'var(--spacing-xs)'
                }}>
                  {copyStatus.success ? '✓ ' : '✗ '}
                  {copyStatus.message}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      
      {/* SEND JSON Modal */}
      {showSendJsonModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'var(--overlay-scrim)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }} onClick={() => setShowSendJsonModal(false)}>
          <div style={{
            backgroundColor: 'var(--surface-modal)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--spacing-lg)',
            maxWidth: '500px',
            width: '90%',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            boxShadow: 'var(--shadow-elevation)'
          }} onClick={e => e.stopPropagation()}>
            {/* Header with title and Demo button */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 'var(--spacing-md)',
              flexShrink: 0
            }}>
              <div style={{
                fontSize: 'var(--font-size-lg)',
                fontWeight: 'var(--font-weight-semibold)'
              }}>
                SEND JSON
              </div>
              <button
                onClick={() => {
                  const demoJson = `{
  "schemaVersion": "1.0",
  "meta": { "name": "Simple Card" },
  "root": {
    "type": "FRAME",
    "name": "Card",
    "layout": {
      "mode": "AUTO_LAYOUT",
      "direction": "VERTICAL",
      "padding": { "top": 16, "right": 16, "bottom": 16, "left": 16 },
      "gap": 12,
      "sizing": { "width": 320, "height": "HUG" }
    },
    "style": {
      "fills": [{ "type": "SOLID", "color": { "hex": "#FFFFFF" } }],
      "strokes": [{ "type": "SOLID", "color": { "hex": "#E5E7EB" }, "weight": 1 }],
      "radius": 16
    },
    "children": [
      { "type": "TEXT", "name": "Title", "text": { "value": "Account Balance", "fontSize": 16 } },
      { "type": "TEXT", "name": "Value", "text": { "value": "$12,430", "fontSize": 28 } },
      { "type": "RECTANGLE", "name": "Divider", "style": { "fills": [{ "type": "SOLID", "color": { "hex": "#E5E7EB" } }] } }
    ]
  }
}`
                  setJsonInput(demoJson)
                }}
                style={{
                  padding: 'var(--spacing-xs) var(--spacing-sm)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--fg)',
                  cursor: 'pointer',
                  fontSize: 'var(--font-size-xs)',
                  fontFamily: 'var(--font-family)',
                  fontWeight: 'var(--font-weight-medium)'
                }}
              >
                Demo
              </button>
            </div>
            
            {/* Scrollable content area */}
            <div style={{
              flex: 1,
              minHeight: 0,
              overflowY: 'auto',
              marginBottom: 'var(--spacing-md)'
            }}>
              {/* Format Requirements Helper */}
              <div style={{
                padding: 'var(--spacing-md)',
                backgroundColor: 'var(--bg-secondary)',
                borderRadius: 'var(--radius-sm)',
                marginBottom: 'var(--spacing-md)',
                fontSize: 'var(--font-size-xs)',
                color: 'var(--fg-secondary)',
                border: '1px solid var(--border)'
              }}>
              <div style={{
                fontWeight: 'var(--font-weight-medium)',
                marginBottom: 'var(--spacing-xs)',
                color: 'var(--fg)'
              }}>
                Format Requirements
              </div>
              <div style={{ marginBottom: 'var(--spacing-sm)' }}>
                <strong>Required keys:</strong> schemaVersion, root
              </div>
              <div style={{ marginBottom: 'var(--spacing-sm)' }}>
                <strong>Supported node types (v1):</strong> FRAME, TEXT, RECTANGLE
              </div>
              <div style={{ marginBottom: 'var(--spacing-sm)' }}>
                <strong>Safety limits:</strong> Max depth 12, max nodes 300. Invalid JSON won't modify the canvas.
              </div>
              <div style={{
                marginTop: 'var(--spacing-sm)',
                padding: 'var(--spacing-sm)',
                backgroundColor: 'var(--bg)',
                borderRadius: 'var(--radius-sm)',
                fontFamily: 'monospace',
                fontSize: '10px',
                overflowX: 'auto',
                whiteSpace: 'pre',
                maxHeight: '100px',
                overflowY: 'auto'
              }}>
{`{
  "schemaVersion": "1.0",
  "meta": { "name": "Simple Card" },
  "root": {
    "type": "FRAME",
    "name": "Card",
    "layout": {
      "mode": "AUTO_LAYOUT",
      "direction": "VERTICAL",
      "padding": { "top": 16, "right": 16, "bottom": 16, "left": 16 },
      "gap": 12,
      "sizing": { "width": 320, "height": "HUG" }
    },
    "style": {
      "fills": [{ "type": "SOLID", "color": { "hex": "#FFFFFF" } }],
      "strokes": [{ "type": "SOLID", "color": { "hex": "#E5E7EB" }, "weight": 1 }],
      "radius": 16
    },
    "children": [
      { "type": "TEXT", "name": "Title", "text": { "value": "Account Balance", "fontSize": 16 } },
      { "type": "TEXT", "name": "Value", "text": { "value": "$12,430", "fontSize": 28 } },
      { "type": "RECTANGLE", "name": "Divider", "style": { "fills": [{ "type": "SOLID", "color": { "hex": "#E5E7EB" } }] } }
    ]
  }
}`}
              </div>
            </div>
              
              {/* JSON Input */}
              <div style={{
                display: 'flex',
                flexDirection: 'column'
              }}>
                <TextboxMultiline
                  value={jsonInput}
                  onValueInput={setJsonInput}
                  placeholder="Paste your FigmAI Template JSON here..."
                  style={{
                    height: '200px',
                    maxHeight: '200px',
                    fontFamily: 'monospace',
                    fontSize: 'var(--font-size-xs)',
                    resize: 'none'
                  }}
                />
              </div>
            </div>
            
            {/* Buttons - Always visible at bottom */}
            <div style={{
              display: 'flex',
              gap: 'var(--spacing-sm)',
              justifyContent: 'flex-end',
              flexShrink: 0,
              paddingTop: 'var(--spacing-sm)',
              borderTop: '1px solid var(--border)'
            }}>
              <button
                onClick={() => {
                  setShowSendJsonModal(false)
                  setJsonInput('')
                }}
                style={{
                  padding: 'var(--spacing-sm) var(--spacing-md)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--fg)',
                  cursor: 'pointer',
                  fontSize: 'var(--font-size-sm)',
                  fontFamily: 'var(--font-family)'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleSendJson}
                disabled={!jsonInput.trim()}
                style={{
                  padding: 'var(--spacing-sm) var(--spacing-md)',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: jsonInput.trim() ? 'var(--accent)' : 'var(--bg-secondary)',
                  color: jsonInput.trim() ? '#ffffff' : 'var(--muted)',
                  cursor: jsonInput.trim() ? 'pointer' : 'not-allowed',
                  fontSize: 'var(--font-size-sm)',
                  fontFamily: 'var(--font-family)',
                  fontWeight: 'var(--font-weight-medium)'
                }}
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* GET JSON Modal */}
      {showGetJsonModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'var(--overlay-scrim)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }} onClick={() => setShowGetJsonModal(false)}>
          <div style={{
            backgroundColor: 'var(--surface-modal)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--spacing-lg)',
            maxWidth: '500px',
            width: '90%',
            maxHeight: '80vh',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: 'var(--shadow-elevation)'
          }} onClick={e => e.stopPropagation()}>
            <div style={{
              fontSize: 'var(--font-size-lg)',
              fontWeight: 'var(--font-weight-semibold)',
              marginBottom: 'var(--spacing-sm)'
            }}>
              GET JSON
            </div>
            <div style={{
              fontSize: 'var(--font-size-xs)',
              color: 'var(--fg-secondary)',
              marginBottom: 'var(--spacing-md)'
            }}>
              This JSON can be archived and re-imported using SEND JSON.
            </div>
            
            {/* JSON Output */}
            <textarea
              value={jsonOutput}
              readOnly
              disabled
              style={{
                flex: 1,
                minHeight: '300px',
                maxHeight: '400px',
                fontFamily: 'monospace',
                fontSize: 'var(--font-size-xs)',
                marginBottom: 'var(--spacing-md)',
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                padding: 'var(--spacing-sm)',
                color: 'var(--fg)',
                resize: 'vertical'
              }}
            />
            
            {/* Buttons */}
            <div style={{
              display: 'flex',
              gap: 'var(--spacing-sm)',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={handleCopyJson}
                style={{
                  padding: 'var(--spacing-sm) var(--spacing-md)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--bg)',
                  color: 'var(--fg)',
                  cursor: 'pointer',
                  fontSize: 'var(--font-size-sm)',
                  fontFamily: 'var(--font-family)'
                }}
              >
                Copy to Clipboard
              </button>
              <button
                onClick={() => setShowGetJsonModal(false)}
                style={{
                  padding: 'var(--spacing-sm) var(--spacing-md)',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--accent)',
                  color: '#ffffff',
                  cursor: 'pointer',
                  fontSize: 'var(--font-size-sm)',
                  fontFamily: 'var(--font-family)',
                  fontWeight: 'var(--font-weight-medium)'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Copy Table Toast Notification */}
      {copyStatus && (
        <div style={{
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: copyStatus.success ? 'var(--success)' : 'var(--error)',
          color: '#ffffff',
          padding: 'var(--spacing-md) var(--spacing-lg)',
          borderRadius: 'var(--radius-md)',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          zIndex: 2000,
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--spacing-sm)',
          fontSize: 'var(--font-size-sm)',
          fontFamily: 'var(--font-family)',
          fontWeight: 'var(--font-weight-medium)',
          animation: 'slideDown 0.3s ease-out',
          maxWidth: '90%',
          wordWrap: 'break-word'
        }}>
          {copyStatus.success ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" fill="currentColor"/>
            </svg>
          ) : (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" fill="currentColor"/>
            </svg>
          )}
          <span>{copyStatus.message}</span>
        </div>
      )}
      
      {/* Legacy Copy Success Notification (for other copy actions) */}
      {showCopySuccess && !copyStatus && (
        <div style={{
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: 'var(--success)',
          color: '#ffffff',
          padding: 'var(--spacing-md) var(--spacing-lg)',
          borderRadius: 'var(--radius-md)',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          zIndex: 2000,
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--spacing-sm)',
          fontSize: 'var(--font-size-sm)',
          fontFamily: 'var(--font-family)',
          fontWeight: 'var(--font-weight-medium)',
          animation: 'slideDown 0.3s ease-out'
        }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" fill="currentColor"/>
          </svg>
          Copied to clipboard!
        </div>
      )}
      
      {/* Empty Input Warning Notification */}
      {showEmptyInputWarning && (
        <div 
          role="alert"
          aria-live="polite"
          style={{
            position: 'fixed',
            top: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            backgroundColor: 'var(--warning)',
            color: '#ffffff',
            padding: 'var(--spacing-md) var(--spacing-lg)',
            borderRadius: 'var(--radius-md)',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            zIndex: 2000,
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--spacing-sm)',
            fontSize: 'var(--font-size-sm)',
            fontFamily: 'var(--font-family)',
            fontWeight: 'var(--font-weight-medium)',
            animation: 'slideDown 0.3s ease-out'
          }}
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" fill="currentColor"/>
          </svg>
          Enter a message before sending.
        </div>
      )}
      
      {/* Paste Debug Panel */}
      {showPasteDebug && CONFIG.dev.enableClipboardDebugLogging && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'var(--overlay-scrim)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000
        }} onClick={() => setShowPasteDebug(false)}>
          <div style={{
            backgroundColor: 'var(--bg)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--spacing-lg)',
            maxWidth: '90%',
            maxHeight: '90vh',
            width: '900px',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--spacing-md)',
            overflow: 'hidden'
          }} onClick={e => e.stopPropagation()}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: 'var(--spacing-sm)'
            }}>
              <div style={{
                fontSize: 'var(--font-size-lg)',
                fontWeight: 'var(--font-weight-semibold)'
              }}>
                Paste Debug Panel
              </div>
              <button
                onClick={() => setShowPasteDebug(false)}
                style={{
                  padding: 'var(--spacing-xs)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--fg)',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
            
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: 'var(--spacing-md)',
              flex: 1,
              minHeight: 0
            }}>
              {/* HTML Textarea */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
                <label style={{
                  fontSize: 'var(--font-size-sm)',
                  fontWeight: 'var(--font-weight-medium)'
                }}>
                  HTML ({debugHtml.length} chars)
                </label>
                <textarea
                  readOnly
                  value={debugHtml}
                  style={{
                    flex: 1,
                    minHeight: '200px',
                    fontFamily: 'monospace',
                    fontSize: 'var(--font-size-xs)',
                    padding: 'var(--spacing-sm)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--fg)',
                    resize: 'vertical'
                  }}
                />
              </div>
              
              {/* TSV Textarea */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
                <label style={{
                  fontSize: 'var(--font-size-sm)',
                  fontWeight: 'var(--font-weight-medium)'
                }}>
                  TSV ({debugTsv.length} chars)
                </label>
                <textarea
                  readOnly
                  value={debugTsv}
                  style={{
                    flex: 1,
                    minHeight: '200px',
                    fontFamily: 'monospace',
                    fontSize: 'var(--font-size-xs)',
                    padding: 'var(--spacing-sm)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--bg-secondary)',
                    color: 'var(--fg)',
                    resize: 'vertical'
                  }}
                />
              </div>
            </div>
            
            {/* Rendered Preview */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
              <label style={{
                fontSize: 'var(--font-size-sm)',
                fontWeight: 'var(--font-weight-medium)'
              }}>
                Rendered Preview
              </label>
              <div style={{
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                padding: 'var(--spacing-sm)',
                backgroundColor: 'var(--bg-secondary)',
                maxHeight: '300px',
                overflow: 'auto'
              }}>
                <div dangerouslySetInnerHTML={{ __html: debugHtml }} />
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Resources & Credits Drawer */}
      <div style={{
        borderTop: '1px solid var(--border)',
        backgroundColor: 'var(--bg-secondary)',
        flexShrink: 0
      }}>
        {showCredits ? (
          <div style={{
            padding: 'var(--spacing-md)',
            display: 'flex',
            flexDirection: 'column',
            gap: 'var(--spacing-md)'
          }}>
            {/* Header with Hide button */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <div style={{
                fontSize: 'var(--font-size-xs)',
                color: 'var(--fg-secondary)',
                fontWeight: 'var(--font-weight-medium)'
              }}>
                Resources & Credits
              </div>
              <button
                onClick={handleCreditsToggle}
                style={{
                  padding: 'var(--spacing-xs)',
                  border: 'none',
                  backgroundColor: 'transparent',
                  color: 'var(--fg-secondary)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 'var(--spacing-xs)',
                  fontSize: 'var(--font-size-xs)',
                  fontFamily: 'var(--font-family)'
                }}
                title="Hide"
              >
                <span>Hide</span>
                <ChevronDownIcon width={12} height={12} />
              </button>
            </div>
            
            {/* Action Buttons Row */}
            <div style={{
              display: 'flex',
              gap: 'var(--spacing-sm)',
              flexWrap: 'wrap'
            }}>
              <button
                onClick={handleAboutClick}
                style={{
                  padding: 'var(--spacing-xs) var(--spacing-sm)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--bg)',
                  color: 'var(--fg)',
                  cursor: 'pointer',
                  fontSize: 'var(--font-size-xs)',
                  fontFamily: 'var(--font-family)',
                  whiteSpace: 'nowrap'
                }}
              >
                About
              </button>
              <button
                onClick={handleFeedbackClick}
                style={{
                  padding: 'var(--spacing-xs) var(--spacing-sm)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--bg)',
                  color: 'var(--fg)',
                  cursor: 'pointer',
                  fontSize: 'var(--font-size-xs)',
                  fontFamily: 'var(--font-family)',
                  whiteSpace: 'nowrap'
                }}
              >
                Feedback
              </button>
              <button
                onClick={handleJoinMeetupClick}
                style={{
                  padding: 'var(--spacing-xs) var(--spacing-sm)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--bg)',
                  color: 'var(--fg)',
                  cursor: 'pointer',
                  fontSize: 'var(--font-size-xs)',
                  fontFamily: 'var(--font-family)',
                  whiteSpace: 'nowrap'
                }}
              >
                Join Meetup
              </button>
            </div>
            
            {/* 3-Column Credits Layout */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr 1fr',
              gap: 'var(--spacing-md)',
              fontSize: 'var(--font-size-xs)'
            }}>
              {/* Column 1: Created by */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--spacing-xs)'
              }}>
                <div style={{
                  fontWeight: 'var(--font-weight-semibold)',
                  color: 'var(--fg)',
                  marginBottom: 'var(--spacing-xs)'
                }}>
                  Created by:
                </div>
                <div style={{
                  color: 'var(--fg-secondary)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--spacing-xs)'
                }}>
                  <div>Biagio G</div>
                  <div>TBD0</div>
                </div>
              </div>
              
              {/* Column 2: API Team */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--spacing-xs)'
              }}>
                <div style={{
                  fontWeight: 'var(--font-weight-semibold)',
                  color: 'var(--fg)',
                  marginBottom: 'var(--spacing-xs)'
                }}>
                  API Team:
                </div>
                <div style={{
                  color: 'var(--fg-secondary)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--spacing-xs)'
                }}>
                  <div>TBD1</div>
                  <div>TBD2</div>
                </div>
              </div>
              
              {/* Column 3: LLM Instruct */}
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--spacing-xs)'
              }}>
                <div style={{
                  fontWeight: 'var(--font-weight-semibold)',
                  color: 'var(--fg)',
                  marginBottom: 'var(--spacing-xs)'
                }}>
                  LLM Instruct:
                </div>
                <div style={{
                  color: 'var(--fg-secondary)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--spacing-xs)'
                }}>
                  <div>TBD3</div>
                  <div>TBD4</div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          <button
            onClick={handleCreditsToggle}
            style={{
              width: '100%',
              padding: 'var(--spacing-xs) var(--spacing-md)',
              border: 'none',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              fontFamily: 'var(--font-family)'
            }}
            title="Expand Resources & Credits"
          >
            <div style={{
              fontSize: 'var(--font-size-xs)',
              color: 'var(--fg-secondary)',
              fontWeight: 'var(--font-weight-medium)'
            }}>
              Resources & Credits
            </div>
            <ChevronUpIcon width={12} height={12} style={{ color: 'var(--fg-secondary)' }} />
          </button>
        )}
      </div>
    </div>
  )
}

export default render(Plugin)
