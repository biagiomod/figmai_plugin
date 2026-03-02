# FigmAI Plugin

AI-powered design assistance for Figma. Provides multiple specialized assistants for design critique, content extraction, accessibility review, and more.

---

## Project Overview

FigmAI is a Figma plugin that integrates Large Language Models (LLMs) to provide intelligent design assistance. The plugin supports multiple "assistants," each specialized for different tasks:

- **Design Critique**: Evaluates designs and provides structured feedback
- **Content Table**: Extracts and organizes text content from designs
- **Accessibility**: Reviews designs for accessibility compliance
- **UX Copy Review**: Analyzes and improves copy
- **Dev Handoff**: Generates developer-friendly specifications
- **General Assistant**: Answers design questions and provides guidance

The plugin architecture is designed to be **Public Plugin** (open source) with a clean extension point for **Custom Plugin** (proprietary/internal version) via a single adapter file.

---

## High-Level Architecture

The plugin follows a **two-thread architecture**:

```
┌─────────────────────────────────────────────────────────────┐
│                    Figma Plugin Sandbox                      │
│                                                               │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Main Thread (main.ts)                               │   │
│  │  • Message routing                                    │   │
│  │  • Handler orchestration                              │   │
│  │  • Provider management                                │   │
│  │  • Selection context building                         │   │
│  │  • Canvas rendering                                   │   │
│  └──────────────────────────────────────────────────────┘   │
│                          ↕ postMessage                        │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  UI Thread (ui.tsx)                                   │   │
│  │  • React UI components                                │   │
│  │  • User interaction                                   │   │
│  │  • Message display                                    │   │
│  │  • Stateless (main thread is source of truth)        │   │
│  └──────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

### Key Subsystems

1. **Assistant Registry** (`assistants/index.ts`)
   - Defines all available assistants with prompts and quick actions
   - Single source of truth for assistant definitions

2. **Handler System** (`core/assistants/handlers/`)
   - Extracts assistant-specific logic from main.ts
   - Handles pre-LLM (e.g., Content Table scanning) and post-LLM (e.g., Design Critique rendering) logic

3. **Provider System** (`core/provider/`)
   - Abstraction over LLM providers (OpenAI, Claude, Copilot, Proxy)
   - Normalizes requests/responses, handles capabilities

4. **Rendering System** (`core/figma/`, `core/stage/`)
   - **Artifact System**: Versioned artifact placement
   - **Stage System**: Document/DesignSpec rendering
   - **Fallback System**: Markdown-to-text rendering

5. **Selection Context** (`core/context/`)
   - Builds selection state, summary, and images
   - Respects provider capabilities and quick action requirements

6. **Custom Adapter** (`core/work/adapter.ts`)
   - Stub interface for custom-only features
   - Confluence API, design system detection, enterprise auth

---

## End-to-End Flow

### Quick Action Flow

```
User clicks quick action in UI
  ↓
UI emits('RUN_QUICK_ACTION', actionId, assistantId)
  ↓
main.ts receives event
  ↓
Handler lookup (getHandler())
  ↓
[Pre-LLM Handler] (if exists, e.g., Content Table scanning)
  ↓
Build selection context (state, summary, images)
  ↓
Normalize messages for provider
  ↓
Handler.prepareMessages() (optional message modification)
  ↓
Provider.sendChat() (LLM call)
  ↓
[Post-LLM Handler] (if exists, e.g., Design Critique rendering)
  ↓
Handler.handleResponse() (post-processing, rendering to canvas)
  ↓
UI receives result via postMessage
  ↓
UI displays message or updates state
```

### Message Flow

```
UI Thread                    Main Thread
─────────────────            ─────────────────
emit('SEND_MESSAGE')  ────→  on('SEND_MESSAGE')
                              • Add to messageHistory
                              • Call provider
                              • Process response
                              • Render if needed
