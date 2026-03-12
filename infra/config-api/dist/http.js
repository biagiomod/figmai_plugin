import { corsHeaders } from './cors';
export function json(statusCode, payload, origin, extraHeaders) {
    return {
        statusCode,
        headers: {
            ...corsHeaders(origin),
            'Content-Type': 'application/json',
            ...(extraHeaders || {})
        },
        body: JSON.stringify(payload)
    };
}
export function text(statusCode, body, contentType, origin, extraHeaders) {
    return {
        statusCode,
        headers: {
            ...corsHeaders(origin),
            'Content-Type': contentType,
            ...(extraHeaders || {})
        },
        body
    };
}
export function noContent(origin, extraHeaders) {
    return {
        statusCode: 204,
        headers: {
            ...corsHeaders(origin),
            ...(extraHeaders || {})
        },
        body: ''
    };
}
export function parseJsonBody(body) {
    if (!body) {
        throw new Error('Request body is required');
    }
    return JSON.parse(body);
}
