/**
 * Deceptive Report Artifact Component
 * Renders Dark & Deceptive UX review reports
 */

import type { ArtifactComponent, ArtifactRenderContext } from '../index'
import type { DeceptiveReportData, DeceptiveFinding } from '../../../output/normalize/deceptiveReport'
import { loadFonts, createTextNode } from '../../../stage/primitives'
import { createOverallSeverityBadge, createDimensionTag, createFindingSeverityTag } from './designCritiqueReportBadges'
import type { FindingSeverity } from './designCritiqueReportBadges'

/** Set text to fill container width and hug height (no explicit width/height). */
function setTextFillAndHug(node: SceneNode): void {
  if (node.type === 'TEXT') {
    (node as TextNode).layoutSizingHorizontal = 'FILL'
    ;(node as TextNode).textAutoResize = 'HEIGHT'
  }
}

const SEVERITY_ORDER: Record<FindingSeverity, number> = { High: 0, Medium: 1, Low: 2 }

/**
 * Highest severity among findings that match this dimension (finding.category matches dimension name).
 * If no matching finding, returns Medium (fallback for failed dimension with no finding).
 */
function highestSeverityForDimension(dimensionName: string, findings: DeceptiveFinding[]): FindingSeverity {
  const dim = dimensionName.trim()
  let highest: FindingSeverity = 'Medium' // Fallback: failed dimension but no matching finding (edge case)
  let bestOrder = 2
  for (const f of findings) {
    if (f.category.trim() !== dim) continue
    const order = SEVERITY_ORDER[f.severity]
    if (order < bestOrder) {
      bestOrder = order
      highest = f.severity
    }
  }
  return highest
}

/**
 * Deceptive Report artifact component
 */
export class DeceptiveReportComponent implements ArtifactComponent {
  getDefaultWidth(): number {
    return 600  // Report width (slightly wider than scorecard for readability)
  }
  
