# Extension Points

**For:** Developers implementing Custom Plugin features  
**Purpose:** Complete reference for all extension points and implementation guides  
**When to read:** When implementing custom-only features or extending plugin functionality

---

This document describes all extension points where the Custom Plugin can inject proprietary behavior into the Public Plugin.

## Overview

The Public Plugin exposes extension points via the Custom Adapter (`core/work/adapter.ts`). The Custom Plugin implements these extension points in `src/work/workAdapter.override.ts` to add custom-only features without modifying Public Plugin code.

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
// src/work/workAdapter.override.ts (Custom Plugin)
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
- Handler loads custom adapter via `loadWorkAdapter()`
- Calls `getContentTableIgnoreRules()` if available
- Passes rules to `scanContentTable()` which applies them during node collection
- Invalid regex patterns are safely ignored (logged as warnings)
- Rules are applied with OR logic (if any rule matches, node is ignored)

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
// src/work/workAdapter.override.ts (Custom Plugin)
import type { WorkAdapter, DesignSystemDetectionResult } from '../core/work/adapter'

const workAdapter: WorkAdapter = {
  detectDesignSystemComponent(node: SceneNode): DesignSystemDetectionResult | null {
    // Check if node is an instance with a known DS component key
    if (node.type === 'INSTANCE') {
      const instance = node as InstanceNode
      const mainComponent = instance.mainComponent
      if (mainComponent) {
        const componentKey = mainComponent.key
        // Check against known DS component key patterns (custom-specific logic)
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
    // Check node name for DS indicators
    if (node.name.startsWith('DS/') || node.name.startsWith('DesignSystem/')) {
      return {
        isDesignSystem: true,
        systemName: 'Internal Design System',
        componentName: node.name,
        reason: 'Node name indicates design system component'
      }
    }
    return null
  }
}
```

**How It Works:**
- Handler loads custom adapter via `loadWorkAdapter()`
- Gets `detectDesignSystemComponent` callback if available
- Passes callback to `scanContentTable()` which calls it during node traversal
- Results are cached by node.id to avoid redundant calls
- Detection results stored in `item.designSystem` (per-item) and `table.designSystemByNodeId` (table-level map)

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

**Purpose:** Modify the scanned Content Table after scanning but before it's used/exported. This allows custom implementations to apply proprietary rules for handling content from design system components (redaction, normalization, replacement, grouping, etc.) without embedding proprietary logic in the Public plugin.

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
// src/work/workAdapter.override.ts (Custom Plugin)
import type { WorkAdapter, UniversalContentTableV1 } from '../core/work/adapter'

const workAdapter: WorkAdapter = {
  async postProcessContentTable(args: {
    table: UniversalContentTableV1
    selectionContext?: { pageId?: string; pageName?: string; rootNodeId?: string }
  }): Promise<UniversalContentTableV1> {
    const { table } = args
    // Deep clone before modifying
    const processed = JSON.parse(JSON.stringify(table)) as UniversalContentTableV1
    
    // Example: Redact sensitive content from DS components
    processed.items = processed.items.map(item => {
      if (item.designSystem?.isDesignSystem) {
        return {
          ...item,
          content: {
            ...item.content,
            value: item.content.value
              .replace(/[\w.-]+@[\w.-]+\.\w+/g, '[REDACTED]')
              .replace(/\d{3}-\d{3}-\d{4}/g, '[REDACTED]')
          }
        }
      }
      return item
    })
    
    return processed
  }
}
```

**Error Handling:**
- If hook throws, error is caught and logged; original table is used
- Content Table generation flow is never broken by post-processing errors

**Return Value:**
- Must return `UniversalContentTableV1` (original or modified copy)
- Can be synchronous or async

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

**Purpose:** Define and enforce schema invariants for `UniversalContentTableV1` to ensure stable Public↔Custom contract.

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

#### Custom Extension Permissions

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

**Example: Safe Implementation**
- Always deep clone before modifying
- Modify content values, metadata (allowed)
- Never modify `type`, `version`, or remove required fields

---

### 5. Design Workshop Assistant

**Location:** `core/assistants/handlers/designWorkshop.ts`, `core/designWorkshop/`

**Purpose:** Generate 1-5 Figma screens on-canvas from a strict JSON specification. Screens are placed in a new Section on the current page, completely ignoring any selection.

#### Overview

The Design Workshop assistant allows users to describe screens in natural language, and the AI generates a JSON specification that is then rendered to Figma screens. The implementation includes:

- **JSON-only enforcement**: Model output must be valid JSON (no prose, no markdown, no code fences)
- **Validation**: Non-throwing validation with errors/warnings
- **Normalization**: Fills safe defaults, enforces 1-5 screen limit
- **Repair flow**: If validation fails, asks model to fix JSON and retries
- **Deterministic rendering**: Same spec always produces same visual result
- **Section-based placement**: Screens are placed in a new Section, ignoring selection

#### DesignSpecV1 Schema

**Required Fields:**
- `type`: Must be `"designScreens"` (immutable)
- `version`: Must be `1` (immutable - bump version for breaking changes)
- `meta.title`: String (required)
- `canvas.device.kind`: `"mobile" | "tablet" | "desktop"` (required)
- `canvas.device.width`: Positive number (required)
- `canvas.device.height`: Positive number (required)
- `render.intent.fidelity`: `"wireframe" | "medium" | "hi" | "creative"` (required)
- `screens`: Array of 1-5 screen objects (required)

**Screen Structure:**
```typescript
{
  name: string
  layout?: {
    direction?: "vertical" | "horizontal"
    padding?: number | { top?: number; right?: number; bottom?: number; left?: number }
    gap?: number
  }
  blocks: Array<BlockSpec>
}
```

**Block Types (Minimal Set):**
- `heading`: `{ type: "heading", text: string, level?: 1 | 2 | 3 }`
- `bodyText`: `{ type: "bodyText", text: string }`
- `button`: `{ type: "button", text: string, variant?: "primary" | "secondary" | "tertiary" }`
- `input`: `{ type: "input", label?: string, placeholder?: string, inputType?: "text" | "email" | "password" }`
- `card`: `{ type: "card", title?: string, content: string }`
- `spacer`: `{ type: "spacer", height?: number }`
- `image`: `{ type: "image", src?: string, alt?: string, width?: number, height?: number }`

**Fidelity Modes:**
- **wireframe**: Grayscale, simple placeholders, minimal typography, no shadows/corners
- **medium**: Basic colors, clear hierarchy, subtle borders, light shadows, basic rounded corners
- **hi**: Full colors, rich typography, refined borders, layered shadows, generous rounded corners
- **creative**: Bold colors, experimental typography, large rounded corners, dramatic shadows

#### Validation and Normalization

**Location:** `core/designWorkshop/validate.ts`

**Functions:**
- `validateDesignSpecV1(spec)`: Returns `{ ok: boolean, warnings: string[], errors: string[] }`
  - Checks required fields, device kind/dimensions, fidelity enum, screen count (1-5)
  - Validates each block type and required fields
  - Never throws - returns errors in result

- `normalizeDesignSpecV1(spec)`: Returns normalized `DesignSpecV1`
  - Fills device defaults (mobile: 375x812, tablet: 768x1024, desktop: 1920x1080)
  - Sets fidelity default to "medium" if missing
  - Fills layout defaults (direction: "vertical", padding: 16, gap: 12)
  - **Enforces 1-5 screens**: Truncates if >5, sets `meta.truncationNotice`
  - Fills block defaults (heading level, button variant, spacer height, etc.)
  - Returns deep-cloned normalized copy (never mutates input)

#### Rendering

**Location:** `core/designWorkshop/renderer.ts`

**Function:** `renderDesignSpecToSection(spec: DesignSpecV1): Promise<{ section: FrameNode, screens: FrameNode[] }>`

**Section Placement:**
- Creates new Section (FrameNode) on `figma.currentPage`
- **NO SELECTION ANCHORING** - completely ignores selection
- Placement logic:
  - If existing nodes: finds lowest/bottom-most bounding box, places Section at `y = lowestBottom + 120px`
  - If no nodes: places at `x=0, y=0` (ensures `y >= 0`)
  - Clamps to prevent off-canvas

**Screen Rendering:**
- Creates 1-5 device-sized screen frames inside Section
- Each screen uses auto-layout based on `layout` spec
- Screens arranged horizontally with 80px spacing
- Blocks rendered in order with fidelity-specific styling
- Deterministic output (same spec = same visual result)

#### JSON Enforcement and Repair

**Location:** `core/assistants/handlers/designWorkshop.ts`

**JSON Enforcement:**
- System message: "Return ONLY valid JSON. No prose. No markdown. No code fences."
- Final user message: Describes schema keys and 1-5 screen limit

**Repair Flow:**
- If JSON parsing or validation fails, calls model with repair prompt
- Repair prompt includes full schema structure
- Retries validation after repair
- If repair fails, shows error message to user

#### UI Feedback

- **While generating**: Shows "Analyzing..." with animated spinner (reuses existing pattern)
- **On success**: Appends chat bubble "Screens placed on stage"
- **If truncated**: Appends "Generated 5 screens. Ask for more to continue."

#### Future: Design System Reference Packs

**Status:** 📋 **Documentation Placeholder Only** - Not implemented yet

**Concept:**
Design System Reference Packs would be JSON document packs that describe design system tokens and components. This would allow the Design Workshop renderer to use actual design system components instead of primitives.

**Where It Would Plug In:**
- Could extend `render.intent` with optional `dsReferencePack?: string` field
- Renderer would load pack JSON and map block intents to components
- Example: `"button/primary"` → lookup component key from pack → create instance

**How It Would Work:**
1. Custom Plugin provides DS Reference Pack JSON (describes tokens, components, mappings)
2. Pack loaded at runtime (or bundled with Custom Plugin)
3. Renderer checks pack before rendering primitives
4. If pack has mapping for block intent, use component instance
5. Otherwise, fall back to primitive rendering (current behavior)

**Note:** Design System Reference Packs are a future enhancement placeholder. Current implementation uses primitive rendering only.

---

### 6. Design System Detection (Legacy)

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
// work/adapter.ts (Custom Plugin)
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

**Note:** Extension point exists in adapter interface, but no call sites yet. Add call sites where design system detection is needed.

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
- Custom adapter receives fully-encoded XHTML ready for Confluence API
- Encoding happens after post-processing, so redacted/normalized content is properly encoded
- Work implementation includes a safety check to re-encode if content appears unencoded (double-guard)

**Public Plugin Behavior:**
- If `workAdapter.createConfluence` is undefined (no custom override), Public plugin simulates success after 600-900ms delay
- Modal shows full 3-stage flow; success message appears without "Go to Confluence" button

**Payload Shape:**
The custom implementation sends exactly this payload structure:
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
// src/work/workAdapter.override.ts (Custom Plugin)
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
- Fallback (no Custom adapter): Public plugin simulates success, chat bubble still appears


---

### 4. Enterprise Authentication

**Location:** Where enterprise auth is needed (e.g., Confluence integration, internal APIs)

**Purpose:** Get enterprise authentication tokens for custom-only API calls.

**Extension Point:**
```typescript
workAdapter.auth?.getEnterpriseToken(): Promise<string>
```

**When Called:**
- Before making custom-only API calls (e.g., Confluence)
- Called from custom adapter implementations

**Implementation Example:**
```typescript
// src/work/workAdapter.override.ts (Custom Plugin)
import type { WorkAdapter } from '../core/work/adapter'

const workAdapter: WorkAdapter = {
  auth: {
    async getEnterpriseToken(): Promise<string> {
      // Get token from secure storage or refresh via SSO
      const storedToken = await getTokenFromSecureStorage()
      if (storedToken && !isTokenExpired(storedToken)) {
        return storedToken
      }
      const newToken = await refreshTokenViaSSO()
      await saveTokenToSecureStorage(newToken)
      return newToken
    }
  }
}
```

**Note:** Extension point exists in adapter interface, but no call sites yet. Use in Confluence integration and other custom-only API calls.

---

## How Public Exposes Hooks

The Public Plugin exposes hooks by:
1. **Defining interface** in `core/work/adapter.ts` (interface only, no implementation)
2. **Loading adapter** via `loadWorkAdapter()` (uses override if present, otherwise no-op)
3. **Calling hooks with optional chaining** (`workAdapter.hook?.method()`)
4. **Providing fallbacks** when hooks are undefined

## How Custom Implements Hooks Safely

The Custom Plugin implements hooks by:
1. **Creating override file**: `src/work/workAdapter.override.ts`
2. **Exporting WorkAdapter** matching the interface contract
3. **Following interface contracts**: Return types and parameters must match
4. **Testing implementations**: Test each hook independently with real Figma nodes

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

5. **Implement** in Custom Plugin's `src/work/workAdapter.override.ts`

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
- Don't hardcode custom-specific behavior in Public Plugin

## Public Utilities for Custom Plugin

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
import { encodeXhtmlDocument } from '../core/encoding/xhtml'

// In custom plugin's Confluence export implementation
const htmlTable = generateTableHtml(contentTable)
const xhtmlTable = encodeXhtmlDocument(htmlTable)
```


---

## Implementation Guide

This section provides implementation examples for custom-specific extensions that use the registry pattern (Component Scanner, Knowledge Base Loader, Compliance Hook, Custom Provider). These are separate from the Custom Adapter extension points documented above.

### Component Scanner

Detect and extract metadata from internal design system components.

**Interface:** `ComponentScanner` in `core/extensions/componentScanner.ts`

**Implementation Example:**

```typescript
// src/extensions/customComponentScanner.ts
import type { ComponentScanner } from '../core/extensions/componentScanner'

export class CustomComponentScanner implements ComponentScanner {
  detectDesignSystemComponent(node: SceneNode): DesignSystemComponent | null {
    // Detect components with naming pattern "DS/ComponentName/Variant"
    if (node.type === 'INSTANCE' && node.name.startsWith('DS/')) {
      const parts = node.name.substring(3).split('/')
      return {
        systemName: 'CompanyDesignSystem',
        componentName: parts[0] || 'Unknown',
        variant: parts[1]
      }
    }
    return null
  }
}
```

**Registration:** Register in `main.ts` on plugin startup.

---

### Knowledge Base Loader

Load assistant knowledge bases from custom sources (e.g., internal server).

**Interface:** `KnowledgeBaseLoader` in `core/extensions/knowledgeBaseLoader.ts`

**Implementation Example:**

```typescript
// src/extensions/customKnowledgeBaseLoader.ts
import type { KnowledgeBaseLoader } from '../core/extensions/knowledgeBaseLoader'

export class CustomKnowledgeBaseLoader implements KnowledgeBaseLoader {
  constructor(private baseUrl: string) {}
  
  async loadKnowledgeBase(assistantId: string): Promise<string> {
    const response = await fetch(`${this.baseUrl}/${assistantId}.md`)
    if (!response.ok) throw new Error(`Failed to load KB: ${response.status}`)
    return await response.text()
  }
  
  async listAssistants(): Promise<Assistant[]> {
    const response = await fetch(`${this.baseUrl}/assistants.json`)
    const data = await response.json()
    return data.assistants || []
  }
}
```

**Registration:** Register in `main.ts` on plugin startup with custom knowledge base URL.

---

### Compliance Hook

Implement compliance logging, request validation, and response sanitization.

**Interface:** `ComplianceHook` in `core/extensions/complianceHook.ts`

**Implementation Example:**

```typescript
// src/extensions/customComplianceHook.ts
import type { ComplianceHook } from '../core/extensions/complianceHook'

export class CustomComplianceHook implements ComplianceHook {
  constructor(private config: {
    logEndpoint: string
    restrictedAssistants?: string[]
    sensitivePatterns?: RegExp[]
  }) {}
  
  async validateRequest(request: ChatRequest): Promise<ComplianceResult> {
    // Block restricted assistants, sanitize sensitive data
    if (this.config.restrictedAssistants?.includes(request.assistantId || '')) {
      return { allowed: false, reason: 'Assistant not allowed' }
    }
    return { allowed: true, sanitizedRequest: this.sanitizeRequest(request) }
  }
  
  async sanitizeResponse(response: string): Promise<string> {
    // Remove sensitive patterns
    return this.config.sensitivePatterns?.reduce(
      (text, pattern) => text.replace(pattern, '[REDACTED]'),
      response
    ) || response
  }
  
  async logInteraction(interaction: InteractionLog): Promise<void> {
    await fetch(this.config.logEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(interaction)
    }).catch(() => {}) // Don't block user on logging failure
  }
}
```

**Registration:** Register in `main.ts` on plugin startup when compliance mode is enabled.

---

### Custom Provider

Implement custom LLM provider for custom-specific LLM endpoints.

**Interface:** `Provider` in `core/provider/provider.ts`

**Implementation Example:**

```typescript
// src/extensions/customProvider.ts
import type { Provider, ChatRequest } from '../core/provider/provider'

export class CustomProvider implements Provider {
  readonly id = 'custom-llm'
  readonly label = 'Custom LLM'
  readonly isEnabled = true
  
  async sendChat(request: ChatRequest): Promise<string> {
    const settings = await getSettings()
    const response = await fetch(`${settings.proxyBaseUrl}/v1/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${settings.sessionToken}`
      },
      body: JSON.stringify({ model: settings.defaultModel, messages: request.messages })
    })
    if (!response.ok) throw new Error(`Custom LLM request failed: ${response.status}`)
    const data = await response.json()
    return data.content || data.text || ''
  }
  
  async testConnection(): Promise<{ success: boolean; message: string }> {
    // Test connection to custom LLM endpoint
    return { success: true, message: 'Connection successful' }
  }
}
```

**Registration:** Register in provider factory when custom provider ID is requested.

---

### Best Practices

- **Error Handling:** Always handle errors gracefully, fallback to defaults
- **Logging:** Log extension activity for debugging
- **Performance:** Cache results when possible (e.g., KB loading)
- **Validation:** Validate inputs and outputs

### Troubleshooting Extensions

- **Extension Not Loading:** Verify module path, file exists, exports correctly, registered in `main.ts`
- **Extension Not Executing:** Verify registration before use, registry key matches, interface implemented correctly
- **Performance Issues:** Cache expensive operations, use async for network calls

---

## Summary

Extension points allow the Custom Plugin to inject proprietary behavior without modifying Public Plugin code. All extension points are:

- ✅ Defined in `core/work/adapter.ts` (interface)
- ✅ Loaded via `loadWorkAdapter()` (uses override if present, no-op otherwise)
- ✅ Called with optional chaining
- ✅ Implemented in Custom Plugin's `src/work/workAdapter.override.ts`
- ✅ Documented in this file

This ensures clean separation between Public and Custom plugins while maintaining extensibility. The Public Plugin compiles and runs without any custom-specific code.

