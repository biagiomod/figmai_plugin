import { randomUUID } from 'crypto'
import type { APIGatewayProxyEventV2 } from 'aws-lambda'

export interface RequestContext {
  requestId: string
  method: string
  path: string
  origin?: string
  startedAtMs: number
}

export function createRequestContext(event: APIGatewayProxyEventV2): RequestContext {
  const method = event.requestContext.http.method.toUpperCase()
  return {
    requestId: event.requestContext.requestId || randomUUID(),
    method,
    path: event.rawPath,
    origin: event.headers?.origin || event.headers?.Origin,
    startedAtMs: Date.now()
  }
}

export function logRequestComplete(input: {
  requestId: string
  method: string
  path: string
  status: number
  latencyMs: number
  errorCode?: string
}): void {
  console.log(JSON.stringify({
    type: 'request',
    requestId: input.requestId,
    method: input.method,
    path: input.path,
    status: input.status,
    latencyMs: input.latencyMs,
    ...(input.errorCode ? { errorCode: input.errorCode } : {})
  }))
}

export function logAction(input: {
  requestId: string
  action: string
  detail: Record<string, unknown>
}): void {
  console.log(JSON.stringify({
    type: 'action',
    requestId: input.requestId,
    action: input.action,
    ...input.detail
  }))
}
