/**
 * CT-A inline table view — replaces modal when uiMode === 'tool'.
 *
 * Column order (Universal spec):
 *   # | Figma Ref | Component | Screen | Field/Role | Content | Notes | Tools
 *
 * "Screen" maps to textLayerName (no new field).
 * Figma Ref renders "View in Figma" as a link.
 * Tools column: Delete + per-row ref image export.
 */

import { h } from 'preact'
import type { ContentTableSession } from '../../core/contentTable/session'
import { getEffectiveItems, applyEdit, deleteItem } from '../../core/contentTable/session'
import { PRESET_INFO, PRESET_COLUMNS } from '../../core/contentTable/presets.generated'
import type { TableFormatPreset } from '../../core/contentTable/types'
import { ImageDownloadIcon, CloseIcon } from '../icons'
import { TH, TD, CELL_INPUT, TOOL_BTN, actionBtnStyle } from './toolTableStyles'

interface ContentTableViewProps {
  session: ContentTableSession
  onSessionChange: (session: ContentTableSession) => void
  hasSelection: boolean
  onAppend: () => void
  onViewOnStage: () => void
  onCopyToClipboard: () => void
  onRestart: () => void
  onExportRowRefImage: (nodeId: string) => void
  isCopying: boolean
  selectedFormat: TableFormatPreset
  onFormatChange: (format: TableFormatPreset) => void
}

export function ContentTableView({
  session,
  onSessionChange,
  hasSelection,
  onAppend,
  onViewOnStage,
  onCopyToClipboard,
  onRestart,
  onExportRowRefImage,
  isCopying,
  selectedFormat,
  onFormatChange
}: ContentTableViewProps) {
  const items = getEffectiveItems(session)
  const cols = PRESET_COLUMNS[selectedFormat] ?? PRESET_COLUMNS['universal']
  const editableFieldMap: Record<string, keyof import('../../core/contentTable/types').ContentItemV1> = {
    content: 'content',
    notes: 'notes',
    contentKey: 'contentKey',
    jiraTicket: 'jiraTicket',
    adaNotes: 'adaNotes',
    errorMessage: 'errorMessage'
  }
  const isFigmaRefCol = (key: string) => key === 'figmaRef' || key === 'nodeUrl'

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      flex: 1,
      minHeight: 0,
      padding: '8px 8px 8px 8px'
    }}>
      {/* Header: title left, model + restart right */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
        marginBottom: '8px'
      }}>
        <span style={{ fontSize: '14px', fontWeight: 600, color: 'var(--fg)' }}>
          Content Table
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <label style={{ fontSize: '10px', color: 'var(--fg-secondary)' }}>Model</label>
            <select
              value={selectedFormat}
              onChange={(e) => onFormatChange((e.target as HTMLSelectElement).value as TableFormatPreset)}
              style={{
                fontSize: '11px',
                padding: '2px 6px',
                borderRadius: 'var(--radius-sm)',
                border: '1px solid var(--border)',
                backgroundColor: 'var(--bg)',
                color: 'var(--fg)',
                cursor: 'pointer'
              }}
            >
              {PRESET_INFO.filter(p => p.enabled && p.id !== 'analytics-tagging').map(p => (
                <option key={p.id} value={p.id}>{p.label}</option>
              ))}
            </select>
          </div>
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
      </div>

      {/* Table container — horizontally and vertically scrollable */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        overflowX: 'auto',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius-sm)',
        minHeight: 0,
        backgroundColor: '#ffffff'
      }}>
        <table style={{ minWidth: `${cols.length * 100 + 94}px`, borderCollapse: 'collapse', fontSize: '11px', fontFamily: 'Inter, system-ui, sans-serif' }}>
          <thead>
            <tr style={{ backgroundColor: '#f5f5f5', position: 'sticky', top: 0, zIndex: 1 }}>
              <th style={{ ...TH, width: '30px' }}>#</th>
              {cols.map(col => (
                <th key={col.key} style={{ ...TH, minWidth: col.key === 'content' ? '200px' : '80px' }}>{col.label}</th>
              ))}
              <th style={{ ...TH, width: '64px', textAlign: 'center' }}>Tools</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => {
              const isFlagged = session.flaggedDuplicateIds.has(item.id)
              return (
                <tr key={item.id} style={{ borderBottom: '1px solid #eee' }}>
                  <td style={{ ...TD, color: '#999', fontSize: '10px' }}>{idx + 1}</td>
                  {cols.map(col => {
                    const fieldKey = editableFieldMap[col.key]
                    if (isFigmaRefCol(col.key)) {
                      const url = col.extract(item)
                      return (
                        <td key={col.key} style={TD}>
                          {url ? (
                            <a href={url} target="_blank" rel="noopener noreferrer" style={{ color: '#0066cc', textDecoration: 'underline', fontSize: '10px' }} title={url}>View in Figma</a>
                          ) : (
                            <span style={{ color: '#ccc', fontSize: '10px' }}>-</span>
                          )}
                        </td>
                      )
                    }
                    if (fieldKey) {
                      const curVal = fieldKey === 'content' ? item.content.value : (item[fieldKey] as string || '')
                      return (
                        <td key={col.key} style={TD}>
                          <input
                            type="text"
                            defaultValue={curVal}
                            onBlur={(e) => {
                              const v = e.currentTarget.value
                              if (v !== curVal) onSessionChange(applyEdit(session, item.id, fieldKey, v))
                            }}
                            style={CELL_INPUT}
                            onFocus={(e) => { e.currentTarget.style.borderColor = '#0d99ff'; e.currentTarget.style.backgroundColor = '#fff' }}
                            onBlurCapture={(e) => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.backgroundColor = 'transparent' }}
                          />
                        </td>
                      )
                    }
                    return (
                      <td key={col.key} style={{ ...TD, color: '#666', fontSize: '10px' }}>{col.extract(item) || ''}</td>
                    )
                  })}
                  <td style={{ ...TD, textAlign: 'center', whiteSpace: 'nowrap' }}>
                    {isFlagged && (
                      <span title="Possible duplicate" style={{ fontSize: '8px', color: '#b36b00', backgroundColor: '#fff8e6', padding: '1px 3px', borderRadius: '3px', marginRight: '2px', fontWeight: 600 }}>Dup?</span>
                    )}
                    {item.nodeId && (
                      <button onClick={() => onExportRowRefImage(item.nodeId)} title="Get ref image for this row" style={{ ...TOOL_BTN, color: '#333333' }} onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#eef' }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}>
                        <ImageDownloadIcon width={14} height={14} />
                      </button>
                    )}
                    <button onClick={() => onSessionChange(deleteItem(session, item.id))} title="Delete row" style={{ ...TOOL_BTN, color: '#cc3333' }} onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#fee' }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}>
                      <CloseIcon width={14} height={14} />
                    </button>
                  </td>
                </tr>
              )
            })}
            {items.length === 0 && (
              <tr><td colSpan={cols.length + 2} style={{ padding: '16px', textAlign: 'center', color: '#999' }}>No items. All rows have been deleted.</td></tr>
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
          title={hasSelection ? 'Add selected containers to table' : 'Select containers first'}
          style={actionBtnStyle(!hasSelection)}
        >
          Append Selection
        </button>
        <button onClick={onViewOnStage} style={actionBtnStyle(false)}>
          View on Stage
        </button>
        <button onClick={onCopyToClipboard} disabled={isCopying} style={actionBtnStyle(isCopying)}>
          {isCopying ? 'Copying...' : 'Copy to Clipboard'}
        </button>
      </div>
    </div>
  )
}

