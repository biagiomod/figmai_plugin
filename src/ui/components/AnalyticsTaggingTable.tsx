/**
 * Analytics Tagging — selection-driven flow
 * Instruction block + table view. No draft or screenshot capture in this flow.
 */

import { h } from 'preact'
import { useCallback, useState } from 'preact/hooks'
import type { Session, Row, ActionType } from '../../core/analyticsTagging/types'
import type { RequestAnalyticsTaggingScreenshotHandler } from '../../core/types'
import { emit } from '@create-figma-plugin/utilities'

const ACTION_TYPES: ActionType[] = ['Action', 'Interaction', 'Screen Event', 'Personalization Event']

interface AnalyticsTaggingTableProps {
  session: Session
  onUpdateRow: (rowId: string, updates: Record<string, unknown>) => void
  screenshotPreviews: Record<string, string>
  autosaveStatus: 'saved' | 'saving' | 'failed'
  warning?: string
}

export function AnalyticsTaggingTable({
  session,
  onUpdateRow,
  screenshotPreviews,
  autosaveStatus,
  warning
}: AnalyticsTaggingTableProps) {
  const [editingRowId, setEditingRowId] = useState<string | null>(null)
  const [editDraft, setEditDraft] = useState<Partial<Row>>({})

  const handleCopyLink = useCallback((url: string) => {
    if (!url) return
    navigator.clipboard.writeText(url).catch(() => {})
  }, [])

  const handleRequestScreenshot = useCallback((ref: NonNullable<Row['screenshotRef']>) => {
    emit<RequestAnalyticsTaggingScreenshotHandler>('REQUEST_ANALYTICS_TAGGING_SCREENSHOT', ref)
  }, [])

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

      <div className="ata-tableY">
        <div className="ata-tableX">
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
              const hasScreenshotRef = !!row.screenshotRef
              const preview = hasScreenshotRef && row.screenshotRef ? screenshotPreviews[row.screenshotRef.id] : null
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
                    {!hasScreenshotRef ? (
                      <span style={{ color: 'var(--muted)' }}>—</span>
                    ) : preview ? (
                      <div style={{ position: 'relative', width: 60, height: 40 }}>
                        <img src={preview} alt="" style={{ width: 60, height: 40, objectFit: 'cover' }} />
                        <span
                          style={{
                            position: 'absolute',
                            left: `${((row.screenshotRef!.hotspotRatioX) * 60) - 4}px`,
                            top: `${((row.screenshotRef!.hotspotRatioY) * 40) - 4}px`,
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            background: 'red',
                            border: '1px solid white'
                          }}
                        />
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => row.screenshotRef && handleRequestScreenshot(row.screenshotRef)}
                        style={{ fontSize: 'var(--font-size-xs)', padding: '2px 6px', cursor: 'pointer', color: 'var(--fg)', background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
                      >
                        Generate preview
                      </button>
                    )}
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
                      <button type="button" onClick={() => startEdit(row)} style={{ fontSize: 'var(--font-size-xs)', cursor: 'pointer', background: 'none', border: 'none', color: 'var(--accent)' }}>Edit</button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        </div>
      </div>
      {session.rows.length === 0 && (
        <div className="ata-empty" style={{ color: 'var(--muted)', fontSize: 'var(--font-size-sm)', padding: 'var(--spacing-md)' }}>
          No rows yet. Select one or more frames/components with ScreenID, then run Get Analytics Tags.
        </div>
      )}
    </div>
  )
}
