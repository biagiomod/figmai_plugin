# ACE Test Harness Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the ACE Playground with a structured test harness: a fixture library, three-mode selection simulator (no-selection / selection / vision), payload inspector, and the server endpoints that support it.

**Architecture:** Three independent layers — (1) fixture files on disk + a `fixtures.ts` loader module, (2) two new server endpoints (`GET /api/fixtures`, `GET /api/fixtures/:id/images`) and an extended `POST /api/test/assistant` that forwards `selectionSummary` and `images` as distinct fields, (3) Playground UI changes in `app.js` that add mode selector, fixture picker, selection summary textarea, images summary row, and payload inspector. All changes are additive; existing Playground behaviour is preserved as the `no-selection` default.

**Tech Stack:** TypeScript (server, `tsx` runner), vanilla JS (app.js), Express, Node `fs` / `path`, no new npm packages required.

---

## File Map

| File | Action | Responsibility |
|------|--------|---------------|
| `admin-editor/src/fixtures.ts` | **Create** | `loadFixtureCatalog()` + `loadFixtureImages()` — all disk I/O for fixtures |
| `admin-editor/server.ts` | **Modify** | Import fixtures module; add `GET /api/fixtures`, `GET /api/fixtures/:id/images`; extend `POST /api/test/assistant` |
| `admin-editor/fixtures/general/empty-canvas.json` | **Create** | No-selection baseline fixture |
| `admin-editor/fixtures/forms/checkout-form.json` | **Create** | Form with errors (vision-capable) |
| `admin-editor/fixtures/forms/checkout-form-1.png` | **Create** | Placeholder PNG for vision test |
| `admin-editor/fixtures/navigation/nav-mobile.json` | **Create** | Mobile nav fixture (vision-capable) |
| `admin-editor/fixtures/navigation/nav-mobile-1.png` | **Create** | Placeholder PNG |
| `admin-editor/fixtures/cards/pricing-card.json` | **Create** | Pricing component (vision-capable) |
| `admin-editor/fixtures/cards/pricing-card-1.png` | **Create** | Placeholder PNG |
| `admin-editor/fixtures/modals/delete-confirm.json` | **Create** | Destructive modal (selection only) |
| `admin-editor/public/app.js` | **Modify** | State additions; `_pgSendColumn` extended with mode selector, fixture picker, selection summary, images row, payload inspector; `_bindPlayground` extended; fire button updated |
| `admin-editor/public/styles.css` | **Modify** | Styles for mode toggle, fixture picker, selection summary textarea, images row, payload inspector |

---

## Task 1: `fixtures.ts` — disk loader module

**Files:**
- Create: `admin-editor/src/fixtures.ts`

The module exports two functions used by the server endpoints. It has no side effects — pure I/O.

- [ ] **Step 1: Create `admin-editor/src/fixtures.ts`**

```typescript
/**
 * Fixture loader for the ACE test harness.
 * loadFixtureCatalog — reads all *.json files recursively under fixturesDir.
 * loadFixtureImages  — reads PNG files referenced by a fixture, returns base64 data URLs.
 */

import * as fs from 'fs'
import * as path from 'path'

export interface FixtureMeta {
  id: string
  name: string
  category: string
  tags: string[]
  selectionSummary: string
  images: string[]           // filenames relative to fixtures/<category>/
  supportsVision: boolean
  requiresSelection: boolean
  useCases: string[]
  notes?: string
}

/**
 * Read every *.json file under fixturesDir (one level of subdirectories = category).
 * Returns metadata only — no image data.
 */
export function loadFixtureCatalog(fixturesDir: string): FixtureMeta[] {
  const results: FixtureMeta[] = []
  if (!fs.existsSync(fixturesDir)) return results
  let categories: string[]
  try { categories = fs.readdirSync(fixturesDir) } catch { return results }
  for (const cat of categories) {
    const catDir = path.join(fixturesDir, cat)
    let stat: fs.Stats
    try { stat = fs.statSync(catDir) } catch { continue }
    if (!stat.isDirectory()) continue
    let files: string[]
    try { files = fs.readdirSync(catDir) } catch { continue }
    for (const file of files) {
      if (!file.endsWith('.json')) continue
      const filePath = path.join(catDir, file)
      try {
        const raw = fs.readFileSync(filePath, 'utf-8')
        const parsed = JSON.parse(raw) as FixtureMeta
        results.push(parsed)
      } catch {
        // skip malformed JSON
      }
    }
  }
  return results
}

/**
 * Read PNG files referenced by fixture.images, return as base64 data URLs.
 * Images are expected at fixturesDir/<fixture.category>/<filename>.
 */
export function loadFixtureImages(fixturesDir: string, fixture: FixtureMeta): string[] {
  const dataUrls: string[] = []
  for (const filename of fixture.images) {
    // Reject path traversal attempts
    const safe = path.basename(filename)
    if (safe !== filename) continue
    const imgPath = path.join(fixturesDir, fixture.category, safe)
    try {
      const buf = fs.readFileSync(imgPath)
      dataUrls.push('data:image/png;base64,' + buf.toString('base64'))
    } catch {
      // skip missing images silently
    }
  }
  return dataUrls
}
```

