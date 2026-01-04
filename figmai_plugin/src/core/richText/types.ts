/**
 * Rich Text AST Types
 * Structured representation of parsed Markdown-like content
 */

export type RichTextNode =
  | { type: 'heading'; level: 1 | 2 | 3; text: string }
  | { type: 'paragraph'; text: string; inline?: InlineNode[] }
  | { type: 'list'; ordered: boolean; items: InlineNode[][] }
  | { type: 'code'; inline: boolean; text: string }
  | { type: 'quote'; text: string; inline?: InlineNode[] }
  | { type: 'score'; value: number; max?: number; label?: string }
  | { type: 'divider' }
  | { type: 'scorecard'; score: number; max?: number; wins?: string[]; fixes?: string[]; checklist?: string[]; notes?: string }
  | { type: 'strengths'; items: string[] }
  | { type: 'issues'; items: string[] }
  | { type: 'recommendations'; items: string[] }
  | { type: 'warning'; title?: string; message: string }
  | { type: 'nextSteps'; items: string[] }

export type InlineNode =
  | { type: 'text'; text: string }
  | { type: 'bold'; text: string }
  | { type: 'italic'; text: string }
  | { type: 'code'; text: string }
  | { type: 'link'; text: string; url: string }

