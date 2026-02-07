# Analytics Metrics Guide

**For:** Product managers and data analysts  
**Purpose:** Guide to understanding analytics events and metrics

---

## Overview

The FigmAI plugin tracks usage events for product analytics. All events are privacy-safe (no PII, no file names, no document IDs, no prompts, no model outputs).

---

## Event Types

### Plugin Open
**Event:** `plugin_open`

**When:** Plugin is opened in Figma

**Use Cases:**
- Daily/weekly active users
- Plugin adoption metrics
- Session frequency

---

### Assistant Run
**Event:** `assistant_run`

**When:** User executes an assistant quick action

**Properties:**
- `assistantId`: Which assistant was used
- `actionId`: Which action was executed

**Use Cases:**
- Most popular assistants
- Feature usage by assistant
- Action distribution

**Example Metrics:**
- "Design Critique" usage vs "Content Table" usage
- "Give Critique" action frequency
- Assistant adoption rates

---

### Assistant Complete
**Event:** `assistant_complete`

**When:** Assistant action completes (success or failure)

**Properties:**
- `assistantId`: Which assistant completed
- `actionId`: Which action completed
- `success`: Whether completion was successful

**Use Cases:**
- Success rates by assistant
- Error rates by action
- Feature reliability metrics

**Example Metrics:**
- Design Critique success rate
- Content Table generation success rate
- Error rate by assistant type

---

### Tool Call
**Event:** `tool_call`

**When:** A tool is executed (e.g., DESIGN_SYSTEM_QUERY)

**Properties:**
- `toolId`: Which tool was called

**Use Cases:**
- Tool usage frequency
- Tool adoption metrics
- Feature usage patterns

---

### Error
**Event:** `error`

**When:** An error occurs during plugin operation

**Properties:**
- `category`: Error category code
- `assistantId` (optional): Assistant context
- `actionId` (optional): Action context
- `toolId` (optional): Tool context

**Use Cases:**
- Error rate monitoring
- Error category distribution
- Reliability metrics
- Provider health monitoring

**Error Categories:**
- `provider_network`: Network issues
- `provider_auth`: Authentication failures
- `provider_rate_limit`: Rate limiting
- `provider_timeout`: Timeout errors
- `provider_invalid_response`: Invalid responses
- `handler_execution`: Handler errors
- `tool_execution`: Tool errors
- `settings_load`: Settings load failures
- `settings_save`: Settings save failures
- `unknown`: Unclassified errors

---

### Settings Change
**Event:** `settings_change`

**When:** User saves settings

**Properties:**
- `keys`: Array of setting keys that changed (values not included)

**Use Cases:**
- Configuration usage patterns
- Feature adoption (which settings are changed)
- User customization behavior

**Note:** Setting values are never included for privacy.

---

## Session Tracking

- Each plugin session has a unique UUID (`sessionId`)
- Sessions expire after 24 hours
- Session IDs are stored locally in Figma clientStorage
- Session IDs are not user-identifiable

---

## Privacy Guarantees

**Never Included:**
- File names
- Document IDs
- Node IDs
- Prompts or user messages
- Model outputs or responses
- Setting values
- API keys or tokens
- Raw error messages or stack traces

**Only Included:**
- Event types
- Timestamps
- Session IDs (UUIDs)
- Error category codes
- Setting key names (not values)
- Assistant/action/tool identifiers

---

## Configuration

Analytics is configured in `custom/config.json`:

```json
{
  "analytics": {
    "enabled": false,
    "endpointUrl": "https://analytics.example.com/api/events",
    "flushIntervalMs": 30000,
    "maxBatchSize": 25,
    "maxBuffer": 100,
    "retryMaxAttempts": 5,
    "retryBaseDelayMs": 1000,
    "debug": false
  }
}
```

**Default:** `enabled: false` (analytics disabled by default)

---

## Data Retention

Analytics data retention and processing policies are determined by the endpoint implementation, not the plugin. The plugin only sends events; storage and retention are handled by the analytics backend.

---

## See Also

- [Endpoint Specification](endpoint-spec.md) - API specification for backend implementation
- [Custom Overlay Guide](../../custom/README.md) - Configuration setup
