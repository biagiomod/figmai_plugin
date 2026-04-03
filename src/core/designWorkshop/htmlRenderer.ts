/**
 * HTML Prototype Renderer for Design Workshop Assistant
 *
 * Pure function: receives DesignSpecV1, returns a self-contained clickable prototype HTML string.
 * Single-file, no external runtime dependencies.
 * Fonts loaded via Google Fonts (works online; falls back to system sans-serif offline).
 * Jazz DS tokens applied via CSS custom properties.
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
  --jazz-surface1: #F2F4F5;
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
    min-height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 40px 16px 80px;
  }

  /* ── Prototype header ── */
  .proto-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 32px;
    color: var(--jazz-muted);
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.08em;
  }
  .proto-header-badge {
    background: var(--jazz-icon-bg);
    color: var(--jazz-primary);
    font-size: 10px;
    font-weight: 700;
    padding: 2px 8px;
    border-radius: 20px;
    letter-spacing: 0.04em;
  }

  /* ── Phone frame ── */
  .phone-frame {
    width: 375px;
    background: var(--jazz-surface);
    border-radius: 24px;
    box-shadow:
      0 0 0 1px rgba(0,0,0,0.08),
      0 8px 32px rgba(0,0,0,0.14),
      0 2px 6px rgba(0,0,0,0.08);
    overflow: hidden;
    flex-shrink: 0;
  }

  /* ── Status bar ── */
  .status-bar {
    background: var(--jazz-navy);
    padding: 10px 20px 8px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }
  .status-bar-time {
    font-size: 12px;
    font-weight: 700;
    color: #ffffff;
  }
  .status-bar-icons {
    display: flex;
    gap: 6px;
    align-items: center;
  }
  .status-bar-icons span {
    font-size: 11px;
    color: rgba(255,255,255,0.85);
  }

  /* ── Screen title bar ── */
  .screen-title-bar {
    background: var(--jazz-primary);
    padding: 10px 20px;
    font-size: 13px;
    font-weight: 700;
    color: #ffffff;
    letter-spacing: 0.02em;
    min-height: 40px;
    display: flex;
    align-items: center;
  }

  /* ── Screen wrapper — visibility toggle ── */
  .screen-wrapper { display: none; }
  .screen-wrapper.active { display: block; }

  /* ── Screen content ── */
  .screen-content {
    padding: 24px 20px;
    display: flex;
    flex-direction: column;
    min-height: 560px;
  }

  /* ── Block types ── */

  .block-heading {
    font-family: var(--jazz-font);
    color: var(--jazz-text);
    font-weight: 600;
    line-height: 1.25;
  }
  .block-heading.h1 { font-size: 26px; }
  .block-heading.h2 { font-size: 20px; }
  .block-heading.h3 { font-size: 16px; }

  .block-body-text {
    font-size: 15px;
    line-height: 1.55;
    color: var(--jazz-muted);
  }

  .block-button {
    display: block;
    width: 100%;
    font-family: var(--jazz-font);
    font-size: 15px;
    font-weight: 600;
    padding: 14px 16px;
    border-radius: var(--jazz-radius);
    border: none;
    cursor: pointer;
    text-align: center;
    text-decoration: none;
    transition: filter 0.12s ease;
    -webkit-appearance: none;
  }
  .block-button:hover { filter: brightness(0.94); }
  .block-button.primary {
    background: var(--jazz-cta);
    color: #ffffff;
  }
  .block-button.secondary {
    background: var(--jazz-surface);
    color: var(--jazz-primary);
    border: 1.5px solid var(--jazz-primary);
  }
  .block-button.tertiary {
    background: transparent;
    color: var(--jazz-muted);
    border: 1px solid var(--jazz-border);
  }

  .block-input-wrap {
    display: flex;
    flex-direction: column;
    gap: 5px;
  }
  .block-input-label {
    font-size: 12px;
    font-weight: 600;
    color: var(--jazz-text);
    letter-spacing: 0.01em;
  }
  .block-input {
    font-family: var(--jazz-font);
    font-size: 15px;
    color: var(--jazz-text);
    background: var(--jazz-surface);
    border: 1.5px solid var(--jazz-border);
    border-radius: var(--jazz-radius);
    padding: 11px 14px;
    width: 100%;
    outline: none;
    transition: border-color 0.12s ease;
  }
  .block-input:focus { border-color: var(--jazz-primary); }
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
  .block-card-label {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--jazz-muted);
  }
  .block-card-value {
    font-size: 20px;
    font-weight: 600;
    color: var(--jazz-text);
    line-height: 1.2;
  }

  .block-image {
    background: var(--jazz-icon-bg);
    border-radius: var(--jazz-radius);
    display: flex;
    align-items: center;
    justify-content: center;
    color: var(--jazz-muted);
    font-size: 12px;
    font-weight: 600;
  }

  /* ── Navigation ── */
  .proto-nav {
    margin-top: 28px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
    width: 375px;
  }

  .nav-dots {
    display: flex;
    gap: 8px;
    align-items: center;
  }
  .nav-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--jazz-border);
    cursor: pointer;
    transition: background 0.15s ease, transform 0.15s ease;
    border: none;
    padding: 0;
  }
  .nav-dot.active {
    background: var(--jazz-primary);
    transform: scale(1.3);
  }

  .nav-arrows {
    display: flex;
    align-items: center;
    gap: 32px;
  }
  .nav-arrow-btn {
    display: flex;
    align-items: center;
    gap: 6px;
    font-family: var(--jazz-font);
    font-size: 13px;
    font-weight: 600;
    color: var(--jazz-primary);
    background: none;
    border: none;
    cursor: pointer;
    padding: 6px 0;
    opacity: 1;
    transition: opacity 0.15s ease;
  }
  .nav-arrow-btn:disabled {
    color: var(--jazz-border);
    cursor: default;
  }
  .nav-screen-counter {
    font-size: 12px;
    font-weight: 600;
    color: var(--jazz-muted);
    min-width: 50px;
    text-align: center;
  }
