import type { APIGatewayProxyEventV2 } from 'aws-lambda'
import type { APIGatewayProxyStructuredResultV2 } from 'aws-lambda'
import { isAuthorized } from './auth'
import { json } from './http'
import { createRequestContext, logRequestComplete } from './logging'
import { route } from './router'

export async function handler(event: APIGatewayProxyEventV2) {
  const context = createRequestContext(event)
  // #region agent log
  fetch('http://127.0.0.1:7242/ingest/d95772ae-a4b7-4c54-acb0-657380f24cd8',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'34860e'},body:JSON.stringify({sessionId:'34860e',runId:'pre-fix',hypothesisId:'H1',location:'infra/config-api/src/handler.ts:10',message:'handler entry',data:{method:context.method,path:context.path,hasOrigin:!!context.origin},timestamp:Date.now()})}).catch(()=>{});
  // #endregion
  let status = 500
  let errorCode: string | undefined

  const withRequestIdHeader = (response: APIGatewayProxyStructuredResultV2) => {
    status = response.statusCode || 500
    const wrapped = {
      ...response,
      headers: {
        ...(response.headers || {}),
        'x-request-id': context.requestId
      }
    }
    // #region agent log
    fetch('http://127.0.0.1:7242/ingest/d95772ae-a4b7-4c54-acb0-657380f24cd8',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'34860e'},body:JSON.stringify({sessionId:'34860e',runId:'pre-fix',hypothesisId:'H1',location:'infra/config-api/src/handler.ts:22',message:'response wrapped with x-request-id',data:{status:wrapped.statusCode,hasRequestId:!!wrapped.headers?.['x-request-id']},timestamp:Date.now()})}).catch(()=>{});
    // #endregion
    return wrapped
  }

  try {
    const method = context.method
    const isHealth = context.path === '/api/health'
    if (method !== 'OPTIONS' && !isHealth) {
      const expectedToken = (process.env.CONFIG_API_TOKEN || '').trim()
      if (!expectedToken) {
        errorCode = 'TOKEN_NOT_CONFIGURED'
        return withRequestIdHeader(
          json(500, { error: 'CONFIG_API_TOKEN is not configured' }, context.origin)
        )
      }
      if (!isAuthorized(event)) {
        errorCode = 'UNAUTHORIZED'
        return withRequestIdHeader(json(401, { error: 'Unauthorized' }, context.origin))
      }
    }
    return withRequestIdHeader(await route(event, context))
  } catch (error) {
    errorCode = 'INTERNAL_ERROR'
    return withRequestIdHeader(
      json(
        500,
        {
          error: error instanceof Error ? error.message : String(error)
        },
        context.origin
      )
    )
  } finally {
    logRequestComplete({
      requestId: context.requestId,
      method: context.method,
      path: context.path,
      status,
      latencyMs: Date.now() - context.startedAtMs,
      errorCode
    })
  }
}

