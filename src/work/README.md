# Work-Only Overrides

This folder is for Work-only override files that are **NOT committed to the Public repo**.

## Purpose

The Work Plugin can drop in a single override file (`workAdapter.override.ts`) that provides proprietary implementations for Work-only features (e.g., Confluence integration, design system detection).

## Files

### `workAdapter.override.ts` (DO NOT COMMIT)

This file should export a `WorkAdapter` implementation. It can use either:

**Option 1: Default Export**
```typescript
import type { WorkAdapter } from '../core/work/adapter'

const workAdapter: WorkAdapter = {
  confluenceApi: {
    async sendTable(table, format) {
      // Work-only implementation
    }
  },
  // ... other implementations
}

export default workAdapter
```

**Option 2: Named Export Function**
```typescript
import type { WorkAdapter } from '../core/work/adapter'

export function createWorkAdapter(): WorkAdapter {
  return {
    confluenceApi: {
      async sendTable(table, format) {
        // Work-only implementation
      }
    },
    // ... other implementations
  }
}
```

## What Goes Here

- ✅ Proprietary API endpoints (Confluence, internal services)
- ✅ Enterprise authentication logic
- ✅ Internal design system detection
- ✅ Work-specific ignore rules
- ✅ Credentials and configuration (use secure storage)

## What Does NOT Go Here

- ❌ Core plugin logic (belongs in Public Plugin)
- ❌ UI components (belongs in Public Plugin)
- ❌ Provider implementations (belongs in Public Plugin)

## Git Ignore

This folder's override files are ignored by `.gitignore`:
- `workAdapter.override.ts`
- `credentials.override.ts`
- Any `*.override.ts` files

## Testing

To test locally (without committing):
1. Create `workAdapter.override.ts` in this folder
2. Export a `WorkAdapter` implementation
3. The plugin will automatically use it
4. Remove the file before committing

