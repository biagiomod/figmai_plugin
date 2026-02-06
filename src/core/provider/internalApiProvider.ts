/** 
 * Internal API Provider
 * Implements LLM access via organization's Internal API
 * Uses session-based authentication (browser cookies)
 */

import type { Provider, ChatRequest, ProviderCapabilities, TestConnectionOptions } from './provider'
import { ProviderError, ProviderErrorType, errorToString } from './provider'
import { getEffectiveSettings } from '../settings'
import { CONFIG } from '../config'
import { debug } from '../debug/logger'
import { getHostForObservability } from './observability'

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
 * Detect Azure/OpenAI content-filter style 400 response from body (conservative).
 * Do not retry when this returns true.
 */
function isContentFilterResponse(body: string): boolean {
  const lower = body.toLowerCase()
  return (
    lower.includes('content_filter') ||
    lower.includes('content filtering') ||
    lower.includes('content policy') ||
    lower.includes('content filter')
  )
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
     * Supports preamble injection for assistant context boundaries
     */
    readonly capabilities: ProviderCapabilities = {
        supportsImages: false, // Internal API MVP doesn't support images
        supportsMarkdown: true,
        requiresStrictSchema: false,
        maxImages: 0,
        supportsPreambleInjection: true // Enable preamble injection for assistant context boundaries
    }

    /**
     * Normalize Internal API URL
     */
    private normalizeInternalApiUrl(url: string): string {
        return url.trim().replace(/\/+$/, '')
    }

    /**
     * Clean JSON string by parsing and re-stringifying
     * This escapes control characters (like literal newlines) that would break JSON.parse()
     * 
     * @param str The string to clean (may be JSON or plain text)
     * @returns Cleaned JSON string if input was JSON, otherwise original string unchanged
     */
    private cleanJsonString(str: string): string {
        const trimmed = str.trim();
        
        // Only process if it looks like JSON (starts with { or [)
        if (!trimmed.startsWith('{') && !trimmed.startsWith('[')) {
            return str; // Return original if not JSON-like
        }

        // Escape control characters BEFORE parsing
        const escaped = trimmed
            .replace(/\n/g, '\\n')
            .replace(/\r/g, '\\r')
            .replace(/\t/g, '\\t');


        try {
            const parsed = JSON.parse(escaped);

            // If parsed is a wrapper with 'result' field containing a string, extract it
            if (parsed && typeof parsed === 'object' && 'result' in parsed) {
                if (typeof parsed.result === 'string') {
                    return parsed.result; // Return the inner string
                }
            }

            return JSON.stringify(parsed);
        } catch {
            // If parsing fails, return original string unchanged
            return str;
        }


    }

    /**
     * Extract assistant text from Internal API response
     * Simplified version based on proven old plugin logic
     * 
     * LLM Suite returns responses in two formats:
     * Format A: { "Prompts": [ { "ResponseFromAssistant": "<text>" } ] }
     * Format B: { "result": "<text>" } OR { "result": { ... } }
     * 
     * Key behavior:
     * - Prioritizes Format A (Prompts[0].ResponseFromAssistant) when present
     * - Falls back to Format B (result field)
     * - Returns strings as-is (including JSON-encoded strings)
     * - JSON.stringify ONLY when result is an actual object
     * - No recursion, depth limits, or speculative parsing
     * - Assistants remain responsible for their own JSON parsing
     * 
     * @param response The response data (can be object, string, etc.)
     * @returns Extracted text string or null if nothing found
     */
    private extractInternalApiAssistantText(response: unknown): string | null {
        // Handle null/undefined
        if (!response) {
            return null;
        }

        // If response is a string, return it directly
        if (typeof response === 'string') {
            const trimmed = response.trim();
            return trimmed.length > 0 ? this.cleanJsonString(trimmed) : null;
        }

        // If response is not an object, convert to string
        if (typeof response !== 'object' || Array.isArray(response)) {
            // Arrays are not a valid response format - return null
            if (Array.isArray(response)) {
                return null;
            }
            return String(response);
        }

        const responseObj = response as Record<string, unknown>;

        // Format A: Prompts[0].ResponseFromAssistant (priority check)
        if (responseObj.Prompts && Array.isArray(responseObj.Prompts) && responseObj.Prompts.length > 0) {
            const firstPrompt = responseObj.Prompts[0] as Record<string, unknown>;
            if (firstPrompt && typeof firstPrompt.ResponseFromAssistant === 'string') {
                return this.cleanJsonString(firstPrompt.ResponseFromAssistant);
            }
        }

        // Format B: result field (fallback)
        if ('result' in responseObj && responseObj.result != null) {
            // If result is a string, clean it (may contain unescaped control characters)
            if (typeof responseObj.result === 'string') {
                return this.cleanJsonString(responseObj.result);
            }

            // If result is an object, stringify it (for JSON responses like Design Critique)
            if (typeof responseObj.result === 'object' && !Array.isArray(responseObj.result)) {
                try {
                    return JSON.stringify(responseObj.result, null, 2);
                } catch {
                    return String(responseObj.result);
                }
            }

            // Arrays in result are not a valid format - return null
            if (Array.isArray(responseObj.result)) {
                return null;
            }

            // Otherwise convert to string
            return String(responseObj.result);
        }

        // No recognized format found
        return null;
    }

    /**
     * Send chat request to Internal API
     */
    async sendChat(request: ChatRequest): Promise<string> {
        const settings = await getEffectiveSettings()

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

        const MAX_SELECTION_CHARS = 6000
        const selectionText = (request.selectionSummary ?? '').trim()
        const selectionInPayload = selectionText.length > 0
        const message = selectionInPayload
            ? userMessages + '\n\nSelection context (from Figma):\n' + selectionText.slice(0, MAX_SELECTION_CHARS)
            : userMessages

        const payload: Record<string, string> = {
            type: 'generalChat',
            message
        }
        if (!request.minimalForContentFilter) {
            payload.kbName = 'figma'
        }

        const url = baseUrl
        const providerDebug = debug.scope('subsystem:provider')
        // Privacy-safe: log only provider type + host (no URL path, body, or PII)
        providerDebug.log('request_route', { provider: 'internal-api', host: getHostForObservability(url) })
        providerDebug.log('Sending request', {
            provider: 'internal-api',
            messageLength: message.length,
            hasSelectionSummary: !!request.selectionSummary,
            selectionInPayload: selectionInPayload ? 1 : 0
        })

        const maxRetries = 2
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {
                const response = await fetchWithTimeout(
                    url,
                    {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
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
                } else if (response.status === 400) {
                    if (isContentFilterResponse(errorText)) {
                        throw new ProviderError(
                            'Response was blocked by content policy. Try rephrasing or simplifying the request.',
                            ProviderErrorType.CONTENT_FILTER,
                            response.status,
                            errorText,
                            false
                        )
                    }
                    throw new ProviderError(
                        `Could not connect to Internal API. Please check your network connection and ensure you're on your organization network.`,
                        ProviderErrorType.INVALID_REQUEST,
                        response.status,
                        errorText,
                        false
                    )
                } else if (response.status === 0 || response.status >= 400) {
                    const isCorsError = response.status === 0
                    throw new ProviderError(
                        isCorsError
                            ? 'CORS error: The request was blocked. Please verify the origin is in manifest.json networkAccess.allowedDomains and the server allows requests from Figma.'
                            : `Could not connect to Internal API. Please check your network connection and ensure you're on your organization network.`,
                        ProviderErrorType.NETWORK,
                        response.status,
                        errorText,
                        false
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
            let responseText: string | null = null

            try {
                // Try to parse as JSON first
                data = await response.json()
                // Extract using helper function
                responseText = this.extractInternalApiAssistantText(data)
            } catch (parseError) {
                // If JSON parsing fails, try to read as text
                try {
                    const text = await response.text()
                    if (text) {
                        // Try to extract from text (which might be a JSON-encoded string)
                        responseText = this.extractInternalApiAssistantText(text)
                        // If extraction failed, return the text as-is (plain text response)
                        if (!responseText) {
                            return text
                        }
                    }
                } catch {
                    // Ignore text read errors
                }

                // If we still don't have a response text, throw error
                if (!responseText) {
                    throw new ProviderError(
                        'Invalid response format from Internal API: expected JSON or text',
                        ProviderErrorType.INVALID_REQUEST,
                        response.status
                    )
                }
            }

            // If extraction returned null, try to get a fallback
            if (!responseText) {
                // If data is a string, return it
                if (typeof data === 'string') {
                    return data
                }

                // If data is an object without wrappers, return pretty-printed JSON
                if (data && typeof data === 'object') {
                    try {
                        return JSON.stringify(data, null, 2)
                    } catch {
                        // Fall through to error
                    }
                }

                const providerDebug = debug.scope('subsystem:provider')
                providerDebug.error('Invalid response format', { provider: 'internal-api', data })
                throw new ProviderError(
                    'Invalid response format from Internal API: expected Prompts array or result field',
                    ProviderErrorType.INVALID_REQUEST,
                    response.status
                )
            }

            return responseText
        } catch (error) {
            const err = error instanceof ProviderError ? error : null
            const isRetryable = err ? err.isRetryable() : true
            if (attempt < maxRetries && isRetryable) {
                const delayMs = attempt === 0 ? 1000 : 2000
                await new Promise((r) => setTimeout(r, delayMs))
                continue
            }
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
        throw new ProviderError(
            'Internal API request failed after retries.',
            ProviderErrorType.UNKNOWN
        )
    }

    /**
     * Test connection to Internal API.
     * Uses options.internalApiUrl if provided (e.g. test unsaved URL); otherwise reads from settings.
     */
    async testConnection(options?: TestConnectionOptions): Promise<{
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
        const urlToTest = options?.internalApiUrl || (await getEffectiveSettings()).internalApiUrl

        if (!urlToTest) {
            return {
                success: false,
                message: 'Internal API URL not configured'
            }
        }

        const url = this.normalizeInternalApiUrl(urlToTest)
        const payload = {
            type: 'generalChat',
            message: 'test',
            kbName: 'figma'
            //   knowledgeBase: 'general',
            //   knowledgeBaseSelect: 'general',
            //   assistant: 'general'
        }

        // Get settings for timeout (always needed)
        const settings = await getEffectiveSettings()

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
