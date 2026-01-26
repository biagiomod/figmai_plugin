/**
 * Custom Knowledge Base Merger
 * 
 * Merges public knowledge bases with custom knowledge bases based on
 * policies defined in custom config (append or override).
 * Also appends design system component registry index when enabled.
 */

import { customKnowledgeByAssistant } from './generated/customKnowledge'
import { customConfig } from './generated/customConfig'
import { loadDesignSystemRegistries } from '../core/designSystem/registryLoader'
import { buildComponentIndex } from '../core/designSystem/searchIndex'

/**
 * Merge custom knowledge base with public knowledge base for an assistant
 * 
 * @param assistantId - The assistant ID (e.g., 'general', 'design_critique')
 * @param publicContent - The public knowledge base content
 * @returns Merged knowledge base content
 */
export function mergeKnowledgeBase(
  assistantId: string,
  publicContent: string
): string {
  // Only merge if this assistant is explicitly configured in knowledgeBases
  const assistantPolicy = customConfig?.knowledgeBases?.[assistantId]
  if (!assistantPolicy) {
    return publicContent
  }

  const customContent = customKnowledgeByAssistant[assistantId]
  
  // No custom knowledge file found for this assistant
  if (!customContent) {
    return publicContent
  }

  const policy = assistantPolicy.policy || 'append'

  if (policy === 'override') {
    // Replace public content with custom content
    return customContent
  } else {
    // Append custom content to public content
    return `${publicContent}\n\n---\n\n${customContent}`
  }
}

/**
 * Append design system component registry index to knowledge base
 * 
 * Only appends if DS registry is enabled and has active registries.
 * The index is compact and optimized for token efficiency.
 * 
 * @param baseContent - The knowledge base content (after custom merge)
 * @returns Knowledge base content with DS index appended (if applicable)
 */
export function appendDesignSystemKnowledge(baseContent: string): string {
  // Check if DS registry is enabled
  const dsConfig = customConfig?.designSystems
  if (!dsConfig || dsConfig.enabled !== true) {
    return baseContent
  }
  
  // Load active registries
  try {
    const registries = loadDesignSystemRegistries()
    if (registries.length === 0) {
      return baseContent
    }
    
    // Build compact index
    const index = buildComponentIndex(registries)
    if (!index) {
      return baseContent
    }
    
    // Append to knowledge base
    return `${baseContent}\n\n---\n\n${index}`
  } catch (error) {
    // If strict mode fails, registries won't load and we return base content
    // Error is already logged by registryLoader
    console.warn('[Knowledge] Failed to append design system knowledge:', error)
    return baseContent
  }
}
