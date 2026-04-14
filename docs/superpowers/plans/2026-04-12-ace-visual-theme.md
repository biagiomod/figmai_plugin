# ACE Visual Theme Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Apply the main FigmAI site's design language to ACE — dark topbar/sidebar, correct font hierarchy (Industry Inc / Carbon / Protipo), Lucide icons, and accent card treatment.

**Architecture:** Three files only: `styles.css` (token + style overrides), `index.html` (logo, button placement, inline SVG nav icons, Lucide CDN), `app.js` (section eyebrows, icon chips in collapsible headers, `lucide.createIcons()` after renders). No server changes. No new files.

**Tech Stack:** Vanilla HTML/CSS/JS, Lucide CDN (unpkg), existing font assets (Industry Inc, Carbon, Protipo) already loaded in `fonts.css`.

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `admin-editor/public/styles.css` | **Modify** | Token overrides, dark topbar/sidebar, font hierarchy, topbar button classes, card accent, eyebrow/title typography |
| `admin-editor/public/index.html` | **Modify** | Logo swap to `logo-DAT_darkmode.svg`, move Reset/Validate/Save into topbar with Lucide icons, replace nav `<img>` icons with inline SVGs, add Lucide CDN |
| `admin-editor/public/app.js` | **Modify** | Page header eyebrow, section eyebrow labels, icon chips in `collapsibleSection()`, replace chevron `<img>` with Lucide inline SVG, call `lucide.createIcons()` after renders |

---

## Task 1: styles.css — design tokens, dark shell, font hierarchy, card accent

**Files:**
- Modify: `admin-editor/public/styles.css`

### Step 1: Update design tokens in `:root`

Find the `:root` block (lines 13–60). These token changes go inside it.

**Change `--topbar-height`:**
```css
/* find: */
  --topbar-height: 72px;
/* replace with: */
  --topbar-height: 52px;
```

**Add font-alias tokens** (after `--font-industry` line):
```css
  /* Aliases matching site token names — used in spec references */
  --font-display: var(--font-industry);
  --font-body: var(--font-protipo);
  --font-label: var(--font-carbon);
```

### Step 2: Override body font

Find:
```css
body {
  margin: 0;
  font-family: var(--font-carbon);
```

Replace:
```css
body {
  margin: 0;
  font-family: var(--font-protipo);
```

### Step 3: Dark topbar overrides

Find `.ace-topbar {` block (around line 100). Replace the background and border:

```css
/* find: */
.ace-topbar {
  position: sticky;
  top: 0;
  z-index: 20;
  width: 100%;
  flex-shrink: 0;
  min-height: var(--topbar-height);
  background: var(--ace-bg);
  border-bottom: 1px solid var(--ace-border);
  padding: var(--ace-space-16) 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
/* replace with: */
.ace-topbar {
  position: sticky;
  top: 0;
  z-index: 20;
  width: 100%;
  flex-shrink: 0;
  min-height: var(--topbar-height);
  background: #0a0a0a;
  border-bottom: 1px solid rgba(255,255,255,0.07);
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}
```

### Step 4: Topbar brand separator and subtitle

Find `.ace-topbar-label {` block. Replace:

```css
/* find: */
.ace-topbar-label {
  font-family: var(--font-carbon);
  font-weight: 700;
  font-size: var(--ace-font-size-16);
  color: var(--ace-text-muted);
  margin: 0;
}
/* replace with: */
.ace-topbar-label {
  font-family: var(--font-label);
  font-weight: 700;
  font-size: 10px;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: rgba(255,255,255,0.4);
  margin: 0;
}
.ace-topbar-sep {
  display: block;
  width: 1px;
  height: 20px;
  background: rgba(255,255,255,0.12);
  flex-shrink: 0;
}
```

### Step 5: Dark sidebar overrides

Find `.ace-sidebar {` block (around line 181). Find the background and border-right lines and replace them:

```css
/* find these two lines inside .ace-sidebar: */
  background: var(--ace-sidebar-bg);
  border-right: 1px solid var(--ace-border);
/* replace with: */
  background: #111111;
  border-right: 1px solid rgba(255,255,255,0.07);
```

### Step 6: Nav item color overrides (dark sidebar)

