# Work-Only Overrides

This folder is for Work-only override files that are **NOT committed to the Public repo**.

## Purpose

The Work Plugin can drop in override files that provide proprietary implementations for Work-only features (e.g., Confluence integration, design system detection, DS content handling).

## Files

### `workAdapter.override.ts` (DO NOT COMMIT)

This file should export a `WorkAdapter` implementation. It can use either:

**Option 1: Default Export**
```typescript
import type { WorkAdapter } from '../core/work/adapter'

const workAdapter: WorkAdapter = {
  createConfluence: async (args) => {
    // Work-only implementation
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
    createConfluence: async (args) => {
      // Work-only implementation
    },
    // ... other implementations
  }
}
```

### `credentials.override.ts` (DO NOT COMMIT)

This file contains Work-only credentials and endpoint configurations.

**Example:**
```typescript
export const confluenceEndpoint: string = 'https://your-domain.atlassian.net/wiki/rest/api/content'
```

**Important:**
- This file is git-ignored and must NOT be committed
- Replace placeholder values with actual endpoints
- Only import this file from `workAdapter.override.ts` (Work-only code)

### `dsRules.override.ts` (DO NOT COMMIT)

This file contains Design System content handling rules.

**Example:**
```typescript
export const DS_RULES: Record<string, {
  action: 'redact' | 'replace' | 'tag'
  replacement?: string
  tag?: string
}> = {
  'Internal Design System v2': {
    action: 'redact'
  },
  'FPO-DS': {
    action: 'replace',
    replacement: '[FPO-DS Component Content]'
  }
}
```

**Important:**
- This file is git-ignored and must NOT be committed
- Replace generic system names with your actual DS identifiers
- See "Discovering DS Identifiers" section below

## Enabling Confluence Integration

To enable the Work-only Confluence integration:

1. **Update `credentials.override.ts`:**
   - Replace the placeholder `confluenceEndpoint` with your actual Confluence API endpoint
   - Example: `'https://your-domain.atlassian.net/wiki/rest/api/content'`

2. **Enable implementation in `workAdapter.override.ts`:**
   - Uncomment the `WORK IMPLEMENTATION - Confluence Integration` section
   - Comment out or remove the default no-op export at the bottom
   - The implementation will:
     - Use browser session authentication (`credentials: 'include'`)
     - Send payload: `{ type: 'createConfluence', confluenceTitle, confluenceTemplate }`
     - Parse response for URL and return it
     - Handle errors with readable messages

3. **Test locally:**
   - Run the plugin in Figma
   - Generate a Content Table
   - Click "Send to Confluence"
   - Enter a title and submit
   - Verify the API call succeeds and returns a URL (if available)

## Design System Content Handling

The `postProcessContentTable` hook allows Work to modify the scanned Content Table after scanning but before export/use. This is the place to implement:

- **DS Content Handling Rules**: Apply proprietary rules for how to treat content from design system components
- **Redaction**: Remove or mask sensitive content from DS components
- **Normalization**: Standardize content values (dates, currency, etc.)
- **Replacement**: Replace placeholder text with actual content
- **Grouping/Reorganization**: Reorganize items based on DS rules
- **Filtering**: Remove items that shouldn't be exported (beyond ignore rules)

### Discovering DS Identifiers

Before implementing DS content handling rules, you need to identify your actual design system component identifiers:

1. **Implement `detectDesignSystemComponent` first:**
   - Uncomment the detection logic in `workAdapter.override.ts`
   - Return `{ isDesignSystem: true, systemName: '...' }` for your DS components
   - The `systemName` value is what you'll use as keys in `DS_RULES`

2. **Run a Content Table scan:**
   - Generate a Content Table that includes DS components
   - Check the console logs or inspect `table.designSystemByNodeId` in the UI
   - Look for the `systemName` values that were detected

3. **Update `dsRules.override.ts`:**
   - Replace generic keys (e.g., "InternalDS", "FPO-DS") with your actual `systemName` values
   - Customize actions (redact, replace, tag) as needed

### Recommended Workflow

