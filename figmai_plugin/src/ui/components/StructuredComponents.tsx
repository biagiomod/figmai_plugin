/**
 * Structured UI Components
 * Reusable components for rendering structured assistant responses
 * These components render data deterministically without interpretation
 */

import { h } from 'preact'
import { richTextTheme, getScoreColor } from '../styles/richTextTheme'

/**
 * Scorecard Component
 * Renders a structured scorecard with score, wins, fixes, checklist, and notes
 */
export function Scorecard({
  score,
  max = 100,
  wins = [],
  fixes = [],
  checklist = [],
  notes
}: {
  score: number
  max?: number
  wins?: string[]
  fixes?: string[]
  checklist?: string[]
  notes?: string
}): h.JSX.Element {
  const percentage = ((score / max) * 100).toFixed(0)
  const color = getScoreColor(score, max)

  return (
    <div
      style={{
        padding: 'var(--spacing-md)',
        borderRadius: 'var(--radius-md)',
        backgroundColor: 'var(--bg)',
        border: '1px solid var(--border)',
        fontSize: 'var(--font-size-sm)',
        width: '100%',
        userSelect: 'text',
        WebkitUserSelect: 'text',
        MozUserSelect: 'text',
        msUserSelect: 'text',
        cursor: 'text'
      }}
    >
      {/* Score Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 'var(--spacing-sm)',
          marginBottom: 'var(--spacing-md)',
          paddingBottom: 'var(--spacing-sm)',
          borderBottom: '1px solid var(--border)'
        }}
      >
        <div
          style={{
            fontSize: 'var(--font-size-2xl)',
            fontWeight: 'var(--font-weight-bold)',
            color: color,
            userSelect: 'text',
            WebkitUserSelect: 'text',
            MozUserSelect: 'text',
            msUserSelect: 'text'
          }}
        >
          {score}
        </div>
        <div
          style={{
            fontSize: 'var(--font-size-sm)',
            color: 'var(--muted)',
            userSelect: 'text',
            WebkitUserSelect: 'text',
            MozUserSelect: 'text',
            msUserSelect: 'text'
          }}
        >
          / {max}
        </div>
        <div
          style={{
            fontSize: 'var(--font-size-sm)',
            color: 'var(--fg-secondary)',
            marginLeft: 'auto',
            userSelect: 'text',
            WebkitUserSelect: 'text',
            MozUserSelect: 'text',
            msUserSelect: 'text'
          }}
        >
          ({percentage}%)
        </div>
      </div>

      {/* Wins */}
      {wins.length > 0 && (
        <div style={{ marginBottom: 'var(--spacing-sm)' }}>
          <div
            style={{
              fontWeight: 'var(--font-weight-semibold)',
              marginBottom: 'var(--spacing-xs)',
              color: 'var(--success)',
              fontSize: 'var(--font-size-sm)'
            }}
          >
            Wins
          </div>
          {wins.map((win, i) => (
            <div
              key={i}
              style={{
                fontSize: 'var(--font-size-xs)',
                marginBottom: 'var(--spacing-xs)',
                paddingLeft: 'var(--spacing-sm)',
                userSelect: 'text',
                WebkitUserSelect: 'text',
                MozUserSelect: 'text',
                msUserSelect: 'text',
                color: 'var(--fg)'
              }}
            >
              • {win}
            </div>
          ))}
        </div>
      )}

      {/* Fixes */}
      {fixes.length > 0 && (
        <div style={{ marginBottom: 'var(--spacing-sm)' }}>
          <div
            style={{
              fontWeight: 'var(--font-weight-semibold)',
              marginBottom: 'var(--spacing-xs)',
              color: 'var(--warning)',
              fontSize: 'var(--font-size-sm)'
            }}
          >
            Fixes
          </div>
          {fixes.map((fix, i) => (
            <div
              key={i}
              style={{
                fontSize: 'var(--font-size-xs)',
                marginBottom: 'var(--spacing-xs)',
                paddingLeft: 'var(--spacing-sm)',
                userSelect: 'text',
                WebkitUserSelect: 'text',
                MozUserSelect: 'text',
                msUserSelect: 'text',
                color: 'var(--fg)'
              }}
            >
              • {fix}
            </div>
          ))}
        </div>
      )}

      {/* Checklist */}
      {checklist.length > 0 && (
        <div style={{ marginBottom: 'var(--spacing-sm)' }}>
          <div
            style={{
              fontWeight: 'var(--font-weight-semibold)',
              marginBottom: 'var(--spacing-xs)',
              fontSize: 'var(--font-size-sm)',
              color: 'var(--fg)'
            }}
          >
            Checklist
          </div>
          {checklist.map((item, i) => (
            <div
              key={i}
              style={{
                fontSize: 'var(--font-size-xs)',
                marginBottom: 'var(--spacing-xs)',
                paddingLeft: 'var(--spacing-sm)',
                userSelect: 'text',
                WebkitUserSelect: 'text',
                MozUserSelect: 'text',
                msUserSelect: 'text',
                color: 'var(--fg)'
              }}
            >
              {item}
            </div>
          ))}
        </div>
      )}

      {/* Notes */}
      {notes && (
        <div
          style={{
            marginTop: 'var(--spacing-sm)',
            paddingTop: 'var(--spacing-sm)',
            borderTop: '1px solid var(--border)',
            fontSize: 'var(--font-size-xs)',
            color: 'var(--muted)',
            fontStyle: 'italic',
            userSelect: 'text',
            WebkitUserSelect: 'text',
            MozUserSelect: 'text',
            msUserSelect: 'text'
          }}
        >
          {notes}
        </div>
      )}
    </div>
  )
}

