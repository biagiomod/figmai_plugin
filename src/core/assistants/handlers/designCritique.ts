/**
 * Design Critique Assistant Handler
 * Handles Design Critique assistant responses with JSON parsing, rendering, and fallback
 */

import type { AssistantHandler, HandlerContext, HandlerResult } from './base'
import type { NormalizedMessage } from '../../provider/provider'
import { parseScorecardJson } from '../../output/normalize'
import { parseDeceptiveReportJson } from '../../output/normalize/deceptiveReport'
import { createArtifact } from '../../figma/artifacts'
import { removeExistingArtifacts } from '../../figma/artifacts/placeArtifact'
import { placeCritiqueOnCanvas } from '../../figma/placeCritiqueFallback'
import { getTopLevelContainerNode } from '../../stage/anchor'
import { debug } from '../../debug/logger'

export class DesignCritiqueHandler implements AssistantHandler {
  canHandle(assistantId: string, actionId: string | undefined): boolean {
    return assistantId === 'design_critique' && 
           (actionId === 'give-critique' || actionId === 'deceptive-review')
  }

  prepareMessages(messages: NormalizedMessage[]): NormalizedMessage[] {
    // Determine which action is being handled by checking the last user message
    // (which contains the template message from the quick action)
    const lastUserMessage = [...messages].reverse().find(m => m.role === 'user')
    const isDeceptiveReview = lastUserMessage?.content.includes('Dark & Deceptive UX practices') || false
    
    if (isDeceptiveReview) {
      // Deceptive Review: Use Dark UX evaluation prompt
      const darkUxPrompt = this.getDarkUxEvaluationPrompt()
      
      // For Internal API compatibility: prepend instruction to user message
      // (Internal API filters out system messages, so we prepend to ensure it's included)
      const modifiedMessages = messages.map((msg, index) => {
        if (msg.role === 'user' && index === messages.length - 1) {
          // Last user message: prepend JSON enforcement
          return {
            ...msg,
            content: 'Return ONLY valid JSON. No prose. No markdown. No code fences. Output must be a single JSON object.\n\n' + msg.content
          }
        }
        return msg
      })
      
      return [
        {
          role: 'system',
          content: 'Return ONLY valid JSON. No prose. No markdown. No code fences. Output must be a single JSON object.'
        },
        ...modifiedMessages,
        {
          role: 'user',
          content: darkUxPrompt
        }
      ]
    } else {
      // Scorecard: Existing prompt (unchanged)
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
  }

  private async handleDeceptiveReview(
    context: HandlerContext,
    runId: string,
    dcDebug: ReturnType<typeof debug.scope>
  ): Promise<HandlerResult> {
    const { response, selectionOrder, selection, replaceStatusMessage } = context
    
    try {
      // Get selected node if available
      let selectedNode: SceneNode | undefined
      if (selection.hasSelection && selectionOrder.length > 0) {
        const node = await figma.getNodeByIdAsync(selectionOrder[0])
        if (node && node.type !== 'DOCUMENT' && node.type !== 'PAGE') {
          selectedNode = node as SceneNode
          
          // Placement verification logging
          if (debug.isEnabled('assistant:design_critique')) {
            const anchor = getTopLevelContainerNode(selectedNode)
            dcDebug.log('Placement verification', {
              runId,
              selectedNode: {
                name: selectedNode.name,
                id: selectedNode.id,
                type: selectedNode.type,
                parentType: selectedNode.parent?.type
              },
              placementTarget: {
                name: anchor.name,
                id: anchor.id,
                type: anchor.type,
                parentType: anchor.parent?.type,
                isTopLevel: anchor.parent?.type === 'PAGE'
              }
            })
          }
        } else if (debug.isEnabled('assistant:design_critique')) {
          dcDebug.log('Selected node invalid or missing', {
            runId,
            nodeType: node?.type,
            hasSelection: selection.hasSelection,
            selectionOrderLength: selectionOrder.length
          })
        }
      } else if (debug.isEnabled('assistant:design_critique')) {
        dcDebug.log('No selection for placement', {
          runId,
          hasSelection: selection.hasSelection,
          selectionOrderLength: selectionOrder.length
        })
      }
      
      dcDebug.log('RAW_RESPONSE_HEAD', { runId, head: response.slice(0, 120) })
      
      // Remove existing deceptive report artifacts
      removeExistingArtifacts('deceptive-report', 'v1')
      
      // Parse deceptive report JSON
      dcDebug.log('BEFORE parseDeceptiveReportJson', { runId })
      const result = parseDeceptiveReportJson(response, debug.isEnabled('assistant:design_critique'))
      
      if ('data' in result) {
        // Valid JSON report - render artifact
        dcDebug.log('parseDeceptiveReportJson RESULT', {
          runId,
          status: 'SUCCESS',
          overallSeverity: result.data.overallSeverity,
          findingsCount: result.data.findings.length
        })
        dcDebug.log('BEFORE createArtifact (deceptive-report)', { runId })
        
        try {
          await createArtifact({
            type: 'deceptive-report',
            assistant: 'design_critique',
            selectedNode,
            version: 'v1',
            replace: true
          }, result.data)
          
          dcDebug.log('AFTER createArtifact (deceptive-report)', { runId, status: 'SUCCESS' })
          figma.notify('Deceptive Review report placed')
          
          replaceStatusMessage('Deceptive Review report placed on stage')
          return { handled: true }
        } catch (renderError) {
          dcDebug.error('CATCH createArtifact (deceptive-report)', {
            runId,
            error: renderError instanceof Error ? renderError.message : String(renderError),
            stack: renderError instanceof Error ? renderError.stack : undefined
          })
          throw renderError
        }
      } else {
        // Invalid JSON - fallback to text critique
        dcDebug.log('parseDeceptiveReportJson RESULT', { runId, status: 'FAIL', error: result.error })
        dcDebug.log('BEFORE placeCritiqueOnCanvas fallback', { runId })
        
        await placeCritiqueOnCanvas(response, selectedNode, runId)
        dcDebug.log('AFTER placeCritiqueOnCanvas fallback', { runId, status: 'SUCCESS' })
        figma.notify('Deceptive Review parse failed — placed text fallback')
        
        replaceStatusMessage('Deceptive Review report placed on stage')
        return { handled: true }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      dcDebug.error('handleDeceptiveReview ERROR', { runId, error: errorMessage })
      
      // Cleanup: Remove any artifacts that might have been created
      removeExistingArtifacts('deceptive-report', 'v1')
      
      replaceStatusMessage(`Error: ${errorMessage}`, true)
      return { handled: true }
    }
  }

  private getDarkUxEvaluationPrompt(): string {
    return `IMPORTANT: Output must be a single JSON object with this exact schema. Return JSON only, no other text.

{
  "summary": "Overall assessment of deceptive patterns found (string)",
  "overallSeverity": "None" | "Low" | "Medium" | "High",
  "findings": [
    {
      "category": "One of: Forced Action, Nagging, Obstruction, Sneaking, Interface Interference, False Urgency/Scarcity, Confirmshaming, Trick Questions, Hidden Subscription/Roach Motel, Misleading Defaults",
      "severity": "Low" | "Medium" | "High",
      "description": "What was found (string)",
      "whyDeceptive": "Why this pattern is deceptive (string)",
      "userHarm": "Potential harm to users (string)",
      "remediation": "Ethical alternative or fix (string)",
      "evidence": "Specific UI elements/patterns observed (string, optional)"
    }
  ],
  "dimensionsChecklist": [
    {
      "dimension": "Forced Action",
      "passed": true
    },
    {
      "dimension": "Nagging",
      "passed": true
    },
    {
      "dimension": "Obstruction",
      "passed": false
    },
    {
      "dimension": "Sneaking",
      "passed": true
    },
    {
      "dimension": "Interface Interference",
      "passed": false
    },
    {
      "dimension": "False Urgency/Scarcity",
      "passed": true
    },
    {
      "dimension": "Confirmshaming",
      "passed": true
    },
    {
      "dimension": "Trick Questions",
      "passed": true
    },
    {
      "dimension": "Hidden Subscription/Roach Motel",
      "passed": true
    },
    {
      "dimension": "Misleading Defaults",
      "passed": false
    }
  ]
}

CRITICAL: The dimensionsChecklist array must contain exactly 10 items, one for each dimension listed below. For each dimension:
- Set "passed": true if NO deceptive patterns were found for that dimension
- Set "passed": false if deceptive patterns were found (these should also appear in the "findings" array with matching category)

Evaluate the design against these Dark & Deceptive UX categories:

1. **Forced Action**: Requiring users to do something unrelated to their goal (e.g., mandatory account creation, bundled consent)
2. **Nagging**: Repeated prompts interrupting user flow to influence behavior
3. **Obstruction**: Making tasks harder than necessary (e.g., hard-to-find cancel buttons, hidden opt-outs)
4. **Sneaking**: Hiding or disguising information (e.g., pre-checked boxes, hidden fees, visual misdirection)
5. **Interface Interference**: Manipulating visual hierarchy to bias decisions (e.g., dominant "Accept" vs muted "Decline")
6. **False Urgency/Scarcity**: Fake countdowns, pressure tactics, misleading availability
7. **Confirmshaming**: Guilt-inducing language for opting out
8. **Trick Questions**: Confusing or misleading wording that causes accidental consent
9. **Hidden Subscription/Roach Motel**: Easy to enter, hard to exit
10. **Misleading Defaults**: Defaults that benefit the business over the user without clear disclosure

Evaluation Principles:
- Judge intent + effect, not just visual style
- Consider financial harm, loss of autonomy, confusion, and regulatory risk
- If evidence is insufficient, explicitly state this in the summary
- Be specific about what you observe in the design
- For dimensionsChecklist: Evaluate ALL 10 dimensions and set passed=true for dimensions with no issues, passed=false for dimensions with issues found

Return ONLY the JSON object, no markdown fences, no other text.`
  }

  async handleResponse(context: HandlerContext): Promise<HandlerResult> {
    const { response, selectionOrder, selection, provider, sendAssistantMessage, replaceStatusMessage, requestId, actionId } = context
    const runId = `dc_${Date.now()}`
    const dcDebug = debug.scope('assistant:design_critique')
    
    dcDebug.log('START', { runId, assistantId: context.assistantId, quickActionId: context.actionId })
    
    // Handle deceptive-review action separately
    if (actionId === 'deceptive-review') {
      return await this.handleDeceptiveReview(context, runId, dcDebug)
    }
    
    // Existing scorecard flow (unchanged)
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
        dcDebug.log('BEFORE createArtifact (scorecard)', { runId })
        try {
          await createArtifact({
            type: 'scorecard',
            assistant: 'design_critique',
            selectedNode,
            version: 'v2',
            replace: true
          }, result.data)
          dcDebug.log('AFTER createArtifact (scorecard)', { runId, status: 'SUCCESS' })
          figma.notify('Scorecard placed (v2)')
          
          // Replace status message with completion message
          replaceStatusMessage('Scorecard placed on stage')
          return { handled: true }
        } catch (renderError) {
          dcDebug.error('CATCH createArtifact (scorecard)', { 
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
            dcDebug.log('BEFORE createArtifact (scorecard, from repair)', { runId })
            
            await createArtifact({
              type: 'scorecard',
              assistant: 'design_critique',
              selectedNode,
              version: 'v2',
              replace: true
            }, repairResult.data)
            dcDebug.log('AFTER createArtifact (scorecard, from repair)', { runId, status: 'SUCCESS' })
            figma.notify('Scorecard placed (v2, repaired)')
            
            // Replace status message with completion message
            replaceStatusMessage('Scorecard placed on stage')
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
        
        // Replace status message with completion message
        replaceStatusMessage('Scorecard placed on stage')
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
        
        // Replace status message with completion message
        replaceStatusMessage('Scorecard placed on stage')
        return { handled: true }
      } catch (fallbackError) {
        console.error(`[DC ${runId}] Fallback placement also failed:`, fallbackError)
        figma.notify(`Error: ${errorMessage}`)
        return { handled: true, message: `Error: ${errorMessage}` }
      }
    }
  }
}

