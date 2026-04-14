# ACE UX Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the ACE Admin Editor UI to reflect the SKILL.md-first authoring model: restructure the assistant editor sub-tabs, clean up the General tab, upgrade the Resources tab with sub-tabs, and replace the raw Registries editor with a structured Design Systems editor.

**Architecture:** All changes are in `admin-editor/public/app.js` (UI) and `admin-editor/public/index.html` (static structure). Server-side changes are minimal — the model loader and API are unchanged. A companion plan covers the test harness (server endpoint + Playground UI).

**Tech Stack:** Vanilla JS SPA (`app.js`, 5507 lines), Express server (`server.ts`), no build step for the UI — `app.js` is the source and the bundle.

---

## File Map

| File | Change |
|------|--------|
| `admin-editor/public/app.js` | All UI changes: tab restructure, form wizard, sub-tabs |
| `admin-editor/public/index.html` | Already has correct nav labels (General, Resources, Design Systems, Usage Report) — no changes needed |

## Key Existing Functions (read these before editing)

| Function | Line | What it does |
|----------|------|--------------|
| `renderConfigTab()` | 951 | Renders the General/Config panel |
| `assistantEditorHtml(a)` | 2226 | Renders the assistant editor with detail sub-tabs |
| `_aeOverviewTab(a)` | 2251 | Identity fields: label, iconId, intro, kind, tag |
| `_aeInstructionsTab(a)` | 2322 | Settings fields: execution, figmaContext, output schema, safety |
| `_aeSkillsTab(a)` | 2385 | Skills: universal skills + instruction blocks + prompt template |
| `_aeSkillMdPanel(id)` | 2497 | SKILL.md raw textarea |
| `_aeKnowledgeTab(a)` | 2524 | kbName field + raw knowledge textarea |
| `_aeQuickActionsTab(a)` | 2556 | Quick Actions list editor |
| `renderKnowledgeBasesTabContent()` | 3218 | Resources panel: Universal Skills + KB list |
| `renderRegistriesTab()` | 4412 | Registries panel: raw JSON textareas |

---

## Task 1: General Tab Cleanup

**Spec reference:** `docs/superpowers/specs/2026-04-12-ace-ux-redesign-design.md` — General Tab section

**What changes:**
- Remove HAT (Accessibility — HAT-required components) collapsible section entirely
- Remove Network Access section if present (check `renderConfigTab` for any `networkAccess` UI — the `networkAccess` field remains in config JSON but is no longer shown)
- Add a "Site" sub-tab structure (Plugin | Site) with a placeholder panel for the Site tab
- The "Advanced — Raw JSON" collapsible section stays, already exists at line 1132

**Files:**
- Modify: `admin-editor/public/app.js:951-1465`

- [ ] **Step 1: Read the current General tab render function**

```bash
sed -n '951,1140p' admin-editor/public/app.js
```

Understand what sections exist before editing. The sections are: default-mode, mode-settings, branding, resource-links, credits, accessibility-hat, advanced-raw-json.

- [ ] **Step 2: Add sub-tab state to the global state object**

In `app.js`, around line 27 (where `selectedTab` is defined), find the `state` object initialization. Add a new field for the General tab's sub-tab:

```javascript
// Around line 27, inside the state object:
selectedGeneralSubTab: 'plugin',   // 'plugin' | 'site'
```

- [ ] **Step 3: Remove the HAT collapsible section**

In `renderConfigTab()` (line 951), find the block that generates the `accessibility-hat` section (lines 1118–1131):

```javascript
var hatList = Array.isArray(m.config.accessibility && m.config.accessibility.hatRequiredComponents) ? m.config.accessibility.hatRequiredComponents.slice() : []
html += collapsibleSection('accessibility-hat', 'Accessibility — HAT-required components',
  // ...
  expandedMap['accessibility-hat'])
```

Delete this entire block (lines 1118–1131). Also remove `'accessibility-hat'` from `CONFIG_SECTION_KEYS` at line 731:

```javascript
// Line 731 — before:
var CONFIG_SECTION_KEYS = ['default-mode', 'mode-settings', 'ai-api-endpoint', 'resource-links', 'credits', 'accessibility-hat', 'advanced-raw-json']
// After:
var CONFIG_SECTION_KEYS = ['default-mode', 'mode-settings', 'branding', 'resource-links', 'credits', 'advanced-raw-json']
```

Also remove the HAT event handler block (the `panel.querySelectorAll('.ace-hat-remove')` code, approximately lines 1310–1350). Find it by searching for `ace-hat-remove` in the file.

- [ ] **Step 4: Wrap the Plugin sub-tab content**

In `renderConfigTab()`, wrap the existing content (currently all rendered into `html`) in a sub-tab structure. Replace the `panel.innerHTML = html` assignment with a two-sub-tab layout:

```javascript
function renderConfigTab () {
  const panel = document.getElementById('panel-config')
  if (!panel || !state.editedModel) {
    if (panel) panel.innerHTML = '<p>No config loaded.</p>'
    return
  }
  const m = state.editedModel

  // Sub-tab header
  var subTab = state.selectedGeneralSubTab || 'plugin'
  var subTabHtml = '<div class="ace-sub-tab-row">'
  subTabHtml += '<button type="button" class="ace-sub-tab-btn' + (subTab === 'plugin' ? ' active' : '') + '" data-general-subtab="plugin">Plugin</button>'
  subTabHtml += '<button type="button" class="ace-sub-tab-btn' + (subTab === 'site' ? ' active' : '') + '" data-general-subtab="site">Site <span class="ace-badge ace-badge--upcoming">Upcoming</span></button>'
  subTabHtml += '</div>'

  if (subTab === 'site') {
    panel.innerHTML = subTabHtml + renderGeneralSitePlaceholder()
    panel.querySelectorAll('.ace-sub-tab-btn[data-general-subtab]').forEach(function (btn) {
      btn.onclick = function () {
        state.selectedGeneralSubTab = this.getAttribute('data-general-subtab')
        renderConfigTab()
      }
    })
    return
  }

  // Plugin sub-tab: existing content below
  var html = subTabHtml
  // ... (rest of existing renderConfigTab html generation, unchanged except HAT removal)
```

- [ ] **Step 5: Add the Site placeholder render function**

After `renderConfigTab()`, add a new function:

```javascript
function renderGeneralSitePlaceholder () {
  var html = '<div class="ace-site-placeholder">'
  html += '<p class="ae-helper" style="margin-bottom:12px">The Site tab will manage marketing site content alongside each assistant.</p>'
  html += '<div class="ace-placeholder-card">'
  html += '<h3 class="ace-placeholder-card-title">Site Data Management — Deferred</h3>'
  html += '<p class="ace-placeholder-card-body">Fields coming here: tagline, accent color, video filename, howToUse steps, quickAction chips, per-assistant resource links, bestPractices, strike team slots.</p>'
  html += '<p class="ace-placeholder-card-body" style="margin-top:8px">Architecture question under review: JSON layer vs. TypeScript authoring.</p>'
  html += '</div>'
  html += '<p class="ae-helper" style="margin-top:14px">Until this tab ships, edit site data directly in <code>site/src/data/assistants.ts</code>.</p>'
  html += '</div>'
  return html
}
```

- [ ] **Step 6: Wire sub-tab click handler in the Plugin sub-tab path**

At the end of `renderConfigTab()` (after `panel.innerHTML = html`), add the sub-tab click handler alongside the existing event binding:

```javascript
panel.querySelectorAll('.ace-sub-tab-btn[data-general-subtab]').forEach(function (btn) {
  btn.onclick = function () {
    state.selectedGeneralSubTab = this.getAttribute('data-general-subtab')
    renderConfigTab()
  }
})
```

- [ ] **Step 7: Manual test — General tab**

Run ACE: `npm run admin`

