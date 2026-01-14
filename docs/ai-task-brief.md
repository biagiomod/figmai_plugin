# AI Task Brief

**For:** AI coding assistants (DevGPT Cline, GPT-4.1, etc.) executing Work Plugin migration tasks  
**Purpose:** Quick reference for common migration tasks and error patterns  
**When to read:** During active migration work for quick lookups

---

## Quick Start

1. **Read:** `README.md` (architecture overview)
2. **Read:** `docs/01-getting-started.md` (comprehensive guide)
3. **Read:** `docs/work-plugin/migration-guide.md` (step-by-step migration guide)
4. **Reference:** `docs/work-plugin/extension-points.md` (available hooks)

---

## Common Tasks

### Task: Add Work-Only Feature

**Steps:**
1. Check `docs/work-plugin/extension-points.md` for existing extension point
2. If exists: Implement in `src/work/workAdapter.override.ts`
3. If not exists: Add to `core/work/adapter.ts` interface first
4. Test: Build and verify feature works

**Example:**
```typescript
// src/work/workAdapter.override.ts
const workAdapter: WorkAdapter = {
  ...createDefaultWorkAdapter(),
  async createConfluence(args) {
    // Work implementation
  }
}
```

---

### Task: Fix Work Adapter Not Loading

**Symptoms:** Default adapter used, Work features not working

**Check:**
1. File exists: `src/work/workAdapter.override.ts`
2. Export correct: `export default workAdapter` or `export function createWorkAdapter()`
3. No import errors: Check console
4. Git ignore: File should NOT be committed

**Fix:**
- Verify export matches `loadAdapter.ts` expectations
- Check TypeScript errors in override file
- Verify file path is correct

---

### Task: Implement Confluence Integration

**Steps:**
1. Create `src/work/credentials.override.ts` with endpoint
2. Implement `createConfluence` in `workAdapter.override.ts`
3. Use `buildConfluenceXhtmlFromTable` for XHTML (canonical pipeline)
4. Test: Generate table → Send to Confluence → Verify API call

**Reference:** `docs/work-plugin/extension-points.md` → "Confluence Integration Hook"

---

### Task: Add Design System Detection

**Steps:**
1. Implement `designSystem.detectDesignSystemComponent` in override
2. Return `{ isDesignSystem: true, systemName: '...' }` for DS components
3. Optionally implement `shouldIgnore` to filter nodes
4. Test: Select DS component → Verify detection

**Reference:** `docs/work-plugin/extension-points.md` → "Design System Component Detection"

---

### Task: Add Content Table Post-Processing

**Steps:**
1. Implement `postProcessContentTable` in override
2. Deep clone table before modifying
3. Apply rules to items (redact, replace, tag)
4. Return modified table
5. Test: Generate table → Verify processing applied

**Reference:** `docs/work-plugin/extension-points.md` → "Content Table Post-Processing"

---

## Architecture Reminders

### Handler Pattern

**DO:**
- Add assistant logic in `core/assistants/handlers/{assistantId}.ts`
- Register handler in `handlers/index.ts`

**DON'T:**
- Add `if (assistantId === '...')` blocks in `main.ts`
- Modify core handler pattern

### Message Flow

**UI → Main:** `emit('EVENT_TYPE', ...data)`  
**Main → UI:** `figma.ui.postMessage({ pluginMessage: { type: 'MESSAGE_TYPE', ...data } })`

**Important:** Main thread is source of truth for message history.

### Work Adapter Loading

**Location:** `core/work/loadAdapter.ts`  
**Override:** `src/work/workAdapter.override.ts`  
**Fallback:** `core/work/defaultAdapter.ts`

**Important:** Override file is git-ignored, never committed.

---

## File Locations

| Purpose | Location |
|---------|----------|
| Work adapter override | `src/work/workAdapter.override.ts` |
| Credentials | `src/work/credentials.override.ts` |
| DS rules | `src/work/dsRules.override.ts` |
| Adapter interface | `core/work/adapter.ts` |
| Adapter loader | `core/work/loadAdapter.ts` |
| Default adapter | `core/work/defaultAdapter.ts` |

---

## Testing Checklist

Before completing task:
- [ ] `npm run build` passes
- [ ] No TypeScript errors
- [ ] Plugin loads in Figma
- [ ] Work adapter loads (check console)
- [ ] Feature works as expected
- [ ] No Public Plugin functionality broken

---

## Error Patterns

### "Work adapter not found"
→ Check `src/work/workAdapter.override.ts` exists and exports correctly

### "Extension point not called"
→ Verify extension point in `WorkAdapter` interface and calling code

### "TypeScript error: Property does not exist"
→ Check `WorkAdapter` interface in `core/work/adapter.ts`

### "Import error"
→ Verify import paths use relative paths from override file

---

## Reference Files

- **Architecture:** `README.md`
- **Getting Started:** `docs/01-getting-started.md`
- **Migration Steps:** `docs/work-plugin/migration-guide.md`
- **Extension Points:** `docs/work-plugin/extension-points.md`
- **Work Pattern:** `docs/work-plugin/adapter-pattern.md`
- **Message Contract:** `docs/message-contract.md`

