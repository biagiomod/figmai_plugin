/**
 * Knowledge Base types for runtime (PR11c1).
 * Mirrors canonical schema from admin-editor; no runtime file reads.
 */

export interface KnowledgeBaseDocument {
  id: string
  title: string
  source?: string
  updatedAt?: string
  version?: string
  tags?: string[]
  purpose: string
  scope: string
  definitions: string[]
  rulesConstraints: string[]
  doDont: { do: string[]; dont: string[] }
  examples: string[]
  edgeCases: string[]
}

export interface KbRegistryEntry {
  id: string
  title: string
  filePath: string
  tags?: string[]
  version?: string
  updatedAt?: string
}
