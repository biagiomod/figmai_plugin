/**
 * Custom Knowledge Base Merger
 * 
 * Merges public knowledge bases with custom knowledge bases based on
 * policies defined in custom config (append or override).
 */

import { customKnowledgeByAssistant } from './generated/customKnowledge'
import { customConfig } from './generated/customConfig'

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
