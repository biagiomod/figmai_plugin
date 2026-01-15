/**
 * Design Workshop Assistant Handler
 * Handles Design Workshop assistant responses with JSON parsing, validation, repair, and rendering
 */

import type { AssistantHandler, HandlerContext, HandlerResult } from './base'
import type { NormalizedMessage } from '../../provider/provider'
import type { DesignSpecV1, DesignIntent, RenderReport } from '../../designWorkshop/types'
import { validateDesignSpecV1, normalizeDesignSpecV1 } from '../../designWorkshop/validate'
import { renderDesignSpecToSection } from '../../designWorkshop/renderer'
import { extractJsonFromResponse } from '../../output/normalize'
import { loadFonts, createTextNode } from '../../stage/primitives'

export class DesignWorkshopHandler implements AssistantHandler {
  // Store latest user request and intent for handleResponse
  private latestUserRequest: string = ''
  private latestIntent: DesignIntent = {}

  canHandle(assistantId: string, actionId: string | undefined): boolean {
    return assistantId === 'design_workshop' && (actionId === 'generate-screens' || actionId === undefined)
  }

  prepareMessages(messages: NormalizedMessage[]): NormalizedMessage[] {
    // Extract the latest user message (the actual request)
    const userMessages = messages.filter(m => m.role === 'user')
    const latestUserRequest = userMessages.length > 0
      ? userMessages[userMessages.length - 1].content
      : 'Generate design screens'

    // Store for use in handleResponse
    this.latestUserRequest = latestUserRequest

    // Extract intent from user request (simple keyword-based extraction)
    const intent = this.extractIntent(latestUserRequest, messages)

    // Store intent for use in handleResponse
    this.latestIntent = intent

    // Build intent summary for prompt
    const intentSummary = this.formatIntentSummary(intent)

    // Inject JSON-only enforcement messages for Design Workshop
    return [
      {
        role: 'system',
        content: 'You are a Figma screen generator. Generate screens based on user requests. Return ONLY valid JSON. No prose. No markdown. No code fences. Output must be a single JSON object matching the DesignSpecV1 schema.'
      },
      ...messages,
      {
        role: 'user',
        content: `=== USER REQUEST ===
"${latestUserRequest}"

=== EXTRACTED INTENT ===
${intentSummary}

=== SCHEMA REQUIREMENTS ===
Output must be a single JSON object matching the DesignSpecV1 schema exactly:

{
  "type": "designScreens",
  "version": 1,
  "meta": { 
    "title": "string",
    "userRequest": "${latestUserRequest.replace(/"/g, '\\"')}",
    "intent": { /* extracted intent fields */ }
  },
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
      "brandTone": "string",
      "density": "compact" | "comfortable" | "spacious"
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

=== STYLING RULES ===
1. Map user's app type/genre to screen names and content (e.g., "game" → game-like screens, "fintech" → financial app screens).
2. Map tone/genre/keywords to render.intent:
   - "playful", "fun", "game" → use creative fidelity, rounded corners, bright colors
   - "serious", "professional", "fintech" → use hi fidelity, restrained palette
   - "calm", "mindfulness" → use medium/hi fidelity, soft colors, spacious density
3. Map color requests to render.intent.styleKeywords and brandTone:
   - If user mentions specific colors (e.g., "pink", "blue"), include them in styleKeywords
   - If user mentions color as "accent", use it sparingly in buttons/highlights
   - Express colors as semantic names (e.g., "pink", "navy blue") or hex values
4. Map fidelity requests:
   - "wireframe" → wireframe
   - "medium" or no mention → medium
   - "hi", "high", "high-fidelity" → hi
   - "creative", "playful", "bold" → creative
5. Map screen types from user request to screen names (e.g., "onboarding" → "Onboarding", "home" → "Home").

CRITICAL: 
- Generate 1-5 screens only. If more are requested, generate exactly 5 and include meta.truncationNotice.
- Follow the user's request EXACTLY (app type, colors, fidelity, screen types).
- Include meta.userRequest and meta.intent in your output.
- Use render.intent.fidelity, styleKeywords, brandTone, and density to capture user's styling preferences.
- Return JSON only, no other text.`
      }
    ]
  }

