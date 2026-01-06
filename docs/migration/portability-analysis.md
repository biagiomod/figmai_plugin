# Portability & Migration Analysis

**Date:** 2024-12-19  
**Scope:** FigmAI Plugin + Proxy Platform  
**Focus:** Migration readiness for restricted work environments

---

## Executive Summary

The codebase is **mostly portable** with good separation of concerns, but several hardcoded values and configuration gaps need addressing before migration to restricted work environments. The proxy-based architecture is well-suited for enterprise deployments, but configuration must be fully externalized.

**Overall Portability Score:** 🟡 **Good (75/100)**

**Critical Issues:** 3  
**Medium Issues:** 5  
**Low Issues:** 2

---

## 1. Risk & Portability Findings

### 🔴 **CRITICAL** - Hardcoded Default Values

#### 1.1 Default Model Name
**Location:** `src/core/settings.ts:20`, `src/ui/components/SettingsModal.tsx:24,48,75,92,220`
- **Issue:** Default model `'gpt-4.1-mini'` hardcoded in multiple places
- **Impact:** Work environments may use different model names (e.g., internal LLM endpoints)
- **Risk:** High - Requires code changes to support different default models
- **Fix:** Move to `CONFIG` with environment-aware defaults

#### 1.2 Provider Selection Logic
**Location:** `src/core/config.ts:9`, `src/core/provider/providerFactory.ts:14-34`
- **Issue:** Default provider `'openai'` hardcoded; provider factory has hardcoded switch logic
- **Impact:** Work environments may require different providers or provider selection rules
- **Risk:** High - Provider selection not configurable
- **Fix:** Make provider selection configurable via settings/config

#### 1.3 Assistant Knowledge Base Paths
**Location:** `src/assistants/index.ts:44,163,196,232,274,301`
- **Issue:** Knowledge base markdown files referenced in comments but loaded inline
- **Impact:** Work environments may need to override or extend knowledge bases
- **Risk:** Medium - No extension point for custom knowledge bases
- **Fix:** Create knowledge base loader interface with configurable paths

### 🟡 **MEDIUM** - Configuration Gaps

#### 2.1 Feature Flags Not Environment-Aware
**Location:** `src/core/config.ts:12-16`
- **Issue:** Feature flags hardcoded; no environment-specific overrides
- **Impact:** Work environments may need different feature sets (e.g., disable vision, enable compliance hooks)
- **Risk:** Medium - Requires code changes for different feature sets
- **Fix:** Support environment-specific feature flags via config

#### 2.2 Timeout Values
**Location:** `src/core/settings.ts:21`
- **Issue:** Default timeout `30000ms` hardcoded
- **Impact:** Work environments may have slower networks or stricter timeouts
- **Risk:** Low-Medium - May cause issues in restricted networks
- **Fix:** Make configurable with environment-aware defaults

#### 2.3 Brand Name Hardcoded
**Location:** `src/core/brand.ts:8`
- **Issue:** Brand name `'FigmAI'` hardcoded
- **Impact:** Work environments may need white-labeling
- **Risk:** Low - Cosmetic but may be required for enterprise
- **Fix:** Make configurable (optional)

#### 2.4 Assistant Registry Hardcoded
**Location:** `src/assistants/index.ts:84-341`
- **Issue:** All assistants defined in code; no way to add/remove assistants without code changes
- **Impact:** Work environments may need custom assistants or disable certain ones
- **Fix:** Create assistant registry loader with configurable sources

#### 2.5 Component Detection Logic
**Location:** `src/core/context/selectionSummary.ts:262-268`
- **Issue:** Component detection uses generic Figma API; no hooks for work-specific design system detection
- **Impact:** Work environments may need to detect internal design system components differently
- **Risk:** Medium - Extension point needed for custom component detection
- **Fix:** Create component scanner interface

### 🟢 **LOW** - Minor Issues

