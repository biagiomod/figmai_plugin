# Codebase Audit Report
## FigmAI Plugin - Public Plugin Readiness Assessment

**Date:** 2025-01-27  
**Auditor:** Code Steward  
**Mode:** READ-ONLY Analysis  
**Purpose:** Evaluate codebase for AI comprehension, documentation quality, and Public/Work plugin separation

---

## Executive Summary

The FigmAI plugin codebase has undergone significant refactoring to establish clean boundaries and modular architecture. The handler pattern successfully extracts assistant-specific logic from `main.ts`, and the Work adapter pattern provides clear extension points. However, several documentation gaps and implicit assumptions could confuse AI assistants attempting to understand or modify the codebase.

**Overall Assessment:** ✅ **GO** for migration with documentation improvements recommended.

**Key Findings:**
- ✅ Clean handler pattern established
- ✅ Work adapter boundary defined
- ⚠️ Missing project-level documentation
- ⚠️ Several files lack header comments explaining purpose
- ⚠️ Implicit assumptions about message flow not documented
- ⚠️ Some duplicate/legacy code paths remain

---

## 1. PROJECT-LEVEL OVERVIEW

### How the Plugin Works (End-to-End)

The FigmAI plugin is a Figma plugin that provides AI-powered design assistance through multiple specialized "assistants." The architecture follows a two-thread model:

1. **Main Thread** (`main.ts`): Runs in Figma's plugin sandbox, has access to Figma API
2. **UI Thread** (`ui.tsx`): React-based UI running in an iframe, communicates via `postMessage`

**Flow:**
```
User Action (UI) 
  → emit('RUN_QUICK_ACTION', actionId, assistantId)
  → main.ts receives event
  → Handler lookup (if exists, handles pre-LLM logic)
  → Build selection context (state, summary, images)
  → Normalize messages for provider
  → Handler.prepareMessages() (optional message modification)
  → Provider.sendChat() (LLM call)
  → Handler.handleResponse() (post-processing, rendering)
  → UI receives result via postMessage
```

### Major Subsystems

1. **Assistant Registry** (`assistants/index.ts`)
   - Defines all available assistants with prompts and quick actions
   - Single source of truth for assistant definitions

2. **Handler System** (`core/assistants/handlers/`)
   - Extracts assistant-specific logic from main.ts
   - Handles pre-LLM (Content Table scanning) and post-LLM (Design Critique rendering) logic
   - Pattern: `canHandle()` → `prepareMessages()` → `handleResponse()`

3. **Provider System** (`core/provider/`)
   - Abstraction over LLM providers (OpenAI, Claude, Copilot, Proxy)
   - Normalizes requests/responses
   - Handles capabilities (images, markdown, schemas)

4. **Rendering System** (`core/figma/`, `core/stage/`)
   - **Artifact System**: Versioned artifact placement (`artifacts/placeArtifact.ts`)
   - **Stage System**: Document/DesignSpec rendering (`stage/renderDocument.ts`, `stage/renderDesignSpec.ts`)
   - **Fallback System**: Markdown-to-text rendering (`placeCritiqueFallback.ts`)

5. **Selection Context** (`core/context/`)
   - Builds selection state, summary, and images
   - Respects provider capabilities and quick action requirements

6. **Tool System** (`core/tools/`)
   - Registry-based tool execution
   - Tools can be called by LLMs or directly

7. **Work Adapter** (`core/work/adapter.ts`)
   - Stub interface for Work-only features
   - Confluence API, design system detection, enterprise auth

### How an AI Assistant Should Reason About This Repo

**Entry Points:**
1. **Adding a new assistant**: Start at `assistants/index.ts` → create handler in `core/assistants/handlers/` → register in `handlers/index.ts`
2. **Understanding message flow**: Read `main.ts` lines 350-550 (quick action handler) → trace to handler → trace to provider
3. **Rendering output**: Check if handler exists → if not, default to chat message → if yes, handler renders to canvas
4. **Work features**: Check `core/work/adapter.ts` → implement in Work plugin's `work/adapter.ts`