  /**
   * Extract design intent from user request and message history
   */
  private extractIntent(userRequest: string, messages: NormalizedMessage[]): DesignIntent {
    const intent: DesignIntent = {}
    const lowerRequest = userRequest.toLowerCase()

    // Extract app type/genre
    const appTypes = ['game', 'fintech', 'mindfulness', 'fitness', 'dashboard', 'social', 'ecommerce', 'banking', 'health']
    for (const appType of appTypes) {
      if (lowerRequest.includes(appType)) {
        intent.appType = appType
        break
      }
    }

    // Extract tone
    if (lowerRequest.includes('playful') || lowerRequest.includes('fun') || lowerRequest.includes('game')) {
      intent.tone = 'playful'
    } else if (lowerRequest.includes('serious') || lowerRequest.includes('professional')) {
      intent.tone = 'serious'
    } else if (lowerRequest.includes('calm') || lowerRequest.includes('peaceful')) {
      intent.tone = 'calm'
    }

    // Extract keywords
    const keywords: string[] = []
    const keywordPatterns = ['minimalist', 'bold', 'modern', 'classic', 'vibrant', 'soft']
    for (const keyword of keywordPatterns) {
      if (lowerRequest.includes(keyword)) {
        keywords.push(keyword)
      }
    }
    if (keywords.length > 0) {
      intent.keywords = keywords
    }

    // Extract colors
    const colorPatterns = [
      { pattern: /pink|rose|magenta/gi, name: 'pink' },
      { pattern: /blue|navy|azure/gi, name: 'blue' },
      { pattern: /green|emerald|mint/gi, name: 'green' },
      { pattern: /purple|violet|lavender/gi, name: 'purple' },
      { pattern: /orange|amber|peach/gi, name: 'orange' },
      { pattern: /red|crimson|scarlet/gi, name: 'red' },
      { pattern: /yellow|gold|amber/gi, name: 'yellow' }
    ]

    const foundColors: string[] = []
    for (const { pattern, name } of colorPatterns) {
      if (pattern.test(userRequest)) {
        foundColors.push(name)
      }
    }

    if (foundColors.length > 0) {
      intent.primaryColor = foundColors[0]
      if (foundColors.length > 1) {
        intent.accentColors = foundColors.slice(1)
      }
    }

    // Extract fidelity
    if (lowerRequest.includes('wireframe')) {
      intent.fidelity = 'wireframe'
    } else if (lowerRequest.includes('hi') || lowerRequest.includes('high') || lowerRequest.includes('high-fidelity')) {
      intent.fidelity = 'hi'
    } else if (lowerRequest.includes('creative') || lowerRequest.includes('playful') || lowerRequest.includes('bold')) {
      intent.fidelity = 'creative'
    } else if (lowerRequest.includes('medium')) {
      intent.fidelity = 'medium'
    }

    // Extract density
    if (lowerRequest.includes('compact') || lowerRequest.includes('dense')) {
      intent.density = 'compact'
    } else if (lowerRequest.includes('spacious') || lowerRequest.includes('airy')) {
      intent.density = 'spacious'
    } else if (lowerRequest.includes('comfortable')) {
      intent.density = 'comfortable'
    }

    // Extract screen archetypes
    const archetypes: string[] = []
    const archetypePatterns = ['onboarding', 'home', 'profile', 'settings', 'stats', 'store', 'dashboard', 'login', 'signup']
    for (const archetype of archetypePatterns) {
      if (lowerRequest.includes(archetype)) {
        archetypes.push(archetype)
      }
    }
    if (archetypes.length > 0) {
      intent.screenArchetypes = archetypes
    }

    return intent
  }

  /**
   * Format intent summary for LLM prompt
   */
  private formatIntentSummary(intent: DesignIntent): string {
    const parts: string[] = []

    if (intent.appType) {
      parts.push(`App Type: ${intent.appType}`)
    }
    if (intent.tone) {
      parts.push(`Tone: ${intent.tone}`)
    }
    if (intent.keywords && intent.keywords.length > 0) {
      parts.push(`Keywords: ${intent.keywords.join(', ')}`)
    }
    if (intent.primaryColor) {
      parts.push(`Primary Color: ${intent.primaryColor}`)
    }
    if (intent.accentColors && intent.accentColors.length > 0) {
      parts.push(`Accent Colors: ${intent.accentColors.join(', ')}`)
    }
    if (intent.fidelity) {
      parts.push(`Fidelity: ${intent.fidelity}`)
    }
    if (intent.density) {
      parts.push(`Density: ${intent.density}`)
    }
    if (intent.screenArchetypes && intent.screenArchetypes.length > 0) {
      parts.push(`Screen Types: ${intent.screenArchetypes.join(', ')}`)
    }

    return parts.length > 0 ? parts.join('\n') : 'No explicit intent extracted (use defaults)'
  }