Find `.ace-nav-item {` (around line 217). After the existing rules, the font-family is `var(--font-protipo)`. Change it to `var(--font-label)` and set color:

Find:
```css
.ace-nav-item {
```
Read the full block and update font-family and add color:
```css
/* inside .ace-nav-item, find: */
  font-family: var(--font-protipo);
/* replace with: */
  font-family: var(--font-label);
  color: rgba(255,255,255,0.4);
```

Find `.ace-nav-item:hover {` and replace its body:
```css
/* find: */
.ace-nav-item:hover {
/* keep the block but ensure background and color are set: */
```

Add after `.ace-nav-item:hover {` opening brace (or replace entire block):
```css
.ace-nav-item:hover {
  background: rgba(255,255,255,0.05);
  color: rgba(255,255,255,0.75);
}
```

Replace the active nav item pill with accent-text treatment:
```css
/* find: */
.ace-nav-item[aria-selected="true"],
.ace-nav-item.active {
  background: var(--ace-accent);
/* replace entire block: */
.ace-nav-item[aria-selected="true"],
.ace-nav-item.active {
  background: rgba(213,12,125,0.14);
  color: #d50c7d;
}
```

Also remove the icon filter rule that white-fills icons on active (no longer needed with color-inherit):
```css
/* find and remove entirely: */
.ace-leftnav .ace-nav-item[aria-selected="true"] img.ace-nav-icon,
.ace-leftnav .ace-nav-item.active img.ace-nav-icon {
```
(Delete that rule block — inline SVG inherits color via `currentColor`.)

### Step 7: Topbar button classes

Append these new classes to `styles.css` (after the existing topbar-actions button rules):

```css
/* ── ACE visual theme: topbar action buttons ── */
.ace-topbar-inner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: nowrap;
  gap: var(--ace-space-16);
  padding: 0 var(--ace-space-32);
  width: 100%;
  max-width: 1080px;
  margin: 0 auto;
}
.ace-topbar-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: var(--font-label);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  padding: 6px 14px;
  border-radius: var(--ace-radius-sm);
  cursor: pointer;
  white-space: nowrap;
  transition: background 0.15s, color 0.15s, border-color 0.15s;
}
.ace-topbar-btn svg { width: 13px; height: 13px; stroke-width: 2; }
.ace-topbar-btn--ghost {
  background: rgba(255,255,255,0.06);
  border: 1px solid rgba(255,255,255,0.12);
  color: rgba(255,255,255,0.65);
}
.ace-topbar-btn--ghost:hover:not(:disabled) {
  background: rgba(255,255,255,0.1);
  color: rgba(255,255,255,0.9);
}
.ace-topbar-btn--outline {
  background: transparent;
  border: 1px solid rgba(213,12,125,0.4);
  color: #d50c7d;
}
.ace-topbar-btn--outline:hover:not(:disabled) {
  background: rgba(213,12,125,0.06);
  border-color: #d50c7d;
}
.ace-topbar-btn--primary {
  background: #d50c7d;
  border: 1px solid #d50c7d;
  color: #fff;
}
.ace-topbar-btn--primary:hover:not(:disabled) {
  background: #b00a6a;
  border-color: #b00a6a;
}
.ace-topbar-btn:disabled { opacity: 0.45; cursor: not-allowed; }
.ace-topbar-btn:focus-visible { outline: 2px solid var(--ace-accent); outline-offset: 2px; }
```

### Step 8: Page header eyebrow

Find `.ace-page-header-title {` block (around line 764). Before it, add:

```css
/* ── ACE visual theme: page header eyebrow ── */
.ace-page-header-eyebrow {
  font-family: var(--font-label);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--ace-accent);
  margin: 0 0 4px 0;
}
```

Update `.ace-page-header-title`:
```css
/* find: */
.ace-page-header-title {
/* ensure font-family is Industry Inc: */
```

Add `font-family: var(--font-display);` inside `.ace-page-header-title` if not already set. Read the block first; it should look like:
```css
.ace-page-header-title {
  font-family: var(--font-display);
  font-size: 22px;
  font-weight: 700;
  color: #111;
  letter-spacing: -0.01em;
  margin: 0;
}
```

### Step 9: Section eyebrow and title typography classes

Append to `styles.css`:

