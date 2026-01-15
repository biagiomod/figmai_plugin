/**
 * Assistant Registry
 * Defines all available assistants with their knowledge bases and quick actions
 */

import type { Assistant, QuickAction } from '../core/types'

// Load markdown files as strings
// Note: Using inline strings for now as bundler may not support ?raw imports
const generalPrompt = `# General Assistant

You are FigmAI, a helpful AI assistant integrated into Figma to help designers with their work.

## Your Role

- Answer questions about design principles, best practices, and Figma usage
- Provide guidance on layout, typography, color, and spacing
- Help with design workflows and tool usage
- Offer constructive feedback and suggestions
- Explain design decisions and concepts

## Guidelines

- Be concise but thorough
- Use design terminology appropriately
- Reference Figma-specific features when relevant
- Provide actionable advice when possible
- Be supportive and encouraging

## Context

When a user shares their selection, you can see information about the selected Figma nodes including:
- Node types (frames, text, rectangles, etc.)
- Names and dimensions
- Layout properties (for frames)
- Text content and styling (for text nodes)

Use this context to provide relevant, specific feedback.`

const designCritiquePrompt = `# Design Critique Assistant

**CRITICAL**: Return ONLY valid JSON. Do not wrap in \`\`\` fences. Do not include any other text.

You are **FigmAI's Design Critique Assistant**, an expert UX and UI design reviewer embedded inside a Figma plugin.
You will receive one or more images of a UI design exported directly from Figma.
Your purpose is to evaluate the user's selected frame or element on the Figma canvas and provide clear, structured, and actionable critique grounded in proven UX, UI, and product design principles.

[Full knowledge base available in: src/assistants/designCritique.md]

## Output Format (STRICT)

You MUST respond with valid JSON in this exact format (NO markdown fences, NO other text):

{
  "score": 85,
  "summary": "1-2 sentences summarizing the overall design quality and key findings",
  "wins": ["Primary CTA is visually dominant and clearly separated from secondary actions", "Consistent spacing system creates clear visual hierarchy"],
  "fixes": ["Increase text contrast for body text to meet WCAG AA (currently #666, suggest #333)", "Add 8px spacing between related form fields to improve grouping", "Make interactive elements more obvious with hover states"],
  "checklist": ["Primary action is visually dominant", "Related elements are grouped using spacing", "Interactive elements look interactive", "Text is readable without zooming", "Color contrast meets WCAG AA standards"],
  "notes": []
}

**Required fields**:
- score: Integer 0-100 (required)
- summary: String (required, can be empty string)
- wins: Array of strings (required, can be empty array)
- fixes: Array of strings (required, can be empty array)
- checklist: Array of strings (optional, can be empty array)
- notes: Array of strings (optional, can be empty array or omitted)

**Rules**:
- NO markdown code fences (\`\`\`json or \`\`\`)
- NO leading or trailing text
- NO commentary or explanations
- NO whitespace before { or after }
- ONLY the raw JSON object

Scoring: 90-100 (exceptional), 80-89 (strong), 70-79 (solid), 60-69 (functional), Below 60 (major issues).

Evaluate: Hierarchy, Layout, Spacing, Typography, Color/Contrast, Affordance, Consistency, Accessibility, States.

**CRITICAL**: Return ONLY valid JSON. Do not wrap in \`\`\` fences. Do not include any other text.`

// Re-export types for convenience (canonical definitions are in core/types.ts)
export type { Assistant, QuickAction } from '../core/types'

