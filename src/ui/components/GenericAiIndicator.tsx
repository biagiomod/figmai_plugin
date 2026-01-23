/**
 * Generic AI Indicator Component
 * 
 * Renders a vendor-neutral "AI Powered" tag in the top navigation.
 * Used for external/corporate builds where vendor-specific indicators are not appropriate.
 */

import { h } from 'preact'
import type { Mode } from '../../core/types'

interface GenericAiIndicatorProps {
  mode: Mode
}

export function GenericAiIndicator({ mode }: GenericAiIndicatorProps) {
  // Hidden in Content-MVP mode (same behavior as provider indicators)
  if (mode === 'content-mvp') {
    return null
  }

  return (
    <div style={{
      position: 'absolute',
      left: 'calc(50% - 16px)',
      transform: 'translateX(-50%)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '24px',
      padding: '0 var(--spacing-sm)',
      border: '1px solid var(--border)',
      borderRadius: 'var(--radius-sm)',
      backgroundColor: 'var(--bg)',
      color: 'var(--fg)',
      fontSize: 'var(--font-size-xs)',
      fontFamily: 'var(--font-family)',
      whiteSpace: 'nowrap'
    }}>
      AI Powered
    </div>
  )
}
