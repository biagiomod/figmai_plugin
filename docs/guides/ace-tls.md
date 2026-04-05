# ACE TLS Configuration

ACE (Admin Config Editor) runs as a local Node.js process. When you test connections to corporate or internal HTTPS endpoints, Node.js makes the outbound request — not the browser. This matters because Node.js maintains its own CA bundle and does not read from macOS Keychain or the system trust store.

If your endpoint uses a certificate signed by a corporate or private CA, the connection test will fail with a TLS error even though the same URL works in Safari, Chrome, or the Figma plugin.

---

## How ACE loads CA certificates

ACE uses a startup wrapper (`admin-editor/start.ts`) that checks for a CA cert file before launching the server:

1. If `admin-editor/certs/corp-ca.pem` exists, the wrapper sets `NODE_EXTRA_CA_CERTS` to that path in the child process environment.
2. It then launches `tsx server.ts` as a child process with that environment variable pre-set.
3. Node reads `NODE_EXTRA_CA_CERTS` at startup and merges it into the trusted CA bundle.

This means ACE trusts your corporate CA for all outbound `fetch()` calls — including the test connection endpoints.

---

## Setting up your corporate CA cert

### Step 1: Export your corporate CA certificate

**From macOS Keychain:**
1. Open Keychain Access (`Applications > Utilities > Keychain Access`)
2. Select **System** or **System Roots** keychain
3. Find your corporate root CA (look for certificates issued by your IT/security team)
4. Right-click → **Export** → choose **Privacy Enhanced Mail (.pem)** format
5. Save the file

**From your IT team:**
Ask your IT or security team for the corporate root CA certificate in PEM format.

**Using openssl (if you have the cert in another format):**
```bash
# Convert DER to PEM
openssl x509 -inform der -in corp-ca.der -out corp-ca.pem

# Extract from a PKCS12 bundle
openssl pkcs12 -in bundle.p12 -nokeys -cacerts -out corp-ca.pem
```

**From your browser:**
1. Navigate to an internal HTTPS URL in Chrome
2. Click the lock icon → Certificate → Details → Export

### Step 2: Place the cert file

Copy your exported certificate to:
```
admin-editor/certs/corp-ca.pem
```

A template is available at `admin-editor/certs/corp-ca.pem.example`.

The file is `.gitignored` — it will never be committed.

Multiple certificates: you may concatenate multiple PEM blocks in a single file if needed.

### Step 3: Restart ACE

```bash
npm run admin
```

The startup log will confirm the cert was loaded:
```
[ACE] Corporate CA cert found at .../admin-editor/certs/corp-ca.pem — setting NODE_EXTRA_CA_CERTS
```

### Step 4: Verify

Run the test connection in the ACE AI page. It should now succeed against your corporate endpoint.

---

## Alternative: `NODE_EXTRA_CA_CERTS` environment variable

If you prefer not to use the cert file convention, you can set the environment variable yourself before starting ACE:

```bash
NODE_EXTRA_CA_CERTS=/path/to/your/corp-ca.pem npm run admin
```

Or in a shell profile:
```bash
export NODE_EXTRA_CA_CERTS=/path/to/your/corp-ca.pem
```

This works because `NODE_EXTRA_CA_CERTS` is already set in the environment when the process starts — the same effect as the spawn wrapper, but managed externally.

---

## Troubleshooting

**"TLS certificate verification failed" error:**
- Your cert file may not contain the full chain. Export the root CA, not just an intermediate.
- Try concatenating the intermediate and root CA certs in the same file.
- Verify the cert is in PEM format (starts with `-----BEGIN CERTIFICATE-----`).

**Cert file placed but error persists:**
- Make sure you restarted ACE after placing the cert.
- Check the startup log for the `[ACE] Corporate CA cert found` message. If absent, the file path may be wrong.
- If `NODE_EXTRA_CA_CERTS` is already set in your environment to a different path, it may override the wrapper's value.

**No cert needed but still failing:**
- Check for `ECONNREFUSED` (service not running) or `ENOTFOUND` (DNS issue) in the error message — these are not TLS errors.
- The error message from ACE will distinguish TLS failures from connection failures.
