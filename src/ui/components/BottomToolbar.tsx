/**
 * Bottom Toolbar — shared shell component, always visible.
 * Renders selection indicator + assistant switcher + conditional send button.
 * Rendered unconditionally after the input-area branch in ui.tsx.
 * Hidden send button when assistant.id === 'design_workshop' or assistant.uiMode === 'tool'.
 */
import { h } from 'preact'
import { ArrowUpIcon } from '../icons'

interface SelectionState {
  hasSelection: boolean
  count?: number
  names?: string[]
}

interface AssistantInfo {
  id: string
  label: string
  iconId?: string
  uiMode?: string
}

interface BottomToolbarProps {
  selectionState: SelectionState
  selectionRequired: boolean
  showSelectionHint: boolean
  onSelectionClick: () => void
  assistant: AssistantInfo
  onAssistantClick: () => void
  onSend: () => void
  isGenerating: boolean
  canSend: boolean
  getSelectionIcon: () => h.JSX.Element | null
  getAssistantIcon: (iconId?: string) => h.JSX.Element | null
}

export function BottomToolbar({
  selectionState,
  selectionRequired,
  showSelectionHint,
  onSelectionClick,
  assistant,
  onAssistantClick,
  onSend,
  isGenerating,
  canSend,
  getSelectionIcon,
  getAssistantIcon,
}: BottomToolbarProps) {
  const hideSendButton = assistant.uiMode === 'tool'

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--spacing-sm)',
      padding: 'var(--spacing-sm) var(--spacing-md) var(--spacing-md)'
    }}>
      {/* Selection Indicator */}
      <button
        onClick={onSelectionClick}
        style={{
          flex: 1,
          height: '36px',
          padding: '0 var(--spacing-sm)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          backgroundColor: selectionState.hasSelection
            ? 'var(--success)'
            : (selectionRequired
              ? 'var(--error)'
              : (showSelectionHint
                ? 'var(--hint-bg)'
                : 'var(--bg)')),
          color: selectionState.hasSelection
            ? 'var(--success-text)'
            : selectionRequired
            ? 'var(--error-text)'
            : 'var(--fg)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-start',
          gap: 'var(--spacing-xs)',
          overflow: 'hidden',
          textAlign: 'left'
        }}
        title={
          selectionState.hasSelection && selectionState.names
            ? selectionState.names.join(', ')
            : selectionState.hasSelection
            ? `${selectionState.count} item(s) selected`
            : 'No selection'
        }
      >
        {getSelectionIcon()}
        {showSelectionHint && !selectionState.hasSelection && !selectionRequired ? (
          <span style={{
            fontSize: '10px',
            fontFamily: 'var(--font-family)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            flex: 1,
            minWidth: 0,
            textAlign: 'left'
          }}>
            Select element/s (frame, layer, etc.)
          </span>
        ) : selectionState.hasSelection && selectionState.names && selectionState.names.length > 0 ? (
          <span style={{
            fontSize: 'var(--font-size-sm)',
            fontFamily: 'var(--font-family)',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            flex: 1,
            minWidth: 0,
            textAlign: 'left'
          }}>
            {selectionState.names.length === 1
              ? selectionState.names[0]
              : selectionState.names.length <= 3
              ? selectionState.names.join(', ')
              : `${selectionState.names.slice(0, 2).join(', ')} +${selectionState.names.length - 2} more`}
          </span>
        ) : null}
      </button>

      {/* Assistant Selector */}
      <button
        onClick={onAssistantClick}
        style={{
          height: '36px',
          padding: '0 var(--spacing-md)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-sm)',
          backgroundColor: 'var(--bg)',
          color: 'var(--fg)',
          cursor: 'pointer',
          fontSize: 'var(--font-size-sm)',
          fontFamily: 'var(--font-family)',
          whiteSpace: 'nowrap',
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--spacing-xs)',
          flexShrink: 0
        }}
        title="Select assistant"
      >
        {getAssistantIcon(assistant.iconId)}
        {assistant.label}
        <svg width="12" height="12" viewBox="0 0 12 12" fill="currentColor">
          <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
      </button>

      {/* Send Button — hidden for DW-A and tool-mode assistants */}
      {!hideSendButton && (
        <button
          type="button"
          onClick={onSend}
          disabled={isGenerating || !canSend}
          style={{
            width: '36px',
            height: '36px',
            padding: '0',
            border: 'none',
            borderRadius: 'var(--radius-sm)',
            backgroundColor: (isGenerating || !canSend) ? 'var(--muted)' : 'var(--accent)',
            cursor: (isGenerating || !canSend) ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}
        >
          <ArrowUpIcon width={20} height={20} style={{ color: 'white' }} />
        </button>
      )}
    </div>
  )
}
