/**
 * Admin Config Editor – Phase 2 browser UI.
 * Calls GET /api/model, POST /api/validate, POST /api/save only.
 * Does not write files directly; all writes go through the server.
 */

(function () {
  'use strict'

  var _cfg = (typeof window !== 'undefined' && window.__ACE_CONFIG__) || {}
  const API_BASE = _cfg.apiBase || ''
  const ACE_AUTH_MODE = _cfg.authMode || 'cookie'
  const ACE_DEBUG = typeof window !== 'undefined' && window.location && window.location.search.indexOf('ace_debug=1') !== -1

  const state = {
    auth: { user: null, role: null, allowedTabs: [], assistantScope: [] },
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
    actionModalCopyText: '',
    usersList: [],
    kbRegistry: [],
    kbRegistryFetched: false,
    selectedKbId: null,
    kbCreateMode: false,
    kbPreviewDoc: null,
    kbEditDoc: null
  }

  /** Must match admin-editor/src/kbSchema.ts KB_ID_REGEX (kebab-case). */
  const KB_ID_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

  var FETCH_OPTS = ACE_AUTH_MODE === 'bearer' ? {} : { credentials: 'include' }

  function _apiFetch (url, opts) {
    var merged = Object.assign({}, opts || {}, FETCH_OPTS)
    if (ACE_AUTH_MODE === 'bearer') {
      var tok = sessionStorage.getItem('ace_bearer_token') || ''
      if (tok) {
        merged.headers = Object.assign({}, merged.headers || {}, { 'Authorization': 'Bearer ' + tok })
      }
    }
    return fetch(url, merged)
  }
  /** Single label for "reset this section only" buttons (Config, AI, etc.) */
  const RESET_SECTION_BTN_LABEL = 'Reset this section only'

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

  function resolveBrandingLogoPath (rawPath) {
    var value = (rawPath || '').trim()
    if (!value) return ''
    try {
      return new URL(value, window.location.origin + '/').toString()
    } catch (_) {
      return value
    }
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
    if (!state.editedModel) return null
    var cloned = deepClone(state.editedModel)
    if (!cloned.config) cloned.config = {}
    if (!cloned.config.ui) cloned.config.ui = {}
    if (!cloned.config.ui.branding || typeof cloned.config.ui.branding !== 'object') cloned.config.ui.branding = {}
    if (typeof cloned.config.ui.branding.showLogo !== 'boolean') cloned.config.ui.branding.showLogo = true
    if (typeof cloned.config.ui.branding.showAppName !== 'boolean') cloned.config.ui.branding.showAppName = (typeof cloned.config.ui.branding.showName === 'boolean') ? cloned.config.ui.branding.showName : true
    if (typeof cloned.config.ui.branding.showName !== 'boolean') cloned.config.ui.branding.showName = cloned.config.ui.branding.showAppName
    if (typeof cloned.config.ui.branding.appName !== 'string') cloned.config.ui.branding.appName = ''
    if (typeof cloned.config.ui.branding.logline !== 'string') cloned.config.ui.branding.logline = ''
    if (typeof cloned.config.ui.branding.showLogline !== 'boolean') cloned.config.ui.branding.showLogline = !!cloned.config.ui.branding.logline.trim()
    if (typeof cloned.config.ui.branding.logoPath !== 'string') cloned.config.ui.branding.logoPath = ''
    if (!cloned.config.contentTable) cloned.config.contentTable = {}
    if (!cloned.config.contentTable.exclusionRules) cloned.config.contentTable.exclusionRules = { enabled: false, rules: [] }
    if (!Array.isArray(cloned.config.contentTable.exclusionRules.rules)) cloned.config.contentTable.exclusionRules.rules = []
    if (typeof cloned.config.contentTable.exclusionRules.enabled !== 'boolean') cloned.config.contentTable.exclusionRules.enabled = false
    return cloned
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
    const res = await _apiFetch(API_BASE + '/api/model', { cache: 'no-store' })
    if (!res.ok) throw new Error(res.statusText || 'Failed to load model')
    const data = await res.json()
    return data
  }

  async function apiValidate (payload) {
    const res = await _apiFetch(API_BASE + '/api/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.errors?.join(' ') || res.statusText || 'Validate failed')
    return data
  }

  // Baseline token: state.meta.revision. Set on Load (GET /api/model) and after Save success (POST /api/save response.meta). Validate does not update it. Save sends it; backend returns 409 if disk revision !== sent revision.
  async function apiSave (payload, dryRun) {
    const sentRevision = state.meta?.revision ?? ''
    const body = {
      model: payload,
      meta: { revision: sentRevision }
    }
    if (ACE_DEBUG) {
      var revLen = typeof sentRevision === 'string' ? sentRevision.length : 0
      console.log('[ACE Save] request: dryRun=' + !!dryRun + ', hasStateMeta=' + !!state.meta + ', meta.revision=' + (sentRevision || '(empty)') + ', revisionLength=' + revLen)
    }
    const url = API_BASE + '/api/save' + (dryRun ? '?dryRun=1' : '')
    const res = await _apiFetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    const data = await res.json()
    if (ACE_DEBUG) {
      var resRev = (data.meta && data.meta.revision) ? data.meta.revision : ''
      var resRevLen = typeof resRev === 'string' ? resRev.length : 0
      console.log('[ACE Save] response: status=' + res.status + ', success=' + (data.success === true) + (res.status === 200 ? ', meta.revisionLength=' + resRevLen + ', meta.revision=' + (resRev || '(missing)') : '') + (res.status === 409 ? ', serverRevisionLength=' + resRevLen + ', serverRevision=' + (resRev || '(missing)') : ''))
    }
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

  async function apiAuthMe () {
    const res = await _apiFetch(API_BASE + '/api/auth/me', {})
    if (!res.ok) return null
    const data = await res.json()
    return data
  }

  async function apiAuthBootstrapAllowed () {
    const res = await _apiFetch(API_BASE + '/api/auth/bootstrap-allowed', {})
    if (!res.ok) return { allowed: false, reason: 'Request failed' }
    const data = await res.json()
    return { allowed: !!data.allowed, reason: data.reason }
  }

  async function apiAuthLogin (username, password) {
    const res = await _apiFetch(API_BASE + '/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error || 'Login failed')
    if (data.token) sessionStorage.setItem('ace_bearer_token', data.token)
    return data.user
  }

  async function apiAuthBootstrap (username, password) {
    const res = await _apiFetch(API_BASE + '/api/auth/bootstrap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error || 'Bootstrap failed')
    if (data.token) sessionStorage.setItem('ace_bearer_token', data.token)
    return data.user
  }

  async function apiAuthLogout () {
    await _apiFetch(API_BASE + '/api/auth/logout', { method: 'POST' })
  }

  async function apiUsersList () {
    const res = await _apiFetch(API_BASE + '/api/users', {})
    if (!res.ok) throw new Error(res.status === 403 ? 'Forbidden' : (await res.json().catch(() => ({}))).error || 'Failed to list users')
    const data = await res.json()
    return data.users || []
  }

  async function apiUsersCreate (username, password, role) {
    const res = await _apiFetch(API_BASE + '/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, role })
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data.error || 'Create user failed')
    return data.user
  }

  // #region agent log (gated by ?ace_debug=1)
  function debugLog (location, message, data) {
    if (!ACE_DEBUG) return
    console.log('[ACE debug]', message, data)
  }
  // #endregion
  async function apiUsersUpdate (id, updates, requestId) {
    const url = API_BASE + '/api/users/' + encodeURIComponent(id)
    const headers = { 'Content-Type': 'application/json' }
    if (requestId) headers['X-ACE-Request-Id'] = requestId
    const bodyStr = JSON.stringify(updates)
    // #region agent log
    if (ACE_DEBUG) {
      debugLog('app.js:apiUsersUpdate:request', 'PATCH request', { requestId: requestId, url: url, method: 'PATCH', headers: headers, payload: updates, bodyStr: bodyStr })
      console.log('[apiUsersUpdate] request:', { requestId: requestId, url: url, method: 'PATCH', headers: headers, payload: updates, bodyStr: bodyStr })
    }
    // #endregion
    const res = await _apiFetch(url, {
      method: 'PATCH',
      headers: headers,
      body: bodyStr
    })
    const text = await res.text()
    let data = {}
    try {
      data = text ? JSON.parse(text) : {}
    } catch (_) {}
    const resHeaders = ACE_DEBUG ? (function () { var o = {}; try { res.headers.forEach(function (v, k) { o[k] = v }) } catch (_) {} return o }()) : {}
    // #region agent log
    if (ACE_DEBUG) {
      debugLog('app.js:apiUsersUpdate:response', 'PATCH response', { requestId: requestId, status: res.status, responseHeaders: resHeaders, responseText: text, parsed: data })
      console.log('[apiUsersUpdate] response:', { requestId: requestId, status: res.status, responseHeaders: resHeaders, responseText: text, parsed: data })
    }
    // #endregion
    if (!res.ok) throw new Error(data.error || 'Update user failed')
    return data.user
  }

  function showLoginView () {
    const loginView = document.getElementById('login-view')
    const bootstrapView = document.getElementById('bootstrap-view')
    const appShell = document.getElementById('app-shell')
    if (loginView) loginView.style.display = ''
    if (bootstrapView) bootstrapView.style.display = 'none'
    if (appShell) appShell.style.display = 'none'
  }

  function showBootstrapView () {
    const loginView = document.getElementById('login-view')
    const bootstrapView = document.getElementById('bootstrap-view')
    const appShell = document.getElementById('app-shell')
    if (loginView) loginView.style.display = 'none'
    if (bootstrapView) bootstrapView.style.display = ''
    if (appShell) appShell.style.display = 'none'
  }

  function showAppShell () {
    const loginView = document.getElementById('login-view')
    const bootstrapView = document.getElementById('bootstrap-view')
    const appShell = document.getElementById('app-shell')
    if (loginView) loginView.style.display = 'none'
    if (bootstrapView) bootstrapView.style.display = 'none'
    if (appShell) appShell.style.display = ''
  }

  function roleBadgeLabel (role) {
    if (!role) return ''
    const r = (role || '').toLowerCase()
    if (r === 'admin') return 'ADMIN'
    if (r === 'manager') return 'MANAGER'
    if (r === 'editor') return 'EDITOR'
    if (r === 'reviewer') return 'REVIEWER'
    return (role || '').toUpperCase()
  }

  function allowedTabsFromRole (role) {
    const r = (role || '').toLowerCase()
    if (r === 'admin') {
      return ['config', 'ai', 'assistants', 'knowledge-bases', 'content-models', 'registries', 'analytics', 'users']
    }
    if (r === 'manager' || r === 'editor') {
      return ['config', 'ai', 'assistants', 'knowledge-bases', 'content-models', 'registries', 'analytics']
    }
    return ['config', 'ai']
  }

  function renderNavProfileWidget () {
    const container = document.getElementById('ace-nav-profile-widget')
    if (!container) return
    const user = state.auth.user
    const role = state.auth.role
    if (!user || !role) {
      container.innerHTML = ''
      container.style.display = 'none'
      return
    }
    const name = (user.username || '').trim() || '—'
    container.innerHTML = '<div class="ace-nav-profile-widget-inner">' +
      '<img src="/assets/icons/ACEUserIcon.svg" alt="" class="ace-nav-profile-widget-icon" width="24" height="24" aria-hidden="true" />' +
      '<div class="ace-nav-profile-widget-body">' +
      '<span class="ace-nav-profile-widget-name" title="' + escapeHtml(name) + '">' + escapeHtml(name) + '</span>' +
      '<span class="ace-role-badge ace-role-badge--' + (role || '') + '">' + escapeHtml(roleBadgeLabel(role)) + '</span>' +
      '<a href="#" id="ace-nav-profile-logout" class="ace-nav-profile-widget-logout">Logout</a>' +
      '</div>' +
      '</div>'
    container.style.display = ''
    const logoutEl = document.getElementById('ace-nav-profile-logout')
    if (logoutEl) {
      logoutEl.onclick = function (e) {
        e.preventDefault()
        doLogout()
      }
    }
  }

  function applyAuthUI () {
    const role = state.auth.role
    const allowedTabs = state.auth.allowedTabs || []
    const validateBtn = document.getElementById('validate-btn')
    const previewBtn = document.getElementById('preview-btn')
    const saveBtn = document.getElementById('save-btn')
    const visibleTabIds = []
    const tabButtons = document.querySelectorAll('.tabs button[role="tab"][data-tab]')
    if (!tabButtons || !tabButtons.length) {
      if (ACE_DEBUG) console.warn('[ACE] applyAuthUI: no tab buttons found')
    }
    const assistantScope = state.auth.assistantScope || []
    const scopedHiddenTabs = new Set(['config', 'ai', 'registries', 'users'])
    tabButtons.forEach(function (btn) {
      const tabId = btn.getAttribute('data-tab')
      let show = false
      if (tabId === 'users') show = role === 'admin'
      else show = allowedTabs.indexOf(tabId) !== -1
      // Scoped users cannot see admin-only tabs regardless of role
      if (show && assistantScope.length > 0 && scopedHiddenTabs.has(tabId)) show = false
      btn.style.display = show ? '' : 'none'
      if (show) visibleTabIds.push(tabId)
    })
    if (ACE_DEBUG) {
      debugLog('app.js:applyAuthUI', 'nav visibility', { allowedTabs: allowedTabs, role: role, visibleTabIds: visibleTabIds })
    }
    const canValidateSave = role && role !== 'reviewer'
    if (validateBtn) validateBtn.style.display = canValidateSave ? '' : 'none'
    if (previewBtn) previewBtn.style.display = canValidateSave ? '' : 'none'
    if (saveBtn) saveBtn.style.display = canValidateSave ? '' : 'none'
    renderNavProfileWidget()
  }

  function bindAuthForms () {
    const loginForm = document.getElementById('login-form')
    const loginError = document.getElementById('login-error')
    const loginSubmit = document.getElementById('login-submit')
    const bootstrapForm = document.getElementById('bootstrap-form')
    const bootstrapError = document.getElementById('bootstrap-error')
    const bootstrapSubmit = document.getElementById('bootstrap-submit')
    if (loginForm) {
      loginForm.onsubmit = async function (e) {
        e.preventDefault()
        const username = (document.getElementById('login-username') || {}).value
        const password = (document.getElementById('login-password') || {}).value
        if (!username || !password) return
        if (loginError) { loginError.style.display = 'none'; loginError.textContent = '' }
        if (loginSubmit) loginSubmit.disabled = true
        try {
          await apiAuthLogin(username, password)
          const me = await apiAuthMe()
          if (!me || !me.user) throw new Error('Session not established')
          state.auth = {
            user: me.user,
            role: me.user.role,
            allowedTabs: Array.isArray(me.allowedTabs) && me.allowedTabs.length ? me.allowedTabs : allowedTabsFromRole(me.user.role),
            assistantScope: Array.isArray(me.assistantScope) ? me.assistantScope : []
          }
          showAppShell()
          applyAuthUI()
          bindEvents()
          updateFooterButtons()
          switchTab(state.selectedTab)
          loadModel()
        } catch (err) {
          if (loginError) {
            loginError.textContent = err.message || 'Login failed'
            loginError.style.display = 'block'
          }
        } finally {
          if (loginSubmit) loginSubmit.disabled = false
        }
      }
    }
    if (bootstrapForm) {
      bootstrapForm.onsubmit = async function (e) {
        e.preventDefault()
        const username = (document.getElementById('bootstrap-username') || {}).value
        const password = (document.getElementById('bootstrap-password') || {}).value
        if (!username || !password) return
        if (bootstrapError) { bootstrapError.style.display = 'none'; bootstrapError.textContent = '' }
        if (bootstrapSubmit) bootstrapSubmit.disabled = true
        try {
          await apiAuthBootstrap(username, password)
          const me = await apiAuthMe()
          if (!me || !me.user) throw new Error('Session not established')
          state.auth = {
            user: me.user,
            role: me.user.role,
            allowedTabs: Array.isArray(me.allowedTabs) && me.allowedTabs.length ? me.allowedTabs : allowedTabsFromRole(me.user.role),
            assistantScope: Array.isArray(me.assistantScope) ? me.assistantScope : []
          }
          showAppShell()
          applyAuthUI()
          bindEvents()
          updateFooterButtons()
          switchTab(state.selectedTab)
          loadModel()
        } catch (err) {
          if (bootstrapError) {
            bootstrapError.textContent = err.message || 'Create admin failed'
            bootstrapError.style.display = 'block'
          }
        } finally {
          if (bootstrapSubmit) bootstrapSubmit.disabled = false
        }
      }
    }
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
      state.kbRegistryFetched = false
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
  var CONFIG_SECTION_KEYS = ['default-mode', 'mode-settings', 'ai-api-endpoint', 'resource-links', 'credits', 'accessibility-hat', 'advanced-raw-json']
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
  function collapsibleSection (sectionId, title, bodyHtml, expanded, descriptionText) {
    var isExpanded = expanded === true
    var chevron = isExpanded ? 'ChevronUpIcon.svg' : 'ChevronDownIcon.svg'
    var headerContent
    if (descriptionText) {
      headerContent = '<div class="ace-section-header-inner">' +
        '<div class="ace-section-header-top">' +
        '<div class="ace-section-title">' + escapeHtml(title) + '</div>' +
        '<img class="ace-section-chevron" src="/assets/icons/' + chevron + '" alt="" aria-hidden="true" width="20" height="20" />' +
        '</div>' +
        '<div class="ace-section-description">' + escapeHtml(descriptionText) + '</div>' +
        '</div>'
    } else {
      headerContent = '<div class="ace-section-title">' + escapeHtml(title) + '</div>' +
        '<img class="ace-section-chevron" src="/assets/icons/' + chevron + '" alt="" aria-hidden="true" width="20" height="20" />'
    }
    return '<section class="ace-section ace-collapsible' + (isExpanded ? '' : ' is-collapsed') + '" data-section="' + escapeHtml(sectionId) + '">' +
      '<button type="button" class="ace-section-header" aria-expanded="' + (isExpanded ? 'true' : 'false') + '" aria-controls="section-' + escapeHtml(sectionId) + '-body">' +
      headerContent +
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
      let html = '<ul class="validation-errors-list">' + state.validation.errors.map(function (err) { return '<li class="errors">' + escapeHtml(err) + '</li>' }).join('') + '</ul>'
      if (hasWarn) html += '<div class="warnings">' + state.validation.warnings.map(escapeHtml).join('; ') + '</div>'
      if (hasErr) html += ' <button type="button" class="btn-small" id="copy-validation-error-btn">Copy error</button>'
      el.innerHTML = html
      bindCopyValidationError()
      updateFooterButtons()
      return
    }
    let html = ''
    if (last.errors && last.errors.length) html += '<ul class="validation-errors-list">' + last.errors.map(function (err) { return '<li class="errors">' + escapeHtml(err) + '</li>' }).join('') + '</ul>'
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
    if (!panel) return
    const m = state.editedModel
    if (!m || !m.config) {
      panel.innerHTML = '<p>No config loaded.</p>'
      return
    }
    const ui = m.config.ui || {}
    const assistants = state.editedModel?.assistantsManifest?.assistants || []
    const simpleSet = new Set(Array.isArray(ui.simpleModeIds) ? ui.simpleModeIds : [])
    /** Canonical order for both Simple and Advanced columns (Advanced design order first, then any others in manifest order). */
    const canonicalOrder = getAdvancedOrderedAssistants(assistants)
    const effectiveAdvancedIds = new Set(getEffectiveAdvancedModeIds(ui, assistants))

    let html = '<div class="ace-config-desc-bar">'
    html += '<p class="ace-config-page-desc">Plugin settings, display mode, and branding.</p>'
    html += '<button type="button" class="ace-config-reset-btn" id="reset-config-btn">' + RESET_SECTION_BTN_LABEL + '</button>'
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
        canonicalOrder.forEach(function (a) {
          var checked = simpleSet.has(a.id)
          o += '<label class="ace-checkbox-row"><input type="checkbox" class="config-simple-cb" data-id="' + escapeHtml(a.id) + '" ' + (checked ? 'checked' : '') + '> <span class="ace-checkbox-label">' + escapeHtml(a.label || a.id) + '</span></label>'
        })
        return o
      })() +
      '</div></div>' +
      '<div class="ace-mode-col"><h4 class="ace-mode-col-title">Advanced</h4><div class="ace-checkbox-list" id="config-advancedModeIds-checkboxes">' +
      (function () {
        var o = ''
        canonicalOrder.forEach(function (a) {
          var checked = effectiveAdvancedIds.has(a.id)
          o += '<label class="ace-checkbox-row"><input type="checkbox" class="config-advanced-cb" data-id="' + escapeHtml(a.id) + '" ' + (checked ? 'checked' : '') + '> <span class="ace-checkbox-label">' + escapeHtml(a.label || a.id) + '</span></label>'
        })
        return o
      })() +
      '</div></div></div></div>',
      expandedMap['mode-settings'])
    var legacyBranding = (m.config && m.config.branding && typeof m.config.branding === 'object') ? m.config.branding : {}
    var uiBranding = (m.config && m.config.ui && m.config.ui.branding && typeof m.config.ui.branding === 'object') ? m.config.ui.branding : null
    var brandingShowLogo = true
    var brandingShowAppName = true
    var brandingShowLogline = false
    var brandingAppName = ''
    var brandingLogline = ''
    var brandingLogoPath = ''
    if (uiBranding) {
      if (typeof uiBranding.showLogo === 'boolean') brandingShowLogo = uiBranding.showLogo
      if (typeof uiBranding.showAppName === 'boolean') brandingShowAppName = uiBranding.showAppName
      else if (typeof uiBranding.showName === 'boolean') brandingShowAppName = uiBranding.showName
      if (typeof uiBranding.showLogline === 'boolean') brandingShowLogline = uiBranding.showLogline
      if (typeof uiBranding.appName === 'string') brandingAppName = uiBranding.appName
      if (typeof uiBranding.logline === 'string') brandingLogline = uiBranding.logline
      if (typeof uiBranding.logoPath === 'string') brandingLogoPath = uiBranding.logoPath
    } else {
      if (legacyBranding.logoKey === 'none') brandingShowLogo = false
      if (typeof legacyBranding.appName === 'string') brandingAppName = legacyBranding.appName
      if (typeof legacyBranding.appTagline === 'string') brandingLogline = legacyBranding.appTagline
    }
    if (typeof uiBranding?.showLogline !== 'boolean') brandingShowLogline = !!(brandingLogline || '').trim()
    var brandingLogoResolved = resolveBrandingLogoPath(brandingLogoPath)
    html += collapsibleSection('branding', 'Branding',
      '<div class="ace-card">' +
      '<p class="ace-card-subtext">Configure display branding shown in plugin header.</p>' +
      '<div class="field-row"><label><input type="checkbox" id="config-ui-branding-showLogo" ' + (brandingShowLogo ? 'checked' : '') + '> Show Logo</label></div>' +
      '<div class="field-row"><label><input type="checkbox" id="config-ui-branding-showAppName" ' + (brandingShowAppName ? 'checked' : '') + '> Show App Name</label></div>' +
      '<div class="field-row"><label><input type="checkbox" id="config-ui-branding-showLogline" ' + (brandingShowLogline ? 'checked' : '') + '> Show Logline</label></div>' +
      '<label for="config-branding-appName" class="ace-field-label">App Name</label>' +
      '<input type="text" id="config-branding-appName" class="ace-text-input ace-field" placeholder="Ableza" value="' + escapeHtml(brandingAppName) + '">' +
      '<label for="config-branding-logline" class="ace-field-label">Logline</label>' +
      '<input type="text" id="config-branding-logline" class="ace-text-input ace-field" placeholder="AI Powered" value="' + escapeHtml(brandingLogline) + '">' +
      '<label for="config-branding-logoPath" class="ace-field-label">Logo Path</label>' +
      '<input type="text" id="config-branding-logoPath" class="ace-text-input ace-field ace-field--lg" placeholder="/assets/logo-figmai.svg" value="' + escapeHtml(brandingLogoPath) + '">' +
      '<div class="ace-card-subtext" style="margin-top:8px">Current Logo Preview</div>' +
      '<div style="display:flex;align-items:center;gap:10px;margin-top:4px">' +
      '<img id="config-branding-logoPreview" src="' + escapeHtml(brandingLogoResolved || '') + '" alt="Current logo preview" style="max-width:32px;max-height:32px;border:1px solid #ddd;border-radius:4px;object-fit:contain;' + (brandingLogoResolved ? '' : 'display:none;') + '">' +
      '<span id="config-branding-logoMissing" class="inline-error" style="' + (brandingLogoResolved ? 'display:none;' : 'display:inline;') + '">' + (brandingLogoResolved ? '' : 'Logo path is empty') + '</span>' +
      '</div>' +
      '<div class="ace-card-subtext" style="margin-top:6px">Resolved URL: <code id="config-branding-logoPathRaw">' + escapeHtml(brandingLogoResolved || '') + '</code></div>' +
      '</div>',
      expandedMap['branding'])
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
    var hatList = Array.isArray(m.config.accessibility && m.config.accessibility.hatRequiredComponents) ? m.config.accessibility.hatRequiredComponents.slice() : []
    html += collapsibleSection('accessibility-hat', 'Accessibility — HAT-required components',
      '<div class="ace-card ace-hat-components-card">' +
      '<p class="ace-card-subtext">Component/instance names that should always be treated as requiring HAT (accessible label). Used by Content Review Assistant &quot;Add HAT&quot; quick action.</p>' +
      '<div class="ace-hat-list" id="hat-required-components-list">' +
      hatList.map(function (name, idx) {
        return '<div class="ace-hat-row" data-index="' + idx + '"><span class="ace-hat-name">' + escapeHtml(name) + '</span><button type="button" class="ace-hat-remove" data-index="' + idx + '" aria-label="Remove">Remove</button></div>'
      }).join('') +
      '</div>' +
      '<div class="ace-hat-add-row">' +
      '<input type="text" id="hat-new-component-name" class="ace-text-input ace-field" placeholder="e.g. IconButton, ToolbarIconOnly">' +
      '<button type="button" id="hat-add-btn" class="ace-btn">Add</button>' +
      '</div></div>',
      expandedMap['accessibility-hat'])
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
        if (img) img.src = expanded ? '/assets/icons/ChevronUpIcon.svg' : '/assets/icons/ChevronDownIcon.svg'
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
        var canonicalOrder = getAdvancedOrderedAssistants(state.editedModel?.assistantsManifest?.assistants || [])
        const order = canonicalOrder.map(function (a) { return a.id }).filter(function (i) { return set.has(i) })
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

    // HAT-required components: ensure config.accessibility.hatRequiredComponents exists and wire Add/Remove
    if (!state.editedModel.config.accessibility) state.editedModel.config.accessibility = {}
    if (!Array.isArray(state.editedModel.config.accessibility.hatRequiredComponents)) state.editedModel.config.accessibility.hatRequiredComponents = []
    var hatListEl = document.getElementById('hat-required-components-list')
    var hatAddBtn = document.getElementById('hat-add-btn')
    var hatNewInput = document.getElementById('hat-new-component-name')
    if (hatAddBtn && hatNewInput && hatListEl) {
      hatAddBtn.onclick = function () {
        var name = (hatNewInput.value || '').trim()
        if (!name) return
        state.editedModel.config.accessibility.hatRequiredComponents.push(name)
        var row = document.createElement('div')
        row.className = 'ace-hat-row'
        row.innerHTML = '<span class="ace-hat-name">' + escapeHtml(name) + '</span><button type="button" class="ace-hat-remove" aria-label="Remove">Remove</button>'
        hatListEl.appendChild(row)
        row.querySelector('.ace-hat-remove').onclick = function () {
          var arr = state.editedModel.config.accessibility.hatRequiredComponents
          var i = arr.indexOf(name)
          if (i !== -1) arr.splice(i, 1)
          row.remove()
          showUnsavedBanner()
          updateFooterButtons()
        }
        hatNewInput.value = ''
        showUnsavedBanner()
        updateFooterButtons()
      }
    }
    if (hatListEl) {
      hatListEl.querySelectorAll('.ace-hat-remove').forEach(function (btn) {
        btn.onclick = function () {
          var row = btn.closest('.ace-hat-row')
          var nameEl = row && row.querySelector('.ace-hat-name')
          var name = nameEl ? nameEl.textContent : ''
          var arr = state.editedModel.config.accessibility.hatRequiredComponents
          var i = arr.indexOf(name)
          if (i !== -1) arr.splice(i, 1)
          if (row) row.remove()
          showUnsavedBanner()
          updateFooterButtons()
        }
      })
    }

    // Branding bindings
    function ensureUiBrandingConfig () {
      if (!state.editedModel.config) state.editedModel.config = {}
      if (!state.editedModel.config.ui) state.editedModel.config.ui = {}
      if (!state.editedModel.config.ui.branding || typeof state.editedModel.config.ui.branding !== 'object') {
        var legacy = (state.editedModel.config.branding && typeof state.editedModel.config.branding === 'object') ? state.editedModel.config.branding : {}
        state.editedModel.config.ui.branding = {
          showLogo: legacy.logoKey === 'none' ? false : true,
          showName: true,
          showAppName: true,
          showLogline: typeof legacy.appTagline === 'string' ? !!legacy.appTagline.trim() : false,
          appName: typeof legacy.appName === 'string' ? legacy.appName : '',
          logline: typeof legacy.appTagline === 'string' ? legacy.appTagline : '',
          logoPath: ''
        }
      }
      if (typeof state.editedModel.config.ui.branding.showAppName !== 'boolean') {
        state.editedModel.config.ui.branding.showAppName = (typeof state.editedModel.config.ui.branding.showName === 'boolean')
          ? state.editedModel.config.ui.branding.showName
          : true
      }
      if (typeof state.editedModel.config.ui.branding.showName !== 'boolean') {
        state.editedModel.config.ui.branding.showName = state.editedModel.config.ui.branding.showAppName
      }
      if (typeof state.editedModel.config.ui.branding.showLogline !== 'boolean') {
        var loglineValue = typeof state.editedModel.config.ui.branding.logline === 'string' ? state.editedModel.config.ui.branding.logline : ''
        state.editedModel.config.ui.branding.showLogline = !!loglineValue.trim()
      }
      if (typeof state.editedModel.config.ui.branding.logline !== 'string') state.editedModel.config.ui.branding.logline = ''
      if (typeof state.editedModel.config.ui.branding.logoPath !== 'string') state.editedModel.config.ui.branding.logoPath = ''
      return state.editedModel.config.ui.branding
    }
    var brandingShowLogoEl = document.getElementById('config-ui-branding-showLogo')
    if (brandingShowLogoEl) {
      brandingShowLogoEl.onchange = function () {
        ensureUiBrandingConfig().showLogo = !!this.checked
        showUnsavedBanner()
        updateFooterButtons()
      }
    }
    var brandingShowNameEl = document.getElementById('config-ui-branding-showAppName')
    if (brandingShowNameEl) {
      brandingShowNameEl.onchange = function () {
        ensureUiBrandingConfig().showAppName = !!this.checked
        ensureUiBrandingConfig().showName = !!this.checked
        showUnsavedBanner()
        updateFooterButtons()
      }
    }
    var brandingShowLoglineEl = document.getElementById('config-ui-branding-showLogline')
    if (brandingShowLoglineEl) {
      brandingShowLoglineEl.onchange = function () {
        ensureUiBrandingConfig().showLogline = !!this.checked
        showUnsavedBanner()
        updateFooterButtons()
      }
    }
    var brandingNameEl = document.getElementById('config-branding-appName')
    if (brandingNameEl) {
      brandingNameEl.oninput = brandingNameEl.onchange = function () {
        ensureUiBrandingConfig().appName = this.value
        showUnsavedBanner()
        updateFooterButtons()
      }
    }
    var brandingLoglineEl = document.getElementById('config-branding-logline')
    if (brandingLoglineEl) {
      brandingLoglineEl.oninput = brandingLoglineEl.onchange = function () {
        ensureUiBrandingConfig().logline = this.value
        showUnsavedBanner()
        updateFooterButtons()
      }
    }
    var brandingLogoPathEl = document.getElementById('config-branding-logoPath')
    if (brandingLogoPathEl) {
      brandingLogoPathEl.oninput = brandingLogoPathEl.onchange = function () {
        ensureUiBrandingConfig().logoPath = this.value
        var resolvedLogo = resolveBrandingLogoPath(this.value)
        var previewEl = document.getElementById('config-branding-logoPreview')
        var missingEl = document.getElementById('config-branding-logoMissing')
        var rawEl = document.getElementById('config-branding-logoPathRaw')
        if (previewEl) {
          if (resolvedLogo) {
            previewEl.style.display = 'inline-block'
            previewEl.src = resolvedLogo
          } else {
            previewEl.style.display = 'none'
          }
        }
        if (missingEl) {
          missingEl.style.display = resolvedLogo ? 'none' : 'inline'
          missingEl.textContent = resolvedLogo ? '' : 'Logo path is empty'
        }
        if (rawEl) rawEl.textContent = resolvedLogo || ''
        showUnsavedBanner()
        updateFooterButtons()
      }
    }
    var brandingLogoPreviewEl = document.getElementById('config-branding-logoPreview')
    if (brandingLogoPreviewEl) {
      brandingLogoPreviewEl.onerror = function () {
        this.style.display = 'none'
        var missingEl = document.getElementById('config-branding-logoMissing')
        var rawEl = document.getElementById('config-branding-logoPathRaw')
        if (missingEl) {
          missingEl.style.display = 'inline'
          missingEl.textContent = 'Logo not found at resolved URL: ' + ((rawEl && rawEl.textContent) ? rawEl.textContent : '(unknown)')
        }
      }
      brandingLogoPreviewEl.onload = function () {
        var missingEl = document.getElementById('config-branding-logoMissing')
        if (missingEl) {
          missingEl.style.display = 'none'
          missingEl.textContent = ''
        }
      }
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

  // ——— AI tab (AI API Endpoint section moved from General) ———
  function renderAITab () {
    const panel = document.getElementById('panel-ai')
    const m = state.editedModel
    if (!m || !m.config) {
      panel.innerHTML = '<p>No config loaded.</p>'
      return
    }
    const llm = m.config.llm || {}
    const llmProvider = llm.provider === 'proxy' ? 'proxy' : 'internal-api'
    const llmEndpoint = (typeof llm.endpoint === 'string' ? llm.endpoint : '') || ''
    const llmHideModelSettings = !!llm.hideModelSettings
    const llmUiModeConnectionOnly = llm.uiMode === 'connection-only'
    const llmHideInternalApi = !!llm.hideInternalApiSettings
    const llmHideProxy = !!llm.hideProxySettings
    const llmHideTestBtn = !!llm.hideTestConnectionButton
    const endpointEmpty = !llmEndpoint.trim()
    const proxy = llm.proxy || {}
    const proxyBaseUrl = (typeof proxy.baseUrl === 'string' ? proxy.baseUrl : '') || ''
    const proxyDefaultModel = (typeof proxy.defaultModel === 'string' ? proxy.defaultModel : '') || ''
    const proxyAuthMode = proxy.authMode === 'session_token' ? 'session_token' : 'shared_token'
    const proxySharedToken = (typeof proxy.sharedToken === 'string' ? proxy.sharedToken : '') || ''
    var expandedMap = loadSectionExpandedState()
    var html = '<div class="ace-section-header-row">'
    html += '<h2 class="ace-section-title">AI Settings</h2>'
    html += '<button type="button" class="ace-section-header-btn" id="reset-ai-btn">' + RESET_SECTION_BTN_LABEL + '</button>'
    html += '</div>'
    html += '<p id="ai-build-info" class="ace-build-info ace-text-muted" aria-live="polite">Build —</p>'
    html += '<div class="ace-config-cards ace-cards">'
    var cardInner = '<div class="ace-segmented-btns" role="group" aria-label="Provider">'
    cardInner += '<button type="button" class="ace-segmented-btn' + (llmProvider === 'internal-api' ? ' is-active' : '') + '" data-llm-provider="internal-api">Internal API</button>'
    cardInner += '<button type="button" class="ace-segmented-btn' + (llmProvider === 'proxy' ? ' is-active' : '') + '" data-llm-provider="proxy">Proxy</button>'
    cardInner += '</div>'
    cardInner += '<label class="ace-checkbox-row"><input type="checkbox" id="config-llm-hideInternalApiSettings"' + (llmHideInternalApi ? ' checked' : '') + '> <span class="ace-checkbox-label">Hide Internal API settings in plugin Settings</span></label>'
    cardInner += '<label class="ace-checkbox-row"><input type="checkbox" id="config-llm-hideProxySettings"' + (llmHideProxy ? ' checked' : '') + '> <span class="ace-checkbox-label">Hide Proxy settings in plugin Settings</span></label>'
    cardInner += '<label class="ace-checkbox-row"><input type="checkbox" id="config-llm-hideTestConnectionButton"' + (llmHideTestBtn ? ' checked' : '') + '> <span class="ace-checkbox-label">Hide Test Connection button in plugin Settings</span></label>'
    cardInner += '<div id="ai-internal-api-block" class="ace-llm-provider-block"' + (llmProvider === 'proxy' ? ' style="display:none"' : '') + '>'
    cardInner += '<label for="config-llm-endpoint" class="ace-field-label">Endpoint URL</label>'
    cardInner += '<input type="text" id="config-llm-endpoint" class="ace-text-input ace-field ace-field--lg" placeholder="Enter API Endpoint URL" value="' + escapeHtml(llmEndpoint) + '" aria-describedby="config-llm-endpoint-guardrail">'
    cardInner += '<p id="config-llm-endpoint-guardrail" class="ace-llm-guardrail" role="status"' + (endpointEmpty ? '' : ' hidden') + '>Set an endpoint to enable these options.</p>'
    cardInner += '<label class="ace-checkbox-row"><input type="checkbox" id="config-llm-hideModelSettings"' + (llmHideModelSettings ? ' checked' : '') + (endpointEmpty ? ' disabled' : '') + ' aria-describedby="config-llm-endpoint-guardrail"> <span class="ace-checkbox-label">Hide endpoint settings in plugin</span></label>'
    cardInner += '<label class="ace-checkbox-row"><input type="checkbox" id="config-llm-uiMode"' + (llmUiModeConnectionOnly ? ' checked' : '') + (endpointEmpty ? ' disabled' : '') + '> <span class="ace-checkbox-label">Show Test Connection button</span></label>'
    cardInner += '<p class="ace-card-helper" id="config-llm-uiMode-helper">Controls whether Settings show connection-only vs full model settings.</p>'
    cardInner += '</div>'
    cardInner += '<div id="ai-proxy-block" class="ace-llm-provider-block"' + (llmProvider === 'internal-api' ? ' style="display:none"' : '') + '>'
    cardInner += '<label for="config-llm-proxy-baseUrl" class="ace-field-label">Proxy Base URL</label>'
    cardInner += '<input type="text" id="config-llm-proxy-baseUrl" class="ace-text-input ace-field ace-field--lg" placeholder="https://..." value="' + escapeHtml(proxyBaseUrl) + '">'
    cardInner += '<label for="config-llm-proxy-defaultModel" class="ace-field-label">Default Model</label>'
    cardInner += '<input type="text" id="config-llm-proxy-defaultModel" class="ace-text-input ace-field ace-field--lg" placeholder="model name" value="' + escapeHtml(proxyDefaultModel) + '">'
    cardInner += '<label for="config-llm-proxy-authMode" class="ace-field-label">Authentication Mode</label>'
    cardInner += '<select id="config-llm-proxy-authMode" class="ace-text-input ace-field">'
    cardInner += '<option value="shared_token"' + (proxyAuthMode === 'shared_token' ? ' selected' : '') + '>shared_token</option>'
    cardInner += '<option value="session_token"' + (proxyAuthMode === 'session_token' ? ' selected' : '') + '>session_token</option>'
    cardInner += '</select>'
    cardInner += '<label for="config-llm-proxy-sharedToken" class="ace-field-label">Shared Token</label>'
    cardInner += '<input type="password" id="config-llm-proxy-sharedToken" class="ace-text-input ace-field ace-field--lg" placeholder="(optional)" value="' + escapeHtml(proxySharedToken) + '" autocomplete="off">'
    cardInner += '</div>'
    html += collapsibleSection('ai-api-endpoint', 'AI API Endpoint', '<div class="ace-card ace-llm-endpoint-card">' + cardInner + '</div>', expandedMap['ai-api-endpoint'], 'Configure how the plugin connects to AI services')
    html += '</div>'
    html += '<div class="ace-card ace-test-panel" style="margin-top:16px">'
    html += '<div style="font-size:1rem;font-weight:600;margin-bottom:6px">Connection Test</div>'
    html += '<p class="ace-card-helper" style="margin-bottom:10px">Test connectivity using the current (unsaved) AI settings above. No changes are saved before testing.</p>'
    html += '<button type="button" class="btn-primary" id="ace-test-connection-btn">Test Connection</button>'
    html += '<div id="ace-test-connection-result" role="status" aria-live="polite" style="margin-top:10px"></div>'
    html += '</div>'
    panel.innerHTML = html

    _apiFetch(API_BASE + '/api/build-info', {})
      .then(function (r) { return r.ok ? r.json() : null })
      .then(function (data) {
        var version = (data && typeof data.version === 'string') ? data.version : ''
        var buildId = (data && typeof data.buildId === 'string') ? data.buildId : undefined
        var el = document.getElementById('ai-build-info')
        if (!el) return
        if (version && buildId) {
          el.textContent = 'Build ' + version + ' (' + buildId + ')'
        } else if (version) {
          el.textContent = 'Build ' + version
        } else {
          el.textContent = 'Build unavailable'
        }
      })
      .catch(function () {
        var el = document.getElementById('ai-build-info')
        if (el) el.textContent = 'Build unavailable'
      })

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
        if (img) img.src = expanded ? '/assets/icons/ChevronUpIcon.svg' : '/assets/icons/ChevronDownIcon.svg'
      }
    })

    panel.querySelectorAll('.ace-segmented-btn[data-llm-provider]').forEach(function (btn) {
      btn.onclick = function () {
        var provider = this.getAttribute('data-llm-provider')
        if (!state.editedModel.config) state.editedModel.config = {}
        if (!state.editedModel.config.llm) state.editedModel.config.llm = {}
        state.editedModel.config.llm.provider = provider === 'proxy' ? 'proxy' : 'internal-api'
        panel.querySelectorAll('.ace-segmented-btn[data-llm-provider]').forEach(function (b) { b.classList.toggle('is-active', b === btn) })
        document.getElementById('ai-internal-api-block').style.display = provider === 'proxy' ? 'none' : ''
        document.getElementById('ai-proxy-block').style.display = provider === 'proxy' ? '' : 'none'
        showUnsavedBanner()
        updateFooterButtons()
      }
    })

    document.getElementById('reset-ai-btn').onclick = function () {
      if (!state.originalModel) return
      var origLlm = state.originalModel.config && state.originalModel.config.llm ? state.originalModel.config.llm : {}
      var editLlm = state.editedModel.config && state.editedModel.config.llm ? state.editedModel.config.llm : {}
      if (deepEqual(origLlm, editLlm)) return
      if (!confirm('Reset changes for AI?')) return
      if (!state.editedModel.config) state.editedModel.config = {}
      state.editedModel.config.llm = state.originalModel.config && state.originalModel.config.llm ? deepClone(state.originalModel.config.llm) : {}
      showUnsavedBanner()
      renderAITab()
      updateFooterButtons()
    }

    function updateLlmGuardrail () {
      const endpointEl = document.getElementById('config-llm-endpoint')
      const guardrailEl = document.getElementById('config-llm-endpoint-guardrail')
      const hideCb = document.getElementById('config-llm-hideModelSettings')
      const uiModeCb = document.getElementById('config-llm-uiMode')
      const endpointVal = endpointEl ? endpointEl.value : ''
      const empty = !endpointVal.trim()
      if (guardrailEl) guardrailEl.hidden = !empty
      if (hideCb) hideCb.disabled = empty
      if (uiModeCb) uiModeCb.disabled = empty
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
    const uiModeCb = document.getElementById('config-llm-uiMode')
    if (uiModeCb) {
      uiModeCb.onchange = function () {
        if (!state.editedModel.config) return
        if (!state.editedModel.config.llm) state.editedModel.config.llm = {}
        state.editedModel.config.llm.uiMode = this.checked ? 'connection-only' : 'full'
        showUnsavedBanner()
        updateFooterButtons()
      }
    }
    const hideInternalApiCb = document.getElementById('config-llm-hideInternalApiSettings')
    if (hideInternalApiCb) {
      hideInternalApiCb.onchange = function () {
        if (!state.editedModel.config) return
        if (!state.editedModel.config.llm) state.editedModel.config.llm = {}
        state.editedModel.config.llm.hideInternalApiSettings = this.checked
        showUnsavedBanner()
        updateFooterButtons()
      }
    }
    const hideProxyCb = document.getElementById('config-llm-hideProxySettings')
    if (hideProxyCb) {
      hideProxyCb.onchange = function () {
        if (!state.editedModel.config) return
        if (!state.editedModel.config.llm) state.editedModel.config.llm = {}
        state.editedModel.config.llm.hideProxySettings = this.checked
        showUnsavedBanner()
        updateFooterButtons()
      }
    }
    const hideTestBtnCb = document.getElementById('config-llm-hideTestConnectionButton')
    if (hideTestBtnCb) {
      hideTestBtnCb.onchange = function () {
        if (!state.editedModel.config) return
        if (!state.editedModel.config.llm) state.editedModel.config.llm = {}
        state.editedModel.config.llm.hideTestConnectionButton = this.checked
        showUnsavedBanner()
        updateFooterButtons()
      }
    }
    const proxyBaseUrlInput = document.getElementById('config-llm-proxy-baseUrl')
    if (proxyBaseUrlInput) {
      proxyBaseUrlInput.oninput = proxyBaseUrlInput.onchange = function () {
        if (!state.editedModel.config) return
        if (!state.editedModel.config.llm) state.editedModel.config.llm = {}
        if (!state.editedModel.config.llm.proxy) state.editedModel.config.llm.proxy = {}
        state.editedModel.config.llm.proxy.baseUrl = this.value
        showUnsavedBanner()
        updateFooterButtons()
      }
    }
    const proxyDefaultModelInput = document.getElementById('config-llm-proxy-defaultModel')
    if (proxyDefaultModelInput) {
      proxyDefaultModelInput.oninput = proxyDefaultModelInput.onchange = function () {
        if (!state.editedModel.config) return
        if (!state.editedModel.config.llm) state.editedModel.config.llm = {}
        if (!state.editedModel.config.llm.proxy) state.editedModel.config.llm.proxy = {}
        state.editedModel.config.llm.proxy.defaultModel = this.value
        showUnsavedBanner()
        updateFooterButtons()
      }
    }
    const proxyAuthModeSelect = document.getElementById('config-llm-proxy-authMode')
    if (proxyAuthModeSelect) {
      proxyAuthModeSelect.onchange = function () {
        if (!state.editedModel.config) return
        if (!state.editedModel.config.llm) state.editedModel.config.llm = {}
        if (!state.editedModel.config.llm.proxy) state.editedModel.config.llm.proxy = {}
        state.editedModel.config.llm.proxy.authMode = this.value === 'session_token' ? 'session_token' : 'shared_token'
        showUnsavedBanner()
        updateFooterButtons()
      }
    }
    const proxySharedTokenInput = document.getElementById('config-llm-proxy-sharedToken')
    if (proxySharedTokenInput) {
      proxySharedTokenInput.oninput = proxySharedTokenInput.onchange = function () {
        if (!state.editedModel.config) return
        if (!state.editedModel.config.llm) state.editedModel.config.llm = {}
        if (!state.editedModel.config.llm.proxy) state.editedModel.config.llm.proxy = {}
        state.editedModel.config.llm.proxy.sharedToken = this.value
        showUnsavedBanner()
        updateFooterButtons()
      }
    }

    const testConnBtn = document.getElementById('ace-test-connection-btn')
    if (testConnBtn) {
      testConnBtn.onclick = async function () {
        testConnBtn.disabled = true
        testConnBtn.textContent = 'Testing...'
        var resultEl = document.getElementById('ace-test-connection-result')
        if (resultEl) { resultEl.className = ''; resultEl.textContent = '' }
        try {
          var llm = (state.editedModel && state.editedModel.config && state.editedModel.config.llm) ? state.editedModel.config.llm : {}
          var provider = llm.provider === 'proxy' ? 'proxy' : 'internal-api'
          var rawProxy = llm.proxy || {}
          var normalizedProxy = {
            baseUrl: rawProxy.baseUrl || '',
            defaultModel: rawProxy.defaultModel || '',
            authMode: rawProxy.authMode === 'session_token' ? 'session_token' : 'shared_token',
            sharedToken: rawProxy.sharedToken || ''
          }
          var body = { provider: provider, endpoint: llm.endpoint || '', proxy: normalizedProxy }
          var res = await _apiFetch(API_BASE + '/api/test/connection', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
          })
          var data = await res.json()
          if (resultEl) {
            resultEl.className = 'ace-test-result ' + (data.success ? 'ace-test-result--success' : 'ace-test-result--error')
            resultEl.textContent = data.message || (data.success ? 'Connection successful.' : 'Connection failed.')
          }
        } catch (err) {
          if (resultEl) {
            resultEl.className = 'ace-test-result ace-test-result--error'
            resultEl.textContent = 'Test request failed: ' + ((err && err.message) ? err.message : String(err))
          }
        } finally {
          testConnBtn.disabled = false
          testConnBtn.textContent = 'Test Connection'
        }
      }
    }
  }

  // ——— Assistants tab ———
  function renderAssistantsTab () {
    if (state.selectedAssistantId && !state.kbRegistryFetched) {
      fetchKbRegistry().then(function () { state.kbRegistryFetched = true; renderAssistantsTab() }).catch(function () { state.kbRegistryFetched = true; state.kbRegistry = []; renderAssistantsTab() })
    }
    const panel = document.getElementById('panel-assistants')
    const m = state.editedModel
    const _allAssistants = m?.assistantsManifest?.assistants || []
    const _scope = state.auth.assistantScope || []
    const list = _scope.length > 0 ? _allAssistants.filter(function (a) { return _scope.includes(a.id) }) : _allAssistants
    const simpleIds = new Set((m?.config?.ui?.simpleModeIds) || [])
    const search = (document.getElementById('assistants-search') || {}).value || ''
    const showHidden = (document.getElementById('assistants-show-hidden') || {}).checked !== false
    const filtered = list.filter(a => {
      const matchSearch = !search || a.id.toLowerCase().includes(search.toLowerCase()) || (a.label && a.label.toLowerCase().includes(search.toLowerCase()))
      const inSimple = simpleIds.has(a.id)
      const visible = showHidden || inSimple
      return matchSearch && visible
    })

    let html = '<div class="ace-section-header-row">'
    html += '<h2 class="ace-section-title">Assistants</h2>'
    html += '<button type="button" class="ace-section-header-btn" id="reset-assistants-btn">' + RESET_SECTION_BTN_LABEL + '</button>'
    html += '</div>'
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
    if (a.kind === 'tool') {
      var ts = a.toolSettings || {}
      html += '<div class="section-title">Tool Settings</div>'
      html += '<label>Default content model</label><input type="text" id="ae-ts-defaultContentModel" class="ace-field" value="' + escapeHtml(ts.defaultContentModel || '') + '" placeholder="e.g. universal">'
      html += '<div class="field-row"><label><input type="checkbox" id="ae-ts-dedupeDefault" ' + (ts.dedupeDefault ? 'checked' : '') + '> Dedupe default (on)</label></div>'
      html += '<label>Quick actions location</label><select id="ae-ts-quickActionsLocation"><option value="inline"' + ((ts.quickActionsLocation || 'inline') === 'inline' ? ' selected' : '') + '>inline</option><option value="top"' + (ts.quickActionsLocation === 'top' ? ' selected' : '') + '>top</option><option value="bottom"' + (ts.quickActionsLocation === 'bottom' ? ' selected' : '') + '>bottom</option></select>'
      html += '<div class="field-row"><label><input type="checkbox" id="ae-ts-showInput" ' + (ts.showInput ? 'checked' : '') + '> Show text input</label></div>'
    }
    html += '<div class="section-title">Quick actions</div>'
    html += '<p class="ace-qa-execution-type-helper fg-secondary">Execution type: <strong>ui-only</strong> = handled in UI, does not call main; <strong>tool-only</strong> = main/handler only, no LLM; <strong>llm</strong> = calls provider (sendChatWithRecovery); <strong>hybrid</strong> = tool + LLM / mixed steps.</p>'
    html += '<ul class="quick-actions-list" id="ae-quickActions">'
    const EXECUTION_TYPES = ['ui-only', 'tool-only', 'llm', 'hybrid']
    ;(a.quickActions || []).forEach((qa, i) => {
      const execType = (qa.executionType && EXECUTION_TYPES.includes(qa.executionType)) ? qa.executionType : 'llm'
      html += '<li class="quick-action-row">'
      html += '<input type="text" placeholder="id" value="' + escapeHtml(qa.id) + '" data-i="' + i + '" data-field="id" class="ae-qa-id">'
      html += '<input type="text" placeholder="label" value="' + escapeHtml(qa.label || '') + '" data-i="' + i + '" data-field="label" class="ae-qa-label">'
      html += '<label class="ae-qa-exec-label">Execution type</label><select class="ae-qa-exec-select" data-i="' + i + '" data-field="executionType">'
      EXECUTION_TYPES.forEach(opt => { html += '<option value="' + escapeHtml(opt) + '"' + (execType === opt ? ' selected' : '') + '>' + escapeHtml(opt) + '</option>' })
      html += '</select>'
      html += '<button type="button" class="btn-small ae-qa-remove" data-i="' + i + '">Remove</button></li>'
    })
    html += '</ul><button type="button" class="btn-small add-btn" id="ae-qa-add">Add quick action</button>'
    // Optional structured config (PR7)
    html += '<div class="section-title">Structured instructions</div>'
    html += '<ul class="instruction-blocks-list" id="ae-instructionBlocks">'
    const blocks = a.instructionBlocks || []
    const BLOCK_KINDS = ['system', 'behavior', 'rules', 'examples', 'format', 'context']
    blocks.forEach((block, i) => {
      html += '<li class="instruction-block-row" data-i="' + i + '">'
      html += '<label>Kind</label><select class="ae-ib-kind" data-i="' + i + '">'
      BLOCK_KINDS.forEach(k => { html += '<option value="' + k + '"' + ((block.kind || 'behavior') === k ? ' selected' : '') + '>' + k + '</option>' })
      html += '</select>'
      html += '<label>Content</label><textarea class="ae-ib-content ace-field" rows="3" data-i="' + i + '">' + escapeHtml(block.content || '') + '</textarea>'
      html += '<div class="field-row"><label><input type="checkbox" class="ae-ib-enabled" data-i="' + i + '" ' + (block.enabled !== false ? 'checked' : '') + '> Enabled</label></div>'
      html += '<div class="instruction-block-actions"><button type="button" class="btn-small ae-ib-up" data-i="' + i + '">Up</button><button type="button" class="btn-small ae-ib-down" data-i="' + i + '">Down</button><button type="button" class="btn-small ae-ib-remove" data-i="' + i + '">Remove</button></div></li>'
    })
    html += '</ul><button type="button" class="btn-small add-btn" id="ae-ib-add">Add block</button>'
    html += '<label>Tone/style preset</label><input type="text" id="ae-toneStylePreset" class="ace-field" value="' + escapeHtml(a.toneStylePreset || '') + '" placeholder="e.g. professional">'
    html += '<label>Output schema ID</label><input type="text" id="ae-outputSchemaId" class="ace-field" value="' + escapeHtml(a.outputSchemaId || '') + '" placeholder="Schema id">'
    html += '<label>Resource refs</label>'
    const kbRegistry = state.kbRegistry || []
    if (!state.kbRegistryFetched) {
      html += '<p class="fg-secondary">Loading resources…</p>'
    } else {
      html += '<p class="fg-secondary">Select resources; order matters for injection.</p>'
      html += '<div class="ae-kb-refs-list" id="ae-kb-refs-checkboxes">'
      kbRegistry.forEach(function (entry) {
        const refs = a.knowledgeBaseRefs || []
        const checked = refs.indexOf(entry.id) !== -1
        html += '<label class="field-row ae-kb-ref-cb"><input type="checkbox" class="ae-kb-ref-cb-input" data-id="' + escapeHtml(entry.id) + '" ' + (checked ? 'checked' : '') + '> <span>' + escapeHtml(entry.title || entry.id) + '</span> <span class="fg-secondary" style="font-size:0.9em">(' + escapeHtml(entry.id) + ')</span></label>'
      })
      html += '</div>'
      html += '<div class="ae-kb-refs-selected" id="ae-kb-refs-selected"><span class="fg-secondary">Selected (order):</span> <span id="ae-kb-refs-order"></span></div>'
      html += '<div class="ae-kb-refs-reorder" id="ae-kb-refs-reorder"></div>'
    }
    html += '<div class="field-row"><label><input type="checkbox" id="ae-allowImages" ' + (a.safetyOverrides?.allowImages ? 'checked' : '') + '> Safety: allow images</label></div>'
    html += '<label>Prompt template</label><textarea id="ae-promptTemplate" class="large ace-field ace-field--lg" rows="12">' + escapeHtml(a.promptTemplate || '') + '</textarea>'
    html += '<div class="ace-test-panel" style="margin-top:16px;padding:12px;border:1px solid var(--ace-border);border-radius:var(--ace-radius);background:var(--bg-secondary)">'
    html += '<div style="font-size:0.9rem;font-weight:600;margin-bottom:6px">Test this assistant (draft)</div>'
    html += '<p class="ace-card-helper" style="margin-bottom:8px;font-size:0.8rem">Run a real LLM request using current unsaved settings. Provider must be configured in the AI tab. kbName: <code>figma</code> (first slice — hardcoded).</p>'
    html += '<label for="ae-test-message" style="font-size:0.85rem">Test message</label>'
    html += '<textarea id="ae-test-message" class="ace-field" rows="3" placeholder="Enter a test message..." style="margin-top:4px"></textarea>'
    html += '<div style="margin-top:8px"><button type="button" class="btn-primary" id="ae-test-run-btn">Run Test</button></div>'
    html += '<div id="ae-test-result" role="status" aria-live="polite" style="margin-top:10px"></div>'
    html += '</div>'
    return html
  }

  const EXECUTION_TYPES_ACE = ['ui-only', 'tool-only', 'llm', 'hybrid']
  function ensureQuickActionExecutionTypes (a) {
    if (!a.quickActions) return
    a.quickActions.forEach(qa => {
      if (!qa.executionType || !EXECUTION_TYPES_ACE.includes(qa.executionType)) qa.executionType = 'llm'
    })
  }

  function bindAssistantEditor () {
    const a = (state.editedModel?.assistantsManifest?.assistants || []).find(x => x.id === state.selectedAssistantId)
    if (!a) return
    ensureQuickActionExecutionTypes(a)
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
    document.getElementById('ae-kind').onchange = function () { set('ae-kind', 'kind', this.value); renderAssistantsTab() }
    document.getElementById('ae-promptTemplate').onchange = function () { set('ae-promptTemplate', 'promptTemplate', this.value) }
    if (a.kind === 'tool') {
      var tsEl1 = document.getElementById('ae-ts-defaultContentModel')
      if (tsEl1) tsEl1.onchange = function () { if (!a.toolSettings) a.toolSettings = {}; a.toolSettings.defaultContentModel = this.value || undefined; showUnsavedBanner() }
      var tsEl2 = document.getElementById('ae-ts-dedupeDefault')
      if (tsEl2) tsEl2.onchange = function () { if (!a.toolSettings) a.toolSettings = {}; a.toolSettings.dedupeDefault = this.checked; showUnsavedBanner() }
      var tsEl3 = document.getElementById('ae-ts-quickActionsLocation')
      if (tsEl3) tsEl3.onchange = function () { if (!a.toolSettings) a.toolSettings = {}; a.toolSettings.quickActionsLocation = this.value; showUnsavedBanner() }
      var tsEl4 = document.getElementById('ae-ts-showInput')
      if (tsEl4) tsEl4.onchange = function () { if (!a.toolSettings) a.toolSettings = {}; a.toolSettings.showInput = this.checked; showUnsavedBanner() }
    }
    document.querySelectorAll('.ae-qa-remove').forEach(btn => {
      btn.onclick = function () {
        const i = parseInt(this.getAttribute('data-i'), 10)
        a.quickActions.splice(i, 1)
        showUnsavedBanner()
        renderAssistantsTab()
      }
    })
    document.querySelectorAll('#ae-quickActions input, #ae-quickActions select').forEach(el => {
      const handler = function () {
        const i = parseInt(this.getAttribute('data-i'), 10)
        const field = this.getAttribute('data-field')
        if (a.quickActions[i]) a.quickActions[i][field] = this.value
        showUnsavedBanner()
      }
      el.onchange = handler
      if (el.tagName === 'INPUT') el.oninput = handler
    })
    const addBtn = document.getElementById('ae-qa-add')
    if (addBtn) addBtn.onclick = function () {
      a.quickActions = a.quickActions || []
      a.quickActions.push({ id: 'new-action', label: 'New action', templateMessage: '', executionType: 'llm' })
      showUnsavedBanner()
      renderAssistantsTab()
    }
    // Structured instructions (PR7)
    if (!a.instructionBlocks) a.instructionBlocks = []
    document.querySelectorAll('.ae-ib-kind').forEach(el => {
      el.onchange = function () {
        const i = parseInt(this.getAttribute('data-i'), 10)
        if (a.instructionBlocks[i]) a.instructionBlocks[i].kind = this.value
        showUnsavedBanner()
      }
    })
    document.querySelectorAll('.ae-ib-content').forEach(el => {
      const handler = function () {
        const i = parseInt(this.getAttribute('data-i'), 10)
        if (a.instructionBlocks[i]) a.instructionBlocks[i].content = this.value
        showUnsavedBanner()
      }
      el.onchange = handler
      el.oninput = handler
    })
    document.querySelectorAll('.ae-ib-enabled').forEach(el => {
      el.onchange = function () {
        const i = parseInt(this.getAttribute('data-i'), 10)
        if (a.instructionBlocks[i]) a.instructionBlocks[i].enabled = this.checked
        showUnsavedBanner()
      }
    })
    document.querySelectorAll('.ae-ib-remove').forEach(btn => {
      btn.onclick = function () {
        const i = parseInt(this.getAttribute('data-i'), 10)
        a.instructionBlocks.splice(i, 1)
        showUnsavedBanner()
        renderAssistantsTab()
      }
    })
    document.querySelectorAll('.ae-ib-up').forEach(btn => {
      btn.onclick = function () {
        const i = parseInt(this.getAttribute('data-i'), 10)
        if (i <= 0) return
        const t = a.instructionBlocks[i]
        a.instructionBlocks[i] = a.instructionBlocks[i - 1]
        a.instructionBlocks[i - 1] = t
        showUnsavedBanner()
        renderAssistantsTab()
      }
    })
    document.querySelectorAll('.ae-ib-down').forEach(btn => {
      btn.onclick = function () {
        const i = parseInt(this.getAttribute('data-i'), 10)
        if (i >= a.instructionBlocks.length - 1) return
        const t = a.instructionBlocks[i]
        a.instructionBlocks[i] = a.instructionBlocks[i + 1]
        a.instructionBlocks[i + 1] = t
        showUnsavedBanner()
        renderAssistantsTab()
      }
    })
    const ibAdd = document.getElementById('ae-ib-add')
    if (ibAdd) ibAdd.onclick = function () {
      a.instructionBlocks = a.instructionBlocks || []
      a.instructionBlocks.push({ id: 'block-' + Date.now(), kind: 'behavior', content: '', enabled: true })
      showUnsavedBanner()
      renderAssistantsTab()
    }
    const toneEl = document.getElementById('ae-toneStylePreset')
    if (toneEl) toneEl.onchange = function () { a.toneStylePreset = this.value || undefined; showUnsavedBanner() }
    if (toneEl) toneEl.oninput = function () { a.toneStylePreset = this.value || undefined; showUnsavedBanner() }
    const schemaEl = document.getElementById('ae-outputSchemaId')
    if (schemaEl) schemaEl.onchange = function () { a.outputSchemaId = this.value || undefined; showUnsavedBanner() }
    if (schemaEl) schemaEl.oninput = function () { a.outputSchemaId = this.value || undefined; showUnsavedBanner() }
    // KB refs: checkboxes + order (registry-backed)
    const refsCheckboxes = document.querySelectorAll('.ae-kb-ref-cb-input')
    const refsOrderEl = document.getElementById('ae-kb-refs-order')
    const refsReorderEl = document.getElementById('ae-kb-refs-reorder')
    function syncKbRefsFromCheckboxes () {
      const current = a.knowledgeBaseRefs || []
      const checked = []
      refsCheckboxes.forEach(function (cb) {
        if (cb.checked) checked.push(cb.getAttribute('data-id'))
      })
      const ordered = current.filter(function (id) { return checked.indexOf(id) !== -1 })
      checked.forEach(function (id) { if (ordered.indexOf(id) === -1) ordered.push(id) })
      a.knowledgeBaseRefs = ordered.length ? ordered : undefined
      showUnsavedBanner()
      renderKbRefsOrder()
    }
    function renderKbRefsOrder () {
      const ordered = a.knowledgeBaseRefs || []
      if (!refsOrderEl) return
      refsOrderEl.textContent = ordered.length ? ordered.join(', ') : '—'
      if (!refsReorderEl) return
      refsReorderEl.innerHTML = ''
      ordered.forEach(function (id, idx) {
        const label = (state.kbRegistry || []).find(function (e) { return e.id === id })
        const title = label ? (label.title || id) : id
        const div = document.createElement('div')
        div.className = 'field-row ae-kb-ref-order-row'
        div.innerHTML = '<span class="ae-kb-ref-order-label">' + escapeHtml(title) + ' <span class="fg-secondary">(' + escapeHtml(id) + ')</span></span>' +
          '<button type="button" class="btn-small ae-kb-ref-up" data-idx="' + idx + '">Up</button>' +
          '<button type="button" class="btn-small ae-kb-ref-down" data-idx="' + idx + '">Down</button>'
        refsReorderEl.appendChild(div)
      })
      refsReorderEl.querySelectorAll('.ae-kb-ref-up').forEach(function (btn) {
        btn.onclick = function () {
          const idx = parseInt(this.getAttribute('data-idx'), 10)
          if (idx <= 0) return
          const arr = (a.knowledgeBaseRefs || []).slice()
          const t = arr[idx]; arr[idx] = arr[idx - 1]; arr[idx - 1] = t
          a.knowledgeBaseRefs = arr
          showUnsavedBanner()
          renderKbRefsOrder()
        }
      })
      refsReorderEl.querySelectorAll('.ae-kb-ref-down').forEach(function (btn) {
        btn.onclick = function () {
          const idx = parseInt(this.getAttribute('data-idx'), 10)
          const arr = a.knowledgeBaseRefs || []
          if (idx >= arr.length - 1) return
          const t = arr[idx]; arr[idx] = arr[idx + 1]; arr[idx + 1] = t
          a.knowledgeBaseRefs = arr
          showUnsavedBanner()
          renderKbRefsOrder()
        }
      })
    }
    refsCheckboxes.forEach(function (cb) {
      cb.onchange = syncKbRefsFromCheckboxes
    })
    renderKbRefsOrder()
    const allowImg = document.getElementById('ae-allowImages')
    if (allowImg) allowImg.onchange = function () {
      if (!a.safetyOverrides) a.safetyOverrides = {}
      a.safetyOverrides.allowImages = this.checked || undefined
      showUnsavedBanner()
    }

    const testRunBtn = document.getElementById('ae-test-run-btn')
    if (testRunBtn) {
      testRunBtn.onclick = async function () {
        var msgEl = document.getElementById('ae-test-message')
        var resultEl = document.getElementById('ae-test-result')
        var msg = msgEl ? msgEl.value.trim() : ''
        if (!msg) {
          if (resultEl) { resultEl.className = 'ace-test-result ace-test-result--error'; resultEl.textContent = 'Enter a test message.' }
          return
        }
        testRunBtn.disabled = true
        testRunBtn.textContent = 'Running...'
        if (resultEl) { resultEl.className = ''; resultEl.textContent = '' }
        try {
          var llm = (state.editedModel && state.editedModel.config && state.editedModel.config.llm) ? state.editedModel.config.llm : {}
          var provider = llm.provider === 'proxy' ? 'proxy' : 'internal-api'
          var assistantDraft = { id: a.id, promptTemplate: a.promptTemplate || '', instructionBlocks: a.instructionBlocks || [] }
          // Normalize proxy: always include authMode with the same default renderAITab uses (shared_token).
          // authMode may be absent in model state if the user never touched the select.
          var rawProxy = llm.proxy || {}
          var normalizedProxy = {
            baseUrl: rawProxy.baseUrl || '',
            defaultModel: rawProxy.defaultModel || '',
            authMode: rawProxy.authMode === 'session_token' ? 'session_token' : 'shared_token',
            sharedToken: rawProxy.sharedToken || ''
          }
          var body = {
            provider: provider,
            endpoint: llm.endpoint || '',
            proxy: normalizedProxy,
            assistant: assistantDraft,
            message: msg,
            kbName: 'figma'
          }
          var res = await _apiFetch(API_BASE + '/api/test/assistant', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
          })
          var data = await res.json()
          if (resultEl) {
            resultEl.className = 'ace-test-result ' + (data.success ? 'ace-test-result--success' : 'ace-test-result--error')
            if (data.success) {
              resultEl.innerHTML = '<div class="ace-test-response-meta">Assistant: ' + escapeHtml(data.assistantId || '?') + ' | kbName: ' + escapeHtml(data.kbName || 'figma') + '</div><pre class="ace-test-response-text">' + escapeHtml(data.response || '(empty response)') + '</pre>'
            } else {
              resultEl.textContent = data.message || 'Test failed.'
            }
          }
        } catch (err) {
          if (resultEl) {
            resultEl.className = 'ace-test-result ace-test-result--error'
            resultEl.textContent = 'Test request failed: ' + ((err && err.message) ? err.message : String(err))
          }
        } finally {
          testRunBtn.disabled = false
          testRunBtn.textContent = 'Run Test'
        }
      }
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

  // ——— Resources tab (PR11b) ———
  async function fetchKbRegistry () {
    const res = await _apiFetch(API_BASE + '/api/kb/registry', {})
    if (!res.ok) throw new Error(res.status === 403 ? 'Not authorized' : 'Failed to load registry')
    const data = await res.json()
    state.kbRegistry = data.knowledgeBases || []
  }

  function renderKnowledgeBasesTab () {
    const panel = document.getElementById('panel-knowledge-bases')
    if (!panel) return
    panel.setAttribute('aria-busy', 'true')
    panel.innerHTML = '<div class="ace-section-header-row"><h2 class="ace-section-title">Resources</h2></div><p class="fg-secondary">Loading…</p>'
    fetchKbRegistry()
      .then(function () {
        state.panelKnowledgeBasesReady = true
        renderKnowledgeBasesTabContent()
      })
      .catch(function (err) {
        panel.removeAttribute('aria-busy')
        panel.innerHTML = '<div class="ace-section-header-row"><h2 class="ace-section-title">Resources</h2></div><p class="fg-secondary">' + escapeHtml(err.message || 'Failed to load') + '</p>'
      })
  }

  function renderKnowledgeBasesTabContent () {
    const panel = document.getElementById('panel-knowledge-bases')
    if (!panel || !state.panelKnowledgeBasesReady) return
    panel.removeAttribute('aria-busy')
    const registry = state.kbRegistry || []
    const selectedId = state.selectedKbId
    const createMode = state.kbCreateMode
    const previewDoc = state.kbPreviewDoc
    const editDoc = state.kbEditDoc

    let html = '<div class="ace-section-header-row"><h2 class="ace-section-title">Resources</h2></div>'
    html += '<p class="fg-secondary">Stored in custom/knowledge-bases/&lt;id&gt;.kb.json. Assistants reference resources by id.</p>'
    html += '<button type="button" class="btn-small add-btn" id="kb-create-btn">Create / Import Resource</button>'
    html += '<div class="list-panel">'
    html += '<div class="list" id="kb-list">'
    const assistants = state.editedModel?.assistantsManifest?.assistants || []
    function referencedBy (kbId) {
      return assistants.filter(function (as) { return (as.knowledgeBaseRefs || []).indexOf(kbId) !== -1 })
    }
    registry.forEach(function (entry) {
      const cls = entry.id === selectedId && !createMode ? 'item selected' : 'item'
      const meta = [entry.id]
      if (entry.tags && entry.tags.length) meta.push(entry.tags.join(', '))
      if (entry.version) meta.push('v' + entry.version)
      if (entry.updatedAt) meta.push(entry.updatedAt.slice(0, 10))
      const refs = referencedBy(entry.id)
      const refLabel = refs.length ? refs.map(function (as) { return as.label || as.id }).join(', ') : 'Not referenced'
      html += '<div class="' + cls + '" data-id="' + escapeHtml(entry.id) + '">'
      html += '<strong>' + escapeHtml(entry.title || entry.id) + '</strong>'
      html += ' <span class="fg-secondary" style="font-size:0.9em">' + escapeHtml(meta.join(' · ')) + '</span>'
      html += '<div class="kb-referenced-by fg-secondary" style="font-size:0.85em;margin-top:2px">Referenced by: ' + escapeHtml(refLabel) + '</div>'
      html += '<div class="kb-row-actions">'
      html += '<button type="button" class="btn-small kb-view-edit" data-id="' + escapeHtml(entry.id) + '">View/Edit</button>'
      html += '<button type="button" class="btn-small kb-reimport" data-id="' + escapeHtml(entry.id) + '">Re-import</button>'
      html += '<button type="button" class="btn-small kb-copy-id" data-id="' + escapeHtml(entry.id) + '">Copy ID</button>'
      html += '<button type="button" class="btn-small kb-delete" data-id="' + escapeHtml(entry.id) + '">Delete</button>'
      html += '</div></div>'
    })
    html += '</div><div class="editor" id="kb-editor-panel">'
    if (createMode) {
      html += kbImportFormHtml(previewDoc)
    } else if (selectedId && editDoc) {
      html += kbEditFormHtml(editDoc)
    } else if (selectedId) {
      html += '<p class="fg-secondary">Loading…</p>'
    } else {
      html += '<div class="empty">Select a resource or click Create / Import Resource</div>'
    }
    html += '</div></div>'
    panel.innerHTML = html

    document.getElementById('kb-create-btn').onclick = function () {
      state.kbCreateMode = true
      state.kbPreviewDoc = null
      state.selectedKbId = null
      state.kbEditDoc = null
      renderKnowledgeBasesTabContent()
    }
    document.querySelectorAll('#kb-list .item[data-id]').forEach(function (el) {
      const id = el.getAttribute('data-id')
      el.addEventListener('click', function (e) {
        if (e.target.closest('.kb-row-actions')) return
        state.selectedKbId = id
        state.kbCreateMode = false
        state.kbPreviewDoc = null
        state.kbEditDoc = null
        loadKbDocThenRender(id)
      })
    })
    document.querySelectorAll('.kb-view-edit').forEach(function (btn) {
      btn.onclick = function (e) {
        e.stopPropagation()
        const id = this.getAttribute('data-id')
        state.selectedKbId = id
        state.kbCreateMode = false
        state.kbPreviewDoc = null
        loadKbDocThenRender(id)
      }
    })
    document.querySelectorAll('.kb-reimport').forEach(function (btn) {
      btn.onclick = function (e) {
        e.stopPropagation()
        const id = this.getAttribute('data-id')
        const entry = registry.find(function (e) { return e.id === id })
        state.kbCreateMode = true
        state.kbPreviewDoc = null
        state.selectedKbId = null
        state.kbEditDoc = null
        state.kbReimportId = id
        state.kbReimportTitle = entry ? (entry.title || '') : ''
        renderKnowledgeBasesTabContent()
      }
    })
    document.querySelectorAll('.kb-copy-id').forEach(function (btn) {
      btn.onclick = function (e) {
        e.stopPropagation()
        const id = this.getAttribute('data-id')
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(id).then(function () {
            showActionModal({ state: 'success', title: 'Copied', message: 'ID copied: ' + id })
          }).catch(function () {
            showActionModal({ state: 'error', message: 'Copy failed' })
          })
        } else {
          showActionModal({ state: 'success', title: 'ID', message: id, copyText: id })
        }
      }
    })
    document.querySelectorAll('.kb-delete').forEach(function (btn) {
      btn.onclick = function (e) {
        e.stopPropagation()
        const id = this.getAttribute('data-id')
        const entry = registry.find(function (e) { return e.id === id })
        const title = entry ? (entry.title || id) : id
        if (!confirm('Delete KB “‘ + title + ’”? This removes the file and registry entry.')) return
        _apiFetch(API_BASE + '/api/kb/' + encodeURIComponent(id), { method: 'DELETE' })
          .then(function (res) {
            if (!res.ok) return res.json().then(function (body) { throw new Error(body.error || 'Delete failed') })
            state.selectedKbId = null
            state.kbEditDoc = null
            state.kbRegistry = state.kbRegistry.filter(function (e) { return e.id !== id })
            renderKnowledgeBasesTabContent()
            showActionModal({ state: 'success', message: 'Deleted.' })
          })
          .catch(function (err) {
            showActionModal({ state: 'error', message: err.message || 'Delete failed' })
          })
      }
    })

    if (createMode) bindKbImportForm()
    else if (selectedId && editDoc) bindKbEditForm(editDoc)
    else if (selectedId) loadKbDocThenRender(selectedId)
  }

  function loadKbDocThenRender (id) {
    _apiFetch(API_BASE + '/api/kb/' + encodeURIComponent(id), {})
      .then(function (res) {
        if (!res.ok) throw new Error(res.status === 404 ? 'Not found' : 'Failed to load')
        return res.json()
      })
      .then(function (doc) {
        state.kbEditDoc = doc
        renderKnowledgeBasesTabContent()
      })
      .catch(function (err) {
        state.kbEditDoc = null
        renderKnowledgeBasesTabContent()
        showActionModal({ state: 'error', message: err.message || 'Load failed' })
      })
  }

  function kbImportFormHtml (previewDoc) {
    const reimportId = state.kbReimportId || ''
    const reimportTitle = state.kbReimportTitle || ''
    let html = '<div class="kb-import-form">'
    html += '<label>ID (kebab-case)</label><input type="text" id="kb-import-id" class="ace-field" value="' + escapeHtml(reimportId) + '" placeholder="e.g. design-guidelines">'
    html += '<label>Title</label><input type="text" id="kb-import-title" class="ace-field" value="' + escapeHtml(reimportTitle) + '" placeholder="Optional">'
    html += '<label>Import from</label>'
    html += '<textarea id="kb-import-md" class="ace-field" rows="8" placeholder="Paste Markdown here"></textarea>'
    html += '<p class="fg-secondary" style="margin-top:4px">Or paste JSON (loose shape OK):</p>'
    html += '<textarea id="kb-import-json" class="ace-field" rows="6" placeholder="Paste JSON here"></textarea>'
    html += '<p class="fg-secondary">Or <input type="file" id="kb-import-file-md" accept=".md"> <input type="file" id="kb-import-file-json" accept=".json"></p>'
    html += '<button type="button" class="btn-small" id="kb-preview-normalize">Preview normalize</button>'
    html += '<div id="kb-normalize-errors" class="fg-secondary" style="margin-top:8px;color:var(--error, #c00);" role="alert"></div>'
    if (previewDoc) {
      html += '<div class="kb-preview-block"><pre id="kb-preview-json">' + escapeHtml(JSON.stringify(previewDoc, null, 2)) + '</pre></div>'
      html += '<button type="button" class="btn-small" id="kb-save-create">Save</button>'
    }
    html += '</div>'
    return html
  }

  function kbEditFormHtml (doc) {
    if (!doc) return ''
    let html = '<div class="kb-edit-form">'
    html += '<label>ID (read-only)</label><input type="text" class="ace-field" value="' + escapeHtml(doc.id) + '" readonly>'
    html += '<label>Title</label><input type="text" id="kb-edit-title" class="ace-field" value="' + escapeHtml(doc.title || '') + '">'
    html += '<label>Purpose</label><textarea id="kb-edit-purpose" class="ace-field" rows="2">' + escapeHtml(doc.purpose || '') + '</textarea>'
    html += '<label>Scope</label><textarea id="kb-edit-scope" class="ace-field" rows="2">' + escapeHtml(doc.scope || '') + '</textarea>'
    html += '<label>Definitions (one per line or bullet)</label><textarea id="kb-edit-definitions" class="ace-field" rows="4">' + escapeHtml((doc.definitions || []).join('\n')) + '</textarea>'
    html += '<label>Rules / constraints</label><textarea id="kb-edit-rules" class="ace-field" rows="4">' + escapeHtml((doc.rulesConstraints || []).join('\n')) + '</textarea>'
    html += '<label>Do (one per line)</label><textarea id="kb-edit-do" class="ace-field" rows="3">' + escapeHtml((doc.doDont && doc.doDont.do ? doc.doDont.do : []).join('\n')) + '</textarea>'
    html += '<label>Don\'t (one per line)</label><textarea id="kb-edit-dont" class="ace-field" rows="3">' + escapeHtml((doc.doDont && doc.doDont.dont ? doc.doDont.dont : []).join('\n')) + '</textarea>'
    html += '<label>Examples</label><textarea id="kb-edit-examples" class="ace-field" rows="4">' + escapeHtml((doc.examples || []).join('\n')) + '</textarea>'
    html += '<label>Edge cases</label><textarea id="kb-edit-edge" class="ace-field" rows="3">' + escapeHtml((doc.edgeCases || []).join('\n')) + '</textarea>'
    html += '<label>Source</label><input type="text" id="kb-edit-source" class="ace-field" value="' + escapeHtml(doc.source || '') + '">'
    html += '<label>Version</label><input type="text" id="kb-edit-version" class="ace-field" value="' + escapeHtml(doc.version || '') + '">'
    html += '<label>Tags (comma-separated)</label><input type="text" id="kb-edit-tags" class="ace-field" value="' + escapeHtml((doc.tags || []).join(', ')) + '">'
    html += '<button type="button" class="btn-small" id="kb-save-edit">Save changes</button>'
    html += '</div>'
    return html
  }

  function bindKbImportForm () {
    const errEl = document.getElementById('kb-normalize-errors')
    const previewBtn = document.getElementById('kb-preview-normalize')
    const saveBtn = document.getElementById('kb-save-create')
    if (previewBtn) {
      previewBtn.onclick = function () {
        var id = (document.getElementById('kb-import-id') || {}).value.trim() || 'draft'
        var title = (document.getElementById('kb-import-title') || {}).value
        if (!KB_ID_REGEX.test(id)) {
          if (errEl) errEl.textContent = 'ID must be kebab-case (e.g. my-knowledge-base).'
          return
        }
        var md = (document.getElementById('kb-import-md') || {}).value
        var json = (document.getElementById('kb-import-json') || {}).value
        var type = md.trim() ? 'md' : 'json'
        var content = md.trim() || json.trim()
        if (!content) {
          if (errEl) errEl.textContent = 'Paste Markdown or JSON first.'
          return
        }
        if (errEl) errEl.textContent = ''
        _apiFetch(API_BASE + '/api/kb/normalize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: type, content: content, id: id, title: title || undefined })
        })
          .then(function (res) { return res.json() })
          .then(function (data) {
            if (data.errors && data.errors.length) {
              if (errEl) errEl.textContent = data.errors.join('; ')
              state.kbPreviewDoc = null
            } else {
              if (errEl) errEl.textContent = ''
              state.kbPreviewDoc = data.doc
            }
            renderKnowledgeBasesTabContent()
          })
          .catch(function (err) {
            if (errEl) errEl.textContent = err.message || 'Normalize failed'
          })
      }
    }
    if (saveBtn) {
      saveBtn.onclick = function () {
        var doc = state.kbPreviewDoc
        if (!doc) return
        saveKbCreate(doc, false)
      }
    }
    var fileMd = document.getElementById('kb-import-file-md')
    var fileJson = document.getElementById('kb-import-file-json')
    if (fileMd) {
      fileMd.onchange = function () {
        var f = this.files && this.files[0]
        if (!f) return
        var r = new FileReader()
        r.onload = function () {
          var ta = document.getElementById('kb-import-md')
          if (ta) ta.value = r.result || ''
        }
        r.readAsText(f)
      }
    }
    if (fileJson) {
      fileJson.onchange = function () {
        var f = this.files && this.files[0]
        if (!f) return
        var r = new FileReader()
        r.onload = function () {
          var ta = document.getElementById('kb-import-json')
          if (ta) ta.value = r.result || ''
        }
        r.readAsText(f)
      }
    }
  }

  function saveKbCreate (doc, forceOverwrite) {
    _apiFetch(API_BASE + '/api/kb', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ doc: doc, forceOverwrite: forceOverwrite || undefined })
    })
      .then(function (res) {
        return res.json().then(function (body) {
          if (res.status === 409 && body.code === 'OVERWRITE_REQUIRED') {
            if (!confirm('A KB with this ID already exists. Overwrite?')) return
            saveKbCreate(doc, true)
            return
          }
          if (!res.ok) throw new Error(body.error || body.errors ? (body.errors || []).join('; ') : 'Save failed')
          state.kbRegistry = body.registry ? (body.registry.knowledgeBases || []) : state.kbRegistry
          state.kbCreateMode = false
          state.kbPreviewDoc = null
          state.kbReimportId = null
          state.kbReimportTitle = null
          renderKnowledgeBasesTabContent()
          showActionModal({ state: 'success', message: 'Saved.' })
        })
      })
      .catch(function (err) {
        showActionModal({ state: 'error', message: err.message || 'Save failed' })
      })
  }

  function bindKbEditForm (doc) {
    var saveBtn = document.getElementById('kb-save-edit')
    if (!saveBtn) return
    saveBtn.onclick = function () {
      var title = (document.getElementById('kb-edit-title') || {}).value
      var purpose = (document.getElementById('kb-edit-purpose') || {}).value
      var scope = (document.getElementById('kb-edit-scope') || {}).value
      var defs = (document.getElementById('kb-edit-definitions') || {}).value.split(/\n/).map(function (s) { return s.trim() }).filter(Boolean)
      var rules = (document.getElementById('kb-edit-rules') || {}).value.split(/\n/).map(function (s) { return s.trim() }).filter(Boolean)
      var doList = (document.getElementById('kb-edit-do') || {}).value.split(/\n/).map(function (s) { return s.trim() }).filter(Boolean)
      var dontList = (document.getElementById('kb-edit-dont') || {}).value.split(/\n/).map(function (s) { return s.trim() }).filter(Boolean)
      var examples = (document.getElementById('kb-edit-examples') || {}).value.split(/\n/).map(function (s) { return s.trim() }).filter(Boolean)
      var edge = (document.getElementById('kb-edit-edge') || {}).value.split(/\n/).map(function (s) { return s.trim() }).filter(Boolean)
      var source = (document.getElementById('kb-edit-source') || {}).value
      var version = (document.getElementById('kb-edit-version') || {}).value
      var tagsStr = (document.getElementById('kb-edit-tags') || {}).value
      var tags = tagsStr ? tagsStr.split(',').map(function (s) { return s.trim() }).filter(Boolean) : []
      var payload = {
        doc: {
          id: doc.id,
          title: title,
          purpose: purpose,
          scope: scope,
          definitions: defs,
          rulesConstraints: rules,
          doDont: { do: doList, dont: dontList },
          examples: examples,
          edgeCases: edge,
          source: source || undefined,
          version: version || undefined,
          tags: tags
        }
      }
      _apiFetch(API_BASE + '/api/kb/' + encodeURIComponent(doc.id), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })
        .then(function (res) {
          if (!res.ok) return res.json().then(function (body) { throw new Error(body.error || (body.errors || []).join('; ')) })
          return res.json()
        })
        .then(function (data) {
          state.kbEditDoc = data.doc
          var entry = state.kbRegistry.find(function (e) { return e.id === doc.id })
          if (entry) {
            entry.title = data.doc.title
            if (data.doc.updatedAt) entry.updatedAt = data.doc.updatedAt
          }
          renderKnowledgeBasesTabContent()
          showActionModal({ state: 'success', message: 'Saved.' })
        })
        .catch(function (err) {
          showActionModal({ state: 'error', message: err.message || 'Save failed' })
        })
    }
  }

  // ——— Content Models tab ———
  function parseContentModels (raw) {
    var sections = raw.split(/^---$/m)
    var header = ''
    var models = []
    for (var si = 0; si < sections.length; si++) {
      var section = sections[si]
      if (si === 0) { header = section; continue }
      var lines = section.split('\n')
      var cur = null
      var inCols = false
      for (var li = 0; li < lines.length; li++) {
        var t = lines[li].trim()
        if (t.startsWith('## ')) {
          if (cur && cur.id) models.push(cur)
          cur = { heading: t.replace('## ', ''), id: '', label: '', description: '', enabled: false, kind: 'simple', template: null, columns: [] }
          inCols = false; continue
        }
        if (!cur) continue
        if (t.startsWith('**id:**')) cur.id = t.replace(/^\*\*id:\*\*\s*/, '').trim()
        else if (t.startsWith('**label:**')) cur.label = t.replace(/^\*\*label:\*\*\s*/, '').trim()
        else if (t.startsWith('**description:**')) cur.description = t.replace(/^\*\*description:\*\*\s*/, '').trim()
        else if (t.startsWith('**enabled:**')) cur.enabled = t.replace(/^\*\*enabled:\*\*\s*/, '').trim() === 'true'
        else if (t.startsWith('**kind:**')) cur.kind = t.replace(/^\*\*kind:\*\*\s*/, '').trim() === 'grouped' ? 'grouped' : 'simple'
        else if (t === '**columns:**') inCols = true
        else if (t === '**template:**') {
          inCols = false
          var fenceIdx = li + 1
          while (fenceIdx < lines.length && lines[fenceIdx].trim() === '') fenceIdx++
          if (fenceIdx < lines.length && lines[fenceIdx].trim().startsWith('```')) {
            var jsonLines = []
            var closeIdx = fenceIdx + 1
            while (closeIdx < lines.length && lines[closeIdx].trim() !== '```') {
              jsonLines.push(lines[closeIdx])
              closeIdx++
            }
            var jsonRaw = jsonLines.join('\n').trim()
            if (jsonRaw) {
              try {
                cur.template = JSON.parse(jsonRaw)
                cur.kind = 'grouped'
              } catch (_) {
                cur.template = null
              }
            }
            li = closeIdx
          }
        }
        else if (inCols && t.startsWith('- ')) {
          var parts = t.replace('- ', '').split(',').map(function (p) { return p.trim() })
          var key = '', label = '', path = ''
          parts.forEach(function (p) { if (p.startsWith('key: ')) key = p.replace('key: ', '').trim(); else if (p.startsWith('label: ')) label = p.replace('label: ', '').trim(); else if (p.startsWith('path: ')) path = p.replace('path: ', '').trim() })
          if (key && label && path) cur.columns.push({ key: key, label: label, path: path })
        } else if (t === '(empty - not yet defined)') { if (cur) cur.columns = [] }
      }
      if (cur && cur.id) models.push(cur)
    }
    return { header: header, models: models }
  }

  function serializeContentModels (header, models) {
    var out = header.replace(/\n*$/, '\n')
    models.forEach(function (model) {
      out += '\n---\n\n## ' + model.heading + '\n\n'
      out += '**id:** ' + model.id + '  \n'
      out += '**label:** ' + model.label + '  \n'
      out += '**description:** ' + model.description + '  \n'
      out += '**enabled:** ' + model.enabled + '\n'
      if (model.kind === 'grouped') out += '**kind:** grouped\n'
      out += '\n'
      out += '**columns:**\n'
      if (model.columns.length === 0) { out += '(empty - not yet defined)\n' }
      else { model.columns.forEach(function (c) { out += '- key: ' + c.key + ', label: ' + c.label + ', path: ' + c.path + '\n' }) }
      if (model.kind === 'grouped') {
        out += '\n**template:**\n'
        out += '```json\n'
        out += JSON.stringify(model.template || {}, null, 2) + '\n'
        out += '```\n'
      }
    })
    return out
  }

  var cmParsedState = { header: '', models: [] }
  var CM_FIELD_OPTIONS = ['containerUrl', 'containerName', 'nodeUrl', 'content', 'content.value', 'field.path', 'field.label', 'component.name', 'component.kind', 'notes', 'contentKey', 'jiraTicket', 'adaNotes', 'errorMessage']

  function cmEmptyRow (count) {
    var row = []
    for (var i = 0; i < count; i++) row.push('')
    return row
  }

  function cmEnsureTemplate (model) {
    if (!model.template || typeof model.template !== 'object') model.template = {}
    var cols = Math.max(1, (model.columns || []).length)
    if (!Array.isArray(model.template.headerRows) || model.template.headerRows.length === 0) {
      model.template.headerRows = [model.columns.map(function (c) { return c.label || '' })]
    }
    if (!Array.isArray(model.template.containerIntroRows)) model.template.containerIntroRows = [cmEmptyRow(cols)]
    if (!Array.isArray(model.template.itemRows)) model.template.itemRows = [cmEmptyRow(cols)]
    model.template.headerRows = model.template.headerRows.map(function (row) {
      if (!Array.isArray(row)) return cmEmptyRow(cols)
      var copy = row.slice(0, cols)
      while (copy.length < cols) copy.push('')
      return copy
    })
    model.template.containerIntroRows = model.template.containerIntroRows.map(function (row) {
      if (!Array.isArray(row)) return cmEmptyRow(cols)
      var copy = row.slice(0, cols)
      while (copy.length < cols) copy.push('')
      return copy
    })
    model.template.itemRows = model.template.itemRows.map(function (row) {
      if (!Array.isArray(row)) return cmEmptyRow(cols)
      var copy = row.slice(0, cols)
      while (copy.length < cols) copy.push('')
      return copy
    })
    return model.template
  }

  function cmCellType (cell) {
    if (!cell) return 'blank'
    if (typeof cell === 'string') return cell ? 'static' : 'blank'
    if (typeof cell !== 'object') return 'blank'
    if (cell.type === 'field') return 'field'
    if (cell.type === 'link') return 'link'
    if (cell.type === 'static') return cell.text ? 'static' : 'blank'
    return 'blank'
  }

  function cmRenderCellEditor (mi, section, ri, ci, cell) {
    var type = cmCellType(cell)
    var html = '<div style="display:flex;flex-direction:column;gap:4px">'
    html += '<select class="ace-field cm-cell-type" data-mi="' + mi + '" data-section="' + section + '" data-ri="' + ri + '" data-ci="' + ci + '">'
    html += '<option value="blank"' + (type === 'blank' ? ' selected' : '') + '>Blank</option>'
    html += '<option value="static"' + (type === 'static' ? ' selected' : '') + '>Static</option>'
    html += '<option value="field"' + (type === 'field' ? ' selected' : '') + '>Field</option>'
    html += '<option value="link"' + (type === 'link' ? ' selected' : '') + '>Link</option>'
    html += '</select>'
    if (type === 'static') {
      var textVal = typeof cell === 'string' ? cell : ((cell && cell.text) || '')
      html += '<input type="text" class="ace-field cm-cell-static" data-mi="' + mi + '" data-section="' + section + '" data-ri="' + ri + '" data-ci="' + ci + '" value="' + escapeHtml(textVal) + '" placeholder="Text">'
    } else if (type === 'field') {
      var selectedField = (cell && cell.field) || 'content'
      html += '<select class="ace-field cm-cell-field" data-mi="' + mi + '" data-section="' + section + '" data-ri="' + ri + '" data-ci="' + ci + '">'
      CM_FIELD_OPTIONS.forEach(function (f) { html += '<option value="' + escapeHtml(f) + '"' + (selectedField === f ? ' selected' : '') + '>' + escapeHtml(f) + '</option>' })
      html += '</select>'
    } else if (type === 'link') {
      var label = ''
      if (cell && cell.label) {
        if (typeof cell.label === 'string') label = cell.label
        else if (cell.label.type === 'static') label = cell.label.text || ''
      }
      var hrefField = (cell && cell.hrefField) || 'containerUrl'
      html += '<input type="text" class="ace-field cm-cell-link-label" data-mi="' + mi + '" data-section="' + section + '" data-ri="' + ri + '" data-ci="' + ci + '" value="' + escapeHtml(label) + '" placeholder="Link label">'
      html += '<select class="ace-field cm-cell-link-href" data-mi="' + mi + '" data-section="' + section + '" data-ri="' + ri + '" data-ci="' + ci + '">'
      CM_FIELD_OPTIONS.forEach(function (f2) { html += '<option value="' + escapeHtml(f2) + '"' + (hrefField === f2 ? ' selected' : '') + '>' + escapeHtml(f2) + '</option>' })
      html += '</select>'
    }
    html += '</div>'
    return html
  }

  function cmResolvePreviewField (field, container, item) {
    if (field === 'containerUrl') return container.containerUrl
    if (field === 'containerName') return container.containerName
    if (field === 'content') return item ? item.content : ''
    var target = item || container
    var cur = target
    var parts = (field || '').split('.')
    for (var i = 0; i < parts.length; i++) {
      if (!cur || typeof cur !== 'object') return ''
      cur = cur[parts[i]]
    }
    return cur == null ? '' : String(cur)
  }

  function cmResolvePreviewCell (cell, container, item) {
    var type = cmCellType(cell)
    if (type === 'blank') return ''
    if (type === 'static') {
      if (typeof cell === 'string') return cell
      return (cell && cell.text) || ''
    }
    if (type === 'field') return cmResolvePreviewField(cell.field, container, item)
    if (type === 'link') {
      var href = cmResolvePreviewField(cell.hrefField || 'containerUrl', container, item)
      var label = ''
      if (typeof cell.label === 'string') label = cell.label
      else if (cell.label && cell.label.type === 'field') label = cmResolvePreviewField(cell.label.field, container, item)
      else if (cell.label && cell.label.type === 'static') label = cell.label.text || ''
      if (!label) return ''
      if (!href) return escapeHtml(label)
      return '<a href="' + escapeHtml(href) + '" target="_blank" rel="noreferrer">' + escapeHtml(label) + '</a>'
    }
    return ''
  }

  function cmRenderPreviewTable (model) {
    if (model.kind !== 'grouped') return '<p class="fg-secondary" style="font-size:0.82em">Simple model preview uses current table runtime behavior.</p>'
    var tpl = cmEnsureTemplate(model)
    var headers = tpl.headerRows || []
    var cols = Math.max(1, (model.columns || []).length)
    var sampleContainers = [
      { containerName: 'HeroCard', containerUrl: 'https://www.figma.com/file/demo?node-id=1%3A1', items: [{ content: 'Welcome to Ableza' }, { content: 'Get Started' }] },
      { containerName: 'Checkout', containerUrl: 'https://www.figma.com/file/demo?node-id=2%3A2', items: [{ content: 'Pay now' }, { content: 'Use saved card' }] }
    ]
    var html = '<div style="overflow:auto;border:1px solid #e0e0e0;border-radius:8px;background:#fff"><table style="border-collapse:collapse;min-width:100%"><thead>'
    headers.forEach(function (row) {
      html += '<tr>'
      for (var i = 0; i < cols; i++) {
        html += '<th style="border-bottom:1px solid #e0e0e0;padding:6px 8px;text-align:left;font-size:12px;background:#f8f8f8">' + escapeHtml((row && row[i]) || '') + '</th>'
      }
      html += '</tr>'
    })
    html += '</thead><tbody>'
    sampleContainers.forEach(function (container) {
      ;(tpl.containerIntroRows || []).forEach(function (row) {
        html += '<tr>'
        for (var i = 0; i < cols; i++) {
          html += '<td style="border-bottom:1px solid #f0f0f0;padding:6px 8px;font-size:12px">' + cmResolvePreviewCell(row && row[i], container, null) + '</td>'
        }
        html += '</tr>'
      })
      container.items.forEach(function (item) {
        ;(tpl.itemRows || []).forEach(function (row) {
          html += '<tr>'
          for (var i = 0; i < cols; i++) {
            html += '<td style="border-bottom:1px solid #f0f0f0;padding:6px 8px;font-size:12px">' + cmResolvePreviewCell(row && row[i], container, item) + '</td>'
          }
          html += '</tr>'
        })
      })
    })
    html += '</tbody></table></div>'
    return html
  }

  function renderContentModelsTab () {
    const panel = document.getElementById('panel-content-models')
    const m = state.editedModel
    const raw = m?.contentModelsRaw ?? ''
    var parsed = parseContentModels(raw)
    cmParsedState = parsed

    let html = '<div class="ace-section-header-row">'
    html += '<h2 class="ace-section-title">Content Models</h2>'
    html += '<button type="button" class="ace-section-header-btn" id="revert-content-models-btn">' + RESET_SECTION_BTN_LABEL + '</button>'
    html += '</div>'
    html += '<p class="ace-card-subtext">Each model defines which columns appear in an Evergreens preset.</p>'
    function normalizeExclRuleForEditor (rule, i) {
      var r = (rule && typeof rule === 'object') ? rule : {}
      var name = typeof r.name === 'string' && r.name.trim() ? r.name : (typeof r.label === 'string' && r.label.trim() ? r.label : ('Rule ' + (i + 1)))
      var enabled = (typeof r.enabled === 'boolean') ? r.enabled : true
      var note = typeof r.note === 'string' ? r.note : ''
      var pattern = typeof r.pattern === 'string' ? r.pattern : ''
      var matchTarget = 'content'
      if (r.matchTarget === 'layerName' || r.matchTarget === 'both' || r.matchTarget === 'content') {
        matchTarget = r.matchTarget
      } else if (r.field === 'textLayerName') {
        matchTarget = 'layerName'
      }
      var matchType = 'contains'
      if (r.matchType === 'exact' || r.matchType === 'contains' || r.matchType === 'regex') {
        matchType = r.matchType
      } else if (r.match === 'equals') {
        matchType = 'exact'
      } else if (r.match === 'regex') {
        matchType = 'regex'
      } else if (r.match === 'startsWith') {
        matchType = 'contains'
      }
      var action = (r.action === 'flag') ? 'flag' : 'exclude'
      var confidence = (r.confidence === 'med' || r.confidence === 'low' || r.confidence === 'high') ? r.confidence : 'high'
      return {
        name: name,
        enabled: enabled,
        note: note,
        matchTarget: matchTarget,
        matchType: matchType,
        pattern: pattern,
        action: action,
        confidence: confidence
      }
    }
    var ctExcl = (m.config.contentTable && m.config.contentTable.exclusionRules) || { enabled: false, rules: [] }
    var exclEditorRules = (ctExcl.rules || []).map(function (rule, i) { return normalizeExclRuleForEditor(rule, i) })
    var exclRulesHtml = '<div class="ace-card"><p class="ace-card-subtext">ACE-managed ignore list for Evergreens. Exclude removes rows; Flag keeps rows and marks them for review.</p>'
    exclRulesHtml += '<div class="field-row"><label><input type="checkbox" id="ct-excl-enabled" ' + (ctExcl.enabled ? 'checked' : '') + '> Enabled</label></div>'
    exclRulesHtml += '<table class="ace-excl-rules-table" id="ct-excl-rules-table"><thead><tr><th>Name</th><th>Enabled</th><th>Target</th><th>Match</th><th>Pattern</th><th>Action</th><th>Conf.</th><th>Note</th><th></th></tr></thead><tbody>'
    var exclTargets = ['content', 'layerName', 'both']
    var exclMatches = ['exact', 'contains', 'regex']
    var exclActions = ['exclude', 'flag']
    var exclConf = ['high', 'med', 'low']
    ;exclEditorRules.forEach(function (rule, i) {
      exclRulesHtml += '<tr data-i="' + i + '">'
      exclRulesHtml += '<td><input type="text" class="ace-field ct-excl-name" data-i="' + i + '" value="' + escapeHtml(rule.name || '') + '"></td>'
      exclRulesHtml += '<td style="text-align:center"><input type="checkbox" class="ct-excl-rule-enabled" data-i="' + i + '"' + (rule.enabled ? ' checked' : '') + '></td>'
      exclRulesHtml += '<td><select class="ct-excl-target" data-i="' + i + '">'
      exclTargets.forEach(function (t) { exclRulesHtml += '<option value="' + t + '"' + (rule.matchTarget === t ? ' selected' : '') + '>' + t + '</option>' })
      exclRulesHtml += '</select></td>'
      exclRulesHtml += '<td><select class="ct-excl-match" data-i="' + i + '">'
      exclMatches.forEach(function (mt) { exclRulesHtml += '<option value="' + mt + '"' + (rule.matchType === mt ? ' selected' : '') + '>' + mt + '</option>' })
      exclRulesHtml += '</select></td>'
      exclRulesHtml += '<td><input type="text" class="ace-field ct-excl-pattern" data-i="' + i + '" value="' + escapeHtml(rule.pattern || '') + '"></td>'
      exclRulesHtml += '<td><select class="ct-excl-action" data-i="' + i + '">'
      exclActions.forEach(function (a) { exclRulesHtml += '<option value="' + a + '"' + (rule.action === a ? ' selected' : '') + '>' + a + '</option>' })
      exclRulesHtml += '</select></td>'
      exclRulesHtml += '<td><select class="ct-excl-confidence" data-i="' + i + '">'
      exclConf.forEach(function (c) { exclRulesHtml += '<option value="' + c + '"' + (rule.confidence === c ? ' selected' : '') + '>' + c + '</option>' })
      exclRulesHtml += '</select></td>'
      exclRulesHtml += '<td><input type="text" class="ace-field ct-excl-note" data-i="' + i + '" value="' + escapeHtml(rule.note || '') + '"></td>'
      exclRulesHtml += '<td><button type="button" class="btn-small ct-excl-remove" data-i="' + i + '">Remove</button></td>'
      exclRulesHtml += '</tr>'
    })
    exclRulesHtml += '</tbody></table>'
    exclRulesHtml += '<button type="button" class="btn-small add-btn" id="ct-excl-add">Add rule</button>'
    exclRulesHtml += ' <button type="button" class="btn-small" id="ct-excl-add-presets">Add presets</button>'
    exclRulesHtml += '</div>'
    html += collapsibleSection('content-table-exclusion', 'Evergreens — Exclusion Rules', exclRulesHtml, true)

    parsed.models.forEach(function (model, mi) {
      html += '<div class="ace-card" style="margin-bottom:12px">'
      html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">'
      html += '<strong>' + escapeHtml(model.heading) + '</strong>'
      html += '<span class="fg-secondary" style="font-size:0.85em">id: ' + escapeHtml(model.id) + '</span>'
      html += '</div>'
      html += '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px">'
      html += '<label style="font-size:0.85em">Label <input type="text" class="ace-field cm-label" data-mi="' + mi + '" value="' + escapeHtml(model.label) + '" style="width:160px"></label>'
      html += '<label style="font-size:0.85em">Description <input type="text" class="ace-field cm-desc" data-mi="' + mi + '" value="' + escapeHtml(model.description) + '" style="width:240px"></label>'
      html += '<label style="font-size:0.85em"><input type="checkbox" class="cm-enabled" data-mi="' + mi + '" ' + (model.enabled ? 'checked' : '') + '> Enabled</label>'
      html += '<label style="font-size:0.85em">Wizard Mode <select class="ace-field cm-kind" data-mi="' + mi + '"><option value="simple"' + ((model.kind || 'simple') === 'simple' ? ' selected' : '') + '>Simple</option><option value="grouped"' + ((model.kind || 'simple') === 'grouped' ? ' selected' : '') + '>Grouped</option></select></label>'
      html += '</div>'
      if (model.columns.length > 0) {
        html += '<table class="ace-excl-rules-table" style="font-size:0.85em"><thead><tr><th>Key</th><th>Label</th><th>Path</th><th></th></tr></thead><tbody>'
        model.columns.forEach(function (col, ci) {
          html += '<tr>'
          html += '<td><input type="text" class="ace-field cm-col-key" data-mi="' + mi + '" data-ci="' + ci + '" value="' + escapeHtml(col.key) + '" style="width:100px"></td>'
          html += '<td><input type="text" class="ace-field cm-col-label" data-mi="' + mi + '" data-ci="' + ci + '" value="' + escapeHtml(col.label) + '" style="width:140px"></td>'
          html += '<td><input type="text" class="ace-field cm-col-path" data-mi="' + mi + '" data-ci="' + ci + '" value="' + escapeHtml(col.path) + '" style="width:140px"></td>'
          html += '<td><button type="button" class="btn-small cm-col-remove" data-mi="' + mi + '" data-ci="' + ci + '">Remove</button></td>'
          html += '</tr>'
        })
        html += '</tbody></table>'
      } else {
        html += '<p class="fg-secondary" style="font-size:0.85em">(no columns defined)</p>'
      }
      html += '<button type="button" class="btn-small add-btn cm-col-add" data-mi="' + mi + '" style="margin-top:4px">Add column</button>'
      if ((model.kind || 'simple') === 'grouped') {
        var tpl = cmEnsureTemplate(model)
        var colCount = Math.max(1, model.columns.length)
        html += '<div style="margin-top:10px;border-top:1px solid #ececec;padding-top:10px">'
        html += '<h4 style="margin:0 0 8px 0">Grouped Template Wizard</h4>'
        html += '<label style="font-size:0.85em;display:block;margin-bottom:8px">Header Rows <select class="ace-field cm-header-row-count" data-mi="' + mi + '" style="width:100px"><option value="1"' + (tpl.headerRows.length === 1 ? ' selected' : '') + '>1</option><option value="2"' + (tpl.headerRows.length === 2 ? ' selected' : '') + '>2</option></select></label>'
        html += '<div style="margin-bottom:8px"><strong style="font-size:0.9em">Header Rows</strong>'
        tpl.headerRows.forEach(function (headerRow, hri) {
          html += '<div style="display:grid;grid-template-columns:repeat(' + colCount + ', minmax(120px, 1fr));gap:6px;margin-top:6px">'
          for (var hci = 0; hci < colCount; hci++) {
            html += '<input type="text" class="ace-field cm-header-cell" data-mi="' + mi + '" data-hri="' + hri + '" data-hci="' + hci + '" value="' + escapeHtml(headerRow[hci] || '') + '" placeholder="Header ' + (hci + 1) + '">'
          }
          html += '</div>'
        })
        html += '</div>'

        ;['containerIntroRows', 'itemRows'].forEach(function (sectionName) {
          var sectionLabel = sectionName === 'containerIntroRows' ? 'Container Intro Rows' : 'Per-Item Rows'
          var rows = tpl[sectionName] || []
          html += '<div style="margin-bottom:10px"><div style="display:flex;justify-content:space-between;align-items:center"><strong style="font-size:0.9em">' + sectionLabel + '</strong><button type="button" class="btn-small add-btn cm-row-add" data-mi="' + mi + '" data-section="' + sectionName + '">Add Row</button></div>'
          rows.forEach(function (row, ri) {
            html += '<div style="border:1px solid #ececec;border-radius:6px;padding:8px;margin-top:8px">'
            html += '<div style="display:flex;justify-content:flex-end;margin-bottom:6px"><button type="button" class="btn-small cm-row-remove" data-mi="' + mi + '" data-section="' + sectionName + '" data-ri="' + ri + '">Remove Row</button></div>'
            html += '<div style="display:grid;grid-template-columns:repeat(' + colCount + ', minmax(140px, 1fr));gap:8px">'
            for (var ci = 0; ci < colCount; ci++) {
              html += cmRenderCellEditor(mi, sectionName, ri, ci, row[ci])
            }
            html += '</div></div>'
          })
          html += '</div>'
        })
        html += '<div style="margin-top:8px"><strong style="font-size:0.9em">Live Preview</strong>'
        html += cmRenderPreviewTable(model)
        html += '</div>'
        html += '</div>'
      }
      html += '</div>'
    })

    html += '<details style="margin-top:12px"><summary class="fg-secondary" style="cursor:pointer;font-size:0.85em">Show raw markdown (read-only)</summary>'
    html += '<textarea class="large ace-field--full" rows="12" readonly style="margin-top:8px;opacity:0.7">' + escapeHtml(raw) + '</textarea>'
    html += '</details>'

    panel.innerHTML = html

    // Exclusion rules bindings (moved from General to Content Tables)
    var exclEnabledEl = document.getElementById('ct-excl-enabled')
    if (exclEnabledEl) {
      exclEnabledEl.onchange = function () {
        if (!state.editedModel.config.contentTable) state.editedModel.config.contentTable = {}
        if (!state.editedModel.config.contentTable.exclusionRules) state.editedModel.config.contentTable.exclusionRules = { enabled: false, rules: [] }
        state.editedModel.config.contentTable.exclusionRules.enabled = this.checked
        showUnsavedBanner()
        updateFooterButtons()
      }
    }
    function getExclRulesArr () {
      if (!state.editedModel.config.contentTable) state.editedModel.config.contentTable = {}
      if (!state.editedModel.config.contentTable.exclusionRules) state.editedModel.config.contentTable.exclusionRules = { enabled: false, rules: [] }
      if (!Array.isArray(state.editedModel.config.contentTable.exclusionRules.rules)) state.editedModel.config.contentTable.exclusionRules.rules = []
      state.editedModel.config.contentTable.exclusionRules.rules = state.editedModel.config.contentTable.exclusionRules.rules.map(function (rule, idx) {
        return normalizeExclRuleForEditor(rule, idx)
      })
      return state.editedModel.config.contentTable.exclusionRules.rules
    }
    document.querySelectorAll('.ct-excl-name, .ct-excl-rule-enabled, .ct-excl-target, .ct-excl-match, .ct-excl-pattern, .ct-excl-action, .ct-excl-confidence, .ct-excl-note').forEach(function (el) {
      el.onchange = function () {
        var i = parseInt(this.getAttribute('data-i'), 10)
        var rules = getExclRulesArr()
        if (!rules[i]) return
        if (this.classList.contains('ct-excl-name')) rules[i].name = this.value
        if (this.classList.contains('ct-excl-rule-enabled')) rules[i].enabled = !!this.checked
        if (this.classList.contains('ct-excl-target')) rules[i].matchTarget = this.value
        if (this.classList.contains('ct-excl-match')) rules[i].matchType = this.value
        if (this.classList.contains('ct-excl-pattern')) rules[i].pattern = this.value
        if (this.classList.contains('ct-excl-action')) rules[i].action = this.value
        if (this.classList.contains('ct-excl-confidence')) rules[i].confidence = this.value
        if (this.classList.contains('ct-excl-note')) rules[i].note = this.value
        showUnsavedBanner()
        updateFooterButtons()
      }
    })
    document.querySelectorAll('.ct-excl-remove').forEach(function (btn) {
      btn.onclick = function () {
        var i = parseInt(this.getAttribute('data-i'), 10)
        var rules = getExclRulesArr()
        rules.splice(i, 1)
        showUnsavedBanner()
        renderContentModelsTab()
      }
    })
    var exclAddBtn = document.getElementById('ct-excl-add')
    if (exclAddBtn) {
      exclAddBtn.onclick = function () {
        var rules = getExclRulesArr()
        rules.push({ name: '', enabled: true, matchTarget: 'content', matchType: 'contains', pattern: '', action: 'exclude', confidence: 'high', note: '' })
        showUnsavedBanner()
        renderContentModelsTab()
      }
    }
    var exclPresetBtn = document.getElementById('ct-excl-add-presets')
    if (exclPresetBtn) {
      exclPresetBtn.onclick = function () {
        var rules = getExclRulesArr()
        var presets = [
          { name: 'Empty placeholder dashes', enabled: true, matchTarget: 'content', matchType: 'regex', pattern: '^[\\\\s\\\\-–—]{2,}$', action: 'exclude', confidence: 'high', note: '2+ dash-like chars (hyphen/en dash/em dash), optional spaces' },
          { name: 'Em dash filler', enabled: true, matchTarget: 'content', matchType: 'exact', pattern: '—', action: 'exclude', confidence: 'high', note: 'Single em dash placeholder' },
          { name: 'Date/time stamp', enabled: true, matchTarget: 'content', matchType: 'regex', pattern: '\\\\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Sept|Oct|Nov|Dec)\\\\s+\\\\d{1,2}(?:,\\\\s*\\\\d{2,4})?(?:\\\\s+\\\\d{1,2}:\\\\d{2}(?:\\\\s?[AP]M)?)?(?:\\\\s+[A-Z]{2,4})?\\\\b|\\\\b(?:\\\\d{1,2}[:.]\\\\d{2}(?:\\\\s?[AP]M)?|(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun)|\\\\d{1,2}[/-]\\\\d{1,2}(?:[/-]\\\\d{2,4})?)\\\\b', action: 'exclude', confidence: 'high', note: 'Common date/time snippets' },
          { name: 'Basic nav labels', enabled: true, matchTarget: 'content', matchType: 'regex', pattern: '^(?:home|search|menu|settings|profile|back|next|close)$', action: 'exclude', confidence: 'high', note: 'Short navigation UI strings' },
          { name: 'Ticker-like uppercase', enabled: true, matchTarget: 'content', matchType: 'regex', pattern: '^[A-Z]{2,5}$', action: 'flag', confidence: 'low', note: 'Review, do not auto-exclude' }
        ]
        presets.forEach(function (p) { rules.push(p) })
        showUnsavedBanner()
        renderContentModelsTab()
      }
    }

    function syncToRaw () {
      state.editedModel.contentModelsRaw = serializeContentModels(cmParsedState.header, cmParsedState.models)
      showUnsavedBanner()
    }
    document.querySelectorAll('.cm-label').forEach(function (el) {
      el.onchange = function () { var mi = parseInt(this.getAttribute('data-mi'), 10); cmParsedState.models[mi].label = this.value; syncToRaw() }
    })
    document.querySelectorAll('.cm-desc').forEach(function (el) {
      el.onchange = function () { var mi = parseInt(this.getAttribute('data-mi'), 10); cmParsedState.models[mi].description = this.value; syncToRaw() }
    })
    document.querySelectorAll('.cm-enabled').forEach(function (el) {
      el.onchange = function () { var mi = parseInt(this.getAttribute('data-mi'), 10); cmParsedState.models[mi].enabled = this.checked; syncToRaw() }
    })
    document.querySelectorAll('.cm-kind').forEach(function (el) {
      el.onchange = function () {
        var mi = parseInt(this.getAttribute('data-mi'), 10)
        var model = cmParsedState.models[mi]
        model.kind = this.value === 'grouped' ? 'grouped' : 'simple'
        if (model.kind === 'grouped') cmEnsureTemplate(model)
        syncToRaw()
        renderContentModelsTab()
      }
    })
    document.querySelectorAll('.cm-header-row-count').forEach(function (el) {
      el.onchange = function () {
        var mi = parseInt(this.getAttribute('data-mi'), 10)
        var model = cmParsedState.models[mi]
        var tpl = cmEnsureTemplate(model)
        var count = parseInt(this.value, 10) === 2 ? 2 : 1
        while (tpl.headerRows.length < count) tpl.headerRows.push(cmEmptyRow(Math.max(1, model.columns.length)))
        if (tpl.headerRows.length > count) tpl.headerRows = tpl.headerRows.slice(0, count)
        syncToRaw()
        renderContentModelsTab()
      }
    })
    document.querySelectorAll('.cm-header-cell').forEach(function (el) {
      el.onchange = function () {
        var mi = parseInt(this.getAttribute('data-mi'), 10)
        var hri = parseInt(this.getAttribute('data-hri'), 10)
        var hci = parseInt(this.getAttribute('data-hci'), 10)
        var tpl = cmEnsureTemplate(cmParsedState.models[mi])
        if (!tpl.headerRows[hri]) tpl.headerRows[hri] = cmEmptyRow(Math.max(1, cmParsedState.models[mi].columns.length))
        tpl.headerRows[hri][hci] = this.value
        syncToRaw()
      }
    })
    document.querySelectorAll('.cm-col-key, .cm-col-label, .cm-col-path').forEach(function (el) {
      el.onchange = function () {
        var mi = parseInt(this.getAttribute('data-mi'), 10)
        var ci = parseInt(this.getAttribute('data-ci'), 10)
        var col = cmParsedState.models[mi].columns[ci]
        if (!col) return
        if (this.classList.contains('cm-col-key')) col.key = this.value
        if (this.classList.contains('cm-col-label')) col.label = this.value
        if (this.classList.contains('cm-col-path')) col.path = this.value
        syncToRaw()
      }
    })
    document.querySelectorAll('.cm-col-remove').forEach(function (btn) {
      btn.onclick = function () {
        var mi = parseInt(this.getAttribute('data-mi'), 10)
        var ci = parseInt(this.getAttribute('data-ci'), 10)
        var model = cmParsedState.models[mi]
        model.columns.splice(ci, 1)
        if (model.kind === 'grouped') cmEnsureTemplate(model)
        syncToRaw()
        renderContentModelsTab()
      }
    })
    document.querySelectorAll('.cm-col-add').forEach(function (btn) {
      btn.onclick = function () {
        var mi = parseInt(this.getAttribute('data-mi'), 10)
        var model = cmParsedState.models[mi]
        model.columns.push({ key: 'newCol', label: 'New Column', path: '' })
        if (model.kind === 'grouped') cmEnsureTemplate(model)
        syncToRaw()
        renderContentModelsTab()
      }
    })
    document.querySelectorAll('.cm-row-add').forEach(function (btn) {
      btn.onclick = function () {
        var mi = parseInt(this.getAttribute('data-mi'), 10)
        var section = this.getAttribute('data-section')
        var model = cmParsedState.models[mi]
        var tpl = cmEnsureTemplate(model)
        tpl[section].push(cmEmptyRow(Math.max(1, model.columns.length)))
        syncToRaw()
        renderContentModelsTab()
      }
    })
    document.querySelectorAll('.cm-row-remove').forEach(function (btn) {
      btn.onclick = function () {
        var mi = parseInt(this.getAttribute('data-mi'), 10)
        var section = this.getAttribute('data-section')
        var ri = parseInt(this.getAttribute('data-ri'), 10)
        var model = cmParsedState.models[mi]
        var tpl = cmEnsureTemplate(model)
        tpl[section].splice(ri, 1)
        syncToRaw()
        renderContentModelsTab()
      }
    })
    document.querySelectorAll('.cm-cell-type').forEach(function (el) {
      el.onchange = function () {
        var mi = parseInt(this.getAttribute('data-mi'), 10)
        var section = this.getAttribute('data-section')
        var ri = parseInt(this.getAttribute('data-ri'), 10)
        var ci = parseInt(this.getAttribute('data-ci'), 10)
        var model = cmParsedState.models[mi]
        var tpl = cmEnsureTemplate(model)
        if (!tpl[section][ri]) tpl[section][ri] = cmEmptyRow(Math.max(1, model.columns.length))
        if (this.value === 'blank') tpl[section][ri][ci] = ''
        else if (this.value === 'static') tpl[section][ri][ci] = { type: 'static', text: '' }
        else if (this.value === 'field') tpl[section][ri][ci] = { type: 'field', field: 'content' }
        else if (this.value === 'link') tpl[section][ri][ci] = { type: 'link', label: { type: 'static', text: 'View in Figma' }, hrefField: 'containerUrl' }
        syncToRaw()
        renderContentModelsTab()
      }
    })
    document.querySelectorAll('.cm-cell-static').forEach(function (el) {
      el.onchange = function () {
        var mi = parseInt(this.getAttribute('data-mi'), 10)
        var section = this.getAttribute('data-section')
        var ri = parseInt(this.getAttribute('data-ri'), 10)
        var ci = parseInt(this.getAttribute('data-ci'), 10)
        var tpl = cmEnsureTemplate(cmParsedState.models[mi])
        var cell = tpl[section][ri][ci]
        if (typeof cell === 'string') tpl[section][ri][ci] = this.value
        else tpl[section][ri][ci] = { type: 'static', text: this.value }
        syncToRaw()
      }
    })
    document.querySelectorAll('.cm-cell-field').forEach(function (el) {
      el.onchange = function () {
        var mi = parseInt(this.getAttribute('data-mi'), 10)
        var section = this.getAttribute('data-section')
        var ri = parseInt(this.getAttribute('data-ri'), 10)
        var ci = parseInt(this.getAttribute('data-ci'), 10)
        var tpl = cmEnsureTemplate(cmParsedState.models[mi])
        tpl[section][ri][ci] = { type: 'field', field: this.value || 'content' }
        syncToRaw()
      }
    })
    document.querySelectorAll('.cm-cell-link-label').forEach(function (el) {
      el.onchange = function () {
        var mi = parseInt(this.getAttribute('data-mi'), 10)
        var section = this.getAttribute('data-section')
        var ri = parseInt(this.getAttribute('data-ri'), 10)
        var ci = parseInt(this.getAttribute('data-ci'), 10)
        var tpl = cmEnsureTemplate(cmParsedState.models[mi])
        var current = tpl[section][ri][ci]
        var hrefField = (current && current.hrefField) || 'containerUrl'
        tpl[section][ri][ci] = { type: 'link', label: { type: 'static', text: this.value }, hrefField: hrefField }
        syncToRaw()
      }
    })
    document.querySelectorAll('.cm-cell-link-href').forEach(function (el) {
      el.onchange = function () {
        var mi = parseInt(this.getAttribute('data-mi'), 10)
        var section = this.getAttribute('data-section')
        var ri = parseInt(this.getAttribute('data-ri'), 10)
        var ci = parseInt(this.getAttribute('data-ci'), 10)
        var tpl = cmEnsureTemplate(cmParsedState.models[mi])
        var current = tpl[section][ri][ci]
        var label = 'View in Figma'
        if (current && current.label) {
          if (typeof current.label === 'string') label = current.label
          else if (current.label.type === 'static') label = current.label.text || label
        }
        tpl[section][ri][ci] = { type: 'link', label: { type: 'static', text: label }, hrefField: this.value || 'containerUrl' }
        syncToRaw()
      }
    })
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

    let html = '<div class="ace-section-header-row">'
    html += '<h2 class="ace-section-title">Design System Registries</h2>'
    html += '<button type="button" class="ace-section-header-btn" id="reset-registries-btn">' + RESET_SECTION_BTN_LABEL + '</button>'
    html += '</div>'
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

  function doLogout () {
    return (async function () {
      try { await apiAuthLogout() } catch (_) {}
      state.auth = { user: null, role: null, allowedTabs: [], assistantScope: [] }
      state.originalModel = null
      state.editedModel = null
      state.usersList = []
      showLoginView()
      bindAuthForms()
    })()
  }

  /** Tab ids for Set Access checkboxes (matches server VALID_TAB_IDS; includes visible nav tabs only). */
  const USERS_SET_ACCESS_TAB_IDS = ['config', 'ai', 'assistants', 'knowledge-bases', 'content-models', 'registries', 'analytics', 'users']
  const USERS_SET_ACCESS_LABELS = { config: 'General', ai: 'AI', assistants: 'Assistants', 'knowledge-bases': 'Resources', 'content-models': 'Evergreens', registries: 'Design Systems', analytics: 'Analytics', users: 'Users' }
  function getRoleDefaultTabs (role) {
    if (role === 'admin' || role === 'manager' || role === 'editor') return USERS_SET_ACCESS_TAB_IDS.slice()
    return ['config', 'users']
  }
  function getEffectiveTabsForUser (u) {
    if (u.allowedTabs && u.allowedTabs.length > 0) return u.allowedTabs
    return getRoleDefaultTabs(u.role)
  }

  function renderUsersTab () {
    const panel = document.getElementById('panel-users')
    if (!panel) return
    if (state.auth.role !== 'admin') {
      panel.innerHTML = '<div class="ace-section-header-row"><h2 class="ace-section-title">Users</h2></div><p class="ace-users-unauthorized">Not authorized to view this section.</p>'
      return
    }
    function buildUsersHeader () {
      return '<div class="ace-section-header-row">' +
        '<h2 class="ace-section-title">Users</h2>' +
        '<button type="button" class="ace-section-header-btn" id="reset-users-btn">' + RESET_SECTION_BTN_LABEL + '</button>' +
        '</div>'
    }
    panel.innerHTML = buildUsersHeader() + '<div class="ace-users-loading">Loading users…</div>'
    apiUsersList()
      .then(function (users) {
        state.usersList = users
        let html = buildUsersHeader()
        html += '<div class="ace-users-manage">'
        html += '<div class="ace-users-create-card ace-card">'
        html += '<h4 class="ace-users-subtitle">Create user</h4>'
        html += '<form id="users-create-form" class="ace-users-form">'
        html += '<div class="ace-users-form-row"><label for="users-create-username" class="ace-field-label">Username</label><input type="text" id="users-create-username" class="ace-text-input ace-field" required /></div>'
        html += '<div class="ace-users-form-row"><label for="users-create-password" class="ace-field-label">Password</label><input type="password" id="users-create-password" class="ace-text-input ace-field" required minlength="8" /></div>'
        html += '<div class="ace-users-form-row"><label for="users-create-role" class="ace-field-label">Role</label><select id="users-create-role" class="ace-text-input ace-field">'
        html += '<option value="reviewer">Reviewer</option><option value="editor">Editor</option><option value="manager">Manager</option><option value="admin">Admin</option></select></div>'
        html += '<div class="ace-users-form-row ace-users-form-actions"><button type="submit" class="btn btn-primary">Create</button></div>'
        html += '</form></div>'
        html += '<div class="ace-users-list-card ace-card">'
        html += '<h4 class="ace-users-subtitle">Users</h4>'
        html += '<div class="ace-users-list" id="ace-users-list"></div></div>'
        html += '</div>'
        panel.innerHTML = html
        const resetUsersBtn = document.getElementById('reset-users-btn')
        if (resetUsersBtn) resetUsersBtn.onclick = function () { renderUsersTab() }
        const listEl = document.getElementById('ace-users-list')
        users.forEach(function (u) {
          const isAdminRow = u.role === 'admin'
          const wrapper = document.createElement('div')
          wrapper.className = 'ace-users-row-wrapper'
          wrapper.setAttribute('data-user-id', u.id)
          const row = document.createElement('div')
          row.className = 'ace-users-row' + (u.disabled ? ' ace-users-row--disabled' : '')
          row.setAttribute('data-user-id', u.id)
          let rowHtml = '<div class="ace-users-row-identity">'
          rowHtml += '<span class="ace-users-username" title="' + escapeHtml(u.username) + '">' + escapeHtml(u.username) + '</span>'
          rowHtml += '<span class="ace-role-badge ace-role-badge--' + (u.role || '') + '">' + escapeHtml(roleBadgeLabel(u.role)) + '</span>'
          if (u.disabled) rowHtml += ' <span class="ace-users-disabled">(disabled)</span>'
          rowHtml += '</div>'
          rowHtml += '<div class="ace-users-actions">'
          if (isAdminRow) {
            rowHtml += '<button type="button" class="btn btn-small btn-secondary ace-users-btn-reset-pw" data-id="' + escapeHtml(u.id) + '"><span class="ace-users-btn-label">Reset password</span></button>'
          } else {
            rowHtml += '<button type="button" class="btn btn-small btn-secondary ace-users-btn-disable" data-id="' + escapeHtml(u.id) + '" data-disabled="' + (u.disabled ? 'true' : 'false') + '">' + (u.disabled ? 'Enable' : 'Disable') + '</button>'
            rowHtml += '<select class="ace-users-role-select" data-id="' + escapeHtml(u.id) + '"><option value="reviewer"' + (u.role === 'reviewer' ? ' selected' : '') + '>Reviewer</option><option value="editor"' + (u.role === 'editor' ? ' selected' : '') + '>Editor</option><option value="manager"' + (u.role === 'manager' ? ' selected' : '') + '>Manager</option><option value="admin"' + (u.role === 'admin' ? ' selected' : '') + '>Admin</option></select>'
            rowHtml += '<button type="button" class="btn btn-small btn-secondary ace-users-btn-reset-pw" data-id="' + escapeHtml(u.id) + '"><span class="ace-users-btn-label">Reset password</span></button>'
            rowHtml += '<button type="button" class="ace-users-chevron-btn ace-users-chevron-down" data-id="' + escapeHtml(u.id) + '" aria-label="Set access">'
            rowHtml += '<img src="/assets/icons/ChevronDownIcon.svg" alt="" width="20" height="20" aria-hidden="true" />'
            rowHtml += '</button>'
          }
          rowHtml += '</div>'
          row.innerHTML = rowHtml
          wrapper.appendChild(row)
          if (!isAdminRow) {
            const effectiveTabs = getEffectiveTabsForUser(u)
            let setAccessHtml = '<div class="ace-users-set-access">'
            setAccessHtml += '<h5 class="ace-users-set-access-title">Set Access</h5>'
            setAccessHtml += '<div class="ace-users-set-access-tabs">'
            USERS_SET_ACCESS_TAB_IDS.forEach(function (tabId) {
              const label = USERS_SET_ACCESS_LABELS[tabId] || tabId
              const checked = effectiveTabs.indexOf(tabId) !== -1
              setAccessHtml += '<label class="ace-users-set-access-check"><input type="checkbox" class="ace-users-tab-cb" data-tab-id="' + escapeHtml(tabId) + '" ' + (checked ? 'checked' : '') + ' /><span>' + escapeHtml(label) + '</span></label>'
            })
            setAccessHtml += '</div><div class="ace-users-set-access-actions">'
            setAccessHtml += '<button type="button" class="btn btn-small btn-primary ace-users-save-access-btn" data-id="' + escapeHtml(u.id) + '" data-saved-tabs="' + escapeHtml(JSON.stringify(effectiveTabs)) + '">Save access</button>'
            setAccessHtml += '<span class="ace-users-set-access-feedback" aria-live="polite"></span>'
            setAccessHtml += '</div></div>'
            const expanded = document.createElement('div')
            expanded.className = 'ace-users-row-expanded'
            expanded.setAttribute('data-user-id', u.id)
            expanded.innerHTML = setAccessHtml
            expanded.style.display = 'none'
            wrapper.appendChild(expanded)
          }
          listEl.appendChild(wrapper)
        })
        const createForm = document.getElementById('users-create-form')
        if (createForm) {
          createForm.onsubmit = async function (e) {
            e.preventDefault()
            const username = (document.getElementById('users-create-username') || {}).value
            const password = (document.getElementById('users-create-password') || {}).value
            const role = (document.getElementById('users-create-role') || {}).value
            if (!username || !password) return
            try {
              await apiUsersCreate(username, password, role)
              renderUsersTab()
            } catch (err) {
              showActionModal({ state: 'error', message: err.message || 'Create user failed' })
            }
          }
        }
        panel.querySelectorAll('.ace-users-btn-disable').forEach(function (btn) {
          btn.onclick = async function () {
            const id = this.getAttribute('data-id')
            const currentlyDisabled = this.getAttribute('data-disabled') === 'true'
            try {
              await apiUsersUpdate(id, { disabled: !currentlyDisabled })
              renderUsersTab()
            } catch (err) {
              showActionModal({ state: 'error', message: err.message || 'Update failed' })
            }
          }
        })
        panel.querySelectorAll('.ace-users-role-select').forEach(function (sel) {
          sel.onchange = async function () {
            const id = this.getAttribute('data-id')
            const role = this.value
            try {
              await apiUsersUpdate(id, { role: role })
              renderUsersTab()
            } catch (err) {
              showActionModal({ state: 'error', message: err.message || 'Update failed' })
            }
          }
        })
        panel.querySelectorAll('.ace-users-btn-reset-pw').forEach(function (btn) {
          btn.onclick = async function () {
            const id = this.getAttribute('data-id')
            const newPassword = window.prompt('New password (min 8 characters):')
            if (newPassword == null || newPassword.length < 8) return
            try {
              await apiUsersUpdate(id, { password: newPassword })
              showActionModal({ state: 'success', message: 'Password updated.' })
              renderUsersTab()
            } catch (err) {
              showActionModal({ state: 'error', message: err.message || 'Reset password failed' })
            }
          }
        })
        panel.querySelectorAll('.ace-users-chevron-btn').forEach(function (btn) {
          btn.onclick = function () {
            const id = this.getAttribute('data-id')
            const wrapper = this.closest('.ace-users-row-wrapper')
            if (!wrapper) return
            const expanded = wrapper.querySelector('.ace-users-row-expanded')
            if (!expanded) return
            const isOpen = expanded.style.display !== 'none'
            expanded.style.display = isOpen ? 'none' : 'block'
            const img = this.querySelector('img')
            if (img) img.src = isOpen ? '/assets/icons/ChevronDownIcon.svg' : '/assets/icons/ChevronUpIcon.svg'
            this.classList.toggle('ace-users-chevron-down', isOpen)
            this.classList.toggle('ace-users-chevron-up', !isOpen)
          }
        })
        function getCheckedTabs (expanded) {
          const checked = []
          if (!expanded) return checked
          expanded.querySelectorAll('.ace-users-tab-cb:checked').forEach(function (cb) {
            const tabId = cb.getAttribute('data-tab-id')
            if (tabId) checked.push(tabId)
          })
          return checked
        }
        function getSavedTabsFromBtn (saveBtn) {
          try {
            const raw = saveBtn.getAttribute('data-saved-tabs')
            return raw ? JSON.parse(raw) : []
          } catch (_) { return [] }
        }
        function arraysEqual (a, b) {
          if (a.length !== b.length) return false
          const as = a.slice().sort()
          const bs = b.slice().sort()
          return as.every(function (v, i) { return v === bs[i] })
        }
        function updateSaveAccessButtonState (expanded) {
          const saveBtn = expanded.querySelector('.ace-users-save-access-btn')
          const feedback = expanded.querySelector('.ace-users-set-access-feedback')
          if (!saveBtn) return
          const checked = getCheckedTabs(expanded)
          const saved = getSavedTabsFromBtn(saveBtn)
          const dirty = !arraysEqual(checked, saved)
          saveBtn.disabled = !dirty
          if (feedback) feedback.textContent = ''
        }
        panel.querySelectorAll('.ace-users-row-expanded').forEach(function (expanded) {
          expanded.querySelectorAll('.ace-users-tab-cb').forEach(function (cb) {
            cb.addEventListener('change', function () {
              // #region agent log
              if (ACE_DEBUG) console.log('[Save access] checkbox changed (no PATCH yet)')
              // #endregion
              updateSaveAccessButtonState(expanded)
            })
          })
          updateSaveAccessButtonState(expanded)
        })
        panel.querySelectorAll('.ace-users-save-access-btn').forEach(function (btn) {
          btn.onclick = async function () {
            const id = this.getAttribute('data-id')
            const expanded = this.closest('.ace-users-row-expanded')
            if (!expanded) return
            const checked = getCheckedTabs(expanded)
            const saved = getSavedTabsFromBtn(this)
            if (arraysEqual(checked, saved)) {
              const feedback = expanded.querySelector('.ace-users-set-access-feedback')
              if (feedback) feedback.textContent = 'No changes to save.'
              return
            }
            const requestId = 'saveAccess:' + id + ':' + Date.now()
            // #region agent log
            if (ACE_DEBUG) {
              debugLog('app.js:SaveAccess:click', 'Save access click (one PATCH per click)', { requestId: requestId, userId: id, checked: checked, payload: { allowedTabs: checked }, url: API_BASE + '/api/users/' + encodeURIComponent(id), method: 'PATCH' })
              console.log('[Save access] requestId:', requestId, 'userId:', id, 'checked:', checked, 'payload:', { allowedTabs: checked }, 'URL:', API_BASE + '/api/users/' + encodeURIComponent(id), 'method: PATCH', 'headers: Content-Type: application/json, X-ACE-Request-Id:', requestId)
            }
            // #endregion
            const feedback = expanded.querySelector('.ace-users-set-access-feedback')
            if (feedback) feedback.textContent = ''
            const payload = { allowedTabs: checked }
            try {
              await apiUsersUpdate(id, payload, requestId)
              this.setAttribute('data-saved-tabs', JSON.stringify(checked))
              this.disabled = true
              if (feedback) {
                feedback.textContent = 'Access saved.'
                feedback.classList.remove('ace-users-set-access-feedback--error')
              }
              var u = state.usersList.find(function (x) { return x.id === id })
              if (u) u.allowedTabs = checked
            } catch (err) {
              if (feedback) {
                feedback.textContent = err.message || 'Save access failed'
                feedback.classList.add('ace-users-set-access-feedback--error')
              } else {
                showActionModal({ state: 'error', message: err.message || 'Save access failed' })
              }
            }
          }
        })
      })
      .catch(function (err) {
        panel.innerHTML = buildUsersHeader() + '<p class="errors ace-users-error">' + escapeHtml(err.message || 'Failed to load users') + '</p>'
      })
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
    renderAITab()
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

  // ——— Analytics dashboard (demo only; no live data) ———
  var ANALYTICS_TAXONOMY = [
    { type: 'plugin_open', when: 'User opens the plugin', fields: 'type, timestamp, sessionId' },
    { type: 'assistant_run', when: 'User starts an assistant action', fields: 'type, timestamp, sessionId, properties (assistantId, actionId)' },
    { type: 'assistant_complete', when: 'Assistant run finishes', fields: 'type, timestamp, sessionId, properties (assistantId, success, errorCode)' },
    { type: 'tool_call', when: 'A tool is invoked', fields: 'type, timestamp, sessionId, properties (toolId, success)' },
    { type: 'error', when: 'An error is tracked', fields: 'type, timestamp, sessionId, properties (errorCode, context)' },
    { type: 'settings_change', when: 'User changes settings', fields: 'type, timestamp, sessionId, properties (key)' }
  ]
  var ANALYTICS_LIFECYCLE_STAGES = ['plugin_open', 'assistant_run', 'assistant_complete', 'tool_call', 'error', 'settings_change']
  var ANALYTICS_FLOW_COVERAGE = {
    'Open plugin': { plugin_open: true },
    'Assistant run': { assistant_run: true },
    'Tool call': { tool_call: true },
    'Assistant complete': { assistant_complete: true },
    'Error': { error: true },
    'Settings change': { settings_change: true }
  }
  var ANALYTICS_PRIVACY_DIMENSIONS = [
    { name: 'Identity', guardrails: ['No PII; session UUID only (24h expiry)'] },
    { name: 'Design content', guardrails: ['No file names, document IDs, node IDs, or geometry'] },
    { name: 'File content', guardrails: ['No prompts, user messages, or model outputs'] },
    { name: 'Free-form text', guardrails: ['Only event types, codes, and setting key names (not values)'] },
    { name: 'Network exposure', guardrails: ['HTTPS endpoint only; configurable via config'] }
  ]
  var ANALYTICS_SAMPLE_PAYLOADS = {
    plugin_open: { type: 'plugin_open', timestamp: 1705800000000, sessionId: 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx', properties: {} },
    assistant_run: { type: 'assistant_run', timestamp: 1705800001000, sessionId: 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx', properties: { assistantId: 'design_critique', actionId: 'give-critique' } },
    assistant_complete: { type: 'assistant_complete', timestamp: 1705800001500, sessionId: 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx', properties: { assistantId: 'design_critique', actionId: 'give-critique', success: true } },
    tool_call: { type: 'tool_call', timestamp: 1705800002000, sessionId: 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx', properties: { toolId: 'DESIGN_SYSTEM_QUERY' } },
    error: { type: 'error', timestamp: 1705800002500, sessionId: 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx', properties: { errorCode: 'provider_timeout', context: 'sendChat' } },
    settings_change: { type: 'settings_change', timestamp: 1705800003000, sessionId: 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx', properties: { keys: ['llm.endpoint'] } }
  }

  /** Tabs that render their own ace-section-header-row and must NOT show the legacy #tab-subheader pretitle. */
  var HIDE_TAB_SUBHEADER_TABS = new Set(['config', 'ai', 'assistants', 'knowledge-bases', 'content-models', 'registries', 'analytics', 'users'])

  var TAB_SUBHEADERS = {
    config: 'General Plugin Settings',
    ai: 'AI',
    assistants: 'Assistants — Definitions and prompts',
    'knowledge-bases': 'Resources — ACE-managed instruction and reference docs',
    knowledge: 'Knowledge — Markdown files per assistant',
    'content-models': 'Content Models — Raw content model markdown',
    registries: 'Design System Registries — Registry JSON per design system',
    analytics: 'Analytics (Demo)',
    users: 'Users'
  }

  function switchTab (tabId) {
    const panelIds = ['panel-config', 'panel-ai', 'panel-assistants', 'panel-knowledge-bases', 'panel-knowledge', 'panel-content-models', 'panel-registries', 'panel-analytics', 'panel-users']
    const tabIds = ['config', 'ai', 'assistants', 'knowledge-bases', 'knowledge', 'content-models', 'registries', 'analytics', 'users']
    const allowedTabs = state.auth.allowedTabs || []
    const role = state.auth.role
    const firstAllowed = allowedTabs[0] || 'config'
    if (tabId === 'users' && role !== 'admin') {
      tabId = firstAllowed
      state.selectedTab = tabId
      showActionModal({ state: 'success', title: 'Not authorized', message: 'You do not have access to User Management.' })
    } else if (allowedTabs.length && allowedTabs.indexOf(tabId) === -1) {
      state.selectedTab = firstAllowed
      showActionModal({ state: 'success', title: 'Not authorized', message: 'You do not have access to that section.' })
      tabId = firstAllowed
    } else {
      state.selectedTab = tabId
    }
    var tabIndex = tabIds.indexOf(tabId)
    if (tabIndex === -1) {
      tabId = tabIds.indexOf(firstAllowed) !== -1 ? firstAllowed : (tabIds.indexOf('config') !== -1 ? 'config' : tabIds[0])
      state.selectedTab = tabId
      tabIndex = tabIds.indexOf(tabId)
      if (ACE_DEBUG) console.warn('[ACE] switchTab: unknown tabId, fell back to', tabId)
    }
    const tabButtons = document.querySelectorAll('.tabs button[role="tab"][data-tab]')
    tabButtons.forEach(function (btn) {
      const sel = btn.getAttribute('data-tab') === tabId
      btn.setAttribute('aria-selected', sel ? 'true' : 'false')
      if (sel) btn.setAttribute('aria-current', 'page')
      else btn.removeAttribute('aria-current')
      btn.classList.toggle('active', sel)
    })
    var PAGE_TITLES = { config: 'General', ai: 'AI', assistants: 'Assistants', 'knowledge-bases': 'Resources', 'content-models': 'Evergreens', registries: 'Design Systems', analytics: 'Analytics', users: 'Users', knowledge: 'Knowledge' }
    var pageTitleEl = document.getElementById('ace-page-title-text')
    if (pageTitleEl) pageTitleEl.textContent = PAGE_TITLES[tabId] || tabId
    const subheaderEl = document.getElementById('tab-subheader')
    if (subheaderEl) {
      if (HIDE_TAB_SUBHEADER_TABS.has(tabId)) {
        subheaderEl.textContent = ''
        subheaderEl.style.display = 'none'
      } else {
        subheaderEl.textContent = TAB_SUBHEADERS[tabId] || tabId
        subheaderEl.style.display = ''
      }
    }
    panelIds.forEach((pid, i) => {
      const panel = document.getElementById(pid)
      if (!panel) return
      const match = tabIds[i] === tabId
      panel.setAttribute('aria-hidden', match ? 'false' : 'true')
      panel.style.display = match ? 'flex' : 'none'
    })
    if (tabId === 'ai') renderAITab()
    if (tabId === 'analytics') renderAnalyticsTab()
    if (tabId === 'users') renderUsersTab()
    if (tabId === 'knowledge-bases') renderKnowledgeBasesTab()
  }

  function renderAnalyticsTab () {
    const panel = document.getElementById('panel-analytics')
    if (!panel) return
    const m = state.editedModel
    if (!m || !m.config) {
      panel.innerHTML = '<div class="ace-section-header-row"><h2 class="ace-section-title">Analytics (Demo)</h2></div><p class="ace-card-subtext">No config loaded.</p>'
      return
    }
    var analytics = m.config.analytics
    var enabled = analytics && analytics.enabled === true
    var endpointUrl = (analytics && typeof analytics.endpointUrl === 'string' && analytics.endpointUrl.trim()) ? analytics.endpointUrl.trim() : ''
    var maskedEndpoint = endpointUrl ? 'https://••••••••••••/endpoint' : 'Not configured'
    var firstSampleKey = Object.keys(ANALYTICS_SAMPLE_PAYLOADS)[0] || 'plugin_open'
    var sampleJson = JSON.stringify(ANALYTICS_SAMPLE_PAYLOADS[firstSampleKey], null, 2)

    var html = '<div class="ace-section-header-row"><h2 class="ace-section-title">Analytics (Demo)</h2></div>'
    html += '<div class="ace-analytics-disclaimer">Contract and config preview only. No events are collected or transmitted from this UI.</div>'
    html += '<div class="ace-cards ace-analytics-cards">'

    // Hero: Readiness Snapshot (Demo) — two donuts + payload budget bars
    var flowCoverageMapping = typeof ANALYTICS_FLOW_COVERAGE === 'object' && ANALYTICS_FLOW_COVERAGE !== null ? ANALYTICS_FLOW_COVERAGE : {}
    var flowKeys = Object.keys(flowCoverageMapping)
    var flowCoveredCount = 0
    flowKeys.forEach(function (f) {
      var row = flowCoverageMapping[f]
      if (row && typeof row === 'object' && Object.keys(row).some(function (et) { return row[et] === true })) flowCoveredCount++
    })
    var flowTotal = flowKeys.length
    var flowPct = flowTotal ? Math.round((flowCoveredCount / flowTotal) * 100) : 0
    var taxonomyTypes = Array.isArray(ANALYTICS_TAXONOMY) ? ANALYTICS_TAXONOMY.map(function (r) { return r.type }) : []
    var samples = typeof ANALYTICS_SAMPLE_PAYLOADS === 'object' && ANALYTICS_SAMPLE_PAYLOADS !== null ? ANALYTICS_SAMPLE_PAYLOADS : {}
    var eventReadyCount = taxonomyTypes.filter(function (t) { return samples[t] != null }).length
    var eventTotal = taxonomyTypes.length
    var eventPct = eventTotal ? Math.round((eventReadyCount / eventTotal) * 100) : 0
    var heroPayloadBytes = []
    Object.keys(samples).forEach(function (k) {
      heroPayloadBytes.push({ key: k, bytes: JSON.stringify(samples[k]).length })
    })
    heroPayloadBytes.sort(function (a, b) { return b.bytes - a.bytes })
    var topN = heroPayloadBytes.slice(0, 5)
    var heroMaxBytes = topN.length ? Math.max.apply(null, topN.map(function (x) { return x.bytes })) : 0

    html += '<div class="ace-card ace-analytics-hero-card">'
    html += '<h3 class="ace-card-title">Readiness Snapshot (Demo)</h3>'
    html += '<div class="ace-analytics-hero-grid">'
    html += '<div class="ace-analytics-hero-donuts">'
    html += '<div class="ace-analytics-donut-wrap">'
    html += '<h4 class="ace-analytics-donut-title">Flow Coverage</h4>'
    if (flowTotal === 0) {
      html += '<div class="ace-analytics-donut-placeholder">Not available</div>'
    } else {
      var r = 40
      var cx = 50
      var cy = 50
      var circ = 2 * Math.PI * r
      var dash = (flowPct / 100) * circ
      html += '<div class="ace-analytics-donut-inner"><svg class="ace-analytics-donut" viewBox="0 0 100 100" aria-hidden="true"><g transform="rotate(-90 ' + cx + ' ' + cy + ')"><circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="var(--ace-sidebar-bg, #eee)" stroke-width="12"/><circle cx="' + cx + '" cy="' + cy + '" r="' + r + '" fill="none" stroke="var(--ace-accent)" stroke-width="12" stroke-dasharray="' + dash + ' ' + circ + '"/></g></svg><div class="ace-analytics-donut-center"><span class="ace-analytics-donut-value">' + flowPct + '%</span><span class="ace-analytics-donut-num">' + flowCoveredCount + ' / ' + flowTotal + '</span></div></div>'
    }
    html += '<p class="ace-analytics-donut-copy">Derived from planned coverage matrix. Not live data.</p></div>'
    html += '<div class="ace-analytics-donut-wrap">'
    html += '<h4 class="ace-analytics-donut-title">Event Readiness</h4>'
    if (eventTotal === 0 || !Object.keys(samples).length) {
      html += '<div class="ace-analytics-donut-placeholder">No sample payloads defined</div>'
    } else {
      var dash2 = (eventPct / 100) * circ
      html += '<div class="ace-analytics-donut-inner"><svg class="ace-analytics-donut" viewBox="0 0 100 100" aria-hidden="true"><g transform="rotate(-90 50 50)"><circle cx="50" cy="50" r="40" fill="none" stroke="var(--ace-sidebar-bg, #eee)" stroke-width="12"/><circle cx="50" cy="50" r="40" fill="none" stroke="var(--ace-accent)" stroke-width="12" stroke-dasharray="' + dash2 + ' ' + circ + '"/></g></svg><div class="ace-analytics-donut-center"><span class="ace-analytics-donut-value">' + eventPct + '%</span><span class="ace-analytics-donut-num">' + eventReadyCount + ' / ' + eventTotal + '</span></div></div>'
    }
    html += '<p class="ace-analytics-donut-copy">Derived from demo payload templates. Not live data.</p></div>'
    html += '</div>'
    html += '<div class="ace-analytics-hero-bars-wrap">'
    html += '<h4 class="ace-analytics-hero-bars-title">Payload Budget (Top N)</h4>'
    if (topN.length === 0) {
      html += '<p class="ace-analytics-hero-bars-empty">No sample payloads defined</p>'
    } else {
      html += '<div class="ace-analytics-hero-bars">'
      topN.forEach(function (item) {
        var pct = heroMaxBytes > 0 ? (item.bytes / heroMaxBytes) * 100 : 0
        html += '<div class="ace-analytics-hero-bar-row"><span class="ace-analytics-hero-bar-label">' + escapeHtml(item.key) + '</span><div class="ace-analytics-hero-bar-track"><div class="ace-analytics-hero-bar-fill" style="width:' + pct + '%"></div></div><span class="ace-analytics-hero-bar-value">' + item.bytes + ' B</span></div>'
      })
      html += '</div>'
    }
    html += '<p class="ace-analytics-hero-bars-copy">Computed from sample JSON templates. Not live data.</p>'
    html += '</div></div></div>'

    // A) Config Readiness
    html += '<div class="ace-card ace-analytics-readiness">'
    html += '<h3 class="ace-card-title">Config readiness</h3>'
    html += '<p class="ace-card-subtext">Readiness for future wiring (from config). Endpoint domain must be in network allowlist (manifest/build).</p>'
    html += '<ul class="ace-analytics-readiness-list">'
    html += '<li class="ace-analytics-readiness-item"><span class="ace-analytics-readiness-label">Enabled</span><span class="ace-analytics-readiness-value">' + (enabled ? 'Yes' : 'Not configured') + '</span></li>'
    html += '<li class="ace-analytics-readiness-item"><span class="ace-analytics-readiness-label">Endpoint</span><span class="ace-analytics-readiness-value">' + (endpointUrl ? 'Configured' : 'Not configured') + '</span></li>'
    html += '<li class="ace-analytics-readiness-item ace-analytics-readiness-callout"><span class="ace-analytics-readiness-label">Network allowlist</span><span>Endpoint host must be in manifest allowlist (see build/docs).</span></li>'
    html += '</ul></div>'

    // B) Event lifecycle funnel (contract; no numbers)
    html += '<div class="ace-card ace-analytics-funnel-card">'
    html += '<h3 class="ace-card-title">Event lifecycle (contract)</h3>'
    html += '<p class="ace-card-subtext">Intended event journey (contract). Shows which events follow which in the design. Not live telemetry.</p>'
    html += '<div class="ace-analytics-funnel">'
    ANALYTICS_LIFECYCLE_STAGES.forEach(function (stage, i) {
      var label = stage.replace(/_/g, ' ')
      html += '<div class="ace-analytics-funnel-stage"><span class="ace-analytics-funnel-pill">' + escapeHtml(label) + '</span></div>'
      if (i < ANALYTICS_LIFECYCLE_STAGES.length - 1) html += '<div class="ace-analytics-funnel-arrow" aria-hidden="true">→</div>'
    })
    html += '</div></div>'

    // C) Coverage matrix (flows × events)
    var eventTypes = ANALYTICS_TAXONOMY.map(function (r) { return r.type })
    html += '<div class="ace-card ace-analytics-matrix-card">'
    html += '<h3 class="ace-card-title">Coverage matrix</h3>'
    html += '<p class="ace-card-subtext">Which events cover which user flows (contract). Not usage data.</p>'
    html += '<table class="ace-analytics-table ace-analytics-coverage-matrix"><thead><tr><th>Flow</th>'
    eventTypes.forEach(function (et) { html += '<th><code>' + escapeHtml(et) + '</code></th>' })
    html += '</tr></thead><tbody>'
    Object.keys(ANALYTICS_FLOW_COVERAGE).forEach(function (flow) {
      var row = ANALYTICS_FLOW_COVERAGE[flow]
      html += '<tr><td class="ace-analytics-matrix-flow">' + escapeHtml(flow) + '</td>'
      eventTypes.forEach(function (et) {
        var covered = row[et] === true
        html += '<td class="ace-analytics-matrix-cell' + (covered ? ' ace-analytics-matrix-covered' : '') + '">' + (covered ? '✓' : '') + '</td>'
      })
      html += '</tr>'
    })
    html += '</tbody></table></div>'

    // D) Payload surface area (bytes from sample JSON)
    var payloadBytes = {}
    var maxBytes = 0
    Object.keys(ANALYTICS_SAMPLE_PAYLOADS).forEach(function (k) {
      var len = JSON.stringify(ANALYTICS_SAMPLE_PAYLOADS[k]).length
      payloadBytes[k] = len
      if (len > maxBytes) maxBytes = len
    })
    html += '<div class="ace-card ace-analytics-bars-card">'
    html += '<h3 class="ace-card-title">Payload surface area</h3>'
    html += '<p class="ace-card-subtext">Approximate payload size per event (from sample JSON in this demo). For budget and batching awareness. Not live traffic.</p>'
    html += '<div class="ace-analytics-bars">'
    Object.keys(payloadBytes).forEach(function (k) {
      var bytes = payloadBytes[k]
      var pct = maxBytes > 0 ? (bytes / maxBytes) * 100 : 0
      html += '<div class="ace-analytics-bar-row">'
      html += '<span class="ace-analytics-bar-label">' + escapeHtml(k) + '</span>'
      html += '<div class="ace-analytics-bar-track"><div class="ace-analytics-bar-fill" style="width:' + pct + '%"></div></div>'
      html += '<span class="ace-analytics-bar-value">' + bytes + ' B</span></div>'
    })
    html += '</div></div>'

    // E) Privacy scorecard
    html += '<div class="ace-card ace-analytics-privacy-card">'
    html += '<h3 class="ace-card-title">Privacy posture (policy)</h3>'
    html += '<p class="ace-card-subtext">All dimensions minimized by design. No data collected in this dashboard.</p>'
    html += '<ul class="ace-analytics-privacy-list">'
    ANALYTICS_PRIVACY_DIMENSIONS.forEach(function (d) {
      html += '<li class="ace-analytics-privacy-item"><strong>' + escapeHtml(d.name) + '</strong>: ' + escapeHtml(d.guardrails.join(' ')) + '</li>'
    })
    html += '</ul></div>'

    // Config preview (existing read-only table)
    html += '<div class="ace-card ace-analytics-config-card">'
    html += '<h3 class="ace-card-title">Config preview (from plugin config)</h3>'
    html += '<p class="ace-card-subtext">Read-only. Values come from <code>config.analytics</code>.</p>'
    html += '<table class="ace-analytics-table"><tbody>'
    html += '<tr><td class="ace-analytics-table-label">Enabled</td><td>' + (enabled ? 'Yes' : 'No') + '</td></tr>'
    html += '<tr><td class="ace-analytics-table-label">Endpoint</td><td class="ace-analytics-endpoint-cell"><span class="ace-analytics-endpoint-value" data-masked="true">' + escapeHtml(maskedEndpoint) + '</span>'
    if (endpointUrl) {
      var attrEndpoint = endpointUrl.replace(/&/g, '&amp;').replace(/"/g, '&quot;')
      html += ' <button type="button" class="btn btn-small ace-analytics-reveal-btn" data-action="reveal-endpoint" data-endpoint="' + attrEndpoint + '">Show</button>'
    }
    html += '</td></tr>'
    html += '<tr><td class="ace-analytics-table-label">Flush interval (ms)</td><td>' + (analytics && typeof analytics.flushIntervalMs === 'number' ? String(analytics.flushIntervalMs) : 'Not set') + '</td></tr>'
    html += '<tr><td class="ace-analytics-table-label">Max batch size</td><td>' + (analytics && typeof analytics.maxBatchSize === 'number' ? String(analytics.maxBatchSize) : 'Not set') + '</td></tr>'
    html += '<tr><td class="ace-analytics-table-label">Max buffer</td><td>' + (analytics && typeof analytics.maxBuffer === 'number' ? String(analytics.maxBuffer) : 'Not set') + '</td></tr>'
    html += '<tr><td class="ace-analytics-table-label">Retry max attempts</td><td>' + (analytics && typeof analytics.retryMaxAttempts === 'number' ? String(analytics.retryMaxAttempts) : 'Not set') + '</td></tr>'
    html += '<tr><td class="ace-analytics-table-label">Retry base delay (ms)</td><td>' + (analytics && typeof analytics.retryBaseDelayMs === 'number' ? String(analytics.retryBaseDelayMs) : 'Not set') + '</td></tr>'
    html += '<tr><td class="ace-analytics-table-label">Debug</td><td>' + (analytics && analytics.debug === true ? 'Yes' : 'No') + '</td></tr>'
    html += '<tr><td class="ace-analytics-table-label">Sampling rate</td><td>Not set</td></tr>'
    html += '</tbody></table></div>'

    // Event taxonomy table
    html += '<div class="ace-card">'
    html += '<h3 class="ace-card-title">Event taxonomy (demo)</h3>'
    html += '<p class="ace-card-subtext">Planned event types and field contract. Sample only.</p>'
    html += '<table class="ace-analytics-table ace-analytics-taxonomy-table"><thead><tr><th>Event type</th><th>When</th><th>Required / optional fields</th></tr></thead><tbody>'
    ANALYTICS_TAXONOMY.forEach(function (row) {
      html += '<tr><td><code>' + escapeHtml(row.type) + '</code></td><td>' + escapeHtml(row.when) + '</td><td>' + escapeHtml(row.fields) + '</td></tr>'
    })
    html += '</tbody></table></div>'

    // Sample payload + Copy JSON
    html += '<div class="ace-card">'
    html += '<h3 class="ace-card-title">Sample payload (preview)</h3>'
    html += '<p class="ace-card-subtext">Example event JSON. Not live data.</p>'
    html += '<label for="analytics-sample-select" class="ace-field-label">Select sample</label>'
    html += '<select id="analytics-sample-select" class="ace-analytics-sample-select">'
    Object.keys(ANALYTICS_SAMPLE_PAYLOADS).forEach(function (key) {
      html += '<option value="' + escapeHtml(key) + '"' + (key === firstSampleKey ? ' selected' : '') + '>' + escapeHtml(key) + '</option>'
    })
    html += '</select>'
    html += '<pre id="analytics-sample-pre" class="ace-analytics-sample-pre">' + escapeHtml(sampleJson) + '</pre>'
    html += '<button type="button" class="btn btn-secondary" id="analytics-copy-json-btn" data-action="copy-payload">Copy JSON</button>'
    html += '</div>'

    html += '</div>'
    panel.innerHTML = html

    var selectEl = document.getElementById('analytics-sample-select')
    var preEl = document.getElementById('analytics-sample-pre')
    if (selectEl && preEl) {
      selectEl.onchange = function () {
        var key = selectEl.value
        var payload = ANALYTICS_SAMPLE_PAYLOADS[key]
        if (payload) preEl.textContent = JSON.stringify(payload, null, 2)
      }
    }
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
        if (summary.meta) state.meta = summary.meta
        if (ACE_DEBUG) {
          var postRev = (summary.meta && summary.meta.revision) ? summary.meta.revision : ''
          console.log('[ACE Save] success path: summary.meta=' + (summary.meta ? 'present' : 'missing') + ', summary.meta.revisionLength=' + (typeof postRev === 'string' ? postRev.length : 0))
        }
        state.lastValidation = null
        showConflictBanner(false)
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
    const tablist = document.getElementById('ace-nav') || document.querySelector('.tabs[role="tablist"]')
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
      tablist.addEventListener('click', function (e) {
        var btn = e.target && e.target.closest && e.target.closest('button[role="tab"][data-tab]')
        if (btn) {
          e.preventDefault()
          switchTab(btn.getAttribute('data-tab'))
        }
      })
    } else if (typeof console !== 'undefined' && console.warn) {
      console.warn('[ACE] Tab list not found; tab switching may not work.')
    }
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
    // Logout is bound in Users panel (users-logout-btn) via bindUsersLogout()
    const reloadBtn = document.getElementById('reload-btn')
    if (reloadBtn) reloadBtn.onclick = function () { loadModel() }
    const validateBtnEl = document.getElementById('validate-btn')
    if (validateBtnEl) validateBtnEl.onclick = function () { runValidate() }
    const saveBtnEl = document.getElementById('save-btn')
    if (saveBtnEl) saveBtnEl.onclick = function () { runSave() }
    const previewBtnEl = document.getElementById('preview-btn')
    if (previewBtnEl) previewBtnEl.onclick = function () { runPreview() }
    const discardBtn = document.getElementById('discard-all-btn')
    if (discardBtn) {
      discardBtn.onclick = function () {
        if (!state.originalModel) return
        state.editedModel = deepClone(state.originalModel)
        showUnsavedBanner()
        renderAllPanels()
      }
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
    document.addEventListener('click', function (e) {
      var panel = document.getElementById('panel-analytics')
      if (!panel || !panel.contains(e.target)) return
      var btn = e.target.closest && e.target.closest('[data-action]')
      if (!btn || btn.getAttribute('data-action') === undefined) return
      var action = btn.getAttribute('data-action')
      if (action === 'copy-payload') {
        var pre = document.getElementById('analytics-sample-pre')
        var text = pre ? pre.textContent : ''
        if (!text) return
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text).then(function () {
            var orig = btn.textContent
            btn.textContent = 'Copied!'
            setTimeout(function () { btn.textContent = orig }, 2000)
          }, function () {
            btn.textContent = 'Copy failed'
            setTimeout(function () { btn.textContent = 'Copy JSON' }, 2000)
          })
        } else {
          var ta = document.createElement('textarea')
          ta.value = text
          ta.setAttribute('readonly', '')
          ta.style.position = 'absolute'
          ta.style.left = '-9999px'
          document.body.appendChild(ta)
          ta.select()
          try {
            document.execCommand('copy')
            btn.textContent = 'Copied!'
          } catch (e) {
            btn.textContent = 'Copy failed'
          }
          document.body.removeChild(ta)
          setTimeout(function () { btn.textContent = 'Copy JSON' }, 2000)
        }
      } else if (action === 'reveal-endpoint') {
        var span = panel.querySelector('.ace-analytics-endpoint-value')
        var raw = btn.getAttribute('data-endpoint')
        if (!span || !raw) return
        var masked = span.getAttribute('data-masked') === 'true'
        if (masked) {
          span.textContent = raw
          span.setAttribute('data-masked', 'false')
          btn.textContent = 'Hide'
        } else {
          span.textContent = 'https://••••••••••••/endpoint'
          span.setAttribute('data-masked', 'true')
          btn.textContent = 'Show'
        }
      }
    })
  }

  function setCreateFirstAccountLinkVisible (visible) {
    const wrap = document.getElementById('login-create-first-wrap')
    if (wrap) wrap.style.display = visible ? '' : 'none'
  }

  /** Renders a visible error box so we never fail with a blank screen. */
  function showFatalError (err) {
    const msg = (err && err.message) ? String(err.message) : String(err)
    const stack = (err && err.stack) ? String(err.stack) : ''
    const showStack = ACE_DEBUG && stack
    const appEl = document.getElementById('app')
    const root = appEl || document.body
    const box = document.createElement('div')
    box.setAttribute('role', 'alert')
    box.className = 'ace-fatal-error'
    box.style.cssText = 'max-width:600px;margin:2rem auto;padding:1.5rem;border:2px solid #c00;background:#fff5f5;color:#333;font-family:sans-serif;'
    box.innerHTML = '<h2 style="margin:0 0 0.5rem 0;color:#c00;">ACE failed to load</h2>' +
      '<p style="margin:0 0 0.5rem 0;">' + escapeHtml(msg) + '</p>' +
      '<p style="margin:0;font-size:0.9em;color:#666;">Open the browser Console (F12) for details.</p>' +
      (showStack ? '<pre style="margin:1rem 0 0 0;padding:0.75rem;background:#f0f0f0;font-size:0.8em;overflow:auto;max-height:200px;">' + escapeHtml(stack) + '</pre>' : '')
    if (appEl) {
      appEl.innerHTML = ''
      appEl.appendChild(box)
    } else {
      root.appendChild(box)
    }
    if (typeof console !== 'undefined' && console.error) {
      console.error('[ACE] Fatal:', err && err.message ? err.message : err, err && err.stack ? err.stack : '')
    }
  }

  async function init () {
    if (ACE_AUTH_MODE === 'bearer' && !sessionStorage.getItem('ace_bearer_token')) {
      var token = prompt('Enter API token for ACE:')
      if (token) sessionStorage.setItem('ace_bearer_token', token)
    }
    try {
      const loginView = document.getElementById('login-view')
      if (loginView) {
        loginView.style.display = ''
        loginView.setAttribute('aria-busy', 'true')
        var loadingEl = document.getElementById('login-error')
        if (loadingEl) { loadingEl.style.display = 'none'; loadingEl.textContent = '' }
      }
      const me = await apiAuthMe()
      if (loginView) loginView.removeAttribute('aria-busy')
      if (me && me.user) {
        state.auth = {
          user: me.user,
          role: me.user.role,
          allowedTabs: Array.isArray(me.allowedTabs) && me.allowedTabs.length ? me.allowedTabs : allowedTabsFromRole(me.user.role),
          assistantScope: Array.isArray(me.assistantScope) ? me.assistantScope : []
        }
        const appShell = document.getElementById('app-shell')
        if (!appShell) {
          if (ACE_DEBUG) console.warn('[ACE] #app-shell not found; boot may be incomplete.')
        }
        showAppShell()
        applyAuthUI()
        bindEvents()
        updateFooterButtons()
        var targetTab = state.selectedTab
        const allowedTabs = state.auth.allowedTabs || []
        if ((targetTab === 'users' && state.auth.role !== 'admin') || (allowedTabs.length && allowedTabs.indexOf(targetTab) === -1)) {
          targetTab = allowedTabs[0] || 'config'
          state.selectedTab = targetTab
        }
        switchTab(targetTab)
        loadModel().catch(function (loadErr) {
          if (typeof console !== 'undefined' && console.error) console.error('[ACE] loadModel failed:', loadErr)
          showFatalError(loadErr)
        })
        return
      }
      const bootstrapStatus = await apiAuthBootstrapAllowed()
      const allowed = bootstrapStatus.allowed
      if (allowed) {
        setCreateFirstAccountLinkVisible(true)
        showBootstrapView()
      } else {
        setCreateFirstAccountLinkVisible(false)
        showLoginView()
      }
      bindAuthForms()
      const createFirstLink = document.getElementById('create-first-account-link')
      if (createFirstLink) {
        createFirstLink.onclick = function (e) {
          e.preventDefault()
          showBootstrapView()
          bindAuthForms()
        }
      }
    } catch (err) {
      showFatalError(err)
      setCreateFirstAccountLinkVisible(false)
      showLoginView()
      bindAuthForms()
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { init() })
  } else {
    init()
  }
})()
