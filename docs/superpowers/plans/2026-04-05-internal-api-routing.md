# Internal API Routing & ACE TLS Handling — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix silent proxy lock in baseline config, add explicit locked-state UI in Settings, and make ACE trust corporate HTTPS endpoints automatically.

**Architecture:** Three independent areas: (1) remove `llm.provider` from baseline config so `getEffectiveSettings()` falls through to clientStorage; (2) add `isProviderLocked`/`isEndpointLocked` booleans to SettingsModal for UI transparency; (3) add `setupCorporateCATrust()` to ACE server startup (Node 22 TLS API) and improve TLS error diagnostics in all test-endpoint catch blocks.

**Tech Stack:** TypeScript, Preact (plugin UI), Express + Node 22 native TLS API (ACE server), tsx for tests, `node:assert` for test assertions.

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `custom/config.json` | Modify | Remove `llm.provider: "proxy"` (baseline provider lock) |
| `src/custom/generated/customConfig.ts` | Regenerate | Must match source; run `npm run generate-custom-overlay` |
| `src/ui/components/SettingsModal.tsx` | Modify | Locked-state UI for provider + endpoint |
| `admin-editor/src/tls-errors.ts` | Create | Pure `isTlsError()` helper — extracted for testability |
| `admin-editor/src/tls-errors.test.ts` | Create | Unit tests for `isTlsError()` |
| `admin-editor/server.ts` | Modify | `setupCorporateCATrust()` at startup; import `isTlsError`; update 4 catch blocks |
| `admin-editor/certs/corp-ca.pem.example` | Create | Placeholder + instructions, committed |
| `.gitignore` | Modify | Add `admin-editor/certs/*.pem` |
| `docs/guides/ace-tls.md` | Create | TLS trust guide for ACE |
| `package.json` | Modify | Add `tls-errors.test.ts` to test script |

---

## Task 1: Remove baseline provider lock from config.json

**Files:**
- Modify: `custom/config.json`
- Regenerate: `src/custom/generated/customConfig.ts`

**Context:** `getLlmProvider()` reads `customConfig.llm.provider`. When it is `"proxy"`, `getEffectiveSettings()` unconditionally overrides clientStorage and always returns proxy settings, blocking Internal API. Removing the key restores the intended behavior: `getLlmProvider()` returns `undefined`, `getEffectiveSettings()` falls through to clientStorage.

- [ ] **Step 1: Edit `custom/config.json` — remove `"provider": "proxy"`**

In the `"llm"` block, remove exactly this line:
```json
    "provider": "proxy",
```

The `"llm"` block in `custom/config.json` must change from:
```json
  "llm": {
    "endpoint": "",
    "hideInternalApiSettings": false,
    "hideModelSettings": false,
    "hideProxySettings": false,
    "promptDiagnostics": {
      "enabled": false,
      "level": "compact"
    },
    "provider": "proxy",
    "proxy": {
```
to:
```json
  "llm": {
    "endpoint": "",
    "hideInternalApiSettings": false,
    "hideModelSettings": false,
    "hideProxySettings": false,
    "promptDiagnostics": {
      "enabled": false,
      "level": "compact"
    },
    "proxy": {
```

- [ ] **Step 2: Regenerate `customConfig.ts` from source**

```bash
cd figmai_plugin && npm run generate-custom-overlay
```

Expected: no errors. `src/custom/generated/customConfig.ts` is updated — the `"provider": "proxy"` line should no longer appear in the embedded `customConfig` constant.

Verify:
```bash
grep '"provider"' src/custom/generated/customConfig.ts
```
Expected: no output (no `provider` key in the generated file).

- [ ] **Step 3: Run invariants and typecheck**

```bash
npm run invariants
npm run build -- --no-minify 2>&1 | tail -20
```

Expected: both pass with no errors.

- [ ] **Step 4: Commit**

```bash
git add custom/config.json src/custom/generated/customConfig.ts
git commit -m "fix: remove baseline llm.provider lock from config

config.json previously hardcoded provider=proxy, causing getEffectiveSettings()
to always override clientStorage and blocking Internal API selection."
```

---

## Task 2: SettingsModal locked-state UI

**Files:**
- Modify: `src/ui/components/SettingsModal.tsx` (lines ~13, ~31–47, ~669–773, ~611–640, ~929–947)

**Context:** When `getLlmProvider()` returns non-null, the effective settings are config-controlled. The UI must reflect this so users understand why their connection-type change doesn't persist. Two rendering paths exist: the full settings path (`showFullLlmSettings`) and the simplified connection-only path (`hideModelSettings || showConnectionOnly`). Both need a "Locked by config" label. The Internal API URL field is additionally locked when `lockedProvider === 'internal-api'` AND config supplies a non-empty endpoint.

