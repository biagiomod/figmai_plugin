/**
 * FigmAI Assistant SDK
 * Public contract for Strike Team assistants.
 * Import from here — never from core internals.
 */

import type { AssistantHandler } from '../core/assistants/handlers/base'

// Handler contract
export type { AssistantHandler, HandlerContext, HandlerResult } from '../core/assistants/handlers/base'

// Message types needed by handlers
export type { NormalizedMessage } from '../core/provider/provider'
export type { Message } from '../core/types'

// Selection state passed to handlers via HandlerContext
export type { SelectionState } from '../core/types'

// Assistant module shape — what each index.ts must export
export interface AssistantModule {
  assistantId: string
  handler?: AssistantHandler
}

// Annotation types
export type { AnnotationEntry, ResolvedAnnotationEntry, VisibleAnnotationCardOptions } from '../core/figma/annotations'

// Annotation write primitives
export { ensureAnnotationCategory, safeSetNativeAnnotations, createVisibleAnnotationCard } from '../core/figma/annotations'

// Annotation read API
export { readAnnotationValue, readResolvedAnnotations, clearAnnotationCategoryCache } from '../core/figma/annotations'
