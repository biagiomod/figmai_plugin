// src/core/sdk/ports/DesignSystemPort.ts
/**
 * DesignSystem ports — three separate interfaces covering:
 *   1. DSPromptEnrichmentPort  — inject DS knowledge into LLM requests
 *   2. DSQueryPort             — query components, resolve active DS context
 *   3. DSPlacementPort         — receive instruction tree, create Figma nodes
 *
 * No imports from toolkit packages. Adapter implementations map to/from toolkit types.
 */

// ── Prompt Enrichment ────────────────────────────────────────────────────────

/**
 * Returns a DS knowledge segment to inject into LLM system prompts.
 * Returns undefined if no active DS or enrichment is disabled.
 */
export interface DSPromptEnrichmentPort {
  getKnowledgeSegment(assistantId: string): string | undefined
}

// ── Query ─────────────────────────────────────────────────────────────────────

export interface DSComponentMatch {
  canonicalKind: string    // e.g. 'button', 'card'
  componentName: string    // as it appears in the DS (e.g. 'PrimaryButton')
  description?: string
  registryId?: string
}

export interface DSContext {
  name: string             // e.g. 'Nuxt UI'
  theme: string            // e.g. 'light'
}

/**
 * Query components and resolve active design system context.
 */
export interface DSQueryPort {
  searchComponents(query: string, context?: string): Promise<DSComponentMatch[]>
  getActiveDesignSystem(): DSContext | null
}

// ── Placement ─────────────────────────────────────────────────────────────────

/**
 * Host-owned instruction tree — mirrors DS-T FigmaLayerInstruction without importing it.
 * The adapter implementation maps between this and the toolkit's native type.
 */
export interface DSLayerInstruction {
  id: string
  type: 'frame' | 'text' | 'instance'
  name: string
  textContent?: string
  children?: DSLayerInstruction[]
}

/**
 * Receives a DSLayerInstruction tree and creates actual Figma nodes/instances.
 * The host plugin owns this — toolkit instructions are translated here.
 */
export interface DSPlacementPort {
  executeInstructions(root: DSLayerInstruction): Promise<void>
}
