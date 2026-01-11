/**
 * Internal API Provider
 * Implements LLM access via organization's Internal API
 * Uses session-based authentication (browser cookies)
 */

import type { Provider, ChatRequest, ProviderCapabilities } from './provider'
import { ProviderError, ProviderErrorType } from './provider'
import { getSettings } from '../settings'
import { CONFIG } from '../config'

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
      // Note: credentials intentionally omitted to match curl behavior and avoid CORS issues
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
 * Internal API Provider
 * Handles requests to organization's Internal API with session-based auth
 */
export class InternalApiProvider implements Provider {
  readonly id = 'internal-api'
  readonly label = 'Internal API'
  readonly isEnabled = true
  
  /**
   * Internal API provider capabilities
   * Supports markdown (capabilities determined by backend)
   */
  readonly capabilities: ProviderCapabilities = {
    supportsImages: false, // Internal API MVP doesn't support images
    supportsMarkdown: true,
    requiresStrictSchema: false,
    maxImages: 0
  }

  /**
   * Normalize Internal API URL
   */
  private normalizeInternalApiUrl(url: string): string {
    return url.trim().replace(/\/+$/, '')
  }

  /**
   * Send chat request to Internal API
   */
  async sendChat(request: ChatRequest): Promise<string> {
    const settings = await getSettings()
    
    if (!settings.internalApiUrl) {
      throw new ProviderError(
        'Internal API URL not configured. Please set it in Settings.',
        ProviderErrorType.INVALID_REQUEST
      )
    }
    
    const baseUrl = this.normalizeInternalApiUrl(settings.internalApiUrl)
    
    // Combine messages into a single message string
    // Internal API expects a single message, not an array
    const userMessages = request.messages
      .filter(m => m.role === 'user')
      .map(m => m.content)
      .join('\n\n')
    
    if (!userMessages) {
      throw new ProviderError(
        'No user message found in request',
        ProviderErrorType.INVALID_REQUEST
      )
    }
    
    const payload = {
      type: 'generalChat',
      message: userMessages
    }
    
    const url = baseUrl
    
    if (CONFIG.dev.enableSyncApiErrorDetection) {
      console.log('[InternalApiProvider] Sending request:', {
        url,
        messageLength: userMessages.length,
        hasSelectionSummary: !!request.selectionSummary
      })
    }
    
    try {
      const response = await fetchWithTimeout(
        url,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
          // Note: credentials omitted to match curl behavior and avoid CORS issues
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
        
        // Map HTTP status codes to user-friendly messages
        if (response.status === 401) {
          throw new ProviderError(
            'Authentication failed. Please ensure you\'re connected to your organization network. If this persists, try using Proxy mode instead.',
            ProviderErrorType.AUTHENTICATION,
            response.status,
            errorText,
            false
          )
        } else if (response.status === 500) {
          throw new ProviderError(
            'Service unavailable. The Internal API is temporarily unavailable. Please try again later or contact your administrator.',
            ProviderErrorType.PROVIDER_ERROR,
            response.status,
            errorText,
            true
          )
        } else if (response.status === 0 || response.status >= 400) {
          // CORS or network errors
          const isCorsError = response.status === 0
          throw new ProviderError(
            isCorsError
              ? 'CORS error: The request was blocked. Please verify the origin is in manifest.json networkAccess.allowedDomains and the server allows requests from Figma.'
              : `Could not connect to Internal API. Please check your network connection and ensure you're on your organization network.`,
            ProviderErrorType.NETWORK,
            response.status,
            errorText,
            true
          )
        } else {
          throw new ProviderError(
            `Internal API request failed: ${response.status} ${response.statusText}${errorText ? `. ${errorText.substring(0, 200)}` : ''}`,
            ProviderErrorType.UNKNOWN,
            response.status,
            errorText
          )
        }
      }
      
      let data: unknown
      try {
        data = await response.json()
      } catch (parseError) {
        // If JSON parsing fails, try to read as text
        try {
          const text = await response.text()
          if (text) {
            // Try to parse as JSON again
            try {
              data = JSON.parse(text)
            } catch {
              // Return as plain text if not JSON
              return text
            }
          }
        } catch {
          // Ignore text read errors
        }
        throw new ProviderError(
          'Invalid response format from Internal API: expected JSON or text',
          ProviderErrorType.INVALID_REQUEST,
          response.status
        )
      }
      
      // Parse response - support both format A and format B
      // Format A (preferred): { "Prompts": [ { "ResponseFromAssistant": "<text>" } ] }
      // Format B (fallback): { "result": "<text>" }
      let responseText: string | undefined
      
      if (data && typeof data === 'object') {
        const responseObj = data as Record<string, unknown>
        
        // Try format A first
        if (responseObj.Prompts && Array.isArray(responseObj.Prompts) && responseObj.Prompts.length > 0) {
          const firstPrompt = responseObj.Prompts[0] as Record<string, unknown>
          if (firstPrompt && typeof firstPrompt.ResponseFromAssistant === 'string') {
            responseText = firstPrompt.ResponseFromAssistant
          }
        }
        
        // Fall back to format B if format A didn't work
        if (!responseText && typeof responseObj.result === 'string') {
          responseText = responseObj.result
        }
      }
      
      if (!responseText) {
        if (CONFIG.dev.enableSyncApiErrorDetection) {
          console.error('[InternalApiProvider] Invalid response format:', data)
        }
        throw new ProviderError(
          'Invalid response format from Internal API: expected Prompts array or result field',
          ProviderErrorType.INVALID_REQUEST,
          response.status
        )
      }
      
      return responseText
    } catch (error) {
      if (error instanceof ProviderError) {
        throw error
      }
      
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          throw new ProviderError(
            'Request timeout. The Internal API took too long to respond.',
            ProviderErrorType.TIMEOUT,
            undefined,
            undefined,
            true
          )
        }
        throw new ProviderError(
          `Failed to communicate with Internal API: ${error.message}`,
          ProviderErrorType.NETWORK,
          undefined,
          undefined,
          true
        )
      }
      