Navigate to General tab. Verify:
- Plugin / Site sub-tab buttons appear
- Plugin tab shows Display Mode, Branding, Advanced sections — no HAT section
- Site tab shows the deferred placeholder text
- Switching between sub-tabs works without page reload
- Raw JSON Advanced section still works in Plugin tab

- [ ] **Step 8: Commit**

```bash
git add admin-editor/public/app.js
git commit -m "feat(ace): general tab — remove HAT, add Plugin/Site sub-tab structure"
```

---

## Task 2: Restructure Assistant Editor Sub-Tabs

**Spec reference:** ACE UX Redesign spec — Assistants Tab section

**What changes:**

Current tabs: `overview`, `instructions`, `skills`, `knowledge`, `quick-actions`
New tabs: `skill-md` (primary), `identity`, `site`, `knowledge`, `settings`

Mapping:
- `overview` → `identity` (rename, content stays, function renamed `_aeIdentityTab`)
- `instructions` → `settings` (rename, content stays, function renamed `_aeSettingsTab`, remove legacy tone/style preset)
- `skills` → `skill-md` (rename, content replaced in Task 3; for now keep existing content)
- `knowledge` → `knowledge` (keep, add kbName field is already there)
- `quick-actions` → removed (Quick Actions content moves into SKILL.md form wizard in Task 3)
- `site` → new placeholder (using same `renderGeneralSitePlaceholder` pattern)

**Files:**
- Modify: `admin-editor/public/app.js:2226-2556`

- [ ] **Step 1: Update `DETAIL_TABS` array in `assistantEditorHtml()`**

In `assistantEditorHtml()` at line 2228, replace the `DETAIL_TABS` array:

```javascript
// Before (line 2228):
var DETAIL_TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'instructions', label: 'Instructions' },
  { id: 'skills', label: 'Skills' },
  { id: 'knowledge', label: 'Knowledge' },
  { id: 'quick-actions', label: 'Quick Actions' }
]

// After:
var DETAIL_TABS = [
  { id: 'skill-md', label: 'SKILL.md' },
  { id: 'identity', label: 'Identity' },
  { id: 'site', label: 'Site', badge: 'upcoming' },
  { id: 'knowledge', label: 'Knowledge' },
  { id: 'settings', label: 'Settings' }
]
```

- [ ] **Step 2: Update tab button rendering to support badge**

In `assistantEditorHtml()`, the tab button render loop (line 2236) needs to support the optional badge:

```javascript
// Before (line 2236):
DETAIL_TABS.forEach(function (t) {
  var sel = activeTab === t.id
  html += '<button type="button" class="ae-detail-tab-btn' + (sel ? ' active' : '') + '" data-detail-tab="' + t.id + '">' + t.label + '</button>'
})

// After:
DETAIL_TABS.forEach(function (t) {
  var sel = activeTab === t.id
  var label = t.label
  if (t.badge === 'upcoming') label += ' <span class="ace-badge ace-badge--upcoming">Upcoming</span>'
  html += '<button type="button" class="ae-detail-tab-btn' + (sel ? ' active' : '') + '" data-detail-tab="' + t.id + '">' + label + '</button>'
})
```

- [ ] **Step 3: Update tab dispatch in `assistantEditorHtml()`**

Replace the tab dispatch block (lines 2242–2246):

```javascript
// Before:
if (activeTab === 'overview') html += _aeOverviewTab(a)
else if (activeTab === 'instructions') html += _aeInstructionsTab(a)
else if (activeTab === 'skills') html += _aeSkillsTab(a)
else if (activeTab === 'knowledge') html += _aeKnowledgeTab(a)
else if (activeTab === 'quick-actions') html += _aeQuickActionsTab(a)

// After:
if (activeTab === 'skill-md') html += _aeSkillMdTab(a)
else if (activeTab === 'identity') html += _aeIdentityTab(a)
else if (activeTab === 'site') html += renderGeneralSitePlaceholder()
else if (activeTab === 'knowledge') html += _aeKnowledgeTab(a)
else if (activeTab === 'settings') html += _aeSettingsTab(a)
```

- [ ] **Step 4: Rename `_aeOverviewTab` to `_aeIdentityTab`**

Replace the function declaration at line 2251:

```javascript
// Before:
function _aeOverviewTab (a) {

// After:
function _aeIdentityTab (a) {
```

No content changes needed — the identity fields (label, iconId, intro, kind, tag) map directly to the new Identity sub-tab.

- [ ] **Step 5: Rename `_aeInstructionsTab` to `_aeSettingsTab` and remove legacy section**

Replace the function declaration at line 2322:

```javascript
// Before:
function _aeInstructionsTab (a) {

// After:
function _aeSettingsTab (a) {
```

Inside the function, remove the "Style preset (legacy)" section (lines 2376–2382):

```javascript
// Remove these lines entirely:
html += '<h3 class="ae-section-heading">Style preset <span class="fg-secondary" style="font-weight:400;font-size:12px">(legacy)</span></h3>'
html += '<div class="ae-field-group">'
html += '<label for="ae-toneStylePreset">Tone/style preset</label>'
html += '<input type="text" id="ae-toneStylePreset" class="ace-field" value="' + escapeHtml(a.toneStylePreset || '') + '" placeholder="e.g. professional">'
html += '<p class="ae-helper">Optional legacy preset. Superseded by skill blocks in the Skills tab.</p>'
html += '</div>'
```

- [ ] **Step 6: Create `_aeSkillMdTab` stub**

Add a new function after `_aeSettingsTab`. For now it renders the existing `_aeSkillMdPanel` content (the raw textarea). Task 3 upgrades this to the full form wizard:

```javascript
function _aeSkillMdTab (a) {
  // Task 3 will replace this with the full form wizard.
  // For now: render the existing raw SKILL.md editor.
  return _aeSkillMdPanel(a.id)
}
```

- [ ] **Step 7: Update default tab in state**

In the state initialization (around line 27), the `selectedAssistantDetailTab` default value needs updating. Find it:

```javascript
// Search for selectedAssistantDetailTab in the file
// Update the default from 'overview' to 'skill-md':
selectedAssistantDetailTab: 'skill-md',
```

- [ ] **Step 8: Update all references to old tab IDs**

Search for any other places in app.js that reference `'overview'`, `'instructions'`, `'quick-actions'` as tab IDs (not as HTML attribute values in the rendered content, but as state values used in conditionals):

```bash
grep -n "'overview'\|'instructions'\|'quick-actions'" admin-editor/public/app.js
```

For each match that is a tab ID reference (not content), update to the new ID.

- [ ] **Step 9: Manual test — Assistant editor sub-tabs**

Run ACE: `npm run admin`

Navigate to Assistants tab. Open any assistant. Verify:
- Sub-tabs show: SKILL.md, Identity, Site (Upcoming badge), Knowledge, Settings
- SKILL.md tab shows the raw SKILL.md editor (same as previous Skills tab content)
- Identity tab shows label, iconId, intro, kind, tag fields (same as previous Overview content)
- Site tab shows the deferred placeholder
- Knowledge tab works as before
- Settings tab shows execution model, figma context, output schema, safety (no style preset section)

- [ ] **Step 10: Commit**

```bash
git add admin-editor/public/app.js
git commit -m "feat(ace): restructure assistant editor — SKILL.md primary tab, Identity/Settings renamed"
```

---

## Task 3: SKILL.md Form Wizard

**Spec reference:** ACE UX Redesign spec — SKILL.md sub-tab section

**What changes:**

Replace `_aeSkillMdTab()` stub with a full form wizard. The wizard parses the current SKILL.md content from `state.skillMdEdits[a.id]` and renders structured form fields. A Form/Raw toggle in the tab header switches between modes. Both modes read/write `state.skillMdEdits[a.id]`.

