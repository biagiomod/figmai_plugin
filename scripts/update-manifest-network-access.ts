#!/usr/bin/env node
/**
 * Post-build manifest patcher for networkAccess.allowedDomains
 *
 * This script is the single place that writes manifest.networkAccess.allowedDomains.
 * It reads custom/config.json and (in non-private mode) custom/config.local.json, then
 * computes the final list from:
 *   baseAllowedDomains ∪ extraAllowedDomains ∪ [analytics.endpointUrl if enabled]
 * where each source is merged from config.json + config.local.json.
 *
 * Config precedence for domain lists: config.local.json extends (not replaces) config.json.
 * config.local.json is IGNORED when BUILD_ENV=private (or BUILD_ENV=work) to keep private builds deterministic.
 *
 * It does NOT include config.llm.endpoint or config.llm.proxy.baseUrl here; those
 * are used at runtime by the provider. scripts/assert-invariants.ts validates
 * that no collected origin (manifest + config.llm + config.analytics) matches the
 * blocklist (e.g. segment.io, posthog.com).
 *
 * Also generates root manifest.json from package.json stanza if it does not yet exist
 * (e.g. first build after manifest.json was added to .gitignore).
 *
 * Runs after build-figma-plugin has generated manifest.json from package.json.
 */

import * as fs from 'fs'
import * as path from 'path'

/** True when this is a private/enterprise build. config.local.json is ignored.
 *  Accepts BUILD_ENV=private (canonical) or BUILD_ENV=work (backward-compatible alias). */
const IS_PRIVATE_MODE = ['private', 'work'].includes(
  (process.env['BUILD_ENV'] || '').toLowerCase()
)

interface NetworkAccessConfig {
  baseAllowedDomains?: string[]
  extraAllowedDomains?: string[]
}

interface CustomConfigFile {
  networkAccess?: NetworkAccessConfig
  analytics?: {
    enabled?: boolean
    endpointUrl?: string
  }
}

// Public default domains for the open-source / local-dev build.
// Used ONLY when:
//   - No allowedDomains are configured in config.json or config.local.json, AND
//   - BUILD_ENV is not 'private' or 'work' (private builds must have explicit domains from S3 config)
// Corporate forks can override by setting any entries in networkAccess.baseAllowedDomains
// or networkAccess.extraAllowedDomains (in config.json for the committed default, or
// config.local.json for personal dev overrides).
const PUBLIC_DEFAULT_ALLOWED_DOMAINS: string[] = [
  'https://api.openai.com',
  'http://localhost:8787',
  'https://overobedient-buddy-leathern.ngrok-free.dev'
]

function loadJsonFile<T>(filePath: string): T | null {
  try {
    if (!fs.existsSync(filePath)) {
      return null
    }
    const raw = fs.readFileSync(filePath, 'utf-8')
    return JSON.parse(raw) as T
  } catch (error) {
    console.error(`[update-manifest-network-access] Failed to read ${filePath}:`, error)
    return null
  }
}

/**
 * Validate that a domain string is an origin:
 * - Must include scheme (http or https)
 * - Must not contain whitespace
 * - Must not include a path, query, or fragment
 * Returns the normalized origin (scheme + host + optional port).
 */
function validateAndNormalizeOrigin(input: string): string {
  const value = (input || '').trim()

  if (!value) {
    throw new Error('Empty domain is not allowed')
  }

  if (/\s/.test(value)) {
    throw new Error(`Domain must not contain whitespace: "${value}"`)
  }

  if (!/^https?:\/\//i.test(value)) {
    throw new Error(`Domain must include http:// or https:// scheme: "${value}"`)
  }

  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new Error(`Invalid URL format for allowed domain: "${value}"`)
  }

  if (url.pathname !== '/' || url.search || url.hash) {
    throw new Error(
      `Allowed domains must be origins only (no path, query, or fragment): "${value}"`
    )
  }

  const origin = url.origin

  // Require that the input is exactly the origin or origin + trailing slash
  if (value !== origin && value !== `${origin}/`) {
    throw new Error(
      `Allowed domain must not include extra path segments; use "${origin}" instead of "${value}"`
    )
  }

  return origin
}

function patchManifest(manifestPath: string, finalAllowedDomains: string[]): boolean {
  const manifest = loadJsonFile<Record<string, any>>(manifestPath)
  if (!manifest) {
    console.error(`[update-manifest-network-access] Unable to load ${manifestPath}`)
    return false
  }

  if (!manifest.networkAccess || typeof manifest.networkAccess !== 'object') {
    manifest.networkAccess = {}
  }

  manifest.networkAccess.allowedDomains = finalAllowedDomains
  manifest.networkAccess.reasoning =
    manifest.networkAccess.reasoning ||
    'This plugin makes outbound requests to LLM and optional proxy endpoints configured via custom/config.json.'

  // Required for figma.fileKey (e.g. AT-A https links). Only has effect for private/internal plugins.
  manifest.enablePrivatePluginApi = true

  // Required for the plugin to surface in Figma Dev Mode (Inspect panel + Plugins menu).
  manifest.capabilities = ['inspect']

  try {
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf-8')
    console.log(
      `[update-manifest-network-access] ✓ Patched ${path.relative(
        process.cwd(),
        manifestPath
      )}.networkAccess.allowedDomains`
    )
    return true
  } catch (error) {
    console.error(`[update-manifest-network-access] Failed to write ${manifestPath}:`, error)
    return false
  }
}

