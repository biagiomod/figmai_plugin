# Extension Points Guide

Guide for implementing work-specific extensions: component scanners, knowledge base loaders, compliance hooks, and custom providers.

---

## Overview

Extension points allow work environments to customize plugin behavior without modifying core code. All extensions follow a plugin architecture with interfaces and registries.

---

## Component Scanner

Detect and extract metadata from internal design system components.

### Interface

**File:** `src/core/extensions/componentScanner.ts`

```typescript
export interface ComponentScanner {
  detectDesignSystemComponent(node: SceneNode): DesignSystemComponent | null
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
```

### Implementation Example

**File:** `src/extensions/workComponentScanner.ts`

```typescript
import type { ComponentScanner, DesignSystemComponent, DesignSystemMetadata } from '../core/extensions/componentScanner'
import type { SceneNode, ComponentNode, InstanceNode } from '@figma/plugin-typings'

export class WorkComponentScanner implements ComponentScanner {
  private readonly systemPrefix = 'DS/'
  private readonly systemName = 'CompanyDesignSystem'
  
  detectDesignSystemComponent(node: SceneNode): DesignSystemComponent | null {
    // Example: Detect components with naming pattern "DS/ComponentName/Variant"
    if (node.type === 'INSTANCE') {
      const instanceNode = node as InstanceNode
      
      // Check naming pattern
      if (node.name.startsWith(this.systemPrefix)) {
        const parts = node.name.substring(this.systemPrefix.length).split('/')
        const componentName = parts[0] || 'Unknown'
        const variant = parts[1]
        
        // Extract properties
        const properties = this.extractProperties(instanceNode)
        
        return {
          systemName: this.systemName,
          componentName,
          variant,
          properties
        }
      }
      
      // Alternative: Check main component name
      if (instanceNode.mainComponent) {
        const mainName = instanceNode.mainComponent.name
        if (mainName.startsWith(this.systemPrefix)) {
          return {
            systemName: this.systemName,
            componentName: mainName.substring(this.systemPrefix.length),
            properties: this.extractProperties(instanceNode)
          }
        }
      }
    }
    
    // Check if node is a component itself
    if (node.type === 'COMPONENT') {
      const componentNode = node as ComponentNode
      if (componentNode.name.startsWith(this.systemPrefix)) {
        return {
          systemName: this.systemName,
          componentName: componentNode.name.substring(this.systemPrefix.length)
        }
      }
    }
    
    return null
  }
  
  extractMetadata(component: ComponentNode): DesignSystemMetadata | null {
    // Extract from component description or properties
    const description = component.description || ''
    
    // Example: Parse "DS v2.1.0" from description
    const versionMatch = description.match(/v(\d+\.\d+\.\d+)/)
    if (versionMatch) {
      return {
        systemName: this.systemName,
        version: versionMatch[1],
        componentLibrary: 'Company Design System'
      }
    }
    
    return null
  }
  
  private extractProperties(instanceNode: InstanceNode): Record<string, unknown> {
    const props: Record<string, unknown> = {}
    
    if (instanceNode.componentProperties) {
      for (const [key, value] of Object.entries(instanceNode.componentProperties)) {
        if (value.type === 'VARIANT') {
          props[key] = value.value
        } else if (value.type === 'TEXT') {
          props[key] = value.value
        } else if (value.type === 'BOOLEAN') {
          props[key] = value.value
        } else if (value.type === 'INSTANCE_SWAP') {
          props[key] = value.value?.name || null
        }
      }
    }
    
    return props
  }
}
```

### Registration

**File:** `src/main.ts`

```typescript
import { componentScannerRegistry } from './core/extensions/componentScanner'
import { WorkComponentScanner } from './extensions/workComponentScanner'

// Register on plugin startup
componentScannerRegistry.set('work', new WorkComponentScanner())
```

### Usage

**File:** `src/core/context/selectionSummary.ts`

```typescript
import { componentScannerRegistry, DefaultComponentScanner } from '../extensions/componentScanner'

// Get scanner (use custom if registered, otherwise default)
const scanner = componentScannerRegistry.get('work') || new DefaultComponentScanner()
const designSystemInfo = scanner.detectDesignSystemComponent(node)

if (designSystemInfo) {
  summary.designSystem = {
    system: designSystemInfo.systemName,
    component: designSystemInfo.componentName,
    variant: designSystemInfo.variant
  }
}
```

