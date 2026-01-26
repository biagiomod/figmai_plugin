/**
 * Search Index Generator
 * 
 * Generates a compact, searchable summary of design system components
 * for injection into assistant knowledge bases.
 */

import type { LoadedRegistry } from './types'

/**
 * Build a compact component index for assistant knowledge injection
 * 
 * Optimized for token efficiency while maintaining searchability.
 * Only includes essential fields: name, purpose, key, whenToUse.
 */
export function buildComponentIndex(registries: LoadedRegistry[]): string {
  if (registries.length === 0) {
    return ''
  }
  
  const lines: string[] = []
  lines.push('# Design System Component Registry')
  lines.push('')
  lines.push('The following design system components are available for placement on the canvas.')
  lines.push('')
  
  for (const registry of registries) {
    lines.push(`## Registry: ${registry.name}`)
    if (registry.description) {
      lines.push(registry.description)
      lines.push('')
    }
    
    if (registry.components.length === 0) {
      lines.push('*No components available.*')
      lines.push('')
      continue
    }
    
    for (const component of registry.components) {
      lines.push(`### ${component.name}`)
      lines.push(`**Key:** \`${component.key}\``)
      lines.push(`**Purpose:** ${component.purpose}`)
      
      if (component.whenToUse && component.whenToUse.length > 0) {
        lines.push('**Use when:**')
        component.whenToUse.slice(0, 3).forEach(useCase => {
          lines.push(`- ${useCase}`)
        })
        if (component.whenToUse.length > 3) {
          lines.push(`- ... and ${component.whenToUse.length - 3} more use cases`)
        }
      }
      
      if (component.isComponentSet && component.variantProperties) {
        const variantInfo = Object.entries(component.variantProperties)
          .map(([prop, values]) => `${prop} (${values.join(', ')})`)
          .join('; ')
        lines.push(`**Variants:** ${variantInfo}`)
      }
      
      if (component.accessibility?.minSize) {
        const { width, height } = component.accessibility.minSize
        lines.push(`**Min size:** ${width || '?'}x${height || '?'}px`)
      }
      
      lines.push('')
    }
  }
  
  lines.push('---')
  lines.push('')
  lines.push('**Note:** Use the DESIGN_SYSTEM_QUERY tool to search, list, or place components.')
  lines.push('Components can be placed by their key using the place action.')
  
  return lines.join('\n')
}