  async render(context: ArtifactRenderContext): Promise<void> {
    const { root, data } = context
    
    // Validate data type
    if (!data || typeof data !== 'object') {
      throw new Error('DeceptiveReportComponent requires DeceptiveReportData object')
    }
    
    const reportData = data as DeceptiveReportData
    
    // Load fonts
    const fonts = await loadFonts()
    await figma.loadFontAsync({ family: 'Inter', style: 'Semi Bold' })
    await figma.loadFontAsync({ family: 'Inter', style: 'Regular' })
    
    // Configure root frame (content-driven height for post-render finalize)
    root.layoutMode = 'VERTICAL'
    root.primaryAxisSizingMode = 'AUTO'
    root.counterAxisSizingMode = 'FIXED'
    root.paddingTop = 24
    root.paddingRight = 24
    root.paddingBottom = 24
    root.paddingLeft = 24
    root.itemSpacing = 20
    root.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }]
    root.strokes = [{ type: 'SOLID', color: { r: 0.9, g: 0.9, b: 0.9 } }] // #E6E6E6
    root.strokeWeight = 1
    root.cornerRadius = 16
    
    // Title
    const title = await createTextNode('Dark & Deceptive UX Review', {
      fontSize: 20,
      fontName: fonts.bold,
      fills: [{ type: 'SOLID', color: { r: 0.2, g: 0.2, b: 0.2 } }]
    })
    root.appendChild(title)
    setTextFillAndHug(title)

    // Reviewed label
    const reviewedName = context.selectedNode?.name || '[No selection]'
    const reviewedLabel = await createTextNode(`Reviewed: ${reviewedName}`, {
      fontSize: 12,
      fontName: fonts.regular,
      fills: [{ type: 'SOLID', color: { r: 0.5, g: 0.5, b: 0.5 } }]
    })
    root.appendChild(reviewedLabel)
    setTextFillAndHug(reviewedLabel)
    
    // Overall Severity Badge (HUG width; matches design_crit_report_styling.json)
    if (reportData.overallSeverity !== 'None') {
      const severityBadge = await createOverallSeverityBadge(reportData.overallSeverity as 'High' | 'Medium' | 'Low', fonts)
      root.appendChild(severityBadge)
    }
    
    // Summary (no fixed height; content-driven. Text nodes get FILL horizontal.)
    if (reportData.summary) {
      const summaryFrame = figma.createFrame()
      summaryFrame.name = 'Summary'
      summaryFrame.layoutMode = 'VERTICAL'
      summaryFrame.primaryAxisSizingMode = 'AUTO'
      summaryFrame.counterAxisSizingMode = 'AUTO'
      summaryFrame.itemSpacing = 8

      const summaryLabel = await createTextNode('Summary', {
        fontSize: 14,
        fontName: fonts.bold,
        fills: [{ type: 'SOLID', color: { r: 0.2, g: 0.2, b: 0.2 } }]
      })
      summaryFrame.appendChild(summaryLabel)
      setTextFillAndHug(summaryLabel)

      const summaryText = await createTextNode(reportData.summary, {
        fontSize: 13,
        fontName: fonts.regular,
        fills: [{ type: 'SOLID', color: { r: 0.4, g: 0.4, b: 0.4 } }]
      })
      summaryFrame.appendChild(summaryText)
      setTextFillAndHug(summaryText)

      root.appendChild(summaryFrame)
      summaryFrame.layoutSizingHorizontal = 'FILL'
    }
    
    // Dimensions Checklist
    if (reportData.dimensionsChecklist && reportData.dimensionsChecklist.length > 0) {
      const checklistLabel = await createTextNode('Dimensions Checked', {
        fontSize: 16,
        fontName: fonts.bold,
        fills: [{ type: 'SOLID', color: { r: 0.2, g: 0.2, b: 0.2 } }]
      })
      root.appendChild(checklistLabel)
      setTextFillAndHug(checklistLabel)

      const checklistFrame = figma.createFrame()
      checklistFrame.name = 'Dimensions Checklist'
      checklistFrame.layoutMode = 'VERTICAL'
      checklistFrame.primaryAxisSizingMode = 'AUTO'
      checklistFrame.counterAxisSizingMode = 'AUTO'
      checklistFrame.itemSpacing = 8
      checklistFrame.paddingTop = 12
      checklistFrame.paddingRight = 12
      checklistFrame.paddingBottom = 12
      checklistFrame.paddingLeft = 12
      checklistFrame.fills = [{ type: 'SOLID', color: { r: 0.98, g: 0.98, b: 0.98 } }]
      checklistFrame.strokes = [{ type: 'SOLID', color: { r: 0.9, g: 0.9, b: 0.9 } }]
      checklistFrame.strokeWeight = 1
      checklistFrame.cornerRadius = 8
      
      for (const check of reportData.dimensionsChecklist) {
        const severityForFail = check.passed
          ? undefined
          : highestSeverityForDimension(check.dimension, reportData.findings)
        const dimensionTag = await createDimensionTag(
          check.dimension,
          check.passed ? 'pass' : 'fail',
          fonts,
          severityForFail
        )
        checklistFrame.appendChild(dimensionTag)
      }
      
      root.appendChild(checklistFrame)
      checklistFrame.layoutSizingHorizontal = 'FILL'
    }

    // Findings (grouped by severity: High -> Medium -> Low)
    if (reportData.findings.length > 0) {
      const findingsLabel = await createTextNode(`Findings (${reportData.findings.length})`, {
        fontSize: 16,
        fontName: fonts.bold,
        fills: [{ type: 'SOLID', color: { r: 0.2, g: 0.2, b: 0.2 } }]
      })
      root.appendChild(findingsLabel)
      ;(findingsLabel as TextNode).layoutSizingHorizontal = 'FILL'
      ;(findingsLabel as TextNode).textAutoResize = 'HEIGHT'

      // Sort findings by severity (High -> Medium -> Low)
      const severityOrder = { High: 0, Medium: 1, Low: 2 }
      const sortedFindings = [...reportData.findings].sort((a, b) => 
        severityOrder[a.severity] - severityOrder[b.severity]
      )
      
      for (const finding of sortedFindings) {
        const findingFrame = figma.createFrame()
        findingFrame.name = `Finding: ${finding.category}`
        findingFrame.layoutMode = 'VERTICAL'
        findingFrame.primaryAxisSizingMode = 'AUTO'
        findingFrame.counterAxisSizingMode = 'AUTO'
        findingFrame.paddingTop = 16
        findingFrame.paddingRight = 16
        findingFrame.paddingBottom = 16
        findingFrame.paddingLeft = 16
        findingFrame.itemSpacing = 12
        findingFrame.fills = [{ type: 'SOLID', color: { r: 0.98, g: 0.98, b: 0.98 } }]
        findingFrame.strokes = [{ type: 'SOLID', color: { r: 0.9, g: 0.9, b: 0.9 } }]
        findingFrame.strokeWeight = 1
        findingFrame.cornerRadius = 8
        
        // Category and Severity header
        const headerFrame = figma.createFrame()
        headerFrame.name = 'Header'
        headerFrame.layoutMode = 'HORIZONTAL'
        headerFrame.primaryAxisSizingMode = 'AUTO'
        headerFrame.counterAxisSizingMode = 'AUTO'
        headerFrame.itemSpacing = 8
        headerFrame.counterAxisAlignItems = 'CENTER'
        
        const categoryText = await createTextNode(finding.category, {
          fontSize: 14,
          fontName: fonts.bold,
          fills: [{ type: 'SOLID', color: { r: 0.2, g: 0.2, b: 0.2 } }]
        })
        headerFrame.appendChild(categoryText)
        setTextFillAndHug(categoryText)

        const findingSeverityTag = await createFindingSeverityTag(finding.severity, fonts)
        headerFrame.appendChild(findingSeverityTag)

        findingFrame.appendChild(headerFrame)

        // Description
        const descLabel = await createTextNode('What was found:', {
          fontSize: 12,
          fontName: fonts.bold,
          fills: [{ type: 'SOLID', color: { r: 0.4, g: 0.4, b: 0.4 } }]
        })
        findingFrame.appendChild(descLabel)
        setTextFillAndHug(descLabel)

        const descText = await createTextNode(finding.description, {
          fontSize: 12,
          fontName: fonts.regular,
          fills: [{ type: 'SOLID', color: { r: 0.3, g: 0.3, b: 0.3 } }]
        })
        findingFrame.appendChild(descText)
        setTextFillAndHug(descText)

        // Why deceptive
        const whyLabel = await createTextNode('Why it\'s deceptive:', {
          fontSize: 12,
          fontName: fonts.bold,
          fills: [{ type: 'SOLID', color: { r: 0.4, g: 0.4, b: 0.4 } }]
        })
        findingFrame.appendChild(whyLabel)
        setTextFillAndHug(whyLabel)

        const whyText = await createTextNode(finding.whyDeceptive, {
          fontSize: 12,
          fontName: fonts.regular,
          fills: [{ type: 'SOLID', color: { r: 0.3, g: 0.3, b: 0.3 } }]
        })
        findingFrame.appendChild(whyText)
        setTextFillAndHug(whyText)

        // User harm
        const harmLabel = await createTextNode('Potential user harm:', {
          fontSize: 12,
          fontName: fonts.bold,
          fills: [{ type: 'SOLID', color: { r: 0.4, g: 0.4, b: 0.4 } }]
        })
        findingFrame.appendChild(harmLabel)
        setTextFillAndHug(harmLabel)

        const harmText = await createTextNode(finding.userHarm, {
          fontSize: 12,
          fontName: fonts.regular,
          fills: [{ type: 'SOLID', color: { r: 0.3, g: 0.3, b: 0.3 } }]
        })
        findingFrame.appendChild(harmText)
        setTextFillAndHug(harmText)

        // Remediation
        const remLabel = await createTextNode('Suggested remediation:', {
          fontSize: 12,
          fontName: fonts.bold,
          fills: [{ type: 'SOLID', color: { r: 0.2, g: 0.6, b: 0.3 } }]
        })
        findingFrame.appendChild(remLabel)
        setTextFillAndHug(remLabel)

        const remText = await createTextNode(finding.remediation, {
          fontSize: 12,
          fontName: fonts.regular,
          fills: [{ type: 'SOLID', color: { r: 0.2, g: 0.5, b: 0.2 } }]
        })
        findingFrame.appendChild(remText)
        setTextFillAndHug(remText)

        // Evidence (optional)
        if (finding.evidence) {
          const evLabel = await createTextNode('Evidence:', {
            fontSize: 11,
            fontName: fonts.bold,
            fills: [{ type: 'SOLID', color: { r: 0.5, g: 0.5, b: 0.5 } }]
          })
          findingFrame.appendChild(evLabel)
          setTextFillAndHug(evLabel)

          const evText = await createTextNode(finding.evidence, {
            fontSize: 11,
            fontName: fonts.regular,
            fills: [{ type: 'SOLID', color: { r: 0.5, g: 0.5, b: 0.5 } }]
          })
          findingFrame.appendChild(evText)
          setTextFillAndHug(evText)
        }

        root.appendChild(findingFrame)
        findingFrame.layoutSizingHorizontal = 'FILL'
      }
    } else {
      const noFindingsText = await createTextNode('No deceptive patterns identified in this design.', {
        fontSize: 13,
        fontName: fonts.regular,
        fills: [{ type: 'SOLID', color: { r: 0.4, g: 0.4, b: 0.4 } }]
      })
      root.appendChild(noFindingsText)
      setTextFillAndHug(noFindingsText)
    }
  }
}

/**
 * Export singleton instance for registration
 */
export const deceptiveReportComponent = new DeceptiveReportComponent()