- [ ] **Step 1: Add `getLlmProvider` to the existing config import**

Current import at line 13:
```ts
import { shouldHideContentMvpMode, getCustomLlmEndpoint, shouldHideLlmModelSettings, getCustomConfig, getLlmUiMode, getHideInternalApiSettings, getHideProxySettings, getHideTestConnectionButton } from '../../custom/config'
```

Replace with:
```ts
import { shouldHideContentMvpMode, getCustomLlmEndpoint, getLlmProvider, shouldHideLlmModelSettings, getCustomConfig, getLlmUiMode, getHideInternalApiSettings, getHideProxySettings, getHideTestConnectionButton } from '../../custom/config'
```

- [ ] **Step 2: Compute lock booleans — add after existing const block (around line 47)**

The existing constants at the top of `SettingsModal` end with:
```ts
  const showConnectionOnly = !!customEndpoint && llmUiMode === 'connection-only' && !hideModelSettings
  const showFullLlmSettings = !hideModelSettings && !showConnectionOnly
```

Add immediately after:
```ts
  const lockedProvider   = getLlmProvider()
  const isProviderLocked = lockedProvider != null
  const isEndpointLocked = lockedProvider === 'internal-api' && !!customEndpoint
```

`customEndpoint` is already computed from `getCustomLlmEndpoint()` earlier in the same block.

- [ ] **Step 3: Lock the connection-type tab buttons (Path 2 — full settings)**

Locate the Internal API tab `<button>` inside the `{/* Connection Type Toggle */}` section (around line 680). It currently starts with:
```tsx
<button
  onClick={() => setConnectionType('internal-api')}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      setConnectionType('internal-api')
    }
  }}
  style={{
    flex: 1,
    padding: 'var(--spacing-sm) var(--spacing-md)',
    border: 'none',
    borderRight: '1px solid var(--border-subtle)',
    borderRadius: 0,
    backgroundColor: connectionType === 'internal-api' ? '#ffffff' : 'var(--surface-modal)',
    color: connectionType === 'internal-api' ? '#000000' : 'var(--fg-secondary)',
    cursor: 'pointer',
    textAlign: 'center',
    fontFamily: 'var(--font-family)',
    fontSize: 'var(--font-size-sm)',
    fontWeight: connectionType === 'internal-api' ? 'var(--font-weight-semibold)' : 'var(--font-weight-normal)',
    transition: 'background-color 0.15s ease, color 0.15s ease',
    outline: 'none'
  }}
```

Replace this opening section of the Internal API button with:
```tsx
<button
  disabled={isProviderLocked}
  onClick={() => setConnectionType('internal-api')}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      setConnectionType('internal-api')
    }
  }}
  style={{
    flex: 1,
    padding: 'var(--spacing-sm) var(--spacing-md)',
    border: 'none',
    borderRight: '1px solid var(--border-subtle)',
    borderRadius: 0,
    backgroundColor: connectionType === 'internal-api' ? '#ffffff' : 'var(--surface-modal)',
    color: connectionType === 'internal-api' ? '#000000' : 'var(--fg-secondary)',
    cursor: isProviderLocked ? 'not-allowed' : 'pointer',
    opacity: isProviderLocked && connectionType !== 'internal-api' ? 0.5 : 1,
    textAlign: 'center',
    fontFamily: 'var(--font-family)',
    fontSize: 'var(--font-size-sm)',
    fontWeight: connectionType === 'internal-api' ? 'var(--font-weight-semibold)' : 'var(--font-weight-normal)',
    transition: 'background-color 0.15s ease, color 0.15s ease',
    outline: 'none'
  }}
```

Locate the Proxy tab `<button>` (around line 727). It currently starts with:
```tsx
<button
  onClick={() => setConnectionType('proxy')}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      setConnectionType('proxy')
    }
  }}
  style={{
    flex: 1,
    padding: 'var(--spacing-sm) var(--spacing-md)',
    border: 'none',
    borderRadius: 0,
    backgroundColor: connectionType === 'proxy' ? '#ffffff' : 'var(--surface-modal)',
    color: connectionType === 'proxy' ? '#000000' : 'var(--fg-secondary)',
    cursor: 'pointer',
    textAlign: 'center',
    fontFamily: 'var(--font-family)',
    fontSize: 'var(--font-size-sm)',
    fontWeight: connectionType === 'proxy' ? 'var(--font-weight-semibold)' : 'var(--font-weight-normal)',
    transition: 'background-color 0.15s ease, color 0.15s ease',
    outline: 'none'
  }}
```

