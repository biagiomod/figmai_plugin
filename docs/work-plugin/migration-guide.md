# Custom Migration Guide

**For:** AI coding assistants (DevGPT Cline, GPT-4.1) and human developers  
**Purpose:** Complete guide for migrating Public Plugin to Custom Plugin

---

## Overview

This guide walks you through migrating the FigmAI plugin to a restricted custom or enterprise environment with minimal code changes. The Custom Plugin extends the Public Plugin via a single adapter override file, allowing custom-only features without modifying core Public Plugin code.

**Key Concepts:**
- **Public Plugin**: Open-source base plugin
- **Custom Plugin**: Proprietary/internal version with custom-only features
- **Custom Adapter**: Single-file boundary for custom-only logic (`src/work/workAdapter.override.ts`)

---

## Prerequisites

Before starting migration, verify these requirements:

### Basic Requirements
- ✅ Public Plugin builds successfully (`npm run build`)
- ✅ Public Plugin runs in Figma without errors
- ✅ All tests pass (if applicable)
- ✅ Custom/restricted environment has Node.js/npm access
- ✅ Custom/restricted environment has network/proxy access for LLM providers

### Node.js & Build Tools
- [ ] **Node.js version:** Check `package.json` for required version (if specified)
- [ ] **npm access:** Verify npm registry is accessible or configure internal registry
- [ ] **Build tools:** Ensure TypeScript and build tools are allowed
- [ ] **Dependencies:** Verify all npm dependencies are whitelisted/allowed

### Network Requirements
- [ ] **Proxy server:** Proxy server URL is accessible
- [ ] **HTTPS access:** Outbound HTTPS requests are allowed
- [ ] **CORS:** Proxy server CORS policy allows Figma plugin origin
- [ ] **Firewall:** No firewall rules blocking proxy communication

### Authentication
- [ ] **Token format:** Verify token format matches your requirements
- [ ] **Token storage:** Confirm Figma clientStorage is acceptable for credential storage
- [ ] **Auth mode:** Determine if shared_token or session_token is required

### Configuration
- [ ] **Model name:** Identify LLM model name/endpoint
- [ ] **Feature flags:** Determine which features should be enabled/disabled
- [ ] **Assistants:** Identify which assistants should be available

---

## Migration Steps

### Step 1: Install Dependencies

```bash
cd figmai_plugin
npm install
```

If npm registry is restricted:
```bash
npm install --registry=https://internal-registry.company.com
```

**Verify:** Dependencies installed successfully

---

### Step 2: Create Custom Override Directory

```bash
# Ensure src/work/ directory exists
mkdir -p src/work
```

**Verify:** Directory `src/work/` exists

---

### Step 3: Create Custom Adapter Override

The repo includes a **no-op stub** at `src/work/workAdapter.override.ts` for build stability. Overwrite it with your implementation:

```typescript
import type { WorkAdapter } from '../core/work/adapter'
import { createDefaultWorkAdapter } from '../core/work/defaultAdapter'

const workAdapter: WorkAdapter = {
  ...createDefaultWorkAdapter(),
  
  // Implement custom-only features here
  // See docs/work-plugin/extension-points.md for all available hooks
}

export default workAdapter
```

**Verify:** File exists and exports `WorkAdapter`

**Note:** A no-op stub is committed; overwrite it locally or in private forks. Do not commit credentials or proprietary implementations to the Public repo.

---

### Step 4: Implement Required Extension Points

Based on your requirements, implement extension points in `workAdapter.override.ts`:

#### 4a. Confluence Integration (if needed)

```typescript
async createConfluence(args: {
  confluenceTitle: string
  confluenceTemplateXhtml: string
}): Promise<{ url?: string }> {
  // See docs/work-plugin/extension-points.md for implementation details
  // See src/work/README.md for credentials setup
}
```

**Reference:** `docs/work-plugin/extension-points.md` → "Confluence Integration Hook"

#### 4b. Design System Detection (if needed)

```typescript
designSystem: {
  detectDesignSystemComponent(node: SceneNode): DesignSystemInfo | null {
    // See docs/work-plugin/extension-points.md for implementation
  },
  shouldIgnore?(node: SceneNode): boolean {
    // Optional: filter nodes during scanning
  }
}
```

