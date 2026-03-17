'use strict';

/**
 * Validate Bearer token from Lambda event headers.
 * Expected env var: CONFIG_API_TOKEN
 */
function isAuthorized(event) {
  const token = process.env.CONFIG_API_TOKEN;
  if (!token) return false;
  const headers = event.headers || {};
  const authHeader = headers['authorization'] || headers['Authorization'] || '';
  if (!authHeader.toLowerCase().startsWith('bearer ')) return false;
  const provided = authHeader.slice(7).trim();
  return provided === token;
}

module.exports = { isAuthorized };
