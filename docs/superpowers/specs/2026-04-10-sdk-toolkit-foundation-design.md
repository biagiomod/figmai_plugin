# SDK Toolkit Foundation — Architecture Design Spec

**Date:** 2026-04-10  
**Branch:** `sdk-toolkit-foundation`  
**Status:** Approved for implementation (Phases 0–4, 6–7). Phase 5 gated — requires own sub-plan before execution.

---

## Strategic Summary

Refactor the plugin so strike teams build against stable SDK contracts rather than today's in-repo implementations, while establishing explicit swap seams for the incoming Smart Detector Toolkit (SD-T) and Design System Toolkit (DS-T). Both external toolkits are present with stable contracts and imminent for integration.

**Two-track approach:**

- **Job A (Phases 0–4, 6–7):** SDK contracts, port interfaces, host-owned adapters, twin-shell surgery, ACE config alignment, build cleanup, docs. Execute immediately.
- **Job B (Phase 5):** SKILL.md authoring model + ACE hybrid editing surface. Fully designed in this spec. Gated — requires its own implementation sub-plan before execution.

**Ordering principle:** Ports-first. SD-T and DS-T contracts are in hand; define port interfaces and adapters before shell surgery so extracted SDK services depend on ports from the start, not in-repo implementations.

---

## North Star Framing

The longer-term system model is:

```
intent / specs / success criteria
    → magic box (AI + code + toolkits)
    → outcomes
    → review / iterate
```

Today the plugin addresses discrete friction points. The north star is a system where the user provides structured intent up front, the system orchestrates multi-step execution, and the user iterates on outcomes until acceptable.

**This refactor preserves the north star without building it.** The seams identified below are additive today and extensible later — no platform rewrite required now.

| Seam | Today | North star hook |
|---|---|---|
| `ConversationManager` | Message history, segment management | Add `IntentCapture` layer: structured spec/criteria input |
| `QuickActionExecutor` | Single action dispatch | Extend to `PlanExecutor`: multi-step orchestrated sequences |
| `HandlerResult.outcome?` | Add optional field now (unused) | Machine-readable result for review loop |
| `StatusChannel` | Status messages | Add `OutcomeEvent` emission for review/iteration UI |
| `SelectionResolver` | Scopes a single action | Natural "what are we working on" boundary → intent scope |

---

