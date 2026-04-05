/**
 * Design Workshop Panel — Command Center UX
 *
 * Layout:
 *   Header row: title | [scan icon] [Demo toggle] [Jazz/Wireframe toggle]
 *   Textarea (controlled prompt from ui.tsx)
 *   Chips row: scan summary chip OR prompt chips
 *   Demo tag row (when demo active)
 *   HTML export button (when available)
 *
 * Generation is triggered by the Send button in BottomToolbar, not here.
 * Prompt, demoActive, demoTag are controlled by parent (ui.tsx).
 */
import { h } from 'preact'
import { useCallback } from 'preact/hooks'

type DemoTag = 'dashboard' | 'positions' | 'flow' | 'exact'

export interface DesignWorkshopPanelProps {
  isGenerating: boolean
  // Controlled by parent
  prompt: string
  onPromptChange: (prompt: string) => void
  demoActive: boolean
  onDemoActiveChange: (active: boolean) => void
  demoTag: DemoTag
  onDemoTagChange: (tag: DemoTag) => void
  // HTML export
  exportHtml?: string | null
  onExportHtml: () => void
  // Mode
  designMode: 'jazz' | 'wireframe'
  onDesignModeChange: (mode: 'jazz' | 'wireframe') => void
  // Scan
  hasScanContext: boolean
  scanSummary?: string | null
  onScan: () => void
  onClearScan: () => void
  hasSelection: boolean
}

const PROMPT_CHIPS = ['Mobile', 'Onboarding', 'Dashboard', 'Login', 'Settings', 'FinTech']

const DEMO_TAGS: Array<{ key: DemoTag; label: string }> = [
  { key: 'dashboard', label: 'Dashboard' },
  { key: 'positions', label: 'Positions' },
  { key: 'flow',      label: 'Flow' },
  { key: 'exact',     label: 'Exact' },
]

const JAZZ_BLUE    = '#005EB8'
const JAZZ_GREEN   = '#128842'
const JAZZ_TEXT    = '#0F171F'
const JAZZ_MUTED   = '#5B6C7B'
const JAZZ_BORDER  = '#E2E4E5'
const JAZZ_SURFACE1 = '#F5F7F8'
const JAZZ_ICON_BG = '#E8F0FA'

function ScanIcon({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M2.99994 15.25C3.41415 15.25 3.74994 15.5858 3.74994 16V20.25H7.99994C8.41415 20.25 8.74994 20.5858 8.74994 21C8.74994 21.4142 8.41415 21.75 7.99994 21.75H2.99994C2.58573 21.75 2.24994 21.4142 2.24994 21V16C2.24994 15.5858 2.58573 15.25 2.99994 15.25ZM20.9999 15.25C21.4142 15.25 21.7499 15.5858 21.7499 16V21C21.7499 21.4142 21.4142 21.75 20.9999 21.75H15.9999C15.5857 21.75 15.2499 21.4142 15.2499 21C15.2499 20.5858 15.5857 20.25 15.9999 20.25H20.2499V16C20.2499 15.5858 20.5857 15.25 20.9999 15.25ZM21.9999 11.25C22.4141 11.25 22.7499 11.5858 22.7499 12C22.7499 12.4142 22.4142 12.75 21.9999 12.75H1.99994C1.58573 12.75 1.24994 12.4142 1.24994 12C1.24995 11.5858 1.58573 11.25 1.99994 11.25H21.9999ZM7.99994 2.25C8.41415 2.25 8.74994 2.58579 8.74994 3C8.74994 3.41421 8.41415 3.75 7.99994 3.75H3.74994V8C3.74994 8.41421 3.41415 8.75 2.99994 8.75C2.58573 8.75 2.24994 8.41421 2.24994 8V3C2.24994 2.58579 2.58573 2.25 2.99994 2.25H7.99994ZM20.9999 2.25C21.4142 2.25 21.7499 2.58579 21.7499 3V8C21.7499 8.41421 21.4142 8.75 20.9999 8.75C20.5857 8.75 20.2499 8.41421 20.2499 8V3.75H15.9999C15.5857 3.75 15.2499 3.41421 15.2499 3C15.2499 2.58579 15.5857 2.25 15.9999 2.25H20.9999Z" fill={color}/>
    </svg>
  )
}

