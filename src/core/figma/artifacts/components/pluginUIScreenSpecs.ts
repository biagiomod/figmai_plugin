/**
 * Screen spec builders for rendering FigmAI plugin UI on the Figma stage.
 * Each function returns a DarkDemoNodeSpec tree parameterized by theme tokens.
 *
 * Naming convention for MCP parsing:
 *   Root:  "Screen: <Name>" or "Modal: <Name>"
 *   Sections: descriptive names (e.g., "NavBar", "ChatArea", "InputArea")
 */

import type { DarkDemoNodeSpec } from './darkDemoCardTypes'
import type { UIThemeTokens, RGB } from './pluginUIThemeTokens'
import { PLUGIN_W, PLUGIN_H, CONFIRM_DIALOG_W } from './pluginUISizing'
import { ASSISTANTS_MANIFEST } from '../../../../assistants/assistants.generated'
import { PRESET_INFO, PRESET_COLUMNS } from '../../../contentTable/presets.generated'

const FONT = 'Inter'

function solid(color: RGB): { type: 'SOLID'; color: RGB } {
  return { type: 'SOLID', color }
}

function text(
  characters: string,
  fontSize: number,
  color: RGB,
  style: string = 'Regular',
  align?: 'LEFT' | 'CENTER' | 'RIGHT'
): DarkDemoNodeSpec {
  return {
    type: 'TEXT',
    name: characters.slice(0, 40),
    visual: { fills: [solid(color)] },
    text: {
      characters,
      fontFamily: FONT,
      fontStyle: style,
      fontSize,
      lineHeight: { unit: 'AUTO' },
      textAlignHorizontal: align || 'LEFT'
    }
  }
}

function rect(
  name: string,
  w: number,
  h: number,
  fill: RGB,
  cornerRadius?: number
): DarkDemoNodeSpec {
  return {
    type: 'RECTANGLE',
    name,
    width: w,
    height: h,
    visual: { fills: [solid(fill)], cornerRadius }
  }
}

function separator(t: UIThemeTokens): DarkDemoNodeSpec {
  return rect('Separator', PLUGIN_W, 1, t.border)
}

function buttonSpec(
  label: string,
  fill: RGB,
  textColor: RGB,
  w?: number
): DarkDemoNodeSpec {
  return {
    type: 'FRAME',
    name: `Button: ${label}`,
    width: w,
    layout: {
      mode: 'HORIZONTAL',
      padding: { top: 6, right: 12, bottom: 6, left: 12 },
      itemSpacing: 0,
      sizing: { primary: 'AUTO', counter: 'AUTO' },
      align: 'STRETCH'
    },
    visual: { fills: [solid(fill)], cornerRadius: 4 },
    children: [text(label, 12, textColor, 'Medium', 'CENTER')]
  }
}

// ---------------------------------------------------------------------------
// 1. Main Shell (empty chat state)
// ---------------------------------------------------------------------------
export function mainShellSpec(t: UIThemeTokens): DarkDemoNodeSpec {
  return {
    type: 'FRAME',
    name: 'Screen: Main Shell',
    width: PLUGIN_W,
    height: PLUGIN_H,
    layout: {
      mode: 'VERTICAL',
      padding: { top: 0, right: 0, bottom: 0, left: 0 },
      itemSpacing: 0,
      sizing: { primary: 'FIXED', counter: 'FIXED' }
    },
    visual: { fills: [solid(t.bg)] },
    children: [
      navBar(t),
      {
        type: 'FRAME',
        name: 'ChatArea',
        width: PLUGIN_W,
        height: 490,
        layout: {
          mode: 'VERTICAL',
          padding: { top: 24, right: 16, bottom: 24, left: 16 },
          itemSpacing: 8,
          sizing: { primary: 'FIXED', counter: 'FIXED' },
          align: 'STRETCH'
        },
        visual: { fills: [solid(t.bgSecondary)] },
        children: [
          text('Select an assistant and ask a question,', 12, t.fgSecondary, 'Regular', 'CENTER'),
          text('or use a quick action to get started.', 12, t.fgSecondary, 'Regular', 'CENTER')
        ]
      },
      separator(t),
      {
        type: 'FRAME',
        name: 'QuickActions',
        layout: {
          mode: 'HORIZONTAL',
          padding: { top: 8, right: 12, bottom: 8, left: 12 },
          itemSpacing: 6,
          sizing: { primary: 'AUTO', counter: 'AUTO' },
          align: 'STRETCH'
        },
        visual: { fills: [solid(t.bg)] },
        children: [
          buttonSpec('Generate Table', t.accent, t.accentText),
          buttonSpec('View Table', t.bgSecondary, t.fg)
        ]
      },
      separator(t),
      inputArea(t)
    ]
  }
}

