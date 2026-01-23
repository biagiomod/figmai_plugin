# Open Source Architecture & Corporate Review Guide

**Audience:** Corporate security, privacy, and legal reviewers evaluating the FigmAI plugin.

This document describes the open-source FigmAI plugin architecture, its network access patterns, and how custom deployments can configure endpoints and knowledge bases while maintaining separation from the public codebase.

---

## 1. High-Level Overview

- **What this repo is:**  
  A public, generic Figma plugin that adds AI assistants to the Figma editor. The public repository includes default configuration suitable for open-source use.

- **What custom deployments do:**  
  Organizations download or vendor this repository as a read-only upstream source. All modifications, including configuration of endpoints and knowledge bases under `custom/`, occur in separate private repositories. The plugin has no functionality to push code, configuration, or data back to the public repository or any external source.

- **Architecture principle:**  
  Core plugin logic is open source and stable. Custom-specific behavior (endpoints, knowledge, policies) is isolated to a clearly defined overlay system that remains separate from the public source tree.

- **Release tags:**  
  The public repository may include git tags (e.g., `v1.0.2`) that point to specific commits. Tags are metadata-only markers for release traceability and do not modify code or runtime behavior. Custom deployments are not required to create or use tags; they can download, modify, and deploy the plugin from any commit or branch.

---

## 2. Outbound Network Calls

The plugin makes three categories of outbound HTTP requests:

- **Proxy LLM requests (Proxy mode)**  
  - Implemented by `src/core/proxy/client.ts` and `src/core/provider/proxyProvider.ts`.  
  - Uses the Proxy Base URL configured in the plugin Settings UI (stored in `figma.clientStorage`) to send:
    - `GET {proxyBaseUrl}/health` for connection testing.
    - `POST {proxyBaseUrl}/v1/chat` for LLM chat requests.

- **Internal API LLM requests (Internal API mode)**  
  - Implemented by `src/core/provider/internalApiProvider.ts`.  
  - Uses the Internal API URL configured in Settings to send:
    - `POST {internalApiUrl}` with a JSON body describing the chat request.

- **No other external calls**  
  - There are no analytics, telemetry, or tracking SDKs (no Sentry, Segment, Mixpanel, Google Analytics, etc.).  
  - All other logic (UI rendering, Figma document access, scorecard/report generation) runs entirely within the Figma plugin sandbox.

**Network access enforcement:**  
Figma enforces network access at runtime via `manifest.json.networkAccess.allowedDomains`. No runtime network requests are possible outside the domains explicitly listed in the final manifest produced at build time.

**Review reference:**  
For a complete view of outbound call implementations, inspect:

- `src/core/proxy/client.ts`  
- `src/core/provider/internalApiProvider.ts`  
- `src/core/provider/proxyProvider.ts`  

---

## 3. Where Configuration Lives

Custom-specific configuration and knowledge live under the `custom/` directory. The custom overlay system provides:

- **Configuration:** `custom/config.json` controls UI behavior, LLM endpoints, and network access allowlists
- **Knowledge bases:** `custom/knowledge/*.md` files contain organization-specific guidelines and policies
- **Build-time generation:** `scripts/generate-custom-overlay.ts` generates overlay modules at build time

**For complete details:** See **[Custom Overlay Guide](../custom/README.md)** for configuration schema, knowledge base policies, and setup instructions.

**Repository relationship:**  
The public repository serves as a read-only upstream source. Organizations typically download or vendor the repository into their own version control systems. All modifications, including configuration changes, occur in separate private repositories. There is no mechanism, workflow, or permission to commit or sync changes back to the public repository from custom deployments.

---

## 4. Network Allowlisting & Manifest Patching

Figma enforces network access via the plugin manifest. The `manifest.json.networkAccess.allowedDomains` array is the sole runtime authority for network access.

**Build-time patcher:**  
The script `scripts/update-manifest-network-access.ts` reads `custom/config.json.networkAccess` and writes validated domains to `manifest.json.networkAccess.allowedDomains` at build time.

**For complete details:** See **[Custom Overlay Guide](../custom/README.md)** → "Network Access (Figma allowedDomains)" for:
- Configuration schema (`baseAllowedDomains`, `extraAllowedDomains`)
- Build vs watch behavior
- Domain validation rules
- Public defaults vs custom overrides