  async handleResponse(context: HandlerContext): Promise<HandlerResult> {
    const { response, provider, sendAssistantMessage, replaceStatusMessage } = context
    const runId = `dw_${Date.now()}`
    console.log(`[DW ${runId}] START`, { assistantId: context.assistantId, actionId: context.actionId })

    try {
      // Clean response: remove internal metadata tags like "generate: 1/100 (1%)"
      let cleanedResponse = response.replace(/generate:\s*\d+\/\d+\s*\(\d+%\)/gi, '').trim()

      console.log(`[DW ${runId}] RAW_RESPONSE_HEAD`, cleanedResponse.slice(0, 200))
      console.log(`[DW ${runId}] RAW_RESPONSE_LENGTH`, cleanedResponse.length)

      // Extract JSON from response (strip code fences if present)
      let jsonString = extractJsonFromResponse(cleanedResponse)
      if (!jsonString) {
        // Try direct parse if extraction failed
        jsonString = cleanedResponse.trim()
        // Remove code fences manually
        jsonString = jsonString.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '')
      }

      // Parse JSON
      let parsed: unknown
      try {
        parsed = JSON.parse(jsonString)
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          console.log(`[DW ${runId}] PARSED_JSON_KEYS:`, Object.keys(parsed));
        }
        const fullJson = JSON.stringify(parsed, null, 2);
        console.log(`[DW ${runId}] PARSED_JSON_FULL (${fullJson.length} chars):`,
          fullJson.length > 2000 ? fullJson.substring(0, 2000) + '...' : fullJson);
      } catch (parseError) {
        console.log(`[DW ${runId}] JSON parse error:`, parseError)
        // Attempt repair with cleaned response
        return await this.attemptRepair(context, cleanedResponse, runId)
      }

      // Validate spec
      console.log(`[DW][VALIDATION] ${runId} - Starting validation`)
      const validation = validateDesignSpecV1(parsed)

      if (!validation.ok) {
        console.log(`[DW][VALIDATION] ${runId} - Validation failed:`, validation.errors)
        // Attempt repair with cleaned response
        return await this.attemptRepair(context, cleanedResponse, runId)
      }

      if (validation.warnings.length > 0) {
        console.log(`[DW][VALIDATION] ${runId} - Warnings:`, validation.warnings)
      }

      // Store user request, runId, and intent in spec before normalizing
      const spec = parsed as DesignSpecV1
      if (!spec.meta) {
        spec.meta = { title: 'Screens' }
      }
      spec.meta.userRequest = this.latestUserRequest
      spec.meta.runId = runId

      // Merge extracted intent with any intent from LLM response
      if (!spec.meta.intent) {
        spec.meta.intent = this.latestIntent
      } else {
        // Merge: LLM intent takes precedence, but fill gaps from extracted intent
        const llmIntent = spec.meta.intent
        spec.meta.intent = {
          ...this.latestIntent,
          ...llmIntent,
          keywords: llmIntent.keywords || this.latestIntent.keywords,
          accentColors: llmIntent.accentColors || this.latestIntent.accentColors,
          screenArchetypes: llmIntent.screenArchetypes || this.latestIntent.screenArchetypes
        }
      }

      console.log(`[DW][INTENT] ${runId} - User request: "${this.latestUserRequest}"`)
      console.log(`[DW][INTENT] ${runId} - Extracted intent:`, JSON.stringify(spec.meta.intent, null, 2))

      // Normalize spec (enforces 1-5 screens)
      console.log(`[DW][SPEC] ${runId} - Normalizing spec`)
      const normalized = normalizeDesignSpecV1(spec)
      console.log(`[DW][SPEC] ${runId} - Normalized: ${normalized.screens.length} screens`)

      // Render to section
      console.log(`[DW][RENDER] ${runId} - Starting render`)
      const renderResult = await renderDesignSpecToSection(normalized, runId)
      console.log(`[DW][RENDER] ${runId} - Render complete`)

      // Log render report
      if (renderResult.report) {
        console.log(`[DW][REPORT] ${runId} - Consumed fields:`, renderResult.report.consumedFields.length)
        console.log(`[DW][REPORT] ${runId} - Unused fields:`, renderResult.report.unusedFields.length)
        console.log(`[DW][REPORT] ${runId} - Fallbacks:`, renderResult.report.fallbacks.length)

        if (renderResult.report.unusedFields.length > 0) {
          renderResult.report.unusedFields.forEach(field => {
            console.log(`[DW][UNUSED_FIELD] ${runId} - ${field.field}:`, field.value, field.reason || '')
          })
        }
      }

      // Create observability artifacts
      await this.createObservabilityArtifacts(normalized, renderResult.report, runId, renderResult.section)

