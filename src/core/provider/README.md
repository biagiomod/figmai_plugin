# Proxy & Providers Architecture

This document describes the proxy and provider system architecture for the Figma assistant platform.

## Overview

The proxy and provider system provides a clean abstraction layer between the Figma plugin and LLM providers. It supports:

- **External LLMs** (e.g., OpenAI via proxy)
- **Internal/Enterprise LLMs** with constraints
- **Text-only and multimodal requests** (images)
- **Strict runtimes** (Figma, Electron, corporate infrastructure)

## Design Principles

1. **Predictable Inputs**: All requests are normalized before sending to providers
2. **Predictable Outputs**: All responses are extracted consistently
3. **Explicit Error Handling**: Structured error types with retry information
4. **Minimal Provider Leakage**: Plugin code doesn't depend on provider-specific details

## Core Components

### Provider Interface (`provider.ts`)

The `Provider` interface defines the contract all providers must implement:

```typescript
interface Provider {
  readonly id: string
  readonly label: string
  readonly isEnabled: boolean
  readonly capabilities: ProviderCapabilities
  sendChat(request: ChatRequest): Promise<string>
  testConnection(): Promise<{ success: boolean; message: string }>
  sendChatStream?(request: ChatRequest): AsyncIterable<string>
}
```

### Provider Capabilities

Each provider declares its capabilities:

```typescript
interface ProviderCapabilities {
  supportsImages: boolean        // Can handle image inputs
  supportsMarkdown: boolean       // Can return markdown responses
  requiresStrictSchema: boolean   // Requires strict JSON schemas
  maxImages?: number              // Max images per request (optional)
}
```

This allows the system to:
- Strip images from requests if provider doesn't support them
- Strip markdown from responses if provider doesn't support it
- Apply strict schema validation when required

### Request Normalization (`normalize.ts`)

The normalization utilities ensure consistent request formatting:

- **`normalizeMessages()`**: Converts messages to standard format, filters invalid roles
- **`normalizeImageData()`**: Validates and limits images based on provider capabilities
- **`prepareRequest()`**: Prepares full request, stripping unsupported features
- **`extractResponseText()`**: Extracts text from various response formats
- **`stripMarkdown()`**: Removes markdown for providers that don't support it

### Error Handling

Structured error types provide predictable error handling:

```typescript
enum ProviderErrorType {
  AUTHENTICATION,    // Auth failures
  NETWORK,           // Connectivity issues
  RATE_LIMIT,        // Rate limiting
  INVALID_REQUEST,   // Bad request format
  PROVIDER_ERROR,    // Provider service errors
  TIMEOUT,           // Request timeouts
  UNKNOWN            // Unexpected errors
}

class ProviderError extends Error {
  type: ProviderErrorType
  statusCode?: number
  responseBody?: string
  retryable?: boolean
}
```

Errors include:
- **Type**: Categorizes the error
- **Retryable**: Indicates if request can be retried
- **Status Code**: HTTP status if applicable
- **Response Body**: Error details from provider

## Proxy Client (`proxy/client.ts`)

The proxy client handles communication with the proxy server:

- **Health Checks**: Tests connectivity without authentication
- **Chat Requests**: Sends normalized requests to proxy
- **Error Handling**: Converts HTTP errors to `ProviderError`
- **Timeout Support**: Handles timeouts gracefully
- **Response Extraction**: Uses normalization utilities for consistent parsing

### Runtime Compatibility

The proxy client is designed for strict runtimes:

- **No browser-only features**: Uses standard `fetch` API
- **AbortController fallback**: Works even if AbortController is unavailable
- **Base64 images**: Uses data URLs compatible with all runtimes
- **JSON-only**: No binary formats that might fail in constrained environments

## Provider Implementations

### ProxyProvider

Routes requests through the proxy server. Supports:
- Images (if backend supports)
- Markdown (if backend supports)
- Flexible schema requirements

### StubProvider

Development provider for testing without API integration. Supports all features for testing.

### ClaudeProvider / CopilotProvider

Placeholder implementations showing how to declare capabilities for different provider types.

## Usage Example

```typescript
// Create provider
const provider = await createProvider('openai')

// Prepare request (automatically normalized)
const request: ChatRequest = {
  messages: [
    { role: 'user', content: 'Hello' }
  ],
  images: [/* image data */],
  assistantId: 'design_critique'
}

// Send request (images stripped if provider doesn't support)
try {
  const response = await provider.sendChat(request)
  // Response is always plain text string
} catch (error) {
  if (error instanceof ProviderError) {
    if (error.isRetryable()) {
      // Can retry
    }
    // Handle based on error.type
  }
}
```

## Request Flow

1. **Plugin** creates `ChatRequest` with messages, images, etc.
2. **Provider** receives request and calls `prepareRequest()` to normalize
3. **Normalization** strips unsupported features based on capabilities
4. **Provider** sends normalized request to backend (proxy or direct)
5. **Response** is extracted using `extractResponseText()`
6. **Markdown** is stripped if provider doesn't support it
7. **Plugin** receives clean text response

## Error Flow

1. **Provider/Proxy** encounters error
2. **Error** is converted to `ProviderError` with type and context
3. **Plugin** receives `ProviderError` with actionable information
4. **UI** displays user-friendly message based on error type
5. **Retry logic** can check `isRetryable()` for automatic retries

## Best Practices

1. **Always use normalization utilities** - Don't manually format requests
2. **Check capabilities** - Don't send images to providers that don't support them
3. **Handle ProviderError** - Use structured error types, not generic Error
4. **Respect retryable flags** - Don't retry non-retryable errors
5. **Use prepareRequest()** - Let the system handle capability-based filtering

## Future Extensions

- **Streaming support**: Implement `sendChatStream()` for real-time responses
- **Schema validation**: Add strict schema validation for providers that require it
- **Image format conversion**: Convert between image formats if needed
- **Caching**: Add response caching for repeated requests
- **Rate limiting**: Client-side rate limiting before sending to provider



