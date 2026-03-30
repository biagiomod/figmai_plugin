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

const { getObjectText, putObjectText } = require('./storageService');
const { json, errorResponse, parseBody } = require('./responseUtils');

const SAFE_ID = /^[a-zA-Z0-9_-]+$/;

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
  const startMs = Date.now();
  const { message, assistantId, kbName, sessionToken } = payload;

  // skillSegments: array of { label, content } — pre-assembled by the frontend
  const skillSegments = Array.isArray(payload.skillSegments) ? payload.skillSegments : [];

  if (!message && skillSegments.length === 0) {
    return errorResponse(400, 'message or skillSegments is required.', origin);
  }

  const llmConfig = await getLlmConfig();
  const endpoint = resolveEndpoint(llmConfig);
  if (!endpoint) {
    return errorResponse(400, 'No LLM endpoint configured.', origin);
  }

  // Build system prompt from skill segments (or fall back to promptTemplate)
  let systemPrompt;
  if (skillSegments.length > 0) {
    systemPrompt = skillSegments
      .filter((s) => s.content)
      .map((s) => s.content)
      .join('\n\n');
  } else {
    systemPrompt = payload.systemPrompt || buildSystemPrompt(payload);
  }

  const chatUrl = endpoint.replace(/\/$/, '') + '/v1/chat';
  const headers = { 'Content-Type': 'application/json' };
  const authMode = llmConfig?.proxy?.authMode;
  const sharedToken = llmConfig?.proxy?.sharedToken;
  if (authMode === 'shared_token' && sharedToken) {
    headers['Authorization'] = `Bearer ${sharedToken}`;
  } else if (authMode === 'session_token' && sessionToken) {
    headers['Authorization'] = `Bearer ${sessionToken}`;
  }

  const userContent = message || '';
  const chatBody = {
    messages: [
      ...(systemPrompt ? [{ role: 'system', content: systemPrompt }] : []),
      { role: 'user', content: userContent },
    ],
    model: llmConfig?.proxy?.defaultModel || payload.model || undefined,
    ...(kbName ? { kbName } : {}),
  };

  try {
    const res = await fetchWithTimeout(chatUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify(chatBody),
    }, 60000);

    const rawText = await res.text();
    const latencyMs = Date.now() - startMs;
    let responseText = rawText;
    let tokenCount = null;
    try {
      const parsed = JSON.parse(rawText);
      responseText =
        parsed?.choices?.[0]?.message?.content ||
        parsed?.response ||
        parsed?.message ||
        parsed?.content ||
        rawText;
      tokenCount = parsed?.usage?.total_tokens || parsed?.tokenCount || null;
    } catch {}

    return json(res.ok ? 200 : res.status, {
      success: res.ok,
      response: responseText,
      assistantId,
      kbName,
      latencyMs,
      tokenCount,
      diagnostics: { endpoint: chatUrl, status: res.status },
    }, origin);
  } catch (err) {
    return json(200, {
      success: false,
      message: err.message,
      assistantId,
      kbName,
      latencyMs: Date.now() - startMs,
      tokenCount: null,
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

// --- Rubric routes ---

async function getRubric(assistantId, origin) {
  const raw = await getObjectText(`admin/rubrics/${assistantId}.json`);
  if (!raw) return json(200, { assistantId, items: [] }, origin);
  try { return json(200, JSON.parse(raw), origin); } catch { return json(200, { assistantId, items: [] }, origin); }
}

async function putRubric(assistantId, body, origin) {
  let payload;
  try {
    payload = parseBody(body);
  } catch (e) { return errorResponse(400, e.message, origin); }
  const data = { assistantId, items: payload.items || [] };
  await putObjectText(
    `admin/rubrics/${assistantId}.json`,
    JSON.stringify(data, null, 2) + '\n',
    'application/json'
  );
  return json(200, data, origin);
}

// --- Golden routes ---

async function getGolden(assistantId, actionId, origin) {
  const raw = await getObjectText(`admin/golden/${assistantId}/${actionId}.json`);
  if (!raw) return json(404, { error: 'No golden response saved' }, origin);
  try { return json(200, JSON.parse(raw), origin); } catch { return json(404, { error: 'Parse error' }, origin); }
}

async function putGolden(assistantId, actionId, body, origin) {
  let payload;
  try {
    payload = parseBody(body);
  } catch (e) { return errorResponse(400, e.message, origin); }
  if (payload.response === undefined || payload.response === null) {
    return errorResponse(400, 'response is required.', origin);
  }
  const data = { assistantId, actionId, response: String(payload.response), savedAt: new Date().toISOString() };
  await putObjectText(
    `admin/golden/${assistantId}/${actionId}.json`,
    JSON.stringify(data, null, 2) + '\n',
    'application/json'
  );
  return json(200, data, origin);
}

async function handleTest(method, path, body, origin) {
  if (method === 'POST' && path === '/figma-admin/api/test/connection') {
    let payload = null;
    if (body) { try { payload = parseBody(body); } catch {} }
    return testConnection(payload, origin);
  }

  if (method === 'POST' && path === '/figma-admin/api/test/assistant') {
    let payload;
    try { payload = parseBody(body); } catch (e) { return errorResponse(400, e.message, origin); }
    return testAssistant(payload, origin);
  }

  // Rubric routes
  const rubricMatch = path.match(/^\/figma-admin\/api\/test\/rubrics\/([^/]+)$/);
  if (rubricMatch) {
    const assistantId = decodeURIComponent(rubricMatch[1]);
    if (!SAFE_ID.test(assistantId)) return json(400, { error: 'Invalid assistantId' }, origin);
    if (method === 'GET') return getRubric(assistantId, origin);
    if (method === 'PUT') return putRubric(assistantId, body, origin);
    return json(405, { error: 'Method not allowed' }, origin);
  }

  // Golden routes
  const goldenMatch = path.match(/^\/figma-admin\/api\/test\/golden\/([^/]+)\/([^/]+)$/);
  if (goldenMatch) {
    const assistantId = decodeURIComponent(goldenMatch[1]);
    const actionId = decodeURIComponent(goldenMatch[2]);
    if (!SAFE_ID.test(assistantId) || !SAFE_ID.test(actionId)) return json(400, { error: 'Invalid ID' }, origin);
    if (method === 'GET') return getGolden(assistantId, actionId, origin);
    if (method === 'PUT') return putGolden(assistantId, actionId, body, origin);
    return json(405, { error: 'Method not allowed' }, origin);
  }

  return errorResponse(404, 'Not found', origin);
}

module.exports = { handleTest };
