/**
 * Design System Component Registry Types
 * 
 * Type definitions for the Design System Component Registry system.
 * Each registry is self-contained and self-describing (no global taxonomy).
 */

/**
 * Design System Registry
 * Contains metadata and component entries for a design system
 */
export interface DesignSystemRegistry {
  id: string                    // Unique DS identifier (e.g., "example", "custom")
  name: string                  // Human-readable name
  version?: string               // Optional version string
  description?: string           // Brief DS description
  components: ComponentEntry[]
}

/**
 * Component Entry
 * Self-describing component metadata for LLM selection
 */
export interface ComponentEntry {
  // Identity
  name: string                  // Component name (e.g., "Primary Button")
  key: string                    // Figma component key (required for placement)
  
  // Optional aliases (within this DS only - NOT cross-DS)
  aliases?: string[]             // e.g., ["button.primary", "btn-primary"]
  // Note: Aliases are scoped to this registry only. No global taxonomy.
  
  // Metadata for LLM selection (self-describing, no global categories)
  purpose: string                // What this component is for (required, descriptive)
  whenToUse: string[]            // Array of use case descriptions (required, helps LLM choose)
  whenNotToUse?: string[]       // Array of anti-patterns (helps LLM avoid wrong choice)
  examples?: string[]            // Example scenarios or contexts where this component is used
  
  // Variant support
  isComponentSet?: boolean       // true if this is a component set
  variantProperties?: {          // Available variant properties (if component set)
    [propertyName: string]: string[]  // e.g., { "Size": ["Small", "Medium", "Large"] }
  }
  
  // Accessibility (self-contained, no global standards assumed)
  accessibility?: ComponentAccessibility
  
  // Implementation (registry-specific guidance)
  implementationNotes?: string   // Coding considerations, framework notes
  commonPitfalls?: string[]      // Things to avoid when using this component
  
  // Optional reference to detailed doc (for long-form documentation)
  docFile?: string               // Relative path to component/*.md (e.g., "components/button.md")
  // If docFile is provided, full Markdown content is loaded on-demand for detailed queries
}

/**
 * Component Accessibility Information
 */
export interface ComponentAccessibility {
  minSize?: { width?: number; height?: number }
  requiredLabels?: string[]    // Required text/label fields
  contrastRequirements?: string // Description of contrast needs
  ariaGuidance?: string        // ARIA usage notes
  wcagLevel?: string           // Optional: "A", "AA", "AAA" if applicable
}

/**
 * Validation Result
 * Result of validating a registry entry
 */
export interface ValidationResult {
  valid: boolean
  errors: string[]
  warnings: string[]
}

/**
 * Loaded Registry
 * Registry that has been loaded and validated
 */
export interface LoadedRegistry extends DesignSystemRegistry {
  // Same as DesignSystemRegistry, but guaranteed to be validated
}

/**
 * Component Search Result
 * Result of searching for components
 */
export interface ComponentSearchResult {
  registryId: string
  component: ComponentEntry
  matchScore?: number  // For search relevance (0-1)
}