Replace with:
```tsx
<button
  disabled={isProviderLocked}
  onClick={() => setConnectionType('proxy')}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      setConnectionType('proxy')
    }
  }}
  style={{
    flex: 1,
    padding: 'var(--spacing-sm) var(--spacing-md)',
    border: 'none',
    borderRadius: 0,
    backgroundColor: connectionType === 'proxy' ? '#ffffff' : 'var(--surface-modal)',
    color: connectionType === 'proxy' ? '#000000' : 'var(--fg-secondary)',
    cursor: isProviderLocked ? 'not-allowed' : 'pointer',
    opacity: isProviderLocked && connectionType !== 'proxy' ? 0.5 : 1,
    textAlign: 'center',
    fontFamily: 'var(--font-family)',
    fontSize: 'var(--font-size-sm)',
    fontWeight: connectionType === 'proxy' ? 'var(--font-weight-semibold)' : 'var(--font-weight-normal)',
    transition: 'background-color 0.15s ease, color 0.15s ease',
    outline: 'none'
  }}
```

- [ ] **Step 4: Add "Locked by config" label below the tab row (Path 2)**

The outer connection-toggle `<div>` wraps the tab row. It currently looks like:
```tsx
{/* Connection Type Toggle */}
<div>
  <div style={{ display: 'flex', border: '1px solid var(--border-subtle)', ... }}>
    {!hideInternalApi && ( <button ...>Internal API</button> )}
    {!hideProxy && ( <button ...>Proxy</button> )}
  </div>
</div>
```

After the inner `</div>` (closing the flex row) and before the outer `</div>`, add:
```tsx
          {isProviderLocked && (
            <div style={{
              fontSize: 'var(--font-size-xs)',
              color: 'var(--fg-secondary)',
              marginTop: 'var(--spacing-xs)',
              textAlign: 'center'
            }}>
              Locked by config
            </div>
          )}
```

- [ ] **Step 5: Lock the Internal API URL Textbox when endpoint is config-locked (Path 2)**

Locate the Internal API endpoint `Textbox` inside `{!hideInternalApi && connectionType === 'internal-api' && (` (around line 940):
```tsx
            <Textbox
              value={internalApiUrl}
              onValueInput={setInternalApiUrl}
              placeholder="https://api.example.com/llm/endpoint"
              style={{
                width: '100%'
              }}
            />
```

Replace with:
```tsx
            <Textbox
              value={internalApiUrl}
              onValueInput={setInternalApiUrl}
              placeholder="https://api.example.com/llm/endpoint"
              disabled={isEndpointLocked}
              style={{
                width: '100%',
                ...(isEndpointLocked ? { opacity: 0.7 } : {})
              }}
            />
```

- [ ] **Step 6: Add "Locked by config" label to Path 1 (simplified connection-only path)**

Path 1 is the branch at line 611: `(hideModelSettings || showConnectionOnly) ? (...)`. It shows a disabled `Textbox` for `customEndpoint`. The current label section inside that branch ends with the disabled Textbox:
```tsx
              <Textbox
                value={customEndpoint || ''}
                disabled
                style={{
                  width: '100%',
                  opacity: 0.7
                }}
              />
            </div>
```

After the closing `</div>` of the endpoint block (immediately before `{!hideTestBtn && (`), add:
```tsx
            {isProviderLocked && (
              <div style={{
                fontSize: 'var(--font-size-xs)',
                color: 'var(--fg-secondary)',
                marginTop: 'var(--spacing-xs)'
              }}>
                Locked by config
              </div>
            )}
```

- [ ] **Step 7: Build to verify TypeScript compiles**

```bash
npm run build -- --no-minify 2>&1 | tail -30
```

Expected: successful build, no TypeScript errors.

- [ ] **Step 8: Commit**

```bash
git add src/ui/components/SettingsModal.tsx
git commit -m "feat: show locked-state in Settings when provider is config-controlled

When getLlmProvider() is non-null, disable the connection type toggle and
show 'Locked by config' label. When endpoint is also in config, disable
the endpoint field. Applies to both full and simplified rendering paths."
```

---

## Task 3: `isTlsError` helper — extract, test, add to test suite

**Files:**
- Create: `admin-editor/src/tls-errors.ts`
- Create: `admin-editor/src/tls-errors.test.ts`
- Modify: `package.json` (add to test script)

**Context:** The `isTlsError` function is pure (no I/O, no server imports). Extracting it to its own module makes it testable without starting the Express server. The test uses `node:assert`, matching the project's existing test pattern.

- [ ] **Step 1: Write the failing test first**

