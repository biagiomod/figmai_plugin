# Pre-Demo Cleanup Implementation Plan (Debug & QA)

Minimal, low-risk implementation plan for documentation notes, build-time allowed-domains invariant, and optional debug toggle. No refactors, renames, file moves, or API/behavior changes.

---

## A1) Documentation notes

### A1a — `src/core/analytics/index.ts`

- **Insertion point:** Immediately above the JSDoc for `getAnalytics` (above the line ` * Get analytics service instance`), i.e. before line 35.
- **Add:**

```ts
 * Analytics sends no outbound requests unless config.analytics.enabled AND
 * config.analytics.endpointUrl are set; otherwise a no-op instance is returned.
 *
```

So the existing block becomes:

```ts
/**
 * Get analytics service instance
 *
 * Analytics sends no outbound requests unless config.analytics.enabled AND
 * config.analytics.endpointUrl are set; otherwise a no-op instance is returned.
 *
 * Returns either:
 * - Real service instance (if enabled and endpoint configured)
 * ...
 */
```

### A1b — `scripts/update-manifest-network-access.ts`

- **Insertion point:** Directly above the line `function computeAllowedDomains(configPath: string): string[] | null {` (line 134), as a block comment for that function.
- **Add:**

```ts
/**
 * Outbound domains at runtime are exactly those written to
 * manifest.networkAccess.allowedDomains; Figma enforces this allowlist.
 * Analytics origin is included only when analytics.enabled and analytics.endpointUrl are set.
 */
function computeAllowedDomains(configPath: string): string[] | null {
```

---

## A2) Build-time invariant: forbid unintended outbound domains

**Choice:** Add a **new** script `scripts/check-allowed-domains.js` (plain Node.js). Do not extend `assert-invariants.ts`, so manifest/config checks stay separate from source-file invariants and the new check can run immediately after the manifest is patched.

### Script behavior

1. Read `build/manifest.json`; if missing, read `manifest.json`.
2. Read `custom/config.json` if present.
3. Collect all origins to check:
   - From manifest: `manifest.networkAccess?.allowedDomains` (array).
   - From config: `config.networkAccess?.baseAllowedDomains`, `config.networkAccess?.extraAllowedDomains` (arrays).
   - From config: if `config.analytics?.enabled` and `config.analytics?.endpointUrl`, parse `config.analytics.endpointUrl` as URL and take `url.origin` (then derive hostname for blocklist).
4. For each origin string, parse with `new URL(origin)` (or skip if invalid), then get `url.hostname` (lowercase).
5. Blocklist (lowercase hostnames): `statsigapi.net`, `segment.io`, `segment.com`, `amplitude.com`, `posthog.com`, `sentry.io`, `datadoghq.com`.
6. If any collected hostname is in the blocklist: print clear error listing each offending host and whether it came from manifest or from config (baseAllowedDomains / extraAllowedDomains / analytics.endpointUrl), then `process.exit(1)`.
7. Otherwise `process.exit(0)`.

### Exact file to create: `scripts/check-allowed-domains.js`

```js
#!/usr/bin/env node
/**
 * Build-time check: fail if manifest or config allowlist contains forbidden
 * third-party hosts (analytics/feature-flags). Run after update-manifest-network-access.
 */

const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const BUILD_MANIFEST = path.join(ROOT, 'build', 'manifest.json')
const ROOT_MANIFEST = path.join(ROOT, 'manifest.json')
const CONFIG_PATH = path.join(ROOT, 'custom', 'config.json')

const FORBIDDEN_HOSTS = new Set([
  'statsigapi.net',
  'segment.io',
  'segment.com',
  'amplitude.com',
  'posthog.com',
  'sentry.io',
  'datadoghq.com'
])

function loadJson(p) {
  if (!fs.existsSync(p)) return null
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'))
  } catch {
    return null
  }
}

function hostFromOrigin(origin) {
  if (!origin || typeof origin !== 'string') return null
  try {
    const u = new URL(origin.trim())
    return u.hostname.toLowerCase()
  } catch {
    return null
  }
}

function main() {
  const manifest = loadJson(BUILD_MANIFEST) || loadJson(ROOT_MANIFEST)
  const config = loadJson(CONFIG_PATH) || {}

  const offenders = [] // { host, source }

  if (manifest?.networkAccess?.allowedDomains) {
    for (const o of manifest.networkAccess.allowedDomains) {
      const h = hostFromOrigin(o)
      if (h && FORBIDDEN_HOSTS.has(h)) offenders.push({ host: h, source: 'manifest.networkAccess.allowedDomains' })
    }
  }

  const base = config.networkAccess?.baseAllowedDomains
  if (Array.isArray(base)) {
    for (const o of base) {
      const h = hostFromOrigin(o)
      if (h && FORBIDDEN_HOSTS.has(h)) offenders.push({ host: h, source: 'config.networkAccess.baseAllowedDomains' })
    }
  }
  const extra = config.networkAccess?.extraAllowedDomains
  if (Array.isArray(extra)) {
    for (const o of extra) {
      const h = hostFromOrigin(o)
      if (h && FORBIDDEN_HOSTS.has(h)) offenders.push({ host: h, source: 'config.networkAccess.extraAllowedDomains' })
    }
  }
  if (config.analytics?.enabled && config.analytics?.endpointUrl) {
    const h = hostFromOrigin(config.analytics.endpointUrl)
    if (h && FORBIDDEN_HOSTS.has(h)) offenders.push({ host: h, source: 'config.analytics.endpointUrl' })
  }

  if (offenders.length > 0) {
    console.error('[check-allowed-domains] FAIL: Forbidden outbound host(s) in manifest or config:')
    offenders.forEach(({ host, source }) => console.error(`  - ${host} (from ${source})`))
    console.error('[check-allowed-domains] Remove these from custom/config.json or manifest networkAccess and rebuild.')
    process.exit(1)
  }
  console.log('[check-allowed-domains] PASSED: No forbidden hosts in allowed domains')
  process.exit(0)
}

main()
```