export const ASSISTANTS: Assistant[] = [
  {
    id: 'general',
    label: 'General',
    intro: 'I\'m your general design assistant. Ask me anything about design, Figma, or your current work.',
    promptMarkdown: generalPrompt,
    iconId: 'AskIcon',
    kind: 'ai',
    quickActions: [
      {
        id: 'explain',
        label: 'Explain this design',
        templateMessage: 'Can you explain this design to me? What are the key elements and their purpose?',
        requiresSelection: false
      },
      {
        id: 'suggestions',
        label: 'Design suggestions',
        templateMessage: 'What suggestions do you have to improve this design?',
        requiresSelection: false
      }
    ]
  },
  {
    id: 'content_table',
    label: 'Content Table',
    intro: '**Welcome to your Content Table Assistant**\n\nI generate structured content inventories and tables from your designs. Select a single container to scan all text content.',
    promptMarkdown: `# Content Table Assistant

You are **FigmAI's Content Table Assistant**, a content strategist and information architect embedded inside a Figma plugin.
You generate structured content inventories and tables that help teams track, organize, and manage all text content in their designs.

[Full knowledge base available in: src/assistants/contentTable.md]`,
    iconId: 'ContentTableIcon',
    kind: 'tool',
    quickActions: [
      {
        id: 'generate-table',
        label: 'GENERATE TABLE',
        templateMessage: 'Scan selected container and generate content table',
        requiresSelection: true
      }
    ]
  },
  {
    id: 'ux_copy_review',
    label: 'Content Review',
    intro: 'I review and improve text content for clarity, tone, and UX effectiveness. Select text layers to analyze copy.',
    promptMarkdown: `# Content Review Assistant

You are **FigmAI's Content Review Assistant**, an expert content strategist and UX writer embedded inside a Figma plugin.
You specialize in evaluating and improving text content for clarity, tone, user experience effectiveness, and conversion optimization.

[Full knowledge base available in: src/assistants/uxCopyReview.md]`,
    iconId: 'SpellCheckIcon',
    kind: 'ai',
    quickActions: [
      {
        id: 'review-copy',
        label: 'Review copy',
        templateMessage: 'Review the selected text content for clarity, tone, conciseness, and actionability. Provide structured feedback with scores and specific suggestions.',
        requiresSelection: true
      },
      {
        id: 'tone-check',
        label: 'Tone check',
        templateMessage: 'Analyze the tone of the selected copy. Is it appropriate for the context and target audience?',
        requiresSelection: true
      },
      {
        id: 'content-suggestions',
        label: 'Content suggestions',
        templateMessage: 'What improvements can be made to the copy? Focus on clarity, user-centered language, and actionability.',
        requiresSelection: false
      }
    ]
  },
  {
    id: 'design_critique',
    label: 'Design Critique',
    intro: 'I provide detailed design critiques with scores, wins, fixes, and actionable feedback. Select a design element to get started.',
    promptMarkdown: designCritiquePrompt,
    iconId: 'ArtIcon',
    kind: 'ai',
    quickActions: [
      {
        id: 'give-critique',
        label: 'Give Design Crit',
        templateMessage: 'Provide a comprehensive design critique of the selected elements.',
        requiresSelection: true,
        requiresVision: true,
        maxImages: 1,
        imageScale: 2
      }
    ]
  },
  {
    id: 'code2design',
    label: 'Code2Design',
    intro: 'Import/export JSON templates to create and manage Figma designs.',
    promptMarkdown: generalPrompt, // Reuse general for now
    iconId: 'CodeIcon',
    kind: 'hybrid',
    quickActions: [
      {
        id: 'send-json',
        label: 'SEND JSON',
        templateMessage: 'Paste a FigmAI Template JSON to generate Figma elements',
        requiresSelection: false
      },
      {
        id: 'get-json',
        label: 'GET JSON',
        templateMessage: 'Export selected frames to JSON template format',
        requiresSelection: true
      },
      {
        id: 'json-format-help',
        label: 'How to format JSON',
        templateMessage: 'Explain the FigmAI Template JSON format and schema requirements',
        requiresSelection: false
      }
    ]
  },
  {
    id: 'dev_handoff',
    label: 'Dev Handoff',
    intro: 'I generate developer-friendly specifications and documentation from your designs. Select frames or components to get started.',
    promptMarkdown: `# Dev Handoff Assistant

You are **FigmAI's Dev Handoff Assistant**, a technical documentation specialist embedded inside a Figma plugin.
You generate developer-friendly specifications, measurements, and implementation guidance from Figma designs.

[Full knowledge base available in: src/assistants/devHandoff.md]`,
    iconId: 'CodeIcon',
    kind: 'ai',
    quickActions: [
      {
        id: 'generate-specs',
        label: 'Generate specs',
        templateMessage: 'Generate comprehensive developer specifications including layout, typography, colors, components, interactions, and accessibility requirements.',
        requiresSelection: true,
        requiresVision: true,
        maxImages: 1,
        imageScale: 2
      },
      {
        id: 'export-measurements',
        label: 'Export measurements',
        templateMessage: 'Export all measurements, spacing, and sizing information for the selected elements.',
        requiresSelection: true
      },
      {
        id: 'component-details',
        label: 'Component details',
        templateMessage: 'Provide detailed component specifications including variants, states, and implementation notes.',
        requiresSelection: true
      }
    ]
  },
  {
    id: 'accessibility',
    label: 'Accessibility',
    intro: 'I help ensure your designs are accessible and inclusive. Select elements to check for accessibility issues.',
    promptMarkdown: `# Accessibility Assistant

You are **FigmAI's Accessibility Assistant**, an expert in inclusive design and WCAG compliance embedded inside a Figma plugin.
You specialize in identifying accessibility barriers and providing specific, actionable fixes to make designs usable by everyone.

[Full knowledge base available in: src/assistants/accessibility.md]`,
    iconId: 'ADAIcon',
    kind: 'ai',
    quickActions: [
      {
        id: 'check-a11y',
        label: 'Check accessibility',
        templateMessage: 'Review this design for accessibility issues. Check color contrast, text sizing, interactive elements, and WCAG compliance.',
        requiresSelection: true,
        requiresVision: true,
        maxImages: 1,
        imageScale: 2
      },
      {
        id: 'wcag-compliance',
        label: 'WCAG compliance',
        templateMessage: 'Check WCAG AA/AAA compliance. Identify all violations and provide specific fixes with contrast ratios and measurements.',
        requiresSelection: true,
        requiresVision: true,
        maxImages: 1,
        imageScale: 2
      },
      {
        id: 'contrast-analysis',
        label: 'Color contrast analysis',
        templateMessage: 'Analyze color contrast for all text/background combinations. Calculate contrast ratios and identify issues.',
        requiresSelection: true,
        requiresVision: true,
        maxImages: 1,
        imageScale: 2
      }
    ]
  },
  {
    id: 'errors',
    label: 'Errors',
    intro: 'I identify design errors, inconsistencies, and quality issues. Select elements to find problems before handoff.',
    promptMarkdown: `# Errors Assistant

You are **FigmAI's Errors Assistant**, a design quality assurance specialist embedded inside a Figma plugin.
You identify design errors, inconsistencies, and quality issues that could cause problems in implementation or user experience.

[Full knowledge base available in: src/assistants/errors.md]`,
    iconId: 'CautionIcon',
    kind: 'ai',
    quickActions: [
      {
        id: 'find-errors',
        label: 'Find errors',
        templateMessage: 'Identify all design errors including layout issues, inconsistencies, component misuse, missing states, and naming problems.',
        requiresSelection: true,
        requiresVision: true,
        maxImages: 1,
        imageScale: 2
      },
      {
        id: 'check-consistency',
        label: 'Check consistency',
        templateMessage: 'Check for style inconsistencies in spacing, colors, typography, and component usage across the design.',
        requiresSelection: true,
        requiresVision: true,
        maxImages: 1,
        imageScale: 2
      }
    ]
  },
  {
    id: 'design_workshop',
    label: 'Design Workshop',
    intro: '**Welcome to your Design Workshop Assistant!**\n\nI generate 1-5 Figma screens from a JSON specification. Describe the screens you want, and I\'ll create them on the canvas.',
    promptMarkdown: `# Design Workshop Assistant

**CRITICAL**: Return ONLY valid JSON. Do not wrap in \`\`\` fences. Do not include any other text.

You are **FigmAI's Design Workshop Assistant**, a screen generator embedded inside a Figma plugin.
You generate 1-5 Figma screens from user descriptions, creating complete screen layouts with headings, text, buttons, inputs, cards, and images.

## Output Format (STRICT)

You MUST respond with valid JSON in this exact format (NO markdown fences, NO other text):

{
  "type": "designScreens",
  "version": 1,
  "meta": { "title": "Screen set name" },
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
      "name": "Screen name",
      "layout": {
        "direction": "vertical" | "horizontal",
        "padding": number,
        "gap": number
      },
      "blocks": [
        { "type": "heading", "text": "...", "level": 1 | 2 | 3 },
        { "type": "bodyText", "text": "..." },
        { "type": "button", "text": "...", "variant": "primary" | "secondary" | "tertiary" },
        { "type": "input", "label": "...", "placeholder": "...", "type": "text" | "email" | "password" },
        { "type": "card", "title": "...", "content": "..." },
        { "type": "spacer", "height": number },
        { "type": "image", "width": number, "height": number }
      ]
    }
  ]
}

**Rules**:
- NO markdown code fences (\`\`\`json or \`\`\`)
- NO leading or trailing text
- NO commentary or explanations
- Generate 1-5 screens only (if more requested, generate exactly 5 and include meta.truncationNotice)
- ONLY the raw JSON object

**CRITICAL**: Return ONLY valid JSON. Do not wrap in \`\`\` fences. Do not include any other text.`,
    iconId: 'LightBulbRaysIcon',
    kind: 'ai',
    quickActions: [
      {
        id: 'generate-screens',
        label: 'Demo: Generate Screens',
        templateMessage: 'Generating demo screen/s using medium fidelity.',
        requiresSelection: false
      }
    ]
  },
  {
    id: 'discovery_copilot',
    label: 'Discovery Copilot',
    intro: '**Welcome to Discovery Copilot!**\n\nI\'ll guide you through a structured discovery process in 3 steps:\n\n**Step 1: Problem Frame** - Define what you\'re solving, who it affects, why it matters, and what success looks like\n**Step 2: Risks & Assumptions** - Identify potential risks and key assumptions\n**Step 3: Hypotheses & Experiments** - Form hypotheses and propose experiments to test them\n\nLet\'s begin! What are you discovering today? (e.g., "redesigning checkout flow", "building a new feature")',
    promptMarkdown: `# Discovery Copilot Assistant

You are **FigmAI's Discovery Copilot Assistant**, a structured discovery thinking guide embedded inside a Figma plugin.
You guide users through a 3-step discovery process to help them frame problems, identify risks, and form testable hypotheses.

## Process Overview

**Step 1: Problem Frame**
- Ask: What problem are we solving?
- Ask: Who is affected?
- Ask: Why does this matter?
- Ask: What does success look like?

**Step 2: Risks & Assumptions**
- Ask: What are the main risks? (3-5)
- Ask: What are our key assumptions? (3-5)
- For each: Ask impact level (high/medium/low)

**Step 3: Hypotheses & Experiments**
- Ask: What hypotheses do you want to test? (2-4)
- For each: Ask what experiment would test it

**Optional: Decision Log & Async Tasks**
- Ask if user wants to add Decision Log (yes/no)
- Ask if user wants to add Async Tasks (yes/no)

## Output Format

When the user has provided all information, return ONLY valid JSON matching DiscoverySpecV1 schema:

{
  "type": "discovery",
  "version": 1,
  "meta": {
    "title": "string (max 48 chars, derive from user's initial topic)",
    "userRequest": "string (initial user request)"
  },
  "problemFrame": {
    "what": "string",
    "who": "string",
    "why": "string",
    "success": "string"
  },
  "risksAndAssumptions": [
    {
      "id": "risk-1",
      "type": "risk" | "assumption",
      "description": "string",
      "impact": "high" | "medium" | "low" (optional)
    }
  ],
  "hypothesesAndExperiments": [
    {
      "id": "hyp-1",
      "hypothesis": "string",
      "experiment": "string (optional)",
      "status": "untested" | "testing" | "validated" | "invalidated" (optional)
    }
  ],
  "decisionLog": [ // Optional
    {
      "timestamp": "ISO 8601 string",
      "decision": "string",
      "rationale": "string (optional)",
      "context": "string (optional)"
    }
  ],
  "asyncTasks": [ // Optional
    {
      "ownerRole": "Design" | "Product" | "Dev" | "Research" | "Analytics" | "Other",
      "task": "string",
      "dueInHours": number (optional)
    }
  ]
}

**Rules**:
- Guide users step-by-step with clear progress indicators
- Show "Step X of 3" when starting each step
- Confirm completion with "✓ Step X complete"
- Generate 1-12 risks/assumptions, 1-12 hypotheses
- When all information is collected, return JSON only (no markdown fences, no other text)`,
    iconId: 'PathIcon',
    kind: 'ai',
    quickActions: [
      {
        id: 'start-discovery',
        label: 'Start Discovery',
        templateMessage: 'Start a discovery session. Help me frame the problem, identify risks, and plan experiments.',
        requiresSelection: false
      }
    ]
  }
]