Create `admin-editor/src/tls-errors.test.ts`:
```ts
/**
 * Tests for isTlsError helper.
 * Run: npx tsx admin-editor/src/tls-errors.test.ts
 */

import assert from 'node:assert'
import { isTlsError } from './tls-errors'

function test_detectsFromErrCode() {
  assert.strictEqual(isTlsError({ code: 'SELF_SIGNED_CERT_IN_CHAIN' }), true, 'err.code SELF_SIGNED_CERT_IN_CHAIN')
  assert.strictEqual(isTlsError({ code: 'UNABLE_TO_VERIFY_LEAF_SIGNATURE' }), true, 'err.code UNABLE_TO_VERIFY_LEAF_SIGNATURE')
  assert.strictEqual(isTlsError({ code: 'CERT_UNTRUSTED' }), true, 'err.code CERT_UNTRUSTED')
  assert.strictEqual(isTlsError({ code: 'ERR_TLS_CERT_ALTNAME_INVALID' }), true, 'err.code ERR_TLS_CERT_ALTNAME_INVALID')
}

function test_detectsFromErrMessage() {
  assert.strictEqual(isTlsError({ message: 'unable to get local issuer certificate' }), true, 'err.message issuer')
  assert.strictEqual(isTlsError({ message: 'certificate verify failed' }), true, 'err.message verify failed')
  assert.strictEqual(isTlsError({ message: 'self signed certificate in chain' }), true, 'err.message self signed')
  assert.strictEqual(isTlsError({ message: 'certificate has expired' }), true, 'err.message expired')
}

function test_detectsFromCauseCode() {
  const err = { message: 'fetch failed', cause: { code: 'SELF_SIGNED_CERT_IN_CHAIN' } }
  assert.strictEqual(isTlsError(err), true, 'err.cause.code SELF_SIGNED_CERT_IN_CHAIN')

  const err2 = { message: 'fetch failed', cause: { code: 'UNABLE_TO_GET_ISSUER_CERT_LOCALLY' } }
  assert.strictEqual(isTlsError(err2), true, 'err.cause.code UNABLE_TO_GET_ISSUER_CERT_LOCALLY')
}

function test_detectsFromCauseMessage() {
  const err = { message: 'fetch failed', cause: { message: 'self signed certificate in chain' } }
  assert.strictEqual(isTlsError(err), true, 'err.cause.message self signed')

  const err2 = { message: 'fetch failed', cause: { message: 'unable to get local issuer certificate' } }
  assert.strictEqual(isTlsError(err2), true, 'err.cause.message issuer')
}

function test_returnsFalseForNonTlsErrors() {
  assert.strictEqual(isTlsError({ code: 'ECONNREFUSED', message: 'Connection refused' }), false, 'ECONNREFUSED')
  assert.strictEqual(isTlsError({ name: 'TimeoutError', message: 'Request timed out' }), false, 'timeout')
  assert.strictEqual(isTlsError({ message: 'fetch failed' }), false, 'bare fetch failed')
}

function test_returnsFalseForNullish() {
  assert.strictEqual(isTlsError(null), false, 'null')
  assert.strictEqual(isTlsError(undefined), false, 'undefined')
  assert.strictEqual(isTlsError('some string'), false, 'string')
}

test_detectsFromErrCode()
test_detectsFromErrMessage()
test_detectsFromCauseCode()
test_detectsFromCauseMessage()
test_returnsFalseForNonTlsErrors()
test_returnsFalseForNullish()

console.log('tls-errors: all tests passed')
```

- [ ] **Step 2: Run the test — confirm it fails (module not found)**

```bash
cd figmai_plugin && npx tsx admin-editor/src/tls-errors.test.ts
```

Expected: error like `Cannot find module './tls-errors'`

- [ ] **Step 3: Create `admin-editor/src/tls-errors.ts`**

```ts
/**
 * TLS error detection helper for ACE server.
 * Pure function — no imports, no side effects.
 */

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

/**
 * Returns true when err (or its cause) carries a TLS trust/verification failure.
 * Node's native fetch (undici) wraps TLS errors in err.cause, so we inspect
 * err.code, err.message, err.cause.code, and err.cause.message.
 */
export function isTlsError(err: unknown): boolean {
  const candidates = [
    (err as any)?.code,
    (err as any)?.message,
    (err as any)?.cause?.code,
    (err as any)?.cause?.message,
  ]
  return candidates.some(
    (s) => typeof s === 'string' && TLS_PATTERNS.some((p) => s.includes(p))
  )
}
```

- [ ] **Step 4: Run the test — confirm it passes**

```bash
npx tsx admin-editor/src/tls-errors.test.ts
```

Expected:
```
tls-errors: all tests passed
```

- [ ] **Step 5: Add the new test to `package.json` test script**

In `package.json`, find the `"test"` script. It is a long `&&`-joined string of `tsx ...test.ts` invocations. Append at the end:
```
&& tsx admin-editor/src/tls-errors.test.ts
```

The end of the test script currently reads:
```
... && tsx src/core/richText/enhancers.test.ts && tsx admin-editor/src/auth-middleware.test.ts
```

