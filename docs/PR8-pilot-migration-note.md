# PR8: Pilot migration (General assistant)

## What was done

The **General** assistant in `custom/assistants.manifest.json` was migrated to use optional `instructionBlocks` so that preamble assembly goes through the new instruction-assembly path while keeping behavior identical.

- One block was added: `general-system` with `kind: "system"` and content equal to the first paragraph of the existing prompt (the same text that `getShortInstructions` used for the preamble). So the preamble string sent to the provider is unchanged.

## Rollback

To revert to the legacy path for General: remove the `instructionBlocks` field from the General assistant in `custom/assistants.manifest.json`. The runtime falls back to `getShortInstructions(assistant)` when no instruction blocks are present or all are disabled.

## Extending the pilot

To add more structure later (e.g. separate blocks for Role, Guidelines, Context), add more entries to `instructionBlocks`. Order is preserved; disabled blocks (`enabled: false`) are omitted from the preamble.
