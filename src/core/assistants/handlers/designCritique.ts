/**
 * Design Critique Assistant Handler
 * Handles Design Critique assistant responses with JSON parsing, rendering, and fallback
 */

import type { AssistantHandler, HandlerContext, HandlerResult } from './base'
import type { NormalizedMessage } from '../../provider/provider'
import { parseScorecardJson } from '../../output/normalize'
import { renderScorecardV2 } from '../../figma/renderScorecard'
import { removeExistingArtifacts } from '../../figma/artifacts/placeArtifact'
import { placeCritiqueOnCanvas } from '../../figma/placeCritiqueFallback'
import { getTopLevelContainerNode } from '../../stage/anchor'
import { debug } from '../../debug/logger'

export class DesignCritiqueHandler implements AssistantHandler {
  canHandle(assistantId: string, actionId: string | undefined): boolean {
    return assistantId === 'design_critique' && actionId === 'give-critique'
  }

  prepareMessages(messages: NormalizedMessage[]): NormalizedMessage[] {
    // Inject JSON-only enforcement messages for Design Critique
    return [
      {
        role: 'system',
        content: 'Return ONLY valid JSON. No prose. No markdown. No code fences. Output must be a single JSON object.'
      },
      ...messages,
      {
        role: 'user',
        content: 'IMPORTANT: Output must be a single JSON object with keys: score (0-100), summary (string), wins (string[]), fixes (string[]), checklist (string[] optional), notes (string[] optional). Do not include any other keys. Return JSON only, no other text.'
      }
    ]
  }

