# Artifact Components

This directory contains artifact component implementations for the Figma stage artifact system.

## What is an Artifact Component?

An artifact component is a reusable UI element that can be placed on the Figma canvas. Examples include:
- **Scorecard** - Design Critique Assistant scorecards
- **Note** - Text notes and annotations (future)
- **Report** - Structured reports and summaries (future)

## How to Add a New Artifact Type

### Step 1: Create Component File

Create a new file in this directory: `components/yourArtifactType.ts`

```typescript
import type { ArtifactComponent, ArtifactRenderContext } from '../index'

/**
 * Your artifact data type
 */
export interface YourArtifactData {
  // Define your data structure
}

/**
 * Your artifact component implementation
 */
export class YourArtifactComponent implements ArtifactComponent {
  getDefaultWidth(): number {
    return 400  // Default width for your artifact
  }
  
  async render(context: ArtifactRenderContext): Promise<void> {
    const { root, data } = context
    
    // Validate data type
    if (!data || typeof data !== 'object') {
      throw new Error('YourArtifactComponent requires YourArtifactData object')
    }
    
    const artifactData = data as YourArtifactData
    
    // Configure root frame styling
    root.layoutMode = 'VERTICAL'  // or 'HORIZONTAL' or 'NONE'
    root.paddingTop = 16
    root.paddingRight = 16
    root.paddingBottom = 16
    root.paddingLeft = 16
    root.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }]
    // ... other styling
    
    // Build your artifact content
    // Use figma.createFrame(), figma.createText(), etc.
    // Append all children to root (or to intermediate frames that are appended to root)
  }
}

/**
 * Export singleton instance for registration
 */
export const yourArtifactComponent = new YourArtifactComponent()
```

### Step 2: Register Component

Edit `artifacts/index.ts` and add your component to `initializeArtifactComponents()`:

```typescript
export function initializeArtifactComponents(): void {
  // ... existing registrations ...
  
  import('./components/yourArtifactType').then(({ yourArtifactComponent }) => {
    registerArtifactComponent('your_artifact_type', yourArtifactComponent)
  }).catch((error) => {
    console.error('[Artifacts] Failed to register your artifact component:', error)
  })
}
```

### Step 3: Use in Assistant Handler

In your assistant handler, use `createArtifact()`:

```typescript
import { createArtifact } from '../../figma/artifacts'

// In your handler's handleResponse method:
await createArtifact({
  type: 'your_artifact_type',
  assistant: 'your_assistant_id',
  selectedNode,
  version: 'v1',  // optional
  replace: true   // optional, default: true
}, yourData)
```

## Component Interface

All artifact components must implement the `ArtifactComponent` interface:

```typescript
interface ArtifactComponent {
  /**
   * Render the artifact content into the provided root frame
   * The root frame is already created, placed, and has basic layout properties set
   */
  render(context: ArtifactRenderContext): Promise<void>
  
  /**
   * Get the default width for this artifact type
   */
  getDefaultWidth(): number
}
```

## Render Context

The `render()` method receives an `ArtifactRenderContext`:

```typescript
interface ArtifactRenderContext {
  root: FrameNode                 // Pre-created and placed root frame
  selectedNode?: SceneNode        // Original selection
  options: CreateArtifactOptions  // Original creation options
  data: unknown                    // Component-specific data
}
```

## Important Guidelines

1. **Append to root**: All content must be appended to `context.root` (or to frames that are appended to root)
2. **No frame creation/placement**: The root frame is already created and placed by the orchestrator
3. **Styling**: Configure `root` frame properties (layoutMode, padding, fills, etc.) in your `render()` method
4. **Error handling**: Throw errors if data validation fails
5. **Type safety**: Validate `data` type before using it

## Examples

See `scorecard.ts` for a complete example of an artifact component implementation.
