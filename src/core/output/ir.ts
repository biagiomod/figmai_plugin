/**
 * Document Intermediate Representation (IR)
 * Unified format for textual outputs (critiques, instructions, summaries)
 */

export interface InlineSpan {
  start: number
  end: number
  style: 'bold' | 'italic' | 'boldItalic'
}

export type Block =
  | HeadingBlock
  | ParagraphBlock
  | BulletsBlock
  | NumberedBlock
  | CalloutBlock
  | ScorecardBlock

export interface HeadingBlock {
  type: 'heading'
  level: 1 | 2 | 3
  text: string
}

export interface ParagraphBlock {
  type: 'paragraph'
  text: string
  spans?: InlineSpan[]
}

export interface BulletsBlock {
  type: 'bullets'
  items: string[]
}

export interface NumberedBlock {
  type: 'numbered'
  items: string[]
}

export interface CalloutBlock {
  type: 'callout'
  title?: string
  body: string
  tone: 'info' | 'warning' | 'error' | 'success'
}

export interface ScorecardBlock {
  type: 'scorecard'
  score: number
  summary?: string
  wins: string[]
  fixes: string[]
  checklist?: string[]
  notes?: string[]
}

export interface Document {
  blocks: Block[]
}

