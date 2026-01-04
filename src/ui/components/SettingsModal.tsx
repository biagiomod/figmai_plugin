import { h } from 'preact'
import { useState, useEffect, useCallback } from 'preact/hooks'
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
  }, [])
  
  const handleSave = useCallback(() => {
    const settings: Partial<Settings> = {
      proxyBaseUrl: proxyBaseUrl.trim(),
      authMode,
      sharedToken: authMode === 'shared_token' ? sharedToken.trim() : undefined,
      sessionToken: authMode === 'session_token' ? sessionToken.trim() : undefined,
      defaultModel: defaultModel.trim() || 'gpt-4.1-mini'
    }
    
    emit<SaveSettingsHandler>('SAVE_SETTINGS', settings)
    onClose()
  }, [proxyBaseUrl, authMode, sharedToken, sessionToken, defaultModel, onClose])
  
  const handleTest = useCallback(() => {
    setIsTesting(true)
    setTestStatus(null)
    
    // Save settings first, then test
    const settings: Partial<Settings> = {
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
  }, [proxyBaseUrl, authMode, sharedToken, sessionToken, defaultModel])
  
  return (
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
    }} onClick={onClose}>
      <div style={{
        backgroundColor: 'var(--bg)',
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--spacing-lg)',
        maxWidth: '400px',
        width: '90%',
        maxHeight: '90vh',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--spacing-md)'
      }} onClick={e => e.stopPropagation()}>
        <div style={{
          fontSize: 'var(--font-size-lg)',
          fontWeight: 'var(--font-weight-semibold)',
          marginBottom: 'var(--spacing-sm)'
        }}>
          Settings
        </div>
        
        {/* Mode Selection */}
        {currentMode !== undefined && onModeChange && (
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
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
              <button
                onClick={() => onModeChange('simple')}
                style={{
                  padding: 'var(--spacing-sm) var(--spacing-md)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: currentMode === 'simple' ? 'var(--accent)' : 'var(--bg-secondary)',
                  color: currentMode === 'simple' ? '#ffffff' : 'var(--fg)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontFamily: 'var(--font-family)',
                  fontSize: 'var(--font-size-sm)'
                }}
              >
                Simple
              </button>
              <button
                onClick={() => onModeChange('advanced')}
                style={{
                  padding: 'var(--spacing-sm) var(--spacing-md)',
                  border: '1px solid var(--border)',
                  borderRadius: 'var(--radius-sm)',
                  backgroundColor: currentMode === 'advanced' ? 'var(--accent)' : 'var(--bg-secondary)',
                  color: currentMode === 'advanced' ? '#ffffff' : 'var(--fg)',
                  cursor: 'pointer',
                  textAlign: 'left',
                  fontFamily: 'var(--font-family)',
                  fontSize: 'var(--font-size-sm)'
                }}
              >
                Advanced
              </button>
            </div>
          </div>
        )}
        
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
          <Button
            onClick={onClose}
            secondary
          >
            Cancel
          </Button>
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
