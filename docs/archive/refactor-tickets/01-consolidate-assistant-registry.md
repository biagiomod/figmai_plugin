# Refactor Ticket: Consolidate Assistant Registry

**Priority:** 🔴 High  
**Risk Level:** 🟢 Low  
**Estimated Effort:** 1 hour  
**Status:** Pending

---

## Intent

Remove duplicate assistant registry. Currently two registries exist:
- `src/core/assistants.ts` (unused, older structure)
- `src/assistants/index.ts` (active, newer structure)

This causes confusion and maintenance burden.

---

## Affected Files

- `src/core/assistants.ts` - **DELETE**
- `src/assistants/index.ts` - Verify as single source of truth
- `src/main.ts` - Verify imports
- `src/ui.tsx` - Verify imports

---

## Current State

```typescript
// src/core/assistants.ts (UNUSED)
export const ASSISTANTS: Assistant[] = [ ... ]
export function getAssistant(id: string): Assistant | undefined

// src/assistants/index.ts (ACTIVE)
export const ASSISTANTS: Assistant[] = [ ... ]
export function getAssistantById(id: string): Assistant | undefined
```

**Problem:** Two registries with different structures and function names.

---

## Target State

```typescript
// src/assistants/index.ts (ONLY SOURCE)
export const ASSISTANTS: Assistant[] = [ ... ]
export function getAssistantById(id: string): Assistant | undefined
export function listAssistants(): Assistant[]
export function getDefaultAssistant(): Assistant
```

**Solution:** Single registry with consistent API.

---

## Implementation Steps

1. **Verify imports:**
   ```bash
   grep -r "from './core/assistants'" src/
   grep -r "from '../core/assistants'" src/
   ```

2. **Check for any references to `getAssistant` (without "ById"):**
   ```bash
   grep -r "getAssistant(" src/ | grep -v "getAssistantById"
   ```

3. **Delete unused file:**
   ```bash
   rm src/core/assistants.ts
   ```

4. **Verify TypeScript compiles:**
   ```bash
   npm run build
   ```

5. **Manual test:**
   - Load plugin
   - Switch between assistants
   - Verify all assistants appear in modal

---

## Acceptance Criteria

- [ ] `src/core/assistants.ts` is deleted
- [ ] No imports reference deleted file
- [ ] TypeScript compiles without errors
- [ ] All assistants load correctly
- [ ] Assistant switching works
- [ ] No runtime errors

---

## Risk Mitigation

- **Low Risk:** File is unused, deletion is safe
- **Verification:** Check imports before deletion
- **Rollback:** File can be restored from git if needed

---

## Testing Checklist

- [ ] Plugin loads without errors
- [ ] Assistant modal shows all assistants
- [ ] Switching assistants works
- [ ] Quick actions work for each assistant
- [ ] Default assistant loads on startup

---

## Notes

- This is a cleanup task, no functional changes
- Part of Phase 1 quick wins
- Can be done in isolation

