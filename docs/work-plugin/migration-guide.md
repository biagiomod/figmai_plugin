# Work Migration Guide

**For:** AI coding assistants (DevGPT Cline, GPT-4.1) and human developers  
**Purpose:** Complete guide for migrating Public Plugin to Work Plugin

---

## Overview

This guide walks you through migrating the FigmAI plugin to a restricted work environment with minimal code changes. The Work Plugin extends the Public Plugin via a single adapter override file, allowing Work-only features without modifying core Public Plugin code.

**Key Concepts:**
- **Public Plugin**: Open-source base plugin
- **Work Plugin**: Proprietary/internal version with Work-only features
- **Work Adapter**: Single-file boundary for Work-only logic (`src/work/workAdapter.override.ts`)

---

## Prerequisites

Before starting migration, verify these requirements:

### Basic Requirements
- ✅ Public Plugin builds successfully (`npm run build`)
- ✅ Public Plugin runs in Figma without errors
- ✅ All tests pass (if applicable)
- ✅ Work environment has Node.js/npm access
- ✅ Work environment has network/proxy access for LLM providers

### Node.js & Build Tools
- [ ] **Node.js version:** Check `package.json` for required version (if specified)
- [ ] **npm access:** Verify npm registry is accessible or configure internal registry
- [ ] **Build tools:** Ensure TypeScript and build tools are allowed
- [ ] **Dependencies:** Verify all npm dependencies are whitelisted/allowed

### Network Requirements
- [ ] **Proxy server:** Work proxy server URL is accessible
- [ ] **HTTPS access:** Outbound HTTPS requests are allowed
- [ ] **CORS:** Proxy server CORS policy allows Figma plugin origin
- [ ] **Firewall:** No firewall rules blocking proxy communication

### Authentication
- [ ] **Token format:** Verify token format matches work requirements
- [ ] **Token storage:** Confirm Figma clientStorage is acceptable for credential storage
- [ ] **Auth mode:** Determine if shared_token or session_token is required

### Configuration
- [ ] **Model name:** Identify work LLM model name/endpoint
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

### Step 2: Create Work Override Directory

```bash
# Ensure src/work/ directory exists
mkdir -p src/work
```

**Verify:** Directory `src/work/` exists

---

### Step 3: Create Work Adapter Override

Create `src/work/workAdapter.override.ts`:

```typescript
import type { WorkAdapter } from '../core/work/adapter'
import { createDefaultWorkAdapter } from '../core/work/defaultAdapter'

const workAdapter: WorkAdapter = {
  ...createDefaultWorkAdapter(),
  
  // Implement Work-only features here
  // See docs/work-plugin/extension-points.md for all available hooks
}

export default workAdapter
```

**Verify:** File exists and exports `WorkAdapter`

**IMPORTANT:** This file is git-ignored. Never commit Work-only implementations to Public repo.

---

### Step 4: Implement Required Extension Points

Based on Work requirements, implement extension points in `workAdapter.override.ts`:

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

### Step 6: Create Work Configuration (Optional)

Create `config.work.json` in the plugin root:

```json
{
  "environment": "work",
  "defaultProvider": "openai",
  "defaultModel": "internal-llm-v1",
  "proxyBaseUrl": "https://internal-proxy.company.com",
  "features": {
    "enableToolCalls": true,
    "enableVision": true,
    "enableSelectionExportPng": false,
    "enableComplianceHooks": true,
    "enableDesignSystemScanning": true
  },
  "requestTimeoutMs": 60000,
  "assistantKnowledgeBasePath": "https://internal-kb.company.com/assistants",
  "enabledAssistants": [
    "general",
    "design_critique",
    "accessibility",
    "dev_handoff"
  ]
}
```

**Note:** Configuration loader will automatically detect work environment and load `config.work.json`. No code changes needed.

---

### Step 7: Set Environment Variables (Optional)

Create `.env.work` file:

