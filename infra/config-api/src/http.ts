import type { APIGatewayProxyStructuredResultV2 } from 'aws-lambda'
import { corsHeaders } from './cors'

export function json(
  statusCode: number,
  payload: unknown
): APIGatewayProxyStructuredResultV2 {
  return {
    statusCode,
    headers: {
      ...corsHeaders(),
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  }
}

export function text(
  statusCode: number,
  body: string,
  contentType: string
): APIGatewayProxyStructuredResultV2 {
  return {
    statusCode,
    headers: {
      ...corsHeaders(),
      'Content-Type': contentType
    },
    body
  }
}

export function noContent(): APIGatewayProxyStructuredResultV2 {
  return {
    statusCode: 204,
    headers: corsHeaders(),
    body: ''
  }
}

export function parseJsonBody<T>(body: string | undefined | null): T {
  if (!body) {
    throw new Error('Request body is required')
  }
  return JSON.parse(body) as T
}

