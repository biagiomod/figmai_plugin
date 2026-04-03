/**
 * ACE runtime config — LOCAL DEV template.
 *
 * Use this when running ACE via: npm run admin
 * The frontend and API are served by the same local Express server.
 *
 * One-time setup:
 *   cp admin-editor/public/config.local.example.js admin-editor/public/config.js
 *   npm run admin
 *   open http://localhost:3333/home/admin
 *
 * config.js is gitignored — never commit it.
 */
window.__ACE_CONFIG__ = {
  apiBase: '',       // same-origin: requests go to the local Express server
  authMode: 'cookie' // cookie-based session auth (default for local dev)
};
