'use strict';

/**
 * Test service — LLM connectivity and draft-assistant test routes.
 * Mirrors the /api/test/* handlers in admin-editor/server.ts.
 *
 * These routes are useful in private/work deployments where the ACE
 * frontend needs to verify LLM connectivity and preview assistant behaviour
 * without a full plugin session. They proxy to the configured LLM endpoint.
 *
 * LLM endpoint resolution order:
 *   1. LLM_API_ENDPOINT env var (explicit override)
 *   2. config.llm.endpoint from S3 draft/config.json
 *   3. config.llm.proxy.baseUrl from S3 draft/config.json
 */

const { getObjectText } = require('./storageService');
const { json, errorResponse, parseBody } = require('./responseUtils');

async function getLlmConfig() {
  const raw = await getObjectText('draft/config.json');
  if (!raw) return null;
  try { return JSON.parse(raw).llm || null; } catch { return null; }
}

function resolveEndpoint(llmConfig) {
  return (
    process.env.LLM_API_ENDPOINT ||
    llmConfig?.endpoint ||
    llmConfig?.proxy?.baseUrl ||
    ''
  );
}

async function fetchWithTimeout(url, options, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

// --- POST /api/test/connection ---

async function testConnection(body, origin) {
  const llmConfig = await getLlmConfig();
  const endpoint = resolveEndpoint(llmConfig);
  if (!endpoint) {
    return errorResponse(
      400,
      'No LLM endpoint configured. Set LLM_API_ENDPOINT or configure llm.endpoint in config.',
      origin
    );
  }

  const healthUrl = endpoint.replace(/\/$/, '') + '/health';
  try {
    const res = await fetchWithTimeout(healthUrl, { method: 'GET', headers: { Accept: 'application/json' } }, 15000);
    const rawText = await res.text();
    let parsed = null;
    try { parsed = JSON.parse(rawText); } catch {}
    return json(200, {
      success: res.ok,
      message: res.ok ? 'Connection successful.' : `HTTP ${res.status}`,
      diagnostics: { endpoint, status: res.status, response: parsed || rawText.slice(0, 300) },
    }, origin);
  } catch (err) {
    return json(200, { success: false, message: err.message, diagnostics: { endpoint } }, origin);
  }
}

// --- POST /api/test/assistant ---

async function testAssistant(payload, origin) {
  const { message, assistantId, kbName, sessionToken } = payload;
  if (!message) return errorResponse(400, 'message is required.', origin);

  const llmConfig = await getLlmConfig();
  const endpoint = resolveEndpoint(llmConfig);
  if (!endpoint) {
    return errorResponse(400, 'No LLM endpoint configured.', origin);
  }

  // Build system prompt from draft fields if not provided explicitly
  const systemPrompt = payload.systemPrompt || buildSystemPrompt(payload);
  const chatUrl = endpoint.replace(/\/$/, '') + '/v1/chat';

  const headers = { 'Content-Type': 'application/json' };
  const authMode = llmConfig?.proxy?.authMode;
  const sharedToken = llmConfig?.proxy?.sharedToken;
  if (authMode === 'shared_token' && sharedToken) {
    headers['Authorization'] = `Bearer ${sharedToken}`;
  } else if (authMode === 'session_token' && sessionToken) {
    headers['Authorization'] = `Bearer ${sessionToken}`;
  }

  const chatBody = {
    messages: [
      ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
      { role: 'user', content: message },
    ],
    model: llmConfig?.proxy?.defaultModel || payload.model || undefined,
  };

  try {
    const res = await fetchWithTimeout(chatUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(chatBody),
    }, 60000);

    const rawText = await res.text();
    let responseText = rawText;
    try {
      const parsed = JSON.parse(rawText);
      responseText =
        parsed?.choices?.[0]?.message?.content ||
        parsed?.response ||
        parsed?.message ||
        parsed?.content ||
        rawText;
    } catch {}

    return json(res.ok ? 200 : res.status, {
      success: res.ok,
      response: responseText,
      assistantId,
      kbName,
      diagnostics: { endpoint: chatUrl, status: res.status },
    }, origin);
  } catch (err) {
    return json(200, {
      success: false,
      message: err.message,
      assistantId,
      kbName,
      diagnostics: { endpoint: chatUrl },
    }, origin);
  }
}

function buildSystemPrompt(payload) {
  const { promptTemplate, instructionBlocks } = payload;
  if (!promptTemplate) return '';
  const blocks = (instructionBlocks || [])
    .filter((b) => b.enabled !== false)
    .map((b) => b.content)
    .join('\n\n');
  return [promptTemplate, blocks].filter(Boolean).join('\n\n');
}

async function handleTest(method, path, body, origin) {
  if (method === 'POST' && path === '/figma-admin/api/test/connection') {
    let payload = null;
    if (body) {
      try { payload = parseBody(body); } catch {}
    }
    return testConnection(payload, origin);
  }

  if (method === 'POST' && path === '/figma-admin/api/test/assistant') {
    let payload;
    try { payload = parseBody(body); } catch (e) { return errorResponse(400, e.message, origin); }
    return testAssistant(payload, origin);
  }

  return errorResponse(404, 'Not found', origin);
}

module.exports = { handleTest };