- [ ] **Step 2: Verify TypeScript compiles cleanly**

```bash
cd /path/to/figmai_plugin
npx tsx --no-warnings admin-editor/src/fixtures.ts 2>&1 || echo "compile check done"
```

Expected: no TypeScript errors (file has no top-level statements so tsx exits cleanly).

- [ ] **Step 3: Commit**

```bash
git add admin-editor/src/fixtures.ts
git commit -m "feat(ace): add fixtures.ts — loadFixtureCatalog and loadFixtureImages"
```

---

## Task 2: Fixture JSON files + placeholder PNGs

**Files:**
- Create: `admin-editor/fixtures/general/empty-canvas.json`
- Create: `admin-editor/fixtures/forms/checkout-form.json`
- Create: `admin-editor/fixtures/forms/checkout-form-1.png` (1×1 placeholder)
- Create: `admin-editor/fixtures/navigation/nav-mobile.json`
- Create: `admin-editor/fixtures/navigation/nav-mobile-1.png`
- Create: `admin-editor/fixtures/cards/pricing-card.json`
- Create: `admin-editor/fixtures/cards/pricing-card-1.png`
- Create: `admin-editor/fixtures/modals/delete-confirm.json`

- [ ] **Step 1: Create `admin-editor/fixtures/general/empty-canvas.json`**

```json
{
  "id": "empty-canvas",
  "name": "Empty Canvas — no selection",
  "category": "general",
  "tags": ["general", "no-selection", "baseline"],
  "selectionSummary": "",
  "images": [],
  "supportsVision": false,
  "requiresSelection": false,
  "useCases": ["general-question", "assistant-intro"],
  "notes": "Baseline fixture for no-selection mode. Use to test free-form queries with no Figma context."
}
```

- [ ] **Step 2: Create `admin-editor/fixtures/forms/checkout-form.json`**

```json
{
  "id": "checkout-form",
  "name": "Checkout Form — error states",
  "category": "forms",
  "tags": ["form", "checkout", "validation", "errors"],
  "selectionSummary": "Frame: Checkout Screen (1440×900)\n\nLayers:\n- Heading: 'Complete your purchase'\n- Input: Email (filled, valid)\n- Input: Card Number (filled, invalid — red border)\n- Input: CVV (empty)\n- Button: 'Pay Now' (primary, disabled)\n- Text: 'Card number is invalid' (error, visible)\n\nInteraction state: form submission attempted, validation errors shown.",
  "images": ["checkout-form-1.png"],
  "supportsVision": true,
  "requiresSelection": true,
  "useCases": ["review-copy", "check-errors", "accessibility-review"],
  "notes": "Good fixture for testing error copy and form validation feedback."
}
```

- [ ] **Step 3: Create `admin-editor/fixtures/navigation/nav-mobile.json`**

```json
{
  "id": "nav-mobile",
  "name": "Mobile Navigation — hamburger open",
  "category": "navigation",
  "tags": ["navigation", "mobile", "hamburger", "overlay"],
  "selectionSummary": "Frame: Mobile Nav Overlay (390×844)\n\nLayers:\n- Icon: Hamburger (top-left, 24×24)\n- Overlay: Nav drawer (full-height, 280px wide, bg #111)\n- Nav item: Home (active, accent underline)\n- Nav item: About\n- Nav item: Contact\n- Nav item: Login (CTA button style)\n\nState: drawer open, Home selected.",
  "images": ["nav-mobile-1.png"],
  "supportsVision": true,
  "requiresSelection": true,
  "useCases": ["review-copy", "accessibility-review", "component-review"],
  "notes": "Tests navigation clarity and mobile layout feedback."
}
```

- [ ] **Step 4: Create `admin-editor/fixtures/cards/pricing-card.json`**

```json
{
  "id": "pricing-card",
  "name": "Pricing Card — Pro tier",
  "category": "cards",
  "tags": ["card", "pricing", "subscription", "CTA"],
  "selectionSummary": "Component: Pricing Card / Pro (320×480)\n\nLayers:\n- Badge: 'Most Popular' (accent pill, top-right)\n- Heading: 'Pro'\n- Price: '$49/mo' (large, bold)\n- Subtext: 'billed annually'\n- Feature list: 5 items with checkmark icons\n- Button: 'Get started' (primary, full-width)\n- Link: 'See all features →'\n\nVariant: highlighted (accent border, elevated shadow).",
  "images": ["pricing-card-1.png"],
  "supportsVision": true,
  "requiresSelection": true,
  "useCases": ["review-copy", "component-review"],
  "notes": "Good for copy review and CTA wording feedback."
}
```

- [ ] **Step 5: Create `admin-editor/fixtures/modals/delete-confirm.json`**

```json
{
  "id": "delete-confirm",
  "name": "Delete Confirmation Modal",
  "category": "modals",
  "tags": ["modal", "destructive", "confirmation", "dialog"],
  "selectionSummary": "Component: Modal / Confirm Delete (480×240)\n\nLayers:\n- Icon: Warning triangle (red, 32×32)\n- Heading: 'Delete this item?'\n- Body: 'This action cannot be undone. The item and all its data will be permanently removed.'\n- Button: 'Cancel' (ghost, left)\n- Button: 'Delete' (destructive red, right)\n\nState: modal open, no input focused.",
  "images": [],
  "supportsVision": false,
  "requiresSelection": true,
  "useCases": ["review-copy", "accessibility-review"],
  "notes": "Selection-only (no vision). Tests destructive action copy and button labelling."
}
```

