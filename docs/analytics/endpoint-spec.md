# Analytics Endpoint Specification

**For:** Backend developers implementing analytics ingestion  
**Purpose:** API specification for analytics event ingestion

---

## Overview

The FigmAI plugin sends analytics events to a configurable endpoint when `analytics.enabled` is `true` in `custom/config.json`. Events are batched and sent via HTTP POST requests.

---

## Endpoint Configuration

Configure the analytics endpoint in `custom/config.json`:

```json
{
  "analytics": {
    "enabled": true,
    "endpointUrl": "https://analytics.example.com/api/events"
  }
}
```

**Important:**
- The endpoint URL must be added to `networkAccess.allowedDomains` (handled automatically by build script)
- The endpoint must accept POST requests with JSON payloads
- The endpoint should return HTTP 200-299 for successful ingestion

---

## Request Format

### HTTP Method
`POST`

### Headers
```
Content-Type: application/json
```

### Request Body
```json
{
  "events": [
    {
      "type": "plugin_open",
      "timestamp": 1705852800000,
      "sessionId": "550e8400-e29b-41d4-a716-446655440000",
      "properties": {}
    },
    {
      "type": "assistant_run",
      "timestamp": 1705852801000,
      "sessionId": "550e8400-e29b-41d4-a716-446655440000",
      "properties": {
        "assistantId": "design_critique",
        "actionId": "give-critique"
      }
    }
  ]
}
```

### Event Structure

Each event in the `events` array has:

- **type** (string): Event type (see Event Types below)
- **timestamp** (number): Unix timestamp in milliseconds
- **sessionId** (string): UUID v4 session identifier (24h expiry)
- **properties** (object, optional): Event-specific properties (privacy-safe only)

---

## Event Types

### `plugin_open`
Triggered when plugin is opened.

**Properties:** None

### `assistant_run`
Triggered when an assistant quick action is executed.

**Properties:**
- `assistantId` (string): Assistant identifier
- `actionId` (string): Quick action identifier

### `assistant_complete`
Triggered when an assistant action completes (success or failure).

**Properties:**
- `assistantId` (string): Assistant identifier
- `actionId` (string): Quick action identifier
- `success` (boolean): Whether the action completed successfully

### `tool_call`
Triggered when a tool is executed.

**Properties:**
- `toolId` (string): Tool identifier

### `error`
Triggered when an error occurs.

**Properties:**
- `category` (string): Error category code (see Error Categories below)
- `assistantId` (string, optional): Assistant identifier (if applicable)
- `actionId` (string, optional): Action identifier (if applicable)
- `toolId` (string, optional): Tool identifier (if applicable)

### `settings_change`
Triggered when settings are saved.

**Properties:**
- `keys` (string[]): Array of setting key names that changed (values not included)

---

## Error Categories

Error events include a `category` property with one of these values:

- `provider_network`: Network error communicating with LLM provider
- `provider_auth`: Authentication error with LLM provider
- `provider_rate_limit`: Rate limit error from LLM provider
- `provider_timeout`: Timeout error from LLM provider
- `provider_invalid_response`: Invalid response format from LLM provider
- `handler_execution`: Error in assistant handler execution
- `tool_execution`: Error in tool execution
- `settings_load`: Error loading settings
- `settings_save`: Error saving settings
- `unknown`: Unknown or unclassified error

---

## Response Format

### Success Response
HTTP status: `200-299`

Response body: Any (ignored by plugin)

### Error Response
HTTP status: `400-599`

The plugin will retry failed requests with exponential backoff (up to 5 attempts).

---

## Batching Behavior

- Events are batched before sending
- Default batch size: 25 events
- Default flush interval: 30 seconds
- Maximum buffer size: 100 events (older events are dropped if buffer is full)

---

## Privacy & Security

**No PII is included:**
- No file names
- No document IDs
- No prompts or model outputs
- No user-identifiable information
- No raw error messages or stack traces

**Only safe metadata:**
- Event types
- Timestamps
- Session IDs (UUIDs, 24h expiry)
- Error category codes
- Setting key names (not values)

---

## Implementation Notes

- The plugin uses exponential backoff for retries (base delay: 1s, max: 30s)
- Request timeout: 5 seconds
- Failed events are re-queued for retry (up to max buffer size)
- Analytics failures never block plugin functionality
