/**
 * AT-A Welcome screen — shown when no session/rows exist.
 * Mirrors ContentTableWelcome layout: centered greeting + CTA.
 */

import { h } from 'preact'
import { AnalyticsTaggingRepairBanner } from './AnalyticsTaggingRepairBanner'
import type { NearMissInfo } from '../../core/types'

interface AnalyticsTaggingWelcomeProps {
  hasSelection: boolean
  onGetTags: () => void
  nearMisses: NearMissInfo[]
  onFixNearMisses: () => void
  onDismissNearMisses: () => void
  isFixingNearMisses: boolean
}

export function AnalyticsTaggingWelcome({
  hasSelection,
  onGetTags,
  nearMisses,
  onFixNearMisses,
  onDismissNearMisses,
  isFixingNearMisses
}: AnalyticsTaggingWelcomeProps) {
  return (
    <div data-assistant="analytics_tagging" style={{ display: 'flex', flexDirection: 'column', flex: 1 }}>
      {nearMisses.length > 0 && (
        <AnalyticsTaggingRepairBanner
          nearMisses={nearMisses}
          hasRows={false}
          onFix={onFixNearMisses}
          onDismiss={onDismissNearMisses}
          isFixing={isFixingNearMisses}
        />
      )}
      <div style={{
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
          Analytics Tagging
        </div>
        <div style={{ fontSize: '13px', color: 'var(--fg-secondary)', maxWidth: '320px', lineHeight: '1.5' }}>
          Select one or more frames with a <strong>ScreenID</strong> annotation,
          then scan for <strong>ActionID</strong> tags. You can edit cells inline,
          append more selections, and export to clipboard or stage.
        </div>
        <button
          data-at-button="get-tags"
          onClick={onGetTags}
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
          Get Analytics Tags
        </button>
        {!hasSelection && (
          <div data-at-helper style={{ fontSize: '11px' }}>
            Select a frame with ScreenID to get started.
          </div>
        )}
      </div>
    </div>
  )
}
