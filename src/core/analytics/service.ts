/**
 * Analytics Service
 * 
 * Core analytics service with:
 * - Ring buffer for event storage
 * - Batching and flushing
 * - Retry with exponential backoff
 * - Request timeout
 * - Persistence to clientStorage
 */

import type { AnalyticsEvent, AnalyticsConfig, AnalyticsService } from './types'
import { getOrCreateSession } from './session'

const BUFFER_KEY = 'figmai.analytics.buffer'
const FLUSH_TIMEOUT_MS = 5000 // 5 second timeout for flush requests

export class AnalyticsServiceImpl implements AnalyticsService {
  private config: AnalyticsConfig
  private buffer: AnalyticsEvent[] = []
  private flushTimer: number | null = null
  private sessionId: string | null = null
  private isShutdown = false
  private flushInProgress = false

  constructor(config: AnalyticsConfig) {
    this.config = config
    this.initialize()
  }

  private async initialize(): Promise<void> {
    try {
      // Load persisted buffer
      const persisted = await figma.clientStorage.getAsync(BUFFER_KEY) as AnalyticsEvent[] | undefined
      if (persisted && Array.isArray(persisted)) {
        this.buffer = persisted.slice(0, this.config.maxBuffer) // Respect max buffer size
      }

      // Get or create session
      this.sessionId = await getOrCreateSession()

      // Start flush timer if enabled
      if (this.config.enabled && this.config.endpointUrl) {
        this.scheduleFlush()
      }
    } catch (error) {
      // Silently fail initialization - analytics must never break plugin
      if (this.config.debug) {
        console.warn('[Analytics] Initialization failed:', error)
      }
    }
  }

  track(eventType: AnalyticsEvent['type'], properties?: Record<string, unknown>): void {
    if (!this.config.enabled || !this.config.endpointUrl || this.isShutdown) {
      return
    }

    try {
      const event: AnalyticsEvent = {
        type: eventType,
        timestamp: Date.now(),
        sessionId: this.sessionId || 'unknown',
        properties: this.sanitizeProperties(properties)
      }

      // Add to buffer (ring buffer behavior)
      if (this.buffer.length >= this.config.maxBuffer) {
        this.buffer.shift() // Remove oldest event
      }
      this.buffer.push(event)

      // Persist buffer
      this.persistBuffer()

      // Check if we should flush immediately
      if (this.buffer.length >= this.config.maxBatchSize) {
        this.flush().catch(() => {
          // Silently fail - analytics must never break plugin
        })
      }
    } catch (error) {
      // Silently fail - analytics must never break plugin
      if (this.config.debug) {
        console.warn('[Analytics] Track failed:', error)
      }
    }
  }

  async flush(): Promise<void> {
    if (!this.config.enabled || !this.config.endpointUrl || this.isShutdown || this.flushInProgress) {
      return
    }

    if (this.buffer.length === 0) {
      return
    }

    this.flushInProgress = true

    try {
      // Extract batch
      const batch = this.buffer.splice(0, this.config.maxBatchSize)
      
      // Attempt to send
      const success = await this.sendBatch(batch)

      if (!success) {
        // Re-add to front of buffer for retry
        this.buffer.unshift(...batch)
        // Ensure we don't exceed max buffer
        if (this.buffer.length > this.config.maxBuffer) {
          this.buffer = this.buffer.slice(0, this.config.maxBuffer)
        }
      }

      // Persist updated buffer
      this.persistBuffer()
    } catch (error) {
      // Silently fail - analytics must never break plugin
      if (this.config.debug) {
        console.warn('[Analytics] Flush failed:', error)
      }
    } finally {
      this.flushInProgress = false
    }
  }

  async shutdown(): Promise<void> {
    this.isShutdown = true

    if (this.flushTimer !== null) {
      clearTimeout(this.flushTimer)
      this.flushTimer = null
    }

    // Final flush attempt
    try {
      await this.flush()
    } catch (error) {
      // Silently fail
      if (this.config.debug) {
        console.warn('[Analytics] Shutdown flush failed:', error)
      }
    }
  }

  private async sendBatch(batch: AnalyticsEvent[]): Promise<boolean> {
    if (!this.config.endpointUrl) {
      return false
    }

    let attempt = 0
    let delay = this.config.retryBaseDelayMs

    while (attempt < this.config.retryMaxAttempts) {
      try {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), FLUSH_TIMEOUT_MS)

        const response = await fetch(this.config.endpointUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ events: batch }),
          signal: controller.signal
        })

        clearTimeout(timeoutId)

        if (response.ok) {
          return true
        }

        // Non-2xx response - retry
        attempt++
        if (attempt < this.config.retryMaxAttempts) {
          await this.delay(delay)
          delay = Math.min(delay * 2, 30000) // Exponential backoff, max 30s
        }
      } catch (error) {
        // Network error or timeout - retry
        attempt++
        if (attempt < this.config.retryMaxAttempts) {
          await this.delay(delay)
          delay = Math.min(delay * 2, 30000) // Exponential backoff, max 30s
        }
      }
    }

    return false
  }

  private scheduleFlush(): void {
    if (this.flushTimer !== null) {
      clearTimeout(this.flushTimer)
    }

    this.flushTimer = setTimeout(() => {
      this.flush().catch(() => {
        // Silently fail
      })
      this.scheduleFlush() // Schedule next flush
    }, this.config.flushIntervalMs) as unknown as number
  }

  private async persistBuffer(): Promise<void> {
    try {
      await figma.clientStorage.setAsync(BUFFER_KEY, this.buffer)
    } catch (error) {
      // Silently fail - buffer will be lost but plugin continues
      if (this.config.debug) {
        console.warn('[Analytics] Buffer persistence failed:', error)
      }
    }
  }

  private sanitizeProperties(properties?: Record<string, unknown>): Record<string, unknown> | undefined {
    if (!properties) {
      return undefined
    }

    const sanitized: Record<string, unknown> = {}

    for (const [key, value] of Object.entries(properties)) {
      // Only allow safe primitive types
      if (
        typeof value === 'string' ||
        typeof value === 'number' ||
        typeof value === 'boolean' ||
        value === null
      ) {
        sanitized[key] = value
      } else if (Array.isArray(value)) {
        // Allow arrays of primitives only
        sanitized[key] = value.filter(
          (item) =>
            typeof item === 'string' ||
            typeof item === 'number' ||
            typeof item === 'boolean'
        )
      }
    }

    return sanitized
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}
