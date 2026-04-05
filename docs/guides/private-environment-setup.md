# Private Environment Setup Guide

This guide walks through getting the Figma plugin and ACE (Admin Config Editor) running in a private or corporate environment where:
- LLM calls go to an internal corporate API endpoint (not a public proxy)
- The endpoint uses a certificate signed by a corporate or private CA

Work through all parts in order.

---

## Prerequisites

- Node.js 22 or later
- Figma Desktop app (not browser — required for loading development plugins)
- Your internal API endpoint URL (e.g. `https://api.internal.corp/llm`)
- Your corporate CA certificate in PEM format (see Part 3 for how to export it)

---

## Part 1 — Install and configure

### Step 1: Install dependencies

```bash
cd figmai_plugin
npm install
```

### Step 2: Add your internal API domain to the Figma network allow-list

Open `custom/config.json` and find the `networkAccess` block. Add your internal API hostname to `extraAllowedDomains`:

```json
"networkAccess": {
  "baseAllowedDomains": [],
  "extraAllowedDomains": ["api.internal.corp"]
}
```

Use only the hostname — no protocol (`https://`) and no path. This is required: Figma blocks all outbound `fetch()` calls to domains not listed in the plugin manifest. The build step reads this config and writes the domain into `manifest.json` automatically.

### Step 3: (Optional) Lock the provider to Internal API

If this build should always use the internal API (users should not be able to switch to a proxy), add `"provider": "internal-api"` and your endpoint URL to the `llm` block in `custom/config.json`:

```json
"llm": {
  "provider": "internal-api",
  "endpoint": "https://api.internal.corp/llm",
  ...
}
```

If you leave `provider` absent, users can configure the endpoint themselves via plugin Settings after loading. Both approaches work — this is a matter of whether the endpoint should be locked by config or left user-controlled.

---

## Part 2 — Build and load the plugin

### Step 4: Build

```bash
npm run build
```

This generates `manifest.json` (with the network allow-list applied) and the plugin bundle.

### Step 5: Load in Figma Desktop

1. Open Figma Desktop
2. Go to **Plugins → Development → Import plugin from manifest…**
3. Select `figmai_plugin/manifest.json`

The plugin will appear under **Plugins → Development** in the menu.

---

## Part 3 — Corporate CA certificate for ACE

ACE (Admin Config Editor) is a local Node.js server. When it makes outbound `fetch()` calls — such as the test connection — Node.js uses its own CA bundle and does **not** read from macOS Keychain. This means connections to endpoints with corporate or private CA certificates fail, even though the same URL works in a browser.

The fix: place your corporate CA certificate at `admin-editor/certs/corp-ca.pem`. The ACE startup wrapper detects this file and sets `NODE_EXTRA_CA_CERTS` before launching the server.

