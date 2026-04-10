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
import { useMemo, useState, useRef } from 'preact/hooks'
import type { ContentTableSession } from '../../core/contentTable/session'
import { getEffectiveItems, applyEdit, deleteItem, toggleTokenizedItem } from '../../core/contentTable/session'
import { PRESET_INFO } from '../../core/contentTable/presets.generated'
import { projectContentTable, cellText, cellHref, cellSuffix } from '../../core/contentTable/projection'
import type { TableFormatPreset, ContentItemV1 } from '../../core/contentTable/types'
import { getOrderedCtaPresets } from '../../core/contentTable/presetOrder'
import { ImageDownloadIcon, CloseIcon, RefreshIcon, CopyIcon } from '../icons'
import { TH, TD, CELL_INPUT, TOOL_BTN, actionBtnStyle } from './toolTableStyles'
import {
  CTA_ACTION_LABELS,
  CTA_DISPLAY_NAME,
  CTA_DROPDOWN_SEPARATOR_LABEL,
  CTA_DROPDOWN_SEPARATOR_VALUE,
  getCtaPresetDisplayLabel,
  getCtaPresetDisplayOrder
} from './contentTableUiLabels'

interface ContentTableViewProps {
  session: ContentTableSession
  onSessionChange: (session: ContentTableSession) => void
  hasSelection: boolean
  onAppend: () => void
  onViewOnStage?: (visibleItems: ContentItemV1[]) => void
  onCopyToClipboard: (visibleItems: ContentItemV1[]) => void
  onCopyRowsToClipboard: (visibleItems: ContentItemV1[]) => void
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

const IGNORE_TOOLTIP_W = 210

function IgnoreBadge({ ruleName }: { ruleName: string }) {
  const [anchorRect, setAnchorRect] = useState<DOMRect | null>(null)
  const spanRef = useRef<HTMLSpanElement>(null)
  const tip = ruleName
    ? `This item matched ignore rule "${ruleName}" and may belong to a shell or chrome component. It can safely be excluded from content review.`
    : 'This item may belong to a shell or chrome component (nav, footer, header, etc.) and can safely be excluded from content review.'

  let tooltipPos: h.JSX.CSSProperties | null = null
  if (anchorRect) {
    const showAbove = window.innerHeight - anchorRect.bottom < 120
    tooltipPos = {
      position: 'fixed',
      left: Math.max(8, anchorRect.right - IGNORE_TOOLTIP_W),
      width: `${IGNORE_TOOLTIP_W}px`,
      ...(showAbove
        ? { bottom: window.innerHeight - anchorRect.top + 4 }
        : { top: anchorRect.bottom + 4 })
    }
  }

  return (
    <span
      ref={spanRef}
      style={{ display: 'inline-block', marginRight: '2px' }}
      onMouseEnter={() => {
        if (spanRef.current) setAnchorRect(spanRef.current.getBoundingClientRect())
      }}
      onMouseLeave={() => setAnchorRect(null)}
    >
      <span style={{ fontSize: '8px', color: '#7a4f00', backgroundColor: '#fff3cd', padding: '1px 4px', borderRadius: '3px', fontWeight: 600, cursor: 'default', userSelect: 'none' }}>
        Ignore?
      </span>
      {anchorRect && tooltipPos && (
        <div style={{
          ...tooltipPos,
          backgroundColor: '#1e293b',
          color: '#f8fafc',
          fontSize: '10px',
          lineHeight: 1.5,
          padding: '7px 9px',
          borderRadius: '6px',
          whiteSpace: 'normal',
          zIndex: 9999,
          boxShadow: '0 4px 14px rgba(0,0,0,0.28)',
          pointerEvents: 'none'
        }}>
          {tip}
        </div>
      )}
    </span>
  )
}

function isToolsColumnKey(key: string): boolean {
  const normalized = (key || '').trim().toLowerCase()
  return normalized === 'tools' || normalized === 'tool'
}

function isRowNumberColumnKey(key: string): boolean {
  const normalized = (key || '').trim().toLowerCase()
  return normalized === 'rownumber' || normalized === '#'
}

export function ContentTableView({
  session,
  onSessionChange,
  hasSelection,
  onAppend,
  onViewOnStage,
  onCopyToClipboard,
  onCopyRowsToClipboard,
  onRestart,
  onExportRowRefImage,
  isCopying,
  selectedFormat,
  onFormatChange
}: ContentTableViewProps) {
  const [showTokens, setShowTokens] = useState(true)
  const allItems = getEffectiveItems(session)
  const items = showTokens
    ? allItems
    : allItems.filter(item => !(session.tokenizedIds.has(item.id) && !session.revertedTokenIds.has(item.id)))
  const projected = useMemo(() => projectContentTable(selectedFormat, items), [selectedFormat, items])
  const orderedPresets = useMemo(
    () => getCtaPresetDisplayOrder(getOrderedCtaPresets(PRESET_INFO)),
    []
  )
  // Build lookup for original (pre-tokenization) content values.
  // Used to show "Original: ..." tooltip on tokenized cells.
  const baseContentById = useMemo(() => {
    const m: Record<string, string> = {}
    for (const bi of session.baseTable.items) {
      m[bi.id] = bi.content.value
    }
    return m
  }, [session.baseTable.items])
  const isKV = projected.readOnly
  const isMobilePreset = selectedFormat === 'mobile'
  const hasToolsDataColumn = projected.columnKeys.some(isToolsColumnKey)
  const showTrailingToolsColumn = !isKV && !hasToolsDataColumn
  const showRowNumberColumn = !isKV
  const showToolsActions = isMobilePreset || !isKV
  const ROW_NUMBER_COL_W = 36
  const MOBILE_ROW_NUMBER_COL_W = 20
  const rowNumberColW = isMobilePreset ? MOBILE_ROW_NUMBER_COL_W : ROW_NUMBER_COL_W
  const TOOLS_COL_W = 64
  const MOBILE_DEFAULT_COL_W = 120
  const MOBILE_UI_LABEL_COL_W = 160
  const mobileColWidth = (key: string): number => {
    if (isRowNumberColumnKey(key)) return rowNumberColW
    if (key === 'uiLabelEnglish') return MOBILE_UI_LABEL_COL_W
    if (isToolsColumnKey(key)) return TOOLS_COL_W
    return MOBILE_DEFAULT_COL_W
  }
  const tableMinWidth = isMobilePreset
    ? (rowNumberColW + projected.columnKeys.reduce((sum, key) => {
        return sum + mobileColWidth(key)
      }, 0) + (showTrailingToolsColumn ? TOOLS_COL_W : 0))
    : (projected.headers.length * 100 + (isKV ? 30 : 94))

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
          {CTA_DISPLAY_NAME}
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
              {orderedPresets.flatMap((preset, index) => {
                const options = [
                  <option key={preset.id} value={preset.id}>{getCtaPresetDisplayLabel(preset)}</option>
                ]
                if (index === 0) {
                  options.push(
                    <option key={CTA_DROPDOWN_SEPARATOR_VALUE} value={CTA_DROPDOWN_SEPARATOR_VALUE} disabled>
                      {CTA_DROPDOWN_SEPARATOR_LABEL}
                    </option>
                  )
                }
                return options
              })}
            </select>
          </div>
          <button
            onClick={() => setShowTokens(v => !v)}
            title={showTokens ? 'Variables visible — click to hide' : 'Variables hidden — click to show'}
            style={{
              padding: '3px 8px',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-sm)',
              backgroundColor: 'var(--bg-secondary)',
              color: 'var(--fg-secondary)',
              cursor: 'pointer',
              fontSize: '10px',
              display: 'flex',
              alignItems: 'center',
              gap: '5px'
            }}
          >
            <span style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              backgroundColor: showTokens ? '#22c55e' : '#ef4444',
              display: 'inline-block',
              flexShrink: 0
            }} />
            Variables
          </button>
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
        <table style={{ width: '100%', minWidth: `${tableMinWidth}px`, borderCollapse: 'collapse', fontSize: '11px', fontFamily: 'Inter, system-ui, sans-serif', tableLayout: isMobilePreset ? 'fixed' : 'auto' }}>
          {isMobilePreset && (
            <colgroup>
              {projected.columnKeys.map((key) => (
                <col
                  key={key}
                  style={{
                    width: `${mobileColWidth(key)}px`,
                    minWidth: `${mobileColWidth(key)}px`,
                    maxWidth: `${mobileColWidth(key)}px`
                  }}
                />
              ))}
              {showTrailingToolsColumn ? <col style={{ width: `${TOOLS_COL_W}px` }} /> : null}
            </colgroup>
          )}
          <thead>
            {projected.headerRows.map((hRow, hri) => (
              <tr key={hri} style={{ backgroundColor: '#f5f5f5', position: isMobilePreset ? 'static' : 'sticky', top: isMobilePreset ? undefined : `${hri * 25}px`, zIndex: isMobilePreset ? undefined : 2 - hri }}>
                {showRowNumberColumn && <th style={{ ...TH, width: `${rowNumberColW}px`, minWidth: `${rowNumberColW}px`, maxWidth: `${rowNumberColW}px`, padding: isMobilePreset ? '0 2px' : TH.padding, textAlign: 'center' }}>{hri === projected.headerRows.length - 1 ? '#' : ''}</th>}
                {hRow.map((label, ci) => (
                  <th
                    key={ci}
                    style={{
                      ...TH,
                      width: isMobilePreset
                        ? `${mobileColWidth(projected.columnKeys[ci] || '')}px`
                        : (projected.columnKeys[ci] === 'content' ? '100%' : undefined),
                      minWidth: isMobilePreset
                        ? `${mobileColWidth(projected.columnKeys[ci] || '')}px`
                        : (projected.columnKeys[ci] === 'content' ? '160px' : '80px'),
                      maxWidth: isMobilePreset ? `${mobileColWidth(projected.columnKeys[ci] || '')}px` : undefined,
                      whiteSpace: isMobilePreset ? 'normal' : TH.whiteSpace,
                      overflowWrap: isMobilePreset ? 'anywhere' : undefined,
                      lineHeight: isMobilePreset ? 1.25 : undefined
                    }}
                  >
                    {label}
                  </th>
                ))}
                {showTrailingToolsColumn && <th style={{ ...TH, width: `${TOOLS_COL_W}px`, minWidth: `${TOOLS_COL_W}px`, maxWidth: `${TOOLS_COL_W}px`, textAlign: 'center' }}>{hri === projected.headerRows.length - 1 ? 'Tools' : ''}</th>}
              </tr>
            ))}
          </thead>
          <tbody>
            {isKV ? (
              /* KV mode: render projected rows directly, read-only, no # or Tools columns */
              projected.rows.map((row, ri) => {
                const mobileItem = items[ri]
                const renderMobileToolsCell = () => {
                  if (!showToolsActions || !mobileItem) {
                    return <span style={{ color: '#ccc', fontSize: '10px' }}>—</span>
                  }
                  return (
                    <span>
                      {mobileItem.nodeId && (
                        <button onClick={() => onExportRowRefImage(mobileItem.nodeId)} title="Get ref image for this row" style={{ ...TOOL_BTN, color: '#333333' }} onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#eef' }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}>
                          <ImageDownloadIcon width={14} height={14} />
                        </button>
                      )}
                      <button onClick={() => onSessionChange(deleteItem(session, mobileItem.id))} title="Delete row" style={{ ...TOOL_BTN, color: '#cc3333' }} onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#fee' }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}>
                        <CloseIcon width={14} height={14} />
                      </button>
                    </span>
                  )
                }
                return (
                <tr key={ri} style={{ borderBottom: '1px solid #eee' }}>
                  {row.map((cell, ci) => {
                    const colKey = projected.columnKeys[ci]
                    if (isMobilePreset && isToolsColumnKey(colKey)) {
                      return <td key={ci} style={{ ...TD, textAlign: 'center', whiteSpace: 'nowrap' }}>{renderMobileToolsCell()}</td>
                    }
                    const href = cellHref(cell)
                    const text = cellText(cell)
                    const suffix = cellSuffix(cell)
                    if (href) {
                      const linkText = typeof cell === 'string' ? text : cell.text
                      return (
                        <td key={ci} style={TD}>
                          <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: '#0066cc', textDecoration: 'underline', fontSize: '10px' }} title={href}>{linkText}</a>
                          {suffix ? (
                            <div style={{ fontSize: '10px', color: '#666', whiteSpace: 'pre-wrap', marginTop: '2px' }}>
                              {suffix.replace(/^\n/, '')}
                            </div>
                          ) : null}
                        </td>
                      )
                    }
                    return (
                      <td
                        key={ci}
                        style={{
                          ...TD,
                          color: text ? '#000' : '#ccc',
                          fontSize: '10px',
                          width: (isMobilePreset && isRowNumberColumnKey(colKey)) ? `${rowNumberColW}px` : undefined,
                          minWidth: (isMobilePreset && isRowNumberColumnKey(colKey)) ? `${rowNumberColW}px` : undefined,
                          maxWidth: (isMobilePreset && isRowNumberColumnKey(colKey)) ? `${rowNumberColW}px` : undefined,
                          padding: (isMobilePreset && isRowNumberColumnKey(colKey)) ? '0 2px' : TD.padding,
                          textAlign: (isMobilePreset && isRowNumberColumnKey(colKey)) ? 'center' : TD.textAlign
                        }}
                      >
                        {text || ''}
                      </td>
                    )
                  })}
                </tr>
              )})
            ) : (
              /* Items mode: 1 item → 1 row, editable, with # and Tools columns */
              items.map((item, idx) => {
                const isFlagged = session.flaggedDuplicateIds.has(item.id)
                const isIgnoreFlagged = session.flaggedIgnoreIds.has(item.id)
                const ignoreRuleName = session.ignoreRuleByItemId[item.id] || ''
                const isTokenized = session.tokenizedIds.has(item.id)
                const isReverted = isTokenized && session.revertedTokenIds.has(item.id)
                const originalContent = isTokenized ? (baseContentById[item.id] || '') : ''
                const tokenizedContent = isTokenized ? (session.tokenizedItems[item.id] || '') : ''
                const row = projected.rows[idx]
                const renderToolsCell = () => (
                  <span>
                    {isIgnoreFlagged && <IgnoreBadge ruleName={ignoreRuleName} />}
                    {isFlagged && (
                      <span title="Possible duplicate" style={{ fontSize: '8px', color: '#b36b00', backgroundColor: '#fff8e6', padding: '1px 3px', borderRadius: '3px', marginRight: '2px', fontWeight: 600 }}>Dup?</span>
                    )}
                    {isTokenized && (
                      <button
                        onClick={() => onSessionChange(toggleTokenizedItem(session, item.id))}
                        title={isReverted
                          ? `Showing original — click to re-apply token:\n"${tokenizedContent}"`
                          : `Tokenized — click to show original:\n"${originalContent}"`}
                        style={{ ...TOOL_BTN, color: isReverted ? '#aaa' : '#6b21a8', opacity: isReverted ? 0.6 : 1 }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = isReverted ? '#f0f0f0' : '#f5f3ff' }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}
                      >
                        <RefreshIcon width={12} height={12} />
                      </button>
                    )}
                    {item.nodeId && (
                      <button onClick={() => onExportRowRefImage(item.nodeId)} title="Get ref image for this row" style={{ ...TOOL_BTN, color: '#333333' }} onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#eef' }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}>
                        <ImageDownloadIcon width={14} height={14} />
                      </button>
                    )}
                    <button onClick={() => onSessionChange(deleteItem(session, item.id))} title="Delete row" style={{ ...TOOL_BTN, color: '#cc3333' }} onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#fee' }} onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent' }}>
                      <CloseIcon width={14} height={14} />
                    </button>
                  </span>
                )
                return (
                  <tr key={item.id} style={{ borderBottom: '1px solid #eee' }}>
                    <td style={{ ...TD, color: '#999', fontSize: '10px', width: `${rowNumberColW}px`, minWidth: `${rowNumberColW}px`, maxWidth: `${rowNumberColW}px`, padding: isMobilePreset ? '0 2px' : TD.padding, textAlign: 'center' }}>{idx + 1}</td>
                    {row.map((cell, ci) => {
                      const colKey = projected.columnKeys[ci]
                      if (showToolsActions && isToolsColumnKey(colKey)) return <td key={colKey} style={{ ...TD, textAlign: 'center', whiteSpace: 'nowrap' }}>{renderToolsCell()}</td>
                      const href = cellHref(cell)
                      const text = cellText(cell)
                      const suffix = cellSuffix(cell)

                      if (href) {
                        const linkText = typeof cell === 'string' ? text : cell.text
                        return (
                          <td key={colKey} style={TD}>
                            <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: '#0066cc', textDecoration: 'underline', fontSize: '10px' }} title={href}>{linkText}</a>
                            {suffix ? (
                              <div style={{ fontSize: '10px', color: '#666', whiteSpace: 'pre-wrap', marginTop: '2px' }}>
                                {suffix.replace(/^\n/, '')}
                              </div>
                            ) : null}
                          </td>
                        )
                      }

                      const fieldKey = editableFieldMap[colKey]
                      if (fieldKey) {
                        const curVal = fieldKey === 'content' ? item.content.value : (item[fieldKey] as string || '')
                        if (fieldKey === 'content') {
                          return (
                            <td key={colKey} style={{ ...TD, verticalAlign: 'top', padding: TD.padding }}>
                              <textarea
                                defaultValue={curVal}
                                onBlur={(e) => {
                                  const v = e.currentTarget.value
                                  if (v !== curVal) onSessionChange(applyEdit(session, item.id, fieldKey, v))
                                }}
                                style={{
                                  ...CELL_INPUT,
                                  resize: 'none',
                                  overflowY: 'hidden',
                                  minHeight: '20px',
                                  lineHeight: '1.45',
                                  overflowWrap: 'anywhere',
                                  whiteSpace: 'pre-wrap',
                                  display: 'block'
                                }}
                                ref={(el: HTMLTextAreaElement | null) => {
                                  if (el) { el.style.height = 'auto'; el.style.height = `${el.scrollHeight}px` }
                                }}
                                onInput={(e) => {
                                  const el = e.currentTarget as HTMLTextAreaElement
                                  el.style.height = 'auto'
                                  el.style.height = `${el.scrollHeight}px`
                                }}
                                onFocus={(e) => { e.currentTarget.style.borderColor = '#0d99ff'; e.currentTarget.style.backgroundColor = '#fff' }}
                                onBlurCapture={(e) => { e.currentTarget.style.borderColor = 'transparent'; e.currentTarget.style.backgroundColor = 'transparent' }}
                              />
                            </td>
                          )
                        }
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
                    {showTrailingToolsColumn ? <td style={{ ...TD, textAlign: 'center', whiteSpace: 'nowrap' }}>{renderToolsCell()}</td> : null}
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
          {CTA_ACTION_LABELS.appendSelection}
        </button>
        {onViewOnStage && (
          <button onClick={() => onViewOnStage(items)} style={actionBtnStyle(false)}>
            {CTA_ACTION_LABELS.viewOnStage}
          </button>
        )}
        <button
          onClick={() => onCopyToClipboard(items)}
          disabled={isCopying}
          style={{ ...actionBtnStyle(isCopying), display: 'flex', alignItems: 'center', gap: '5px' }}
        >
          <CopyIcon width={12} height={12} />
          {isCopying ? 'Copying...' : 'Table'}
        </button>
        <button
          onClick={() => onCopyRowsToClipboard(items)}
          disabled={isCopying}
          title="Copy data rows only (no header)"
          style={{ ...actionBtnStyle(isCopying), display: 'flex', alignItems: 'center', gap: '5px' }}
        >
          <CopyIcon width={12} height={12} />
          {isCopying ? 'Copying...' : 'Rows'}
        </button>
      </div>
    </div>
  )
}