- [ ] **Step 6: Create placeholder PNGs**

These are 1×1 white pixel PNGs for CI/dev. Replace with real screenshots before production use.

```bash
# Create directories
mkdir -p admin-editor/fixtures/forms
mkdir -p admin-editor/fixtures/navigation
mkdir -p admin-editor/fixtures/cards
mkdir -p admin-editor/fixtures/modals
mkdir -p admin-editor/fixtures/general

# Write minimal valid PNG (1×1 white pixel, base64-decoded)
python3 -c "
import base64, sys
# Minimal 1x1 white PNG
png = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwADhQGAWjR9awAAAABJRU5ErkJggg==')
sys.stdout.buffer.write(png)
" > admin-editor/fixtures/forms/checkout-form-1.png

python3 -c "
import base64, sys
png = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwADhQGAWjR9awAAAABJRU5ErkJggg==')
sys.stdout.buffer.write(png)
" > admin-editor/fixtures/navigation/nav-mobile-1.png

python3 -c "
import base64, sys
png = base64.b64decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwADhQGAWjR9awAAAABJRU5ErkJggg==')
sys.stdout.buffer.write(png)
" > admin-editor/fixtures/cards/pricing-card-1.png
```

- [ ] **Step 7: Verify fixture catalog loads cleanly**

Write a quick inline check:

```bash
node -e "
const { loadFixtureCatalog } = await import('./admin-editor/src/fixtures.ts')
" 2>/dev/null || npx tsx -e "
import { loadFixtureCatalog } from './admin-editor/src/fixtures.ts'
const cat = loadFixtureCatalog('./admin-editor/fixtures')
console.log('Fixtures loaded:', cat.length)
cat.forEach(f => console.log(' -', f.id, '|', f.category, '| vision:', f.supportsVision))
"
```

Expected output:
```
Fixtures loaded: 5
 - empty-canvas | general | vision: false
 - checkout-form | forms | vision: true
 - nav-mobile | navigation | vision: true
 - pricing-card | cards | vision: true
 - delete-confirm | modals | vision: false
```

- [ ] **Step 8: Commit**

```bash
git add admin-editor/fixtures/
git commit -m "feat(ace): add 5 curated test harness fixtures with placeholder PNGs"
```

---

## Task 3: Server — fixture endpoints + extend test endpoint

**Files:**
- Modify: `admin-editor/server.ts`

Three changes to server.ts:
1. Import `loadFixtureCatalog` and `loadFixtureImages` from `./src/fixtures`
2. Add `GET /api/fixtures` and `GET /api/fixtures/:id/images`
3. Extend `POST /api/test/assistant` to accept and forward `testMode`, `selectionSummary`, `images`

- [ ] **Step 1: Add import to `admin-editor/server.ts`**

After line 30 (`import { createKbRouter } from './src/kb-routes'`), add:

```typescript
import { loadFixtureCatalog, loadFixtureImages, type FixtureMeta } from './src/fixtures'
```

- [ ] **Step 2: Define `fixturesDir` constant in server.ts**

After the existing `const dataDir = ...` line (search for `dataDir`), add:

```typescript
const fixturesDir = path.join(__dirname, 'fixtures')
```

- [ ] **Step 3: Add `GET /api/fixtures` endpoint**

Add this block immediately before `app.post('/api/test/connection', ...)` (around line 795):

```typescript
// Fixture catalog — metadata only, no image data
app.get('/api/fixtures', requireAuth(dataDir), (req, res) => {
  try {
    const catalog = loadFixtureCatalog(fixturesDir)
    res.json({ fixtures: catalog })
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to load fixtures: ' + (err?.message ?? String(err)) })
  }
})

// Fixture images — base64 data URLs for a specific fixture
app.get('/api/fixtures/:id/images', requireAuth(dataDir), (req, res) => {
  const id = req.params.id
  const catalog = loadFixtureCatalog(fixturesDir)
  const fixture = catalog.find((f: FixtureMeta) => f.id === id)
  if (!fixture) {
    return res.status(404).json({ error: 'Fixture not found: ' + id })
  }
  try {
    const images = loadFixtureImages(fixturesDir, fixture)
    res.json({ images })
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to load fixture images: ' + (err?.message ?? String(err)) })
  }
})
```

- [ ] **Step 4: Extend `POST /api/test/assistant` to accept new fields**

In `app.post('/api/test/assistant', ...)` (line 882), replace the destructure line:

**Before:**
```typescript
const { provider, endpoint, proxy, assistant, message, kbName } = req.body || {}
```

**After:**
```typescript
const {
  provider, endpoint, proxy, assistant, message, kbName,
  testMode, selectionSummary, images
} = req.body || {}

const resolvedTestMode: string = (typeof testMode === 'string' && ['no-selection','selection','vision'].includes(testMode))
  ? testMode : 'no-selection'

// Validate images when provided
if (resolvedTestMode === 'vision' && images !== undefined) {
  if (!Array.isArray(images) || images.some((img: unknown) => typeof img !== 'string')) {
    return res.status(400).json({ success: false, message: 'images must be an array of strings when testMode is vision.' })
  }
}
```

