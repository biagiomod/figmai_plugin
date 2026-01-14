# Internal LLM Questionnaire: FigmAI Plugin Migration Support

## Purpose

This document is designed to help diagnose and resolve a critical issue when using the FigmAI plugin with an Internal API endpoint:

**Response Parsing Issue**: The plugin is not correctly parsing/handling LLM responses from the Internal API.

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
	•	Request payload: `{ type: 'generalChat', message: '<userMessages>', kbName: 'general' }`
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
	•	`sendChat()` includes `kbName: 'general'` in payload
	•	`testConnection()` includes `kbName: 'general'` in payload

•	**Response Parsing**: ✅ Implemented
	•	Helper function `extractInternalApiAssistantText()` handles multiple formats
	•	Returns strings (never objects) for Assistant compatibility
	•	Handles JSON-encoded strings in `result` field by returning them as-is

•	**Known Issues**:
	•	Response parsing may not be handling all response shapes correctly

---

## Yes / No Questions for Internal LLM (Numbered, fact-finding only)

### Architecture & Boundaries

1.	Yes / No — Does the Internal API deliver responses in a way that requires normalization before Assistants consume them?

2.	Yes / No — Is it correct that Assistants only receive string payloads from the Internal API (never objects)?

3.	Yes / No — Is returning raw JSON as a string (not parsed) consistent with how the Internal API is typically consumed?

### Response Shape Handling

4.	Yes / No — Does the Internal API ever return `Prompts[0].ResponseFromAssistant`?

5.	Yes / No — Does the Internal API ever return a `result` field that is a JSON-encoded string (not an object)?

6.	Yes / No — Does the Internal API include additional top-level keys that can be ignored without losing assistant text?

7.	Yes / No — Does the Internal API return `result` as an object (not just a string) in some responses?

8.	Yes / No — When both `Prompts` and `result` are present, is `Prompts` the authoritative source?

### Error & Edge Cases

9.	Yes / No — Do malformed or unexpected response shapes still include any usable assistant text?

10.	Yes / No — Does the Internal API ever return response-shape mismatches that still need to be surfaced to users?

11.	Yes / No — Are error messages from the Internal API already plain text within the response body?

12.	Yes / No — Has the Internal API ever returned an empty object `{}` for successful requests?

13.	Yes / No — Does the Internal API ever return HTTP 200 responses that actually contain error information?

### Compatibility & Safety

14.	Yes / No — Are Internal API responses already compatible with downstream Assistants that currently parse Proxy responses?

15.	Yes / No — Does normalizing at the Provider layer align with how Internal API clients are expected to consume responses?

16.	Yes / No — Is this Internal API usage consistent with common multi-backend LLM client patterns?

### Response Format Detection

17.	Yes / No — Does the Internal API ever return response bodies that benefit from logging the first 500 chars for debugging?

18.	Yes / No — Are there wrapper formats beyond `Prompts` and `result` that the Internal API can return?

19.	Yes / No — Are there cases where the assistant content is nested deeper than 2 levels in the Internal API responses?

### Final Validation

20.	Yes / No — With the current Internal API response shapes, can all current Assistants (Design Critique, Workshop, Content Table, etc.) operate unchanged?

21.	Yes / No — Is there any additional normalization the Internal API expects clients to perform that isn’t already covered?

22.	Yes / No — Does the Internal API ever return empty strings where assistant text is expected?

23.	Yes / No — Are metadata fields (e.g., `status`, `timestamp`, `requestId`) safe to ignore when extracting assistant text?

---

## Optional Fill-in-the-Blank (Safe)

24.	The single most important invariant the Provider should guarantee is:
"All downstream consumers receive ______________________."

25.	The biggest risk if response normalization is done inside Assistants instead of Providers is:
"____________________________________________."

26.	If response parsing is failing, the most likely response shapes we're missing are:
"____________________________________________."

27.	The best way to debug response parsing issues without exposing sensitive data is:
"____________________________________________."

---

## Diagnostic Information Requested

### For Response Parsing Issue

Please provide guidance on:

•	**Response Structure**: What are all possible response formats the Internal API can return?
	•	Are there formats beyond Format A (`Prompts[0].ResponseFromAssistant`) and Format B (`result`)?
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
  kbName: 'general'
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

### Required Project Files for LLM Response Handling/Parsing Issue

The following files are relevant to the LLM response handling/parsing issue:

**Provider Layer (Response Extraction & Normalization):**
• `src/core/provider/internalApiProvider.ts` - Internal API provider implementation with `extractInternalApiAssistantText()` method
• `src/core/provider/provider.ts` - Provider interface definition (`Provider`, `ChatRequest`, `ChatResponse`)
• `src/core/provider/normalize.ts` - Generic response text extraction utility (`extractResponseText()`)
• `src/core/proxy/client.ts` - Proxy provider implementation (uses `extractResponseText()` for comparison)

**Response Parsing & JSON Extraction:**
• `src/core/output/normalize/index.ts` - JSON extraction utilities (`extractJsonFromResponse()`, `parseScorecardJson()`, `fromDesignCritiqueJson()`)

**Main Thread Integration:**
• `src/main.ts` - Main thread that orchestrates provider calls, receives responses, and passes them to assistant handlers

**Assistant Handlers (Response Parsing):**
• `src/core/assistants/handlers/base.ts` - Base handler interface (`HandlerContext`, `HandlerResult`, `AssistantHandler`)
• `src/core/assistants/handlers/designCritique.ts` - Design Critique handler that parses scorecard JSON from LLM responses
• `src/core/assistants/handlers/designWorkshop.ts` - Design Workshop handler that parses design spec JSON from LLM responses

---

## Success Criteria

The implementation will be considered successful when:

1. ✅ All response formats are correctly parsed and normalized to strings
2. ✅ Design Critique Assistant works with Internal API (receives and parses JSON correctly)
3. ✅ Design Workshop Assistant works with Internal API (receives and parses JSON correctly)
4. ✅ General chat works with Internal API (receives and displays text correctly)
5. ✅ Proxy mode continues to work unchanged (regression test passes)
6. ✅ No Assistant code needs modification to support Internal API

---

## Notes

•	This document does not contain any proprietary information, credentials, or internal system names
•	All questions are designed to be answered without exposing sensitive details
•	The goal is architectural guidance and diagnostic support, not implementation of proprietary systems
•	Responses should focus on best practices and common patterns for LLM API integration