// ---------------------------------------------------------------------------
// 2. Settings Modal
// ---------------------------------------------------------------------------
export function settingsModalSpec(t: UIThemeTokens): DarkDemoNodeSpec {
  const sectionLabel = (label: string) =>
    text(label, 11, t.fgSecondary, 'Medium')

  const inputField = (placeholder: string) => ({
    type: 'FRAME' as const,
    name: `Input: ${placeholder}`,
    layout: {
      mode: 'HORIZONTAL' as const,
      padding: { top: 8, right: 10, bottom: 8, left: 10 },
      itemSpacing: 0,
      sizing: { primary: 'AUTO' as const, counter: 'AUTO' as const },
      align: 'STRETCH' as const
    },
    visual: {
      fills: [solid(t.bg)],
      cornerRadius: 4,
      strokes: [solid(t.border)],
      strokeWeight: 1,
      strokeAlign: 'INSIDE' as const
    },
    children: [text(placeholder, 12, t.fgDisabled)]
  })

  const radioOption = (label: string, selected: boolean) => ({
    type: 'FRAME' as const,
    name: `Radio: ${label}`,
    layout: {
      mode: 'HORIZONTAL' as const,
      padding: { top: 4, right: 0, bottom: 4, left: 0 },
      itemSpacing: 6,
      sizing: { primary: 'AUTO' as const, counter: 'AUTO' as const }
    },
    children: [
      rect(selected ? 'RadioOn' : 'RadioOff', 14, 14, selected ? t.accent : t.bgSecondary, 7),
      text(label, 12, t.fg)
    ]
  })

  return {
    type: 'FRAME',
    name: 'Modal: Settings',
    width: PLUGIN_W,
    layout: {
      mode: 'VERTICAL',
      padding: { top: 20, right: 20, bottom: 20, left: 20 },
      itemSpacing: 16,
      sizing: { primary: 'AUTO', counter: 'FIXED' }
    },
    visual: {
      fills: [solid(t.bgModal)],
      cornerRadius: 8,
      strokes: [solid(t.borderSubtle)],
      strokeWeight: 1,
      strokeAlign: 'INSIDE'
    },
    children: [
      text('Settings', 16, t.fg, 'Bold'),

      // Mode section
      {
        type: 'FRAME',
        name: 'Section: Mode',
        layout: {
          mode: 'VERTICAL',
          padding: { top: 0, right: 0, bottom: 0, left: 0 },
          itemSpacing: 6,
          sizing: { primary: 'AUTO', counter: 'AUTO' },
          align: 'STRETCH'
        },
        children: [
          sectionLabel('Mode'),
          radioOption('Simple', false),
          radioOption('Advanced', true)
        ]
      },

      separator(t),

      // LLM Connection section
      {
        type: 'FRAME',
        name: 'Section: LLM Connection',
        layout: {
          mode: 'VERTICAL',
          padding: { top: 0, right: 0, bottom: 0, left: 0 },
          itemSpacing: 8,
          sizing: { primary: 'AUTO', counter: 'AUTO' },
          align: 'STRETCH'
        },
        children: [
          sectionLabel('LLM Connection'),
          radioOption('Proxy', true),
          radioOption('Internal API', false),
          sectionLabel('Base URL'),
          inputField('https://proxy.example.com'),
          sectionLabel('Default Model'),
          inputField('gpt-4o'),
          buttonSpec('Test Connection', t.bgSecondary, t.fg)
        ]
      },

      separator(t),

      // Footer
      {
        type: 'FRAME',
        name: 'Footer',
        layout: {
          mode: 'HORIZONTAL',
          padding: { top: 0, right: 0, bottom: 0, left: 0 },
          itemSpacing: 8,
          sizing: { primary: 'AUTO', counter: 'AUTO' }
        },
        children: [
          buttonSpec('Cancel', t.bgSecondary, t.fg),
          buttonSpec('Save', t.accent, t.accentText)
        ]
      },

      text('Build 1.0.2', 10, t.fgSecondary)
    ]
  }
}