function UploadIcon({ size = 14, color = 'currentColor' }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <path d="M12 2.25012C12.4142 2.25012 12.75 2.5859 12.75 3.00012C12.75 3.41433 12.4142 3.75012 12 3.75012H3.75V17.1896L8.96973 11.9698L9.02637 11.9181C9.32095 11.6778 9.75567 11.6952 10.0303 11.9698L14 15.9396L16.4697 13.4698L16.5264 13.4181C16.8209 13.1778 17.2557 13.1952 17.5303 13.4698L20.25 16.1896V12.0001C20.25 11.5859 20.5858 11.2501 21 11.2501C21.4142 11.2501 21.75 11.5859 21.75 12.0001V21.0001C21.75 21.4143 21.4142 21.7501 21 21.7501H3C2.58579 21.7501 2.25 21.4143 2.25 21.0001V3.00012C2.25 2.5859 2.58579 2.25012 3 2.25012H12ZM4.03027 19.0304C3.94867 19.112 3.85197 19.1681 3.75 19.2042V20.2501H16.1895L9.5 13.5607L4.03027 19.0304ZM15.0605 17.0001L18.0303 19.9698C18.112 20.0515 18.169 20.148 18.2051 20.2501H20.25V18.2042C20.148 18.1681 20.0513 18.112 19.9697 18.0304L17 15.0607L15.0605 17.0001ZM17.5264 2.41809C17.8209 2.17778 18.2557 2.19524 18.5303 2.46984L21.0303 4.96984C21.3232 5.26274 21.3232 5.7375 21.0303 6.03039C20.7374 6.32328 20.2626 6.32328 19.9697 6.03039L18.75 4.81066V9.00012C18.75 9.41433 18.4142 9.75012 18 9.75012C17.5858 9.75012 17.25 9.41433 17.25 9.00012V4.81066L16.0303 6.03039C15.7374 6.32328 15.2626 6.32328 14.9697 6.03039C14.6768 5.7375 14.6768 5.26274 14.9697 4.96984L17.4697 2.46984L17.5264 2.41809Z" fill={color}/>
    </svg>
  )
}

function showDwTooltip(btn: HTMLElement, text: string): number {
  return window.setTimeout(() => {
    let tip = document.getElementById('dw-panel-tooltip')
    if (!tip) {
      tip = document.createElement('div')
      tip.id = 'dw-panel-tooltip'
      tip.style.cssText = [
        'position:fixed',
        'z-index:99999',
        'background:#1a1a1a',
        'color:#fff',
        'font-size:11px',
        'padding:5px 8px',
        'border-radius:4px',
        'max-width:180px',
        'line-height:1.4',
        'pointer-events:none',
        'box-shadow:0 2px 8px rgba(0,0,0,0.28)',
        'display:none'
      ].join(';')
      document.body.appendChild(tip)
    }
    tip.textContent = text
    const rect = btn.getBoundingClientRect()
    tip.style.left = rect.left + 'px'
    tip.style.top = (rect.bottom + 6) + 'px'
    tip.style.display = 'block'
    // Clamp to viewport
    const tipRect = tip.getBoundingClientRect()
    const overflowRight = tipRect.right - window.innerWidth + 8
    if (overflowRight > 0) {
      tip.style.left = (rect.left - overflowRight) + 'px'
    }
  }, 2500)
}

function hideDwTooltip(timerId: number) {
  clearTimeout(timerId)
  const tip = document.getElementById('dw-panel-tooltip')
  if (tip) tip.style.display = 'none'
}