### Wire into `package.json` postbuild

- **Current postbuild:**  
  `node scripts/check-sync-api.js && node scripts/check-banned-phrases.js && node scripts/check-figma-bundle-compat.js && tsx scripts/update-manifest-network-access.ts && npm run invariants`
- **Change:** Insert `node scripts/check-allowed-domains.js` **after** `tsx scripts/update-manifest-network-access.ts` and **before** `npm run invariants`.
- **New postbuild line:**

```json
"postbuild": "node scripts/check-sync-api.js && node scripts/check-banned-phrases.js && node scripts/check-figma-bundle-compat.js && tsx scripts/update-manifest-network-access.ts && node scripts/check-allowed-domains.js && npm run invariants"
```

---

## A3) Optional logging hardening

- **File:** `src/core/config.ts`
- **Current:** `enabled: true` (around line 36 inside `debug`).
- **Recommendation:** For demo stability, set `enabled: false` so no scoped debug logs run (including `subsystem:ui`).
- **Minimal change:** Replace `enabled: true` with `enabled: false`.
- **Downside:** Loss of all scoped debug logs (e.g. `[UI] Build version`, mode/state logs) until toggled back. No impact on plugin behavior other than console output.
- **Reversible:** Single line change; revert to `true` for post-demo debugging.

---

## Verification (re-run after applying changes)

1. **Build**
   ```bash
   cd figmai_plugin && npm run build
   ```
   Expect: full build and postbuild succeed, including `[check-allowed-domains] PASSED`.

2. **Network call sites unchanged**
   ```bash
   grep -Rn "fetch\s*(" src/ --include="*.ts" --include="*.tsx"
   grep -Rn "XMLHttpRequest\|WebSocket\|EventSource\|sendBeacon" src/ --include="*.ts" --include="*.tsx"
   ```
   Expect: same set as before (internalApiProvider, proxy client, analytics service; no new fetch/XHR/WS/EventSource/sendBeacon).

3. **Manifest allowlist**
   ```bash
   node -e "console.log(JSON.stringify(require('./build/manifest.json').networkAccess.allowedDomains, null, 2))"
   ```
   Expect: unchanged from current list unless you intentionally changed `custom/config.json`.

4. **Invariant fails when blocked host added**
   - Temporarily add `"https://api.statsigapi.net"` to `custom/config.json` under `networkAccess.extraAllowedDomains`, run `tsx scripts/update-manifest-network-access.ts` (or full build), then run `node scripts/check-allowed-domains.js`.
   - Expect: script exits 1 and prints offending host and source.
   - Remove the test entry and re-run build to confirm pass.

---

## Risk assessment

- **A1 (comments):** Documentation only; no runtime or build behavior change. Safe.
- **A2 (check-allowed-domains.js):** Build-time only; fails the build if a forbidden host appears in manifest or config. No plugin runtime code changed; no new dependencies. If config is valid (no blocked hosts), build is unchanged. Safe and reversible (remove script and postbuild step if ever needed).
- **A3 (debug enabled = false):** Only affects whether scoped debug logs run. No API, payload, or endpoint changes. Easily reverted. Low risk; only downside is less console visibility during demo if you need to debug.

All changes are narrowly scoped, additive (comments + one script + one postbuild step), and reversible.
