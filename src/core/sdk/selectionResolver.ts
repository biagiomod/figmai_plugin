// src/core/sdk/selectionResolver.ts
/**
 * SDK SelectionResolver — combines resolveSelection + buildSelectionContext
 * into one service so SDK consumers have a single import point.
 */

import { resolveSelection } from '../figma/selectionResolver'
import type { ResolvedSelection, ResolverOptions } from '../figma/selectionResolver'
import { buildSelectionContext } from '../context/selectionContext'
import type { SelectionContext, BuildSelectionContextOptions } from '../context/selectionContext'

export type { ResolvedSelection, ResolverOptions, SelectionContext, BuildSelectionContextOptions }

export interface SelectionResolverService {
  resolve(selectionOrder: string[], options?: ResolverOptions): Promise<ResolvedSelection>
  buildContext(options: BuildSelectionContextOptions): Promise<SelectionContext>
}

export function createSelectionResolver(): SelectionResolverService {
  return {
    resolve(selectionOrder: string[], options?: ResolverOptions): Promise<ResolvedSelection> {
      return resolveSelection(selectionOrder, options)
    },
    buildContext(options: BuildSelectionContextOptions): Promise<SelectionContext> {
      return buildSelectionContext(options)
    },
  }
}
