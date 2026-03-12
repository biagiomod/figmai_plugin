export function isAuthorized(event) {
    const expectedToken = (process.env.CONFIG_API_TOKEN || '').trim();
    if (!expectedToken)
        return false;
    const authHeader = event.headers?.authorization || event.headers?.Authorization || '';
    if (!authHeader.startsWith('Bearer '))
        return false;
    const token = authHeader.slice('Bearer '.length).trim();
    return token === expectedToken;
}
