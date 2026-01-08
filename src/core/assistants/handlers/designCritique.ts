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
    console.log(`[DC ${runId}] START`, { assistantId: context.assistantId, quickActionId: context.actionId })
    
    try {
      // Get selected node if available
      let selectedNode: SceneNode | undefined
      if (selection.hasSelection && selectionOrder.length > 0) {
        const node = figma.getNodeById(selectionOrder[0])
        if (node && node.type !== 'DOCUMENT' && node.type !== 'PAGE') {
          selectedNode = node as SceneNode
          // DEBUG: Log selected node and computed anchor for verification
          const anchor = getTopLevelContainerNode(selectedNode)
          const isDirectChild = selectedNode.parent?.type === 'PAGE'
          console.log(`[DC ${runId}] selectedNode`, {
            name: selectedNode.name,
            id: selectedNode.id,
            type: selectedNode.type,
            parentType: selectedNode.parent?.type,
            isDirectChild
          })
          console.log(`[DC ${runId}] computed anchor`, {
            name: anchor.name,
            id: anchor.id,
            type: anchor.type,
            parentType: anchor.parent?.type,
            isTopLevel: anchor.parent?.type === 'PAGE'
          })
        } else {
          console.log(`[DC ${runId}] selectedNode`, { status: 'invalid_or_missing', nodeType: node?.type })
        }
      } else {
        console.log(`[DC ${runId}] selectedNode`, { status: 'no_selection' })
      }
      
      console.log(`[DC ${runId}] RAW_RESPONSE_HEAD`, response.slice(0, 120))
      console.log(`[DC ${runId}] RAW_RESPONSE_LENGTH`, response.length)
      
      // Remove existing v2 scorecard artifacts FIRST (version-scoped replacement)
      console.log(`[DC ${runId}] BEFORE removeExistingArtifacts`)
      removeExistingArtifacts('scorecard', 'v2')
      removeExistingArtifacts('critique')
      console.log(`[DC ${runId}] AFTER removeExistingArtifacts`)
      
      // Attempt to parse as JSON scorecard using improved parser
      console.log(`[DC ${runId}] BEFORE parseScorecardJson`)
      const result = parseScorecardJson(response, true)
      
      if ('data' in result) {
        // Valid JSON scorecard - render using v2 Auto-Layout renderer
        console.log(`[DC ${runId}] parseScorecardJson RESULT`, { status: 'SUCCESS', score: result.data.score, wins: result.data.wins.length, fixes: result.data.fixes.length })
        
        console.log(`[DC ${runId}] BEFORE renderScorecardV2`)
        try {
          await renderScorecardV2(result.data, selectedNode, { runId })
          console.log(`[DC ${runId}] AFTER renderScorecardV2`, { status: 'SUCCESS' })
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
          console.log(`[DC ${runId}] CATCH renderScorecardV2`, { error: renderError instanceof Error ? renderError.message : String(renderError), stack: renderError instanceof Error ? renderError.stack : undefined })
          throw renderError
        }
      } else {
        // Invalid JSON - try repair step before fallback
        console.log(`[DC ${runId}] parseScorecardJson RESULT`, { status: 'FAIL', error: result.error })
        console.log(`[DC ${runId}] BEFORE repair attempt`)
        
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
          
          console.log(`[DC ${runId}] repair response length:`, repairResponse.length)
          console.log(`[DC ${runId}] repair response head:`, repairResponse.substring(0, 120))
          
          // Try parsing repaired response
          const repairResult = parseScorecardJson(repairResponse, true)
          
          if ('data' in repairResult) {
            console.log(`[DC ${runId}] repair RESULT`, { status: 'SUCCESS', score: repairResult.data.score })
            console.log(`[DC ${runId}] BEFORE renderScorecardV2 (from repair)`)
            
            await renderScorecardV2(repairResult.data, selectedNode, { runId })
            console.log(`[DC ${runId}] AFTER renderScorecardV2 (from repair)`, { status: 'SUCCESS' })
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
            console.log(`[DC ${runId}] repair RESULT`, { status: 'FAIL', error: repairResult.error })
          }
        } catch (repairError) {
          console.log(`[DC ${runId}] repair CATCH`, { error: repairError instanceof Error ? repairError.message : String(repairError) })
        }
        
        // Fallback to rich-text critique if repair also fails
        console.log(`[DC ${runId}] BEFORE placeCritiqueOnCanvas fallback`)
        await placeCritiqueOnCanvas(response, selectedNode, runId)
        console.log(`[DC ${runId}] AFTER placeCritiqueOnCanvas fallback`, { status: 'SUCCESS' })
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
      console.log(`[DC ${runId}] CATCH handler`, { error: error instanceof Error ? error.message : String(error), stack: error instanceof Error ? error.stack : undefined })
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Unknown error processing critique'
      
      // Ensure cleanup on error
      try {
        removeExistingArtifacts('scorecard', 'v2')
        removeExistingArtifacts('critique')
      } catch (e) {
        console.error(`[DC ${runId}] Failed to cleanup artifacts:`, e)
      }
      
      // Try to place rich text as fallback
      try {
        let selectedNode: SceneNode | undefined
        if (selection.hasSelection && selectionOrder.length > 0) {
          const node = figma.getNodeById(selectionOrder[0])
          if (node && node.type !== 'DOCUMENT' && node.type !== 'PAGE') {
            selectedNode = node as SceneNode
          }
        }
        console.log(`[DC ${runId}] BEFORE placeCritiqueOnCanvas error fallback`)
        await placeCritiqueOnCanvas(response, selectedNode, runId)
        console.log(`[DC ${runId}] AFTER placeCritiqueOnCanvas error fallback`)
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