Change to:
```
... && tsx src/core/richText/enhancers.test.ts && tsx admin-editor/src/auth-middleware.test.ts && tsx admin-editor/src/tls-errors.test.ts
```

- [ ] **Step 6: Run full test suite to confirm no regressions**

```bash
npm run test
```

Expected: all tests pass, final line includes `tls-errors: all tests passed`.

- [ ] **Step 7: Commit**

```bash
git add admin-editor/src/tls-errors.ts admin-editor/src/tls-errors.test.ts package.json
git commit -m "feat: add isTlsError helper with tests

Extracts TLS error detection into a pure, testable module.
Inspects err.code, err.message, err.cause.code, err.cause.message
because Node's native fetch wraps TLS failures in cause."
```

---

## Task 4: ACE server — corporate CA trust + improved TLS diagnostics

**Files:**
- Modify: `admin-editor/server.ts`

**Context:** Node 22.12+ exposes `tls.getCACertificates('system')` which reads the OS trust store (macOS Keychain on macOS). `tls.setDefaultCACertificates()` replaces the process-wide default CA set. Calling these at startup, before any outbound `fetch()` calls, makes all subsequent HTTPS connections trust CAs in the system store and/or a convention cert file. The `isTlsError` helper is imported from the module created in Task 3. Four catch blocks (2 in `/api/test/connection`, 2 in `/api/test/assistant`) are updated to produce actionable TLS error messages.

- [ ] **Step 1: Add imports at the top of `admin-editor/server.ts`**

Locate the existing imports block near the top of the file. Add `tls` to the node: imports and import `isTlsError`:

After the line:
```ts
import fs from 'fs'
```

Add:
```ts
import tls from 'node:tls'
import { isTlsError } from './src/tls-errors'
```

(If `fs` is imported as `import fs from 'fs'` rather than `'node:fs'`, leave it unchanged; just add the two new lines after it.)

- [ ] **Step 2: Add `setupCorporateCATrust()` function**

Add this function after the existing `escapeHtml`, `sentenceCase`, `normalizeIntroLine` helpers and before the first `app.use(...)` call:

```ts
/**
 * Merge system OS trust store and optional convention cert file into Node's
 * default TLS CA set. Call once at startup before any outbound fetch() calls.
 *
 * Uses Node 22.12+ tls.getCACertificates / tls.setDefaultCACertificates.
 * No-ops gracefully on older Node versions (caught exception).
 *
 * Supports NODE_EXTRA_CA_CERTS (set before process launch) as an alternative
 * for CI or users who prefer env-var config — that path is handled by Node
 * natively and is not affected by this function.
 */
function setupCorporateCATrust(): void {
  try {
    const defaultCerts = tls.getCACertificates('default')
    const systemCerts  = tls.getCACertificates('system')

    const conventionCertPath = path.join(adminEditorDir, 'certs', 'corp-ca.pem')
    const extraCerts: string[] = []
    if (fs.existsSync(conventionCertPath)) {
      try {
        extraCerts.push(fs.readFileSync(conventionCertPath, 'utf-8'))
        console.log(`[ACE] Additional CA cert loaded from ${conventionCertPath}`)
      } catch (e) {
        console.warn(`[ACE] Failed to read cert file ${conventionCertPath}:`, (e as Error).message)
      }
    }

    tls.setDefaultCACertificates([...defaultCerts, ...systemCerts, ...extraCerts])

    if (systemCerts.length > 0) {
      console.log(`[ACE] System CA certs merged (${systemCerts.length} certs from OS trust store)`)
    } else if (extraCerts.length === 0 && process.env.NODE_ENV !== 'production') {
      console.log('[ACE] Tip: for corporate/internal HTTPS endpoints, place your CA cert at admin-editor/certs/corp-ca.pem')
    }
  } catch (e) {
    // tls.getCACertificates / setDefaultCACertificates require Node >= 22.12.0
    console.warn('[ACE] Could not merge system/convention CA certs:', (e as Error).message)
  }
}
```

- [ ] **Step 3: Call `setupCorporateCATrust()` at startup**

`adminEditorDir` is defined near the top of the file as:
```ts
const adminEditorDir = __dirname
```

Add the call immediately after that line (the constant is needed before calling):
```ts
const adminEditorDir = __dirname
setupCorporateCATrust()
```

Wait — `setupCorporateCATrust` is defined later in the file. Move the call to after its definition, or use a forward reference. The cleanest approach: call it right before `app.listen(...)`. Find the `app.listen` block near the end of the file:

```ts
const PORT = process.env.ADMIN_EDITOR_PORT ? parseInt(process.env.ADMIN_EDITOR_PORT, 10) : 3333
const HOST = process.env.ADMIN_EDITOR_HOST || (ACE_AUTH_MODE === 'wrapper' ? '127.0.0.1' : '0.0.0.0')
app.listen(PORT, HOST, () => {
```