## Target Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│  Authoring Layer  (build-time only — never read at runtime)          │
│                                                                      │
│  src/assistants/<id>/SKILL.md  ──→  scripts/compile-skills.ts       │
│      behavior, LLM query rules,         ↓                           │
│      quick-action behavior      AssistantSkill TS types             │
│                                         ↓                           │
│  custom/knowledge-bases/*.kb.json  ──→  assistants.generated.ts     │
│      domain knowledge, policies,                                     │
│      definitions, references                                         │
└───────────────────────────────────────────┬──────────────────────────┘
                                            │ compiled TS artifacts only
┌───────────────────────────────────────────▼──────────────────────────┐
│  Plugin Runtime                                                       │
│                                                                       │
│  src/main.ts (thin coordinator)    src/ui.tsx (thin shell)           │
│    init, figma.on() routing          render root, msg router         │
│          │                                    │                       │
│  ┌───────▼────────────────────────────────────▼──────────────────┐   │
│  │  SDK Core  (src/core/sdk/)                                    │   │
│  │  ConversationManager   QuickActionExecutor   StatusChannel    │   │
│  │  SelectionResolver     ViewportManager                        │   │
│  └─────────────────────────────────────────────────────────────--┘   │
│                                                                       │
│  ┌────────────────────────┐  ┌────────────────────────────────────┐   │
│  │  SmartDetectionPort    │  │  DesignSystem Ports                │   │
│  │  + FigmaNodeSerializer │  │  DSPromptEnrichmentPort            │   │
│  │  (host-owned adapter)  │  │  DSQueryPort                       │   │
│  │                        │  │  DSPlacementPort                   │   │
│  └──────────┬─────────────┘  │  + FigmaInstructionWalker         │   │
│             │                │  (host-owned adapter)             │   │
│  ┌──────────▼─────────────┐  └──────────────┬─────────────────---┘   │
│  │  DefaultSmartDetection │                 │                         │
│  │  Engine (in-repo, temp)│  ┌──────────────▼─────────────────────┐   │
│  │                        │  │  DefaultDS{Prompt,Query,Placement} │   │
│  │  [swap: SD-T engine]   │  │  Engines (in-repo, temp)           │   │
│  └────────────────────────┘  │  [swap: DS-T engines]              │   │
│                               └────────────────────────────────────┘   │
│                                                                        │
│  src/ui/controllers/  (extracted from ui.tsx)                         │
│    AnalyticsTaggingController  ContentTableController                 │
│    DesignCritiqueController    DesignWorkshopController               │
│    GeneralController           Code2DesignController                  │
│    DiscoveryController         SmartDetectorController                │
│                                                                        │
│  src/ui/services/                                                      │
│    ViewportManager             UIStatusService                         │
└────────────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────────────┐
│  ACE Control Plane  (admin-editor)                                     │
│  AssistantConfig (compiled TS) ← pull-ace-config                      │
│  SKILL.md editing: structured panels + source mode + preview mode     │
└────────────────────────────────────────────────────────────────────────┘
```

**Invariants:**
1. `main.ts` and `ui.tsx` contain minimal orchestration only — routing and bootstrap, no assistant-specific feature logic, no business logic.
2. SDK core is the strike-team stable surface.
3. Ports are the only way to reach Smart Detector and Design System logic — no direct imports of in-repo engines.
4. Adapters (`FigmaNodeSerializer`, `FigmaInstructionWalker`) are host-owned — the seam the toolkits cross.
5. `SKILL.md` compiles to TS artifacts — raw files never read at runtime.
6. ACE is the control plane; config flows one direction (ACE → build → TS artifacts).

---

## Port Contracts

### SmartDetectionPort

Port contracts are **host-owned DTOs only** — no imports from toolkit packages. Adapter implementations import from `vendor/` (see Dependency Strategy below).

```ts
// src/core/sdk/ports/SmartDetectionPort.ts
// No toolkit package imports here — host-owned types only

export interface DetectedElement {
  id: string
  candidateType: string | null     // maps to DetectionNode.candidateEntry
  category: string | null          // maps to DetectionNode.candidateCategory
  certainty: 'exact' | 'inferred' | 'weak' | 'unknown' | 'ambiguous'
  rationale: string
  matchedSignals: string[]
  ambiguous: boolean
  children: DetectedElement[]
}

export interface SmartDetectionResult {
  sourceRef: string                // Figma node ID
  root: DetectedElement
  summary: {
    total: number; exact: number; inferred: number
    weak: number; unknown: number; ambiguous: number
  }
}

export interface SmartDetectionPort {
  detect(node: SceneNode): Promise<SmartDetectionResult>
}
```

**Host-owned adapter** — `src/core/sdk/adapters/figmaNodeSerializer.ts`:

Converts `SceneNode` → `FigmaNode` (plain JSON), which is what SD-T's `traverseFigmaNode` accepts. The serializer extracts: `id`, `name`, `type`, `x/y/width/height`, `fills`, `characters`, `style` (fontSize, fontWeight, fontFamily, etc.), `cornerRadius`, `opacity`, `visible`, `strokes`, auto-layout fields (`layoutMode`, padding, `itemSpacing`), and `children` recursively. Only visible, plugin-readable properties are serialized. Adapter imports from `vendor/smart-detector/`.

**Current in-repo engine:** `src/core/detection/smartDetector/` becomes `DefaultSmartDetectionEngine` implementing `SmartDetectionPort` with `SmartDetectionResult`. When SD-T lands, a `SDToolkitSmartDetectionEngine` is dropped in — consumers see only `SmartDetectionPort`, no changes needed.

**SD-T integration path when ready:**
```
host: SceneNode → figmaNodeSerializer → FigmaNode (plain JSON)
SD-T: traverseFigmaNode(figmaNode) → RawNode
SD-T: normalize(rawNodes) → DetectionDraft
SD-T: score(draft) → DetectionDraft
SD-T: review(draft) → DetectionTree
adapter: DetectionTree → SmartDetectionResult (maps toolkit types to host DTOs)
host: consumes SmartDetectionResult via SmartDetectionPort
```

### DesignSystem Ports (three separate, host-owned DTOs)

```ts
// src/core/sdk/ports/DesignSystemPort.ts
// No toolkit package imports here — host-owned types only

/** Injects DS knowledge segment into LLM requests */
export interface DSPromptEnrichmentPort {
  getKnowledgeSegment(assistantId: string): string | undefined
}