**SKILL.md structure being edited:**
```markdown
---
skillVersion: 1
id: <assistantId>
---

## Identity
You are **Design AI Toolkit's <AssistantName> Assistant**, ...
Your core principle: **<corePrinciple>**

## Behavior
- <rule 1>
- <rule 2>

## Quick Actions
### <actionId>
templateMessage: |
  <message>
guidance: |
  <guidance>
```

**Files:**
- Modify: `admin-editor/public/app.js` — `_aeSkillMdTab()` function (added in Task 2)

- [ ] **Step 1: Add `_parseSkillMd(content)` helper function**

After `_aeSkillMdPanel()` at line 2497, add a parser that extracts fields from SKILL.md content:

```javascript
function _parseSkillMd (content) {
  // Returns { assistantName, corePrinciple, behaviorRules: string[], quickActions: QA[] }
  // QA = { id: string, templateMessage: string, guidance: string }
  var result = { assistantName: '', corePrinciple: '', behaviorRules: [], quickActions: [] }
  if (!content) return result
  var lines = content.split('\n')
  var section = null
  var currentQa = null
  var identityLines = []
  var yamlEnd = false
  var yamlCount = 0
  var i = 0

  // Skip YAML frontmatter
  while (i < lines.length) {
    if (lines[i].trim() === '---') {
      yamlCount++
      i++
      if (yamlCount === 2) { yamlEnd = true; break }
    } else {
      i++
    }
  }
  if (!yamlEnd) i = 0

  for (; i < lines.length; i++) {
    var line = lines[i]
    if (/^## Identity/i.test(line)) { section = 'identity'; continue }
    if (/^## Behavior/i.test(line)) { section = 'behavior'; currentQa = null; continue }
    if (/^## Quick Actions/i.test(line)) { section = 'quick-actions'; currentQa = null; continue }
    if (/^## /i.test(line)) { section = 'other'; currentQa = null; continue }

    if (section === 'identity') {
      // Extract assistant name from "You are **Design AI Toolkit's X Assistant**"
      var nameMatch = line.match(/You are \*\*[^']*'s\s+(.+?)\*\*/)
      if (nameMatch) result.assistantName = nameMatch[1].replace(/\s*Assistant\s*$/i, '').trim()
      // Extract core principle from "Your core principle: **X**"
      var cpMatch = line.match(/Your core principle:\s*\*\*(.+?)\*\*/)
      if (cpMatch) result.corePrinciple = cpMatch[1].trim()
    }

    if (section === 'behavior') {
      var ruleMatch = line.match(/^-\s+(.+)/)
      if (ruleMatch) result.behaviorRules.push(ruleMatch[1].trim())
    }

    if (section === 'quick-actions') {
      var qaHeader = line.match(/^###\s+(.+)/)
      if (qaHeader) {
        currentQa = { id: qaHeader[1].trim(), templateMessage: '', guidance: '' }
        result.quickActions.push(currentQa)
        continue
      }
      if (currentQa) {
        if (/^templateMessage:\s*\|/.test(line)) {
          var tm = []; i++
          while (i < lines.length && /^\s{2,}/.test(lines[i])) { tm.push(lines[i].replace(/^\s{2}/, '')); i++ }
          currentQa.templateMessage = tm.join('\n').trim(); i--
        } else if (/^guidance:\s*\|/.test(line)) {
          var gd = []; i++
          while (i < lines.length && /^\s{2,}/.test(lines[i])) { gd.push(lines[i].replace(/^\s{2}/, '')); i++ }
          currentQa.guidance = gd.join('\n').trim(); i--
        }
      }
    }
  }
  return result
}
```

- [ ] **Step 2: Add `_serializeSkillMd(assistantId, fields)` helper function**

After `_parseSkillMd`, add a serializer that writes the parsed fields back to SKILL.md format:

```javascript
function _serializeSkillMd (assistantId, fields) {
  // fields = { assistantName, corePrinciple, behaviorRules: string[], quickActions: QA[] }
  var lines = []
  lines.push('---')
  lines.push('skillVersion: 1')
  lines.push('id: ' + assistantId)
  lines.push('---')
  lines.push('')
  lines.push('## Identity')
  lines.push('')
  lines.push("You are **Design AI Toolkit's " + fields.assistantName + " Assistant**, an expert embedded inside a Figma plugin.")
  lines.push('')
  lines.push('Your core principle: **' + fields.corePrinciple + '**')
  lines.push('')
  if (fields.behaviorRules && fields.behaviorRules.length > 0) {
    lines.push('## Behavior')
    lines.push('')
    fields.behaviorRules.forEach(function (rule) {
      lines.push('- ' + rule)
    })
    lines.push('')
  }
  if (fields.quickActions && fields.quickActions.length > 0) {
    lines.push('## Quick Actions')
    lines.push('')
    fields.quickActions.forEach(function (qa) {
      lines.push('### ' + qa.id)
      lines.push('')
      if (qa.templateMessage) {
        lines.push('templateMessage: |')
        qa.templateMessage.split('\n').forEach(function (l) { lines.push('  ' + l) })
        lines.push('')
      }
      if (qa.guidance) {
        lines.push('guidance: |')
        qa.guidance.split('\n').forEach(function (l) { lines.push('  ' + l) })
        lines.push('')
      }
    })
  }
  return lines.join('\n')
}
```

- [ ] **Step 3: Add skill-md mode state**

In the state object (around line 44, where `skillMdEdits` is), add:

```javascript
skillMdMode: {},    // assistantId -> 'form' | 'raw'
```

- [ ] **Step 4: Replace `_aeSkillMdTab()` with the full form wizard**

Replace the stub from Task 2 with:

```javascript
function _aeSkillMdTab (a) {
  var mode = state.skillMdMode[a.id] || 'form'
  var content = state.skillMdEdits[a.id] || ''

  var html = ''
  // Toggle header
  html += '<div class="ae-skillmd-header">'
  html += '<span class="ae-helper" style="flex:1">Primary behavior editor. Changes are saved with the assistant\'s manifest.</span>'
  html += '<div class="ae-toggle-pill">'
  html += '<button type="button" class="ae-toggle-btn' + (mode === 'form' ? ' active' : '') + '" data-skillmd-mode="form" data-aid="' + escapeHtml(a.id) + '">Form</button>'
  html += '<button type="button" class="ae-toggle-btn' + (mode === 'raw' ? ' active' : '') + '" data-skillmd-mode="raw" data-aid="' + escapeHtml(a.id) + '">Raw</button>'
  html += '</div>'
  html += '</div>'

  if (mode === 'raw') {
    // Raw editor
    if (!content) {
      html += '<div class="ae-helper" style="margin-bottom:12px">'
      html += 'No SKILL.md found for this assistant. '
      html += 'Run <code>npx tsx scripts/migrate-assistant-to-skillmd.ts ' + escapeHtml(a.id) + '</code> to scaffold the files.'
      html += '</div>'
    } else {
      html += '<textarea'
      html += ' class="ace-field ace-textarea ace-skillmd-editor"'
      html += ' data-assistant-id="' + escapeHtml(a.id) + '"'
      html += ' rows="24"'
      html += ' style="font-family:monospace;font-size:13px;white-space:pre;"'
      html += '>' + escapeHtml(content) + '</textarea>'
    }
    return html
  }

  // Form wizard
  if (!content) {
    html += '<div class="ae-helper" style="margin-bottom:12px">'
    html += 'No SKILL.md found. Switch to Raw to create one, or run the migration script.'
    html += '</div>'
    return html
  }

  var fields = _parseSkillMd(content)

  // Identity section
  html += '<h3 class="ae-section-heading" style="margin-top:0">Identity</h3>'
  html += '<div class="ae-field-group">'
  html += '<label for="ae-sm-name">Assistant Name</label>'
  html += '<p class="ae-helper">Appears as "You are Design AI Toolkit\'s <strong>X</strong> Assistant"</p>'
  html += '<input type="text" id="ae-sm-name" class="ace-field ae-skillmd-field" data-field="assistantName" data-aid="' + escapeHtml(a.id) + '" value="' + escapeHtml(fields.assistantName) + '">'
  html += '</div>'
  html += '<div class="ae-field-group">'
  html += '<label for="ae-sm-cp">Core Principle</label>'
  html += '<p class="ae-helper">One sentence shown in bold — the non-negotiable guiding value.</p>'
  html += '<input type="text" id="ae-sm-cp" class="ace-field ae-skillmd-field" data-field="corePrinciple" data-aid="' + escapeHtml(a.id) + '" value="' + escapeHtml(fields.corePrinciple) + '">'
  html += '</div>'
  // Identity preview
  html += '<div class="ae-skillmd-identity-preview">'
  html += 'You are <strong>Design AI Toolkit\'s ' + escapeHtml(fields.assistantName || '…') + ' Assistant</strong>, an expert embedded inside a Figma plugin.<br>'
  html += 'Your core principle: <strong>' + escapeHtml(fields.corePrinciple || '…') + '</strong>'
  html += '</div>'

  // Behavior Rules
  html += '<h3 class="ae-section-heading">Behavior Rules</h3>'
  html += '<p class="ae-helper" style="margin-bottom:8px">Each rule is a bullet in the Behavior section. Order matters — highest priority first.</p>'
  html += '<ul class="ae-skillmd-rules-list" id="ae-sm-rules-' + escapeHtml(a.id) + '" data-aid="' + escapeHtml(a.id) + '">'
  fields.behaviorRules.forEach(function (rule, idx) {
    html += '<li class="ae-skillmd-rule-row" data-idx="' + idx + '">'
    html += '<span class="ae-drag-handle">⠿</span>'
    html += '<input type="text" class="ace-field ae-sm-rule-input" data-idx="' + idx + '" data-aid="' + escapeHtml(a.id) + '" value="' + escapeHtml(rule) + '">'
    html += '<button type="button" class="btn-small ae-sm-rule-remove" data-idx="' + idx + '" data-aid="' + escapeHtml(a.id) + '">✕</button>'
    html += '</li>'
  })
  html += '</ul>'
  html += '<button type="button" class="btn-small add-btn ae-sm-rule-add" data-aid="' + escapeHtml(a.id) + '">+ Add behavior rule</button>'

  // Quick Actions
  html += '<h3 class="ae-section-heading">Quick Actions</h3>'
  html += '<p class="ae-helper" style="margin-bottom:8px">Each action is a button in the plugin. Expanding shows what gets sent to the LLM.</p>'
  if (fields.quickActions.length === 0) {
    html += '<div class="ae-empty-state">No quick actions defined. Add one below.</div>'
  } else {
    fields.quickActions.forEach(function (qa, qidx) {
      html += '<div class="ae-qa-accordion" data-qidx="' + qidx + '" data-aid="' + escapeHtml(a.id) + '">'
      html += '<div class="ae-qa-header">'
      html += '<strong>' + escapeHtml(qa.id) + '</strong>'
      html += '<button type="button" class="btn-small ae-qa-toggle" data-qidx="' + qidx + '" data-aid="' + escapeHtml(a.id) + '">Expand ▾</button>'
      html += '</div>'
      html += '<div class="ae-qa-body" style="display:none">'
      html += '<div class="ae-field-group"><label>Template Message</label>'
      html += '<p class="ae-helper">Pre-filled message sent when the user clicks this action.</p>'
      html += '<textarea class="ace-field ae-sm-qa-tmpl" rows="3" data-qidx="' + qidx + '" data-aid="' + escapeHtml(a.id) + '">' + escapeHtml(qa.templateMessage) + '</textarea>'
      html += '</div>'
      html += '<div class="ae-field-group"><label>Guidance</label>'
      html += '<p class="ae-helper">System-level instruction injected alongside the message.</p>'
      html += '<textarea class="ace-field ae-sm-qa-guidance" rows="3" data-qidx="' + qidx + '" data-aid="' + escapeHtml(a.id) + '">' + escapeHtml(qa.guidance) + '</textarea>'
      html += '</div>'
      html += '<button type="button" class="btn-small ae-sm-qa-remove" data-qidx="' + qidx + '" data-aid="' + escapeHtml(a.id) + '">Remove action</button>'
      html += '</div>'
      html += '</div>'
    })
  }
  html += '<button type="button" class="btn-small add-btn ae-sm-qa-add" data-aid="' + escapeHtml(a.id) + '">+ Add quick action</button>'

  return html
}
```

- [ ] **Step 5: Wire form wizard event handlers**

After the assistant editor re-renders (find where `assistantEditorHtml()` output is placed in the DOM — look for `panel-assistants` innerHTML assignment), add event delegation handlers for the form wizard. These should be added in the existing assistant panel click handler:

```javascript
// In the assistant panel event handling section, add these to the existing click/input delegation:

// Form/Raw toggle
document.addEventListener('click', function (e) {
  var modeBtn = e.target && e.target.closest && e.target.closest('[data-skillmd-mode]')
  if (!modeBtn) return
  var aid = modeBtn.getAttribute('data-aid')
  var mode = modeBtn.getAttribute('data-skillmd-mode')
  if (!aid || !mode) return
  if (!state.skillMdMode) state.skillMdMode = {}
  state.skillMdMode[aid] = mode
  renderAssistantsTab()   // or the equivalent re-render call
})

// Rule remove
document.addEventListener('click', function (e) {
  var btn = e.target && e.target.closest && e.target.closest('.ae-sm-rule-remove')
  if (!btn) return
  var aid = btn.getAttribute('data-aid')
  var idx = parseInt(btn.getAttribute('data-idx'), 10)
  var content = state.skillMdEdits[aid] || ''
  var fields = _parseSkillMd(content)
  fields.behaviorRules.splice(idx, 1)
  state.skillMdEdits[aid] = _serializeSkillMd(aid, fields)
  showUnsavedBanner()
  renderAssistantsTab()
})

// Rule add
document.addEventListener('click', function (e) {
  var btn = e.target && e.target.closest && e.target.closest('.ae-sm-rule-add')
  if (!btn) return
  var aid = btn.getAttribute('data-aid')
  var content = state.skillMdEdits[aid] || ''
  var fields = _parseSkillMd(content)
  fields.behaviorRules.push('')
  state.skillMdEdits[aid] = _serializeSkillMd(aid, fields)
  showUnsavedBanner()
  renderAssistantsTab()
})

// Rule input (live update)
document.addEventListener('input', function (e) {
  var input = e.target && e.target.classList && e.target.classList.contains('ae-sm-rule-input') ? e.target : null
  if (!input) return
  var aid = input.getAttribute('data-aid')
  var idx = parseInt(input.getAttribute('data-idx'), 10)
  var content = state.skillMdEdits[aid] || ''
  var fields = _parseSkillMd(content)
  fields.behaviorRules[idx] = input.value
  state.skillMdEdits[aid] = _serializeSkillMd(aid, fields)
  showUnsavedBanner()
  // Update identity preview without full re-render
  _updateSkillMdPreview(aid, fields)
})

// Assistant name / core principle input (live update)
document.addEventListener('input', function (e) {
  var input = e.target && e.target.classList && e.target.classList.contains('ae-skillmd-field') ? e.target : null
  if (!input) return
  var aid = input.getAttribute('data-aid')
  var field = input.getAttribute('data-field')
  var content = state.skillMdEdits[aid] || ''
  var fields = _parseSkillMd(content)
  fields[field] = input.value
  state.skillMdEdits[aid] = _serializeSkillMd(aid, fields)
  showUnsavedBanner()
  _updateSkillMdPreview(aid, fields)
})

// QA accordion toggle
document.addEventListener('click', function (e) {
  var btn = e.target && e.target.closest && e.target.closest('.ae-qa-toggle')
  if (!btn) return
  var accordion = btn.closest('.ae-qa-accordion')
  if (!accordion) return
  var body = accordion.querySelector('.ae-qa-body')
  if (body) body.style.display = body.style.display === 'none' ? '' : 'none'
  btn.textContent = body && body.style.display !== 'none' ? 'Collapse ▴' : 'Expand ▾'
})

// QA template/guidance input (live update)
document.addEventListener('input', function (e) {
  var isTmpl = e.target && e.target.classList && e.target.classList.contains('ae-sm-qa-tmpl')
  var isGuid = e.target && e.target.classList && e.target.classList.contains('ae-sm-qa-guidance')
  if (!isTmpl && !isGuid) return
  var input = e.target
  var aid = input.getAttribute('data-aid')
  var qidx = parseInt(input.getAttribute('data-qidx'), 10)
  var content = state.skillMdEdits[aid] || ''
  var fields = _parseSkillMd(content)
  if (fields.quickActions[qidx]) {
    if (isTmpl) fields.quickActions[qidx].templateMessage = input.value
    else fields.quickActions[qidx].guidance = input.value
    state.skillMdEdits[aid] = _serializeSkillMd(aid, fields)
    showUnsavedBanner()
  }
})

// QA remove
document.addEventListener('click', function (e) {
  var btn = e.target && e.target.closest && e.target.closest('.ae-sm-qa-remove')
  if (!btn) return
  var aid = btn.getAttribute('data-aid')
  var qidx = parseInt(btn.getAttribute('data-qidx'), 10)
  var content = state.skillMdEdits[aid] || ''
  var fields = _parseSkillMd(content)
  fields.quickActions.splice(qidx, 1)
  state.skillMdEdits[aid] = _serializeSkillMd(aid, fields)
  showUnsavedBanner()
  renderAssistantsTab()
})

// QA add
document.addEventListener('click', function (e) {
  var btn = e.target && e.target.closest && e.target.closest('.ae-sm-qa-add')
  if (!btn) return
  var aid = btn.getAttribute('data-aid')
  var content = state.skillMdEdits[aid] || ''
  var fields = _parseSkillMd(content)
  var newId = 'action-' + (fields.quickActions.length + 1)
  fields.quickActions.push({ id: newId, templateMessage: '', guidance: '' })
  state.skillMdEdits[aid] = _serializeSkillMd(aid, fields)
  showUnsavedBanner()
  renderAssistantsTab()
})
```

