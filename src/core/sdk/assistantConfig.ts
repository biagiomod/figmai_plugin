/**
 * AssistantConfig — ACE-owned per-assistant configuration.
 * Compiled to TS by pull-ace-config at build time. Read at runtime from generated TS.
 *
 * ## Runtime scope (Phase 4 — current)
 * This type and its generated counterpart (`src/custom/assistantConfigs.generated.ts`)
 * are produced by the ACE pull script but are NOT yet consumed by any runtime path.
 * The schema is intentionally forward-compatible so the ACE config format is stable
 * before Phase 5 wires these fields into runtime decisions.
 *
 * ## Deferred (Phase 5 — SKILL.md + ACE hybrid editing wave)
 * - `llmEnabled` → gate LLM calls in quickActionExecutor
 * - `kbAssignments` → replace or supplement the static KB assignment in instructionAssembly
 * - `visionEnabled` / `smartDetectionEnabled` → gate vision / SD calls in handlers
 * - `hiddenQuickActionIds` → filter the quick-action list in the UI manifest
 * - `designSystemId` / `designSystemTheme` → seed the DS port context
 * - `rateLimitTier` → configure provider-level throttling
 *
 * Until Phase 5 lands, runtime behavior is governed entirely by the static manifest
 * (src/assistants/) and build-time config (src/custom/). Do not wire these fields
 * without an approved Phase 5 design document.
 */

export interface AssistantConfig {
  assistantId: string

  // LLM gate (deferred: Phase 5)
  llmEnabled: boolean

  // Knowledge bases (deferred: Phase 5)
  kbAssignments: string[]               // KB IDs to inject for this assistant

  // Design system (deferred: Phase 5 — DS-T ready, no coupling to registry internals)
  designSystemId?: string               // Active DS ID from ACE config
  designSystemTheme?: string

  // Vision / scanning gates (deferred: Phase 5)
  visionEnabled: boolean
  smartDetectionEnabled: boolean

  // Quick action visibility (deferred: Phase 5)
  hiddenQuickActionIds: string[]

  // Rate limiting hook (deferred: Phase 5)
  rateLimitTier?: 'default' | 'elevated' | 'unrestricted'
}

export function defaultAssistantConfig(assistantId: string): AssistantConfig {
  return {
    assistantId,
    llmEnabled: true,
    kbAssignments: [],
    visionEnabled: true,
    smartDetectionEnabled: true,
    hiddenQuickActionIds: [],
  }
}

export function validateAssistantConfig(cfg: AssistantConfig): boolean {
  if (!cfg.assistantId) return false
  if (typeof cfg.llmEnabled !== 'boolean') return false
  if (!Array.isArray(cfg.kbAssignments)) return false
  return true
}
