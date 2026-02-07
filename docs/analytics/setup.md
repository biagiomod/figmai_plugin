# Analytics Setup Guide

**For:** Administrators and developers setting up analytics  
**Purpose:** Step-by-step guide to enable and configure analytics

---

## Overview

The FigmAI plugin includes an optional analytics system that tracks usage events. Analytics is **disabled by default** and must be explicitly enabled via configuration.

**Key Features:**
- Privacy-safe (no PII, no file names, no prompts)
- Non-blocking (analytics failures never affect plugin functionality)
- Configurable batching and retry behavior
- custom-only (no public defaults)

---

## Quick Start

1. **Edit `custom/config.json`** and add the analytics configuration:

```json
{
  "analytics": {
    "enabled": true,
    "endpointUrl": "https://analytics.example.com/api/events"
  }
}
```

2. **Rebuild the plugin:**

```bash
npm run build
```

3. **Verify the endpoint is added to manifest:**

The build script automatically adds your analytics endpoint to `manifest.json.networkAccess.allowedDomains`. Check `build/manifest.json` to confirm.

4. **Test the plugin:**

Open the plugin in Figma and perform some actions. Events will be batched and sent to your endpoint.

---

## Configuration Options

All configuration is in `custom/config.json` under the `analytics` key:

### Required Settings

- **`enabled`** (boolean, default: `false`)
  - Set to `true` to enable analytics
  - When `false`, analytics is a complete no-op (no timers, no storage, no network calls)

- **`endpointUrl`** (string, optional)
  - Full URL of your analytics ingestion endpoint
  - Must be a valid origin (scheme + host + optional port, no path/query/fragment)
  - Example: `"https://analytics.example.com/api/events"`
  - If not provided or empty, analytics remains disabled even if `enabled: true`

### Optional Settings

- **`flushIntervalMs`** (number, default: `30000`)
  - How often to flush buffered events (in milliseconds)
  - Default: 30 seconds

- **`maxBatchSize`** (number, default: `25`)
  - Maximum number of events to send per batch
  - Default: 25 events

- **`maxBuffer`** (number, default: `100`)
  - Maximum number of events to buffer before dropping oldest events
  - Default: 100 events

- **`retryMaxAttempts`** (number, default: `5`)
  - Maximum number of retry attempts for failed requests
  - Default: 5 attempts

- **`retryBaseDelayMs`** (number, default: `1000`)
  - Base delay for exponential backoff (in milliseconds)
  - Default: 1 second (doubles on each retry, max 30s)

- **`debug`** (boolean, default: `false`)
  - Enable debug logging to console
  - Useful for troubleshooting during setup
  - Should be disabled in production

---

## Complete Configuration Example

```json
{
  "analytics": {
    "enabled": true,
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

---

## Network Access

The analytics endpoint URL is automatically added to the plugin's `manifest.json.networkAccess.allowedDomains` during build. This happens automatically when:

- `analytics.enabled === true`
- `analytics.endpointUrl` is configured and valid

**Important:** The endpoint URL must be a pure origin (e.g., `https://analytics.example.com`), not a full path. The build script validates this and will warn if the URL format is invalid.

---

## Verifying Analytics is Working

### 1. Check Configuration

After building, verify your endpoint is in the manifest:

```bash
cat build/manifest.json | grep -A 5 "networkAccess"
```

You should see your analytics endpoint in the `allowedDomains` array.

### 2. Enable Debug Mode

Temporarily enable debug logging:

```json
{
  "analytics": {
    "enabled": true,
    "endpointUrl": "https://analytics.example.com/api/events",
    "debug": true
  }
}
```

Rebuild and check the browser console (F12) for analytics debug messages.

### 3. Monitor Your Endpoint

Check your analytics endpoint logs to confirm events are being received. Events are sent as POST requests with JSON payloads.

### 4. Test Events

Perform these actions in the plugin to generate test events:
- Open the plugin → `plugin_open` event
- Run an assistant quick action → `assistant_run` and `assistant_complete` events
- Execute a tool → `tool_call` event
- Save settings → `settings_change` event

---

## Troubleshooting

### Analytics Not Sending Events

1. **Check configuration:**
   - Verify `analytics.enabled === true`
   - Verify `analytics.endpointUrl` is set and valid
   - Rebuild after configuration changes

2. **Check network access:**
   - Verify endpoint is in `build/manifest.json.networkAccess.allowedDomains`
   - Check browser console for network errors (CORS, blocked domain, etc.)

3. **Enable debug mode:**
   - Set `analytics.debug: true` and check console for error messages

4. **Check endpoint:**
   - Verify endpoint accepts POST requests
   - Verify endpoint returns HTTP 200-299 for success
   - Check endpoint logs for incoming requests

### Events Not Appearing in Analytics

1. **Batching delay:**
   - Events are batched and flushed every 30 seconds (or `flushIntervalMs`)
   - Wait up to 30 seconds after actions to see events

2. **Buffer full:**
   - If more than 100 events occur before flush, older events may be dropped
   - Reduce `flushIntervalMs` or increase `maxBuffer` if needed

3. **Retry backoff:**
   - Failed requests are retried with exponential backoff
   - Check endpoint logs for retry attempts

### Plugin Still Works But Analytics Fails

This is expected behavior. Analytics failures are silently swallowed and never block plugin functionality. Check your endpoint configuration and network access if events aren't appearing.

---

## Privacy & Security

**What is NOT tracked:**
- File names
- Document IDs
- Node IDs
- User prompts or messages
- Model outputs or responses
- Setting values
- API keys or tokens
- Raw error messages or stack traces

**What IS tracked:**
- Event types (e.g., `plugin_open`, `assistant_run`)
- Timestamps
- Session IDs (UUIDs, 24h expiry)
- Error category codes (e.g., `provider_network`)
- Setting key names (not values)
- Assistant/action/tool identifiers

See [Metrics Guide](metrics-guide.md) for complete details on event types and properties.

---

## Disabling Analytics

To disable analytics:

1. Set `analytics.enabled: false` in `custom/config.json`
2. Rebuild the plugin

When disabled, analytics is a complete no-op:
- No timers created
- No clientStorage writes
- No network calls
- No session creation

---

## See Also

- [Endpoint Specification](endpoint-spec.md) - API specification for backend implementation
- [Metrics Guide](metrics-guide.md) - Event types and metrics reference
- [Custom Overlay Guide](../../custom/README.md) - General custom configuration
