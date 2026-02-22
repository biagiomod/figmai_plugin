/**
 * CT-A inline table view — replaces modal when uiMode === 'tool'.
 *
 * Renders from a ProjectedTable so column headers, values and link cells
 * are consistent with clipboard and stage outputs.
 *
 * Items-mode presets: editable cells mapped back to session items via editableFieldMap.
 * KV-mode presets (CM1): read-only — rows are synthetic labels, not 1:1 with items.
 */

import { h } from 'preact'
import { useMemo } from 'preact/hooks'
import type { ContentTableSession } from '../../core/contentTable/session'
import { getEffectiveItems, applyEdit, deleteItem } from '../../core/contentTable/session'
import { PRESET_INFO } from '../../core/contentTable/presets.generated'
import { projectContentTable, cellText, cellHref } from '../../core/contentTable/projection'
import type { TableFormatPreset, ContentItemV1 } from '../../core/contentTable/types'
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

const editableFieldMap: Record<string, keyof ContentItemV1> = {
  content: 'content',
  notes: 'notes',
  contentKey: 'contentKey',
  jiraTicket: 'jiraTicket',
  adaNotes: 'adaNotes',
  errorMessage: 'errorMessage'
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
  const projected = useMemo(() => projectContentTable(selectedFormat, items), [selectedFormat, items])
  const isKV = projected.readOnly

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
        <table style={{ minWidth: `${projected.headers.length * 100 + (isKV ? 30 : 94)}px`, borderCollapse: 'collapse', fontSize: '11px', fontFamily: 'Inter, system-ui, sans-serif' }}>
          <thead>
            {projected.headerRows.map((hRow, hri) => (
              <tr key={hri} style={{ backgroundColor: '#f5f5f5', position: 'sticky', top: `${hri * 25}px`, zIndex: 2 - hri }}>
                {!isKV && <th style={{ ...TH, width: '30px' }}>{hri === projected.headerRows.length - 1 ? '#' : ''}</th>}
                {hRow.map((label, ci) => (
                  <th key={ci} style={{ ...TH, minWidth: projected.columnKeys[ci] === 'content' ? '200px' : '80px' }}>{label}</th>
                ))}
                {!isKV && <th style={{ ...TH, width: '64px', textAlign: 'center' }}>{hri === projected.headerRows.length - 1 ? 'Tools' : ''}</th>}
              </tr>
            ))}
          </thead>
          <tbody>
            {isKV ? (
              /* KV mode: render projected rows directly, read-only, no # or Tools columns */
              projected.rows.map((row, ri) => (
                <tr key={ri} style={{ borderBottom: '1px solid #eee' }}>
                  {row.map((cell, ci) => {
                    const href = cellHref(cell)
                    const text = cellText(cell)
                    if (href) {
                      return (
                        <td key={ci} style={TD}>
                          <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: '#0066cc', textDecoration: 'underline', fontSize: '10px' }} title={href}>{text}</a>
                        </td>
                      )
                    }
                    return (
                      <td key={ci} style={{ ...TD, color: text ? '#000' : '#ccc', fontSize: '10px' }}>{text || ''}</td>
                    )
                  })}
                </tr>
              ))
            ) : (
              /* Items mode: 1 item → 1 row, editable, with # and Tools columns */
              items.map((item, idx) => {
                const isFlagged = session.flaggedDuplicateIds.has(item.id)
                const isIgnoreFlagged = session.flaggedIgnoreIds.has(item.id)
                const ignoreRuleName = session.ignoreRuleByItemId[item.id] || ''
                const row = projected.rows[idx]
                return (
                  <tr key={item.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ ...TD, color: '#999', fontSize: '10px' }}>{idx + 1}</td>
                    {row.map((cell, ci) => {
                      const colKey = projected.columnKeys[ci]
                      const href = cellHref(cell)
                      const text = cellText(cell)

                      if (href) {
                        return (
                          <td key={colKey} style={TD}>
                            <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: '#0066cc', textDecoration: 'underline', fontSize: '10px' }} title={href}>{text}</a>
                          </td>
                        )
                      }

                      const fieldKey = editableFieldMap[colKey]
                      if (fieldKey) {
                        const curVal = fieldKey === 'content' ? item.content.value : (item[fieldKey] as string || '')
                        return (
                          <td key={colKey} style={TD}>
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
                        <td key={colKey} style={{ ...TD, color: '#666', fontSize: '10px' }}>{text || ''}</td>
                      )
                    })}
                    <td style={{ ...TD, textAlign: 'center', whiteSpace: 'nowrap' }}>
                      {isIgnoreFlagged && (
                        <span title={ignoreRuleName ? `Matched ignore rule: ${ignoreRuleName}` : 'Matched ignore-list rule'} style={{ fontSize: '8px', color: '#7a4f00', backgroundColor: '#fff3cd', padding: '1px 3px', borderRadius: '3px', marginRight: '2px', fontWeight: 600 }}>Ignore?</span>
                      )}
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
              })
            )}
            {projected.rows.length === 0 && (
              <tr><td colSpan={projected.headers.length + (isKV ? 0 : 2)} style={{ padding: '16px', textAlign: 'center', color: '#999' }}>No items. All rows have been deleted.</td></tr>
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
