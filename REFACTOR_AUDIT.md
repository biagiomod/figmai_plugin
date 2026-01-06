# Code Steward Audit Report
**Date:** 2024-12-19  
**Scope:** FigmAI Plugin + Proxy Platform  
**Focus:** Maintainability, Scalability, Code Quality

---

## Executive Summary

The codebase is well-structured with clear separation between UI, main thread, providers, and tools. However, several maintainability issues have been identified that could impede growth as assistants, providers, and tools scale. This report prioritizes findings and provides incremental refactor tickets.

**Overall Health:** 🟡 **Good, with room for improvement**

---

## 1. Findings (Prioritized)

### 🔴 **HIGH PRIORITY** - Critical Maintainability Issues

#### 1.1 Duplicate Assistant Registry
**Severity:** High  
**Impact:** Confusion, maintenance burden, type inconsistencies

**Issue:** Two separate assistant registries exist:
- `src/core/assistants.ts` - Older, simpler structure with `prompt` field
- `src/assistants/index.ts` - Newer, richer structure with `promptMarkdown`, `intro`, `templateMessage`

**Evidence:**
- `main.ts` imports from `./assistants` (uses `index.ts`)
- `ui.tsx` imports from `./assistants` (uses `index.ts`)
- `core/assistants.ts` is never imported but defines similar structure
- Type definitions differ: `QuickAction` has `prompt` in one, `templateMessage` in the other

**Risk:** Adding new assistants requires updating two places, types may diverge

---

#### 1.2 Inconsistent Function Naming
**Severity:** Medium-High  
**Impact:** Developer confusion, API inconsistency

**Issue:** Two functions with similar purpose but different names:
- `core/assistants.ts`: `getAssistant(id: string)`
- `assistants/index.ts`: `getAssistantById(id: string)`

**Evidence:**
```typescript
// main.ts uses getAssistantById
import { getAssistantById } from './assistants'

// core/assistants.ts defines getAssistant (unused)
export function getAssistant(id: string): Assistant | undefined
```

**Risk:** Developers may use wrong function, or both may be maintained separately

---

#### 1.3 Duplicated Error Handling Logic
**Severity:** Medium-High  
**Impact:** Maintenance burden, inconsistent error messages

**Issue:** `errorToString` function duplicated in:
- `src/main.ts` (lines 47-91) - More comprehensive, handles ProviderError
- `src/core/proxy/client.ts` (lines 51-71) - Simpler version

**Evidence:**
```typescript
// main.ts - 45 lines, handles ProviderError types
function errorToString(error: unknown): string { ... }

// proxy/client.ts - 20 lines, basic error handling
function errorToString(error: unknown): string { ... }
```

**Risk:** Error messages may diverge, fixes need to be applied twice

---

#### 1.4 Leaky Abstraction: Design Critique JSON Parsing
**Severity:** Medium  
**Impact:** Tight coupling, hard to extend

**Issue:** `main.ts` contains hardcoded logic for Design Critique assistant JSON parsing (lines 442-505). This should be in the assistant or a dedicated handler.

**Evidence:**
```typescript
// main.ts lines 442-505
if (assistant.id === 'design_critique' && action.id === 'give-critique') {
  // 60+ lines of JSON parsing and canvas placement logic
}
```

**Risk:** Adding similar structured outputs requires modifying main.ts, violates single responsibility

---

### 🟡 **MEDIUM PRIORITY** - Code Quality & Consistency

#### 1.5 Inconsistent Logging Strategy
**Severity:** Medium  
**Impact:** Debug clutter, production noise

**Issue:** Mix of logging approaches:
- Debug logs left in production code (`ui.tsx:142, 180, 192`)
- Inconsistent prefixes: `[Main]`, `[UI]`, `[Export]`, `[CreateCritiqueFrame]`
- Some files use `console.log` for info, others use `console.warn`/`console.error`
- No centralized logger or log level control