1. **Step 1: Implement Detection**
   - Enable `detectDesignSystemComponent` in `workAdapter.override.ts`
   - Test that DS components are correctly identified
   - Note the `systemName` values in console logs

2. **Step 2: Implement Content Handling**
   - Enable `postProcessContentTable` in `workAdapter.override.ts`
   - Update `dsRules.override.ts` with your actual system names
   - Test that rules are applied correctly

3. **Step 3: Verify Export**
   - Generate Content Table
   - Verify modifications are visible in UI
   - Test Confluence export to ensure processed content is exported

### DS Rules Actions

**Redact:**
- Replaces content value with `"[REDACTED]"`
- Use for sensitive content that shouldn't be exported

**Replace:**
- Replaces content value with provided `replacement` string
- Use for placeholder text or normalization

**Tag:**
- Adds a tag to the `notes` field (if it exists in schema)
- Use for marking items without modifying content
- If `notes` field doesn't exist, tag action is a no-op (safe)

### Safety Guidelines

- **Never commit proprietary DS names**: Keep all real identifiers in git-ignored override files
- **Deep clone tables**: Always clone before modifying to avoid mutating input
- **Handle errors gracefully**: If processing fails, return original table (never break the flow)
- **Test locally first**: Verify rules work before sharing with team
- **Keep rules isolated**: Use `dsRules.override.ts` for easy iteration

### Example Implementation

```typescript
// dsRules.override.ts
export const DS_RULES: Record<string, {
  action: 'redact' | 'replace' | 'tag'
  replacement?: string
  tag?: string
}> = {
  'Internal Design System v2': {
    action: 'redact'
  },
  'FPO-DS Components': {
    action: 'replace',
    replacement: '[FPO-DS Component Content]'
  }
}

// workAdapter.override.ts
import { getDsRule } from './dsRules.override'

const workAdapter: WorkAdapter = {
  async postProcessContentTable(args) {
    const { table } = args
    const processedTable = deepCloneTable(table)
    
    const processedItems = processedTable.items.map(item => {
      if (item.designSystem?.isDesignSystem && item.designSystem.systemName) {
        const rule = getDsRule(item.designSystem.systemName)
        if (rule) {
          return applyDsRuleToItem(item, rule)
        }
      }
      return item
    })
    
    return { ...processedTable, items: processedItems }
  }
}
```

See `docs/EXTENSION_POINTS.md` for detailed documentation.

## What Goes Here

- ✅ Proprietary API endpoints (Confluence, internal services)
- ✅ Enterprise authentication logic
- ✅ Internal design system detection
- ✅ Work-specific ignore rules
- ✅ Content Table post-processing (DS content handling rules)
- ✅ Design System content handling rules (dsRules.override.ts)
- ✅ Credentials and configuration (use secure storage)

## What Does NOT Go Here

- ❌ Core plugin logic (belongs in Public Plugin)
- ❌ UI components (belongs in Public Plugin)
- ❌ Provider implementations (belongs in Public Plugin)

## Git Ignore

This folder's override files are ignored by `.gitignore`:
- `workAdapter.override.ts`
- `credentials.override.ts`
- `dsRules.override.ts`
- Any `*.override.ts` files

## Testing

To test locally (without committing):
1. Create/update `workAdapter.override.ts` in this folder
2. Create/update `credentials.override.ts` with your endpoint
3. Create/update `dsRules.override.ts` with your DS rules
4. Export a `WorkAdapter` implementation
5. The plugin will automatically use it
6. Remove or reset the files before committing

## Confluence Integration Details

The `createConfluence` hook receives:
- `confluenceTitle`: User-entered title for the Confluence page
- `confluenceTemplateXhtml`: XHTML-encoded table content (already encoded by UI)

The hook should:
- Send POST request to `confluenceEndpoint` with payload:
  ```json
  {
    "type": "createConfluence",
    "confluenceTitle": "...",
    "confluenceTemplate": "<xhtml>..."
  }
  ```
- Use browser session auth (`credentials: 'include'`)
- Return `{ url?: string }` if API provides a URL
- Throw `Error` with readable message on failure