/**
 * Strengths List Component
 * Renders a list of positive items/strengths
 */
export function StrengthsList({ items }: { items: string[] }): h.JSX.Element | null {
  if (items.length === 0) return null

  return (
    <div
      style={{
        padding: 'var(--spacing-sm) var(--spacing-md)',
        borderRadius: 'var(--radius-md)',
        backgroundColor: 'var(--bg)',
        border: '1px solid var(--border)',
        borderLeft: '3px solid var(--success)',
        marginBottom: 'var(--spacing-sm)'
      }}
    >
      <div
        style={{
          fontWeight: 'var(--font-weight-semibold)',
          marginBottom: 'var(--spacing-xs)',
          color: 'var(--success)',
          fontSize: 'var(--font-size-sm)'
        }}
      >
        Strengths
      </div>
      {items.map((item, i) => (
        <div
          key={i}
          style={{
            fontSize: 'var(--font-size-xs)',
            marginBottom: 'var(--spacing-xs)',
            paddingLeft: 'var(--spacing-sm)',
            userSelect: 'text',
            WebkitUserSelect: 'text',
            MozUserSelect: 'text',
            msUserSelect: 'text',
            color: 'var(--fg)'
          }}
        >
          • {item}
        </div>
      ))}
    </div>
  )
}

/**
 * Issues List Component
 * Renders a list of issues/problems
 */
export function IssuesList({ items }: { items: string[] }): h.JSX.Element | null {
  if (items.length === 0) return null

  return (
    <div
      style={{
        padding: 'var(--spacing-sm) var(--spacing-md)',
        borderRadius: 'var(--radius-md)',
        backgroundColor: 'var(--bg)',
        border: '1px solid var(--border)',
        borderLeft: '3px solid var(--warning)',
        marginBottom: 'var(--spacing-sm)'
      }}
    >
      <div
        style={{
          fontWeight: 'var(--font-weight-semibold)',
          marginBottom: 'var(--spacing-xs)',
          color: 'var(--warning)',
          fontSize: 'var(--font-size-sm)'
        }}
      >
        Issues
      </div>
      {items.map((item, i) => (
        <div
          key={i}
          style={{
            fontSize: 'var(--font-size-xs)',
            marginBottom: 'var(--spacing-xs)',
            paddingLeft: 'var(--spacing-sm)',
            userSelect: 'text',
            WebkitUserSelect: 'text',
            MozUserSelect: 'text',
            msUserSelect: 'text',
            color: 'var(--fg)'
          }}
        >
          • {item}
        </div>
      ))}
    </div>
  )
}

