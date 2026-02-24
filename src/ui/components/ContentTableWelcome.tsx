/**
 * CT-A Welcome screen — shown when no table/session exists.
 * Displays greeting + instruction copy + Generate Table CTA.
 */

import { h } from 'preact'
import { CTA_DISPLAY_NAME } from './contentTableUiLabels'

interface ContentTableWelcomeProps {
  hasSelection: boolean
  onGenerate: () => void
}

export function ContentTableWelcome({ hasSelection, onGenerate }: ContentTableWelcomeProps) {
  return (
    <div data-assistant="content_table" style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      flex: 1,
      padding: '32px 24px',
      gap: '16px',
      textAlign: 'center'
    }}>
      <div style={{ fontSize: '20px', fontWeight: 600, color: 'var(--fg)' }}>
        {CTA_DISPLAY_NAME}
      </div>
      <div style={{ fontSize: '13px', color: 'var(--fg-secondary)', maxWidth: '320px', lineHeight: '1.5' }}>
        Select one or more containers in your design, then generate a structured content inventory.
        You can edit cells inline, append more selections, and export to clipboard or stage.
      </div>
      <button
        data-ct-button="generate"
        onClick={onGenerate}
        disabled={!hasSelection}
        style={{
          marginTop: '8px',
          padding: '10px 24px',
          border: 'none',
          borderRadius: 'var(--radius-sm)',
          backgroundColor: hasSelection ? 'var(--accent)' : 'var(--muted)',
          color: hasSelection ? 'var(--accent-text)' : '#ffffff',
          cursor: hasSelection ? 'pointer' : 'not-allowed',
          fontSize: '13px',
          fontWeight: 600,
          opacity: 1
        }}
      >
        Generate Table
      </button>
      {!hasSelection && (
        <div data-ct-helper style={{ fontSize: '11px' }}>
          Select a frame or container to get started.
        </div>
      )}
    </div>
  )
}
