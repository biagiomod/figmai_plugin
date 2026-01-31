/**
 * Analytics Tagging — two-step workflow: draft form + table view
 * No draft: prompt + "Capture Action Item". Draft exists: draft form + "Capture Screenshot & Add Row" + "Discard draft".
 * Table: existing rows; editable Screen ID, Description, etc. Figma link + copy. Screenshot: Generate preview (on demand).
 */

import { h } from 'preact'
import { useCallback, useState } from 'preact/hooks'
import { Button } from '@create-figma-plugin/ui'
import type { Session, Row, DraftRow, ActionType } from '../../core/analyticsTagging/types'
import type {
  RequestAnalyticsTaggingScreenshotHandler,
  StartRowFromTargetSelectionHandler,
  RequestSectionScreenshotCaptureHandler,
  DiscardDraftRowHandler,
  UpdateDraftRowFieldsHandler
} from '../../core/types'
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
  const [editDraft, setEditDraft] = useState<Partial<DraftRow>>({})
  const draft = session.draftRow ?? null

  const handleCopyLink = useCallback((url: string) => {
    if (!url) return
    navigator.clipboard.writeText(url).catch(() => {})
  }, [])

  const handleRequestScreenshot = useCallback((ref: Row['screenshotRef']) => {
    emit<RequestAnalyticsTaggingScreenshotHandler>('REQUEST_ANALYTICS_TAGGING_SCREENSHOT', ref)
  }, [])

  const handleCaptureActionItem = useCallback(() => {
    emit<StartRowFromTargetSelectionHandler>('START_ROW_FROM_TARGET_SELECTION')
  }, [])

  const handleCaptureScreenshotAddRow = useCallback(() => {
    emit<RequestSectionScreenshotCaptureHandler>('REQUEST_SECTION_SCREENSHOT_CAPTURE')
  }, [])

  const handleDiscardDraft = useCallback(() => {
    emit<DiscardDraftRowHandler>('DISCARD_DRAFT_ROW')
  }, [])

  const sendDraftUpdate = useCallback((updates: Record<string, unknown>) => {
    emit<UpdateDraftRowFieldsHandler>('UPDATE_DRAFT_ROW_FIELDS', updates)
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)', padding: 'var(--spacing-sm)' }}>
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

      {/* No draft: prompt + Capture Action Item */}
      {!draft && (
        <div style={{ padding: 'var(--spacing-md)', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
          <p style={{ margin: '0 0 var(--spacing-sm)', fontSize: 'var(--font-size-sm)', color: 'var(--fg)' }}>
            Select one node (the action item, e.g. button/link), then click <strong>Capture Action Item</strong>.
          </p>
          <Button onClick={handleCaptureActionItem}>
            Capture Action Item
          </Button>
        </div>
      )}

      {/* Draft exists: form + Capture Screenshot & Add Row + Discard draft */}
      {draft && (
        <div style={{ padding: 'var(--spacing-md)', background: 'var(--bg-secondary)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
          <p style={{ margin: '0 0 var(--spacing-sm)', fontSize: 'var(--font-size-sm)', color: 'var(--fg)' }}>
            Fill in the form, then select the <strong>section container</strong> (frame that contains the action item) and click <strong>Capture Screenshot & Add Row</strong>.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--spacing-xs)', marginBottom: 'var(--spacing-sm)' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 80 }}>
              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--muted)' }}>Screen ID</span>
              <input
                value={editDraft.screenId ?? draft.screenId}
                onInput={(e) => setEditDraft(d => ({ ...d, screenId: (e.target as HTMLInputElement).value }))}
                onBlur={() => sendDraftUpdate({ screenId: editDraft.screenId ?? draft.screenId })}
                style={{ fontSize: 'var(--font-size-xs)', padding: '4px 6px' }}
              />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 80 }}>
              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--muted)' }}>Description</span>
              <input
                value={editDraft.description ?? draft.description}
                onInput={(e) => setEditDraft(d => ({ ...d, description: (e.target as HTMLInputElement).value }))}
                onBlur={() => sendDraftUpdate({ description: editDraft.description ?? draft.description })}
                style={{ fontSize: 'var(--font-size-xs)', padding: '4px 6px' }}
              />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 100 }}>
              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--muted)' }}>Action Type</span>
              <select
                value={editDraft.actionType ?? draft.actionType}
                onChange={(e) => {
                  const v = (e.target as HTMLSelectElement).value as ActionType
                  setEditDraft(d => ({ ...d, actionType: v }))
                  sendDraftUpdate({ actionType: v })
                }}
                style={{ fontSize: 'var(--font-size-xs)', padding: '4px 6px' }}
              >
                {ACTION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 80 }}>
              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--muted)' }}>Component</span>
              <input
                value={editDraft.component ?? draft.component}
                onInput={(e) => setEditDraft(d => ({ ...d, component: (e.target as HTMLInputElement).value }))}
                onBlur={() => sendDraftUpdate({ component: editDraft.component ?? draft.component })}
                style={{ fontSize: 'var(--font-size-xs)', padding: '4px 6px' }}
              />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 80 }}>
              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--muted)' }}>Action ID</span>
              <input
                value={editDraft.actionId ?? draft.actionId}
                onInput={(e) => setEditDraft(d => ({ ...d, actionId: (e.target as HTMLInputElement).value }))}
                onBlur={() => sendDraftUpdate({ actionId: editDraft.actionId ?? draft.actionId })}
                style={{ fontSize: 'var(--font-size-xs)', padding: '4px 6px' }}
              />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 80 }}>
              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--muted)' }}>Action Name</span>
              <input
                value={editDraft.actionName ?? draft.actionName ?? ''}
                onInput={(e) => setEditDraft(d => ({ ...d, actionName: (e.target as HTMLInputElement).value }))}
                onBlur={() => sendDraftUpdate({ actionName: editDraft.actionName ?? draft.actionName ?? '' })}
                style={{ fontSize: 'var(--font-size-xs)', padding: '4px 6px' }}
              />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 80 }}>
              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--muted)' }}>Population</span>
              <input
                value={editDraft.population ?? draft.population}
                onInput={(e) => setEditDraft(d => ({ ...d, population: (e.target as HTMLInputElement).value }))}
                onBlur={() => sendDraftUpdate({ population: editDraft.population ?? draft.population })}
                style={{ fontSize: 'var(--font-size-xs)', padding: '4px 6px' }}
              />
            </label>
            <label style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 80 }}>
              <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--muted)' }}>Note</span>
              <input
                value={editDraft.note ?? draft.note}
                onInput={(e) => setEditDraft(d => ({ ...d, note: (e.target as HTMLInputElement).value }))}
                onBlur={() => sendDraftUpdate({ note: editDraft.note ?? draft.note })}
                style={{ fontSize: 'var(--font-size-xs)', padding: '4px 6px' }}
              />
            </label>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)', flexWrap: 'wrap' }}>
            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--muted)' }}>Figma link</span>
            <span style={{ fontSize: 'var(--font-size-xs)' }}>Link captured</span>
            <button
              type="button"
              onClick={() => handleCopyLink(draft.figmaElementLink)}
              style={{ fontSize: 'var(--font-size-xs)', cursor: 'pointer', background: 'none', border: 'none', color: 'var(--accent)' }}
            >
              Copy
            </button>
          </div>
          <div style={{ display: 'flex', gap: 'var(--spacing-sm)', marginTop: 'var(--spacing-sm)' }}>
            <Button onClick={handleCaptureScreenshotAddRow}>
              Capture Screenshot & Add Row
            </Button>
            <Button secondary onClick={handleDiscardDraft}>
              Discard draft
            </Button>
          </div>
        </div>
      )}

      {/* Table of committed rows */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--font-size-xs)' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)' }}>
              <th style={{ textAlign: 'left', padding: 'var(--spacing-xs)' }}>Screen ID</th>
              <th style={{ textAlign: 'left', padding: 'var(--spacing-xs)' }}>Screenshot</th>
              <th style={{ textAlign: 'left', padding: 'var(--spacing-xs)' }}>Description</th>
              <th style={{ textAlign: 'left', padding: 'var(--spacing-xs)' }}>Action Type</th>
              <th style={{ textAlign: 'left', padding: 'var(--spacing-xs)' }}>Component</th>
              <th style={{ textAlign: 'left', padding: 'var(--spacing-xs)' }}>Action ID</th>
              <th style={{ textAlign: 'left', padding: 'var(--spacing-xs)' }}>Action Name</th>
              <th style={{ textAlign: 'left', padding: 'var(--spacing-xs)' }}>Figma link</th>
              <th style={{ textAlign: 'left', padding: 'var(--spacing-xs)' }}>Population</th>
              <th style={{ textAlign: 'left', padding: 'var(--spacing-xs)' }}>Note</th>
              <th style={{ padding: 'var(--spacing-xs)' }} />
            </tr>
          </thead>
          <tbody>
            {session.rows.map((row) => {
              const isEditing = editingRowId === row.id
              const preview = screenshotPreviews[row.screenshotRef.id]
              return (
                <tr key={row.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: 'var(--spacing-xs)', verticalAlign: 'top' }}>
                    {isEditing ? (
                      <input
                        value={editDraft.screenId ?? ''}
                        onInput={(e) => setEditDraft(d => ({ ...d, screenId: (e.target as HTMLInputElement).value }))}
                        style={{ width: '100%', fontSize: 'var(--font-size-xs)', padding: '2px 4px' }}
                      />
                    ) : (
                      <span onClick={() => startEdit(row)} style={{ cursor: 'pointer' }}>{row.screenId}</span>
                    )}
                  </td>
                  <td style={{ padding: 'var(--spacing-xs)', verticalAlign: 'top' }}>
                    {preview ? (
                      <div style={{ position: 'relative', width: 60, height: 40 }}>
                        <img src={preview} alt="" style={{ width: 60, height: 40, objectFit: 'cover' }} />
                        <span
                          style={{
                            position: 'absolute',
                            left: `${(row.screenshotRef.hotspotRatioX * 60) - 4}px`,
                            top: `${(row.screenshotRef.hotspotRatioY * 40) - 4}px`,
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            background: 'red',
                            border: '1px solid white'
                          }}
                        />
                      </div>
                    ) : (
                      <Button
                        secondary
                        onClick={() => handleRequestScreenshot(row.screenshotRef)}
                        style={{ fontSize: 'var(--font-size-xs)', padding: '2px 6px' }}
                      >
                        Generate preview
                      </Button>
                    )}
                  </td>
                  <td style={{ padding: 'var(--spacing-xs)', verticalAlign: 'top', maxWidth: 80 }}>
                    {isEditing ? (
                      <input
                        value={editDraft.description ?? ''}
                        onInput={(e) => setEditDraft(d => ({ ...d, description: (e.target as HTMLInputElement).value }))}
                        style={{ width: '100%', fontSize: 'var(--font-size-xs)', padding: '2px 4px' }}
                      />
                    ) : (
                      <span onClick={() => startEdit(row)} style={{ cursor: 'pointer' }}>{row.description || '—'}</span>
                    )}
                  </td>
                  <td style={{ padding: 'var(--spacing-xs)', verticalAlign: 'top' }}>
                    {isEditing ? (
                      <select
                        value={editDraft.actionType ?? 'Action'}
                        onChange={(e) => setEditDraft(d => ({ ...d, actionType: (e.target as HTMLSelectElement).value as ActionType }))}
                        style={{ fontSize: 'var(--font-size-xs)', padding: '2px 4px' }}
                      >
                        {ACTION_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    ) : (
                      <span onClick={() => startEdit(row)} style={{ cursor: 'pointer' }}>{row.actionType}</span>
                    )}
                  </td>
                  <td style={{ padding: 'var(--spacing-xs)', verticalAlign: 'top' }}>
                    {isEditing ? (
                      <input
                        value={editDraft.component ?? ''}
                        onInput={(e) => setEditDraft(d => ({ ...d, component: (e.target as HTMLInputElement).value }))}
                        style={{ width: '100%', fontSize: 'var(--font-size-xs)', padding: '2px 4px' }}
                      />
                    ) : (
                      <span onClick={() => startEdit(row)} style={{ cursor: 'pointer' }}>{row.component}</span>
                    )}
                  </td>
                  <td style={{ padding: 'var(--spacing-xs)', verticalAlign: 'top' }}>
                    {isEditing ? (
                      <input
                        value={editDraft.actionId ?? ''}
                        onInput={(e) => setEditDraft(d => ({ ...d, actionId: (e.target as HTMLInputElement).value }))}
                        style={{ width: '100%', fontSize: 'var(--font-size-xs)', padding: '2px 4px' }}
                      />
                    ) : (
                      <span onClick={() => startEdit(row)} style={{ cursor: 'pointer' }}>{row.actionId}</span>
                    )}
                  </td>
                  <td style={{ padding: 'var(--spacing-xs)', verticalAlign: 'top' }}>
                    {isEditing ? (
                      <input
                        value={editDraft.actionName ?? ''}
                        onInput={(e) => setEditDraft(d => ({ ...d, actionName: (e.target as HTMLInputElement).value }))}
                        style={{ width: '100%', fontSize: 'var(--font-size-xs)', padding: '2px 4px' }}
                      />
                    ) : (
                      <span onClick={() => startEdit(row)} style={{ cursor: 'pointer' }}>{row.actionName ?? '—'}</span>
                    )}
                  </td>
                  <td style={{ padding: 'var(--spacing-xs)', verticalAlign: 'top' }}>
                    <span style={{ color: 'var(--muted)', fontSize: 'var(--font-size-xs)' }}>Link captured</span>
                    <button
                      type="button"
                      onClick={() => handleCopyLink(row.figmaElementLink)}
                      style={{ marginLeft: 4, fontSize: 'var(--font-size-xs)', cursor: 'pointer', background: 'none', border: 'none', color: 'var(--accent)' }}
                    >
                      Copy
                    </button>
                  </td>
                  <td style={{ padding: 'var(--spacing-xs)', verticalAlign: 'top' }}>
                    {isEditing ? (
                      <input
                        value={editDraft.population ?? ''}
                        onInput={(e) => setEditDraft(d => ({ ...d, population: (e.target as HTMLInputElement).value }))}
                        style={{ width: '100%', fontSize: 'var(--font-size-xs)', padding: '2px 4px' }}
                      />
                    ) : (
                      <span onClick={() => startEdit(row)} style={{ cursor: 'pointer' }}>{row.population || '—'}</span>
                    )}
                  </td>
                  <td style={{ padding: 'var(--spacing-xs)', verticalAlign: 'top', maxWidth: 80 }}>
                    {isEditing ? (
                      <input
                        value={editDraft.note ?? ''}
                        onInput={(e) => setEditDraft(d => ({ ...d, note: (e.target as HTMLInputElement).value }))}
                        style={{ width: '100%', fontSize: 'var(--font-size-xs)', padding: '2px 4px' }}
                      />
                    ) : (
                      <span onClick={() => startEdit(row)} style={{ cursor: 'pointer' }}>{row.note || '—'}</span>
                    )}
                  </td>
                  <td style={{ padding: 'var(--spacing-xs)', verticalAlign: 'top' }}>
                    {isEditing ? (
                      <span style={{ display: 'flex', gap: 4 }}>
                        <button type="button" onClick={saveEdit} style={{ fontSize: 'var(--font-size-xs)', cursor: 'pointer' }}>Save</button>
                        <button type="button" onClick={cancelEdit} style={{ fontSize: 'var(--font-size-xs)', cursor: 'pointer' }}>Cancel</button>
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
      {session.rows.length === 0 && !draft && (
        <div style={{ color: 'var(--muted)', fontSize: 'var(--font-size-sm)', padding: 'var(--spacing-md)' }}>
          No rows yet. Select one node (the action item), then click Capture Action Item.
        </div>
      )}
    </div>
  )
}
