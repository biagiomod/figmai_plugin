/**
 * Content Table Duplicate Detection — pure functions.
 *
 * Compares candidate items against existing effective items to classify each
 * candidate as HIGH / MED / NONE confidence duplicate.
 *
 * Rules (deterministic, no randomness):
 *
 *   Normalization:
 *     1. Trim whitespace.
 *     2. Collapse internal whitespace runs to single space.
 *     3. Lowercase.
 *
 *   HIGH confidence (skip):
 *     - Normalized text matches an existing item AND length >= 12 characters.
 *
 *   MED confidence (flag):
 *     - Normalized text matches an existing item AND length < 12 characters.
 *       Short strings (single words, labels) are common legitimate repeats,
 *       so we flag rather than skip.
 *     - OR: normalized text matches another item in the same new-candidate batch
 *       (within-batch dedup).
 *
 *   NONE:
 *     - No match found.
 *
 * This module has no dependency on Smart Detector internals.
 */

import type { ContentItemV1 } from './types'

export type DuplicateConfidence = 'HIGH' | 'MED' | 'NONE'

export interface DuplicateResult {
  item: ContentItemV1
  confidence: DuplicateConfidence
  /** ID of the existing item this candidate duplicates (if any). */
  matchedExistingId?: string
}

/** Threshold: text at or above this length is HIGH confidence when exact-matched. */
const HIGH_CONFIDENCE_MIN_LENGTH = 12

/**
 * Normalize text for duplicate comparison.
 * Deterministic: trim, collapse whitespace, lowercase.
 */
export function normalizeForDedup(text: string): string {
  return text.trim().replace(/\s+/g, ' ').toLowerCase()
}

/**
 * Classify a batch of candidate items against an existing set.
 *
 * @param candidates  New items to evaluate.
 * @param existing    Currently effective items (excluding deleted).
 * @returns           One DuplicateResult per candidate, in same order.
 */
export function classifyCandidates(
  candidates: ContentItemV1[],
  existing: ContentItemV1[]
): DuplicateResult[] {
  // Build lookup from existing items: normalizedText → item id.
  const existingByText = new Map<string, string>()
  for (const item of existing) {
    const key = normalizeForDedup(item.content.value)
    if (key) existingByText.set(key, item.id)
  }

  // Track within-batch signatures to detect intra-batch duplicates.
  const batchSeen = new Map<string, number>() // normalizedText → index of first occurrence

  const results: DuplicateResult[] = []

  for (let i = 0; i < candidates.length; i++) {
    const candidate = candidates[i]
    const norm = normalizeForDedup(candidate.content.value)

    // Empty content is never a duplicate.
    if (!norm) {
      results.push({ item: candidate, confidence: 'NONE' })
      continue
    }

    const existingMatchId = existingByText.get(norm)

    if (existingMatchId !== undefined) {
      // Matches an existing effective item.
      const confidence: DuplicateConfidence = norm.length >= HIGH_CONFIDENCE_MIN_LENGTH ? 'HIGH' : 'MED'
      results.push({ item: candidate, confidence, matchedExistingId: existingMatchId })
    } else if (batchSeen.has(norm)) {
      // Matches an earlier item within the same candidate batch.
      results.push({ item: candidate, confidence: 'MED' })
    } else {
      results.push({ item: candidate, confidence: 'NONE' })
    }

    // Record this candidate's signature for within-batch dedup.
    if (!batchSeen.has(norm)) {
      batchSeen.set(norm, i)
    }
  }

  return results
}

/**
 * Filter and tag candidates based on duplicate classification.
 *
 * HIGH  → removed from output (skipped).
 * MED   → kept; item ID added to returned `flaggedIds` set.
 * NONE  → kept.
 *
 * @returns { items: items to add, flaggedIds: IDs marked as possible duplicates, skippedCount }
 */
export function filterByDuplicates(
  results: DuplicateResult[]
): { items: ContentItemV1[]; flaggedIds: Set<string>; skippedCount: number } {
  const items: ContentItemV1[] = []
  const flaggedIds = new Set<string>()
  let skippedCount = 0

  for (const r of results) {
    if (r.confidence === 'HIGH') {
      skippedCount++
      continue
    }
    if (r.confidence === 'MED') {
      flaggedIds.add(r.item.id)
    }
    items.push(r.item)
  }

  return { items, flaggedIds, skippedCount }
}