      throw new ProviderError(
        `Failed to communicate with Internal API: ${errorToString(error)}`,
        ProviderErrorType.UNKNOWN
      )
    }
  }

  /**
   * Test connection to Internal API
   * Returns diagnostic information for debugging
   * @param internalApiUrl Optional URL to test. If not provided, reads from settings.
   */
  async testConnection(internalApiUrl?: string): Promise<{ 
    success: boolean
    message: string
    diagnostics?: {
      url: string
      method: string
      headers?: Record<string, string>
      credentials?: string
      statusCode?: number
      responseBody?: string
      errorName?: string
      errorMessage?: string
    }
  }> {
    // Use provided URL or fall back to settings
    const urlToTest = internalApiUrl || (await getSettings()).internalApiUrl
    
    if (!urlToTest) {
      return {
        success: false,
        message: 'Internal API URL not configured'
      }
    }
    
    const url = this.normalizeInternalApiUrl(urlToTest)
    const payload = {
      type: 'generalChat',
      message: 'test'
    }
    
    // Get settings for timeout (always needed)
    const settings = await getSettings()
    
    const requestOptions: RequestInit = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
      // Note: credentials omitted to match curl behavior and avoid CORS issues
    }
    
    try {
      const response = await fetchWithTimeout(
        url,
        requestOptions,
        settings.requestTimeoutMs
      )
      
      // Try to read response body
      let responseBody = ''
      let statusCode = response.status
      
      try {
        const text = await response.text()
        responseBody = text.substring(0, 300) // First 300 chars
        // Try to parse as JSON to get a cleaner view
        try {
          const json = JSON.parse(text)
          responseBody = JSON.stringify(json).substring(0, 300)
        } catch {
          // Keep as text if not JSON
        }
      } catch {
        responseBody = 'Unable to read response body'
      }
      
      // Build diagnostics with request options
      const diagnostics = {
        url,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'none' as const, // Explicitly show credentials are not used
        statusCode,
        responseBody
      }
      
      if (!response.ok) {
        return {
          success: false,
          message: `Connection failed: ${response.status} ${response.statusText}`,
          diagnostics
        }
      }
      
      // Success
      return {
        success: true,
        message: `Connection successful. Response received.`,
        diagnostics
      }
    } catch (error) {
      // Fetch error - likely CORS or network issue
      const errorName = error instanceof Error ? error.name : 'Unknown'
      const errorMessage = error instanceof Error ? error.message : errorToString(error)
      
      let userMessage = `Connection test failed: ${errorMessage}`
      if (errorName === 'TypeError' && errorMessage.includes('fetch')) {
        userMessage += '\n\nThis is commonly caused by CORS or a missing/incorrect networkAccess.allowedDomains origin in manifest.json.'
      }
      
      return {
        success: false,
        message: userMessage,
        diagnostics: {
          url,
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          credentials: 'none' as const, // Explicitly show credentials are not used
          errorName,
          errorMessage
        }
      }
    }
  }
  
  /**
   * Streaming not implemented yet
   */
  async *sendChatStream(request: ChatRequest): AsyncIterable<string> {
    const response = await this.sendChat(request)
    yield response
  }
}
