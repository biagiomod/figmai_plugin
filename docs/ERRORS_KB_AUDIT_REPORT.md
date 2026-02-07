# Errors Knowledge Base — Audit Report

**Target:** `figmai_plugin/custom/knowledge-bases/errors.kb.json`  
**Schema:** `figmai_plugin/admin-editor/src/kbSchema.ts` (`knowledgeBaseDocumentSchema`, `doDontSchema`, `KB_ID_REGEX`)  
**Date:** 2026-01-23 (audit); report generated from read-only validation.

---

## 1. Schema validation

- **Required fields and types:** The document includes `id`, `title`, `source`, `updatedAt`, `version`, `tags`, `purpose`, `scope`, `definitions`, `rulesConstraints`, `doDont`, `examples`, `edgeCases`. All match the schema: `id` and `title` are strings; `definitions`, `rulesConstraints`, `examples`, `edgeCases` are string arrays; `doDont` is `{ do: string[], dont: string[] }`; optional fields present as typed.
- **Extra keys:** None. Schema uses `.passthrough()`, so extra keys would be allowed; the file does not add any.
- **ID format:** `id` is `"errors"`, which matches `KB_ID_REGEX` (`/^[a-z0-9]+(?:-[a-z0-9]+)*$/`). Valid.
- **Runtime/generator:** `scripts/generate-knowledge-bases.ts` uses `knowledgeBaseDocumentSchema.safeParse(parsed)` on each `.kb.json`; this file parses and validates. Runtime types in `src/core/knowledgeBases/types.ts` align with the schema.

---

## 2. Separation of concerns

- **Reference knowledge only:** The KB describes UX error-handling concepts (definitions, rules, do/don’t, examples, edge cases). It does not define who the model “is” or how it should speak.
- **No role/identity language:** No “You are…”, “Act as…”, or similar. Purpose uses “reference knowledge for designing, evaluating, and validating” (describes the KB’s use), not assistant identity.
- **No tone instructions:** No tone or style directives for the assistant.
- **No output-format or JSON schema:** No required response shape, JSON schema, or format enforcement.
- **No behavioral/conversational rules:** No “always respond with…”, “never…”, or conversation flow rules. Scope explicitly states: “Excludes assistant behavior, tone control, output formatting, and runtime execution rules.”

**Verdict:** Separation of concerns is satisfied; the KB is reference-only and assistant-agnostic.

---

## 3. Normalization check (field-by-field)

| Field | Assessment |
|-------|------------|
| **purpose** | Single string; describes the KB’s role as reference for UX error handling. Correct. |
| **scope** | Single string; in-scope (user-facing error handling) and exclusions (assistant behavior, tone, format, runtime rules) are clear. Correct. |
| **definitions** | Four term definitions (Validation, System, Permission, State Error) plus one redundant entry. See issues below. |
| **rulesConstraints** | Nine rules; one redundant entry. See issues below. |
| **doDont** | Structured do/dont lists; content is appropriate and not duplicated elsewhere except in edgeCases. Correct. |
| **examples** | Good/poor validation and good system error examples; one redundant entry. See issues below. |
| **edgeCases** | First four items are valid edge-case descriptions. Remaining entries duplicate do/dont content. See issues below. |

---

## 4. Content quality (UX error handling)

- **Error message best practices:** Covered in `rulesConstraints` and `doDont` (clear explanation, recovery guidance, no blame, specificity, visibility, preserve input, accessibility, color not sole indicator, avoid exposing internals).
- **Validation errors:** Definition plus good/poor examples.
- **System errors:** Definition and example.
- **Permission and state errors:** Definitions present.
- **Recovery guidance:** Rules and do/dont (actionable steps, retry indication).
- **Accessibility:** Rules and do/dont (assistive tech, color not sole indicator, readable).

**Optional gaps (enhancements only):**  
Error vs empty state; presentation patterns (inline vs toast vs modal); severity levels; localization; handling multiple simultaneous errors. Not required for approval.

---

## 5. Runtime implications (evidence-based)

- **Resolution:** `main.ts` calls `resolveKnowledgeBaseDocs(currentAssistant.knowledgeBaseRefs ?? [])` (e.g. lines 553, 935). `resolveKb.ts` looks up each ref in `KB_DOCS` from `src/knowledge-bases/knowledgeBases.generated.ts` and returns an array of `KnowledgeBaseDocument`. No runtime file reads.
- **Preamble assembly:** The same call sites pass `kbDocs` into `buildAssistantInstructionSegments({ ..., kbDocs })`. In `instructionAssembly.ts`, when `kbDocs` is non-empty, `buildKbSegment(kbDocs)` is called and the result is appended: `instructionPreambleText = instructionPreambleText + '\n\n' + kbSegment` (lines 119–121). The KB segment is a single “## Knowledge Base” block with formatted sections (Purpose, Scope, Definitions, Rules/Constraints, Do, Don’t, Examples, Edge cases) and is subject to `MAX_KB_TOTAL_CHARS` / `MAX_SECTION_CHARS` / `MAX_ARRAY_ITEMS`.
- **No override of behavior or contracts:** Tone, output schema, and instruction blocks come from the assistant manifest. The KB is appended as reference content only; it does not replace or override assistant-specific behavior or output contracts.

