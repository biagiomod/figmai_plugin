import type { APIGatewayProxyEventV2 } from 'aws-lambda'

export function isAuthorized(event: APIGatewayProxyEventV2): boolean {
  const expectedToken = (process.env.CONFIG_API_TOKEN || '').trim()
  if (!expectedToken) return false
  const authHeader = event.headers?.authorization || event.headers?.Authorization || ''
  if (!authHeader.startsWith('Bearer ')) return false
  const token = authHeader.slice('Bearer '.length).trim()
  return token === expectedToken
}

