# Work Environment Migration Guide

This guide walks you through migrating the FigmAI plugin to a restricted work environment with minimal code changes.

---

## Pre-Migration Checklist

Before starting migration, verify these requirements:

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

### Step 2: Create Work Configuration

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
  ],
  "componentScanner": "./extensions/workComponentScanner",
  "complianceHook": "./extensions/workComplianceHook"
}
```

### Step 3: Set Environment Variables (Optional)

Create `.env.work` file:

```bash
FIGMAI_ENVIRONMENT=work
FIGMAI_DEFAULT_MODEL=internal-llm-v1
FIGMAI_PROXY_URL=https://internal-proxy.company.com
FIGMAI_COMPLIANCE_MODE=true
```

### Step 4: Update Configuration Loader

The configuration loader will automatically detect the work environment and load `config.work.json`. No code changes needed if using the enhanced config loader.

### Step 5: Configure Settings in Plugin

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

### Step 6: Implement Work-Specific Extensions (If Required)

#### Custom Component Scanner

If you need to detect internal design system components, create `src/extensions/workComponentScanner.ts`:

```typescript
import type { ComponentScanner, DesignSystemComponent } from '../core/extensions/componentScanner'
import type { SceneNode, ComponentNode } from '@figma/plugin-typings'

export class WorkComponentScanner implements ComponentScanner {
  detectDesignSystemComponent(node: SceneNode): DesignSystemComponent | null {
    // Example: Detect components with specific naming pattern
    if (node.type === 'INSTANCE' && node.name.startsWith('DS/')) {
      const parts = node.name.split('/')
      return {
        systemName: 'CompanyDesignSystem',
        componentName: parts[1] || 'Unknown',
        variant: parts[2],
        properties: this.extractProperties(node)
      }
    }
    return null
  }
  
  extractMetadata(component: ComponentNode): DesignSystemMetadata | null {
    // Extract metadata from component description or properties
    return null
  }
  
  private extractProperties(node: SceneNode): Record<string, unknown> {
    // Extract component properties
    return {}
  }
}
```

Register in `src/main.ts`:
```typescript
import { componentScannerRegistry } from './core/extensions/componentScanner'
import { WorkComponentScanner } from './extensions/workComponentScanner'

componentScannerRegistry.set('work', new WorkComponentScanner())
```

#### Custom Knowledge Base Loader

If you need to load knowledge bases from an internal server, create `src/extensions/workKnowledgeBaseLoader.ts`:

```typescript
import type { KnowledgeBaseLoader, Assistant } from '../core/extensions/knowledgeBaseLoader'

export class WorkKnowledgeBaseLoader implements KnowledgeBaseLoader {
  private baseUrl: string
  
  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }
  
  async loadKnowledgeBase(assistantId: string): Promise<string> {
    const response = await fetch(`${this.baseUrl}/${assistantId}.md`)
    if (!response.ok) {
      throw new Error(`Failed to load KB for ${assistantId}`)
    }
    return await response.text()
  }
  
  async listAssistants(): Promise<Assistant[]> {
    const response = await fetch(`${this.baseUrl}/assistants.json`)
    const data = await response.json()
    return data.assistants
  }
}
```

#### Compliance Hook

If you need compliance logging or request validation, create `src/extensions/workComplianceHook.ts`:

```typescript
import type { ComplianceHook, ComplianceResult, InteractionLog } from '../core/extensions/complianceHook'
import type { ChatRequest } from '../core/provider/provider'

export class WorkComplianceHook implements ComplianceHook {
  async validateRequest(request: ChatRequest): Promise<ComplianceResult> {
    // Example: Block certain assistant IDs
    if (request.assistantId === 'restricted-assistant') {
      return {
        allowed: false,
        reason: 'Assistant not allowed in work environment'
      }
    }
    
    // Example: Sanitize request
    const sanitized = this.sanitizeRequest(request)
    
    return {
      allowed: true,
      sanitizedRequest: sanitized
    }
  }
  
  async sanitizeResponse(response: string): Promise<string> {
    // Example: Remove sensitive information
    return response.replace(/internal-company-name/g, '[REDACTED]')
  }
  
  async logInteraction(interaction: InteractionLog): Promise<void> {
    // Send to compliance logging service
    await fetch('https://internal-logging.company.com/api/logs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(interaction)
    })
  }
  
  private sanitizeRequest(request: ChatRequest): ChatRequest {
    // Remove sensitive data from request
    return request
  }
}
```

### Step 7: Build Plugin

```bash
npm run build
```

### Step 8: Test Migration

Follow the [Verification Checklist](#verification-checklist) below.

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
- [ ] Custom component scanner detects work components (if implemented)
- [ ] Custom knowledge bases load (if implemented)
- [ ] Compliance hooks execute (if implemented)
- [ ] Custom providers work (if implemented)

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
2. Review `docs/proxy-and-plugin-setup.md`
3. Check GitHub issues (if public repo)

---

## Next Steps

After successful migration:
1. Document any work-specific customizations
2. Create runbook for common issues
3. Set up monitoring/alerting (if applicable)
4. Train team on work-specific features

