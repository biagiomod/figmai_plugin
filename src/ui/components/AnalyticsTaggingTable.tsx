/**
 * Analytics Tagging — selection-driven flow
 * Instruction block + table view. No draft or screenshot capture in this flow.
 */

import { h } from 'preact'
import { useCallback, useState, useEffect } from 'preact/hooks'
import type { Session, Row, ActionType } from '../../core/analyticsTagging/types'
import type { RequestAnalyticsTaggingScreenshotHandler, RequestAnalyticsTaggingScreenshotByMetaHandler, ExportAnalyticsTaggingOneRowHandler } from '../../core/types'
import type { AnalyticsTaggingExportCompactRow } from '../../core/types'
import { emit } from '@create-figma-plugin/utilities'

const ACTION_TYPES: ActionType[] = ['Action', 'Interaction', 'Screen Event', 'Personalization Event']

interface AnalyticsTaggingTableProps {
  session: Session
  onUpdateRow: (rowId: string, updates: Record<string, unknown>) => void
  screenshotPreviews: Record<string, string>
  screenshotErrors: Record<string, string>
  onExportRowThumbnail?: (row: Row, dataUrl: string) => void
  autosaveStatus: 'saved' | 'saving' | 'failed'
  warning?: string
}

export function AnalyticsTaggingTable({
  session,
  onUpdateRow,
  screenshotPreviews,
  screenshotErrors = {},
  onExportRowThumbnail,
  autosaveStatus,
  warning
}: AnalyticsTaggingTableProps) {
  const [editingRowId, setEditingRowId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<Partial<Row>>({})
  const [loadingRefIds, setLoadingRefIds] = useState<Set<string>>(new Set())

  const handleCopyLink = useCallback((url: string) => {
    if (!url) return
    navigator.clipboard.writeText(url).catch(() => {})
  }, [])

  const handleRequestScreenshot = useCallback((ref: NonNullable<Row['screenshotRef']>) => {
    emit<RequestAnalyticsTaggingScreenshotHandler>('REQUEST_ANALYTICS_TAGGING_SCREENSHOT', ref)
  }, [])

  const handleRequestScreenshotByMeta = useCallback((row: Row) => {
    const meta = row.meta
    if (!meta?.containerNodeId || !meta?.targetNodeId || !meta?.rootScreenNodeId) return
    const refId = row.id
    setLoadingRefIds(prev => new Set(prev).add(refId))
    emit<RequestAnalyticsTaggingScreenshotByMetaHandler>('REQUEST_ANALYTICS_TAGGING_SCREENSHOT_BY_META', {
      rowId: row.id,
      containerNodeId: meta.containerNodeId,
      targetNodeId: meta.targetNodeId,
      rootNodeId: meta.rootScreenNodeId
    })
  }, [])

  const handleExportRow = useCallback((row: Row) => {
    const compact: AnalyticsTaggingExportCompactRow = {
      rowId: row.id,
      screenId: row.screenId,
      actionId: row.actionId,
      meta: row.meta ? { containerNodeId: row.meta.containerNodeId, targetNodeId: row.meta.targetNodeId, rootScreenNodeId: row.meta.rootScreenNodeId } : undefined,
      screenshotRef: row.screenshotRef ? { containerNodeId: row.screenshotRef.containerNodeId, targetNodeId: row.screenshotRef.targetNodeId, rootNodeId: row.screenshotRef.rootNodeId } : undefined
    }
    emit<ExportAnalyticsTaggingOneRowHandler>('EXPORT_ANALYTICS_TAGGING_ONE_ROW', { row: compact })
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

  const startEdit = useCallback((row: Row) => {
    setEditingRowId(row.id)
    setEditDraft({
      screenId: row.screenId,
      description: row.description,
      actionType: row.actionType,
      component: row.component,
      actionId: row.actionId,
      actionName: row.actionName ?? '',
      population: row.population,
      note: row.note
    })
  }, [])

  const saveEdit = useCallback(() => {
    if (!editingRowId) return
    onUpdateRow(editingRowId, editDraft)
    setEditingRowId(null)
    setEditDraft({})
  }, [editingRowId, editDraft, onUpdateRow])

  const cancelEdit = useCallback(() => {
    setEditingRowId(null)
    setEditDraft({})
  }, [])

  return (
    <div className="ata-root">
      <div className="ata-instructions">
        {warning && (
          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--muted)', padding: 'var(--spacing-xs)', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)' }}>
            {warning}
          </div>
        )}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 'var(--spacing-xs)' }}>
          <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--muted)' }}>
            {autosaveStatus === 'saved' && 'Saved'}
            {autosaveStatus === 'saving' && 'Saving…'}
            {autosaveStatus === 'failed' && 'Save failed'}
          </span>
        </div>
        <div style={{ padding: 'var(--spacing-md)', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
          <p style={{ margin: 0, fontSize: 'var(--font-size-sm)', color: 'var(--fg)' }}>
            Select one or more frames or components with a <strong>ScreenID</strong> annotation, then run <strong>Get Analytics Tags</strong>.
          </p>
        </div>
      </div>

      <div className="ata-scroll">
        <table className="ata-table" style={{ borderCollapse: 'collapse', fontSize: 'var(--font-size-xs)', color: 'var(--fg)' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              <th style={{ textAlign: 'left', padding: 'var(--spacing-xs)', color: 'var(--fg)' }}>Screen ID</th>
              <th style={{ textAlign: 'left', padding: 'var(--spacing-xs)', color: 'var(--fg)' }}>Screenshot</th>
              <th style={{ textAlign: 'left', padding: 'var(--spacing-xs)', color: 'var(--fg)' }}>Description</th>
              <th style={{ textAlign: 'left', padding: 'var(--spacing-xs)', color: 'var(--fg)' }}>Action Type</th>
              <th style={{ textAlign: 'left', padding: 'var(--spacing-xs)', color: 'var(--fg)' }}>Component</th>
              <th style={{ textAlign: 'left', padding: 'var(--spacing-xs)', color: 'var(--fg)' }}>Action ID</th>
              <th style={{ textAlign: 'left', padding: 'var(--spacing-xs)', color: 'var(--fg)' }}>Action Name</th>
              <th style={{ textAlign: 'left', padding: 'var(--spacing-xs)', color: 'var(--fg)' }}>Figma link</th>
              <th style={{ textAlign: 'left', padding: 'var(--spacing-xs)', color: 'var(--fg)' }}>Population</th>
              <th style={{ textAlign: 'left', padding: 'var(--spacing-xs)', color: 'var(--fg)' }}>Note</th>
              <th style={{ padding: 'var(--spacing-xs)', color: 'var(--fg)' }} />
            </tr>
          </thead>
          <tbody>
            {session.rows.map((row) => {
              const isEditing = editingRowId === row.id
              const previewKey = row.screenshotRef?.id ?? row.id
              const preview = screenshotPreviews[previewKey]
              const errorMsg = screenshotErrors[previewKey]
              const loading = loadingRefIds.has(previewKey)
              const canLoadByMeta = row.meta?.containerNodeId && row.meta?.targetNodeId && row.meta?.rootScreenNodeId
              return (
                <tr key={row.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: 'var(--spacing-xs)', verticalAlign: 'top', color: 'var(--fg)' }}>
                    {isEditing ? (
                      <input
                        value={editDraft.screenId ?? ''}
                        onInput={(e) => setEditDraft(d => ({ ...d, screenId: (e.target as HTMLInputElement).value }))}
                        style={{ width: '100%', fontSize: 'var(--font-size-xs)', padding: '2px 4px', color: 'var(--fg)', background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
                      />
                    ) : (
                      <span onClick={() => startEdit(row)} style={{ cursor: 'pointer' }}>{row.screenId}</span>
                    )}
                  </td>
                  <td style={{ padding: 'var(--spacing-xs)', verticalAlign: 'top', color: 'var(--fg)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, alignItems: 'flex-start' }}>
                      {preview ? (
                        <div style={{ position: 'relative', width: 60, height: 40 }}>
                          <img src={preview} alt="" style={{ width: 60, height: 40, objectFit: 'cover' }} />
                          {row.screenshotRef && (
                            <span
                              style={{
                                position: 'absolute',
                                left: `${((row.screenshotRef.hotspotRatioX) * 60) - 4}px`,
                                top: `${((row.screenshotRef.hotspotRatioY) * 40) - 4}px`,
                                width: 8,
                                height: 8,
                                borderRadius: '50%',
                                background: 'red',
                                border: '1px solid white'
                              }}
                            />
                          )}
                        </div>
                      ) : loading ? (
                        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--muted)' }}>Loading…</span>
                      ) : errorMsg ? (
                        <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--error)' }}>Failed</span>
                      ) : canLoadByMeta ? (
                        <button
                          type="button"
                          onClick={() => handleRequestScreenshotByMeta(row)}
                          style={{ fontSize: 'var(--font-size-xs)', padding: '2px 6px', cursor: 'pointer', color: 'var(--fg)', background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
                        >
                          Load thumbnail
                        </button>
                      ) : row.screenshotRef ? (
                        <button
                          type="button"
                          onClick={() => handleRequestScreenshot(row.screenshotRef!)}
                          style={{ fontSize: 'var(--font-size-xs)', padding: '2px 6px', cursor: 'pointer', color: 'var(--fg)', background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
                        >
                          Load thumbnail
                        </button>
                      ) : (
                        <span style={{ color: 'var(--muted)' }}>—</span>
                      )}
                      {onExportRowThumbnail ? (
                        preview ? (
                          <button
                            type="button"
                            onClick={() => onExportRowThumbnail(row, preview)}
                            style={{ fontSize: 'var(--font-size-xs)', padding: '2px 6px', cursor: 'pointer', color: 'var(--fg)', background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
                          >
                            Export
                          </button>
                        ) : (
                          <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            <button
                              type="button"
                              disabled
                              style={{ fontSize: 'var(--font-size-xs)', padding: '2px 6px', cursor: 'not-allowed', color: 'var(--muted)', background: 'var(--bg-secondary)', border: '1px solid var(--border)', opacity: 0.7 }}
                            >
                              Export
                            </button>
                            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--muted)' }}>Load thumbnail first</span>
                          </span>
                        )
                      ) : null}
                    </div>
                  </td>
                  <td style={{ padding: 'var(--spacing-xs)', verticalAlign: 'top', maxWidth: 80, color: 'var(--fg)' }}>
                    {isEditing ? (
                      <input
                        value={editDraft.description ?? ''}
                        onInput={(e) => setEditDraft(d => ({ ...d, description: (e.target as HTMLInputElement).value }))}
                        style={{ width: '100%', fontSize: 'var(--font-size-xs)', padding: '2px 4px', color: 'var(--fg)', background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
                      />
                    ) : (
                      <span onClick={() => startEdit(row)} style={{ cursor: 'pointer' }}>{row.description || '—'}</span>
                    )}
                  </td>
                  <td style={{ padding: 'var(--spacing-xs)', verticalAlign: 'top', color: 'var(--fg)' }}>
                    {isEditing ? (
                      <select
                        value={editDraft.actionType ?? 'Action'}
                        onChange={(e) => setEditDraft(d => ({ ...d, actionType: (e.target as HTMLSelectElement).value as ActionType }))}
                        style={{ fontSize: 'var(--font-size-xs)', padding: '2px 4px', color: 'var(--fg)', background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
                      >
                        {ACTION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    ) : (
                      <span onClick={() => startEdit(row)} style={{ cursor: 'pointer' }}>{row.actionType}</span>
                    )}
                  </td>
                  <td style={{ padding: 'var(--spacing-xs)', verticalAlign: 'top', color: 'var(--fg)' }}>
                    {isEditing ? (
                      <input
                        value={editDraft.component ?? ''}
                        onInput={(e) => setEditDraft(d => ({ ...d, component: (e.target as HTMLInputElement).value }))}
                        style={{ width: '100%', fontSize: 'var(--font-size-xs)', padding: '2px 4px', color: 'var(--fg)', background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
                      />
                    ) : (
                      <span onClick={() => startEdit(row)} style={{ cursor: 'pointer' }}>{row.component}</span>
                    )}
                  </td>
                  <td style={{ padding: 'var(--spacing-xs)', verticalAlign: 'top', color: 'var(--fg)' }}>
                    {isEditing ? (
                      <input
                        value={editDraft.actionId ?? ''}
                        onInput={(e) => setEditDraft(d => ({ ...d, actionId: (e.target as HTMLInputElement).value }))}
                        style={{ width: '100%', fontSize: 'var(--font-size-xs)', padding: '2px 4px', color: 'var(--fg)', background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
                      />
                    ) : (
                      <span onClick={() => startEdit(row)} style={{ cursor: 'pointer' }}>{row.actionId}</span>
                    )}
                  </td>
                  <td style={{ padding: 'var(--spacing-xs)', verticalAlign: 'top', color: 'var(--fg)' }}>
                    {isEditing ? (
                      <input
                        value={editDraft.actionName ?? ''}
                        onInput={(e) => setEditDraft(d => ({ ...d, actionName: (e.target as HTMLInputElement).value }))}
                        style={{ width: '100%', fontSize: 'var(--font-size-xs)', padding: '2px 4px', color: 'var(--fg)', background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
                      />
                    ) : (
                      <span onClick={() => startEdit(row)} style={{ cursor: 'pointer' }}>{row.actionName ?? '—'}</span>
                    )}
                  </td>
                  <td style={{ padding: 'var(--spacing-xs)', verticalAlign: 'top', color: 'var(--fg)' }}>
                    <span style={{ color: 'var(--muted)', fontSize: 'var(--font-size-xs)' }}>Link</span>
                    <button
                      type="button"
                      onClick={() => handleCopyLink(row.figmaElementLink)}
                      style={{ marginLeft: 4, fontSize: 'var(--font-size-xs)', cursor: 'pointer', background: 'none', border: 'none', color: 'var(--accent)' }}
                    >
                      Copy
                    </button>
                  </td>
                  <td style={{ padding: 'var(--spacing-xs)', verticalAlign: 'top', color: 'var(--fg)' }}>
                    {isEditing ? (
                      <input
                        value={editDraft.population ?? ''}
                        onInput={(e) => setEditDraft(d => ({ ...d, population: (e.target as HTMLInputElement).value }))}
                        style={{ width: '100%', fontSize: 'var(--font-size-xs)', padding: '2px 4px', color: 'var(--fg)', background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
                      />
                    ) : (
                      <span onClick={() => startEdit(row)} style={{ cursor: 'pointer' }}>{row.population || '—'}</span>
                    )}
                  </td>
                  <td style={{ padding: 'var(--spacing-xs)', verticalAlign: 'top', maxWidth: 80, color: 'var(--fg)' }}>
                    {isEditing ? (
                      <input
                        value={editDraft.note ?? ''}
                        onInput={(e) => setEditDraft(d => ({ ...d, note: (e.target as HTMLInputElement).value }))}
                        style={{ width: '100%', fontSize: 'var(--font-size-xs)', padding: '2px 4px', color: 'var(--fg)', background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
                      />
                    ) : (
                      <span onClick={() => startEdit(row)} style={{ cursor: 'pointer' }}>{row.note || '—'}</span>
                    )}
                  </td>
                  <td style={{ padding: 'var(--spacing-xs)', verticalAlign: 'top', color: 'var(--fg)' }}>
                    {isEditing ? (
                      <span style={{ display: 'flex', gap: 4 }}>
                        <button type="button" onClick={saveEdit} style={{ fontSize: 'var(--font-size-xs)', cursor: 'pointer', color: 'var(--fg)', background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>Save</button>
                        <button type="button" onClick={cancelEdit} style={{ fontSize: 'var(--font-size-xs)', cursor: 'pointer', color: 'var(--fg)', background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>Cancel</button>
                      </span>
                    ) : (
                      <span style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        <button type="button" onClick={() => startEdit(row)} style={{ fontSize: 'var(--font-size-xs)', cursor: 'pointer', background: 'none', border: 'none', color: 'var(--accent)' }}>Edit</button>
                        <button type="button" onClick={() => handleExportRow(row)} style={{ fontSize: 'var(--font-size-xs)', cursor: 'pointer', color: 'var(--fg)', background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>Export image</button>
                      </span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
      {session.rows.length === 0 && (
        <div className="ata-empty" style={{ color: 'var(--muted)', fontSize: 'var(--font-size-sm)', padding: 'var(--spacing-md)' }}>
          No rows yet. Select one or more frames/components with ScreenID, then run Get Analytics Tags.
        </div>
      )}
    </div>
  )
}