Replace with:
```ts
const PORT = process.env.ADMIN_EDITOR_PORT ? parseInt(process.env.ADMIN_EDITOR_PORT, 10) : 3333
const HOST = process.env.ADMIN_EDITOR_HOST || (ACE_AUTH_MODE === 'wrapper' ? '127.0.0.1' : '0.0.0.0')
setupCorporateCATrust()
app.listen(PORT, HOST, () => {
```

This ensures `setupCorporateCATrust()` runs once at startup, before the server begins accepting requests (and therefore before any outbound fetch calls are made from route handlers).

- [ ] **Step 4: Update `/api/test/connection` internal-api catch block**

Locate the catch block for the internal-api path in `/api/test/connection` (around line 812):

```ts
    } catch (err: any) {
      const msg: string = err?.message ?? String(err)
      let message = `Connection test failed: ${msg}`
      if (msg.includes('ECONNREFUSED') || msg.includes('ENOTFOUND')) {
        message = `Cannot reach endpoint: ${msg}. Check that the URL is correct and the service is running.`
      } else if (err?.name === 'TimeoutError' || msg.includes('timeout')) {
        message = 'Connection timed out. The endpoint did not respond within 15 seconds.'
      }
      return res.json({ success: false, message, diagnostics: { url, error: msg } })
    }
```

Replace with:
```ts
    } catch (err: any) {
      const msg: string = err?.message ?? String(err)
      let message: string
      if (isTlsError(err)) {
        message = 'TLS certificate verification failed. Node.js does not trust this endpoint\'s certificate chain (common with corporate or self-signed CAs). Fix: place your corporate CA cert at admin-editor/certs/corp-ca.pem and restart ACE. See docs/guides/ace-tls.md for details.'
      } else if (msg.includes('ECONNREFUSED') || msg.includes('ENOTFOUND')) {
        message = `Cannot reach endpoint: ${msg}. Check that the URL is correct and the service is running.`
      } else if (err?.name === 'TimeoutError' || msg.includes('timeout')) {
        message = 'Connection timed out. The endpoint did not respond within 15 seconds.'
      } else {
        message = `Connection test failed: ${msg}`
      }
      return res.json({ success: false, message, diagnostics: { url, errorCode: err?.code, errorCauseCode: err?.cause?.code, error: msg } })
    }
```

- [ ] **Step 5: Update `/api/test/connection` proxy catch block**

Locate the catch block for the proxy path in `/api/test/connection` (around line 847):

```ts
    } catch (err: any) {
      const msg: string = err?.message ?? String(err)
      let message = `Connection test failed: ${msg}`
      if (msg.includes('ECONNREFUSED') || msg.includes('ENOTFOUND')) {
        message = `Cannot reach proxy: ${msg}. Check that the base URL is correct.`
      } else if (err?.name === 'TimeoutError' || msg.includes('timeout')) {
        message = 'Connection timed out. The proxy did not respond within 15 seconds.'
      }
      return res.json({ success: false, message, diagnostics: { url: healthUrl, error: msg } })
    }
```

Replace with:
```ts
    } catch (err: any) {
      const msg: string = err?.message ?? String(err)
      let message: string
      if (isTlsError(err)) {
        message = 'TLS certificate verification failed. Node.js does not trust this proxy\'s certificate chain (common with corporate or self-signed CAs). Fix: place your corporate CA cert at admin-editor/certs/corp-ca.pem and restart ACE. See docs/guides/ace-tls.md for details.'
      } else if (msg.includes('ECONNREFUSED') || msg.includes('ENOTFOUND')) {
        message = `Cannot reach proxy: ${msg}. Check that the base URL is correct.`
      } else if (err?.name === 'TimeoutError' || msg.includes('timeout')) {
        message = 'Connection timed out. The proxy did not respond within 15 seconds.'
      } else {
        message = `Connection test failed: ${msg}`
      }
      return res.json({ success: false, message, diagnostics: { url: healthUrl, errorCode: err?.code, errorCauseCode: err?.cause?.code, error: msg } })
    }
```

- [ ] **Step 6: Update `/api/test/assistant` internal-api catch block**

Locate the catch block for the internal-api path in `/api/test/assistant` (around line 937):

```ts
    } catch (err: any) {
      const msg: string = err?.message ?? String(err)
      let message = `Test request failed: ${msg}`
      if (err?.name === 'TimeoutError' || msg.includes('timeout')) message = 'Request timed out after 60 seconds.'
      return res.json({ success: false, message })
    }
```