#### 3.1 Placeholder Text
**Location:** `src/ui/components/SettingsModal.tsx:199,220`
- **Issue:** Placeholder text `"https://proxy.example.com"` and `"gpt-4.1-mini"` hardcoded
- **Impact:** Minor - Just UI text
- **Risk:** Low
- **Fix:** Move to config or constants

#### 3.2 Auth Mode Labels
**Location:** `src/ui/components/SettingsModal.tsx:252-253`
- **Issue:** Auth mode labels hardcoded ("Personal", "Commercial")
- **Impact:** Minor - May need work-specific labels
- **Risk:** Low
- **Fix:** Make configurable

---

## 2. Required Configuration Changes

### 2.1 Enhanced Configuration Schema

**File:** `src/core/config.ts`

```typescript
export interface EnvironmentConfig {
  // Provider settings
  defaultProvider: LlmProviderId
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
  assistantKnowledgeBasePath?: string // Optional: override KB path
  enabledAssistants?: string[] // Optional: filter assistants
  
  // Branding (optional)
  brandName?: string
  codeName?: string
  
  // Extension points
  componentScanner?: string // Module path to custom scanner
  complianceHook?: string // Module path to compliance hook
}

// Environment detection
export type Environment = 'personal' | 'work' | 'production'

export function getEnvironmentConfig(env: Environment): EnvironmentConfig {
  // Load from config file, env vars, or use defaults
}
```

### 2.2 Settings Schema Extensions

**File:** `src/core/settings.ts`

Add to `Settings` interface:
```typescript
export interface Settings {
  // Existing fields...
  proxyBaseUrl: string
  authMode: 'shared_token' | 'session_token'
  sharedToken?: string
  sessionToken?: string
  defaultModel: string
  requestTimeoutMs: number
  
  // New fields for work environments
  environment?: 'personal' | 'work' | 'production'
  customKnowledgeBaseUrl?: string // For work-specific KBs
  designSystemComponentPrefix?: string // For work-specific component detection
  complianceMode?: boolean
}
```

### 2.3 Configuration Loading Strategy

**Priority Order:**
1. Environment variables (highest priority)
2. Config file (`config.json` or `config.{env}.json`)
3. Settings UI (user-configurable)
4. Defaults (fallback)

**Implementation:**
- Create `src/core/config/loader.ts` to handle multi-source config loading
- Support `.env` files for local development
- Support `config.work.json` for work environments
- Validate config schema on load

---

## 3. Recommended Extension Points

### 3.1 Component Scanner Interface

**File:** `src/core/extensions/componentScanner.ts`

```typescript
export interface ComponentScanner {
  /**
   * Detect if a node is part of a design system
   * @param node - Figma node to analyze
   * @returns Component metadata or null if not a design system component
   */
  detectDesignSystemComponent(node: SceneNode): DesignSystemComponent | null
  
  /**
   * Extract design system metadata from component
   * @param component - Component node
   * @returns Metadata including system name, version, variant info
   */
  extractMetadata(component: ComponentNode): DesignSystemMetadata | null
}

export interface DesignSystemComponent {
  systemName: string
  componentName: string
  variant?: string
  version?: string
  properties?: Record<string, unknown>
}

export interface DesignSystemMetadata {
  systemName: string
  version: string
  componentLibrary: string
}

// Default implementation (generic Figma component detection)
export class DefaultComponentScanner implements ComponentScanner {
  detectDesignSystemComponent(node: SceneNode): DesignSystemComponent | null {
    // Current logic from selectionSummary.ts
    return null
  }
  
  extractMetadata(component: ComponentNode): DesignSystemMetadata | null {
    return null
  }
}

// Registry for custom scanners
export const componentScannerRegistry = new Map<string, ComponentScanner>()
```

**Usage in `selectionSummary.ts`:**
```typescript
import { componentScannerRegistry, DefaultComponentScanner } from '../extensions/componentScanner'

const scanner = componentScannerRegistry.get('custom') || new DefaultComponentScanner()
const designSystemInfo = scanner.detectDesignSystemComponent(node)
```

