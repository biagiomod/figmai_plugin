/**
 * @license MIT
 * Copyright (c) 2026 Biagio Goetzke
 */

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
import { useCallback, useEffect, useMemo, useRef, useState } from 'preact/hooks'

import { getDisplayBrand } from './core/brand'
import { CONFIG } from './core/config'
import { listAssistants, listAssistantsByMode, getAssistant, getDefaultAssistant, getHoverSummary } from './assistants'
import type { Assistant as AssistantType, AssistantTag, QuickAction } from './assistants'
import { SettingsModal } from './ui/components/SettingsModal'
import { ConfluenceModal } from './ui/components/ConfluenceModal'
import { DesignWorkshopPanel } from './ui/components/DesignWorkshopPanel'
import { BottomToolbar } from './ui/components/BottomToolbar'
import { useAnalyticsTaggingController } from './ui/controllers/AnalyticsTaggingController'
import { useContentTableController } from './ui/controllers/ContentTableController'
import { RichTextRenderer } from './ui/components/RichTextRenderer'
import { parseRichText } from './core/richText/parseRichText'
import { enhanceRichText, estimateEnhancedTextLength } from './core/richText/enhancers'
import type { RichTextNode } from './core/richText/types'
import type {
  ResetHandler,
  RequestSelectionStateHandler,
  SendMessageHandler,
  SetAssistantHandler,
  SetModeHandler,
  RunQuickActionHandler,
  RunToolHandler,
  ScorecardResult,
  UniversalContentTableV1,
  TableFormatPreset,
  Message,
  SelectionState,
  Mode,
  ExportContentTableRefImageHandler,
  ContentTableResetHandler,
  RenderTableOnStageHandler,
  SaveSettingsHandler,
  RequestSettingsHandler,
  ResizePluginHandler,
  DwScanScreensHandler,
  DwClearScanHandler,
  DwSetDesignModeHandler
} from './core/types'
import { projectContentTable } from './core/contentTable/projection'
import { PRESET_INFO, PRESET_COLUMNS } from './core/contentTable/presets.generated'
import { getOrderedCtaPresets } from './core/contentTable/presetOrder'
import type { ContentTableSession } from './core/contentTable/session'
import { getEffectiveItems, applyEdit, deleteItem, toggleDuplicateScan } from './core/contentTable/session'
import type { ContentItemV1 } from './core/contentTable/types'
import { ContentTableWelcome } from './ui/components/ContentTableWelcome'
import { ContentTableView } from './ui/components/ContentTableView'
import {
  CTA_DISPLAY_NAME,
  CTA_STAGE_PREVIEW_TITLE,
  CTA_WELCOME_MATCHER,
  getCtaPresetDisplayLabel,
  getCtaPresetDisplayOrder
} from './ui/components/contentTableUiLabels'
import { sessionToTable } from './core/analyticsTagging/sessionToTable'
import type { Session } from './core/analyticsTagging/types'
import { getInitialMode } from './ui/utils/mode'
import { getCustomConfig, shouldHideContentMvpMode, getResourcesLinks, getResourcesCredits, isPromptDiagnosticsEnabled } from './custom/config'
import { BUILD_VERSION, BUILT_AT } from './core/build'
import { debugLog } from './ui/utils/debug'
import { debug } from './core/debug/logger'
import { resolveTheme } from './core/themePacks/resolver'
import { listSkins } from './core/themePacks/registry'
import { DEFAULT_SKIN_ID } from './core/themePacks/defaults'

// Import CSS
import '!./ui/styles/theme.css'
import './ui/styles/skins/base.css'
import './ui/styles/skins/dark.css'
import './ui/styles/skins/neowave.css'

// Import Icons
import {
  OpenAIIcon,
  ClaudeIcon,
  CopilotIcon,
  HomeIcon,
  SelectionNoneIcon,
  SelectionRequiredIcon,
  SelectionHasIcon,
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
  PathIcon,
  AnalyticsIcon,
  AppLogo,
  ResizeIcon
} from './ui/icons'

