# Work Adapter Pattern

## Purpose

The Work Adapter pattern provides a clean boundary between the Public Plugin (open source) and the Work Plugin (proprietary/internal version). All Work-only features are injected via a **single adapter file**, ensuring:

- Public Plugin remains clean and open-sourceable
- Work Plugin can override behavior without forking core logic
- Future Public updates can be pulled into Work with minimal conflicts
- Proprietary logic is isolated to one file

## Architecture

```
Public Plugin                    Work Plugin
─────────────────               ─────────────────
core/work/adapter.ts            work/adapter.ts
  (stubs)            ────────→    (real implementations)
```

The Public Plugin defines stubs in `core/work/adapter.ts`:

```typescript
export const workAdapter: WorkAdapter = {
  confluenceApi: undefined, // Work will override
  designSystem: undefined, // Work will override
  auth: undefined // Work will override
}
```

The Work Plugin overrides these stubs with real implementations.

## How the Work Plugin Overrides

### Method 1: Module Replacement (Recommended)

The Work Plugin can use module replacement to override the adapter:

```typescript
// work/adapter.ts (Work Plugin)
import { workAdapter } from '../core/work/adapter'

// Override stubs with real implementations
workAdapter.confluenceApi = {
  async sendTable(table: UniversalContentTableV1, format: string): Promise<void> {
    // Real Confluence API call
    const response = await fetch('https://confluence.internal/api/...', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${await getEnterpriseToken()}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        table: table,
        format: format
      })
    })
    if (!response.ok) {
      throw new Error(`Confluence API error: ${response.statusText}`)
    }
  }
}

workAdapter.designSystem = {
  async detectSystem(node: SceneNode): Promise<DesignSystemInfo | null> {
    // Real design system detection logic
    // Check node properties, component library, etc.
    return { name: 'Internal Design System', version: '2.0' }
  },
  
  shouldIgnore(node: SceneNode): boolean {
    // Real ignore rules
    // Check node name patterns, component properties, etc.
    return node.name.startsWith('_ignore') || 
           node.getPluginData('figmai.ignore') === 'true'
  }
}

workAdapter.auth = {
  async getEnterpriseToken(): Promise<string> {
    // Real enterprise auth
    // Get token from secure storage, SSO, etc.
    return await getTokenFromSSO()
  }
}
```

### Method 2: Direct Import Override

Alternatively, the Work Plugin can directly import and override:

```typescript
// In Work Plugin's entry point or initialization
import { workAdapter } from './core/work/adapter'
import { setupWorkAdapter } from './work/adapter'

setupWorkAdapter(workAdapter)
```

## What Belongs in the Work-Only File

### ✅ Credentials

- API keys
- Endpoints (Confluence, internal services)
- Authentication tokens
- SSO configuration

### ✅ Internal Integrations

- Confluence API client
- Internal design system detection
- Enterprise authentication
- Internal tooling APIs

### ✅ Proprietary Logic

- Company-specific ignore rules
- Internal design system patterns
- Enterprise-specific workflows
- Confidential business logic

### ❌ What Should NOT Be in Work-Only File

- Core rendering logic (use Public Plugin)
- Provider implementations (use Public Plugin)
- Handler logic (add to Public Plugin or create new handlers)
- UI components (use Public Plugin)

## Example Override Flow

### Public Plugin (core/work/adapter.ts)

```typescript
export const workAdapter: WorkAdapter = {
  confluenceApi: undefined, // Stub
  designSystem: undefined, // Stub
  auth: undefined // Stub
}
```

### Work Plugin (work/adapter.ts)

```typescript
import { workAdapter } from '../core/work/adapter'
import type { UniversalContentTableV1 } from '../core/types'

// Override Confluence API
workAdapter.confluenceApi = {
  async sendTable(table: UniversalContentTableV1, format: string): Promise<void> {
    // Implementation
  }
}

// Override design system detection
workAdapter.designSystem = {
  async detectSystem(node: SceneNode) {
    // Implementation
  },
  shouldIgnore(node: SceneNode): boolean {
    // Implementation
  }
}

// Override auth
workAdapter.auth = {
  async getEnterpriseToken(): Promise<string> {
    // Implementation
  }
}
```

