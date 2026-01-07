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

### 3. Design System Detection (Legacy)

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

**Location:** `ui.tsx` (UI thread)

**Purpose:** Send Content Tables to Confluence as formatted HTML/TSV/JSON.

**Extension Point:**
```typescript
workAdapter.confluenceApi?.sendTable(
  table: UniversalContentTableV1,
  format: string
): Promise<void>
```

**When Called:**
- When user clicks "Send to Confluence" button in Content Table UI
- Called from UI thread (not main thread)

**Payload Shape:**
```typescript
interface UniversalContentTableV1 {
  meta: {
    version: '1.0'
    generatedAt: string
    source: string // e.g., "Figma Selection"
  }
  items: Array<{
    id: string
    text: string
    path: string // Breadcrumb path
    component?: {
      kind: 'component' | 'componentSet' | 'instance' | 'custom'
      name: string
      key?: string
      variantProperties?: Record<string, string>
    }
  }>
}
```

**Format Options:**
- `'html'`: HTML table format (for Confluence)
- `'tsv'`: Tab-separated values
- `'json'`: JSON format

**XHTML Encoding Requirement:**
- Confluence requires XHTML-encoded content
- Special characters must be escaped: `<`, `>`, `&`, `"`, `'`
- Use `universalTableToHtml()` from `core/contentTable/renderers.ts` which handles encoding

**Implementation Example:**
```typescript
// src/work/workAdapter.override.ts (Work Plugin)
import type { WorkAdapter } from '../core/work/adapter'

const workAdapter: WorkAdapter = {
  confluenceApi: {
  async sendTable(table: UniversalContentTableV1, format: string): Promise<void> {
    // Get enterprise auth token
    const token = await workAdapter.auth?.getEnterpriseToken()
    if (!token) {
      throw new Error('Enterprise auth token not available')
    }
    
    // Convert table to requested format
    let content: string
    if (format === 'html') {
      content = universalTableToHtml(table)
    } else if (format === 'tsv') {
      content = universalTableToTsv(table)
    } else {
      content = universalTableToJson(table)
    }
    
    // Send to Confluence API
    const response = await fetch('https://confluence.internal/api/content', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Atlassian-Token': 'no-check'
      },
      body: JSON.stringify({
        type: 'page',
        title: `Content Table - ${new Date().toISOString()}`,
        space: { key: 'DESIGN' },
        body: {
          storage: {
            value: content,
            representation: 'storage'
          }
        }
      })
    })
    
    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Confluence API error: ${response.status} ${error}`)
    }
  }
}

export default workAdapter
```

**UI Success/Error Messaging:**
- Success: UI shows message "Table sent to Confluence (html)."
- Error: UI shows error message with details
- Fallback: If adapter is undefined, UI falls back to copying to clipboard

**Current Status:** ✅ **Implemented** - Extension point exists and is called from UI.

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