Replace with:
```ts
    } catch (err: any) {
      const msg: string = err?.message ?? String(err)
      let message: string
      if (isTlsError(err)) {
        message = 'TLS certificate verification failed. Node.js does not trust this endpoint\'s certificate chain (common with corporate or self-signed CAs). Fix: place your corporate CA cert at admin-editor/certs/corp-ca.pem and restart ACE. See docs/guides/ace-tls.md for details.'
      } else if (err?.name === 'TimeoutError' || msg.includes('timeout')) {
        message = 'Request timed out after 60 seconds.'
      } else {
        message = `Test request failed: ${msg}`
      }
      return res.json({ success: false, message })
    }
```

- [ ] **Step 7: Update `/api/test/assistant` proxy catch block**

Locate the catch block for the proxy path in `/api/test/assistant` (around line 987):

```ts
    } catch (err: any) {
      const msg: string = err?.message ?? String(err)
      let message = `Test request failed: ${msg}`
      if (err?.name === 'TimeoutError' || msg.includes('timeout')) message = 'Request timed out after 60 seconds.'
      return res.json({ success: false, message })
    }
```

Replace with:
```ts
    } catch (err: any) {
      const msg: string = err?.message ?? String(err)
      let message: string
      if (isTlsError(err)) {
        message = 'TLS certificate verification failed. Node.js does not trust this proxy\'s certificate chain (common with corporate or self-signed CAs). Fix: place your corporate CA cert at admin-editor/certs/corp-ca.pem and restart ACE. See docs/guides/ace-tls.md for details.'
      } else if (err?.name === 'TimeoutError' || msg.includes('timeout')) {
        message = 'Request timed out after 60 seconds.'
      } else {
        message = `Test request failed: ${msg}`
      }
      return res.json({ success: false, message })
    }
```

- [ ] **Step 8: TypeScript-check the server file**

```bash
npx tsc --noEmit --esModuleInterop --module NodeNext --moduleResolution NodeNext --target ES2022 admin-editor/server.ts 2>&1 | head -30
```

Expected: no errors (or only warnings about lib differences, which are benign).

If that command fails due to project config, run:
```bash
npm run test
```

This exercises imports transitively and will catch obvious type errors via tsx.

- [ ] **Step 9: Commit**

```bash
git add admin-editor/server.ts
git commit -m "feat: add corporate CA trust and TLS diagnostics to ACE

- setupCorporateCATrust() merges OS system trust store (macOS Keychain)
  and optional certs/corp-ca.pem into Node's TLS default CA set at startup
- All 4 fetch() catch blocks now use isTlsError() to detect and explain
  TLS trust failures with actionable fix instructions"
```

---

## Task 5: Cert infrastructure and TLS guide

**Files:**
- Create: `admin-editor/certs/corp-ca.pem.example`
- Modify: `.gitignore`
- Create: `docs/guides/ace-tls.md`

- [ ] **Step 1: Create `admin-editor/certs/corp-ca.pem.example`**

Create directory `admin-editor/certs/` and file `admin-editor/certs/corp-ca.pem.example`:

```
# ACE Corporate CA Certificate — Example Placeholder
#
# If your internal HTTPS endpoints (Internal API) use a corporate or
# self-signed certificate authority, ACE (running in Node.js) will fail
# with a TLS error because Node does not use the macOS system trust store
# by default.
#
# HOW TO USE:
# 1. Obtain your corporate CA certificate in PEM format from your IT/security team,
#    or export it from macOS Keychain (see docs/guides/ace-tls.md for instructions).
# 2. Save it as:   admin-editor/certs/corp-ca.pem
# 3. Restart ACE:  npm run admin
#
# ACE automatically loads corp-ca.pem at startup if it exists.
# This file (corp-ca.pem.example) is committed as documentation.
# corp-ca.pem is gitignored and must never be committed.
#
# ALTERNATIVE: Set NODE_EXTRA_CA_CERTS=/path/to/corp-ca.pem before
# launching the Node process (works for CI or env-var-based config).
#
# ---- Your PEM cert goes here (replace this comment block) ----
# -----BEGIN CERTIFICATE-----
# MIIBxxx...
# -----END CERTIFICATE-----
```

- [ ] **Step 2: Add `.gitignore` entry**

In `.gitignore`, add this block (near the end, or in a section for local/generated files):
```
# ACE corporate CA certificate — must not be committed
admin-editor/certs/*.pem
```

- [ ] **Step 3: Create `docs/guides/ace-tls.md`**