```css
/* ── ACE visual theme: section eyebrow + title ── */
.ace-section-eyebrow {
  font-family: var(--font-label);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--ace-accent);
  margin: 0 0 4px 0;
}
```

(`.ace-section-title` already has styling in the file; no change needed there.)

### Step 10: Card accent border treatment

Find `.ace-section.ace-collapsible {` block (around line 505). The current block has `border: 1px solid var(--ace-border)` or similar. Replace the border styling:

```css
/* find: */
.ace-section.ace-collapsible {
/* add/replace border rules inside: */
  border: 1px solid color-mix(in srgb, var(--ace-accent) 18%, transparent);
  border-left: 3px solid var(--ace-accent);
  border-radius: 10px;
```

### Step 11: Icon chip for collapsible section headers

Append to `styles.css`:

```css
/* ── ACE visual theme: collapsible section icon chip ── */
.ace-section-icon-chip {
  width: 30px;
  height: 30px;
  background: rgba(213,12,125,0.1);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #d50c7d;
  flex-shrink: 0;
}
.ace-section-icon-chip svg { width: 15px; height: 15px; stroke-width: 1.75; }
.ace-section-header-content {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  min-width: 0;
}
.ace-section-chevron-icon {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  color: var(--ace-accent);
  transition: transform 0.2s;
}
.ace-collapsible.is-collapsed .ace-section-chevron-icon { transform: rotate(-90deg); }
/* Nav icon SVG inherits color from parent (currentColor) */
.ace-nav-icon-svg {
  width: 18px;
  height: 18px;
  flex-shrink: 0;
  display: block;
}
```

### Step 12: Commit Task 1

```bash
cd /Users/biagio/Desktop/Dev_Figma/figmai/figmai_plugin
git add admin-editor/public/styles.css
git commit -m "feat(ace-theme): dark topbar/sidebar, font hierarchy, card accent, eyebrow classes"
```

---

## Task 2: index.html — logo, topbar buttons, nav inline SVGs, Lucide CDN

**Files:**
- Modify: `admin-editor/public/index.html`

Context: the topbar currently has only the brand area. Reset/Validate/Save are in `ace-page-header-bar`. We move the buttons into the topbar and add the eyebrow to the page header.

### Step 1: Swap logo + add separator + subtitle + move buttons into topbar

Find the entire `<header class="ace-topbar" ...>` block (lines 53–60):

```html
  <header class="ace-topbar" role="banner">
    <div class="ace-topbar-inner ace-container">
      <div class="ace-topbar-brand">
        <img src="/assets/logo-figmai.svg" alt="" class="ace-logo" width="117" height="36" />
        <span class="ace-topbar-label" id="ace-label">ACE (Admin Config Editor)</span>
      </div>
    </div>
  </header>
```

Replace with:

```html
  <header class="ace-topbar" role="banner">
    <div class="ace-topbar-inner">
      <div class="ace-topbar-brand">
        <img src="/assets/logo-DAT_darkmode.svg" alt="FigmAI Design Toolkit" class="ace-logo" height="16" width="127" />
        <span class="ace-topbar-sep" aria-hidden="true"></span>
        <span class="ace-topbar-label" id="ace-label">Admin Config Editor</span>
      </div>
      <div class="ace-topbar-actions" id="ace-topbar-actions">
        <button type="button" id="reload-btn" class="ace-topbar-btn ace-topbar-btn--ghost">
          <i data-lucide="rotate-ccw"></i>Reset
        </button>
        <button type="button" id="validate-btn" class="ace-topbar-btn ace-topbar-btn--outline">
          <i data-lucide="check-circle"></i>Validate
        </button>
        <button type="button" id="save-btn" class="ace-topbar-btn ace-topbar-btn--primary" disabled>
          <i data-lucide="save"></i>Save
        </button>
      </div>
    </div>
  </header>
```

### Step 2: Remove buttons from page header bar + add eyebrow element

Find the `ace-page-header-bar` block (lines 119–128):

```html
      <div id="ace-page-header-bar" class="ace-page-header-bar">
        <div class="ace-page-header-left">
          <h1 id="ace-page-title-text" class="ace-page-header-title">General</h1>
        </div>
        <div class="ace-page-header-actions">
          <button type="button" id="reload-btn" class="ace-page-action-btn">Reset</button>
          <button type="button" id="validate-btn" class="ace-page-action-btn">Validate</button>
          <button type="button" id="save-btn" class="ace-page-action-btn ace-page-action-btn--primary" disabled>Save</button>
        </div>
      </div>
```

