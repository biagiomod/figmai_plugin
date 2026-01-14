# Work Adapter Pattern

**For:** Developers implementing Work Plugin features  
**Purpose:** Understand the Work adapter pattern and how to override Public Plugin behavior  
**When to read:** Before implementing Work-only features or migrating to Work Plugin

---

## Purpose

The Work Adapter pattern provides a clean boundary between the Public Plugin (open source) and the Work Plugin (proprietary/internal version). All Work-only features are injected via a **single adapter file**, ensuring:

- Public Plugin remains clean and open-sourceable
- Work Plugin can override behavior without forking core logic
- Future Public updates can be pulled into Work with minimal conflicts
- Proprietary logic is isolated to one file

## Architecture

```
Public Plugin                          Work Plugin
─────────────────                     ─────────────────
core/work/loadAdapter.ts               src/work/workAdapter.override.ts
  (loader)              ────────→      (real implementations)
  ↓
core/work/defaultAdapter.ts
  (no-op fallback)
```

The Public Plugin uses a loader pattern:
1. `loadAdapter.ts` attempts to import `src/work/workAdapter.override.ts`
2. If override exists, uses it
3. If override doesn't exist, falls back to `defaultAdapter.ts` (no-op)

The Work Plugin provides a single override file that exports a `WorkAdapter`.

## How the Work Plugin Overrides

### Override File Location

Create a single file: `src/work/workAdapter.override.ts`

**IMPORTANT:** This file is NOT committed to the Public repo (see `.gitignore`).

### Override File Export Options

The override file can export a `WorkAdapter` in two ways:

#### Option 1: Default Export (Recommended)

```typescript
// src/work/workAdapter.override.ts (Work Plugin)
import type { WorkAdapter, DesignSystemInfo } from '../core/work/adapter'
import type { UniversalContentTableV1 } from '../core/types'

const workAdapter: WorkAdapter = {
  confluenceApi: {
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
  },

  designSystem: {
    async detectSystem(node: SceneNode): Promise<DesignSystemInfo | null> {
      // Real design system detection logic
      return { name: 'Internal Design System', version: '2.0' }
    },
    
    shouldIgnore(node: SceneNode): boolean {
      // Real ignore rules
      return node.name.startsWith('_ignore') || 
             node.getPluginData('figmai.ignore') === 'true'
    }
  },

  auth: {
    async getEnterpriseToken(): Promise<string> {
      // Real enterprise auth
      return await getTokenFromSSO()
    }
  }
}

export default workAdapter
```

#### Option 2: Named Export Function

```typescript
// src/work/workAdapter.override.ts (Work Plugin)
import type { WorkAdapter } from '../core/work/adapter'

export function createWorkAdapter(): WorkAdapter {
  return {
    confluenceApi: {
      // ... implementation
    },
    designSystem: {
      // ... implementation
    },
    auth: {
      // ... implementation
    }
  }
}
```

### How the Loader Works

The Public Plugin's `loadAdapter.ts`:
1. Attempts to import `../../work/workAdapter.override`
2. Checks for `default` export (WorkAdapter object)
3. Checks for `createWorkAdapter()` function export
4. Falls back to `defaultAdapter.ts` (no-op) if override doesn't exist

This allows the Public Plugin to compile and run without any Work-specific code.

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
// Load adapter (will use override if present, otherwise no-op)
const { loadWorkAdapter } = await import('./core/work/loadAdapter')
const workAdapter = await loadWorkAdapter()

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

### Step 2: Create Work Adapter Override File

Create `src/work/workAdapter.override.ts` in the Work Plugin with real implementations.

### Step 3: Export WorkAdapter

Export a `WorkAdapter` from the override file (see "How the Work Plugin Overrides" above).

### Step 4: Test Work Features

Test Confluence integration, design system detection, and enterprise auth.

### Step 5: Future Updates

When Public Plugin is updated:

1. Pull Public changes
2. Merge conflicts (if any) will only be in `src/work/workAdapter.override.ts`
3. Test Work features still work
4. Deploy

**Expected merge conflicts:** Only in `src/work/workAdapter.override.ts` (single file, not committed to Public repo)

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

See `docs/work-plugin/extension-points.md` for detailed documentation of each extension point.

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

- Check that `src/work/workAdapter.override.ts` exists and exports a valid `WorkAdapter`
- Verify the override file uses correct export format (default or `createWorkAdapter()`)
- Check that the override file path matches: `src/work/workAdapter.override.ts`
- Enable DEBUG in `loadAdapter.ts` to see loader logs

### Merge conflicts in override file

- This is expected and normal (override file is not in Public repo, but may exist locally)
- Resolve conflicts by keeping Work-specific implementations
- Test after resolving conflicts

### Public Plugin changes break Work features

- Check if Public Plugin changed extension point signatures
- Update Work adapter implementations to match new signatures
- Test Work features after updating

---

## Override File Path

**Exact path:** `src/work/workAdapter.override.ts`

**Export contract:**
- Default export: `export default workAdapter` (where `workAdapter` is a `WorkAdapter`)
- OR named export: `export function createWorkAdapter(): WorkAdapter`

**Git ignore:** This file is ignored by `.gitignore` and should NOT be committed to the Public repo.

## Summary

The Work Adapter pattern provides a clean, single-file boundary between Public and Work plugins. All proprietary logic lives in `src/work/workAdapter.override.ts`, ensuring:

- ✅ Public Plugin remains clean and open-sourceable
- ✅ Work Plugin can drop in a single override file without forking
- ✅ Public Plugin compiles and runs without override file (uses no-op adapter)
- ✅ Future updates merge cleanly (override file not in Public repo)
- ✅ Proprietary logic is isolated and secure