// --- Build identity (confirm which bundle is loaded) ---
console.log('[BUILD_ID]', { version: BUILD_VERSION, builtAt: BUILT_AT })

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
    new RegExp(CTA_WELCOME_MATCHER, 'i'),
    /welcome to your design workshop assistant/i,
    /welcome to your/i
  ]
  
  // Remove duplicate paragraphs (split by newlines, keep unique)
  // Preserve single blank lines for paragraph separation; collapse multiple consecutive blanks.
  // Never dedupe report-style key/value lines (e.g. "**Scanned:** 16 nodes") so Smart Detector body is preserved.
  const lines = text.split('\n')
  const uniqueLines: string[] = []
  const seen = new Set<string>()
  let welcomeLineFound: string | null = null
  const keyValueLike = /^\s*\*\*[^*]+\*\*:?\s*.+/

  for (const line of lines) {
    const trimmed = line.trim()
    if (trimmed === '') {
      if (uniqueLines[uniqueLines.length - 1] !== '') uniqueLines.push('')
      continue
    }
    const normalized = trimmed.toLowerCase().replace(/\s+/g, ' ')
    const isWelcomeLine = welcomeLinePatterns.some(pattern => pattern.test(line) || pattern.test(normalized))

    if (isWelcomeLine) {
      if (!welcomeLineFound) {
        welcomeLineFound = trimmed
        uniqueLines.push(trimmed)
      }
      continue
    }

    // Always keep report key/value lines so body text is never dropped
    if (keyValueLike.test(trimmed)) {
      uniqueLines.push(trimmed)
      continue
    }

    if (!seen.has(normalized)) {
      seen.add(normalized)
      uniqueLines.push(trimmed)
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

/** Return first 40 chars of a block for RENDER_CONTENT preview */
function getBlockPreview(node: RichTextNode): string {
  const n = node as { text?: string; type?: string; items?: unknown[] }
  if (n.text != null && typeof n.text === 'string') return n.text.slice(0, 40)
  if (n.items) return `[${n.type ?? 'node'}:${(n.items as unknown[]).length}]`
  return String(n.type ?? 'node').slice(0, 40)
}

/** Stable hash for a block for RENDER_BLOCK_HASHES (detect repeated blocks) */
function getBlockHash(node: RichTextNode): string {
  const n = node as { text?: string; type?: string; items?: unknown[] }
  if (n.text != null && typeof n.text === 'string') return n.text.slice(0, 80) + '_' + n.text.length
  if (n.items) return `${n.type ?? 'node'}_${(n.items as unknown[]).length}`
  return String(n.type ?? 'node')
}

/**
 * Memoized rich-text renderer: caches parseRichText + enhanceRichText output.
 * Used inside the message .map() where hooks cannot be called directly.
 * Re-parses only when content or assistantId changes.
 */
function MemoRichText({ content, assistantId, inflationGuard }: {
  content: string
  assistantId: string
  inflationGuard?: boolean
}) {
  const nodes = useMemo(() => {
    try {
      const ast = parseRichText(content)
      const enhanced = enhanceRichText(ast, { assistantId })
      if (inflationGuard) {
        const contentLen = content.length
        const estimateLen = estimateEnhancedTextLength(enhanced)
        const inflationCap = Math.max(contentLen * 2, 5000)
        if (estimateLen > inflationCap) {
          return ast
        }
      }
      return enhanced
    } catch {
      return null
    }
  }, [content, assistantId, inflationGuard])

  if (nodes === null) {
    return (
      <div style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
        {content}
      </div>
    )
  }
  return <RichTextRenderer nodes={nodes} />
}

// ---------------------------------------------------------------------------
// Plugin size presets
// ---------------------------------------------------------------------------

const PLUGIN_SIZES = {
  portrait:  { width: 400,  height: 600 },
  landscape: { width: 760,  height: 500 },
  expanded:  { width: 1000, height: 700 },
} as const
type PluginSizeMode = keyof typeof PLUGIN_SIZES
const SIZE_CYCLE: PluginSizeMode[] = ['portrait', 'landscape', 'expanded']

function Plugin() {
  // Log build version on component mount
  console.log('[UI] Build version:', BUILD_VERSION)
  
  // Reset token to prevent late-arriving messages from re-hydrating stale state
  const [resetToken, setResetToken] = useState(0)
  
  // Skin / theme — single source of truth; persisted via settings.skin
  const [theme, setTheme] = useState<string>(() => resolveTheme(DEFAULT_SKIN_ID).cssThemeValue)
  
  // Load mode using centralized getInitialMode() function
  // Priority: localStorage → customConfig.ui.defaultMode → CONFIG.defaultMode
  const [mode, setMode] = useState<Mode>(() => {
    const initialMode = getInitialMode({
      customConfig: getCustomConfig(),
      hideContentMvpMode: shouldHideContentMvpMode()
    })
    debugLog('mode', 'Plugin mount: mode initialized', { mode: initialMode, context: 'initialization' })
    return initialMode
  })
  const displayBrand = getDisplayBrand()
  const hasCustomLogoPath = !!(displayBrand.logoPath && displayBrand.logoPath.trim())
  const orderedCtaPresets = useMemo(
    () => getCtaPresetDisplayOrder(getOrderedCtaPresets(PRESET_INFO)),
    []
  )
  const [brandLogoFailed, setBrandLogoFailed] = useState(false)
  useEffect(() => {
    setBrandLogoFailed(false)
  }, [displayBrand.logoPath, displayBrand.showLogo])
  
  // Stable ref for mode (used in message handlers to avoid stale closures)
  const modeRef = useRef<Mode>(mode)
  const prevModeRef = useRef<Mode>(mode)
  
  // Update refs when mode changes (for stable access in handlers)
  useEffect(() => {
    modeRef.current = mode // Update ref for stable access in handlers
    if (prevModeRef.current !== mode) {
      debugLog('mode', 'Mode state changed', { 
        previous: prevModeRef.current, 
        next: mode,
        context: 'state update'
      })
      prevModeRef.current = mode
    }
  }, [mode])
  
  // Default assistant: Content Table in content-mvp mode, General in simple mode, General in advanced mode
  const [assistant, setAssistant] = useState<AssistantType>(() => {
    const currentMode = getInitialMode({
      customConfig: getCustomConfig(),
      hideContentMvpMode: shouldHideContentMvpMode()
    })
    return getDefaultAssistant(currentMode)
  })
  const [messages, setMessages] = useState<Message[]>([])
  /** Status line for current request (e.g. "Processing…"). Shown in dedicated area; not in message list. Cleared when final message arrives. */
  const [activeStatus, setActiveStatus] = useState<{ requestId: string; text: string; step?: string } | null>(null)
  /** Typewriter: text currently displayed character-by-character for the active status step. */
  const [typewriterText, setTypewriterText] = useState('')
  const typewriterTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const typewriterTargetRef = useRef('')
  /** Fun rotating word shown while processing (à la Claude Code). */
  const [funWord, setFunWord] = useState('')
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
  const [showSelectionHint, setShowSelectionHint] = useState(false)
  const [showEmptyInputWarning, setShowEmptyInputWarning] = useState(false)
  const [showCredits, setShowCredits] = useState(true)
  const [creditsAutoCollapseTimer, setCreditsAutoCollapseTimer] = useState<number | null>(null)
  const hasAutoCollapsedRef = useRef(false)
  // Scorecard state for Design Critique
  const [scorecard, setScorecard] = useState<ScorecardResult | null>(null)
  const [scorecardError, setScorecardError] = useState<{ error: string; raw?: string } | null>(null)
  // CT-A state is managed by useContentTableController (instantiated below)
  const stageFrameIdRef = useRef<string | null>(null)
  const [lastPromptDiagnostics, setLastPromptDiagnostics] = useState<{
    compact: string
    details?: Record<string, number | string>
    safety?: { noKbName?: boolean; noCtx?: boolean; noImages?: boolean }
  } | null>(null)
  const [showPromptDiagDetails, setShowPromptDiagDetails] = useState(false)
  const [pluginSizeMode, setPluginSizeMode] = useState<PluginSizeMode>('portrait')
  // Analytics Tagging state
  // AT-A state is managed by useAnalyticsTaggingController (instantiated below)
  const [editorType, setEditorType] = useState<'figma' | 'dev'>('figma')
  const [showPasteDebug, setShowPasteDebug] = useState(false)
  const [dwExportHtml, setDwExportHtml] = useState<string | null>(null)
  const [dwDesignMode, setDwDesignMode] = useState<'jazz' | 'wireframe'>('jazz')
  const [dwHasScanContext, setDwHasScanContext] = useState(false)
  const [dwScanSummary, setDwScanSummary] = useState<string | null>(null)
  const [dwInput, setDwInput] = useState('')
  const [dwDemoActive, setDwDemoActive] = useState(false)
  const [dwDemoTag, setDwDemoTag] = useState<'dashboard' | 'positions' | 'flow' | 'exact'>('flow')

  // Design Workshop HTML export download handler
  const handleDwExportHtml = useCallback(() => {
    if (!dwExportHtml) return
    const blob = new Blob([dwExportHtml], { type: 'text/html' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'fifi-screens.html'
    a.click()
    URL.revokeObjectURL(url)
  }, [dwExportHtml])

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const lastAssistantBubbleRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  /** Tracks pending assistant-picker tooltip timer so it can be cancelled when the modal closes. */
  const pickerTooltipTimerRef = useRef<number | undefined>(undefined)
  /** Per-component-instance ID for chat render tracing (detect duplicate mounts). */
  const chatInstanceIdRef = useRef<string | null>(null)
  if (chatInstanceIdRef.current === null) chatInstanceIdRef.current = Math.random().toString(36).slice(2)
  const chatInstanceId = chatInstanceIdRef.current
  const chatListInstanceIdRef = useRef<string | null>(null)
  if (chatListInstanceIdRef.current === null) chatListInstanceIdRef.current = 'list-' + Math.random().toString(36).slice(2, 10)
  const chatListInstanceId = chatListInstanceIdRef.current
  const RENDER_SITE_PRIMARY = 'ChatDialog:primaryList'
  /** Debounce tool-only quick actions to avoid duplicate RUN_QUICK_ACTION (e.g. double-click). */
  const lastToolOnlyEmitRef = useRef<{ key: string; time: number } | null>(null)
  const uiTraceCounterRef = useRef(0)
  const hasResizeMountedRef = useRef(false)
  const qaTraceUI = useCallback((marker: string, data: Record<string, unknown>) => {
    if (!debug.isEnabled('trace:chat')) return
    uiTraceCounterRef.current += 1
    debug.scope('trace:chat').log(`QA_TRACE ${marker}`, { n: uiTraceCounterRef.current, ...data })
  }, [])
  
  // --- Controller instances ---
  // handleQuickAction is defined later; use a ref to break the circular dependency.
  const handleQuickActionRef = useRef<(actionId: string) => void>(() => {})

  const ctController = useContentTableController({
    assistantId: assistant.id,
    selectionState,
    editorType,
    stageFrameIdRef,
    handleQuickAction: (id: string) => handleQuickActionRef.current(id),
    setMessages,
  })

  const ataController = useAnalyticsTaggingController({
    assistantId: assistant.id,
    selectionState,
    editorType,
    stageFrameIdRef,
    setCopyStatus: ctController.setCopyStatus,
    setSelectedFormat: ctController.setSelectedFormat,
    setPendingAction: ctController.setPendingAction,
    setShowFormatModal: ctController.setShowFormatModal,
    handleQuickAction: (id: string) => handleQuickActionRef.current(id),
  })

  // Convenience aliases for CT-A state used throughout the template
  const { contentTable, setContentTable, ctSession, setCtSession, selectedFormat, setSelectedFormat,
    showTableView, setShowTableView, showFormatModal, setShowFormatModal,
    showCopyFormatModal, setShowCopyFormatModal, showConfluenceModal, setShowConfluenceModal,
    confluenceFormat, setConfluenceFormat, pendingAction, setPendingAction,
    isCopyingTable, isCopyingRefImage, showRescanConfirm, setShowRescanConfirm,
    copyStatus, setCopyStatus, showCopySuccess, setShowCopySuccess,
    debugHtml, debugTsv, scannedContainerIdsRef, pendingRescanActionRef,
    handleCopyTable, handleCopyContentColumn, handleCopyRefImage, handleCopyTsv, handleDownloadHtml,
    handleConfluenceSuccess, checkRescanOverlap } = ctController

  // AT-A aliases
  const analyticsTaggingSession = ataController.session
  const analyticsTaggingExportSession = ataController.exportSession

  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Scroll to bottom when status indicator appears
  useEffect(() => {
    if (activeStatus) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [activeStatus])

  // Typewriter: retype from scratch whenever the step text changes
  useEffect(() => {
    const step = activeStatus?.step ?? ''
    typewriterTargetRef.current = step

    if (typewriterTimerRef.current) {
      clearInterval(typewriterTimerRef.current)
      typewriterTimerRef.current = null
    }

    if (!step) {
      setTypewriterText('')
      return
    }

    setTypewriterText('')
    let i = 0
    typewriterTimerRef.current = setInterval(() => {
      i++
      setTypewriterText(typewriterTargetRef.current.slice(0, i))
      if (i >= typewriterTargetRef.current.length) {
        clearInterval(typewriterTimerRef.current!)
        typewriterTimerRef.current = null
      }
    }, 28)

    return () => {
      if (typewriterTimerRef.current) {
        clearInterval(typewriterTimerRef.current)
        typewriterTimerRef.current = null
      }
    }
  }, [activeStatus?.step])

  // Fun rotating word shown while processing
  useEffect(() => {
    if (!activeStatus) {
      setFunWord('')
      return
    }
    const words = ['Accomplishing','Actioning','Actualizing','Architecting','Baking','Beaming','Beboppin\'','Befuddling','Billowing','Blanching','Bloviating','Boogieing','Boondoggling','Booping','Bootstrapping','Brewing','Burrowing','Calculating','Canoodling','Caramelizing','Cascading','Catapulting','Cerebrating','Channelling','Choreographing','Churning','Clauding','Coalescing','Cogitating','Combobulating','Composing','Computing','Concocting','Considering','Contemplating','Cooking','Crafting','Creating','Crystallizing','Cultivating','Crunching','Deciphering','Deliberating','Determining','Dilly-dallying','Discombobulating','Doing','Doodling','Drizzling','Ebbing','Effecting','Elucidating','Embellishing','Enchanting','Envisioning','Evaporating','Fermenting','Fiddle-faddling','Finagling','Flambéing','Flibbertigibbeting','Flowing','Flummoxing','Fluttering','Forging','Forming','Frosting','Frolicking','Gallivanting','Galloping','Garnishing','Generating','Germinating','Gitifying','Grooving','Gusting','Harmonizing','Hashing','Herding','Hibernating','Honking','Hullaballooing','Hyperspacing','Ideating','Imagining','Improvising','Incubating','Inferring','Infusing','Ionizing','Jitterbugging','Julienning','Kneading','Leavening','Levitating','Lollygagging','Manifesting','Marinating','Meandering','Metamorphosing','Misting','Moonwalking','Moseying','Mulling','Mustering','Musing','Nebulizing','Nesting','Noodling','Nucleating','Orbiting','Orchestrating','Osmosing','Perambulating','Percolating','Perusing','Philosophising','Photosynthesizing','Pollinating','Pontificating','Pondering','Pouncing','Precipitating','Prestidigitating','Processing','Proofing','Propagating','Puttering','Puzzling','Quantumizing','Razzle-dazzling','Razzmatazzing','Recombobulating','Reticulating','Roosting','Ruminating','Sautéing','Scampering','Scheming','Schlepping','Scurrying','Seasoning','Shenaniganing','Shimmying','Simmering','Skedaddling','Sketching','Slithering','Smooshing','Sock-hopping','Spelunking','Spinning','Sprouting','Stewing','Sublimating','Swirling','Swooping','Symbioting','Synthesizing','Tempering','Thinking','Thundering','Tinkering','Tomfoolering','Topsy-turvying','Transfiguring','Transmuting','Twisting','Undulating','Unfurling','Unravelling','Vibing','Waddling','Wandering','Warping','Whatchamacalliting','Whirlpooling','Whirring','Whisking','Wibbling','Working','Wrangling','Zesting','Zigzagging']
    const pick = () => words[Math.floor(Math.random() * words.length)]
    setFunWord(pick())
    const id = setInterval(() => setFunWord(pick()), 2200)
    return () => clearInterval(id)
  }, [activeStatus])

  useEffect(() => {
    if (!debug.isEnabled('trace:chat')) return
    const lastMsg = messages[messages.length - 1]
    const lastId = lastMsg?.id
    if (!lastId) return
    const nodes = document.querySelectorAll(`[data-message-id="${lastId}"]`)
    const sites = Array.from(new Set(Array.from(nodes).map(n => n.getAttribute('data-render-site'))))
    debug.scope('trace:chat').log('CHAT_DOM_COUNT', { lastId, count: nodes.length, sites })
  }, [messages])

  useEffect(() => {
    if (!debug.isEnabled('trace:chat')) return
    const lastMsg = messages[messages.length - 1]
    if (!lastMsg || lastMsg.role !== 'assistant') return
    const el = lastAssistantBubbleRef.current
    if (!el) return
    const renderedText = el.innerText ?? ''
    const contentLen = (lastMsg.content && String(lastMsg.content).length) || 0
    const domTextLen = renderedText.length
    const ratio = contentLen > 0 ? domTextLen / contentLen : 0
    debug.scope('trace:chat').log('RENDER_DOM_TEXT', { messageId: lastMsg.id, domTextLen, contentLen, ratio: Math.round(ratio * 100) / 100, domTail: renderedText.slice(-60) })
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
          // Use modeRef to avoid stale closure issue
          resetUIState(modeRef.current)
          break
        case 'CONTENT_TABLE_RESET_DONE':
          ctController.handleMessage('CONTENT_TABLE_RESET_DONE', message)
          break
        case 'SELECTION_STATE':
          if (message.state) {
            console.log('Received selection state:', message.state)
            setSelectionState(message.state)
          } else {
            console.warn('SELECTION_STATE message missing state:', message)
          }
          break
        case 'STATUS_STEP':
          // Update the step text shown below the spinner (typewriter effect in UI)
          if (message.requestId && message.step) {
            setActiveStatus(prev => {
              if (prev && prev.requestId === message.requestId) {
                return { requestId: prev.requestId, text: prev.text, step: String(message.step) }
              }
              return prev
            })
          }
          break
        case 'REPLACE_STATUS':
          // Replace an existing status message in-place by requestId.
          // Posted by StatusChannel.replaceStatusMessage for direct callers.
          // The main orchestration path (quickActionExecutor / main.ts) posts ASSISTANT_MESSAGE
          // with a full Message object instead (via the module-level replaceStatusMessage helpers).
          if (message.requestId) {
            setMessages(prev => {
              const idx = prev.findIndex(
                m => m.requestId === message.requestId && m.role === 'assistant'
              )
              if (idx === -1) return prev
              const updated: Message = {
                ...prev[idx],
                content: typeof message.content === 'string' ? message.content : '',
                isStatus: false,
                statusStyle: message.isError ? 'error' : undefined,
              }
              const next = [...prev]
              next[idx] = updated
              return next
            })
            setActiveStatus(prev => (prev?.requestId === message.requestId ? null : prev))
          }
          break
        case 'PROMPT_DIAG':
          if (message.diagnostics && typeof message.diagnostics.compact === 'string') {
            setLastPromptDiagnostics({
              compact: message.diagnostics.compact,
              details: message.diagnostics.details,
              safety: message.diagnostics.safety
            })
          }
          break
        case 'ASSISTANT_MESSAGE':
          // Check resetToken to ignore late-arriving messages after reset
          // If resetToken is not provided (old messages), only process if we haven't reset yet (resetToken === 0)
          // Exception: Always process RESET_DONE assistant messages (they come after reset)
          const shouldProcessAssistantMessage = message.message &&
            (message.resetToken === resetToken ||
             message.resetToken === undefined ||
             (message.message.role === 'assistant' && message.message.content.includes('intro')))
          if (shouldProcessAssistantMessage) {
            const incoming = message.message as Message
            if (debug.isEnabled('trace:chat') && incoming?.content != null) {
              const raw = String(incoming.content)
              const lineCount = raw.split('\n').length
              const previewTop = raw.slice(0, 200)
              const jsonSample = JSON.stringify(raw.slice(0, 400))
              debug.scope('trace:chat').log('CHAT_UI_RECV', { requestId: incoming.requestId, len: raw.length, lineCount, previewTop, jsonSample })
            }
            // Option A: status ("Processing…") is not added to the message list; show in dedicated area only. Ensures one bubble per request.
            if (incoming.role === 'assistant' && incoming.isStatus === true && incoming.statusStyle === 'loading') {
              setActiveStatus({ requestId: incoming.requestId ?? '', text: incoming.content ?? 'Processing…' })
              setMessages(prev => prev)
              console.log('[UI] setThinking false - ASSISTANT_MESSAGE (status only, not in transcript)', { requestId: incoming.requestId })
              break
            }
            if (incoming.role === 'assistant' && incoming.requestId) {
              setActiveStatus(prev => (prev?.requestId === incoming.requestId ? null : prev))
            }
            console.log('[UI] setThinking false - ASSISTANT_MESSAGE received', { role: message.message.role })
            // All assistant message content updates go through this reducer (no direct messages[i].content mutation elsewhere)
            setMessages(prev => {
              const incomingInner = message.message as Message

              // User messages: keep existing behavior
              if (incomingInner.role === 'user') {
                const statusMessages = prev.filter(m => m.isStatus)
                const nonStatusMessages = prev.filter(m => !m.isStatus)
                // Put user message before status messages for correct order
                return [...nonStatusMessages, incomingInner, ...statusMessages]
              }

              // Assistant messages: single-pass normalization contract. When main set contentNormalized, store as-is; else clean once.
              const contentToStore =
                incomingInner.contentNormalized === true
                  ? (incomingInner.content != null ? String(incomingInner.content) : '')
                  : cleanChatContent(incomingInner.content)

              // Deduplicate instructions messages (only one per assistant); compare using normalized form
              if (incomingInner.isInstructions) {
                const hasDuplicateInstructions = prev.some(m => {
                  if (m.role !== 'assistant' || !m.isInstructions) return false
                  return (m.assistantId === incomingInner.assistantId && m.assistantId) ||
                         cleanChatContent(m.content) === contentToStore
                })

                if (hasDuplicateInstructions) {
                  console.log('[UI] Skipping duplicate instructions message', { assistantId: incomingInner.assistantId })
                  return prev
                }
              }

              const looksLikeWorkshopIntro = isDesignWorkshopIntro(contentToStore)

              if (looksLikeWorkshopIntro) {
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

              const cleanedMessage: Message = { ...incomingInner, content: contentToStore }
              if (debug.isEnabled('trace:chat')) {
                const lineCount = contentToStore.split('\n').length
                const previewTop = contentToStore.slice(0, 200)
                const jsonSample = JSON.stringify(contentToStore.slice(0, 400))
                debug.scope('trace:chat').log('CHAT_UI_STORE', { messageId: cleanedMessage.id, len: contentToStore.length, lineCount, previewTop, jsonSample })
              }
              // Check if message with same ID already exists (for in-place replacement, e.g., status messages)
              const existingById = prev.findIndex(m => m.id === cleanedMessage.id)
              if (existingById !== -1) {
                const newContentLen = (cleanedMessage.content && String(cleanedMessage.content).length) || 0
                const newContentTail = (cleanedMessage.content && String(cleanedMessage.content).slice(-40)) || ''
                qaTraceUI('UI_RENDER_REPLACE_STATUS', { requestId: cleanedMessage.requestId, messageId: cleanedMessage.id })
                qaTraceUI('UI_STATUS_UPDATE_CONTENT', { requestId: cleanedMessage.requestId, messageId: cleanedMessage.id, newContentLength: newContentLen, newContentTail, kind: 'replace' })
                const newMessages = [...prev]
                newMessages[existingById] = cleanedMessage
                return newMessages
              }
              
              // Dedupe by requestId: one final message per request (e.g. tool-only Add HAT)
              if (cleanedMessage.requestId) {
                const existingByRequestId = prev.findIndex(
                  m => m.requestId === cleanedMessage.requestId && m.role === 'assistant'
                )
                if (existingByRequestId !== -1) {
                  const newContentLen = (cleanedMessage.content && String(cleanedMessage.content).length) || 0
                  const newContentTail = (cleanedMessage.content && String(cleanedMessage.content).slice(-40)) || ''
                  qaTraceUI('UI_RENDER_REPLACE_STATUS', { requestId: cleanedMessage.requestId })
                  qaTraceUI('UI_STATUS_UPDATE_CONTENT', { requestId: cleanedMessage.requestId, messageId: cleanedMessage.id, newContentLength: newContentLen, newContentTail, kind: 'replace' })
                  const newMessages = [...prev]
                  newMessages[existingByRequestId] = cleanedMessage
                  return newMessages
                }
              }
              
              const totalAfter = prev.length + 1
              const contentLen = (cleanedMessage.content && String(cleanedMessage.content).length) || 0
              const contentTail = (cleanedMessage.content && String(cleanedMessage.content).slice(-40)) || ''
              qaTraceUI('UI_RENDER_APPEND_MESSAGE', { requestId: cleanedMessage.requestId, messageId: cleanedMessage.id, totalMessagesAfterAppend: totalAfter, appendedMessageLength: contentLen, appendedMessageTail: contentTail })
              qaTraceUI('UI_STATUS_UPDATE_CONTENT', { requestId: cleanedMessage.requestId, messageId: cleanedMessage.id, newContentLength: contentLen, newContentTail: contentTail, kind: 'append' })
              return [...prev, cleanedMessage]
            })
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
          } else {
            console.log('[UI] Ignoring SCORECARD_ERROR - resetToken mismatch', { 
              messageToken: message.resetToken, 
              currentToken: resetToken 
            })
          }
          break
        // --- Delegate to CT-A controller ---
        case 'CONTENT_TABLE_GENERATED':
        case 'CONTENT_TABLE_APPEND':
        case 'CONTENT_TABLE_ERROR':
        case 'CONTENT_TABLE_REF_IMAGE_READY':
        case 'CONTENT_TABLE_REF_IMAGE_ERROR':
        case 'RENDER_TABLE_ON_STAGE_DONE':
        case 'CONTENT_TABLE_RESET_DONE':
          if (ctController.handleMessage(message.type, message)) break
          break
        case 'PLACEHOLDER_SCORECARD_PLACED':
          console.log('[UI] Received PLACEHOLDER_SCORECARD_PLACED')
          break
        case 'PLACEHOLDER_SCORECARD_ERROR':
          console.error('[UI] Received PLACEHOLDER_SCORECARD_ERROR:', message.message)
          break
        // --- Delegate to AT-A controller ---
        case 'ANALYTICS_TAGGING_SESSION_UPDATED':
        case 'ANALYTICS_TAGGING_NEAR_MISSES':
        case 'ANALYTICS_TAGGING_ADD_ANNOTATIONS_DONE':
        case 'ANALYTICS_TAGGING_OPEN_EXPORT':
        case 'ANALYTICS_TAGGING_SCREENSHOT_READY':
        case 'ANALYTICS_TAGGING_SCREENSHOT_ERROR':
        case 'ANALYTICS_TAGGING_EXPORT_ITEM':
        case 'ANALYTICS_TAGGING_EXPORT_DONE':
        case 'ANALYTICS_TAGGING_REQUEST_COPY_TABLE':
          ataController.handleMessage(message.type, message)
          break
        case 'EDITOR_TYPE': {
          setEditorType(message.editorType as 'figma' | 'dev')
          break
        }
        case 'SCORECARD_PLACED':
          // Legacy handler - status messages are now managed in main thread via replaceStatusMessage
          // This case can be removed in future cleanup, but keeping for backward compatibility
          console.log('[UI] Received SCORECARD_PLACED (legacy, status now managed in main thread)')
          break
        case 'TOOL_RESULT':
          if (message.message) {
            console.log('[UI] Received TOOL_RESULT')
            setMessages(prev => [...prev, message.message])
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
          if (message.settings) {
            const skinId = (message.settings as Record<string, unknown>).skin as string | undefined
            const resolved = resolveTheme(skinId)
            setTheme(resolved.cssThemeValue)
          }
          break
        case 'DW_SCAN_RESULT':
          if (message.ok) {
            setDwHasScanContext(true)
            setDwScanSummary(message.summary ?? null)
            if (message.designMode === 'wireframe' || message.designMode === 'jazz') {
              setDwDesignMode(message.designMode)
              emit<DwSetDesignModeHandler>('DW_SET_DESIGN_MODE', message.designMode)
            }
          }
          break
        case 'DW_HTML_EXPORT_READY':
          if (typeof message.html === 'string') {
            setDwExportHtml(message.html)
          }
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

    // Request settings so persisted skin is applied on startup
    emit<RequestSettingsHandler>('REQUEST_SETTINGS')
    
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

  // AT-A session request is handled by ataController

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
      const simpleAssistants = listAssistantsByMode('simple', editorType)
      const isCurrentAssistantAvailable = simpleAssistants.some(a => a.id === assistant.id)
      if (!isCurrentAssistantAvailable) {
        setAssistant(getDefaultAssistant('simple', editorType))
      }
    } else if (mode === 'advanced' && editorType === 'dev') {
      // In Dev Mode, validate current assistant is allowed even in advanced mode
      const devAssistants = listAssistantsByMode('advanced', editorType)
      const isCurrentAssistantAvailable = devAssistants.some(a => a.id === assistant.id)
      if (!isCurrentAssistantAvailable) {
        setAssistant(getDefaultAssistant(undefined, editorType))
      }
    }
  }, [mode, assistant.id, editorType])
  
  // Comprehensive UI reset function - restores all state to initial values
  const resetUIState = useCallback((currentMode: Mode) => {
    // Clear all chat content and any in-flight status
    setMessages([])
    setActiveStatus(null)
    
    // Clear all error/success banners
    setScorecardError(null)
    setScorecard(null)
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
    setLastPromptDiagnostics(null)
    setShowPromptDiagDetails(false)

    // Reset selection-related state
    setSelectionRequired(false)
    setIncludeSelection(false)
    setShowSelectionHint(false)
    setShowEmptyInputWarning(false)

    // Reset Content Table controller state
    ctController.resetState()

    // Reset helper flags
    setHasShownCode2DesignHelper(false)
    setHasAutoOpenedSendJson(false)
    
    // Reset status message refs
    
    // Reset credits (show on fresh start)
    setShowCredits(true)
    setCreditsAutoCollapseTimer(null)
    hasAutoCollapsedRef.current = false
    
    // Increment reset token to invalidate late-arriving messages
    setResetToken(prev => prev + 1)
    
    console.log('[UI] UI state reset complete, resetToken incremented')
  }, [])

  // resetContentTableState is now ctController.resetState

  const resetPluginSize = useCallback(() => {
    emit<ResizePluginHandler>('RESIZE_PLUGIN', 400, 600)
    setPluginSizeMode('portrait')
  }, [])

  // Reset plugin window size when navigating away from EG-A (content_table)
  useEffect(() => {
    if (!hasResizeMountedRef.current) {
      hasResizeMountedRef.current = true
      return
    }
    if (assistant?.id !== 'content_table' && assistant?.id !== 'analytics_tagging' && pluginSizeMode !== 'portrait') {
      resetPluginSize()
    }
  }, [assistant?.id, pluginSizeMode, resetPluginSize])

  // Handlers
  const handleReset = useCallback(() => {
    resetPluginSize()
    // Perform local UI reset immediately
    // Use modeRef.current for consistency with RESET_DONE handler (avoids stale closure)
    resetUIState(modeRef.current)

    // Also emit RESET to main thread (for main thread state cleanup)
    emit<ResetHandler>('RESET')
  }, [resetUIState, resetPluginSize])

  const handleResizeCycle = useCallback(() => {
    const nextIdx = (SIZE_CYCLE.indexOf(pluginSizeMode) + 1) % SIZE_CYCLE.length
    const next = SIZE_CYCLE[nextIdx]
    const { width, height } = PLUGIN_SIZES[next]
    emit<ResizePluginHandler>('RESIZE_PLUGIN', width, height)
    setPluginSizeMode(next)
  }, [pluginSizeMode])

  const handleClearChat = useCallback(() => {
    setMessages([])
    setActiveStatus(null)
    setShowClearChatModal(false)
  }, [])
  
  const handleModeSelect = useCallback((selectedMode: Mode) => {
    debugLog('mode', 'handleModeSelect: mode change requested', { 
      previous: mode, 
      next: selectedMode,
      context: 'user changed in handleModeSelect'
    })
    setMode(selectedMode)
    // Persist to localStorage
    try {
      localStorage.setItem('figmai-mode', selectedMode)
      debugLog('mode', 'localStorage write', { 
        key: 'figmai-mode', 
        value: selectedMode,
        callsite: 'handleModeSelect'
      })
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
      const simpleAssistants = listAssistantsByMode('simple', editorType)
      const isCurrentAssistantAvailable = simpleAssistants.some(a => a.id === assistant.id)
      if (!isCurrentAssistantAvailable) {
        setAssistant(getDefaultAssistant('simple', editorType))
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
    const skins = listSkins()
    setTheme(prev => {
      const idx = skins.findIndex(s => s.cssDataThemeValue === prev)
      const next = skins[(idx + 1) % skins.length]
      const resolved = resolveTheme(next.id)
      emit<SaveSettingsHandler>('SAVE_SETTINGS', { skin: next.id })
      return resolved.cssThemeValue
    })
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

      // Clear DW-A state when switching assistants
      setDwHasScanContext(false)
      setDwScanSummary(null)
      setDwInput('')
      setDwDemoActive(false)
      emit<DwClearScanHandler>('DW_CLEAR_SCAN')
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

  // When the assistant picker modal closes (any path: click, Escape, reset), cancel any
  // pending tooltip timer and hide the tooltip so it never bleeds into the target view.
  useEffect(() => {
    if (showAssistantModal) return
    clearTimeout(pickerTooltipTimerRef.current)
    pickerTooltipTimerRef.current = undefined
    const tip = document.getElementById('assistant-picker-tooltip')
    if (tip) tip.style.display = 'none'
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
    // DW-A: prompt and demo state are separate from the regular input
    if (assistant.id === 'design_workshop') {
      if (dwDemoActive) {
        emit<RunQuickActionHandler>('RUN_QUICK_ACTION', `demo-${dwDemoTag}`, 'design_workshop')
      } else {
        const trimmed = dwInput.trim()
        if (trimmed) emit<SendMessageHandler>('SEND_MESSAGE', trimmed, false)
      }
      return
    }

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

    console.log('[UI] postMessage SEND_MESSAGE', { input: input.substring(0, 50) + '...', includeSelection: includeSelection || selectionRequired })
    emit<SendMessageHandler>('SEND_MESSAGE', input, includeSelection || selectionRequired)
    setInput('')
    setSelectionRequired(false)
    setIncludeSelection(false)
    inputRef.current?.focus()
  }, [assistant.id, dwInput, dwDemoActive, dwDemoTag, input, includeSelection, selectionRequired, selectionState])
  
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault()
      handleSend()
    }
  }, [handleSend])
  
  const handleQuickAction = useCallback((actionId: string) => {
    console.log('[UI] handleQuickAction called', { actionId, hasContentTable: !!contentTable, assistantId: assistant.id })

    const action = assistant.quickActions.find((a: QuickAction) => a.id === actionId)
    if (!action) {
      console.warn('[UI] Action not found:', actionId, 'for assistant:', assistant.id)
      return
    }

    // UI-only: handle entirely in UI, do NOT emit RUN_QUICK_ACTION (manifest is SSOT; executionType from manifest)
    if (action.executionType === 'ui-only') {
      if (actionId === 'copy-ref-image') {
        handleCopyRefImage()
        return
      }
      if (assistant.id === 'content_table' && contentTable) {
        if (actionId === 'copy-table') {
          setShowCopyFormatModal(true)
          return
        }
        if (actionId === 'view-table') {
          setPendingAction('view')
          setShowFormatModal(true)
          return
        }
        if (actionId === 'generate-new-table') {
          setContentTable(null)
          setCtSession(null)
          setShowTableView(false)
          setSelectedFormat('universal')
          if (!selectionState.hasSelection) {
            setSelectionRequired(true)
            return
          }
          const selNodeIds = selectionState.nodeIds || []
          const overlap = selNodeIds.some(id => scannedContainerIdsRef.current.has(id))
          if (overlap) {
            pendingRescanActionRef.current = 'generate-table'
            setShowRescanConfirm(true)
            return
          }
          emit<RunQuickActionHandler>('RUN_QUICK_ACTION', 'generate-table', assistant.id)
          setSelectionRequired(false)
          return
        }
      }
      if (assistant.id === 'analytics_tagging' && actionId === 'export-screenshots') {
        ataController.handleExportScreenshots()
        setSelectionRequired(false)
        return
      }
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
    
    if (assistant.id === 'content_table' && (actionId === 'generate-table' || actionId === 'add-to-table')) {
      const selNodeIds = selectionState.nodeIds || []
      const overlap = selNodeIds.some(id => scannedContainerIdsRef.current.has(id))
      if (overlap) {
        pendingRescanActionRef.current = actionId
        setShowRescanConfirm(true)
        return
      }
    }
    
    if (assistant.id === 'design_critique' && actionId === 'give-critique') {
      setScorecard(null)
      setScorecardError(null)
    }

    // Debounce tool-only to prevent duplicate RUN_QUICK_ACTION (single final status line).
    if (action.executionType === 'tool-only') {
      const key = `${assistant.id}:${actionId}`
      const now = Date.now()
      const last = lastToolOnlyEmitRef.current
      if (last?.key === key && now - last.time < 800) {
        setSelectionRequired(false)
        return
      }
      lastToolOnlyEmitRef.current = { key, time: now }
      qaTraceUI('UI_CLICK_QUICK_ACTION', { assistantId: assistant.id, actionId })
    }

    // Send quick action to main thread
    qaTraceUI('UI_SEND_RUN_QUICK_ACTION', { assistantId: assistant.id, actionId })
    console.log('[UI] postMessage RUN_QUICK_ACTION', { actionId, assistantId: assistant.id })
    emit<RunQuickActionHandler>('RUN_QUICK_ACTION', actionId, assistant.id)
    setSelectionRequired(false)
  }, [assistant, selectionState, contentTable, qaTraceUI])
  // Update ref so controllers can call handleQuickAction
  handleQuickActionRef.current = handleQuickAction
  
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
  
  // AT-A row handlers, near-miss handlers, and export are in ataController

  // handleCopyRefImage, handleCopyTable, handleCopyTsv, handleDownloadHtml,
  // handleConfluenceSuccess, and copyAnalyticsTableToClipboard are now in
  // ctController / ataController (see useContentTableController, useAnalyticsTaggingController)

  const handleCreditsToggle = useCallback(() => {
    setShowCredits(prev => !prev)
    if (creditsAutoCollapseTimer) {
      clearTimeout(creditsAutoCollapseTimer)
      setCreditsAutoCollapseTimer(null)
    }
  }, [creditsAutoCollapseTimer])
  
  // Get resources from config
  const resourcesLinks = getResourcesLinks()
  const resourcesCredits = getResourcesCredits()
  
  const handleAboutClick = useCallback(() => {
    const url = resourcesLinks.about?.url
    if (url && url.trim()) {
      window.open(url, '_blank', 'noopener,noreferrer')
    } else {
      console.log('[TODO] About button clicked - URL not configured')
    }
  }, [resourcesLinks])
  
  const handleFeedbackClick = useCallback(() => {
    const url = resourcesLinks.feedback?.url
    if (url && url.trim()) {
      window.open(url, '_blank', 'noopener,noreferrer')
    } else {
      console.log('[TODO] Feedback button clicked - URL not configured')
    }
  }, [resourcesLinks])
  
  const handleJoinMeetupClick = useCallback(() => {
    const url = resourcesLinks.meetup?.url
    if (url && url.trim()) {
      window.open(url, '_blank', 'noopener,noreferrer')
    } else {
      console.log('[TODO] Join Meetup button clicked - URL not configured')
    }
  }, [resourcesLinks])
  
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
      'PathIcon': <PathIcon width={16} height={16} />,
      'AnalyticsIcon': <AnalyticsIcon width={16} height={16} />
    }
    
    return iconMap[iconId] || null
  }

  /**
   * Tag styles matching the historical assistant-tag reference styles.
   * new = Tag - Success (green); beta = Tag - Soft Warning (amber); alpha = Tag - Warning (orange, white text).
   */
  const ASSISTANT_TAG_STYLES: Record<'new' | 'beta' | 'alpha', { [key: string]: string | number }> = {
    new: {
      padding: '4px 8px',
      borderRadius: 8,
      backgroundColor: '#38F066',
      color: '#1A5C2B',
      fontFamily: 'Inter, sans-serif',
      fontWeight: 700,
      fontSize: 11,
      lineHeight: 1.2
    },
    beta: {
      padding: '4px 8px',
      borderRadius: 8,
      backgroundColor: '#FFB43A',
      color: '#5C3800',
      fontFamily: 'Inter, sans-serif',
      fontWeight: 700,
      fontSize: 11,
      lineHeight: 1.2
    },
    alpha: {
      padding: '4px 8px',
      borderRadius: 8,
      backgroundColor: '#FF6200',
      color: '#FFFFFF',
      fontFamily: 'Inter, sans-serif',
      fontWeight: 700,
      fontSize: 11,
      lineHeight: 1.2
    }
  }

  const getAssistantTagStyle = (variant: 'new' | 'beta' | 'alpha'): { [key: string]: string | number } => {
    return ASSISTANT_TAG_STYLES[variant] ?? ASSISTANT_TAG_STYLES.new
  }

  const getAssistantTagLabel = (tag: AssistantTag): string => {
    if (tag.label != null && tag.label.trim() !== '') return tag.label
    if (tag.variant === 'alpha') return 'Alpha'
    if (tag.variant === 'beta') return 'Beta'
    return 'New'
  }
  
  // Get latest assistant message for quick actions
  const latestAssistantMessage = messages
    .filter(m => m.role === 'assistant')
    .pop()
  
  // Quick actions: single source of truth from manifest (assistant.quickActions).
  // Content Table:
  //   - generate-table: always visible
  //   - add-to-table:   visible only when a session already has items
  //   - ui-only actions: visible only when a table exists
  // Dev Mode: hide actions that require canvas node writes (create/modify frames etc).
  // Annotation writes (add-annotations, fix-annotation-near-misses) are intentionally
  // allowed in Dev Mode — Figma permits annotation API calls in the handoff context.
  // export-screenshots requires figma.createFrame() which IS blocked in Dev Mode.
  const DESIGN_MODE_ONLY_ACTIONS = new Set([
    'export-screenshots',
  ])
  const quickActionsSource =
    assistant.id === 'content_table'
      ? assistant.quickActions.filter((a: QuickAction) => {
          if (a.id === 'generate-table') return true
          if (a.id === 'add-to-table') return !!ctSession
          if (a.executionType === 'ui-only') return !!contentTable
      return false
        })
      : assistant.quickActions
  const quickActions = quickActionsSource.filter((action: QuickAction) => {
    if (action.requiresSelection && !selectionState.hasSelection) return false
    if (editorType === 'dev' && DESIGN_MODE_ONLY_ACTIONS.has(action.id)) return false
    return true
  })

  const isCode2Design = assistant.id === 'code2design'

  if (debug.isEnabled('trace:chat')) {
    const lastMsg = messages[messages.length - 1]
    const lastId = lastMsg?.id ?? 'none'
    const lastLen = (lastMsg?.content && String(lastMsg.content).length) ?? 0
    debug.scope('trace:chat').log('CHAT_RENDER', { instanceId: chatInstanceId, messagesCount: messages.length, lastMessageId: lastId, lastMessageLen: lastLen })
  }
  
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
        
        {/* Center: Branding */}
        <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
          gap: displayBrand.showLogo && displayBrand.showAppName ? '8px' : '0',
          minWidth: 0,
          flex: '1 1 auto'
        }}>
          {displayBrand.showLogo ? (
            <div style={{ color: 'var(--fg)', display: 'inline-flex', alignItems: 'center' }}>
              {hasCustomLogoPath && !brandLogoFailed ? (
                <img
                  src={displayBrand.logoPath}
                  alt="Logo"
                  style={{ width: '16px', height: '16px', objectFit: 'contain', display: 'block' }}
                  onError={() => setBrandLogoFailed(true)}
                />
              ) : hasCustomLogoPath ? null : (
                <AppLogo logoKey={displayBrand.logoKey} width={16} height={16} />
              )}
          </div>
          ) : null}
          {displayBrand.showAppName ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', minWidth: 0 }}>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--fg)', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '180px' }}>
                {displayBrand.appName}
              </span>
              {displayBrand.showLogline ? (
                <span style={{ fontSize: '10px', color: 'var(--fg-secondary)', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '180px' }}>
                  {displayBrand.logline}
                </span>
              ) : (
                null
              )}
            </div>
          ) : null}
        </div>
        
        {/* Right: Mode Toggle */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--spacing-sm)',
          justifyContent: 'flex-end',
          flex: '1 1 0'
        }}>
          {(assistant?.id === 'content_table' || assistant?.id === 'analytics_tagging') && (
            <button
              onClick={handleResizeCycle}
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
              title={`Size: ${pluginSizeMode} — click to cycle`}
            >
              <ResizeIcon width={16} height={16} />
            </button>
          )}
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
            title={`Theme: ${theme}`}
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
        {/* Trash Button - Floating Overlay (hidden for tool-mode assistants) */}
        {messages.length > 0 && assistant.uiMode !== 'tool' && (
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
          overflowY: ((assistant.id === 'content_table' && ctSession) || (assistant.id === 'analytics_tagging' && analyticsTaggingSession && analyticsTaggingSession.rows.length > 0)) ? 'hidden' : 'auto',
          overflowX: 'hidden',
          padding: ((assistant.id === 'content_table' && ctSession) || (assistant.id === 'analytics_tagging' && analyticsTaggingSession && analyticsTaggingSession.rows.length > 0)) ? '0' : 'var(--spacing-md)',
          paddingTop: ((assistant.id === 'content_table' && ctSession) || (assistant.id === 'analytics_tagging' && analyticsTaggingSession && analyticsTaggingSession.rows.length > 0)) ? '0' : (messages.length > 0) ? 'calc(var(--spacing-md) + 32px)' : 'var(--spacing-md)',
          display: 'flex',
          flexDirection: 'column',
          gap: ((assistant.id === 'content_table' && ctSession) || (assistant.id === 'analytics_tagging' && analyticsTaggingSession && analyticsTaggingSession.rows.length > 0)) ? '0' : 'var(--spacing-md)',
          minHeight: 0
        }}>
        {assistant.id === 'analytics_tagging' ? (
          ataController.renderView()
        ) : assistant.id === 'content_table' ? (
          ctSession ? (
            <ContentTableView
              session={ctSession}
              onSessionChange={setCtSession}
              hasSelection={selectionState.hasSelection}
              onAppend={() => handleQuickAction('add-to-table')}
              onViewOnStage={editorType !== 'dev' ? (visibleItems) => {
                if (!contentTable) return
                const ctStageProjected = projectContentTable(selectedFormat, visibleItems)
                emit<RenderTableOnStageHandler>('RENDER_TABLE_ON_STAGE', {
                  headers: ctStageProjected.headers,
                  headerRows: ctStageProjected.headerRows,
                  rows: ctStageProjected.rows,
                  title: contentTable.meta?.rootNodeName || CTA_STAGE_PREVIEW_TITLE,
                  existingFrameId: stageFrameIdRef.current,
                  columnKeys: ctStageProjected.columnKeys,
                  presetId: selectedFormat
                })
              } : undefined}
              onCopyToClipboard={(visibleItems) => handleCopyTable(selectedFormat, 'html', false, visibleItems)}
              onCopyRowsToClipboard={(visibleItems) => handleCopyTable(selectedFormat, 'html', true, visibleItems)}
              onCopyContentColumnToClipboard={(visibleItems) => handleCopyContentColumn(visibleItems)}
              onRestart={() => {
                emit<ContentTableResetHandler>('CONTENT_TABLE_RESET')
              }}
              onExportRowRefImage={(nodeId: string) => {
                emit<ExportContentTableRefImageHandler>('EXPORT_CONTENT_TABLE_REF_IMAGE', nodeId)
              }}
              isCopying={isCopyingTable}
              selectedFormat={selectedFormat}
              onFormatChange={setSelectedFormat}
            />
          ) : (
            <ContentTableWelcome
              hasSelection={selectionState.hasSelection}
              onGenerate={() => handleQuickAction('generate-table')}
            />
          )
        ) : (
          <div style={{ display: 'contents' }}>
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
            Paste a Design AI Toolkit Template JSON to generate Figma elements, or select frames and click GET JSON.
          </div>
        )}
        {debug.isEnabled('trace:chat') && (() => {
          const lastMsg = messages[messages.length - 1]
          const lastId = lastMsg?.id ?? 'none'
          const lastLen = (lastMsg?.content && String(lastMsg.content).length) ?? 0
          debug.scope('trace:chat').log('CHAT_LIST_RENDER', { instanceId: chatListInstanceId, renderSiteId: RENDER_SITE_PRIMARY, messagesCount: messages.length, lastMessageId: lastId, lastMessageLen: lastLen })
          return null
        })()}
        {messages.map((message, index) => {
          if (debug.isEnabled('trace:chat') && index === messages.length - 1) {
            debug.scope('trace:chat').log('CHAT_ROW', { instanceId: chatInstanceId, messageId: message.id, index })
          }
          // Render boundary divider before boundary message
          if (message.isBoundary) {
            return (
              <div key={message.id} data-message-id={message.id} data-render-site={RENDER_SITE_PRIMARY} style={{ width: '100%', margin: 'var(--spacing-md) 0' }}>
                <div style={{
                  height: '1px',
                  backgroundColor: 'var(--border)',
                  width: '100%',
                  margin: 'var(--spacing-md) 0'
                }} />
              </div>
            )
          }
          
          // Render greeting message with special styling
          if (message.isGreeting) {
          return (
            <div
              key={message.id}
                data-message-id={message.id}
                data-render-site={RENDER_SITE_PRIMARY}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--spacing-xs)',
                  alignSelf: 'flex-start',
                maxWidth: '80%'
              }}
            >
                <div
                  className="chat-assistant-bubble"
                  style={{
                  padding: 'var(--spacing-md)',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg)',
                  border: '2px solid var(--accent)',
                  color: 'var(--fg)',
                  maxWidth: '100%',
                  fontSize: 'var(--font-size-md)',
                  fontWeight: 'var(--font-weight-semibold)',
                  userSelect: 'text',
                  WebkitUserSelect: 'text',
                  MozUserSelect: 'text',
                  msUserSelect: 'text',
                  cursor: 'text'
                }}>
                  <MemoRichText
                    content={message.content != null ? String(message.content) : ''}
                    assistantId={message.assistantId ?? assistant.id}
                  />
                </div>
              </div>
            )
          }
          
          // Render instructions message with compact styling
          if (message.isInstructions) {
                      return (
              <div
                key={message.id}
                data-message-id={message.id}
                data-render-site={RENDER_SITE_PRIMARY}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 'var(--spacing-xs)',
                  alignSelf: 'flex-start',
                  maxWidth: '80%'
                }}
              >
                <div
                  className="chat-assistant-bubble"
                  style={{
                  paddingTop: 'var(--spacing-sm)',
                  paddingRight: 'var(--spacing-md)',
                  paddingBottom: '4px',
                  paddingLeft: 'var(--spacing-md)',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border)',
                  color: 'var(--muted)',
                  maxWidth: '100%',
                  fontSize: 'var(--font-size-xs)',
                          userSelect: 'text',
                          WebkitUserSelect: 'text',
                          MozUserSelect: 'text',
                          msUserSelect: 'text',
                          cursor: 'text'
                        }}>
                  <MemoRichText
                    content={message.content != null ? String(message.content) : ''}
                    assistantId={message.assistantId ?? assistant.id}
                  />
                </div>
                        </div>
                      )
                    }
          
          if (debug.isEnabled('trace:chat') && index === messages.length - 1) {
            const contentLen = (message.content && String(message.content).length) || 0
            debug.scope('trace:chat').log('CHAT_ROW_RENDER', { messageId: message.id, contentLen, oneBubble: true })
          }
          return (
            <div
              key={message.id}
              data-message-id={message.id}
              data-render-site={RENDER_SITE_PRIMARY}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 'var(--spacing-xs)',
                alignSelf: message.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '80%'
              }}
            >
              {message.role === 'assistant' ? (
                // Single bubble per message: status is shown in dedicated area only; transcript only has final content
                <div
                  ref={index === messages.length - 1 && message.role === 'assistant' ? lastAssistantBubbleRef : undefined}
                  className="chat-assistant-bubble"
                  style={{
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
                  <MemoRichText
                    content={message.content != null ? String(message.content) : ''}
                    assistantId={message.assistantId ?? assistant.id}
                    inflationGuard
                  />
                </div>
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
        

        {/* Dedicated status area: spinner + typewriter step shown below messages while a request is in flight */}
        {activeStatus && (
          <div style={{
            padding: 'var(--spacing-sm) var(--spacing-md)',
            borderRadius: 'var(--radius-md)',
            backgroundColor: 'var(--bg)',
            border: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: 'var(--spacing-sm)',
            maxWidth: '100%',
            alignSelf: 'flex-start'
          }}>
            <div className="spinner" style={{
              width: '16px',
              height: '16px',
              border: '2.5px solid var(--muted)',
              borderTopColor: 'var(--accent)',
              borderRadius: '50%',
              boxSizing: 'border-box',
              flexShrink: 0,
              marginTop: '2px'
            }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', minWidth: 0 }}>
              <span style={{
                fontSize: 'var(--font-size-sm)',
                fontWeight: 600,
                color: 'var(--fg)'
              }}>Processing</span>
              {typewriterText && (
                <span style={{
                  fontSize: 'var(--font-size-xs)',
                  color: 'var(--muted)',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }}>
                  {typewriterText}<span className="typewriter-cursor">|</span>
                </span>
              )}
              {funWord && (
                <span style={{
                  fontSize: 'var(--font-size-xs)',
                  color: 'var(--accent)',
                  fontStyle: 'italic',
                  opacity: 0.75
                }}>
                  {funWord}...
                </span>
              )}
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
          </div>
        )}
        </div>
      </div>
      
      {/* Input Area */}
      {assistant.id === 'design_workshop' ? (
        <DesignWorkshopPanel
          isGenerating={activeStatus !== null}
          prompt={dwInput}
          onPromptChange={setDwInput}
          demoActive={dwDemoActive}
          onDemoActiveChange={setDwDemoActive}
          demoTag={dwDemoTag}
          onDemoTagChange={setDwDemoTag}
          exportHtml={dwExportHtml}
          onExportHtml={handleDwExportHtml}
          designMode={dwDesignMode}
          onDesignModeChange={(mode) => {
            setDwDesignMode(mode)
            emit<DwSetDesignModeHandler>('DW_SET_DESIGN_MODE', mode)
          }}
          hasScanContext={dwHasScanContext}
          scanSummary={dwScanSummary}
          onScan={() => emit<DwScanScreensHandler>('DW_SCAN_SCREENS')}
          onClearScan={() => {
            setDwHasScanContext(false)
            setDwScanSummary(null)
            emit<DwClearScanHandler>('DW_CLEAR_SCAN')
          }}
          hasSelection={selectionState.hasSelection}
        />
      ) : (
      <div style={{
        borderTop: '1px solid var(--border)',
        padding: 'var(--spacing-md) var(--spacing-md) 0',
        backgroundColor: 'var(--bg)',
        flexShrink: 0,
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--spacing-sm)'
      }}>
        {/* Quick Actions — hidden for tool-mode assistants (actions are in the inline view) */}
        {assistant.uiMode !== 'tool' && quickActions.length > 0 && (
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: 'var(--spacing-xs)',
            marginBottom: 'var(--spacing-xs)'
          }}>
            {quickActions.map((action: QuickAction) => {
              const isDisabled = (action.requiresSelection && !selectionState.hasSelection) || (assistant.id === 'analytics_tagging' && action.id === 'copy-table' && (!analyticsTaggingSession || analyticsTaggingSession.rows.length === 0))
              const isPrimary = (assistant.id === 'design_critique' && action.id === 'give-critique') || (assistant.id === 'content_table' && action.id === 'generate-table') || (assistant.id === 'analytics_tagging' && action.id === 'get-analytics-tags')
              
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
        
        {/* Prompt diagnostics (compact, no raw prompt) + Work mode */}
        {isPromptDiagnosticsEnabled() && lastPromptDiagnostics && (
          <div style={{
            padding: 'var(--spacing-sm)',
            backgroundColor: 'var(--surface-row)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            fontSize: '10px',
            fontFamily: 'monospace',
            wordBreak: 'break-all'
          }}>
            {lastPromptDiagnostics.safety && (lastPromptDiagnostics.safety.noKbName || lastPromptDiagnostics.safety.noCtx || lastPromptDiagnostics.safety.noImages) && (
              <div style={{ marginBottom: 'var(--spacing-xs)', color: 'var(--fg-secondary)', fontSize: '10px' }}>
                Work mode: {[
                  lastPromptDiagnostics.safety.noKbName && 'no KB',
                  lastPromptDiagnostics.safety.noCtx && 'no ctx',
                  lastPromptDiagnostics.safety.noImages && 'no images'
                ].filter(Boolean).join(', ')}
              </div>
            )}
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', flexWrap: 'wrap' }}>
              <span style={{ flex: 1, minWidth: 0 }} title={lastPromptDiagnostics.compact}>
                {lastPromptDiagnostics.compact}
              </span>
              <button
                type="button"
                onClick={async () => {
                  try {
                    await navigator.clipboard?.writeText(lastPromptDiagnostics!.compact)
                    setShowCopySuccess(true)
                    setTimeout(() => setShowCopySuccess(false), 2000)
                  } catch {
                    // ignore
                  }
                }}
                style={{
                  padding: '2px 6px',
                  fontSize: '10px',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg)',
                  color: 'var(--fg)',
                  cursor: 'pointer'
                }}
              >
                Copy diag
              </button>
              <button
                type="button"
                onClick={async () => {
                  const checklist = 'Enable llm.promptDiagnostics.enabled; set llm.safety.forceNoKbName/forceNoSelectionSummary/forceNoImages; send Hello?; copy diag; A/B: forceNoKbName on vs off to isolate kbName.'
                  try {
                    await navigator.clipboard?.writeText(checklist)
                    setShowCopySuccess(true)
                    setTimeout(() => setShowCopySuccess(false), 2000)
                  } catch {
                    // ignore
                  }
                }}
                style={{
                  padding: '2px 6px',
                  fontSize: '10px',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--bg)',
                  color: 'var(--fg)',
                  cursor: 'pointer'
                }}
              >
                Copy env checklist
              </button>
              {lastPromptDiagnostics.details && (
                <button
                  type="button"
                  onClick={() => setShowPromptDiagDetails((v) => !v)}
                  style={{
                    padding: '2px 6px',
                    fontSize: '10px',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg)',
                    color: 'var(--fg)',
                    cursor: 'pointer'
                  }}
                >
                  {showPromptDiagDetails ? 'Hide details' : 'Show details'}
                </button>
              )}
            </div>
            {showPromptDiagDetails && lastPromptDiagnostics.details && (
              <table style={{ marginTop: 'var(--spacing-xs)', width: '100%', fontSize: '10px', borderCollapse: 'collapse' }}>
                <tbody>
                  {Object.entries(lastPromptDiagnostics.details).map(([k, v]) => (
                    <tr key={k}>
                      <td style={{ padding: '2px 6px 2px 0', color: 'var(--fg-secondary)' }}>{k}</td>
                      <td style={{ padding: '2px 0' }}>{String(v)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Text Input — hidden for tool-mode assistants (CT-A, AT-A) */}
        {assistant.uiMode !== 'tool' && (
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
        )}
        
      </div>
      )}

      {/* Shell bottom controls — always rendered regardless of active assistant */}
      <BottomToolbar
        selectionState={selectionState}
        selectionRequired={selectionRequired}
        showSelectionHint={showSelectionHint}
        onSelectionClick={handleSelectionIndicatorClick}
        assistant={assistant}
        onAssistantClick={handleAssistantClick}
        onSend={handleSend}
        isGenerating={activeStatus !== null}
        canSend={
          assistant.id === 'design_workshop'
            ? (dwDemoActive || dwInput.trim().length > 0)
            : !(mode === 'content-mvp' || (selectionRequired && !selectionState.hasSelection))
        }
        getSelectionIcon={getSelectionIcon}
        getAssistantIcon={getAssistantIcon}
      />

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
            {listAssistantsByMode(mode, editorType).map((a: AssistantType) => (
                <button
                  key={a.id}
                  onClick={(e) => {
                    clearTimeout((e.currentTarget as HTMLElement & { _tooltipTimer?: number })._tooltipTimer)
                    const tip = document.getElementById('assistant-picker-tooltip')
                    if (tip) tip.style.display = 'none'
                    handleAssistantSelect(a.id)
                  }}
                onMouseEnter={(e) => {
                  if (assistant.id !== a.id) {
                    e.currentTarget.style.backgroundColor = 'var(--surface-row-hover)'
                  }
                  const btn = e.currentTarget as HTMLElement & { _tooltipTimer?: number }
                  const desc = getHoverSummary(a)
                  if (!desc) return
                  pickerTooltipTimerRef.current = btn._tooltipTimer = window.setTimeout(() => {
                    let tip = document.getElementById('assistant-picker-tooltip')
                    if (!tip) {
                      tip = document.createElement('div')
                      tip.id = 'assistant-picker-tooltip'
                      tip.style.cssText = [
                        'position:fixed',
                        'z-index:99999',
                        'background:#1a1a1a',
                        'color:#fff',
                        'font-size:11px',
                        'padding:6px 10px',
                        'border-radius:4px',
                        'max-width:240px',
                        'line-height:1.4',
                        'pointer-events:none',
                        'box-shadow:0 2px 8px rgba(0,0,0,0.28)',
                        'display:none'
                      ].join(';')
                      document.body.appendChild(tip)
                    }
                    tip.textContent = desc
                    const rect = btn.getBoundingClientRect()
                    tip.style.left = rect.left + 'px'
                    tip.style.top = (rect.bottom + 6) + 'px'
                    tip.style.display = 'block'
                    const tipRect = tip.getBoundingClientRect()
                    const overflowRight = tipRect.right - window.innerWidth + 8
                    if (overflowRight > 0) {
                      tip.style.left = (rect.left - overflowRight) + 'px'
                    }
                  }, 2500)
                }}
                onMouseLeave={(e) => {
                  if (assistant.id !== a.id) {
                    e.currentTarget.style.backgroundColor = 'var(--surface-row)'
                  }
                  const btn = e.currentTarget as HTMLElement & { _tooltipTimer?: number }
                  clearTimeout(btn._tooltipTimer)
                  pickerTooltipTimerRef.current = undefined
                  const tip = document.getElementById('assistant-picker-tooltip')
                  if (tip) tip.style.display = 'none'
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
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--spacing-xs)',
                    flexWrap: 'wrap'
                  }}>
                    <span style={{ fontWeight: 'var(--font-weight-semibold)' }}>
                      {a.label}
                    </span>
                    {a.tag?.isVisible === true && a.tag?.variant != null && (
                      <span style={getAssistantTagStyle(a.tag.variant)}>
                        {getAssistantTagLabel(a.tag)}
                      </span>
                    )}
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
          currentSkin={theme}
          onSkinChange={(skinId: string) => {
            const resolved = resolveTheme(skinId)
            setTheme(resolved.cssThemeValue)
          }}
        />
      )}
      
      {/* Confluence Modal */}
      {showConfluenceModal && (contentTable || analyticsTaggingExportSession) && (
        <ConfluenceModal
          contentTable={analyticsTaggingExportSession ? sessionToTable(analyticsTaggingExportSession) : contentTable!}
          format={confluenceFormat}
          onClose={() => {
            setShowConfluenceModal(false)
            if (analyticsTaggingExportSession) ataController.setExportSession(null)
          }}
          onSuccess={handleConfluenceSuccess}
        />
      )}
      
      {/* Format Selection Modal for Content Table / Analytics Tagging Export */}
      {showFormatModal && (contentTable || analyticsTaggingExportSession) && (
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
            
            {orderedCtaPresets.map(preset => {
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
                  {getCtaPresetDisplayLabel(preset)}
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
      
      {/* Table View Modal — fallback for non-tool mode (gated; tool mode uses inline ContentTableView) */}
      {assistant.uiMode !== 'tool' && showTableView && contentTable && (
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
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{
                  fontSize: 'var(--font-size-lg)',
                  fontWeight: 'var(--font-weight-semibold)'
                }}>
                  {CTA_DISPLAY_NAME}
                  {selectedFormat !== 'universal' && (
                    <span style={{ fontSize: '11px', color: '#666', fontWeight: 400 }}>
                      {' '}({(() => {
                        const selectedPreset = PRESET_INFO.find((p) => p.id === selectedFormat)
                        return selectedPreset ? getCtaPresetDisplayLabel(selectedPreset) : selectedFormat
                      })()})
                    </span>
                  )}
                </div>
                {ctSession && (
                  <label
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '11px',
                      color: ctSession.scanEnabled ? 'var(--accent, #0d99ff)' : '#888',
                      cursor: 'pointer', userSelect: 'none',
                      padding: '2px 8px', borderRadius: '10px',
                      border: `1px solid ${ctSession.scanEnabled ? 'var(--accent, #0d99ff)' : '#ccc'}`,
                      backgroundColor: ctSession.scanEnabled ? 'rgba(13,153,255,0.08)' : 'transparent',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={ctSession.scanEnabled}
                      onChange={(e) => setCtSession(prev => prev ? toggleDuplicateScan(prev, (e.target as HTMLInputElement).checked) : prev)}
                      style={{ margin: 0, cursor: 'pointer', accentColor: 'var(--accent, #0d99ff)' }}
                    />
                    Duplicate Scan
                  </label>
                )}
                {ctSession && ctSession.lastSkippedCount > 0 && (
                  <span style={{ fontSize: '10px', color: '#b36b00', backgroundColor: '#fff8e6', padding: '1px 6px', borderRadius: '8px', whiteSpace: 'nowrap' }}>
                    {ctSession.lastSkippedCount} duplicate{ctSession.lastSkippedCount > 1 ? 's' : ''} skipped
                  </span>
                )}
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
              overflowX: 'auto',
              border: '1px solid #e0e0e0',
              borderRadius: 'var(--radius-sm)',
              padding: 0,
              backgroundColor: '#ffffff'
            }}>
              {ctSession ? (() => {
                const items = getEffectiveItems(ctSession)
                const presetCols = PRESET_COLUMNS[selectedFormat]
                const dynamicColumns = presetCols && presetCols.length > 0 ? presetCols : PRESET_COLUMNS['universal']
                const editableKeys = new Set(['content', 'notes', 'contentKey', 'jiraTicket', 'adaNotes', 'errorMessage'])
                const editableFieldMap: Record<string, keyof ContentItemV1> = {
                  content: 'content',
                  notes: 'notes',
                  contentKey: 'contentKey',
                  notesJira: 'jiraTicket',
                  jiraTicket: 'jiraTicket',
                  adaNotes: 'adaNotes',
                  errorMessage: 'errorMessage',
                  rulesComment: 'notes'
                }
                const isContentCol = (key: string) => key === 'content'
                const isFigmaRefCol = (key: string) => key === 'figmaRef' || key === 'nodeUrl'
                const ROW_W = 36
                const TOOLS_W = 56
                const CONTENT_W = 360
                const OTHER_W = 120
                const otherCount = dynamicColumns.filter(c => !isContentCol(c.key)).length
                const hasContent = dynamicColumns.some(c => isContentCol(c.key))
                const tableMinW = ROW_W + TOOLS_W + (hasContent ? CONTENT_W : 0) + otherCount * OTHER_W
                const thStyle = (isContent: boolean): React.CSSProperties => ({
                  padding: '6px 10px', borderBottom: '2px solid #ddd', textAlign: 'left' as const,
                  whiteSpace: 'nowrap' as const, overflow: 'hidden' as const, textOverflow: 'ellipsis' as const,
                  color: '#333', boxSizing: 'border-box' as const, fontSize: '12px', lineHeight: '1.4',
                  width: isContent ? `${CONTENT_W}px` : `${OTHER_W}px`,
                  minWidth: isContent ? `${CONTENT_W}px` : `${OTHER_W}px`
                })
                return (
                  <table style={{ minWidth: `${tableMinW}px`, borderCollapse: 'collapse', fontSize: '12px', fontFamily: 'Inter, system-ui, sans-serif', tableLayout: 'fixed' }}>
                    <colgroup>
                      <col style={{ width: `${ROW_W}px` }} />
                      {dynamicColumns.map(col => (
                        <col key={col.key} style={{ width: isContentCol(col.key) ? `${CONTENT_W}px` : `${OTHER_W}px` }} />
                      ))}
                      <col style={{ width: `${TOOLS_W}px` }} />
                    </colgroup>
                    <thead>
                      <tr style={{ backgroundColor: '#f5f5f5' }}>
                        <th style={{ padding: '6px 10px', borderBottom: '2px solid #ddd', textAlign: 'left', whiteSpace: 'nowrap', color: '#333', width: `${ROW_W}px`, boxSizing: 'border-box' }}>#</th>
                        {dynamicColumns.map(col => (
                          <th key={col.key} style={thStyle(isContentCol(col.key))}>{col.label}</th>
                        ))}
                        <th style={{ padding: '6px 10px', borderBottom: '2px solid #ddd', textAlign: 'center', whiteSpace: 'nowrap', color: '#333', width: `${TOOLS_W}px`, boxSizing: 'border-box' }}>Tools</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, idx) => (
                        <tr key={item.id} style={{ borderBottom: '1px solid #eee', verticalAlign: 'top' }}>
                          <td style={{ padding: '4px 10px', color: '#999', fontSize: '11px', boxSizing: 'border-box' }}>{idx + 1}</td>
                          {dynamicColumns.map(col => {
                            const fieldKey = editableFieldMap[col.key]
                            const isContent = isContentCol(col.key)
                            if (fieldKey) {
                              const curVal = fieldKey === 'content' ? item.content.value : (item[fieldKey] as string || '')
                              if (isContent) {
                                return (
                                  <td key={col.key} style={{ padding: '4px 8px', boxSizing: 'border-box' }}>
                                    <textarea
                                      defaultValue={curVal}
                                      rows={2}
                                      onBlur={(e) => {
                                        if (e.currentTarget.value !== curVal) {
                                          setCtSession(prev => prev ? applyEdit(prev, item.id, fieldKey, e.currentTarget.value) : prev)
                                        }
                                      }}
                                      style={{ width: '100%', minWidth: 0, border: '1px solid transparent', borderRadius: '3px', padding: '2px 4px', fontSize: '12px', fontFamily: 'inherit', color: '#000', backgroundColor: 'transparent', outline: 'none', resize: 'vertical', maxHeight: '96px', overflowY: 'auto', lineHeight: '1.4', boxSizing: 'border-box' }}
                                      onFocus={(e) => { e.currentTarget.style.borderColor = '#0d99ff'; e.currentTarget.style.backgroundColor = '#fff' }}
                                      onBlurCapture={(e) => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.backgroundColor = 'transparent' }}
                                    />
                                  </td>
                                )
                              }
                              return (
                                <td key={col.key} style={{ padding: '4px 10px', boxSizing: 'border-box', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                  <input
                                    type="text"
                                    defaultValue={curVal}
                                    placeholder={fieldKey === 'notes' ? 'Add note...' : ''}
                                    onBlur={(e) => {
                                      if (e.currentTarget.value !== curVal) {
                                        setCtSession(prev => prev ? applyEdit(prev, item.id, fieldKey, e.currentTarget.value) : prev)
                                      }
                                    }}
                                    style={{ width: '100%', minWidth: 0, border: '1px solid transparent', borderRadius: '3px', padding: '2px 4px', fontSize: '12px', fontFamily: 'inherit', color: '#000', backgroundColor: 'transparent', outline: 'none', boxSizing: 'border-box' }}
                                    onFocus={(e) => { e.currentTarget.style.borderColor = '#0d99ff'; e.currentTarget.style.backgroundColor = '#fff' }}
                                    onBlurCapture={(e) => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.backgroundColor = 'transparent' }}
                                  />
                                </td>
                              )
                            }
                            if (isContent) {
                              return (
                                <td key={col.key} style={{ padding: '4px 8px', color: '#000', fontSize: '12px', whiteSpace: 'normal', overflowWrap: 'anywhere', lineHeight: '1.4', maxHeight: '96px', overflowY: 'auto', boxSizing: 'border-box' }}>{col.extract(item)}</td>
                              )
                            }
                            if (isFigmaRefCol(col.key)) {
                              const url = col.extract(item)
                              return (
                                <td key={col.key} style={{ padding: '4px 10px', fontSize: '12px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', boxSizing: 'border-box' }}>
                                  {url ? <a href={url} target="_blank" rel="noreferrer" style={{ color: '#0066ff', textDecoration: 'underline', fontSize: '12px' }}>View in Figma</a> : ''}
                                </td>
                              )
                            }
                            return (
                              <td key={col.key} style={{ padding: '4px 10px', color: '#000', fontSize: '12px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', boxSizing: 'border-box' }}>{col.extract(item)}</td>
                            )
                          })}
                          <td style={{ padding: '4px 8px', textAlign: 'center', whiteSpace: 'nowrap' }}>
                            {ctSession.flaggedDuplicateIds.has(item.id) && (
                              <span title="Possible duplicate" style={{ fontSize: '9px', color: '#b36b00', backgroundColor: '#fff8e6', padding: '1px 4px', borderRadius: '4px', marginRight: '4px', fontWeight: 600 }}>Dup?</span>
                            )}
                            <button
                              onClick={() => setCtSession(prev => prev ? deleteItem(prev, item.id) : prev)}
                              title="Delete row"
                              style={{ border: 'none', background: 'none', cursor: 'pointer', color: '#cc3333', fontSize: '14px', padding: '2px 4px', borderRadius: '3px', lineHeight: 1 }}
                              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#fee' }}
                              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      ))}
                      {items.length === 0 && (
                        <tr><td colSpan={dynamicColumns.length + 2} style={{ padding: '16px', textAlign: 'center', color: '#999' }}>No items. All rows have been deleted.</td></tr>
                      )}
                    </tbody>
                  </table>
                )
              })() : (
                <div style={{ padding: '16px', textAlign: 'center', color: '#999' }}>
                  No table data available.
                </div>
              )}
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
                {editorType !== 'dev' && (
                  <button
                    onClick={() => {
                      if (!ctSession || !contentTable) return
                      const items = getEffectiveItems(ctSession)
                      const modalStageProjected = projectContentTable(selectedFormat, items)
                      emit<RenderTableOnStageHandler>('RENDER_TABLE_ON_STAGE', {
                        headers: modalStageProjected.headers,
                        headerRows: modalStageProjected.headerRows,
                        rows: modalStageProjected.rows,
                        title: contentTable.meta?.rootNodeName || CTA_STAGE_PREVIEW_TITLE,
                        existingFrameId: stageFrameIdRef.current,
                        columnKeys: modalStageProjected.columnKeys,
                        presetId: selectedFormat
                      })
                    }}
                    disabled={!ctSession}
                    style={{
                      padding: 'var(--spacing-sm) var(--spacing-md)',
                      border: 'none',
                      borderRadius: 'var(--radius-sm)',
                      backgroundColor: !ctSession ? 'var(--muted)' : 'var(--accent)',
                      color: !ctSession ? 'var(--fg)' : 'var(--accent-text)',
                      cursor: !ctSession ? 'not-allowed' : 'pointer',
                      fontSize: 'var(--font-size-sm)',
                      fontWeight: 'var(--font-weight-medium)',
                      opacity: !ctSession ? 0.6 : 1
                    }}
                  >
                    Add to Stage
                  </button>
                )}
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
      
      {showRescanConfirm && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'var(--overlay-scrim)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100
        }} onClick={() => { setShowRescanConfirm(false); pendingRescanActionRef.current = null }}>
          <div style={{
            backgroundColor: 'var(--surface-modal)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--spacing-lg)',
            maxWidth: '360px', width: '90%',
            display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)',
            boxShadow: 'var(--shadow-elevation)'
          }} onClick={e => e.stopPropagation()}>
            <div style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-semibold)' }}>
              Rescan confirmation
            </div>
            <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--fg)' }}>
              You've scanned this item before. Proceed?
            </div>
            <div style={{ display: 'flex', gap: 'var(--spacing-sm)', justifyContent: 'flex-end' }}>
              <button
                onClick={() => { setShowRescanConfirm(false); pendingRescanActionRef.current = null }}
                style={{
                  padding: 'var(--spacing-sm) var(--spacing-md)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--bg-secondary)',
                  color: 'var(--fg)',
                  cursor: 'pointer',
                  fontSize: 'var(--font-size-sm)'
                }}
              >No</button>
              <button
                onClick={() => {
                  const actionId = pendingRescanActionRef.current
                  setShowRescanConfirm(false)
                  pendingRescanActionRef.current = null
                  if (actionId) {
                    emit<RunQuickActionHandler>('RUN_QUICK_ACTION', actionId, assistant.id)
                  }
                }}
                style={{
                  padding: 'var(--spacing-sm) var(--spacing-md)',
                  border: 'none',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--accent)',
                  color: 'var(--accent-text)',
                  cursor: 'pointer',
                  fontSize: 'var(--font-size-sm)',
                  fontWeight: 'var(--font-weight-medium)'
                }}
              >Yes</button>
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
                  placeholder="Paste your Design AI Toolkit Template JSON here..."
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
            
            {/* Action Buttons Row - Render only if URL is provided */}
            {(resourcesLinks.about?.url?.trim() || resourcesLinks.feedback?.url?.trim() || resourcesLinks.meetup?.url?.trim()) && (
              <div style={{
                display: 'flex',
                gap: 'var(--spacing-sm)',
                flexWrap: 'wrap'
              }}>
                {resourcesLinks.about?.url?.trim() && (
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
                    {resourcesLinks.about.label || 'About'}
                  </button>
                )}
                {resourcesLinks.feedback?.url?.trim() && (
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
                    {resourcesLinks.feedback.label || 'Feedback'}
                  </button>
                )}
                {resourcesLinks.meetup?.url?.trim() && (
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
                    {resourcesLinks.meetup.label || 'Join Meetup'}
                  </button>
                )}
              </div>
            )}
            
            {/* 3-Column Credits Layout - Render only if at least one credit array has entries */}
            {(resourcesCredits.createdBy.length > 0 || resourcesCredits.apiTeam.length > 0 || resourcesCredits.llmInstruct.length > 0) && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: 'var(--spacing-md)',
                fontSize: 'var(--font-size-xs)'
              }}>
                {/* Column 1: Created by */}
                {resourcesCredits.createdBy.length > 0 && (
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
                      {resourcesCredits.createdBy
                        .filter((credit) => credit?.label) // Skip malformed entries
                        .map((credit, idx) => (
                          credit.url?.trim() ? (
                            <a
                              key={idx}
                              href={credit.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                color: 'var(--fg-secondary)',
                                textDecoration: 'none'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.textDecoration = 'underline'
                                e.currentTarget.style.color = 'var(--accent)'
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.textDecoration = 'none'
                                e.currentTarget.style.color = 'var(--fg-secondary)'
                              }}
                            >
                              {credit.label}
                            </a>
                          ) : (
                            <div key={idx}>{credit.label}</div>
                          )
                        ))}
                    </div>
                  </div>
                )}
                
                {/* Column 2: API Team */}
                {resourcesCredits.apiTeam.length > 0 && (
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
                      {resourcesCredits.apiTeam
                        .filter((credit) => credit?.label) // Skip malformed entries
                        .map((credit, idx) => (
                          credit.url?.trim() ? (
                            <a
                              key={idx}
                              href={credit.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                color: 'var(--fg-secondary)',
                                textDecoration: 'none'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.textDecoration = 'underline'
                                e.currentTarget.style.color = 'var(--accent)'
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.textDecoration = 'none'
                                e.currentTarget.style.color = 'var(--fg-secondary)'
                              }}
                            >
                              {credit.label}
                            </a>
                          ) : (
                            <div key={idx}>{credit.label}</div>
                          )
                        ))}
            </div>
                  </div>
                )}
                
                {/* Column 3: LLM Instruct */}
                {resourcesCredits.llmInstruct.length > 0 && (
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
                      {resourcesCredits.llmInstruct
                        .filter((credit) => credit?.label) // Skip malformed entries
                        .map((credit, idx) => (
                          credit.url?.trim() ? (
                            <a
                              key={idx}
                              href={credit.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                color: 'var(--fg-secondary)',
                                textDecoration: 'none'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.textDecoration = 'underline'
                                e.currentTarget.style.color = 'var(--accent)'
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.textDecoration = 'none'
                                e.currentTarget.style.color = 'var(--fg-secondary)'
                              }}
                            >
                              {credit.label}
                            </a>
                          ) : (
                            <div key={idx}>{credit.label}</div>
                          )
                        ))}
                    </div>
                  </div>
                )}
              </div>
            )}
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
