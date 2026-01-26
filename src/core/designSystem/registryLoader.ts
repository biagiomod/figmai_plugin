/**
 * Design System Registry Loader
 * 
 * Loads and validates design system registries from embedded custom registries.
 * Applies allowlist/denylist filtering and strict mode validation.
 */

import { customDesignSystemRegistries } from '../../custom/generated/customRegistries'
import { getDesignSystemConfig } from '../../custom/config'
import type { DesignSystemRegistry, ComponentEntry, LoadedRegistry, ValidationResult } from './types'

/**
 * Validate a component entry
 */
function validateComponentEntry(entry: any, registryId: string, componentIndex: number): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  
  // Required fields
  if (!entry.name || typeof entry.name !== 'string') {
    errors.push(`Component ${componentIndex}: missing or invalid 'name' field`)
  }
  if (!entry.key || typeof entry.key !== 'string') {
    errors.push(`Component ${componentIndex}: missing or invalid 'key' field`)
  }
  if (!entry.purpose || typeof entry.purpose !== 'string') {
    errors.push(`Component ${componentIndex}: missing or invalid 'purpose' field`)
  }
  if (!Array.isArray(entry.whenToUse) || entry.whenToUse.length === 0) {
    errors.push(`Component ${componentIndex}: missing or invalid 'whenToUse' array`)
  }
  
  // Optional but recommended fields
  if (!entry.whenNotToUse || !Array.isArray(entry.whenNotToUse)) {
    warnings.push(`Component ${componentIndex}: 'whenNotToUse' is recommended but missing`)
  }
  
  // Validate variant properties if component set
  if (entry.isComponentSet === true) {
    if (!entry.variantProperties || typeof entry.variantProperties !== 'object') {
      warnings.push(`Component ${componentIndex}: isComponentSet is true but variantProperties missing`)
    }
  }
  
  // Validate accessibility structure if present
  if (entry.accessibility && typeof entry.accessibility !== 'object') {
    warnings.push(`Component ${componentIndex}: 'accessibility' must be an object`)
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Validate a registry structure
 */
function validateRegistry(registry: any, registryId: string): ValidationResult {
  const errors: string[] = []
  const warnings: string[] = []
  
  // Required fields
  if (!registry.id || typeof registry.id !== 'string') {
    errors.push(`Registry ${registryId}: missing or invalid 'id' field`)
  }
  if (registry.id !== registryId) {
    errors.push(`Registry ${registryId}: 'id' field ('${registry.id}') does not match directory name`)
  }
  if (!registry.name || typeof registry.name !== 'string') {
    errors.push(`Registry ${registryId}: missing or invalid 'name' field`)
  }
  if (!Array.isArray(registry.components)) {
    errors.push(`Registry ${registryId}: missing or invalid 'components' array`)
  }
  
  // Validate components
  if (Array.isArray(registry.components)) {
    registry.components.forEach((component: any, index: number) => {
      const componentValidation = validateComponentEntry(component, registryId, index)
      errors.push(...componentValidation.errors)
      warnings.push(...componentValidation.warnings)
    })
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings
  }
}

/**
 * Filter registries based on allowlist/denylist
 */
function filterRegistries(
  registryIds: string[],
  allowlist?: string[],
  denylist?: string[]
): string[] {
  let filtered = [...registryIds]
  
  // Apply denylist first (most restrictive)
  if (denylist && denylist.length > 0) {
    filtered = filtered.filter(id => !denylist.includes(id))
  }
  
  // Apply allowlist (if specified, only allow these)
  if (allowlist && allowlist.length > 0) {
    filtered = filtered.filter(id => allowlist.includes(id))
  }
  
  return filtered
}

/**
 * Load and validate design system registries
 * 
 * Applies allowlist/denylist filtering and strict mode validation.
 * Returns empty array if disabled or no active registries.
 * 
 * @throws Error in strict mode if any active registry fails to load
 */
export function loadDesignSystemRegistries(): LoadedRegistry[] {
  const config = getDesignSystemConfig()
  
  // If disabled, return empty array
  if (!config.enabled) {
    return []
  }
  
  // Get active registries from config
  const activeRegistryIds = config.activeRegistries || []
  
  if (activeRegistryIds.length === 0) {
    return []
  }
  
  // Apply allowlist/denylist filtering
  const filteredIds = filterRegistries(activeRegistryIds, config.allowlist, config.denylist)
  
  if (filteredIds.length === 0) {
    console.warn('[DS Registry] All registries filtered out by allowlist/denylist')
    return []
  }
  
  const loadedRegistries: LoadedRegistry[] = []
  const errors: string[] = []
  const warnings: string[] = []
  
  // Load and validate each registry
  for (const registryId of filteredIds) {
    const registry = customDesignSystemRegistries[registryId]
    
    if (!registry) {
      const error = `Registry '${registryId}' not found in custom/design-systems/`
      if (config.strictMode) {
        errors.push(error)
      } else {
        warnings.push(error)
        continue
      }
    } else {
      // Validate registry structure
      const validation = validateRegistry(registry, registryId)
      
      if (!validation.valid) {
        const error = `Registry '${registryId}' validation failed: ${validation.errors.join('; ')}`
        if (config.strictMode) {
          errors.push(error)
        } else {
          warnings.push(error)
          // In non-strict mode, skip invalid registries but continue
          continue
        }
      } else {
        // Filter out invalid components but keep valid ones
        const validComponents: ComponentEntry[] = []
        registry.components.forEach((component: any, index: number) => {
          const componentValidation = validateComponentEntry(component, registryId, index)
          if (componentValidation.valid) {
            validComponents.push(component as ComponentEntry)
          } else {
            warnings.push(`Registry '${registryId}', component ${index} (${component.name || 'unnamed'}): ${componentValidation.errors.join('; ')}`)
          }
        })
        
        loadedRegistries.push({
          id: registry.id,
          name: registry.name,
          version: registry.version,
          description: registry.description,
          components: validComponents
        })
      }
    }
  }
  
  // Log warnings (always)
  if (warnings.length > 0) {
    console.warn('[DS Registry] Validation warnings:', warnings)
  }
  
  // In strict mode, throw if any errors
  if (config.strictMode && errors.length > 0) {
    const errorMessage = `[DS Registry] Strict mode: Registry loading failed:\n${errors.join('\n')}`
    console.error(errorMessage)
    throw new Error(errorMessage)
  }
  
  // Log errors (non-strict mode)
  if (errors.length > 0) {
    console.error('[DS Registry] Validation errors (non-strict, continuing):', errors)
  }
  
  return loadedRegistries
}

/**
 * Get active registry IDs from config (after filtering)
 */
export function getActiveRegistryIds(): string[] {
  const config = getDesignSystemConfig()
  
  if (!config.enabled) {
    return []
  }
  
  const activeRegistryIds = config.activeRegistries || []
  return filterRegistries(activeRegistryIds, config.allowlist, config.denylist)
}
