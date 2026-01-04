# Refactor Ticket: Remove Dead Code

**Priority:** 🟢 Low  
**Risk Level:** 🟢 None  
**Estimated Effort:** 5 minutes  
**Status:** Pending

---

## Intent

Remove unused type definitions from `src/types.ts`. These appear to be leftover from initial plugin setup and are never used.

---

## Affected Files

- `src/types.ts` - Remove unused interfaces

---

## Current State

```typescript
// src/types.ts (lines 3-11)
export interface CreateRectanglesHandler extends EventHandler {
  name: 'CREATE_RECTANGLES'
  handler: (count: number) => void
}

export interface CloseHandler extends EventHandler {
  name: 'CLOSE'
  handler: () => void
}
```

**Problem:** These interfaces are never imported or used anywhere in the codebase.

---

## Target State

```typescript
// src/types.ts
// File is empty or contains only used types
// (All types moved to core/types.ts)
```

**Note:** If `types.ts` becomes empty, consider deleting it or consolidating with `core/types.ts`.

---

## Implementation Steps

1. **Verify unused:**
   ```bash
   grep -r "CreateRectanglesHandler" src/
   grep -r "CloseHandler" src/
   ```

2. **Remove unused interfaces:**
   - Delete `CreateRectanglesHandler` interface
   - Delete `CloseHandler` interface

3. **Check if file is now empty:**
   - If empty, consider deleting file
   - Or consolidate with `core/types.ts`

4. **Verify TypeScript compiles:**
   ```bash
   npm run build
   ```

---

## Acceptance Criteria

- [ ] Unused interfaces removed
- [ ] TypeScript compiles without errors
- [ ] No references to removed types
- [ ] File structure is cleaner

---

## Risk Mitigation

- **No Risk:** Code is unused, safe to delete
- **Verification:** Search codebase for references
- **Rollback:** Can restore from git if needed

---

## Testing Checklist

- [ ] TypeScript compiles
- [ ] No linter errors
- [ ] Plugin loads correctly
- [ ] No runtime errors

---

## Notes

- Part of Phase 1 quick wins
- Can be done in 5 minutes
- Low-hanging fruit cleanup

