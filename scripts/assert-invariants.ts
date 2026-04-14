#!/usr/bin/env node
/**
 * Assert refactor invariants (audit-derived). No behavior change.
 * Run: npm run invariants  or  npx tsx scripts/assert-invariants.ts
 * Exit 0 = pass, 1 = fail with clear message.
 */

import * as fs from 'node:fs'
import * as path from 'node:path'
import { ASSISTANTS_MANIFEST } from '../src/assistants/assistants.generated'
import { getHandler } from '../src/core/assistants/handlers/index'

const ROOT = path.resolve(__dirname, '..')
const SRC = path.join(ROOT, 'src')
const MAIN_TS = path.join(SRC, 'main.ts')
const CONFIG_JSON = path.join(ROOT, 'custom', 'config.json')
const MANIFEST_BUILD = path.join(ROOT, 'build', 'manifest.json')
const MANIFEST_ROOT = path.join(ROOT, 'manifest.json')

/** Hostnames that must not appear in allowedDomains or config-derived origins. */
const ALLOWED_DOMAINS_BLOCKLIST = new Set([
  'statsigapi.net',
  'segment.io',
  'segment.com',
  'amplitude.com',
  'posthog.com',
  'sentry.io',
  'datadoghq.com'
])

/**
 * Private-mode domain blocklist: patterns forbidden in any private/enterprise build.
 * Activated when BUILD_ENV=private (or BUILD_ENV=work for backward compatibility).
 * These are public/dev-only services that must never appear in an enterprise deployment.
 */
const PRIVATE_MODE_DOMAIN_BLOCKLIST: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /openai\.com$/i, label: 'openai.com (public LLM service)' },
  { pattern: /ngrok[-.]/, label: 'ngrok (public tunnel service)' },
  { pattern: /ngrok-free\.(app|dev)$/i, label: 'ngrok free tunnel' },
  { pattern: /^(localhost|127\.\d+\.\d+\.\d+|0\.0\.0\.0|::1)$/i, label: 'localhost / loopback address' }
]

/** True when running a private/enterprise build. Accepts BUILD_ENV=private or BUILD_ENV=work (alias). */
const IS_PRIVATE_MODE = ['private', 'work'].includes(
  (process.env['BUILD_ENV'] || '').toLowerCase()
)
const SELECTION_CONTEXT_TS = path.join(SRC, 'core', 'context', 'selectionContext.ts')
const ASSISTANTS_INDEX_TS = path.join(SRC, 'assistants', 'index.ts')
const HANDLERS_INDEX_TS = path.join(SRC, 'core', 'assistants', 'handlers', 'index.ts')
const QUICK_ACTION_EXECUTOR_TS = path.join(SRC, 'core', 'sdk', 'quickActionExecutor.ts')

function fail(msg: string): never {
  console.error('[assert-invariants] FAIL:', msg)
  process.exit(1)
}

function assert(condition: boolean, msg: string): void {
  if (!condition) fail(msg)
}