```bash
FIGMAI_ENVIRONMENT=work
FIGMAI_DEFAULT_MODEL=internal-llm-v1
FIGMAI_PROXY_URL=https://internal-proxy.company.com
FIGMAI_COMPLIANCE_MODE=true
```

---

### Step 8: Verify .gitignore

Ensure `.gitignore` includes:

```
src/work/*.override.ts
src/work/credentials.override.ts
src/work/dsRules.override.ts
```

**Verify:** Override files are git-ignored

---

### Step 9: Configure Settings in Plugin

1. Open Figma
2. Run the FigmAI plugin
3. Open Settings (gear icon)
4. Configure:
   - **Proxy Base URL:** `https://internal-proxy.company.com`
   - **Default Model:** `internal-llm-v1`
   - **Auth Mode:** Select appropriate mode
   - **Token:** Enter work-provided token
5. Click "Test Connection" to verify
6. Save settings

---

### Step 10: Build and Test

```bash
npm run build
```

**Verify:**
- ✅ Build succeeds
- ✅ No TypeScript errors
- ✅ Plugin loads in Figma
- ✅ Work adapter loads (check console for errors)
- ✅ Extension points execute (test each implemented hook)

---

### Step 11: Test Work Features

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

**Verify:** All Work features function correctly

---

## Extension Points Implementation Details

For detailed implementation examples, see `docs/work-plugin/extension-points.md`. The following sections provide quick reference:

### Component Scanner

Detect and extract metadata from internal design system components.

**Interface:** `ComponentScanner` in `core/extensions/componentScanner.ts`

**Implementation Example:** See `docs/work-plugin/extension-points.md` → "Component Scanner"

**Registration:** Register in `main.ts`:
```typescript
import { componentScannerRegistry } from './core/extensions/componentScanner'
import { WorkComponentScanner } from './extensions/workComponentScanner'

componentScannerRegistry.set('work', new WorkComponentScanner())
```

### Knowledge Base Loader

Load assistant knowledge bases from custom sources (e.g., internal server).

**Interface:** `KnowledgeBaseLoader` in `core/extensions/knowledgeBaseLoader.ts`

**Implementation Example:** See `docs/work-plugin/extension-points.md` → "Knowledge Base Loader"

### Compliance Hook

Implement compliance logging, request validation, and response sanitization.

**Interface:** `ComplianceHook` in `core/extensions/complianceHook.ts`

**Implementation Example:** See `docs/work-plugin/extension-points.md` → "Compliance Hook"

### Custom Provider

Implement custom LLM provider for work-specific LLM endpoints.

**Interface:** `Provider` in `core/provider/provider.ts`

**Implementation Example:** See `docs/work-plugin/extension-points.md` → "Custom Provider"

---

## Configuration Reference

### Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `FIGMAI_ENVIRONMENT` | Environment name | `work` |
| `FIGMAI_DEFAULT_MODEL` | Default LLM model | `internal-llm-v1` |
| `FIGMAI_PROXY_URL` | Proxy server URL | `https://internal-proxy.company.com` |
| `FIGMAI_COMPLIANCE_MODE` | Enable compliance hooks | `true` |
| `FIGMAI_KB_URL` | Knowledge base server URL | `https://internal-kb.company.com` |

### Config File Format

See `docs/configuration.md` for full schema reference.

---

## Troubleshooting

### Common Issues

#### Issue: Work adapter not loading

**Symptoms:** Console shows "Work adapter not found" or default adapter used

**Fix:**
1. Verify `src/work/workAdapter.override.ts` exists
2. Verify file exports `WorkAdapter` (default or named export)
3. Check console for import errors
4. Verify file is not git-ignored incorrectly

#### Issue: Extension point not called

**Symptoms:** Extension point implemented but not executing

**Fix:**
1. Verify extension point is in `WorkAdapter` interface
2. Verify calling code uses `workAdapter.extensionPoint()`
3. Check console for errors
4. Verify adapter loaded successfully

