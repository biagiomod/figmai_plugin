/**
 * ACE runtime configuration — example / documentation.
 *
 * Copy this file to config.js and edit for your deployment.
 * config.js is loaded before app.js via a <script> tag in index.html.
 *
 * IMPORTANT: Do NOT put secrets (passwords, API keys) in this file.
 * Bearer tokens are entered at runtime and stored in sessionStorage.
 */
window.__ACE_CONFIG__ = {
  // --------------------------------------------------------------------------
  // apiBase — where the ACE API lives
  // --------------------------------------------------------------------------
  //
  // Local development (default):
  //   apiBase: ''
  //   App and API are on the same origin (http://localhost:3333).
  //
  // Reverse proxy on production server:
  //   apiBase: ''
  //   nginx/Apache proxies /api/* to the real Config API.
  //   Frontend sees same-origin requests.
  //
  // Cross-origin Config API:
  //   apiBase: 'https://config-api.example.com'
  //   Requires authMode: 'bearer' and CORS on the API.
  //
  // Subpath deployment with reverse proxy:
  //   apiBase: ''
  //   Deploy files under /figmai/ace/. Relative asset paths work.
  //   nginx proxies /figmai/ace/api/* to the Config API.
  //
  apiBase: '',

  // --------------------------------------------------------------------------
  // authMode — how the frontend authenticates with the API
  // --------------------------------------------------------------------------
  //
  // 'cookie' (default):
  //   Same-origin or reverse-proxied. Browser sends ace_sid cookie
  //   automatically. No user action needed.
  //
  // 'bearer':
  //   Cross-origin. User is prompted for a token on first load.
  //   Token is stored in sessionStorage (cleared when tab closes).
  //   Sent as Authorization: Bearer <token> on every request.
  //
  authMode: 'cookie'
};
