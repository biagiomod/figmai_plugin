# DevGPT Cline Task Brief

**For:** DevGPT Cline (gpt-4.1-2025-04014) executing Work Plugin migration tasks  
**Purpose:** Quick reference for common migration tasks

---

## Quick Start

1. **Read:** `README.md` (architecture overview)
2. **Read:** `docs/WORK_MIGRATION_PLAYBOOK.md` (step-by-step guide)
3. **Reference:** `docs/EXTENSION_POINTS.md` (available hooks)

---

## Common Tasks

### Task: Add Work-Only Feature

**Steps:**
1. Check `docs/EXTENSION_POINTS.md` for existing extension point
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

**Reference:** `docs/EXTENSION_POINTS.md` → "Confluence Integration Hook"

---

### Task: Add Design System Detection

**Steps:**
1. Implement `designSystem.detectDesignSystemComponent` in override
2. Return `{ isDesignSystem: true, systemName: '...' }` for DS components
3. Optionally implement `shouldIgnore` to filter nodes
4. Test: Select DS component → Verify detection

**Reference:** `docs/EXTENSION_POINTS.md` → "Design System Component Detection"

---

### Task: Add Content Table Post-Processing

**Steps:**
1. Implement `postProcessContentTable` in override
2. Deep clone table before modifying
3. Apply rules to items (redact, replace, tag)
4. Return modified table
5. Test: Generate table → Verify processing applied

**Reference:** `docs/EXTENSION_POINTS.md` → "Content Table Post-Processing"

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
- **Migration Steps:** `docs/WORK_MIGRATION_PLAYBOOK.md`
- **Extension Points:** `docs/EXTENSION_POINTS.md`
- **Work Pattern:** `docs/WORK_ADAPTER.md`
- **AI Guide:** `docs/AI_GUIDE.md`
- **Message Contract:** See `src/main.ts` and `src/ui.tsx` headers