### 3.2 Knowledge Base Loader Interface

**File:** `src/core/extensions/knowledgeBaseLoader.ts`

```typescript
export interface KnowledgeBaseLoader {
  /**
   * Load knowledge base content for an assistant
   * @param assistantId - Assistant identifier
   * @returns Knowledge base markdown content
   */
  loadKnowledgeBase(assistantId: string): Promise<string>
  
  /**
   * Get list of available assistants
   * @returns Assistant definitions
   */
  listAssistants(): Promise<Assistant[]>
}

// Default implementation (loads from src/assistants/*.md)
export class DefaultKnowledgeBaseLoader implements KnowledgeBaseLoader {
  async loadKnowledgeBase(assistantId: string): Promise<string> {
    // Load from bundled markdown files or fetch from URL
  }
  
  async listAssistants(): Promise<Assistant[]> {
    // Return default assistants from index.ts
  }
}

// Registry for custom loaders
export const knowledgeBaseLoaderRegistry = new Map<string, KnowledgeBaseLoader>()
```

### 3.3 Compliance Hook Interface

**File:** `src/core/extensions/complianceHook.ts`

```typescript
export interface ComplianceHook {
  /**
   * Validate request before sending to LLM
   * @param request - Chat request
   * @returns Validation result
   */
  validateRequest(request: ChatRequest): Promise<ComplianceResult>
  
  /**
   * Sanitize response before displaying
   * @param response - LLM response
   * @returns Sanitized response
   */
  sanitizeResponse(response: string): Promise<string>
  
  /**
   * Log interaction for compliance
   * @param interaction - Interaction data
   */
  logInteraction(interaction: InteractionLog): Promise<void>
}

export interface ComplianceResult {
  allowed: boolean
  reason?: string
  sanitizedRequest?: ChatRequest
}

export interface InteractionLog {
  timestamp: number
  assistantId: string
  userId?: string
  requestPreview: string
  responsePreview: string
  metadata?: Record<string, unknown>
}

// Default implementation (no-op, allows all)
export class DefaultComplianceHook implements ComplianceHook {
  async validateRequest(request: ChatRequest): Promise<ComplianceResult> {
    return { allowed: true }
  }
  
  async sanitizeResponse(response: string): Promise<string> {
    return response
  }
  
  async logInteraction(interaction: InteractionLog): Promise<void> {
    // No-op
  }
}

// Registry
export const complianceHookRegistry = new Map<string, ComplianceHook>()
```

### 3.4 Provider Factory Extension

**File:** `src/core/provider/providerFactory.ts`

Add support for custom providers:
```typescript
export interface CustomProviderConfig {
  id: string
  label: string
  modulePath: string // Path to provider implementation
  capabilities: ProviderCapabilities
}

export function registerCustomProvider(config: CustomProviderConfig): void {
  // Dynamically load and register provider
}
```

---

## 4. Documentation Requirements

### 4.1 Files to Create/Update

1. **`docs/migration/work-environment.md`** ⭐ NEW
   - Pre-migration checklist
   - Step-by-step migration guide
   - Environment-specific configuration
   - Troubleshooting

2. **`docs/configuration.md`** ⭐ NEW
   - Configuration schema reference
   - Environment variables
   - Config file format
   - Settings UI guide

3. **`docs/security.md`** ⭐ NEW
   - Data storage locations
   - Credential management
   - Network security
   - Compliance considerations

4. **`docs/migration/extension-points.md`** ⭐ NEW
   - Component scanner implementation guide
   - Knowledge base loader guide
   - Compliance hook guide
   - Custom provider guide

5. **`README.md`** - Update with migration section
6. **`docs/proxy-and-plugin-setup.md`** - Add work environment section

---

## 5. Verification Checklist

### Pre-Migration Checklist

