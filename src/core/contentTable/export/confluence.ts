/**
 * Confluence Export Pipeline
 * 
 * Canonical pipeline for exporting Content Tables to Confluence:
 * 1. Apply postProcessContentTable hook (if present)
 * 2. Normalize table (ensure required fields exist)
 * 3. Convert to HTML
 * 4. XHTML-encode
 * 5. Return XHTML string ready for Confluence API
 * 
 * This ensures Work can redact/normalize once, and everything downstream is consistent.
 */

import type { UniversalContentTableV1, TableFormatPreset } from '../types'
import type { WorkAdapter } from '../../work/adapter'
import { universalTableToHtml } from '../renderers'
import { encodeXhtmlDocument } from '../../encoding/xhtml'
import { normalizeContentTableV1 } from '../validate'

/**
 * Build XHTML string from Content Table for Confluence export
 * 
 * Pipeline:
 * 1. Apply postProcessContentTable hook (if provided) - catch errors, fall back to original
 * 2. Normalize table (ensure required fields exist with safe defaults)
 * 3. Convert table to HTML using universalTableToHtml
 * 4. XHTML-encode the HTML string
 * 5. Return XHTML string and the table that was used
 * 
 * @param args - Pipeline arguments
 * @param args.table - The Content Table to export
 * @param args.format - Table format preset (e.g., 'universal', 'dev-only')
 * @param args.postProcess - Optional post-processing hook from Work adapter
 * @param args.selectionContext - Optional selection context (extracted from table if not provided)
 * @returns Promise resolving to XHTML string and the table that was used
 */
export async function buildConfluenceXhtmlFromTable(args: {
  table: UniversalContentTableV1
  format: TableFormatPreset
  postProcess?: WorkAdapter['postProcessContentTable']
  selectionContext?: {
    pageId?: string
    pageName?: string
    rootNodeId?: string
  }
}): Promise<{ xhtml: string; tableUsed: UniversalContentTableV1 }> {
  const { table, format, postProcess, selectionContext } = args

  // Step 1: Apply post-processing hook if provided
  let tableUsed = table
  if (postProcess) {
    try {
      // Extract selection context from table if not provided
      const context = selectionContext || {
        pageId: table.source.pageId,
        pageName: table.source.pageName,
        rootNodeId: table.meta.rootNodeId
      }

      // Call post-process hook (may be async)
      const processedTable = await postProcess({
        table: tableUsed,
        selectionContext: context
      })

      // Use processed table
      tableUsed = processedTable

      console.log('[ConfluenceExport] Content table post-processed before Confluence export')
    } catch (error) {
      // Log error but continue with original table (never break the flow)
      console.error('[ConfluenceExport] Error in postProcessContentTable hook:', error)
      // Continue with original tableUsed
    }
  }

  // Step 2: Normalize table (ensure required fields exist)
  // This ensures schema invariants are maintained even if postProcess modified the table
  tableUsed = normalizeContentTableV1(tableUsed)

  // Step 3: Convert table to HTML
  const { html } = universalTableToHtml(tableUsed, format)

  // Step 4: XHTML-encode the HTML string
  const xhtml = encodeXhtmlDocument(html)

  // Step 5: Return XHTML and the table that was used
  return {
    xhtml,
    tableUsed
  }
}