postMessage ←──────────────  figma.ui.postMessage()
(type: 'ASSISTANT_MESSAGE')
```

**Important:** The main thread maintains `messageHistory` and is the **single source of truth**. The UI thread is stateless and displays messages as they arrive.

---

## Assistant System

### What is a Handler?

A **handler** is a module that processes assistant-specific logic. Handlers implement the `AssistantHandler` interface:

```typescript
interface AssistantHandler {
  canHandle(assistantId: string, actionId: string): boolean
  prepareMessages?(messages: NormalizedMessage[]): NormalizedMessage[] | undefined
  handleResponse(context: HandlerContext): Promise<HandlerResult>
}
```

### Handler Execution Lifecycle

1. **Pre-LLM** (optional): Some handlers run before the LLM call
   - Example: Content Table scanning (no LLM needed)
   - Runs immediately after handler lookup
   - Returns `{ handled: true }` to skip LLM call

2. **Message Preparation** (optional): Handlers can modify messages before LLM call
   - Example: Design Critique adds JSON enforcement messages
   - Runs after message normalization, before provider call

3. **Post-LLM** (optional): Handlers process LLM responses
   - Example: Design Critique parses JSON, renders scorecard
   - Runs after provider call, before default message display

### How Assistants are Registered

1. **Define assistant** in `assistants/index.ts`:
   ```typescript
   {
     id: 'my_assistant',
     label: 'My Assistant',
     promptMarkdown: '...',
     quickActions: [...]
   }
   ```

2. **Create handler** in `core/assistants/handlers/myAssistant.ts`:
   ```typescript
   export class MyAssistantHandler implements AssistantHandler {
     canHandle(assistantId: string, actionId: string): boolean {
       return assistantId === 'my_assistant' && actionId === 'my_action'
     }
     async handleResponse(context: HandlerContext): Promise<HandlerResult> {
       // Handle response
       return { handled: true }
     }
   }
   ```

3. **Register handler** in `core/assistants/handlers/index.ts`:
   ```typescript
   const handlers = [
     new MyAssistantHandler(),
     // ...
   ]
   ```

### Pre-LLM vs Post-LLM Responsibilities

- **Pre-LLM handlers**: Execute immediately, no provider call needed
  - Content Table scanning
  - Tool-only assistants
  - Validation/error handling

- **Post-LLM handlers**: Process provider responses
  - JSON parsing and validation
  - Canvas rendering
  - Response transformation

---

## Artifact & Stage System

The plugin has two rendering systems for different purposes:

### Artifact System (`core/figma/artifacts/`)

**Purpose:** Versioned artifact placement on canvas

**Use when:**
- Rendering assistant outputs (scorecards, critiques)
- Need version scoping (v1 vs v2 replacement)
- Need artifact management (find/remove existing artifacts)

**Key functions:**
- `placeArtifactFrame()`: Places versioned artifacts
- `findExistingArtifactsByType()`: Finds artifacts by type/version
- `removeExistingArtifacts()`: Removes artifacts before placement

**Example:** Design Critique scorecards use artifact system with version `'v2'`.

### Stage System (`core/stage/`)

**Purpose:** Document and DesignSpec rendering

**Use when:**
- Rendering Document IR (textual outputs)
- Rendering DesignSpec IR (JSON-to-Figma conversion)
- Need consistent placement logic

**Key functions:**
- `renderDocumentToStage()`: Renders Document IR
- `renderDesignSpecToStage()`: Renders DesignSpec IR
- `getTopLevelContainerNode()`: Finds placement anchor

**Example:** Code2Design uses stage system to render JSON specs.

### When to Use Which

- **Artifact System**: Assistant outputs that need versioning (Design Critique, critiques)
- **Stage System**: Document rendering, DesignSpec rendering (Code2Design)
- **Fallback System**: When JSON parsing fails (markdown-to-text rendering)

---

## Public ↔ Custom Plugin Model

### What Stays Public

The Public Plugin contains all core logic:

- ✅ Assistant registry and handlers
- ✅ Provider system and normalization
- ✅ Rendering systems (artifact, stage, fallback)
- ✅ Selection context building
- ✅ Tool system
- ✅ Configuration (`core/config.ts`)

**The Public Plugin is the source of truth.** Custom Plugin should import and extend, never fork.

### What Gets Overridden

The Custom Plugin overrides via a **single adapter file**:

- 🔄 `src/work/workAdapter.override.ts` (custom-only file)
  - Real Confluence API implementation
  - Real design system detection
  - Real enterprise auth

The Public Plugin defines stubs in `core/work/adapter.ts`:

```typescript
export const workAdapter: WorkAdapter = {
  confluenceApi: undefined, // Custom will override
  designSystem: undefined, // Custom will override
  auth: undefined // Custom will override
}
```

### How Migration Works Safely

1. **Copy Public codebase** to Custom repository
2. **Create `src/work/workAdapter.override.ts`** with real implementations
3. **Override adapter** via module replacement or direct import
4. **Add custom-specific assistants** to `assistants/index.ts` (if needed)
5. **Add custom-specific handlers** to `core/assistants/handlers/` (if needed)

**Merge conflicts expected:** Only in `src/work/workAdapter.override.ts` (single file)

**Future updates:** Pull Public changes, merge conflicts only in adapter file

### Extension Points

The Public Plugin exposes extension points for custom-only features. See **[Extension Points](docs/work-plugin/extension-points.md)** [REFERENCE] for complete documentation.

See **[Adapter Pattern](docs/work-plugin/adapter-pattern.md)** [CONTEXTUAL] for architecture details.

---

## How AI Tools Should Reason About This Repo

### Entry Points

1. **Adding a new assistant**: Start at `assistants/index.ts` → create handler → register handler
2. **Understanding message flow**: Read `main.ts` quick action handler → trace to handler → trace to provider
3. **Rendering output**: Check if handler exists → if not, default to chat message → if yes, handler renders to canvas
4. **Custom features**: Check `core/work/adapter.ts` → implement in Custom plugin's `work/adapter.ts`

### Key Assumptions

- `main.ts` is the orchestrator, not the implementer
- Handlers are responsible for assistant-specific logic
- Providers normalize everything (don't send raw messages)
- Selection context is built once per request
- UI is stateless; main thread maintains message history

### Critical Files to Understand First

1. `main.ts` (orchestration)
2. `assistants/index.ts` (what assistants exist)
3. `core/assistants/handlers/base.ts` (handler contract)
4. `core/provider/provider.ts` (provider contract)
5. `core/work/adapter.ts` (Work boundary)

### Common Patterns

- **Handler pattern**: Extract assistant-specific logic to handlers
- **Provider abstraction**: All LLM calls go through provider interface
- **Selection context**: Build once, use everywhere
- **Artifact versioning**: Use version scoping for artifact replacement

### Anti-Patterns

- ❌ Don't add assistant-specific logic to `main.ts`
- ❌ Don't send raw messages to providers (use normalization)
- ❌ Don't maintain state in UI thread (main thread is source of truth)
- ❌ Don't duplicate placement logic (use artifact/stage systems)

See `docs/01-getting-started.md` for detailed guide for AI assistants and human developers.

---

## Development

### Pre-requisites

- [Node.js](https://nodejs.org) – v22
- [Figma desktop app](https://figma.com/downloads/)

### Build

```bash
npm run build
```

Generates `manifest.json` and `build/` directory.

### S3 Config Sync (Phase 1 Manual)

These commands sync ACE-managed config artifacts between local files and S3 without changing runtime code.

```bash
# 1) Seed S3 once from local files (requires S3_* env vars)
npm run seed-s3

