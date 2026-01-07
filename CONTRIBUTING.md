# Contributing to FigmAI Plugin

This document outlines the architecture, conventions, and guidelines for contributing to the FigmAI plugin codebase.

## Architecture Overview

The plugin follows a modular architecture with clear separation between:
- **Core**: Reusable, public-facing functionality
- **Assistants**: Modular AI functionalities with handlers
- **Work Adapter**: Extension points for Work-only features
- **UI**: React-based user interface

### Directory Structure

```
src/
├── core/                          # PUBLIC: Reusable core
│   ├── assistants/
│   │   └── handlers/              # Assistant response handlers
│   ├── stage/                     # Unified rendering system
│   ├── output/                    # Response normalization
│   ├── provider/                  # LLM providers
│   └── work/                      # Work adapter interface (stubs)
├── assistants/                    # Assistant registry
├── ui/                            # React UI components
└── main.ts                        # Thin orchestrator
```

## Key Principles

### 1. Assistant Handler Pattern

**DO**: Add assistant-specific logic in handlers

- Create `core/assistants/handlers/{assistantId}.ts`
- Implement `AssistantHandler` interface
- Register in `handlers/index.ts`

**DON'T**: Add assistant-specific logic to `main.ts`

- No `if (assistantId === '...')` blocks in `main.ts`
- Use handler pattern instead

**Example:**

```typescript
// core/assistants/handlers/myAssistant.ts
export class MyAssistantHandler implements AssistantHandler {
  canHandle(assistantId: string, actionId: string): boolean {
    return assistantId === 'my_assistant' && actionId === 'my_action'
  }

  async handleResponse(context: HandlerContext): Promise<HandlerResult> {
    // Handle response here
    return { handled: true }
  }
}
```

### 2. Rendering System

**DO**: Use artifact system for rendering

- Import from `core/figma/artifacts/placeArtifact.ts`
- Use `placeArtifactFrame()` for placement
- Use `renderScorecard.ts` for scorecards

**DON'T**: Create new rendering systems

- Don't duplicate placement logic
- Don't create `createXFrameOnCanvas` functions
- Use existing systems: `core/figma/artifacts/` or `core/stage/`

### 3. Work Adapter Pattern

**DO**: Add Work features via adapter

- Add stub to `core/work/adapter.ts`
- Implement in `work/adapter.ts` (Work-only)
- Use `workAdapter.{feature}?.call()` in Public code

**DON'T**: Hardcode Work-only features

- No direct Confluence API calls in Public code
- No design system detection in Public code
- Use adapter pattern

**Example:**

```typescript
// core/work/adapter.ts (PUBLIC)
export const workAdapter: WorkAdapter = {
  confluenceApi: undefined, // Work will override
}

// work/adapter.ts (WORK-ONLY)
import { workAdapter } from '../core/work/adapter'
workAdapter.confluenceApi = {
  async sendTable(table, format) {
    // Real Confluence API call
  }
}
```

### 4. Keep `main.ts` Thin

**DO**: Keep `main.ts` focused on orchestration

- Target: <400 lines
- Delegate to handlers, tools, providers
- No assistant-specific logic

**DON'T**: Add business logic to `main.ts`

- No assistant-specific `if` blocks
- No rendering logic
- No parsing logic

## Adding a New Assistant

1. **Define assistant** in `assistants/index.ts`
2. **Create handler** in `core/assistants/handlers/{assistantId}.ts`
3. **Register handler** in `core/assistants/handlers/index.ts`
4. **Test** the assistant

## Adding Work Features

1. **Add stub** to `core/work/adapter.ts`
2. **Implement** in `work/adapter.ts` (Work-only)
3. **Use** `workAdapter.{feature}?.call()` in Public code

## File Naming Conventions

- **Handlers**: `{assistantId}.ts` (e.g., `designCritique.ts`)
- **Utilities**: `{purpose}.ts` (e.g., `placeArtifact.ts`)
- **Types**: `types.ts` or `{module}Types.ts`

## Code Style

- Use TypeScript strict mode
- Prefer explicit types over `any`
- Use async/await over promises
- Keep functions focused and small
- Add JSDoc comments for public APIs

## Testing

- Test handlers independently
- Test rendering paths
- Test error handling
- Test Work adapter stubs

## Migration Path for Work Plugin

1. Copy Public codebase to Work repository
2. Add `work/adapter.ts` with real implementations
3. Override `core/work/adapter.ts` exports (or use module replacement)
4. Add Work-specific assistants to `assistants/index.ts`
5. Test Work features

**Future updates**: Pull Public changes, merge conflicts only in `work/adapter.ts` (single file)

## Questions?

If you're unsure about where to add code or how to structure a feature, ask the Code Steward or refer to this document.

