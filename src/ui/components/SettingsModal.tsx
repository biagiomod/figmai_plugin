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

interface SettingsModalProps {
  onClose: () => void
  currentMode?: Mode
  onModeChange?: (mode: Mode) => void
}

export function SettingsModal({ onClose, currentMode, onModeChange }: SettingsModalProps) {
  // Initialize mode from currentMode prop (reflects actual current mode)
  // If currentMode is not provided, fall back to localStorage, then default to 'content-mvp'
  const [mode, setMode] = useState<Mode>(() => {
    if (currentMode) {
      return currentMode
    }
    try {
      const saved = localStorage.getItem('figmai-mode')
      return (saved === 'simple' || saved === 'advanced' || saved === 'content-mvp') ? saved : 'content-mvp'
    } catch {
      return 'content-mvp'
    }
  })
  
  // Track initial mode for Cancel functionality - capture the mode at mount time
  const [initialMode] = useState<Mode>(() => {
    // Capture the mode value at initialization time (before any effects run)
    if (currentMode) {
      return currentMode
    }
    try {
      const saved = localStorage.getItem('figmai-mode')
      return (saved === 'simple' || saved === 'advanced' || saved === 'content-mvp') ? saved : 'content-mvp'
    } catch {
      return 'content-mvp'
    }
  })
  const [proxyBaseUrl, setProxyBaseUrl] = useState('')
  const [authMode, setAuthMode] = useState<'shared_token' | 'session_token'>('shared_token')
  const [sharedToken, setSharedToken] = useState('')
  const [sessionToken, setSessionToken] = useState('')
  const [defaultModel, setDefaultModel] = useState('gpt-4.1-mini')
  const [testStatus, setTestStatus] = useState<{ success: boolean; message: string } | null>(null)
  const [isTesting, setIsTesting] = useState(false)
  
  // Load settings on mount
  useEffect(() => {
    emit<RequestSettingsHandler>('REQUEST_SETTINGS')
  }, [])
  
  // Listen for test results and settings response
  useEffect(() => {
    function handleMessage(message: any) {
      if (message.type === 'TEST_RESULT') {
        setIsTesting(false)
        setTestStatus({
          success: message.success,
          message: message.message
        })
      } else if (message.type === 'SETTINGS_RESPONSE' && message.settings) {
        const settings = message.settings as Settings
        // Load from localStorage first (takes priority), then settings, then currentMode, then default to 'simple'
        // Only update mode if it's different from current to avoid unnecessary re-renders/flips
        try {
          const saved = localStorage.getItem('figmai-mode')
          const savedMode = (saved === 'simple' || saved === 'advanced') ? saved : null
          // localStorage takes priority over settings.mode
          const newMode = savedMode || settings.mode || currentMode || 'simple'
          // Only update if mode actually changed to prevent flip
          setMode(prevMode => {
            // If prevMode is already correct (matches localStorage or default), don't change
            if (prevMode === newMode) {
              return prevMode
            }
            // If localStorage exists and matches prevMode, keep it (don't override with settings.mode)
            if (savedMode && prevMode === savedMode) {
              return prevMode
            }
            return newMode
          })
        } catch {
          const newMode = settings.mode || currentMode || 'simple'
          setMode(prevMode => {
            if (prevMode !== newMode) {
              return newMode
            }
            return prevMode
          })
        }
        setProxyBaseUrl(settings.proxyBaseUrl || '')
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
      window.removeEventListener('message', onMessage)
    }
  }, [currentMode])
  
  // Update mode when currentMode prop changes (when modal reopens)
  // Only update if currentMode is provided AND different from current mode to prevent flip
  useEffect(() => {
    if (currentMode !== undefined && currentMode !== mode) {
      setMode(currentMode)
    }
  }, [currentMode, mode])
  
  // Handler for mode change that persists immediately
  const handleModeChange = useCallback((newMode: Mode) => {
    setMode(newMode)
    // Persist to localStorage immediately
    try {
      localStorage.setItem('figmai-mode', newMode)
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
      proxyBaseUrl: proxyBaseUrl.trim(),
      authMode,
      sharedToken: authMode === 'shared_token' ? sharedToken.trim() : undefined,
      sessionToken: authMode === 'session_token' ? sessionToken.trim() : undefined,
      defaultModel: defaultModel.trim() || 'gpt-4.1-mini'
    }
    
    emit<SaveSettingsHandler>('SAVE_SETTINGS', settings)
    if (onModeChange) {
      onModeChange(mode)
    }
    onClose()
  }, [mode, proxyBaseUrl, authMode, sharedToken, sessionToken, defaultModel, onClose, onModeChange])
  
  const handleTest = useCallback(() => {
    setIsTesting(true)
    setTestStatus(null)
    
    // Save settings first, then test
    const settings: Partial<Settings> = {
      mode,
      proxyBaseUrl: proxyBaseUrl.trim(),
      authMode,
      sharedToken: authMode === 'shared_token' ? sharedToken.trim() : undefined,
      sessionToken: authMode === 'session_token' ? sessionToken.trim() : undefined,
      defaultModel: defaultModel.trim() || 'gpt-4.1-mini'
    }
    
    emit<SaveSettingsHandler>('SAVE_SETTINGS', settings)
    
    // Wait a bit for settings to save, then test
    setTimeout(() => {
      emit<TestProxyConnectionHandler>('TEST_PROXY_CONNECTION')
    }, 100)
  }, [mode, proxyBaseUrl, authMode, sharedToken, sessionToken, defaultModel])
  
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'var(--overlay)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }} onClick={onClose}>
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
        
        {/* LLM Model Settings Section */}
        <div style={{
          fontSize: 'var(--font-size-md)',
          fontWeight: 'var(--font-weight-semibold)',
          marginBottom: 'var(--spacing-xs)',
          color: 'var(--fg)'
        }}>
          LLM Model Settings
        </div>
        
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
        
        {/* Test Connection Button */}
        <div>
          <Button
            onClick={handleTest}
            disabled={!proxyBaseUrl.trim() || isTesting}
            style={{
              width: '100%'
            }}
          >
            {isTesting ? 'Testing...' : 'Test Connection'}
          </Button>
        </div>
        
        {/* Test Status */}
        {testStatus && (
          <div style={{
            padding: 'var(--spacing-sm)',
            backgroundColor: testStatus.success ? 'var(--success)' : 'var(--error)',
            color: '#ffffff',
            borderRadius: 'var(--radius-sm)',
            fontSize: 'var(--font-size-xs)'
          }}>
            {testStatus.success ? '✓ ' : '✗ '}
            {testStatus.message}
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
              outline: 'none'
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
            disabled={!proxyBaseUrl.trim()}
          >
            Save
          </Button>
        </div>
      </div>
    </div>
  )
}
