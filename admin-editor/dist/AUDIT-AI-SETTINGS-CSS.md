# AI Settings page CSS audit report

## 1) Stylesheet loading

- **index.html** (line 8): `<link rel="stylesheet" href="styles.css" />` — correct file, no version query (possible cache).
- **DevTools check:** Hard-reload with "Disable cache" in Network tab; confirm `styles.css` returns 200 and is not "(from memory cache)". In Sources, open the loaded `styles.css` and confirm the `#panel-ai` rules (lines 373–384) are present.

## 2) Selector match

- **#panel-ai** exists: [index.html](index.html) line 134 — `<section id="panel-ai" role="tabpanel" class="panel" aria-hidden="true"></section>`. Content is injected by [app.js](app.js) `renderAITab()`.
- **AI page root:** `#panel-ai.panel` — correct.
- **"AI Settings" header row:** `<div class="ace-section-header-row">` with `<h2 class="ace-section-title">AI Settings</h2>` (app.js 1095–1097).
- **Build line:** `<p id="ai-build-info" class="ace-build-info ace-text-muted">` (app.js 1099).
- **"AI API Endpoint" title:** Inside collapsible — `.ace-section.ace-collapsible` with `button.ace-section-header` and `.ace-section-title` ("AI API Endpoint"). Description is first child of the card: `<p class="ace-card-subtext">` (app.js 1101, 1130).

## 3) Real source of spacing

- **AI Settings → Build gap:** The panel is a flex container: `.panel { gap: var(--ace-space-24); }` (styles.css ~431). So the space between the header row and the build line is the **flex gap (24px)**, not only the header’s `padding-bottom` or the build line’s `margin-bottom`. Existing rules `#panel-ai .ace-section-header-row { padding-bottom: var(--ace-space-12); }` and `#panel-ai .ace-build-info { margin-bottom: var(--ace-space-12); }` do not change that gap.
- **AI API Endpoint title → description:** The description lives in `.ace-collapsible .ace-section-body` (padding `var(--ace-card-padding)` = 16px). Rule `#panel-ai .ace-collapsible .ace-section-body { padding-top: var(--ace-space-8); }` (styles.css 381–383) overrides top padding to 8px. If that’s not visible, check DevTools Computed for that element and which rule wins.

## 4) Overrides

- No higher-specificity rule overrides `#panel-ai .ace-section-header-row` or `#panel-ai .ace-build-info` in the file. The dominant spacing for the first gap is `.panel`’s `gap`, which is not overridden for `#panel-ai`.

## Fix applied

- **#panel-ai panel gap:** Add `#panel-ai { gap: var(--ace-space-12); }` so the flex gap between header row, build line, and cards is 12px on the AI page only.
- **Title → description (optional):** Keep or tighten `#panel-ai .ace-collapsible .ace-section-body { padding-top: … }` (e.g. 4px) for a smaller gap under the "AI API Endpoint" header.

## Verification

- Hard reload ACE (Disable cache); confirm both gaps are visibly reduced on the AI tab.
- Confirm General / Assistants / other tabs look unchanged.
- Run `npm run build` and paste output; list modified files and exact selectors changed.
