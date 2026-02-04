/**
 * Admin Config Editor – Phase 2 browser UI.
 * Calls GET /api/model, POST /api/validate, POST /api/save only.
 * Does not write files directly; all writes go through the server.
 */

(function () {
  'use strict'

  const API_BASE = ''

  const state = {
    connected: false,
    meta: null,
    originalModel: null,
    editedModel: null,
    validation: { errors: [], warnings: [] },
    lastValidation: null,
    saveSummary: null,
    previewSummary: null,
    conflictBanner: false,
    loadingAction: null,
    selectedTab: 'config',
    selectedAssistantId: null,
    selectedKnowledgeId: null,
    loadedAt: null,
    configRawParseError: false,
    registryParseErrors: {},
    lastDisplayError: null,
    actionModalRetry: null,
    actionModalCopyText: ''
  }

  function deepClone (obj) {
    if (obj === null || typeof obj !== 'object') return obj
    if (Array.isArray(obj)) return obj.map(deepClone)
    const out = {}
    for (const k of Object.keys(obj)) out[k] = deepClone(obj[k])
    return out
  }

  function deepEqual (a, b) {
    if (a === b) return true
    if (a === null || b === null || typeof a !== 'object' || typeof b !== 'object') return false
    if (Array.isArray(a) && Array.isArray(b)) {
      if (a.length !== b.length) return false
      return a.every((v, i) => deepEqual(v, b[i]))
    }
    const keysA = Object.keys(a)
    const keysB = Object.keys(b)
    if (keysA.length !== keysB.length) return false
    return keysA.every(k => keysB.includes(k) && deepEqual(a[k], b[k]))
  }

  /** Recursively sort object keys (localeCompare); arrays preserve order; primitives unchanged. Mirrors server sortKeys. */
  function sortKeysUi (obj) {
    if (obj === null || typeof obj !== 'object') return obj
    if (Array.isArray(obj)) return obj.map(sortKeysUi)
    const keys = Object.keys(obj).sort(function (a, b) { return a.localeCompare(b) })
    const out = {}
    for (let i = 0; i < keys.length; i++) out[keys[i]] = sortKeysUi(obj[keys[i]])
    return out
  }

  /** Canonicalize config to match server canonicalizeConfig: top-level order then nested alphabetical. */
  var CONFIG_KEYS_ORDER_UI = ['ui', 'llm', 'knowledgeBases', 'networkAccess', 'resources', 'designSystems', 'analytics']
  function canonicalizeConfigUi (obj) {
    if (obj === null || typeof obj !== 'object') return obj
    var record = obj
    var out = {}
    for (var i = 0; i < CONFIG_KEYS_ORDER_UI.length; i++) {
      var k = CONFIG_KEYS_ORDER_UI[i]
      if (record[k] !== undefined) out[k] = sortKeysUi(record[k])
    }
    var rest = Object.keys(record).filter(function (k) { return CONFIG_KEYS_ORDER_UI.indexOf(k) === -1 }).sort()
    for (var j = 0; j < rest.length; j++) { var r = rest[j]; out[r] = sortKeysUi(record[r]) }
    return out
  }

  /** Canonicalize assistants manifest to match server canonicalizeAssistantsManifest: top-level order then nested alphabetical. */
  var MANIFEST_KEYS_ORDER_UI = ['assistants']
  function canonicalizeAssistantsManifestUi (obj) {
    if (obj === null || typeof obj !== 'object') return obj
    var record = obj
    var out = {}
    for (var i = 0; i < MANIFEST_KEYS_ORDER_UI.length; i++) {
      var k = MANIFEST_KEYS_ORDER_UI[i]
      if (record[k] !== undefined) out[k] = sortKeysUi(record[k])
    }
    var rest = Object.keys(record).filter(function (k) { return MANIFEST_KEYS_ORDER_UI.indexOf(k) === -1 }).sort()
    for (var j = 0; j < rest.length; j++) { var r = rest[j]; out[r] = sortKeysUi(record[r]) }
    return out
  }

  /** Build canonical model: config and manifest use server-matching order; rest use sortKeysUi; contentModelsRaw unchanged. */
  function canonicalizeModel (data) {
    var m = data.model || data
    var known = { config: 1, assistantsManifest: 1, customKnowledge: 1, designSystemRegistries: 1, contentModelsRaw: 1 }
    var out = {
      config: canonicalizeConfigUi(m.config),
      assistantsManifest: canonicalizeAssistantsManifestUi(m.assistantsManifest),
      customKnowledge: sortKeysUi(m.customKnowledge || {}),
      designSystemRegistries: sortKeysUi(m.designSystemRegistries || {}),
      contentModelsRaw: m.contentModelsRaw
    }
    var rest = Object.keys(m).filter(function (k) { return !known[k] }).sort()
    for (var i = 0; i < rest.length; i++) out[rest[i]] = sortKeysUi(m[rest[i]])
    return out
  }

  function hasUnsavedChanges () {
    return state.originalModel !== null && state.editedModel !== null && !deepEqual(state.originalModel, state.editedModel)
  }

  function updateStatus () {
    const conn = document.getElementById('status-connection')
    const loaded = document.getElementById('status-loaded')
    const repo = document.getElementById('status-repo')
    const statusEl = document.getElementById('status')
    const navLabel = document.getElementById('nav-status-label')
    const serverNavBtn = document.getElementById('server-status-nav-btn')
    if (conn) conn.textContent = state.connected ? 'Server connected' : 'Server disconnected'
    if (loaded) loaded.textContent = state.loadedAt ? 'Loaded: ' + state.loadedAt : '—'
    if (repo) repo.textContent = state.meta?.repoRoot ? 'Repo: ' + state.meta.repoRoot : '—'
    if (statusEl) {
      statusEl.classList.toggle('connected', state.connected)
      statusEl.classList.toggle('disconnected', !state.connected)
    }
    if (serverNavBtn) {
      serverNavBtn.classList.toggle('is-connected', state.connected)
      serverNavBtn.classList.toggle('is-disconnected', !state.connected)
    }
    if (navLabel) navLabel.textContent = state.connected ? 'Connected' : 'Disconnected'
  }

  function showUnsavedBanner () {
    if (hasUnsavedChanges()) state.lastValidation = null
    const banner = document.getElementById('unsaved-banner')
    banner.style.display = hasUnsavedChanges() ? 'flex' : 'none'
    updateFooterButtons()
  }

  function showConflictBanner (show) {
    state.conflictBanner = !!show
    const banner = document.getElementById('conflict-banner')
    banner.style.display = show ? 'flex' : 'none'
  }

  function showActionModal (opts) {
    const modal = document.getElementById('action-modal')
    const loading = document.getElementById('action-modal-loading')
    const loadingText = document.getElementById('action-modal-loading-text')
    const success = document.getElementById('action-modal-success')
    const successTitle = document.getElementById('action-modal-title')
    const successText = document.getElementById('action-modal-success-text')
    const err = document.getElementById('action-modal-error')
    const errText = document.getElementById('action-modal-error-text')
    const retryBtn = document.getElementById('action-modal-retry-btn')
    if (!modal) return
    loading.hidden = true
    success.hidden = true
    err.hidden = true
    retryBtn.hidden = true
    state.actionModalRetry = opts.onRetry || null
    state.actionModalCopyText = opts.copyText || ''
    if (opts.state === 'loading') {
      loadingText.textContent = opts.message || 'Loading…'
      loading.hidden = false
    } else if (opts.state === 'success') {
      if (successTitle) successTitle.textContent = opts.title != null ? opts.title : 'Done'
      if (opts.htmlMessage != null) {
        successText.innerHTML = opts.htmlMessage
      } else {
        successText.textContent = opts.message || 'Done.'
      }
      success.hidden = false
    } else if (opts.state === 'error') {
      errText.textContent = opts.message || 'Something went wrong.'
      err.hidden = false
      if (opts.onRetry) retryBtn.hidden = false
    }
    modal.hidden = false
  }

  function hideActionModal () {
    const modal = document.getElementById('action-modal')
    if (modal) modal.hidden = true
    state.actionModalRetry = null
    state.actionModalCopyText = ''
  }

  function updateFooterButtons () {
    const loading = state.loadingAction
    const dirty = hasUnsavedChanges()
    const hasErrors = state.lastValidation && state.lastValidation.errors && state.lastValidation.errors.length > 0
    const validationStale = dirty && !state.lastValidation
    const hasParseError = state.configRawParseError || Object.keys(state.registryParseErrors || {}).some(function (k) { return state.registryParseErrors[k] })
    const reloadBtn = document.getElementById('reload-btn')
    const validateBtn = document.getElementById('validate-btn')
    const previewBtn = document.getElementById('preview-btn')
    const saveBtn = document.getElementById('save-btn')
    if (reloadBtn) {
      reloadBtn.disabled = !!loading
      reloadBtn.textContent = loading === 'reload' ? 'Loading…' : 'Reset'
    }
    if (validateBtn) {
      validateBtn.disabled = !!loading
      validateBtn.textContent = loading === 'validate' ? 'Validating…' : 'Validate'
    }
    if (previewBtn) {
      previewBtn.disabled = !!loading || !dirty
      previewBtn.textContent = loading === 'preview' ? 'Previewing…' : 'Preview changes'
    }
    if (saveBtn) {
      saveBtn.disabled = !!loading || !dirty || validationStale || !!hasErrors || !!hasParseError
      saveBtn.textContent = loading === 'save' ? 'Saving…' : 'Save'
    }
    const footerStatus = document.getElementById('footer-status')
    if (footerStatus) {
      footerStatus.textContent = loading ? (loading.charAt(0).toUpperCase() + loading.slice(1) + '…') : ''
      footerStatus.style.display = loading ? 'block' : 'none'
    }
  }

  function getEditedModel () {
    return state.editedModel ? deepClone(state.editedModel) : null
  }

  function setEditedModel (model) {
    state.editedModel = model
    showUnsavedBanner()
  }

  function patchEdited (path, value) {
    if (!state.editedModel) return
    const parts = path.split('.')
    let o = state.editedModel
    for (let i = 0; i < parts.length - 1; i++) {
      const p = parts[i]
      if (o[p] === undefined) o[p] = {}
      o = o[p]
    }
    o[parts[parts.length - 1]] = value
    showUnsavedBanner()
  }

  // ——— API ———
  async function apiGetModel () {
    const res = await fetch(API_BASE + '/api/model')
    if (!res.ok) throw new Error(res.statusText || 'Failed to load model')
    const data = await res.json()
    return data
  }

  async function apiValidate (payload) {
    const res = await fetch(API_BASE + '/api/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.errors?.join(' ') || res.statusText || 'Validate failed')
    return data
  }

  async function apiSave (payload, dryRun) {
    const body = {
      model: payload,
      meta: { revision: state.meta?.revision ?? '' }
    }
    const url = API_BASE + '/api/save' + (dryRun ? '?dryRun=1' : '')
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    const data = await res.json()
    if (res.status === 409) {
      const err = new Error(data.error || 'Conflict')
      err.status = 409
      err.data = data
      throw err
    }
    if (!res.ok) {
      const msg = Array.isArray(data.errors) ? data.errors.join('; ') : (data.error || res.statusText || 'Save failed')
      throw new Error(msg)
    }
    return data
  }

  async function loadModel () {
    state.connected = false
    state.loadingAction = 'reload'
    updateStatus()
    updateFooterButtons()
    try {
      const data = await apiGetModel()
      const canonical = canonicalizeModel(data.model)
      state.originalModel = canonical
      state.editedModel = deepClone(canonical)
      state.meta = data.meta || null
      state.validation = data.validation || { errors: [], warnings: [] }
      state.loadedAt = new Date().toLocaleString()
      state.connected = true
      state.saveSummary = null
      state.previewSummary = null
      state.lastValidation = null
      state.configRawParseError = false
      state.registryParseErrors = {}
      state.lastDisplayError = null
      showConflictBanner(false)
      updateStatus()
      showUnsavedBanner()
      renderAllPanels()
      state.loadingAction = null
      updateFooterButtons()
      return true
    } catch (err) {
      state.connected = false
      state.loadingAction = null
      updateStatus()
      updateFooterButtons()
      const msg = String(err.message || 'Load failed')
      state.lastDisplayError = { message: 'Load failed', errors: [msg] }
      const validationEl = document.getElementById('validation-message')
      if (validationEl) {
        validationEl.innerHTML = '<div class="error-block">' +
        '<span class="errors">' + escapeHtml(msg) + '</span> ' +
        '<button type="button" class="btn-small" id="load-retry-btn">Retry</button> ' +
        '<button type="button" class="btn-small" id="load-copy-error-btn">Copy error</button>' +
        '</div>'
      }
      const retryBtn = document.getElementById('load-retry-btn')
      if (retryBtn) retryBtn.onclick = function () { loadModel() }
      const copyBtn = document.getElementById('load-copy-error-btn')
      if (copyBtn) copyBtn.onclick = function () {
        const text = state.lastDisplayError ? formatCopyableError(state.lastDisplayError) : ('Load failed: ' + msg)
        navigator.clipboard.writeText(text).then(() => { copyBtn.textContent = 'Copied!' })
      }
      return false
    }
  }

  function escapeHtml (s) {
    const div = document.createElement('div')
    div.textContent = s
    return div.innerHTML
  }

  var SECTION_STATE_KEY = 'ace.ui.configSectionExpanded.v1'
  var CONFIG_SECTION_KEYS = ['default-mode', 'mode-settings', 'ai-api-endpoint', 'resource-links', 'credits', 'advanced-raw-json']
  function getDefaultExpandedState () {
    var out = {}
    for (var i = 0; i < CONFIG_SECTION_KEYS.length; i++) {
      out[CONFIG_SECTION_KEYS[i]] = CONFIG_SECTION_KEYS[i] === 'default-mode'
    }
    return out
  }
  function loadSectionExpandedState () {
    try {
      var raw = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(SECTION_STATE_KEY) : null
      if (!raw) return getDefaultExpandedState()
      var parsed = JSON.parse(raw)
      if (typeof parsed !== 'object' || parsed === null) return getDefaultExpandedState()
      var result = getDefaultExpandedState()
      for (var k in parsed) {
        if (Object.prototype.hasOwnProperty.call(result, k)) result[k] = !!parsed[k]
      }
      return result
    } catch (_) {}
    return getDefaultExpandedState()
  }
  function saveSectionExpandedState (map) {
    try {
      if (typeof sessionStorage !== 'undefined') sessionStorage.setItem(SECTION_STATE_KEY, JSON.stringify(map))
    } catch (_) {}
  }
  function collapsibleSection (sectionId, title, bodyHtml, expanded) {
    var isExpanded = expanded === true
    var chevron = isExpanded ? 'ChevronUpIcon.svg' : 'ChevronDownIcon.svg'
    return '<section class="ace-section ace-collapsible' + (isExpanded ? '' : ' is-collapsed') + '" data-section="' + escapeHtml(sectionId) + '">' +
      '<button type="button" class="ace-section-header" aria-expanded="' + (isExpanded ? 'true' : 'false') + '" aria-controls="section-' + escapeHtml(sectionId) + '-body">' +
      '<div class="ace-section-title">' + escapeHtml(title) + '</div>' +
      '<img class="ace-section-chevron" src="assets/icons/' + chevron + '" alt="" aria-hidden="true" width="20" height="20" />' +
      '</button>' +
      '<div id="section-' + escapeHtml(sectionId) + '-body" class="ace-section-body">' + bodyHtml + '</div>' +
      '</section>'
  }

  function getValidationErrorText () {
    const last = state.lastValidation
    const errs = last ? (last.errors || []) : state.validation.errors || []
    const warns = last ? (last.warnings || []) : state.validation.warnings || []
    const parts = []
    if (errs.length) parts.push('Errors: ' + errs.join('; '))
    if (warns.length) parts.push('Warnings: ' + warns.join('; '))
    return parts.length ? parts.join('\n') : ''
  }

  /** Bounded payload for Copy error: message + errors (no arbitrary DOM). Max ~4k chars. */
  function formatCopyableError (obj) {
    if (!obj || typeof obj.message !== 'string') return ''
    const parts = [obj.message]
    if (Array.isArray(obj.errors) && obj.errors.length) parts.push(obj.errors.join('\n'))
    if (obj.details && typeof obj.details === 'string') parts.push(obj.details)
    const text = parts.join('\n\n')
    return text.length > 4096 ? text.slice(0, 4096) + '\n…(truncated)' : text
  }

  function renderValidationMessage () {
    state.lastDisplayError = null
    const el = document.getElementById('validation-message')
    if (!el) return
    const last = state.lastValidation
    if (!last) {
      const hasErr = state.validation.errors.length > 0
      const hasWarn = state.validation.warnings.length > 0
      if (!hasErr && !hasWarn) {
        el.innerHTML = ''
        updateFooterButtons()
        return
      }
      let html = '<span class="errors">' + state.validation.errors.map(escapeHtml).join('; ') + '</span>'
      if (hasWarn) html += '<div class="warnings">' + state.validation.warnings.map(escapeHtml).join('; ') + '</div>'
      if (hasErr) html += ' <button type="button" class="btn-small" id="copy-validation-error-btn">Copy error</button>'
      el.innerHTML = html
      bindCopyValidationError()
      updateFooterButtons()
      return
    }
    let html = ''
    if (last.errors && last.errors.length) html += '<span class="errors">' + last.errors.map(escapeHtml).join('; ') + '</span>'
    if (last.warnings && last.warnings.length) html += '<div class="warnings">' + last.warnings.map(escapeHtml).join('; ') + '</div>'
    if (!html) html = 'Validation passed.'
    else html += ' <button type="button" class="btn-small" id="copy-validation-error-btn">Copy error</button>'
    el.innerHTML = html
    bindCopyValidationError()
    updateFooterButtons()
  }

  function bindCopyValidationError () {
    const btn = document.getElementById('copy-validation-error-btn')
    if (!btn) return
    btn.onclick = function () {
      const text = state.lastDisplayError
        ? formatCopyableError(state.lastDisplayError)
        : getValidationErrorText()
      if (text) navigator.clipboard.writeText(text).then(() => { btn.textContent = 'Copied!' })
    }
  }

  function renderSaveSummary () {
    const el = document.getElementById('save-summary')
    if (!el) return
    const s = state.saveSummary
    if (!s || !s.success) {
      el.style.display = 'none'
      return
    }
    el.style.display = 'block'
    let html = '<h3>Save successful</h3>'
    if (s.filesWritten && s.filesWritten.length) {
      html += '<p><strong>Files written:</strong></p><ul>'
      s.filesWritten.forEach(f => { html += '<li>' + escapeHtml(f) + '</li>' })
      html += '</ul>'
    }
    if (s.backupsCreatedAt) html += '<p><strong>Backup:</strong> ' + escapeHtml(s.backupsCreatedAt) + '</p>'
    if (s.generatorsRun && s.generatorsRun.length) {
      html += '<p><strong>Generators:</strong></p><ul>'
      s.generatorsRun.forEach((g, idx) => {
        html += '<li>' + escapeHtml(g.name) + ': ' + (g.success ? 'OK' : '<span class="errors">Failed</span>')
        if (!g.success && (g.error || g.stdout || g.stderr)) {
          const copyId = 'copy-gen-' + idx
          html += ' <button type="button" class="btn-small copy-gen-btn" data-idx="' + idx + '" id="' + copyId + '">Copy</button>'
          html += '<pre class="generator-output">' + escapeHtml([g.error, g.stdout, g.stderr].filter(Boolean).join('\n--- stderr ---\n')) + '</pre>'
        }
        html += '</li>'
      })
      html += '</ul>'
    }
    if (s.nextSteps) html += '<div class="next-steps">' + escapeHtml(s.nextSteps) + '</div>'
    html += '<button type="button" id="copy-summary-btn">Copy summary</button>'
    el.innerHTML = html
    const copyBtn = document.getElementById('copy-summary-btn')
    if (copyBtn) {
      copyBtn.onclick = function () {
        const text = 'Save successful\n' +
          (s.filesWritten?.length ? 'Files written:\n' + s.filesWritten.join('\n') + '\n' : '') +
          (s.backupsCreatedAt ? 'Backup: ' + s.backupsCreatedAt + '\n' : '') +
          (s.nextSteps ? '\nNext steps: ' + s.nextSteps : '')
        navigator.clipboard.writeText(text).then(() => { copyBtn.textContent = 'Copied!' })
      }
    }
    document.querySelectorAll('.copy-gen-btn').forEach(btn => {
      btn.onclick = function () {
        const idx = parseInt(this.getAttribute('data-idx'), 10)
        const g = s.generatorsRun[idx]
        if (!g) return
        const text = [g.error, g.stdout, g.stderr].filter(Boolean).join('\n--- stderr ---\n')
        navigator.clipboard.writeText(text).then(() => { btn.textContent = 'Copied!' })
      }
    })
  }

  function renderPreviewSummary () {
    const el = document.getElementById('preview-summary')
    if (!el) return
    const p = state.previewSummary
    if (!p || !p.success) {
      el.style.display = 'none'
      return
    }
    el.style.display = 'block'
    let html = '<h3>Preview changes</h3>'
    if (p.filesWouldWrite && p.filesWouldWrite.length) {
      html += '<p><strong>Files that would change:</strong></p><ul>'
      p.filesWouldWrite.forEach(f => { html += '<li>' + escapeHtml(f) + '</li>' })
      html += '</ul>'
    } else {
      html += '<p>No file changes.</p>'
    }
    if (p.generatorsWouldRun && p.generatorsWouldRun.length) {
      html += '<p><strong>Generators that would run:</strong></p><ul>'
      p.generatorsWouldRun.forEach(n => { html += '<li>' + escapeHtml(n) + '</li>' })
      html += '</ul>'
    }
    if (p.backupsWouldCreateAt) html += '<p><strong>Backup would be created at:</strong> ' + escapeHtml(p.backupRootPreview || p.backupsWouldCreateAt) + '</p>'
    if (p.nextSteps) html += '<div class="next-steps">' + escapeHtml(p.nextSteps) + '</div>'
    el.innerHTML = html
  }

  /** Design order for Advanced mode assistants (IDs). Any assistant not in this list is appended after in manifest order. */
  var ADVANCED_DESIGN_ORDER = ['general', 'accessibility', 'analytics_tagging', 'ux_copy_review', 'content_table', 'discovery_copilot', 'design_workshop', 'design_critique', 'code2design', 'dev_handoff', 'errors']

  /** Build ordered list of assistants for Advanced column: design order first, then any others in manifest order. */
  function getAdvancedOrderedAssistants (assistants) {
    var list = assistants || []
    var byId = {}
    for (var i = 0; i < list.length; i++) byId[list[i].id] = list[i]
    var ordered = []
    var seen = new Set()
    for (var j = 0; j < ADVANCED_DESIGN_ORDER.length; j++) {
      var id = ADVANCED_DESIGN_ORDER[j]
      if (byId[id]) { ordered.push(byId[id]); seen.add(id) }
    }
    for (var k = 0; k < list.length; k++) {
      if (!seen.has(list[k].id)) { ordered.push(list[k]); seen.add(list[k].id) }
    }
    return ordered
  }

  /** Effective Advanced IDs: advancedModeIds if present, otherwise all assistant IDs in design order. */
  function getEffectiveAdvancedModeIds (ui, assistants) {
    if (Array.isArray(ui.advancedModeIds)) return ui.advancedModeIds
    return getAdvancedOrderedAssistants(assistants).map(function (a) { return a.id })
  }

  // ——— Config tab (General Plugin Settings — card layout) ———
  function renderConfigTab () {
    const panel = document.getElementById('panel-config')
    const m = state.editedModel
    if (!m || !m.config) {
      panel.innerHTML = '<p>No config loaded.</p>'
      return
    }
    const ui = m.config.ui || {}
    const llm = m.config.llm || {}
    const llmEndpoint = (typeof llm.endpoint === 'string' ? llm.endpoint : '') || ''
    const llmHideModelSettings = !!llm.hideModelSettings
    const llmUiModeConnectionOnly = llm.uiMode === 'connection-only'
    const endpointEmpty = !llmEndpoint.trim()
    const assistants = state.editedModel?.assistantsManifest?.assistants || []
    const simpleSet = new Set(Array.isArray(ui.simpleModeIds) ? ui.simpleModeIds : [])
    const advancedOrdered = getAdvancedOrderedAssistants(assistants)
    const effectiveAdvancedIds = new Set(getEffectiveAdvancedModeIds(ui, assistants))

    let html = '<div class="ace-section-header-row">'
    html += '<h2 class="ace-section-title">General Plugin Settings</h2>'
    html += '<button type="button" class="ace-section-header-btn" id="reset-config-btn">RESET THIS SECTION ONLY</button>'
    html += '</div>'
    html += '<div class="ace-config-cards ace-cards">'
    var expandedMap = loadSectionExpandedState()
    var defaultMode = ui.defaultMode || 'simple'
    var defaultModeForSegmented = (defaultMode === 'content-mvp' || defaultMode === 'simple') ? 'simple' : 'advanced'
    html += collapsibleSection('default-mode', 'Default Mode',
      '<div class="ace-card">' +
      '<p class="ace-card-subtext">Choose what level of complexity to show the user upon opening</p>' +
      '<div class="ace-segmented-btns" role="group" aria-label="Default mode">' +
      '<button type="button" class="ace-segmented-btn' + (defaultModeForSegmented === 'simple' ? ' is-active' : '') + '" data-default-mode="simple">Simple</button>' +
      '<button type="button" class="ace-segmented-btn' + (defaultModeForSegmented === 'advanced' ? ' is-active' : '') + '" data-default-mode="advanced">Advanced</button>' +
      '</div>' +
      '<select id="config-defaultMode" class="visually-hidden" aria-hidden="true" tabindex="-1">' +
      (function () {
        var o = ''
        for (var i = 0, opts = ['content-mvp', 'simple', 'advanced']; i < opts.length; i++) {
          var opt = opts[i]
          o += '<option value="' + opt + '"' + (defaultMode === opt ? ' selected' : '') + '>' + opt + '</option>'
        }
        return o
      })() +
      '</select></div>',
      expandedMap['default-mode'])
    html += collapsibleSection('mode-settings', 'Mode Settings',
      '<div class="ace-card ace-mode-settings-card">' +
      '<p class="ace-card-subtext">Choose what Assistants are visible to the user</p>' +
      '<div class="ace-two-col ace-mode-columns">' +
      '<div class="ace-mode-col"><h4 class="ace-mode-col-title">Simple</h4><div class="ace-checkbox-list" id="config-simpleModeIds-checkboxes">' +
      (function () {
        var o = ''
        assistants.forEach(function (a) {
          var checked = simpleSet.has(a.id)
          o += '<label class="ace-checkbox-row"><input type="checkbox" class="config-simple-cb" data-id="' + escapeHtml(a.id) + '" ' + (checked ? 'checked' : '') + '> <span class="ace-checkbox-label">' + escapeHtml(a.label || a.id) + '</span></label>'
        })
        return o
      })() +
      '</div></div>' +
      '<div class="ace-mode-col"><h4 class="ace-mode-col-title">Advanced</h4><div class="ace-checkbox-list" id="config-advancedModeIds-checkboxes">' +
      (function () {
        var o = ''
        advancedOrdered.forEach(function (a) {
          var checked = effectiveAdvancedIds.has(a.id)
          o += '<label class="ace-checkbox-row"><input type="checkbox" class="config-advanced-cb" data-id="' + escapeHtml(a.id) + '" ' + (checked ? 'checked' : '') + '> <span class="ace-checkbox-label">' + escapeHtml(a.label || a.id) + '</span></label>'
        })
        return o
      })() +
      '</div></div></div></div>',
      expandedMap['mode-settings'])
    html += collapsibleSection('ai-api-endpoint', 'AI API Endpoint',
      '<div class="ace-card ace-llm-endpoint-card">' +
      '<p class="ace-card-subtext">Provide the LLM URL to enable AI features</p>' +
    '<label for="config-llm-endpoint" class="ace-field-label">Endpoint URL</label>' +
    '<input type="text" id="config-llm-endpoint" class="ace-text-input ace-field ace-field--lg" placeholder="Enter API Endpoint URL" value="' + escapeHtml(llmEndpoint) + '" aria-describedby="config-llm-endpoint-guardrail">' +
    '<p id="config-llm-endpoint-guardrail" class="ace-llm-guardrail" role="status"' + (endpointEmpty ? '' : ' hidden') + '>Set an endpoint to enable these options.</p>' +
    '<label class="ace-checkbox-row"><input type="checkbox" id="config-llm-hideModelSettings"' + (llmHideModelSettings ? ' checked' : '') + (endpointEmpty ? ' disabled' : '') + ' aria-describedby="config-llm-endpoint-guardrail"> <span class="ace-checkbox-label">Hide endpoint settings in plugin</span></label>' +
    '<label class="ace-checkbox-row"><input type="checkbox" id="config-llm-showTestConnection"' + (llmUiModeConnectionOnly ? ' checked' : '') + (endpointEmpty ? ' disabled' : '') + '> <span class="ace-checkbox-label">Show Test Connection button</span></label>' +
    '<p class="ace-card-helper" id="config-llm-uiMode-helper">Controls whether Settings show connection-only vs full model settings.</p>' +
    '</div>',
      expandedMap['ai-api-endpoint'])
    var RESOURCE_LINK_KEYS = ['about', 'feedback', 'meetup']
    var RESOURCE_LINK_BUTTON_LABELS = ['Button 1', 'Button 2', 'Button 3']
    var resourcesLinks = (m.config.resources && m.config.resources.links) ? m.config.resources.links : {}
    html += collapsibleSection('resource-links', 'Resource Links',
      '<div class="ace-card ace-resource-links-card">' +
      '<p class="ace-card-subtext">Include helpful links in the Resources &amp; Credits section. Leave fields blank to hide button.</p>' +
      (function () {
        var o = ''
        for (var r = 0; r < RESOURCE_LINK_KEYS.length; r++) {
          var linkKey = RESOURCE_LINK_KEYS[r]
          var linkEntry = resourcesLinks[linkKey] || {}
          var linkLabel = (typeof linkEntry.label === 'string' ? linkEntry.label : '') || ''
          var linkUrl = (typeof linkEntry.url === 'string' ? linkEntry.url : '') || ''
          o += '<div class="ace-resource-link-row" data-link-key="' + escapeHtml(linkKey) + '">'
          o += '<h4 class="ace-resource-link-row-title">' + escapeHtml(RESOURCE_LINK_BUTTON_LABELS[r]) + '</h4>'
          o += '<label for="config-resources-links-' + linkKey + '-label" class="ace-field-label">Label</label>'
          o += '<input type="text" id="config-resources-links-' + linkKey + '-label" class="ace-text-input ace-field" placeholder="Label" value="' + escapeHtml(linkLabel) + '" data-link-key="' + escapeHtml(linkKey) + '">'
          o += '<label for="config-resources-links-' + linkKey + '-url" class="ace-field-label">URL</label>'
          o += '<input type="text" id="config-resources-links-' + linkKey + '-url" class="ace-text-input ace-field ace-field--lg" placeholder="https://..." value="' + escapeHtml(linkUrl) + '" data-link-key="' + escapeHtml(linkKey) + '">'
          o += '</div>'
        }
        return o
      })() +
      '</div>',
      expandedMap['resource-links'])
    var CREDITS_GROUP_KEYS = ['createdBy', 'apiTeam', 'llmInstruct']
    var CREDITS_GROUP_LABELS = { createdBy: 'Created By', apiTeam: 'API Team', llmInstruct: 'Content Team' }
    var creditsData = (m.config.resources && m.config.resources.credits) ? m.config.resources.credits : {}
    html += collapsibleSection('credits', 'Credits',
      '<div class="ace-card ace-credits-card" id="credits-card">' +
      '<p class="ace-card-subtext">Share the love. Leave fields blank to hide slot.</p>' +
      (function () {
        var o = ''
        for (var c = 0; c < CREDITS_GROUP_KEYS.length; c++) {
          var groupKey = CREDITS_GROUP_KEYS[c]
          var groupLabel = CREDITS_GROUP_LABELS[groupKey] || groupKey
          var arr = Array.isArray(creditsData[groupKey]) ? creditsData[groupKey].slice() : []
          while (arr.length < 3) arr.push({ label: '', url: '' })
          arr = arr.slice(0, 3)
          o += '<div class="ace-credits-subsection" data-credits-group="' + escapeHtml(groupKey) + '">'
          for (var slot = 0; slot < 3; slot++) {
            var entry = arr[slot] && typeof arr[slot] === 'object' ? arr[slot] : { label: '', url: '' }
            var slotLabel = typeof entry.label === 'string' ? entry.label : ''
            var slotUrl = typeof entry.url === 'string' ? entry.url : ''
            o += '<div class="ace-credits-slot">'
            o += '<h5 class="ace-credits-slot-title">' + escapeHtml(groupLabel) + ' Slot ' + (slot + 1) + '</h5>'
            o += '<label for="credits-' + escapeHtml(groupKey) + '-' + slot + '-label" class="ace-field-label">Label</label>'
            o += '<input type="text" id="credits-' + escapeHtml(groupKey) + '-' + slot + '-label" class="ace-text-input ace-field" placeholder="Label" value="' + escapeHtml(slotLabel) + '" data-credits-group="' + escapeHtml(groupKey) + '" data-slot="' + slot + '">'
            o += '<label for="credits-' + escapeHtml(groupKey) + '-' + slot + '-url" class="ace-field-label">URL</label>'
            o += '<input type="text" id="credits-' + escapeHtml(groupKey) + '-' + slot + '-url" class="ace-text-input ace-field ace-field--lg" placeholder="https://..." value="' + escapeHtml(slotUrl) + '" data-credits-group="' + escapeHtml(groupKey) + '" data-slot="' + slot + '">'
            o += '</div>'
          }
          o += '</div>'
        }
        return o
      })() +
      '</div>',
      expandedMap['credits'])
    html += collapsibleSection('advanced-raw-json', 'Advanced: Raw JSON Config',
      '<div class="ace-card danger-zone ace-raw-json-card">' +
      '<p class="ace-raw-json-warning">Warning: Invalid JSON will fail validation</p>' +
      '<textarea class="raw large ace-field--full" id="config-raw" rows="12" aria-describedby="config-raw-error">' + escapeHtml(JSON.stringify(m.config, null, 2)) + '</textarea>' +
      '<span id="config-raw-error" class="inline-error" aria-live="polite"></span>' +
      '</div>',
      expandedMap['advanced-raw-json'])
    html += '</div>'
    panel.innerHTML = html

    panel.querySelectorAll('.ace-collapsible .ace-section-header').forEach(function (btn) {
      btn.onclick = function () {
        var section = this.closest('.ace-collapsible')
        if (!section) return
        var sectionId = section.getAttribute('data-section')
        if (!sectionId) return
        var map = loadSectionExpandedState()
        map[sectionId] = !map[sectionId]
        saveSectionExpandedState(map)
        var expanded = map[sectionId]
        section.classList.toggle('is-collapsed', !expanded)
        this.setAttribute('aria-expanded', expanded ? 'true' : 'false')
        var img = this.querySelector('.ace-section-chevron')
        if (img) img.src = expanded ? 'assets/icons/ChevronUpIcon.svg' : 'assets/icons/ChevronDownIcon.svg'
      }
    })

    panel.querySelectorAll('.ace-segmented-btn[data-default-mode]').forEach(function (btn) {
      btn.onclick = function () {
        var mode = this.getAttribute('data-default-mode')
        if (!state.editedModel.config.ui) state.editedModel.config.ui = {}
        state.editedModel.config.ui.defaultMode = mode
        var sel = document.getElementById('config-defaultMode')
        if (sel) sel.value = mode
        panel.querySelectorAll('.ace-segmented-btn[data-default-mode]').forEach(function (b) { b.classList.toggle('is-active', b === btn) })
        showUnsavedBanner()
        updateFooterButtons()
      }
    })
    function syncSimpleModeIdsFromModel () {
      const arr = Array.isArray(state.editedModel?.config?.ui?.simpleModeIds) ? state.editedModel.config.ui.simpleModeIds : []
      panel.querySelectorAll('.config-simple-cb').forEach(function (cb) {
        const id = cb.getAttribute('data-id')
        cb.checked = id && arr.indexOf(id) !== -1
      })
    }
    function syncAdvancedModeIdsFromModel () {
      const ui = state.editedModel?.config?.ui || {}
      const assistants = state.editedModel?.assistantsManifest?.assistants || []
      const effectiveSet = new Set(getEffectiveAdvancedModeIds(ui, assistants))
      panel.querySelectorAll('.config-advanced-cb').forEach(function (cb) {
        const id = cb.getAttribute('data-id')
        cb.checked = id && effectiveSet.has(id)
      })
    }
    panel.querySelectorAll('.config-simple-cb').forEach(function (cb) {
      cb.onchange = function () {
        const id = this.getAttribute('data-id')
        if (!state.editedModel.config.ui) state.editedModel.config.ui = {}
        let arr = Array.isArray(state.editedModel.config.ui.simpleModeIds) ? state.editedModel.config.ui.simpleModeIds.slice() : []
        const set = new Set(arr)
        if (this.checked) set.add(id)
        else set.delete(id)
        const order = (state.editedModel?.assistantsManifest?.assistants || []).map(a => a.id).filter(i => set.has(i))
        state.editedModel.config.ui.simpleModeIds = order
        syncSimpleModeIdsFromModel()
        showUnsavedBanner()
      }
    })
    var advancedOrderedIds = getAdvancedOrderedAssistants(state.editedModel?.assistantsManifest?.assistants || []).map(function (a) { return a.id })
    panel.querySelectorAll('.config-advanced-cb').forEach(function (cb) {
      cb.onchange = function () {
        if (!state.editedModel.config.ui) state.editedModel.config.ui = {}
        var checkedIds = []
        panel.querySelectorAll('.config-advanced-cb').forEach(function (c) {
          var aid = c.getAttribute('data-id')
          if (aid && c.checked) checkedIds.push(aid)
        })
        state.editedModel.config.ui.advancedModeIds = checkedIds
        syncAdvancedModeIdsFromModel()
        showUnsavedBanner()
        updateFooterButtons()
      }
    })
    document.getElementById('config-raw').onchange = document.getElementById('config-raw').oninput = function () {
      const errEl = document.getElementById('config-raw-error')
      try {
        const parsed = JSON.parse(this.value)
        state.editedModel.config = canonicalizeConfigUi(parsed)
        state.configRawParseError = false
        if (errEl) { errEl.textContent = ''; errEl.classList.remove('visible') }
        showUnsavedBanner()
      } catch (_) {
        state.configRawParseError = true
        if (errEl) { errEl.textContent = 'Invalid JSON'; errEl.classList.add('visible') }
        updateFooterButtons()
      }
    }
    document.getElementById('reset-config-btn').onclick = function () {
      if (!state.originalModel) return
      if (deepEqual(state.originalModel.config, state.editedModel.config)) return
      if (!confirm('Reset changes for Config?')) return
      state.editedModel.config = deepClone(state.originalModel.config)
      state.configRawParseError = false
      showUnsavedBanner()
      renderConfigTab()
      updateFooterButtons()
    }

    function updateLlmGuardrail () {
      const endpointEl = document.getElementById('config-llm-endpoint')
      const guardrailEl = document.getElementById('config-llm-endpoint-guardrail')
      const hideCb = document.getElementById('config-llm-hideModelSettings')
      const showTestCb = document.getElementById('config-llm-showTestConnection')
      const endpointVal = endpointEl ? endpointEl.value : ''
      const empty = !endpointVal.trim()
      if (guardrailEl) {
        guardrailEl.hidden = !empty
      }
      if (hideCb) hideCb.disabled = empty
      if (showTestCb) showTestCb.disabled = empty
    }

    const endpointInput = document.getElementById('config-llm-endpoint')
    if (endpointInput) {
      endpointInput.oninput = endpointInput.onchange = function () {
        if (!state.editedModel.config) return
        if (!state.editedModel.config.llm) state.editedModel.config.llm = {}
        state.editedModel.config.llm.endpoint = this.value
        updateLlmGuardrail()
        showUnsavedBanner()
        updateFooterButtons()
      }
    }
    const hideModelSettingsCb = document.getElementById('config-llm-hideModelSettings')
    if (hideModelSettingsCb) {
      hideModelSettingsCb.onchange = function () {
        if (!state.editedModel.config) return
        if (!state.editedModel.config.llm) state.editedModel.config.llm = {}
        state.editedModel.config.llm.hideModelSettings = this.checked
        showUnsavedBanner()
        updateFooterButtons()
      }
    }
    const showTestConnectionCb = document.getElementById('config-llm-showTestConnection')
    if (showTestConnectionCb) {
      showTestConnectionCb.onchange = function () {
        if (!state.editedModel.config) return
        if (!state.editedModel.config.llm) state.editedModel.config.llm = {}
        state.editedModel.config.llm.uiMode = this.checked ? 'connection-only' : 'full'
        showUnsavedBanner()
        updateFooterButtons()
      }
    }

    function syncResourceLinkToModel (linkKey) {
      if (!state.editedModel.config) return
      if (!state.editedModel.config.resources) state.editedModel.config.resources = {}
      if (!state.editedModel.config.resources.links) state.editedModel.config.resources.links = {}
      var labelEl = document.getElementById('config-resources-links-' + linkKey + '-label')
      var urlEl = document.getElementById('config-resources-links-' + linkKey + '-url')
      var labelVal = labelEl ? (labelEl.value || '').trim() : ''
      var urlVal = urlEl ? (urlEl.value || '').trim() : ''
      if (!labelVal && !urlVal) {
        delete state.editedModel.config.resources.links[linkKey]
      } else {
        state.editedModel.config.resources.links[linkKey] = { label: labelVal, url: urlVal }
      }
      showUnsavedBanner()
      updateFooterButtons()
    }
    RESOURCE_LINK_KEYS.forEach(function (linkKey) {
      var labelInput = document.getElementById('config-resources-links-' + linkKey + '-label')
      var urlInput = document.getElementById('config-resources-links-' + linkKey + '-url')
      if (labelInput) {
        labelInput.oninput = labelInput.onchange = function () { syncResourceLinkToModel(linkKey) }
      }
      if (urlInput) {
        urlInput.oninput = urlInput.onchange = function () { syncResourceLinkToModel(linkKey) }
      }
    })

    function syncCreditsGroupToModel (groupKey) {
      if (!state.editedModel.config) return
      if (!state.editedModel.config.resources) state.editedModel.config.resources = {}
      if (!state.editedModel.config.resources.credits) state.editedModel.config.resources.credits = {}
      var entries = []
      for (var i = 0; i < 3; i++) {
        var labelEl = document.getElementById('credits-' + groupKey + '-' + i + '-label')
        var urlEl = document.getElementById('credits-' + groupKey + '-' + i + '-url')
        var labelVal = labelEl ? (labelEl.value || '').trim() : ''
        var urlVal = urlEl ? (urlEl.value || '').trim() : ''
        entries.push({ label: labelVal, url: urlVal })
      }
      var filtered = entries.filter(function (e) { return e.label !== '' || e.url !== '' })
      state.editedModel.config.resources.credits[groupKey] = filtered
      showUnsavedBanner()
      updateFooterButtons()
    }
    var creditsCard = document.getElementById('credits-card')
    if (creditsCard) {
      creditsCard.addEventListener('input', function (e) {
        var id = e.target && e.target.id
        if (!id || typeof id !== 'string') return
        var m = id.match(/^credits-(createdBy|apiTeam|llmInstruct)-\d+-(label|url)$/)
        if (m) syncCreditsGroupToModel(m[1])
      })
      creditsCard.addEventListener('change', function (e) {
        var id = e.target && e.target.id
        if (!id || typeof id !== 'string') return
        var m = id.match(/^credits-(createdBy|apiTeam|llmInstruct)-\d+-(label|url)$/)
        if (m) syncCreditsGroupToModel(m[1])
      })
    }

    var configRequiredIds = ['config-defaultMode', 'config-simpleModeIds-checkboxes', 'config-advancedModeIds-checkboxes', 'config-raw', 'config-raw-error', 'reset-config-btn']
    var missingIds = configRequiredIds.filter(function (id) { return !document.getElementById(id) })
    if (missingIds.length > 0) {
      var errDiv = document.createElement('div')
      errDiv.setAttribute('class', 'ace-binding-invariant')
      errDiv.setAttribute('role', 'alert')
      errDiv.textContent = 'Missing DOM nodes: ' + missingIds.join(', ')
      panel.insertBefore(errDiv, panel.firstChild)
    }
  }

  // ——— Assistants tab ———
  function renderAssistantsTab () {
    const panel = document.getElementById('panel-assistants')
    const m = state.editedModel
    const list = m?.assistantsManifest?.assistants || []
    const simpleIds = new Set((m?.config?.ui?.simpleModeIds) || [])
    const search = (document.getElementById('assistants-search') || {}).value || ''
    const showHidden = (document.getElementById('assistants-show-hidden') || {}).checked !== false
    const filtered = list.filter(a => {
      const matchSearch = !search || a.id.toLowerCase().includes(search.toLowerCase()) || (a.label && a.label.toLowerCase().includes(search.toLowerCase()))
      const inSimple = simpleIds.has(a.id)
      const visible = showHidden || inSimple
      return matchSearch && visible
    })

    let html = '<div class="section-title">Assistants</div>'
    html += '<div class="reset-section"><button type="button" class="btn-small" id="reset-assistants-btn">Reset section</button></div>'
    html += '<div class="field-row"><input type="text" id="assistants-search" class="ace-field" placeholder="Search by id or label" value="' + escapeHtml(search) + '">'
    html += '<label class="field-row"><input type="checkbox" id="assistants-show-hidden" ' + (showHidden ? 'checked' : '') + '> Show hidden (not in simple mode)</label></div>'
    html += '<div class="list-panel">'
    html += '<div class="list" id="assistants-list">'
    filtered.forEach(a => {
      const cls = a.id === state.selectedAssistantId ? 'item selected' : 'item'
      html += '<div class="' + cls + '" data-id="' + escapeHtml(a.id) + '">' + escapeHtml(a.label || a.id) + '</div>'
    })
    html += '</div><div class="editor" id="assistant-editor-panel">'
    if (!state.selectedAssistantId) {
      html += '<div class="empty">Select an assistant</div>'
    } else {
      const a = list.find(x => x.id === state.selectedAssistantId)
      if (!a) {
        html += '<div class="empty">Not found</div>'
      } else {
        html += assistantEditorHtml(a)
      }
    }
    html += '</div></div>'
    panel.innerHTML = html

    document.getElementById('assistants-list').addEventListener('click', function (e) {
      const item = e.target.closest('.item[data-id]')
      if (item) {
        state.selectedAssistantId = item.getAttribute('data-id')
        renderAssistantsTab()
      }
    })
    document.getElementById('assistants-search').oninput = function () { renderAssistantsTab() }
    document.getElementById('assistants-show-hidden').onchange = function () { renderAssistantsTab() }
    document.getElementById('reset-assistants-btn').onclick = function () {
      if (!state.originalModel) return
      state.editedModel.assistantsManifest = deepClone(state.originalModel.assistantsManifest)
      showUnsavedBanner()
      renderAssistantsTab()
    }
    bindAssistantEditor()
  }

  function assistantEditorHtml (a) {
    let html = '<label>ID (read-only)</label><input type="text" class="ace-field" value="' + escapeHtml(a.id) + '" readonly>'
    html += '<label>Label</label><input type="text" id="ae-label" class="ace-field" value="' + escapeHtml(a.label || '') + '">'
    html += '<label>Intro</label><textarea id="ae-intro" class="ace-field" rows="3">' + escapeHtml(a.intro || '') + '</textarea>'
    html += '<label>Hover summary</label><input type="text" id="ae-hoverSummary" class="ace-field" value="' + escapeHtml(a.hoverSummary || '') + '">'
    html += '<label>Welcome message</label><textarea id="ae-welcomeMessage" class="ace-field" rows="2">' + escapeHtml(a.welcomeMessage || '') + '</textarea>'
    html += '<div class="field-row"><label><input type="checkbox" id="ae-tag-visible" ' + (a.tag?.isVisible ? 'checked' : '') + '> Tag visible</label></div>'
    html += '<label>Tag label</label><input type="text" id="ae-tag-label" class="ace-field" value="' + escapeHtml(a.tag?.label || '') + '">'
    html += '<label>Tag variant</label><select id="ae-tag-variant"><option value="">—</option><option value="new"' + (a.tag?.variant === 'new' ? ' selected' : '') + '>new</option><option value="beta"' + (a.tag?.variant === 'beta' ? ' selected' : '') + '>beta</option><option value="alpha"' + (a.tag?.variant === 'alpha' ? ' selected' : '') + '>alpha</option></select>'
    html += '<label>Icon ID</label><input type="text" id="ae-iconId" class="ace-field" value="' + escapeHtml(a.iconId || '') + '">'
    html += '<label>Kind</label><select id="ae-kind"><option value="ai"' + (a.kind === 'ai' ? ' selected' : '') + '>ai</option><option value="tool"' + (a.kind === 'tool' ? ' selected' : '') + '>tool</option><option value="hybrid"' + (a.kind === 'hybrid' ? ' selected' : '') + '>hybrid</option></select>'
    html += '<div class="section-title">Quick actions</div><ul class="quick-actions-list" id="ae-quickActions">'
    ;(a.quickActions || []).forEach((qa, i) => {
      html += '<li><input type="text" placeholder="id" value="' + escapeHtml(qa.id) + '" data-i="' + i + '" data-field="id"><input type="text" placeholder="label" value="' + escapeHtml(qa.label || '') + '" data-i="' + i + '" data-field="label"><button type="button" class="btn-small ae-qa-remove" data-i="' + i + '">Remove</button></li>'
    })
    html += '</ul><button type="button" class="btn-small add-btn" id="ae-qa-add">Add quick action</button>'
    html += '<label>Prompt template</label><textarea id="ae-promptTemplate" class="large ace-field ace-field--lg" rows="12">' + escapeHtml(a.promptTemplate || '') + '</textarea>'
    return html
  }

  function bindAssistantEditor () {
    const a = (state.editedModel?.assistantsManifest?.assistants || []).find(x => x.id === state.selectedAssistantId)
    if (!a) return
    const set = (id, field, value) => {
      a[field] = value
      showUnsavedBanner()
    }
    document.getElementById('ae-label').onchange = function () { set('ae-label', 'label', this.value) }
    document.getElementById('ae-intro').onchange = function () { set('ae-intro', 'intro', this.value) }
    document.getElementById('ae-hoverSummary').onchange = function () { set('ae-hoverSummary', 'hoverSummary', this.value) }
    const wm = document.getElementById('ae-welcomeMessage')
    if (wm) wm.onchange = function () { set('ae-welcomeMessage', 'welcomeMessage', this.value) }
    const tagVis = document.getElementById('ae-tag-visible')
    if (tagVis) tagVis.onchange = function () { if (!a.tag) a.tag = {}; a.tag.isVisible = this.checked; showUnsavedBanner() }
    document.getElementById('ae-tag-label').onchange = function () { if (!a.tag) a.tag = {}; a.tag.label = this.value; showUnsavedBanner() }
    document.getElementById('ae-tag-variant').onchange = function () { if (!a.tag) a.tag = {}; a.tag.variant = this.value || undefined; showUnsavedBanner() }
    document.getElementById('ae-iconId').onchange = function () { set('ae-iconId', 'iconId', this.value) }
    document.getElementById('ae-kind').onchange = function () { set('ae-kind', 'kind', this.value) }
    document.getElementById('ae-promptTemplate').onchange = function () { set('ae-promptTemplate', 'promptTemplate', this.value) }
    document.querySelectorAll('.ae-qa-remove').forEach(btn => {
      btn.onclick = function () {
        const i = parseInt(this.getAttribute('data-i'), 10)
        a.quickActions.splice(i, 1)
        showUnsavedBanner()
        renderAssistantsTab()
      }
    })
    document.querySelectorAll('#ae-quickActions input').forEach(inp => {
      inp.onchange = function () {
        const i = parseInt(this.getAttribute('data-i'), 10)
        const field = this.getAttribute('data-field')
        if (a.quickActions[i]) a.quickActions[i][field] = this.value
        showUnsavedBanner()
      }
    })
    const addBtn = document.getElementById('ae-qa-add')
    if (addBtn) addBtn.onclick = function () {
      a.quickActions = a.quickActions || []
      a.quickActions.push({ id: 'new-action', label: 'New action', templateMessage: '' })
      showUnsavedBanner()
      renderAssistantsTab()
    }
  }

  // ——— Knowledge tab ———
  function renderKnowledgeTab () {
    const panel = document.getElementById('panel-knowledge')
    const m = state.editedModel
    const assistants = m?.assistantsManifest?.assistants || []
    const knowledge = m?.customKnowledge || {}
    const selectedId = state.selectedKnowledgeId || (assistants[0] && assistants[0].id)
    state.selectedKnowledgeId = selectedId
    const body = knowledge[selectedId] !== undefined ? knowledge[selectedId] : ''
    const showPreview = (document.getElementById('knowledge-preview-toggle') || {}).checked

    let html = '<div class="section-title">Knowledge</div>'
    html += '<p class="fg-secondary">Files are written to custom/knowledge/&lt;id&gt;.md</p>'
    html += '<div class="reset-section"><button type="button" class="btn-small" id="reset-knowledge-btn">Reset section</button></div>'
    html += '<div class="list-panel">'
    html += '<div class="list" id="knowledge-list">'
    assistants.forEach(as => {
      const hasFile = knowledge[as.id] !== undefined
      const cls = as.id === selectedId ? 'item selected' : 'item'
      html += '<div class="' + cls + '" data-id="' + escapeHtml(as.id) + '">' + escapeHtml(as.label || as.id) + (hasFile ? '' : ' <em>(no file)</em>') + '</div>'
    })
    html += '</div><div class="editor">'
    html += '<label><input type="checkbox" id="knowledge-preview-toggle" ' + (showPreview ? 'checked' : '') + '> Show preview</label>'
    if (!assistants.some(as => as.id === selectedId)) {
      html += '<div class="empty">Select an assistant</div>'
    } else {
      const hasFile = knowledge[selectedId] !== undefined
      if (!hasFile) html += '<button type="button" class="btn-small add-btn" id="knowledge-create-btn">Create knowledge file for ' + escapeHtml(selectedId) + '</button>'
      html += '<textarea id="knowledge-body" class="large ace-field ace-field--lg" rows="16">' + escapeHtml(body) + '</textarea>'
      if (showPreview) html += '<div class="preview" id="knowledge-preview">' + escapeHtml(body) + '</div>'
    }
    html += '</div></div>'
    panel.innerHTML = html

    document.getElementById('knowledge-list').addEventListener('click', function (e) {
      const item = e.target.closest('.item[data-id]')
      if (item) {
        state.selectedKnowledgeId = item.getAttribute('data-id')
        renderKnowledgeTab()
      }
    })
    const createBtn = document.getElementById('knowledge-create-btn')
    if (createBtn) createBtn.onclick = function () {
      if (!state.editedModel.customKnowledge) state.editedModel.customKnowledge = {}
      state.editedModel.customKnowledge[selectedId] = '# ' + selectedId + '\n\n'
      showUnsavedBanner()
      renderKnowledgeTab()
    }
    const textarea = document.getElementById('knowledge-body')
    if (textarea) {
      textarea.onchange = textarea.oninput = function () {
        if (!state.editedModel.customKnowledge) state.editedModel.customKnowledge = {}
        state.editedModel.customKnowledge[selectedId] = this.value
        showUnsavedBanner()
        const prev = document.getElementById('knowledge-preview')
        if (prev) prev.textContent = this.value
      }
    }
    document.getElementById('knowledge-preview-toggle').onchange = function () { renderKnowledgeTab() }
    document.getElementById('reset-knowledge-btn').onclick = function () {
      if (!state.originalModel) return
      state.editedModel.customKnowledge = deepClone(state.originalModel.customKnowledge)
      showUnsavedBanner()
      renderKnowledgeTab()
    }
  }

  // ——— Content Models tab ———
  function renderContentModelsTab () {
    const panel = document.getElementById('panel-content-models')
    const m = state.editedModel
    const raw = m?.contentModelsRaw ?? ''

    let html = '<div class="danger-zone">'
    html += '<p class="danger-zone-label">Raw content model markdown — changing this affects generated presets. Edit with care.</p>'
    html += '<div class="banner-warning">Changing this affects generated presets. Edit with care.</div>'
    html += '<div class="reset-section"><button type="button" class="btn-small" id="revert-content-models-btn">Revert</button></div>'
    html += '<textarea id="content-models-raw" class="large ace-field--full" rows="24">' + escapeHtml(raw) + '</textarea>'
    html += '</div>'
    panel.innerHTML = html

    document.getElementById('content-models-raw').onchange = document.getElementById('content-models-raw').oninput = function () {
      state.editedModel.contentModelsRaw = this.value
      showUnsavedBanner()
    }
    document.getElementById('revert-content-models-btn').onclick = function () {
      if (!state.originalModel) return
      state.editedModel.contentModelsRaw = state.originalModel.contentModelsRaw
      showUnsavedBanner()
      renderContentModelsTab()
    }
  }

  // ——— Registries tab ———
  function renderRegistriesTab () {
    const panel = document.getElementById('panel-registries')
    const regs = state.editedModel?.designSystemRegistries || {}
    const ids = Object.keys(regs)

    let html = '<div class="section-title">Design System Registries</div>'
    html += '<div class="reset-section"><button type="button" class="btn-small" id="reset-registries-btn">Reset section</button></div>'
    html += '<p class="danger-zone-label">Raw registry JSON per design system — invalid JSON will fail validation.</p>'
    ids.forEach(id => {
      const val = regs[id]
      const str = typeof val === 'object' ? JSON.stringify(val, null, 2) : String(val)
      html += '<div class="registry-block danger-zone"><label>' + escapeHtml(id) + ' (registry.json)</label>'
      html += '<textarea id="registry-' + escapeHtml(id) + '" class="large ace-field--full" rows="10" aria-describedby="registry-error-' + escapeHtml(id) + '">' + escapeHtml(str) + '</textarea>'
      html += '<span id="registry-error-' + escapeHtml(id) + '" class="inline-error" aria-live="polite"></span></div>'
    })
    if (ids.length === 0) html += '<p>No registries present.</p>'
    panel.innerHTML = html

    ids.forEach(id => {
      const ta = document.getElementById('registry-' + id)
      const errEl = document.getElementById('registry-error-' + id)
      if (ta) ta.onchange = ta.oninput = function () {
        try {
          state.editedModel.designSystemRegistries[id] = JSON.parse(this.value)
          if (!state.registryParseErrors) state.registryParseErrors = {}
          state.registryParseErrors[id] = false
          if (errEl) { errEl.textContent = ''; errEl.classList.remove('visible') }
          showUnsavedBanner()
        } catch (_) {
          if (!state.registryParseErrors) state.registryParseErrors = {}
          state.registryParseErrors[id] = true
          if (errEl) { errEl.textContent = 'Invalid JSON'; errEl.classList.add('visible') }
          showUnsavedBanner()
        }
      }
    })
    const resetRegBtn = document.getElementById('reset-registries-btn')
    if (resetRegBtn) {
      resetRegBtn.onclick = function () {
        if (!state.originalModel) return
        state.editedModel.designSystemRegistries = state.originalModel.designSystemRegistries ? deepClone(state.originalModel.designSystemRegistries) : undefined
        state.registryParseErrors = {}
        showUnsavedBanner()
        renderRegistriesTab()
      }
    }
  }

  function renderAllPanels () {
    const m = state.editedModel
    const tabContentModels = document.getElementById('tab-content-models')
    const tabRegistries = document.getElementById('tab-registries')
    const panelContentModels = document.getElementById('panel-content-models')
    const panelRegistries = document.getElementById('panel-registries')
    if (m?.contentModelsRaw !== undefined && m?.contentModelsRaw !== null) {
      if (tabContentModels) tabContentModels.style.display = ''
      renderContentModelsTab()
    } else {
      if (tabContentModels) tabContentModels.style.display = 'none'
    }
    if (m?.designSystemRegistries && Object.keys(m.designSystemRegistries).length > 0) {
      if (tabRegistries) tabRegistries.style.display = ''
      renderRegistriesTab()
    } else {
      if (tabRegistries) tabRegistries.style.display = 'none'
    }
    renderConfigTab()
    renderAssistantsTab()
    renderKnowledgeTab()
    if (m?.contentModelsRaw !== undefined) renderContentModelsTab()
    if (m?.designSystemRegistries && Object.keys(m.designSystemRegistries).length > 0) renderRegistriesTab()
    renderValidationMessage()
    renderSaveSummary()
    renderPreviewSummary()
    updateTabFocusability()
    switchTab(state.selectedTab)
  }

  function getVisibleTabButtons () {
    return Array.prototype.filter.call(
      document.querySelectorAll('.tabs button[role="tab"]'),
      function (btn) { return btn.style.display !== 'none' }
    )
  }

  function updateTabFocusability () {
    document.querySelectorAll('.tabs button[role="tab"][data-tab]').forEach(function (btn) {
      btn.setAttribute('tabindex', btn.style.display === 'none' ? '-1' : '0')
    })
  }

  var TAB_SUBHEADERS = {
    config: 'General Plugin Settings',
    assistants: 'Assistants — Definitions and prompts',
    knowledge: 'Knowledge — Markdown files per assistant',
    'content-models': 'Content Models — Raw content model markdown',
    registries: 'Design System Registries — Registry JSON per design system'
  }

  function switchTab (tabId) {
    state.selectedTab = tabId
    const tabButtons = document.querySelectorAll('.tabs button[role="tab"][data-tab]')
    tabButtons.forEach(function (btn) {
      const sel = btn.getAttribute('data-tab') === tabId
      btn.setAttribute('aria-selected', sel ? 'true' : 'false')
      if (sel) btn.setAttribute('aria-current', 'page')
      else btn.removeAttribute('aria-current')
      btn.classList.toggle('active', sel)
    })
    const subheaderEl = document.getElementById('tab-subheader')
    if (subheaderEl) {
      if (tabId === 'config') {
        subheaderEl.textContent = ''
        subheaderEl.style.display = 'none'
      } else {
        subheaderEl.textContent = TAB_SUBHEADERS[tabId] || tabId
        subheaderEl.style.display = ''
      }
    }
    const panelIds = ['panel-config', 'panel-assistants', 'panel-knowledge', 'panel-content-models', 'panel-registries']
    const tabIds = ['config', 'assistants', 'knowledge', 'content-models', 'registries']
    panelIds.forEach((pid, i) => {
      const panel = document.getElementById(pid)
      if (!panel) return
      const match = tabIds[i] === tabId
      panel.setAttribute('aria-hidden', match ? 'false' : 'true')
      panel.style.display = match ? 'flex' : 'none'
    })
  }

  async function runValidate () {
    if (state.loadingAction) return state.lastValidation
    state.loadingAction = 'validate'
    updateFooterButtons()
    showActionModal({ state: 'loading', message: 'Validating…' })
    try {
      const result = await apiValidate(getEditedModel())
      state.lastValidation = result
      renderValidationMessage()
      if (result.errors && result.errors.length > 0) {
        showActionModal({ state: 'error', message: result.errors[0], copyText: result.errors.join('\n'), onRetry: function () { hideActionModal(); runValidate() } })
      } else {
        showActionModal({ state: 'success', message: 'Validation passed.' })
      }
      return result
    } catch (err) {
      state.lastValidation = { errors: [err.message], warnings: [] }
      renderValidationMessage()
      const msg = String(err.message || 'Validation failed')
      showActionModal({ state: 'error', message: msg, copyText: msg, onRetry: function () { hideActionModal(); runValidate() } })
      return state.lastValidation
    } finally {
      state.loadingAction = null
      updateFooterButtons()
    }
  }

  async function runSave () {
    if (state.loadingAction) return
    const last = state.lastValidation
    if (last && last.errors && last.errors.length > 0) {
      const validationEl = document.getElementById('validation-message')
      if (validationEl) validationEl.innerHTML = '<span class="errors">Fix validation errors before saving.</span>'
      return
    }
    state.loadingAction = 'save'
    updateFooterButtons()
    showActionModal({ state: 'loading', message: 'Saving…' })
    try {
      const summary = await apiSave(getEditedModel(), false)
      state.saveSummary = summary
      state.previewSummary = null
      if (summary.success) {
        state.originalModel = getEditedModel()
        state.editedModel = deepClone(state.originalModel)
        state.lastValidation = null
        showUnsavedBanner()
        renderAllPanels()
        showActionModal({ state: 'success', message: 'Saved successfully.' })
      } else {
        showActionModal({ state: 'error', message: 'Save did not succeed.', copyText: summary.error || 'Save failed' })
      }
      renderSaveSummary()
      renderValidationMessage()
    } catch (err) {
      if (err.status === 409) {
        showConflictBanner(true)
        const conflictMsg = 'Files changed on disk since you loaded. Reload to get the latest, then re-apply your changes if needed.'
        state.lastDisplayError = { message: 'Save conflict', errors: [conflictMsg] }
        showActionModal({ state: 'error', message: conflictMsg, copyText: conflictMsg, onRetry: function () { hideActionModal(); loadModel() } })
        const validationEl = document.getElementById('validation-message')
        if (validationEl) validationEl.innerHTML = '<span class="errors">' + escapeHtml(conflictMsg) + '</span> <button type="button" class="btn-small" id="copy-validation-error-btn">Copy error</button>'
        bindCopyValidationError()
      } else {
        showConflictBanner(false)
        const msg = String(err.message || 'Save failed')
        const parts = msg.includes('; ') ? msg.split('; ') : [msg]
        state.lastDisplayError = { message: 'Save failed', errors: parts }
        showActionModal({ state: 'error', message: parts[0] || msg, copyText: msg, onRetry: function () { hideActionModal(); runSave() } })
        const validationEl = document.getElementById('validation-message')
        if (validationEl) validationEl.innerHTML = '<span class="errors">Save failed</span><ul class="errors">' + parts.map(function (p) { return '<li>' + escapeHtml(p) + '</li>' }).join('') + '</ul> <button type="button" class="btn-small" id="copy-validation-error-btn">Copy error</button>'
        bindCopyValidationError()
      }
      renderValidationMessage()
    } finally {
      state.loadingAction = null
      updateFooterButtons()
    }
  }

  async function runPreview () {
    if (state.loadingAction) return
    const last = state.lastValidation
    if (last && last.errors && last.errors.length > 0) {
      const validationEl = document.getElementById('validation-message')
      if (validationEl) validationEl.innerHTML = '<span class="errors">Fix validation errors before preview.</span>'
      return
    }
    state.loadingAction = 'preview'
    updateFooterButtons()
    showActionModal({ state: 'loading', message: 'Previewing…' })
    try {
      const summary = await apiSave(getEditedModel(), true)
      state.previewSummary = summary
      if (!summary || (summary.success === true && typeof summary.filesWouldWrite === 'undefined' && typeof summary.generatorsWouldRun === 'undefined')) {
        console.error('[Admin Editor] Preview request returned no preview summary. Expected { success, filesWouldWrite?, generatorsWouldRun?, backupPreview?, nextSteps? }.')
      }
      renderPreviewSummary()
      renderValidationMessage()
      const fileCount = summary.filesWouldWrite && summary.filesWouldWrite.length ? summary.filesWouldWrite.length : 0
      showActionModal({ state: 'success', message: fileCount ? 'Preview ready. ' + fileCount + ' file(s) would change. No writes performed.' : 'No file changes. No writes performed.' })
    } catch (err) {
      if (err.status === 409) {
        showConflictBanner(true)
        const conflictMsg = 'Files changed on disk since you loaded. Reload to get the latest, then re-apply your changes if needed.'
        state.lastDisplayError = { message: 'Preview conflict', errors: [conflictMsg] }
        showActionModal({ state: 'error', message: conflictMsg, copyText: conflictMsg, onRetry: function () { hideActionModal(); loadModel() } })
        const validationEl = document.getElementById('validation-message')
        if (validationEl) validationEl.innerHTML = '<span class="errors">' + escapeHtml(conflictMsg) + '</span> <button type="button" class="btn-small" id="copy-validation-error-btn">Copy error</button>'
        bindCopyValidationError()
      } else {
        const msg = String(err.message || 'Preview failed')
        const parts = msg.includes('; ') ? msg.split('; ') : [msg]
        state.lastDisplayError = { message: 'Preview failed', errors: parts }
        showActionModal({ state: 'error', message: parts[0] || msg, copyText: msg, onRetry: function () { hideActionModal(); runPreview() } })
        const list = parts.map(function (p) { return '<li>' + escapeHtml(p) + '</li>' }).join('')
        const validationEl = document.getElementById('validation-message')
        if (validationEl) validationEl.innerHTML = '<span class="errors">Preview failed</span><ul class="errors">' + list + '</ul> <button type="button" class="btn-small" id="copy-validation-error-btn">Copy error</button>'
        bindCopyValidationError()
      }
      renderValidationMessage()
    } finally {
      state.loadingAction = null
      updateFooterButtons()
    }
  }

  function bindEvents () {
    const tablist = document.querySelector('.tabs[role="tablist"]')
    if (tablist) {
      tablist.addEventListener('keydown', function (e) {
        const visible = getVisibleTabButtons()
        if (visible.length === 0) return
        const current = e.target
        if (current.getAttribute('role') !== 'tab' || current.closest('.tabs') !== tablist) return
        let idx = visible.indexOf(current)
        if (idx === -1) return
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
          e.preventDefault()
          idx = e.key === 'ArrowLeft' ? (idx - 1 + visible.length) % visible.length : (idx + 1) % visible.length
          const next = visible[idx]
          const tabId = next.getAttribute('data-tab')
          switchTab(tabId)
          next.focus()
        } else if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          switchTab(current.getAttribute('data-tab'))
        }
      })
    }
    document.querySelectorAll('.tabs button[role="tab"][data-tab]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        switchTab(this.getAttribute('data-tab'))
      })
    })
    document.querySelectorAll('.ace-nav-item[data-action="coming-soon"]').forEach(function (btn) {
      btn.onclick = function () {
        showActionModal({ state: 'success', title: 'Coming soon', message: 'This section is not available yet.' })
      }
    })
    document.querySelectorAll('.ace-nav-item[data-action="server-status"]').forEach(function (btn) {
      btn.onclick = function () {
        const connected = state.connected
        const loadedAt = state.loadedAt ? escapeHtml(state.loadedAt) : '—'
        const repoPath = (state.meta && state.meta.repoRoot) ? escapeHtml(state.meta.repoRoot) : '—'
        const statusClass = connected ? 'ace-server-state--connected' : 'ace-server-state--disconnected'
        const statusText = connected ? 'Connected' : 'Disconnected'
        const html = '<div class="ace-server-status">' +
          '<div class="ace-server-line"><span class="ace-server-label">Server:</span><span class="ace-server-value ace-server-state ' + statusClass + '">' + statusText + '</span></div>' +
          '<div class="ace-server-line"><span class="ace-server-label">Loaded:</span><span class="ace-server-value">' + loadedAt + '</span></div>' +
          '<div class="ace-server-line"><span class="ace-server-label">Repo:</span><span class="ace-server-value ace-server-mono">' + repoPath + '</span></div>' +
          '</div>'
        showActionModal({ state: 'success', title: 'Server Status', htmlMessage: html })
      }
    })
    document.getElementById('reload-btn').onclick = function () { loadModel() }
    document.getElementById('validate-btn').onclick = function () { runValidate() }
    document.getElementById('save-btn').onclick = function () { runSave() }
    document.getElementById('preview-btn').onclick = function () { runPreview() }
    document.getElementById('discard-all-btn').onclick = function () {
      if (!state.originalModel) return
      state.editedModel = deepClone(state.originalModel)
      showUnsavedBanner()
      renderAllPanels()
    }
    const reloadConflictBtn = document.getElementById('reload-after-conflict-btn')
    if (reloadConflictBtn) {
      reloadConflictBtn.onclick = function () {
        showConflictBanner(false)
        loadModel()
      }
    }
    const modal = document.getElementById('action-modal')
    const modalBackdrop = document.getElementById('action-modal-backdrop')
    const modalCloseBtn = document.getElementById('action-modal-close-btn')
    const modalCloseErrorBtn = document.getElementById('action-modal-close-error-btn')
    const modalCopyBtn = document.getElementById('action-modal-copy-btn')
    const modalRetryBtn = document.getElementById('action-modal-retry-btn')
    if (modalBackdrop) modalBackdrop.onclick = hideActionModal
    if (modalCloseBtn) modalCloseBtn.onclick = hideActionModal
    if (modalCloseErrorBtn) modalCloseErrorBtn.onclick = hideActionModal
    if (modalCopyBtn) {
      modalCopyBtn.onclick = function () {
        if (state.actionModalCopyText) {
          navigator.clipboard.writeText(state.actionModalCopyText).then(function () { modalCopyBtn.textContent = 'Copied!' })
        }
      }
    }
    if (modalRetryBtn) {
      modalRetryBtn.onclick = function () {
        if (typeof state.actionModalRetry === 'function') state.actionModalRetry()
      }
    }
  }

  function init () {
    bindEvents()
    updateFooterButtons()
    switchTab(state.selectedTab)
    loadModel()
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init)
  } else {
    init()
  }
})()
