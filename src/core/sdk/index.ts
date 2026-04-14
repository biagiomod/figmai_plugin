/**
 * SDK barrel — strike-team stable surface.
 * Import SDK services from here, not from individual implementation files.
 */
export type { SmartDetectionPort, SmartDetectionResult, DetectedElement, SmartDetectionSummary, DetectionCertainty } from './ports/SmartDetectionPort'
export type { DSPromptEnrichmentPort, DSQueryPort, DSPlacementPort, DSComponentMatch, DSContext, DSLayerInstruction } from './ports/DesignSystemPort'
export type { OutcomeRecord } from './types'
export type { AssistantConfig } from './assistantConfig'
export { defaultAssistantConfig, validateAssistantConfig } from './assistantConfig'
