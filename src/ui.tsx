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
import { listAssistants, getAssistant, getDefaultAssistant } from './assistants'
import type { Assistant as AssistantType, QuickAction } from './assistants'
import { SettingsModal } from './ui/components/SettingsModal'
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
  Message,
  SelectionState,
  Mode,
  LlmProviderId,
  Assistant
} from './core/types'

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
  SpellCheckIcon
} from './ui/icons'


function Plugin() {
  // State
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [mode, setMode] = useState<Mode>('simple')
  const [provider, setProvider] = useState<LlmProviderId>('openai')
  const [assistant, setAssistant] = useState<AssistantType>(getDefaultAssistant())
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
  const [showSendJsonModal, setShowSendJsonModal] = useState(false)
  const [showGetJsonModal, setShowGetJsonModal] = useState(false)
  const [jsonInput, setJsonInput] = useState('')
  const [jsonOutput, setJsonOutput] = useState('')
  const [hasShownCode2DesignHelper, setHasShownCode2DesignHelper] = useState(false)
  const [hasAutoOpenedSendJson, setHasAutoOpenedSendJson] = useState(false)
  const [showCopySuccess, setShowCopySuccess] = useState(false)
  const [showSelectionHint, setShowSelectionHint] = useState(false)
  const [showCredits, setShowCredits] = useState(true)
  const [creditsAutoCollapseTimer, setCreditsAutoCollapseTimer] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const hasAutoCollapsedRef = useRef(false)
  
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
  
  // Listen to events from main thread
  useEffect(() => {
    // Use a generic message handler that routes by type
    function handleMessage(message: any) {
      if (!message || !message.type) return
      
      switch (message.type) {
        case 'RESET_DONE':
          setMessages([])
          setAssistant(getDefaultAssistant())
          setMode('simple')
          setInput('')
          setSelectionRequired(false)
          setIncludeSelection(false)
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
          if (message.message) {
            setMessages(prev => [...prev, message.message])
            setIsLoading(false) // Stop loading when message arrives
          }
          break
        case 'TOOL_RESULT':
          if (message.message) {
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
      console.log('UI received message:', event.data)
      
      // Handle nested pluginMessage structure
      // event.data might be {pluginMessage: {...}} or the message might be nested deeper
      let pluginMessage = event.data?.pluginMessage || event.data
      
      // If pluginMessage itself has a pluginMessage property, unwrap it
      if (pluginMessage?.pluginMessage) {
        pluginMessage = pluginMessage.pluginMessage
      }
      
      if (pluginMessage && pluginMessage.type) {
        console.log('Processing plugin message:', pluginMessage)
        handleMessage(pluginMessage)
      } else {
        console.warn('Message received but no valid pluginMessage found:', event.data)
      }
    }
    
    window.addEventListener('message', onMessage)
    
    // Request initial selection state
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
  
  // Handlers
  const handleReset = useCallback(() => {
    emit<ResetHandler>('RESET')
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
    emit<SetModeHandler>('SET_MODE', selectedMode)
  }, [])
  
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
    if (!input.trim()) return
    if (selectionRequired && !selectionState.hasSelection) return
    
    setIsLoading(true) // Start loading indicator
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
    const action = assistant.quickActions.find((a: QuickAction) => a.id === actionId)
    if (!action) return
    
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
    
    // Send quick action (default: send immediately)
    setIsLoading(true) // Start loading indicator
    emit<RunQuickActionHandler>('RUN_QUICK_ACTION', actionId, assistant.id)
    setSelectionRequired(false)
  }, [assistant, selectionState])
  
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
  
  const handleCreditsToggle = useCallback(() => {
    setShowCredits(prev => !prev)
    if (creditsAutoCollapseTimer) {
      clearTimeout(creditsAutoCollapseTimer)
      setCreditsAutoCollapseTimer(null)
    }
  }, [creditsAutoCollapseTimer])
  
  // Get selection indicator icon
  const getSelectionIcon = () => {
    if (!selectionState.hasSelection) {
      return <SelectionNoneIcon />
    }
    if (selectionRequired) {
      return <SelectionRequiredIcon />
    }
    return <SelectionHasIcon />
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
      'SpellCheckIcon': <SpellCheckIcon width={16} height={16} />
    }
    
    return iconMap[iconId] || null
  }
  
  // Get latest assistant message for quick actions
  const latestAssistantMessage = messages
    .filter(m => m.role === 'assistant')
    .pop()
  
  // Code2Design: Show all quick actions prominently, not just after assistant message
  const isCode2Design = assistant.id === 'code2design'
  const quickActions = assistant.quickActions.filter((action: QuickAction) => {
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
        flexShrink: 0
      }}>
        {/* Left: Home + Provider Buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
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
          
          {/* Provider Buttons */}
          <div style={{ display: 'flex', gap: 'var(--spacing-xs)' }}>
            {(['openai', 'claude', 'copilot'] as LlmProviderId[]).map(providerId => {
              const isActive = provider === providerId
              const isDisabled = providerId !== 'openai'
              
              return (
                <button
                  key={providerId}
                  onClick={() => handleProviderClick(providerId)}
                  disabled={isDisabled}
                  style={{
                    width: '24px',
                    height: '24px',
                    padding: '4px',
                    border: isActive ? '2px solid var(--accent)' : '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: isDisabled ? 'var(--bg-secondary)' : (isActive ? 'var(--accent)' : 'var(--bg)'),
                    color: isDisabled ? 'var(--muted)' : (isActive ? '#ffffff' : 'var(--fg)'),
                    cursor: isDisabled ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: isDisabled ? 0.5 : 1
                  }}
                  title={
                    providerId === 'openai' ? 'OpenAI' :
                    providerId === 'claude' ? 'Claude — Coming soon' :
                    'Copilot — Coming soon'
                  }
                >
                  {providerId === 'openai' ? <OpenAIIcon width={16} height={16} /> :
                   providerId === 'claude' ? <ClaudeIcon width={16} height={16} /> :
                   <CopilotIcon width={16} height={16} />}
                </button>
              )
            })}
          </div>
        </div>
        
        {/* Right: Mode Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
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
              backgroundColor: mode === 'advanced' ? 'var(--accent)' : 'var(--bg)',
              color: mode === 'advanced' ? '#ffffff' : 'var(--fg)',
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
        overflowY: 'auto',
        padding: 'var(--spacing-md)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--spacing-md)',
        backgroundColor: 'var(--bg-secondary)'
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
                // Rich text rendering for ALL assistant messages (including Design Critique markdown)
                <div style={{
                  padding: 'var(--spacing-sm) var(--spacing-md)',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--bg)',
                  border: '1px solid var(--border)',
                  color: 'var(--fg)',
                  maxWidth: '100%'
                }}>
                  {(() => {
                    try {
                      // Always parse and render with RichTextRenderer for assistant messages
                      const ast = parseRichText(message.content)
                      const enhanced = enhanceRichText(ast)
                      return <RichTextRenderer nodes={enhanced} />
                    } catch (error) {
                      // Fallback to plain text if parsing fails
                      console.error('[UI] RichText parsing error:', error)
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
                          {message.content}
                        </div>
                      )
                    }
                  })()}
                </div>
              ) : (
                // User message display (plain text)
                <div style={{
                  padding: 'var(--spacing-sm) var(--spacing-md)',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: 'var(--accent)',
                  color: '#ffffff',
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
              const isPrimary = assistant.id === 'design_critique' && action.id === 'give-critique'
              
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
            color: '#ffffff',
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
          placeholder="Ask me anything"
          style={{
            width: '100%',
            minHeight: '60px',
            maxHeight: '120px',
            resize: 'none',
            fontFamily: 'var(--font-family)',
            fontSize: 'var(--font-size-md)'
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
                    ? '#fff9c4' 
                    : 'var(--bg)')),
              color: selectionState.hasSelection || selectionRequired ? '#ffffff' : 'var(--fg)',
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
            onClick={handleSend}
            disabled={!input.trim() || (selectionRequired && !selectionState.hasSelection)}
            style={{
              width: '36px',
              height: '36px',
              padding: '0',
              border: 'none',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: (!input.trim() || (selectionRequired && !selectionState.hasSelection)) ? 'var(--muted)' : '#0066ff',
              cursor: (!input.trim() || (selectionRequired && !selectionState.hasSelection)) ? 'not-allowed' : 'pointer',
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
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }} onClick={() => setShowAssistantModal(false)}>
          <div style={{
            backgroundColor: 'var(--bg)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--spacing-lg)',
            maxWidth: '300px',
            width: '90%',
            maxHeight: '80vh',
            overflowY: 'auto'
          }} onClick={e => e.stopPropagation()}>
            <div style={{
              fontSize: 'var(--font-size-lg)',
              fontWeight: 'var(--font-weight-semibold)',
              marginBottom: 'var(--spacing-md)'
            }}>
              Select Assistant
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
              {listAssistants().map((a: AssistantType) => (
                <button
                  key={a.id}
                  onClick={() => handleAssistantSelect(a.id)}
                  style={{
                    padding: 'var(--spacing-md)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: assistant.id === a.id ? 'var(--accent)' : 'var(--bg-secondary)',
                    color: assistant.id === a.id ? '#ffffff' : 'var(--fg)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    fontFamily: 'var(--font-family)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: 'var(--spacing-sm)'
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
                  <div style={{ flex: 1 }}>
                    <div style={{
                      fontWeight: 'var(--font-weight-semibold)',
                      marginBottom: 'var(--spacing-xs)'
                    }}>
                      {a.label}
                    </div>
                    <div style={{
                      fontSize: 'var(--font-size-xs)',
                      opacity: 0.8
                    }}>
                      {a.intro}
                    </div>
                  </div>
                </button>
              ))}
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
      
      {/* SEND JSON Modal */}
      {showSendJsonModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }} onClick={() => setShowSendJsonModal(false)}>
          <div style={{
            backgroundColor: 'var(--bg)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--spacing-lg)',
            maxWidth: '500px',
            width: '90%',
            maxHeight: '90vh',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
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
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }} onClick={() => setShowGetJsonModal(false)}>
          <div style={{
            backgroundColor: 'var(--bg)',
            borderRadius: 'var(--radius-lg)',
            padding: 'var(--spacing-lg)',
            maxWidth: '500px',
            width: '90%',
            maxHeight: '80vh',
            display: 'flex',
            flexDirection: 'column'
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
      
      {/* Copy Success Notification */}
      {showCopySuccess && (
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
      
      {/* Credits Drawer */}
      <div style={{
        borderTop: '1px solid var(--border)',
        backgroundColor: 'var(--bg-secondary)',
        flexShrink: 0
      }}>
        {showCredits ? (
          <div style={{
            padding: 'var(--spacing-sm) var(--spacing-md)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{
              display: 'flex',
              gap: 'var(--spacing-md)',
              fontSize: 'var(--font-size-xs)',
              color: 'var(--fg-secondary)'
            }}>
              <a href="#" style={{ color: 'var(--accent)', textDecoration: 'none' }}>Docs</a>
              <a href="#" style={{ color: 'var(--accent)', textDecoration: 'none' }}>Support</a>
              <a href="#" style={{ color: 'var(--accent)', textDecoration: 'none' }}>GitHub</a>
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
                justifyContent: 'center'
              }}
              title="Collapse credits"
            >
              <ChevronDownIcon width={12} height={12} />
            </button>
          </div>
        ) : (
          <div style={{
            padding: 'var(--spacing-xs) var(--spacing-md)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{
              fontSize: 'var(--font-size-xs)',
              color: 'var(--fg-secondary)',
              fontWeight: 'var(--font-weight-medium)'
            }}>
              Credits
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
                justifyContent: 'center'
              }}
              title="Expand credits"
            >
              <ChevronUpIcon width={12} height={12} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}

export default render(Plugin)
