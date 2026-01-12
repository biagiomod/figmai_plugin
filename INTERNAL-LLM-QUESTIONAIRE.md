# Internal LLM Questionnaire: FigmAI Plugin Migration Support

## Purpose

This document is designed to help diagnose and resolve two critical issues when using the FigmAI plugin with an Internal API endpoint:

1. **Knowledge Base Routing Issue**: Internal API is returning responses from a specialized knowledge base instead of the general chat, despite sending `type: "generalChat"` in the payload.
2. **Response Parsing Issue**: The plugin is not correctly parsing/handling LLM responses from the Internal API.

---

## Context for Internal LLM (Provide as Bullet Points)

### Plugin Architecture Overview

•	This repository contains a Figma plugin with two execution modes:
	•	Public / Proxy mode (already working)
	•	Internal API mode (session-based auth, no API keys)

•	The goal is parity between modes:
	•	Internal API responses must behave identically to Proxy responses from the perspective of all Assistants.

•	The plugin architecture assumes:
	•	Providers return string output
	•	Assistants are responsible for parsing (JSON, markdown, plain text).

•	Internal API responses may arrive in multiple formats:
	•	Object with `Prompts[0].ResponseFromAssistant`
	•	Object with `result` (string or JSON-encoded string)
	•	Entire response as a JSON-encoded string

•	The plugin must:
	•	Avoid coupling Assistants to transport-specific response shapes
	•	Normalize responses once, at the provider boundary

•	Constraints:
	•	No proprietary endpoints, schemas, or internal system names should be referenced
	•	No credentials or auth headers are used

•	Non-goals:
	•	No new Assistants
	•	No UI changes
	•	No behavior changes in Proxy mode

•	Desired outcome:
	•	Internal API mode becomes a drop-in replacement for Proxy mode
	•	No Assistant needs conditional logic for connection type

### Technical Architecture Details

•	**Provider Interface**: All providers implement `Provider` interface with `sendChat(request: ChatRequest): Promise<string>`
	•	The return type is always a string, never an object
	•	This string is what Assistants receive and parse

•	**Request Flow**:
	1. User sends message → Main thread (`main.ts`)
	2. Main thread builds selection context (if needed)
	3. Main thread calls `provider.sendChat()` with normalized `ChatRequest`
	4. Provider normalizes request format for its API
	5. Provider sends HTTP request to API endpoint
	6. Provider receives response and extracts text string
	7. Provider returns string to Main thread
	8. Main thread passes string to Assistant handler (if exists)
	9. Assistant handler parses string (JSON extraction, markdown parsing, etc.)
	10. Assistant handler renders result (scorecard, screens, etc.) or sends to chat UI

•	**Current Internal API Implementation**:
	•	Request payload: `{ type: 'generalChat', message: '<userMessages>', knowledgeBase: 'general' }`
	•	Request method: POST
	•	Request headers: `Content-Type: application/json`
	•	No credentials header (session-based auth via browser cookies)
	•	Response parsing uses `extractInternalApiAssistantText()` helper function
	•	Helper function checks for Format A (`Prompts[0].ResponseFromAssistant`) first, then Format B (`result`)

•	**Response Parsing Logic**:
	•	If response is a string → try to parse as JSON, then recursively extract
	•	If response is an object:
		•	Check for `Prompts[0].ResponseFromAssistant` (Format A)
		•	If not found, check for `result` (Format B)
		•	If `result` is a string, return it as-is (even if it looks like JSON)
		•	If `result` is an object, recursively extract
	•	If no wrappers found and original string exists, return pretty-printed JSON
	•	Depth limit: 2 levels to prevent infinite recursion

•	**Assistant Handler Pattern**:
	•	Assistants receive string responses from providers
	•	Assistants extract JSON from strings (handles markdown code fences, plain JSON, etc.)
	•	Assistants validate and parse extracted JSON
	•	Assistants render results (e.g., Design Critique renders scorecard, Design Workshop renders screens)

•	**Known Working Examples**:
	•	Proxy mode: Returns plain text strings that Assistants parse successfully
	•	Design Critique Assistant: Expects JSON with `{ score, summary, wins, fixes, checklist, notes }`
	•	Design Workshop Assistant: Expects JSON with `{ meta, screens }` structure
	•	Content Table Assistant: Expects plain text or structured content

### Current Implementation Status

