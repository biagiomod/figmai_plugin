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

  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/d95772ae-a4b7-4c54-acb0-657380f24cd8',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'34860e'},body:JSON.stringify({sessionId:'34860e',runId:'pre-fix',hypothesisId:'H5',location:'infra/config-api/src/cors.ts:24',message:'corsHeaders computed',data:{origin:origin||null,allowedMatch:!!(origin&&allowed.has(origin))},timestamp:Date.now()})}).catch(()=>{});
  // #endregion

  return headers
}