Replace with:

```html
      <div id="ace-page-header-bar" class="ace-page-header-bar">
        <div class="ace-page-header-left">
          <p class="ace-page-header-eyebrow" id="ace-page-eyebrow">Plugin Settings</p>
          <h1 id="ace-page-title-text" class="ace-page-header-title">General</h1>
        </div>
      </div>
```

### Step 3: Replace nav icon `<img>` tags with inline Lucide SVGs

The nav items currently use `<img src="/assets/icons/ACEGeneralIcon.svg" ...>`. Replace each with an inline SVG using `currentColor` so color inherits from the nav item.

SVG template (all use `viewBox="0 0 24 24"`, `fill="none"`, `stroke="currentColor"`, `stroke-width="1.75"`, `stroke-linecap="round"`, `stroke-linejoin="round"`, class `ace-nav-icon-svg`):

**General (settings-2)** — find line with `ACEGeneralIcon.svg`, replace `<img ...>` with:
```html
<svg class="ace-nav-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 7h-9"/><path d="M14 17H5"/><circle cx="17" cy="17" r="3"/><circle cx="7" cy="7" r="3"/></svg>
```

**AI (bot)** — find `ACEAIIcon.svg`:
```html
<svg class="ace-nav-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>
```

**Assistants (users)** — find `ACEAssistantsIcon.svg`:
```html
<svg class="ace-nav-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>
```

**Resources (book-open)** — find `ACEKnowledgeBaseIcon.svg`:
```html
<svg class="ace-nav-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
```

**Design Systems (layers)** — find `ACEDesignSystemsIcon.svg`:
```html
<svg class="ace-nav-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z"/><path d="m22 17.65-9.17 4.16a2 2 0 0 1-1.66 0L2 17.65"/><path d="m22 12.65-9.17 4.16a2 2 0 0 1-1.66 0L2 12.65"/></svg>
```

**Usage Report (bar-chart-3)** — find `ACEAnalyticsIcon.svg`:
```html
<svg class="ace-nav-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>
```

**Help (help-circle)** — find `ACEHelpIcon.svg`:
```html
<svg class="ace-nav-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/><path d="M12 17h.01"/></svg>
```

**Server (server)** — find `ACEServerIcon.svg`:
```html
<svg class="ace-nav-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="20" height="8" x="2" y="2" rx="2" ry="2"/><rect width="20" height="8" x="2" y="14" rx="2" ry="2"/><line x1="6" x2="6.01" y1="6" y2="6"/><line x1="6" x2="6.01" y1="18" y2="18"/></svg>
```

**Users (user)** — find `ACEUsersIcon.svg`:
```html
<svg class="ace-nav-icon-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
```

### Step 4: Add Lucide CDN before `</body>`

Find the closing `</body>` tag. Add immediately before it:

```html
  <script src="https://unpkg.com/lucide@latest/dist/umd/lucide.min.js"></script>
  <script>
    document.addEventListener('DOMContentLoaded', function () {
      if (window.lucide) lucide.createIcons();
    });
  </script>
```

### Step 5: Verify page loads without JS errors

Open `http://localhost:3333` in the browser (restart server if needed: `npm run admin`). Check the browser console for errors. The dark topbar should be visible, nav icons should render, and buttons (Reset/Validate/Save) should appear in the topbar.

### Step 6: Commit Task 2

```bash
cd /Users/biagio/Desktop/Dev_Figma/figmai/figmai_plugin
git add admin-editor/public/index.html
git commit -m "feat(ace-theme): dark topbar with logo/subtitle/buttons, inline Lucide nav icons, CDN"
```

---

## Task 3: app.js — eyebrow labels, icon chips, chevron SVG, lucide.createIcons()

**Files:**
- Modify: `admin-editor/public/app.js`

### Step 1: Update page eyebrow when switching tabs

Find the `PAGE_TITLES` map (line 5230):

