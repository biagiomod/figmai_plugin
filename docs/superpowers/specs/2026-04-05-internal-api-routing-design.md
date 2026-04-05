# Design: Private-Environment Routing & ACE TLS Handling

**Date:** 2026-04-05  
**Status:** Approved  
**Scope:** `figmai_plugin/`

---

## Problem Summary

Two related failures block use of the plugin and ACE local admin in a private/corporate environment:

1. **Issue 1 — Plugin Settings cannot activate Internal API at runtime.**  
   The user selects Internal API in Settings, saves, and tests successfully. But subsequent chat requests still go through the proxy. Runtime provider always resolves to `ProxyProvider`.

2. **Issue 2 — ACE localhost test connection fails against corporate HTTPS endpoints.**  
   `/api/test/connection` returns `"Connection test failed: fetch failed"` with no actionable detail. The underlying cause is a TLS certificate trust gap between Node.js and the macOS/browser trust store.

---

## Root Cause Analysis

### Issue 1 — Silent proxy lock from baseline config

**Smoking gun:** `custom/config.json` line 33 sets `"provider": "proxy"`.

Call chain:
1. `getLlmProvider()` reads `customConfig.llm.provider` → always returns `"proxy"`
2. `getEffectiveSettings()` checks `if (!provider) return base` — condition is never `true`
3. Config wins over clientStorage unconditionally; saved `connectionType = "internal-api"` is ignored
4. `createProvider()` calls `getEffectiveSettings()` → effective settings always say proxy → always builds `ProxyProvider`
5. Provider re-init after `SAVE_SETTINGS` uses the same poisoned effective settings → still proxy

The precedence logic in `settings.ts` is architecturally correct. The sole defect is one field in the baseline config that should not be set.

**Intended behavior (already in code, blocked by baseline):**
- `config.llm.provider` absent → `getLlmProvider()` returns `undefined` → `getEffectiveSettings()` returns clientStorage → user-controlled
- `config.llm.provider = "internal-api"` → effective settings force internal-api (private/S3 build)
- `config.llm.provider = "proxy"` → effective settings force proxy (enterprise proxy lock)

### Issue 2 — Node.js does not use macOS Keychain

Node.js maintains its own CA bundle (Mozilla-derived) and does **not** read from macOS Keychain or the system trust store. The browser and Figma plugin sandbox do.

Consequence:
- **Plugin test connection** (`TEST_PROXY_CONNECTION`) → runs via Figma's browser sandbox → macOS Keychain is consulted → corporate CA trusted → **passes**
- **ACE test connection** (`/api/test/connection`) → runs via Node.js `fetch()` → Node's own CA bundle used → corporate CA not found → TLS handshake fails → **`fetch failed`**

Additionally, the current catch block in `server.ts` only inspects `err.code` and `err.message`. Node's native fetch (undici) wraps TLS failures in `err.cause`, so the error string "fetch failed" is the outer wrapper message while the actionable TLS code lives in `err.cause.code` / `err.cause.message`.

---

## Design

### A. Remove the baseline provider lock

**File:** `custom/config.json`

Remove the `"provider": "proxy"` key from the `llm` block. The baseline config should not lock provider selection; a public/dev build must let the user choose via Settings.

Private/S3 builds that need Internal API locked set:
```json
"llm": {
  "provider": "internal-api",
  "endpoint": "https://internal-endpoint.corp/..."
}
```

No other changes to `settings.ts`, `providerFactory.ts`, or `main.ts` are needed — the existing precedence logic is correct.

**Also:** Regenerate `src/custom/generated/customConfig.ts` by running `npm run generate-custom-overlay`. Do not edit the generated file directly.

---

### B. SettingsModal locked-state UI

**File:** `src/ui/components/SettingsModal.tsx`

`getLlmProvider` is already imported from `../../custom/config`. Add `getCustomLlmEndpoint` to that import (already imported separately; confirm it is available in scope — if not, add it).

Compute two derived booleans at the top of the component:

```ts
const lockedProvider   = getLlmProvider()        // 'internal-api' | 'proxy' | undefined
const lockedEndpoint   = getCustomLlmEndpoint()  // string | null
const isProviderLocked = lockedProvider != null
const isEndpointLocked = lockedProvider === 'internal-api' && !!lockedEndpoint
```

**Lock behavior:**

