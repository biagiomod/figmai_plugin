import { h } from 'preact'
import { useState, useEffect, useCallback, useRef } from 'preact/hooks'
import { Textbox, Button } from '@create-figma-plugin/ui'
import { emit } from '@create-figma-plugin/utilities'
import type {
  SaveSettingsHandler,
  TestProxyConnectionHandler,
  RequestSettingsHandler
} from '../../core/types'
import type { Settings } from '../../core/settings'
import type { Mode } from '../../core/types'
import { shouldHideContentMvpMode, getCustomLlmEndpoint, shouldHideLlmModelSettings, getCustomConfig, getLlmUiMode } from '../../custom/config'
import { debugLog } from '../utils/debug'
import { getInitialMode } from '../utils/mode'

interface SettingsModalProps {
  onClose: () => void
  currentMode?: Mode
  onModeChange?: (mode: Mode) => void
}

export function SettingsModal({ onClose, currentMode, onModeChange }: SettingsModalProps) {
  // Check custom config
  const hideContentMvpMode = shouldHideContentMvpMode()
  const customEndpoint = getCustomLlmEndpoint()
  const hideModelSettings = shouldHideLlmModelSettings()
  const llmUiMode = getLlmUiMode()
  
  // Determine LLM settings visibility:
  // - hideModelSettings=true takes precedence (existing behavior)
  // - If endpoint set AND uiMode='connection-only': show only connection + test
  // - Otherwise: show full settings
  const showConnectionOnly = !!customEndpoint && llmUiMode === 'connection-only' && !hideModelSettings
  const showFullLlmSettings = !hideModelSettings && !showConnectionOnly
  
  // Initialize mode from currentMode prop (reflects actual current mode)
  // If currentMode is not provided, use getInitialMode() for consistent fallback logic
  const [mode, setMode] = useState<Mode>(() => {
    if (currentMode) {
      return currentMode
    }
    return getInitialMode({
      customConfig: getCustomConfig(),
      hideContentMvpMode
    })
  })
  
  // Track initial mode for Cancel functionality - capture the mode at mount time
  const [initialMode] = useState<Mode>(() => {
    // Capture the mode value at initialization time (before any effects run)
    if (currentMode) {
      return currentMode
    }
    return getInitialMode({
      customConfig: getCustomConfig(),
      hideContentMvpMode
    })
  })
  const [connectionType, setConnectionType] = useState<'proxy' | 'internal-api'>('proxy')
  const [proxyBaseUrl, setProxyBaseUrl] = useState('')
  const [internalApiUrl, setInternalApiUrl] = useState('')
  const [authMode, setAuthMode] = useState<'shared_token' | 'session_token'>('shared_token')
  const [sharedToken, setSharedToken] = useState('')
  const [sessionToken, setSessionToken] = useState('')
  const [defaultModel, setDefaultModel] = useState('gpt-4.1-mini')
  const [testStatus, setTestStatus] = useState<{ success: boolean; message: string } | null>(null)
  const [testDiagnostics, setTestDiagnostics] = useState<{
    url?: string
    method?: string
    headers?: Record<string, string>
    credentials?: string
    statusCode?: number
    responseBody?: string
    errorName?: string
    errorMessage?: string
  } | null>(null)
  const [isTesting, setIsTesting] = useState(false)
  
  // Refs for stable message handler (avoid re-registration on state changes)
  const modeRef = useRef<Mode>(mode)
  const hideContentMvpModeRef = useRef<boolean>(hideContentMvpMode)
  const isSettingsOpenRef = useRef<boolean>(true) // Modal is open when mounted
  const latestRequestIdRef = useRef<string | null>(null)
  
  // Instrumentation refs (dev-only)
  const listenerAddCountRef = useRef<number>(0)
  const listenerRemoveCountRef = useRef<number>(0)
  
  // Update refs when state/props change (small effects, no listener re-registration)
  useEffect(() => {
    modeRef.current = mode
  }, [mode])
  
  useEffect(() => {
    hideContentMvpModeRef.current = hideContentMvpMode
  }, [hideContentMvpMode])
  
  // Track modal open/close state
  useEffect(() => {
    isSettingsOpenRef.current = true
    return () => {
      isSettingsOpenRef.current = false
    }
  }, [])
  
  // Generate requestId helper (simple counter-based, sufficient for correlation)
  const generateRequestId = useCallback(() => {
    return `settings_req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }, [])
  
  // Extract origin from URL for manifest validation
  const getOriginFromUrl = (url: string): string | null => {
    try {
      const urlObj = new URL(url.trim())
      return `${urlObj.protocol}//${urlObj.host}`
    } catch {
      return null
    }
  }
  
  // Check if URL has a path (for manifest warning)
  const hasPath = (url: string): boolean => {
    try {
      const urlObj = new URL(url.trim())
      return urlObj.pathname !== '/' && urlObj.pathname !== ''
    } catch {
      return false
    }
  }
  
  // Load settings on mount with requestId for correlation
  useEffect(() => {
    const requestId = generateRequestId()
    latestRequestIdRef.current = requestId
    debugLog('settings', 'REQUEST_SETTINGS emitted', { requestId })
    emit<RequestSettingsHandler>('REQUEST_SETTINGS', requestId)
  }, [generateRequestId])
  
  // Listen for test results and settings response
  // STABLE LISTENER: Empty deps [] ensures listener is registered exactly once
  // Use refs to access current state values without causing re-registration
  useEffect(() => {
    listenerAddCountRef.current += 1
    debugLog('settings', 'Message listener registered', { 
      addCount: listenerAddCountRef.current,
      removeCount: listenerRemoveCountRef.current
    })
    
    function handleMessage(message: any) {
      if (message.type === 'TEST_RESULT') {
        setIsTesting(false)
        setTestStatus({
          success: message.success,
          message: message.message
        })
        // Store diagnostics if present
        if (message.diagnostics) {
          setTestDiagnostics(message.diagnostics)
        } else {
          setTestDiagnostics(null)
        }
      } else if (message.type === 'SETTINGS_RESPONSE' && message.settings) {
        const settings = message.settings as Settings
        const responseRequestId = message.requestId as string | undefined
        
        // Guard 1: Ignore if modal is not open
        if (!isSettingsOpenRef.current) {
          debugLog('settings', 'SETTINGS_RESPONSE ignored: modal not open', { 
            responseRequestId,
            latestRequestId: latestRequestIdRef.current
          })
          return
        }
        
        // Guard 2: Ignore if requestId doesn't match (out-of-order or duplicate)
        if (responseRequestId && latestRequestIdRef.current && responseRequestId !== latestRequestIdRef.current) {
          debugLog('settings', 'SETTINGS_RESPONSE ignored: requestId mismatch', { 
            responseRequestId,
            latestRequestId: latestRequestIdRef.current,
            reason: 'out-of-order or duplicate message'
          })
          return
        }
        
        // Guard 3: Mode is NOT hydrated from settings - it lives in localStorage only
        // Mode should only change via explicit user action (handleModeChange)
        // Settings.mode is legacy/deprecated and should be ignored
        debugLog('settings', 'SETTINGS_RESPONSE accepted', { 
          responseRequestId,
          latestRequestId: latestRequestIdRef.current,
          hasMode: settings.mode != null,
          note: 'Mode from settings is ignored - mode lives in localStorage only'
        })
        
        // Hydrate all settings EXCEPT mode (mode is managed separately)
        setConnectionType(settings.connectionType || 'proxy')
        setProxyBaseUrl(settings.proxyBaseUrl || '')
        setInternalApiUrl(settings.internalApiUrl || '')
        setAuthMode(settings.authMode || 'shared_token')
        setSharedToken(settings.sharedToken || '')
        setSessionToken(settings.sessionToken || '')
        setDefaultModel(settings.defaultModel || 'gpt-4.1-mini')
      }
    }
    
    function onMessage(event: MessageEvent) {
      if (event.data?.pluginMessage) {
        let pluginMessage = event.data.pluginMessage
        if (pluginMessage.pluginMessage) {
          pluginMessage = pluginMessage.pluginMessage
        }
        handleMessage(pluginMessage)
      }
    }
    
    window.addEventListener('message', onMessage)
    
    return () => {
      listenerRemoveCountRef.current += 1
      debugLog('settings', 'Message listener removed', { 
        addCount: listenerAddCountRef.current,
        removeCount: listenerRemoveCountRef.current
      })
      window.removeEventListener('message', onMessage)
    }
  }, []) // Empty deps - listener registered once, uses refs for current values
  
  // Sync currentMode prop on mount only (not on every prop change)
  // This ensures modal opens with correct mode without causing flips
  // Note: We intentionally don't include currentMode in deps - we only want mount-time sync
  useEffect(() => {
    if (currentMode !== undefined && currentMode !== modeRef.current) {
      debugLog('mode', 'SettingsModal: currentMode prop synced on mount', { 
        previous: modeRef.current, 
        next: currentMode,
        context: 'mount-time prop sync'
      })
      setMode(currentMode)
      modeRef.current = currentMode
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // Only run once on mount - intentionally ignore currentMode prop changes after mount
  
  // Handler for mode change that persists immediately
  const handleModeChange = useCallback((newMode: Mode) => {
    debugLog('mode', 'SettingsModal handleModeChange: mode change requested', { 
      previous: mode, 
      next: newMode,
      context: 'user changed in SettingsModal'
    })
    setMode(newMode)
    // Persist to localStorage immediately
    try {
      localStorage.setItem('figmai-mode', newMode)
      debugLog('mode', 'localStorage write', { 
        key: 'figmai-mode', 
        value: newMode,
        callsite: 'SettingsModal.handleModeChange'
      })
    } catch (e) {
      console.warn('[Settings] Failed to save mode to localStorage:', e)
    }
    // Notify parent immediately
    if (onModeChange) {
      onModeChange(newMode)
    }
  }, [onModeChange])
  
  // Handler for Cancel - revert to initial mode
  const handleCancel = useCallback(() => {
    if (mode !== initialMode) {
      setMode(initialMode)
      // Revert localStorage
      try {
        localStorage.setItem('figmai-mode', initialMode)
      } catch (e) {
        console.warn('[Settings] Failed to revert mode in localStorage:', e)
      }
      // Notify parent
      if (onModeChange) {
        onModeChange(initialMode)
      }
    }
    onClose()
  }, [mode, initialMode, onModeChange, onClose])
  
  const handleSave = useCallback(() => {
    const settings: Partial<Settings> = {
      mode,
      connectionType,
      proxyBaseUrl: connectionType === 'proxy' ? proxyBaseUrl.trim() : undefined,
      internalApiUrl: connectionType === 'internal-api' ? internalApiUrl.trim() : undefined,
      authMode: connectionType === 'proxy' ? authMode : undefined,
      sharedToken: connectionType === 'proxy' && authMode === 'shared_token' ? sharedToken.trim() : undefined,
      sessionToken: connectionType === 'proxy' && authMode === 'session_token' ? sessionToken.trim() : undefined,
      defaultModel: connectionType === 'proxy' ? (defaultModel.trim() || 'gpt-4.1-mini') : undefined
    }
    
    emit<SaveSettingsHandler>('SAVE_SETTINGS', settings)
    if (onModeChange) {
      onModeChange(mode)
    }
    onClose()
  }, [mode, connectionType, proxyBaseUrl, internalApiUrl, authMode, sharedToken, sessionToken, defaultModel, onClose, onModeChange])
  
  const handleTest = useCallback(() => {
    setIsTesting(true)
    setTestStatus(null)
    setTestDiagnostics(null) // Clear previous diagnostics
    
    // Use custom endpoint if provided, otherwise use UI values
    const testConnectionType = hideModelSettings && customEndpoint ? 'internal-api' : connectionType
    const testInternalApiUrl = hideModelSettings && customEndpoint ? customEndpoint : (connectionType === 'internal-api' ? internalApiUrl.trim() : undefined)
    const testProxyBaseUrl = connectionType === 'proxy' ? proxyBaseUrl.trim() : undefined
    
    // Prepare settings for saving (for persistence)
    const settings: Partial<Settings> = {
      mode,
      connectionType: testConnectionType,
      proxyBaseUrl: testConnectionType === 'proxy' ? testProxyBaseUrl : undefined,
      internalApiUrl: testConnectionType === 'internal-api' ? testInternalApiUrl : undefined,
      authMode: testConnectionType === 'proxy' ? authMode : undefined,
      sharedToken: testConnectionType === 'proxy' && authMode === 'shared_token' ? sharedToken.trim() : undefined,
      sessionToken: testConnectionType === 'proxy' && authMode === 'session_token' ? sessionToken.trim() : undefined,
      defaultModel: testConnectionType === 'proxy' ? (defaultModel.trim() || 'gpt-4.1-mini') : undefined
    }
    
    // Save settings for persistence (async, but we don't wait for it)
    emit<SaveSettingsHandler>('SAVE_SETTINGS', settings)
    
    // Test immediately with current UI values (no race condition)
    emit<TestProxyConnectionHandler>('TEST_PROXY_CONNECTION', {
      connectionType: testConnectionType,
      internalApiUrl: testInternalApiUrl,
      proxyBaseUrl: testProxyBaseUrl
    })
  }, [mode, connectionType, proxyBaseUrl, internalApiUrl, authMode, sharedToken, sessionToken, defaultModel, hideModelSettings, customEndpoint])
  
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'var(--overlay)',
      display: 'flex',
      alignItems: 'flex-start',
      justifyContent: 'center',
      paddingTop: '16px',
      paddingBottom: '16px',
      zIndex: 1000
    }} onClick={onClose}>
      <div style={{
        backgroundColor: 'var(--surface-modal)',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--spacing-lg)',
        maxWidth: '400px',
        width: '90%',
        height: 'calc(100vh - 32px)',
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
          Settings
        </div>
        
        {/* Mode Selection */}
        <div>
          <label style={{
            display: 'block',
            fontSize: 'var(--font-size-sm)',
            fontWeight: 'var(--font-weight-medium)',
            marginBottom: 'var(--spacing-xs)',
            color: 'var(--fg)'
          }}>
            Mode
          </label>
          <div style={{
            display: 'flex',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            overflow: 'hidden',
            width: '100%',
            backgroundColor: 'var(--surface-modal)'
          }}>
            {!hideContentMvpMode && (
              <button
                onClick={() => handleModeChange('content-mvp')}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    handleModeChange('content-mvp')
                  }
                }}
                style={{
                  flex: 1,
                  padding: 'var(--spacing-sm) var(--spacing-md)',
                  border: 'none',
                  borderRight: '1px solid var(--border-subtle)',
                  borderRadius: 0,
                  backgroundColor: mode === 'content-mvp' ? '#ffffff' : 'var(--surface-modal)',
                  color: mode === 'content-mvp' ? '#000000' : 'var(--fg-secondary)',
                  cursor: 'pointer',
                  textAlign: 'center',
                  fontFamily: 'var(--font-family)',
                  fontSize: 'var(--font-size-sm)',
                  fontWeight: mode === 'content-mvp' ? 'var(--font-weight-semibold)' : 'var(--font-weight-normal)',
                  transition: 'background-color 0.15s ease, color 0.15s ease',
                  outline: 'none'
                }}
                onFocus={(e) => {
                  e.currentTarget.style.outline = '2px solid var(--accent)'
                  e.currentTarget.style.outlineOffset = '-2px'
                }}
                onBlur={(e) => {
                  e.currentTarget.style.outline = 'none'
                }}
                onMouseEnter={(e) => {
                  if (mode !== 'content-mvp') {
                    e.currentTarget.style.backgroundColor = 'var(--surface-row-hover)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (mode !== 'content-mvp') {
                    e.currentTarget.style.backgroundColor = 'var(--surface-modal)'
                    e.currentTarget.style.color = 'var(--fg-secondary)'
                  }
                }}
              >
                Content-MVP
              </button>
            )}
            <button
              onClick={() => handleModeChange('simple')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  handleModeChange('simple')
                }
              }}
              style={{
                flex: 1,
                padding: 'var(--spacing-sm) var(--spacing-md)',
                border: 'none',
                borderRight: '1px solid var(--border-subtle)',
                borderRadius: 0,
                backgroundColor: mode === 'simple' ? '#ffffff' : 'var(--surface-modal)',
                color: mode === 'simple' ? '#000000' : 'var(--fg-secondary)',
                cursor: 'pointer',
                textAlign: 'center',
                fontFamily: 'var(--font-family)',
                fontSize: 'var(--font-size-sm)',
                fontWeight: mode === 'simple' ? 'var(--font-weight-semibold)' : 'var(--font-weight-normal)',
                transition: 'background-color 0.15s ease, color 0.15s ease',
                outline: 'none'
              }}
              onFocus={(e) => {
                e.currentTarget.style.outline = '2px solid var(--accent)'
                e.currentTarget.style.outlineOffset = '-2px'
              }}
              onBlur={(e) => {
                e.currentTarget.style.outline = 'none'
              }}
              onMouseEnter={(e) => {
                if (mode !== 'simple') {
                  e.currentTarget.style.backgroundColor = 'var(--surface-row-hover)'
                }
              }}
              onMouseLeave={(e) => {
                if (mode !== 'simple') {
                  e.currentTarget.style.backgroundColor = 'var(--surface-modal)'
                  e.currentTarget.style.color = 'var(--fg-secondary)'
                }
              }}
            >
              Simple
            </button>
            <button
              onClick={() => handleModeChange('advanced')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  handleModeChange('advanced')
                }
              }}
              style={{
                flex: 1,
                padding: 'var(--spacing-sm) var(--spacing-md)',
                border: 'none',
                borderRadius: 0,
                backgroundColor: mode === 'advanced' ? '#ffffff' : 'var(--surface-modal)',
                color: mode === 'advanced' ? '#000000' : 'var(--fg-secondary)',
                cursor: 'pointer',
                textAlign: 'center',
                fontFamily: 'var(--font-family)',
                fontSize: 'var(--font-size-sm)',
                fontWeight: mode === 'advanced' ? 'var(--font-weight-semibold)' : 'var(--font-weight-normal)',
                transition: 'background-color 0.15s ease, color 0.15s ease',
                outline: 'none'
              }}
              onFocus={(e) => {
                e.currentTarget.style.outline = '2px solid var(--accent)'
                e.currentTarget.style.outlineOffset = '-2px'
              }}
              onBlur={(e) => {
                e.currentTarget.style.outline = 'none'
              }}
              onMouseEnter={(e) => {
                if (mode !== 'advanced') {
                  e.currentTarget.style.backgroundColor = 'var(--surface-row-hover)'
                }
              }}
              onMouseLeave={(e) => {
                if (mode !== 'advanced') {
                  e.currentTarget.style.backgroundColor = 'var(--surface-modal)'
                  e.currentTarget.style.color = 'var(--fg-secondary)'
                }
              }}
            >
              Advanced
            </button>
          </div>
        </div>
        
        {/* Divider */}
        <div style={{
          height: '1px',
          backgroundColor: 'var(--border-subtle)',
          margin: 'var(--spacing-md) 0',
          width: '100%'
        }} />
        
        {/* LLM Connection / Model Settings Section */}
        {(hideModelSettings || showConnectionOnly) ? (
          /* LLM Connection Section (when custom endpoint provided OR uiMode='connection-only') */
          <div>
            <div style={{
              fontSize: 'var(--font-size-md)',
              fontWeight: 'var(--font-weight-semibold)',
              marginBottom: 'var(--spacing-xs)',
              color: 'var(--fg)'
            }}>
              LLM Connection
            </div>
            
            <div>
              <label style={{
                display: 'block',
                fontSize: 'var(--font-size-sm)',
                fontWeight: 'var(--font-weight-medium)',
                marginBottom: 'var(--spacing-xs)',
                color: 'var(--fg)'
              }}>
                Endpoint
              </label>
              <Textbox
                value={customEndpoint || ''}
                disabled
                style={{
                  width: '100%',
                  opacity: 0.7
                }}
              />
            </div>
            
            {/* Test Connection Button */}
            <div style={{ marginTop: 'var(--spacing-md)' }}>
              <Button
                onClick={handleTest}
                disabled={!customEndpoint || isTesting}
                style={{
                  width: '100%'
                }}
              >
                {isTesting ? 'Testing...' : 'Test Connection'}
              </Button>
            </div>
          </div>
        ) : showFullLlmSettings ? (
          /* LLM Model Settings Section (default) */
          <div>
            <div style={{
              fontSize: 'var(--font-size-md)',
              fontWeight: 'var(--font-weight-semibold)',
              marginBottom: 'var(--spacing-xs)',
              color: 'var(--fg)'
            }}>
              LLM Model Settings
            </div>
            
            {/* Connection Type Toggle */}
            <div>
          <div style={{
            display: 'flex',
            border: '1px solid var(--border-subtle)',
            borderRadius: 'var(--radius-sm)',
            overflow: 'hidden',
            width: '100%',
            backgroundColor: 'var(--surface-modal)'
          }}>
            <button
              onClick={() => setConnectionType('internal-api')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  setConnectionType('internal-api')
                }
              }}
              style={{
                flex: 1,
                padding: 'var(--spacing-sm) var(--spacing-md)',
                border: 'none',
                borderRight: '1px solid var(--border-subtle)',
                borderRadius: 0,
                backgroundColor: connectionType === 'internal-api' ? '#ffffff' : 'var(--surface-modal)',
                color: connectionType === 'internal-api' ? '#000000' : 'var(--fg-secondary)',
                cursor: 'pointer',
                textAlign: 'center',
                fontFamily: 'var(--font-family)',
                fontSize: 'var(--font-size-sm)',
                fontWeight: connectionType === 'internal-api' ? 'var(--font-weight-semibold)' : 'var(--font-weight-normal)',
                transition: 'background-color 0.15s ease, color 0.15s ease',
                outline: 'none'
              }}
              onFocus={(e) => {
                e.currentTarget.style.outline = '2px solid var(--accent)'
                e.currentTarget.style.outlineOffset = '-2px'
              }}
              onBlur={(e) => {
                e.currentTarget.style.outline = 'none'
              }}
              onMouseEnter={(e) => {
                if (connectionType !== 'internal-api') {
                  e.currentTarget.style.backgroundColor = 'var(--surface-row-hover)'
                }
              }}
              onMouseLeave={(e) => {
                if (connectionType !== 'internal-api') {
                  e.currentTarget.style.backgroundColor = 'var(--surface-modal)'
                  e.currentTarget.style.color = 'var(--fg-secondary)'
                }
              }}
            >
              Internal API
            </button>
            <button
              onClick={() => setConnectionType('proxy')}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  setConnectionType('proxy')
                }
              }}
              style={{
                flex: 1,
                padding: 'var(--spacing-sm) var(--spacing-md)',
                border: 'none',
                borderRadius: 0,
                backgroundColor: connectionType === 'proxy' ? '#ffffff' : 'var(--surface-modal)',
                color: connectionType === 'proxy' ? '#000000' : 'var(--fg-secondary)',
                cursor: 'pointer',
                textAlign: 'center',
                fontFamily: 'var(--font-family)',
                fontSize: 'var(--font-size-sm)',
                fontWeight: connectionType === 'proxy' ? 'var(--font-weight-semibold)' : 'var(--font-weight-normal)',
                transition: 'background-color 0.15s ease, color 0.15s ease',
                outline: 'none'
              }}
              onFocus={(e) => {
                e.currentTarget.style.outline = '2px solid var(--accent)'
                e.currentTarget.style.outlineOffset = '-2px'
              }}
              onBlur={(e) => {
                e.currentTarget.style.outline = 'none'
              }}
              onMouseEnter={(e) => {
                if (connectionType !== 'proxy') {
                  e.currentTarget.style.backgroundColor = 'var(--surface-row-hover)'
                }
              }}
              onMouseLeave={(e) => {
                if (connectionType !== 'proxy') {
                  e.currentTarget.style.backgroundColor = 'var(--surface-modal)'
                  e.currentTarget.style.color = 'var(--fg-secondary)'
                }
              }}
            >
              Proxy
            </button>
          </div>
        </div>
        
        {/* Proxy Mode Fields */}
        {connectionType === 'proxy' && (
          <div>
            {/* Proxy Base URL */}
            <div>
              <label style={{
                display: 'block',
                fontSize: 'var(--font-size-sm)',
                fontWeight: 'var(--font-weight-medium)',
                marginBottom: 'var(--spacing-xs)',
                color: 'var(--fg)'
              }}>
                Proxy Base URL
              </label>
              <Textbox
                value={proxyBaseUrl}
                onValueInput={setProxyBaseUrl}
                placeholder="https://proxy.example.com"
                style={{
                  width: '100%'
                }}
              />
            </div>
            
            {/* Default Model */}
            <div>
              <label style={{
                display: 'block',
                fontSize: 'var(--font-size-sm)',
                fontWeight: 'var(--font-weight-medium)',
                marginBottom: 'var(--spacing-xs)',
                color: 'var(--fg)'
              }}>
                Default Model
              </label>
              <Textbox
                value={defaultModel}
                onValueInput={setDefaultModel}
                placeholder="gpt-4.1-mini"
                style={{
                  width: '100%'
                }}
              />
            </div>
            
            {/* Auth Mode */}
            <div>
              <label style={{
                display: 'block',
                fontSize: 'var(--font-size-sm)',
                fontWeight: 'var(--font-weight-medium)',
                marginBottom: 'var(--spacing-xs)',
                color: 'var(--fg)'
              }}>
                Authentication Mode
              </label>
              <select
                value={authMode}
                onChange={(e) => setAuthMode((e.target as HTMLSelectElement).value as 'shared_token' | 'session_token')}
                style={{
                  width: '100%',
                  padding: 'var(--spacing-sm)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: 'var(--bg)',
                  color: 'var(--fg)',
                  fontSize: 'var(--font-size-sm)',
                  fontFamily: 'var(--font-family)'
                }}
              >
                <option value="shared_token">Shared Token (Personal)</option>
                <option value="session_token">Session Token (Commercial - Coming soon)</option>
              </select>
            </div>
            
            {/* Shared Token */}
            {authMode === 'shared_token' && (
              <div>
                <label style={{
                  display: 'block',
                  fontSize: 'var(--font-size-sm)',
                  fontWeight: 'var(--font-weight-medium)',
                  marginBottom: 'var(--spacing-xs)',
                  color: 'var(--fg)'
                }}>
                  Shared Token
                </label>
                <input
                  type="password"
                  value={sharedToken}
                  onInput={(e) => setSharedToken((e.target as HTMLInputElement).value)}
                  placeholder="Enter your shared token"
                  style={{
                    width: '100%',
                    padding: 'var(--spacing-sm)',
                    border: '1px solid var(--border)',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: 'var(--bg)',
                    color: 'var(--fg)',
                    fontSize: 'var(--font-size-sm)',
                    fontFamily: 'var(--font-family)'
                  }}
                />
              </div>
            )}
            
            {/* Session Token */}
            {authMode === 'session_token' && (
              <div>
                <label style={{
                  display: 'block',
                  fontSize: 'var(--font-size-sm)',
                  fontWeight: 'var(--font-weight-medium)',
                  marginBottom: 'var(--spacing-xs)',
                  color: 'var(--fg)'
                }}>
                  Session Token
                </label>
                <Textbox
                  value={sessionToken}
                  onValueInput={setSessionToken}
                  placeholder="Coming soon"
                  disabled
                  style={{
                    width: '100%',
                    opacity: 0.6
                  }}
                />
                <div style={{
                  fontSize: 'var(--font-size-xs)',
                  color: 'var(--muted)',
                  marginTop: 'var(--spacing-xs)'
                }}>
                  Session token will be set via portal flow in the future.
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Internal API Mode Fields */}
        {connectionType === 'internal-api' && (
          <div>
            <label style={{
              display: 'block',
              fontSize: 'var(--font-size-sm)',
              fontWeight: 'var(--font-weight-medium)',
              marginBottom: 'var(--spacing-xs)',
              color: 'var(--fg)'
            }}>
              Endpoint
            </label>
            <Textbox
              value={internalApiUrl}
              onValueInput={setInternalApiUrl}
              placeholder="https://api.example.com/llm/endpoint"
              style={{
                width: '100%'
              }}
            />
            {/* Manifest validation warning */}
            {internalApiUrl.trim() && hasPath(internalApiUrl) && (
              <div style={{
                fontSize: 'var(--font-size-xs)',
                color: 'var(--warning)',
                marginTop: 'var(--spacing-xs)',
                padding: 'var(--spacing-xs)',
                backgroundColor: 'var(--hint-bg)',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--warning)'
              }}>
                <strong>Manifest Warning:</strong> The URL includes a path. The manifest.json <code>networkAccess.allowedDomains</code> requires only the origin (scheme + host), not the full path. Ensure <code>package.json</code> includes: <code>{getOriginFromUrl(internalApiUrl) || 'origin'}</code>
              </div>
            )}
            {/* Origin display for manifest validation */}
            {internalApiUrl.trim() && getOriginFromUrl(internalApiUrl) && (
              <div style={{
                fontSize: 'var(--font-size-xs)',
                color: 'var(--fg-secondary)',
                marginTop: 'var(--spacing-xs)'
              }}>
                Origin for manifest: <code style={{ fontFamily: 'monospace', backgroundColor: 'var(--bg-secondary)', padding: '2px 4px', borderRadius: '2px' }}>{getOriginFromUrl(internalApiUrl)}</code>
              </div>
            )}
          </div>
        )}
        
            {/* Test Connection Button */}
            <div style={{ marginTop: 'var(--spacing-md)' }}>
              <Button
                onClick={handleTest}
                disabled={
                  (connectionType === 'proxy' && !proxyBaseUrl.trim()) ||
                  (connectionType === 'internal-api' && !internalApiUrl.trim()) ||
                  isTesting
                }
                style={{
                  width: '100%'
                }}
              >
                {isTesting ? 'Testing...' : 'Test Connection'}
              </Button>
            </div>
          </div>
        ) : null}
        
        {/* Test Status */}
        {testStatus && (
          <div>
            <div style={{
              padding: 'var(--spacing-sm)',
              backgroundColor: testStatus.success ? 'var(--success)' : 'var(--error)',
              color: '#ffffff',
              borderRadius: 'var(--radius-sm)',
              fontSize: 'var(--font-size-xs)',
              marginBottom: testDiagnostics ? 'var(--spacing-sm)' : 0
            }}>
              {testStatus.success ? '✓ ' : '✗ '}
              {testStatus.message}
            </div>
            
            {/* Diagnostics Panel - only show for Internal API mode */}
            {testDiagnostics && connectionType === 'internal-api' && (
              <div style={{
                padding: 'var(--spacing-sm)',
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                fontSize: 'var(--font-size-xs)',
                fontFamily: 'monospace',
                color: 'var(--fg)',
                marginTop: 'var(--spacing-xs)'
              }}>
                <div style={{
                  fontWeight: 'var(--font-weight-semibold)',
                  marginBottom: 'var(--spacing-xs)',
                  color: 'var(--fg)',
                  fontFamily: 'var(--font-family)'
                }}>
                  Diagnostics:
                </div>
                <div style={{ marginBottom: 'var(--spacing-xs)' }}>
                  <strong>Fetch URL:</strong> {testDiagnostics.url || 'N/A'}
                </div>
                {testDiagnostics.url && getOriginFromUrl(testDiagnostics.url) && (
                  <div style={{ marginBottom: 'var(--spacing-xs)' }}>
                    <strong>Origin (for manifest):</strong> <code style={{ fontFamily: 'monospace', backgroundColor: 'var(--bg)', padding: '2px 4px', borderRadius: '2px' }}>{getOriginFromUrl(testDiagnostics.url)}</code>
                  </div>
                )}
                <div style={{ marginBottom: 'var(--spacing-xs)' }}>
                  <strong>Method:</strong> {testDiagnostics.method || 'N/A'}
                </div>
                {testDiagnostics.headers && (
                  <div style={{ marginBottom: 'var(--spacing-xs)' }}>
                    <strong>Headers:</strong>
                    <div style={{
                      marginTop: 'var(--spacing-xs)',
                      padding: 'var(--spacing-xs)',
                      backgroundColor: 'var(--bg)',
                      borderRadius: 'var(--radius-sm)',
                      fontFamily: 'monospace',
                      fontSize: 'var(--font-size-xs)'
                    }}>
                      {Object.entries(testDiagnostics.headers).map(([key, value]) => (
                        <div key={key}>{key}: {value}</div>
                      ))}
                    </div>
                  </div>
                )}
                {testDiagnostics.credentials !== undefined && (
                  <div style={{ marginBottom: 'var(--spacing-xs)' }}>
                    <strong>Credentials:</strong> {testDiagnostics.credentials}
                  </div>
                )}
                {testDiagnostics.statusCode !== undefined && (
                  <div style={{ marginBottom: 'var(--spacing-xs)' }}>
                    <strong>Status Code:</strong> {testDiagnostics.statusCode}
                  </div>
                )}
                {testDiagnostics.responseBody && (
                  <div style={{ marginBottom: 'var(--spacing-xs)' }}>
                    <strong>Response Body (first 300 chars):</strong>
                    <div style={{
                      marginTop: 'var(--spacing-xs)',
                      padding: 'var(--spacing-xs)',
                      backgroundColor: 'var(--bg)',
                      borderRadius: 'var(--radius-sm)',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      maxHeight: '150px',
                      overflowY: 'auto'
                    }}>
                      {testDiagnostics.responseBody}
                    </div>
                  </div>
                )}
                {testDiagnostics.errorName && (
                  <div style={{ marginBottom: 'var(--spacing-xs)' }}>
                    <strong>Error Name:</strong> {testDiagnostics.errorName}
                  </div>
                )}
                {testDiagnostics.errorMessage && (
                  <div style={{ marginBottom: 'var(--spacing-xs)' }}>
                    <strong>Error Message:</strong>
                    <div style={{
                      marginTop: 'var(--spacing-xs)',
                      padding: 'var(--spacing-xs)',
                      backgroundColor: 'var(--bg)',
                      borderRadius: 'var(--radius-sm)',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word'
                    }}>
                      {testDiagnostics.errorMessage}
                    </div>
                  </div>
                )}
                {testDiagnostics.errorName && (
                  <div style={{
                    marginTop: 'var(--spacing-xs)',
                    padding: 'var(--spacing-xs)',
                    backgroundColor: 'var(--hint-bg)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: 'var(--font-size-xs)',
                    fontFamily: 'var(--font-family)',
                    color: 'var(--fg)'
                  }}>
                    <strong>Hint:</strong> This is commonly caused by CORS or a missing/incorrect <code>networkAccess.allowedDomains</code> origin in <code>manifest.json</code>. Ensure the origin (scheme + host) is listed in <code>package.json</code> under <code>figma-plugin.networkAccess.allowedDomains</code>.
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        
        {/* Buttons */}
        <div style={{
          display: 'flex',
          gap: 'var(--spacing-sm)',
          justifyContent: 'flex-end',
          marginTop: 'var(--spacing-sm)'
        }}>
          <button
            onClick={handleCancel}
            style={{
              padding: 'var(--spacing-sm) var(--spacing-md)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--surface-modal)',
              color: 'var(--fg)',
              cursor: 'pointer',
              fontSize: 'var(--font-size-sm)',
              fontFamily: 'var(--font-family)',
              fontWeight: 'var(--font-weight-medium)',
              transition: 'background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease',
              outline: 'none',
              height: '32px',
              minHeight: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            onFocus={(e) => {
              e.currentTarget.style.outline = '2px solid var(--accent)'
              e.currentTarget.style.outlineOffset = '2px'
            }}
            onBlur={(e) => {
              e.currentTarget.style.outline = 'none'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--surface-row-hover)'
              e.currentTarget.style.borderColor = 'var(--border)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'var(--surface-modal)'
              e.currentTarget.style.borderColor = 'var(--border-subtle)'
            }}
          >
            Cancel
          </button>
          <Button
            onClick={handleSave}
            disabled={
              (connectionType === 'proxy' && !proxyBaseUrl.trim()) ||
              (connectionType === 'internal-api' && !internalApiUrl.trim())
            }
            style={{
              height: '32px',
              minHeight: '32px',
              borderRadius: 'var(--radius-sm)',
              padding: 'var(--spacing-sm) var(--spacing-md)',
              fontSize: 'var(--font-size-sm)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            Save
          </Button>
        </div>
      </div>
    </div>
  )
}
