# Extension Points

This document describes all extension points where the Work Plugin can inject proprietary behavior into the Public Plugin.

## Overview

The Public Plugin exposes extension points via the Work Adapter (`core/work/adapter.ts`). The Work Plugin implements these extension points in `src/work/workAdapter.override.ts` to add Work-only features without modifying Public Plugin code.

The adapter is loaded via `loadWorkAdapter()` which attempts to import the override file, falling back to a no-op adapter if not present.

## Extension Points

### 1. Ignore / Filter Rules (Content Table Scanner)

**Location:** `core/contentTable/scanner.ts` and `core/assistants/handlers/contentTable.ts`

**Purpose:** Filter out nodes that should be ignored during Content Table scanning (e.g., internal components, test content, debug nodes).

**Extension Point:**
```typescript
workAdapter.getContentTableIgnoreRules?: () => ContentTableIgnoreRules
```

**When Called:**
- Once per Content Table scan, in the handler before scanning begins
- Rules are applied to each text node during scanning

**Rules Structure:**
```typescript
interface ContentTableIgnoreRules {
  nodeNamePatterns?: string[]        // Regex patterns for node names
  nodeIdPrefixes?: string[]          // Node ID prefixes to ignore
  componentKeyAllowlist?: string[]   // Component keys to allow (whitelist)
  componentKeyDenylist?: string[]    // Component keys to deny (blacklist)
  textValuePatterns?: string[]       // Regex patterns for text content
}
```

**Implementation Example:**
```typescript
// src/work/workAdapter.override.ts (Work Plugin)
import type { WorkAdapter, ContentTableIgnoreRules } from '../core/work/adapter'

const workAdapter: WorkAdapter = {
  getContentTableIgnoreRules(): ContentTableIgnoreRules {
    return {
      // Ignore nodes with names matching these patterns
      nodeNamePatterns: [
        '^Debug',           // Nodes starting with "Debug"
        '.*FPO.*',          // Nodes containing "FPO"
        '.*Test.*',         // Nodes containing "Test"
        '^_ignore'          // Nodes starting with "_ignore"
      ],
      
      // Ignore nodes with specific ID prefixes (optional)
      // nodeIdPrefixes: ['I1234:', 'I5678:'],
      
      // Only allow nodes from these component keys (optional)
      // componentKeyAllowlist: ['abc123', 'def456'],
      
      // Deny nodes from these component keys (optional)
      // componentKeyDenylist: ['xyz789'],
      
      // Ignore nodes with text content matching these patterns (optional)
      textValuePatterns: [
        '.*lorem.*',        // Text containing "lorem"
        '.*placeholder.*'   // Text containing "placeholder"
      ]
    }
  }
}

export default workAdapter
```

