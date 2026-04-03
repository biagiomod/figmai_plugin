/**
 * Design Workshop Assistant Handler
 *
 * Pipeline:
 *   Normal mode: Jazz context injection → LLM → JSON.parse → validateDesignSpecV1 → 1 repair attempt → demo fallback
 *   Demo mode  : FIFI_DEMO_PRESET → normalizeDesignSpecV1 → renderDesignSpecToSection (useJazz=true)
 *
 * Failure ladder (normal mode only):
 *   Step 1 — JSON.parse failure → attemptRepair (1 LLM call) → if still fails → fireDemoFallback
 *   Step 2 — validateDesignSpecV1 failure → attemptRepair (1 LLM call) → if still fails → fireDemoFallback
 *   Step 3 — render exception → fireDemoFallback (no retry)
 *
 * Observability: all console.log / annotation frames are suppressed in demo mode.
 */

import type { AssistantHandler, HandlerContext, HandlerResult } from './base'
import type { NormalizedMessage } from '../../provider/provider'
import type { DesignSpecV1, DesignIntent } from '../../designWorkshop/types'
import { validateDesignSpecV1, normalizeDesignSpecV1 } from '../../designWorkshop/validate'
import { renderDesignSpecToSection } from '../../designWorkshop/renderer'
import { extractJsonFromResponse } from '../../output/normalize'
import { showNuxtDsFallbackHintIfNeeded } from '../../designSystem/nuxtDsHint'
import { loadFonts, createTextNode } from '../../stage/primitives'
import { JAZZ_CONTEXT_BLOCK } from '../../designWorkshop/jazzContext'
import { FIFI_DEMO_PRESET } from '../../designWorkshop/demoPreset'
import type { RenderReport } from '../../designWorkshop/types'

export class DesignWorkshopHandler implements AssistantHandler {
  private latestUserRequest: string = ''
  private latestIntent: DesignIntent = {}
  private useNuxtDsForThisRun: boolean = false

  canHandle(assistantId: string, actionId: string | undefined): boolean {
    return assistantId === 'design_workshop' && (
      actionId === 'generate-screens' ||
      actionId === 'demo-screens' ||
      actionId === undefined
    )
  }

