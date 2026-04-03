/**
 * ACE runtime config — AWS / hosted Config API template.
 *
 * Use this when the ACE frontend is served statically (e.g. from S3/CloudFront
 * or any static host) and the API is the deployed AWS Lambda Config API.
 *
 * One-time setup:
 *   cp admin-editor/public/config.aws.example.js admin-editor/public/config.js
 *   # Edit config.js: replace the apiBase URL with your real API Gateway URL.
 *   # Then deploy or serve the public/ directory statically.
 *
 * config.js is gitignored — never commit it.
 * Do NOT put secrets (tokens, passwords) in this file — they are entered at runtime.
 */
window.__ACE_CONFIG__ = {
  apiBase: 'https://85caqhbzff.execute-api.us-east-2.amazonaws.com/figma-admin',
  authMode: 'bearer' // bearer token: user is prompted on first load, stored in sessionStorage
};
