import { json, noContent } from './http';
import { authBootstrapAllowedResponse, authLogoutResponse, authMeResponse } from './routes/auth-stubs';
import { healthResponse } from './routes/health';
import { createKbResponse, deleteKbResponse, getKbByIdResponse, getKbRegistryResponse, normalizeKbResponse, patchKbResponse } from './routes/kb';
import { getModelResponse, saveModelResponse } from './routes/model';
import { publishResponse } from './routes/publish';
import { validateResponse } from './routes/validate';
export async function route(event, context) {
    const method = event.requestContext.http.method.toUpperCase();
    const path = event.rawPath;
    const origin = context.origin;
    if (method === 'OPTIONS') {
        return noContent(origin);
    }
    if (method === 'GET' && path === '/api/health') {
        return json(200, await healthResponse(), origin);
    }
    if (method === 'GET' && path === '/api/model') {
        return json(200, await getModelResponse(), origin);
    }
    if (method === 'POST' && path === '/api/validate') {
        const result = await validateResponse(event.body);
        return json(result.statusCode, result.payload, origin);
    }
    if (method === 'POST' && path === '/api/save') {
        const result = await saveModelResponse(event.body, context.requestId);
        return json(result.statusCode, result.payload, origin);
    }
    if (method === 'POST' && path === '/api/publish') {
        return json(200, await publishResponse(context.requestId), origin);
    }
    if (method === 'GET' && path === '/api/kb/registry') {
        const result = await getKbRegistryResponse();
        return json(result.statusCode, result.payload, origin);
    }
    if (method === 'POST' && path === '/api/kb/normalize') {
        const result = await normalizeKbResponse(event.body);
        return json(result.statusCode, result.payload, origin);
    }
    if (method === 'POST' && path === '/api/kb') {
        const result = await createKbResponse(event.body, context.requestId);
        return json(result.statusCode, result.payload, origin);
    }
    if (path.startsWith('/api/kb/')) {
        const id = decodeURIComponent(path.replace('/api/kb/', ''));
        if (method === 'GET') {
            const result = await getKbByIdResponse(id);
            return json(result.statusCode, result.payload, origin);
        }
        if (method === 'PATCH') {
            const result = await patchKbResponse(id, event.body, context.requestId);
            return json(result.statusCode, result.payload, origin);
        }
        if (method === 'DELETE') {
            const result = await deleteKbResponse(id, context.requestId);
            return result.statusCode === 204
                ? noContent(origin)
                : json(result.statusCode, result.payload, origin);
        }
    }
    if (method === 'GET' && path === '/api/auth/me') {
        return json(200, authMeResponse(), origin);
    }
    if (method === 'GET' && path === '/api/auth/bootstrap-allowed') {
        return json(200, authBootstrapAllowedResponse(), origin);
    }
    if (method === 'POST' && path === '/api/auth/logout') {
        return json(200, authLogoutResponse(), origin);
    }
    if (method === 'GET' && path === '/api/build-info') {
        return json(200, {
            version: '',
            buildId: process.env.AWS_LAMBDA_FUNCTION_VERSION || '$LATEST',
            builtAt: new Date().toISOString()
        }, origin);
    }
    return json(404, { error: 'Not found' }, origin);
}