**Reference:** `docs/work-plugin/extension-points.md` → "Design System Component Detection"

#### 4c. Content Table Post-Processing (if needed)

```typescript
async postProcessContentTable(args: {
  table: UniversalContentTableV1
  selectionContext?: { pageId?: string; pageName?: string; rootNodeId?: string }
}): Promise<UniversalContentTableV1> {
  // See docs/work-plugin/extension-points.md for implementation
  // Deep clone table before modifying
}
```

**Reference:** `docs/work-plugin/extension-points.md` → "Post-Process Content Table"

#### 4d. Ignore Rules (if needed)

```typescript
getContentTableIgnoreRules(): ContentTableIgnoreRules {
  // See docs/work-plugin/extension-points.md for rules structure
}
```

**Reference:** `docs/work-plugin/extension-points.md` → "Ignore / Filter Rules"

**Verify:** All required extension points implemented

---

### Step 5: Configure Credentials (if needed)

Create `src/work/credentials.override.ts`:

```typescript
export const confluenceEndpoint: string = 'https://your-domain.atlassian.net/wiki/rest/api/content'
```

**IMPORTANT:** This file is git-ignored. Never commit credentials.

**Verify:** Credentials file exists (if needed) and is git-ignored

**Reference:** `src/work/README.md` for setup instructions

---

### Step 6: Create Custom Configuration (Optional)

**Note:** For custom configuration and knowledge bases, see **[Custom Overlay Guide](../../custom/README.md)** [AUTHORITATIVE]. The custom overlay system provides:
- Custom configuration via `custom/config.json`
- Custom knowledge bases via `custom/knowledge/*.md`
- Network access allowlist configuration
- Build-time generation and bundling

For basic build steps, see **[README.md](../../README.md)** [AUTHORITATIVE].

---

### Step 7: Verify .gitignore

Ensure `.gitignore` includes (stub exception so build passes in all environments):

```
src/work/credentials.override.ts
src/work/*.override.ts
!src/work/workAdapter.override.ts
```

**Verify:** Only `workAdapter.override.ts` is tracked (no-op stub); other override files are git-ignored

---

### Step 8: Configure Settings in Plugin

1. Open Figma
2. Run the FigmAI plugin
3. Open Settings (gear icon)
4. Configure:
   - **Proxy Base URL:** `https://internal-proxy.company.com`
   - **Default Model:** `internal-llm-v1`
   - **Auth Mode:** Select appropriate mode
   - **Token:** Enter your token
5. Click "Test Connection" to verify
6. Save settings

---

### Step 9: Build and Test

For build instructions, see **[README.md](../../README.md)** [AUTHORITATIVE].

**Verify:**
- ✅ Build succeeds
- ✅ No TypeScript errors
- ✅ Plugin loads in Figma
- ✅ Custom adapter loads (check console for errors)
- ✅ Extension points execute (test each implemented hook)

---

### Step 10: Test Custom Features

For each implemented extension point:

1. **Confluence Integration:**
   - Generate Content Table
   - Click "Send to Confluence"
   - Verify API call succeeds
   - Verify URL returned (if available)

2. **Design System Detection:**
   - Select DS component
   - Generate Content Table
   - Verify DS detection in console/logs

3. **Content Table Post-Processing:**
   - Generate Content Table with DS components
   - Verify post-processing applied
   - Verify export includes processed content

4. **Ignore Rules:**
   - Generate Content Table
   - Verify ignored nodes are excluded

**Verify:** All custom features function correctly

---

## Extension Points Implementation Details

For detailed implementation examples and complete reference, see **[Extension Points](extension-points.md)** [REFERENCE]. The following sections provide quick reference:

### Component Scanner

Detect and extract metadata from internal design system components.

**Reference:** See [Extension Points](extension-points.md) → "Component Scanner"

### Knowledge Base Loader

Load assistant knowledge bases from custom sources (e.g., internal server).

**Reference:** See [Extension Points](extension-points.md) → "Knowledge Base Loader"

### Compliance Hook

Implement compliance logging, request validation, and response sanitization.