`

const PANEL_CSS = `
  /* ── Workspace layout ── */
  .proto-workspace {
    display: flex;
    gap: 32px;
    align-items: flex-start;
  }

  .proto-left {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 16px;
  }

  /* Move proto-nav inside proto-left so it renders below the phone */
  .proto-nav { margin-top: 0; }

  /* ── Double Diamond panel ── */
  .dd-panel {
    width: 260px;
    flex-shrink: 0;
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding-top: 4px;
  }

  .dd-section {
    border-radius: 6px;
    overflow: hidden;
    border: 1px solid var(--jazz-border);
    background: var(--jazz-surface);
  }

  .dd-section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 12px;
    cursor: pointer;
    user-select: none;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--jazz-muted);
    background: var(--jazz-surface);
    border: none;
    width: 100%;
    text-align: left;
  }

  .dd-section-header:hover { background: var(--jazz-surface1); }

  .dd-section-header.active {
    background: var(--jazz-primary);
    color: #fff;
  }

  .dd-section-arrow {
    font-size: 10px;
    transition: transform 0.15s;
  }

  .dd-section-header.active .dd-section-arrow { transform: rotate(90deg); }

  .dd-section-body {
    display: none;
    padding: 8px 10px 10px;
    border-top: 1px solid var(--jazz-border);
    background: var(--jazz-surface);
  }

  .dd-section-body.open { display: flex; flex-direction: column; gap: 6px; }

  /* Panel action buttons */
  .dd-action {
    display: block;
    width: 100%;
    padding: 7px 10px;
    border-radius: var(--jazz-radius);
    font-size: 11px;
    font-weight: 600;
    cursor: pointer;
    border: none;
    text-align: left;
  }

  .dd-action-primary {
    background: var(--jazz-primary);
    color: #fff;
  }

  .dd-action-primary:hover { background: #0052a0; }

  .dd-action-secondary {
    background: var(--jazz-surface);
    color: var(--jazz-primary);
    border: 1px solid var(--jazz-primary) !important;
  }

  .dd-action-secondary:hover { background: var(--jazz-icon-bg); }

  .dd-action-ghost {
    background: var(--jazz-surface1);
    color: var(--jazz-muted);
    border: 1px solid var(--jazz-border) !important;
  }

  .dd-action-ghost:hover { background: #e8e8e8; }

  .dd-section-label {
    font-size: 9px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--jazz-muted);
    padding: 4px 2px 2px;
  }

  /* FPO badge shown inline when coming-soon item clicked */
  .fpo-badge {
    display: none;
    font-size: 9px;
    background: var(--jazz-icon-bg);
    color: var(--jazz-primary);
    border-radius: 10px;
    padding: 2px 7px;
    font-weight: 600;
    margin-left: 6px;
    vertical-align: middle;
    white-space: nowrap;
  }

  /* Coming-soon toast */
  .cs-toast {
    position: fixed;
    bottom: 24px;
    right: 24px;
    background: var(--jazz-navy);
    color: #fff;
    padding: 10px 16px;
    border-radius: 6px;
    font-size: 12px;
    font-weight: 600;
    opacity: 0;
    transform: translateY(8px);
    transition: opacity 0.2s, transform 0.2s;
    pointer-events: none;
    z-index: 100;
    max-width: 260px;
  }

  .cs-toast.show {
    opacity: 1;
    transform: translateY(0);
  }
`

const PANEL_HTML = `<aside class="dd-panel" aria-label="Design workflow panel">

  <!-- FPO-DEMO: Discover section -->
  <div class="dd-section" data-fpo="true">
    <button class="dd-section-header" onclick="toggleSection(this)" aria-expanded="false">
      <span>🔍 Discover</span>
      <span class="dd-section-arrow">▶</span>
    </button>
    <div class="dd-section-body">
      <button class="dd-action dd-action-ghost" data-fpo="true" onclick="showComingSoon('Accessibility / ADA review')">ADA Review <span class="fpo-badge">Coming soon</span></button>
      <button class="dd-action dd-action-ghost" data-fpo="true" onclick="showComingSoon('Design scorecard')">Scorecard <span class="fpo-badge">Coming soon</span></button>
      <button class="dd-action dd-action-ghost" data-fpo="true" onclick="showComingSoon('UX heuristics review')">Heuristics <span class="fpo-badge">Coming soon</span></button>
    </div>
  </div>

  <!-- FPO-DEMO: Define section -->
  <div class="dd-section" data-fpo="true">
    <button class="dd-section-header" onclick="toggleSection(this)" aria-expanded="false">
      <span>🎯 Define</span>
      <span class="dd-section-arrow">▶</span>
    </button>
    <div class="dd-section-body">
      <button class="dd-action dd-action-ghost" data-fpo="true" onclick="showComingSoon('Problem framing')">Problem Statement <span class="fpo-badge">Coming soon</span></button>
      <button class="dd-action dd-action-ghost" data-fpo="true" onclick="showComingSoon('Jobs-to-be-done framing')">JTBD <span class="fpo-badge">Coming soon</span></button>
      <button class="dd-action dd-action-ghost" data-fpo="true" onclick="showComingSoon('Success metrics')">Metrics <span class="fpo-badge">Coming soon</span></button>
    </div>
  </div>

  <!-- Develop section — open by default -->
  <div class="dd-section">
    <button class="dd-section-header active" onclick="toggleSection(this)" aria-expanded="true">
      <span>⚡ Develop</span>
      <span class="dd-section-arrow">▶</span>
    </button>
    <div class="dd-section-body open">
      <button class="dd-action dd-action-primary" data-fpo="true" onclick="showComingSoon('Refine screens — adjust colours, copy and layout')">Refine screens →</button>
      <button class="dd-action dd-action-secondary" data-fpo="true" onclick="showComingSoon('Regenerate — create a fresh variation')">Regenerate</button>
      <button class="dd-action dd-action-ghost" data-fpo="true" onclick="showComingSoon('New prompt — start from scratch')">New prompt</button>
      <div class="dd-section-label" style="margin-top:4px">Annotations</div>
      <button class="dd-action dd-action-ghost" data-fpo="true" onclick="showComingSoon('Add review notes as Figma annotations')">Add review notes →</button>
    </div>
  </div>

  <!-- FPO-DEMO: Deliver section -->
  <div class="dd-section" data-fpo="true">
    <button class="dd-section-header" onclick="toggleSection(this)" aria-expanded="false">
      <span>🚀 Deliver</span>
      <span class="dd-section-arrow">▶</span>
    </button>
    <div class="dd-section-body">
      <button class="dd-action dd-action-ghost" data-fpo="true" onclick="showComingSoon('Send to code — generate HTML/CSS scaffold')">Send to code ✦</button>
      <button class="dd-action dd-action-ghost" data-fpo="true" onclick="showComingSoon('Generate Evergreen content table')">Evergreen table ✦</button>
      <button class="dd-action dd-action-ghost" data-fpo="true" onclick="showComingSoon('Generate analytics tagging table')">Analytics tagging ✦</button>
      <button class="dd-action dd-action-ghost" data-fpo="true" onclick="showComingSoon('Create Jira stories and acceptance criteria')">Jira stories ✦</button>
      <button class="dd-action dd-action-ghost" data-fpo="true" onclick="showComingSoon('Send to QA — create test scenarios')">QA checklist ✦</button>
    </div>
  </div>

  <p style="font-size:9px;color:var(--jazz-muted);margin-top:10px;padding:0 2px">✦ Coming soon &nbsp;·&nbsp; FPO items hidden in production</p>
</aside>`

const PANEL_JS = `
  // ── Double Diamond accordion ──
  function toggleSection(btn) {
    var body = btn.nextElementSibling;
    var isOpen = body.classList.contains('open');
    // Close all sections
    document.querySelectorAll('.dd-section-body').forEach(function(b) { b.classList.remove('open'); });
    document.querySelectorAll('.dd-section-header').forEach(function(h) {
      h.classList.remove('active');
      h.setAttribute('aria-expanded', 'false');
    });
    // Open clicked section if it was closed
    if (!isOpen) {
      body.classList.add('open');
      btn.classList.add('active');
      btn.setAttribute('aria-expanded', 'true');
    }
  }

  // ── Coming soon toast ──
  var _csTimer = null;
  function showComingSoon(label) {
    var toast = document.getElementById('cs-toast');
    if (!toast) return;
    toast.textContent = 'Coming soon: ' + label;
    toast.classList.add('show');
    if (_csTimer) clearTimeout(_csTimer);
    _csTimer = setTimeout(function() { toast.classList.remove('show'); }, 2500);
  }
`

const PROTOTYPE_JS = `
  var currentScreen = 0;

  function getScreens() {
    return document.querySelectorAll('.screen-wrapper');
  }
  function getDots() {
    return document.querySelectorAll('.nav-dot');
  }

  function goToScreen(n) {
    var screens = getScreens();
    var dots = getDots();
    var total = screens.length;
    var next = Math.max(0, Math.min(n, total - 1));
    if (next === currentScreen) return;
    screens[currentScreen].classList.remove('active');
    dots[currentScreen].classList.remove('active');
    currentScreen = next;
    screens[currentScreen].classList.add('active');
    dots[currentScreen].classList.add('active');
    updateNav();
  }

  function updateNav() {
    var screens = getScreens();
    var total = screens.length;
    var backBtn = document.getElementById('nav-back');
    var nextBtn = document.getElementById('nav-next');
    var counter = document.getElementById('nav-counter');
    backBtn.disabled = currentScreen === 0;
    nextBtn.disabled = currentScreen === total - 1;
    counter.textContent = (currentScreen + 1) + ' / ' + total;
  }

  document.addEventListener('DOMContentLoaded', function() {
    updateNav();

    // Primary buttons advance to next screen
    document.querySelectorAll('.block-button.primary').forEach(function(btn) {
      btn.addEventListener('click', function() {
        var screens = getScreens();
        if (currentScreen < screens.length - 1) {
          goToScreen(currentScreen + 1);
        }
      });
    });
  });
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
  const mb = `margin-bottom:${gap}px`

  switch (block.type) {
    case 'heading': {
      const level = block.level ?? 1
      const tag = level === 1 ? 'h1' : level === 2 ? 'h2' : 'h3'
      return `<${tag} class="block-heading h${level}" style="${mb}">${escapeHtml(block.text)}</${tag}>`
    }

    case 'bodyText':
      return `<p class="block-body-text" style="${mb}">${escapeHtml(block.text)}</p>`

    case 'button': {
      const variant = block.variant ?? 'primary'
      return `<button class="block-button ${variant}" style="${mb}">${escapeHtml(block.text)}</button>`
    }

    case 'input': {
      const label = block.label ?? ''
      const placeholder = block.placeholder ?? ''
      const inputType = block.inputType ?? 'text'
      return `<div class="block-input-wrap" style="${mb}">
  <label class="block-input-label">${escapeHtml(label)}</label>
  <input class="block-input" type="${inputType}" placeholder="${escapeHtml(placeholder)}" />
</div>`
    }

    case 'card':
      return `<div class="block-card" style="${mb}">
  <div class="block-card-label">${escapeHtml(block.title ?? '')}</div>
  <div class="block-card-value">${escapeHtml(block.content)}</div>
</div>`

    case 'spacer':
      return `<div style="height:${block.height ?? 16}px;flex-shrink:0"></div>`

    case 'image': {
      const h = block.height ?? 80
      return `<div class="block-image" style="height:${h}px;${mb}">Image ${block.width ?? 100}×${h}</div>`
    }

    default:
      return ''
  }
}

