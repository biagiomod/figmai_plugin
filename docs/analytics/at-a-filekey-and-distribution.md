# Analytics Tagging Assistant — fileKey and plugin distribution

## Summary

AT-A builds links to nodes in the form:

- **Preferred:** `https://www.figma.com/design/{fileKey}?node-id={nodeId}` (when `figma.fileKey` is available)
- **Fallback:** `figma://node-id={nodeId}` (when `figma.fileKey` is undefined)

`figma.fileKey` is only available when the plugin runs as a **private/internal** plugin and the manifest has `"enablePrivatePluginApi": true`.

## Distribution mode vs fileKey

| Distribution | `figma.fileKey` | AT-A link behavior |
|-------------|------------------|---------------------|
| **Private / internal** (org plugin, development) | Available when `enablePrivatePluginApi: true` in manifest | HTTPS links are generated. |
| **Public / community** (published to Figma Community) | **Remains undefined** (Figma does not expose fileKey for public plugins) | AT-A uses `figma://` links only. Web URLs cannot be generated reliably. |

## If the plugin is public/community

- **fileKey will remain undefined.** We cannot generate `https://www.figma.com/design/...` links from the plugin.
- AT-A continues to use **figma://** links. Optionally, you can:
  - Rely on "Copy node-id" or "Open in Figma" behavior (e.g. copy node-id and open manually in browser if the user has the file URL).
  - Document in UI that links are deep links and work when the file is open in the Figma desktop app.

## Debugging link choice

With debug scope `subsystem:analytics_tagging` enabled (in `CONFIG.dev.debug.scopes['subsystem:analytics_tagging']` or via `subsystem:*`), the plugin logs:

- **When fileKey is available:** `fileKey available; using https link` (with `fileKey`, `nodeId`).
- **When fileKey is unavailable:** `fileKey unavailable; using figma:// fallback` (with `nodeId`).

This makes it easy to confirm at runtime whether the plugin has access to the private API.
