/**
 * AT-A Auto-Annotate
 * Detects interactive elements in selected screens using the Smart Detector
 * and writes placeholder ScreenID / ActionID annotations.
 *
 * autoAnnotateScreens() is side-effectful (Figma API + Smart Detector).
 * Pure helpers (isAnnotatableKind, hasScreenIdAnnotation, hasActionIdAnnotation,
 * buildSummaryMessage) are exported for testing.
 */

import {
  ensureAnnotationCategory,
  getCategoryMapShared,
  clearAnnotationCategoryCache,
  safeSetNativeAnnotations,
  type AnnotationEntry,
} from '../figma/annotations'
import type { ElementKind } from '../detection/smartDetector/types'
import { DefaultSmartDetectionEngine } from '../detection/smartDetector/DefaultSmartDetectionEngine'
import type { SmartDetectionPort } from '../sdk/ports/SmartDetectionPort'

const sdPort: SmartDetectionPort = new DefaultSmartDetectionEngine()
import { isNearMissScreenId, isNearMissActionId } from './nearMissDetector'
import type { AutoAnnotateResult } from '../types'

// ============================================================================
// Annotatable element kinds
// ============================================================================

/**
 * Element kinds from the Smart Detector that qualify for ActionID annotation.
 * Excludes structural containers (navbar, tabs, pagination, sidenav_drawer, breadcrumb)
 * because their child buttons/links are the real interaction targets.
 * Excludes content and decorative kinds (heading, image, icon, etc.).
 */
export const ANNOTATABLE_ELEMENT_KINDS = new Set<ElementKind>([
  // Direct interaction controls
  'button', 'icon_button', 'link', 'menu_item',
  // Form controls
  'checkbox', 'radio', 'switch', 'slider',
  'text_input', 'textarea', 'search_input',
  'select', 'combobox', 'date_picker', 'file_upload', 'stepper',
  // Expand/collapse
  'accordion',
  // Tappable content (cards, list rows, filter chips — high-value analytics events)
  'chip_tag', 'card', 'list_item',
  // Catch-all
  'unknown_interactive',
])

/** True if the given Smart Detector element kind qualifies for ActionID annotation. */
export function isAnnotatableKind(kind: ElementKind): boolean {
  return ANNOTATABLE_ELEMENT_KINDS.has(kind)
}

// ============================================================================
// Annotation skip-check helpers (category-based only)
// ============================================================================

/**
 * True if the node already has a ScreenID annotation (exact match or near-miss).
 * Check is based solely on resolved category label — not on annotation label text.
 */
export function hasScreenIdAnnotation(
  existingAnnotations: AnnotationEntry[],
  categoryMap: Map<string, string>
): boolean {
  return existingAnnotations.some(e => {
    if (!e.categoryId) return false
    const label = categoryMap.get(e.categoryId)
    return label != null && (label === 'ScreenID' || isNearMissScreenId(label))
  })
}

/**
 * True if the node already has an ActionID annotation (exact match or near-miss).
 * Check is based solely on resolved category label — not on annotation label text.
 */
export function hasActionIdAnnotation(
  existingAnnotations: AnnotationEntry[],
  categoryMap: Map<string, string>
): boolean {
  return existingAnnotations.some(e => {
    if (!e.categoryId) return false
    const label = categoryMap.get(e.categoryId)
    return label != null && (label === 'ActionID' || isNearMissActionId(label))
  })
}

// ============================================================================
// Summary message builder
// ============================================================================

/**
 * Build the user-facing status message from an AutoAnnotateResult.
 * If error is non-null, surfaces it directly — does not replace with a generic fallback.
 * Evaluated in order; first match wins.
 */
export function buildSummaryMessage(
  result: AutoAnnotateResult | null,
  error: string | null
): string {
  if (error != null) return error
  if (!result) return 'Could not add annotations.'

  const { screensProcessed, screenIdAdded, actionIdAdded, skippedExisting, writeFailed } = result

  if (screensProcessed === 0) return 'No screens found in selection.'

  // writeFailed-aware zero case — MUST come before the generic "no elements" branch below.
  // Without this, a run where every write failed (writeFailed>0) but nothing was detected would
  // incorrectly surface as "No interactive elements detected" rather than the write-failure message.
  if (writeFailed > 0 && actionIdAdded === 0 && skippedExisting === 0 && screenIdAdded === 0) {
    return `${writeFailed} annotation write(s) failed — check for locked layers.`
  }

  if (actionIdAdded === 0 && skippedExisting === 0 && screenIdAdded === 0) {
    return 'No interactive elements detected in the selection.'
  }

  if (actionIdAdded === 0 && skippedExisting === 0) {
    const base = `Added ScreenID to ${screenIdAdded} screen(s). No interactive elements detected.`
    return writeFailed > 0 ? `${base} (${writeFailed} write(s) failed.)` : base
  }

  if (actionIdAdded === 0) {
    const prefix = screenIdAdded > 0 ? `Added ScreenID to ${screenIdAdded} screen(s). ` : ''
    const base = `${prefix}No new ActionID annotations needed — all detected elements are already tagged.`
    return writeFailed > 0 ? `${base} (${writeFailed} write(s) failed.)` : base
  }

  let msg = `Added ScreenID to ${screenIdAdded} screen(s) and ActionID to ${actionIdAdded} element(s).`
  if (skippedExisting > 0) msg += ` (${skippedExisting} already tagged, skipped.)`
  if (writeFailed > 0) msg += ` (${writeFailed} could not be written — check for locked layers.)`
  return msg
}