**Operational note:** `knowledgeBases.generated.ts` is built from `custom/knowledge-bases/registry.json` and the referenced `*.kb.json` files. Until `npm run generate-knowledge-bases` is run after adding or changing the Errors KB, the generated bundle may not include the `errors` id. Wiring an assistant to this KB requires `knowledgeBaseRefs: ["errors"]` and up-to-date generated artifacts.

---

## What is correct

- Schema: All required fields present and correctly typed; `id` is kebab-case; no invalid or unknown field types.
- Separation of concerns: Only reference knowledge; no role, tone, output format, or behavioral rules.
- Content: Validation, system, permission, and state errors; recovery and accessibility are covered.
- Structure: purpose, scope, definitions, rulesConstraints, doDont, examples, and edgeCases are used as intended except for the issues below.
- Reusability: Safe for use by multiple assistants (e.g. Accessibility, Content, Design Critique); no assistant-specific assumptions.
- Runtime: KB is appended to the preamble; it does not override assistant behavior or output contracts.

---

## Issues found (exact quotes + paths)

All paths relative to plugin root: `figmai_plugin/`.

1. **Tags contain literal quote characters**  
   **Path:** `custom/knowledge-bases/errors.kb.json`  
   **Location:** `tags` array  
   **Quote:** `["\"ux\"","\"errors\"","\"error-messages\"","\"validation\"","\"usability\""]`  
   **Why it’s wrong:** Tag values are the strings `"ux"`, `"errors"`, etc. *including* the quote characters. Convention is plain labels (e.g. `ux`, `errors`). Schema allows any string, so this is a content/normalization issue.

2. **Stray `"---"` in definitions**  
   **Path:** `custom/knowledge-bases/errors.kb.json`  
   **Location:** `definitions` array, last element  
   **Quote:** `"---"`  
   **Why it’s wrong:** Section separators are not part of the semantic content; they add noise when rendered in the KB segment.

3. **Stray `"---"` in rulesConstraints**  
   **Path:** `custom/knowledge-bases/errors.kb.json`  
   **Location:** `rulesConstraints` array, last element  
   **Quote:** `"---"`  
   **Why it’s wrong:** Same as above; redundant and not a rule.

4. **Stray `"---"` in examples**  
   **Path:** `custom/knowledge-bases/errors.kb.json`  
   **Location:** `examples` array, last element  
   **Quote:** `"---"`  
   **Why it’s wrong:** Same as above; not an example.

5. **Do/Don’t content duplicated in edgeCases**  
   **Path:** `custom/knowledge-bases/errors.kb.json`  
   **Location:** `edgeCases` array, elements after the fourth  
   **Quote (representative):** From the fifth element onward: `"### Do"`, `"- Explain the problem clearly and concisely."`, … `"### Don't"`, `"- Use vague or generic error messages."`, … `"---"`  
   **Why it’s wrong:** `edgeCases` should list only edge-case situations (e.g. partial success, offline, retry exhaustion, irrecoverable failure). The do/don’t lists belong in `doDont`; duplicating them in `edgeCases` is a misplacement and bloats the segment.

---

## Recommended fixes (content-level only)

1. **Tags:** Change each tag to a plain label without embedded quotes, e.g. `["ux", "errors", "error-messages", "validation", "usability"]`.
2. **definitions:** Remove the last element `"---"`.
3. **rulesConstraints:** Remove the last element `"---"`.
4. **examples:** Remove the last element `"---"`.
5. **edgeCases:** Keep only the first four items (partial success; offline/degraded network; retry exhaustion; irrecoverable system failures). Remove the “### Do”, all six do items, “### Don’t”, all six dont items, and the trailing “---”.

No schema or architecture changes; no new sections required.

---

## Proposed corrected errors.kb.json

Full JSON with the fixes above applied (pretty-printed). Purpose, scope, definitions, rulesConstraints, doDont, and examples are unchanged except for removal of `"---"` and tag string fixes.

