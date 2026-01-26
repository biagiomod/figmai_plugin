/**
 * Component Service
 * 
 * Handles importing components by key, caching them, and creating instances.
 * All operations run in the main thread (required for Figma API).
 */

/**
 * Component cache
 * Maps component key to imported component node
 */
const componentCache: Map<string, ComponentNode | ComponentSetNode> = new Map()

/**
 * Import a component by key
 * 
 * Uses Figma's importComponentByKeyAsync API.
 * Caches the result to avoid re-importing.
 * 
 * @param key - Figma component key
 * @returns Component node or null if import fails
 */
export async function importComponentByKey(key: string): Promise<ComponentNode | ComponentSetNode | null> {
  // Check cache first
  if (componentCache.has(key)) {
    return componentCache.get(key) || null
  }
  
  try {
    const component = await figma.importComponentByKeyAsync(key)
    // Cache the component
    componentCache.set(key, component)
    return component
  } catch (error) {
    console.error(`[DS Component Service] Failed to import component with key '${key}':`, error)
    return null
  }
}

/**
 * Create a component instance
 * 
 * Imports the component (or uses cache), creates an instance,
 * applies variant properties if component set, and places it on the canvas.
 * 
 * @param key - Figma component key
 * @param variantProperties - Optional variant properties (for component sets)
 * @param parent - Optional parent node (defaults to current page)
 * @param position - Optional position {x, y} (defaults to viewport center)
 * @returns Instance node or null if creation fails
 */
export async function createComponentInstance(
  key: string,
  variantProperties?: Record<string, string>,
  parent?: BaseNode,
  position?: { x: number; y: number }
): Promise<InstanceNode | null> {
  // Import component (uses cache if available)
  const component = await importComponentByKey(key)
  
  if (!component) {
    return null
  }
  
  try {
    // Create instance
    let instance: InstanceNode
    if (component.type === 'COMPONENT') {
      // Single component - create instance directly
      instance = (component as ComponentNode).createInstance()
    } else {
      // COMPONENT_SET - need to get a variant first
      const componentSet = component as ComponentSetNode
      // Use default variant (top-left-most) or find variant matching properties
      let variantComponent: ComponentNode = componentSet.defaultVariant
      
      // If variant properties provided, try to find matching variant
      if (variantProperties && Object.keys(variantProperties).length > 0) {
        // Find variant that matches the properties
        const matchingVariant = componentSet.children.find(child => {
          if (child.type !== 'COMPONENT') return false
          const childVariantProps = child.variantProperties || {}
          // Check if all provided properties match
          return Object.entries(variantProperties).every(([key, value]) => {
            return childVariantProps[key] === value
          })
        })
        
        if (matchingVariant && matchingVariant.type === 'COMPONENT') {
          variantComponent = matchingVariant
        }
      }
      
      instance = variantComponent.createInstance()
      
      // Apply variant properties if provided (may switch to different variant)
      if (variantProperties && Object.keys(variantProperties).length > 0) {
        instance.setProperties(variantProperties)
      }
    }
    
    // Determine parent
    const targetParent = parent || figma.currentPage
    
    // Determine position
    if (position) {
      instance.x = position.x
      instance.y = position.y
    } else {
      // Default to viewport center
      const viewport = figma.viewport.center
      instance.x = viewport.x - (instance.width / 2)
      instance.y = viewport.y - (instance.height / 2)
    }
    
    // Append to parent
    if (targetParent.type === 'PAGE') {
      targetParent.appendChild(instance)
    } else if ('appendChild' in targetParent) {
      (targetParent as any).appendChild(instance)
    } else {
      // Fallback: append to current page
      figma.currentPage.appendChild(instance)
    }
    
    // Select the instance
    figma.currentPage.selection = [instance]
    figma.viewport.scrollAndZoomIntoView([instance])
    
    return instance
  } catch (error) {
    console.error(`[DS Component Service] Failed to create instance for key '${key}':`, error)
    return null
  }
}

/**
 * Clear the component cache
 * 
 * Useful for testing or if components need to be re-imported.
 */
export function clearComponentCache(): void {
  componentCache.clear()
}

/**
 * Get cache statistics (for debugging)
 */
export function getCacheStats(): { size: number; keys: string[] } {
  return {
    size: componentCache.size,
    keys: Array.from(componentCache.keys())
  }
}
