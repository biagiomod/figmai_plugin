# Work Migration Playbook

**For:** AI coding assistants (DevGPT Cline, GPT-4.1) executing Work Plugin migration  
**Purpose:** Step-by-step operational guide for migrating Public Plugin to Work Plugin

---

## Prerequisites

Before starting migration, verify:
- ✅ Public Plugin builds successfully (`npm run build`)
- ✅ Public Plugin runs in Figma without errors
- ✅ All tests pass (if applicable)
- ✅ Work environment has Node.js/npm access
- ✅ Work environment has network/proxy access for LLM providers

---

## Migration Steps

### Step 1: Create Work Override Directory

```bash
# Ensure src/work/ directory exists
mkdir -p src/work
```

**Verify:** Directory `src/work/` exists

---

### Step 2: Create Work Adapter Override

Create `src/work/workAdapter.override.ts`:

```typescript
import type { WorkAdapter } from '../core/work/adapter'
import { createDefaultWorkAdapter } from '../core/work/defaultAdapter'

const workAdapter: WorkAdapter = {
  ...createDefaultWorkAdapter(),
  
  // Implement Work-only features here
  // See docs/EXTENSION_POINTS.md for all available hooks
}

export default workAdapter
```

**Verify:** File exists and exports `WorkAdapter`

---

### Step 3: Implement Required Extension Points

Based on Work requirements, implement extension points:

#### 3a. Confluence Integration (if needed)

```typescript
async createConfluence(args: {
  confluenceTitle: string
  confluenceTemplateXhtml: string
}): Promise<{ url?: string }> {
  // See docs/EXTENSION_POINTS.md for implementation details
  // See src/work/README.md for credentials setup
}
```

#### 3b. Design System Detection (if needed)

```typescript
designSystem: {
  detectDesignSystemComponent(node: SceneNode): DesignSystemInfo | null {
    // See docs/EXTENSION_POINTS.md for implementation
  },
  shouldIgnore?(node: SceneNode): boolean {
    // Optional: filter nodes during scanning
  }
}
```

#### 3c. Content Table Post-Processing (if needed)

```typescript
async postProcessContentTable(args: {
  table: UniversalContentTableV1
  selectionContext?: { pageId?: string; pageName?: string; rootNodeId?: string }
}): Promise<UniversalContentTableV1> {
  // See docs/EXTENSION_POINTS.md for implementation
  // Deep clone table before modifying
}
```

#### 3d. Ignore Rules (if needed)

```typescript
getContentTableIgnoreRules(): ContentTableIgnoreRules {
  // See docs/EXTENSION_POINTS.md for rules structure
}
```

**Verify:** All required extension points implemented

---

### Step 4: Configure Credentials (if needed)

Create `src/work/credentials.override.ts`:

```typescript
export const confluenceEndpoint: string = 'https://your-domain.atlassian.net/wiki/rest/api/content'
```

**IMPORTANT:** This file is git-ignored. Never commit credentials.

**Verify:** Credentials file exists (if needed) and is git-ignored

---

### Step 5: Verify .gitignore

Ensure `.gitignore` includes:

```
src/work/*.override.ts
src/work/credentials.override.ts
src/work/dsRules.override.ts
```

**Verify:** Override files are git-ignored

---

### Step 6: Build and Test

```bash
npm run build
```

**Verify:**
- ✅ Build succeeds
- ✅ No TypeScript errors
- ✅ Plugin loads in Figma
- ✅ Work adapter loads (check console for errors)
- ✅ Extension points execute (test each implemented hook)

---

### Step 7: Test Work Features

For each implemented extension point:

1. **Confluence Integration:**
   - Generate Content Table
   - Click "Send to Confluence"
   - Verify API call succeeds
   - Verify URL returned (if available)

2. **Design System Detection:**
   - Select DS component
   - Generate Content Table
   - Verify DS detection in console/logs

3. **Content Table Post-Processing:**
   - Generate Content Table with DS components
   - Verify post-processing applied
   - Verify export includes processed content

4. **Ignore Rules:**
   - Generate Content Table
   - Verify ignored nodes are excluded

**Verify:** All Work features function correctly

---

## Common Issues

### Issue: Work adapter not loading

**Symptoms:** Console shows "Work adapter not found" or default adapter used

**Fix:**
1. Verify `src/work/workAdapter.override.ts` exists
2. Verify file exports `WorkAdapter` (default or named export)
3. Check console for import errors
4. Verify file is not git-ignored incorrectly

### Issue: Extension point not called

**Symptoms:** Extension point implemented but not executing

**Fix:**
1. Verify extension point is in `WorkAdapter` interface
2. Verify calling code uses `workAdapter.extensionPoint()`
3. Check console for errors
4. Verify adapter loaded successfully

### Issue: TypeScript errors

**Symptoms:** Build fails with type errors

**Fix:**
1. Verify imports use correct paths
2. Verify types match `WorkAdapter` interface
3. Check `core/work/adapter.ts` for interface definition
4. Verify all required properties implemented

---

## Verification Checklist

- [ ] `src/work/workAdapter.override.ts` exists and exports `WorkAdapter`
- [ ] All required extension points implemented
- [ ] Credentials configured (if needed)
- [ ] `.gitignore` includes override files
- [ ] `npm run build` passes
- [ ] Plugin loads in Figma
- [ ] Work adapter loads (no console errors)
- [ ] All Work features tested and working
- [ ] No Public Plugin functionality broken

---

## Next Steps

After migration:
1. Document Work-specific configuration
2. Set up CI/CD for Work Plugin (if applicable)
3. Train team on Work features
4. Monitor for issues

---

## Reference

- **Architecture:** `README.md`
- **Extension Points:** `docs/EXTENSION_POINTS.md`
- **Work Adapter Pattern:** `docs/WORK_ADAPTER.md`
- **Work Override Files:** `src/work/README.md`
- **AI Guide:** `docs/AI_GUIDE.md`