/** Queries components and resolves active DS context */
export interface DSComponentMatch {
  canonicalKind: string
  componentName: string
  description?: string
}
export interface DSContext {
  name: string
  theme: string
}
export interface DSQueryPort {
  searchComponents(query: string, context?: string): Promise<DSComponentMatch[]>
  getActiveDesignSystem(): DSContext | null
}

/** Host-owned layer instruction — mirrors DS-T FigmaLayerInstruction without importing it */
export interface DSLayerInstruction {
  id: string
  type: 'frame' | 'text' | 'instance'
  name: string
  textContent?: string
  children?: DSLayerInstruction[]
}

/** Receives instruction tree; host creates real Figma nodes */
export interface DSPlacementPort {
  executeInstructions(root: DSLayerInstruction): Promise<void>
}
```

Three ports, not one. Each is independently swappable. Adapter implementations (`DefaultDS*Engine`) import from `vendor/design-system-toolkit/`. The `FigmaInstructionWalker` (`src/core/sdk/adapters/figmaInstructionWalker.ts`) implements `DSPlacementPort` by walking `DSLayerInstruction` and calling `figma.createFrame()`, `figma.createText()`, `figma.createInstance()`.

**DS-T integration path when ready:**
```
AI generates: FigmaRenderNode tree (canonical ComponentKind + textContent)
adapter: FigmaRenderNode → DS-T createFigmaInstructionTree() → FigmaLayerInstruction
adapter: FigmaLayerInstruction → DSLayerInstruction (maps toolkit types to host DTOs)
host: figmaInstructionWalker.executeInstructions(dsLayerInstruction) → Figma nodes created
```

The `RendererDesignSystem` (componentName mappings) comes from ACE config. Adapter imports DS-specific packages from `vendor/design-system-toolkit/`.

**NuxtDs registry decision:** Treat `nuxtDsRegistry.ts` as a demo-only PoC in Phase 3. Do not fold into the formal DS boundary unless an active strike team takes ownership of it.

---

## Shell Surgery

### `main.ts` → Minimal Runtime Coordinator

Rule: routing and bootstrap only. No assistant-specific feature logic. No business logic. If a change to an assistant's behavior would require editing `main.ts`, the extraction is incomplete.

Retained in `main.ts`:
- Plugin init (`figma.showUI`, options)
- `figma.on('selectionchange', ...)` → forward selection to SDK
- `figma.ui.on('message', ...)` → route to SDK core
- `figma.on('close', ...)` cleanup

Extracted to `src/core/sdk/`:

| Service | File | Responsibility |
|---|---|---|
| `ConversationManager` | `conversationManager.ts` | `messageHistory`, `getCurrentSegment()`, `normalizeMessages()`, `pushMessage()`, `replaceStatus()` |
| `QuickActionExecutor` | `quickActionExecutor.ts` | `RUN_QUICK_ACTION` dispatch, pre-LLM handler branches, port call routing |
| `StatusChannel` | `statusChannel.ts` | Typed `replaceStatusMessage()`, `sendAssistantMessage()`, `updateStatusStep()` |
| `SelectionResolver` | `selectionResolver.ts` | Wraps `buildSelectionContext()`, `resolveSelection()` |

`HandlerResult` gains an optional field for the north star (additive, unused initially):
```ts
export interface HandlerResult {
  handled: boolean
  message?: string
  outcome?: OutcomeRecord  // reserved for north star review loop
}
```

### `ui.tsx` → Minimal UI Shell

Rule: routing and bootstrap only. No assistant-specific feature logic. No business logic. If adding a new assistant requires editing `ui.tsx` beyond registering its controller, the extraction is incomplete.

Retained in `ui.tsx`:
- React render root
- `pluginMessage` event listener → route to controllers
- Global state: `mode`, `editorType`, `assistantId`
- No assistant-specific logic

Extracted to `src/ui/controllers/` (one file per assistant):

Each controller owns: the assistant's quick-action dispatch, message rendering, state management for that assistant's view, and event handlers that previously lived as inline branches in `ui.tsx`.

Extracted to `src/ui/services/`:

| Service | File | Responsibility |
|---|---|---|
| `ViewportManager` | `viewportManager.ts` | Viewport scroll, stage positioning, zoom |
| `UIStatusService` | `uiStatusService.ts` | Spinner state, status bar rendering |

---

## SKILL.md Authoring Model

### File format (`src/assistants/<id>/SKILL.md`)

```markdown
## Identity
name: General Assistant
tagline: Design thinking partner