**How It Works:**
1. Handler loads Work adapter via `loadWorkAdapter()`
2. Calls `getContentTableIgnoreRules()` if available
3. Passes rules to `scanContentTable()` which applies them during node collection
4. Invalid regex patterns are safely ignored (logged as warnings, don't crash)
5. Rules are applied with OR logic (if any rule matches, node is ignored)

**Current Status:** ✅ **Implemented** - Extension point is called in Content Table handler and applied during scanning.

**Notes:**
- Regex patterns are compiled safely with try/catch
- Invalid patterns are logged and ignored (plugin continues normally)
- If no override file exists, rules are `null` and all nodes are included (Public Plugin behavior)
- Rules only affect Content Table scanning, not other assistants

---

### 2. Design System Component Detector (Content Table Scanner)

**Location:** `core/contentTable/scanner.ts` and `core/assistants/handlers/contentTable.ts`

**Purpose:** Identify design system components during Content Table scanning (e.g., internal DS components, component library items) without leaking proprietary detection logic into the Public plugin.

**Extension Point:**
```typescript
workAdapter.detectDesignSystemComponent?: (node: SceneNode) => DesignSystemDetectionResult | null
```

**When Called:**
- During Content Table scanning, for each relevant node (FRAME, INSTANCE, COMPONENT, COMPONENT_SET, TEXT)
- Results are cached by node.id to avoid redundant calls
- Called before items are added to the table

**Result Structure:**
```typescript
interface DesignSystemDetectionResult {
  isDesignSystem: boolean              // Whether this node is a DS component
  systemName?: string                  // Name of the design system (e.g., "Internal DS v2")
  componentKey?: string                // Component key if detected
  componentName?: string               // Component name if detected
  reason?: string                      // Reason for detection (e.g., "Matches component key pattern")
}
```

**Implementation Example:**
```typescript
// src/work/workAdapter.override.ts (Work Plugin)
import type { WorkAdapter, DesignSystemDetectionResult } from '../core/work/adapter'

const workAdapter: WorkAdapter = {
  detectDesignSystemComponent(node: SceneNode): DesignSystemDetectionResult | null {
    // Example: Check if node is an instance with a known DS component key
    if (node.type === 'INSTANCE') {
      const instance = node as InstanceNode
      const mainComponent = instance.mainComponent
      if (mainComponent) {
        const componentKey = mainComponent.key
        
        // Example: Check against known DS component key patterns (Work-specific logic)
        // This is where proprietary detection rules would go
        if (componentKey && componentKey.startsWith('I:abc123')) {
          return {
            isDesignSystem: true,
            systemName: 'Internal Design System v2',
            componentKey: componentKey,
            componentName: mainComponent.name,
            reason: 'Matches internal DS component key pattern'
          }
        }
      }
    }
    
    // Example: Check node name for DS indicators
    if (node.name.startsWith('DS/') || node.name.startsWith('DesignSystem/')) {
      return {
        isDesignSystem: true,
        systemName: 'Internal Design System',
        componentName: node.name,
        reason: 'Node name indicates design system component'
      }
    }
    
    // Not a design system component
    return null
  }
}

export default workAdapter
```

**How It Works:**
1. Handler loads Work adapter via `loadWorkAdapter()`
2. Gets `detectDesignSystemComponent` callback if available
3. Passes callback to `scanContentTable()` which calls it during node traversal
4. Results are cached by node.id to avoid redundant calls
5. Detection results are stored in two places:
   - Per-item: `item.designSystem` field (only if `isDesignSystem: true`)
   - Table-level: `table.designSystemByNodeId` map (all detected nodes)

**Where to Find Detection Results:**
- **Per-item**: Each `ContentItemV1` in `table.items[]` has an optional `designSystem?: DesignSystemDetectionResult` field
- **Table-level map**: `table.designSystemByNodeId?: Record<string, DesignSystemDetectionResult>` contains all detected nodes keyed by node ID
- Both fields are only present if detection found DS components (Work Plugin only)

**Current Status:** ✅ **Implemented** - Extension point is called in Content Table handler and applied during scanning.

**Notes:**
- Detector is only called for relevant node types (FRAME, INSTANCE, COMPONENT, COMPONENT_SET, TEXT)
- Results are cached by node.id to ensure performance
- If detector throws an error, it's caught and logged, scanning continues
- If no override file exists, detector is `undefined` and no detection occurs (Public Plugin behavior)
- Detection does NOT affect filtering behavior (items are still included in table)
- Detection results are recorded for future use (e.g., UI display, filtering, export)

---

### 3. Post-Process Content Table

**Location:** `core/assistants/handlers/contentTable.ts`

**Purpose:** Modify the scanned Content Table after scanning but before it's used/exported. This allows Work to apply proprietary rules for handling content from design system components (redaction, normalization, replacement, grouping, etc.) without embedding proprietary logic in the Public plugin.

**Extension Point:**
```typescript
workAdapter.postProcessContentTable?: (args: {
  table: UniversalContentTableV1
  selectionContext?: {
    pageId?: string
    pageName?: string
    rootNodeId?: string
  }
}) => UniversalContentTableV1 | Promise<UniversalContentTableV1>
```

**When Called:**
- After `scanContentTable()` completes successfully
- Before the table is:
  - Sent to UI (via `CONTENT_TABLE_GENERATED` message)
  - Exported (Confluence, CSV, etc.)
  - Used by any other process
- Called exactly once per Content Table generation

**Selection Context:**
The `selectionContext` is automatically extracted from the table:
- `pageId`: From `table.source.pageId`
- `pageName`: From `table.source.pageName`
- `rootNodeId`: From `table.meta.rootNodeId`

**Use Cases:**
- **Redaction**: Remove or mask sensitive content from DS components
- **Normalization**: Standardize content values (e.g., date formats, currency)
- **Replacement**: Replace placeholder text with actual content
- **Grouping**: Reorganize items based on DS rules
- **Filtering**: Remove items that shouldn't be exported (beyond ignore rules)
- **Enrichment**: Add metadata or transform content based on DS detection results

**Implementation Example:**
```typescript
// src/work/workAdapter.override.ts (Work Plugin)
import type { WorkAdapter, UniversalContentTableV1 } from '../core/work/adapter'

const workAdapter: WorkAdapter = {
  async postProcessContentTable(args: {
    table: UniversalContentTableV1
    selectionContext?: {
      pageId?: string
      pageName?: string
      rootNodeId?: string
    }
  }): Promise<UniversalContentTableV1> {
    const { table, selectionContext } = args
    
    // Example: Redact sensitive content from DS components
    const processedItems = table.items.map(item => {
      // If item is from a design system component, redact sensitive content
      if (item.designSystem?.isDesignSystem) {
        // Example: Redact email addresses, phone numbers, etc.
        const redactedValue = item.content.value
          .replace(/[\w.-]+@[\w.-]+\.\w+/g, '[REDACTED]')
          .replace(/\d{3}-\d{3}-\d{4}/g, '[REDACTED]')
        
        return {
          ...item,
          content: {
            ...item.content,
            value: redactedValue
          }
        }
      }
      
      return item
    })
    
    // Example: Normalize content values
    const normalizedItems = processedItems.map(item => {
      // Example: Normalize currency formatting
      const normalizedValue = item.content.value
        .replace(/\$(\d+)/g, '$$$1.00') // $100 -> $100.00
      
      return {
        ...item,
        content: {
          ...item.content,
          value: normalizedValue
        }
      }
    })
    
    // Example: Filter out items based on DS rules
    const filteredItems = normalizedItems.filter(item => {
      // Example: Keep only items from specific DS components
      if (item.designSystem?.isDesignSystem) {
        return item.designSystem.systemName === 'Internal Design System v2'
      }
      return true // Keep non-DS items
    })
    
    // Return modified table
    return {
      ...table,
      items: filteredItems
    }
  }
}

export default workAdapter
```

**Error Handling:**
- If the hook throws an error, it's caught and logged
- The original (unmodified) table is used instead
- Content Table generation flow is never broken by post-processing errors
- Error is logged to console: `[ContentTableHandler] Error in postProcessContentTable hook: <error>`

**Return Value:**
- Must return a `UniversalContentTableV1` (can be the original table or a modified copy)
- Can be synchronous or async (Promise)
- If hook is `undefined` or returns the original table unchanged, no processing occurs

**Current Status:** ✅ **Implemented** - Extension point is called in Content Table handler after scanning completes.

**Notes:**
- Hook is optional - if not implemented, table is used as-is (Public Plugin behavior)
- Hook can modify any part of the table (items, meta, source, etc.)
- Hook receives the full table structure, allowing comprehensive transformations
- Selection context is provided for context-aware processing (e.g., page-specific rules)
- Hook is called after ignore rules and DS detection have already been applied
- This is the place to implement DS-specific content handling rules

---

### 4. Content Table Schema Invariants and Validation

**Location:** `core/contentTable/validate.ts` and `core/assistants/handlers/contentTable.ts`

**Purpose:** Define and enforce schema invariants for `UniversalContentTableV1` to ensure stable Public↔Work contract.

#### Schema Invariants

**Required Fields (Public Guarantees):**

**UniversalContentTableV1:**
- `type`: Must be `"universal-content-table"` (immutable)
- `version`: Must be `1` (immutable - bump version for breaking changes)
- `generatedAtISO`: ISO date string (required)
- `source`: Object with `pageId`, `pageName`, `selectionNodeId`, `selectionName` (all required strings)
- `meta`: `TableMetaV1` object with all required fields (see below)
- `items`: Array of `ContentItemV1` (required, may be empty array)

**TableMetaV1:**
- `contentModel`, `contentStage`, `adaStatus`, `legalStatus`, `lastUpdated`, `version`, `rootNodeId`, `rootNodeName`, `rootNodeUrl`: All required strings

**ContentItemV1:**
- `id`, `nodeId`, `nodeUrl`: Required strings
- `component`: Required object with `kind` (string) and `name` (string)
- `field`: Required object with `label` (string) and `path` (string)
- `content`: Required object with `type: "text"` and `value` (string)
- `meta`: Required object with `visible` (boolean) and `locked` (boolean)

**Optional Fields:**
- `designSystemByNodeId`: Optional object map (Record<string, DesignSystemDetectionResult>)
- Per-item optional fields: `textLayerName`, `notes`, `contentKey`, `jiraTicket`, `adaNotes`, `errorMessage`, `designSystem`
- `meta.thumbnailDataUrl`: Optional string
- `field.role`: Optional string
- `component.key`, `component.variantProperties`: Optional

#### Public Guarantees (What Will Not Change)

These fields are guaranteed to exist and maintain their shape without a version bump:
- `type` and `version` fields (immutable identifiers)
- Required field names and types
- `items` array structure (always an array)
- Required nested object shapes (component, field, content, meta)

#### Work Extension Permissions

**What `postProcessContentTable` CAN modify:**
- ✅ `items[]` array (add, remove, reorder, modify items)
- ✅ `items[].content.value` (redact, replace, normalize)
- ✅ `items[].notes`, `items[].adaNotes`, `items[].jiraTicket` (add metadata)
- ✅ `items[].designSystem` (add/modify detection results)
- ✅ `meta.contentModel`, `meta.contentStage`, `meta.adaStatus`, `meta.legalStatus` (update status fields)
- ✅ `designSystemByNodeId` (add/modify detection map)

**What `postProcessContentTable` MUST NOT modify:**
- ❌ `type` (must remain `"universal-content-table"`)
- ❌ `version` (must remain `1` - bump version for breaking changes)
- ❌ `source` structure (pageId, pageName, selectionNodeId, selectionName must remain)
- ❌ Required field names (cannot rename or remove required fields)
- ❌ Required field types (cannot change string → number, etc.)

**Recommended Patterns:**
- **Deep clone before modifying**: Always clone the input table to avoid mutating the original
- **Preserve required fields**: Ensure all required fields exist in returned table
- **Return valid schema**: Returned table must pass validation (normalization will fix minor issues, but don't rely on it)
- **Handle errors gracefully**: If processing fails, return original table (never throw)

#### Validation and Normalization

**Location:** `core/contentTable/validate.ts`

**Functions:**
- `validateContentTableV1(table)`: Returns `{ ok: boolean, warnings: string[], errors: string[] }`
  - Checks required fields, item shapes, type correctness
  - Never throws - returns errors in result
  - Dev-only logging (controlled by `CONFIG.dev.enableContentTableValidationLogging`)

- `normalizeContentTableV1(table)`: Returns normalized `UniversalContentTableV1`
  - Ensures arrays are arrays
  - Fills missing required fields with safe defaults
  - Does NOT delete information - only adds defaults
  - Returns deep-cloned normalized copy (never mutates input)

**When Applied:**
- Normalization: After `scanContentTable()` and after `postProcessContentTable()` in Content Table handler
- Normalization: In Confluence export pipeline (before HTML conversion)
- Validation: After normalization in Content Table handler (dev-only warnings/errors)

**Error Handling:**
- Validation errors are logged (dev-only) but never break the flow
- Normalization always succeeds (fills defaults if needed)
- If validation fails, table is still used (with warnings logged)

#### Example: Safe postProcessContentTable Implementation

```typescript
// src/work/workAdapter.override.ts (Work Plugin)
import type { WorkAdapter, UniversalContentTableV1 } from '../core/work/adapter'

const workAdapter: WorkAdapter = {
  async postProcessContentTable(args: {
    table: UniversalContentTableV1
    selectionContext?: { pageId?: string; pageName?: string; rootNodeId?: string }
  }): Promise<UniversalContentTableV1> {
    const { table } = args
    
    // ✅ GOOD: Deep clone before modifying
    const processed = JSON.parse(JSON.stringify(table)) as UniversalContentTableV1
    
    // ✅ GOOD: Modify content values (allowed)
    processed.items = processed.items.map(item => ({
      ...item,
      content: {
        ...item.content,
        value: item.designSystem?.isDesignSystem 
          ? '[REDACTED]' 
          : item.content.value
      }
    }))
    
    // ✅ GOOD: Add metadata (allowed)
    processed.items = processed.items.map(item => ({
      ...item,
      notes: item.designSystem?.isDesignSystem 
        ? `${item.notes || ''} [FPO-DS Component]`.trim()
        : item.notes
    }))
    
    // ❌ BAD: Don't modify immutable fields
    // processed.type = 'something-else' // WRONG
    // processed.version = 2 // WRONG (bump version in schema, not here)
    
    // ❌ BAD: Don't remove required fields
    // delete processed.source // WRONG
    // delete processed.items[0].content // WRONG
    
    return processed
  }
}
```

**Current Status:** ✅ **Implemented** - Validation and normalization utilities exist, wired into Content Table handler and Confluence export pipeline.

---

### 5. Design System Detection (Legacy)

**Location:** Where design system detection is needed (e.g., selection context, Content Table scanner)

**Purpose:** Detect which design system a component belongs to (e.g., "Internal Design System v2.0", "Material Design v3").

**Extension Point:**
```typescript
workAdapter.designSystem?.detectSystem(node: SceneNode): Promise<DesignSystemInfo | null>
```

**When Called:**
- When design system information is needed (e.g., for Content Table metadata)
- Called for selected nodes or scanned components

**Implementation Example:**
```typescript
// work/adapter.ts (Work Plugin)
workAdapter.designSystem = {
  async detectSystem(node: SceneNode): Promise<DesignSystemInfo | null> {
    // Check component library
    if (node.type === 'INSTANCE' || node.type === 'COMPONENT') {
      const component = node.type === 'INSTANCE' 
        ? (node as InstanceNode).mainComponent 
        : (node as ComponentNode)
      
      if (component) {
        // Check component library name
        const libraryName = component.parent?.name
        if (libraryName?.includes('Internal Design System')) {
          return {
            name: 'Internal Design System',
            version: '2.0',
            tokens: { /* design tokens */ }
          }
        }
      }
    }
    
    return null
  }
}

export default workAdapter
```

**Current Status:** ⚠️ **Not yet implemented** - Extension point exists in adapter interface, but no call sites yet.

**Recommendation:** Add call sites where design system detection is needed (e.g., Content Table scanner, selection context).

---

### 3. Confluence Integration

**Location:** `ui/components/ConfluenceModal.tsx` and `ui.tsx` (UI thread)

**Purpose:** Send Content Tables to Confluence as formatted XHTML pages.

**Extension Point:**
```typescript
workAdapter.createConfluence?: (args: {
  confluenceTitle: string
  confluenceTemplateXhtml: string
}) => Promise<{ url?: string }>
```

**When Called:**
- When user clicks "Send to Confluence" quick action in Content Table UI
- User selects table format (Universal, Dev Only, etc.)
- User enters title in modal and clicks "Send"
- Called from UI thread (not main thread)

**UI Flow:**
1. **Input Stage**: User enters title for Confluence page
2. **Processing Stage**: Animated "Processing" indicator while sending
3. **Success Stage**: "Successfully sent to Confluence" message + optional "Go to Confluence" button (if URL returned)
4. **Error Stage**: Error message with "Back" and "Close" buttons

**Export Pipeline:**
Confluence export uses a canonical pipeline (`buildConfluenceXhtmlFromTable` in `core/contentTable/export/confluence.ts`):
1. **Post-Process**: Applies `postProcessContentTable` hook (if present) - allows Work to redact/normalize content
2. **Convert to HTML**: Uses `universalTableToHtml()` from `core/contentTable/renderers.ts`
3. **XHTML-Encode**: Uses `encodeXhtmlDocument()` from `core/encoding/xhtml.ts`
4. **Return**: XHTML string ready for Confluence API

This ensures Work can apply DS content handling rules once, and everything downstream is consistent.

**XHTML Encoding:**
- XHTML is encoded using `encodeXhtmlDocument()` from `core/encoding/xhtml.ts`
- Work adapter receives fully-encoded XHTML ready for Confluence API
- Encoding happens after post-processing, so redacted/normalized content is properly encoded
- Work implementation includes a safety check to re-encode if content appears unencoded (double-guard)

**Public Plugin Behavior:**
- If `workAdapter.createConfluence` is undefined (no Work override), Public plugin simulates success after 600-900ms delay
- Modal still shows full 3-stage flow (Input → Processing → Success)
- Success message appears, but no "Go to Confluence" button (no URL returned)
- Chat bubble "Table sent to Confluence" appears on successful close

**Payload Shape:**
The Work implementation sends exactly this payload structure:
```json
{
  "type": "createConfluence",
  "confluenceTitle": "<user input>",
  "confluenceTemplate": "<XHTML-encoded table string>"
}
```

**Authentication:**
- Uses browser session authentication (`credentials: 'include'` in fetch)
- No explicit auth headers required (relies on browser cookies/session)
- Endpoint is configured in `src/work/credentials.override.ts` (git-ignored)

**Response Handling:**
- Parses response JSON for URL in common keys: `url`, `link`, `location`, `_links.webui`, `_links.self`
- Returns `{ url?: string }` - if URL found, modal shows "Go to Confluence" button
- If no URL in response, returns `{}` and modal shows success without button

**Error Handling:**
- Non-2xx responses throw `Error` with status code and first 200 chars of response text
- Errors surface as readable messages in modal Error stage
- No raw object dumps - all errors are user-friendly strings

**Implementation Example:**
```typescript
// src/work/workAdapter.override.ts (Work Plugin)
import type { WorkAdapter } from '../core/work/adapter'
import { confluenceEndpoint } from './credentials.override'
import { encodeXhtmlDocument } from '../core/encoding/xhtml'

const workAdapter: WorkAdapter = {
  async createConfluence(args: {
    confluenceTitle: string
    confluenceTemplateXhtml: string
  }): Promise<{ url?: string }> {
    // Double-check XHTML encoding (UI already does it, but be safe)
    let xhtmlContent = args.confluenceTemplateXhtml
    if (!isXhtmlEncoded(xhtmlContent)) {
      xhtmlContent = encodeXhtmlDocument(xhtmlContent)
    }
    
    // Build payload exactly as specified
    const payload = {
      type: 'createConfluence',
      confluenceTitle: args.confluenceTitle,
      confluenceTemplate: xhtmlContent
    }
    
    const response = await fetch(confluenceEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload),
      credentials: 'include' // Use browser session for auth
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      const errorSnippet = errorText.substring(0, 200)
      throw new Error(`Confluence API error (${response.status}): ${errorSnippet}`)
    }
    
    const result = await response.json()
    const url = result.url || result.link || result.location || result._links?.webui || result._links?.self
    return { url }
  }
}

export default workAdapter
```

**Configuration:**
- Endpoint configured in `src/work/credentials.override.ts` (git-ignored)
- See `src/work/README.md` for setup instructions
- Placeholder endpoint must be replaced with actual Confluence API endpoint

**UI Success/Error Handling:**
- Success: Modal shows success state, chat bubble "Table sent to Confluence" appears on close
- Error: Modal shows error state with error message, user can go back or close
- Fallback (no Work adapter): Public plugin simulates success, chat bubble still appears

**Current Status:** ✅ **Implemented** - Extension point exists, modal UI implemented, Public plugin works with or without Work override.

---

### 4. Enterprise Authentication

**Location:** Where enterprise auth is needed (e.g., Confluence integration, internal APIs)

**Purpose:** Get enterprise authentication tokens for Work-only API calls.

**Extension Point:**
```typescript
workAdapter.auth?.getEnterpriseToken(): Promise<string>
```

**When Called:**
- Before making Work-only API calls (e.g., Confluence)
- Called from Work adapter implementations

**Implementation Example:**
```typescript
// src/work/workAdapter.override.ts (Work Plugin)
import type { WorkAdapter } from '../core/work/adapter'

const workAdapter: WorkAdapter = {
  auth: {
  async getEnterpriseToken(): Promise<string> {
    // Get token from secure storage
    const storedToken = await getTokenFromSecureStorage()
    if (storedToken && !isTokenExpired(storedToken)) {
      return storedToken
    }
    
    // Refresh token via SSO
    const newToken = await refreshTokenViaSSO()
    await saveTokenToSecureStorage(newToken)
    return newToken
  }
}

export default workAdapter
```

**Current Status:** ⚠️ **Not yet implemented** - Extension point exists in adapter interface, but no call sites yet.

**Recommendation:** Use in Confluence integration and other Work-only API calls.

---

## How Public Exposes Hooks

The Public Plugin exposes hooks by:

1. **Defining interface** in `core/work/adapter.ts` (interface only, no implementation):
   ```typescript
   export interface WorkAdapter {
     designSystem?: {
       shouldIgnore(node: SceneNode): boolean
       detectSystem(node: SceneNode): Promise<DesignSystemInfo | null>
     }
     confluenceApi?: {
       sendTable(table: UniversalContentTableV1, format: string): Promise<void>
     }
     auth?: {
       getEnterpriseToken(): Promise<string>
     }
   }
   ```

2. **Loading adapter** via `loadWorkAdapter()`:
   ```typescript
   import { loadWorkAdapter } from './core/work/loadAdapter'
   const workAdapter = await loadWorkAdapter()
   ```
   This will use the override file if present, otherwise a no-op adapter.

3. **Calling hooks with optional chaining**:
   ```typescript
   if (workAdapter.designSystem?.shouldIgnore(node)) {
     return // Skip this node
   }
   ```

4. **Providing fallbacks** when hooks are undefined:
   ```typescript
   if (workAdapter.confluenceApi) {
     await workAdapter.confluenceApi.sendTable(table, format)
   } else {
     // Fallback: copy to clipboard
     await handleCopyTable(format, 'html')
   }
   ```

## How Work Implements Hooks Safely

The Work Plugin implements hooks by:

1. **Creating override file**: `src/work/workAdapter.override.ts`

2. **Exporting WorkAdapter**:
   ```typescript
   import type { WorkAdapter } from '../core/work/adapter'
   
   const workAdapter: WorkAdapter = {
     designSystem: {
       shouldIgnore(node: SceneNode): boolean {
         // Implementation
       },
       async detectSystem(node: SceneNode): Promise<DesignSystemInfo | null> {
         // Implementation
       }
     }
   }
   
   export default workAdapter
   ```

3. **Following interface contracts**:
   - Return types must match interface
   - Parameters must match interface
   - Errors should be thrown (not returned)

4. **Testing implementations**:
   - Test each hook independently
   - Test error cases
   - Test with real Figma nodes

## Adding New Extension Points

To add a new extension point:

1. **Add to interface** in `core/work/adapter.ts`:
   ```typescript
   export interface WorkAdapter {
     // ... existing hooks
     newFeature?: {
       doSomething(input: string): Promise<string>
     }
   }
   ```

2. **No stub needed** - the loader will use defaultAdapter if override doesn't provide it.

3. **Call hook** in Public Plugin code (using `loadWorkAdapter()`):
   ```typescript
   if (workAdapter.newFeature) {
     const result = await workAdapter.newFeature.doSomething(input)
   }
   ```

4. **Document** in this file (EXTENSION_POINTS.md)

5. **Implement** in Work Plugin's `src/work/workAdapter.override.ts`

## Best Practices

### ✅ DO

- Use optional chaining (`?.`) when calling hooks
- Provide fallbacks when hooks are undefined
- Document hook contracts clearly
- Test hooks independently
- Handle errors gracefully

### ❌ DON'T

- Don't assume hooks are always defined
- Don't modify Public Plugin code to add hooks
- Don't break interface contracts
- Don't scatter hook logic across multiple files
- Don't hardcode Work-specific behavior in Public Plugin

## Public Utilities for Work Plugin

The Public Plugin provides utility functions that Work can use for common tasks like Confluence export.

### XHTML Encoding Utilities

**Location:** `core/encoding/xhtml.ts`

**Purpose:** Provides safe XHTML encoding functions for use in Confluence export and other contexts requiring strict XHTML compliance. These utilities are pure TypeScript (no DOM dependencies) and work in both main thread and UI thread contexts.

**Available Functions:**

1. **`encodeXhtmlDocument(input: string): string`**
   - Encodes a full XHTML document
   - Converts attribute quotes from double to single
   - Self-closes void elements (`<br>` → `<br />`, `<img>` → `<img />`)
   - Removes parentheses from text nodes
   - Removes non-ASCII characters from text nodes (replaced with spaces)
   - Escapes ampersands (preserving valid entities like `&amp;`, `&#123;`)
   - Encodes `<` and `>` in text nodes only (not inside tags)

2. **`encodeXhtmlCellValue(input: string): string`**
   - Stricter encoder for individual table cell values
   - Does NOT introduce any HTML tags
   - Applies: parentheses removal, non-ASCII removal, ampersand escaping, `<`/`>` encoding

3. **`encodeFigmaUrl(input: string): string`**
   - Encodes URLs safely for inclusion in XHTML attributes (e.g., `href`, `src`)
   - Does not double-encode already-encoded sequences
   - Conservative approach: only encodes problematic characters

**Usage Example:**
```typescript
import { encodeXhtmlDocument, encodeXhtmlCellValue, encodeFigmaUrl } from '../core/encoding/xhtml'

// In Work Plugin's Confluence export implementation
const htmlTable = generateTableHtml(contentTable)
const xhtmlTable = encodeXhtmlDocument(htmlTable)

const cellValue = 'Price: $100 (USD) & café'
const encodedCell = encodeXhtmlCellValue(cellValue) // 'Price: $100 USD &amp; caf '

const url = 'https://www.figma.com/file/abc?node-id=123'
const encodedUrl = encodeFigmaUrl(url) // Safe for href attribute
```

**Testing:**
Run the test harness to verify encoding functions:
```bash
tsx scripts/test-xhtml-encoding.ts
```

**Current Status:** ✅ **Implemented** - Utilities are available for use in Work Plugin's Confluence integration.

---

## Summary

Extension points allow the Work Plugin to inject proprietary behavior without modifying Public Plugin code. All extension points are:

- ✅ Defined in `core/work/adapter.ts` (interface)
- ✅ Loaded via `loadWorkAdapter()` (uses override if present, no-op otherwise)
- ✅ Called with optional chaining
- ✅ Implemented in Work Plugin's `src/work/workAdapter.override.ts`
- ✅ Documented in this file

This ensures clean separation between Public and Work plugins while maintaining extensibility. The Public Plugin compiles and runs without any Work-specific code.

