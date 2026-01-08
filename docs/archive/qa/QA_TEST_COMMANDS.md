# FigmAI Plugin - Proxy Test Commands

This document provides reproducible `curl` commands to test proxy endpoints directly, independent of the Figma plugin UI.

## Prerequisites

- Proxy server running (local or via ngrok)
- Valid shared token
- `curl` installed

## Environment Variables

Set these before running commands:

```bash
export PROXY_BASE_URL="https://your-ngrok-url.ngrok-free.dev"
export SHARED_TOKEN="your-shared-token-here"
```

Or replace `$PROXY_BASE_URL` and `$SHARED_TOKEN` in commands below.

---

## 1. Health Check (GET /health)

### Basic Health Check
```bash
curl -X GET "$PROXY_BASE_URL/health" \
  -H "Accept: application/json" \
  -v
```

**Expected Response (200 OK):**
```json
{
  "ok": true
}
```

### Health Check with Timing
```bash
time curl -X GET "$PROXY_BASE_URL/health" \
  -H "Accept: application/json" \
  -w "\n\nHTTP Status: %{http_code}\nTotal Time: %{time_total}s\n"
```

**Expected**: Status 200, response time < 1s

---

## 2. Chat Request (POST /v1/chat)

### Basic Chat Request
```bash
curl -X POST "$PROXY_BASE_URL/v1/chat" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "X-FigmAI-Token: $SHARED_TOKEN" \
  -d '{
    "model": "gpt-4.1-mini",
    "messages": [
      {"role": "user", "content": "Hello, how are you?"}
    ]
  }' \
  -v
```

**Expected Response (200 OK):**
```json
{
  "text": "Hello! How can I help you today?"
}
```

### Chat with Assistant Context
```bash
curl -X POST "$PROXY_BASE_URL/v1/chat" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "X-FigmAI-Token: $SHARED_TOKEN" \
  -d '{
    "model": "gpt-4.1-mini",
    "assistantId": "design_critique",
    "messages": [
      {"role": "user", "content": "Provide a design critique"}
    ]
  }' \
  -v
```

### Chat with Selection Summary
```bash
curl -X POST "$PROXY_BASE_URL/v1/chat" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "X-FigmAI-Token: $SHARED_TOKEN" \
  -d '{
    "model": "gpt-4.1-mini",
    "assistantId": "general",
    "selectionSummary": "Selected: 1 frame (Card, 320x200px, contains 3 text nodes)",
    "messages": [
      {"role": "user", "content": "Explain this design"}
    ]
  }' \
  -v
```

### Chat with Quick Action
```bash
curl -X POST "$PROXY_BASE_URL/v1/chat" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "X-FigmAI-Token: $SHARED_TOKEN" \
  -d '{
    "model": "gpt-4.1-mini",
    "assistantId": "design_critique",
    "quickActionId": "give-critique",
    "selectionSummary": "Selected: 1 frame (Login Form, 400x500px)",
    "messages": [
      {"role": "user", "content": "Provide a comprehensive design critique of the selected elements."}
    ]
  }' \
  -v
```

### Chat with Images (Vision)
```bash
# Note: Replace BASE64_IMAGE_DATA with actual base64-encoded image
curl -X POST "$PROXY_BASE_URL/v1/chat" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "X-FigmAI-Token: $SHARED_TOKEN" \
  -d '{
    "model": "gpt-4.1-mini",
    "assistantId": "design_critique",
    "quickActionId": "give-critique",
    "selectionSummary": "Selected: 1 frame (Card, 320x200px)",
    "images": [
      {
        "dataUrl": "data:image/png;base64,BASE64_IMAGE_DATA",
        "name": "Card.png",
        "width": 320,
        "height": 200
      }
    ],
    "messages": [
      {"role": "user", "content": "Provide a comprehensive design critique of the selected elements."}
    ]
  }' \
  -v
```

### Chat with Conversation History
```bash
curl -X POST "$PROXY_BASE_URL/v1/chat" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "X-FigmAI-Token: $SHARED_TOKEN" \
  -d '{
    "model": "gpt-4.1-mini",
    "messages": [
      {"role": "user", "content": "What is design?"},
      {"role": "assistant", "content": "Design is the process of creating solutions..."},
      {"role": "user", "content": "Can you give me an example?"}
    ]
  }' \
  -v
```

