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

export type ComponentKind = 'component' | 'component_set'

const IMPORT_API = {
  component: 'importComponentByKeyAsync',
  component_set: 'importComponentSetByKeyAsync'
} as const

/**
 * Import by key and kind using the correct Figma API.
 * Component sets must use importComponentSetByKeyAsync; single components use importComponentByKeyAsync.
 * Reuses componentCache. Structured log: kind, key, api name, success/failure.
 */
async function importByKeyAndKind(
  key: string,
  kind: ComponentKind
): Promise<ComponentNode | ComponentSetNode | null> {
  if (componentCache.has(key)) {
    const cached = componentCache.get(key) || null
    console.log(`[DS Component Service] import kind=${kind} key=${key} api=${IMPORT_API[kind]} success=true (cached)`)
    return cached
  }

  const apiName = IMPORT_API[kind]
  console.log(`[DS Component Service] import kind=${kind} key=${key} api=${apiName} attempting`)

  try {
    const node =
      kind === 'component_set'
        ? await figma.importComponentSetByKeyAsync(key)
        : await figma.importComponentByKeyAsync(key)
    componentCache.set(key, node)
    console.log(`[DS Component Service] import kind=${kind} key=${key} api=${apiName} success=true`)
    return node
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : String(error)
    console.log(`[DS Component Service] import kind=${kind} key=${key} api=${apiName} success=false error=${errMsg}`)
    console.error(`[DS Component Service] Import failed (kind=${kind}, key=${key}):`, error)
    return null
  }
}

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
 * Create a component instance only (no append, no selection, no viewport change).
 * Caller is responsible for appending the returned node to the desired parent.
 * Used by Design Workshop when placing Nuxt DS instances inside screen frames.
 * When kind is provided, uses the correct Figma import API (component vs component_set).
 *
 * @param key - Figma component key
 * @param variantProperties - Optional variant properties (for component sets); axis names must match Figma (e.g. Unicode symbols)
 * @param kind - Optional: when provided, uses importByKeyAndKind so component_set keys use importComponentSetByKeyAsync
 * @returns Instance node or null if import/creation fails
 */
export async function createInstanceOnly(
  key: string,
  variantProperties?: Record<string, string>,
  kind?: ComponentKind
): Promise<InstanceNode | null> {
  const component =
    kind !== undefined ? await importByKeyAndKind(key, kind) : await importComponentByKey(key)
  if (!component) {
    return null
  }

  try {
    let instance: InstanceNode
    if (component.type === 'COMPONENT') {
      instance = (component as ComponentNode).createInstance()
    } else {
      const componentSet = component as ComponentSetNode
      let variantComponent: ComponentNode = componentSet.defaultVariant
      if (variantProperties && Object.keys(variantProperties).length > 0) {
        const matchingVariant = componentSet.children.find(child => {
          if (child.type !== 'COMPONENT') return false
          const childVariantProps = child.variantProperties || {}
          return Object.entries(variantProperties).every(([k, value]) => childVariantProps[k] === value)
        })
        if (matchingVariant && matchingVariant.type === 'COMPONENT') {
          variantComponent = matchingVariant
        }
      }
      instance = variantComponent.createInstance()
      if (variantProperties && Object.keys(variantProperties).length > 0) {
        instance.setProperties(variantProperties)
      }
    }
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
