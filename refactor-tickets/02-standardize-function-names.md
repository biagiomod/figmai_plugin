# Refactor Ticket: Standardize Function Names

**Priority:** 🔴 High  
**Risk Level:** 🟢 Low  
**Estimated Effort:** 30 minutes  
**Status:** Pending

---

## Intent

Standardize assistant lookup function name. Currently:
- `getAssistantById(id: string)` - Used in active code
- `getAssistant(id: string)` - Defined in unused file

Standardize to `getAssistant` (shorter, more common pattern).

---

## Affected Files

- `src/assistants/index.ts` - Rename function
- `src/main.ts` - Update call sites (2 occurrences)
- `src/ui.tsx` - Update call sites (1 occurrence)

---

## Current State

```typescript
// src/assistants/index.ts
export function getAssistantById(id: string): Assistant | undefined {
  return ASSISTANTS.find(a => a.id === id)
}

// src/main.ts (lines 186, 269)
const assistant = getAssistantById(assistantId)

// src/ui.tsx (line 242)
const selected = getAssistantById(assistantId)
```

---

## Target State

```typescript
// src/assistants/index.ts
export function getAssistant(id: string): Assistant | undefined {
  return ASSISTANTS.find(a => a.id === id)
}

// src/main.ts
const assistant = getAssistant(assistantId)

// src/ui.tsx
const selected = getAssistant(assistantId)
```

---

## Implementation Steps

1. **Rename function in `assistants/index.ts`:**
   ```typescript
   // Change:
   export function getAssistantById(id: string): Assistant | undefined
   // To:
   export function getAssistant(id: string): Assistant | undefined
   ```

2. **Update exports (if `getAssistantById` is exported):**
   ```typescript
   // Remove or deprecate:
   export { getAssistantById } // Remove this line
   ```

3. **Update call sites using IDE refactor:**
   - `src/main.ts` line 186: `getAssistantById` → `getAssistant`
   - `src/main.ts` line 269: `getAssistantById` → `getAssistant`
   - `src/ui.tsx` line 242: `getAssistantById` → `getAssistant`

4. **Update imports (if needed):**
   ```typescript
   // Change:
   import { getAssistantById, ... } from './assistants'
   // To:
   import { getAssistant, ... } from './assistants'
   ```

5. **Verify TypeScript compiles:**
   ```bash
   npm run build
   ```

---

## Acceptance Criteria

- [ ] Function renamed to `getAssistant`
- [ ] All call sites updated
- [ ] All imports updated
- [ ] TypeScript compiles without errors
- [ ] No references to `getAssistantById` remain
- [ ] Functionality unchanged

---

## Risk Mitigation

- **Low Risk:** Simple rename, IDE can handle safely
- **Verification:** Search for `getAssistantById` after changes
- **Rollback:** Git revert if issues

---

## Testing Checklist

- [ ] Assistant selection works
- [ ] Quick actions work
- [ ] No TypeScript errors
- [ ] No runtime errors

---

## Notes

- Use IDE "Rename Symbol" for safety
- Part of Phase 1 quick wins
- Can be combined with ticket #01

