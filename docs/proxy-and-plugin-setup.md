# Proxy and Plugin Setup Guide

This guide explains the architecture, setup, and operation of the FigmAI Figma plugin and its proxy server.

## Table of Contents

1. [High-Level Architecture](#1-high-level-architecture)
2. [Proxy Server Overview](#2-proxy-server-overview)
3. [Proxy Environment Variables](#3-proxy-environment-variables)
4. [Running the Proxy Locally](#4-running-the-proxy-locally)
5. [Exposing the Proxy with ngrok](#5-exposing-the-proxy-with-ngrok)
6. [Figma Plugin Configuration](#6-figma-plugin-configuration)
7. [Request / Response Contract](#7-request--response-contract)
8. [Figma Runtime Constraints](#8-figma-runtime-constraints-critical)
9. [Common Errors & Debugging](#9-common-errors--debugging)
10. [Security Notes](#10-security-notes)
11. [Future Extensions](#11-future-extensions)

---

## 1. High-Level Architecture

### Why Figma Plugins Cannot Call OpenAI Directly

Figma plugins run in a sandboxed environment with strict security constraints:

- **No direct API access**: Plugins cannot make HTTPS requests to arbitrary external APIs
- **CORS restrictions**: Browser-like CORS policies prevent direct API calls
- **No API key storage**: Plugins cannot securely store or transmit API keys
- **Network limitations**: The Figma runtime has limited fetch capabilities

### Why a Local Proxy Server is Required

A proxy server acts as an intermediary between the Figma plugin and OpenAI:

1. **Security**: API keys remain on the proxy server, never in the plugin code
2. **Network flexibility**: The proxy can make unrestricted HTTPS requests
3. **Authentication abstraction**: The proxy handles OpenAI authentication
4. **Request transformation**: The proxy can modify requests/responses as needed

### Traffic Flow

```
┌─────────────┐         ┌──────────────┐         ┌─────────────┐
│             │         │              │         │             │
│  Figma      │  HTTPS  │   Proxy      │  HTTPS  │   OpenAI    │
│  Plugin     │────────>│  (ngrok)     │────────>│   API       │
│             │         │              │         │             │
└─────────────┘         └──────────────┘         └─────────────┘
     │                          │                        │
     │                          │                        │
     └──────────────────────────┴────────────────────────┘
                    Response flows back
```

**Detailed flow:**

1. User types a message in the Figma plugin UI
2. Plugin sends HTTP POST to proxy server (via ngrok URL)
3. Proxy validates authentication token
4. Proxy forwards request to OpenAI API with API key
5. OpenAI responds to proxy
6. Proxy returns response to plugin
7. Plugin displays response in chat UI

### Why ngrok is Used in Development

Figma plugins require HTTPS endpoints. In development:

- **Local proxy** runs on `http://localhost:8787` (HTTP only)
- **ngrok** creates a public HTTPS tunnel to localhost
- **Plugin** connects to the ngrok HTTPS URL
- **ngrok** forwards requests to the local proxy

This allows development without deploying to a production server.

---

## 2. Proxy Server Overview

### What the Proxy Does

The `figmai-proxy` server:

- Receives chat requests from the Figma plugin
- Authenticates requests using shared tokens
- Forwards requests to OpenAI API
- Returns responses to the plugin
- Provides health check endpoint for connection testing

### Supported Endpoints

#### GET `/health`

**Purpose**: Verify proxy connectivity (no authentication required)

**Request**:
```http
GET /health HTTP/1.1
Host: your-ngrok-url.ngrok-free.dev
Accept: application/json
```

**Response** (200 OK):
```json
{
  "ok": true
}
```

**Use case**: Plugin "Test Connection" button uses this endpoint.

#### POST `/v1/chat`

**Purpose**: Send chat messages to OpenAI (authentication required)

**Request**:
```http
POST /v1/chat HTTP/1.1
Host: your-ngrok-url.ngrok-free.dev
Content-Type: application/json
Accept: application/json
X-FigmAI-Token: your-shared-token

{
  "model": "gpt-4.1-mini",
  "messages": [
    { "role": "user", "content": "Hello" }
  ]
}
```

**Response** (200 OK):
```json
{
  "text": "Hello! How can I help you today?"
}
```

**Error Response** (401 Unauthorized):
```json
{
  "error": "Invalid or missing token"
}
```

### Authentication Model

The proxy uses **shared token authentication**:

- **Header**: `X-FigmAI-Token`
- **Value**: Set via `FIGMAI_SHARED_TOKEN` environment variable
- **Scope**: All `/v1/chat` requests require this header
- **Exception**: `/health` endpoint does not require authentication

### What the Proxy is Responsible For

**The proxy handles:**
- OpenAI API key management
- Request authentication
- Request/response transformation
- Error handling and retries
- CORS headers for Figma plugin compatibility

**The proxy does NOT:**
- Store conversation history
- Implement rate limiting (delegated to OpenAI)
- Validate message content
- Handle plugin-specific UI logic

---

## 3. Proxy Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `OPENAI_API_KEY` | Your OpenAI API key | `sk-...` |
| `FIGMAI_SHARED_TOKEN` | Token for plugin authentication | `your-secret-token` |
| `PORT` | Server port (optional) | `8787` (default) |

### Example `.env` File

Create a `.env` file in the proxy server directory:

```bash
OPENAI_API_KEY=sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
FIGMAI_SHARED_TOKEN=your-secret-token-here
PORT=8787
```

### Setting Environment Variables

#### macOS / Linux

**Option 1: Export in terminal**
```bash
export OPENAI_API_KEY="sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
export FIGMAI_SHARED_TOKEN="your-secret-token-here"
export PORT=8787
```

**Option 2: Use `.env` file**
```bash
# Load .env file (if using dotenv)
source .env
```

**Option 3: Inline with command**
```bash
OPENAI_API_KEY="sk-..." FIGMAI_SHARED_TOKEN="token" npm start
```

#### Windows (PowerShell)

```powershell
$env:OPENAI_API_KEY="sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
$env:FIGMAI_SHARED_TOKEN="your-secret-token-here"
$env:PORT=8787
```

### Common Failure Modes

**Missing `OPENAI_API_KEY`:**
```
Error: OPENAI_API_KEY environment variable is required
```
**Solution**: Set the environment variable before starting the proxy.

**Missing `FIGMAI_SHARED_TOKEN`:**
```
Error: FIGMAI_SHARED_TOKEN environment variable is required
```
**Solution**: Generate a secure token and set it as an environment variable.

**Invalid API key:**
```
401 Unauthorized from OpenAI API
```
**Solution**: Verify your OpenAI API key is valid and has sufficient credits.

---

## 4. Running the Proxy Locally

### Step-by-Step Setup

1. **Navigate to proxy directory**
   ```bash
   cd figmai-proxy
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set environment variables**
   ```bash
   export OPENAI_API_KEY="sk-proj-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
   export FIGMAI_SHARED_TOKEN="your-secret-token-here"
   ```

4. **Start the server**
   ```bash
   npm start
   ```

### Expected Terminal Output

```
Server starting on port 8787...
Proxy server ready
Health endpoint: http://localhost:8787/health
Chat endpoint: http://localhost:8787/v1/chat
```

### Verifying the Proxy is Running

**Test health endpoint:**
```bash
curl http://localhost:8787/health
```

**Expected response:**
```json
{"ok":true}
```

**Test with authentication:**
```bash
curl -X POST http://localhost:8787/v1/chat \
  -H "Content-Type: application/json" \
  -H "X-FigmAI-Token: your-secret-token-here" \
  -d '{"model":"gpt-4.1-mini","messages":[{"role":"user","content":"Hello"}]}'
```

**Expected response:**
```json
{"text":"Hello! How can I help you today?"}
```

---

## 5. Exposing the Proxy with ngrok

### Why ngrok is Required

Figma plugins require HTTPS endpoints. Since the local proxy runs on HTTP, ngrok creates a secure tunnel:

- **Public HTTPS URL**: ngrok provides a public HTTPS endpoint
- **Tunnel to localhost**: ngrok forwards requests to `localhost:8787`
- **No deployment needed**: Works for local development

### Setting Up ngrok

1. **Install ngrok**
   - Download from https://ngrok.com/download
   - Or use Homebrew: `brew install ngrok`

2. **Start the proxy** (if not already running)
   ```bash
   npm start
   ```

3. **Start ngrok tunnel**
   ```bash
   ngrok http 8787
   ```

### Finding the Public HTTPS URL

After starting ngrok, you'll see output like:

```
Session Status                online
Account                       your-email@example.com
Version                       3.x.x
Region                        United States (us)
Latency                       -
Web Interface                 http://127.0.0.1:4040
Forwarding                    https://abc123.ngrok-free.dev -> http://localhost:8787
```

**Copy the HTTPS URL**: `https://abc123.ngrok-free.dev`

This is the URL you'll use in the Figma plugin settings.

### Important Notes

- **URL changes on restart**: Free ngrok tier generates a new URL each time you restart ngrok
- **HTTPS is mandatory**: Figma plugins will reject HTTP URLs
- **Web interface**: Visit `http://127.0.0.1:4040` to inspect requests
- **Keep ngrok running**: The tunnel must remain active while using the plugin

### Testing ngrok Endpoint

```bash
curl https://abc123.ngrok-free.dev/health
```

Should return:
```json
{"ok":true}
```

---

## 6. Figma Plugin Configuration

### Accessing Settings

1. Open the Figma plugin
2. Click the **Settings** icon (gear) in the top navigation
3. The Settings modal will open

### Configuration Fields

#### Proxy Base URL

**Field**: Text input  
**Example**: `https://abc123.ngrok-free.dev`  
**Required**: Yes

- Enter the full ngrok HTTPS URL (no trailing slash)
- The plugin will normalize the URL automatically
- Must be HTTPS (HTTP will be rejected)

#### Authentication Mode

**Field**: Dropdown  
**Options**: 
- Shared Token (Personal) - Current implementation
- Session Token (Commercial - Coming soon) - Future feature

**Default**: Shared Token

#### Shared Token

**Field**: Password input (hidden)  
**Required**: Yes (when using Shared Token mode)

- Enter the same value as `FIGMAI_SHARED_TOKEN` from your proxy
- This token authenticates the plugin to the proxy
- Token is stored securely in Figma's client storage

#### Default Model

**Field**: Text input  
**Default**: `gpt-4.1-mini`  
**Required**: No

- Model name to use for chat requests
- Must be a valid OpenAI model identifier
- Can be overridden per-request in the future

### Test Connection Button

**Purpose**: Verify proxy connectivity and authentication

**What it does:**
1. Saves current settings to storage
2. Sends GET request to `/health` endpoint
3. Displays success/failure with latency

**Success message:**
```
✓ Connection successful (123ms)
```

**Failure scenarios:**
- **No proxy URL**: "Proxy base URL not configured"
- **Connection timeout**: "Connection timeout. The proxy server took too long to respond."
- **Network error**: "Could not connect to proxy: [error details]"
- **Invalid URL**: "Failed to fetch"

### Saving Settings

1. Fill in required fields (Proxy Base URL, Shared Token)
2. Click **Save**
3. Settings are persisted to Figma's client storage
4. Provider is reinitialized with new settings

### Where Errors Appear

- **Test Connection**: Status message below the button (green for success, red for failure)
- **Chat errors**: Inline error message in the chat area
- **Console**: Browser console (Figma → Plugins → Development → Show Console)

---

## 7. Request / Response Contract

### Plugin → Proxy

#### POST `/v1/chat`

**Endpoint**: `POST {proxyBaseUrl}/v1/chat`

**Headers**:
```
Content-Type: application/json
Accept: application/json
X-FigmAI-Token: {sharedToken}
```

**Request Body**:
```json
{
  "model": "gpt-4.1-mini",
  "messages": [
    { "role": "user", "content": "Hello, how are you?" },
    { "role": "assistant", "content": "I'm doing well, thank you!" },
    { "role": "user", "content": "What can you help me with?" }
  ]
}
```

**Message Format**:
- `role`: `"user"` or `"assistant"` (no system messages from plugin)
- `content`: String message content

**Model Field**:
- Default: `gpt-4.1-mini` (from plugin settings)
- Must be a valid OpenAI model identifier

### Proxy → Plugin

#### Success Response (200 OK)

```json
{
  "text": "I can help you with design tasks, code generation, and more!"
}
```

The proxy extracts the response text from OpenAI's response and returns it in the `text` field.

#### Error Responses

**401 Unauthorized**:
```json
{
  "error": "Invalid or missing token"
}
```

**400 Bad Request**:
```json
{
  "error": "Invalid request format"
}
```

**500 Internal Server Error**:
```json
{
  "error": "OpenAI API error: [details]"
}
```

### Health Check

#### GET `/health`

**Endpoint**: `GET {proxyBaseUrl}/health`

**Headers**:
```
Accept: application/json
```

**No authentication required**

**Response (200 OK)**:
```json
{
  "ok": true
}
```

---

## 8. Figma Runtime Constraints (CRITICAL)

### Fetch API Limitations

The Figma plugin runtime has strict limitations on the `fetch()` API:

#### Unsupported RequestInit Properties

**DO NOT USE:**
- `mode` - Not supported (will cause runtime errors)
- `credentials` - Not supported (will cause runtime errors)
- `cache` - Not supported
- `redirect` - Not supported

**ONLY USE:**
- `method` - HTTP method (GET, POST, etc.)
- `headers` - Request headers object
- `body` - Request body (string or FormData)
- `signal` - AbortSignal (if AbortController exists)

#### AbortController Availability

**Problem**: `AbortController` may not exist in the Figma runtime

**Solution**: Always check before using:
```typescript
const hasAbort = typeof AbortController !== 'undefined'
if (hasAbort && timeoutMs) {
  const controller = new AbortController()
  // Use controller
}
```

**Fallback**: If AbortController is unavailable, make requests without timeout

### CORS Requirements

**Proxy must allow:**
- Origin: `https://www.figma.com`
- Methods: `GET`, `POST`, `OPTIONS`
- Headers: `Content-Type`, `Accept`, `X-FigmAI-Token`

**Example CORS headers**:
```
Access-Control-Allow-Origin: https://www.figma.com
Access-Control-Allow-Methods: GET, POST, OPTIONS
Access-Control-Allow-Headers: Content-Type, Accept, X-FigmAI-Token
Access-Control-Max-Age: 86400
```

### OPTIONS Preflight Handling

Figma plugins send OPTIONS requests for CORS preflight. The proxy must:

1. **Handle OPTIONS requests** for all endpoints
2. **Return 200 OK** with appropriate CORS headers
3. **Not require authentication** for OPTIONS requests

**Example OPTIONS handler**:
```javascript
if (request.method === 'OPTIONS') {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': 'https://www.figma.com',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Accept, X-FigmAI-Token',
      'Access-Control-Max-Age': '86400'
    }
  })
}
```

### Why Browser Examples Fail

Many fetch examples from browser documentation will fail in Figma because:

- They use `mode: 'cors'` (not supported)
- They use `credentials: 'include'` (not supported)
- They assume AbortController always exists
- They don't handle OPTIONS preflight correctly

**Always test in the Figma plugin environment**, not just in a browser.

---

## 9. Common Errors & Debugging

### Failed to Fetch

**Symptom**: Plugin shows "Failed to fetch" or network error

**Diagnosis**:
1. Check if proxy is running: `curl http://localhost:8787/health`
2. Check if ngrok is running: Visit `http://127.0.0.1:4040`
3. Verify ngrok URL in plugin settings matches current ngrok URL
4. Check browser console for detailed error

**Solutions**:
- Restart proxy server
- Restart ngrok and update plugin URL
- Verify HTTPS URL (not HTTP)
- Check firewall/network restrictions

### 401 Unauthorized

**Symptom**: Plugin shows "Authentication failed" or 401 error

**Diagnosis**:
1. Verify `FIGMAI_SHARED_TOKEN` is set in proxy environment
2. Verify token in plugin settings matches proxy token
3. Check proxy logs for authentication failures

**Solutions**:
- Ensure token is set: `echo $FIGMAI_SHARED_TOKEN`
- Update plugin settings with correct token
- Restart proxy after changing environment variables

### CORS Preflight Failures

**Symptom**: Browser console shows CORS errors, OPTIONS request fails

**Diagnosis**:
1. Check proxy handles OPTIONS requests
2. Verify CORS headers in proxy response
3. Check ngrok web interface for request/response

**Solutions**:
- Ensure proxy returns CORS headers for OPTIONS
- Verify `Access-Control-Allow-Origin` includes `https://www.figma.com`
- Check proxy logs for OPTIONS request handling

### ngrok Running but Proxy Not Responding

**Symptom**: ngrok shows active tunnel, but requests fail

**Diagnosis**:
1. Check proxy is running: `curl http://localhost:8787/health`
2. Verify ngrok forwards to correct port (8787)
3. Check proxy logs for errors

**Solutions**:
- Restart proxy server
- Verify ngrok command: `ngrok http 8787` (not different port)
- Check proxy logs for startup errors

### Port Already in Use (EADDRINUSE)

**Symptom**: Proxy fails to start, "EADDRINUSE" error

**Diagnosis**:
```bash
lsof -i :8787
```

**Solutions**:
- Kill existing process: `kill -9 <PID>`
- Use different port: `PORT=8788 npm start`
- Update ngrok: `ngrok http 8788`

### Debugging Commands

**Check proxy health**:
```bash
curl http://localhost:8787/health
```

**Test authenticated request**:
```bash
curl -X POST http://localhost:8787/v1/chat \
  -H "Content-Type: application/json" \
  -H "X-FigmAI-Token: your-token" \
  -d '{"model":"gpt-4.1-mini","messages":[{"role":"user","content":"test"}]}'
```

**Check ngrok tunnel**:
```bash
curl https://your-ngrok-url.ngrok-free.dev/health
```

**View ngrok requests**:
- Open browser: `http://127.0.0.1:4040`
- Inspect request/response details

**View plugin console**:
- Figma → Plugins → Development → Show Console
- Look for `[ProxyClient]`, `[TEST_CONNECTION]`, `[MAIN]` logs

---

## 10. Security Notes

### Shared Token Authentication

**Current implementation**: Shared token via `X-FigmAI-Token` header

**Acceptable for**:
- Local development
- Personal use
- Testing environments

**NOT production-grade because**:
- Token is shared between plugin and proxy (no per-user auth)
- Token is stored in plugin settings (client-side)
- No token rotation or expiration
- No rate limiting per user

### Production Considerations

For production deployment, consider:

1. **User session tokens**: Each user gets a unique token
2. **Token expiration**: Tokens expire after a period
3. **Token rotation**: Regular token refresh
4. **Rate limiting**: Per-user rate limits
5. **Audit logging**: Track who makes what requests
6. **HTTPS only**: Enforce HTTPS for all connections
7. **Token storage**: Server-side token management

### API Key Security

**Never**:
- Commit API keys to version control
- Share API keys in screenshots or documentation
- Hardcode API keys in plugin code
- Log API keys in console or files

**Always**:
- Use environment variables for API keys
- Rotate keys if exposed
- Use `.gitignore` for `.env` files
- Restrict API key permissions in OpenAI dashboard

---

## 11. Future Extensions

### Adding New Providers

The architecture supports multiple LLM providers:

1. **Create provider class**:
   ```typescript
   export class ClaudeProvider implements Provider {
     readonly id = 'claude'
     readonly label = 'Claude'
     readonly isEnabled = true
     
     async sendChat(request: ChatRequest): Promise<string> {
       // Implement Claude API calls
     }
     
     async testConnection(): Promise<{success: boolean; message: string}> {
       // Implement connection test
     }
   }
   ```

2. **Update provider factory**:
   ```typescript
   case 'claude':
     return new ClaudeProvider()
   ```

3. **Update proxy endpoints**:
   - Add `/v1/chat/claude` endpoint
   - Handle Claude-specific request/response format

### Why Proxy Abstraction Enables This

The proxy abstraction allows:

- **Provider-agnostic plugin**: Plugin doesn't need to know which LLM is used
- **Centralized auth**: All providers use same authentication model
- **Easy switching**: Change provider without plugin updates
- **Consistent interface**: All providers implement same `Provider` interface

### Where to Plug In New Providers

**Plugin side**:
- `src/core/provider/` - Provider implementations
- `src/core/provider/providerFactory.ts` - Provider selection logic

**Proxy side**:
- Add new route handler for provider
- Implement provider-specific API client
- Add provider to configuration

### Internal LLM Integration

For internal/corporate LLMs:

1. **Update proxy** to call internal API instead of OpenAI
2. **Keep same contract** (`/v1/chat` endpoint, same request/response format)
3. **Update authentication** if needed (may use different auth model)
4. **No plugin changes required** if contract is maintained

---

## Quick Reference

### Start Everything

```bash
# Terminal 1: Start proxy
cd figmai-proxy
export OPENAI_API_KEY="sk-..."
export FIGMAI_SHARED_TOKEN="your-token"
npm start

# Terminal 2: Start ngrok
ngrok http 8787

# Copy ngrok HTTPS URL to plugin settings
```

### Plugin Settings

- **Proxy Base URL**: `https://abc123.ngrok-free.dev` (from ngrok)
- **Auth Mode**: Shared Token
- **Shared Token**: Same as `FIGMAI_SHARED_TOKEN`
- **Default Model**: `gpt-4.1-mini`

### Test Connection

1. Click "Test Connection" in plugin settings
2. Should see: "✓ Connection successful (XXXms)"
3. If failure, check proxy logs and ngrok status

---

## Additional Resources

- [Figma Plugin API Documentation](https://www.figma.com/plugin-docs/)
- [OpenAI API Documentation](https://platform.openai.com/docs)
- [ngrok Documentation](https://ngrok.com/docs)

---

**Last Updated**: 2024