```javascript
    var PAGE_TITLES = { config: 'General', ai: 'AI', assistants: 'Assistants', 'knowledge-bases': 'Resources', 'content-models': 'Evergreens', registries: 'Design Systems', analytics: 'Usage Report', users: 'Users', knowledge: 'Knowledge' }
    var pageTitleEl = document.getElementById('ace-page-title-text')
    if (pageTitleEl) pageTitleEl.textContent = PAGE_TITLES[tabId] || tabId
```

Replace with:

```javascript
    var PAGE_TITLES = { config: 'General', ai: 'AI', assistants: 'Assistants', 'knowledge-bases': 'Resources', 'content-models': 'Evergreens', registries: 'Design Systems', analytics: 'Usage Report', users: 'Users', knowledge: 'Knowledge' }
    var PAGE_EYEBROWS = { config: 'Plugin Settings', ai: 'LLM Configuration', assistants: 'Assistant Library', 'knowledge-bases': 'Knowledge & Skills', 'content-models': 'Content Models', registries: 'Design Systems', analytics: 'Usage Data', users: 'User Management', knowledge: 'Knowledge' }
    var pageTitleEl = document.getElementById('ace-page-title-text')
    if (pageTitleEl) pageTitleEl.textContent = PAGE_TITLES[tabId] || tabId
    var pageEyebrowEl = document.getElementById('ace-page-eyebrow')
    if (pageEyebrowEl) pageEyebrowEl.textContent = PAGE_EYEBROWS[tabId] || ''
```

### Step 2: Add section icon lookup + update `collapsibleSection()`

Find `function collapsibleSection (sectionId, title, bodyHtml, expanded, descriptionText) {` (line 777).

Replace the entire function with:

```javascript
  var SECTION_ICONS = {
    'default-mode': 'layout-panel-left',
    'mode-settings': 'list',
    'branding': 'award',
    'resource-links': 'link',
    'credits': 'heart',
    'advanced-raw-json': 'code-2',
    'ai-api-endpoint': 'cpu',
    'content-table-exclusion': 'filter'
  }

  function collapsibleSection (sectionId, title, bodyHtml, expanded, descriptionText) {
    var isExpanded = expanded === true
    var icon = SECTION_ICONS[sectionId] || 'settings'
    var iconChip = '<div class="ace-section-icon-chip"><i data-lucide="' + escapeHtml(icon) + '"></i></div>'
    var chevronIcon = '<i data-lucide="chevron-down" class="ace-section-chevron-icon"></i>'
    var titleContent
    if (descriptionText) {
      titleContent = '<div class="ace-section-header-inner">' +
        '<div class="ace-section-header-top">' +
        '<div class="ace-section-header-content">' + iconChip + '<div class="ace-section-title">' + escapeHtml(title) + '</div></div>' +
        chevronIcon +
        '</div>' +
        '<div class="ace-section-description">' + escapeHtml(descriptionText) + '</div>' +
        '</div>'
    } else {
      titleContent = '<div class="ace-section-header-content">' + iconChip + '<div class="ace-section-title">' + escapeHtml(title) + '</div></div>' +
        chevronIcon
    }
    return '<section class="ace-section ace-collapsible' + (isExpanded ? '' : ' is-collapsed') + '" data-section="' + escapeHtml(sectionId) + '">' +
      '<button type="button" class="ace-section-header" aria-expanded="' + (isExpanded ? 'true' : 'false') + '" aria-controls="section-' + escapeHtml(sectionId) + '-body">' +
      titleContent +
      '</button>' +
      '<div id="section-' + escapeHtml(sectionId) + '-body" class="ace-section-body">' + bodyHtml + '</div>' +
      '</section>'
  }
```

### Step 3: Update chevron toggle handler to work with Lucide SVG chevron

The existing chevron toggle handlers look for `this.querySelector('.ace-section-chevron')` (an `<img>`). Update both instances in `_bindPlayground` area and the General tab bind function.

Search for (there are two similar blocks, around lines 1174 and 1563):
```javascript
        var img = this.querySelector('.ace-section-chevron')
        if (img) img.src = '/assets/icons/' + (expanded ? 'ChevronUpIcon.svg' : 'ChevronDownIcon.svg')
```

Replace each occurrence with:
```javascript
        // chevron rotation handled by CSS (.ace-collapsible.is-collapsed .ace-section-chevron-icon)
```