#### Issue: TypeScript errors

**Symptoms:** Build fails with type errors

**Fix:**
1. Verify imports use correct paths
2. Verify types match `WorkAdapter` interface
3. Check `core/work/adapter.ts` for interface definition
4. Verify all required properties implemented

### Proxy Connection Fails

**Symptoms:** "Connection failed" or timeout errors

**Solutions:**
1. Verify proxy URL is correct and accessible
2. Check CORS settings on proxy server
3. Verify firewall rules allow outbound HTTPS
4. Test proxy health endpoint directly: `https://your-proxy.com/health`
5. Check browser console for CORS errors

### Authentication Fails

**Symptoms:** 401 or 403 errors

**Solutions:**
1. Verify token format matches work requirements
2. Check token hasn't expired
3. Verify auth mode (shared_token vs session_token)
4. Check proxy server logs for authentication errors

### Model Not Found

**Symptoms:** "Model not found" or "Invalid model" errors

**Solutions:**
1. Verify model name matches work LLM endpoint
2. Check if model requires special formatting
3. Verify model is available in work environment
4. Check proxy server model configuration

### Build Fails

**Symptoms:** TypeScript or build errors

**Solutions:**
1. Verify Node.js version matches requirements
2. Clear `node_modules` and reinstall: `rm -rf node_modules && npm install`
3. Check if all dependencies are whitelisted
4. Verify build tools are allowed

### Extension Points Not Loading

**Symptoms:** Custom scanners/hooks not executing

**Solutions:**
1. Verify extension files are in correct location
2. Check extension registration in `main.ts`
3. Verify config references correct module paths
4. Check browser console for import errors

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

### Work-Specific Features
- [ ] `src/work/workAdapter.override.ts` exists and exports `WorkAdapter`
- [ ] All required extension points implemented
- [ ] Credentials configured (if needed)
- [ ] `.gitignore` includes override files
- [ ] Work adapter loads (no console errors)
- [ ] Custom component scanner detects work components (if implemented)
- [ ] Custom knowledge bases load (if implemented)
- [ ] Compliance hooks execute (if implemented)
- [ ] Custom providers work (if implemented)
- [ ] All Work features tested and working
- [ ] No Public Plugin functionality broken

### Security & Compliance
- [ ] Credentials stored securely (check Figma clientStorage)
- [ ] No credentials in console logs
- [ ] Network requests use HTTPS
- [ ] Compliance logging works (if implemented)

---

## Rollback Plan

If migration fails, rollback steps:

1. **Remove work configuration:**
   ```bash
   rm config.work.json
   rm .env.work
   ```

2. **Reset settings in plugin:**
   - Open Settings
   - Clear proxy URL
   - Reset to defaults

3. **Remove extensions:**
   - Remove extension files
   - Remove registration code from `main.ts`

4. **Rebuild:**
   ```bash
   npm run build
   ```

---

## Support

For issues specific to work environment:
1. Check this guide's troubleshooting section
2. Review `docs/configuration.md` for config options
3. Check `docs/security.md` for security considerations
4. Contact work IT/security team for network/auth issues

For plugin-specific issues:
1. Check main README.md
2. Review `docs/setup/proxy-setup.md`
3. Check GitHub issues (if public repo)

---

## Next Steps

After successful migration:
1. Document any work-specific customizations
2. Create runbook for common issues
3. Set up CI/CD for Work Plugin (if applicable)
4. Train team on Work features
5. Monitor for issues

---

## Reference

- **Architecture:** `README.md`
- **Getting Started:** `docs/01-getting-started.md`
- **Extension Points:** `docs/work-plugin/extension-points.md`
- **Work Adapter Pattern:** `docs/work-plugin/adapter-pattern.md`
- **Work Override Files:** `src/work/README.md`
- **Configuration:** `docs/configuration.md`
- **Security:** `docs/security.md`
- **Message Contract:** `docs/message-contract.md`
