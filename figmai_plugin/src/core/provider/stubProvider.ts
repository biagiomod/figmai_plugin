import type { Provider, ChatRequest, ProviderCapabilities } from './provider'
import { prepareRequest, stripMarkdown } from './normalize'

/**
 * Stub Provider - Development provider with no secrets
 * Returns canned responses for testing without API integration
 */
export class StubProvider implements Provider {
  readonly id = 'stub'
  readonly label = 'Stub (Development)'
  readonly isEnabled = true
  
  /**
   * Stub provider capabilities
   * Supports all features for testing
   */
  readonly capabilities: ProviderCapabilities = {
    supportsImages: true,
    supportsMarkdown: true,
    requiresStrictSchema: false
  }

  async sendChat(request: ChatRequest): Promise<string> {
    // Normalize request (though stub accepts everything)
    const normalizedRequest = prepareRequest(request, this.capabilities)
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500))
    
    const parts: string[] = []
    
    // Mention assistant name if provided
    if (normalizedRequest.assistantName) {
      parts.push(`[${normalizedRequest.assistantName} Assistant]`)
    }
    
    // Mention selection if included
    if (normalizedRequest.selection?.hasSelection) {
      parts.push(`I can see you have ${normalizedRequest.selection.count} item(s) selected.`)
      if (normalizedRequest.selection.summary) {
        parts.push(`Summary: ${normalizedRequest.selection.summary}`)
      }
    }
    
    // Mention images if included
    if (normalizedRequest.images && normalizedRequest.images.length > 0) {
      parts.push(`Received ${normalizedRequest.images.length} image(s) for analysis.`)
    }
    
    // Mention quick action if invoked
    if (normalizedRequest.quickAction) {
      parts.push(`Quick action "${normalizedRequest.quickAction}" was triggered.`)
    }
    
    // Include user message context
    const lastUserMessage = normalizedRequest.messages
      .filter(m => m.role === 'user')
      .pop()
    
    if (lastUserMessage) {
      parts.push(`\n\nYou asked: "${lastUserMessage.content}"`)
      parts.push(`\n\nThis is a stub response. In production, this would be replaced with actual AI responses from the configured provider.`)
    } else {
      parts.push(`\n\nThis is a stub response from the development provider.`)
    }
    
    return parts.join('\n')
  }

  async testConnection(): Promise<{ success: boolean; message: string }> {
    return {
      success: true,
      message: 'Stub provider is always available (development mode)'
    }
  }
  
  async *sendChatStream(request: ChatRequest): AsyncIterable<string> {
    const response = await this.sendChat(request)
    const words = response.split(' ')
    
    for (const word of words) {
      await new Promise(resolve => setTimeout(resolve, 50))
      yield word + ' '
    }
  }
}