export function DesignWorkshopPanel({
  isGenerating,
  prompt,
  onPromptChange,
  demoActive,
  onDemoActiveChange,
  demoTag,
  onDemoTagChange,
  exportHtml,
  onExportHtml,
  designMode,
  onDesignModeChange,
  hasScanContext,
  scanSummary,
  onScan,
  onClearScan,
  hasSelection,
}: DesignWorkshopPanelProps) {
  const isWireframe = designMode === 'wireframe'

  const handleChipClick = useCallback((chip: string) => {
    const trimmed = prompt.trim()
    if (!trimmed) { onPromptChange(chip); return }
    if (trimmed.toLowerCase().includes(chip.toLowerCase())) return
    onPromptChange(`${trimmed} ${chip}`)
  }, [prompt, onPromptChange])

  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Enter is handled by BottomToolbar Send button
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      // no-op here: Send button in BottomToolbar triggers generation
    }
  }, [])

  const handleModeToggle = useCallback(() => {
    if (isGenerating) return
    const next = isWireframe ? 'jazz' : 'wireframe'
    onDesignModeChange(next)
  }, [isWireframe, isGenerating, onDesignModeChange])

  const handleDemoToggle = useCallback(() => {
    if (isGenerating) return
    onDemoActiveChange(!demoActive)
  }, [demoActive, isGenerating, onDemoActiveChange])

  const btnBase = {
    background: 'none',
    border: '1px solid ' + JAZZ_BORDER,
    borderRadius: '4px',
    fontSize: '9px',
    fontWeight: 600,
    padding: '2px 7px',
    cursor: 'pointer' as const,
    fontFamily: 'var(--font-family)',
    display: 'flex',
    alignItems: 'center',
    gap: '3px',
    lineHeight: 1.4,
  }

  return (
    <div style={{
      borderTop: '1px solid ' + JAZZ_BORDER,
      padding: '12px 12px 0',
      backgroundColor: '#ffffff',
      flexShrink: 0,
      display: 'flex',
      flexDirection: 'column',
      gap: '8px'
    }}>

      {/* Header row: title + controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '11px', fontWeight: 600, color: JAZZ_TEXT }}>Design Workshop</span>

        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>

          {/* Demo toggle */}
          <button
            type="button"
            onClick={handleDemoToggle}
            disabled={isGenerating}
            title={demoActive ? 'Demo ON — click to disable' : 'Demo OFF — click to enable'}
            style={{
              ...btnBase,
              backgroundColor: demoActive ? JAZZ_GREEN : 'transparent',
              color: demoActive ? '#ffffff' : JAZZ_MUTED,
              borderColor: demoActive ? JAZZ_GREEN : JAZZ_BORDER,
              cursor: isGenerating ? 'not-allowed' : 'pointer',
            }}
          >
            Demo{demoActive ? ' ✓' : ''}
          </button>

          {/* Jazz DS / Wireframe mode toggle */}
          <button
            type="button"
            onClick={handleModeToggle}
            disabled={isGenerating}
            title={isWireframe ? 'Switch to Jazz DS mode' : 'Switch to Wireframe mode'}
            style={{
              ...btnBase,
              color: isWireframe ? JAZZ_MUTED : JAZZ_BLUE,
              cursor: isGenerating ? 'not-allowed' : 'pointer',
              opacity: isGenerating ? 0.5 : 1,
            }}
          >
            {isWireframe ? 'Wireframe' : 'Jazz DS'}
          </button>

          {/* Scan icon button — far right */}
          <button
            type="button"
            onClick={onScan}
            disabled={isGenerating || !hasSelection}
            onMouseEnter={(e) => {
              const btn = e.currentTarget as HTMLElement & { _dwTipTimer?: number }
              const label = !hasSelection
                ? 'Select elements to scan'
                : hasScanContext
                ? 'Re-scan selection'
                : 'Scan selected screens'
              btn._dwTipTimer = showDwTooltip(btn, label)
            }}
            onMouseLeave={(e) => {
              const btn = e.currentTarget as HTMLElement & { _dwTipTimer?: number }
              hideDwTooltip(btn._dwTipTimer ?? 0)
            }}
            style={{
              ...btnBase,
              padding: '2px 5px',
              backgroundColor: hasScanContext ? JAZZ_ICON_BG : 'transparent',
              color: hasScanContext ? JAZZ_BLUE : (hasSelection ? JAZZ_MUTED : JAZZ_BORDER),
              borderColor: hasScanContext ? JAZZ_BLUE : JAZZ_BORDER,
              opacity: (!hasSelection && !hasScanContext) ? 0.4 : 1,
              cursor: (isGenerating || !hasSelection) ? 'not-allowed' : 'pointer',
            }}
          >
            <ScanIcon size={13} color="currentColor" />
            {hasScanContext && (
              <span style={{ fontSize: '9px', fontWeight: 700, color: JAZZ_BLUE }}>✓</span>
            )}
          </button>

          {/* Export HTML icon button — shown when screens have been generated */}
          {exportHtml && (
            <button
              type="button"
              onClick={onExportHtml}
              disabled={isGenerating}
              onMouseEnter={(e) => {
                const btn = e.currentTarget as HTMLElement & { _dwTipTimer?: number }
                btn._dwTipTimer = showDwTooltip(btn, 'Export screens as HTML')
              }}
              onMouseLeave={(e) => {
                const btn = e.currentTarget as HTMLElement & { _dwTipTimer?: number }
                hideDwTooltip(btn._dwTipTimer ?? 0)
              }}
              style={{
                ...btnBase,
                padding: '2px 5px',
                backgroundColor: 'transparent',
                color: JAZZ_BLUE,
                borderColor: JAZZ_BORDER,
                cursor: isGenerating ? 'not-allowed' : 'pointer',
                opacity: isGenerating ? 0.5 : 1,
              }}
            >
              <UploadIcon size={13} color="currentColor" />
            </button>
          )}

        </div>
      </div>

      {/* Prompt textarea */}
      <textarea
        value={prompt}
        onInput={(e) => onPromptChange((e.target as HTMLTextAreaElement).value)}
        onKeyDown={handleKeyDown}
        disabled={isGenerating || demoActive}
        placeholder={
          demoActive
            ? 'Demo mode — select a preset below, then press Send'
            : hasScanContext
            ? 'Describe refinements to the scanned screens…'
            : 'Describe the screens you want to generate…'
        }
        rows={3}
        style={{
          width: '100%',
          fontSize: '11px',
          fontFamily: 'var(--font-family)',
          color: (isGenerating || demoActive) ? JAZZ_MUTED : JAZZ_TEXT,
          backgroundColor: demoActive ? JAZZ_SURFACE1 : '#ffffff',
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

      {/* Chips row: scan summary OR prompt chips */}
      {hasScanContext ? (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          background: JAZZ_ICON_BG,
          borderRadius: '4px',
          padding: '4px 8px'
        }}>
          <span style={{ color: JAZZ_BLUE, fontSize: '10px', fontWeight: 600, flex: 1 }}>
            ✓ {scanSummary ?? 'Screens scanned'}
          </span>
          <button
            type="button"
            onClick={onClearScan}
            disabled={isGenerating}
            title="Clear scan context"
            style={{
              background: 'none', border: 'none', color: JAZZ_MUTED,
              fontSize: '12px', cursor: isGenerating ? 'not-allowed' : 'pointer',
              padding: '0 2px', lineHeight: 1, fontFamily: 'var(--font-family)'
            }}
          >×</button>
        </div>
      ) : !demoActive ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
          {PROMPT_CHIPS.map(chip => (
            <button
              key={chip}
              type="button"
              onClick={() => handleChipClick(chip)}
              disabled={isGenerating}
              style={{
                background: JAZZ_ICON_BG, color: JAZZ_BLUE, border: 'none',
                borderRadius: '2px', fontSize: '9px', fontWeight: 600,
                padding: '2px 7px', cursor: isGenerating ? 'not-allowed' : 'pointer',
                fontFamily: 'var(--font-family)', opacity: isGenerating ? 0.5 : 1
              }}
            >{chip}</button>
          ))}
        </div>
      ) : null}

      {/* Demo tag row */}
      {demoActive && (
        <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
          {DEMO_TAGS.map(({ key, label }) => {
            const isActive = demoTag === key
            return (
              <button
                key={key}
                type="button"
                onClick={() => onDemoTagChange(key)}
                disabled={isGenerating}
                style={{
                  background: isActive ? JAZZ_GREEN : '#ffffff',
                  color: isActive ? '#ffffff' : JAZZ_MUTED,
                  border: '1px solid ' + (isActive ? JAZZ_GREEN : JAZZ_BORDER),
                  borderRadius: '20px', fontSize: '10px', fontWeight: 600,
                  padding: '3px 10px', cursor: isGenerating ? 'not-allowed' : 'pointer',
                  fontFamily: 'var(--font-family)', whiteSpace: 'nowrap',
                  transition: 'all 0.12s ease'
                }}
              >{label}</button>
            )
          })}
        </div>
      )}


    </div>
  )
}
