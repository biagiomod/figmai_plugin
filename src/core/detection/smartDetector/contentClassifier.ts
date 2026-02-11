/**
 * Smart Detector content classifier.
 * Maps content-table roles (CTA/Headline/Body/Helper/Placeholder/Tooltip/Error) to ContentKind.
 * Adds keyword lists for legal/terms/privacy/consent and placeholder patterns.
 */

import { getDetectorContentClassifierConfig } from '../../../custom/config'
import type { DetectedContent, ContentKind, Confidence } from './types'

/** Content-table style role inference (mirrors contentTable/scanner inferFieldRole). */
function inferFieldRole(node: TextNode): string | undefined {
  const name = (node.name ?? '').toLowerCase()
  const content = (node.characters ?? '').toLowerCase()
  if (name.includes('error') || content.includes('error') || name.includes('invalid')) return 'Error'
  if (name.includes('cta') || name.includes('button') || name.includes('action')) return 'CTA'
  if (name.includes('headline') || name.includes('title') || name.includes('heading')) return 'Headline'
  if (name.includes('placeholder') || content.includes('enter') || content.includes('type')) return 'Placeholder'
  if (name.includes('tooltip') || name.includes('hint')) return 'Tooltip'
  if (name.includes('helper') || name.includes('help') || name.includes('description')) return 'Helper'
  if (name.includes('body') || name.includes('text') || name.includes('content')) return 'Body'
  return undefined
}

const ROLE_TO_CONTENT_KIND: Record<string, ContentKind> = {
  Error: 'error_copy',
  CTA: 'cta_copy',
  Headline: 'heading_copy',
  Placeholder: 'variable_placeholder',
  Tooltip: 'status_message_copy',
  Helper: 'helper_copy',
  Body: 'body_copy'
}

function mapRoleToContentKind(role: string | undefined): ContentKind | undefined {
  if (!role) return undefined
  return ROLE_TO_CONTENT_KIND[role]
}

/** Check if text matches any keyword list (legal, terms, privacy, consent). */
function matchKeywordLists(
  text: string,
  keywordLists: { legal: string[]; terms: string[]; privacy: string[]; consent: string[] }
): { kind: ContentKind; confidence: Confidence } | undefined {
  const lower = text.toLowerCase()
  if (keywordLists.legal.some(k => lower.includes(k.toLowerCase()))) return { kind: 'legal_disclaimer', confidence: 'med' }
  if (keywordLists.terms.some(k => lower.includes(k.toLowerCase()))) return { kind: 'terms_reference', confidence: 'med' }
  if (keywordLists.privacy.some(k => lower.includes(k.toLowerCase()))) return { kind: 'privacy_reference', confidence: 'med' }
  if (keywordLists.consent.some(k => lower.includes(k.toLowerCase()))) return { kind: 'consent_copy', confidence: 'med' }
  return undefined
}

/** Placeholder patterns: numbers-only, XX/XX, {token}, [value], etc. */
function matchPlaceholderPatterns(text: string, patterns: string[]): boolean {
  const trimmed = text.trim()
  if (!trimmed) return false
  for (const p of patterns) {
    try {
      if (new RegExp(p).test(trimmed)) return true
    } catch {
      if (trimmed.toLowerCase().includes(p.toLowerCase())) return true
    }
  }
  if (/^\d+$/.test(trimmed)) return true
  if (/^[A-Za-z0-9_]+$/.test(trimmed) && trimmed.length <= 20) return true
  if (/^\{[^}]+\}$/.test(trimmed) || /^\[[^\]]+\]$/.test(trimmed)) return true
  return false
}

export function classifyContent(nodes: TextNode[]): DetectedContent[] {
  const config = getDetectorContentClassifierConfig()
  const { keywordLists, placeholderPatterns } = config
  const results: DetectedContent[] = []

  for (const node of nodes) {
    const text = String(node.characters ?? '').trim()
    const role = inferFieldRole(node)
    let contentKind: ContentKind
    let confidence: Confidence = 'med'
    const reasons: string[] = []

    const fromKeyword = matchKeywordLists(text, keywordLists)
    if (fromKeyword) {
      contentKind = fromKeyword.kind
      confidence = fromKeyword.confidence
      reasons.push('keyword_list')
    } else if (matchPlaceholderPatterns(text, placeholderPatterns) && !role) {
      contentKind = 'variable_placeholder'
      confidence = 'high'
      reasons.push('placeholder_pattern')
    } else if (role && mapRoleToContentKind(role)) {
      contentKind = mapRoleToContentKind(role)!
      confidence = role === 'Headline' || role === 'Error' ? 'high' : 'med'
      reasons.push(`role:${role}`)
    } else if (text.length === 0) {
      contentKind = 'decorative_copy'
      confidence = 'low'
      reasons.push('empty')
    } else {
      contentKind = 'body_copy'
      confidence = 'low'
      reasons.push('default')
    }

    results.push({
      contentKind,
      confidence,
      reasons,
      text: text.slice(0, 200),
      nodeId: node.id
    })
  }

  return results
}
