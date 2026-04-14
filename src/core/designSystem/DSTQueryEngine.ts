// src/core/designSystem/DSTQueryEngine.ts
/**
 * DSTQueryEngine — implements DSQueryPort using DS-T v0.1.0-alpha.0.
 *
 * Replaces DefaultDSQueryEngine for the DESIGN_SYSTEM_QUERY tool.
 * DefaultDSQueryEngine remains available for registries that are not
 * known to DS-T (custom JSON-based registries).
 *
 * Active DS resolution: reads the first entry of
 * getDesignSystemConfig().activeRegistries and passes it as the DS id
 * to DS-T searchComponents. DS-T returns [] for unknown ids — this is
 * correct and graceful (DefaultDSQueryEngine handles the JSON path).
 *
 * Import strategy: `import type` is erased at compile time (no runtime
 * ESM loading). The actual module is loaded via dynamic import() inside
 * searchComponents() — cached after first call. Same pattern as
 * SDToolkitSmartDetectionEngine.
 */

import type { ComponentMatch } from '@design-system-toolkit/schema'
import type { DSQueryPort, DSComponentMatch, DSContext } from '../sdk/ports/DesignSystemPort'
import { getDesignSystemConfig } from '../../custom/config'

// Cached module reference — loaded once on first searchComponents() call.
type SchemaMod = typeof import('@design-system-toolkit/schema')
let _schema: SchemaMod | null = null
async function getSchema(): Promise<SchemaMod> {
  if (!_schema) _schema = await import('@design-system-toolkit/schema')
  return _schema
}

function getActiveDsId(): string | null {
  return getDesignSystemConfig().activeRegistries[0] ?? null
}

export class DSTQueryEngine implements DSQueryPort {
  async searchComponents(query: string, _context?: string): Promise<DSComponentMatch[]> {
    const dsId = getActiveDsId()
    if (!dsId) return []
    const { searchComponents } = await getSchema()
    const results: ComponentMatch[] = await searchComponents(query, dsId)
    return results.map(r => ({
      canonicalKind: r.canonicalKind,
      componentName: r.componentName,
      description: r.description,
      registryId: r.designSystem,
    }))
  }

  getActiveDesignSystem(): DSContext | null {
    const dsId = getActiveDsId()
    if (!dsId) return null
    return { name: dsId, theme: 'default-light' }
  }
}