Note: Find the actual re-render function name. Search for `renderAssistantsTab` or the equivalent — it may be `renderAssistantPanel()` or triggered via `switchTab()`. Use whichever is correct.

- [ ] **Step 6: Add `_updateSkillMdPreview(aid, fields)` helper**

```javascript
function _updateSkillMdPreview (aid, fields) {
  var preview = document.querySelector('.ae-skillmd-identity-preview')
  if (!preview) return
  preview.innerHTML = 'You are <strong>Design AI Toolkit\'s ' + escapeHtml(fields.assistantName || '…') + ' Assistant</strong>, an expert embedded inside a Figma plugin.<br>Your core principle: <strong>' + escapeHtml(fields.corePrinciple || '…') + '</strong>'
}
```

- [ ] **Step 7: Manual test — SKILL.md form wizard**

Run ACE: `npm run admin`

Open an assistant that has a SKILL.md file (e.g. `general`, `ux_copy_review`). Navigate to SKILL.md tab. Verify:
1. Form mode (default): shows Assistant Name, Core Principle, identity preview, Behavior Rules list, Quick Actions accordion
2. Fields are pre-populated from the SKILL.md file content
3. Editing the Assistant Name field updates the identity preview live
4. Adding a behavior rule: click "Add behavior rule", empty input appears, type text, preview in Raw mode shows the rule as a bullet
5. Toggle to Raw mode: shows the raw SKILL.md content including changes made in form mode
6. Toggle back to Form: re-parses and re-populates fields from current raw content
7. Save: existing save mechanism persists the edited content

- [ ] **Step 8: Commit**

```bash
git add admin-editor/public/app.js
git commit -m "feat(ace): SKILL.md form wizard — Identity, Behavior Rules, Quick Actions; Form/Raw toggle"
```

---

## Task 4: Resources Tab — Shared Skills Sub-Tab

**Spec reference:** ACE UX Redesign spec — Resources Tab section

**What changes:**

The current Resources (knowledge-bases) tab renders Universal Skills at the top followed by the KB list in one flat panel. The redesign wraps these in two named sub-tabs: **Shared Skills** and **Internal KBs**.

The Universal Skills UI already exists (lines 3228–3300). The KB list UI already exists (lines 3302+). This task wraps them in sub-tabs without rewriting the underlying logic.

**Files:**
- Modify: `admin-editor/public/app.js:3218-3400` (approximately)

- [ ] **Step 1: Add Resources sub-tab state**

In the state object, add:

```javascript
selectedResourcesSubTab: 'shared-skills',   // 'shared-skills' | 'internal-kbs'
```

- [ ] **Step 2: Read `renderKnowledgeBasesTabContent()` current structure**

```bash
sed -n '3218,3400p' admin-editor/public/app.js
```

Identify where `skillsHtml` ends and the KB `html` begins (look for `let html = '<div class="ace-section-header-row"...'` around line 3302).

- [ ] **Step 3: Add sub-tab header to `renderKnowledgeBasesTabContent()`**

At the top of the function body (after the early return checks), prepend sub-tab buttons:

```javascript
var resSubTab = state.selectedResourcesSubTab || 'shared-skills'

var subTabHtml = '<div class="ace-sub-tab-row">'
subTabHtml += '<button type="button" class="ace-sub-tab-btn' + (resSubTab === 'shared-skills' ? ' active' : '') + '" data-resources-subtab="shared-skills">Shared Skills</button>'
subTabHtml += '<button type="button" class="ace-sub-tab-btn' + (resSubTab === 'internal-kbs' ? ' active' : '') + '" data-resources-subtab="internal-kbs">Internal KBs</button>'
subTabHtml += '</div>'
```

- [ ] **Step 4: Wrap Shared Skills in its own conditional**

Currently the `skillsHtml` block is always appended to the panel. Wrap it:

```javascript
// Before: panel.innerHTML = skillsHtml + html + kbEditorHtml...
// After: conditional on sub-tab

if (resSubTab === 'shared-skills') {
  panel.innerHTML = subTabHtml + skillsHtml
} else {
  panel.innerHTML = subTabHtml + html + /* kb editor html */
}
```

Find the actual final `panel.innerHTML = ...` assignment and restructure it this way.

- [ ] **Step 5: Wire sub-tab click handlers**

At the end of `renderKnowledgeBasesTabContent()` (after `panel.innerHTML =`), add:

```javascript
panel.querySelectorAll('.ace-sub-tab-btn[data-resources-subtab]').forEach(function (btn) {
  btn.onclick = function () {
    state.selectedResourcesSubTab = this.getAttribute('data-resources-subtab')
    renderKnowledgeBasesTabContent()
  }
})
```

- [ ] **Step 6: Update "Shared Skills" heading**

In the `skillsHtml` block (line 3231), update the section title from "Universal Skills" to "Shared Skills":

```javascript
// Before:
skillsHtml += '<h2 class="ace-section-title">Universal Skills</h2>'
// After:
skillsHtml += '<h2 class="ace-section-title">Shared Skills</h2>'
```

Also update the helper text (line 3234) from "Attach them per assistant in the Assistant Skills tab" to "Attach them per assistant in the SKILL.md Quick Actions package box."

- [ ] **Step 7: Update "Internal KBs" heading**

In the KB section (line 3302), update from "Resources" to "Internal KBs":

```javascript
// Before:
let html = '<div class="ace-section-header-row"><h2 class="ace-section-title">Resources</h2></div>'
// After:
let html = '<div class="ace-section-header-row"><h2 class="ace-section-title">Internal KBs</h2></div>'
```

