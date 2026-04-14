function parseAllowedOrigins(): Set<string> {
  const raw = (process.env.CORS_ALLOW_ORIGINS || '').trim()
  const origins = raw
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean)
  return new Set(origins)
}

export function corsHeaders(origin?: string): Record<string, string> {
  const allowed = parseAllowedOrigins()
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'GET,POST,PATCH,DELETE,OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type,Authorization',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin'
  }

  if (origin && allowed.has(origin)) {
    headers['Access-Control-Allow-Origin'] = origin
  }

  return headers
}
