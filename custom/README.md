# Custom Overlay System

This directory allows custom or enterprise environments to overlay configuration and knowledge bases onto the public plugin codebase.

## Overview

The custom overlay system enables:
- **Custom configuration**: Hide UI elements, configure LLM endpoints
- **Custom knowledge bases**: Append or override assistant knowledge bases per assistant

All custom content is bundled at build time via the prebuild script (`scripts/generate-custom-overlay.ts`).

## Directory Structure

```
/custom/
  ├── README.md                    # This file
  ├── config.json                  # Configuration (edit directly)
  ├── config.example.json          # Example configuration (reference)
  └── knowledge/
      ├── README.md                # Knowledge base documentation
      ├── *.md                     # Knowledge base files (edit directly)
      └── *.example.md             # Example knowledge base files (reference)
```

## Setup for Custom or Enterprise Environments

**Important:** The public repo ships placeholder files (`config.json` and `knowledge/*.md`) with safe defaults. Custom deployments should edit these files directly and commit them to their own repo.

1. **Edit `custom/config.json` directly:**
   - Set `ui.defaultMode` to your preferred default mode (`'simple'`, `'advanced'`, or `'content-mvp'`)
   - Set `ui.hideContentMvpMode` to `true` to hide Content-MVP mode
   - Set `llm.endpoint` to your internal LLM endpoint URL (⚠️ **Do not put secrets here** - use environment variables or secure storage)
   - Set `llm.hideModelSettings` to `true` to hide model settings UI (takes precedence)
   - Set `llm.uiMode` to `'connection-only'` to show only connection + test button (requires `llm.endpoint`)
   - Configure `resources.links.*` and `resources.credits.*` arrays for dynamic UI rendering
   - Configure knowledge base policies per assistant

2. **Edit knowledge base files:**
   - Edit the placeholder `.md` files in `custom/knowledge/` (e.g., `general.md`, `design_critique.md`)
   - Add your organization-specific content
   - Configure policies in `config.json` to append or override public knowledge bases

3. **Commit your changes:**
   - Commit `config.json` and edited knowledge base files to your repo
   - These files are tracked in git (not ignored)

4. **Rebuild:**
   ```bash
   npm run build
   ```

## Configuration Schema

See `config.example.json` for the full schema. Key fields:

### UI Settings

- `ui.defaultMode` (`'content-mvp' | 'simple' | 'advanced'`): Default mode when no localStorage preference exists. Falls back to `CONFIG.defaultMode` if not specified.
- `ui.hideContentMvpMode` (boolean): Hide Content-MVP mode button in Settings

### LLM Settings

- `llm.endpoint` (string): Internal LLM endpoint URL (⚠️ **Do not put secrets here**)
- `llm.hideModelSettings` (boolean): Hide LLM Model Settings section when endpoint is provided (takes precedence over `uiMode`)
- `llm.uiMode` (`'full' | 'connection-only'`): Controls LLM settings visibility:
  - `'full'` (default): Show full LLM Model Settings section
  - `'connection-only'`: Show only "LLM Connection" header + "Test Connection" button (requires `llm.endpoint` to be set)

### Knowledge Bases

- `knowledgeBases.{assistantId}` (object): Per-assistant knowledge base policy
  - `policy`: `"append"` (adds to public) or `"override"` (replaces public)
  - `file`: Relative path from `/custom/` (e.g., `"knowledge/general.md"`)

### Resources & Credits

- `resources.links.about` (object, optional): About link
  - `label` (string): Button label
  - `url` (string): Link URL (button only renders if URL is non-empty)
- `resources.links.feedback` (object, optional): Feedback link
  - `label` (string): Button label
  - `url` (string): Link URL (button only renders if URL is non-empty)
- `resources.links.meetup` (object, optional): Meetup link
  - `label` (string): Button label
  - `url` (string): Link URL (button only renders if URL is non-empty)
- `resources.credits.createdBy` (array, optional): Array of credit entries for "Created by" section
  - Each entry: `{ label: string, url?: string }`
  - If `url` is provided, renders as clickable link; otherwise plain text
- `resources.credits.apiTeam` (array, optional): Array of credit entries for "API Team" section
  - Each entry: `{ label: string, url?: string }`
- `resources.credits.llmInstruct` (array, optional): Array of credit entries for "LLM Instruct" section
  - Each entry: `{ label: string, url?: string }`

**Note:** Empty arrays or missing fields result in empty sections (no crashes). Links/buttons only render if URLs are provided and non-empty.

### Design System Registry

- `designSystems.enabled` (boolean): Master enable/disable for design system registry (default: `false`)
- `designSystems.activeRegistries` (array, optional): Array of registry IDs to activate (e.g., `["custom"]`)
- `designSystems.allowlist` (array, optional): Only these registry IDs can load (most restrictive)
- `designSystems.denylist` (array, optional): These registry IDs cannot load
- `designSystems.strictMode` (boolean): If `true`, registry load failures disable entire system (default: `false`)