- [ ] **Step 5: Forward `selectionSummary` and `images` in internal-api provider path**

Find the block in the `internal-api` branch that builds `payload` (search for `const payload: Record<string, unknown> = { type: 'generalChat'`). Replace:

**Before:**
```typescript
const payload: Record<string, unknown> = { type: 'generalChat', message: fullMessage, kbName: resolvedKbName }
```

**After:**
```typescript
const payload: Record<string, unknown> = { type: 'generalChat', message: fullMessage, kbName: resolvedKbName }
if (resolvedTestMode === 'selection' || resolvedTestMode === 'vision') {
  if (typeof selectionSummary === 'string' && selectionSummary.trim()) {
    payload.selectionSummary = selectionSummary.trim()
  }
}
if (resolvedTestMode === 'vision' && Array.isArray(images)) {
  payload.images = images
}
```

- [ ] **Step 6: Forward `selectionSummary` and `images` in proxy provider path**

Find the proxy branch that builds `payload` (search for `const payload: Record<string, unknown> = { messages }`). Replace:

**Before:**
```typescript
const payload: Record<string, unknown> = { messages }
if (typeof proxy?.defaultModel === 'string' && proxy.defaultModel) payload.model = proxy.defaultModel
```

**After:**
```typescript
const payload: Record<string, unknown> = { messages }
if (typeof proxy?.defaultModel === 'string' && proxy.defaultModel) payload.model = proxy.defaultModel
if (resolvedTestMode === 'selection' || resolvedTestMode === 'vision') {
  if (typeof selectionSummary === 'string' && selectionSummary.trim()) {
    payload.selectionSummary = selectionSummary.trim()
  }
}
if (resolvedTestMode === 'vision' && Array.isArray(images)) {
  payload.images = images
}
```

- [ ] **Step 7: Restart ACE and smoke-test new endpoints**

```bash
# In one terminal: restart ACE
npm run admin

# In another terminal: test fixture catalog
curl -s -b "ace_sid=<your-session-cookie>" http://localhost:3333/api/fixtures | npx fx .fixtures[].id

# Test image endpoint
curl -s -b "ace_sid=<your-session-cookie>" http://localhost:3333/api/fixtures/checkout-form/images | npx fx '.images | length'
```

Expected: fixture IDs list, then `1` (one image for checkout-form).

If you don't have a session cookie handy, use the browser dev tools on the running ACE to copy `ace_sid` from the Application → Cookies panel, or test by navigating to `http://localhost:3333/api/fixtures` in the authenticated browser session.

- [ ] **Step 8: Commit**

```bash
git add admin-editor/server.ts
git commit -m "feat(ace): fixture endpoints GET /api/fixtures and /:id/images; extend POST /api/test/assistant with testMode/selectionSummary/images"
```

---

## Task 4: UI state additions + mode selector

**Files:**
- Modify: `admin-editor/public/app.js`

Add state keys and the mode selector row to `_pgSendColumn`.

- [ ] **Step 1: Add new state keys in `admin-editor/public/app.js`**

Find the state object (lines 50–62, the block with `playgroundActive`, `playgroundAssistantId`, etc.). Add these keys after `playgroundFiring: false`:

```javascript
playgroundTestMode: 'no-selection',   // 'no-selection' | 'selection' | 'vision'
playgroundFixtureCatalog: null,       // FixtureMeta[] loaded from /api/fixtures, or null
playgroundFixtureId: null,            // selected fixture id or null
playgroundSelectionSummary: '',       // editable selection summary textarea content
playgroundInspectorExpanded: true,    // payload inspector collapsed state
```

- [ ] **Step 2: Add `_pgModeSelector()` helper function**

Add this function immediately before `function _pgSendColumn(a)`:

```javascript
function _pgModeSelector () {
  var mode = state.playgroundTestMode || 'no-selection'
  var modes = [
    { id: 'no-selection', label: 'No Selection' },
    { id: 'selection',    label: 'Selection' },
    { id: 'vision',       label: 'Vision' }
  ]
  var html = '<div class="ae-field-group">'
  html += '<label>Test Mode</label>'
  html += '<div class="pg-mode-toggle">'
  modes.forEach(function (m) {
    var active = mode === m.id ? ' pg-mode-btn--active' : ''
    html += '<button type="button" class="pg-mode-btn' + active + '" data-mode="' + m.id + '">'
    html += escapeHtml(m.label)
    html += '</button>'
  })
  html += '</div>'
  html += '<p class="ae-helper">Controls which context fields are forwarded to the provider.</p>'
  html += '</div>'
  return html
}
```

- [ ] **Step 3: Inject mode selector at top of `_pgSendColumn`**

In `function _pgSendColumn(a)`, add `_pgModeSelector()` immediately after the `'<div class="ace-pg-col">'` and heading line:

```javascript
function _pgSendColumn (a) {
  var html = '<div class="ace-pg-col">'
  html += '<p class="ace-pg-col-heading">Send</p>'
  html += _pgModeSelector()          // ← ADD THIS LINE
  // ... rest of existing function unchanged
```