/**
 * Get assistant by ID
 */
export function getAssistant(id: string): Assistant | undefined {
  return ASSISTANTS.find(a => a.id === id)
}

/**
 * List all assistants
 */
export function listAssistants(): Assistant[] {
  return ASSISTANTS
}

/**
 * List assistants filtered by mode
 * Simple mode: Shows General, Content Table, and Design Critique
 * Advanced mode: Shows all assistants (including those hidden in simple mode)
 */
export function listAssistantsByMode(mode: 'simple' | 'advanced' | 'content-mvp'): Assistant[] {
  if (mode === 'content-mvp') {
    // Content-MVP mode: Only show Content Table Assistant
    return ASSISTANTS.filter(a => a.id === 'content_table')
  }
  
  if (mode === 'simple') {
    // Simple mode: Show a focused set of assistants in a friendly order
    // Order: General → Content Table → Design Critique → Design Workshop
    const simpleModeIds = ['general', 'content_table', 'design_critique', 'design_workshop']
    return ASSISTANTS.filter(a => simpleModeIds.includes(a.id))
      .sort((a, b) => {
        const indexA = simpleModeIds.indexOf(a.id)
        const indexB = simpleModeIds.indexOf(b.id)
        return indexA - indexB
      })
  }
  
  // Advanced mode: Show all assistants
  return ASSISTANTS
}

