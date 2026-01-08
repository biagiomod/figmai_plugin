/**
 * Design Workshop Assistant Handler
 * Handles Design Workshop assistant responses with JSON parsing, validation, repair, and rendering
 */

import type { AssistantHandler, HandlerContext, HandlerResult } from './base'
import type { NormalizedMessage } from '../../provider/provider'
import type { DesignSpecV1 } from '../../designWorkshop/types'
import { validateDesignSpecV1, normalizeDesignSpecV1 } from '../../designWorkshop/validate'
import { renderDesignSpecToSection } from '../../designWorkshop/renderer'
import { extractJsonFromResponse } from '../../output/normalize'

export class DesignWorkshopHandler implements AssistantHandler {
  canHandle(assistantId: string, actionId: string | undefined): boolean {
    return assistantId === 'design_workshop' && (actionId === 'generate-screens' || actionId === undefined)
  }

  prepareMessages(messages: NormalizedMessage[]): NormalizedMessage[] {
    // Extract the latest user message (the actual request)
    const userMessages = messages.filter(m => m.role === 'user')
    const latestUserRequest = userMessages.length > 0 
      ? userMessages[userMessages.length - 1].content 
      : 'Generate design screens'
    
    // Inject JSON-only enforcement messages for Design Workshop
    return [
      {
        role: 'system',
        content: 'You are a Figma screen generator. Generate screens based on user requests. Return ONLY valid JSON. No prose. No markdown. No code fences. Output must be a single JSON object matching the DesignSpecV1 schema.'
      },
      ...messages,
      {
        role: 'user',
        content: `Based on the user's request: "${latestUserRequest}"

Generate 1-5 screens that match the user's specifications. Follow their requirements for:
- App type and purpose (e.g., Mindfulness app, Fitness app, FinTech app)
- Colors and styling (e.g., "use the color pink", "blue colors")
- Fidelity level (wireframe, medium, hi, creative)
- Screen types (e.g., onboarding, home, profile, etc.)
- Any other specific requirements mentioned

Output must be a single JSON object matching the DesignSpecV1 schema exactly:

{
  "type": "designScreens",
  "version": 1,
  "meta": { "title": "string" },
  "canvas": {
    "device": {
      "kind": "mobile" | "tablet" | "desktop",
      "width": number,
      "height": number
    }
  },
  "render": {
    "intent": {
      "fidelity": "wireframe" | "medium" | "hi" | "creative",
      "styleKeywords": ["string"],
      "brandTone": "string"
    }
  },
  "screens": [
    {
      "name": "string",
      "layout": {
        "direction": "vertical" | "horizontal",
        "padding": number | { "top": number, "right": number, "bottom": number, "left": number },
        "gap": number
      },
      "blocks": [
        { "type": "heading", "text": "string", "level": 1 | 2 | 3 },
        { "type": "bodyText", "text": "string" },
        { "type": "button", "text": "string", "variant": "primary" | "secondary" | "tertiary" },
        { "type": "input", "label": "string", "placeholder": "string", "inputType": "text" | "email" | "password" },
        { "type": "card", "title": "string", "content": "string" },
        { "type": "spacer", "height": number },
        { "type": "image", "src": "string", "alt": "string", "width": number, "height": number }
      ]
    }
  ]
}

CRITICAL: 
- Generate 1-5 screens only. If more are requested, generate exactly 5 and include meta.truncationNotice.
- Follow the user's request exactly (app type, colors, fidelity, screen types).
- Use render.intent.fidelity, styleKeywords, and brandTone to capture user's styling preferences.
- Return JSON only, no other text.`
      }
    ]
  }