function resolvePadding(padding: number | { top?: number; right?: number; bottom?: number; left?: number } | undefined): string {
  if (padding === undefined) return '24px 20px'
  if (typeof padding === 'number') return `${padding}px`
  const t = padding.top ?? 24
  const r = padding.right ?? 20
  const b = padding.bottom ?? 24
  const l = padding.left ?? 20
  return `${t}px ${r}px ${b}px ${l}px`
}

export function renderToHtml(spec: DesignSpecV1): string {
  const title = spec.meta?.title ?? 'FiFi Prototype'
  const screens = spec.screens ?? []
  const total = screens.length

  const screenHtml = screens.map((screen, i) => {
    const gap = screen.layout?.gap ?? 16
    const paddingCss = resolvePadding(screen.layout?.padding)
    const blocks = (screen.blocks ?? []).map(b => renderBlock(b, gap)).join('\n    ')
    const activeClass = i === 0 ? ' active' : ''

    return `<div class="screen-wrapper${activeClass}" data-screen="${i}">
  <div class="screen-title-bar">${escapeHtml(screen.name)}</div>
  <div class="screen-content" style="padding:${paddingCss}">
    ${blocks}
  </div>
</div>`
  }).join('\n')

  const dotsHtml = screens.map((_, i) =>
    `<button class="nav-dot${i === 0 ? ' active' : ''}" onclick="goToScreen(${i})" aria-label="Screen ${i + 1}"></button>`
  ).join('\n      ')

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(title)}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;600&display=swap" rel="stylesheet" />
  <style>
    :root { ${JAZZ_CSS_VARS.trim()} }
    ${BASE_CSS.trim()}
    ${PANEL_CSS.trim()}
  </style>
