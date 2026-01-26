/**
 * Analytics Event Types
 * 
 * Defines the event types and payloads for analytics tracking.
 * All events are privacy-safe (no PII, no file names, no document IDs, no prompts, no model outputs).
 */

export type AnalyticsEventType =
  | 'plugin_open'
  | 'assistant_run'
  | 'assistant_complete'
  | 'tool_call'
  | 'error'
  | 'settings_change'

export interface AnalyticsEvent {
  type: AnalyticsEventType
  timestamp: number
  sessionId: string
  properties?: Record<string, unknown>
}

export interface AnalyticsConfig {
  enabled: boolean
  endpointUrl?: string
  flushIntervalMs: number
  maxBatchSize: number
  maxBuffer: number
  retryMaxAttempts: number
  retryBaseDelayMs: number
  debug: boolean
}

export interface AnalyticsService {
  track(eventType: AnalyticsEventType, properties?: Record<string, unknown>): void
  flush(): Promise<void>
  shutdown(): Promise<void>
}

export interface NullAnalytics extends AnalyticsService {
  readonly isNull: true
}