  async handleResponse(context: HandlerContext): Promise<HandlerResult> {
    const { response, selectionOrder, selection, provider, sendAssistantMessage } = context
    const runId = `dc_${Date.now()}`
    const dcDebug = debug.scope('assistant:design_critique')
    
    dcDebug.log('START', { runId, assistantId: context.assistantId, quickActionId: context.actionId })
    
    try {
      // Get selected node if available
      let selectedNode: SceneNode | undefined
      if (selection.hasSelection && selectionOrder.length > 0) {
        const node = await figma.getNodeByIdAsync(selectionOrder[0])
        if (node && node.type !== 'DOCUMENT' && node.type !== 'PAGE') {
          selectedNode = node as SceneNode
          if (debug.isEnabled('assistant:design_critique')) {
            // DEBUG: Log selected node and computed anchor for verification
            const anchor = getTopLevelContainerNode(selectedNode)
            const isDirectChild = selectedNode.parent?.type === 'PAGE'
            dcDebug.log('selectedNode', {
              runId,
              name: selectedNode.name,
              id: selectedNode.id,
              type: selectedNode.type,
              parentType: selectedNode.parent?.type,
              isDirectChild
            })
            dcDebug.log('computed anchor', {
              runId,
              name: anchor.name,
              id: anchor.id,
              type: anchor.type,
              parentType: anchor.parent?.type,
              isTopLevel: anchor.parent?.type === 'PAGE'
            })
          }
        } else if (debug.isEnabled('assistant:design_critique')) {
          dcDebug.log('selectedNode', { runId, status: 'invalid_or_missing', nodeType: node?.type })
        }
      } else if (debug.isEnabled('assistant:design_critique')) {
        dcDebug.log('selectedNode', { runId, status: 'no_selection' })
      }
      
      dcDebug.log('RAW_RESPONSE_HEAD', { runId, head: response.slice(0, 120) })
      dcDebug.log('RAW_RESPONSE_LENGTH', { runId, length: response.length })
      
      // Remove existing v2 scorecard artifacts FIRST (version-scoped replacement)
      dcDebug.log('BEFORE removeExistingArtifacts', { runId })
      removeExistingArtifacts('scorecard', 'v2')
      removeExistingArtifacts('critique')
      dcDebug.log('AFTER removeExistingArtifacts', { runId })
      
      // Attempt to parse as JSON scorecard using improved parser
      dcDebug.log('BEFORE parseScorecardJson', { runId })
      const result = parseScorecardJson(response, debug.isEnabled('assistant:design_critique'))
      
      if ('data' in result) {
        // Valid JSON scorecard - render using v2 Auto-Layout renderer
        dcDebug.log('parseScorecardJson RESULT', { 
          runId, 
          status: 'SUCCESS', 
          score: result.data.score, 
          wins: result.data.wins.length, 
          fixes: result.data.fixes.length 
        })
        dcDebug.log('BEFORE renderScorecardV2', { runId })
        try {
          await renderScorecardV2(result.data, selectedNode, { runId })
          dcDebug.log('AFTER renderScorecardV2', { runId, status: 'SUCCESS' })
          figma.notify('Scorecard placed (v2)')
          
          // Notify UI that scorecard placement completed
          figma.ui.postMessage({
            pluginMessage: {
              type: 'SCORECARD_PLACED',
              success: true,
              message: 'Scorecard placed on stage'
            }
          })
          return { handled: true }
        } catch (renderError) {
          dcDebug.error('CATCH renderScorecardV2', { 
            runId,
            error: renderError instanceof Error ? renderError.message : String(renderError), 
            stack: renderError instanceof Error ? renderError.stack : undefined 
          })
          throw renderError
        }
      } else {
        // Invalid JSON - try repair step before fallback
        dcDebug.log('parseScorecardJson RESULT', { runId, status: 'FAIL', error: result.error })
        dcDebug.log('BEFORE repair attempt', { runId })
        
        try {
          // Repair: ask model to convert to JSON
          const repairPrompt = `Convert the following critique into ONLY valid JSON with the required schema. Return JSON only, no other text.

Required schema:
{
  "score": 0-100 (number),
  "summary": "string",
  "wins": ["string"],
  "fixes": ["string"],
  "checklist": ["string"] (optional),
  "notes": ["string"] (optional)
}

Critique text:
${response.substring(0, 2000)}`

          const repairMessages: NormalizedMessage[] = [
            {
              role: 'system',
              content: 'Return ONLY valid JSON. No prose. No markdown. No code fences. Output must be a single JSON object.'
            },
            {
              role: 'user',
              content: repairPrompt
            }
          ]
          
          const repairResponse = await provider.sendChat({
            messages: repairMessages,
            assistantId: context.assistantId,
            assistantName: 'Design Critique',
            quickActionId: context.actionId
          })
          
          dcDebug.log('repair response', { runId, length: repairResponse.length, head: repairResponse.substring(0, 120) })
          
          // Try parsing repaired response
          const repairResult = parseScorecardJson(repairResponse, debug.isEnabled('assistant:design_critique'))
          
          if ('data' in repairResult) {
            dcDebug.log('repair RESULT', { runId, status: 'SUCCESS', score: repairResult.data.score })
            dcDebug.log('BEFORE renderScorecardV2 (from repair)', { runId })
            
            await renderScorecardV2(repairResult.data, selectedNode, { runId })
            dcDebug.log('AFTER renderScorecardV2 (from repair)', { runId, status: 'SUCCESS' })
            figma.notify('Scorecard placed (v2, repaired)')
            
            // Notify UI that scorecard placement completed
            figma.ui.postMessage({
              pluginMessage: {
                type: 'SCORECARD_PLACED',
                success: true,
                message: 'Scorecard placed on stage'
              }
            })
            return { handled: true }
          } else {
            dcDebug.log('repair RESULT', { runId, status: 'FAIL', error: repairResult.error })
          }
        } catch (repairError) {
          dcDebug.error('repair CATCH', { 
            runId,
            error: repairError instanceof Error ? repairError.message : String(repairError) 
          })
        }
        
        // Fallback to rich-text critique if repair also fails
        dcDebug.log('BEFORE placeCritiqueOnCanvas fallback', { runId })
        await placeCritiqueOnCanvas(response, selectedNode, runId)
        dcDebug.log('AFTER placeCritiqueOnCanvas fallback', { runId, status: 'SUCCESS' })
        figma.notify('Scorecard parse failed — placed critique fallback')
        
        // Notify UI that critique placement completed (fallback)
        figma.ui.postMessage({
          pluginMessage: {
            type: 'SCORECARD_PLACED',
            success: true,
            message: 'Scorecard placed on stage'
          }
        })
        return { handled: true }
      }
    } catch (error) {
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Unknown error processing critique'
      
      dcDebug.error('CATCH handler', { 
        runId,
        error: errorMessage, 
        stack: error instanceof Error ? error.stack : undefined 
      })
      
      // Ensure cleanup on error
      try {
        removeExistingArtifacts('scorecard', 'v2')
        removeExistingArtifacts('critique')
      } catch (e) {
        dcDebug.error('Failed to cleanup artifacts', { runId, error: e })
      }
      
      // Try to place rich text as fallback
      try {
        let selectedNode: SceneNode | undefined
        if (selection.hasSelection && selectionOrder.length > 0) {
          const node = await figma.getNodeByIdAsync(selectionOrder[0])
          if (node && node.type !== 'DOCUMENT' && node.type !== 'PAGE') {
            selectedNode = node as SceneNode
          }
        }
        dcDebug.log('BEFORE placeCritiqueOnCanvas error fallback', { runId })
        await placeCritiqueOnCanvas(response, selectedNode, runId)
        dcDebug.log('AFTER placeCritiqueOnCanvas error fallback', { runId })
        figma.notify('Error processing critique — placed critique fallback')
        
        // Notify UI that critique placement completed (error fallback)
        figma.ui.postMessage({
          pluginMessage: {
            type: 'SCORECARD_PLACED',
            success: true,
            message: 'Scorecard placed on stage'
          }
        })
        return { handled: true }
      } catch (fallbackError) {
        console.error(`[DC ${runId}] Fallback placement also failed:`, fallbackError)
        figma.notify(`Error: ${errorMessage}`)
        return { handled: true, message: `Error: ${errorMessage}` }
      }
    }
  }
}

