/**
 * AT-A inline table view — active state with auto-commit edits.
 *
 * Column order:
 *   # | ScreenID | Screenshot | Description | Action Type | Component |
 *   ActionID | Action Name | Figma Link | Population | Note | Tools
 *
 * Tools column: Delete + Export ref image (mirrors CT-A).
 * Editable cells auto-commit on blur (no Edit/Save/Cancel buttons).
 */

import { h } from 'preact'
import { useCallback, useState, useEffect } from 'preact/hooks'
import type { Session, Row, ActionType } from '../../core/analyticsTagging/types'
import type {
  RequestAnalyticsTaggingScreenshotHandler,
  RequestAnalyticsTaggingScreenshotByMetaHandler
} from '../../core/types'
import { emit } from '@create-figma-plugin/utilities'
import { AnalyticsTaggingRepairBanner } from './AnalyticsTaggingRepairBanner'
import type { NearMissInfo } from '../../core/types'
import { ImageDownloadIcon, CloseIcon } from '../icons'
import { TH, TD, CELL_INPUT, TOOL_BTN, actionBtnStyle } from './toolTableStyles'

const ACTION_TYPES: ActionType[] = ['Action', 'Interaction', 'Screen Event', 'Personalization Event']

interface AnalyticsTaggingViewProps {
  session: Session
  hasSelection: boolean
  onUpdateRow: (rowId: string, updates: Record<string, unknown>) => void
  onDeleteRow: (rowId: string) => void
  onAppend: () => void
  onViewOnStage?: () => void
  onCopyToClipboard: () => void
  onRestart: () => void
  onExportRowRefImage: (row: Row) => void
  isCopying: boolean
  screenshotPreviews: Record<string, string>
  screenshotErrors: Record<string, string>
  nearMisses: NearMissInfo[]
  onFixNearMisses: () => void
  onDismissNearMisses: () => void
  isFixingNearMisses: boolean
  onAddAnnotations: () => void
  isAddingAnnotations: boolean
}