| Condition | Connection type selector | Internal API URL field |
|---|---|---|
| `isProviderLocked = false` | Enabled (normal) | Enabled when internal-api tab active |
| `isProviderLocked = true, isEndpointLocked = false` | Disabled | Enabled (editable, saves to clientStorage) |
| `isProviderLocked = true, isEndpointLocked = true` | Disabled | Disabled (read-only) |

**"Locked by config" label:** When `isProviderLocked`, render a small muted label below the connection type tab row:
```
Locked by config
```
Style: small font size, secondary foreground color, no interaction. Use existing CSS variables.

**Save behavior is unchanged:** `handleSave` continues to emit `SAVE_SETTINGS`. When provider is config-locked, the saved `connectionType` will be overridden by `getEffectiveSettings()` on next load — this is intentional and now transparent to the user because the UI no longer allows switching.

**Do not lock:** proxy URL field, auth fields, or model field — provider locking to `"proxy"` only hides Internal API UI per existing `hideInternalApiSettings` logic, which is separate and unchanged.

---

### C. ACE corporate CA trust — programmatic merge via Node 22 TLS API

**Important correction:** `process.env.NODE_EXTRA_CA_CERTS` is read only when the Node process is first launched; setting it at runtime has no effect. Do not use this approach inside server.ts.

**Goal:** A private-environment user whose corporate CA is already in macOS Keychain (installed by IT) gets ACE trust automatically on startup. A user who has a manual CA cert file drops it at a convention path and restarts — also automatic. No special command needed in either case.

**Mechanism:** Use the Node 22.12+ programmatic TLS API (`tls.getCACertificates` / `tls.setDefaultCACertificates`) at server startup, before any outbound `fetch()` calls are made. This merges the Mozilla default bundle, the OS system trust store (macOS Keychain), and any manually placed cert file into the process-wide TLS default CA set.

```ts
import tls from 'node:tls'

// Called once at server startup, before any outbound connections
function setupCorporateCATrust(): void {
  try {
    const defaultCerts  = tls.getCACertificates('default')   // Mozilla bundle
    const systemCerts   = tls.getCACertificates('system')    // macOS Keychain / OS store

    const conventionCertPath = path.join(adminEditorDir, 'certs', 'corp-ca.pem')
    const extraCerts: string[] = []
    if (fs.existsSync(conventionCertPath)) {
      try {
        extraCerts.push(fs.readFileSync(conventionCertPath, 'utf-8'))
        console.log(`[ACE] Additional CA cert loaded from ${conventionCertPath}`)
      } catch (e) {
        console.warn(`[ACE] Failed to read ${conventionCertPath}:`, e)
      }
    }

    tls.setDefaultCACertificates([...defaultCerts, ...systemCerts, ...extraCerts])

    if (systemCerts.length > 0) {
      console.log(`[ACE] System CA certs merged (${systemCerts.length} certs from OS trust store)`)
    }
  } catch (e) {
    // API is Node 22.12+; log and continue if unavailable
    console.warn('[ACE] Could not merge system/convention CA certs:', (e as Error).message)
  }
}
```

Call `setupCorporateCATrust()` immediately after `adminEditorDir` is defined and before `app.listen`.

`NODE_EXTRA_CA_CERTS` set in the environment **before** process launch continues to work as documented by Node for users who prefer env-var config (e.g., CI). The programmatic approach supplements rather than replaces it.

**New files:**
- `admin-editor/certs/corp-ca.pem.example` — committed placeholder with instructions
- `.gitignore` entry: `admin-editor/certs/*.pem` (not `.example`)

**Startup tip (non-production only):** When neither the system store nor the convention cert file provides extra certs, print once:
```
[ACE] Tip: for corporate/internal HTTPS endpoints, place your CA cert at admin-editor/certs/corp-ca.pem
```

No insecure bypass (`NODE_TLS_REJECT_UNAUTHORIZED`) is introduced anywhere.

---

### D. TLS error detection and actionable diagnostics

**File:** `admin-editor/server.ts`

Add a `isTlsError(err: unknown): boolean` helper that inspects all four error surfaces:

