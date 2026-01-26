/**
 * Assistant-Facing API
 * 
 * Provides query and placement functions for Assistants.
 * Query functions work in both UI and main thread.
 * Placement function only works in main thread.
 */

import { loadDesignSystemRegistries } from './registryLoader'
import { createComponentInstance } from './componentService'
import type { ComponentEntry, ComponentSearchResult, LoadedRegistry } from './types'

// Cache loaded registries (loaded once per plugin run)
let cachedRegistries: LoadedRegistry[] | null = null
let registriesLoadError: string | null = null

/**
 * Get loaded registries (with caching)
 */
function getLoadedRegistries(): LoadedRegistry[] {
  if (cachedRegistries !== null) {
    return cachedRegistries
  }
  
  try {
    cachedRegistries = loadDesignSystemRegistries()
    return cachedRegistries
  } catch (error) {
    registriesLoadError = error instanceof Error ? error.message : String(error)
    console.error('[DS Assistant API] Failed to load registries:', error)
    return []
  }
}

/**
 * List all design system registries
 */
export function listDesignSystemRegistries(): LoadedRegistry[] {
  return getLoadedRegistries()
}

/**
 * List all components (optionally filtered by registry)
 */
export function listComponents(registryId?: string): ComponentEntry[] {
  const registries = getLoadedRegistries()
  
  if (registryId) {
    const registry = registries.find(r => r.id === registryId)
    return registry ? registry.components : []
  }
  
  // Return all components from all registries
  return registries.flatMap(r => r.components)
}

/**
 * Search components by query string
 * 
 * Searches in name, purpose, aliases, and whenToUse fields.
 * Returns results sorted by relevance (match score).
 */
export function searchComponents(query: string, registryId?: string): ComponentSearchResult[] {
  const registries = getLoadedRegistries()
  const queryLower = query.toLowerCase().trim()
  
  if (!queryLower) {
    return []
  }
  
  const results: ComponentSearchResult[] = []
  
  for (const registry of registries) {
    // Skip if registry filter specified
    if (registryId && registry.id !== registryId) {
      continue
    }
    
    for (const component of registry.components) {
      let matchScore = 0
      
      // Exact name match (highest score)
      if (component.name.toLowerCase() === queryLower) {
        matchScore = 1.0
      } else if (component.name.toLowerCase().includes(queryLower)) {
        matchScore = 0.8
      }
      
      // Purpose match
      if (component.purpose.toLowerCase().includes(queryLower)) {
        matchScore = Math.max(matchScore, 0.6)
      }
      
      // Alias match
      if (component.aliases) {
        for (const alias of component.aliases) {
          if (alias.toLowerCase().includes(queryLower)) {
            matchScore = Math.max(matchScore, 0.7)
            break
          }
        }
      }
      
      // whenToUse match
      if (component.whenToUse) {
        for (const useCase of component.whenToUse) {
          if (useCase.toLowerCase().includes(queryLower)) {
            matchScore = Math.max(matchScore, 0.5)
            break
          }
        }
      }
      
      // Only include if there's a match
      if (matchScore > 0) {
        results.push({
          registryId: registry.id,
          component,
          matchScore
        })
      }
    }
  }
  
  // Sort by match score (descending)
  results.sort((a, b) => (b.matchScore || 0) - (a.matchScore || 0))
  
  return results
}

/**
 * Get component by name (exact match)
 */
export function getComponentByName(name: string, registryId?: string): ComponentEntry | null {
  const registries = getLoadedRegistries()
  
  for (const registry of registries) {
    if (registryId && registry.id !== registryId) {
      continue
    }
    
    const component = registry.components.find(c => c.name === name)
    if (component) {
      return component
    }
  }
  
  return null
}

/**
 * Get component by key (exact match)
 */
export function getComponentByKey(key: string): ComponentEntry | null {
  const registries = getLoadedRegistries()
  
  for (const registry of registries) {
    const component = registry.components.find(c => c.key === key)
    if (component) {
      return component
    }
  }
  
  return null
}

/**
 * Get component documentation
 * 
 * Returns structured text description of the component for LLM consumption.
 * If docFile is specified, it would need to be loaded separately (future enhancement).
 */
