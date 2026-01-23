# Custom Overlay System

This directory allows corporate environments to overlay custom configuration and knowledge bases onto the public plugin codebase.

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

## Setup for Corporate Environments

**Important:** The public repo ships placeholder files (`config.json` and `knowledge/*.md`) with safe defaults. Corporate users should edit these files directly and commit them to their corporate repo.

1. **Edit `custom/config.json` directly:**
   - Set `ui.hideContentMvpMode` to `true` to hide Content-MVP mode
   - Set `llm.endpoint` to your internal LLM endpoint URL (⚠️ **Do not put secrets here** - use environment variables or secure storage)
   - Set `llm.hideModelSettings` to `true` to hide model settings UI
   - Configure knowledge base policies per assistant

2. **Edit knowledge base files:**
   - Edit the placeholder `.md` files in `custom/knowledge/` (e.g., `general.md`, `design_critique.md`)
   - Add your organization-specific content
   - Configure policies in `config.json` to append or override public knowledge bases

3. **Commit your changes:**
   - Commit `config.json` and edited knowledge base files to your corporate repo
   - These files are tracked in git (not ignored)

4. **Rebuild:**
   ```bash
   npm run build
   ```

## Configuration Schema

See `config.example.json` for the full schema. Key fields:

- `ui.hideContentMvpMode` (boolean): Hide Content-MVP mode button in Settings
- `llm.endpoint` (string): Internal LLM endpoint URL
- `llm.hideModelSettings` (boolean): Hide LLM Model Settings section when endpoint is provided
- `knowledgeBases.{assistantId}` (object): Per-assistant knowledge base policy
  - `policy`: `"append"` (adds to public) or `"override"` (replaces public)
  - `file`: Relative path from `/custom/` (e.g., `"knowledge/general.md"`)

### Network Access (Figma allowedDomains)

Network allowlists are also configured via `custom/config.json`:

```jsonc
{
  "networkAccess": {
    "baseAllowedDomains": [
      "https://api.openai.com"
    ],
    "extraAllowedDomains": [
      "http://localhost:8787",
      "https://overobedient-buddy-leathern.ngrok-free.dev"
    ]
  }
}
```

- `baseAllowedDomains` (string[]): Baseline domains that are acceptable in all builds (public-safe). In the public repo, this defaults to `["https://api.openai.com"]` so the plugin works out of the box.
- `extraAllowedDomains` (string[]): Additional domains used only in corporate or development builds (for example, ngrok tunnels or localhost proxies). In the public repo, this defaults to `["http://localhost:8787", "https://overobedient-buddy-leathern.ngrok-free.dev"]` for local and tunnel-based development.

At build time, the script `scripts/update-manifest-network-access.ts` merges these arrays and updates `manifest.json.networkAccess.allowedDomains`. Figma then enforces this allowlist at runtime.

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
- Corporate repos are expected to **replace** the public defaults in `networkAccess` with their own internal endpoints and dev domains as needed.

## Knowledge Base Policies

### Append Policy
Custom content is appended to the public knowledge base with a separator (`---`).

**Use case:** Add corporate-specific guidelines or examples to existing public knowledge.

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
- **Corporate repo:** Edit the placeholder files directly and commit them with your custom content
- **No gitignore needed:** All files are tracked - edit and commit as needed
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