```ts
function isTlsError(err: unknown): boolean {
  const TLS_PATTERNS = [
    'SELF_SIGNED_CERT_IN_CHAIN',
    'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
    'CERT_UNTRUSTED',
    'UNABLE_TO_GET_ISSUER_CERT_LOCALLY',
    'unable to get local issuer certificate',
    'certificate has expired',
    'ERR_TLS_CERT_ALTNAME_INVALID',
    'self signed certificate',
    'certificate verify failed',
  ]
  const candidates = [
    (err as any)?.code,
    (err as any)?.message,
    (err as any)?.cause?.code,
    (err as any)?.cause?.message,
  ]
  return candidates.some(s =>
    typeof s === 'string' && TLS_PATTERNS.some(p => s.includes(p))
  )
}
```

**Error message when `isTlsError` is true:**
```
TLS certificate verification failed. Node.js does not trust this endpoint's certificate chain 
(this is common with corporate or self-signed CAs). 
Fix: place your corporate CA certificate at admin-editor/certs/corp-ca.pem and restart ACE. 
Alternatively, set NODE_EXTRA_CA_CERTS=/path/to/ca.pem before starting ACE. 
See docs/guides/ace-tls.md for details.
```

**Apply to:** all `catch` blocks in `/api/test/connection` and `/api/test/assistant` that handle outbound `fetch()` failures. This replaces the plain `fetch failed` fallback for the TLS case only; all other error paths (ECONNREFUSED, timeout, etc.) are preserved unchanged.

---

### E. TLS guide doc

**New file:** `docs/guides/ace-tls.md`

Contents:
- Why Node.js does not use macOS Keychain (brief explanation)
- How to export a corporate CA cert (system Keychain, openssl, browser)
- Where to place it (`admin-editor/certs/corp-ca.pem`)
- How to verify it works (restart ACE, re-run test connection)
- Alternative: `NODE_EXTRA_CA_CERTS` env var for CI or other environments

---

## File Change Summary

| File | Change |
|---|---|
| `custom/config.json` | Remove `llm.provider: "proxy"` key |
| `src/custom/generated/customConfig.ts` | Regenerate via `npm run generate-custom-overlay` |
| `src/ui/components/SettingsModal.tsx` | Add locked-state UI (provider + endpoint) |
| `admin-editor/server.ts` | Convention cert loading at startup; `isTlsError` helper; improved catch blocks in test endpoints |
| `admin-editor/certs/corp-ca.pem.example` | New: committed placeholder |
| `.gitignore` | Add `admin-editor/certs/*.pem` |
| `docs/guides/ace-tls.md` | New: TLS guide for ACE |

---

## What Does NOT Change

- `src/core/settings.ts` — precedence logic is correct as-is
- `src/core/provider/providerFactory.ts` — provider selection logic is correct as-is
- `src/main.ts` — SAVE_SETTINGS already reinitializes provider after save
- `src/custom/config.ts` — helper functions are correct as-is
- All proxy-path logic — proxy support is fully preserved

---

## Validation

After implementation:

1. **Issue 1 — public build:** `config.json` has no `provider` key → `getLlmProvider()` returns `undefined` → user can save and use Internal API settings → `createProvider()` creates `InternalApiProvider` → correct.

2. **Issue 1 — private/locked build:** `config.json` has `provider: "internal-api"` + `endpoint: "..."` → Settings modal shows Internal API tab locked + endpoint read-only → provider resolves to `InternalApiProvider` → correct.

3. **Issue 1 — proxy locked build:** `config.json` has `provider: "proxy"` → Settings modal shows Proxy tab locked → provider resolves to `ProxyProvider` → correct.

4. **Issue 2 — TLS failure:** ACE returns a clear message citing `corp-ca.pem` placement and `NODE_EXTRA_CA_CERTS`. No more `"fetch failed"`.

5. **Issue 2 — cert present:** `admin-editor/certs/corp-ca.pem` exists → env var set at startup → subsequent test connection succeeds against corporate endpoint.

6. **Regression check:** Public build with no cert, no provider lock → proxy settings work as before.

---

## Manual Follow-Up Required

After the code changes are deployed to a private environment:

1. Export the corporate CA certificate (PEM format) from macOS Keychain or obtain from your IT/security team.
2. Place it at `admin-editor/certs/corp-ca.pem`.
3. Restart ACE (`npm run admin`).
4. Re-run the test connection in the AI page — it should now succeed.

For the plugin runtime, no additional steps are needed — the browser/Figma sandbox already trusts the corporate CA via macOS.