export function getComponentDocumentation(componentName: string, registryId?: string): string | null {
  const component = getComponentByName(componentName, registryId)
  
  if (!component) {
    return null
  }
  
  const lines: string[] = []
  lines.push(`# ${component.name}`)
  lines.push('')
  lines.push(`**Purpose:** ${component.purpose}`)
  lines.push('')
  
  if (component.whenToUse && component.whenToUse.length > 0) {
    lines.push('**When to use:**')
    component.whenToUse.forEach(useCase => {
      lines.push(`- ${useCase}`)
    })
    lines.push('')
  }
  
  if (component.whenNotToUse && component.whenNotToUse.length > 0) {
    lines.push('**When not to use:**')
    component.whenNotToUse.forEach(antiPattern => {
      lines.push(`- ${antiPattern}`)
    })
    lines.push('')
  }
  
  if (component.examples && component.examples.length > 0) {
    lines.push('**Examples:**')
    component.examples.forEach(example => {
      lines.push(`- ${example}`)
    })
    lines.push('')
  }
  
  if (component.isComponentSet && component.variantProperties) {
    lines.push('**Variants:**')
    Object.entries(component.variantProperties).forEach(([prop, values]) => {
      lines.push(`- ${prop}: ${values.join(', ')}`)
    })
    lines.push('')
  }
  
  if (component.accessibility) {
    lines.push('**Accessibility:**')
    if (component.accessibility.minSize) {
      lines.push(`- Minimum size: ${component.accessibility.minSize.width || '?'}x${component.accessibility.minSize.height || '?'}px`)
    }
    if (component.accessibility.requiredLabels && component.accessibility.requiredLabels.length > 0) {
      lines.push(`- Required labels: ${component.accessibility.requiredLabels.join(', ')}`)
    }
    if (component.accessibility.contrastRequirements) {
      lines.push(`- Contrast: ${component.accessibility.contrastRequirements}`)
    }
    if (component.accessibility.ariaGuidance) {
      lines.push(`- ARIA: ${component.accessibility.ariaGuidance}`)
    }
    lines.push('')
  }
  
  if (component.implementationNotes) {
    lines.push('**Implementation Notes:**')
    lines.push(component.implementationNotes)
    lines.push('')
  }
  
  if (component.commonPitfalls && component.commonPitfalls.length > 0) {
    lines.push('**Common Pitfalls:**')
    component.commonPitfalls.forEach(pitfall => {
      lines.push(`- ${pitfall}`)
    })
    lines.push('')
  }
  
  lines.push(`**Component Key:** ${component.key}`)
  
  return lines.join('\n')
}

/**
 * Get design system overview
 */
export function getDesignSystemOverview(registryId: string): string | null {
  const registries = getLoadedRegistries()
  const registry = registries.find(r => r.id === registryId)
  
  if (!registry) {
    return null
  }
  
  const lines: string[] = []
  lines.push(`# ${registry.name}`)
  if (registry.version) {
    lines.push(`Version: ${registry.version}`)
  }
  if (registry.description) {
    lines.push('')
    lines.push(registry.description)
  }
  lines.push('')
  lines.push(`**Components:** ${registry.components.length}`)
  
  return lines.join('\n')
}

/**
 * Place a component instance on the canvas
 * 
 * Main thread only. Creates an instance and places it.
 * 
 * @param key - Component key
 * @param variantProperties - Optional variant properties
 * @param position - Optional position {x, y}
 * @returns Result with success status and error/instanceId
 */
export async function placeComponent(
  key: string,
  variantProperties?: Record<string, string>,
  position?: { x: number; y: number }
): Promise<{ success: boolean; error?: string; instanceId?: string }> {
  // Verify we're in main thread (component creation requires main thread)
  // This is a runtime check - if called from UI thread, it will fail at importComponentByKey
  
  const instance = await createComponentInstance(key, variantProperties, undefined, position)
  
  if (!instance) {
    // Try to get more specific error
    const component = getComponentByKey(key)
    if (!component) {
      return {
        success: false,
        error: `Component with key '${key}' not found in any active registry`
      }
    }
    
    return {
      success: false,
      error: `Failed to import or create instance for component '${component.name}'. The component library may not be enabled in this file, or the component key may be invalid.`
    }
  }
  
  return {
    success: true,
    instanceId: instance.id
  }
}
