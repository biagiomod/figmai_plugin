/**
 * HTML Prototype Renderer for Design Workshop Assistant
 *
 * Pure function: receives DesignSpecV1, returns a self-contained HTML string.
 * No Figma API calls. No external network dependencies.
 *
 * Font: system font stack (Open Sans first, falls back gracefully — private-safe).
 * Jazz tokens: applied as CSS custom properties.
 */

import type { DesignSpecV1, BlockSpec } from './types'

const JAZZ_CSS_VARS = `
  --jazz-primary: #005EB8;
  --jazz-navy: #002F6C;
  --jazz-cta: #128842;
  --jazz-text: #101820;
  --jazz-muted: #676C6F;
  --jazz-border: #D4D4D4;
  --jazz-surface: #FFFFFF;
  --jazz-surface1: #F5F7F8;
  --jazz-icon-bg: #E8F0FA;
  --jazz-error: #BF2155;
  --jazz-radius: 4px;
  --jazz-font: "Open Sans", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
`

const BASE_CSS = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: var(--jazz-font);
    background: var(--jazz-surface1);
    color: var(--jazz-text);
    padding: 32px 16px;
  }

  .screens {
    display: flex;
    flex-wrap: wrap;
    gap: 32px;
    justify-content: center;
    align-items: flex-start;
  }

  .screen {
    background: var(--jazz-surface);
    border: 1px solid var(--jazz-border);
    border-radius: var(--jazz-radius);
    box-shadow: 0 2px 6px rgba(0,0,0,0.08);
    width: 375px;
    min-height: 200px;
    overflow: hidden;
    flex-shrink: 0;
  }

  .screen-name {
    font-size: 10px;
    font-weight: 700;
    color: var(--jazz-muted);
    text-transform: uppercase;
    letter-spacing: 0.06em;
    padding: 8px 16px;
    background: var(--jazz-surface1);
    border-bottom: 1px solid var(--jazz-border);
  }

  .screen-content {
    display: flex;
    flex-direction: column;
  }

  /* Block types */

  .block-heading {
    font-family: var(--jazz-font);
    color: var(--jazz-text);
    font-weight: 600;
    line-height: 1.2;
  }
  .block-heading.h1 { font-size: 24px; }
  .block-heading.h2 { font-size: 20px; }
  .block-heading.h3 { font-size: 16px; }

  .block-body-text {
    font-size: 14px;
    line-height: 1.5;
    color: var(--jazz-text);
  }

  .block-button {
    display: block;
    width: 100%;
    font-family: var(--jazz-font);
    font-size: 14px;
    font-weight: 600;
    padding: 12px 16px;
    border-radius: var(--jazz-radius);
    border: none;
    cursor: pointer;
    text-align: center;
    text-decoration: none;
  }
  .block-button.primary {
    background: var(--jazz-cta);
    color: #ffffff;
    border: none;
  }
  .block-button.secondary {
    background: var(--jazz-surface);
    color: var(--jazz-primary);
    border: 1px solid var(--jazz-primary);
  }
  .block-button.tertiary {
    background: transparent;
    color: var(--jazz-muted);
    border: 1px solid var(--jazz-border);
  }

  .block-input-wrap {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .block-input-label {
    font-size: 12px;
    font-weight: 600;
    color: var(--jazz-text);
  }
  .block-input {
    font-family: var(--jazz-font);
    font-size: 14px;
    color: var(--jazz-text);
    background: var(--jazz-surface);
    border: 1px solid var(--jazz-border);
    border-radius: var(--jazz-radius);
    padding: 10px 12px;
    width: 100%;
    outline: none;
  }
  .block-input::placeholder { color: var(--jazz-muted); }

  .block-card {
    background: var(--jazz-surface);
    border: 1px solid var(--jazz-border);
    border-left: 4px solid var(--jazz-primary);
    border-radius: var(--jazz-radius);
    padding: 14px 16px;
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  .block-card-title {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--jazz-muted);
  }
  .block-card-content {
    font-size: 18px;
    font-weight: 600;
    color: var(--jazz-text);
    line-height: 1.3;
  }

  .block-image {
    background: var(--jazz-surface1);
    border: 1px solid var(--jazz-border);
    border-radius: var(--jazz-radius);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--jazz-muted);
    font-size: 12px;
  }
`

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function renderBlock(block: BlockSpec, gap: number): string {
  const marginBottom = `${gap}px`

  switch (block.type) {
    case 'heading': {
      const level = block.level ?? 1
      const tag = level === 1 ? 'h1' : level === 2 ? 'h2' : 'h3'
      const cls = `h${level}`
      return `<${tag} class="block-heading ${cls}" style="margin-bottom:${marginBottom}">${escapeHtml(block.text)}</${tag}>`
    }

    case 'bodyText': {
      return `<p class="block-body-text" style="margin-bottom:${marginBottom}">${escapeHtml(block.text)}</p>`
    }

    case 'button': {
      const variant = block.variant ?? 'primary'
      return `<button class="block-button ${variant}" style="margin-bottom:${marginBottom}">${escapeHtml(block.text)}</button>`
    }

    case 'input': {
      const inputType = block.inputType ?? 'text'
      const label = block.label ?? ''
      const placeholder = block.placeholder ?? ''
      return `<div class="block-input-wrap" style="margin-bottom:${marginBottom}">
  <label class="block-input-label">${escapeHtml(label)}</label>
  <input class="block-input" type="${inputType}" placeholder="${escapeHtml(placeholder)}" />
</div>`
    }

    case 'card': {
      const title = block.title ?? ''
      return `<div class="block-card" style="margin-bottom:${marginBottom}">
  <div class="block-card-title">${escapeHtml(title)}</div>
  <div class="block-card-content">${escapeHtml(block.content)}</div>
</div>`
    }

    case 'spacer': {
      const height = block.height ?? 16
      return `<div style="height:${height}px;flex-shrink:0"></div>`
    }

    case 'image': {
      const w = block.width ?? 100
      const h = block.height ?? 80
      return `<div class="block-image" style="width:100%;height:${h}px;margin-bottom:${marginBottom}">Image ${w}×${h}</div>`
    }

    default: {
      // Unknown block type — skip
      return ''
    }
  }
}

function resolvePadding(padding: number | { top?: number; right?: number; bottom?: number; left?: number } | undefined): string {
  if (padding === undefined) return '24px'
  if (typeof padding === 'number') return `${padding}px`
  const t = padding.top ?? 24
  const r = padding.right ?? 24
  const b = padding.bottom ?? 24
  const l = padding.left ?? 24
  return `${t}px ${r}px ${b}px ${l}px`
}

function renderScreen(screen: DesignSpecV1['screens'][0]): string {
  const gap = screen.layout?.gap ?? 16
  const paddingCss = resolvePadding(screen.layout?.padding)

  const blocks = (screen.blocks ?? [])
    .map(block => renderBlock(block, gap))
    .join('\n    ')

  return `<div class="screen">
  <div class="screen-name">${escapeHtml(screen.name)}</div>
  <div class="screen-content" style="padding:${paddingCss}">
    ${blocks}
  </div>
</div>`
}

export function renderToHtml(spec: DesignSpecV1): string {
  const title = spec.meta?.title ?? 'Design Export'
  const screens = (spec.screens ?? []).map(s => renderScreen(s)).join('\n    ')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  <style>
    :root {
      ${JAZZ_CSS_VARS.trim()}
    }
    ${BASE_CSS.trim()}
  </style>
</head>
<body>
  <div class="screens">
    ${screens}
  </div>
</body>
</html>`
}
