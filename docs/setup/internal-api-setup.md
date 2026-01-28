# Internal API Setup

**Purpose:** Configure the plugin to use your organization's Internal API for LLM/chat requests.

---

## Steps

1. Open the plugin and go to **Settings**.
2. Select **Internal API** as the connection type.
3. Enter the **Internal API URL** (e.g. your backend endpoint). Ensure the origin is listed in `manifest.json` network access (see [Custom Overlay Guide](../../custom/README.md) for `extraAllowedDomains` and manifest patching).
4. Save settings. All subsequent LLM/chat requests will use the Internal API only; proxy is ignored when Internal API is enabled.
5. Use **Test connection** to verify.

## Routing rule

When Internal API is enabled, **all** LLM requests go through the Internal API. Proxy and other providers are not used. For full details and invariants, see [Internal API Routing and Stability](../plans/internal-api-routing-and-stability-implementation.md).

## Troubleshooting

- [Internal API Parsing](../troubleshooting/internal-api-parsing.md) — response parsing issues.