•	**Payload Configuration**: ✅ Implemented
	•	`sendChat()` includes `knowledgeBase: 'general'` in payload
	•	`testConnection()` includes `knowledgeBase: 'general'` in payload

•	**Response Parsing**: ✅ Implemented
	•	Helper function `extractInternalApiAssistantText()` handles multiple formats
	•	Returns strings (never objects) for Assistant compatibility
	•	Handles JSON-encoded strings in `result` field by returning them as-is

•	**Known Issues**:
	•	Issue 1: Internal API may be ignoring `knowledgeBase: 'general'` parameter
	•	Issue 2: Response parsing may not be handling all response shapes correctly

---

## Yes / No Questions for Internal LLM (Numbered)

### Architecture & Boundaries

1.	Yes / No — Should all Internal API response normalization happen inside the Provider layer (before Assistants see the data)?

2.	Yes / No — Is it correct that Assistants should only ever receive a string payload, regardless of transport?

3.	Yes / No — Is returning raw JSON as a string (not parsed) the safest default for downstream Assistants?

### Response Shape Handling

4.	Yes / No — Should the provider check for `Prompts[0].ResponseFromAssistant` first, then fall back to `result`?

5.	Yes / No — If `result` is a JSON-encoded string, should it be passed through unchanged (not `JSON.parse`)?

6.	Yes / No — Is it acceptable to ignore unknown top-level keys as long as a usable string is extracted?

7.	Yes / No — Should the provider handle cases where `result` contains a nested object (not just a string)?

8.	Yes / No — If the response contains both `Prompts` and `result`, should `Prompts` take precedence?

### Error & Edge Cases

9.	Yes / No — Should malformed or unexpected response shapes fail gracefully by returning the raw response as a string?

10.	Yes / No — Is it preferable to avoid throwing errors inside the Provider for response-shape mismatches?

11.	Yes / No — Should error messages returned from the Internal API be surfaced as plain text strings to Assistants?

12.	Yes / No — If the response is an empty object `{}`, should the provider return an empty string or throw an error?

13.	Yes / No — Should the provider handle HTTP 200 responses that contain error information in the response body?

### Compatibility & Safety

14.	Yes / No — Does this approach preserve full backward compatibility with the existing Proxy implementation?

15.	Yes / No — Does normalizing at the Provider layer reduce long-term maintenance risk?

16.	Yes / No — Is this approach consistent with best practices for multi-backend LLM clients?

### Knowledge Base Handling

17.	Yes / No — Is explicitly sending `knowledgeBase: "general"` sufficient to prevent routing to internal knowledge bases?

18.	Yes / No — Should this field be hard-coded (not user-configurable) for safety?

19.	Yes / No — If the Internal API ignores the `knowledgeBase` parameter, should the plugin detect this and surface a warning?

20.	Yes / No — Could the Internal API be using a different parameter name (e.g., `knowledge_base`, `kb`, `source`) instead of `knowledgeBase`?

21.	Yes / No — Should the plugin send `knowledgeBase: "general"` as a query parameter instead of (or in addition to) the request body?

22.	Yes / No — Could the Internal API require the `knowledgeBase` parameter in a different location (headers, query string, nested object)?

### Response Format Detection

23.	Yes / No — Should the provider log the raw response structure (first 500 chars) when extraction fails for debugging?

24.	Yes / No — Is it possible the Internal API returns a different wrapper format that hasn't been accounted for?

25.	Yes / No — Should the provider handle responses where the actual content is nested deeper than 2 levels?

### Final Validation

26.	Yes / No — With this design, should all current Assistants (Design Critique, Workshop, Content Table, etc.) work unchanged?

27.	Yes / No — Is there any additional normalization step required that has not been covered above?

28.	Yes / No — Should the provider validate that the extracted string is non-empty before returning it?

29.	Yes / No — If the response contains metadata fields (e.g., `status`, `timestamp`, `requestId`), should these be ignored during extraction?

---

## Optional Fill-in-the-Blank (Safe)

30.	The single most important invariant the Provider should guarantee is:
"All downstream consumers receive ______________________."

31.	The biggest risk if response normalization is done inside Assistants instead of Providers is:
"____________________________________________."

32.	If the Internal API is ignoring `knowledgeBase: "general"`, the most likely causes are:
"____________________________________________."

33.	If response parsing is failing, the most likely response shapes we're missing are:
"____________________________________________."

34.	The best way to debug response parsing issues without exposing sensitive data is:
"____________________________________________."

---

## Diagnostic Information Requested

