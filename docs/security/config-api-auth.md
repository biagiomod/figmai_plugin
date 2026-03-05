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
- Restrict CORS origin once deployment domain is stable.

## Future Upgrade Path (not implemented here)

Move to Cognito + JWT authorizer:

- API Gateway JWT authorizer validates user tokens
- Lambda reads identity claims from request context
- Remove shared static token from deployment config