---

## Knowledge Base Loader

Load assistant knowledge bases from custom sources (e.g., internal server).

### Interface

**File:** `src/core/extensions/knowledgeBaseLoader.ts`

```typescript
export interface KnowledgeBaseLoader {
  loadKnowledgeBase(assistantId: string): Promise<string>
  listAssistants(): Promise<Assistant[]>
}
```

### Implementation Example

**File:** `src/extensions/workKnowledgeBaseLoader.ts`

```typescript
import type { KnowledgeBaseLoader, Assistant } from '../core/extensions/knowledgeBaseLoader'

export class WorkKnowledgeBaseLoader implements KnowledgeBaseLoader {
  private baseUrl: string
  
  constructor(baseUrl: string) {
    this.baseUrl = baseUrl
  }
  
  async loadKnowledgeBase(assistantId: string): Promise<string> {
    try {
      const url = `${this.baseUrl}/${assistantId}.md`
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'text/markdown'
        }
      })
      
      if (!response.ok) {
        throw new Error(`Failed to load KB: ${response.status} ${response.statusText}`)
      }
      
      return await response.text()
    } catch (error) {
      console.error(`[WorkKBLoader] Failed to load KB for ${assistantId}:`, error)
      // Fallback to default
      return this.getDefaultKnowledgeBase(assistantId)
    }
  }
  
  async listAssistants(): Promise<Assistant[]> {
    try {
      const url = `${this.baseUrl}/assistants.json`
      const response = await fetch(url)
      
      if (!response.ok) {
        throw new Error(`Failed to load assistants: ${response.status}`)
      }
      
      const data = await response.json()
      return data.assistants || []
    } catch (error) {
      console.error('[WorkKBLoader] Failed to load assistants:', error)
      // Fallback to default
      return this.getDefaultAssistants()
    }
  }
  
  private getDefaultKnowledgeBase(assistantId: string): string {
    // Fallback to bundled knowledge bases
    // This would load from src/assistants/{assistantId}.md
    return `# ${assistantId} Assistant\n\nDefault knowledge base.`
  }
  
  private getDefaultAssistants(): Assistant[] {
    // Fallback to default assistants
    return []
  }
}
```

### Registration

**File:** `src/main.ts`

```typescript
import { knowledgeBaseLoaderRegistry } from './core/extensions/knowledgeBaseLoader'
import { WorkKnowledgeBaseLoader } from './extensions/workKnowledgeBaseLoader'
import { getSettings } from './core/settings'

// Register on plugin startup
async function initializeKnowledgeBaseLoader() {
  const settings = await getSettings()
  if (settings.customKnowledgeBaseUrl) {
    const loader = new WorkKnowledgeBaseLoader(settings.customKnowledgeBaseUrl)
    knowledgeBaseLoaderRegistry.set('work', loader)
  }
}

initializeKnowledgeBaseLoader()
```

---

## Compliance Hook

Implement compliance logging, request validation, and response sanitization.

### Interface

**File:** `src/core/extensions/complianceHook.ts`

```typescript
export interface ComplianceHook {
  validateRequest(request: ChatRequest): Promise<ComplianceResult>
  sanitizeResponse(response: string): Promise<string>
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
```

### Implementation Example

**File:** `src/extensions/workComplianceHook.ts`

```typescript
import type { ComplianceHook, ComplianceResult, InteractionLog } from '../core/extensions/complianceHook'
import type { ChatRequest } from '../core/provider/provider'

export class WorkComplianceHook implements ComplianceHook {
  private readonly logEndpoint: string
  private readonly restrictedAssistants: string[]
  private readonly sensitivePatterns: RegExp[]
  
  constructor(config: {
    logEndpoint: string
    restrictedAssistants?: string[]
    sensitivePatterns?: RegExp[]
  }) {
    this.logEndpoint = config.logEndpoint
    this.restrictedAssistants = config.restrictedAssistants || []
    this.sensitivePatterns = config.sensitivePatterns || []
  }
  
