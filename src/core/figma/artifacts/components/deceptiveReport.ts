/**
 * Deceptive Report Artifact Component
 * Renders Dark & Deceptive UX review reports
 */

import type { ArtifactComponent, ArtifactRenderContext } from '../index'
import type { DeceptiveReportData } from '../../../output/normalize/deceptiveReport'
import { loadFonts, createTextNode } from '../../../stage/primitives'

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
    
    // Configure root frame
    root.layoutMode = 'VERTICAL'
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
    
    // Reviewed label
    const reviewedName = context.selectedNode?.name || '[No selection]'
    const reviewedLabel = await createTextNode(`Reviewed: ${reviewedName}`, {
      fontSize: 12,
      fontName: fonts.regular,
      fills: [{ type: 'SOLID', color: { r: 0.5, g: 0.5, b: 0.5 } }]
    })
    root.appendChild(reviewedLabel)
    
    // Overall Severity Badge
    if (reportData.overallSeverity !== 'None') {
      const severityFrame = figma.createFrame()
      severityFrame.name = 'Severity Badge'
      severityFrame.layoutMode = 'HORIZONTAL'
      severityFrame.primaryAxisSizingMode = 'AUTO'
      severityFrame.counterAxisSizingMode = 'AUTO'
      severityFrame.paddingTop = 6
      severityFrame.paddingRight = 12
      severityFrame.paddingBottom = 6
      severityFrame.paddingLeft = 12
      severityFrame.cornerRadius = 12
      severityFrame.itemSpacing = 6
      
      // Severity color
      const severityColors: Record<string, { r: number; g: number; b: number }> = {
        Low: { r: 0.96, g: 0.65, b: 0.14 },      // Orange
        Medium: { r: 0.96, g: 0.52, b: 0.26 },   // Orange-red
        High: { r: 0.92, g: 0.26, b: 0.21 }      // Red
      }
      const color = severityColors[reportData.overallSeverity] || severityColors.Medium
      
      severityFrame.fills = [{ type: 'SOLID', color: { r: color.r * 0.15, g: color.g * 0.15, b: color.b * 0.15 } }]
      severityFrame.strokes = [{ type: 'SOLID', color: color, opacity: 0.3 }]
      severityFrame.strokeWeight = 1
      
      const severityText = await createTextNode(`Severity: ${reportData.overallSeverity}`, {
        fontSize: 12,
        fontName: fonts.bold,
        fills: [{ type: 'SOLID', color }]
      })
      severityFrame.appendChild(severityText)
      root.appendChild(severityFrame)
    }
    
    // Summary
    if (reportData.summary) {
      const summaryFrame = figma.createFrame()
      summaryFrame.name = 'Summary'
      summaryFrame.layoutMode = 'VERTICAL'
      summaryFrame.primaryAxisSizingMode = 'AUTO'
      summaryFrame.counterAxisSizingMode = 'FIXED'
      summaryFrame.resize(root.width - 48, 100)
      summaryFrame.itemSpacing = 8
      
      const summaryLabel = await createTextNode('Summary', {
        fontSize: 14,
        fontName: fonts.bold,
        fills: [{ type: 'SOLID', color: { r: 0.2, g: 0.2, b: 0.2 } }]
      })
      summaryFrame.appendChild(summaryLabel)
      
      const summaryText = await createTextNode(reportData.summary, {
        fontSize: 13,
        fontName: fonts.regular,
        fills: [{ type: 'SOLID', color: { r: 0.4, g: 0.4, b: 0.4 } }]
      })
      summaryFrame.appendChild(summaryText)
      root.appendChild(summaryFrame)
    }
    
    // Dimensions Checklist
    if (reportData.dimensionsChecklist && reportData.dimensionsChecklist.length > 0) {
      const checklistLabel = await createTextNode('Dimensions Checked', {
        fontSize: 16,
        fontName: fonts.bold,
        fills: [{ type: 'SOLID', color: { r: 0.2, g: 0.2, b: 0.2 } }]
      })
      root.appendChild(checklistLabel)
      
      const checklistFrame = figma.createFrame()
      checklistFrame.name = 'Dimensions Checklist'
      checklistFrame.layoutMode = 'VERTICAL'
      checklistFrame.primaryAxisSizingMode = 'AUTO'
      checklistFrame.counterAxisSizingMode = 'FIXED'
      checklistFrame.resize(root.width - 48, 100)
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
        const itemFrame = figma.createFrame()
        itemFrame.name = `Dimension: ${check.dimension}`
        itemFrame.layoutMode = 'HORIZONTAL'
        itemFrame.primaryAxisSizingMode = 'AUTO'
        itemFrame.counterAxisSizingMode = 'AUTO'
        itemFrame.itemSpacing = 10
        itemFrame.counterAxisAlignItems = 'CENTER'
        
        // Pass/fail indicator (green ✓ or red ✗)
        const indicatorText = check.passed ? '✓' : '✗'
        const indicatorColor = check.passed 
          ? { r: 0.2, g: 0.6, b: 0.3 }  // Green
          : { r: 0.92, g: 0.26, b: 0.21 }  // Red
        
        const indicator = await createTextNode(indicatorText, {
          fontSize: 16,
          fontName: fonts.bold,
          fills: [{ type: 'SOLID', color: indicatorColor }]
        })
        itemFrame.appendChild(indicator)
        
        // Dimension name
        const dimensionText = await createTextNode(check.dimension, {
          fontSize: 13,
          fontName: fonts.regular,
          fills: [{ type: 'SOLID', color: { r: 0.3, g: 0.3, b: 0.3 } }]
        })
        itemFrame.appendChild(dimensionText)
        
        checklistFrame.appendChild(itemFrame)
      }
      
      root.appendChild(checklistFrame)
    }
    
    // Findings (grouped by severity: High -> Medium -> Low)
    if (reportData.findings.length > 0) {
      const findingsLabel = await createTextNode(`Findings (${reportData.findings.length})`, {
        fontSize: 16,
        fontName: fonts.bold,
        fills: [{ type: 'SOLID', color: { r: 0.2, g: 0.2, b: 0.2 } }]
      })
      root.appendChild(findingsLabel)
      
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
        findingFrame.counterAxisSizingMode = 'FIXED'
        findingFrame.resize(root.width - 48, 100)
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
        
        // Severity badge
        const findingSeverityFrame = figma.createFrame()
        findingSeverityFrame.name = 'Severity'
        findingSeverityFrame.layoutMode = 'HORIZONTAL'
        findingSeverityFrame.primaryAxisSizingMode = 'AUTO'
        findingSeverityFrame.counterAxisSizingMode = 'AUTO'
        findingSeverityFrame.paddingTop = 4
        findingSeverityFrame.paddingRight = 8
        findingSeverityFrame.paddingBottom = 4
        findingSeverityFrame.paddingLeft = 8
        findingSeverityFrame.cornerRadius = 6
        
        const severityColors: Record<string, { r: number; g: number; b: number }> = {
          Low: { r: 0.96, g: 0.65, b: 0.14 },
          Medium: { r: 0.96, g: 0.52, b: 0.26 },
          High: { r: 0.92, g: 0.26, b: 0.21 }
        }
        const color = severityColors[finding.severity]
        findingSeverityFrame.fills = [{ type: 'SOLID', color: { r: color.r * 0.15, g: color.g * 0.15, b: color.b * 0.15 } }]
        findingSeverityFrame.strokes = [{ type: 'SOLID', color: color, opacity: 0.3 }]
        findingSeverityFrame.strokeWeight = 1
        
        const severityText = await createTextNode(finding.severity, {
          fontSize: 11,
          fontName: fonts.bold,
          fills: [{ type: 'SOLID', color }]
        })
        findingSeverityFrame.appendChild(severityText)
        headerFrame.appendChild(findingSeverityFrame)
        
        findingFrame.appendChild(headerFrame)
        
        // Description
        const descLabel = await createTextNode('What was found:', {
          fontSize: 12,
          fontName: fonts.bold,
          fills: [{ type: 'SOLID', color: { r: 0.4, g: 0.4, b: 0.4 } }]
        })
        findingFrame.appendChild(descLabel)
        
        const descText = await createTextNode(finding.description, {
          fontSize: 12,
          fontName: fonts.regular,
          fills: [{ type: 'SOLID', color: { r: 0.3, g: 0.3, b: 0.3 } }]
        })
        findingFrame.appendChild(descText)
        
        // Why deceptive
        const whyLabel = await createTextNode('Why it\'s deceptive:', {
          fontSize: 12,
          fontName: fonts.bold,
          fills: [{ type: 'SOLID', color: { r: 0.4, g: 0.4, b: 0.4 } }]
        })
        findingFrame.appendChild(whyLabel)
        
        const whyText = await createTextNode(finding.whyDeceptive, {
          fontSize: 12,
          fontName: fonts.regular,
          fills: [{ type: 'SOLID', color: { r: 0.3, g: 0.3, b: 0.3 } }]
        })
        findingFrame.appendChild(whyText)
        
        // User harm
        const harmLabel = await createTextNode('Potential user harm:', {
          fontSize: 12,
          fontName: fonts.bold,
          fills: [{ type: 'SOLID', color: { r: 0.4, g: 0.4, b: 0.4 } }]
        })
        findingFrame.appendChild(harmLabel)
        
        const harmText = await createTextNode(finding.userHarm, {
          fontSize: 12,
          fontName: fonts.regular,
          fills: [{ type: 'SOLID', color: { r: 0.3, g: 0.3, b: 0.3 } }]
        })
        findingFrame.appendChild(harmText)
        
        // Remediation
        const remLabel = await createTextNode('Suggested remediation:', {
          fontSize: 12,
          fontName: fonts.bold,
          fills: [{ type: 'SOLID', color: { r: 0.2, g: 0.6, b: 0.3 } }]
        })
        findingFrame.appendChild(remLabel)
        
        const remText = await createTextNode(finding.remediation, {
          fontSize: 12,
          fontName: fonts.regular,
          fills: [{ type: 'SOLID', color: { r: 0.2, g: 0.5, b: 0.2 } }]
        })
        findingFrame.appendChild(remText)
        
        // Evidence (optional)
        if (finding.evidence) {
          const evLabel = await createTextNode('Evidence:', {
            fontSize: 11,
            fontName: fonts.bold,
            fills: [{ type: 'SOLID', color: { r: 0.5, g: 0.5, b: 0.5 } }]
          })
          findingFrame.appendChild(evLabel)
          
          const evText = await createTextNode(finding.evidence, {
            fontSize: 11,
            fontName: fonts.regular,
            fills: [{ type: 'SOLID', color: { r: 0.5, g: 0.5, b: 0.5 } }]
          })
          findingFrame.appendChild(evText)
        }
        
        root.appendChild(findingFrame)
      }
    } else {
      // No findings
      const noFindingsText = await createTextNode('No deceptive patterns identified in this design.', {
        fontSize: 13,
        fontName: fonts.regular,
        fills: [{ type: 'SOLID', color: { r: 0.4, g: 0.4, b: 0.4 } }]
      })
      root.appendChild(noFindingsText)
    }
  }
}

/**
 * Export singleton instance for registration
 */
export const deceptiveReportComponent = new DeceptiveReportComponent()