export function AnalyticsTaggingView({
  session,
  hasSelection,
  onUpdateRow,
  onDeleteRow,
  onAppend,
  onViewOnStage,
  onCopyToClipboard,
  onRestart,
  onExportRowRefImage,
  isCopying,
  screenshotPreviews,
  screenshotErrors,
  nearMisses,
  onFixNearMisses,
  onDismissNearMisses,
  isFixingNearMisses,
  onAddAnnotations,
  isAddingAnnotations
}: AnalyticsTaggingViewProps) {
  const [loadingRefIds, setLoadingRefIds] = useState<Set<string>>(new Set())

  const handleRequestScreenshot = useCallback((ref: NonNullable<Row['screenshotRef']>) => {
    emit<RequestAnalyticsTaggingScreenshotHandler>('REQUEST_ANALYTICS_TAGGING_SCREENSHOT', ref)
  }, [])

  const handleRequestScreenshotByMeta = useCallback((row: Row) => {
    const meta = row.meta
    if (!meta?.containerNodeId || !meta?.targetNodeId || !meta?.rootScreenNodeId) return
    setLoadingRefIds(prev => new Set(prev).add(row.id))
    emit<RequestAnalyticsTaggingScreenshotByMetaHandler>('REQUEST_ANALYTICS_TAGGING_SCREENSHOT_BY_META', {
      rowId: row.id,
      containerNodeId: meta.containerNodeId,
      targetNodeId: meta.targetNodeId,
      rootNodeId: meta.rootScreenNodeId
    })
  }, [])

  useEffect(() => {
    setLoadingRefIds(prev => {
      let changed = false
      const next = new Set(prev)
      for (const row of session.rows) {
        const key = row.screenshotRef?.id ?? row.id
        if ((screenshotPreviews[key] || screenshotErrors[key]) && next.has(key)) {
          next.delete(key)
          changed = true
        }
      }
      return changed ? next : prev
    })
  }, [session.rows, screenshotPreviews, screenshotErrors])

  const commitField = useCallback((rowId: string, field: string, value: string) => {
    onUpdateRow(rowId, { [field]: value })
  }, [onUpdateRow])

  const textCols: Array<{ key: keyof Row; label: string; maxWidth?: number; minWidth?: number }> = [
    { key: 'screenId', label: 'ScreenID', minWidth: 140 },
    { key: 'description', label: 'Description', maxWidth: 120 },
    { key: 'component', label: 'Component' },
    { key: 'actionId', label: 'ActionID', minWidth: 140 },
    { key: 'actionName', label: 'Action Name' },
    { key: 'population', label: 'Population' },
    { key: 'note', label: 'Note', maxWidth: 120 }
  ]

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      flex: 1,
      minHeight: 0,
      padding: '8px'
    }}>
      {/* Header: title left, restart right */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
        marginBottom: '8px'
      }}>
        <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--fg)' }}>
          Analytics Tags
        </span>
        <button
          onClick={onRestart}
          title="Clear table and start over"
          style={{
            padding: '3px 8px',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: 'var(--bg-secondary)',
            color: 'var(--fg-secondary)',
            cursor: 'pointer',
            fontSize: '10px'
          }}
        >
          Restart
        </button>
      </div>

      {nearMisses.length > 0 && (
        <AnalyticsTaggingRepairBanner
          nearMisses={nearMisses}
          hasRows={session.rows.length > 0}
          onFix={onFixNearMisses}
          onDismiss={onDismissNearMisses}
          isFixing={isFixingNearMisses}
        />
      )}

      {/* Table container */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        overflowX: 'auto',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-sm)',
        minHeight: 0,
        backgroundColor: '#ffffff'
      }}>
        <table style={{ minWidth: '1100px', borderCollapse: 'collapse', fontSize: '11px', fontFamily: 'Inter, system-ui, sans-serif' }}>
          <thead>
            <tr style={{ backgroundColor: '#f5f5f5', position: 'sticky', top: 0, zIndex: 1 }}>
              <th style={{ ...TH, width: '30px' }}>#</th>
              {textCols.slice(0, 1).map(c => (
                <th key={c.key} style={{ ...TH, minWidth: c.minWidth ? `${c.minWidth}px` : '80px' }}>{c.label}</th>
              ))}
              <th style={{ ...TH, minWidth: '70px' }}>Screenshot</th>
              {textCols.slice(1, 2).map(c => (
                <th key={c.key} style={{ ...TH, minWidth: c.maxWidth ? `${c.maxWidth}px` : '80px' }}>{c.label}</th>
              ))}
              <th style={{ ...TH, minWidth: '90px' }}>Action Type</th>
              {textCols.slice(2).map(c => (
                <th key={c.key} style={{ ...TH, minWidth: c.minWidth ? `${c.minWidth}px` : (c.maxWidth ? `${c.maxWidth}px` : '80px') }}>{c.label}</th>
              ))}
              <th style={{ ...TH, minWidth: '80px' }}>Figma Link</th>
              <th style={{ ...TH, width: '64px', textAlign: 'center' }}>Tools</th>
            </tr>
          </thead>
          <tbody>
            {session.rows.map((row, idx) => {
              const previewKey = row.screenshotRef?.id ?? row.id
              const preview = screenshotPreviews[previewKey]
              const errorMsg = screenshotErrors[previewKey]
              const loading = loadingRefIds.has(previewKey)
              const canLoadByMeta = !!(row.meta?.containerNodeId && row.meta?.targetNodeId && row.meta?.rootScreenNodeId)

              return (
                <tr key={row.id} style={{ borderBottom: '1px solid #eee' }}>
                  {/* # */}
                  <td style={{ ...TD, color: '#999', fontSize: '10px' }}>{idx + 1}</td>

                  {/* ScreenID */}
                  <td style={TD}>
                    <textarea
                      defaultValue={row.screenId}
                      onBlur={(e) => {
                        const v = e.currentTarget.value
                        if (v !== row.screenId) commitField(row.id, 'screenId', v)
                      }}
                      style={{ ...CELL_INPUT, resize: 'none', overflowY: 'hidden', minHeight: '20px', lineHeight: '1.45', overflowWrap: 'anywhere', whiteSpace: 'pre-wrap', display: 'block' }}
                      ref={(el: HTMLTextAreaElement | null) => { if (el) { el.style.height = 'auto'; el.style.height = `${el.scrollHeight}px` } }}
                      onInput={(e) => { const el = e.currentTarget as HTMLTextAreaElement; el.style.height = 'auto'; el.style.height = `${el.scrollHeight}px` }}
                      onFocus={(e) => { e.currentTarget.style.borderColor = '#0d99ff'; e.currentTarget.style.backgroundColor = '#fff' }}
                      onBlurCapture={(e) => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.backgroundColor = 'transparent' }}
                    />
                  </td>

                  {/* Screenshot */}
                  <td style={TD}>
                    {preview ? (
                      <div style={{ position: 'relative', width: 50, height: 34 }}>
                        <img src={preview} alt="" style={{ width: 50, height: 34, objectFit: 'cover', borderRadius: '2px' }} />
                        {row.screenshotRef && (
                          <span style={{
                            position: 'absolute',
                            left: `${(row.screenshotRef.hotspotRatioX * 50) - 3}px`,
                            top: `${(row.screenshotRef.hotspotRatioY * 34) - 3}px`,
                            width: 6, height: 6,
                            borderRadius: '50%',
                            background: 'red',
                            border: '1px solid white'
                          }} />
                        )}
                      </div>
                    ) : loading ? (
                      <span style={{ fontSize: '10px', color: '#999' }}>Loading…</span>
                    ) : errorMsg ? (
                      <span style={{ fontSize: '10px', color: '#cc3333' }}>Failed</span>
                    ) : canLoadByMeta ? (
                      <button
                        type="button"
                        onClick={() => handleRequestScreenshotByMeta(row)}
                        style={{ fontSize: '10px', padding: '2px 4px', cursor: 'pointer', color: '#0066cc', background: 'none', border: 'none', textDecoration: 'underline' }}
                      >
                        Load
                      </button>
                    ) : row.screenshotRef ? (
                      <button
                        type="button"
                        onClick={() => handleRequestScreenshot(row.screenshotRef!)}
                        style={{ fontSize: '10px', padding: '2px 4px', cursor: 'pointer', color: '#0066cc', background: 'none', border: 'none', textDecoration: 'underline' }}
                      >
                        Load
                      </button>
                    ) : (
                      <span style={{ color: '#ccc', fontSize: '10px' }}>—</span>
                    )}
                  </td>

                  {/* Description */}
                  <td style={TD}>
                    <input
                      type="text"
                      defaultValue={row.description}
                      onBlur={(e) => {
                        const v = e.currentTarget.value
                        if (v !== row.description) commitField(row.id, 'description', v)
                      }}
                      style={CELL_INPUT}
                      onFocus={(e) => { e.currentTarget.style.borderColor = '#0d99ff'; e.currentTarget.style.backgroundColor = '#fff' }}
                      onBlurCapture={(e) => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.backgroundColor = 'transparent' }}
                    />
                  </td>

                  {/* Action Type (select) */}
                  <td style={TD}>
                    <select
                      value={row.actionType}
                      onChange={(e) => commitField(row.id, 'actionType', (e.target as HTMLSelectElement).value)}
                      style={{
                        ...CELL_INPUT,
                        cursor: 'pointer',
                        appearance: 'auto' as string
                      }}
                    >
                      {ACTION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </td>

                  {/* Component */}
                  <td style={TD}>
                    <input
                      type="text"
                      defaultValue={row.component}
                      onBlur={(e) => {
                        const v = e.currentTarget.value
                        if (v !== row.component) commitField(row.id, 'component', v)
                      }}
                      style={CELL_INPUT}
                      onFocus={(e) => { e.currentTarget.style.borderColor = '#0d99ff'; e.currentTarget.style.backgroundColor = '#fff' }}
                      onBlurCapture={(e) => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.backgroundColor = 'transparent' }}
                    />
                  </td>

                  {/* ActionID */}
                  <td style={TD}>
                    <textarea
                      defaultValue={row.actionId}
                      onBlur={(e) => {
                        const v = e.currentTarget.value
                        if (v !== row.actionId) commitField(row.id, 'actionId', v)
                      }}
                      style={{ ...CELL_INPUT, resize: 'none', overflowY: 'hidden', minHeight: '20px', lineHeight: '1.45', overflowWrap: 'anywhere', whiteSpace: 'pre-wrap', display: 'block' }}
                      ref={(el: HTMLTextAreaElement | null) => { if (el) { el.style.height = 'auto'; el.style.height = `${el.scrollHeight}px` } }}
                      onInput={(e) => { const el = e.currentTarget as HTMLTextAreaElement; el.style.height = 'auto'; el.style.height = `${el.scrollHeight}px` }}
                      onFocus={(e) => { e.currentTarget.style.borderColor = '#0d99ff'; e.currentTarget.style.backgroundColor = '#fff' }}
                      onBlurCapture={(e) => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.backgroundColor = 'transparent' }}
                    />
                  </td>

                  {/* Action Name */}
                  <td style={TD}>
                    <input
                      type="text"
                      defaultValue={row.actionName ?? ''}
                      onBlur={(e) => {
                        const v = e.currentTarget.value
                        if (v !== (row.actionName ?? '')) commitField(row.id, 'actionName', v)
                      }}
                      style={CELL_INPUT}
                      onFocus={(e) => { e.currentTarget.style.borderColor = '#0d99ff'; e.currentTarget.style.backgroundColor = '#fff' }}
                      onBlurCapture={(e) => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.backgroundColor = 'transparent' }}
                    />
                  </td>

                  {/* Population */}
                  <td style={TD}>
                    <input
                      type="text"
                      defaultValue={row.population}
                      onBlur={(e) => {
                        const v = e.currentTarget.value
                        if (v !== row.population) commitField(row.id, 'population', v)
                      }}
                      style={CELL_INPUT}
                      onFocus={(e) => { e.currentTarget.style.borderColor = '#0d99ff'; e.currentTarget.style.backgroundColor = '#fff' }}
                      onBlurCapture={(e) => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.backgroundColor = 'transparent' }}
                    />
                  </td>

                  {/* Note */}
                  <td style={TD}>
                    <input
                      type="text"
                      defaultValue={row.note}
                      onBlur={(e) => {
                        const v = e.currentTarget.value
                        if (v !== row.note) commitField(row.id, 'note', v)
                      }}
                      style={CELL_INPUT}
                      onFocus={(e) => { e.currentTarget.style.borderColor = '#0d99ff'; e.currentTarget.style.backgroundColor = '#fff' }}
                      onBlurCapture={(e) => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.backgroundColor = 'transparent' }}
                    />
                  </td>

                  {/* Figma Link */}
                  <td style={TD}>
                    {row.figmaElementLink ? (
                      <a href={row.figmaElementLink} target="_blank" rel="noopener noreferrer" style={{ color: '#0066cc', textDecoration: 'underline', fontSize: '10px' }} title={row.figmaElementLink}>
                        View in Figma
                      </a>
                    ) : (
                      <span style={{ color: '#ccc', fontSize: '10px' }}>—</span>
                    )}
                  </td>

                  {/* Tools */}
                  <td style={{ ...TD, textAlign: 'center', whiteSpace: 'nowrap' }}>
                    <button
                      onClick={() => onExportRowRefImage(row)}
                      title="Get ref image for this row"
                      style={{ ...TOOL_BTN, color: '#333333' }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#eef' }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
                    >
                      <ImageDownloadIcon width={14} height={14} />
                    </button>
                    <button
                      onClick={() => onDeleteRow(row.id)}
                      title="Delete row"
                      style={{ ...TOOL_BTN, color: '#cc3333' }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#fee' }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
                    >
                      <CloseIcon width={14} height={14} />
                    </button>
                  </td>
                </tr>
              )
            })}
            {session.rows.length === 0 && (
              <tr><td colSpan={13} style={{ padding: '16px', textAlign: 'center', color: '#999' }}>No rows. All have been deleted.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Action buttons */}
      <div style={{
        display: 'flex',
        gap: '8px',
        flexShrink: 0,
        flexWrap: 'wrap',
        marginTop: '8px'
      }}>
        <button
          onClick={onAppend}
          disabled={!hasSelection}
          title={hasSelection ? 'Scan additional screens' : 'Select frames with ScreenID first'}
          style={actionBtnStyle(!hasSelection)}
        >
          Append Selection
        </button>
        <button
          onClick={onAddAnnotations}
          disabled={!hasSelection || isAddingAnnotations}
          title={hasSelection ? 'Detect interactive elements and add placeholder annotations' : 'Select frames first'}
          style={actionBtnStyle(!hasSelection || isAddingAnnotations)}
        >
          {isAddingAnnotations ? 'Adding…' : 'Add Annotations'}
        </button>
        {onViewOnStage && (
          <button onClick={onViewOnStage} style={actionBtnStyle(false)}>
            View on Stage
          </button>
        )}
        <button onClick={onCopyToClipboard} disabled={isCopying} style={actionBtnStyle(isCopying)}>
          {isCopying ? 'Copying...' : 'Copy to Clipboard'}
        </button>
      </div>
    </div>
  )
}