/**
 * Generate a minimal root manifest.json from the package.json figma-plugin stanza.
 * Called when manifest.json does not exist (e.g. first build after adding to .gitignore).
 * The networkAccess.allowedDomains will be patched immediately after by patchManifest().
 */
function createRootManifestIfMissing(rootDir: string, manifestPath: string): void {
  if (fs.existsSync(manifestPath)) return

  const packageJsonPath = path.join(rootDir, 'package.json')
  const pkg = loadJsonFile<Record<string, unknown>>(packageJsonPath)
  const figmaPlugin =
    pkg?.['figma-plugin'] && typeof pkg['figma-plugin'] === 'object'
      ? (pkg['figma-plugin'] as Record<string, unknown>)
      : null

  if (!figmaPlugin) {
    console.warn(
      '[update-manifest-network-access] No figma-plugin stanza in package.json; cannot auto-create manifest.json'
    )
    return
  }

  const manifest: Record<string, unknown> = {
    api: '1.0.0',
    editorType: figmaPlugin.editorType || ['figma'],
    id: figmaPlugin.id,
    name: figmaPlugin.name,
    main: 'build/main.js',
    ui: 'build/ui.js',
    documentAccess: figmaPlugin.documentAccess || 'dynamic-page',
    networkAccess: {
      allowedDomains: [],
      reasoning:
        'This plugin makes outbound requests to LLM and optional proxy endpoints configured via custom/config.json.'
    },
    enablePrivatePluginApi: true
  }

  try {
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n', 'utf-8')
    console.log(
      `[update-manifest-network-access] ✓ Created ${path.relative(process.cwd(), manifestPath)} (first build after gitignore)`
    )
  } catch (error) {
    console.warn(
      `[update-manifest-network-access] Could not auto-create ${manifestPath}:`,
      error
    )
  }
}

/**
 * Compute the list of allowed domains from config.json and (in non-private mode) config.local.json.
 *
 * Domain sources (all merged, deduplicated):
 *   config.json:       networkAccess.baseAllowedDomains + extraAllowedDomains
 *   config.local.json: networkAccess.baseAllowedDomains + extraAllowedDomains (ignored if BUILD_ENV=private or work)
 *   analytics:         endpointUrl origin (if analytics.enabled and endpointUrl set, from config.json only)
 *
 * If the combined list is empty AND BUILD_ENV is not 'private' (or 'work'), falls back to
 * PUBLIC_DEFAULT_ALLOWED_DOMAINS so that a fresh checkout works out-of-the-box
 * without requiring a config.local.json.
 *
 * This list is exactly what gets written to manifest.networkAccess.allowedDomains;
 * Figma enforces it at runtime and blocks any other outbound origins.
 */
function computeAllowedDomains(configPath: string, localConfigPath: string): string[] | null {
  const config = loadJsonFile<CustomConfigFile>(configPath) || {}
  const networkAccess = config.networkAccess || {}

  const base = Array.isArray(networkAccess.baseAllowedDomains)
    ? networkAccess.baseAllowedDomains
    : []
  const extra = Array.isArray(networkAccess.extraAllowedDomains)
    ? networkAccess.extraAllowedDomains
    : []

  // Merge local config networkAccess — personal/dev overrides, gitignored, ignored in private mode
  let localBase: string[] = []
  let localExtra: string[] = []
  if (!IS_PRIVATE_MODE) {
    const localConfig = loadJsonFile<CustomConfigFile>(localConfigPath)
    if (localConfig?.networkAccess) {
      localBase = Array.isArray(localConfig.networkAccess.baseAllowedDomains)
        ? localConfig.networkAccess.baseAllowedDomains
        : []
      localExtra = Array.isArray(localConfig.networkAccess.extraAllowedDomains)
        ? localConfig.networkAccess.extraAllowedDomains
        : []
    }
  }

  // Add analytics endpoint if enabled and configured (from base config.json only — not local)
  const analyticsDomains: string[] = []
  if (config.analytics?.enabled && config.analytics?.endpointUrl) {
    try {
      const analyticsOrigin = validateAndNormalizeOrigin(config.analytics.endpointUrl)
      analyticsDomains.push(analyticsOrigin)
    } catch (error) {
      console.warn(
        `[update-manifest-network-access] Invalid analytics.endpointUrl: ${(error as Error).message}`
      )
    }
  }

  const combined = [...base, ...localBase, ...extra, ...localExtra, ...analyticsDomains]

  const finalAllowedDomains: string[] = []
  const seen = new Set<string>()

  try {
    for (const raw of combined) {
      const origin = validateAndNormalizeOrigin(String(raw))
      if (!seen.has(origin)) {
        seen.add(origin)
        finalAllowedDomains.push(origin)
      }
    }
  } catch (error) {
    console.error(
      '[update-manifest-network-access] ❌ Invalid networkAccess domain in config:'
    )
    console.error(
      `  ${(error as Error).message}\n\n` +
        'Each entry in networkAccess.baseAllowedDomains/extraAllowedDomains must be a pure origin, e.g.:\n' +
        '  - "https://api.example.com"\n' +
        '  - "http://localhost:8787"\n'
    )
    return null
  }

  return finalAllowedDomains
}

