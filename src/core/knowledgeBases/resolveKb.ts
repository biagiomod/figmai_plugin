/**
 * Resolve knowledge base refs to documents at runtime (PR11c1).
 * SSOT: generated KB_DOCS only; no file reads.
 */

import { KB_DOCS } from '../../knowledge-bases/knowledgeBases.generated'
import type { KnowledgeBaseDocument } from './types'

declare const __DEV__: boolean | undefined

/**
 * Resolve refs to KB documents in stable order. Missing ids are skipped with a dev warning.
 */
export function resolveKnowledgeBaseDocs(refs: string[]): KnowledgeBaseDocument[] {
  const out: KnowledgeBaseDocument[] = []
  const isDev = typeof __DEV__ !== 'undefined' && __DEV__
  for (const id of refs) {
    const doc = KB_DOCS[id]
    if (doc) {
      out.push(doc)
    } else if (isDev) {
      console.warn(`[KB] Unknown knowledge base id skipped: ${id}`)
    }
  }
  return out
}