Skip this part if your internal API endpoint uses a publicly-trusted certificate (e.g. Let's Encrypt, DigiCert).

### Step 6: Export your corporate CA certificate

**From macOS Keychain:**
1. Open **Keychain Access** (`/Applications/Utilities/Keychain Access.app`)
2. Select the **System** or **System Roots** keychain in the left panel
3. Find your corporate root CA — look for a certificate issued by your IT or security team
4. Right-click → **Export** → choose format **Privacy Enhanced Mail (.pem)**
5. Save the file somewhere accessible

**From your IT team:**
Ask for the corporate root CA certificate in PEM format. This is standard and they should be able to provide it directly.

**Using openssl (if you have the cert in another format):**
```bash
# Convert DER format to PEM
openssl x509 -inform der -in corp-ca.der -out corp-ca.pem

# Extract CA cert from a PKCS12 bundle
openssl pkcs12 -in bundle.p12 -nokeys -cacerts -out corp-ca.pem
```

### Step 7: Place the certificate

```bash
cp /path/to/your/exported/corp-ca.pem figmai_plugin/admin-editor/certs/corp-ca.pem
```

A template showing the expected format is at `admin-editor/certs/corp-ca.pem.example`.

The file `admin-editor/certs/corp-ca.pem` is `.gitignored` — it will never be committed. Each environment places its own cert.

Multiple certificates: if you need to trust more than one CA, you can concatenate multiple PEM blocks in a single file.

---

## Part 4 — Start ACE and verify

### Step 8: Start ACE

```bash
npm run admin
```

If the certificate was placed correctly, the startup log will show:

```
[ACE] Corporate CA cert found at .../admin-editor/certs/corp-ca.pem — setting NODE_EXTRA_CA_CERTS
Admin Config Editor server at http://0.0.0.0:3333
```

If you see `[ACE] Tip: for corporate/internal HTTPS endpoints...` instead, the cert file was not found — check the path from Step 7.

### Step 9: Test the connection in ACE

1. Open `http://localhost:3333` in a browser
2. Go to the **AI** page
3. Click **Test Connection**

It should return a success response from your internal API endpoint. If it returns a TLS error, see the troubleshooting section at the bottom of this guide, or read `docs/guides/ace-tls.md` for detailed TLS diagnostics.

---

## Part 5 — Configure the plugin

### Step 10: Open the plugin in Figma

Run it from **Plugins → Development → (your plugin name)**.

### Step 11: Configure the endpoint in Settings

1. Open **Settings** in the plugin
2. Select the **Internal API** tab
3. Enter your endpoint URL (e.g. `https://api.internal.corp/llm`)
4. Click **Test** — this runs in the browser/Figma sandbox which trusts the corporate CA via macOS Keychain, so it should succeed without any cert setup on the plugin side
5. Click **Save**

The endpoint is saved to Figma clientStorage and persists across sessions.

> If Step 3 above locked the provider to `"internal-api"` in `custom/config.json`, the Settings tab will show **Locked by config** and the connection type selector will be disabled. This is expected — the endpoint field is still editable if the endpoint was not also locked in config.

---

## Quick reference

| What | Why it matters |
|---|---|
| `extraAllowedDomains` in `config.json` | Figma blocks all outbound fetch to domains not in the manifest — build won't work without this |
| Corp CA cert at `admin-editor/certs/corp-ca.pem` | Node.js (ACE) does not use macOS Keychain — TLS fails without this |
| `npm run admin` (not direct `node server.ts`) | The `start.ts` wrapper is what sets `NODE_EXTRA_CA_CERTS` before spawning the server — running server.ts directly bypasses it |
| Plugin Settings → Internal API | Saves the endpoint to Figma clientStorage — persists across sessions |

---

## Troubleshooting

**ACE test connection returns "TLS certificate verification failed"**
- Make sure the cert file is at exactly `admin-editor/certs/corp-ca.pem` (not a subdirectory)
- Restart ACE after placing the cert — the env var is read at process launch, not dynamically
- Check the startup log for the `Corporate CA cert found` line; if absent, the file was not found
- Make sure the file contains a PEM-format certificate (starts with `-----BEGIN CERTIFICATE-----`)
- If you need to trust multiple CAs, concatenate all PEM blocks into the single file

**ACE test connection returns "ECONNREFUSED" or "ENOTFOUND"**
- This is a network error, not a TLS error — the cert is not the issue
- Check the endpoint URL is correct and the service is reachable from this machine

**Plugin fetch is blocked (no response, or network error in plugin console)**
- Check that `extraAllowedDomains` in `config.json` includes the hostname of your endpoint
- Rebuild (`npm run build`) after changing `config.json` — the allow-list is baked into `manifest.json` at build time
- Reload the plugin in Figma after rebuilding

**Plugin Settings shows "Locked by config" unexpectedly**
- `custom/config.json` has `"provider": "internal-api"` or `"provider": "proxy"` set in the `llm` block
- This is intentional if the build is meant to lock provider selection
- To make it user-controlled, remove the `"provider"` key from the `llm` block and rebuild

**Build fails**
- Run `npm run invariants` to check for config validation errors
- Check that `custom/config.json` is valid JSON

For more detail on ACE TLS configuration, see `docs/guides/ace-tls.md`.