/**
 * Recommendations List Component
 * Renders a list of actionable recommendations
 */
export function RecommendationsList({
  items
}: {
  items: string[]
}): h.JSX.Element | null {
  if (items.length === 0) return null

  return (
    <div
      style={{
        padding: 'var(--spacing-sm) var(--spacing-md)',
        borderRadius: 'var(--radius-md)',
        backgroundColor: 'var(--bg)',
        border: '1px solid var(--border)',
        borderLeft: '3px solid var(--accent)',
        marginBottom: 'var(--spacing-sm)'
      }}
    >
      <div
        style={{
          fontWeight: 'var(--font-weight-semibold)',
          marginBottom: 'var(--spacing-xs)',
          color: 'var(--accent)',
          fontSize: 'var(--font-size-sm)'
        }}
      >
        Recommendations
      </div>
      {items.map((item, i) => (
        <div
          key={i}
          style={{
            fontSize: 'var(--font-size-xs)',
            marginBottom: 'var(--spacing-xs)',
            paddingLeft: 'var(--spacing-sm)',
            userSelect: 'text',
            WebkitUserSelect: 'text',
            MozUserSelect: 'text',
            msUserSelect: 'text',
            color: 'var(--fg)'
          }}
        >
          • {item}
        </div>
      ))}
    </div>
  )
}

/**
 * Warning Component
 * Renders a warning/alert message
 */
export function Warning({
  title,
  message
}: {
  title?: string
  message: string
}): h.JSX.Element {
  return (
    <div
      style={{
        padding: 'var(--spacing-sm) var(--spacing-md)',
        borderRadius: 'var(--radius-md)',
        backgroundColor: 'var(--bg)',
        border: '1px solid var(--warning)',
        borderLeft: '3px solid var(--warning)',
        marginBottom: 'var(--spacing-sm)'
      }}
    >
      {title && (
        <div
          style={{
            fontWeight: 'var(--font-weight-semibold)',
            marginBottom: 'var(--spacing-xs)',
            color: 'var(--warning)',
            fontSize: 'var(--font-size-sm)'
          }}
        >
          {title}
        </div>
      )}
      <div
        style={{
          fontSize: 'var(--font-size-xs)',
          color: 'var(--fg)',
          userSelect: 'text',
          WebkitUserSelect: 'text',
          MozUserSelect: 'text',
          msUserSelect: 'text'
        }}
      >
        {message}
      </div>
    </div>
  )
}

/**
 * Next Steps Component
 * Renders a list of next steps/actions
 */
export function NextSteps({ items }: { items: string[] }): h.JSX.Element | null {
  if (items.length === 0) return null

  return (
    <div
      style={{
        padding: 'var(--spacing-sm) var(--spacing-md)',
        borderRadius: 'var(--radius-md)',
        backgroundColor: 'var(--bg-secondary)',
        border: '1px solid var(--border)',
        marginBottom: 'var(--spacing-sm)'
      }}
    >
      <div
        style={{
          fontWeight: 'var(--font-weight-semibold)',
          marginBottom: 'var(--spacing-xs)',
          fontSize: 'var(--font-size-sm)',
          color: 'var(--fg)'
        }}
      >
        Next Steps
      </div>
      {items.map((item, i) => (
        <div
          key={i}
          style={{
            fontSize: 'var(--font-size-xs)',
            marginBottom: 'var(--spacing-xs)',
            paddingLeft: 'var(--spacing-sm)',
            userSelect: 'text',
            WebkitUserSelect: 'text',
            MozUserSelect: 'text',
            msUserSelect: 'text',
            color: 'var(--fg)'
          }}
        >
          {i + 1}. {item}
        </div>
      ))}
    </div>
  )
}

