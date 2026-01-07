/**
 * Universal Content Table Schema (v1)
 * Single Source of Truth for content inventory data
 */

import type { DesignSystemDetectionResult } from '../work/adapter'

/**
 * Table-level metadata (rendered in meta row)
 */
export interface TableMetaV1 {
  /** Content Model: Universal v2 | ADA | Dev */
  contentModel: string
  /** Content Stage: Draft | In Review | Approved */
  contentStage: string
  /** ADA Status: ⏳ Pending | ✅ Passed | ❌ Issues */
  adaStatus: string
  /** Legal Status: ⏳ Pending | ✅ Passed | ❌ Issues */
  legalStatus: string
  /** Last Updated: ISO date string (auto-filled on generation) */
  lastUpdated: string
  /** Version: v1 (incrementable later) */
  version: string
  /** Root node ID */
  rootNodeId: string
  /** Root node name */
  rootNodeName: string
  /** Root node URL (browser-safe Figma URL) */
  rootNodeUrl: string
  /** Thumbnail image data URL (base64 PNG, ~100px width) */
  thumbnailDataUrl?: string
}

export type UniversalContentTableV1 = {
  type: "universal-content-table"
  version: 1
  generatedAtISO: string
  source: {
    pageId: string
    pageName: string
    selectionNodeId: string
    selectionName: string
  }
  /** Table-level metadata (for meta row) */
  meta: TableMetaV1
  items: ContentItemV1[]
  /** Design system detection results keyed by node ID (Work-only feature) */
  designSystemByNodeId?: Record<string, DesignSystemDetectionResult>
}

export type ContentItemV1 = {
  id: string // use nodeId if possible, else stable hash
  nodeId: string
  nodeUrl: string
  component: {
    kind: "component" | "componentSet" | "instance" | "custom"
    name: string
    key?: string
    variantProperties?: Record<string, string> // Variant properties for component instances
  }
  field: {
    label: string // default: nodeName
    path: string  // breadcrumb
    role?: string // Field/Role classification: CTA | Headline | Body | Helper | Placeholder | Tooltip | Error | etc.
  }
  content: {
    type: "text"
    value: string
  }
  /** Text layer name (for TEXT nodes only) */
  textLayerName?: string
  meta: {
    visible: boolean
    locked: boolean
  }
  /** Notes (user-editable, blank by default) */
  notes?: string
  /** Content Key (CMS) - reserved for CMS export, blank by default */
  contentKey?: string
  /** Jira / Ticket - blank by default */
  jiraTicket?: string
  /** ADA Notes / Flags - blank by default */
  adaNotes?: string
  /** Error Message - populated if Field/Role === "Error", otherwise blank */
  errorMessage?: string
  /** Design system detection result for this node (Work-only feature) */
  designSystem?: DesignSystemDetectionResult
}

/**
 * Table format presets
 */
export type TableFormatPreset = 
  | "universal"
  | "content-only"
  | "content-model-1"
  | "content-model-2"
  | "content-model-3"
  | "content-model-4"
  | "content-model-5"
  | "ada-only"
  | "dev-only"
