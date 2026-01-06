/**
 * Request/Response Normalization Utilities
 * Ensures predictable inputs and outputs across all providers
 */

import type { ChatRequest, ImageData, NormalizedMessage, ProviderCapabilities } from './provider'

/**
 * Validate and normalize image data
 * Ensures images are in the correct format for provider consumption
 */
export function normalizeImageData(
  images: ImageData[] | undefined,
  capabilities: ProviderCapabilities
): ImageData[] | undefined {
  if (!images || images.length === 0) {
    return undefined
  }
  
  // If provider doesn't support images, return undefined
  if (!capabilities.supportsImages) {
    return undefined
  }
  
  // Apply max images limit if specified
  let normalized = images
  if (capabilities.maxImages !== undefined && images.length > capabilities.maxImages) {
    normalized = images.slice(0, capabilities.maxImages)
  }
  
  // Validate data URLs
  const validImages: ImageData[] = []
  for (const img of normalized) {
    if (!img.dataUrl || typeof img.dataUrl !== 'string') {
      continue
    }
    
    // Ensure data URL format (basic validation)
    if (!img.dataUrl.startsWith('data:')) {
      continue
    }
    
    validImages.push({
      dataUrl: img.dataUrl,
      name: img.name,
      width: img.width,
      height: img.height
    })
  }
  
  return validImages.length > 0 ? validImages : undefined
}

/**
 * Normalize messages for provider consumption
 * Ensures consistent message format across all providers
 */
export function normalizeMessages(
  messages: Array<{ role: string; content: string }>
): NormalizedMessage[] {
  return messages
    .filter(m => m && m.role && m.content)
    .map(m => ({
      role: normalizeRole(m.role),
      content: String(m.content).trim()
    }))
    .filter(m => m.content.length > 0)
}

/**
 * Normalize role string to valid role
 */
function normalizeRole(role: string): 'user' | 'assistant' | 'system' {
  const normalized = role.toLowerCase().trim()
  if (normalized === 'user' || normalized === 'assistant' || normalized === 'system') {
    return normalized
  }
  // Default to user for unknown roles
  return 'user'
}

/**
 * Prepare request for provider
 * Strips unsupported features based on provider capabilities
 */
export function prepareRequest(
  request: ChatRequest,
  capabilities: ProviderCapabilities
): ChatRequest {
  const normalized: ChatRequest = {
    messages: normalizeMessages(request.messages),
    assistantId: request.assistantId,
    assistantName: request.assistantName,
    quickActionId: request.quickActionId,
    selection: request.selection,
    selectionSummary: request.selectionSummary,
    quickAction: request.quickAction
  }
  
  // Only include images if provider supports them
  normalized.images = normalizeImageData(request.images, capabilities)
  
  return normalized
}

/**
 * Extract text from provider response
 * Handles various response formats and normalizes to string
 */
export function extractResponseText(response: unknown): string {
  if (typeof response === 'string') {
    return response
  }
  
  if (response && typeof response === 'object') {
    const obj = response as Record<string, unknown>
    
    // Try common response fields
    if (typeof obj.text === 'string') {
      return obj.text
    }
    if (typeof obj.content === 'string') {
      return obj.content
    }
    if (typeof obj.message === 'string') {
      return obj.message
    }
    if (typeof obj.response === 'string') {
      return obj.response
    }
    
    // Try nested structures (e.g., OpenAI format)
    if (obj.choices && Array.isArray(obj.choices) && obj.choices.length > 0) {
      const choice = obj.choices[0]
      if (choice && typeof choice === 'object') {
        const choiceObj = choice as Record<string, unknown>
        if (choiceObj.message && typeof choiceObj.message === 'object') {
          const message = choiceObj.message as Record<string, unknown>
          if (typeof message.content === 'string') {
            return message.content
          }
        }
        if (typeof choiceObj.text === 'string') {
          return choiceObj.text
        }
      }
    }
    
    // Fallback: stringify if it's a simple object
    try {
      const stringified = JSON.stringify(response)
      // Only use stringified if it's reasonable length
      if (stringified.length < 1000) {
        return stringified
      }
    } catch {
      // Ignore stringify errors
    }
  }
  
  // Final fallback
  return String(response)
}

/**
 * Strip markdown from text
 * Removes markdown formatting for providers that don't support it
 */
export function stripMarkdown(text: string): string {
  // Remove code blocks
  let stripped = text.replace(/```[\s\S]*?```/g, '')
  
  // Remove inline code
  stripped = stripped.replace(/`[^`]+`/g, (match) => match.slice(1, -1))
  
  // Remove headers
  stripped = stripped.replace(/^#{1,6}\s+(.+)$/gm, '$1')
  
  // Remove bold/italic
  stripped = stripped.replace(/\*\*([^*]+)\*\*/g, '$1')
  stripped = stripped.replace(/\*([^*]+)\*/g, '$1')
  stripped = stripped.replace(/__([^_]+)__/g, '$1')
  stripped = stripped.replace(/_([^_]+)_/g, '$1')
  
  // Remove links but keep text
  stripped = stripped.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
  
  // Remove images
  stripped = stripped.replace(/!\[([^\]]*)\]\([^\)]+\)/g, '')
  
  // Clean up extra whitespace
  stripped = stripped.replace(/\n{3,}/g, '\n\n')
  stripped = stripped.trim()
  
  return stripped
}