// ---------------------------------------------------------------------------
// 3. Format Selection Modal (sourced from PRESET_INFO for drift control)
// ---------------------------------------------------------------------------
export function formatSelectionModalSpec(t: UIThemeTokens): DarkDemoNodeSpec {
  const formatBtn = (label: string, enabled: boolean): DarkDemoNodeSpec => ({
    type: 'FRAME',
    name: `Format: ${label}`,
    layout: {
      mode: 'HORIZONTAL',
      padding: { top: 8, right: 12, bottom: 8, left: 12 },
      itemSpacing: 0,
      sizing: { primary: 'AUTO', counter: 'AUTO' },
      align: 'STRETCH'
    },
    visual: {
      fills: [solid(enabled ? t.bgSecondary : t.bg)],
      cornerRadius: 4,
      strokes: [solid(t.border)],
      strokeWeight: 1,
      strokeAlign: 'INSIDE'
    },
    children: [
      text(
        label + (enabled ? '' : ' (Not implemented yet)'),
        12,
        enabled ? t.fg : t.fgDisabled
      )
    ]
  })

  return {
    type: 'FRAME',
    name: 'Modal: Format Selection',
    width: PLUGIN_W,
    layout: {
      mode: 'VERTICAL',
      padding: { top: 16, right: 16, bottom: 16, left: 16 },
      itemSpacing: 8,
      sizing: { primary: 'AUTO', counter: 'FIXED' }
    },
    visual: {
      fills: [solid(t.bgModal)],
      cornerRadius: 8,
      strokes: [solid(t.borderSubtle)],
      strokeWeight: 1,
      strokeAlign: 'INSIDE'
    },
    children: [
      text('What table format do you want?', 14, t.fg, 'Semi Bold'),
      ...PRESET_INFO.map(p => formatBtn(p.label, p.enabled)),
      buttonSpec('Cancel', t.bgSecondary, t.fg)
    ]
  }
}

// ---------------------------------------------------------------------------
// 4. Clear Chat Confirm Modal
// ---------------------------------------------------------------------------
export function clearChatConfirmSpec(t: UIThemeTokens): DarkDemoNodeSpec {
  return {
    type: 'FRAME',
    name: 'Modal: Clear Chat Confirm',
    width: CONFIRM_DIALOG_W,
    layout: {
      mode: 'VERTICAL',
      padding: { top: 20, right: 20, bottom: 20, left: 20 },
      itemSpacing: 16,
      sizing: { primary: 'AUTO', counter: 'FIXED' }
    },
    visual: {
      fills: [solid(t.bgModal)],
      cornerRadius: 8,
      strokes: [solid(t.borderSubtle)],
      strokeWeight: 1,
      strokeAlign: 'INSIDE'
    },
    children: [
      text('Clear chat?', 16, t.fg, 'Bold'),
      text(
        'This will remove all messages. This cannot be undone.',
        12,
        t.fgSecondary
      ),
      {
        type: 'FRAME',
        name: 'Actions',
        layout: {
          mode: 'HORIZONTAL',
          padding: { top: 0, right: 0, bottom: 0, left: 0 },
          itemSpacing: 8,
          sizing: { primary: 'AUTO', counter: 'AUTO' }
        },
        children: [
          buttonSpec('Cancel', t.bgSecondary, t.fg),
          buttonSpec('Clear', t.error, t.accentText)
        ]
      }
    ]
  }
}

