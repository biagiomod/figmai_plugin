/**
 * Instruction assembly — maps optional assistant config fields into preamble/metadata.
 * Single choke-point for structured instructions (instructionBlocks, tone, schema, safety, KB refs).
 * Legacy path: when no instructionBlocks, caller provides legacyInstructionsSource (e.g. getShortInstructions).
 * PR11c1: optional kbDocs appended as a single "Knowledge Base" segment with truncation.
 */

import type { Assistant, InstructionBlock } from '../types'
import type { KnowledgeBaseDocument } from '../knowledgeBases/types'

/** Kind used only for optional labeling in assembled text; keep prefixes minimal. */
const KIND_PREFIX: Record<InstructionBlock['kind'], string> = {
  system: '',
  behavior: '## Behavior\n',
  rules: '## Rules\n',
  examples: '## Examples\n',
  format: '## Format\n',
  context: '## Context\n'
}

export interface InstructionAssemblyResult {
  /** Text to use as assistant context in preamble (after "context: "). */
  instructionPreambleText: string
  /** When true, recovery uses ALLOW_IMAGES_BUDGETS for this request. */
  allowImagesOverride?: boolean
  /** Output schema id for format enforcement (metadata; not enforced here). */
  schemaId?: string
  /** Knowledge base refs (metadata; no fetch in this PR). */
  kbRefs?: string[]
  /** Safety toggles from manifest (metadata; consumed elsewhere if needed). */
  safetyToggles?: Record<string, boolean>
}

export interface BuildAssistantInstructionSegmentsParams {
  /** Assistant (manifest entry shape at runtime; has optional instructionBlocks, etc.). */
  assistantEntry: Assistant
  /** Quick action id when invoked from a quick action (for future use). */
  actionId?: string
  /** Legacy instruction text when not using instructionBlocks (e.g. getShortInstructions(assistant)). */
  legacyInstructionsSource: string
  /** Resolved KB documents (from resolveKnowledgeBaseDocs); when present, a Knowledge Base segment is appended. */
  kbDocs?: KnowledgeBaseDocument[]
}

/** Budget for the entire KB segment (chars). */
const MAX_KB_TOTAL_CHARS = 12_000
/** Max chars per doc section (e.g. purpose, definitions). */
const MAX_SECTION_CHARS = 1_500
/** Max array items shown before "(+N more)". */
const MAX_ARRAY_ITEMS = 8

function cap(s: string, max: number): string {
  if (s.length <= max) return s
  return s.slice(0, max).trimEnd() + '…'
}

function formatArray(items: string[], maxItems: number): string {
  if (items.length === 0) return ''
  const show = items.slice(0, maxItems)
  const lines = show.map((item, i) => `${i + 1}. ${item.trim()}`).join('\n')
  const more = items.length - maxItems
  return more > 0 ? lines + `\n(+${more} more)` : lines
}

function formatOneKbDoc(doc: KnowledgeBaseDocument): string {
  const parts: string[] = []
  parts.push(`### ${doc.title}`)
  if (doc.purpose) parts.push('**Purpose:** ' + cap(doc.purpose, MAX_SECTION_CHARS))
  if (doc.scope) parts.push('**Scope:** ' + cap(doc.scope, MAX_SECTION_CHARS))
  if (doc.definitions?.length) parts.push('**Definitions:**\n' + formatArray(doc.definitions, MAX_ARRAY_ITEMS))
  if (doc.rulesConstraints?.length) parts.push('**Rules/Constraints:**\n' + formatArray(doc.rulesConstraints, MAX_ARRAY_ITEMS))
  const dd = doc.doDont
  if (dd?.do?.length) parts.push('**Do:**\n' + formatArray(dd.do, MAX_ARRAY_ITEMS))
  if (dd?.dont?.length) parts.push('**Don\'t:**\n' + formatArray(dd.dont, MAX_ARRAY_ITEMS))
  if (doc.examples?.length) parts.push('**Examples:**\n' + formatArray(doc.examples, MAX_ARRAY_ITEMS))
  if (doc.edgeCases?.length) parts.push('**Edge cases:**\n' + formatArray(doc.edgeCases, MAX_ARRAY_ITEMS))
  return parts.join('\n\n')
}

function buildKbSegment(kbDocs: KnowledgeBaseDocument[]): string {
  if (kbDocs.length === 0) return ''
  const body = kbDocs.map(formatOneKbDoc).join('\n\n---\n\n')
  const segment = '## Knowledge Base\n\n' + body
  return segment.length <= MAX_KB_TOTAL_CHARS ? segment : cap(segment, MAX_KB_TOTAL_CHARS)
}

/**
 * Build instruction preamble and metadata from assistant config.
 * - If instructionBlocks present and at least one enabled: build from blocks (+ optional tone/format).
 * - Else: use legacyInstructionsSource so behavior is unchanged for non-migrated assistants.
 */
export function buildAssistantInstructionSegments(
  params: BuildAssistantInstructionSegmentsParams
): InstructionAssemblyResult {
  const { assistantEntry, legacyInstructionsSource, kbDocs } = params
  const blocks = assistantEntry.instructionBlocks
  const hasEnabledBlocks =
    Array.isArray(blocks) && blocks.some((b) => b.enabled !== false)

  const segments: string[] = []

  if (hasEnabledBlocks && blocks!.length > 0) {
    for (const block of blocks!) {
      if (block.enabled === false) continue
      const prefix = KIND_PREFIX[block.kind] ?? ''
      const content = (block.content || '').trim()
      if (content) segments.push(prefix + content)
    }
    if (assistantEntry.toneStylePreset?.trim()) {
      segments.push(`## Tone\n${assistantEntry.toneStylePreset.trim()}`)
    }
    if (assistantEntry.outputSchemaId?.trim()) {
      segments.push(`## Output schema\n${assistantEntry.outputSchemaId.trim()}`)
    }
  }

  let instructionPreambleText =
    segments.length > 0 ? segments.join('\n\n') : legacyInstructionsSource

  if (Array.isArray(kbDocs) && kbDocs.length > 0) {
    const kbSegment = buildKbSegment(kbDocs)
    if (kbSegment) instructionPreambleText = instructionPreambleText + '\n\n' + kbSegment
  }

  const result: InstructionAssemblyResult = {
    instructionPreambleText
  }

  if (assistantEntry.safetyOverrides?.allowImages === true) {
    result.allowImagesOverride = true
  }
  if (assistantEntry.safetyOverrides?.safetyToggles != null && Object.keys(assistantEntry.safetyOverrides.safetyToggles).length > 0) {
    result.safetyToggles = { ...assistantEntry.safetyOverrides.safetyToggles }
  }
  if (assistantEntry.outputSchemaId?.trim()) {
    result.schemaId = assistantEntry.outputSchemaId.trim()
  }
  if (Array.isArray(assistantEntry.knowledgeBaseRefs) && assistantEntry.knowledgeBaseRefs.length > 0) {
    result.kbRefs = [...assistantEntry.knowledgeBaseRefs]
  }

  return result
}
