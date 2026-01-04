/**
 * Rich Text Theme Tokens
 * Semantic styling tokens for rich text rendering
 */

export const richTextTheme = {
  heading: {
    h1: {
      fontSize: 16,
      fontWeight: 700,
      lineHeight: 1.4,
      marginBottom: 8,
      marginTop: 12
    },
    h2: {
      fontSize: 14,
      fontWeight: 600,
      lineHeight: 1.4,
      marginBottom: 6,
      marginTop: 10
    },
    h3: {
      fontSize: 13,
      fontWeight: 600,
      lineHeight: 1.4,
      marginBottom: 4,
      marginTop: 8
    }
  },
  paragraph: {
    fontSize: 12,
    lineHeight: 1.5,
    marginBottom: 8
  },
  list: {
    fontSize: 12,
    lineHeight: 1.5,
    marginBottom: 8,
    paddingLeft: 16,
    itemSpacing: 4
  },
  code: {
    inline: {
      fontFamily: 'monospace',
      fontSize: 11,
      backgroundColor: 'var(--bg-secondary)',
      padding: '2px 4px',
      borderRadius: 3,
      border: '1px solid var(--border)'
    },
    block: {
      fontFamily: 'monospace',
      fontSize: 11,
      backgroundColor: 'var(--bg-secondary)',
      padding: 12,
      borderRadius: 6,
      border: '1px solid var(--border)',
      marginBottom: 8,
      overflowX: 'auto',
      whiteSpace: 'pre-wrap',
      wordBreak: 'break-word'
    }
  },
  quote: {
    fontSize: 12,
    lineHeight: 1.5,
    color: 'var(--fg-secondary)',
    borderLeft: '3px solid var(--border)',
    paddingLeft: 12,
    marginBottom: 8,
    fontStyle: 'italic'
  },
  score: {
    good: '#22C55E',
    medium: '#F59E0B',
    poor: '#EF4444',
    fontSize: 12,
    fontWeight: 600,
    padding: '4px 8px',
    borderRadius: 4,
    marginBottom: 4
  },
  divider: {
    height: 1,
    backgroundColor: 'var(--border)',
    marginTop: 12,
    marginBottom: 12
  },
  structured: {
    scorecard: {
      padding: 'var(--spacing-md)',
      borderRadius: 'var(--radius-md)',
      backgroundColor: 'var(--bg)',
      border: '1px solid var(--border)'
    },
    strengths: {
      borderColor: 'var(--success)',
      backgroundColor: 'var(--bg)'
    },
    issues: {
      borderColor: 'var(--warning)',
      backgroundColor: 'var(--bg)'
    },
    recommendations: {
      borderColor: 'var(--accent)',
      backgroundColor: 'var(--bg)'
    },
    warning: {
      borderColor: 'var(--warning)',
      backgroundColor: 'var(--bg)'
    },
    nextSteps: {
      backgroundColor: 'var(--bg-secondary)',
      borderColor: 'var(--border)'
    }
  }
}

/**
 * Get score color based on value
 */
export function getScoreColor(value: number, max: number = 100): string {
  const percentage = (value / max) * 100
  if (percentage >= 80) return richTextTheme.score.good
  if (percentage >= 50) return richTextTheme.score.medium
  return richTextTheme.score.poor
}

