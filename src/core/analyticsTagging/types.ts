/**
 * Analytics Tagging Assistant — Data contracts
 * DraftRow, Row, Session, and versioned stored shape.
 * No screenshot bytes in stored data; only lightweight refs and metrics.
 */

export type ActionType = 'Action' | 'Interaction' | 'Screen Event' | 'Personalization Event'

/** Lightweight screenshot ref: crop metrics + hotspot ratios + node ids for on-demand capture/regeneration */
export interface ScreenshotRef {
  id: string
  /** Crop rect width/height (logical) */
  cropWidth: number
  cropHeight: number
  /** Target hotspot as ratio of crop rect (0–1) */
  hotspotRatioX: number
  hotspotRatioY: number
  containerNodeId: string
  targetNodeId: string
  rootNodeId: string
}

/** Persisted row (no screenshot bytes; screenshot regenerated on demand) */
export interface Row {
  id: string
  screenId: string
  /** Placeholder / "captured"; actual image from screenshotRef on demand */
  screenshotRef: ScreenshotRef
  description: string
  actionType: ActionType
  component: string
  actionId: string
  actionName?: string
  figmaElementLink: string
  population: string
  note: string
  /** For regeneration and Confluence context */
  meta?: {
    containerNodeId: string
    targetNodeId: string
    rootScreenNodeId: string
    capturedAtISO: string
  }
}

/** Draft row (step 1): same fields as Row except screenshotRef optional; meta has targetNodeId + rootScreenNodeId */
export interface DraftRow {
  id: string
  screenId: string
  screenshotRef?: ScreenshotRef
  description: string
  actionType: ActionType
  component: string
  actionId: string
  actionName?: string
  figmaElementLink: string
  population: string
  note: string
  meta?: {
    targetNodeId: string
    rootScreenNodeId: string
  }
  screenIdWarning?: boolean
  actionIdWarning?: boolean
}

export interface Session {
  id: string
  rows: Row[]
  /** Two-step workflow: draft row until screenshot is captured */
  draftRow?: DraftRow | null
  createdAtISO: string
  updatedAtISO: string
  source?: {
    pageId: string
    pageName: string
  }
}

/** Versioned shape stored in clientStorage */
export interface StoredSessionV1 {
  version: 1
  session: Session
}

export const CURRENT_STORAGE_VERSION = 1
export const STORAGE_KEY = 'figmai.analyticsTagging.session'