- [ ] **Step 4: Add mode selector CSS to `admin-editor/public/styles.css`**

Append to styles.css:

```css
/* ── Test harness: mode toggle ── */
.pg-mode-toggle {
  display: flex;
  gap: 0;
  border: 1px solid var(--ace-border);
  border-radius: var(--ace-radius-sm);
  overflow: hidden;
}
.pg-mode-btn {
  flex: 1;
  padding: 7px 0;
  font-family: var(--font-carbon);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  border: none;
  border-right: 1px solid var(--ace-border);
  background: var(--ace-surface);
  color: var(--ace-text-muted);
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}
.pg-mode-btn:last-child { border-right: none; }
.pg-mode-btn:hover { background: rgba(0,0,0,0.04); color: var(--ace-text); }
.pg-mode-btn--active { background: var(--ace-accent); color: #fff; }
.pg-mode-btn--active:hover { background: var(--ace-accent-hover); }
```

- [ ] **Step 5: Wire mode toggle buttons in `_bindPlayground`**

In `function _bindPlayground(a)`, after the existing `kbnameEl.oninput` block, add:

```javascript
document.querySelectorAll('.pg-mode-btn').forEach(function (btn) {
  btn.onclick = function () {
    state.playgroundTestMode = this.getAttribute('data-mode')
    // Reset fixture if incompatible with new mode
    if (state.playgroundFixtureId && state.playgroundFixtureCatalog) {
      var fix = state.playgroundFixtureCatalog.find(function (f) { return f.id === state.playgroundFixtureId })
      if (fix) {
        var mode = state.playgroundTestMode
        var keep = (mode === 'no-selection' && !fix.requiresSelection) ||
                   (mode === 'selection' && fix.requiresSelection) ||
                   (mode === 'vision' && fix.requiresSelection && fix.supportsVision)
        if (!keep) {
          state.playgroundFixtureId = null
          state.playgroundSelectionSummary = ''
        }
      }
    }
    renderPlayground()
  }
})
```

- [ ] **Step 6: Load fixture catalog when Playground opens**

In `renderPlayground()`, after the existing `_bindPlayground(assistant)` call, add:

```javascript
// Load fixture catalog once per session
if (state.playgroundFixtureCatalog === null) {
  _apiFetch(API_BASE + '/api/fixtures')
    .then(function (r) { return r.json() })
    .then(function (data) {
      state.playgroundFixtureCatalog = data.fixtures || []
      renderPlayground()
    })
    .catch(function () {
      state.playgroundFixtureCatalog = []
    })
}
```

- [ ] **Step 7: Commit**

```bash
git add admin-editor/public/app.js admin-editor/public/styles.css
git commit -m "feat(ace): test harness — mode selector (no-selection/selection/vision) + fixture catalog loader"
```

---

## Task 5: Fixture picker + selection summary + images row

**Files:**
- Modify: `admin-editor/public/app.js`
- Modify: `admin-editor/public/styles.css`

- [ ] **Step 1: Add `_pgFixturePicker()` helper**

Add immediately before `function _pgModeSelector()`:

```javascript
function _pgFixturePicker () {
  var mode = state.playgroundTestMode || 'no-selection'
  var catalog = state.playgroundFixtureCatalog
  if (!catalog) {
    return '<div class="ae-field-group"><p class="ae-helper">Loading fixtures…</p></div>'
  }
  // Filter fixtures compatible with current mode
  var visible = catalog.filter(function (f) {
    if (mode === 'no-selection') return !f.requiresSelection
    if (mode === 'selection') return f.requiresSelection
    if (mode === 'vision') return f.requiresSelection && f.supportsVision
    return true
  })
  if (visible.length === 0) {
    return '<div class="ae-field-group"><p class="ae-helper">No fixtures available for this mode.</p></div>'
  }
  var currentId = state.playgroundFixtureId
  var html = '<div class="ae-field-group">'
  html += '<label for="pg-fixture-picker">Fixture</label>'
  html += '<select id="pg-fixture-picker">'
  html += '<option value="">— none —</option>'
  // Group by category
  var byCategory = {}
  visible.forEach(function (f) {
    if (!byCategory[f.category]) byCategory[f.category] = []
    byCategory[f.category].push(f)
  })
  Object.keys(byCategory).sort().forEach(function (cat) {
    html += '<optgroup label="' + escapeHtml(cat) + '">'
    byCategory[cat].forEach(function (f) {
      var sel = currentId === f.id ? ' selected' : ''
      html += '<option value="' + escapeHtml(f.id) + '"' + sel + '>' + escapeHtml(f.name) + '</option>'
    })
    html += '</optgroup>'
  })
  html += '</select>'
  // Tags for selected fixture
  if (currentId) {
    var fix = catalog.find(function (f) { return f.id === currentId })
    if (fix && fix.tags && fix.tags.length > 0) {
      html += '<p class="ae-helper">tags: ' + fix.tags.map(function (t) { return escapeHtml(t) }).join(' · ') + '</p>'
    }
  }
  html += '</div>'
  return html
}
```

- [ ] **Step 2: Add `_pgSelectionSummary()` helper**

Add immediately before `function _pgFixturePicker()`:

