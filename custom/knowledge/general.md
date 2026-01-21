# Custom Knowledge Base: General Assistant

Add your custom knowledge base content here. This content will be merged with the public knowledge base according to the policy configured in `config.json`.

## Usage

1. Edit this file with your organization-specific guidelines, examples, or instructions
2. Configure the merge policy in `../config.json`:
   - `"append"`: Adds this content to the public knowledge base
   - `"override"`: Replaces the public knowledge base entirely
3. Rebuild the plugin: `npm run build`

## Example Content

You might include:
- Brand guidelines and style standards
- Internal design system references
- Company-specific processes or workflows
- Domain-specific terminology or examples
