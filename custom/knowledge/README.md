# Custom Knowledge Bases

This directory contains custom knowledge base markdown files that can be merged with public assistant knowledge bases.

## File Naming

Knowledge base files must be named by assistant ID:

- `general.md` → Merges with `general` assistant
- `design_critique.md` → Merges with `design_critique` assistant
- `content_table.md` → Merges with `content_table` assistant
- `ux_copy_review.md` → Merges with `ux_copy_review` assistant
- `dev_handoff.md` → Merges with `dev_handoff` assistant
- `accessibility.md` → Merges with `accessibility` assistant
- `errors.md` → Merges with `errors` assistant
- `design_workshop.md` → Merges with `design_workshop` assistant
- `discovery_copilot.md` → Merges with `discovery_copilot` assistant

## Configuration

Each knowledge base must be configured in `../config.json`:

```json
{
  "knowledgeBases": {
    "general": {
      "policy": "append",
      "file": "knowledge/general.md"
    }
  }
}
```

## Policies

### Append (`"append"`)
Custom content is appended to the public knowledge base with a separator (`---`).

**Example:**
- Public knowledge: "You are a helpful assistant..."
- Custom knowledge: "## Corporate Guidelines\n\nFollow company style guide..."
- Result: "You are a helpful assistant...\n\n---\n\n## Corporate Guidelines\n\nFollow company style guide..."

### Override (`"override"`)
Custom content completely replaces the public knowledge base.

**Example:**
- Public knowledge: "You are a helpful assistant..."
- Custom knowledge: "You are our internal design assistant..."
- Result: "You are our internal design assistant..." (public content removed)

## Content Format

Knowledge base files are plain markdown. They will be included verbatim in the assistant's prompt.

**Best practices:**
- Use clear headings and structure
- Include specific examples relevant to your organization
- Reference internal processes, style guides, or design systems
- Keep content focused and actionable

## Example

See `general.example.md` for a template knowledge base file.
