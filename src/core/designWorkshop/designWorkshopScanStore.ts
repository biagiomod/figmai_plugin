/**
 * Design Workshop Scan Store
 *
 * Runtime state module for the Design Workshop Assistant's session-scoped state.
 * This module is the single source of truth for DW-A runtime state on the main thread side.
 *
 * Holds two state containers:
 * 1. Scan context store — the ScannedDesignContext from a user's Scan action,
 *    preserved between Scan and subsequent Generate/Refine actions
 * 2. Design mode store — the current 'jazz' | 'wireframe' mode, mirroring ui.tsx dwDesignMode
 */

/**
 * Scanned Design Context
 * Captured snapshot of the canvas state from a Scan action
 */
export interface ScannedDesignContext {
  screens: Array<{
    name: string
    blockTypes: string[] // e.g. ['metricsGrid', 'chart', 'card', 'watchlist']
    textSnippets: string[] // visible text, truncated — not exhaustive
  }>
  designMode: 'jazz' | 'wireframe' // preserve mode intent across scan → refine
  rawSummary: string // e.g. "3 screens: Portfolio · Watchlist · Allocation"
}

// ============================================================================
// Scan Context Store
// ============================================================================

let scanCtx: ScannedDesignContext | null = null

export const setScanContext = (c: ScannedDesignContext | null): void => {
  scanCtx = c
}

export const getScanContext = (): ScannedDesignContext | null => scanCtx

// ============================================================================
// Design Mode Store
// ============================================================================

let dwDesignMode: 'jazz' | 'wireframe' = 'jazz'

export const setDwDesignMode = (mode: 'jazz' | 'wireframe'): void => {
  dwDesignMode = mode
}

export const getDwDesignMode = (): 'jazz' | 'wireframe' => dwDesignMode
