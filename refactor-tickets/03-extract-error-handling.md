# Refactor Ticket: Extract Error Handling Utility

**Priority:** 🟡 Medium  
**Risk Level:** 🟢 Low  
**Estimated Effort:** 2 hours  
**Status:** Pending

---

## Intent

Consolidate duplicate `errorToString` functions into a single utility. Currently duplicated in:
- `src/main.ts` (45 lines, comprehensive)
- `src/core/proxy/client.ts` (20 lines, basic)

Create shared utility for consistent error handling across codebase.

---

## Affected Files

- `src/core/utils/errorHandling.ts` - **NEW** (create)
- `src/main.ts` - Remove function, import utility
- `src/core/proxy/client.ts` - Remove function, import utility

---

## Current State

```typescript
// src/main.ts (lines 47-91)
function errorToString(error: unknown): string {
  if (error instanceof ProviderError) {
    switch (error.type) { ... }
  }
  // ... comprehensive handling
}

// src/core/proxy/client.ts (lines 51-71)
function errorToString(error: unknown): string {
  if (error instanceof Error) { ... }
  // ... basic handling
}
```

**Problem:** Two implementations, different logic, maintenance burden.

---

## Target State

```typescript
// src/core/utils/errorHandling.ts (NEW)
export function errorToString(error: unknown): string {
  // Consolidated comprehensive version from main.ts
  if (error instanceof ProviderError) {
    switch (error.type) { ... }
  }
  // ... all error handling logic
}

// src/main.ts
import { errorToString } from './core/utils/errorHandling'
// Remove local function

// src/core/proxy/client.ts
import { errorToString } from '../utils/errorHandling'
// Remove local function
```

---

## Implementation Steps

1. **Create utility file:**
   ```bash
   mkdir -p src/core/utils
   touch src/core/utils/errorHandling.ts
   ```

2. **Copy comprehensive version from `main.ts`:**
   - Copy function (lines 47-91)
   - Add import for `ProviderError`, `ProviderErrorType`
   - Export function

3. **Update `main.ts`:**
   ```typescript
   // Add import at top
   import { errorToString } from './core/utils/errorHandling'
   
   // Remove local function (lines 47-91)
   ```

4. **Update `proxy/client.ts`:**
   ```typescript
   // Add import at top
   import { errorToString } from '../utils/errorHandling'
   
   // Remove local function (lines 51-71)
   ```

5. **Verify imports resolve:**
   - Check `ProviderError` import path in utility
   - Ensure `ProviderErrorType` is accessible

6. **Test error handling:**
   - Trigger network error
   - Trigger authentication error
   - Trigger provider error
   - Verify error messages display correctly

---

## Acceptance Criteria

- [ ] Single `errorToString` implementation exists
- [ ] All error handling uses utility
- [ ] Error messages remain consistent
- [ ] TypeScript compiles without errors
- [ ] All error types handled correctly
- [ ] No duplicate code

---

## Risk Mitigation

- **Low Risk:** Moving code, not changing logic
- **Verification:** Test all error scenarios
- **Rollback:** Keep old functions until verified

**Alternative Approach (Safer):**
1. Create utility with new name: `formatError`
2. Update one file at a time
3. Test after each change
4. Remove old functions once verified

---

## Testing Checklist

- [ ] Network errors display correctly
- [ ] Authentication errors display correctly
- [ ] Rate limit errors display correctly
- [ ] Provider errors display correctly
- [ ] Unknown errors display correctly
- [ ] Error messages are user-friendly

---

## Before/After Example

**Before:**
```typescript
// main.ts
function errorToString(error: unknown): string {
  // 45 lines of logic
}

// proxy/client.ts
function errorToString(error: unknown): string {
  // 20 lines of different logic
}
```

**After:**
```typescript
// core/utils/errorHandling.ts
export function errorToString(error: unknown): string {
  // Single comprehensive implementation
}

// main.ts
import { errorToString } from './core/utils/errorHandling'

// proxy/client.ts
import { errorToString } from '../utils/errorHandling'
```

---

## Notes

- Part of Phase 2 refactoring
- Can be done incrementally (one file at a time)
- Consider adding unit tests for error handling utility

