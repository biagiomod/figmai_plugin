# KB import prompt (raw text → normalized JSON)

Use this prompt to turn raw knowledge base text (e.g. from a colleague doc, Notion, or wiki) into a **single JSON object** that matches the canonical KB schema. Paste the prompt and your raw text into an LLM; ask for output as JSON only.

---

## Instructions

You are converting raw knowledge base content into a single JSON object. The output must match this schema exactly:

- **Required:** `id` (kebab-case, e.g. `my-knowledge-base`), `title`, `purpose`, `scope`, `definitions` (array of strings), `rulesConstraints` (array of strings), `doDont` (object with `do` and `dont`, each an array of strings), `examples` (array of strings), `edgeCases` (array of strings).
- **Optional:** `source`, `updatedAt` (ISO 8601), `version`, `tags` (array of strings).

Return **only** the JSON object. If you must wrap it in markdown, use a single fenced block: ` ```json ... ``` `.

---

## Minimal example

**Input (raw text):**

```
Design guidelines for our product. Use sentence case for buttons. Never use lorem ipsum in production. Do: use clear labels. Don't: rely on color alone.
```

**Output (single JSON object):**

```json
{
  "id": "design-guidelines",
  "title": "Design guidelines",
  "purpose": "Design guidelines for our product.",
  "scope": "",
  "definitions": [],
  "rulesConstraints": [
    "Use sentence case for buttons.",
    "Never use lorem ipsum in production."
  ],
  "doDont": {
    "do": ["Use clear labels."],
    "dont": ["Rely on color alone."]
  },
  "examples": [],
  "edgeCases": []
}
```

---

Paste your raw KB content below and return the corresponding JSON object.