// ---------------------------------------------------------------------------
// 5. Assistant Selection Modal (sourced from ASSISTANTS_MANIFEST)
// ---------------------------------------------------------------------------

const TAG_COLORS: Record<string, RGB> = {
  alpha: { r: 0.9, g: 0.55, b: 0.1 },
  beta: { r: 0.3, g: 0.55, b: 0.95 },
  mvp: { r: 0.1, g: 0.7, b: 0.4 }
}

function tagBadge(label: string, variant: string): DarkDemoNodeSpec {
  const color = TAG_COLORS[variant.toLowerCase()] ?? TAG_COLORS.beta
  return {
    type: 'FRAME',
    name: `Tag: ${label}`,
    layout: {
      mode: 'HORIZONTAL',
      padding: { top: 2, right: 6, bottom: 2, left: 6 },
      itemSpacing: 0,
      sizing: { primary: 'AUTO', counter: 'AUTO' }
    },
    visual: { fills: [solid(color)], cornerRadius: 3 },
    children: [text(label, 9, { r: 1, g: 1, b: 1 }, 'Medium')]
  }
}

export function assistantModalSpec(t: UIThemeTokens): DarkDemoNodeSpec {
  const assistantRow = (entry: typeof ASSISTANTS_MANIFEST[number]): DarkDemoNodeSpec => {
    const children: DarkDemoNodeSpec[] = [
      rect('Icon', 20, 20, t.bgSecondary, 4),
      text(entry.label, 12, t.fg)
    ]
    if (entry.tag?.isVisible && entry.tag.label) {
      children.push(tagBadge(entry.tag.label, entry.tag.variant ?? 'beta'))
    }
    return {
      type: 'FRAME',
      name: `Assistant: ${entry.label}`,
      layout: {
        mode: 'HORIZONTAL',
        padding: { top: 6, right: 12, bottom: 6, left: 12 },
        itemSpacing: 8,
        sizing: { primary: 'AUTO', counter: 'AUTO' },
        align: 'STRETCH'
      },
      visual: {
        fills: [solid(t.bg)],
        strokes: [solid(t.borderSubtle)],
        strokeWeight: 1,
        strokeAlign: 'INSIDE'
      },
      children
    }
  }

  return {
    type: 'FRAME',
    name: 'Modal: Assistant Selection',
    width: PLUGIN_W,
    layout: {
      mode: 'VERTICAL',
      padding: { top: 16, right: 0, bottom: 12, left: 0 },
      itemSpacing: 0,
      sizing: { primary: 'AUTO', counter: 'FIXED' }
    },
    visual: {
      fills: [solid(t.bgModal)],
      cornerRadius: 8,
      strokes: [solid(t.borderSubtle)],
      strokeWeight: 1,
      strokeAlign: 'INSIDE'
    },
    children: [
      {
        type: 'FRAME',
        name: 'ModalHeader',
        layout: {
          mode: 'HORIZONTAL',
          padding: { top: 0, right: 16, bottom: 8, left: 16 },
          itemSpacing: 0,
          sizing: { primary: 'AUTO', counter: 'AUTO' },
          align: 'STRETCH'
        },
        children: [
          text('Select an assistant', 14, t.fg, 'Semi Bold')
        ]
      },
      separator(t),
      ...ASSISTANTS_MANIFEST.map(assistantRow),
      separator(t),
      {
        type: 'FRAME',
        name: 'ModalFooter',
        layout: {
          mode: 'HORIZONTAL',
          padding: { top: 8, right: 16, bottom: 0, left: 16 },
          itemSpacing: 0,
          sizing: { primary: 'AUTO', counter: 'AUTO' }
        },
        children: [
          buttonSpec('Close', t.bgSecondary, t.fg)
        ]
      }
    ]
  }
}

// ---------------------------------------------------------------------------
// 6. Analytics Tagging Table (headers from PRESET_COLUMNS)
// ---------------------------------------------------------------------------

