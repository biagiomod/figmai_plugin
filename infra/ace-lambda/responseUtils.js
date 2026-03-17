'use strict';

/**
 * CORS header builder.
 * Reads CORS_ALLOW_ORIGINS env var (comma-separated list).
 */
function corsHeaders(origin) {
  const allowed = (process.env.CORS_ALLOW_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const headers = {
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
  if (allowed.includes('*')) {
    headers['Access-Control-Allow-Origin'] = '*';
  } else if (origin && allowed.includes(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Credentials'] = 'true';
  }
  return headers;
}

/**
 * Build a JSON Lambda response.
 */
function json(statusCode, body, origin, extraHeaders) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders(origin),
      ...(extraHeaders || {}),
    },
    body: JSON.stringify(body),
  };
}

/**
 * Build a plain-text Lambda response.
 */
function text(statusCode, body, contentType, origin) {
  return {
    statusCode,
    headers: {
      'Content-Type': contentType || 'text/plain',
      ...corsHeaders(origin),
    },
    body: String(body),
  };
}

/**
 * Build a 204 No Content response.
 */
function noContent(origin) {
  return { statusCode: 204, headers: corsHeaders(origin), body: '' };
}

/**
 * Parse a raw JSON body (string or already-parsed object).
 * Throws on missing or invalid JSON.
 */
function parseBody(rawBody) {
  if (!rawBody) throw new Error('Request body is required');
  if (typeof rawBody === 'object') return rawBody;
  try {
    return JSON.parse(rawBody);
  } catch {
    throw new Error('Invalid JSON body');
  }
}

/**
 * Convenience error response.
 */
function errorResponse(statusCode, message, origin, extra) {
  return json(statusCode, { error: message, ...extra }, origin);
}

module.exports = { corsHeaders, json, text, noContent, parseBody, errorResponse };
