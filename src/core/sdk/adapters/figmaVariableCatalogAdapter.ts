// src/core/sdk/adapters/figmaVariableCatalogAdapter.ts
/**
 * FigmaVariableCatalogAdapter — builds a plain-JSON VariableCatalogSnapshot
 * from the live Figma plugin variable API. Shape is byte-compatible with
 * @smart-detector/pipeline's auditDesignTokens(node, catalog) input.
 *
 * Host-owned. No toolkit imports. Consumers of this adapter can pass the
 * returned snapshot directly to the SD-Toolkit audit entrypoint.
 */

export type VariableResolvedType = 'COLOR' | 'FLOAT' | 'STRING' | 'BOOLEAN'

export interface VariableCollectionInfo {
  id: string
  name: string
  modes: Array<{ modeId: string; name: string }>
  defaultModeId: string
  remote?: boolean
  hiddenFromPublishing?: boolean
}

export interface VariableInfo {
  id: string
  name: string
  collectionId: string
  resolvedType: VariableResolvedType
  scopes: string[]
  valuesByMode: Record<string, VariableValue>
  codeSyntax?: Record<string, string>
  remote?: boolean
  deleted?: boolean
  description?: string
}

export type VariableValue =
  | { type: 'COLOR'; r: number; g: number; b: number; a: number }
  | { type: 'FLOAT'; value: number }
  | { type: 'STRING'; value: string }
  | { type: 'BOOLEAN'; value: boolean }
  | { type: 'ALIAS'; variableId: string }

export interface VariableCatalogSnapshot {
  collections: VariableCollectionInfo[]
  variables: VariableInfo[]
}

// Figma's variable APIs use loose types in @figma/plugin-typings. We type
// the subset we touch here so tests can inject a minimal stub without
// pulling in the full SceneNode hierarchy.
interface FigmaVariablesApi {
  getLocalVariableCollectionsAsync(): Promise<ReadonlyArray<FigmaVariableCollection>>
  getLocalVariablesAsync(): Promise<ReadonlyArray<FigmaVariable>>
}

interface FigmaVariableCollection {
  id: string
  name: string
  modes: ReadonlyArray<{ modeId: string; name: string }>
  defaultModeId: string
  remote?: boolean
  hiddenFromPublishing?: boolean
}

interface FigmaVariable {
  id: string
  name: string
  variableCollectionId: string
  resolvedType: VariableResolvedType
  scopes?: ReadonlyArray<string>
  valuesByMode: Record<string, unknown>
  codeSyntax?: Record<string, string>
  remote?: boolean
  description?: string
}

function normalizeValue(raw: unknown): VariableValue | null {
  if (raw === null || raw === undefined) return null
  if (typeof raw === 'number') return { type: 'FLOAT', value: raw }
  if (typeof raw === 'string') return { type: 'STRING', value: raw }
  if (typeof raw === 'boolean') return { type: 'BOOLEAN', value: raw }
  if (typeof raw === 'object') {
    const obj = raw as Record<string, unknown>
    // Figma alias shape: { type: 'VARIABLE_ALIAS', id: '...' }
    if (obj['type'] === 'VARIABLE_ALIAS' && typeof obj['id'] === 'string') {
      return { type: 'ALIAS', variableId: obj['id'] }
    }
    // Color shape: { r, g, b, a? }
    const r = obj['r']
    const g = obj['g']
    const b = obj['b']
    if (typeof r === 'number' && typeof g === 'number' && typeof b === 'number') {
      const a = typeof obj['a'] === 'number' ? obj['a'] : 1
      return { type: 'COLOR', r, g, b, a }
    }
  }
  return null
}

function toCollectionInfo(c: FigmaVariableCollection): VariableCollectionInfo {
  const info: VariableCollectionInfo = {
    id: c.id,
    name: c.name,
    modes: c.modes.map(m => ({ modeId: m.modeId, name: m.name })),
    defaultModeId: c.defaultModeId,
  }
  if (c.remote !== undefined) info.remote = c.remote
  if (c.hiddenFromPublishing !== undefined) info.hiddenFromPublishing = c.hiddenFromPublishing
  return info
}

function toVariableInfo(v: FigmaVariable): VariableInfo {
  const valuesByMode: Record<string, VariableValue> = {}
  for (const [modeId, raw] of Object.entries(v.valuesByMode)) {
    const normalized = normalizeValue(raw)
    if (normalized !== null) valuesByMode[modeId] = normalized
  }
  const info: VariableInfo = {
    id: v.id,
    name: v.name,
    collectionId: v.variableCollectionId,
    resolvedType: v.resolvedType,
    scopes: v.scopes ? [...v.scopes] : [],
    valuesByMode,
  }
  if (v.codeSyntax !== undefined) info.codeSyntax = { ...v.codeSyntax }
  if (v.remote !== undefined) info.remote = v.remote
  if (v.description !== undefined) info.description = v.description
  return info
}

/**
 * Build a VariableCatalogSnapshot from the live Figma variable API.
 * Safe to call from plugin code (UI thread has no access to figma.variables).
 *
 * @param api  Optional override for the Figma variables API — lets tests
 *             inject a stub without needing the plugin runtime.
 */
export async function buildVariableCatalogSnapshot(
  api: FigmaVariablesApi = (figma as unknown as { variables: FigmaVariablesApi }).variables,
): Promise<VariableCatalogSnapshot> {
  const [collections, variables] = await Promise.all([
    api.getLocalVariableCollectionsAsync(),
    api.getLocalVariablesAsync(),
  ])
  return {
    collections: collections.map(toCollectionInfo),
    variables: variables.map(toVariableInfo),
  }
}