```json
{
  "id": "errors",
  "title": "Errors",
  "source": "",
  "updatedAt": "2026-02-07T03:16:38.573Z",
  "version": "1.0",
  "tags": ["ux", "errors", "error-messages", "validation", "usability"],
  "purpose": "Provide authoritative reference knowledge for designing, evaluating, and validating UX error handling, including error messages, validation feedback, recovery guidance, and failure states.",
  "scope": "Applies to user-facing error handling in interfaces, including form validation, system failures, permission errors, and invalid states.   Excludes assistant behavior, tone control, output formatting, and runtime execution rules.",
  "definitions": [
    "### Validation Error",
    "An error caused by invalid, missing, or improperly formatted user input, such as incorrect email formats or required fields left empty.",
    "### System Error",
    "An error caused by system-level failures such as network issues, server errors, timeouts, or unexpected crashes.",
    "### Permission Error",
    "An error caused by insufficient authorization or access rights, including expired sessions or restricted actions.",
    "### State Error",
    "An error caused by an invalid or unexpected application state, such as performing actions out of sequence or with incomplete data."
  ],
  "rulesConstraints": [
    "Error messages must clearly explain what went wrong.",
    "Error messages must provide guidance on how the user can recover or resolve the issue.",
    "Error messages must not blame, shame, or judge the user.",
    "Errors should be specific and reference the exact field, action, or condition involved whenever possible.",
    "Errors must remain visible until the issue is resolved.",
    "User input must be preserved after an error occurs.",
    "Errors must be accessible and perceivable by assistive technologies.",
    "Color must not be the sole indicator of an error state.",
    "System errors must avoid exposing internal technical details unless useful to the user."
  ],
  "doDont": {
    "do": [
      "Explain the problem clearly and concisely.",
      "Show errors near the relevant UI element or field.",
      "Provide actionable recovery steps.",
      "Preserve user input after errors.",
      "Indicate whether retrying an action is possible.",
      "Ensure error messages are accessible and readable."
    ],
    "dont": [
      "Use vague or generic error messages.",
      "Blame or shame the user.",
      "Expose stack traces or internal error codes unnecessarily.",
      "Clear user input after an error.",
      "Rely on color alone to indicate errors.",
      "Use global error messages when a local one is possible."
    ]
  },
  "examples": [
    "### Good Validation Error",
    "\"Email address is invalid. Enter a valid email address (e.g., name@example.com).\"",
    "### Poor Validation Error",
    "\"Something went wrong.\"",
    "### Good System Error",
    "\"We couldn't save your changes due to a network issue. Please try again.\""
  ],
  "edgeCases": [
    "Partial success states where some user actions complete successfully while others fail.",
    "Offline or degraded network conditions that prevent immediate error recovery.",
    "Retry exhaustion scenarios where repeated attempts continue to fail.",
    "Irrecoverable system failures that require escalation to support or alternative workflows."
  ]
}
```

---

## Unified diff (minimal patch)

The current file is a single line. The diff below replaces it with the corrected content (pretty-printed). Applying this patch yields the proposed `errors.kb.json`.