(i.e., delete the two lines and replace with the comment — CSS handles rotation via the `is-collapsed` class toggle that already happens on the line above each of these.)

### Step 4: Add `lucide.createIcons()` calls after tab renders

Find the General tab render call — search for `panel.innerHTML = html` in the General tab render function (around line 1170 where the collapsible sections are rendered):

```javascript
    panel.innerHTML = html
```

After it add:
```javascript
    if (window.lucide) lucide.createIcons({ el: panel })
```

Do the same for the AI tab render (around line 1560 where `panel.innerHTML = html`), the Assistants tab render (around line 2400+), the Resources tab render, and the Design Systems tab render.

Search the file for all occurrences of `panel.innerHTML = html` and add `if (window.lucide) lucide.createIcons({ el: panel })` immediately after each one in the main tab render functions (not inner sub-renders like `renderPlayground`).

The pattern to find-and-replace (use replace_all: false and do each instance individually):

For each of these locations, add the `lucide.createIcons` call:
1. General tab (after `panel.innerHTML = html` inside `renderGeneralTab` or equivalent, around line 1170)
2. AI tab (around line 1560)
3. Assistants tab (around line 2400 — the `renderAssistantsTab` function)
4. Resources tab (around line 3357 — the resources panel render)
5. Design Systems tab (around line 4600 — the registries panel render)

**Important:** Use `lucide.createIcons({ el: panel })` not `lucide.createIcons()` to avoid re-processing the entire DOM on every render.

### Step 5: Add eyebrow labels above tab section `<h2>` headings

The tab renders use this pattern for h2 section headings:
```javascript
    html += '<div class="ace-section-header-row">'
    html += '<h2 class="ace-section-title">General</h2>'
```

These don't need eyebrows since the page header eyebrow (from Step 1) already provides that context. No changes needed here.

### Step 6: Verify chevron toggle still works

After reload, click on a collapsible section to expand/collapse it. The chevron should rotate via CSS (the `is-collapsed` class is toggled on the section, CSS `.ace-collapsible.is-collapsed .ace-section-chevron-icon { transform: rotate(-90deg); }` handles it). Verify no JS errors.

### Step 7: Commit Task 3

```bash
cd /Users/biagio/Desktop/Dev_Figma/figmai/figmai_plugin
git add admin-editor/public/app.js
git commit -m "feat(ace-theme): page eyebrow, section icon chips, Lucide chevron, createIcons() after renders"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Task |
|-----------------|------|
| `--ace-topbar-bg: #0a0a0a` | Task 1 step 3 |
| `--ace-sidebar-bg: #111111` | Task 1 step 5 |
| `--ace-topbar-border: rgba(255,255,255,0.07)` | Task 1 step 3 |
| `--ace-sidebar-border: rgba(255,255,255,0.07)` | Task 1 step 5 |
| Body font → Protipo | Task 1 step 2 |
| Industry Inc for display titles | Task 1 step 8 (font-display alias + page header title) |
| Carbon for nav/labels/buttons | Task 1 steps 6, 7 |
| Topbar height 52px | Task 1 step 1 |
| `logo-DAT_darkmode.svg` | Task 2 step 1 |
| Topbar separator + subtitle | Task 2 step 1 |
| Reset/Validate/Save in topbar with new styles | Task 2 steps 1–2 |
| Lucide icons in nav (inline SVG) | Task 2 step 3 |
| Lucide CDN | Task 2 step 4 |
| Nav active: accent text + tinted bg | Task 1 step 6 |
| Button icons (rotate-ccw, check-circle, save) | Task 2 step 1 |
| Page header eyebrow | Task 2 step 2 + Task 3 step 1 |
| Card accent border + left border | Task 1 step 10 |
| Card icon chips | Task 1 step 11 + Task 3 step 2 |
| Lucide chevron (accent color) | Task 1 step 11 + Task 3 steps 2–3 |
| `lucide.createIcons()` after renders | Task 3 step 4 |

**Placeholder check:** No TBDs or vague steps — all code blocks are complete.

**Type consistency:** `escapeHtml` used throughout; `SECTION_ICONS` lookup uses same `sectionId` strings as existing `collapsibleSection` callers.
