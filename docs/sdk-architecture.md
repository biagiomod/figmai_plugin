# SDK Architecture

## Overview

FigmAI uses a ports-and-adapters pattern to isolate assistant feature logic from external toolkits (SD-T, DS-T) and from shell coordination code (main.ts, ui.tsx).

## Stable surface (safe to import)

| Module | What it is |
|---|---|
| `src/core/sdk/index.ts` | SDK barrel — import all port types from here |
| `src/core/sdk/ports/SmartDetectionPort.ts` | SmartDetectionPort + host-owned DTOs |
| `src/core/sdk/ports/DesignSystemPort.ts` | DS ports + host-owned DTOs |
| `src/core/sdk/conversationManager.ts` | ConversationManager — message history |
| `src/core/sdk/statusChannel.ts` | StatusChannel — typed UI posting |
| `src/core/sdk/selectionResolver.ts` | SelectionResolver — wraps Figma selection APIs |
| `src/core/sdk/quickActionExecutor.ts` | QuickActionExecutor — RUN_QUICK_ACTION dispatch |
| `src/core/sdk/assistantConfig.ts` | AssistantConfig — per-assistant ACE config |

## Internal (do not import from outside sdk/)

| Module | Why internal |
|---|---|
| `src/core/detection/smartDetector/*` (except DefaultSmartDetectionEngine) | In-repo engine, temporary |
| `src/core/designSystem/registryLoader.ts` | In-repo engine internal |
| `src/core/designSystem/assistantApi.ts` | In-repo engine internal |
| `src/core/designSystem/componentService.ts` | In-repo engine internal |
| `src/core/designSystem/searchIndex.ts` | In-repo engine internal |

## Replaceable engines

| Port | Current engine | Future engine (when ready) |
|---|---|---|
| `SmartDetectionPort` | `DefaultSmartDetectionEngine` | `SDToolkitSmartDetectionEngine` |
| `DSPromptEnrichmentPort` | `DefaultDSPromptEnrichmentEngine` | `DSToolkitPromptEnrichmentEngine` |
| `DSQueryPort` | `DefaultDSQueryEngine` | `DSToolkitQueryEngine` |
| `DSPlacementPort` | `DefaultDSPlacementEngine` | `DSToolkitPlacementEngine` |

## Shell coordinators

| File | Responsibility |
|---|---|
| `src/main.ts` | Plugin main thread: message routing, plugin globals, SDK wiring |
| `src/ui.tsx` | Plugin UI thread: React render root, message router to controllers |

Both files should contain routing and bootstrap only. If adding a feature requires editing business logic into these files, that feature belongs in a handler or controller.

## North-star hooks (additive only)

These seams are in place but unused today:
- `OutcomeRecord` on `HandlerResult` — future: machine-readable outcome from each handler run
- `ConversationManager` — future: intent capture, conversation memory
- `QuickActionExecutor` — future: PlanExecutor, multi-step action execution
- `StatusChannel` — future: streaming status, progress reporting
