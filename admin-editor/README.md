# Admin Config Editor

Local, browser-accessible backend for editing plugin custom config and assistants without touching TypeScript. **Phase 1:** server (GET /api/model, POST /api/validate, POST /api/save). **Phase 2:** browser UI in `admin-editor/public` (index.html, app.js, styles.css).

## How to run

From the plugin repo root:

```bash
npm run admin
```

Or:

```bash
npm run admin:dev
```

Then open **http://localhost:3333** in your browser. The Phase 2 UI loads the model, provides tabs (Config, Assistants, Knowledge, Content Models, Design System Registries), and a footer with Reload, Validate, and Save. All writes go through the server; the UI only calls the API.

To use a different port:

```bash
ADMIN_EDITOR_PORT=4444 npm run admin
```

## What files are editable

The editor reads and writes **only** these sources of truth:

- **custom/config.json** – UI mode, LLM, knowledge base policies, network, resources, design systems, analytics
- **custom/assistants.manifest.json** – Assistant list (id, label, intro, quick actions, prompt template)
- **custom/knowledge/*.md** – Custom knowledge overlay per assistant (one `.md` per assistant id)
- **docs/content-models.md** – Content Table presets (raw markdown)
- **custom/design-systems/&lt;id&gt;/registry.json** – Design system registry JSON per id

The editor **never** edits TypeScript (`.ts`/`.tsx`) or runs the plugin build or publish.

## What runs after save

After a successful save, the server runs these **generators** (not build/publish):

1. `npm run generate-assistants`
2. `npm run generate-custom-overlay`
3. `npm run generate-presets`

You must run **`npm run build`** (and publish) yourself. The save response includes **next steps**: “Ask the plugin owner to run `npm run build` and then publish via the normal process.”

## Preview (dry-run)

**Preview changes** calls `POST /api/save?dryRun=1` and shows which files would be written and which generators would run. The UI compares against a **canonical** model state: when you load the model, it is canonicalized so that **config** and **assistants manifest** match server ordering (`canonicalizeConfig`, `canonicalizeAssistantsManifest`); other objects use deterministic recursive key sort; markdown raw (`contentModelsRaw`) is unchanged. That canonical form is used as both the baseline and the initial edited state. So if you make no semantic edits, preview shows no changes (no format-only diffs from key order or newlines). After a save, written files are in the same canonical form, so future load → preview with no edits stays empty.

## API

- **GET /api/model** – Load current model from repo files. Returns `{ model, meta, validation }`.
- **POST /api/validate** – Validate a payload (same shape as `model`). Returns `{ errors, warnings }`. Does not write.
- **POST /api/save** – Validate, backup files, write, run generators. Returns a save summary and next steps.

## Backups

Before each write, the server copies the target file under **admin-editor/.backups/&lt;timestamp&gt;/**, mirroring the path (e.g. `custom/config.json` → `.backups/2025-01-21T12-00-00/config.json`). Use these to restore if needed.

## What the editor does NOT do

- Does **not** compile or build the plugin
- Does **not** publish the plugin
- Does **not** edit any `.ts` or `.tsx` files

## Troubleshooting

- **Port in use:** Set `ADMIN_EDITOR_PORT` to another port (e.g. `3334`).
- **Schema errors on save:** Check POST /api/validate first. Fix duplicate assistant ids, missing required fields, or invalid enums (`kind`, `tag.variant`).
- **Generators fail after save:** Run `npm run generate-assistants`, `npm run generate-custom-overlay`, and `npm run generate-presets` from the repo root and fix any script errors.