const ANALYTICS_SAMPLE_ROWS: string[][] = [
  ['login-screen', '', 'User taps login button', 'tap', 'Button', 'login-submit', 'Login Submit', '', '100%', ''],
  ['login-screen', '', 'User taps forgot password', 'tap', 'TextLink', 'forgot-pw', 'Forgot Password', '', '15%', 'Low priority'],
  ['dashboard', '', 'User views dashboard', 'view', 'Frame', 'dash-view', 'Dashboard View', '', '100%', '']
]

export function analyticsTableSpec(t: UIThemeTokens): DarkDemoNodeSpec {
  const cols = PRESET_COLUMNS['analytics-tagging']
  const headerLabels = cols.map(c => c.label)
  const COL_W = 90
  const ROW_H = 24
  const HEADER_H = 28

  const headerCells: DarkDemoNodeSpec[] = headerLabels.map(label => ({
    type: 'FRAME',
    name: `TH: ${label}`,
    width: COL_W,
    height: HEADER_H,
    layout: {
      mode: 'HORIZONTAL',
      padding: { top: 4, right: 4, bottom: 4, left: 4 },
      itemSpacing: 0,
      sizing: { primary: 'FIXED', counter: 'FIXED' }
    },
    visual: { fills: [solid(t.accent)] },
    children: [text(label, 9, t.accentText, 'Medium')]
  }))

  const headerRow: DarkDemoNodeSpec = {
    type: 'FRAME',
    name: 'TableHeader',
    layout: {
      mode: 'HORIZONTAL',
      padding: { top: 0, right: 0, bottom: 0, left: 0 },
      itemSpacing: 1,
      sizing: { primary: 'AUTO', counter: 'AUTO' }
    },
    children: headerCells
  }

  const bodyRows: DarkDemoNodeSpec[] = ANALYTICS_SAMPLE_ROWS.map((row, ri) => ({
    type: 'FRAME',
    name: `Row ${ri + 1}`,
    layout: {
      mode: 'HORIZONTAL',
      padding: { top: 0, right: 0, bottom: 0, left: 0 },
      itemSpacing: 1,
      sizing: { primary: 'AUTO', counter: 'AUTO' }
    },
    children: headerLabels.map((_, ci) => ({
      type: 'FRAME' as const,
      name: `Cell ${ri + 1}-${ci + 1}`,
      width: COL_W,
      height: ROW_H,
      layout: {
        mode: 'HORIZONTAL' as const,
        padding: { top: 3, right: 4, bottom: 3, left: 4 },
        itemSpacing: 0,
        sizing: { primary: 'FIXED' as const, counter: 'FIXED' as const }
      },
      visual: {
        fills: [solid(ri % 2 === 0 ? t.bg : t.bgSecondary)],
        strokes: [solid(t.borderSubtle)],
        strokeWeight: 1,
        strokeAlign: 'INSIDE' as const
      },
      children: [text(row[ci] ?? '', 9, t.fg)]
    }))
  }))

  return {
    type: 'FRAME',
    name: 'Screen: Analytics Table',
    width: PLUGIN_W,
    height: PLUGIN_H,
    layout: {
      mode: 'VERTICAL',
      padding: { top: 0, right: 0, bottom: 0, left: 0 },
      itemSpacing: 0,
      sizing: { primary: 'FIXED', counter: 'FIXED' }
    },
    visual: { fills: [solid(t.bg)] },
    children: [
      navBar(t),
      {
        type: 'FRAME',
        name: 'TableArea',
        layout: {
          mode: 'VERTICAL',
          padding: { top: 8, right: 4, bottom: 8, left: 4 },
          itemSpacing: 0,
          sizing: { primary: 'AUTO', counter: 'AUTO' },
          align: 'STRETCH'
        },
        visual: { fills: [solid(t.bgSecondary)] },
        children: [headerRow, ...bodyRows]
      },
      separator(t),
      {
        type: 'FRAME',
        name: 'QuickActions',
        layout: {
          mode: 'HORIZONTAL',
          padding: { top: 8, right: 12, bottom: 8, left: 12 },
          itemSpacing: 6,
          sizing: { primary: 'AUTO', counter: 'AUTO' },
          align: 'STRETCH'
        },
        visual: { fills: [solid(t.bg)] },
        children: [
          buttonSpec('Copy Table', t.accent, t.accentText),
          buttonSpec('New Session', t.bgSecondary, t.fg)
        ]
      },
      separator(t),
      disabledInputArea(t)
    ]
  }
}

