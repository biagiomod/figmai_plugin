/**
 * Rich Text Renderer
 * Renders RichTextNode AST into Preact components
 */

import { h } from 'preact'
import type { RichTextNode, InlineNode } from '../../core/richText/types'
import { richTextTheme, getScoreColor } from '../styles/richTextTheme'
import {
  Scorecard,
  StrengthsList,
  IssuesList,
  RecommendationsList,
  Warning,
  NextSteps
} from './StructuredComponents'

interface RichTextRendererProps {
  nodes: RichTextNode[]
}

/**
 * Render inline nodes (bold, italic, code, links)
 */
function renderInline(nodes: InlineNode[] | undefined, text: string): h.JSX.Element[] {
  if (!nodes || nodes.length === 0) {
    return [<span>{text}</span>]
  }

  return nodes.map((node, index) => {
    switch (node.type) {
      case 'text':
        return <span key={index} style={{ userSelect: 'text', WebkitUserSelect: 'text' }}>{node.text}</span>
      case 'bold':
        return (
          <strong key={index} style={{ fontWeight: 600, userSelect: 'text', WebkitUserSelect: 'text' }}>
            {node.text}
          </strong>
        )
      case 'italic':
        return (
          <em key={index} style={{ fontStyle: 'italic', userSelect: 'text', WebkitUserSelect: 'text' }}>
            {node.text}
          </em>
        )
      case 'code':
        return (
          <code
            key={index}
            style={{
              ...richTextTheme.code.inline,
              display: 'inline',
              userSelect: 'text',
              WebkitUserSelect: 'text'
            }}
          >
            {node.text}
          </code>
        )
      case 'link':
        return (
          <a
            key={index}
            href={node.url}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: 'var(--accent)',
              textDecoration: 'underline',
              cursor: 'pointer',
              userSelect: 'text',
              WebkitUserSelect: 'text'
            }}
          >
            {node.text}
          </a>
        )
    }
  })
}

/**
 * Render a single RichTextNode
 */