---

## 5. Public Defaults vs Custom Builds

### Public defaults (this repository)

In `custom/config.json`, the public repository includes temporary development defaults:

```jsonc
"networkAccess": {
  "baseAllowedDomains": [
    "https://api.openai.com"
  ],
  "extraAllowedDomains": [
    "http://localhost:8787",
    "https://overobedient-buddy-leathern.ngrok-free.dev"
  ]
}
```

- These domains are transitional defaults included to make the open-source build functional out of the box.
- They are not recommended for production or corporate use.
- These values are validated and written into `manifest.json.networkAccess.allowedDomains` at build time.
- If a custom deployment provides empty arrays, the patcher applies the same three development defaults to maintain functionality until custom values are configured.

### Custom deployment configuration

Custom deployments should:

- Edit `custom/config.json` in their private repository to set:
  - `networkAccess.baseAllowedDomains` and `extraAllowedDomains` to organization-approved endpoints only (e.g., internal proxy, internal LLM gateway).
  - `llm.endpoint` to their internal LLM URL (if desired).
- Optionally edit `custom/knowledge/*.md` to include internal design guidelines and policies.

**Configuration isolation:**  
All custom endpoints and knowledge live in `custom/` and its generated overlay modules. The public source tree does not hardcode organization-specific values.

---

## 6. Privacy & Configuration Isolation

- **Secrets in source control:**  
  - This repository does not include any API keys, tokens, or passwords.
  - Custom deployments should not commit secrets to `custom/config.json`. Use environment variables or secure storage (e.g., Figma clientStorage, internal secret stores).

- **Configuration boundaries:**  
  - Custom-specific configuration is limited to `custom/config.json` and `custom/knowledge/*.md`.
  - Core logic reads only the generated overlay modules (`src/custom/generated/customConfig.ts`, `src/custom/generated/customKnowledge.ts`).
  - The core plugin does not send configuration values to any public or third-party service.

- **Outbound traffic scope:**  
  - All outbound calls go to:
    - LLM proxy (Proxy mode) – `proxyBaseUrl`.
    - Internal API (Internal API mode) – `internalApiUrl`.
  - Allowed domains are explicitly listed and enforced via `manifest.json.networkAccess.allowedDomains`.

---

## 7. Non-Goals

This system intentionally does not include:

- Telemetry or analytics collection.
- Runtime fetching of configuration or allowlists from external sources.
- Background synchronization or data transmission outside of explicit user-initiated LLM requests.

---

## 8. Corporate Reviewer Checklist

Use this checklist when evaluating a custom deployment of this plugin:

- **Network allowlist**
  - [ ] Inspect `custom/config.json.networkAccess.baseAllowedDomains` and `extraAllowedDomains`.
  - [ ] Confirm that `manifest.json.networkAccess.allowedDomains` contains only approved origins.
  - [ ] Verify that no unexpected domains appear (e.g., unknown third-party services).

- **Outbound calls**
  - [ ] Confirm all outbound HTTP calls originate from:
    - `src/core/proxy/client.ts` (Proxy LLM).
    - `src/core/provider/internalApiProvider.ts` (Internal API LLM).
  - [ ] Verify there are no analytics/telemetry SDKs or other third-party tracking.

- **Configuration and knowledge isolation**
  - [ ] Ensure custom endpoints and knowledge bases are defined only under `custom/config.json` and `custom/knowledge/*.md`.
  - [ ] Confirm no internal URLs or policies are committed elsewhere in the core source tree.

- **Secrets management**
  - [ ] Verify that no API keys or secrets are committed to the repository.
  - [ ] Check that runtime secrets (if any) are provided via secure channels (environment variables, Figma clientStorage, or corporate secret stores).

- **Build behavior**
  - [ ] Run `npm run build` and inspect `manifest.json` to confirm the expected `allowedDomains`.
  - [ ] (Optional) Run `npm run watch` and validate that changes to `custom/config.json` correctly update `manifest.json.networkAccess.allowedDomains`.

If all of the above checks pass, the plugin's network behavior and configuration boundaries are explicit and auditable.
