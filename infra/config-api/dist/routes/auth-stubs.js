export function authMeResponse() {
    return {
        user: {
            username: 'admin',
            role: 'admin'
        },
        allowedTabs: []
    };
}
export function authBootstrapAllowedResponse() {
    return {
        allowed: false,
        reason: 'Authentication is handled by bearer token.'
    };
}
export function authLogoutResponse() {
    return {
        success: true
    };
}