// ============================================================================
// Internal helpers
// ============================================================================

// Note: similar to getAnnotations() in nearMissDetector.ts; this copy spreads defensively
// so callers can safely extend the result array without mutating the live Figma array.
// Extra Figma-internal properties on live annotation objects are carried through the spread
// and passed to safeSetNativeAnnotations, which normalizes the entries before writing.
function getRawAnnotations(node: SceneNode): AnnotationEntry[] {
  if (!('annotations' in node)) return []
  const raw = (node as SceneNode & { annotations?: AnnotationEntry[] }).annotations
  return Array.isArray(raw) ? [...raw] : []
}

// ============================================================================
// Main function
// ============================================================================

/**
 * Auto-annotate interactive elements across the given screen root nodes.
 *
 * For each root:
 *   - Adds a ScreenID annotation (value: "FrameName_REVIEW") if absent.
 *   - Runs the Smart Detector and writes ActionID ("ADD ID HERE") to each
 *     high/medium confidence interactive descendant that is not yet tagged.
 *
 * Non-destructive: existing annotations are always preserved (new entry appended).
 * Root frame is never written as an ActionID target.
 *
 * Throws if ScreenID or ActionID annotation categories cannot be created.
 * Per-node write failures are counted in result.writeFailed and are not fatal.
 */
export async function autoAnnotateScreens(
  rootNodes: SceneNode[]
): Promise<AutoAnnotateResult> {
  const result: AutoAnnotateResult = {
    screensProcessed: 0,
    screenIdAdded: 0,
    actionIdAdded: 0,
    skippedExisting: 0,
    writeFailed: 0,
  }

  const screenCatId = await ensureAnnotationCategory('ScreenID')
  const actionCatId = await ensureAnnotationCategory('ActionID')

  if (!screenCatId || !actionCatId) {
    throw new Error("Could not create 'ScreenID' or 'ActionID' annotation category")
  }

  // getCategoryMapShared() must be called AFTER ensureAnnotationCategory() — those calls
  // warm the shared cache to include the newly-created categories, so this read is guaranteed
  // to include ScreenID and ActionID even if they didn't exist before this run.
  const categoryMap = await getCategoryMapShared()

  for (const root of rootNodes) {
    result.screensProcessed++

    // ── ScreenID pass (root only) ──────────────────────────────────────────
    const rootAnnotations = getRawAnnotations(root)
    if (!hasScreenIdAnnotation(rootAnnotations, categoryMap)) {
      const merged = [...rootAnnotations, { label: `${root.name}_REVIEW`, categoryId: screenCatId }]
      if (safeSetNativeAnnotations(root, merged)) {
        result.screenIdAdded++
      } else {
        result.writeFailed++
      }
    }

    // ── ActionID pass (descendants only — root excluded) ───────────────────
    let sdElements: Array<{ nodeId: string; kind: ElementKind; confidence: 'high' | 'med' | 'low' }>
    try {
      const [sdResult] = await sdPort.detect([root])
      // Map port DetectedElement back to the minimal shape needed for annotation filtering.
      // root.children holds the flat list of detected elements (mapped from internal scanner).
      sdElements = sdResult.root.children
        .filter(el => el.candidateType !== null)
        .map(el => ({
          nodeId: el.id,
          kind: el.candidateType as ElementKind,
          confidence: el.certainty === 'exact' ? 'high' : el.certainty === 'inferred' ? 'med' : 'low',
        }))
    } catch (e) {
      // Re-wrap to add context; original error preserved in message since { cause } requires ES2022 lib.
      throw new Error(`Smart Detector failed: ${e instanceof Error ? e.message : String(e)}`)
    }

    // Dedupe by nodeId (first qualifying entry wins)
    const seenNodeIds = new Set<string>()
    const uniqueElements = sdElements.filter(e => {
      if (seenNodeIds.has(e.nodeId)) return false
      seenNodeIds.add(e.nodeId)
      return true
    })

    // Filter by confidence (high/med) and annotatable kind
    const candidates = uniqueElements.filter(
      e => (e.confidence === 'high' || e.confidence === 'med') && isAnnotatableKind(e.kind)
    )

    for (const element of candidates) {
      // Root is never an ActionID target
      if (element.nodeId === root.id) continue

      const node = await figma.getNodeByIdAsync(element.nodeId) as SceneNode | null
      if (!node) continue  // removed since scan

      const nodeAnnotations = getRawAnnotations(node)

      // Skip if already has ActionID (valid or near-miss) — category-based check only
      if (hasActionIdAnnotation(nodeAnnotations, categoryMap)) {
        result.skippedExisting++
        continue
      }

      const merged = [...nodeAnnotations, { label: 'ADD ID HERE', categoryId: actionCatId }]
      if (safeSetNativeAnnotations(node, merged)) {
        result.actionIdAdded++
      } else {
        result.writeFailed++
      }
    }
  }

  clearAnnotationCategoryCache()
  return result
}