  prepareMessages(messages: NormalizedMessage[]): NormalizedMessage[] {
    const userMessages = messages.filter(m => m.role === 'user')
    const latestUserRequest = userMessages.length > 0
      ? userMessages[userMessages.length - 1].content
      : 'Generate design screens'

    this.latestUserRequest = latestUserRequest
    this.useNuxtDsForThisRun = /\@ds-nuxt/i.test(latestUserRequest)

    const intent = this.extractIntent(latestUserRequest, messages)
    this.latestIntent = intent

    const intentSummary = this.formatIntentSummary(intent)

    return [
      {
        role: 'system',
        content: `You are a Figma screen generator. Generate screens based on user requests. Return ONLY valid JSON. No prose. No markdown. No code fences. Output must be a single JSON object matching the DesignSpecV1 schema.\n${JAZZ_CONTEXT_BLOCK}`
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
      "fidelity": "hi",
      "styleKeywords": ["string"],
      "brandTone": "string",
      "density": "comfortable"
    }
  },
  "screens": [
    {
      "name": "string",
      "layout": {
        "direction": "vertical",
        "padding": 24,
        "gap": 16
      },
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

CRITICAL:
- Generate 1-5 screens only.
- Use fidelity "hi" always.
- Use Jazz Design System styling as specified in the system prompt.
- Primary CTA button (variant "primary"): one per screen maximum.
- Return JSON only.`
      }
    ]
  }

  async handleResponse(context: HandlerContext): Promise<HandlerResult> {
    const { response, provider, sendAssistantMessage, replaceStatusMessage } = context
    const isDemoMode = context.actionId === 'demo-screens'
    const runId = `dw_${Date.now()}`

    // ── Demo mode: bypass LLM and repair entirely ──────────────────────────
    if (isDemoMode) {
      try {
        const normalized = normalizeDesignSpecV1(FIFI_DEMO_PRESET)
        const renderResult = await renderDesignSpecToSection(normalized, runId, {
          useNuxtDs: false,
          useJazz: true
        })
        figma.notify('FiFi demo screens placed on canvas')
        return { handled: true, message: 'FiFi FinTech demo screens placed on canvas' }
      } catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error'
        return { handled: true, message: `Demo error: ${msg}` }
      }
    }

    // ── Normal mode: LLM response pipeline ────────────────────────────────
    if (!isDemoMode) {
      console.log(`[DW ${runId}] START`)
    }

    try {
      let cleanedResponse = response.replace(/generate:\s*\d+\/\d+\s*\(\d+%\)/gi, '').trim()

      if (!isDemoMode) {
        console.log(`[DW ${runId}] RAW_RESPONSE_HEAD`, cleanedResponse.slice(0, 200))
      }

      // Step 1: JSON parse
      let jsonString = extractJsonFromResponse(cleanedResponse)
      if (!jsonString) {
        jsonString = cleanedResponse.trim()
          .replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '')
      }

      let parsed: unknown
      try {
        parsed = JSON.parse(jsonString)
      } catch {
        if (!isDemoMode) console.log(`[DW ${runId}] JSON parse failed — attempting repair`)
        return await this.attemptRepair(context, cleanedResponse, runId, isDemoMode)
      }

      // Step 2: Validate
      const validation = validateDesignSpecV1(parsed)
      if (!validation.ok) {
        if (!isDemoMode) console.log(`[DW ${runId}] Validation failed:`, validation.errors)
        return await this.attemptRepair(context, cleanedResponse, runId, isDemoMode)
      }

      // Build and render
      return await this.buildAndRender(parsed as DesignSpecV1, context, runId, isDemoMode)

    } catch (error) {
      if (!isDemoMode) console.error(`[DW ${runId}] Unexpected error:`, error)
      return this.fireDemoFallback(context, runId, isDemoMode)
    }
  }

  // ── Internal helpers ────────────────────────────────────────────────────

  private async buildAndRender(
    spec: DesignSpecV1,
    context: HandlerContext,
    runId: string,
    isDemoMode: boolean
  ): Promise<HandlerResult> {
    const { sendAssistantMessage, replaceStatusMessage } = context

    if (!spec.meta) spec.meta = { title: 'Screens' }
    spec.meta.userRequest = this.latestUserRequest
    spec.meta.runId = runId

    if (!spec.meta.intent) {
      spec.meta.intent = this.latestIntent
    } else {
      const llmIntent = spec.meta.intent
      spec.meta.intent = {
        ...this.latestIntent,
        ...llmIntent,
        keywords: llmIntent.keywords || this.latestIntent.keywords,
        accentColors: llmIntent.accentColors || this.latestIntent.accentColors,
        screenArchetypes: llmIntent.screenArchetypes || this.latestIntent.screenArchetypes
      }
    }

    const normalized = normalizeDesignSpecV1(spec)

    // Step 3: Render (failure here → demo fallback, no retry)
    let renderResult: Awaited<ReturnType<typeof renderDesignSpecToSection>>
    try {
      renderResult = await renderDesignSpecToSection(normalized, runId, {
        useNuxtDs: this.useNuxtDsForThisRun,
        useJazz: true
      })
    } catch (renderError) {
      if (!isDemoMode) console.error(`[DW ${runId}] Render error:`, renderError)
      return this.fireDemoFallback(context, runId, isDemoMode)
    }

    // Observability artifacts — suppressed in demo mode
    if (!isDemoMode) {
      await this.createObservabilityArtifacts(normalized, renderResult.report, runId, renderResult.section)
    }

    if (renderResult.usedDsFallback) {
      await showNuxtDsFallbackHintIfNeeded()
    }

    replaceStatusMessage('Screens placed on stage')
    if (normalized.meta.truncationNotice) {
      sendAssistantMessage(normalized.meta.truncationNotice)
    }

    figma.notify('Screens generated successfully')
    return { handled: true }
  }

  private async attemptRepair(
    context: HandlerContext,
    originalResponse: string,
    runId: string,
    isDemoMode: boolean
  ): Promise<HandlerResult> {
    if (!isDemoMode) console.log(`[DW ${runId}] Attempting repair`)

    try {
      const repairMessages: NormalizedMessage[] = [
        {
          role: 'system',
          content: 'Return ONLY valid JSON. No prose. No markdown. No code fences. Output must be a single JSON object.'
        },
        {
          role: 'user',
          content: `Convert the following to valid JSON matching the DesignSpecV1 schema exactly. Return JSON only.

Required schema:
{
  "type": "designScreens",
  "version": 1,
  "meta": { "title": "string" },
  "canvas": { "device": { "kind": "mobile" | "tablet" | "desktop", "width": number, "height": number } },
  "render": { "intent": { "fidelity": "hi" } },
  "screens": [{ "name": "string", "layout": { "direction": "vertical", "padding": 24, "gap": 16 }, "blocks": [] }]
}
CRITICAL: Generate 1-5 screens only.

Original response:
${originalResponse.substring(0, 2000)}`
        }
      ]

      const repairResponse = await context.sendChatWithRecovery({
        messages: repairMessages,
        assistantId: context.assistantId,
        assistantName: 'Design Workshop',
        quickActionId: context.actionId
      })

      let repairJsonString = extractJsonFromResponse(repairResponse)
      if (!repairJsonString) {
        repairJsonString = repairResponse.trim()
          .replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '')
      }

      let repaired: unknown
      try {
        repaired = JSON.parse(repairJsonString)
      } catch {
        if (!isDemoMode) console.log(`[DW ${runId}] Repair parse failed — firing demo fallback`)
        return this.fireDemoFallback(context, runId, isDemoMode)
      }

      const repairValidation = validateDesignSpecV1(repaired)
      if (!repairValidation.ok) {
        if (!isDemoMode) console.log(`[DW ${runId}] Repair validation failed — firing demo fallback`)
        return this.fireDemoFallback(context, runId, isDemoMode)
      }

      return await this.buildAndRender(repaired as DesignSpecV1, context, runId, isDemoMode)

    } catch (repairError) {
      if (!isDemoMode) console.error(`[DW ${runId}] Repair error:`, repairError)
      return this.fireDemoFallback(context, runId, isDemoMode)
    }
  }

  private fireDemoFallback(
    context: HandlerContext,
    runId: string,
    isDemoMode: boolean
  ): HandlerResult {
    try {
      const normalized = normalizeDesignSpecV1(FIFI_DEMO_PRESET)
      renderDesignSpecToSection(normalized, runId, { useNuxtDs: false, useJazz: true })
        .then(() => {
          figma.notify('Used demo preset — open-ended generation failed')
        })
        .catch(() => {
          // If even the preset fails to render, give up silently
        })
    } catch {
      // nothing
    }

    context.replaceStatusMessage('Used demo preset — generation failed. Try again or use Demo mode.')
    return { handled: true }
  }

  /**
   * Extract design intent from user request
   */
  private extractIntent(userRequest: string, messages: NormalizedMessage[]): DesignIntent {
    const intent: DesignIntent = {}
    const lowerRequest = userRequest.toLowerCase()

    const appTypes = ['game', 'fintech', 'mindfulness', 'fitness', 'dashboard', 'social', 'ecommerce', 'banking', 'health']
    for (const appType of appTypes) {
      if (lowerRequest.includes(appType)) { intent.appType = appType; break }
    }

    if (lowerRequest.includes('playful') || lowerRequest.includes('fun') || lowerRequest.includes('game')) {
      intent.tone = 'playful'
    } else if (lowerRequest.includes('serious') || lowerRequest.includes('professional')) {
      intent.tone = 'serious'
    } else if (lowerRequest.includes('calm') || lowerRequest.includes('peaceful')) {
      intent.tone = 'calm'
    }

    const keywords: string[] = []
    for (const kw of ['minimalist', 'bold', 'modern', 'classic', 'vibrant', 'soft']) {
      if (lowerRequest.includes(kw)) keywords.push(kw)
    }
    if (keywords.length > 0) intent.keywords = keywords

    const colorPatterns = [
      { pattern: /pink|rose|magenta/gi, name: 'pink' },
      { pattern: /blue|navy|azure/gi, name: 'blue' },
      { pattern: /green|emerald|mint/gi, name: 'green' },
      { pattern: /purple|violet|lavender/gi, name: 'purple' },
      { pattern: /orange|amber|peach/gi, name: 'orange' },
      { pattern: /red|crimson|scarlet/gi, name: 'red' },
      { pattern: /yellow|gold/gi, name: 'yellow' }
    ]
    const foundColors: string[] = []
    for (const { pattern, name } of colorPatterns) {
      if (pattern.test(userRequest)) foundColors.push(name)
    }
    if (foundColors.length > 0) {
      intent.primaryColor = foundColors[0]
      if (foundColors.length > 1) intent.accentColors = foundColors.slice(1)
    }

    if (lowerRequest.includes('wireframe')) intent.fidelity = 'wireframe'
    else if (lowerRequest.includes('hi') || lowerRequest.includes('high')) intent.fidelity = 'hi'
    else if (lowerRequest.includes('creative') || lowerRequest.includes('playful')) intent.fidelity = 'creative'
    else intent.fidelity = 'hi' // default to hi for Jazz

    if (lowerRequest.includes('compact') || lowerRequest.includes('dense')) intent.density = 'compact'
    else if (lowerRequest.includes('spacious') || lowerRequest.includes('airy')) intent.density = 'spacious'
    else intent.density = 'comfortable'

    const archetypes: string[] = []
    for (const a of ['onboarding', 'home', 'profile', 'settings', 'stats', 'store', 'dashboard', 'login', 'signup']) {
      if (lowerRequest.includes(a)) archetypes.push(a)
    }
    if (archetypes.length > 0) intent.screenArchetypes = archetypes

    return intent
  }

  private formatIntentSummary(intent: DesignIntent): string {
    const parts: string[] = []
    if (intent.appType) parts.push(`App Type: ${intent.appType}`)
    if (intent.tone) parts.push(`Tone: ${intent.tone}`)
    if (intent.keywords?.length) parts.push(`Keywords: ${intent.keywords.join(', ')}`)
    if (intent.primaryColor) parts.push(`Primary Color: ${intent.primaryColor}`)
    if (intent.accentColors?.length) parts.push(`Accent Colors: ${intent.accentColors.join(', ')}`)
    if (intent.fidelity) parts.push(`Fidelity: ${intent.fidelity}`)
    if (intent.density) parts.push(`Density: ${intent.density}`)
    if (intent.screenArchetypes?.length) parts.push(`Screen Types: ${intent.screenArchetypes.join(', ')}`)
    return parts.length > 0 ? parts.join('\n') : 'No explicit intent extracted (using Jazz defaults)'
  }

  /**
   * Create observability artifacts on stage (dev/non-demo mode only).
   */
  private async createObservabilityArtifacts(
    spec: DesignSpecV1,
    report: RenderReport | undefined,
    runId: string,
    section: FrameNode
  ): Promise<void> {
    try {
      const fonts = await loadFonts()
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

      const titleText = await createTextNode('Design Workshop — Spec & Intent', {
        fontSize: 14, fontName: fonts.bold,
        fills: [{ type: 'SOLID', color: { r: 0.1, g: 0.1, b: 0.1 } }]
      })
      titleText.name = 'Title'
      annotationFrame.appendChild(titleText)

      const runIdText = await createTextNode(`Run: ${runId}`, {
        fontSize: 11, fontName: fonts.regular,
        fills: [{ type: 'SOLID', color: { r: 0.5, g: 0.5, b: 0.5 } }]
      })
      runIdText.name = 'Run ID'
      annotationFrame.appendChild(runIdText)

      if (spec.meta.userRequest) {
        const label = await createTextNode('User Request:', {
          fontSize: 12, fontName: fonts.bold,
          fills: [{ type: 'SOLID', color: { r: 0.2, g: 0.2, b: 0.2 } }]
        })
        label.name = 'User Request Label'
        annotationFrame.appendChild(label)
        const text = await createTextNode(`"${spec.meta.userRequest}"`, {
          fontSize: 11, fontName: fonts.regular,
          fills: [{ type: 'SOLID', color: { r: 0.3, g: 0.3, b: 0.3 } }]
        })
        text.name = 'User Request'
        text.resize(300, text.height)
        annotationFrame.appendChild(text)
      }

      if (report) {
        const parts: string[] = []
        if (report.consumedFields.length > 0) parts.push(`Applied: ${report.consumedFields.length}`)
        if (report.unusedFields.length > 0) parts.push(`Unused: ${report.unusedFields.length}`)
        if (report.fallbacks.length > 0) parts.push(`Fallbacks: ${report.fallbacks.length}`)
        if (parts.length > 0) {
          const reportLabel = await createTextNode('Render Report:', {
            fontSize: 12, fontName: fonts.bold,
            fills: [{ type: 'SOLID', color: { r: 0.2, g: 0.2, b: 0.2 } }]
          })
          reportLabel.name = 'Report Label'
          annotationFrame.appendChild(reportLabel)
          const reportText = await createTextNode(parts.join(' • '), {
            fontSize: 11, fontName: fonts.regular,
            fills: [{ type: 'SOLID', color: { r: 0.3, g: 0.3, b: 0.3 } }]
          })
          reportText.name = 'Report'
          reportText.resize(300, reportText.height)
          annotationFrame.appendChild(reportText)
        }
      }

      annotationFrame.x = section.x + section.width + 40
      annotationFrame.y = section.y
      figma.currentPage.appendChild(annotationFrame)
    } catch (error) {
      console.error('[DW] Error creating observability artifacts:', error)
    }
  }
}
