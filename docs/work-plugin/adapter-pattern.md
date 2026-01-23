# Custom Adapter Pattern

**For:** Developers implementing Custom Plugin features  
**Purpose:** Understand the custom adapter pattern and how to override Public Plugin behavior  
**When to read:** Before implementing custom-only features or migrating to Custom Plugin

---

## Purpose

The Custom Adapter pattern provides a clean boundary between the Public Plugin (open source) and the Custom Plugin (proprietary/internal version). All custom-only features are injected via a **single adapter file**, ensuring:

- Public Plugin remains clean and open-sourceable
- Custom Plugin can override behavior without forking core logic
- Future Public updates can be pulled into Custom with minimal conflicts
- Proprietary logic is isolated to one file

## Architecture

```
Public Plugin                          Custom Plugin
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

The Custom Plugin provides a single override file that exports a `WorkAdapter`.

## How the Custom Plugin Overrides

### Override File Location

Create a single file: `src/work/workAdapter.override.ts`

**IMPORTANT:** This file is NOT committed to the Public repo (see `.gitignore`).

### Override File Export Options

The override file can export a `WorkAdapter` in two ways:

#### Option 1: Default Export (Recommended)

```typescript
// src/work/workAdapter.override.ts (Custom Plugin)
import type { WorkAdapter } from '../core/work/adapter'
import { createDefaultWorkAdapter } from '../core/work/defaultAdapter'

const workAdapter: WorkAdapter = {
  ...createDefaultWorkAdapter(),
  // Implement custom-only features here
}

export default workAdapter
```

#### Option 2: Named Export Function

```typescript
// src/work/workAdapter.override.ts (Custom Plugin)
import type { WorkAdapter } from '../core/work/adapter'

export function createWorkAdapter(): WorkAdapter {
  return {
    // ... implementation
  }
}
```

### How the Loader Works

The Public Plugin's `loadAdapter.ts`:
1. Attempts to import `../../work/workAdapter.override`
2. Checks for `default` export (WorkAdapter object) or `createWorkAdapter()` function
3. Falls back to `defaultAdapter.ts` (no-op) if override doesn't exist

This allows the Public Plugin to compile and run without any custom-specific code.

## What Belongs in the Custom-Only File

### ✅ Credentials
- API keys, endpoints, authentication tokens, SSO configuration

### ✅ Internal Integrations
- Confluence API client, internal design system detection, enterprise authentication

### ✅ Proprietary Logic
- Company-specific ignore rules, internal design system patterns, enterprise workflows

### ❌ What Should NOT Be in Custom-Only File
- Core rendering logic, provider implementations, handler logic, UI components (use Public Plugin)

## Public Plugin Usage

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

1. **Copy Public Plugin** to Custom Plugin repository
2. **Create override file:** `src/work/workAdapter.override.ts` with implementations
3. **Export WorkAdapter** (see "How the Custom Plugin Overrides" above)
4. **Test custom features:** Confluence integration, design system detection, enterprise auth
5. **Future updates:** Pull Public changes; merge conflicts only in override file

**Expected merge conflicts:** Only in `src/work/workAdapter.override.ts` (single file, not committed to Public repo)

## Extension Points

The Public Plugin calls the custom adapter at extension points throughout the codebase. See **[Extension Points](extension-points.md)** [REFERENCE] for complete documentation.

## Best Practices

### ✅ DO
- Keep all custom-only logic in `src/work/workAdapter.override.ts`
- Use optional chaining (`?.`) when calling adapter methods
- Provide fallbacks when adapter methods are undefined
- Document custom-specific behavior in adapter file
- Test adapter methods independently

### ❌ DON'T
- Don't add `if (isCustom)` checks in Public Plugin code
- Don't duplicate core logic in Custom Plugin
- Don't modify Public Plugin core files
- Don't scatter custom logic across multiple files
- Don't hardcode custom-specific endpoints in Public Plugin

## Security Considerations

- **Credentials**: Never commit credentials to version control
- **Endpoints**: Use environment variables or secure storage
- **Tokens**: Store tokens securely (not in localStorage for sensitive data)
- **API Keys**: Use secure key management systems

## Troubleshooting

- **Adapter methods undefined:** Verify `src/work/workAdapter.override.ts` exists and exports correctly
- **Merge conflicts:** Expected in override file; resolve by keeping custom implementations
- **Public changes break custom features:** Update adapter implementations to match new extension point signatures

For detailed troubleshooting, see **[Extension Points](extension-points.md)** [REFERENCE].

---

## Override File Path

**Exact path:** `src/work/workAdapter.override.ts`

**Export contract:**
- Default export: `export default workAdapter` (where `workAdapter` is a `WorkAdapter`)
- OR named export: `export function createWorkAdapter(): WorkAdapter`

**Git ignore:** This file is ignored by `.gitignore` and should NOT be committed to the Public repo.

## Summary

The Custom Adapter pattern provides a clean, single-file boundary between Public and Custom plugins. All proprietary logic lives in `src/work/workAdapter.override.ts`, ensuring:

- ✅ Public Plugin remains clean and open-sourceable
- ✅ Custom Plugin can drop in a single override file without forking
- ✅ Public Plugin compiles and runs without override file (uses no-op adapter)
- ✅ Future updates merge cleanly (override file not in Public repo)
- ✅ Proprietary logic is isolated and secure

