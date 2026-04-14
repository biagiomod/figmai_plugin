// src/core/designSystem/DSTPromptEnrichmentEngine.ts
/**
 * DSTPromptEnrichmentEngine — implements DSPromptEnrichmentPort using DS-T v0.1.0-alpha.0.
 *
 * getKnowledgeSegment() is synchronous (port contract). DS-T's
 * getPromptEnrichmentSegment() is also synchronous. The schema module is
 * loaded async on first use; until it resolves, getKnowledgeSegment() returns
 * undefined (graceful degradation).
 *
 * Pre-warming: the module load is kicked off at construction time (fire-and-forget)
 * so that by the time the first real call arrives, the module is usually ready.
 *
 * Wiring note: the static ASSISTANTS map in src/assistants/index.ts evaluates
 * synchronously at module load time — wiring DSTPromptEnrichmentEngine there
 * requires an async refactor of the instruction assembly path (deferred). This
 * engine is available for async call sites (e.g. future instruction assembly
 * refactor, test utilities).
 */

import type { DSPromptEnrichmentPort } from '../sdk/ports/DesignSystemPort'
import { getDesignSystemConfig } from '../../custom/config'

// Cached module reference — loaded on first call.
type SchemaMod = typeof import('@design-system-toolkit/schema')
let _schema: SchemaMod | null = null
async function getSchema(): Promise<SchemaMod> {
  if (!_schema) _schema = await import('@design-system-toolkit/schema')
  return _schema
}

function getActiveDsId(): string | null {
  return getDesignSystemConfig().activeRegistries[0] ?? null
}

export class DSTPromptEnrichmentEngine implements DSPromptEnrichmentPort {
  constructor() {
    // Pre-warm: kick off the async module load so it's ready before first call.
    void getSchema()
  }

  getKnowledgeSegment(_assistantId: string): string | undefined {
    if (!_schema) return undefined          // module not yet loaded — graceful degradation
    const dsId = getActiveDsId()
    if (!dsId) return undefined
    return _schema.getPromptEnrichmentSegment(dsId) // sync call once module is loaded
  }

  /**
   * Async alternative for call sites that can await.
   * Returns the knowledge segment once the module is ready, regardless of
   * whether getKnowledgeSegment() would have returned undefined due to timing.
   */
  async getKnowledgeSegmentAsync(_assistantId: string): Promise<string | undefined> {
    const dsId = getActiveDsId()
    if (!dsId) return undefined
    const { getPromptEnrichmentSegment } = await getSchema()
    return getPromptEnrichmentSegment(dsId)
  }
}
