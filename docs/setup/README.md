# Setup Guides — Index

| Guide | Scope | When to use |
|-------|-------|-------------|
| [ace-custom-spring-wrapper.md](./ace-custom-spring-wrapper.md) | ACE admin-editor custom deployment via Spring Boot reverse-proxy wrapper. Auth, RBAC, allowlist, rate-limit, audit, Docker. | Enterprise or custom ACE deployment behind SSO / identity provider. |
| [proxy-setup.md](./proxy-setup.md) | Figma plugin LLM proxy (`figmai-proxy` + ngrok). Routes plugin chat requests to OpenAI. | Local development of the Figma plugin with OpenAI. |
| [internal-api-setup.md](./internal-api-setup.md) | Figma plugin "Internal API" connection mode. Points the plugin at an org-hosted LLM backend. | Org-hosted LLM endpoint (replaces proxy when enabled). |

> **Note:** "proxy-setup" and "ace-custom-spring-wrapper" both use the term "proxy" but refer to **completely different systems**. proxy-setup is about the Figma plugin's LLM call chain; the ACE wrapper is about securing the ACE admin-editor for custom deployments.
