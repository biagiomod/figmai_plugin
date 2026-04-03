# FigmAI Plugin — Security Audit & Local Setup

## Config layering model

```
custom/config.json          ← committed baseline (clean: no domains, no creds)
custom/config.local.json    ← gitignored personal/dev overrides (domains for manifest)
S3 snapshot (private builds) ← overwrites config.json before build; internal endpoints only
```

- `config.json` is always committed with empty `networkAccess`, empty proxy `baseUrl` and `sharedToken`.
- `config.local.json` (gitignored) carries your local dev domains so they are never committed.
- Private builds (`BUILD_ENV=private`) always ignore `config.local.json`, making them deterministic.
- `manifest.json` is **gitignored** and regenerated on every build from config + package.json.

---

## Local development setup (personal machine)

### One-time setup

```sh
# 1. Copy the example local config
cp custom/config.local.example.json custom/config.local.json

# 2. Edit config.local.json if your ngrok URL has changed — the example has the current value.
#    The file carries ONLY networkAccess domains for manifest generation.

# 3. Build — this regenerates manifest.json with your local domains
npm run build

# 4. Proxy URL and token: configure once via the plugin Settings UI.
#    Open the plugin in Figma → Settings → enter your proxy URL and token.
#    These are saved to Figma clientStorage and persist between sessions.
#    Do NOT put the proxy URL or token in config.local.json.

# 5. Untrack manifest.json if it is still in git (one-time, only needed once):
git rm --cached manifest.json
git commit -m "chore: gitignore generated manifest.json"
```

### Daily local dev workflow

```sh
# Normal build (uses config.json + config.local.json, generates manifest.json):
npm run build

# Watch mode (rebuilds on file changes):
npm run watch
```

After build, load the plugin in Figma by pointing to the generated `manifest.json`.

### Updating your ngrok URL

Edit `custom/config.local.json` → change the ngrok URL in `networkAccess.extraAllowedDomains` → run `npm run build`.

---

## Private/enterprise build

```sh
# Full private build: S3 sync → build (with private-mode env) → postbuild audit
S3_BUCKET=your-bucket S3_REGION=us-east-1 npm run build:private
```

This expands to: `npm run sync-config && BUILD_ENV=private npm run build`

`BUILD_ENV=private` prefixes the entire `npm run build` call, so the env var is inherited by
**every npm lifecycle step** — prebuild, build, and postbuild:

| Step | What runs | Effect of BUILD_ENV=private |
|---|---|---|
| `sync-config` | Pulls S3 config → overwrites `config.json` | N/A (runs before BUILD_ENV is set) |
| `prebuild` | `generate-custom-overlay.ts` etc. | Reads private `config.json`; no local config merged |
| `build` | `build-figma-plugin` | Compiles with private config in bundle |
| `postbuild` → `update-manifest-network-access.ts` | Writes `manifest.json` domains | `IS_PRIVATE_MODE=true` → ignores `config.local.json` |
| `postbuild` → `npm run invariants` | `assert-invariants.ts` | `BUILD_ENV=private` inherited → check #7 runs automatically |

`config.local.json` is automatically ignored throughout this flow.
The private-mode audit (check #7) runs inside `postbuild` — **no separate audit step is needed**.

> **Backward-compatible alias:** `npm run build:work` is equivalent to `npm run build:private`.

---

## Recurring security audit (daily/weekly, no build required)

```sh
# Audit the current build's manifest.json and config.json for private-mode compliance:
npm run audit:private
```

`audit:private` is defined as `BUILD_ENV=private tsx scripts/assert-invariants.ts` — no additional prefix needed.
`npm run audit:work` is a backward-compatible alias for the same command.

Exit 0 = clean. Exit 1 = specific failure with field name. Warnings printed for non-blocking issues (e.g. public display links).

---

## What the private-mode audit checks (`assert-invariants.ts` check #7)

Activated by `BUILD_ENV=private` (or `BUILD_ENV=work` for backward compatibility). Scans manifest `allowedDomains`, `config.llm.endpoint`,
`config.llm.proxy.baseUrl`, `config.networkAccess`, and `config.analytics.endpointUrl`.

| Blocked pattern | Reason |
|---|---|
| `openai.com` | Public LLM service |
| `ngrok-*` / `*ngrok*` | Public tunnel service |
| `localhost` / `127.*` / `0.0.0.0` / `::1` | Loopback address |

Additional requirements for private builds:
- `config.llm.provider` must be `"internal-api"`
- `config.llm.endpoint` must be non-empty

---

## How manifest.json domains are computed at build time

```
custom/config.json                → networkAccess.baseAllowedDomains
custom/config.local.json          → networkAccess.baseAllowedDomains  (non-private only)
  +
custom/config.json                → networkAccess.extraAllowedDomains
custom/config.local.json          → networkAccess.extraAllowedDomains (non-private only)
  +
custom/config.json analytics      → endpointUrl origin (if analytics.enabled)
  =
combined unique origins → manifest.networkAccess.allowedDomains

Fallback: if combined list is empty AND BUILD_ENV != 'private' (or 'work')
  → PUBLIC_DEFAULT_ALLOWED_DOMAINS (openai.com, localhost:8787, ngrok)
  This only fires for a fresh checkout with no config.local.json and empty config.json.
  The manifest.json from that fallback is local-only (gitignored).
```

---

## Private config template for S3

`custom/config.private.example.json` is the reference template for the config that should
live in S3. Required minimum for a clean private build:

```json
{
  "llm": {
    "provider": "internal-api",
    "endpoint": "https://your-internal-llm.example.com/api"
  },
  "networkAccess": {
    "baseAllowedDomains": ["https://your-internal-llm.example.com"],
    "extraAllowedDomains": []
  }
}
```

---

## Audit risk checklist

Before deploying to private environment:

- [ ] `manifest.json` `networkAccess.allowedDomains` — no openai/ngrok/localhost
- [ ] `custom/config.json` `llm.provider` — must be `"internal-api"`
- [ ] `custom/config.json` `llm.endpoint` — must be non-empty internal URL
- [ ] `custom/config.json` `llm.proxy.baseUrl` — must be empty
- [ ] `custom/config.json` `llm.proxy.sharedToken` — must be empty
- [ ] `custom/config.json` `networkAccess` arrays — must contain only internal domains
- [ ] `custom/config.json` `analytics.enabled` — false unless internal endpoint configured
- [ ] `custom/config.json` `resources.links.about.url` — point to internal page, not figma.com/community (⚠ `audit:private` warns automatically if figma.com/community is detected)
- [ ] `src/custom/generated/customConfig.ts` — regenerated from private config (not stale dev defaults)
- [ ] `npm run audit:private` — exits 0

---

## File summary

| File | Status | Purpose |
|---|---|---|
| `custom/config.json` | **committed** | Baseline defaults — always clean (no domains, no creds) |
| `custom/config.local.json` | **gitignored** | Personal dev domains for manifest (copy from .example) |
| `custom/config.local.example.json` | **committed** | Template for local setup |
| `custom/config.private.example.json` | **committed** | Template for private S3 config |
| `manifest.json` | **gitignored** | Generated at build time — never committed |
| `src/custom/generated/customConfig.ts` | **committed** | Generated from config.json at prebuild |