// ---------------------------------------------------------------------------
// 7. Chat with Messages
// ---------------------------------------------------------------------------
export function chatWithMessagesSpec(t: UIThemeTokens): DarkDemoNodeSpec {
  const userBubble = (msg: string): DarkDemoNodeSpec => ({
    type: 'FRAME',
    name: 'UserMessage',
    layout: {
      mode: 'HORIZONTAL',
      padding: { top: 8, right: 12, bottom: 8, left: 12 },
      itemSpacing: 0,
      sizing: { primary: 'AUTO', counter: 'AUTO' },
      align: 'STRETCH'
    },
    visual: { fills: [solid(t.accent)], cornerRadius: 12 },
    children: [text(msg, 12, t.accentText)]
  })

  const assistantBubble = (msg: string): DarkDemoNodeSpec => ({
    type: 'FRAME',
    name: 'AssistantMessage',
    layout: {
      mode: 'HORIZONTAL',
      padding: { top: 8, right: 12, bottom: 8, left: 12 },
      itemSpacing: 0,
      sizing: { primary: 'AUTO', counter: 'AUTO' },
      align: 'STRETCH'
    },
    visual: {
      fills: [solid(t.bgSecondary)],
      cornerRadius: 12,
      strokes: [solid(t.borderSubtle)],
      strokeWeight: 1,
      strokeAlign: 'INSIDE'
    },
    children: [text(msg, 12, t.fg)]
  })

  return {
    type: 'FRAME',
    name: 'Screen: Chat Active',
    width: PLUGIN_W,
    height: PLUGIN_H,
    layout: {
      mode: 'VERTICAL',
      padding: { top: 0, right: 0, bottom: 0, left: 0 },
      itemSpacing: 0,
      sizing: { primary: 'FIXED', counter: 'FIXED' }
    },
    visual: { fills: [solid(t.bg)] },
    children: [
      navBar(t),
      {
        type: 'FRAME',
        name: 'ChatArea',
        width: PLUGIN_W,
        height: 520,
        layout: {
          mode: 'VERTICAL',
          padding: { top: 12, right: 12, bottom: 12, left: 12 },
          itemSpacing: 8,
          sizing: { primary: 'FIXED', counter: 'FIXED' },
          align: 'STRETCH'
        },
        visual: { fills: [solid(t.bgSecondary)] },
        children: [
          userBubble('Review the selected text content for clarity and tone.'),
          assistantBubble(
            'I reviewed the copy across 4 text layers. Overall the tone is consistent ' +
            'and professional. Two items need attention: the CTA on the hero could be ' +
            'more specific, and the disclaimer uses passive voice.'
          ),
          userBubble('Can you suggest a better CTA?')
        ]
      },
      separator(t),
      inputArea(t)
    ]
  }
}