```diff
--- a/figmai_plugin/custom/knowledge-bases/errors.kb.json
+++ b/figmai_plugin/custom/knowledge-bases/errors.kb.json
@@ -1 +1,87 @@
-{"id":"errors","title":"Errors","source":"","updatedAt":"2026-02-07T03:16:38.573Z","version":"1.0","tags":["\"ux\"","\"errors\"","\"error-messages\"","\"validation\"","\"usability\""],"purpose":"Provide authoritative reference knowledge for designing, evaluating, and validating UX error handling, including error messages, validation feedback, recovery guidance, and failure states.","scope":"Applies to user-facing error handling in interfaces, including form validation, system failures, permission errors, and invalid states.   Excludes assistant behavior, tone control, output formatting, and runtime execution rules.","definitions":["### Validation Error","An error caused by invalid, missing, or improperly formatted user input, such as incorrect email formats or required fields left empty.","### System Error","An error caused by system-level failures such as network issues, server errors, timeouts, or unexpected crashes.","### Permission Error","An error caused by insufficient authorization or access rights, including expired sessions or restricted actions.","### State Error","An error caused by an invalid or unexpected application state, such as performing actions out of sequence or with incomplete data.","---"],"rulesConstraints":["Error messages must clearly explain what went wrong.","Error messages must provide guidance on how the user can recover or resolve the issue.","Error messages must not blame, shame, or judge the user.","Errors should be specific and reference the exact field, action, or condition involved whenever possible.","Errors must remain visible until the issue is resolved.","User input must be preserved after an error occurs.","Errors must be accessible and perceivable by assistive technologies.","Color must not be the sole indicator of an error state.","System errors must avoid exposing internal technical details unless useful to the user.","---"],"doDont":{"do":["Explain the problem clearly and concisely.","Show errors near the relevant UI element or field.","Provide actionable recovery steps.","Preserve user input after errors.","Indicate whether retrying an action is possible.","Ensure error messages are accessible and readable."],"dont":["Use vague or generic error messages.","Blame or shame the user.","Expose stack traces or internal error codes unnecessarily.","Clear user input after an error.","Rely on color alone to indicate errors.","Use global error messages when a local one is possible."]},"examples":["### Good Validation Error",""Email address is invalid. Enter a valid email address (e.g., name@example.com)."","### Poor Validation Error",""Something went wrong."","### Good System Error",""We couldn't save your changes due to a network issue. Please try again."","---"],"edgeCases":["Partial success states where some user actions complete successfully while others fail.","Offline or degraded network conditions that prevent immediate error recovery.","Retry exhaustion scenarios where repeated attempts continue to fail.","Irrecoverable system failures that require escalation to support or alternative workflows.","### Do","- Explain the problem clearly and concisely.","- Show errors near the relevant UI element or field.","- Provide actionable recovery steps.","- Preserve user input after errors.","- Indicate whether retrying an action is possible.","- Ensure error messages are accessible and readable.","### Don't","- Use vague or generic error messages.","- Blame or shame the user.","- Expose stack traces or internal error codes unnecessarily.","- Clear user input after an error.","- Rely on color alone to indicate errors.","- Use global error messages when a local one is possible.","---"]}
+{
+  "id": "errors",
+  "title": "Errors",
+  "source": "",
+  "updatedAt": "2026-02-07T03:16:38.573Z",
+  "version": "1.0",
+  "tags": ["ux", "errors", "error-messages", "validation", "usability"],
+  "purpose": "Provide authoritative reference knowledge for designing, evaluating, and validating UX error handling, including error messages, validation feedback, recovery guidance, and failure states.",
+  "scope": "Applies to user-facing error handling in interfaces, including form validation, system failures, permission errors, and invalid states.   Excludes assistant behavior, tone control, output formatting, and runtime execution rules.",
+  "definitions": [
+    "### Validation Error",
+    "An error caused by invalid, missing, or improperly formatted user input, such as incorrect email formats or required fields left empty.",
+    "### System Error",
+    "An error caused by system-level failures such as network issues, server errors, timeouts, or unexpected crashes.",
+    "### Permission Error",
+    "An error caused by insufficient authorization or access rights, including expired sessions or restricted actions.",
+    "### State Error",
+    "An error caused by an invalid or unexpected application state, such as performing actions out of sequence or with incomplete data."
+  ],
+  "rulesConstraints": [
+    "Error messages must clearly explain what went wrong.",
+    "Error messages must provide guidance on how the user can recover or resolve the issue.",
+    "Error messages must not blame, shame, or judge the user.",
+    "Errors should be specific and reference the exact field, action, or condition involved whenever possible.",
+    "Errors must remain visible until the issue is resolved.",
+    "User input must be preserved after an error occurs.",
+    "Errors must be accessible and perceivable by assistive technologies.",
+    "Color must not be the sole indicator of an error state.",
+    "System errors must avoid exposing internal technical details unless useful to the user."
+  ],
+  "doDont": {
+    "do": [
+      "Explain the problem clearly and concisely.",
+      "Show errors near the relevant UI element or field.",
+      "Provide actionable recovery steps.",
+      "Preserve user input after errors.",
+      "Indicate whether retrying an action is possible.",
+      "Ensure error messages are accessible and readable."
+    ],
+    "dont": [
+      "Use vague or generic error messages.",
+      "Blame or shame the user.",
+      "Expose stack traces or internal error codes unnecessarily.",
+      "Clear user input after an error.",
+      "Rely on color alone to indicate errors.",
+      "Use global error messages when a local one is possible."
+    ]
+  },
+  "examples": [
+    "### Good Validation Error",
+    "\"Email address is invalid. Enter a valid email address (e.g., name@example.com).\"",
+    "### Poor Validation Error",
+    "\"Something went wrong.\"",
+    "### Good System Error",
+    "\"We couldn't save your changes due to a network issue. Please try again.\""
+  ],
+  "edgeCases": [
+    "Partial success states where some user actions complete successfully while others fail.",
+    "Offline or degraded network conditions that prevent immediate error recovery.",
+    "Retry exhaustion scenarios where repeated attempts continue to fail.",
+    "Irrecoverable system failures that require escalation to support or alternative workflows."
+  ]
+}
```

---

## Final verdict: **CHANGES REQUIRED**

The KB is structurally valid, assistant-agnostic, and correctly used at runtime as reference-only. Approval is withheld due to content/normalization issues: malformed tags (embedded quotes), redundant `"---"` entries in definitions, rulesConstraints, and examples, and do/don’t content duplicated in edgeCases. Applying the recommended content-level fixes (and regenerating with `npm run generate-knowledge-bases` when wiring the KB) brings the document into line with normalization and reusability goals.