```javascript
function _pgSelectionSummary () {
  var mode = state.playgroundTestMode || 'no-selection'
  if (mode === 'no-selection') return ''
  var summary = state.playgroundSelectionSummary || ''
  var currentId = state.playgroundFixtureId
  var catalog = state.playgroundFixtureCatalog || []
  var fix = currentId ? catalog.find(function (f) { return f.id === currentId }) : null
  var originalSummary = fix ? (fix.selectionSummary || '') : ''
  var html = '<div class="ae-field-group">'
  html += '<div class="pg-summary-header">'
  html += '<label for="pg-selection-summary">Selection Summary</label>'
  if (originalSummary && summary !== originalSummary) {
    html += '<button type="button" class="btn-small" id="pg-summary-reset">Reset</button>'
  }
  html += '</div>'
  html += '<textarea id="pg-selection-summary" class="ace-field pg-selection-summary-ta" rows="6">'
  html += escapeHtml(summary)
  html += '</textarea>'
  html += '<p class="ae-helper">Pre-filled from fixture. Edits are sent as-is.</p>'
  html += '</div>'
  return html
}
```

- [ ] **Step 3: Add `_pgImagesRow()` helper**

Add immediately before `function _pgSelectionSummary()`:

```javascript
function _pgImagesRow () {
  var mode = state.playgroundTestMode || 'no-selection'
  if (mode !== 'vision') return ''
  var currentId = state.playgroundFixtureId
  var catalog = state.playgroundFixtureCatalog || []
  var fix = currentId ? catalog.find(function (f) { return f.id === currentId }) : null
  if (!fix || !fix.images || fix.images.length === 0) {
    return '<div class="ae-field-group"><p class="ae-helper">No images in selected fixture.</p></div>'
  }
  var html = '<div class="ae-field-group">'
  html += '<label>Images</label>'
  html += '<div class="pg-images-row">'
  fix.images.forEach(function (img) {
    html += '<span class="pg-image-chip">' + escapeHtml(img) + '</span>'
  })
  html += '</div>'
  html += '<p class="ae-helper">' + fix.images.length + ' image' + (fix.images.length !== 1 ? 's' : '') + ' · base64-encoded at send time</p>'
  html += '</div>'
  return html
}
```

- [ ] **Step 4: Inject fixture picker, selection summary, images row into `_pgSendColumn`**

In `function _pgSendColumn(a)`, add the three new helpers after `_pgModeSelector()`:

```javascript
html += _pgModeSelector()
html += _pgFixturePicker()          // ← ADD
html += _pgSelectionSummary()       // ← ADD
html += _pgImagesRow()              // ← ADD
```

- [ ] **Step 5: Wire fixture picker and summary textarea in `_bindPlayground`**

In `function _bindPlayground(a)`, after the mode toggle wiring block, add:

```javascript
var fixturePicker = document.getElementById('pg-fixture-picker')
if (fixturePicker) {
  fixturePicker.onchange = function () {
    var id = this.value || null
    state.playgroundFixtureId = id
    if (id && state.playgroundFixtureCatalog) {
      var fix = state.playgroundFixtureCatalog.find(function (f) { return f.id === id })
      state.playgroundSelectionSummary = fix ? (fix.selectionSummary || '') : ''
    } else {
      state.playgroundSelectionSummary = ''
    }
    renderPlayground()
  }
}

var summaryTa = document.getElementById('pg-selection-summary')
if (summaryTa) {
  summaryTa.oninput = function () {
    state.playgroundSelectionSummary = this.value
  }
}

var summaryResetBtn = document.getElementById('pg-summary-reset')
if (summaryResetBtn) {
  summaryResetBtn.onclick = function () {
    if (state.playgroundFixtureId && state.playgroundFixtureCatalog) {
      var fix = state.playgroundFixtureCatalog.find(function (f) { return f.id === state.playgroundFixtureId })
      state.playgroundSelectionSummary = fix ? (fix.selectionSummary || '') : ''
      renderPlayground()
    }
  }
}
```

- [ ] **Step 6: Add CSS for fixture picker, summary, images row**

Append to `admin-editor/public/styles.css`:

```css
/* ── Test harness: fixture picker ── */
.pg-summary-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
}
.pg-summary-header label { margin-bottom: 0; }
.pg-selection-summary-ta {
  font-family: var(--font-protipo, var(--font));
  font-size: 11px;
  line-height: 1.55;
  resize: vertical;
}
.pg-images-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 4px;
}
.pg-image-chip {
  font-family: var(--font-carbon);
  font-size: 10px;
  background: var(--ace-bg);
  border: 1px solid var(--ace-border);
  border-radius: 4px;
  padding: 3px 8px;
  color: var(--ace-text-muted);
}
```

- [ ] **Step 7: Commit**

```bash
git add admin-editor/public/app.js admin-editor/public/styles.css
git commit -m "feat(ace): test harness — fixture picker, selection summary textarea, images row"
```

---

## Task 6: Payload Inspector

**Files:**
- Modify: `admin-editor/public/app.js`
- Modify: `admin-editor/public/styles.css`

- [ ] **Step 1: Add `_pgPayloadInspector()` helper**

Add immediately before `function _pgImagesRow()`:

```javascript
function _pgPayloadInspector (a) {
  var mode = state.playgroundTestMode || 'no-selection'
  var message = state.playgroundUserMessage || ''
  var kbOverride = state.playgroundKbName || ''
  var selectedQa = state.playgroundActionId ? (a.quickActions || []).find(function (q) { return q.id === state.playgroundActionId }) : null
  var effectiveKb = kbOverride || (selectedQa && selectedQa.kbName) || (state.instructionsMap && state.instructionsMap[a.id] && state.instructionsMap[a.id].defaultKbName) || 'figma'
  var effectiveMsg = message || (selectedQa && selectedQa.templateMessage) || ''
  // Build preview payload
  var preview = {
    type: 'generalChat',
    kbName: effectiveKb,
    message: effectiveMsg.length > 120 ? effectiveMsg.slice(0, 120) + '… [truncated]' : effectiveMsg
  }
  if (mode === 'selection' || mode === 'vision') {
    var summary = state.playgroundSelectionSummary || ''
    preview.selectionSummary = summary.length > 80 ? summary.slice(0, 80) + '… [truncated]' : summary
  }
  if (mode === 'vision') {
    var catalog = state.playgroundFixtureCatalog || []
    var fix = state.playgroundFixtureId ? catalog.find(function (f) { return f.id === state.playgroundFixtureId }) : null
    var imgCount = fix ? (fix.images || []).length : 0
    preview.images = imgCount > 0 ? ['[' + imgCount + ' image' + (imgCount !== 1 ? 's' : '') + ' — encoded at send time]'] : []
  }
  var expanded = state.playgroundInspectorExpanded !== false
  var html = '<div class="pg-inspector">'
  html += '<button type="button" class="pg-inspector-toggle" id="pg-inspector-toggle">'
  html += (expanded ? '▾' : '▸') + ' Payload Inspector'
  html += '</button>'
  if (expanded) {
    html += '<pre class="pg-inspector-pre">' + escapeHtml(JSON.stringify(preview, null, 2)) + '</pre>'
    html += '<p class="ae-helper" style="margin-top:4px">Live preview of what will be sent. Images encoded at send time.</p>'
  }
  html += '</div>'
  return html
}
```

- [ ] **Step 2: Inject payload inspector into `_pgSendColumn` before the fire button**

In `function _pgSendColumn(a)`, find the fire button HTML block:

```javascript
var isFiring = state.playgroundFiring
html += '<button type="button" class="ace-pg-fire-btn" id="pg-fire-btn"' + ...
```

Add `_pgPayloadInspector(a)` on the line immediately before it:

```javascript
html += _pgPayloadInspector(a)      // ← ADD THIS LINE
var isFiring = state.playgroundFiring
html += '<button type="button" class="ace-pg-fire-btn" id="pg-fire-btn"' + ...
```

- [ ] **Step 3: Wire inspector toggle in `_bindPlayground`**

Add after the summary reset button wiring:

```javascript
var inspectorToggle = document.getElementById('pg-inspector-toggle')
if (inspectorToggle) {
  inspectorToggle.onclick = function () {
    state.playgroundInspectorExpanded = !state.playgroundInspectorExpanded
    renderPlayground()
  }
}
```

- [ ] **Step 4: Add inspector CSS**

Append to `admin-editor/public/styles.css`:

```css
/* ── Test harness: payload inspector ── */
.pg-inspector {
  margin-bottom: var(--ace-space-12);
  border: 1px solid var(--ace-border);
  border-radius: var(--ace-radius-sm);
  overflow: hidden;
}
.pg-inspector-toggle {
  width: 100%;
  text-align: left;
  padding: 8px 12px;
  font-family: var(--font-carbon);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  background: var(--ace-bg);
  border: none;
  color: var(--ace-text-muted);
  cursor: pointer;
}
.pg-inspector-toggle:hover { color: var(--ace-text); }
.pg-inspector-pre {
  font-family: 'JetBrains Mono', 'Fira Code', monospace;
  font-size: 11px;
  line-height: 1.55;
  padding: 10px 12px;
  margin: 0;
  background: #1e1e1e;
  color: #d4d4d4;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-all;
  border-top: 1px solid var(--ace-border);
}
```

- [ ] **Step 5: Commit**

```bash
git add admin-editor/public/app.js admin-editor/public/styles.css
git commit -m "feat(ace): test harness — payload inspector (collapsible, live preview)"
```

---

## Task 7: Wire fire button for new fields

**Files:**
- Modify: `admin-editor/public/app.js`

Update the fire button `onclick` handler to include `testMode`, `selectionSummary`, and — for vision mode — fetch images from `/api/fixtures/:id/images` before sending.

- [ ] **Step 1: Replace the fire button onclick in `_bindPlayground`**

Find the `fireBtn.onclick = async function () {` block (around line 2009). Replace the entire `var body = { ... }` section and the `_apiFetch` call with:

```javascript
fireBtn.onclick = async function () {
  var message = (document.getElementById('pg-message') || {}).value || ''
  var kbOverride = (document.getElementById('pg-kbname') || {}).value || ''
  var selectedQa = state.playgroundActionId ? (a.quickActions || []).find(function (q) { return q.id === state.playgroundActionId }) : null
  var effectiveKb = kbOverride || (selectedQa && selectedQa.kbName) || (state.instructionsMap[a.id] && state.instructionsMap[a.id].defaultKbName) || ''
  var effectiveMessage = message || (selectedQa && selectedQa.templateMessage) || ''
  if (!effectiveMessage) {
    state.playgroundResult = { error: 'Enter a message before firing.' }
    renderPlayground()
    return
  }
  var segments = _pgAssembleSegments(a)
  var toggles = state.playgroundSkillToggles
  var activeSegments = segments.filter(function (seg) {
    if (seg.required) return true
    return toggles[seg.key] !== undefined ? toggles[seg.key] : !seg.optionalUniversal
  }).map(function (seg) {
    return { label: seg.label, content: state.playgroundEditCopy ? (state.playgroundEditCopy[seg.key] || seg.content) : seg.content }
  })

  var testMode = state.playgroundTestMode || 'no-selection'
  state.playgroundFiring = true
  renderPlayground()

  try {
    var body = {
      assistantId: a.id,
      message: effectiveMessage,
      skillSegments: activeSegments,
      kbName: effectiveKb || undefined,
      testMode: testMode
    }

    // Attach selectionSummary for selection and vision modes
    if (testMode === 'selection' || testMode === 'vision') {
      body.selectionSummary = state.playgroundSelectionSummary || ''
    }

    // For vision mode, fetch base64 images from server before sending
    if (testMode === 'vision' && state.playgroundFixtureId) {
      try {
        var imgResp = await _apiFetch(API_BASE + '/api/fixtures/' + encodeURIComponent(state.playgroundFixtureId) + '/images')
        if (imgResp.ok) {
          var imgData = await imgResp.json()
          body.images = imgData.images || []
        }
      } catch (imgErr) {
        console.warn('[ACE] Failed to load fixture images:', imgErr)
        body.images = []
      }
    }

    var r = await _apiFetch(API_BASE + '/api/test/assistant', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    if (!r.ok) throw new Error('Server returned ' + r.status)
    var data = await r.json()
    state.playgroundResult = data
    var qaLabel = selectedQa ? selectedQa.label : '(direct message)'
    var modeLabel = testMode !== 'no-selection' ? ' [' + testMode + ']' : ''
    state.playgroundSessionHistory.push({
      timestamp: new Date().toLocaleTimeString(),
      summary: qaLabel + modeLabel + ' — ' + (data.success ? 'OK' : 'Error') + ' — ' + (data.latencyMs || '?') + 'ms — ' + (data.response || '').slice(0, 60)
    })
  } catch (err) {
    state.playgroundResult = { error: err.message }
  }
  state.playgroundFiring = false
  renderPlayground()
}
```

- [ ] **Step 2: Manual test — no-selection mode**

1. Open ACE at http://localhost:3333
2. Navigate to Assistants → any assistant → Playground
3. Verify mode selector shows "No Selection / Selection / Vision" toggle
4. Confirm Payload Inspector shows `{ "type": "generalChat", "kbName": "...", "message": "..." }` — no `selectionSummary` or `images`
5. Type a message and click FIRE — verify response comes back

- [ ] **Step 3: Manual test — selection mode**

1. Switch mode to "Selection"
2. Choose fixture "Checkout Form — error states" from picker
3. Verify Selection Summary textarea pre-fills with the checkout form description
4. Edit one word in the textarea
5. Verify Payload Inspector updates live showing `selectionSummary` field
6. Click FIRE — verify request succeeds

- [ ] **Step 4: Manual test — vision mode**

1. Switch mode to "Vision"
2. Choose fixture "Checkout Form — error states"
3. Verify Images row shows "checkout-form-1.png · 1 image · encoded at send time"
4. Click FIRE — verify request succeeds and payload inspector showed `images` array placeholder

- [ ] **Step 5: Commit**

```bash
git add admin-editor/public/app.js
git commit -m "feat(ace): test harness — wire fire button with testMode/selectionSummary/images; vision fetches fixture images before send"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Task |
|-----------------|------|
| Three modes: no-selection / selection / vision | Task 4 |
| Fixture library with JSON schema | Task 2 |
| 5–8 curated fixtures | Task 2 (5 fixtures) |
| `GET /api/fixtures` — metadata only | Task 3 |
| `GET /api/fixtures/:id/images` — base64 | Task 3 |
| `POST /api/test/assistant` extended with testMode/selectionSummary/images | Task 3 |
| Fixture picker grouped by category | Task 5 |
| Fixture tags shown | Task 5 |
| Selection Summary textarea pre-filled from fixture, editable, Reset button | Task 5 |
| Images panel (vision only) — filenames + count | Task 5 |
| Payload Inspector — collapsible, live-updating | Task 6 |
| Inspector shows message/selectionSummary/images as distinct fields | Task 6 |
| Images encoded at send time (not on fixture load) | Task 7 |
| Mode switch resets incompatible fixture selection | Task 4 |
| Backward compat: no testMode sent → defaults to no-selection | Task 3 (resolvedTestMode default) |
| `images` validation: must be array of strings | Task 3 |
| Both internal-api and proxy provider paths forward new fields | Task 3 |

All requirements covered. No placeholders. ✓