```markdown
# ACE TLS Trust for Corporate / Internal Endpoints

## Why ACE Fails with Corporate HTTPS Endpoints

When you test an Internal API connection from the ACE admin editor, the request is
made by Node.js (not the browser). Node.js maintains its own CA bundle (Mozilla-derived)
and **does not** read from macOS Keychain or the OS system trust store.

The browser and the Figma plugin sandbox both use the macOS system trust store, so
a corporate CA installed in Keychain is trusted there — but not in Node by default.

This causes ACE test connections to fail with errors like:
- `SELF_SIGNED_CERT_IN_CHAIN`
- `UNABLE_TO_VERIFY_LEAF_SIGNATURE`
- `unable to get local issuer certificate`

## Automatic System Store Merge (macOS)

ACE (Node 22.12+) automatically merges the macOS system trust store into Node's TLS
default CA set at startup via `tls.getCACertificates('system')`.

If your corporate CA is installed in the macOS system Keychain (done by IT via MDM,
or manually), ACE will trust it automatically after a restart — **no extra setup needed**.

## Manual CA Certificate File

If the automatic system store merge does not cover your CA (e.g., on Linux, in CI, or
when the cert is not in Keychain), you can provide it manually:

**Step 1 — Obtain the corporate CA certificate in PEM format**

Option A — export from macOS Keychain:
1. Open Keychain Access.app
2. Find the root CA certificate your IT team installed.
3. File → Export Items → choose PEM format.
4. Save the file.

Option B — get the cert from your security/IT team directly.

Option C — extract from an existing connection using OpenSSL:
```bash
openssl s_client -connect your-internal-endpoint.corp:443 -showcerts 2>/dev/null \
  | openssl x509 -outform PEM > corp-ca.pem
```

**Step 2 — Place the cert**

```bash
cp /path/to/your-ca.pem figmai_plugin/admin-editor/certs/corp-ca.pem
```

**Step 3 — Restart ACE**

```bash
npm run admin
```

ACE will print:
```
[ACE] Additional CA cert loaded from admin-editor/certs/corp-ca.pem
```

**Step 4 — Re-run the test connection** in the ACE AI page.

## CI / Environment Variable Alternative

Set `NODE_EXTRA_CA_CERTS` to the cert file path **before** launching the Node process:

```bash
NODE_EXTRA_CA_CERTS=/path/to/corp-ca.pem npm run admin
```

This is handled by Node natively and takes effect at process launch.

## Security Note

Never disable TLS verification (`NODE_TLS_REJECT_UNAUTHORIZED=0`). This removes all
certificate validation and is not an acceptable solution in a corporate environment.
The correct fix is always to add your CA to the trust chain.
```

- [ ] **Step 4: Verify no *.pem files are staged accidentally**

```bash
git status admin-editor/certs/
```

Expected: only `corp-ca.pem.example` shown as untracked/new; no `corp-ca.pem`.

- [ ] **Step 5: Run full test suite one final time**

```bash
npm run test
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
git add admin-editor/certs/corp-ca.pem.example .gitignore docs/guides/ace-tls.md
git commit -m "docs: add ACE TLS trust setup — cert convention, gitignore, guide

Establishes admin-editor/certs/corp-ca.pem convention for manual CA cert
placement. Documents system Keychain auto-merge, manual file method, and
NODE_EXTRA_CA_CERTS alternative. Never uses NODE_TLS_REJECT_UNAUTHORIZED."
```

---

## Self-Review Checklist

**Spec coverage:**
- [x] Remove `llm.provider: "proxy"` from baseline config — Task 1
- [x] Regenerate generated overlay — Task 1
- [x] SettingsModal: disable connection type selector when config-locked — Task 2
- [x] SettingsModal: "Locked by config" label — Task 2 (both rendering paths)
- [x] SettingsModal: endpoint editable only when provider locked but endpoint absent in config — Task 2 Step 5 (`isEndpointLocked = lockedProvider === 'internal-api' && !!customEndpoint`)
- [x] isTlsError inspects err.code, err.message, err.cause.code, err.cause.message — Task 3
- [x] TLS detection applied to all 4 fetch catch blocks — Task 4 Steps 4–7
- [x] setupCorporateCATrust() merges system store + convention file — Task 4 Steps 2–3
- [x] No NODE_TLS_REJECT_UNAUTHORIZED anywhere — confirmed absent
- [x] Actionable TLS error message with corp-ca.pem and docs reference — Task 4
- [x] admin-editor/certs/corp-ca.pem.example — Task 5
- [x] .gitignore *.pem entry — Task 5
- [x] docs/guides/ace-tls.md — Task 5
- [x] proxy support preserved — no changes to proxy path logic

**No placeholders:** All code blocks are complete. No TBD/TODO.

**Type consistency:** `isTlsError` exported from `tls-errors.ts` matches import in `server.ts` and test file. `setupCorporateCATrust` uses `path`, `fs`, `tls` — all imported in server.ts. `isProviderLocked`/`isEndpointLocked` booleans are used consistently in all three locations in SettingsModal.
