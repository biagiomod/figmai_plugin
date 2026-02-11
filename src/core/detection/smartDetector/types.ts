/**
 * Smart Detector types and taxonomies.
 * Aligned with docs/audits/smart-detector-execution-plan.md.
 */

export type ElementKind =
  | 'button'
  | 'icon_button'
  | 'link'
  | 'menu_item'
  | 'text_input'
  | 'textarea'
  | 'search_input'
  | 'select'
  | 'combobox'
  | 'checkbox'
  | 'radio'
  | 'switch'
  | 'slider'
  | 'date_picker'
  | 'file_upload'
  | 'stepper'
  | 'alert'
  | 'error_message'
  | 'toast'
  | 'tooltip'
  | 'progress'
  | 'heading'
  | 'body_text'
  | 'label'
  | 'helper_text'
  | 'list'
  | 'list_item'
  | 'table'
  | 'tabs'
  | 'accordion'
  | 'divider'
  | 'card'
  | 'chip_tag'
  | 'navbar'
  | 'breadcrumb'
  | 'pagination'
  | 'sidenav_drawer'
  | 'toolbar'
  | 'image'
  | 'icon'
  | 'avatar'
  | 'badge'
  | 'unknown_interactive'

export type ContentKind =
  | 'heading_copy'
  | 'body_copy'
  | 'label_copy'
  | 'cta_copy'
  | 'instructional_copy'
  | 'helper_copy'
  | 'empty_state_copy'
  | 'error_copy'
  | 'status_message_copy'
  | 'legal_disclaimer'
  | 'terms_reference'
  | 'privacy_reference'
  | 'consent_copy'
  | 'regulatory_disclosure'
  | 'variable_placeholder'
  | 'example_value'
  | 'decorative_copy'

export type PatternKind = 'form_field'

export type Confidence = 'high' | 'med' | 'low'

export interface DetectedElement {
  kind: ElementKind
  confidence: Confidence
  reasons: string[]
  labelGuess?: string
  nodeId: string
  bbox?: { x: number; y: number; width: number; height: number }
  componentName?: string
}

export interface DetectedContent {
  contentKind: ContentKind
  confidence: Confidence
  reasons: string[]
  text: string
  nodeId: string
  relatedElementId?: string
}

export interface DetectedPattern {
  kind: PatternKind
  memberNodeIds: string[]
}

export interface SmartDetectorStats {
  nodesScanned: number
  capped?: boolean
  elementsByKind: Record<string, number>
  contentByKind: Record<string, number>
  patternCount: number
}

export interface SmartDetectorOptions {
  maxNodes?: number
  /** When true, include bbox on elements (slightly more work). */
  includeBbox?: boolean
}

export interface SmartDetectorResult {
  elements: DetectedElement[]
  content: DetectedContent[]
  patterns: DetectedPattern[]
  stats: SmartDetectorStats
}
