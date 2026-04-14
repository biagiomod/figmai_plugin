// src/core/designSystem/DefaultDSQueryEngine.ts
import type { DSQueryPort, DSComponentMatch, DSContext } from '../sdk/ports/DesignSystemPort'
import { searchComponents as assistantApiSearch, listDesignSystemRegistries } from './assistantApi'

export class DefaultDSQueryEngine implements DSQueryPort {
  async searchComponents(query: string, _context?: string): Promise<DSComponentMatch[]> {
    const results = assistantApiSearch(query)
    return results.map(r => ({
      canonicalKind: r.component.aliases?.[0] ?? r.component.name.toLowerCase(),
      componentName: r.component.name,
      description: r.component.purpose,
      registryId: r.registryId
    }))
  }

  getActiveDesignSystem(): DSContext | null {
    const registries = listDesignSystemRegistries()
    if (registries.length === 0) {
      return null
    }
    const first = registries[0]
    return {
      name: first.name,
      theme: 'light'
    }
  }
}