### For Knowledge Base Routing Issue

Please provide guidance on:

•	**Parameter Format**: What is the exact format the Internal API expects for specifying the knowledge base?
	•	Is it `knowledgeBase`, `knowledge_base`, `kb`, `source`, or something else?
	•	Should it be in the request body, query parameters, or headers?
	•	Is the value `"general"` correct, or should it be `"default"`, `"chat"`, or another value?

•	**API Behavior**: How does the Internal API determine which knowledge base to use?
	•	Is there a default knowledge base if the parameter is missing?
	•	Are there any authentication/session-based overrides that might ignore the parameter?
	•	Is there a priority order (e.g., session settings > request parameter)?

•	**Verification**: How can we verify that the request is actually reaching the general knowledge base?
	•	Are there response headers or metadata that indicate which knowledge base was used?
	•	Is there a test endpoint that confirms knowledge base selection?

### For Response Parsing Issue

Please provide guidance on:

•	**Response Structure**: What are all possible response formats the Internal API can return?
	•	Are there formats beyond Format A (`Prompts[0].ResponseFromAssistant`) and Format B (`result`)?
	•	Can the response structure vary based on the knowledge base used?
	•	Are there error response formats that differ from success formats?

•	**JSON-Encoded Strings**: When `result` contains a JSON-encoded string, what is the expected behavior?
	•	Should the plugin parse it once and extract, or return it as-is?
	•	Can the JSON string itself contain nested JSON strings (double-encoding)?

•	**Edge Cases**: What should happen in these scenarios?
	•	Response is `{ "result": null }`
	•	Response is `{ "result": "" }` (empty string)
	•	Response is `{ "Prompts": [] }` (empty array)
	•	Response is `{ "Prompts": [{ "ResponseFromAssistant": null }] }`
	•	Response contains both `Prompts` and `result` with different values

•	**Error Responses**: How are errors communicated in the response?
	•	Is there an `error` field?
	•	Is there an `error` field nested inside `result`?
	•	Do error responses use the same wrapper formats as success responses?

---

## Code References

### Key Files

•	**Provider Implementation**: `src/core/provider/internalApiProvider.ts`
	•	`sendChat()` method: Lines 205-398
	•	`extractInternalApiAssistantText()` helper: Lines 120-200
	•	Payload construction: Lines 231-235

•	**Provider Interface**: `src/core/provider/provider.ts`
	•	`Provider` interface: Lines 148-193
	•	`ChatRequest` interface: Lines 57-66
	•	Return type: `Promise<string>` (always a string)

•	**Main Thread Integration**: `src/main.ts`
	•	Provider call: Lines 484-492
	•	Handler execution: Lines 495-510
	•	Message flow: Lines 419-518

•	**Assistant Handlers**: `src/core/assistants/handlers/`
	•	Design Critique: `designCritique.ts`
	•	Design Workshop: `designWorkshop.ts`
	•	All handlers receive string responses and parse them

### Current Payload Structure

```typescript
// sendChat() payload
{
  type: 'generalChat',
  message: '<combined user messages>',
  knowledgeBase: 'general'
}

// Request configuration
{
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(payload)
  // Note: No credentials header (session-based auth)
}
```

### Current Response Parsing Logic

```typescript
// Priority order:
1. Check if response is a string → parse and recurse
2. Check for Prompts[0].ResponseFromAssistant (Format A)
3. Check for result field (Format B)
   - If result is string → return as-is
   - If result is object → recurse
4. Fallback: return original string (pretty-printed if JSON)
```

---

## Success Criteria

The implementation will be considered successful when:

1. ✅ All Internal API requests include `knowledgeBase: "general"` in the payload
2. ✅ Internal API returns responses from the general knowledge base (not specialized KBs)
3. ✅ All response formats are correctly parsed and normalized to strings
4. ✅ Design Critique Assistant works with Internal API (receives and parses JSON correctly)
5. ✅ Design Workshop Assistant works with Internal API (receives and parses JSON correctly)
6. ✅ General chat works with Internal API (receives and displays text correctly)
7. ✅ Proxy mode continues to work unchanged (regression test passes)
8. ✅ No Assistant code needs modification to support Internal API

---

## Notes

•	This document does not contain any proprietary information, credentials, or internal system names
•	All questions are designed to be answered without exposing sensitive details
•	The goal is architectural guidance and diagnostic support, not implementation of proprietary systems
•	Responses should focus on best practices and common patterns for LLM API integration
