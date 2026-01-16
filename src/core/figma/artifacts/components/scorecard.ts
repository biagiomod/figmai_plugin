/**
 * Scorecard Artifact Component
 * Renders Design Critique Assistant scorecards
 */

import type { ArtifactComponent, ArtifactRenderContext } from '../index'
import type { ScorecardData } from '../../renderScorecard'
import { buildScorecardContent } from '../../renderScorecard'

/**
 * Scorecard artifact component
 * Wraps existing buildScorecardContent logic
 */
export class ScorecardComponent implements ArtifactComponent {
  getDefaultWidth(): number {
    return 560  // Current scorecard width
  }
  
  async render(context: ArtifactRenderContext): Promise<void> {
    const { root, data } = context
    
    // Validate data type
    if (!data || typeof data !== 'object') {
      throw new Error('ScorecardComponent requires ScorecardData object')
    }
    
    const scorecardData = data as ScorecardData
    
    // Extract debug info if available
    const debug = (context.options as any).debug
    
    // Build scorecard content into the pre-created root frame
    await buildScorecardContent(root, scorecardData, debug)
  }
}

/**
 * Export singleton instance for registration
 */
export const scorecardComponent = new ScorecardComponent()
