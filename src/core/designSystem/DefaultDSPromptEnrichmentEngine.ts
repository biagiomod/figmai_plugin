// src/core/designSystem/DefaultDSPromptEnrichmentEngine.ts
import type { DSPromptEnrichmentPort } from '../sdk/ports/DesignSystemPort'
import { appendDesignSystemKnowledge } from '../../custom/knowledge'

export class DefaultDSPromptEnrichmentEngine implements DSPromptEnrichmentPort {
  getKnowledgeSegment(_assistantId: string): string | undefined {
    const enriched = appendDesignSystemKnowledge('')
    return enriched.trim().length > 0 ? enriched : undefined
  }
}
