/**
 * Error Code Categorization
 * 
 * Maps known failures into safe error codes for analytics.
 * No raw stack traces or messages are included unless explicitly sanitized.
 */

export type ErrorCategory =
  | 'provider_network'
  | 'provider_auth'
  | 'provider_rate_limit'
  | 'provider_timeout'
  | 'provider_invalid_response'
  | 'provider_content_filter'
  | 'handler_execution'
  | 'tool_execution'
  | 'settings_load'
  | 'settings_save'
  | 'unknown'

/**
 * Categorize an error into a safe error code
 * 
 * @param error - The error to categorize
 * @returns A safe error category code
 */
export function categorizeError(error: unknown): ErrorCategory {
  if (!error) {
    return 'unknown'
  }

  // Check for ProviderError types
  if (error && typeof error === 'object' && 'type' in error) {
    const errorType = (error as { type: string }).type
    switch (errorType) {
      case 'AUTHENTICATION':
        return 'provider_auth'
      case 'RATE_LIMIT':
        return 'provider_rate_limit'
      case 'NETWORK':
        return 'provider_network'
      case 'TIMEOUT':
        return 'provider_timeout'
      case 'INVALID_REQUEST':
      case 'PROVIDER_ERROR':
        return 'provider_invalid_response'
      case 'CONTENT_FILTER':
      case 'content_filter':
        return 'provider_content_filter'
    }
  }

  // Check for Error instances with known patterns
  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    const name = error.name.toLowerCase()

    if (name.includes('timeout') || message.includes('timeout')) {
      return 'provider_timeout'
    }
    if (name.includes('network') || message.includes('network') || message.includes('fetch')) {
      return 'provider_network'
    }
    if (name.includes('auth') || message.includes('auth') || message.includes('401') || message.includes('403')) {
      return 'provider_auth'
    }
    if (message.includes('rate limit') || message.includes('429')) {
      return 'provider_rate_limit'
    }
    if (message.includes('handler') || message.includes('execution')) {
      return 'handler_execution'
    }
    if (message.includes('tool')) {
      return 'tool_execution'
    }
    if (message.includes('settings')) {
      if (message.includes('load')) {
        return 'settings_load'
      }
      if (message.includes('save')) {
        return 'settings_save'
      }
    }
  }

  return 'unknown'
}