---

## 3. Error Testing

### 401 Unauthorized (Missing Token)
```bash
curl -X POST "$PROXY_BASE_URL/v1/chat" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "model": "gpt-4.1-mini",
    "messages": [{"role": "user", "content": "Hello"}]
  }' \
  -v
```

**Expected Response (401):**
```json
{
  "error": "Invalid or missing token"
}
```

### 401 Unauthorized (Invalid Token)
```bash
curl -X POST "$PROXY_BASE_URL/v1/chat" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "X-FigmAI-Token: invalid-token-123" \
  -d '{
    "model": "gpt-4.1-mini",
    "messages": [{"role": "user", "content": "Hello"}]
  }' \
  -v
```

**Expected Response (401):**
```json
{
  "error": "Invalid or missing token"
}
```

### 400 Bad Request (Invalid JSON)
```bash
curl -X POST "$PROXY_BASE_URL/v1/chat" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "X-FigmAI-Token: $SHARED_TOKEN" \
  -d '{
    "model": "gpt-4.1-mini",
    "messages": [{"role": "user"}]
  }' \
  -v
```

**Expected Response (400):**
```json
{
  "error": "Invalid request format"
}
```

### 400 Bad Request (Missing Required Fields)
```bash
curl -X POST "$PROXY_BASE_URL/v1/chat" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "X-FigmAI-Token: $SHARED_TOKEN" \
  -d '{
    "messages": [{"role": "user", "content": "Hello"}]
  }' \
  -v
```

**Expected Response (400):**
```json
{
  "error": "Invalid request format"
}
```

### Timeout Test (if proxy supports timeout)
```bash
# Use a very slow endpoint or set low timeout
curl -X POST "$PROXY_BASE_URL/v1/chat" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "X-FigmAI-Token: $SHARED_TOKEN" \
  -d '{
    "model": "gpt-4.1-mini",
    "messages": [{"role": "user", "content": "Hello"}]
  }' \
  --max-time 1 \
  -v
```

---

## 4. Performance Testing

### Response Time Measurement
```bash
curl -X POST "$PROXY_BASE_URL/v1/chat" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "X-FigmAI-Token: $SHARED_TOKEN" \
  -d '{
    "model": "gpt-4.1-mini",
    "messages": [{"role": "user", "content": "Hello"}]
  }' \
  -w "\n\nHTTP Status: %{http_code}\nTotal Time: %{time_total}s\nConnect Time: %{time_connect}s\n" \
  -o /dev/null \
  -s
```

### Concurrent Requests (Stress Test)
```bash
# Run 5 concurrent requests
for i in {1..5}; do
  curl -X POST "$PROXY_BASE_URL/v1/chat" \
    -H "Content-Type: application/json" \
    -H "Accept: application/json" \
    -H "X-FigmAI-Token: $SHARED_TOKEN" \
    -d "{
      \"model\": \"gpt-4.1-mini\",
      \"messages\": [{\"role\": \"user\", \"content\": \"Request $i\"}]
    }" \
    -w "\nRequest $i: HTTP %{http_code}, Time: %{time_total}s\n" \
    -o /dev/null \
    -s &
done
wait
```

---

## 5. Quick Test Script

Save this as `test-proxy.sh`:

```bash
#!/bin/bash

# Configuration
PROXY_BASE_URL="${PROXY_BASE_URL:-https://your-ngrok-url.ngrok-free.dev}"
SHARED_TOKEN="${SHARED_TOKEN:-your-shared-token-here}"

echo "Testing FigmAI Proxy: $PROXY_BASE_URL"
echo "========================================"
echo ""

# Test 1: Health Check
echo "1. Health Check..."
HEALTH_RESPONSE=$(curl -s -X GET "$PROXY_BASE_URL/health" -H "Accept: application/json")
if echo "$HEALTH_RESPONSE" | grep -q '"ok":true'; then
  echo "   ✓ Health check passed"
else
  echo "   ✗ Health check failed: $HEALTH_RESPONSE"
  exit 1
fi
echo ""

# Test 2: Basic Chat
echo "2. Basic Chat Request..."
CHAT_RESPONSE=$(curl -s -X POST "$PROXY_BASE_URL/v1/chat" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "X-FigmAI-Token: $SHARED_TOKEN" \
  -d '{
    "model": "gpt-4.1-mini",
    "messages": [{"role": "user", "content": "Say hello"}]
  }')

if echo "$CHAT_RESPONSE" | grep -q '"text"'; then
  echo "   ✓ Chat request successful"
  echo "   Response: $(echo "$CHAT_RESPONSE" | jq -r '.text' 2>/dev/null || echo "$CHAT_RESPONSE")"
else
  echo "   ✗ Chat request failed: $CHAT_RESPONSE"
  exit 1
fi
echo ""

# Test 3: Error Handling (401)
echo "3. Error Handling (401 Unauthorized)..."
ERROR_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$PROXY_BASE_URL/v1/chat" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -d '{
    "model": "gpt-4.1-mini",
    "messages": [{"role": "user", "content": "Hello"}]
  }')

HTTP_CODE=$(echo "$ERROR_RESPONSE" | tail -n1)
if [ "$HTTP_CODE" = "401" ]; then
  echo "   ✓ 401 error handled correctly"
else
  echo "   ✗ Expected 401, got: $HTTP_CODE"
  exit 1
fi
echo ""

echo "All tests passed!"
```

Make executable and run:
```bash
chmod +x test-proxy.sh
./test-proxy.sh
```

---

## 6. Testing with Different Models

### Test Different Models
```bash
for model in "gpt-4.1-mini" "gpt-4" "gpt-3.5-turbo"; do
  echo "Testing model: $model"
  curl -X POST "$PROXY_BASE_URL/v1/chat" \
    -H "Content-Type: application/json" \
    -H "Accept: application/json" \
    -H "X-FigmAI-Token: $SHARED_TOKEN" \
    -d "{
      \"model\": \"$model\",
      \"messages\": [{\"role\": \"user\", \"content\": \"Hello\"}]
    }" \
    -w "\nHTTP Status: %{http_code}\n" \
    -s | jq '.'
  echo ""
done
```

---

## 7. Testing Assistant-Specific Behavior

### Design Critique Assistant
```bash
curl -X POST "$PROXY_BASE_URL/v1/chat" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "X-FigmAI-Token: $SHARED_TOKEN" \
  -d '{
    "model": "gpt-4.1-mini",
    "assistantId": "design_critique",
    "quickActionId": "give-critique",
    "selectionSummary": "Selected: 1 frame (Login Form, 400x500px)",
    "messages": [
      {"role": "user", "content": "Provide a comprehensive design critique of the selected elements."}
    ]
  }' \
  -v
```

**Expected**: Response contains structured critique with score, wins, fixes, checklist

### Code2Design Assistant
```bash
curl -X POST "$PROXY_BASE_URL/v1/chat" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  -H "X-FigmAI-Token: $SHARED_TOKEN" \
  -d '{
    "model": "gpt-4.1-mini",
    "assistantId": "code2design",
    "quickActionId": "json-format-help",
    "messages": [
      {"role": "user", "content": "Explain the FigmAI Template JSON format and schema requirements"}
    ]
  }' \
  -v
```

---

## Notes

- Replace `$PROXY_BASE_URL` and `$SHARED_TOKEN` with actual values
- Use `-v` flag for verbose output (headers, status codes)
- Use `-s` flag to suppress progress meter
- Use `jq` to pretty-print JSON responses (optional)
- Adjust timeout values based on your proxy configuration
- Test error cases in isolated environments to avoid affecting production

---

## Troubleshooting

### Connection Refused
- Verify proxy server is running
- Check proxy base URL is correct
- Verify network connectivity

### 401 Unauthorized
- Verify shared token is correct
- Check token is set in environment variable
- Verify proxy server has token configured

### Timeout
- Check proxy server logs
- Verify OpenAI API is accessible from proxy
- Increase timeout if needed

### Invalid JSON Response
- Check proxy server logs for errors
- Verify request format matches expected schema
- Test with minimal request first

