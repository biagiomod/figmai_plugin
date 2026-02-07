# Knowledge bases (normalized KB)

This directory holds **normalized** knowledge base documents (`.kb.json`) that can be referenced by assistant IDs. It is separate from `custom/knowledge/`, which remains the SSOT for assistant-scoped markdown knowledge (generate-custom-overlay, ACE Knowledge tab).

## Conventions

- **One file per KB:** `custom/knowledge-bases/<id>.kb.json`
- **ID** = filename without `.kb.json`; must be kebab-case (`[a-z0-9]+(?:-[a-z0-9]+)*`).
- **Registry:** `custom/knowledge-bases/registry.json` lists all known KBs with `id`, `title`, `filePath` (relative to this directory), and optional `tags`, `version`.

## Schema

Each `.kb.json` file must match the canonical KB schema (see `admin-editor/src/kbSchema.ts`):

- **Metadata:** `id`, `title` (required); `source`, `updatedAt`, `version`, `tags` (optional).
- **Sections:** `purpose`, `scope`, `definitions`, `rulesConstraints`, `doDont` (`{ do: string[], dont: string[] }`), `examples`, `edgeCases`.

## Adding a KB

1. Create or convert content to normalized JSON (e.g. with `npm run kb:convert`).
2. Save the file as `custom/knowledge-bases/<id>.kb.json`.
3. Add an entry to `registry.json`:
   - `id`, `title`, `filePath` (e.g. `my-kb.kb.json`) required; `tags`, `version` optional.

### Convert script: write and overwrite

- **Normal write:** `npm run kb:convert -- --from json --input ./loose.json --id my-kb --write`  
  Writes `custom/knowledge-bases/my-kb.kb.json` and updates the registry. **If the file already exists, the script aborts with an error** and exits non-zero.
- **Forced overwrite:** Add `--force` to overwrite an existing file:  
  `npm run kb:convert -- --from json --input ./loose.json --id my-kb --write --force`

## Referencing from assistants

Assistants can list KB IDs in `knowledgeBaseRefs` in the manifest. In PR11a the plugin does **not** yet load or merge KB content at runtime; the registry and files are the foundation for future wiring.