**Evidence:**
- 44 console.* calls across codebase
- Debug logs in `ui.tsx` (lines 142, 180, 192, 195)
- Verbose logging in `main.ts` (lines 381-503)
- `proxy/client.ts` has `DEBUG` flag but it's hardcoded to `false`

**Risk:** Production logs may expose sensitive data, hard to control verbosity

---

#### 1.6 Large Monolithic Files
**Severity:** Medium  
**Impact:** Hard to navigate, merge conflicts, cognitive load

**Issue:** Two files exceed 600 lines:
- `src/ui.tsx`: **1,477 lines** - Entire UI component in one file
- `src/main.ts`: **646 lines** - All main thread handlers in one file

**Evidence:**
- `ui.tsx` contains: state management, event handlers, UI rendering, modals, styling
- `main.ts` contains: state, error handling, 8+ event handlers, initialization

**Risk:** Hard to find code, merge conflicts, difficult to test in isolation

---

#### 1.7 Type Definition Inconsistencies
**Severity:** Medium  
**Impact:** Type safety issues, confusion

**Issue:** `QuickAction` type defined differently in multiple places:
- `core/types.ts`: `{ id, label, prompt, requiresSelection? }`
- `assistants/index.ts`: `{ id, label, templateMessage, requiresSelection?, requiresVision?, maxImages?, imageScale? }`

**Evidence:**
- Different field names (`prompt` vs `templateMessage`)
- Different optional fields
- No single source of truth

**Risk:** Type mismatches, runtime errors, confusion about which fields are available

---

#### 1.8 Dead Code
**Severity:** Low-Medium  
**Impact:** Confusion, maintenance burden

**Issue:** Unused type definitions:
- `src/types.ts`: `CreateRectanglesHandler`, `CloseHandler` - Never imported or used

**Evidence:**
```typescript
// types.ts - lines 3-11
export interface CreateRectanglesHandler extends EventHandler { ... }
export interface CloseHandler extends EventHandler { ... }
```

**Risk:** Developers may think these are used, adds noise to codebase

---

### 🟢 **LOW PRIORITY** - Nice to Have

#### 1.9 Inconsistent File Naming
**Severity:** Low  
**Impact:** Minor confusion

**Issue:** Some files use kebab-case, others camelCase:
- `createCritiqueFrame.ts` (camelCase)
- `exportSelectionAsImages.ts` (camelCase)
- But pattern is generally consistent

**Note:** Current naming is acceptable, just noting for consistency

---

#### 1.10 Missing Error Boundaries
**Severity:** Low  
**Impact:** Potential crashes

**Issue:** Some async operations lack try-catch:
- `ui.tsx` message handler (lines 126-208) - catches but could be more specific
- Tool execution in `toolRouter.ts` has try-catch but error message is generic

**Risk:** Unhandled errors may crash plugin

---

## 2. Recommended Actions (Smallest First)

### Phase 1: Quick Wins (1-2 hours each)

#### ✅ **Action 1.1: Consolidate Assistant Registry**
**Files:** `src/core/assistants.ts`, `src/assistants/index.ts`  
**Risk:** Low  
**Effort:** 1 hour

**Steps:**
1. Delete `src/core/assistants.ts` (unused)
2. Verify all imports use `assistants/index.ts`
3. Update any type references

**Acceptance:**
- Only one assistant registry exists
- All imports resolve correctly
- No type errors

---

#### ✅ **Action 1.2: Standardize Function Names**
**Files:** `src/assistants/index.ts`  
**Risk:** Low  
**Effort:** 30 minutes

**Steps:**
1. Rename `getAssistantById` → `getAssistant` (shorter, more common)
2. Update all call sites (2 files: `main.ts`, `ui.tsx`)

**Acceptance:**
- Single function name used consistently
- All call sites updated

---

#### ✅ **Action 1.3: Remove Dead Code**
**Files:** `src/types.ts`  
**Risk:** None  
**Effort:** 5 minutes