## Behavior
- Respond in the user's language
- Prefer concrete, specific feedback over general advice
- Ask one clarifying question before generating large designs

## LLM Query
model-hints: prefer-long-context
temperature-bias: balanced

## Quick Actions
### analyze-selection
behavior: Describe layout hierarchy, spacing system, and component choices
output-format: structured-feedback

## Safety
vision: enabled
content-safety: standard
```

### Separation rule (hard boundary)

| File type | Contains |
|---|---|
| `SKILL.md` | Behavior rules, operating rules, LLM query configuration, quick-action behavior overlays |
| `*.kb.json` / resource files | Domain knowledge, policies, definitions, examples, reference content |

Do not merge these. An assistant that needs both has a `SKILL.md` **and** separate KB files.

### Build-time compilation

`scripts/compile-skills.ts`:
1. Reads `src/assistants/<id>/SKILL.md` for each assistant
2. Parses sections → `AssistantSkill` TS type
3. SKILL.md overlays the existing `promptTemplate` baseline from the manifest during migration
4. Emits into **`src/assistants/assistantSkills.generated.ts`** — a separate artifact from `assistants.generated.ts`

`assistants.generated.ts` retains its existing role (assistant registry, quick actions, mode ordering). `assistantSkills.generated.ts` holds the compiled skill behaviors. The assistant runtime merges them at import time — no single file owns both concerns.

### Migration path

Existing assistants keep their `promptTemplate` in the manifest. SKILL.md is opt-in per assistant. Full migration is a separate pass (not in Phases 0–4).

---

## ACE Editing Model — Hybrid

**Canonical source: always SKILL.md.** ACE never stores a compiled representation.

### Three editor modes

**1. Structured panels (default — admin-safe):**
Named form fields for: Identity (name, tagline), Behavior rules (list editor with add/remove/reorder), Quick Action entries (per-action behavior fields), Safety toggles. No markdown knowledge required.

**2. Source mode (advanced):**
Full SKILL.md markdown editing. Changes write directly to the canonical file. Available to power users.

**3. Preview mode (read-only):**
Shows the compiled output — what the runtime will receive after `compile-skills.ts` runs. No editing.

### Round-trip rule

Structured panel edit → serialize to SKILL.md canonical sections → save. On load: parse SKILL.md → populate panel fields. Sections ACE does not know how to structure are preserved verbatim in source mode and shown as a collapsed "Advanced block" in structured mode.

### Validation before publish

Required: Identity.name present, at least one Behavior rule, quick action IDs match manifest entries, no unrecognized section headers. Diff shown before publish — no silent overwrites.

### Lossy-edit prevention

If a structured edit would modify or drop content from an unknown/advanced section, ACE warns and requires source-mode confirmation before proceeding. ACE does not silently rewrite content it cannot fully represent in structured fields.

---

## Phase Roadmap

### Phase 0: Port Interfaces (no behavior changes)

Define all port interfaces and adapter contracts. Zero runtime behavior changes.

**Files created:**
- `src/core/sdk/ports/SmartDetectionPort.ts`
- `src/core/sdk/ports/DesignSystemPort.ts` (three interfaces)
- `src/core/sdk/adapters/figmaNodeSerializer.ts` (interface + stub)
- `src/core/sdk/adapters/figmaInstructionWalker.ts` (interface + stub)
- `src/core/sdk/index.ts` (barrel)

**Deliverables:** Typed port contracts. Adapter stubs that return defaults (no toolkit calls yet). Zero consumers changed in this phase.

---

### Phase 1: Shell Surgery — Twin Shells

Extract SDK core from `main.ts` and UI controllers from `ui.tsx` simultaneously.

**Files created:**
- `src/core/sdk/conversationManager.ts`
- `src/core/sdk/quickActionExecutor.ts`
- `src/core/sdk/statusChannel.ts`
- `src/core/sdk/selectionResolver.ts`
- `src/ui/controllers/AnalyticsTaggingController.ts`
- `src/ui/controllers/ContentTableController.ts`
- `src/ui/controllers/DesignCritiqueController.ts`
- `src/ui/controllers/DesignWorkshopController.ts`
- `src/ui/controllers/GeneralController.ts`
- `src/ui/controllers/Code2DesignController.ts`
- `src/ui/controllers/DiscoveryController.ts`
- `src/ui/controllers/SmartDetectorController.ts`
- `src/ui/services/viewportManager.ts`
- `src/ui/services/uiStatusService.ts`

**Modified:** `src/main.ts` (reduced to coordinator), `src/ui.tsx` (reduced to shell)

**North star addition:** `outcome?: OutcomeRecord` added to `HandlerResult` (unused, additive).

**Guardrail:** No behavioral changes. All existing tests pass. Feature parity verified.

---

### Phase 2: Route Smart Detector Through Port

Wire the `SmartDetectionPort` and complete the host-owned adapter.

**Files created/modified:**
- `src/core/sdk/adapters/figmaNodeSerializer.ts` — full `SceneNode → FigmaNode` implementation
- `src/core/detection/smartDetector/DefaultSmartDetectionEngine.ts` — wraps current in-repo detector, implements `SmartDetectionPort`
- Update `src/core/sdk/index.ts` to export port + register default engine

**Modified:** All Smart Detector consumers — route through `SmartDetectionPort`, remove direct imports of `src/core/detection/smartDetector/index.ts`.

**Guardrail:** `scripts/assert-invariants.ts` gains a check: no file outside `src/core/detection/smartDetector/DefaultSmartDetectionEngine.ts` may import from `src/core/detection/smartDetector/` directly.

---

### Phase 3: Route Design System Through Ports

Wire the three DS ports and complete the host-owned instruction walker.

**Files created:**
- `src/core/designSystem/DefaultDSPromptEnrichmentEngine.ts`
- `src/core/designSystem/DefaultDSQueryEngine.ts`
- `src/core/designSystem/DefaultDSPlacementEngine.ts`
- `src/core/sdk/adapters/figmaInstructionWalker.ts` — full `FigmaLayerInstruction → figma.create*` implementation

**Modified:** All DS consumers — route through the three ports. Remove direct imports of in-repo DS files from consumers.

**NuxtDs decision:** `nuxtDsRegistry.ts` marked demo-only. No changes; not folded into formal boundary.

**Guardrail:** Assert-invariants gains a check: no file outside the three default engines may import from `src/core/designSystem/registryLoader.ts`, `assistantApi.ts`, or `componentService.ts` directly.

---

### Phase 4: ACE Config Alignment

Make ACE the control plane for strike-team-safe configuration.

**Deliverables:**
- `AssistantConfig` layer type (`src/core/sdk/assistantConfig.ts`) — compiled from ACE, read by runtime
- Explicit schema fields for: LLM enablement, KB assignment, DS context (active system + `RendererDesignSystem`), vision/scanning gates, quick action visibility, rate-limit hooks
- SD-T/DS-T engine settings live in `AssistantConfig` under stable field names — no coupling to temp engine internals
- Forward-compatible: field names survive the SD-T/DS-T engine swap

---

### Phase 5: SKILL.md Authoring + ACE Editing Surface  ⚠️ GATED

**Do not execute without a dedicated sub-plan.**

This phase is fully designed in this spec. Before execution, a separate brainstorm and implementation plan are required for:
- Canonical SKILL.md parser + `AssistantSkill` type definition
- `scripts/compile-skills.ts` compiler
- ACE structured panel editor (React components)
- ACE source/preview mode
- ACE round-trip + validation + lossy-edit prevention
- Per-assistant migration from `promptTemplate` to SKILL.md

---

### Phase 6: Build and Registration Cleanup

**Deliverables:**
- Official strike-team extension path documented (which files to add, which to never import)
- `assert-invariants.ts` drift checks: manifest ↔ handler registration, SKILL.md ↔ compiled artifacts (when Phase 5 complete)
- `AssistantBuilder` scoped as a future item — not built now
- Generated artifacts reflect new runtime boundaries cleanly

---

### Phase 7: Strike-Team Docs

**Deliverables:**
- SDK architecture doc (what is stable, what is internal, what is replaceable)
- Migration guide: current engine → replaceable engine boundaries
- Strike-team starter guide: what to depend on, what to avoid
- SD-T and DS-T integration note: package/build assumptions, adapter ownership in host repo, `pnpm`, ESM, built dist
- SKILL.md authoring guide: behavior vs KB separation, section reference (when Phase 5 complete)
- ACE editing guide: create, edit, validate, preview, publish (when Phase 5 complete)

---

## Dependency Strategy for SD-T and DS-T

**Approach: Vendored dist.** Both toolkits are pnpm workspace packages not published to npm. For private/corporate environments, the safest and simplest approach:

1. Build each toolkit in its own repo (`pnpm build` in the relevant package)
2. Copy the built output into this repo:
   - `vendor/smart-detector/` — SD-T built packages (`dist/index.js`, `dist/index.d.ts`)
   - `vendor/design-system-toolkit/` — DS-T built packages
3. Adapter files import from `vendor/` paths (e.g. `../../vendor/smart-detector/dist/index.js`)
4. Port contract files import nothing from toolkit packages — host DTOs only
5. `vendor/` is committed to the repo — no npm registry, no cross-repo pnpm linking, works offline and in airgapped corporate networks

When a toolkit updates: rebuild it, copy new dist into `vendor/`, update the adapter. Only the adapter changes — consumers and port contracts are unaffected.

`tsconfig.json` path aliases map `@vendor/smart-detector` and `@vendor/design-system-toolkit` to the vendor locations so import paths are stable even if the folder structure shifts.

---

## Toolkit Integration Reference

### SD-T packages in scope for host integration

| Package | Role | Host integration point |
|---|---|---|
| `@smart-detector/detector-figma` | `traverseFigmaNode()` | Called after `serializeFigmaNode()` in `DefaultSmartDetectionEngine` (or SD-T engine) |
| `@smart-detector/normalizer` | `normalize(rawNodes)` | Internal to engine |
| `@smart-detector/scorer` | `score(draft)` | Internal to engine |
| `@smart-detector/reviewer` | `review(draft)` | Internal to engine; returns `DetectionTree` |
| `@smart-detector/schema` | Shared types | `DetectionTree`, `DetectionNode`, `RawNode` — imported in port types |

### DS-T packages in scope for host integration

| Package | Role | Host integration point |
|---|---|---|
| `@design-system-toolkit/renderer-figma` | `createFigmaInstructionTree()` | Called in DS-T engine; output consumed by `figmaInstructionWalker` |
| `@design-system-toolkit/schema` | Shared types | `FigmaRenderNode`, `FigmaLayerInstruction`, `RendererDesignSystem` — imported in port types |
| DS-specific packages (`ds-nuxt-ui`, etc.) | `RendererDesignSystem` data | Loaded from ACE config; provides `componentName` mappings |

### Build integration note

Both toolkits are pnpm workspace packages, ESM, not yet published to npm. Integration requires either:
- (a) pnpm workspace link (if toolkits live in the same monorepo or are linked)
- (b) built dist packages (`dist/index.js` + `dist/index.d.ts`) copied to a vendored location

Build integration approach to be confirmed before Phase 2/3 execution. The host plugin uses `esbuild` (via `build-figma-plugin`); ESM packages must be bundled at build time.

---

## Guardrails

1. No strike team may import current Smart Detector or Design System implementation files directly after Phase 2/3 complete.
2. ACE config must not couple to temporary engine implementation details.
3. Do not swap external toolkits in the same step as SDK centralization — port first, swap when toolkits are build-integrated and verified.
4. Preserve current behavior through all phases. No behavioral changes before full-phase verification.
5. Raw `SKILL.md` files are never the plugin runtime source of truth.
6. Do not collapse `SKILL.md` and KBs. Separate roles, separate files.
7. ACE editing model must not silently lose or rewrite content — lossy-edit prevention is a hard requirement.
8. Phase 5 does not execute until its own sub-plan is written and approved.

---

## Branch Name

**Proposed:** `sdk-toolkit-foundation`

Rationale: signals what executes now (SDK contracts + toolkit port seams). Does not overclaim SKILL.md/ACE surface execution scope, which is gated behind a sub-plan.

Alternative: `sdk-skill-ace-foundation` (Cursor AI suggestion — acceptable if you prefer the full scope expressed in the branch name).
