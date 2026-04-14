/**
 * Shared SDK types.
 * OutcomeRecord is a north-star stub — reserved for the future review/iterate loop.
 * It is additive and backward-compatible; nothing reads it today.
 */

/** Reserved for north star: machine-readable outcome from a handler run. */
export interface OutcomeRecord {
  type: string                  // e.g. 'scorecard_placed', 'table_generated'
  summary?: string
  artifactIds?: string[]        // Figma node IDs of placed artifacts
  metadata?: Record<string, unknown>
}
