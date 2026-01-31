/**
 * Assistant Registry
 * Defines all available assistants with their knowledge bases and quick actions.
 * Assistant list and metadata come from custom/assistants.manifest.json (generated
 * into assistants.generated.ts). Modal visibility/order come from custom config.
 */

import type { Assistant, QuickAction } from '../core/types'
import { mergeKnowledgeBase, appendDesignSystemKnowledge } from '../custom/knowledge'
import { customConfig } from '../custom/generated/customConfig'
import { ASSISTANTS_MANIFEST } from './assistants.generated'

// Build ASSISTANTS from manifest: promptMarkdown = mergeKnowledgeBase + appendDesignSystemKnowledge
export const ASSISTANTS: Assistant[] = ASSISTANTS_MANIFEST.map((entry) => {
  const { promptTemplate, ...rest } = entry
  const promptMarkdown = appendDesignSystemKnowledge(
    mergeKnowledgeBase(entry.id, promptTemplate)
  )
  return { ...rest, promptMarkdown }
})

// Re-export types for convenience (canonical definitions are in core/types.ts)
export type { Assistant, AssistantTag, QuickAction } from '../core/types'

/**
 * Welcome message for chat (when assistant is selected or chat resets). Falls back to intro.
 */
export function getWelcomeMessage(a: Assistant): string {
  return a.welcomeMessage ?? a.intro
}

/**
 * Hover summary for Select Assistant modal. Falls back to intro.
 */
export function getHoverSummary(a: Assistant): string {
  return a.hoverSummary ?? a.intro
}

/**
 * Get assistant by ID
 */
export function getAssistant(id: string): Assistant | undefined {
  return ASSISTANTS.find((a) => a.id === id)
}

/**
 * List all assistants
 */
export function listAssistants(): Assistant[] {
  return ASSISTANTS
}

const DEFAULT_SIMPLE_MODE_IDS = ['general', 'content_table', 'design_critique', 'design_workshop']
const DEFAULT_CONTENT_MVP_ASSISTANT_ID = 'content_table'

/**
 * List assistants filtered by mode.
 * Simple mode: configurable list and order from custom config (ui.simpleModeIds).
 * Content-MVP mode: single assistant from custom config (ui.contentMvpAssistantId).
 * Advanced mode: all assistants.
 */
export function listAssistantsByMode(mode: 'simple' | 'advanced' | 'content-mvp'): Assistant[] {
  if (mode === 'content-mvp') {
    const id = customConfig?.ui?.contentMvpAssistantId ?? DEFAULT_CONTENT_MVP_ASSISTANT_ID
    return ASSISTANTS.filter((a) => a.id === id)
  }

  if (mode === 'simple') {
    const ids = customConfig?.ui?.simpleModeIds ?? DEFAULT_SIMPLE_MODE_IDS
    return ASSISTANTS.filter((a) => ids.includes(a.id)).sort((a, b) => {
      const indexA = ids.indexOf(a.id)
      const indexB = ids.indexOf(b.id)
      return indexA - indexB
    })
  }

  return ASSISTANTS
}

/**
 * Get default assistant.
 * Content-MVP: assistant from config (contentMvpAssistantId).
 * Simple: first in simpleModeIds or General.
 * Advanced: first assistant (General).
 */
export function getDefaultAssistant(mode?: 'simple' | 'advanced' | 'content-mvp'): Assistant {
  if (mode === 'content-mvp') {
    const id = customConfig?.ui?.contentMvpAssistantId ?? DEFAULT_CONTENT_MVP_ASSISTANT_ID
    const a = ASSISTANTS.find((x) => x.id === id)
    return a ?? ASSISTANTS[0]
  }
  if (mode === 'simple') {
    const ids = customConfig?.ui?.simpleModeIds ?? DEFAULT_SIMPLE_MODE_IDS
    const firstId = ids[0] ?? 'general'
    const a = ASSISTANTS.find((x) => x.id === firstId)
    return a ?? ASSISTANTS[0]
  }
  return ASSISTANTS[0]
}

/**
 * Get short instructions for assistant (for UI display)
 * Extracts first paragraph or first 200 characters of promptMarkdown
 */
export function getShortInstructions(assistant: Assistant): string {
  const prompt = assistant.promptMarkdown || ''

  const firstParagraph = prompt.split('\n\n')[0]?.trim()
  if (firstParagraph && firstParagraph.length > 0 && firstParagraph.length <= 300) {
    return firstParagraph
  }

  const truncated = prompt.substring(0, 200)
  const lastSpace = truncated.lastIndexOf(' ')
  if (lastSpace > 150) {
    return truncated.substring(0, lastSpace) + '...'
  }

  return truncated + (prompt.length > 200 ? '...' : '')
}