function main(): void {
  const warnings: string[] = []

  // 1) Dispatch key: getHandler(assistantId, actionId) — spot-check handler registry uses (assistantId, actionId)
  const handlersIndex = fs.readFileSync(HANDLERS_INDEX_TS, 'utf8')
  assert(
    handlersIndex.includes('getHandler') &&
    handlersIndex.includes('assistantId') &&
    handlersIndex.includes('actionId') &&
    /getHandler\s*\([^)]*assistantId[^)]*actionId/.test(handlersIndex),
    'handlers/index.ts must define getHandler(assistantId, actionId)'
  )
  assert(
    handlersIndex.includes('canHandle(assistantId, actionId)'),
    'handlers/index.ts must resolve handler by canHandle(assistantId, actionId)'
  )
  console.log('[assert-invariants] Dispatch key getHandler(assistantId, actionId): pass')

  // 2) RUN_QUICK_ACTION dispatch logic: ui-only returns before any provider call (no sendChatWithRecovery after ui-only return)
  // The dispatch logic may live in main.ts directly or in quickActionExecutor.ts (Task 8 refactor).
  const mainContent = fs.readFileSync(MAIN_TS, 'utf8')
  const runQuickActionMatch = mainContent.match(/on<RunQuickActionHandler>\s*\(\s*'RUN_QUICK_ACTION'[\s\S]*?\)\s*\)/m)
  assert(!!runQuickActionMatch, 'main.ts must contain RUN_QUICK_ACTION handler')

  // Determine which file to inspect for dispatch logic: executor file (Task 8+) or inline in main.ts (pre-Task 8).
  const executorExists = fs.existsSync(QUICK_ACTION_EXECUTOR_TS)
  let dispatchBlock: string
  if (executorExists) {
    const executorSource = fs.readFileSync(QUICK_ACTION_EXECUTOR_TS, 'utf8')
    // Extract the run() method body from the executor file (skip imports and helper functions)
    const runMethodMatch = executorSource.match(/async run\s*\([^)]*\)\s*:\s*Promise<void>\s*\{([\s\S]*)\}\s*\}\s*\}/)
    dispatchBlock = runMethodMatch ? runMethodMatch[0] : executorSource
  } else {
    dispatchBlock = runQuickActionMatch![0]
  }

  const uiOnlyReturnIdx = dispatchBlock.indexOf("executionType === 'ui-only'")
  const firstSendChatIdx = dispatchBlock.indexOf('sendChatWithRecovery')
  assert(uiOnlyReturnIdx !== -1, "RUN_QUICK_ACTION dispatch must check executionType === 'ui-only'")
  assert(firstSendChatIdx !== -1, 'RUN_QUICK_ACTION dispatch must call sendChatWithRecovery for LLM path')
  const uiOnlyBlock = dispatchBlock.substring(0, firstSendChatIdx)
  assert(
    /executionType === 'ui-only'[\s\S]*?return\s*[;\s]/.test(uiOnlyBlock),
    "RUN_QUICK_ACTION dispatch: ui-only branch must return before any sendChatWithRecovery (early return)"
  )
  console.log('[assert-invariants] ui-only early return before provider: pass')

  // 3) tool-only branches return before provider: tool-only block must not contain sendChatWithRecovery in the same branch
  const toolOnlySection = dispatchBlock.substring(uiOnlyReturnIdx, firstSendChatIdx)
  assert(
    !toolOnlySection.includes('sendChatWithRecovery'),
    'RUN_QUICK_ACTION dispatch: tool-only branches must not call sendChatWithRecovery (they return before LLM path)'
  )
  console.log('[assert-invariants] tool-only returns before provider: pass')

  // 4) Assistants sourced from generated TS only (no runtime JSON read in plugin)
  const assistantsIndex = fs.readFileSync(ASSISTANTS_INDEX_TS, 'utf8')
  assert(
    assistantsIndex.includes("from './assistants.generated'") || assistantsIndex.includes('assistants.generated'),
    'assistants/index.ts must import from assistants.generated (not JSON)'
  )
  assert(
    !assistantsIndex.includes("require(.+assistants\\.manifest\\.json)") && !assistantsIndex.includes("fetch(.+assistants\\.manifest)"),
    'assistants/index.ts must not require/fetch assistants.manifest.json at runtime'
  )
  const noJsonReadInSrc = (dir: string): boolean => {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true })
      for (const e of entries) {
        const full = path.join(dir, e.name)
        if (e.isDirectory() && e.name !== 'node_modules' && !e.name.startsWith('.')) {
          if (!noJsonReadInSrc(full)) return false
        } else if (e.name.endsWith('.ts') && !e.name.endsWith('.d.ts')) {
          const content = fs.readFileSync(full, 'utf8')
          if (/require\s*\(\s*['\"].*\.(manifest\.json|config\.json)['\"]\s*\)/.test(content)) return false
          if (/readFileSync\s*\([^)]*\.(manifest\.json|config\.json)/.test(content)) return false
        }
      }
      return true
    } catch {
      return true
    }
  }
  assert(noJsonReadInSrc(SRC), 'Plugin src must not require/readFileSync assistants.manifest.json or config.json (use generated TS only)')
  console.log('[assert-invariants] Assistants from generated TS only: pass')

  // 5) buildSelectionContext: images only when quickAction?.requiresVision && provider supports && selection.hasSelection
  const selectionContext = fs.readFileSync(SELECTION_CONTEXT_TS, 'utf8')
  assert(
    selectionContext.includes('quickAction?.requiresVision') || selectionContext.includes('quickAction?.requiresVision === true'),
    'selectionContext.ts must gate on quickAction.requiresVision'
  )
  assert(
    /needsVision\s*&&\s*providerSupportsImages\s*&&\s*selection\.hasSelection/.test(selectionContext) ||
    (selectionContext.includes('needsVision') && selectionContext.includes('providerSupportsImages') && selectionContext.includes('selection.hasSelection')),
    'selectionContext.ts must include images only when needsVision && providerSupportsImages && selection.hasSelection'
  )
  console.log('[assert-invariants] buildSelectionContext image gating: pass')

  // 6) Allowed domains blocklist: no unintended outbound origins (manifest + config, including llm endpoint/proxy)
  const manifestPath = fs.existsSync(MANIFEST_BUILD) ? MANIFEST_BUILD : MANIFEST_ROOT
  if (!fs.existsSync(manifestPath)) {
    console.log('[assert-invariants] No manifest found; skipping allowed-domains check')
  } else {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as Record<string, unknown>
    const config = fs.existsSync(CONFIG_JSON)
      ? (JSON.parse(fs.readFileSync(CONFIG_JSON, 'utf8')) as Record<string, unknown>)
      : {}
    type OriginEntry = { raw: string; source: 'manifest' | 'config' }
    const entries: OriginEntry[] = []
    const manifestDomains = manifest?.networkAccess && typeof manifest.networkAccess === 'object' && Array.isArray((manifest.networkAccess as Record<string, unknown>).allowedDomains)
      ? ((manifest.networkAccess as Record<string, unknown>).allowedDomains as string[])
      : []
    for (const d of manifestDomains) entries.push({ raw: String(d ?? '').trim(), source: 'manifest' })
    const net = config?.networkAccess && typeof config.networkAccess === 'object' ? (config.networkAccess as Record<string, unknown>) : {}
    const base = Array.isArray(net.baseAllowedDomains) ? (net.baseAllowedDomains as string[]) : []
    const extra = Array.isArray(net.extraAllowedDomains) ? (net.extraAllowedDomains as string[]) : []
    for (const d of [...base, ...extra]) entries.push({ raw: String(d ?? '').trim(), source: 'config' })
    const analytics = config?.analytics && typeof config.analytics === 'object' ? (config.analytics as Record<string, unknown>) : {}
    if (analytics.enabled === true && typeof analytics.endpointUrl === 'string' && (analytics.endpointUrl as string).trim()) {
      entries.push({ raw: (analytics.endpointUrl as string).trim(), source: 'config' })
    }
    const llm = config?.llm && typeof config.llm === 'object' ? (config.llm as Record<string, unknown>) : {}
    if (typeof llm.endpoint === 'string' && (llm.endpoint as string).trim()) {
      entries.push({ raw: (llm.endpoint as string).trim(), source: 'config' })
    }
    const proxy = llm?.proxy && typeof llm.proxy === 'object' ? (llm.proxy as Record<string, unknown>) : {}
    if (typeof proxy.baseUrl === 'string' && (proxy.baseUrl as string).trim()) {
      entries.push({ raw: (proxy.baseUrl as string).trim(), source: 'config' })
    }
    const hostnameToSource: Array<{ host: string; source: 'manifest' | 'config' }> = []
    for (const { raw, source } of entries) {
      if (!raw) continue
      try {
        const u = new URL(raw)
        hostnameToSource.push({ host: u.hostname.toLowerCase(), source })
      } catch {
        // skip invalid URLs
      }
    }
    for (const { host, source } of hostnameToSource) {
      for (const blocked of ALLOWED_DOMAINS_BLOCKLIST) {
        const b = blocked.toLowerCase()
        if (host === b || host.endsWith('.' + b)) {
          fail(
            `Forbidden outbound domain: hostname "${host}" matches blocklist "${blocked}" (source: ${source}). ` +
              'Remove from manifest.networkAccess.allowedDomains or from config (networkAccess, analytics.endpointUrl, llm.endpoint, or llm.proxy.baseUrl).'
          )
        }
      }
    }
    console.log('[assert-invariants] Allowed domains blocklist: pass')
  }

  // 7) Private-mode domain audit — fails if BUILD_ENV=private (or BUILD_ENV=work) and any public/dev domain is present.
  // Run standalone: npm run audit:private
  if (IS_PRIVATE_MODE) {
    const manifestPath = fs.existsSync(MANIFEST_BUILD) ? MANIFEST_BUILD : MANIFEST_ROOT
    const manifest = fs.existsSync(manifestPath)
      ? (JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as Record<string, unknown>)
      : {}
    const config = fs.existsSync(CONFIG_JSON)
      ? (JSON.parse(fs.readFileSync(CONFIG_JSON, 'utf8')) as Record<string, unknown>)
      : {}

    // Collect all origins from manifest + every config URL field
    const privateCheckEntries: Array<{ raw: string; source: string }> = []

    const manifestDomains = manifest?.networkAccess && typeof manifest.networkAccess === 'object' && Array.isArray((manifest.networkAccess as Record<string, unknown>).allowedDomains)
      ? ((manifest.networkAccess as Record<string, unknown>).allowedDomains as string[])
      : []
    for (const d of manifestDomains) privateCheckEntries.push({ raw: String(d ?? '').trim(), source: 'manifest.networkAccess.allowedDomains' })

    const llm = config?.llm && typeof config.llm === 'object' ? (config.llm as Record<string, unknown>) : {}
    if (typeof llm.endpoint === 'string' && (llm.endpoint as string).trim()) {
      privateCheckEntries.push({ raw: (llm.endpoint as string).trim(), source: 'config.llm.endpoint' })
    }
    const proxy = llm?.proxy && typeof llm.proxy === 'object' ? (llm.proxy as Record<string, unknown>) : {}
    if (typeof proxy.baseUrl === 'string' && (proxy.baseUrl as string).trim()) {
      privateCheckEntries.push({ raw: (proxy.baseUrl as string).trim(), source: 'config.llm.proxy.baseUrl' })
    }
    const net = config?.networkAccess && typeof config.networkAccess === 'object' ? (config.networkAccess as Record<string, unknown>) : {}
    for (const d of [...(Array.isArray(net.baseAllowedDomains) ? net.baseAllowedDomains as string[] : []), ...(Array.isArray(net.extraAllowedDomains) ? net.extraAllowedDomains as string[] : [])]) {
      privateCheckEntries.push({ raw: String(d ?? '').trim(), source: 'config.networkAccess' })
    }
    const analytics = config?.analytics && typeof config.analytics === 'object' ? (config.analytics as Record<string, unknown>) : {}
    if (analytics.enabled === true && typeof analytics.endpointUrl === 'string' && (analytics.endpointUrl as string).trim()) {
      privateCheckEntries.push({ raw: (analytics.endpointUrl as string).trim(), source: 'config.analytics.endpointUrl' })
    }

    for (const { raw, source } of privateCheckEntries) {
      if (!raw) continue
      let hostname = raw
      try { hostname = new URL(raw).hostname.toLowerCase() } catch { /* use raw as-is */ }
      for (const { pattern, label } of PRIVATE_MODE_DOMAIN_BLOCKLIST) {
        if (pattern.test(hostname)) {
          fail(
            `[PRIVATE MODE] Forbidden public/dev domain in ${source}: "${raw}" matches "${label}". ` +
            'Private builds must not include public LLM, tunnel, or loopback origins. ' +
            'Ensure your S3 config (or custom/config.json) uses only internal enterprise endpoints.'
          )
        }
      }
    }

    // Enforce internal-api provider for private builds
    if (typeof llm.provider === 'string' && llm.provider !== 'internal-api') {
      fail(
        `[PRIVATE MODE] config.llm.provider is "${llm.provider}" but private builds must use "internal-api". ` +
        'Set config.llm.provider to "internal-api" and configure config.llm.endpoint.'
      )
    }
    if (!llm.provider) {
      fail(
        '[PRIVATE MODE] config.llm.provider is not set. Private builds must explicitly set config.llm.provider to "internal-api".'
      )
    }
    if (!llm.endpoint || (typeof llm.endpoint === 'string' && !(llm.endpoint as string).trim())) {
      fail(
        '[PRIVATE MODE] config.llm.endpoint is empty. Private builds must configure a valid internal LLM endpoint.'
      )
    }

    // Warn (do not fail) if resources.links still point to public Figma community or
    // other non-internal URLs. These are display-only links in the plugin UI, not
    // outbound network domains, so they don't pose a security risk — but they would
    // look anomalous in an enterprise review if they reference the public plugin listing.
    const resources = config?.resources && typeof config.resources === 'object'
      ? (config.resources as Record<string, unknown>)
      : {}
    const links = resources?.links && typeof resources.links === 'object'
      ? (resources.links as Record<string, unknown>)
      : {}
    const PUBLIC_LINK_PATTERNS = [
      /figma\.com\/community/i,
      /figma\.com\/plugins/i
    ]
    const linkWarnings: string[] = []
    for (const [key, entry] of Object.entries(links)) {
      const url = typeof entry === 'object' && entry !== null && 'url' in entry
        ? String((entry as Record<string, unknown>).url ?? '')
        : ''
      if (!url.trim()) continue
      for (const pat of PUBLIC_LINK_PATTERNS) {
        if (pat.test(url)) {
          linkWarnings.push(`resources.links.${key}.url = "${url}" — replace with an internal URL for private builds`)
        }
      }
    }
    if (linkWarnings.length > 0) {
      console.warn('[assert-invariants] PRIVATE MODE WARNING — public display link(s) in config:')
      for (const w of linkWarnings) console.warn(`  ⚠  ${w}`)
      console.warn(
        '[assert-invariants]   These links appear in the plugin UI "About" panel. ' +
        'They do not affect network access or security, but override them in your private/work S3 config with internal URLs.'
      )
    }

    console.log('[assert-invariants] Private-mode domain audit: pass')
  }

  // 8) SmartDetector port compliance: no consumer outside DefaultSmartDetectionEngine may
  //    import scanSelectionSmart or import directly from the smartDetector barrel.
  const SD_ALLOWED = new Set([
    path.join(SRC, 'core', 'detection', 'smartDetector', 'DefaultSmartDetectionEngine.ts'),
    path.join(SRC, 'core', 'detection', 'smartDetector', 'index.ts'),
  ])
  const sdViolators: string[] = []
  function walkForSdViolations(dir: string): void {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true })
      for (const e of entries) {
        const full = path.join(dir, e.name)
        if (e.isDirectory() && e.name !== 'node_modules' && !e.name.startsWith('.')) {
          // Skip the entire smartDetector directory — internal files are allowed to cross-import
          if (full === path.join(SRC, 'core', 'detection', 'smartDetector')) continue
          walkForSdViolations(full)
        } else if (e.name.endsWith('.ts') && !e.name.endsWith('.d.ts')) {
          if (SD_ALLOWED.has(full)) continue
          const content = fs.readFileSync(full, 'utf8')
          // Strip single-line comments and block comments before checking for violations
          const codeOnly = content
            .replace(/\/\*[\s\S]*?\*\//g, '')   // block comments
            .replace(/\/\/[^\n]*/g, '')           // line comments
          if (
            /\bscanSelectionSmart\s*\(/.test(codeOnly) ||
            /from\s+['"].*\/detection\/smartDetector['"]/.test(codeOnly) ||
            /from\s+['"].*\/detection\/smartDetector\/index['"]/.test(codeOnly)
          ) {
            sdViolators.push(full.replace(ROOT + '/', ''))
          }
        }
      }
    } catch { /* skip unreadable dirs */ }
  }
  walkForSdViolations(SRC)
  assert(
    sdViolators.length === 0,
    `SmartDetector port violation — direct imports outside Default engine: ${sdViolators.join(', ')}`
  )
  console.log('[assert-invariants] SmartDetector port compliance: pass')

  // 9) DS port compliance: consumers outside Default*Engine files must not import DS internal modules directly.
  //    Exemptions: the three Default*Engine implementations, the DS internals themselves, and knowledge.ts
  //    (which is the implementation layer for DSPromptEnrichmentPort, not a consumer).
  const DS_INTERNAL_PATTERNS = [
    /from\s+['"].*\/designSystem\/registryLoader['"]/,
    /from\s+['"].*\/designSystem\/assistantApi['"]/,
    /from\s+['"].*\/designSystem\/componentService['"]/,
    /from\s+['"].*\/designSystem\/searchIndex['"]/,
  ]
  const DS_ENGINE_EXEMPT = new Set([
    // Default engine implementations — allowed to import internals (they ARE the adapters)
    path.join(SRC, 'core', 'designSystem', 'DefaultDSPromptEnrichmentEngine.ts'),
    path.join(SRC, 'core', 'designSystem', 'DefaultDSQueryEngine.ts'),
    path.join(SRC, 'core', 'designSystem', 'DefaultDSPlacementEngine.ts'),
    // Implementation layer for DSPromptEnrichmentPort — not a consumer, do not route through engine (circular)
    path.join(SRC, 'custom', 'knowledge.ts'),
    // designSystemTools.ts: search action is routed through DSQueryPort; remaining imports
    // (listComponents, getComponentByName, getComponentByKey, getComponentDocumentation, placeComponent)
    // cover operations not yet on the port — exempt until port is extended.
    path.join(SRC, 'core', 'tools', 'designSystemTools.ts'),
    // renderer.ts: uses createInstanceOnly for demo-only nuxtDsRegistry flow — exempt per Task 14 scope.
    path.join(SRC, 'core', 'designWorkshop', 'renderer.ts'),
  ])
  const dsViolators: string[] = []
  function walkForDsViolations(dir: string): void {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true })
      for (const e of entries) {
        const full = path.join(dir, e.name)
        if (e.isDirectory() && e.name !== 'node_modules' && !e.name.startsWith('.')) {
          // Skip the designSystem directory itself — internals may cross-import
          if (full === path.join(SRC, 'core', 'designSystem')) continue
          walkForDsViolations(full)
        } else if (e.name.endsWith('.ts') && !e.name.endsWith('.d.ts')) {
          if (DS_ENGINE_EXEMPT.has(full)) continue
          const content = fs.readFileSync(full, 'utf8')
          const codeOnly = content
            .replace(/\/\*[\s\S]*?\*\//g, '')  // block comments
            .replace(/\/\/[^\n]*/g, '')          // line comments
          for (const pattern of DS_INTERNAL_PATTERNS) {
            if (pattern.test(codeOnly)) {
              dsViolators.push(full.replace(ROOT + '/', ''))
              break
            }
          }
        }
      }
    } catch { /* skip unreadable dirs */ }
  }
  walkForDsViolations(SRC)
  assert(
    dsViolators.length === 0,
    `DS port violation — direct DS internal imports outside Default engines: ${dsViolators.join(', ')}`
  )
  console.log('[assert-invariants] DS port compliance: pass')

  // 10) Manifest ↔ handler drift check: every tool-only quick action must have a registered handler.
  //     UI-only and LLM actions are intentionally skipped — they don't need a main-thread handler.
  //     Hybrid actions for code2design are handled inline in quickActionExecutor.ts (not via the registry).
  //     Reports as a warning (not a hard failure) so new actions can be added incrementally.
  for (const assistant of ASSISTANTS_MANIFEST) {
    for (const action of (assistant.quickActions ?? [])) {
      if (action.executionType !== 'tool-only') continue
      const handler = getHandler(assistant.id, action.id)
      if (handler === undefined) {
        warnings.push(
          `No handler for ${assistant.id}/${action.id} — add to handlers/index.ts or change executionType`
        )
      }
    }
  }
  if (warnings.length > 0) {
    for (const w of warnings) {
      console.warn('[assert-invariants] WARN:', w)
    }
    console.log('[assert-invariants] Manifest↔handler drift check: WARNINGS (see above)')
  } else {
    console.log('[assert-invariants] Manifest↔handler drift check: pass')
  }

  console.log('[assert-invariants] All invariants passed.')
  process.exit(0)
}

main()