**Reference:** See [Extension Points](extension-points.md) → "Compliance Hook"

### Custom Provider

Implement custom LLM provider for custom-specific LLM endpoints.

**Reference:** See [Extension Points](extension-points.md) → "Custom Provider"

---

## Configuration Reference

For configuration details, see:
- **[Custom Overlay Guide](../../custom/README.md)** [AUTHORITATIVE] - Custom configuration and knowledge bases
- **[Configuration](../configuration.md)** [REFERENCE] - Full configuration schema reference

---

## Troubleshooting

### Common Issues

For detailed troubleshooting, see **[Extension Points](extension-points.md)** [REFERENCE] → "Troubleshooting Extensions".

**Quick fixes:**
- **Adapter not loading:** Verify `src/work/workAdapter.override.ts` exists and exports correctly
- **Extension point not called:** Check `WorkAdapter` interface and calling code
- **TypeScript errors:** Verify imports and types match interface
- **Connection/auth issues:** Verify proxy URL, token format, and network access
- **Build fails:** See [README.md](../../README.md) for build troubleshooting

---

## Verification Checklist

After migration, verify these items:

### Basic Functionality
- [ ] Plugin loads without errors
- [ ] Settings modal opens
- [ ] Proxy connection test succeeds
- [ ] Settings save correctly

### Assistant Functionality
- [ ] Assistants list loads
- [ ] Assistant selection works
- [ ] Quick actions appear/disappear based on selection
- [ ] Messages send and receive responses

### Custom-Specific Features
- [ ] `src/work/workAdapter.override.ts` exists and exports `WorkAdapter`
- [ ] All required extension points implemented
- [ ] Credentials configured (if needed)
- [ ] `.gitignore` includes override files
- [ ] Custom adapter loads (no console errors)
- [ ] Custom component scanner detects components (if implemented)
- [ ] Custom knowledge bases load (if implemented)
- [ ] Compliance hooks execute (if implemented)
- [ ] Custom providers work (if implemented)
- [ ] All custom features tested and working
- [ ] No Public Plugin functionality broken

### Security & Compliance
- [ ] Credentials stored securely (check Figma clientStorage)
- [ ] No credentials in console logs
- [ ] Network requests use HTTPS
- [ ] Compliance logging works (if implemented)

---

## Rollback Plan

If migration fails, rollback steps:

1. **Remove custom configuration:**
   - Remove or reset `custom/config.json` if modified
   - Remove any custom knowledge base files if added

2. **Reset settings in plugin:**
   - Open Settings
   - Clear proxy URL
   - Reset to defaults

3. **Remove extensions:**
   - Restore the no-op stub at `src/work/workAdapter.override.ts` (or leave your overwrite and revert manually)
   - Remove any other override files (`credentials.override.ts`, `dsRules.override.ts`, etc.)

4. **Rebuild:**
   ```bash
   npm run build
   ```

---

## Support

For issues specific to your environment:
1. Check this guide's troubleshooting section
2. Review [Extension Points](extension-points.md) for detailed troubleshooting
3. Check [Security](../security.md) for security considerations
4. Contact your IT/security team for network/auth issues

For plugin-specific issues:
1. Check [README.md](../../README.md)
2. Review [Proxy Setup](../setup/proxy-setup.md)
3. Check GitHub issues (if public repo)

---

## Next Steps

After successful migration:
1. Document any custom-specific customizations
2. Create runbook for common issues
3. Set up CI/CD for Custom Plugin (if applicable)
4. Train team on custom features
5. Monitor for issues

---

## Reference

- **Architecture:** [README.md](../../README.md)
- **Getting Started:** [01-getting-started.md](../01-getting-started.md)
- **Extension Points:** [extension-points.md](extension-points.md)
- **Adapter Pattern:** [adapter-pattern.md](adapter-pattern.md)
- **Override Files:** [src/work/README.md](../../src/work/README.md)
- **Custom Overlay:** [custom/README.md](../../custom/README.md)
- **Configuration:** [configuration.md](../configuration.md)
- **Security:** [security.md](../security.md)
- **Message Contract:** [message-contract.md](../reference/message-contract.md)
