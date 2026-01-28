/**
 * Privacy-safe observability helpers for provider requests.
 * Log only provider type + host; never full URL, path, body, or PII.
 */

/**
 * Extract host from URL for logging only. Returns '(unknown)' if URL is invalid.
 */
export function getHostForObservability(url: string): string {
  if (!url || typeof url !== 'string') return '(unknown)'
  try {
    const trimmed = url.trim()
    if (!trimmed) return '(unknown)'
    return new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`).host
  } catch {
    return '(unknown)'
  }
}