- [ ] **Step 8: Manual test — Resources tab sub-tabs**

Run ACE: `npm run admin`

Navigate to Resources tab. Verify:
- Sub-tabs show: Shared Skills | Internal KBs
- Shared Skills sub-tab shows the Universal Skills list and editor
- Internal KBs sub-tab shows the KB list and editor
- Switching between sub-tabs preserves selections within each tab
- Creating/editing/deleting skills still works in Shared Skills tab
- Creating/editing KBs still works in Internal KBs tab

- [ ] **Step 9: Commit**

```bash
git add admin-editor/public/app.js
git commit -m "feat(ace): resources tab — Shared Skills / Internal KBs sub-tabs"
```

---

## Task 5: Design Systems Tab

**Spec reference:** ACE UX Redesign spec — Design Systems Tab section

**What changes:**

Replace the raw registry JSON textarea editor (`renderRegistriesTab()`) with a two-pane sidebar + editor. The sidebar has two sections: "Global" (top-level SKILL.md) and "Design Systems" (per-DS entries). The right pane shows either the top-level SKILL.md editor or a per-DS editor with 4 sub-tabs.

**Registry state in the model:** `state.editedModel.designSystemRegistries` is a `Record<string, object>` where keys are DS IDs (e.g. `nuxt-ui-v4`) and values are the parsed registry JSON.

**SKILL.md for design systems:** DS SKILL.md files live at `custom/design-systems/<id>/SKILL.md`. The top-level SKILL.md is at `custom/design-systems/SKILL.md`. These need to be loaded by the server and stored in the model similarly to `skillMdContent`.

**Files:**
- Modify: `admin-editor/public/app.js:4412-4460` — `renderRegistriesTab()`
- Modify: `admin-editor/src/model.ts` — add DS SKILL.md loading
- Modify: `admin-editor/src/save.ts` — add DS SKILL.md save
- Modify: `admin-editor/server.ts` — ensure DS SKILL.md paths are tracked

- [ ] **Step 1: Add DS SKILL.md loading to `model.ts`**

In `admin-editor/src/model.ts`, after `loadSkillMdContent()` (line 117), add a new loader:

```typescript
function loadDesignSystemSkillMd(repoRoot: string): { byId: Record<string, string>; paths: Record<string, string> } {
  const dsDir = path.join(repoRoot, 'custom', 'design-systems')
  const byId: Record<string, string> = {}
  const paths: Record<string, string> = {}
  if (!fs.existsSync(dsDir)) return { byId, paths }
  try {
    // Top-level SKILL.md
    const topLevelPath = path.join(dsDir, 'SKILL.md')
    if (fs.existsSync(topLevelPath)) {
      byId['__top_level__'] = readText(topLevelPath)
      paths['__top_level__'] = topLevelPath
    }
    // Per-DS SKILL.md
    const entries = fs.readdirSync(dsDir, { withFileTypes: true })
    for (const entry of entries) {
      if (!entry.isDirectory()) continue
      const skillPath = path.join(dsDir, entry.name, 'SKILL.md')
      if (fs.existsSync(skillPath)) {
        byId[entry.name] = readText(skillPath)
        paths[entry.name] = skillPath
      }
    }
  } catch {
    // ignore
  }
  return { byId, paths }
}
```

- [ ] **Step 2: Add `dsSkillMdContent` to the model**

In `loadModel()` at line 138, add the DS SKILL.md load call and include it in the returned model:

```typescript
// After line 148:
const { byId: dsSkillMdContent, paths: dsSkillMdPaths } = loadDesignSystemSkillMd(repoRoot)

// In the model object (after skillMdContent):
dsSkillMdContent: Object.keys(dsSkillMdContent).length > 0 ? dsSkillMdContent : undefined,

// In filePaths (add to meta):
// In the ModelMeta filePaths, add:
dsSkillMd: dsSkillMdPaths

// In the files hash (after skillMdPaths):
...Object.values(dsSkillMdPaths)
```

Update `ModelMeta.filePaths` type at line 14:
```typescript
filePaths: {
  config: string
  assistantsManifest: string
  customKnowledge: Record<string, string>
  contentModels: string
  designSystemRegistries: Record<string, string>
  skillMd: Record<string, string>
  dsSkillMd: Record<string, string>  // add this
}
```

- [ ] **Step 3: Add DS SKILL.md save to `save.ts`**

Open `admin-editor/src/save.ts`. Find where `skillMd` is saved (search for `skillMd` or `SKILL.md`). Add analogous save logic for `dsSkillMdContent`:

```typescript
// In the save function, after saving assistant SKILL.md files:
if (model.dsSkillMdContent && meta.filePaths.dsSkillMd) {
  for (const [id, content] of Object.entries(model.dsSkillMdContent)) {
    const filePath = meta.filePaths.dsSkillMd[id]
    if (filePath && typeof content === 'string') {
      fs.writeFileSync(filePath, content, 'utf-8')
      savedPaths.push(filePath)
    }
  }
}
```

- [ ] **Step 4: Run TypeScript build to verify model changes**

```bash
npm run build 2>&1 | tail -20
```

Expected: Build succeeds with no type errors in `model.ts` or `save.ts`.

- [ ] **Step 5: Add DS state to app.js**

In the state object:

```javascript
selectedDsId: null,          // null = top-level SKILL.md; string = DS id
selectedDsSubTab: 'skill-md', // 'skill-md' | 'registry' | 'internal-kb' | 'metadata'
dsSkillMdEdits: {},          // dsId -> edited content ('__top_level__' for top-level)
dsSkillMdMode: {},           // dsId -> 'form' | 'raw'
```

On model load (where `state.skillMdEdits` is initialized, around line 672), add analogous init:

```javascript
state.dsSkillMdEdits = {}
if (data.model.dsSkillMdContent) {
  for (var _dsId in data.model.dsSkillMdContent) {
    state.dsSkillMdEdits[_dsId] = data.model.dsSkillMdContent[_dsId] || ''
  }
}
```

Also ensure `dsSkillMdContent` is included in the save payload. Search for where `skillMdEdits` is serialized into the save request (around line 344) and add:

```javascript
dsSkillMdContent: state.dsSkillMdEdits,
```

- [ ] **Step 6: Replace `renderRegistriesTab()` with new Design Systems tab**

Replace the entire function (lines 4412–4460) with:

```javascript
function renderRegistriesTab () {
  const panel = document.getElementById('panel-registries')
  if (!panel) return
  const regs = state.editedModel?.designSystemRegistries || {}
  const dsIds = Object.keys(regs)
  const selectedDsId = state.selectedDsId   // null = top-level

  // Two-pane layout
  var html = '<div class="ace-ds-layout">'

  // --- Sidebar ---
  html += '<div class="ace-ds-sidebar">'
  html += '<div class="ace-ds-group-label">Global</div>'
  var topSel = selectedDsId === null
  html += '<div class="ace-ds-sidebar-item' + (topSel ? ' sel' : '') + '" data-ds-id="__top_level__">Top-level SKILL.md</div>'
  html += '<div class="ace-ds-group-label" style="margin-top:8px">Design Systems</div>'
  dsIds.forEach(function (id) {
    var sel = selectedDsId === id
    var hasSkillMd = !!(state.dsSkillMdEdits && state.dsSkillMdEdits[id])
    html += '<div class="ace-ds-sidebar-item' + (sel ? ' sel' : '') + '" data-ds-id="' + escapeHtml(id) + '">'
    html += escapeHtml(id)
    if (hasSkillMd) html += ' <span class="ace-badge ace-badge--active">active</span>'
    html += '</div>'
  })
  html += '<div class="ace-ds-add">+ Add Design System</div>'
  html += '</div>'

  // --- Editor pane ---
  html += '<div class="ace-ds-editor">'

  if (topSel || selectedDsId === null) {
    // Top-level SKILL.md
    html += _dsTopLevelSkillMdEditor()
  } else if (selectedDsId && dsIds.includes(selectedDsId)) {
    // Per-DS editor
    html += _dsPerDsEditor(selectedDsId, regs[selectedDsId])
  } else {
    html += '<p class="ae-helper">Select a design system from the sidebar.</p>'
  }

  html += '</div>'
  html += '</div>'

  panel.innerHTML = html

  // Sidebar click
  panel.querySelectorAll('.ace-ds-sidebar-item[data-ds-id]').forEach(function (item) {
    item.onclick = function () {
      var dsId = this.getAttribute('data-ds-id')
      state.selectedDsId = dsId === '__top_level__' ? null : dsId
      state.selectedDsSubTab = 'skill-md'
      renderRegistriesTab()
    }
  })

  // Sub-tab clicks (for per-DS editor)
  panel.querySelectorAll('.ace-ds-sub-tab[data-ds-subtab]').forEach(function (btn) {
    btn.onclick = function () {
      state.selectedDsSubTab = this.getAttribute('data-ds-subtab')
      renderRegistriesTab()
    }
  })

  // Form/Raw toggle clicks
  panel.querySelectorAll('[data-ds-skillmd-mode]').forEach(function (btn) {
    btn.onclick = function () {
      var dsId = this.getAttribute('data-ds-id')
      var mode = this.getAttribute('data-ds-skillmd-mode')
      if (!state.dsSkillMdMode) state.dsSkillMdMode = {}
      state.dsSkillMdMode[dsId] = mode
      renderRegistriesTab()
    }
  })

  // DS SKILL.md raw textarea input
  var rawTa = panel.querySelector('.ace-ds-skillmd-raw')
  if (rawTa) {
    rawTa.oninput = rawTa.onchange = function () {
      var dsId = this.getAttribute('data-ds-id')
      if (!state.dsSkillMdEdits) state.dsSkillMdEdits = {}
      state.dsSkillMdEdits[dsId] = this.value
      showUnsavedBanner()
      updateFooterButtons()
    }
  }

  // Reset button
  var resetBtn = document.getElementById('reset-registries-btn')
  if (resetBtn) {
    resetBtn.onclick = function () {
      if (!state.originalModel) return
      state.editedModel.designSystemRegistries = state.originalModel.designSystemRegistries
        ? deepClone(state.originalModel.designSystemRegistries) : undefined
      state.dsSkillMdEdits = {}
      if (state.originalModel.dsSkillMdContent) {
        for (var id in state.originalModel.dsSkillMdContent) {
          state.dsSkillMdEdits[id] = state.originalModel.dsSkillMdContent[id] || ''
        }
      }
      state.registryParseErrors = {}
      showUnsavedBanner()
      renderRegistriesTab()
    }
  }
}
```

- [ ] **Step 7: Add `_dsTopLevelSkillMdEditor()` helper**

```javascript
function _dsTopLevelSkillMdEditor () {
  var dsId = '__top_level__'
  var mode = (state.dsSkillMdMode && state.dsSkillMdMode[dsId]) || 'form'
  var content = (state.dsSkillMdEdits && state.dsSkillMdEdits[dsId]) || ''
  var html = ''

  html += '<div class="ae-skillmd-header" style="margin-bottom:12px">'
  html += '<span class="ae-helper" style="flex:1">Routing &amp; selection logic across all design systems.</span>'
  html += '<div class="ae-toggle-pill">'
  html += '<button type="button" class="ae-toggle-btn' + (mode === 'form' ? ' active' : '') + '" data-ds-skillmd-mode="form" data-ds-id="' + dsId + '">Form</button>'
  html += '<button type="button" class="ae-toggle-btn' + (mode === 'raw' ? ' active' : '') + '" data-ds-skillmd-mode="raw" data-ds-id="' + dsId + '">Raw</button>'
  html += '</div>'
  html += '</div>'

  if (!content) {
    html += '<p class="ae-helper">No top-level SKILL.md found at <code>custom/design-systems/SKILL.md</code>. Create the file to enable routing logic.</p>'
    return html
  }

  if (mode === 'raw') {
    html += '<textarea class="ace-field ace-textarea ace-skillmd-editor ace-ds-skillmd-raw" data-ds-id="' + dsId + '" rows="20" style="font-family:monospace;font-size:13px;white-space:pre;">' + escapeHtml(content) + '</textarea>'
    return html
  }

  // Form wizard for top-level DS SKILL.md (Identity + Behavior Rules, no Quick Actions)
  var fields = _parseSkillMd(content)
  html += '<h3 class="ae-section-heading" style="margin-top:0">Identity</h3>'
  html += '<div class="ae-field-group">'
  html += '<label for="ae-ds-top-name">Router Name</label>'
  html += '<p class="ae-helper">How the LLM identifies this router.</p>'
  html += '<input type="text" id="ae-ds-top-name" class="ace-field" value="' + escapeHtml(fields.assistantName) + '" readonly>'
  html += '</div>'
  html += '<div class="ae-field-group">'
  html += '<label for="ae-ds-top-cp">Core Principle</label>'
  html += '<input type="text" id="ae-ds-top-cp" class="ace-field" value="' + escapeHtml(fields.corePrinciple) + '" readonly>'
  html += '</div>'
  html += '<h3 class="ae-section-heading">Behavior Rules</h3>'
  html += '<p class="ae-helper" style="margin-bottom:8px">Routing rules applied across all design systems.</p>'
  fields.behaviorRules.forEach(function (rule, idx) {
    html += '<div class="behavior-row"><span class="ae-drag-handle">⠿</span>'
    html += '<input type="text" class="ace-field" value="' + escapeHtml(rule) + '" readonly>'
    html += '</div>'
  })
  html += '<p style="font-size:10px;color:var(--ace-text-muted);margin-top:8px">Switch to Raw to edit — top-level DS SKILL.md form editing coming in a follow-on update.</p>'
  html += '<div style="margin-top:12px;padding:8px 10px;background:var(--ace-card-bg);border:1px solid var(--ace-border);border-radius:6px;font-size:10px;color:var(--ace-text-muted)">DS SKILL.md files do not have Quick Actions — those live in assistant SKILL.md files.</div>'
  return html
}
```

- [ ] **Step 8: Add `_dsPerDsEditor(dsId, registryObj)` helper**