  async validateRequest(request: ChatRequest): Promise<ComplianceResult> {
    // Block restricted assistants
    if (request.assistantId && this.restrictedAssistants.includes(request.assistantId)) {
      return {
        allowed: false,
        reason: `Assistant '${request.assistantId}' is not allowed in work environment`
      }
    }
    
    // Sanitize request (remove sensitive data)
    const sanitized = this.sanitizeRequest(request)
    
    return {
      allowed: true,
      sanitizedRequest: sanitized
    }
  }
  
  async sanitizeResponse(response: string): Promise<string> {
    let sanitized = response
    
    // Remove sensitive patterns
    for (const pattern of this.sensitivePatterns) {
      sanitized = sanitized.replace(pattern, '[REDACTED]')
    }
    
    return sanitized
  }
  
  async logInteraction(interaction: InteractionLog): Promise<void> {
    try {
      await fetch(this.logEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(interaction)
      })
    } catch (error) {
      console.error('[ComplianceHook] Failed to log interaction:', error)
      // Don't throw - logging failure shouldn't block user
    }
  }
  
  private sanitizeRequest(request: ChatRequest): ChatRequest {
    // Create sanitized copy
    const sanitized: ChatRequest = {
      ...request,
      messages: request.messages.map(msg => {
        let content = msg.content
        
        // Remove sensitive patterns from messages
        for (const pattern of this.sensitivePatterns) {
          content = content.replace(pattern, '[REDACTED]')
        }
        
        return {
          ...msg,
          content
        }
      })
    }
    
    // Sanitize selection summary if present
    if (sanitized.selectionSummary) {
      for (const pattern of this.sensitivePatterns) {
        sanitized.selectionSummary = sanitized.selectionSummary.replace(pattern, '[REDACTED]')
      }
    }
    
    return sanitized
  }
}
```

### Registration

**File:** `src/main.ts`

```typescript
import { complianceHookRegistry } from './core/extensions/complianceHook'
import { WorkComplianceHook } from './extensions/workComplianceHook'
import { getSettings } from './core/settings'

// Register on plugin startup
async function initializeComplianceHook() {
  const settings = await getSettings()
  if (settings.complianceMode) {
    const hook = new WorkComplianceHook({
      logEndpoint: 'https://internal-logging.company.com/api/logs',
      restrictedAssistants: ['restricted-assistant'],
      sensitivePatterns: [
        /internal-company-name/gi,
        /confidential-pattern/gi
      ]
    })
    complianceHookRegistry.set('work', hook)
  }
}

initializeComplianceHook()
```

### Usage

**File:** `src/main.ts` (in message handler)

```typescript
import { complianceHookRegistry } from './core/extensions/complianceHook'

// Before sending request
const hook = complianceHookRegistry.get('work')
if (hook) {
  const validation = await hook.validateRequest(request)
  if (!validation.allowed) {
    sendAssistantMessage(`Request blocked: ${validation.reason}`)
    return
  }
  
  // Use sanitized request if provided
  request = validation.sanitizedRequest || request
}

// After receiving response
let response = await provider.sendChat(request)

if (hook) {
  // Sanitize response
  response = await hook.sanitizeResponse(response)
  
  // Log interaction
  await hook.logInteraction({
    timestamp: Date.now(),
    assistantId: request.assistantId || 'unknown',
    requestPreview: request.messages[request.messages.length - 1]?.content.substring(0, 100) || '',
    responsePreview: response.substring(0, 100)
  })
}
```

---

## Custom Provider

Implement custom LLM provider for work-specific LLM endpoints.

### Interface

**File:** `src/core/provider/provider.ts`

```typescript
export interface Provider {
  readonly id: string
  readonly label: string
  readonly isEnabled: boolean
  readonly capabilities: ProviderCapabilities
  
  sendChat(request: ChatRequest): Promise<string>
  testConnection(): Promise<{ success: boolean; message: string }>
  sendChatStream?(request: ChatRequest): AsyncIterable<string>
}
```

### Implementation Example

**File:** `src/extensions/workProvider.ts`

```typescript
import type { Provider, ChatRequest, ProviderCapabilities } from '../core/provider/provider'
import { getSettings } from '../core/settings'

