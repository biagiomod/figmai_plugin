import type { APIGatewayProxyEventV2 } from 'aws-lambda'
import { isAuthorized } from './auth'
import { json } from './http'
import { route } from './router'

export async function handler(event: APIGatewayProxyEventV2) {
  try {
    const method = event.requestContext.http.method.toUpperCase()
    if (method !== 'OPTIONS') {
      const expectedToken = (process.env.CONFIG_API_TOKEN || '').trim()
      if (!expectedToken) {
        return json(500, { error: 'CONFIG_API_TOKEN is not configured' })
      }
      if (!isAuthorized(event)) {
        return json(401, { error: 'Unauthorized' })
      }
    }
    return await route(event)
  } catch (error) {
    return json(500, {
      error: error instanceof Error ? error.message : String(error)
    })
  }
}