**Custom-only configuration:**
To ensure only custom registries load (prevent example DS activation):
```json
{
  "designSystems": {
    "enabled": true,
    "activeRegistries": ["custom"],
    "allowlist": ["custom"],
    "strictMode": true
  }
}
```

**See:** `design-systems/README.md` for detailed documentation on creating and managing design system registries.

### Network Access (Figma allowedDomains)

Network allowlists are configured via `custom/config.json`. The committed baseline ships with **empty arrays** (clean, no public domains):

```jsonc
{
  "networkAccess": {
    "baseAllowedDomains": [],
    "extraAllowedDomains": []
  }
}
```

- `baseAllowedDomains` (string[]): Baseline domains merged first. For enterprise/private builds, set your internal LLM endpoint origin here (e.g. `"https://your-internal-llm.example.com"`).
- `extraAllowedDomains` (string[]): Additional domains merged second. Typically used for development tunnels (ngrok, localhost). **For personal local dev, put these in `custom/config.local.json` (gitignored) rather than in `config.json` so they are never committed.**

At build time, `scripts/update-manifest-network-access.ts` merges domains from `config.json` and (in non-private builds) `config.local.json`, deduplicates, and writes the result to `manifest.json.networkAccess.allowedDomains`. Figma enforces this allowlist at runtime.

**Three-tier model:**
- `custom/config.json` — committed baseline: always clean (empty `networkAccess` arrays, no credentials)
- `custom/config.local.json` — gitignored personal dev overrides: put your OpenAI/localhost/ngrok domains here; copy from `config.local.example.json`
- S3 snapshot (private builds) — overwrites `config.json` before build with your internal endpoints

See `docs/security-audit.md` for full local setup and private-build instructions.

#### Build vs Watch
- `npm run build`: Generates the overlay, builds the plugin, then patches `manifest.json` with the merged, validated domains.
- `npm run watch`: Runs the manifest patcher in `--watch` mode (alongside `build-figma-plugin --watch`) so if `manifest.json` is regenerated during watch, the allowlist is re-applied automatically.

#### Which manifest is patched?
- The patcher targets the root `manifest.json` (and `build/manifest.json` if it exists). Figma loads `manifest.json` from the plugin root; keeping it patched ensures the allowlist matches `custom/config.json`.

**Important:**
- Each entry must be a pure origin (`scheme://host[:port]`) with no path, query, or fragment, e.g.:
  - `"https://api.example.com"`
  - `"http://localhost:8787"`
- Do not include secrets here (no API keys or tokens) – only domains/endpoints.
- Custom deployments are expected to **replace** the public defaults in `networkAccess` with their own endpoints and dev domains as needed.

## Knowledge Base Policies

### Append Policy
Custom content is appended to the public knowledge base with a separator (`---`).

**Use case:** Add custom-specific guidelines or examples to existing public knowledge.

### Override Policy
Custom content completely replaces the public knowledge base.

**Use case:** Replace public knowledge with entirely custom content for a specific assistant.

## Update Procedure

When updating the plugin:

1. **Backup your custom files:**
   ```bash
   cp -r custom custom_backup
   ```

2. **Extract new public code** (may overwrite placeholder files)

3. **Restore your customizations:**
   - Restore your edited `config.json` from backup
   - Restore your edited knowledge base files from backup
   - Review any schema changes in the new placeholder files

4. **Rebuild:**
   ```bash
   npm install
   npm run build
   ```

## File Tracking Strategy

- **Public repo:** Ships placeholder files (`config.json` with empty/default values, `knowledge/*.md` with placeholder content)
- **Custom repo:** Edit the placeholder files directly and commit them with your custom content
- **Most files are tracked.** Exception: `custom/config.local.json` is **gitignored** by design — it holds personal/dev domain overrides and must never be committed. Copy it from `config.local.example.json` as a one-time local setup step.
- **Security:** ⚠️ **Do not commit secrets** (API keys, tokens) in `config.json`. Use environment variables or secure storage instead.

## Troubleshooting

**Build fails with "custom/config.json not found":**
- This should not happen - the generator handles missing files gracefully
- Check that `scripts/generate-custom-overlay.ts` is running in prebuild

**Custom knowledge not appearing:**
- Verify the assistant ID matches the filename (e.g., `general.md` for `general` assistant)
- Check that the policy is configured correctly in `config.json`
- Ensure the file path in config matches the actual file location

**Settings UI not updating:**
- Verify `config.json` is valid JSON
- Check that `hideContentMvpMode` or `hideModelSettings` are set to `true`
- Rebuild the plugin after changing config