- [ ] **Node/npm restrictions**
  - [ ] Verify Node.js version compatibility (check `package.json` engines)
  - [ ] Check if npm registry access is restricted
  - [ ] Verify build tools are allowed (TypeScript, bundler)
  - [ ] Check if external dependencies are whitelisted

- [ ] **Networking**
  - [ ] Verify proxy server URL is accessible from work network
  - [ ] Check CORS policies for proxy requests
  - [ ] Verify firewall rules allow outbound HTTPS
  - [ ] Test proxy health check endpoint accessibility

- [ ] **Authentication**
  - [ ] Verify auth token format matches work requirements
  - [ ] Check if session tokens are supported
  - [ ] Verify token storage location is compliant
  - [ ] Test authentication flow

- [ ] **Configuration**
  - [ ] Create `config.work.json` with work-specific settings
  - [ ] Set environment variables if required
  - [ ] Verify default model name matches work LLM
  - [ ] Configure feature flags for work environment

### Migration Steps

1. **Code Changes (Minimal)**
   - [ ] Update `CONFIG` to use environment-aware defaults
   - [ ] Add configuration loader
   - [ ] Implement extension point interfaces
   - [ ] Update settings schema

2. **Configuration Setup**
   - [ ] Create `config.work.json` with work settings
   - [ ] Set `defaultModel` to work LLM endpoint
   - [ ] Configure `proxyBaseUrl` to work proxy
   - [ ] Set `environment: 'work'` in settings
   - [ ] Configure feature flags

3. **Extension Implementation (If Needed)**
   - [ ] Implement custom component scanner (if required)
   - [ ] Implement custom knowledge base loader (if required)
   - [ ] Implement compliance hook (if required)
   - [ ] Register extensions in config

4. **Testing**
   - [ ] Test proxy connection
   - [ ] Test assistant selection
   - [ ] Test quick actions
   - [ ] Test tool calls
   - [ ] Test compliance hooks (if implemented)

### Validation Steps

- [ ] **Health Check**
  - [ ] Proxy health check succeeds
  - [ ] Settings load correctly
  - [ ] Provider initializes

- [ ] **Functional Tests**
  - [ ] Select assistant → assistant loads
  - [ ] Send message → response received
  - [ ] Run quick action → action executes
  - [ ] Export selection → images exported (if enabled)

- [ ] **Work-Specific Tests**
  - [ ] Custom component detection works (if implemented)
  - [ ] Custom knowledge bases load (if implemented)
  - [ ] Compliance hooks execute (if implemented)
  - [ ] Custom providers work (if implemented)

- [ ] **Security Validation**
  - [ ] Credentials stored securely (Figma clientStorage)
  - [ ] No credentials in logs
  - [ ] Network requests use HTTPS
  - [ ] Compliance logging works (if implemented)

---

## 6. Implementation Priority

### Phase 1: Critical (Required for Migration)
1. ✅ Externalize default model name
2. ✅ Make provider selection configurable
3. ✅ Add environment-aware configuration loader
4. ✅ Create extension point interfaces

### Phase 2: Important (Recommended)
5. ✅ Make feature flags environment-aware
6. ✅ Create knowledge base loader interface
7. ✅ Create component scanner interface
8. ✅ Add compliance hook interface

### Phase 3: Nice to Have (Optional)
9. ✅ Make brand name configurable
10. ✅ Add assistant registry loader
11. ✅ Externalize timeout values

---

## 7. Migration Effort Estimate

- **Phase 1 (Critical):** 4-6 hours
- **Phase 2 (Important):** 6-8 hours
- **Phase 3 (Optional):** 2-4 hours
- **Documentation:** 4-6 hours
- **Testing & Validation:** 4-6 hours

**Total:** 20-30 hours for complete migration readiness

---

## 8. Next Steps

1. Review this analysis with team
2. Prioritize implementation phases
3. Create implementation tickets
4. Begin Phase 1 implementation
5. Create documentation as implementation progresses



