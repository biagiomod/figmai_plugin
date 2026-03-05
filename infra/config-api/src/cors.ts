export function corsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': process.env.CORS_ALLOW_ORIGIN || '*',
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Max-Age': '86400'
  }
}
