/**
 * Design Workshop Panel — Command Center UX
 *
 * Replaces the generic chat input area when the design_workshop assistant is active.
 * Provides:
 *  - Prompt textarea with Jazz-styled prompt chips
 *  - Generate button (sends SEND_MESSAGE with the prompt)
 *  - Demo toggle button (emits RUN_QUICK_ACTION with 'demo-screens')
 *  - Loading state from activeStatus
 */

import { h } from 'preact'
import { useState, useCallback } from 'preact/hooks'

interface DesignWorkshopPanelProps {
  isGenerating: boolean
  onGenerate: (prompt: string) => void
  onDemoMode: () => void
  onNewPrompt: () => void
  exportHtml?: string | null
  onExportHtml: () => void
}

const PROMPT_CHIPS = ['Mobile', 'Onboarding', 'Dashboard', 'Login', 'Settings', 'FinTech']

const JAZZ_BLUE = '#005EB8'
const JAZZ_GREEN = '#128842'
const JAZZ_TEXT = '#101820'
const JAZZ_MUTED = '#676C6F'
const JAZZ_BORDER = '#D4D4D4'
const JAZZ_SURFACE1 = '#F5F7F8'
const JAZZ_ICON_BG = '#E8F0FA'

export function DesignWorkshopPanel({ isGenerating, onGenerate, onDemoMode, onNewPrompt, exportHtml, onExportHtml }: DesignWorkshopPanelProps) {
  const [prompt, setPrompt] = useState('')
  const [demoActive, setDemoActive] = useState(false)

  const handleGenerate = useCallback(() => {
    if (demoActive) {
      onDemoMode()
      return
    }
    const trimmed = prompt.trim()
    if (!trimmed) return
    onGenerate(trimmed)
  }, [prompt, demoActive, onGenerate, onDemoMode])

  const handleChipClick = useCallback((chip: string) => {
    setPrompt(prev => {
      const trimmed = prev.trim()
      if (!trimmed) return chip
      if (trimmed.toLowerCase().includes(chip.toLowerCase())) return prev
      return `${trimmed} ${chip}`
    })
  }, [])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !isGenerating) {
      e.preventDefault()
      handleGenerate()
    }
  }, [handleGenerate, isGenerating])

  const canGenerate = demoActive || prompt.trim().length > 0

  return (
    <div style={{
      borderTop: '1px solid ' + JAZZ_BORDER,
      padding: '12px',
      backgroundColor: '#ffffff',
      flexShrink: 0,
      display: 'flex',
      flexDirection: 'column',
      gap: '8px'
    }}>
      {/* Header row */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '2px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          <span style={{ fontSize: '11px', fontWeight: 600, color: JAZZ_TEXT }}>Design Workshop</span>
          <span style={{
            background: JAZZ_ICON_BG,
            color: JAZZ_BLUE,
            fontSize: '9px',
            fontWeight: 600,
            padding: '1px 6px',
            borderRadius: '2px',
            letterSpacing: '0.04em'
          }}>Jazz DS</span>
        </div>
      </div>

      {/* Prompt textarea */}
      <textarea
        value={prompt}
        onInput={(e) => setPrompt((e.target as HTMLTextAreaElement).value)}
        onKeyDown={handleKeyDown}
        disabled={isGenerating || demoActive}
        placeholder={demoActive ? 'Demo mode active — FiFi FinTech preset will be used' : 'Describe the screens you want to generate…'}
        rows={3}
        style={{
          width: '100%',
          fontSize: '11px',
          fontFamily: 'var(--font-family)',
          color: (isGenerating || demoActive) ? JAZZ_MUTED : JAZZ_TEXT,
          backgroundColor: (demoActive) ? JAZZ_SURFACE1 : '#ffffff',
          border: '1px solid ' + JAZZ_BORDER,
          borderRadius: '4px',
          padding: '8px 10px',
          resize: 'none',
          outline: 'none',
          lineHeight: '1.5',
          boxSizing: 'border-box',
          cursor: (isGenerating || demoActive) ? 'not-allowed' : 'text',
          opacity: (isGenerating || demoActive) ? 0.7 : 1
        }}
      />

      {/* Prompt chips */}
      {!demoActive && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
          {PROMPT_CHIPS.map(chip => (
            <button
              key={chip}
              type="button"
              onClick={() => handleChipClick(chip)}
              disabled={isGenerating}
              style={{
                background: JAZZ_ICON_BG,
                color: JAZZ_BLUE,
                border: 'none',
                borderRadius: '2px',
                fontSize: '9px',
                fontWeight: 600,
                padding: '2px 7px',
                cursor: isGenerating ? 'not-allowed' : 'pointer',
                fontFamily: 'var(--font-family)',
                opacity: isGenerating ? 0.5 : 1
              }}
            >
              {chip}
            </button>
          ))}
        </div>
      )}

      {/* Action row */}
      <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
        {/* Generate / Run Demo button */}
        <button
          type="button"
          onClick={handleGenerate}
          disabled={isGenerating || !canGenerate}
          style={{
            flex: 1,
            backgroundColor: isGenerating
              ? JAZZ_BORDER
              : demoActive
                ? JAZZ_GREEN
                : JAZZ_BLUE,
            color: '#ffffff',
            border: 'none',
            borderRadius: '4px',
            fontSize: '11px',
            fontWeight: 600,
            padding: '8px 12px',
            cursor: (isGenerating || !canGenerate) ? 'not-allowed' : 'pointer',
            fontFamily: 'var(--font-family)',
            opacity: !canGenerate && !isGenerating ? 0.5 : 1,
            transition: 'background-color 0.15s'
          }}
        >
          {isGenerating ? 'Generating…' : demoActive ? 'Run Demo' : 'Generate Screens'}
        </button>

        {/* Demo toggle */}
        <button
          type="button"
          onClick={() => setDemoActive(d => !d)}
          disabled={isGenerating}
          title={demoActive ? 'Demo mode ON — using FiFi preset' : 'Demo mode OFF — click to enable'}
          style={{
            backgroundColor: demoActive ? JAZZ_GREEN : '#ffffff',
            color: demoActive ? '#ffffff' : JAZZ_MUTED,
            border: '1px solid ' + (demoActive ? JAZZ_GREEN : JAZZ_BORDER),
            borderRadius: '4px',
            fontSize: '9px',
            fontWeight: 700,
            padding: '8px 10px',
            cursor: isGenerating ? 'not-allowed' : 'pointer',
            fontFamily: 'var(--font-family)',
            whiteSpace: 'nowrap',
            letterSpacing: '0.04em'
          }}
        >
          {demoActive ? 'DEMO ON' : 'DEMO'}
        </button>

        {/* Export HTML — only shown when export is available */}
        {exportHtml && (
          <button
            type="button"
            onClick={onExportHtml}
            style={{
              background: '#ffffff',
              color: JAZZ_BLUE,
              border: '1px solid ' + JAZZ_BORDER,
              borderRadius: '4px',
              fontSize: '9px',
              fontWeight: 600,
              padding: '8px 10px',
              cursor: 'pointer',
              fontFamily: 'var(--font-family)',
              whiteSpace: 'nowrap'
            }}
          >
            Export HTML
          </button>
        )}
      </div>

      {/* New prompt link — shown when not generating */}
      {!isGenerating && (
        <div style={{ textAlign: 'center' }}>
          <button
            type="button"
            onClick={onNewPrompt}
            style={{
              background: 'none',
              border: 'none',
              color: JAZZ_MUTED,
              fontSize: '10px',
              cursor: 'pointer',
              padding: '2px 4px',
              fontFamily: 'var(--font-family)'
            }}
          >
            Clear prompt
          </button>
        </div>
      )}
    </div>
  )
}
