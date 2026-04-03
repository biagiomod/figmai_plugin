/**
 * Shared inline styles for tool-assistant table views (CT-A, AT-A).
 * Keeps table rendering consistent across tool assistants.
 */

import type { h } from 'preact'

export const TH: h.JSX.CSSProperties = {
  padding: '5px 6px',
  borderBottom: '2px solid #ddd',
  textAlign: 'left',
  whiteSpace: 'nowrap',
  color: '#333',
  fontSize: '10px',
  fontWeight: 600
}

export const TD: h.JSX.CSSProperties = {
  padding: '3px 6px',
  color: '#000',
  fontSize: '11px',
  verticalAlign: 'top'
}

export const CELL_INPUT: h.JSX.CSSProperties = {
  width: '100%',
  border: '1px solid transparent',
  borderRadius: '3px',
  padding: '2px 4px',
  fontSize: '11px',
  fontFamily: 'inherit',
  color: '#000',
  backgroundColor: 'transparent',
  outline: 'none'
}

export const TOOL_BTN: h.JSX.CSSProperties = {
  border: 'none',
  background: 'none',
  cursor: 'pointer',
  padding: '4px',
  borderRadius: '3px',
  lineHeight: 0,
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '24px',
  height: '24px'
}

export function actionBtnStyle(disabled: boolean): h.JSX.CSSProperties {
  return {
    padding: '5px 10px',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    backgroundColor: disabled ? 'var(--muted)' : 'var(--bg-secondary)',
    color: disabled ? '#ffffff' : 'var(--fg)',
    cursor: disabled ? 'not-allowed' : 'pointer',
    fontSize: '11px',
    opacity: 1
  }
}
