/**
 * Universal Content Table Schema (v1)
 * Single Source of Truth for content inventory data
 */

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
  items: ContentItemV1[]
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
  }
  content: {
    type: "text"
    value: string
  }
  meta: {
    visible: boolean
    locked: boolean
  }
}

/**
 * Table format presets
 */
export type TableFormatPreset = 
  | "universal"
  | "content-model-1"
  | "content-model-2"
  | "content-model-3"
  | "content-model-4"
  | "content-model-5"
  | "ada-only"
  | "dev-only"

