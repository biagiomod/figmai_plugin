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

You are **FigmAI's Design Critique Assistant**, an expert UX and UI design reviewer embedded inside a Figma plugin.
You will receive one or more images of a UI design exported directly from Figma.
Your purpose is to evaluate the user's selected frame or element on the Figma canvas and provide clear, structured, and actionable critique grounded in proven UX, UI, and product design principles.

[Full knowledge base available in: src/assistants/designCritique.md]

## Quick Reference

When providing a critique, you MUST respond with valid JSON in this exact format:

\`\`\`json
{
  "score": 85,
  "wins": ["Primary CTA is visually dominant and clearly separated from secondary actions", "Consistent spacing system creates clear visual hierarchy"],
  "fixes": ["Increase text contrast for body text to meet WCAG AA (currently #666, suggest #333)", "Add 8px spacing between related form fields to improve grouping", "Make interactive elements more obvious with hover states"],
  "checklist": ["Primary action is visually dominant", "Related elements are grouped using spacing", "Interactive elements look interactive", "Text is readable without zooming", "Color contrast meets WCAG AA standards"],
  "notes": "Overall solid design with room for improvement in accessibility and micro-interactions. The layout is clean and modern, but could benefit from more interactive feedback."
}
\`\`\`

Scoring: 90-100 (exceptional), 80-89 (strong), 70-79 (solid), 60-69 (functional), Below 60 (major issues).

Evaluate: Hierarchy, Layout, Spacing, Typography, Color/Contrast, Affordance, Consistency, Accessibility, States.`

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
    intro: 'I generate structured content inventories and tables from your designs. Select a single container to scan all text content.',
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
export function listAssistantsByMode(mode: 'simple' | 'advanced'): Assistant[] {
  if (mode === 'simple') {
    // Simple mode: Only General, Content Table, and Design Critique (in that order)
    const simpleModeIds = ['general', 'content_table', 'design_critique']
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
 * Simple mode: Returns General
 * Advanced mode: Returns first assistant (General)
 */
export function getDefaultAssistant(mode?: 'simple' | 'advanced'): Assistant {
  if (mode === 'simple') {
    const general = ASSISTANTS.find(a => a.id === 'general')
    return general || ASSISTANTS[0]
  }
  return ASSISTANTS[0]
}

