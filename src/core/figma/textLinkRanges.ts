export interface LinkedCellTextRange {
  characters: string
  linkStart: number
  linkEnd: number
}

/**
 * Build stage cell characters and deterministic hyperlink range.
 * When suffix exists, link applies only to the first line (`text`).
 */
export function buildLinkedCellText(text: string, suffix?: string): LinkedCellTextRange {
  const baseText = String(text || '')
  const hasSuffix = typeof suffix === 'string' && suffix.length > 0
  return {
    characters: hasSuffix ? `${baseText}\n${suffix}` : baseText,
    linkStart: 0,
    linkEnd: baseText.length
  }
}