# 2) Pull published snapshot to local custom/ + docs/
npm run sync-config

# 3) Build from synced files
npm run build
```

```bash
# Publish local changes as a new snapshot
npm run push-config

# On another machine: pull and build
npm run sync-config
npm run build
```

If `S3_BUCKET` is unset, `npm run sync-config` keeps local dev mode and uses local `custom/config.json`.

### Watch Mode

```bash
npm run watch
```

Rebuilds automatically on file changes.

### Install Plugin

1. In Figma desktop app, open a document
2. Search for `Import plugin from manifest…` via Quick Actions
3. Select the generated `manifest.json` file

### Importing from GitHub ZIP

To import the plugin into Figma Desktop from a GitHub ZIP download:

1. **Download ZIP** from GitHub (Code → Download ZIP)
2. **Unzip** the downloaded file
3. **Build the plugin:**
   ```bash
   cd figmai_plugin
   npm install
   npm run build
   ```
   This generates `manifest.json` and `build/` directory.
4. **Import in Figma Desktop:**
   - Open Figma Desktop
   - Plugins → Development → Import plugin from manifest...
   - Select `manifest.json` from the unzipped directory

**Note:** The `build/` directory is not committed to git (standard practice). You must run `npm run build` before importing from a ZIP download.

### Debugging

Use `console.log` statements. Open developer console via `Show/Hide Console` in Quick Actions.

---

## Documentation

**📚 [Documentation Index](docs/README.md)** - Start here for all documentation

The documentation is organized by topic with clear labels ([AUTHORITATIVE], [REFERENCE], etc.) to help you find what you need quickly.

### Quick Links

- **[Getting Started](docs/01-getting-started.md)** - Architecture guide
- **[Custom Plugin Guide](docs/work-plugin/README.md)** - Custom Plugin migration
- **[Connection Modes](docs/connection-modes.md)** - Proxy vs Internal API
- **[Extension Points](docs/work-plugin/extension-points.md)** - Custom Plugin hooks reference

For complete documentation navigation, see **[docs/README.md](docs/README.md)**.

**Key Files:**
- `src/main.ts` - Main thread orchestrator (read header comment)
- `src/ui.tsx` - UI thread (read header comment)
- `core/assistants/handlers/` - Handler implementations
- `core/work/adapter.ts` - Custom adapter interface

---

## See Also

- [Create Figma Plugin docs](https://yuanqing.github.io/create-figma-plugin/)
- [Figma Plugin API docs](https://figma.com/plugin-docs/)
- [`yuanqing/figma-plugins`](https://github.com/yuanqing/figma-plugins#readme)

## License

This project is licensed under the MIT License.  
See the [LICENSE](./LICENSE) file for details.
