# Configuration Guide

Complete reference for configuring the FigmAI plugin for different environments.

---

## Configuration Sources (Priority Order)

1. **Environment Variables** (highest priority)
2. **Config Files** (`config.{env}.json`)
3. **Settings UI** (user-configurable, persisted)
4. **Defaults** (fallback)

---

## Configuration Schema

### Core Configuration (`src/core/config.ts`)

```typescript
export interface EnvironmentConfig {
  // Environment
  environment: 'personal' | 'work' | 'production'
  
  // Provider settings
  defaultProvider: LlmProviderId // 'openai' | 'claude' | 'copilot'
  availableProviders: LlmProviderId[]
  
  // Model settings
  defaultModel: string
  availableModels: string[]
  
  // Feature flags
  features: {
    enableToolCalls: boolean
    enableVision: boolean
    enableSelectionExportPng: boolean
    enableComplianceHooks: boolean
    enableDesignSystemScanning: boolean
  }
  
  // Network settings
  requestTimeoutMs: number
  healthCheckTimeoutMs: number
  
  // Assistant settings
  assistantKnowledgeBasePath?: string
  enabledAssistants?: string[]
  
  // Branding (optional)
  brandName?: string
  codeName?: string
  
  // Extension points
  componentScanner?: string
  complianceHook?: string
  knowledgeBaseLoader?: string
}
```

### Settings (`src/core/settings.ts`)

User-configurable settings stored in Figma clientStorage:

```typescript
export interface Settings {
  // Proxy configuration
  proxyBaseUrl: string
  authMode: 'shared_token' | 'session_token'
  sharedToken?: string
  sessionToken?: string
  
  // Model configuration
  defaultModel: string
  
  // Network configuration
  requestTimeoutMs: number
  
  // Work environment settings
  environment?: 'personal' | 'work' | 'production'
  customKnowledgeBaseUrl?: string
  designSystemComponentPrefix?: string
  complianceMode?: boolean
}
```

---

## Configuration Methods

### Method 1: Environment Variables

Set environment variables before building:

```bash
export FIGMAI_ENVIRONMENT=work
export FIGMAI_DEFAULT_MODEL=internal-llm-v1
export FIGMAI_PROXY_URL=https://internal-proxy.company.com
export FIGMAI_COMPLIANCE_MODE=true
export FIGMAI_KB_URL=https://internal-kb.company.com
```

Or use `.env` file (for local development):

```bash
# .env
FIGMAI_ENVIRONMENT=personal
FIGMAI_DEFAULT_MODEL=gpt-4.1-mini
FIGMAI_PROXY_URL=https://proxy.example.com
```

### Method 2: Config Files

Create environment-specific config files:

**`config.personal.json`** (default):
```json
{
  "environment": "personal",
  "defaultProvider": "openai",
  "defaultModel": "gpt-4.1-mini",
  "features": {
    "enableToolCalls": true,
    "enableVision": false,
    "enableSelectionExportPng": false,
    "enableComplianceHooks": false,
    "enableDesignSystemScanning": false
  },
  "requestTimeoutMs": 30000
}
```

**`config.work.json`**:
```json
{
  "environment": "work",
  "defaultProvider": "openai",
  "defaultModel": "internal-llm-v1",
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
    "accessibility"
  ],
  "componentScanner": "./extensions/workComponentScanner",
  "complianceHook": "./extensions/workComplianceHook"
}
```

**`config.production.json`**:
```json
{
  "environment": "production",
  "defaultProvider": "openai",
  "defaultModel": "gpt-4-turbo",
  "features": {
    "enableToolCalls": true,
    "enableVision": true,
    "enableSelectionExportPng": true,
    "enableComplianceHooks": false,
    "enableDesignSystemScanning": false
  },
  "requestTimeoutMs": 45000
}
```

### Method 3: Settings UI

Configure via plugin Settings modal:
- Proxy Base URL
- Default Model
- Auth Mode & Token
- Request Timeout

Settings are persisted in Figma clientStorage and override config file defaults.

---

## Configuration Fields Reference

### Provider Settings

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `defaultProvider` | `LlmProviderId` | `'openai'` | Default LLM provider |
| `availableProviders` | `LlmProviderId[]` | `['openai', 'claude', 'copilot']` | Available providers |

### Model Settings

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `defaultModel` | `string` | `'gpt-4.1-mini'` | Default model name/endpoint |
| `availableModels` | `string[]` | `[]` | Available models (optional) |

