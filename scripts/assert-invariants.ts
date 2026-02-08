#!/usr/bin/env node
/**
 * Assert refactor invariants (audit-derived). No behavior change.
 * Run: npm run invariants  or  npx tsx scripts/assert-invariants.ts
 * Exit 0 = pass, 1 = fail with clear message.
 */

import * as fs from 'node:fs'
import * as path from 'node:path'

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
const SELECTION_CONTEXT_TS = path.join(SRC, 'core', 'context', 'selectionContext.ts')
const ASSISTANTS_INDEX_TS = path.join(SRC, 'assistants', 'index.ts')
const HANDLERS_INDEX_TS = path.join(SRC, 'core', 'assistants', 'handlers', 'index.ts')

function fail(msg: string): never {
  console.error('[assert-invariants] FAIL:', msg)
  process.exit(1)
}

function assert(condition: boolean, msg: string): void {
  if (!condition) fail(msg)
}

function main(): void {
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

  // 2) main.ts RUN_QUICK_ACTION: ui-only returns before any provider call (no sendChatWithRecovery after ui-only return)
  const mainContent = fs.readFileSync(MAIN_TS, 'utf8')
  const runQuickActionMatch = mainContent.match(/on<RunQuickActionHandler>\s*\(\s*'RUN_QUICK_ACTION'[\s\S]*?\)\s*\)/m)
  assert(!!runQuickActionMatch, 'main.ts must contain RUN_QUICK_ACTION handler')
  const runQuickActionBlock = runQuickActionMatch![0]
  const uiOnlyReturnIdx = runQuickActionBlock.indexOf("executionType === 'ui-only'")
  const firstSendChatIdx = runQuickActionBlock.indexOf('sendChatWithRecovery')
  assert(uiOnlyReturnIdx !== -1, "main.ts RUN_QUICK_ACTION must check executionType === 'ui-only'")
  assert(firstSendChatIdx !== -1, 'main.ts RUN_QUICK_ACTION must call sendChatWithRecovery for LLM path')
  const uiOnlyBlock = runQuickActionBlock.substring(0, firstSendChatIdx)
  assert(
    /executionType === 'ui-only'[\s\S]*?return\s*[;\s]/.test(uiOnlyBlock),
    "main.ts: ui-only branch must return before any sendChatWithRecovery (early return)"
  )
  console.log('[assert-invariants] ui-only early return before provider: pass')

  // 3) tool-only branches return before provider: tool-only block must not contain sendChatWithRecovery in the same branch
  const toolOnlySection = runQuickActionBlock.substring(uiOnlyReturnIdx, firstSendChatIdx)
  assert(
    !toolOnlySection.includes('sendChatWithRecovery'),
    'main.ts: tool-only branches must not call sendChatWithRecovery (they return before LLM path)'
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

  console.log('[assert-invariants] All invariants passed.')
  process.exit(0)
}

main()
