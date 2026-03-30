/**
 * ACE runtime configuration.
 *
 * This file is loaded before app.js and sets window.__ACE_CONFIG__.
 * Edit the values below for your deployment environment.
 * Do NOT put secrets in this file -- it is served as a public static asset.
 */
window.__ACE_CONFIG__ = {
  /**
   * API base URL.
   *   ''                             -> same-origin (local dev, reverse proxy)
   *   'https://api.example.com'      -> cross-origin Config API
   *   '/figmai/ace'                  -> subpath reverse proxy
   */
  apiBase: 'https://85caqhbzff.execute-api.us-east-2.amazonaws.com/figma-admin',

  /**
   * Auth mode.
   *   'cookie'  -> same-origin cookie auth (default, local dev, reverse proxy)
   *   'bearer'  -> cross-origin bearer token auth (static hosting + remote API)
   */
  authMode: 'bearer'
};
