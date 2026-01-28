# Connection Modes

**Purpose:** Compare Proxy and Internal API modes for LLM/chat requests.

---

## Modes

- **Proxy:** Plugin sends chat requests to a proxy server (e.g. `POST {proxyBaseUrl}/v1/chat`). Configure via [Proxy Setup](setup/proxy-setup.md).
- **Internal API:** Plugin sends chat requests to an internal API URL (single endpoint). When Internal API is enabled, **all** LLM/chat requests use the Internal API only; proxy is ignored. Configure via [Internal API Setup](setup/internal-api-setup.md).

## Precedence

When Internal API is enabled in settings (`connectionType === 'internal-api'` and `internalApiUrl` set), the plugin uses **Internal API only** for every LLM request. Proxy and other providers are not used. See [Internal API Routing and Stability](plans/internal-api-routing-and-stability-implementation.md) for details.

## Next steps

- **Proxy:** [Proxy Setup](setup/proxy-setup.md)
- **Internal API:** [Internal API Setup](setup/internal-api-setup.md)