export class WorkProvider implements Provider {
  readonly id = 'work-llm'
  readonly label = 'Work LLM'
  readonly isEnabled = true
  
  readonly capabilities: ProviderCapabilities = {
    supportsImages: true,
    supportsMarkdown: true,
    requiresStrictSchema: false,
    maxImages: 5
  }
  
  async sendChat(request: ChatRequest): Promise<string> {
    const settings = await getSettings()
    const baseUrl = settings.proxyBaseUrl || 'https://internal-llm.company.com'
    
    const response = await fetch(`${baseUrl}/v1/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.sessionToken}`
      },
      body: JSON.stringify({
        model: settings.defaultModel,
        messages: request.messages,
        assistantId: request.assistantId
      })
    })
    
    if (!response.ok) {
      throw new Error(`Work LLM request failed: ${response.status}`)
    }
    
    const data = await response.json()
    return data.content || data.text || ''
  }
  
  async testConnection(): Promise<{ success: boolean; message: string }> {
    const settings = await getSettings()
    const baseUrl = settings.proxyBaseUrl || 'https://internal-llm.company.com'
    
    try {
      const response = await fetch(`${baseUrl}/health`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${settings.sessionToken}`
        }
      })
      
      if (response.ok) {
        return { success: true, message: 'Connection successful' }
      } else {
        return { success: false, message: `Connection failed: ${response.status}` }
      }
    } catch (error) {
      return { success: false, message: `Connection error: ${error}` }
    }
  }
}
```

### Registration

**File:** `src/core/provider/providerFactory.ts`

```typescript
import { WorkProvider } from '../extensions/workProvider'

export async function createProvider(providerId?: LlmProviderId): Promise<Provider> {
  const id = providerId || CONFIG.provider
  
  // Check for custom provider
  if (id === 'work-llm') {
    return new WorkProvider()
  }
  
  // ... existing provider logic
}
```

---

## Configuration

Configure extensions in `config.work.json`:

```json
{
  "environment": "work",
  "componentScanner": "./extensions/workComponentScanner",
  "complianceHook": "./extensions/workComplianceHook",
  "knowledgeBaseLoader": "./extensions/workKnowledgeBaseLoader"
}
```

Or via environment variables:

```bash
FIGMAI_COMPONENT_SCANNER=./extensions/workComponentScanner
FIGMAI_COMPLIANCE_HOOK=./extensions/workComplianceHook
FIGMAI_KB_LOADER=./extensions/workKnowledgeBaseLoader
```

---

## Testing Extensions

### Test Component Scanner

```typescript
import { WorkComponentScanner } from './extensions/workComponentScanner'

const scanner = new WorkComponentScanner()
const result = scanner.detectDesignSystemComponent(node)
console.log('Detected:', result)
```

### Test Compliance Hook

```typescript
import { WorkComplianceHook } from './extensions/workComplianceHook'

const hook = new WorkComplianceHook({
  logEndpoint: 'http://localhost:3000/logs'
})

const validation = await hook.validateRequest(request)
console.log('Validation:', validation)
```

### Test Knowledge Base Loader

```typescript
import { WorkKnowledgeBaseLoader } from './extensions/workKnowledgeBaseLoader'

const loader = new WorkKnowledgeBaseLoader('https://internal-kb.company.com')
const kb = await loader.loadKnowledgeBase('general')
console.log('KB loaded:', kb.substring(0, 100))
```

---

## Best Practices

1. **Error Handling:** Always handle errors gracefully, fallback to defaults
2. **Logging:** Log extension activity for debugging
3. **Performance:** Cache results when possible (e.g., KB loading)
4. **Validation:** Validate inputs and outputs
5. **Documentation:** Document extension behavior and configuration

---

## Troubleshooting

### Extension Not Loading

- Verify module path in config is correct
- Check extension file exists and exports correctly
- Verify extension is registered in `main.ts`
- Check browser console for import errors

### Extension Not Executing

- Verify extension is registered before use
- Check registry key matches config
- Verify extension interface is implemented correctly
- Check for errors in extension code

### Performance Issues

- Cache expensive operations (e.g., KB loading)
- Use async operations for network calls
- Limit data processing (e.g., selection summaries)