### Public Plugin Usage (ui.tsx)

```typescript
// Dynamically import adapter
const { workAdapter } = await import('./core/work/adapter')

if (workAdapter.confluenceApi) {
  await workAdapter.confluenceApi.sendTable(table, format)
} else {
  // Fallback: copy to clipboard
  await handleCopyTable(format, 'html')
}
```

## Migration Path

### Step 1: Copy Public Plugin

Copy the entire Public Plugin codebase to the Work Plugin repository.

### Step 2: Create Work Adapter File

Create `work/adapter.ts` in the Work Plugin with real implementations.

### Step 3: Override Adapter

Use module replacement or direct import to override the adapter stubs.

### Step 4: Test Work Features

Test Confluence integration, design system detection, and enterprise auth.

### Step 5: Future Updates

When Public Plugin is updated:

1. Pull Public changes
2. Merge conflicts (if any) will only be in `work/adapter.ts`
3. Test Work features still work
4. Deploy

**Expected merge conflicts:** Only in `work/adapter.ts` (single file)

## Extension Points

The Public Plugin calls the Work adapter at these points:

1. **Content Table Scanner** (`core/contentTable/scanner.ts`)
   - Calls `workAdapter.designSystem?.shouldIgnore(node)` to filter nodes

2. **UI Confluence Integration** (`ui.tsx`)
   - Calls `workAdapter.confluenceApi?.sendTable(table, format)` to send tables

3. **Design System Detection** (where needed)
   - Calls `workAdapter.designSystem?.detectSystem(node)` to detect design systems

4. **Enterprise Auth** (where needed)
   - Calls `workAdapter.auth?.getEnterpriseToken()` to get auth tokens

See `docs/EXTENSION_POINTS.md` for detailed documentation of each extension point.

## Best Practices

### ✅ DO

- Keep all Work-only logic in `work/adapter.ts`
- Use optional chaining (`?.`) when calling adapter methods
- Provide fallbacks when adapter methods are undefined
- Document Work-specific behavior in adapter file
- Test adapter methods independently

### ❌ DON'T

- Don't add `if (isWork)` checks in Public Plugin code
- Don't duplicate core logic in Work Plugin
- Don't modify Public Plugin core files
- Don't scatter Work logic across multiple files
- Don't hardcode Work-specific endpoints in Public Plugin

## Security Considerations

- **Credentials**: Never commit credentials to version control
- **Endpoints**: Use environment variables or secure storage
- **Tokens**: Store tokens securely (not in localStorage for sensitive data)
- **API Keys**: Use secure key management systems

## Testing

Test the Work adapter independently:

```typescript
// work/adapter.test.ts
import { workAdapter } from '../core/work/adapter'
import { setupWorkAdapter } from './adapter'

describe('Work Adapter', () => {
  beforeEach(() => {
    setupWorkAdapter(workAdapter)
  })
  
  it('should send table to Confluence', async () => {
    const table = { /* test data */ }
    await workAdapter.confluenceApi?.sendTable(table, 'html')
    // Assert
  })
  
  it('should detect design system', async () => {
    const node = { /* test node */ }
    const system = await workAdapter.designSystem?.detectSystem(node)
    // Assert
  })
})
```

## Troubleshooting

### Adapter methods are undefined

- Check that Work Plugin's `work/adapter.ts` is properly overriding stubs
- Verify module replacement is working
- Check import paths

### Merge conflicts in adapter file

- This is expected and normal
- Resolve conflicts by keeping Work-specific implementations
- Test after resolving conflicts

### Public Plugin changes break Work features

- Check if Public Plugin changed extension point signatures
- Update Work adapter implementations to match new signatures
- Test Work features after updating

---

## Summary

The Work Adapter pattern provides a clean, single-file boundary between Public and Work plugins. All proprietary logic lives in `work/adapter.ts`, ensuring:

- ✅ Public Plugin remains clean and open-sourceable
- ✅ Work Plugin can override behavior without forking
- ✅ Future updates merge cleanly (conflicts only in adapter file)
- ✅ Proprietary logic is isolated and secure