function renderNode(node: RichTextNode, index: number): h.JSX.Element {
  switch (node.type) {
    case 'heading': {
      const theme = richTextTheme.heading[`h${node.level}` as 'h1' | 'h2' | 'h3']
      return (
        <div
          key={index}
          style={{
            fontSize: theme.fontSize,
            fontWeight: theme.fontWeight,
            lineHeight: theme.lineHeight,
            marginTop: theme.marginTop,
            marginBottom: theme.marginBottom,
            color: 'var(--fg)',
            userSelect: 'text',
            WebkitUserSelect: 'text',
            MozUserSelect: 'text',
            msUserSelect: 'text'
          }}
        >
          {node.text}
        </div>
      )
    }

    case 'paragraph': {
      const inlineNodes = node.inline || [{ type: 'text', text: node.text }]
      return (
        <div
          key={index}
          style={{
            ...richTextTheme.paragraph,
            color: 'var(--fg)',
            userSelect: 'text',
            WebkitUserSelect: 'text',
            MozUserSelect: 'text',
            msUserSelect: 'text'
          }}
        >
          {renderInline(inlineNodes, node.text)}
        </div>
      )
    }

    case 'list': {
      return (
        <div
          key={index}
          style={{
            ...richTextTheme.list,
            color: 'var(--fg)',
            userSelect: 'text',
            WebkitUserSelect: 'text',
            MozUserSelect: 'text',
            msUserSelect: 'text'
          }}
        >
          {node.items.map((item, itemIndex) => {
            // Extract text from inline nodes for fallback
            const itemText = item.map(n => n.type === 'text' ? n.text : n.text).join('')
            return (
              <div
                key={itemIndex}
                style={{
                  marginBottom: richTextTheme.list.itemSpacing,
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 8
                }}
              >
                <span style={{ flexShrink: 0, marginTop: 2 }}>
                  {node.ordered ? `${itemIndex + 1}.` : '•'}
                </span>
                <span style={{ flex: 1, userSelect: 'text', WebkitUserSelect: 'text' }}>
                  {renderInline(item, itemText)}
                </span>
              </div>
            )
          })}
        </div>
      )
    }

    case 'code': {
      if (node.inline) {
        return (
          <code
            key={index}
            style={{
              ...richTextTheme.code.inline,
              display: 'inline',
              userSelect: 'text',
              WebkitUserSelect: 'text',
              MozUserSelect: 'text',
              msUserSelect: 'text'
            }}
          >
            {node.text}
          </code>
        )
      } else {
        return (
          <pre
            key={index}
            style={{
              ...richTextTheme.code.block,
              color: 'var(--fg)',
              userSelect: 'text',
              WebkitUserSelect: 'text',
              MozUserSelect: 'text',
              msUserSelect: 'text'
            }}
          >
            <code style={{ userSelect: 'text', WebkitUserSelect: 'text' }}>{node.text}</code>
          </pre>
        )
      }
    }

    case 'quote': {
      const inlineNodes = node.inline || [{ type: 'text', text: node.text }]
      return (
        <div
          key={index}
          style={{
            ...richTextTheme.quote,
            color: 'var(--fg-secondary)',
            userSelect: 'text',
            WebkitUserSelect: 'text',
            MozUserSelect: 'text',
            msUserSelect: 'text'
          }}
        >
          {renderInline(inlineNodes, node.text)}
        </div>
      )
    }

    case 'score': {
      // Skip rendering progress indicators (generate, progress, processing)
      const labelLower = node.label?.toLowerCase() || ''
      if (labelLower === 'generate' || labelLower === 'progress' || labelLower === 'processing') {
        // Don't render progress indicators - return empty div
        return <div key={index} style={{ display: 'none' }} />
      }
      
      // Special handling for "Found:" label (Content Table Assistant)
      if (labelLower === 'found') {
        const displayText = `Found: ${node.value}`
        const color = '#22C55E' // Green color for "Found" tags
        
        return (
          <span
            key={index}
            style={{
              ...richTextTheme.score,
              backgroundColor: color,
              color: '#ffffff',
              display: 'inline-block',
              marginBottom: richTextTheme.score.marginBottom
            }}
          >
            {displayText}
          </span>
        )
      }
      
      const percentage = ((node.value / (node.max || 100)) * 100).toFixed(0)
      const color = getScoreColor(node.value, node.max)
      const displayText = node.label
        ? `${node.label}: ${node.value}/${node.max || 100}`
        : `${node.value}/${node.max || 100}`

      return (
        <div
          key={index}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            marginBottom: richTextTheme.score.marginBottom
          }}
        >
          <span
            style={{
              ...richTextTheme.score,
              backgroundColor: color,
              color: '#ffffff',
              display: 'inline-block'
            }}
          >
            {displayText}
          </span>
          <span
            style={{
              fontSize: richTextTheme.score.fontSize,
              color: 'var(--fg-secondary)'
            }}
          >
            ({percentage}%)
          </span>
        </div>
      )
    }

    case 'divider': {
      return (
        <div
          key={index}
          style={{
            ...richTextTheme.divider,
            width: '100%'
          }}
        />
      )
    }

    case 'scorecard': {
      return (
        <Scorecard
          key={index}
          score={node.score}
          max={node.max}
          wins={node.wins}
          fixes={node.fixes}
          checklist={node.checklist}
          notes={node.notes}
        />
      )
    }

    case 'strengths': {
      return <StrengthsList key={index} items={node.items} />
    }

    case 'issues': {
      return <IssuesList key={index} items={node.items} />
    }

    case 'recommendations': {
      return <RecommendationsList key={index} items={node.items} />
    }

    case 'warning': {
      return (
        <Warning key={index} title={node.title} message={node.message} />
      )
    }

    case 'nextSteps': {
      return <NextSteps key={index} items={node.items} />
    }

    default:
      return <div key={index}>{JSON.stringify(node)}</div>
  }
}

/**
 * Main RichTextRenderer component
 */
export function RichTextRenderer({ nodes }: RichTextRendererProps): h.JSX.Element {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        userSelect: 'text',
        WebkitUserSelect: 'text',
        MozUserSelect: 'text',
        msUserSelect: 'text'
      }}
    >
      {nodes.map((node, index) => renderNode(node, index))}
    </div>
  )
}

