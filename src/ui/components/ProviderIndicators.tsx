/**
 * Provider-Specific Indicators Component
 * 
 * Renders vendor-specific AI model indicators (OpenAI, Claude, Copilot) in the top navigation.
 * 
 * NOTE: This component is preserved for internal builds and may be re-enabled later.
 * For external/corporate builds, use GenericAiIndicator instead.
 */

import { h } from 'preact'
import type { Mode, LlmProviderId } from '../../core/types'
import { OpenAIIcon, ClaudeIcon, CopilotIcon } from '../icons'

interface ProviderIndicatorsProps {
  mode: Mode
  provider: LlmProviderId
  onProviderClick: (providerId: LlmProviderId) => void
}

export function ProviderIndicators({ mode, provider, onProviderClick }: ProviderIndicatorsProps) {
  return (
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
          onClick={() => onProviderClick('openai')}
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
  )
}