</head>
<body>

  <div class="proto-header">
    <span>${escapeHtml(title)}</span>
    <span class="proto-header-badge">Jazz DS</span>
    <span style="color:var(--jazz-border)">·</span>
    <span>${total} screen${total !== 1 ? 's' : ''}</span>
  </div>

  <div class="proto-workspace">
    <div class="proto-left">
      <div class="phone-frame">
        <div class="status-bar">
          <span class="status-bar-time">9:41</span>
          <div class="status-bar-icons">
            <span>●●●</span>
            <span>WiFi</span>
            <span>🔋</span>
          </div>
        </div>
        ${screenHtml}
      </div>

      <nav class="proto-nav" aria-label="Screen navigation">
        <div class="nav-dots">
          ${dotsHtml}
        </div>
        <div class="nav-arrows">
          <button class="nav-arrow-btn" id="nav-back" onclick="goToScreen(currentScreen - 1)">← Back</button>
          <span class="nav-screen-counter" id="nav-counter">1 / ${total}</span>
          <button class="nav-arrow-btn" id="nav-next" onclick="goToScreen(currentScreen + 1)">Next →</button>
        </div>
      </nav>
    </div>

    ${PANEL_HTML}
  </div>

  <div class="cs-toast" id="cs-toast"></div>

  <script>${PROTOTYPE_JS}${PANEL_JS}</script>
</body>
</html>`
}