  async handleResponse(context: HandlerContext): Promise<HandlerResult> {
    const { response, provider, sendAssistantMessage } = context
    const runId = `dw_${Date.now()}`
    console.log(`[DW ${runId}] START`, { assistantId: context.assistantId, actionId: context.actionId })
    
    try {
      console.log(`[DW ${runId}] RAW_RESPONSE_HEAD`, response.slice(0, 200))
      console.log(`[DW ${runId}] RAW_RESPONSE_LENGTH`, response.length)
      
      // Extract JSON from response (strip code fences if present)
      let jsonString = extractJsonFromResponse(response)
      if (!jsonString) {
        // Try direct parse if extraction failed
        jsonString = response.trim()
        // Remove code fences manually
        jsonString = jsonString.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '')
      }
      
      // Parse JSON
      let parsed: unknown
      try {
        parsed = JSON.parse(jsonString)
      } catch (parseError) {
        console.log(`[DW ${runId}] JSON parse error:`, parseError)
        // Attempt repair
        return await this.attemptRepair(context, response, runId)
      }
      
      // Validate spec
      console.log(`[DW ${runId}] BEFORE validateDesignSpecV1`)
      const validation = validateDesignSpecV1(parsed)
      
      if (!validation.ok) {
        console.log(`[DW ${runId}] Validation failed:`, validation.errors)
        // Attempt repair
        return await this.attemptRepair(context, response, runId)
      }
      
      if (validation.warnings.length > 0) {
        console.log(`[DW ${runId}] Validation warnings:`, validation.warnings)
      }
      
      // Normalize spec (enforces 1-5 screens)
      console.log(`[DW ${runId}] BEFORE normalizeDesignSpecV1`)
      const normalized = normalizeDesignSpecV1(parsed as DesignSpecV1)
      console.log(`[DW ${runId}] AFTER normalizeDesignSpecV1`, { screenCount: normalized.screens.length })
      
      // Render to section
      console.log(`[DW ${runId}] BEFORE renderDesignSpecToSection`)
      await renderDesignSpecToSection(normalized)
      console.log(`[DW ${runId}] AFTER renderDesignSpecToSection`, { status: 'SUCCESS' })
      
      // Send completion message
      sendAssistantMessage('Screens placed on stage')
      
      // If truncation notice exists, send additional message
      if (normalized.meta.truncationNotice) {
        sendAssistantMessage(normalized.meta.truncationNotice)
      }
      
      figma.notify('Screens generated successfully')
      
      return { handled: true }
    } catch (error) {
      console.error(`[DW ${runId}] Error:`, error)
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Unknown error processing design spec'
      
      sendAssistantMessage(`Error: ${errorMessage}`)
      figma.notify(`Error generating screens: ${errorMessage}`)
      
      return { handled: true, message: `Error: ${errorMessage}` }
    }
  }

  /**
   * Attempt to repair invalid JSON by asking model to fix it
   */
  private async attemptRepair(
    context: HandlerContext,
    originalResponse: string,
    runId: string
  ): Promise<HandlerResult> {
    console.log(`[DW ${runId}] BEFORE repair attempt`)
    
    try {
      const repairPrompt = `Convert the following to valid JSON matching the DesignSpecV1 schema exactly. Return JSON only, no other text.

Required schema:
{
  "type": "designScreens",
  "version": 1,
  "meta": { "title": "string" },
  "canvas": {
    "device": {
      "kind": "mobile" | "tablet" | "desktop",
      "width": number,
      "height": number
    }
  },
  "render": {
    "intent": {
      "fidelity": "wireframe" | "medium" | "hi" | "creative"
    }
  },
  "screens": [
    {
      "name": "string",
      "layout": { "direction": "vertical" | "horizontal", "padding": number, "gap": number },
      "blocks": [
        { "type": "heading", "text": "string", "level": 1 | 2 | 3 },
        { "type": "bodyText", "text": "string" },
        { "type": "button", "text": "string", "variant": "primary" | "secondary" | "tertiary" },
        { "type": "input", "label": "string", "placeholder": "string", "inputType": "text" | "email" | "password" },
        { "type": "card", "title": "string", "content": "string" },
        { "type": "spacer", "height": number },
        { "type": "image", "width": number, "height": number }
      ]
    }
  ]
}

CRITICAL: Generate 1-5 screens only.

Original response:
${originalResponse.substring(0, 2000)}`

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
      
      const repairResponse = await context.provider.sendChat({
        messages: repairMessages,
        assistantId: context.assistantId,
        assistantName: 'Design Workshop',
        quickActionId: context.actionId
      })
      
      console.log(`[DW ${runId}] repair response length:`, repairResponse.length)
      console.log(`[DW ${runId}] repair response head:`, repairResponse.substring(0, 200))
      
      // Extract and parse repaired JSON
      let repairJsonString = extractJsonFromResponse(repairResponse)
      if (!repairJsonString) {
        repairJsonString = repairResponse.trim()
        repairJsonString = repairJsonString.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '')
      }
      
      let repaired: unknown
      try {
        repaired = JSON.parse(repairJsonString)
      } catch (parseError) {
        console.log(`[DW ${runId}] Repair parse error:`, parseError)
        context.sendAssistantMessage('Error: Could not parse design spec. Please try again.')
        figma.notify('Error: Invalid JSON format')
        return { handled: true, message: 'Error: Could not parse design spec' }
      }
      
      // Validate repaired spec
      const repairValidation = validateDesignSpecV1(repaired)
      
      if (!repairValidation.ok) {
        console.log(`[DW ${runId}] Repair validation failed:`, repairValidation.errors)
        context.sendAssistantMessage('Error: Design spec validation failed. Please try again.')
        figma.notify('Error: Invalid design spec format')
        return { handled: true, message: 'Error: Design spec validation failed' }
      }
      
      // Normalize and render
      const normalized = normalizeDesignSpecV1(repaired as DesignSpecV1)
      await renderDesignSpecToSection(normalized)
      
      context.sendAssistantMessage('Screens placed on stage')
      if (normalized.meta.truncationNotice) {
        context.sendAssistantMessage(normalized.meta.truncationNotice)
      }
      
      figma.notify('Screens generated successfully (repaired)')
      return { handled: true }
    } catch (repairError) {
      console.error(`[DW ${runId}] Repair error:`, repairError)
      context.sendAssistantMessage('Error: Could not repair design spec. Please try again.')
      figma.notify('Error: Failed to repair design spec')
      return { handled: true, message: 'Error: Could not repair design spec' }
    }
  }
}