**Steps:**
1. Delete `CreateRectanglesHandler` and `CloseHandler` interfaces

**Acceptance:**
- No unused type definitions remain

---

### Phase 2: Refactoring (2-4 hours each)

#### ✅ **Action 2.1: Extract Error Handling Utility**
**Files:** `src/main.ts`, `src/core/proxy/client.ts`, `src/core/utils/errorHandling.ts` (new)  
**Risk:** Low  
**Effort:** 2 hours

**Steps:**
1. Create `src/core/utils/errorHandling.ts`
2. Move comprehensive `errorToString` from `main.ts` to utility
3. Update `main.ts` and `proxy/client.ts` to import utility
4. Add ProviderError handling to utility version

**Acceptance:**
- Single `errorToString` implementation
- All error handling uses utility
- Error messages remain consistent

---

#### ✅ **Action 2.2: Extract Design Critique Handler**
**Files:** `src/main.ts`, `src/core/assistants/handlers/designCritiqueHandler.ts` (new)  
**Risk:** Medium  
**Effort:** 3 hours

**Steps:**
1. Create `src/core/assistants/handlers/designCritiqueHandler.ts`
2. Move JSON parsing and canvas placement logic from `main.ts`
3. Create handler interface for assistant-specific response processing
4. Register handler in assistant registry or handler map

**Acceptance:**
- Design Critique logic isolated
- Main.ts doesn't know about assistant internals
- Handler can be tested independently

---

#### ✅ **Action 2.3: Consolidate QuickAction Type**
**Files:** `src/core/types.ts`, `src/assistants/index.ts`  
**Risk:** Low  
**Effort:** 1 hour

**Steps:**
1. Define single `QuickAction` type in `core/types.ts` with all fields
2. Update `assistants/index.ts` to use type from `core/types.ts`
3. Remove duplicate type definition

**Acceptance:**
- Single `QuickAction` type definition
- All fields properly typed
- No type mismatches

---

### Phase 3: Architecture Improvements (4-8 hours each)

#### ✅ **Action 3.1: Centralize Logging**
**Files:** `src/core/utils/logger.ts` (new), all files with console.*  
**Risk:** Low  
**Effort:** 4 hours

**Steps:**
1. Create `src/core/utils/logger.ts` with log levels (DEBUG, INFO, WARN, ERROR)
2. Add environment-based log level (dev vs production)
3. Replace all `console.*` calls with logger utility
4. Add consistent prefixes: `[Plugin:Main]`, `[Plugin:UI]`, etc.

**Acceptance:**
- All logging goes through utility
- Log levels configurable
- Debug logs disabled in production
- Consistent formatting

---

#### ✅ **Action 3.2: Split Large Files**
**Files:** `src/ui.tsx`, `src/main.ts`  
**Risk:** Medium  
**Effort:** 6-8 hours

**Steps for `ui.tsx`:**
1. Extract modal components: `ui/components/AssistantModal.tsx`, `ui/components/JsonModal.tsx`
2. Extract message rendering: `ui/components/MessageList.tsx`
3. Extract input area: `ui/components/ChatInput.tsx`
4. Keep main `Plugin` component as orchestrator

**Steps for `main.ts`:**
1. Extract event handlers: `core/handlers/messageHandler.ts`, `core/handlers/quickActionHandler.ts`
2. Extract state management: `core/state/pluginState.ts`
3. Keep `main.ts` as thin orchestrator

**Acceptance:**
- No file exceeds 400 lines
- Components are testable in isolation
- Imports remain clean

---

## 3. Proposed Diffs (High Level)

### Diff 1: Consolidate Assistant Registry

```diff
# Delete unused file
- src/core/assistants.ts

# Update imports (if any exist)
- import { getAssistant } from './core/assistants'
+ import { getAssistantById as getAssistant } from './assistants'
```

---

### Diff 2: Extract Error Handling