// ---------------------------------------------------------------------------
// 8. CT-A Table Modal
// ---------------------------------------------------------------------------
export function ctTableModalSpec(t: UIThemeTokens): DarkDemoNodeSpec {
  const universalCols = PRESET_COLUMNS['universal']
  const headers = universalCols.map(c => c.label)
  const COL_W = 90
  const ROW_H = 24
  const HEADER_H = 28

  const sampleRows: string[][] = [
    ['figma.com/...', 'Header/Logo', 'logo-text', 'Brand name', 'Acme Inc.', '', 'hero.brand', '', '', ''],
    ['figma.com/...', 'Header/Nav', 'nav-link', 'Navigation', 'Get Started', 'Consider "Start now"', 'nav.cta', 'PROJ-42', '', '']
  ]

  const headerCells: DarkDemoNodeSpec[] = headers.map(label => ({
    type: 'FRAME',
    name: `TH: ${label}`,
    width: COL_W,
    height: HEADER_H,
    layout: {
      mode: 'HORIZONTAL',
      padding: { top: 4, right: 4, bottom: 4, left: 4 },
      itemSpacing: 0,
      sizing: { primary: 'FIXED', counter: 'FIXED' }
    },
    visual: { fills: [solid(t.accent)] },
    children: [text(label, 9, t.accentText, 'Medium')]
  }))

  const bodyRows: DarkDemoNodeSpec[] = sampleRows.map((row, ri) => ({
    type: 'FRAME',
    name: `Row ${ri + 1}`,
    layout: {
      mode: 'HORIZONTAL',
      padding: { top: 0, right: 0, bottom: 0, left: 0 },
      itemSpacing: 1,
      sizing: { primary: 'AUTO', counter: 'AUTO' }
    },
    children: headers.map((_, ci) => ({
      type: 'FRAME' as const,
      name: `Cell ${ri + 1}-${ci + 1}`,
      width: COL_W,
      height: ROW_H,
      layout: {
        mode: 'HORIZONTAL' as const,
        padding: { top: 3, right: 4, bottom: 3, left: 4 },
        itemSpacing: 0,
        sizing: { primary: 'FIXED' as const, counter: 'FIXED' as const }
      },
      visual: {
        fills: [solid(ri % 2 === 0 ? t.bg : t.bgSecondary)],
        strokes: [solid(t.borderSubtle)],
        strokeWeight: 1,
        strokeAlign: 'INSIDE' as const
      },
      children: [text(row[ci] ?? '', 9, t.fg)]
    }))
  }))

  return {
    type: 'FRAME',
    name: 'Modal: CT-A Table',
    width: PLUGIN_W,
    layout: {
      mode: 'VERTICAL',
      padding: { top: 12, right: 0, bottom: 12, left: 0 },
      itemSpacing: 0,
      sizing: { primary: 'AUTO', counter: 'FIXED' }
    },
    visual: {
      fills: [solid(t.bgModal)],
      cornerRadius: 8,
      strokes: [solid(t.borderSubtle)],
      strokeWeight: 1,
      strokeAlign: 'INSIDE'
    },
    children: [
      {
        type: 'FRAME',
        name: 'ModalHeader',
        layout: {
          mode: 'HORIZONTAL',
          padding: { top: 4, right: 16, bottom: 8, left: 16 },
          itemSpacing: 8,
          sizing: { primary: 'AUTO', counter: 'AUTO' },
          align: 'STRETCH'
        },
        children: [
          text('Evergreen (Universal)', 14, t.fg, 'Semi Bold')
        ]
      },
      {
        type: 'FRAME',
        name: 'TableContainer',
        layout: {
          mode: 'VERTICAL',
          padding: { top: 4, right: 8, bottom: 4, left: 8 },
          itemSpacing: 0,
          sizing: { primary: 'AUTO', counter: 'AUTO' },
          align: 'STRETCH'
        },
        children: [
          {
            type: 'FRAME',
            name: 'TableHeaderRow',
            layout: {
              mode: 'HORIZONTAL',
              padding: { top: 0, right: 0, bottom: 0, left: 0 },
              itemSpacing: 1,
              sizing: { primary: 'AUTO', counter: 'AUTO' }
            },
            children: headerCells
          },
          ...bodyRows
        ]
      },
      separator(t),
      {
        type: 'FRAME',
        name: 'ModalFooter',
        layout: {
          mode: 'HORIZONTAL',
          padding: { top: 8, right: 16, bottom: 0, left: 16 },
          itemSpacing: 8,
          sizing: { primary: 'AUTO', counter: 'AUTO' }
        },
        children: [
          buttonSpec('Copy Table', t.accent, t.accentText),
          buttonSpec('Add to Stage', t.bgSecondary, t.fg),
          buttonSpec('Close', t.bgSecondary, t.fg)
        ]
      }
    ]
  }
}