      // Send completion message
      replaceStatusMessage('Screens placed on stage')

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

      replaceStatusMessage(`Error: ${errorMessage}`, true)
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
        context.replaceStatusMessage('Error: Could not parse design spec. Please try again.', true)
        figma.notify('Error: Invalid JSON format')
        return { handled: true, message: 'Error: Could not parse design spec' }
      }

      // Validate repaired spec
      const repairValidation = validateDesignSpecV1(repaired)

      if (!repairValidation.ok) {
        console.log(`[DW ${runId}] Repair validation failed:`, repairValidation.errors)
        context.replaceStatusMessage('Error: Design spec validation failed. Please try again.', true)
        figma.notify('Error: Invalid design spec format')
        return { handled: true, message: 'Error: Design spec validation failed' }
      }

      // Store user request, runId, and intent in repaired spec
      const repairedSpec = repaired as DesignSpecV1
      if (!repairedSpec.meta) {
        repairedSpec.meta = { title: 'Screens' }
      }
      repairedSpec.meta.userRequest = this.latestUserRequest
      repairedSpec.meta.runId = runId

      // Merge extracted intent with any intent from LLM response
      if (!repairedSpec.meta.intent) {
        repairedSpec.meta.intent = this.latestIntent
      } else {
        const llmIntent = repairedSpec.meta.intent
        repairedSpec.meta.intent = {
          ...this.latestIntent,
          ...llmIntent,
          keywords: llmIntent.keywords || this.latestIntent.keywords,
          accentColors: llmIntent.accentColors || this.latestIntent.accentColors,
          screenArchetypes: llmIntent.screenArchetypes || this.latestIntent.screenArchetypes
        }
      }

      // Normalize and render
      const normalized = normalizeDesignSpecV1(repairedSpec)
      const renderResult = await renderDesignSpecToSection(normalized, runId)

      // Create observability artifacts
      await this.createObservabilityArtifacts(normalized, renderResult.report, runId, renderResult.section)

      context.replaceStatusMessage('Screens placed on stage')
      if (normalized.meta.truncationNotice) {
        context.sendAssistantMessage(normalized.meta.truncationNotice)
      }

      figma.notify('Screens generated successfully (repaired)')
      return { handled: true }
    } catch (repairError) {
      console.error(`[DW ${runId}] Repair error:`, repairError)
      context.replaceStatusMessage('Error: Could not repair design spec. Please try again.', true)
      figma.notify('Error: Failed to repair design spec')
      return { handled: true, message: 'Error: Could not repair design spec' }
    }
  }

  /**
   * Create observability artifacts on stage
   * Places an annotation frame near the section with user request, intent, and spec summary
   */
  private async createObservabilityArtifacts(
    spec: DesignSpecV1,
    report: RenderReport | undefined,
    runId: string,
    section: FrameNode
  ): Promise<void> {
    try {
      const fonts = await loadFonts()

      // Create annotation frame
      const annotationFrame = figma.createFrame()
      annotationFrame.name = `Design Workshop — Spec & Intent (${runId})`
      annotationFrame.layoutMode = 'VERTICAL'
      annotationFrame.primaryAxisSizingMode = 'AUTO'
      annotationFrame.counterAxisSizingMode = 'AUTO'
      annotationFrame.paddingTop = 16
      annotationFrame.paddingRight = 16
      annotationFrame.paddingBottom = 16
      annotationFrame.paddingLeft = 16
      annotationFrame.itemSpacing = 12
      annotationFrame.fills = [{ type: 'SOLID', color: { r: 0.98, g: 0.98, b: 0.98 } }]
      annotationFrame.strokes = [{ type: 'SOLID', color: { r: 0.8, g: 0.8, b: 0.8 }, opacity: 1 }]
      annotationFrame.strokeWeight = 1
      annotationFrame.cornerRadius = 8

      // Title
      const titleText = await createTextNode('Design Workshop — Spec & Intent', {
        fontSize: 14,
        fontName: fonts.bold,
        fills: [{ type: 'SOLID', color: { r: 0.1, g: 0.1, b: 0.1 } }]
      })
      titleText.name = 'Title'
      annotationFrame.appendChild(titleText)

      // Run ID
      const runIdText = await createTextNode(`Run: ${runId}`, {
        fontSize: 11,
        fontName: fonts.regular,
        fills: [{ type: 'SOLID', color: { r: 0.5, g: 0.5, b: 0.5 } }]
      })
      runIdText.name = 'Run ID'
      annotationFrame.appendChild(runIdText)

      // User Request
      if (spec.meta.userRequest) {
        const userRequestLabel = await createTextNode('User Request:', {
          fontSize: 12,
          fontName: fonts.bold,
          fills: [{ type: 'SOLID', color: { r: 0.2, g: 0.2, b: 0.2 } }]
        })
        userRequestLabel.name = 'User Request Label'
        annotationFrame.appendChild(userRequestLabel)

        const userRequestText = await createTextNode(`"${spec.meta.userRequest}"`, {
          fontSize: 11,
          fontName: fonts.regular,
          fills: [{ type: 'SOLID', color: { r: 0.3, g: 0.3, b: 0.3 } }]
        })
        userRequestText.name = 'User Request'
        userRequestText.resize(300, userRequestText.height)
        annotationFrame.appendChild(userRequestText)
      }

      // Intent Summary
      if (spec.meta.intent) {
        const intentLabel = await createTextNode('Intent:', {
          fontSize: 12,
          fontName: fonts.bold,
          fills: [{ type: 'SOLID', color: { r: 0.2, g: 0.2, b: 0.2 } }]
        })
        intentLabel.name = 'Intent Label'
        annotationFrame.appendChild(intentLabel)

        const intentParts: string[] = []
        if (spec.meta.intent.appType) intentParts.push(`App: ${spec.meta.intent.appType}`)
        if (spec.meta.intent.tone) intentParts.push(`Tone: ${spec.meta.intent.tone}`)
        if (spec.meta.intent.primaryColor) intentParts.push(`Color: ${spec.meta.intent.primaryColor}`)
        if (spec.meta.intent.fidelity) intentParts.push(`Fidelity: ${spec.meta.intent.fidelity}`)

        if (intentParts.length > 0) {
          const intentText = await createTextNode(intentParts.join(' • '), {
            fontSize: 11,
            fontName: fonts.regular,
            fills: [{ type: 'SOLID', color: { r: 0.3, g: 0.3, b: 0.3 } }]
          })
          intentText.name = 'Intent'
          intentText.resize(300, intentText.height)
          annotationFrame.appendChild(intentText)
        }
      }

      // Render Report Summary
      if (report) {
        const reportParts: string[] = []
        if (report.consumedFields.length > 0) {
          reportParts.push(`Applied: ${report.consumedFields.length} fields`)
        }
        if (report.unusedFields.length > 0) {
          reportParts.push(`Unused: ${report.unusedFields.length} fields`)
        }
        if (report.fallbacks.length > 0) {
          reportParts.push(`Fallbacks: ${report.fallbacks.length}`)
        }

        if (reportParts.length > 0) {
          const reportLabel = await createTextNode('Render Report:', {
            fontSize: 12,
            fontName: fonts.bold,
            fills: [{ type: 'SOLID', color: { r: 0.2, g: 0.2, b: 0.2 } }]
          })
          reportLabel.name = 'Report Label'
          annotationFrame.appendChild(reportLabel)

          const reportText = await createTextNode(reportParts.join(' • '), {
            fontSize: 11,
            fontName: fonts.regular,
            fills: [{ type: 'SOLID', color: { r: 0.3, g: 0.3, b: 0.3 } }]
          })
          reportText.name = 'Report'
          reportText.resize(300, reportText.height)
          annotationFrame.appendChild(reportText)
        }
      }

      // Spec Summary (truncated JSON)
      const specLabel = await createTextNode('Spec (preview):', {
        fontSize: 12,
        fontName: fonts.bold,
        fills: [{ type: 'SOLID', color: { r: 0.2, g: 0.2, b: 0.2 } }]
      })
      specLabel.name = 'Spec Label'
      annotationFrame.appendChild(specLabel)

      const specPreview = {
        screens: spec.screens.length,
        fidelity: spec.render.intent.fidelity,
        device: spec.canvas.device.kind
      }
      const specText = await createTextNode(JSON.stringify(specPreview, null, 2), {
        fontSize: 10,
        fontName: fonts.regular,
        fills: [{ type: 'SOLID', color: { r: 0.4, g: 0.4, b: 0.4 } }]
      })
      specText.name = 'Spec Preview'
      specText.resize(300, specText.height)
      annotationFrame.appendChild(specText)

      // Position annotation frame to the right of section
      annotationFrame.x = section.x + section.width + 40
      annotationFrame.y = section.y

      // Append to page
      figma.currentPage.appendChild(annotationFrame)
    } catch (error) {
      console.error(`[DW] Error creating observability artifacts:`, error)
      // Don't fail the whole operation if observability fails
    }
  }
}
