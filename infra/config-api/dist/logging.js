import { randomUUID } from 'crypto';
export function createRequestContext(event) {
    const method = event.requestContext.http.method.toUpperCase();
    return {
        requestId: event.requestContext.requestId || randomUUID(),
        method,
        path: event.rawPath,
        origin: event.headers?.origin || event.headers?.Origin,
        startedAtMs: Date.now()
    };
}
export function logRequestComplete(input) {
    console.log(JSON.stringify({
        type: 'request',
        requestId: input.requestId,
        method: input.method,
        path: input.path,
        status: input.status,
        latencyMs: input.latencyMs,
        ...(input.errorCode ? { errorCode: input.errorCode } : {})
    }));
}
export function logAction(input) {
    console.log(JSON.stringify({
        type: 'action',
        requestId: input.requestId,
        action: input.action,
        ...input.detail
    }));
}
