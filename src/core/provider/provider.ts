import type { SelectionState } from '../types'

/**
 * Image data for vision-enabled requests
 * Base64 data URLs are used for compatibility across strict runtimes
 */
export interface ImageData {
  dataUrl: string
  name?: string
  width?: number
  height?: number
}

/**
 * Provider capabilities
 * Declares what features a provider supports
 */
export interface ProviderCapabilities {
  /**
   * Whether this provider supports image/multimodal inputs
   * If false, images will be stripped from requests
   */
  readonly supportsImages: boolean
  
  /**
   * Whether this provider supports markdown in responses
   * If false, markdown should be stripped or converted to plain text
   */
  readonly supportsMarkdown: boolean
  
  /**
   * Whether this provider requires strict JSON schemas
   * If true, responses must conform to exact schemas
   */
  readonly requiresStrictSchema: boolean
  
  /**
   * Maximum number of images supported per request
   * undefined means no limit
   */
  readonly maxImages?: number
  
  /**
   * Whether this provider supports preamble injection
   * If true, assistant context preamble can be prepended to first message string
   * Default: false (Proxy mode disabled, Internal API enabled)
   */
  readonly supportsPreambleInjection?: boolean
}

/**
 * Normalized chat message
 * All providers receive messages in this format
 */
export interface NormalizedMessage {
  role: 'user' | 'assistant' | 'system'
  content: string
}

/**
 * Chat request payload
 * Normalized input contract for all providers
 */
export interface ChatRequest {
  messages: NormalizedMessage[]
  assistantId?: string
  assistantName?: string
  quickActionId?: string
  selection?: SelectionState
  selectionSummary?: string
  images?: ImageData[]
  quickAction?: string
}

/**
 * Chat response
 * Normalized output contract from all providers
 */
export interface ChatResponse {
  /**
   * The text content of the response
   */
  text: string
  
  /**
   * Whether the response contains markdown
   * Providers that don't support markdown should set this to false
   */
  containsMarkdown?: boolean
  
  /**
   * Raw response from provider (for debugging)
   * Should not be exposed to UI layer
   */
  raw?: unknown
}

/**
 * Provider error types
 * Standardized error categories for predictable handling
 */
export enum ProviderErrorType {
  /** Authentication/authorization failure */
  AUTHENTICATION = 'authentication',
  /** Network/connectivity issues */
  NETWORK = 'network',
  /** Rate limiting or quota exceeded */
  RATE_LIMIT = 'rate_limit',
  /** Invalid request format or parameters */
  INVALID_REQUEST = 'invalid_request',
  /** Provider service error */
  PROVIDER_ERROR = 'provider_error',
  /** Timeout */
  TIMEOUT = 'timeout',
  /** Unknown/unexpected error */
  UNKNOWN = 'unknown'
}

/**
 * Provider error
 * Structured error with type and context
 */
export class ProviderError extends Error {
  constructor(
    message: string,
    public readonly type: ProviderErrorType,
    public readonly statusCode?: number,
    public readonly responseBody?: string,
    public readonly retryable?: boolean
  ) {
    super(message)
    this.name = 'ProviderError'
  }
  
  /**
   * Check if error is retryable
   */
  isRetryable(): boolean {
    if (this.retryable !== undefined) {
      return this.retryable
    }
    // Default retryable logic
    return this.type === ProviderErrorType.NETWORK || 
           this.type === ProviderErrorType.TIMEOUT ||
           (this.type === ProviderErrorType.PROVIDER_ERROR && 
            this.statusCode !== undefined && 
            this.statusCode >= 500)
  }
}

/**
 * Convert an error to a user-friendly string message
 * Handles ProviderError, Error, HTTP responses, and unknown types
 */
export function errorToString(error: unknown): string {
  // Handle ProviderError (includes ProxyError which extends it)
  if (error instanceof ProviderError) {
    // Provide actionable error messages based on error type
    switch (error.type) {
      case ProviderErrorType.AUTHENTICATION:
        return 'Authentication failed. Please check your token in Settings.'
      case ProviderErrorType.RATE_LIMIT:
        return 'Rate limit exceeded. Please try again in a moment.'
      case ProviderErrorType.NETWORK:
        return `Network error: ${error.message}`
      case ProviderErrorType.TIMEOUT:
        return 'Request timeout. The server took too long to respond. Please try again.'
      case ProviderErrorType.INVALID_REQUEST:
        return `Invalid request: ${error.message}`
      case ProviderErrorType.PROVIDER_ERROR:
        if (error.statusCode && error.statusCode >= 500) {
          return `Server error (${error.statusCode}): The server encountered an error. Please try again later.`
        }
        return `Provider error: ${error.message}`
      default:
        return error.message
    }
  }
  
  if (error instanceof Error) {
    return error.message
  }
  
  if (error && typeof error === 'object' && 'status' in error && 'statusText' in error) {
    const response = error as { status: number; statusText: string }
    return `HTTP ${response.status}: ${response.statusText}`
  }
  
  if (error && typeof error === 'object') {
    try {
      const stringified = JSON.stringify(error, null, 2)
      return stringified.length > 500 ? stringified.substring(0, 500) + '...' : stringified
    } catch {
      return String(error)
    }
  }
  
  return String(error)
}

/**
 * Provider interface for LLM integration
 * All providers must implement this interface
 */
export interface Provider {
  /**
   * Provider identifier
   */
  readonly id: string
  
  /**
   * Human-readable label
   */
  readonly label: string
  
  /**
   * Whether this provider is enabled/available
   */
  readonly isEnabled: boolean
  
  /**
   * Provider capabilities
   * Declares what features this provider supports
   */
  readonly capabilities: ProviderCapabilities
  
  /**
   * Send a chat request to the provider
   * Returns a normalized response
   * 
   * Providers should:
   * - Strip images if not supported
   * - Normalize messages to expected format
   * - Handle errors and throw ProviderError
   * - Return clean text responses
   */
  sendChat(request: ChatRequest): Promise<string>
  
  /**
   * Test connection to the provider
   * Returns success status and message
   */
  testConnection(): Promise<{ success: boolean; message: string }>
  
  /**
   * Optional: Send a chat request with streaming support
   * Returns an async iterable of response chunks
   */
  sendChatStream?(request: ChatRequest): AsyncIterable<string>
}