**Note:** Model names are provider-specific. For work environments, use internal LLM endpoint names.

### Feature Flags

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `enableToolCalls` | `boolean` | `true` | Enable tool/function calling |
| `enableVision` | `boolean` | `false` | Enable image export for vision |
| `enableSelectionExportPng` | `boolean` | `false` | Enable PNG export of selection |
| `enableComplianceHooks` | `boolean` | `false` | Enable compliance hooks |
| `enableDesignSystemScanning` | `boolean` | `false` | Enable custom design system scanning |

### Network Settings

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `requestTimeoutMs` | `number` | `30000` | Request timeout in milliseconds |
| `healthCheckTimeoutMs` | `number` | `5000` | Health check timeout in milliseconds |

### Assistant Settings

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `assistantKnowledgeBasePath` | `string?` | `undefined` | Custom KB path/URL |
| `enabledAssistants` | `string[]?` | `undefined` | Filter assistants (if undefined, all enabled) |

### Branding (Optional)

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `brandName` | `string?` | `'FigmAI'` | Display name |
| `codeName` | `string?` | `'figmai_plugin'` | Internal identifier |

### Extension Points

| Field | Type | Default | Description |
|-------|------|---------|-------------|
| `componentScanner` | `string?` | `undefined` | Module path to custom component scanner |
| `complianceHook` | `string?` | `undefined` | Module path to compliance hook |
| `knowledgeBaseLoader` | `string?` | `undefined` | Module path to custom KB loader |

---

## Environment-Specific Examples

### Personal/Local Development

```json
{
  "environment": "personal",
  "defaultProvider": "openai",
  "defaultModel": "gpt-4.1-mini",
  "features": {
    "enableToolCalls": true,
    "enableVision": false,
    "enableSelectionExportPng": false
  }
}
```

### Work Environment

```json
{
  "environment": "work",
  "defaultProvider": "openai",
  "defaultModel": "internal-llm-v1",
  "features": {
    "enableToolCalls": true,
    "enableVision": true,
    "enableComplianceHooks": true,
    "enableDesignSystemScanning": true
  },
  "assistantKnowledgeBasePath": "https://internal-kb.company.com/assistants",
  "componentScanner": "./extensions/workComponentScanner",
  "complianceHook": "./extensions/workComplianceHook"
}
```

### Production

```json
{
  "environment": "production",
  "defaultProvider": "openai",
  "defaultModel": "gpt-4-turbo",
  "features": {
    "enableToolCalls": true,
    "enableVision": true,
    "enableSelectionExportPng": true
  },
  "requestTimeoutMs": 45000
}
```

---

## Settings UI Configuration

The Settings modal allows users to configure:

1. **Proxy Base URL:** Proxy server endpoint
2. **Default Model:** LLM model name/endpoint
3. **Auth Mode:** `shared_token` or `session_token`
4. **Token:** Authentication token
5. **Request Timeout:** Network timeout (ms)

Settings are saved to Figma clientStorage and persist across sessions.

---

## Configuration Validation

The configuration loader validates:

- Required fields are present
- Field types match schema
- Provider IDs are valid
- Timeout values are positive numbers
- Extension paths are valid module paths

Invalid configurations fall back to defaults and log warnings.

---

## Troubleshooting

### Config Not Loading

**Issue:** Config file not being loaded

**Solutions:**
1. Verify file name matches `config.{environment}.json`
2. Check file is in plugin root directory
3. Verify JSON syntax is valid
4. Check environment variable `FIGMAI_ENVIRONMENT` is set correctly

### Settings Override Config

**Issue:** Settings UI values override config file

**Solution:** This is expected behavior. Settings UI has higher priority. Clear settings in UI to use config file defaults.

### Extension Points Not Loading

**Issue:** Custom extensions not executing

**Solutions:**
1. Verify module path in config is correct
2. Check extension file exists and exports correctly
3. Verify extension is registered in `main.ts`
4. Check browser console for import errors

---

## Best Practices

1. **Use config files for environment-specific defaults**
2. **Use Settings UI for user preferences**
3. **Use environment variables for CI/CD or deployment**
4. **Never commit credentials to config files**
5. **Validate config on load**
6. **Document work-specific customizations**

---

## Migration from Hardcoded Values

If migrating from hardcoded values:

1. Identify hardcoded value location
2. Add to configuration schema
3. Update code to read from config
4. Set default in config file
5. Document in this guide

See `docs/migration/portability-analysis.md` for migration checklist.



