#!/usr/bin/env node
/**
 * Post-build manifest patcher for networkAccess.allowedDomains
 *
 * - Reads /custom/config.json
 * - Computes final allowedDomains as:
 *     baseAllowedDomains ∪ extraAllowedDomains
 * - Validates each entry is a valid origin (scheme + host + optional port, no path/search/hash)
 * - Writes the result into manifest.json.networkAccess.allowedDomains
 *
 * This runs after build-figma-plugin has generated manifest.json from package.json.
 */

import * as fs from 'fs'
import * as path from 'path'

interface NetworkAccessConfig {
  baseAllowedDomains?: string[]
  extraAllowedDomains?: string[]
}

interface CustomConfigFile {
  networkAccess?: NetworkAccessConfig
}

// Public default domains for the open-source build.
// These are used ONLY when no allowedDomains are configured in custom/config.json.
// Corporate forks can override/replace these by setting any entries in
// networkAccess.baseAllowedDomains or networkAccess.extraAllowedDomains.
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

function computeAllowedDomains(configPath: string): string[] | null {
  const config = loadJsonFile<CustomConfigFile>(configPath) || {}
  const networkAccess = config.networkAccess || {}

  const base = Array.isArray(networkAccess.baseAllowedDomains)
    ? networkAccess.baseAllowedDomains
    : []
  const extra = Array.isArray(networkAccess.extraAllowedDomains)
    ? networkAccess.extraAllowedDomains
    : []

  const combined = [...base, ...extra]

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
      '[update-manifest-network-access] ❌ Invalid networkAccess domain in custom/config.json:'
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
  const watchMode = process.argv.includes('--watch')

  const manifestPaths = [
    path.join(rootDir, 'manifest.json'),
    path.join(rootDir, 'build', 'manifest.json')
  ].filter(p => fs.existsSync(p))

  if (manifestPaths.length === 0) {
    console.warn(
      '[update-manifest-network-access] No manifest.json found (checked root and build/); skipping networkAccess patch'
    )
    if (!watchMode) process.exit(0)
  }

  const runOnce = () => {
    const configuredDomains = computeAllowedDomains(configPath)
    if (!configuredDomains) {
      // Invalid config: always fail fast (both build and watch)
      process.exit(1)
    }

    // If no domains are configured in custom/config.json, fall back to the
    // public default allowlist so the open-source build works out-of-the-box.
    const domainsForManifest =
      configuredDomains.length === 0
        ? PUBLIC_DEFAULT_ALLOWED_DOMAINS
        : configuredDomains

    let anyPatched = false
    for (const manifestPath of manifestPaths) {
      const ok = patchManifest(manifestPath, domainsForManifest)
      anyPatched = anyPatched || ok
    }

    if (!anyPatched) {
      // Failed to patch any manifest we expected to manage
      process.exit(1)
    }

    console.log(
      `[update-manifest-network-access] Updated networkAccess.allowedDomains (${domainsForManifest.length} stored / ${configuredDomains.length} configured):`
    )
    console.log(
      `  stored: ${domainsForManifest.join(', ')}`
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
  const watchTargets = [configPath, ...manifestPaths].filter(p => fs.existsSync(p))
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

