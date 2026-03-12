# Config API Auth (Phase 0)

## Current Mode: Shared Bearer Token

Phase 0 uses a shared token configured in Lambda env var:

- `CONFIG_API_TOKEN=<long random token>`

Every non-`OPTIONS` request must include:

```http
Authorization: Bearer <CONFIG_API_TOKEN>
```

On missing/invalid token, API returns:

```json
{ "error": "Unauthorized" }
```

with HTTP `401`.

## Frontend Behavior

- Hosted static ACE uses `authMode: "bearer"` in `config.js`
- On load, ACE prompts for token and stores it in `sessionStorage`
- Requests include `Authorization: Bearer <token>`

## Security Notes

- Treat this as a Phase 0 bootstrap mechanism.
- Rotate token periodically.
- Use HTTPS-only endpoints.
- Keep token out of source-controlled files.
- Restrict CORS with `CORS_ALLOW_ORIGINS` once deployment domains are stable.

## Deterministic CORS

The API now uses an explicit allowlist (comma-separated env var):

```bash
CORS_ALLOW_ORIGINS=http://localhost:3333,http://127.0.0.1:3334,https://figmai.otherdesign.com
```

Behavior:

- If `Origin` is in the allowlist, API echoes `Access-Control-Allow-Origin: <origin>`.
- If not in allowlist, `Access-Control-Allow-Origin` is omitted.
- `Vary: Origin` is always returned.

This avoids wildcard CORS drift and makes browser behavior deterministic.

## Request IDs and Logging

Every API response now includes:

```http
x-request-id: <request-id>
```

Logs emit one JSON line per request:

```json
{"type":"request","requestId":"...","method":"POST","path":"/api/save","status":200,"latencyMs":42}
```

Action logs are also emitted for `save`, `publish`, and KB mutations.

## Future Upgrade Path (not implemented here)

Move to Cognito + JWT authorizer:

- API Gateway JWT authorizer validates user tokens
- Lambda reads identity claims from request context
- Remove shared static token from deployment config
