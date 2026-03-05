import type { APIGatewayProxyEventV2 } from 'aws-lambda'
import { json, noContent } from './http'
import { authBootstrapAllowedResponse, authLogoutResponse, authMeResponse } from './routes/auth-stubs'
import {
  createKbResponse,
  deleteKbResponse,
  getKbByIdResponse,
  getKbRegistryResponse,
  normalizeKbResponse,
  patchKbResponse
} from './routes/kb'
import { getModelResponse, saveModelResponse } from './routes/model'
import { publishResponse } from './routes/publish'
import { validateResponse } from './routes/validate'

export async function route(event: APIGatewayProxyEventV2) {
  const method = event.requestContext.http.method.toUpperCase()
  const path = event.rawPath

  if (method === 'OPTIONS') {
    return noContent()
  }

  if (method === 'GET' && path === '/api/model') {
    return json(200, await getModelResponse())
  }
  if (method === 'POST' && path === '/api/validate') {
    const result = await validateResponse(event.body)
    return json(result.statusCode, result.payload)
  }
  if (method === 'POST' && path === '/api/save') {
    const result = await saveModelResponse(event.body)
    return json(result.statusCode, result.payload)
  }
  if (method === 'POST' && path === '/api/publish') {
    return json(200, await publishResponse())
  }

  if (method === 'GET' && path === '/api/kb/registry') {
    const result = await getKbRegistryResponse()
    return json(result.statusCode, result.payload)
  }
  if (method === 'POST' && path === '/api/kb/normalize') {
    const result = await normalizeKbResponse(event.body)
    return json(result.statusCode, result.payload)
  }
  if (method === 'POST' && path === '/api/kb') {
    const result = await createKbResponse(event.body)
    return json(result.statusCode, result.payload)
  }

  if (path.startsWith('/api/kb/')) {
    const id = decodeURIComponent(path.replace('/api/kb/', ''))
    if (method === 'GET') {
      const result = await getKbByIdResponse(id)
      return json(result.statusCode, result.payload)
    }
    if (method === 'PATCH') {
      const result = await patchKbResponse(id, event.body)
      return json(result.statusCode, result.payload)
    }
    if (method === 'DELETE') {
      const result = await deleteKbResponse(id)
      return result.statusCode === 204 ? noContent() : json(result.statusCode, result.payload)
    }
  }

  if (method === 'GET' && path === '/api/auth/me') {
    return json(200, authMeResponse())
  }
  if (method === 'GET' && path === '/api/auth/bootstrap-allowed') {
    return json(200, authBootstrapAllowedResponse())
  }
  if (method === 'POST' && path === '/api/auth/logout') {
    return json(200, authLogoutResponse())
  }

  if (method === 'GET' && path === '/api/build-info') {
    return json(200, {
      version: '',
      buildId: process.env.AWS_LAMBDA_FUNCTION_VERSION || '$LATEST',
      builtAt: new Date().toISOString()
    })
  }

  return json(404, { error: 'Not found' })
}