```diff
# New file: src/core/utils/errorHandling.ts
+ export function errorToString(error: unknown): string {
+   // Consolidated implementation from main.ts
+ }

# src/main.ts
- function errorToString(error: unknown): string { ... }
+ import { errorToString } from './core/utils/errorHandling'

# src/core/proxy/client.ts
- function errorToString(error: unknown): string { ... }
+ import { errorToString } from '../utils/errorHandling'
```

---

### Diff 3: Extract Design Critique Handler

```diff
# New file: src/core/assistants/handlers/designCritiqueHandler.ts
+ export async function handleDesignCritiqueResponse(
+   response: string,
+   selection: SelectionState,
+   selectionOrder: string[]
+ ): Promise<{ handled: boolean; message?: string }> {
+   // JSON parsing and canvas placement logic
+ }

# src/main.ts
- if (assistant.id === 'design_critique' && action.id === 'give-critique') {
-   // 60+ lines of logic
- }
+ const handler = getAssistantHandler(assistant.id)
+ if (handler) {
+   const result = await handler.handleResponse(response, selection, selectionOrder)
+   if (result.handled) return
+ }
```

---

### Diff 4: Centralize Logging

```diff
# New file: src/core/utils/logger.ts
+ export const logger = {
+   debug: (message: string, ...args: unknown[]) => { ... },
+   info: (message: string, ...args: unknown[]) => { ... },
+   warn: (message: string, ...args: unknown[]) => { ... },
+   error: (message: string, ...args: unknown[]) => { ... }
+ }

# All files
- console.log('[Main]', ...)
+ logger.info('[Plugin:Main]', ...)
```

---

## 4. Verification Checklist

After implementing refactors, verify:

### Functionality
- [ ] All assistants load and function correctly
- [ ] Quick actions work for all assistants
- [ ] Error messages display correctly
- [ ] Design Critique JSON parsing still works
- [ ] Tool execution works
- [ ] Settings save/load correctly

### Code Quality
- [ ] No TypeScript errors
- [ ] No linter warnings
- [ ] All imports resolve
- [ ] No unused exports
- [ ] No duplicate code

### Maintainability
- [ ] Single assistant registry
- [ ] Single error handling utility
- [ ] Consistent function naming
- [ ] No dead code
- [ ] Logging is centralized

### Testing
- [ ] Manual testing: All features work
- [ ] Code review: Changes are minimal and safe
- [ ] No regressions in existing behavior

---

## 5. Risk Assessment

| Action | Risk Level | Mitigation |
|--------|-----------|------------|
| Consolidate Assistant Registry | 🟢 Low | Verify imports before deletion |
| Standardize Function Names | 🟢 Low | Use IDE refactor tool |
| Extract Error Handling | 🟢 Low | Keep old function until verified |
| Extract Design Critique Handler | 🟡 Medium | Test thoroughly, keep fallback |
| Centralize Logging | 🟢 Low | Add logger, migrate gradually |
| Split Large Files | 🟡 Medium | Extract incrementally, test after each |

---

## 6. Next Steps

1. **Immediate (This Week):**
   - Action 1.1: Consolidate Assistant Registry
   - Action 1.2: Standardize Function Names
   - Action 1.3: Remove Dead Code

2. **Short Term (Next Sprint):**
   - Action 2.1: Extract Error Handling Utility
   - Action 2.2: Extract Design Critique Handler
   - Action 2.3: Consolidate QuickAction Type

3. **Medium Term (Next Month):**
   - Action 3.1: Centralize Logging
   - Action 3.2: Split Large Files

---

## 7. Notes

- **No Feature Changes:** All refactors preserve existing functionality
- **Incremental:** Each action is independent and can be done in small PRs
- **Backward Compatible:** Changes maintain existing APIs where possible
- **Test Coverage:** Manual testing recommended after each phase

---

**Report Generated By:** Code Steward AI  
**Next Audit:** After Phase 1 completion