function main() {
  const rootDir = path.resolve(__dirname, '..')
  const configPath = path.join(rootDir, 'custom', 'config.json')
  const localConfigPath = path.join(rootDir, 'custom', 'config.local.json')
  const watchMode = process.argv.includes('--watch')
  const rootManifestPath = path.join(rootDir, 'manifest.json')
  const buildManifestPath = path.join(rootDir, 'build', 'manifest.json')

  // Ensure root manifest.json exists before computing manifestPaths.
  // This handles the first build after manifest.json was added to .gitignore.
  createRootManifestIfMissing(rootDir, rootManifestPath)

  const getManifestPaths = () =>
    [rootManifestPath, buildManifestPath].filter(p => fs.existsSync(p))

  const manifestPaths = getManifestPaths()

  if (manifestPaths.length === 0) {
    console.warn(
      '[update-manifest-network-access] No manifest.json found (checked root and build/); skipping networkAccess patch'
    )
    if (!watchMode) process.exit(0)
  }

  const runOnce = () => {
    // Re-create root manifest if it was deleted while watching
    createRootManifestIfMissing(rootDir, rootManifestPath)

    const configuredDomains = computeAllowedDomains(configPath, localConfigPath)
    if (!configuredDomains) {
      // Invalid config: always fail fast (both build and watch)
      process.exit(1)
    }

    // If no domains are configured (config.json + config.local.json both empty)
    // and this is NOT a private build, fall back to the public defaults so a fresh
    // checkout works without requiring a config.local.json.
    // Private builds intentionally get an empty list here; assert-invariants (private mode)
    // will catch and fail if S3 config didn't provide explicit internal domains.
    const domainsForManifest =
      configuredDomains.length === 0 && !IS_PRIVATE_MODE
        ? PUBLIC_DEFAULT_ALLOWED_DOMAINS
        : configuredDomains

    const currentManifestPaths = getManifestPaths()
    let anyPatched = false
    for (const manifestPath of currentManifestPaths) {
      const ok = patchManifest(manifestPath, domainsForManifest)
      anyPatched = anyPatched || ok
    }

    if (!anyPatched) {
      // Failed to patch any manifest we expected to manage
      process.exit(1)
    }

    const localNote = !IS_PRIVATE_MODE && fs.existsSync(localConfigPath) ? ' (merged with config.local.json)' : ''
    const workNote = IS_PRIVATE_MODE ? ' [PRIVATE MODE — config.local.json ignored]' : ''
    console.log(
      `[update-manifest-network-access] Updated networkAccess.allowedDomains (${domainsForManifest.length} stored / ${configuredDomains.length} configured)${localNote}${workNote}:`
    )
    console.log(
      `  stored: ${domainsForManifest.length > 0 ? domainsForManifest.join(', ') : '[]'}`
    )
    console.log(
      `  configured: ${configuredDomains.length > 0 ? configuredDomains.join(', ') : '[]'}`
    )
  }

  runOnce()

  if (!watchMode) {
    return
  }

  // In watch mode, re-run when manifest or config changes
  const watchTargets = [configPath, localConfigPath, ...manifestPaths].filter(p =>
    fs.existsSync(p)
  )
  if (watchTargets.length === 0) {
    console.warn('[update-manifest-network-access] Nothing to watch; exiting watch mode')
    return
  }

  console.log(
    '[update-manifest-network-access] Watching for changes:',
    watchTargets.map(p => path.relative(process.cwd(), p))
  )

  let timer: NodeJS.Timeout | null = null
  const scheduleRun = () => {
    if (timer) return
    timer = setTimeout(() => {
      timer = null
      runOnce()
    }, 100)
  }

  for (const target of watchTargets) {
    fs.watch(target, { persistent: true }, scheduleRun)
  }
}

main()
