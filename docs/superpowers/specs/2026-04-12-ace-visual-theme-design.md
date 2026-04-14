# ACE Visual Theme — Design Spec

> **Status:** Approved. Ready for implementation planning.
>
> **Scope:** Visual layer only — typography hierarchy, dark topbar/sidebar, Lucide icons, accent card treatment. Structural content, tab layout, form fields, and server logic are unchanged.

---

## Goal

Apply the main FigmAI site's design language to the ACE Admin Config Editor. The site and the plugin already share the same custom font assets (Industry Inc, Protipo, Carbon). This spec closes the visual gap by introducing the correct font hierarchy, the site's dark nav treatment, Lucide icons throughout, and the site's accent card pattern.

---

## Design Tokens

ACE's `styles.css` already declares `--ace-accent: #d50c7d` (matches site). The following token updates align ACE's shell with the site's `tokens.css`:

| Token | Current value | New value | Notes |
|-------|--------------|-----------|-------|
| `--ace-topbar-bg` | `var(--ace-bg)` (#f2f2f2) | `#0a0a0a` | Matches `--bg-nav` on site |
| `--ace-sidebar-bg` | `#e6e6e6` | `#111111` | Near-black, pairs with dark topbar |
| `--ace-topbar-border` | `var(--ace-border)` | `rgba(255,255,255,0.07)` | Subtle dark border |
| `--ace-sidebar-border` | `var(--ace-border)` | `rgba(255,255,255,0.07)` | Consistent with topbar |
| Body font | `var(--font-carbon)` | `var(--font-protipo)` | Protipo = site's `--font-body` |

All other tokens (accent, radius, spacing, card bg) are unchanged.

---

## Typography Hierarchy

Three fonts are already loaded in `fonts.css`. This spec defines where each is applied:

| Font | CSS variable | Applied to |
|------|-------------|-----------|
| **Industry Inc** | `--font-display` | Page/section title (`ace-page-header-title`, section `<h2>` headings in generated HTML) |
| **Carbon** | `--font-label` | Nav item labels, topbar subtitle, button text, sub-tab labels, eyebrow labels, badge text |
| **Protipo** | `--font-body` | Body text, form field labels, descriptions, helper text, card body content |

Previously ACE used Carbon everywhere. The change:
- `body` font-family → `var(--font-protipo)`
- `.ace-nav-item`, `.ace-nav-label` → `var(--font-label)` (Carbon, already correct)
- `.ace-page-header-title` → `var(--font-display)` (Industry Inc)
- `.ace-topbar-label` → `var(--font-label)` (Carbon)
- All section `h2` generated in `app.js` → `class="ace-section-title"` with `font-family: var(--font-display)`
- All eyebrow labels → `class="ace-section-eyebrow"` with `font-family: var(--font-label)`
- Button text → `var(--font-label)`, uppercase, tracked

---

## Topbar

**Before:** Light gray background (`#f2f2f2`), light border, `logo-figmai.svg`.

**After:**
- Background: `#0a0a0a`
- Border-bottom: `1px solid rgba(255,255,255,0.07)`
- Logo: `logo-DAT_darkmode.svg` (the full wordmark SVG, inlined or via `<img>`)
- Separator: `1px` vertical rule in `rgba(255,255,255,0.12)` between logo and subtitle
- Subtitle "Admin Config Editor": Carbon, 10px, uppercase, `rgba(255,255,255,0.4)`
- Height: reduced from 72px to 52px (matches site nav)
- Buttons: see Button section below

---

## Sidebar

**Before:** Light gray (`#e6e6e6`), white text on active pill.

**After:**
- Background: `#111111`
- Border-right: `1px solid rgba(255,255,255,0.07)`
- Nav item default: Carbon 10px uppercase, `rgba(255,255,255,0.4)`, no background
- Nav item hover: `rgba(255,255,255,0.05)` background, `rgba(255,255,255,0.75)` text
- Nav item active: `rgba(213,12,125,0.14)` background, `#d50c7d` text (replaces full-pink pill)
- Icons: Lucide SVG (15px, `stroke-width: 1.75`) replacing `<img>` icon files
- Icon color inherits from nav item text color

### Lucide icon mapping

| Nav item | Lucide icon name |
|----------|-----------------|
| General | `settings-2` |
| AI | `bot` |
| Assistants | `users` |
| Resources | `book-open` |
| Design Systems | `layers` |
| Usage Report | `bar-chart-3` |
| Users | `user` |
| Help | `help-circle` |
| Server status | `server` |

---

## Topbar Buttons

Three buttons: Reset, Validate, Save.

**Before:** Plain bordered buttons with text only.

**After — three distinct treatments:**

| Button | Style | Icon |
|--------|-------|------|
| Reset | Ghost: `rgba(255,255,255,0.06)` bg, `rgba(255,255,255,0.12)` border, `rgba(255,255,255,0.65)` text | `rotate-ccw` |
| Validate | Outline: transparent bg, `rgba(213,12,125,0.4)` border, `#d50c7d` text | `check-circle` |
| Save | Primary: `#d50c7d` bg, `#fff` text | `save` |

All buttons: Carbon font, 10px, uppercase, `letter-spacing: 0.06em`, 6px padding vertical, 14px horizontal.

---

## Page Header Area

The `ace-page-header-bar` (sits between sidebar and content):

- Background: `var(--bg-card)` (#fff) — unchanged
- Border-bottom: `1px solid var(--border-card)` — unchanged
- Page title (`.ace-page-header-title`): **Industry Inc**, 22px, `#111`, `letter-spacing: -0.01em`
- Eyebrow above title: new `<p class="ace-section-eyebrow">` — Carbon 9px uppercase, `letter-spacing: 0.14em`, `#d50c7d`
- The eyebrow text is derived from the tab: "Plugin Settings" for General, "LLM Configuration" for AI, etc.

---

## Cards / Accordion Sections

The collapsible card sections rendered in `app.js` (`.ace-section-card`):

**Before:** White bg, `1px solid #ddd` border, 8px radius.

**After (matches site's AssistantCard pattern):**
- Border: `1px solid color-mix(in srgb, var(--ace-accent) 18%, transparent)`
- Border-left: `3px solid var(--ace-accent)`
- Border-radius: `10px` (`--radius-card` from site)
- Card icon chip: `30px` square, `rgba(213,12,125,0.1)` bg, `8px` radius, `#d50c7d` icon color — Lucide icon relevant to each section
- Card title: Protipo 13px bold
- Card subtitle (optional second line): Protipo 11px, `--text-muted`
- Chevron: accent color (`#d50c7d`)

### Card icon mapping (General tab example)

| Card | Lucide icon |
|------|------------|
| Default Mode | `layout-panel-left` |
| Mode Settings | `list` |
| Branding | `award` |
| Resource Links | `link` |
| Credits | `heart` |
| Advanced — Raw JSON | `code-2` |

Other tabs follow the same pattern with contextually appropriate icons.

---

## Section Eyebrows

Eyebrow labels appear above page titles and major section groups in `app.js`-generated HTML:

```html
<p class="ace-section-eyebrow">Plugin Settings</p>
<h2 class="ace-section-title">General</h2>
```

CSS:
```css
.ace-section-eyebrow {
  font-family: var(--font-label);   /* Carbon */
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--ace-accent);
  margin-bottom: 4px;
}
.ace-section-title {
  font-family: var(--font-display); /* Industry Inc */
  font-size: 22px;
  font-weight: 700;
  color: var(--ace-text);
  margin-bottom: 20px;
  letter-spacing: -0.01em;
}
```

---

## Sub-tabs

Sub-tab rows (Plugin/Site in General, Shared Skills/Internal KBs in Resources):

- Font: Carbon 10px uppercase, `letter-spacing: 0.08em`
- Default: `--text-subtle` (#999)
- Active: `--ace-accent`, `2px solid var(--ace-accent)` bottom border
- Background: `var(--bg-card)` (#fff), `1px solid var(--border-card)` bottom border on the row

---

## Logo Change

`index.html` line 56: `logo-figmai.svg` → `logo-DAT_darkmode.svg`.

The dark-mode wordmark is white + accent-pink and renders correctly on the new dark topbar.

---

## Lucide CDN

Add to `index.html` before `</body>`:
```html
<script src="https://unpkg.com/lucide@latest/dist/umd/lucide.min.js"></script>
<script>
  // Initialize after DOM is ready; re-called after dynamic renders
  document.addEventListener('DOMContentLoaded', () => lucide.createIcons());
</script>
```

For icons injected dynamically by `app.js`, call `lucide.createIcons()` after each render that introduces new `<i data-lucide="...">` elements.

Nav icons in `index.html` use inline SVG (not `data-lucide` attributes) to avoid timing issues with the CDN load.

---

## Files Changed

| File | Change |
|------|--------|
| `admin-editor/public/index.html` | Logo swap, Lucide CDN, nav icons → inline Lucide SVG |
| `admin-editor/public/styles.css` | Token updates, topbar/sidebar dark treatment, nav item active style, button styles, card accent border, eyebrow/title typography classes |
| `admin-editor/public/app.js` | Add eyebrow labels to generated HTML, apply `ace-section-title` class to headings, add Lucide icon chips to card headers, call `lucide.createIcons()` after renders |

No changes to `server.ts`, `model.ts`, `save.ts`, or any TypeScript files.

---

## What Does Not Change

- All tab structure, panel layout, sidebar width, and content hierarchy from the UX redesign
- All form fields, inputs, textareas, toggles (styling only updated to match Protipo body font)
- All server-side logic
- The `dist/` copies are not edited — only `public/` sources

---

## Out of Scope

- Dark mode for the main content area (body stays `#f7f7f7`)
- Theming the login/bootstrap views (out of scope for this pass)
- Animated transitions or hover micro-interactions
- Home page (`home.html`) restyling
