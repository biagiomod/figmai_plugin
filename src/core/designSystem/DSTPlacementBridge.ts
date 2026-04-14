// src/core/designSystem/DSTPlacementBridge.ts
/**
 * DSTPlacementBridge — converts a canonical FigmaRenderNode tree into Figma
 * nodes via DS-T v0.1.0-alpha.0, then delegates to DefaultDSPlacementEngine.
 *
 * Two-step mapping:
 *   1. resolveDesignSystem(dsId, theme)            → RendererDesignSystem
 *   2. createFigmaInstructionTree(root, ds)         → FigmaLayerInstruction tree
 *   3. mapInstruction(fi)                           → DSLayerInstruction tree
 *   4. DefaultDSPlacementEngine.executeInstructions → actual Figma nodes
 *
 * FigmaRenderNode and FigmaLayerInstruction are defined locally here to avoid
 * importing from vendor/ds-t-renderer-figma/index.d.ts, which re-exports from
 * "@design-system-toolkit/schema" (a package name not resolvable outside a
 * pnpm workspace). The local types are structurally identical to the DS-T types
 * at v0.1.0-alpha.0.
 *
 * Not yet wired to any existing quick action — infrastructure for future
 * handlers that produce canonical kind trees.
 */

import type { DSLayerInstruction } from '../sdk/ports/DesignSystemPort'
import { DefaultDSPlacementEngine } from './DefaultDSPlacementEngine'
import { getDesignSystemConfig } from '../../custom/config'

// Local mirrors of DS-T v0.1.0-alpha.0 types (structurally identical).
// Update if DS-T adds/removes canonical kinds in a future version.
export type DSComponentKind =
  | 'page' | 'section' | 'text' | 'button' | 'card' | 'heading'
  | 'input' | 'select' | 'textarea' | 'checkbox' | 'radio' | 'switch'
  | 'badge' | 'label' | 'header-nav' | 'side-nav' | 'footer'
  | 'modal-dialog' | 'alert-banner' | 'testimonial' | 'faq'
  | 'feature-grid' | 'cta-section' | 'app-shell'

export interface FigmaRenderNode {
  id: string
  kind: DSComponentKind
  textContent?: string
  children?: FigmaRenderNode[]
}

interface FigmaLayerInstruction {
  id: string
  type: 'FRAME' | 'TEXT' | 'INSTANCE'
  name: string
  textContent?: string
  children?: FigmaLayerInstruction[]
}

// Cached module references
type SchemaMod = typeof import('@design-system-toolkit/schema')
let _schema: SchemaMod | null = null
async function getSchema(): Promise<SchemaMod> {
  if (!_schema) _schema = await import('@design-system-toolkit/schema')
  return _schema
}

type RendererMod = typeof import('@design-system-toolkit/renderer-figma')
let _renderer: RendererMod | null = null
async function getRenderer(): Promise<RendererMod> {
  if (!_renderer) _renderer = await import('@design-system-toolkit/renderer-figma')
  return _renderer
}

/** Map DS-T uppercase type → DSLayerInstruction lowercase type. */
function mapInstruction(src: FigmaLayerInstruction): DSLayerInstruction {
  return {
    id: src.id,
    type: src.type === 'FRAME' ? 'frame' : src.type === 'TEXT' ? 'text' : 'instance',
    name: src.name,
    textContent: src.textContent,
    children: src.children?.map(mapInstruction),
  }
}

export class DSTPlacementBridge {
  private readonly _placement = new DefaultDSPlacementEngine()

  /**
   * Convert a canonical FigmaRenderNode tree to Figma nodes using the active
   * design system. The DS id is read from getDesignSystemConfig().activeRegistries[0].
   *
   * @param root  - Canonical kind tree (FigmaRenderNode)
   * @param theme - Theme override (defaults to 'default-light')
   * @throws if no active design system is configured
   * @throws if the active DS id is not recognised by DS-T resolveDesignSystem
   */
  async executeFigmaRenderTree(root: FigmaRenderNode, theme = 'default-light'): Promise<void> {
    const dsId = getDesignSystemConfig().activeRegistries[0]
    if (!dsId) throw new Error('DSTPlacementBridge: no active design system in config')
    const { resolveDesignSystem } = await getSchema()
    const { createFigmaInstructionTree } = await getRenderer()
    const ds = resolveDesignSystem(dsId, theme)
    // Cast via unknown: local FigmaRenderNode is structurally identical to DS-T's.
    const figmaInstr = createFigmaInstructionTree(
      root as unknown as Parameters<typeof createFigmaInstructionTree>[0],
      ds
    ) as unknown as FigmaLayerInstruction
    const dsInstr = mapInstruction(figmaInstr)
    await this._placement.executeInstructions(dsInstr)
  }
}