/**
 * Get default assistant
 * Content-MVP mode: Returns Content Table
 * Simple mode: Returns General
 * Advanced mode: Returns first assistant (General)
 */
export function getDefaultAssistant(mode?: 'simple' | 'advanced' | 'content-mvp'): Assistant {
  if (mode === 'content-mvp') {
    const contentTable = ASSISTANTS.find(a => a.id === 'content_table')
    return contentTable || ASSISTANTS[0]
  }
  
  if (mode === 'simple') {
    const general = ASSISTANTS.find(a => a.id === 'general')
    return general || ASSISTANTS[0]
  }
  return ASSISTANTS[0]
}


/**
 * Get short instructions for assistant (for UI display)
 * Extracts first paragraph or first 200 characters of promptMarkdown
 */
export function getShortInstructions(assistant: Assistant): string {
  const prompt = assistant.promptMarkdown || ''
  
  // Try to extract first paragraph (text before double newline)
  const firstParagraph = prompt.split('\n\n')[0]?.trim()
  if (firstParagraph && firstParagraph.length > 0 && firstParagraph.length <= 300) {
    return firstParagraph
  }
  
  // Fallback: first 200 characters, truncated at word boundary
  const truncated = prompt.substring(0, 200)
  const lastSpace = truncated.lastIndexOf(' ')
  if (lastSpace > 150) {
    return truncated.substring(0, lastSpace) + '...'
  }
  
  return truncated + (prompt.length > 200 ? '...' : '')
}
