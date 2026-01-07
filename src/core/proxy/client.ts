/**
 * Proxy Client
 * Centralized HTTP client for proxy communication
 */

import { getSettings } from '../settings'
import { ProviderError, ProviderErrorType } from '../provider/provider'
import { extractResponseText } from '../provider/normalize'

const DEBUG = false

function log(...args: unknown[]): void {
  if (DEBUG) {
    console.log('[ProxyClient]', ...args)
  }
}

/**
 * Fetch with optional timeout support
 * Handles cases where AbortController may not be available
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const hasAbort = typeof AbortController !== 'undefined'
  
  if (!hasAbort || !timeoutMs || timeoutMs <= 0) {
    return fetch(url, options)
  }

  const controller = new AbortController()
  const id = setTimeout(() => controller.abort(), timeoutMs)
  try {
    const sanitizedOptions: RequestInit = {
      method: options.method,
      headers: options.headers,
      body: options.body,
      signal: controller.signal
    }
    return await fetch(url, sanitizedOptions)
  } finally {
    clearTimeout(id)
  }
}

/**
 * Convert error to human-readable string
 */
function errorToString(error: unknown): string {
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
 * Proxy API Error
 * Extends ProviderError for consistent error handling
 */
export class ProxyError extends ProviderError {
  constructor(
    message: string,
    type: ProviderErrorType = ProviderErrorType.UNKNOWN,
    statusCode?: number,
    responseBody?: string,
    retryable?: boolean
  ) {
    super(message, type, statusCode, responseBody, retryable)
    this.name = 'ProxyError'
  }
  
  /**
   * Create ProxyError from HTTP response
   */
  static fromResponse(
    status: number,
    statusText: string,
    responseBody?: string
  ): ProxyError {
    let type: ProviderErrorType
    let retryable: boolean | undefined
    
    if (status === 401 || status === 403) {
      type = ProviderErrorType.AUTHENTICATION
      retryable = false
    } else if (status === 429) {
      type = ProviderErrorType.RATE_LIMIT
      retryable = true
    } else if (status >= 400 && status < 500) {
      type = ProviderErrorType.INVALID_REQUEST
      retryable = false
    } else if (status >= 500) {
      type = ProviderErrorType.PROVIDER_ERROR
      retryable = true
    } else {
      type = ProviderErrorType.UNKNOWN
    }
    
    const message = `Proxy request failed: ${status} ${statusText}${responseBody ? `. ${responseBody}` : ''}`
    return new ProxyError(message, type, status, responseBody, retryable)
  }
  
  /**
   * Create ProxyError from network/timeout error
   */
  static fromNetworkError(error: Error): ProxyError {
    if (error.name === 'AbortError') {
      return new ProxyError(
        'Request timeout. The proxy server took too long to respond.',
        ProviderErrorType.TIMEOUT,
        undefined,
        undefined,
        true
      )
    }
    
    return new ProxyError(
      `Failed to communicate with proxy: ${error.message}`,
      ProviderErrorType.NETWORK,
      undefined,
      undefined,
      true
    )
  }
}

/**
 * Proxy Client
 */
export class ProxyClient {
  /**
   * Normalize proxy base URL
   */
  private normalizeProxyBaseUrl(url: string): string {
    return url.trim().replace(/\/+$/, '')
  }

  /**
   * Get auth headers
   */
  private async getAuthHeaders(): Promise<Record<string, string>> {
    const settings = await getSettings()
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
    
    if (settings.authMode === 'shared_token' && settings.sharedToken) {
      headers['X-FigmAI-Token'] = settings.sharedToken
    } else if (settings.authMode === 'session_token' && settings.sessionToken) {
      headers['Authorization'] = `Bearer ${settings.sessionToken}`
    }
    
    return headers
  }

  /**
   * Health check (no auth required)
   */
  async healthCheck(): Promise<{ success: boolean; message: string; latency?: number }> {
    const settings = await getSettings()
    
    if (!settings.proxyBaseUrl) {
      return {
        success: false,
        message: 'Proxy base URL not configured'
      }
    }
    
    const baseUrl = this.normalizeProxyBaseUrl(settings.proxyBaseUrl)
    const url = `${baseUrl}/health`
    
    log('Health check:', url)
    
    try {
      const startTime = Date.now()
      
      const response = await fetchWithTimeout(
        url,
        {
          method: 'GET',
          headers: {
            'Accept': 'application/json'
          }
        },
        5000
      )
      
      const latency = Date.now() - startTime
      
      if (response.ok) {
        try {
          const data = await response.json()
          log('Health check response:', data)
        } catch {
          // Response is not JSON, that's okay
        }
        
        return {
          success: true,
          message: `Connection successful (${latency}ms)`,
          latency
        }
      } else {
        let errorText = ''
        try {
          errorText = await response.text()
        } catch {
          errorText = 'Unable to read error response'
        }
        
        return {
          success: false,
          message: `Connection failed: ${response.status} ${response.statusText}${errorText ? `. ${errorText}` : ''}`
        }
      }
    } catch (error) {
      log('Health check error:', error)
      
      if (error instanceof Error && error.name === 'AbortError') {
        return {
          success: false,
          message: 'Connection timeout. The proxy server took too long to respond.'
        }
      }
      
      return {
        success: false,
        message: `Could not connect to proxy: ${errorToString(error)}`
      }
    }
  }

  /**
   * Send chat request
   */
  async chat(
    messages: Array<{ role: string; content: string }>,
    options: {
      model?: string
      assistantId?: string
      quickActionId?: string
      selectionSummary?: string
      images?: Array<{ dataUrl: string; name?: string; width?: number; height?: number }>
    } = {}
  ): Promise<string> {
    const settings = await getSettings()
    
    if (!settings.proxyBaseUrl) {
      throw new ProxyError('Proxy base URL not configured. Please set it in Settings.')
    }
    
    const baseUrl = this.normalizeProxyBaseUrl(settings.proxyBaseUrl)
    const url = `${baseUrl}/v1/chat`
    
    const headers = await this.getAuthHeaders()
    
    const payload: Record<string, unknown> = {
      model: options.model || settings.defaultModel,
      messages: messages.map(m => ({
        role: m.role,
        content: m.content
      }))
    }
    
    // Add optional fields
    if (options.assistantId) {
      payload.assistantId = options.assistantId
    }
    
    if (options.quickActionId) {
      payload.quickActionId = options.quickActionId
    }
    
    // Enforce JSON output for Design Critique
    // Note: Proxy server should ideally use json_schema with strict schema validation
    // For now, using json_object to ensure JSON-only output
    // Proxy server can upgrade to: response_format: { type: "json_schema", json_schema: { name: "design_crit_scorecard", schema: {...}, strict: true } }
    const isDesignCritique = options.assistantId === 'design_critique' || options.quickActionId === 'give-critique'
    if (isDesignCritique) {
      payload.response_format = { type: 'json_object' }
      log('Enforcing JSON output for Design Critique (json_object mode)')
      console.log('[DC] assistantId=', options.assistantId, 'quickActionId=', options.quickActionId, 'response_format=json_object')
      console.log('[DC] DC_JSON_MODE_ENABLED=true')
    } else {
      console.log('[DC] DC_JSON_MODE_ENABLED=false (not a Design Critique request)')
    }
    
    // Log final request payload for DC (redact large content)
    if (isDesignCritique) {
      const payloadForLog = {
        assistantId: options.assistantId,
        quickActionId: options.quickActionId,
        response_format: payload.response_format,
        model: payload.model,
        messageCount: messages.length,
        hasSelectionSummary: !!options.selectionSummary,
        imageCount: options.images?.length || 0
      }
      console.log('[DC] REQUEST_PAYLOAD', payloadForLog)
    }
    
    if (options.selectionSummary) {
      payload.selectionSummary = options.selectionSummary
      log('Selection summary included:', options.selectionSummary.substring(0, 200) + '...')
    } else {
      log('No selection summary provided')
    }
    
    if (options.images && options.images.length > 0) {
      payload.images = options.images.map(img => ({
        dataUrl: img.dataUrl,
        name: img.name,
        width: img.width,
        height: img.height
      }))
      log(`Images included: ${options.images.length} image(s)`)
      options.images.forEach((img, i) => {
        const preview = img.dataUrl.substring(0, 80) + '...'
        log(`  Image ${i + 1}: ${img.name || 'Unnamed'}, ${img.width}x${img.height}, base64 preview: ${preview}`)
      })
    } else {
      log('No images provided')
    }
    
    log('Chat request:', { 
      url, 
      model: payload.model, 
      messageCount: messages.length, 
      hasSelectionSummary: !!options.selectionSummary,
      imageCount: options.images?.length || 0
    })
    
    try {
      const response = await fetchWithTimeout(
        url,
        {
          method: 'POST',
          headers,
          body: JSON.stringify(payload)
        },
        settings.requestTimeoutMs
      )
      
      if (!response.ok) {
        let errorText = ''
        try {
          errorText = await response.text()
        } catch {
          errorText = 'Unable to read error response'
        }
        
        throw new ProxyError(
          `Proxy request failed: ${response.status} ${response.statusText}${errorText ? `. ${errorText}` : ''}`,
          ProviderErrorType.UNKNOWN,
          response.status,
          errorText
        )
      }
      
      let data: unknown
      try {
        data = await response.json()
      } catch (parseError) {
        // If JSON parsing fails, try to read as text
        try {
          const text = await response.text()
          if (text) {
            return text
          }
        } catch {
          // Ignore text read errors
        }
        throw new ProxyError(
          'Invalid response format from proxy: expected JSON or text',
          ProviderErrorType.INVALID_REQUEST,
          response.status
        )
      }
      
      // Use normalization utility for consistent response extraction
      let responseText = extractResponseText(data)
      if (!responseText) {
        throw new ProxyError(
          'Empty response from proxy',
          ProviderErrorType.INVALID_REQUEST,
          response.status
        )
      }
      
      // Validate JSON for Design Critique actions (non-blocking - plugin will handle fallback)
      const isDesignCritiqueResponse = options.assistantId === 'design_critique' || options.quickActionId === 'give-critique'
      if (isDesignCritiqueResponse) {
        // Log first 120 chars of response for DC requests
        console.log('[DC] RAW_RESPONSE_HEAD', responseText.slice(0, 120))
        console.log('[DC] RAW_RESPONSE_LENGTH', responseText.length)
        
        // Try to parse JSON after stripping code fences
        let jsonString = responseText.trim()
        jsonString = jsonString.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/i, '')
        
        try {
          JSON.parse(jsonString)
          log('Design Critique response validated as JSON')
          console.log('[DC] JSON_VALIDATION', { status: 'PASS' })
        } catch (parseError) {
          // Log warning but don't throw - let plugin handle fallback gracefully
          const errorPreview = responseText.substring(0, 500)
          console.warn('[ProxyClient] Design Critique response is not valid JSON. First 500 chars:', errorPreview)
          log('Design Critique response failed JSON validation - plugin will handle fallback')
          console.log('[DC] JSON_VALIDATION', { status: 'FAIL', error: parseError instanceof Error ? parseError.message : String(parseError) })
          // Note: Proxy server should ideally return 502 for invalid JSON, but client allows fallback
        }
      }
      
      return responseText
    } catch (error) {
      if (error instanceof ProxyError) {
        throw error
      }
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new ProxyError(
            'Request timeout. The proxy server took too long to respond.',
            ProviderErrorType.TIMEOUT
          )
        }
        throw new ProxyError(
          `Failed to communicate with proxy: ${error.message}`,
          ProviderErrorType.NETWORK
        )
      }
      
      throw new ProxyError(
        `Failed to communicate with proxy: ${errorToString(error)}`,
        ProviderErrorType.UNKNOWN
      )
    }
  }
}

// Singleton instance
export const proxyClient = new ProxyClient()

