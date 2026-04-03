/**
 * ACE runtime configuration — reference documentation.
 *
 * config.js is gitignored (environment-specific). Copy the right template:
 *
 *   Local dev (npm run admin):
 *     cp admin-editor/public/config.local.example.js admin-editor/public/config.js
 *
 *   AWS / hosted Config API:
 *     cp admin-editor/public/config.aws.example.js admin-editor/public/config.js
 *     # Then edit config.js to set the correct apiBase URL.
 *
 * -------------------------------------------------------------------------
 * apiBase — where the ACE API lives
 * -------------------------------------------------------------------------
 *   ''                                    → same-origin (local dev, reverse proxy)
 *   'https://api.example.com'             → cross-origin Config API (requires authMode: 'bearer')
 *   '/figmai/ace'                         → subpath reverse proxy
 *
 * -------------------------------------------------------------------------
 * authMode — how the frontend authenticates with the API
 * -------------------------------------------------------------------------
 *   'cookie'  → same-origin or reverse-proxied; browser sends ace_sid cookie automatically
 *   'bearer'  → cross-origin; user is prompted for a token on first load,
 *               stored in sessionStorage (cleared when tab closes)
 *
 * IMPORTANT: Do NOT put secrets (API keys, passwords) in config.js —
 * it is served as a public static asset. Bearer tokens are entered at runtime.
 */
window.__ACE_CONFIG__ = {
  apiBase: '',
  authMode: 'cookie'
};