**Key Assumptions:**
- `main.ts` is the orchestrator, not the implementer
- Handlers are responsible for assistant-specific logic
- Providers normalize everything (don't send raw messages)
- Selection context is built once per request
- UI is stateless; main thread maintains message history

**Critical Files to Understand First:**
1. `main.ts` (orchestration)
2. `assistants/index.ts` (what assistants exist)
3. `core/assistants/handlers/base.ts` (handler contract)
4. `core/provider/provider.ts` (provider contract)
5. `core/work/adapter.ts` (Work boundary)

---

## 2. FILE-BY-FILE AUDIT

### Core Orchestration

#### `src/main.ts` (~900 lines)
- **Purpose:** Main plugin entry point, orchestrates UI ↔ main thread communication, routes quick actions to handlers
- **Who modifies:** Rarely (orchestration only), AI should understand but not modify casually
- **Documentation:** Partial (has function-level comments, missing architecture overview header)
- **Risks:**
  - Large file (900 lines) - could be intimidating
  - Message history management not clearly documented
  - Error handling pattern not explained
- **Recommendations:**
  - Add header comment explaining two-thread architecture
  - Document message history lifecycle
  - Add comment explaining handler lookup pattern
  - Document why some handlers run pre-LLM (Content Table) vs post-LLM (Design Critique)

#### `src/ui.tsx` (~4000 lines)
- **Purpose:** React UI component, handles user interaction, displays messages, emits events to main thread
- **Who modifies:** Both (UI features), AI should understand React patterns
- **Documentation:** Partial (component-level comments, missing architecture header)
- **Risks:**
  - Very large file (4000 lines) - should be split into components
  - Message handling logic is complex (nested pluginMessage unwrapping)
  - State management not clearly documented
- **Recommendations:**
  - Add header explaining UI thread architecture
  - Document message event flow (emit → main → postMessage → UI)
  - Split into smaller components (already has some, but could be more)
  - Document why UI is stateless (main thread is source of truth)

### Assistant System

#### `src/assistants/index.ts` (~370 lines)
- **Purpose:** Assistant registry, defines all assistants with prompts and quick actions
- **Who modifies:** Both (adding assistants), AI should understand this is the entry point
- **Documentation:** Good (has header comment, inline prompts)
- **Risks:**
  - Large inline prompt strings could be confusing
  - No explanation of assistant lifecycle
- **Recommendations:**
  - Document assistant definition structure
  - Explain promptMarkdown vs knowledge base files
  - Add comment about assistant kinds (ai, tool, hybrid)

#### `src/core/assistants/handlers/base.ts`
- **Purpose:** Defines handler interface contract
- **Who modifies:** Rarely (interface definition), AI must understand this
- **Documentation:** Good (clear interface docs)
- **Risks:** None
- **Recommendations:** None

#### `src/core/assistants/handlers/designCritique.ts` (~240 lines)
- **Purpose:** Handles Design Critique responses: JSON parsing, repair, rendering, fallback
- **Who modifies:** Both (Design Critique features), AI should understand handler pattern
- **Documentation:** Partial (function-level comments, missing overview)
- **Risks:**
  - Complex flow (parse → repair → render → fallback) not clearly documented
  - Repair step adds cost/latency (should be documented as trade-off)
- **Recommendations:**
  - Add header explaining Design Critique flow
  - Document why repair step exists (and that it could be removed)
  - Explain fallback to markdown rendering

#### `src/core/assistants/handlers/contentTable.ts` (~90 lines)
- **Purpose:** Handles Content Table scanning (pre-LLM, no provider call needed)
- **Who modifies:** Both (Content Table features), AI should understand pre-LLM handlers
- **Documentation:** Good (clear function docs)
- **Risks:**
  - Not obvious this runs BEFORE provider call (unlike Design Critique)
- **Recommendations:**
  - Add comment explaining this is a pre-LLM handler
  - Document why it doesn't need provider

#### `src/core/assistants/handlers/index.ts`
- **Purpose:** Handler registry, exports `getHandler()`
- **Who modifies:** Both (registering handlers), AI must understand this
- **Documentation:** Good (clear registry pattern)
- **Risks:** None
- **Recommendations:** None

### Provider System

#### `src/core/provider/provider.ts`
- **Purpose:** Provider interface, capabilities, error types
- **Who modifies:** Rarely (interface definition), AI must understand this
- **Documentation:** Good (has README.md)
- **Risks:** None
- **Recommendations:** None

#### `src/core/provider/providerFactory.ts`
- **Purpose:** Creates provider instances based on ID
- **Who modifies:** Both (adding providers), AI should understand factory pattern
- **Documentation:** Partial (function-level comments)
- **Risks:**
  - Not obvious which providers are implemented vs stubs
- **Recommendations:**
  - Document which providers are real vs stubs
  - Explain provider selection logic

#### `src/core/provider/normalize.ts`
- **Purpose:** Normalizes messages, images, responses for providers
- **Who modifies:** Rarely (normalization logic), AI should understand normalization
- **Documentation:** Partial (function-level comments)
- **Risks:**
  - Complex normalization rules not documented
- **Recommendations:**
  - Add header explaining normalization contract
  - Document capability-based filtering

#### `src/core/provider/README.md`
- **Purpose:** Provider system documentation
- **Documentation:** Excellent (comprehensive)
- **Recommendations:** None

### Rendering System

#### `src/core/figma/artifacts/placeArtifact.ts` (~300 lines)
- **Purpose:** Versioned artifact placement, finding/removing existing artifacts
- **Who modifies:** Both (artifact placement), AI should understand artifact system
- **Documentation:** Partial (function-level comments, missing overview)
- **Risks:**
  - Complex artifact finding logic (name + pluginData)
  - Version scoping not clearly explained
- **Recommendations:**
  - Add header explaining artifact system
  - Document version scoping (v1 vs v2 replacement)
  - Explain pluginData structure

#### `src/core/figma/renderScorecard.ts` (~850 lines)
- **Purpose:** Renders Design Critique scorecards (v1 legacy, v2 auto-layout)
- **Who modifies:** Both (scorecard rendering), AI should understand rendering
- **Documentation:** Partial (function-level comments, missing overview)
- **Risks:**
  - Large file (850 lines)
  - v1 vs v2 distinction not clearly documented
- **Recommendations:**
  - Add header explaining scorecard versions
  - Document when to use v1 vs v2
  - Explain auto-layout structure

#### `src/core/figma/placeCritiqueFallback.ts` (~360 lines)
- **Purpose:** Fallback rendering for Design Critique when JSON parsing fails
- **Who modifies:** Rarely (fallback logic), AI should understand fallback pattern
- **Documentation:** Partial (function-level comments)
- **Risks:**
  - Markdown parsing logic is complex
  - Not obvious this is a fallback (name helps)
- **Recommendations:**
  - Add header explaining this is fallback only
  - Document when this is used vs renderScorecardV2

#### `src/core/stage/anchor.ts` (~210 lines)
- **Purpose:** Placement logic (40px left of topmost page-level container)
- **Who modifies:** Rarely (placement logic), AI should understand placement
- **Documentation:** Partial (function-level comments)
- **Risks:**
  - Complex bounds calculation (multiple fallback strategies)
  - "Topmost page-level container" concept not clearly explained
- **Recommendations:**
  - Add header explaining placement strategy
  - Document what "topmost page-level container" means
  - Explain bounds calculation fallbacks

#### `src/core/stage/renderDocument.ts`
- **Purpose:** Renders Document IR to stage (not currently used by Design Critique)
- **Who modifies:** Both (document rendering), AI should understand IR system
- **Documentation:** Partial (function-level comments)
- **Risks:**
  - Not obvious this is bypassed by Design Critique handler
- **Recommendations:**
  - Add comment explaining this is for future use
  - Document IR structure

#### `src/core/stage/renderDesignSpec.ts`
- **Purpose:** Renders DesignSpec IR to stage (Code2Design)
- **Who modifies:** Both (design spec rendering), AI should understand IR system
- **Documentation:** Partial (function-level comments)
- **Risks:**
  - IR structure not clearly documented
- **Recommendations:**
  - Add header explaining DesignSpec IR
  - Document JSON schema

#### `src/core/stage/README.md`
- **Purpose:** Stage rendering system documentation
- **Documentation:** Good (comprehensive)
- **Recommendations:** None

### Selection Context

#### `src/core/context/selectionContext.ts`
- **Purpose:** Builds selection context (state, summary, images) for assistant requests
- **Who modifies:** Rarely (context building), AI must understand this
- **Documentation:** Good (clear contract documentation)
- **Risks:** None
- **Recommendations:** None

#### `src/core/context/selection.ts`
- **Purpose:** Summarizes selection state
- **Who modifies:** Rarely (selection logic), AI should understand
- **Documentation:** Partial (function-level comments)
- **Recommendations:**
  - Add header explaining selection state structure

#### `src/core/context/selectionSummary.ts`
- **Purpose:** Extracts and formats selection summary
- **Who modifies:** Rarely (summary logic), AI should understand
- **Documentation:** Partial (function-level comments)
- **Recommendations:**
  - Add header explaining summary format

### Content Table System

#### `src/core/contentTable/scanner.ts` (~390 lines)
- **Purpose:** Scans container for text nodes, builds Universal Content Table
- **Who modifies:** Both (Content Table features), AI should understand scanning
- **Documentation:** Partial (function-level comments, missing overview)
- **Risks:**
  - Complex scanning logic (breadcrumbs, component context)
  - Work-specific ignore rules not clearly documented
- **Recommendations:**
  - Add header explaining Content Table structure
  - Document scanning algorithm
  - Add comment about Work adapter extension point for ignore rules

#### `src/core/contentTable/types.ts`
- **Purpose:** Content Table type definitions
- **Who modifies:** Both (type definitions), AI must understand this
- **Documentation:** Good (clear type docs)
- **Risks:** None
- **Recommendations:** None

#### `src/core/contentTable/renderers.ts`
- **Purpose:** Renders Content Table to HTML/TSV/JSON
- **Who modifies:** Both (rendering formats), AI should understand
- **Documentation:** Partial (function-level comments)
- **Recommendations:**
  - Add header explaining renderer system

### Work Adapter

#### `src/core/work/adapter.ts`
- **Purpose:** Work adapter interface (stubs for Work-only features)
- **Who modifies:** Both (adding extension points), AI must understand this
- **Documentation:** Good (clear interface docs)
- **Risks:**
  - Not obvious how Work plugin overrides this
- **Recommendations:**
  - Add comment explaining override mechanism (module replacement or direct import)
  - Document migration path

### Tools System

#### `src/core/tools/toolRegistry.ts`
- **Purpose:** Tool registry, registers and retrieves tools
- **Who modifies:** Both (registering tools), AI should understand
- **Documentation:** Partial (function-level comments)
- **Recommendations:**
  - Add header explaining tool system

#### `src/core/tools/toolRouter.ts`
- **Purpose:** Routes tool calls to registered tools
- **Who modifies:** Rarely (routing logic), AI should understand
- **Documentation:** Partial (function-level comments)
- **Recommendations:**
  - Add header explaining tool routing

### Configuration

#### `src/core/config.ts`
- **Purpose:** Single source of truth for configuration (provider, features, mode)
- **Who modifies:** Both (configuration), AI must understand this
- **Documentation:** Good (clear comment about Work porting)
- **Risks:** None
- **Recommendations:** None

### Types

#### `src/core/types.ts` (~265 lines)
- **Purpose:** Central type definitions
- **Who modifies:** Both (type definitions), AI must understand this
- **Documentation:** Good (clear type docs)
- **Risks:** None
- **Recommendations:** None

#### `src/types.ts`
- **Purpose:** Plugin-specific types (event handlers)
- **Who modifies:** Both (type definitions), AI should understand
- **Documentation:** Partial (type-level comments)
- **Recommendations:**
  - Add header explaining event handler types

### Other Core Files

#### `src/core/output/normalize/index.ts`
- **Purpose:** Normalizes LLM responses (JSON extraction, scorecard parsing)
- **Who modifies:** Rarely (normalization logic), AI should understand
- **Documentation:** Partial (function-level comments)
- **Risks:**
  - Complex JSON extraction logic not documented
- **Recommendations:**
  - Add header explaining normalization contract
  - Document JSON extraction strategies

#### `src/core/richText/parseRichText.ts`
- **Purpose:** Parses rich text (markdown-like) to AST
- **Who modifies:** Rarely (parsing logic), AI should understand
- **Documentation:** Partial (function-level comments)
- **Recommendations:**
  - Add header explaining rich text format

#### `src/core/settings.ts`
- **Purpose:** Settings storage (localStorage)
- **Who modifies:** Both (settings features), AI should understand
- **Documentation:** Partial (function-level comments)
- **Recommendations:**
  - Add header explaining settings structure

#### `src/core/brand.ts`
- **Purpose:** Brand constants (name, colors)
- **Who modifies:** Rarely (branding), AI should understand
- **Documentation:** Partial (constant definitions)
- **Recommendations:**
  - Add header explaining brand system

### UI Components

#### `src/ui/components/SettingsModal.tsx` (~580 lines)
- **Purpose:** Settings modal component
- **Who modifies:** Both (UI features), AI should understand React
- **Documentation:** Partial (component-level comments)
- **Recommendations:**
  - Add header explaining settings UI

#### `src/ui/components/RichTextRenderer.tsx`
- **Purpose:** Renders rich text (AST) to React
- **Who modifies:** Both (rendering features), AI should understand React
- **Documentation:** Partial (component-level comments)
- **Recommendations:**
  - Add header explaining rich text rendering

---

## 3. AI COMPREHENSION RISK MAP

### High Risk Files (Likely to Confuse AI)

1. **`main.ts`** (900 lines)
   - **Risk:** Large file, complex orchestration, implicit message flow
   - **Confusion:** AI might not understand handler lookup pattern
   - **Mitigation:** Add architecture header, document handler pattern

2. **`ui.tsx`** (4000 lines)
   - **Risk:** Very large file, complex state management, nested message handling
   - **Confusion:** AI might not understand two-thread architecture
   - **Mitigation:** Split into components, add architecture header

3. **`core/figma/renderScorecard.ts`** (850 lines)
   - **Risk:** Large file, v1 vs v2 distinction not clear
   - **Confusion:** AI might use wrong version
   - **Mitigation:** Add version documentation, consider splitting

4. **`core/contentTable/scanner.ts`** (390 lines)
   - **Risk:** Complex scanning logic, Work extension points not obvious
   - **Confusion:** AI might not understand ignore rules extension
   - **Mitigation:** Document Work adapter extension point

5. **`core/assistants/handlers/designCritique.ts`** (240 lines)
   - **Risk:** Complex flow (parse → repair → render → fallback)
   - **Confusion:** AI might not understand repair step trade-offs
   - **Mitigation:** Document flow, explain repair step

### Similar Files (Easy to Confuse)

1. **`core/stage/renderDocument.ts` vs `core/figma/renderScorecard.ts`**
   - **Risk:** Both render to canvas, but different systems
   - **Confusion:** AI might use wrong one
   - **Mitigation:** Document when to use each

2. **`core/figma/artifacts/placeArtifact.ts` vs `core/stage/anchor.ts`**
   - **Risk:** Both handle placement, but different purposes
   - **Confusion:** AI might duplicate placement logic
   - **Mitigation:** Document artifact system vs stage system

3. **`core/context/selection.ts` vs `core/context/selectionSummary.ts`**
   - **Risk:** Both deal with selection, but different aspects
   - **Confusion:** AI might use wrong one
   - **Mitigation:** Document selection state vs summary

### Implicit Assumptions (Not Documented)

1. **Message History Lifecycle**
   - **Assumption:** Main thread maintains message history, UI is stateless
   - **Risk:** AI might try to maintain state in UI
   - **Mitigation:** Document in `main.ts` header

2. **Handler Execution Order**
   - **Assumption:** Some handlers run pre-LLM (Content Table), others post-LLM (Design Critique)
   - **Risk:** AI might not understand when handlers run
   - **Mitigation:** Document in handler base interface

3. **Provider Normalization**
   - **Assumption:** All requests are normalized before sending to providers
   - **Risk:** AI might try to send raw messages
   - **Mitigation:** Document in provider README (already done)

4. **Artifact Versioning**
   - **Assumption:** Artifacts are versioned, v2 replaces v2, but not v1
   - **Risk:** AI might not understand version scoping
   - **Mitigation:** Document in `placeArtifact.ts` header

5. **Work Adapter Override**
   - **Assumption:** Work plugin overrides adapter via module replacement or direct import
   - **Risk:** AI might not understand override mechanism
   - **Mitigation:** Document in `work/adapter.ts` header

---

## 4. PUBLIC ↔ WORK PLUGIN READINESS CHECK

### Already Well-Prepared ✅

1. **Work Adapter Interface** (`core/work/adapter.ts`)
   - ✅ Clear interface definition
   - ✅ Stub implementations
   - ✅ Extension points documented

2. **Configuration** (`core/config.ts`)
   - ✅ Single source of truth
   - ✅ Comment about Work porting
   - ✅ Feature flags

3. **Handler Pattern**
   - ✅ Assistant-specific logic extracted
   - ✅ Easy to add Work-specific handlers

4. **Provider System**
   - ✅ Clean abstraction
   - ✅ Work can swap providers

5. **Tool System**
   - ✅ Extensible registry
   - ✅ Work can add tools

### Needs Clearer Extension Points ⚠️

1. **Content Table Scanner** (`core/contentTable/scanner.ts`)
   - **Issue:** Ignore rules not clearly extensible
   - **Recommendation:** Add `workAdapter.designSystem?.shouldIgnore()` call in scanner
   - **Current:** No extension point for ignore rules

2. **Design System Detection**
   - **Issue:** No placeholder for design system detection
   - **Recommendation:** Add extension point in selection context or scanner
   - **Current:** Work adapter has interface, but no call sites

3. **Enterprise Auth**
   - **Issue:** No clear integration point
   - **Recommendation:** Document where to inject enterprise tokens
   - **Current:** Work adapter has interface, but no call sites

### Should NEVER Be Duplicated 🚫

1. **Core Orchestration** (`main.ts`)
   - ✅ Should remain in Public plugin
   - ✅ Work should reuse as-is

2. **Handler System** (`core/assistants/handlers/`)
   - ✅ Should remain in Public plugin
   - ✅ Work can add handlers, but not modify core

3. **Provider System** (`core/provider/`)
   - ✅ Should remain in Public plugin
   - ✅ Work can add providers, but not modify core

4. **Rendering System** (`core/figma/`, `core/stage/`)
   - ✅ Should remain in Public plugin
   - ✅ Work should reuse as-is

5. **Selection Context** (`core/context/`)
   - ✅ Should remain in Public plugin
   - ✅ Work can extend, but not modify core

### Migration Path Readiness

**Current State:** ✅ Ready for migration

**What Work Plugin Needs:**
1. Copy Public codebase
2. Create `work/adapter.ts` with real implementations
3. Override `core/work/adapter.ts` (module replacement or direct import)
4. Add Work-specific handlers to `core/assistants/handlers/`
5. Add Work-specific assistants to `assistants/index.ts`

**Merge Conflicts Expected:**
- Only in `work/adapter.ts` (single file)
- Possibly in `assistants/index.ts` (if Work adds assistants)

**Recommendations:**
- Document override mechanism clearly
- Add extension points for ignore rules in scanner
- Add call sites for design system detection
- Document enterprise auth integration points

---

## 5. DOCUMENTATION GAP LIST (Prioritized)

### Critical (Must Fix Before Migration)

1. **Project-Level README** (`README.md`)
   - **Current:** Generic Create Figma Plugin template
   - **Needed:** Architecture overview, entry points, key concepts
   - **Priority:** HIGH

2. **Main Thread Architecture** (`main.ts` header)
   - **Current:** Function-level comments only
   - **Needed:** Two-thread architecture, message flow, handler pattern
   - **Priority:** HIGH

3. **UI Thread Architecture** (`ui.tsx` header)
   - **Current:** Component-level comments only
   - **Needed:** Two-thread architecture, stateless UI, message handling
   - **Priority:** HIGH

4. **Work Adapter Override Mechanism** (`core/work/adapter.ts`)
   - **Current:** Interface documented, override not explained
   - **Needed:** How Work plugin overrides (module replacement vs direct import)
   - **Priority:** HIGH

### Important (Should Fix Soon)

5. **Handler Execution Order** (`core/assistants/handlers/base.ts`)
   - **Current:** Interface documented, execution order not explained
   - **Needed:** When handlers run (pre-LLM vs post-LLM)
   - **Priority:** MEDIUM

6. **Artifact System Overview** (`core/figma/artifacts/placeArtifact.ts`)
   - **Current:** Function-level comments only
   - **Needed:** Artifact system, version scoping, pluginData structure
   - **Priority:** MEDIUM

7. **Rendering System Comparison** (`core/stage/README.md` or new doc)
   - **Current:** Stage system documented, but not compared to artifact system
   - **Needed:** When to use artifact system vs stage system
   - **Priority:** MEDIUM

8. **Content Table Scanner Extension Points** (`core/contentTable/scanner.ts`)
   - **Current:** Scanning logic documented, extension points not
   - **Needed:** How Work plugin can add ignore rules
   - **Priority:** MEDIUM

9. **Design Critique Flow** (`core/assistants/handlers/designCritique.ts`)
   - **Current:** Function-level comments only
   - **Needed:** Flow diagram, repair step trade-offs
   - **Priority:** MEDIUM

### Nice to Have (Can Fix Later)

10. **Scorecard Versions** (`core/figma/renderScorecard.ts`)
    - **Current:** v1 vs v2 not clearly documented
    - **Needed:** When to use v1 vs v2, migration path
    - **Priority:** LOW

11. **Selection Context Structure** (`core/context/selectionContext.ts`)
    - **Current:** Contract documented, structure not explained
    - **Needed:** Selection state vs summary vs images
    - **Priority:** LOW

12. **Tool System Overview** (`core/tools/toolRegistry.ts`)
    - **Current:** Registry pattern documented, system not explained
    - **Needed:** How tools are registered, executed, called
    - **Priority:** LOW

### Suggested New Documentation Files

1. **`PROJECT_MAP.md`**
   - High-level architecture diagram
   - File organization explanation
   - Entry points for common tasks

2. **`AI_GUIDE.md`**
   - How AI assistants should reason about this repo
   - Common patterns and anti-patterns
   - Where to start for different tasks

3. **`WORK_ADAPTER.md`**
   - Work adapter override mechanism
   - Extension points
   - Migration path
   - Example implementations

4. **`MESSAGE_FLOW.md`**
   - Two-thread architecture
   - Message event flow
   - Handler execution order
   - State management

---

## 6. MIGRATION CONFIDENCE ASSESSMENT

### Is the Public Plugin Currently Safe to Migrate?

**Answer:** ✅ **YES, with documentation improvements recommended**

### Rationale

**Strengths:**
- ✅ Clean handler pattern (assistant-specific logic extracted)
- ✅ Work adapter interface defined
- ✅ Configuration centralized
- ✅ Provider system abstracted
- ✅ Rendering systems modular

**Weaknesses:**
- ⚠️ Missing project-level documentation
- ⚠️ Some implicit assumptions not documented
- ⚠️ Extension points not fully utilized (ignore rules, design system)

**Risks:**
- **Low:** Core architecture is sound
- **Medium:** Documentation gaps could slow migration
- **Low:** Work adapter override mechanism needs clarification

### What Would Break AI Understanding if Moved to Work?

1. **Handler Pattern** - If AI doesn't understand handlers, it might add logic to main.ts
2. **Message Flow** - If AI doesn't understand two-thread architecture, it might break communication
3. **Work Adapter** - If AI doesn't understand override mechanism, it might duplicate code
4. **Rendering Systems** - If AI doesn't understand artifact vs stage, it might use wrong system

### What Must Be Documented Before Migration?

**Critical:**
1. Project-level README with architecture overview
2. Main thread architecture (message flow, handler pattern)
3. Work adapter override mechanism

**Important:**
4. Handler execution order (pre-LLM vs post-LLM)
5. Artifact system overview
6. Extension points for ignore rules and design system

### GO / NO-GO Recommendation

**Recommendation:** ✅ **GO**

**Conditions:**
- Core architecture is sound
- Work adapter pattern is established
- Handler pattern is clean
- Documentation gaps are addressable (not architectural issues)

**Action Items Before Migration:**
1. Add project-level README
2. Add architecture headers to main.ts and ui.tsx
3. Document Work adapter override mechanism
4. Add extension point documentation for ignore rules

**Post-Migration:**
- Continue documentation improvements
- Add AI_GUIDE.md
- Add WORK_ADAPTER.md
- Add MESSAGE_FLOW.md

---

## Next Steps

### Immediate (Before Migration)

1. **Update README.md** - Add architecture overview, entry points, key concepts
2. **Add main.ts header** - Document two-thread architecture, message flow, handler pattern
3. **Add ui.tsx header** - Document UI thread architecture, stateless design, message handling
4. **Document Work adapter override** - Explain module replacement vs direct import

### Short Term (During Migration)

5. **Add extension points** - Call `workAdapter.designSystem?.shouldIgnore()` in scanner
6. **Document handler execution order** - Explain pre-LLM vs post-LLM handlers
7. **Add artifact system overview** - Document version scoping, pluginData structure

### Long Term (Post-Migration)

8. **Create AI_GUIDE.md** - How AI assistants should reason about this repo
9. **Create WORK_ADAPTER.md** - Work adapter documentation, examples
10. **Create MESSAGE_FLOW.md** - Two-thread architecture, event flow
11. **Split large files** - Consider splitting ui.tsx and renderScorecard.ts

---

## Conclusion

The FigmAI plugin codebase is **well-architected** and **ready for migration** to a Work plugin. The handler pattern successfully extracts assistant-specific logic, and the Work adapter provides clear extension points. However, **documentation gaps** could confuse AI assistants attempting to understand or modify the codebase.

**Key Recommendations:**
1. Add project-level documentation (README, architecture headers)
2. Document Work adapter override mechanism
3. Add extension point documentation for ignore rules and design system
4. Create AI-focused documentation (AI_GUIDE.md, WORK_ADAPTER.md)

**Confidence Level:** ✅ **HIGH** - Architecture is sound, documentation improvements are straightforward

---

**End of Audit Report**

