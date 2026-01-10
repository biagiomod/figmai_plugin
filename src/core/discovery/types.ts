/**
 * Discovery Copilot Types
 * Type definitions for DiscoverySpecV1 schema
 */

/**
 * Document Status
 * Tracks the completion state of the discovery document
 */
export type DocumentStatus = 'IN_PROGRESS' | 'COMPLETED'

/**
 * Discovery Document State
 * Tracks the state of the discovery document for incremental updates
 */
export interface DiscoveryDocumentState {
  frameId: string | null
  title: string
  status: DocumentStatus
  lastUpdated: number
}

/**
 * Discovery Specification V1
 * Strict JSON schema for generating discovery artifacts
 */
export interface DiscoverySpecV1 {
  type: "discovery"
  version: 1
  meta: {
    title: string                    // Derived from user request, max 48 chars
    userRequest?: string             // Raw user request for traceability
    runId?: string                   // Run identifier (e.g., "dc_1704067200000")
    truncationNotice?: string        // Set if arrays truncated
  }
  problemFrame: {
    what: string                     // What problem are we solving?
    who: string                      // Who is affected?
    why: string                      // Why does this matter?
    success: string                  // What does success look like?
  }
  risksAndAssumptions: Array<{
    id: string                       // Unique ID (e.g., "risk-1", "assumption-1")
    type: "risk" | "assumption"
    description: string
    impact?: "high" | "medium" | "low"
  }>                                 // Max 12 items (truncate if >12)
  hypothesesAndExperiments: Array<{
    id: string                       // Unique ID (e.g., "hyp-1")
    hypothesis: string
    experiment?: string              // Optional experiment to test hypothesis
    status?: "untested" | "testing" | "validated" | "invalidated"
  }>                                 // Max 12 items (truncate if >12)
  decisionLog?: Array<{              // Optional for MVP (0-3 entries default)
    timestamp: string                // ISO 8601 timestamp
    decision: string
    rationale?: string
    context?: string
  }>                                 // Max 20 entries if present (truncate if >20)
  asyncTasks?: Array<{               // Optional but encouraged
    ownerRole: "Design" | "Product" | "Dev" | "Research" | "Analytics" | "Other"
    task: string
    dueInHours?: number              // Optional hours until due
  }>                                 // Max 6 items (truncate if >6)
}
