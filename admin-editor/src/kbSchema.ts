/**
 * Canonical Knowledge Base document schema (PR11a).
 * Used by ACE validation and scripts/convert-kb.ts. No runtime behavior change.
 */

import { z } from 'zod'

/** Single source of truth for id validation (kebab-case). Server and client must use this. */
export const KB_ID_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

export const doDontSchema = z
  .object({
    do: z.array(z.string()).default([]),
    dont: z.array(z.string()).default([])
  })
  .default({ do: [], dont: [] })

export const knowledgeBaseDocumentSchema = z
  .object({
    id: z.string().min(1).regex(KB_ID_REGEX, 'id must be kebab-case: [a-z0-9]+(?:-[a-z0-9]+)*'),
    title: z.string().default(''),
    source: z.string().optional().default(''),
    updatedAt: z.string().optional(),
    version: z.string().optional(),
    tags: z.array(z.string()).optional().default([]),
    purpose: z.string().default(''),
    scope: z.string().default(''),
    definitions: z.array(z.string()).default([]),
    rulesConstraints: z.array(z.string()).default([]),
    doDont: doDontSchema,
    examples: z.array(z.string()).default([]),
    edgeCases: z.array(z.string()).default([])
  })
  .passthrough()

export type KnowledgeBaseDocument = z.infer<typeof knowledgeBaseDocumentSchema>

/** Default document with all required keys; id required, others empty. */
export function getDefaultKbDocument(id: string): KnowledgeBaseDocument {
  return {
    id,
    title: '',
    source: '',
    purpose: '',
    scope: '',
    definitions: [],
    rulesConstraints: [],
    doDont: { do: [], dont: [] },
    examples: [],
    edgeCases: [],
    tags: []
  }
}