```javascript
function _dsPerDsEditor (dsId, registryObj) {
  var subTab = state.selectedDsSubTab || 'skill-md'
  var html = ''

  // Sub-tabs
  html += '<div class="ace-ds-sub-tabs">'
  ;['skill-md', 'registry', 'internal-kb', 'metadata'].forEach(function (t) {
    var labels = { 'skill-md': 'SKILL.md', 'registry': 'Registry', 'internal-kb': 'Internal KB', 'metadata': 'Metadata' }
    html += '<button type="button" class="ace-ds-sub-tab' + (subTab === t ? ' active' : '') + '" data-ds-subtab="' + t + '">' + labels[t] + '</button>'
  })
  html += '</div>'

  if (subTab === 'skill-md') {
    var mode = (state.dsSkillMdMode && state.dsSkillMdMode[dsId]) || 'form'
    var content = (state.dsSkillMdEdits && state.dsSkillMdEdits[dsId]) || ''

    html += '<div class="ae-skillmd-header" style="margin-bottom:12px;margin-top:14px">'
    html += '<span class="ae-helper" style="flex:1">Per-DS behavior instructions loaded when this system is in scope.</span>'
    html += '<div class="ae-toggle-pill">'
    html += '<button type="button" class="ae-toggle-btn' + (mode === 'form' ? ' active' : '') + '" data-ds-skillmd-mode="form" data-ds-id="' + escapeHtml(dsId) + '">Form</button>'
    html += '<button type="button" class="ae-toggle-btn' + (mode === 'raw' ? ' active' : '') + '" data-ds-skillmd-mode="raw" data-ds-id="' + escapeHtml(dsId) + '">Raw</button>'
    html += '</div>'
    html += '</div>'

    if (!content) {
      html += '<p class="ae-helper">No SKILL.md for this design system. Create <code>custom/design-systems/' + escapeHtml(dsId) + '/SKILL.md</code>.</p>'
    } else if (mode === 'raw') {
      html += '<textarea class="ace-field ace-textarea ace-skillmd-editor ace-ds-skillmd-raw" data-ds-id="' + escapeHtml(dsId) + '" rows="18" style="font-family:monospace;font-size:13px;white-space:pre;">' + escapeHtml(content) + '</textarea>'
    } else {
      var fields = _parseSkillMd(content)
      html += '<div class="ae-field-group"><label>DS Name</label><input type="text" class="ace-field" value="' + escapeHtml(dsId) + '" readonly></div>'
      html += '<div class="ae-field-group"><label>Core Principle</label><input type="text" class="ace-field" value="' + escapeHtml(fields.corePrinciple) + '" readonly></div>'
      html += '<h3 class="ae-section-heading">Behavior Rules</h3>'
      fields.behaviorRules.forEach(function (rule) {
        html += '<div style="display:flex;gap:7px;align-items:center;margin-bottom:6px">'
        html += '<span style="font-size:11px;color:var(--ace-text-muted)">⠿</span>'
        html += '<input type="text" class="ace-field" value="' + escapeHtml(rule) + '" readonly>'
        html += '</div>'
      })
      html += '<p style="font-size:10px;color:var(--ace-text-muted);margin-top:8px">Switch to Raw to edit DS behavior rules.</p>'
      html += '<div style="margin-top:12px;padding:8px 10px;background:var(--ace-card-bg);border:1px solid var(--ace-border);border-radius:6px;font-size:10px;color:var(--ace-text-muted)">DS SKILL.md does not have Quick Actions — those live in assistant SKILL.md files.</div>'
    }
  } else if (subTab === 'registry') {
    // Read-only registry browse
    var components = (registryObj && Array.isArray(registryObj.components)) ? registryObj.components : []
    html += '<div style="margin:14px 0 10px">'
    html += '<div style="font-size:11px;color:var(--ace-text-secondary);margin-bottom:8px">' + components.length + ' components registered</div>'
    if (components.length === 0) {
      html += '<p class="ae-helper">No components in registry.</p>'
    } else {
      components.slice(0, 20).forEach(function (c) {
        var variants = Array.isArray(c.variants) ? c.variants.length : 0
        html += '<div style="display:flex;align-items:center;gap:8px;padding:7px 10px;border:1px solid var(--ace-border);border-radius:6px;margin-bottom:5px;font-size:11px">'
        html += '<span style="font-weight:600;flex:1">' + escapeHtml(c.id || c.name || '?') + '</span>'
        if (variants > 0) html += '<span style="font-size:10px;color:var(--ace-text-muted)">' + variants + ' variants</span>'
        html += '</div>'
      })
      if (components.length > 20) html += '<p style="font-size:11px;color:var(--ace-text-muted)">+ ' + (components.length - 20) + ' more</p>'
    }
    html += '<p style="font-size:10px;color:var(--ace-text-muted);margin-top:10px;padding-top:8px;border-top:1px solid var(--ace-border)">Registry is read-only in ACE. Edit the catalog JSON file directly.</p>'
    html += '</div>'
  } else if (subTab === 'internal-kb') {
    html += '<p class="ae-helper" style="margin-top:14px">Internal KB for this design system — large reference docs for LLM Helpers or hosted retrieval.</p>'
    html += '<p class="ae-helper">File: <code>custom/design-systems/' + escapeHtml(dsId) + '/SKILL.md</code> (KB not yet wired to ACE editor). Coming in a follow-on update.</p>'
  } else if (subTab === 'metadata') {
    html += '<div style="margin-top:14px">'
    html += '<div class="ae-field-group"><label>DS ID</label><input type="text" class="ace-field" value="' + escapeHtml(dsId) + '" readonly></div>'
    var regName = (registryObj && registryObj.name) ? registryObj.name : ''
    var regVersion = (registryObj && registryObj.version) ? registryObj.version : ''
    var regDesc = (registryObj && registryObj.description) ? registryObj.description : ''
    html += '<div class="ae-field-group"><label>Name</label><input type="text" class="ace-field" value="' + escapeHtml(regName) + '" readonly></div>'
    html += '<div class="ae-field-group"><label>Version</label><input type="text" class="ace-field" value="' + escapeHtml(regVersion) + '" readonly></div>'
    html += '<div class="ae-field-group"><label>Description</label><input type="text" class="ace-field" value="' + escapeHtml(regDesc) + '" readonly></div>'
    html += '</div>'
  }

  return html
}
```

- [ ] **Step 9: Build and test TypeScript**

```bash
npm run build 2>&1 | tail -20
```

Expected: No TypeScript errors.

- [ ] **Step 10: Manual test — Design Systems tab**

Run ACE: `npm run admin`

Navigate to Design Systems tab. Verify:
- Sidebar shows "Global / Top-level SKILL.md" and "Design Systems / nuxt-ui-v4" (or whatever DSes are present)
- Selecting Top-level SKILL.md shows the routing SKILL.md editor with Form/Raw toggle
- Selecting a DS shows the 4 sub-tabs: SKILL.md, Registry, Internal KB, Metadata
- SKILL.md sub-tab: Form shows DS name, core principle, behavior rules (read-only form); Raw shows raw editor
- Registry sub-tab: shows component list (read-only)
- Metadata sub-tab: shows DS ID, name, version, description
- Raw SKILL.md edits survive sub-tab switching without data loss
- Saving via the main Save button persists DS SKILL.md changes to disk

- [ ] **Step 11: Commit**

```bash
git add admin-editor/public/app.js admin-editor/src/model.ts admin-editor/src/save.ts
git commit -m "feat(ace): design systems tab — sidebar, SKILL.md editor, registry browse, metadata"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Task |
|-----------------|------|
| General tab: remove HAT | Task 1 |
| General tab: remove Network Access UI toggle | Task 1 (not adding it, so implicitly done) |
| General tab: Plugin/Site sub-tabs | Task 1 |
| General tab: Raw JSON behind Advanced toggle | Already exists (line 1132); preserved in Task 1 |
| Assistant sub-tabs: SKILL.md primary | Task 2 |
| Assistant sub-tabs: Identity, Settings rename | Task 2 |
| Assistant sub-tabs: Site placeholder | Task 2 |
| SKILL.md form wizard: Identity + Core Principle | Task 3 |
| SKILL.md form wizard: Behavior Rules | Task 3 |
| SKILL.md form wizard: Quick Actions accordion | Task 3 |
| SKILL.md Form/Raw toggle | Task 3 |
| Resources: Shared Skills / Internal KBs sub-tabs | Task 4 |
| Resources: "Shared Skills" label | Task 4 |
| Design Systems: sidebar + top-level SKILL.md | Task 5 |
| Design Systems: per-DS editor + 4 sub-tabs | Task 5 |
| Design Systems: SKILL.md Form/Raw | Task 5 |
| Design Systems: Registry read-only browse | Task 5 |
| Usage tab: rename from Analytics | Already done in `index.html` — no task needed |
| Users tab: label mapping | Already done in `USERS_SET_ACCESS_LABELS` at line 4476 |

**Not covered in this plan (by design):**
- Test harness (covered in companion plan: `2026-04-12-ace-test-harness-plan.md`)
- AI tab simplification (kbName per-assistant is already in Knowledge tab; AI tab already has endpoint + proxy only)
- Full editable DS form wizard (Task 5 delivers read-only form + raw editor; full editable form is a follow-on)
