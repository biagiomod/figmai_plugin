import type { APIGatewayProxyStructuredResultV2 } from 'aws-lambda'
import { corsHeaders } from './cors'

export function json(
  statusCode: number,
  payload: unknown,
  origin?: string,
  extraHeaders?: Record<string, string>
): APIGatewayProxyStructuredResultV2 {
  return {
    statusCode,
    headers: {
      ...corsHeaders(origin),
      'Content-Type': 'application/json',
      ...(extraHeaders || {})
    },
    body: JSON.stringify(payload)
  }
}

export function text(
  statusCode: number,
  body: string,
  contentType: string,
  origin?: string,
  extraHeaders?: Record<string, string>
): APIGatewayProxyStructuredResultV2 {
  return {
    statusCode,
    headers: {
      ...corsHeaders(origin),
      'Content-Type': contentType,
      ...(extraHeaders || {})
    },
    body
  }
}

export function noContent(origin?: string, extraHeaders?: Record<string, string>): APIGatewayProxyStructuredResultV2 {
  return {
    statusCode: 204,
    headers: {
      ...corsHeaders(origin),
      ...(extraHeaders || {})
    },
    body: ''
  }
}

export function parseJsonBody<T>(body: string | undefined | null): T {
  if (!body) {
    throw new Error('Request body is required')
  }
  return JSON.parse(body) as T
}

