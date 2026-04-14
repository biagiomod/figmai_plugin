import type { APIGatewayProxyEventV2 } from 'aws-lambda'
import type { APIGatewayProxyStructuredResultV2 } from 'aws-lambda'
import { isAuthorized } from './auth'
import { json } from './http'
import { createRequestContext, logRequestComplete } from './logging'
import { route } from './router'

export async function handler(event: APIGatewayProxyEventV2) {
  const context = createRequestContext(event)
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
    return wrapped
  }

  try {
    const MAX_BODY_BYTES = 1_048_576 // 1 MB
    if (event.body && Buffer.byteLength(event.body, 'utf8') > MAX_BODY_BYTES) {
      errorCode = 'REQUEST_TOO_LARGE'
      return withRequestIdHeader(json(413, { error: 'Request body too large' }, context.origin))
    }

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

