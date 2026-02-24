# Custom Knowledge Base: Evergreen Assistant

Add your custom knowledge base content here. This content will be merged with the public knowledge base according to the policy configured in `config.json`.

## Usage

1. Edit this file with your organization-specific evergreen guidelines
2. Configure the merge policy in `../config.json`:
   - `"append"`: Adds this content to the public knowledge base
   - `"override"`: Replaces the public knowledge base entirely
3. Rebuild the plugin: `npm run build`
