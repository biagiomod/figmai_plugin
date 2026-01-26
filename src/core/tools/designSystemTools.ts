/**
 * Design System Tools
 * 
 * Tool for Assistants to query and place design system components.
 */

import type { ToolDefinition } from '../types'
import {
  listDesignSystemRegistries,
  listComponents,
  searchComponents,
  getComponentByName,
  getComponentByKey,
  getComponentDocumentation,
  placeComponent
} from '../designSystem/assistantApi'
import { getDesignSystemConfig } from '../../custom/config'

/**
 * DESIGN_SYSTEM_QUERY Tool
 * 
 * Allows Assistants to query design system components and place instances.
 * 
 * Actions:
 * - 'list': List all components in active registries
 * - 'search': Search components by query string
 * - 'get': Get component details by name/key
 * - 'place': Place component instance on canvas (main thread only)
 */
export const designSystemTool: ToolDefinition = {
  id: 'DESIGN_SYSTEM_QUERY',
  name: 'Design System Component Query',
  description: 'Query available design system components and place instances on the canvas',
  requiresSelection: false,
  async execute(args: Record<string, unknown>): Promise<string> {
    const action = args.action as string
    
    if (!action || typeof action !== 'string') {
      return 'Error: "action" parameter is required. Valid actions: "list", "search", "get", "place"'
    }
    
    // Debug logging (log when design systems are enabled)
    const dsConfig = getDesignSystemConfig()
    const shouldLog = dsConfig.enabled
    if (shouldLog) {
      console.log('[DESIGN_SYSTEM_QUERY] execute', {
        action,
        registryId: args.registryId ?? null,
        hasRegistryId: !!args.registryId
      })
    }
    
    try {
      switch (action) {
        case 'list': {
          const registryId = args.registryId as string | undefined
          const components = listComponents(registryId)
          
          if (components.length === 0) {
            return 'No components available in active registries.'
          }
          
          const registries = listDesignSystemRegistries()
          
          // Debug logging for list action
          if (shouldLog) {
            console.log('[DESIGN_SYSTEM_QUERY] list result', {
              action: 'list',
              registriesFound: registries.length,
              registryIds: registries.map(r => r.id),
              totalComponents: components.length
            })
          }
          
          const result: string[] = []
          result.push(`Found ${components.length} component(s) in ${registries.length} registry/registries:`)
          result.push('')
          
          for (const registry of registries) {
            if (registryId && registry.id !== registryId) {
              continue
            }
            result.push(`**${registry.name}** (${registry.components.length} components):`)
            registry.components.forEach(component => {
              result.push(`- ${component.name} (key: ${component.key})`)
              result.push(`  Purpose: ${component.purpose}`)
            })
            result.push('')
          }
          
          return result.join('\n')
        }
        
        case 'search': {
          const query = args.query as string
          if (!query || typeof query !== 'string') {
            return 'Error: "query" parameter is required for search action'
          }
          
          const registryId = args.registryId as string | undefined
          const results = searchComponents(query, registryId)
          
          if (results.length === 0) {
            return `No components found matching "${query}"`
          }
          
          const result: string[] = []
          result.push(`Found ${results.length} component(s) matching "${query}":`)
          result.push('')
          
          results.slice(0, 10).forEach((searchResult, index) => {
            const { registryId: rid, component } = searchResult
            result.push(`${index + 1}. **${component.name}** (Registry: ${rid}, Key: ${component.key})`)
            result.push(`   Purpose: ${component.purpose}`)
            if (searchResult.matchScore) {
              result.push(`   Match score: ${(searchResult.matchScore * 100).toFixed(0)}%`)
            }
            result.push('')
          })
          
          if (results.length > 10) {
            result.push(`... and ${results.length - 10} more results`)
          }
          
          return result.join('\n')
        }
        
        case 'get': {
          const name = args.name as string | undefined
          const key = args.key as string | undefined
          const registryId = args.registryId as string | undefined
          
          if (!name && !key) {
            return 'Error: Either "name" or "key" parameter is required for get action'
          }
          
          let component
          if (key) {
            component = getComponentByKey(key)
          } else if (name) {
            component = getComponentByName(name, registryId)
          }
          
          if (!component) {
            return `Component not found${name ? `: ${name}` : key ? ` with key: ${key}` : ''}`
          }
          
          const doc = getComponentDocumentation(component.name, registryId)
          return doc || `Component: ${component.name}\nKey: ${component.key}\nPurpose: ${component.purpose}`
        }
        
        case 'place': {
          const key = args.key as string
          if (!key || typeof key !== 'string') {
            return 'Error: "key" parameter is required for place action'
          }
          
          const variantProperties = args.variantProperties as Record<string, string> | undefined
          const position = args.position as { x?: number; y?: number } | undefined
          
          // Verify component exists
          const component = getComponentByKey(key)
          if (!component) {
            return `Error: Component with key '${key}' not found in any active registry`
          }
          
          // Place component (main thread only)
          const result = await placeComponent(
            key,
            variantProperties,
            position ? { x: position.x || 0, y: position.y || 0 } : undefined
          )
          
          if (result.success) {
            return `Successfully placed component "${component.name}" on canvas${result.instanceId ? ` (instance ID: ${result.instanceId})` : ''}`
          } else {
            return `Failed to place component "${component.name}": ${result.error || 'Unknown error'}`
          }
        }
        
        default:
          return `Error: Unknown action "${action}". Valid actions: "list", "search", "get", "place"`
      }
    } catch (error) {
      return `Error executing design system tool: ${error instanceof Error ? error.message : String(error)}`
    }
  }
}