// ---------------------------------------------------------------------------
// Shared helpers for reusable sub-components
// ---------------------------------------------------------------------------
function navBar(t: UIThemeTokens): DarkDemoNodeSpec {
  return {
    type: 'FRAME',
    name: 'NavBar',
    layout: {
      mode: 'HORIZONTAL',
      padding: { top: 8, right: 12, bottom: 8, left: 12 },
      itemSpacing: 8,
      sizing: { primary: 'AUTO', counter: 'AUTO' },
      align: 'STRETCH'
    },
    visual: {
      fills: [solid(t.bg)],
      strokes: [solid(t.border)],
      strokeWeight: 1,
      strokeAlign: 'INSIDE'
    },
    children: [
      text('Design AI Toolkit', 14, t.fg, 'Bold'),
      text('AI Powered', 10, t.fgSecondary)
    ]
  }
}

function inputArea(t: UIThemeTokens): DarkDemoNodeSpec {
  return {
    type: 'FRAME',
    name: 'InputArea',
    layout: {
      mode: 'HORIZONTAL',
      padding: { top: 8, right: 12, bottom: 8, left: 12 },
      itemSpacing: 8,
      sizing: { primary: 'AUTO', counter: 'AUTO' },
      align: 'STRETCH'
    },
    visual: { fills: [solid(t.bg)] },
    children: [
      {
        type: 'FRAME',
        name: 'InputField',
        layout: {
          mode: 'HORIZONTAL',
          padding: { top: 8, right: 10, bottom: 8, left: 10 },
          itemSpacing: 0,
          sizing: { primary: 'AUTO', counter: 'AUTO' },
          align: 'STRETCH'
        },
        visual: {
          fills: [solid(t.bgSecondary)],
          cornerRadius: 6,
          strokes: [solid(t.border)],
          strokeWeight: 1,
          strokeAlign: 'INSIDE'
        },
        children: [text('Ask a question...', 12, t.fgDisabled)]
      },
      buttonSpec('Send', t.accent, t.accentText)
    ]
  }
}

function disabledInputArea(t: UIThemeTokens): DarkDemoNodeSpec {
  return {
    type: 'FRAME',
    name: 'InputArea (Disabled)',
    layout: {
      mode: 'HORIZONTAL',
      padding: { top: 8, right: 12, bottom: 8, left: 12 },
      itemSpacing: 8,
      sizing: { primary: 'AUTO', counter: 'AUTO' },
      align: 'STRETCH'
    },
    visual: { fills: [solid(t.bg)] },
    children: [
      {
        type: 'FRAME',
        name: 'InputField',
        layout: {
          mode: 'HORIZONTAL',
          padding: { top: 8, right: 10, bottom: 8, left: 10 },
          itemSpacing: 0,
          sizing: { primary: 'AUTO', counter: 'AUTO' },
          align: 'STRETCH'
        },
        visual: {
          fills: [solid(t.bgSecondary)],
          cornerRadius: 6,
          strokes: [solid(t.border)],
          strokeWeight: 1,
          strokeAlign: 'INSIDE'
        },
        children: [text('AI input disabled for this assistant', 12, t.fgDisabled)]
      }
    ]
  }
}

// ---------------------------------------------------------------------------
// Screen registry
// ---------------------------------------------------------------------------

/** All screen spec builders for the preview grid. */
export const PHASE_A_SCREENS: Array<{
  label: string
  build: (t: UIThemeTokens) => DarkDemoNodeSpec
}> = [
  { label: 'Main Shell', build: mainShellSpec },
  { label: 'Settings', build: settingsModalSpec },
  { label: 'Format Selection', build: formatSelectionModalSpec },
  { label: 'Clear Chat Confirm', build: clearChatConfirmSpec },
  { label: 'Assistant Selection', build: assistantModalSpec },
  { label: 'Analytics Table', build: analyticsTableSpec },
  { label: 'Chat Active', build: chatWithMessagesSpec },
  { label: 'CT-A Table', build: ctTableModalSpec }
]
