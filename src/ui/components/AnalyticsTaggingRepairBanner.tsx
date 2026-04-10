/**
 * AT-A Repair Banner
 * Amber banner shown above the table (or empty state) when near-miss annotation
 * category labels are detected. Two visual states:
 *   - hasRows: slim compact banner (mixed state)
 *   - !hasRows: expanded banner with per-node list (zero-valid state)
 */

import { h } from 'preact'
import type { NearMissInfo } from '../../core/types'

interface AnalyticsTaggingRepairBannerProps {
  nearMisses: NearMissInfo[]
  /** true when the table already has valid rows (mixed state) */
  hasRows: boolean
  /** Called when user clicks Fix / Fix & Re-scan */
  onFix: () => void
  /** Called when user clicks dismiss / ✕ */
  onDismiss: () => void
  /** true while fix is in progress (disables button, shows loading text) */
  isFixing?: boolean
}

export function AnalyticsTaggingRepairBanner({
  nearMisses,
  hasRows,
  onFix,
  onDismiss,
  isFixing = false
}: AnalyticsTaggingRepairBannerProps) {
  if (nearMisses.length === 0) return null

  const n = nearMisses.length

  if (hasRows) {
    // Mixed state: slim compact banner
    // Build compact label pairs: "Screen ID → ScreenID, action id → ActionID"
    const labelPairs = Array.from(
      new Map(nearMisses.map(m => [m.nearMissLabel, m.canonicalLabel])).entries()
    ).map(([found, canonical]) => `${found} → ${canonical}`)
    const pairsText = labelPairs.join(', ')

    return (
      <div style={{
        background: '#fffbeb',
        borderBottom: '1px solid #fde68a',
        padding: '8px 12px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '8px',
        fontSize: '11px',
        color: '#92400e',
        flexShrink: 0
      }}>
        <span style={{ marginTop: '1px' }} aria-hidden="true">⚠</span>
        <span style={{ flex: 1, lineHeight: '1.5' }}>
          <strong>{n} annotation(s) skipped</strong> — category name has a spacing or casing issue
          {' '}(<em>{pairsText}</em>).
          {' '}Fix them to include all tagged elements.
        </span>
        <div style={{ display: 'flex', gap: '6px', flexShrink: 0, marginTop: '1px' }}>
          <button
            onClick={onFix}
            disabled={isFixing}
            style={{
              fontSize: '11px',
              padding: '3px 10px',
              background: isFixing ? '#c97a3a' : '#d97706',
              color: '#fff',
              borderRadius: '4px',
              border: 'none',
              whiteSpace: 'nowrap',
              cursor: isFixing ? 'not-allowed' : 'pointer',
              opacity: isFixing ? 0.7 : 1
            }}
          >
            {isFixing ? 'Fixing…' : `Fix (${n})`}
          </button>
          <button
            onClick={onDismiss}
            disabled={isFixing}
            style={{
              fontSize: '11px',
              padding: '3px 6px',
              background: 'transparent',
              border: 'none',
              color: '#b45309',
              cursor: isFixing ? 'not-allowed' : 'pointer',
              lineHeight: 1,
              opacity: isFixing ? 0.5 : 1
            }}
          >
            ✕
          </button>
        </div>
      </div>
    )
  }

  // Zero-valid state: expanded banner with per-node list
  return (
    <div style={{
      background: '#fef3c7',
      borderBottom: '1px solid #fcd34d',
      padding: '10px 12px',
      fontSize: '11px',
      color: '#78350f',
      flexShrink: 0
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
        <span style={{ marginTop: '1px', fontSize: '13px' }} aria-hidden="true">⚠</span>
        <div style={{ flex: 1 }}>
          <strong>No valid annotations found — {n} near-miss(es) detected.</strong>
          <div style={{ marginTop: '4px', lineHeight: '1.6' }}>
            These annotations were skipped because the category name doesn't match the required format:
          </div>
          <div style={{
            marginTop: '6px',
            background: '#fde68a',
            borderRadius: '4px',
            padding: '6px 8px',
            lineHeight: '1.8'
          }}>
            {nearMisses.map((m) => (
              <div key={`${m.nodeId}:${m.canonicalLabel}`}>
                · <strong>{m.nodeName}</strong> — <em>"{m.nearMissLabel}"</em> → should be <em>"{m.canonicalLabel}"</em>
              </div>
            ))}
          </div>
          <div style={{ marginTop: '8px', display: 'flex', gap: '8px' }}>
            <button
              onClick={onFix}
              disabled={isFixing}
              style={{
                fontSize: '11px',
                padding: '5px 14px',
                background: isFixing ? '#c97a3a' : '#b45309',
                color: '#fff',
                border: 'none',
                borderRadius: '4px',
                cursor: isFixing ? 'not-allowed' : 'pointer',
                opacity: isFixing ? 0.7 : 1
              }}
            >
              {isFixing ? 'Fixing…' : `Fix & Re-scan (${n})`}
            </button>
            <button
              onClick={onDismiss}
              disabled={isFixing}
              style={{
                fontSize: '11px',
                padding: '5px 10px',
                background: '#fff',
                border: '1px solid #d1d5db',
                color: '#374151',
                borderRadius: '4px',
                cursor: isFixing ? 'not-allowed' : 'pointer',
                opacity: isFixing ? 0.5 : 1
              }}
            >
              Dismiss
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
