> **STRATEGIC/FUTURE:** This document describes a planned feature (Discovery Copilot MVP), not current implementation. This is archived for reference only.

---

# Discovery Copilot MVP - Implementation Plan

## Goals

**Primary Goal**: Create an MVP Discovery Copilot assistant that helps teams structure discovery thinking through guided prompts, producing canvas artifacts from structured JSON output.

**Core Value**:
- **Async-first workflow**: Provide checklists and prompts that can be completed without meetings
- **Structured thinking**: Guide users through problem framing, risk identification, and hypothesis formation
- **Canvas artifacts**: Render discovery artifacts directly on Figma canvas for visibility and collaboration

**MVP Scope**:
- 3 primary canvas frames: Brief, Risks & Assumptions, Hypotheses & Experiments
- Optional Decision Log (0-3 entries default, encourage adding later)
- Async tasks support (up to 6 items)
- Title derivation from user request (48 char cap)
- JSON-only output with repair flow (for LLM reliability)
- Deterministic rendering (same input → same output)

## Non-Goals

**Explicitly Excluded from MVP**:

1. **External Integrations**:
   - No Jira/Confluence export
   - No Slack/Teams notifications
   - No task management sync
   - No external storage

2. **Selection-Based Features**:
   - No scanning selected Figma nodes
   - No extracting context from designs
   - No design-to-discovery mapping
   - **Selection is completely ignored** (as per requirement)

3. **Advanced Workflows**:
   - No multi-phase wizard UI
   - No interactive editing of discovery artifacts
   - No collaboration features (comments, approvals)
   - No scheduling or calendar integration

4. **Design System Integration** (MVP):
   - No DS pack loading
   - No component library references
   - No brand token usage (use plugin defaults)
   - **Placeholder for future**: Document extension point for DS reference packs without implementing

5. **Rich Formatting**:
   - No markdown rendering in frames (plain text only)
   - No images/attachments
   - No links/URLs
   - No rich text formatting

6. **Export/Import**:
   - No JSON export button
   - No import from previous sessions
   - No template library

7. **Analytics & Tracking**:
   - No usage metrics
   - No discovery session history (beyond what's on canvas)
   - No success rate tracking

8. **Advanced Discovery Methods**:
   - No user research synthesis
   - No competitive analysis
   - No data analysis integration

**Rationale**: MVP focuses on core value (structured discovery thinking) without complexity that could slow development or confuse users. Keep it lightweight and demo-ready.

## UX Flow

### 4.1 Assistant Selection

1. User opens plugin
2. User selects "Discovery Copilot" assistant from modal
3. Intro message appears (non-duplicated, clean):
   - **Text**: `**Welcome to Discovery Copilot!**\n\nI'll guide you through a structured discovery process in 3 steps:\n\n**Step 1: Problem Frame** - Define what you're solving, who it affects, why it matters, and what success looks like\n**Step 2: Risks & Assumptions** - Identify potential risks and key assumptions\n**Step 3: Hypotheses & Experiments** - Form hypotheses and propose experiments to test them\n\nLet's begin! What are you discovering today? (e.g., "redesigning checkout flow", "building a new feature")`
   - **No metadata tags** (e.g., no "generate: 1/100" tags)
   - **No duplication** (reuse Design Workshop deduplication pattern)

### 4.2 Structured Discovery Session Flow

**Phase 1: Initial Context (Step 0)**
1. User provides initial discovery topic/context
2. Handler acknowledges and explains next step
3. Progress indicator: "Step 1 of 3: Problem Frame"

**Phase 2: Problem Frame (Step 1)**
1. Assistant asks structured questions:
   - "**What** problem are you solving? (fill in the blank)"
   - "**Who** is affected by this problem? (fill in the blank)"
   - "**Why** does this matter? (fill in the blank)"
   - "**What does success look like?** (fill in the blank)"
2. User answers each question (can be in one message or multiple)
3. Handler confirms completion: "✓ Problem Frame complete. Moving to Step 2..."
4. Progress indicator: "Step 2 of 3: Risks & Assumptions"

**Phase 3: Risks & Assumptions (Step 2)**
1. Assistant asks:
   - "What are the main **risks** we should consider? (list 3-5)"
   - "What are our key **assumptions**? (list 3-5)"
   - For each risk/assumption: "What's the **impact level**? (high/medium/low)"
2. User provides answers
3. Handler confirms: "✓ Risks & Assumptions complete. Moving to Step 3..."
4. Progress indicator: "Step 3 of 3: Hypotheses & Experiments"

**Phase 4: Hypotheses & Experiments (Step 3)**
1. Assistant asks:
   - "What **hypotheses** do you want to test? (list 2-4)"
   - For each hypothesis: "What **experiment** would test this? (fill in the blank)"
2. User provides answers
3. Handler confirms: "✓ All steps complete!"

**Phase 5: Optional Additions**
1. Assistant asks: "Would you like to add a **Decision Log**? (yes/no)"
2. If yes: "What decisions have you made so far? (list 1-3)"
3. Assistant asks: "Would you like to add **Async Tasks**? (yes/no)"
4. If yes: "What tasks need to be done? (list owner role and task)"

**Phase 6: Rendering**
1. Handler processes all collected information:
   - Derives title (from initial context, max 48 chars)
   - Builds DiscoverySpecV1 JSON
   - Validates response
   - Repairs if needed (max 1 attempt)
   - Normalizes (applies limits, fills defaults)
   - Renders to canvas
2. Completion message: "✓ Discovery artifacts placed on stage!"
3. If truncation: "Note: Some items were truncated. Run again with narrower scope for more."

### 4.3 Progress Tracking

**Progress Indicators** (shown in chat):
- "Step 1 of 3: Problem Frame" (when starting Step 1)
- "Step 2 of 3: Risks & Assumptions" (when starting Step 2)
- "Step 3 of 3: Hypotheses & Experiments" (when starting Step 3)
- "✓ Step X complete" (after each step)
- "All steps complete! Rendering artifacts..." (before rendering)

**Visual Feedback**:
- Checkmarks (✓) for completed steps
- Clear "next step" instructions
- Confirmation messages after each step

### 4.4 Canvas Interaction

- **Section**: Named "Discovery — {derived title}"
- **Frames**: 3 primary frames + optional Decision Log + Async Tasks
- **Selection**: Completely ignored (no anchoring, no context extraction)

## Data Schema

### 5.1 DiscoverySpecV1 Schema

```typescript
export interface DiscoverySpecV1 {
  type: "discovery"
  version: 1
  meta: {
    title: string                    // Derived from user request, max 48 chars
    userRequest?: string             // Raw user request for traceability
    runId?: string                   // Run identifier (e.g., "dc_1704067200000")
    truncationNotice?: string        // Set if arrays truncated
  }
  problemFrame: {
    what: string                     // What problem are we solving?
    who: string                      // Who is affected?
    why: string                      // Why does this matter?
    success: string                  // What does success look like?
  }
  risksAndAssumptions: Array<{
    id: string                       // Unique ID (e.g., "risk-1", "assumption-1")
    type: "risk" | "assumption"
    description: string
    impact?: "high" | "medium" | "low"
  }>                                 // Max 12 items (truncate if >12)
  hypothesesAndExperiments: Array<{
    id: string                       // Unique ID (e.g., "hyp-1")
    hypothesis: string
    experiment?: string              // Optional experiment to test hypothesis
    status?: "untested" | "testing" | "validated" | "invalidated"
  }>                                 // Max 12 items (truncate if >12)
  decisionLog?: Array<{              // Optional for MVP (0-3 entries default)
    timestamp: string                // ISO 8601 timestamp
    decision: string
    rationale?: string
    context?: string
  }>                                 // Max 20 entries if present (truncate if >20)
  asyncTasks?: Array<{               // Optional but encouraged
    ownerRole: "Design" | "Product" | "Dev" | "Research" | "Analytics" | "Other"
    task: string
    dueInHours?: number              // Optional hours until due
  }>                                 // Max 6 items (truncate if >6)
}
```

### 5.2 Example JSON

```json
{
  "type": "discovery",
  "version": 1,
  "meta": {
    "title": "Mobile Checkout Redesign Discovery",
    "userRequest": "Help me discover what we need to know before redesigning our mobile checkout",
    "runId": "dc_1704067200000"
  },
  "problemFrame": {
    "what": "Mobile checkout abandonment rate is 65%, significantly higher than desktop (35%)",
    "who": "Mobile shoppers, particularly first-time users and users on slower connections",
    "why": "Lost revenue, poor user experience, competitive disadvantage",
    "success": "Reduce mobile checkout abandonment to <40% within 3 months, maintain or improve conversion rate"
  },
  "risksAndAssumptions": [
    {
      "id": "risk-1",
      "type": "risk",
      "description": "Users may abandon if we require account creation",
      "impact": "high"
    },
    {
      "id": "assumption-1",
      "type": "assumption",
      "description": "Users prefer guest checkout for speed",
      "impact": "medium"
    }
  ],
  "hypothesesAndExperiments": [
    {
      "id": "hyp-1",
      "hypothesis": "Reducing form fields from 8 to 4 will decrease abandonment",
      "experiment": "A/B test: control (8 fields) vs variant (4 fields), measure completion rate",
      "status": "untested"
    }
  ],
  "decisionLog": [
    {
      "timestamp": "2024-01-01T10:00:00Z",
      "decision": "Focus on mobile-first checkout redesign",
      "rationale": "Mobile abandonment is primary pain point",
      "context": "Initial discovery session"
    }
  ],
  "asyncTasks": [
    {
      "ownerRole": "Research",
      "task": "Conduct user interviews with 5 mobile checkout abandoners",
      "dueInHours": 72
    },
    {
      "ownerRole": "Analytics",
      "task": "Analyze checkout funnel data for last 30 days",
      "dueInHours": 24
    }
  ]
}
```

### 5.3 Schema Constraints

**Required Fields**:
- `type`: Must be `"discovery"` (immutable)
- `version`: Must be `1` (immutable)
- `meta.title`: String (required, max 48 chars after derivation)
- `problemFrame`: Object with `what`, `who`, `why`, `success` (all required strings)
- `risksAndAssumptions`: Array (required, max 12 items)
- `hypothesesAndExperiments`: Array (required, max 12 items)

**Optional Fields**:
- `decisionLog`: Array (optional, max 20 items if present, default 0-3 entries)
- `asyncTasks`: Array (optional, max 6 items if present)
- `meta.userRequest`: String (optional, stored for traceability)
- `meta.runId`: String (optional, generated by handler)
- `meta.truncationNotice`: String (optional, set by normalization)

**Unknown Keys**:
- Renderer must **ignore unknown keys** silently
- Validation should warn but not error on unknown top-level keys
- Normalization should preserve unknown keys (pass-through)

## Validation & Normalization Rules

### 6.1 Validation Rules

**Function**: `validateDiscoverySpecV1(spec: unknown): ValidationResult`

**Checks**:
1. **Top-level structure**:
   - Must be object
   - `type` must be `"discovery"`
   - `version` must be `1`
   - Warn (don't error) on unknown top-level keys

2. **Meta validation**:
   - `meta` must be object
   - `meta.title` must be non-empty string
   - If `meta.title.length > 48`: Warning (will be truncated in normalization)

3. **Problem Frame validation**:
   - `problemFrame` must be object
   - `problemFrame.what`, `who`, `why`, `success` must be non-empty strings

4. **Risks & Assumptions validation**:
   - `risksAndAssumptions` must be array
   - Each item must have: `id` (string), `type` ("risk" | "assumption"), `description` (string)
   - `impact` optional, must be "high" | "medium" | "low" if present
   - If array length > 12: Warning (will be truncated)

5. **Hypotheses & Experiments validation**:
   - `hypothesesAndExperiments` must be array
   - Each item must have: `id` (string), `hypothesis` (string)
   - `experiment` optional string
   - `status` optional, must be "untested" | "testing" | "validated" | "invalidated" if present
   - If array length > 12: Warning (will be truncated)

6. **Decision Log validation** (if present):
   - Must be array
   - Each item must have: `timestamp` (string, ISO 8601 format), `decision` (string)
   - `rationale`, `context` optional strings
   - If array length > 20: Warning (will be truncated)

7. **Async Tasks validation** (if present):
   - Must be array
   - Each item must have: `ownerRole` ("Design" | "Product" | "Dev" | "Research" | "Analytics" | "Other"), `task` (string)
   - `dueInHours` optional number (must be positive if present)
   - If array length > 6: Warning (will be truncated)

**Severity Levels**:
- **Error**: Missing required fields, invalid types, invalid enums
- **Warning**: Array length exceeds limits, title too long, unknown keys
- **Info**: Optional fields missing (non-critical)

### 6.2 Normalization Rules

**Function**: `normalizeDiscoverySpecV1(spec: DiscoverySpecV1): DiscoverySpecV1`

**Rules**:
1. **Deep clone** input (never mutate)

2. **Title derivation** (if missing or empty):
   - Extract from `meta.userRequest` or use "Discovery Session"
   - Truncate to 48 chars (add "..." if truncated)
   - Example: "Help me discover what we need to know before redesigning our mobile checkout" → "Help me discover what we need to know..."

3. **Array truncation**:
   - `risksAndAssumptions`: Keep first 12, set `meta.truncationNotice` if truncated
   - `hypothesesAndExperiments`: Keep first 12, set `meta.truncationNotice` if truncated
   - `decisionLog`: Keep first 20 if present, set notice if truncated
   - `asyncTasks`: Keep first 6 if present, set notice if truncated

4. **Default values**:
   - `decisionLog`: Default to empty array `[]` if missing (optional field)
   - `asyncTasks`: Default to empty array `[]` if missing (optional field)
   - `meta.userRequest`: Preserve if present, don't add if missing
   - `meta.runId`: Preserve if present, don't add (handler sets this)

5. **Text truncation** (for rendering):
   - Long text fields (>200 chars) should be truncated in renderer with "...(see SSOT JSON)"
   - This is a rendering concern, not normalization

6. **Unknown keys**: Preserve in normalized output (pass-through)

## Canvas Artifact Layout

### 7.1 Section Structure

**Section Name**: `"Discovery — {meta.title}"`

**Section Properties**:
- `layoutMode`: `'VERTICAL'`
- `primaryAxisSizingMode`: `'AUTO'`
- `counterAxisSizingMode`: `'AUTO'`
- `itemSpacing`: `24px`
- `paddingTop/Right/Bottom/Left`: `40px`
- `fills`: White background `{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }`
- `strokes`: Subtle border `[{ type: 'SOLID', color: { r: 0.88, g: 0.88, b: 0.88 }, opacity: 1 }]`
- `strokeWeight`: `1`
- `cornerRadius`: `8`
- `effects`: Light drop shadow (similar to Design Workshop medium fidelity)

**Section Placement**:
- Reuse `calculateSectionPlacement()` pattern from Design Workshop
- Place below lowest existing node + 120px, or at origin if no nodes
- Ensure `y >= 0`
- **Completely ignore selection** (no anchoring, no context extraction)

### 7.2 Frame Hierarchy

**Frame Order** (top to bottom):
1. Discovery Brief
2. Risks & Assumptions
3. Hypotheses & Experiments
4. Decision Log (if present, 0-3 entries default)
5. Async Tasks (if present, rendered as 4th or 5th frame)

**Frame Common Properties**:
- `layoutMode`: `'VERTICAL'` (all frames)
- `primaryAxisSizingMode`: `'AUTO'`
- `counterAxisSizingMode`: `'FILL'` (consistent width within Section)
- `paddingTop/Right/Bottom/Left`: `16px`
- `itemSpacing`: `8px`
- `fills`: White background
- `strokes`: Subtle border
- `strokeWeight`: `1`
- `cornerRadius`: `8`
- `effects`: Light drop shadow

### 7.3 Frame 1: Discovery Brief

**Name**: `"Discovery Brief"`

**Content Structure**:
- Heading: "Problem Frame" (H1, 18px, bold, Inter)
- Subheading: "What" (H2, 14px, bold) + body text (12px, regular)
- Subheading: "Who" (H2, 14px, bold) + body text (12px, regular)
- Subheading: "Why" (H2, 14px, bold) + body text (12px, regular)
- Subheading: "Success" (H2, 14px, bold) + body text (12px, regular)

**Text Truncation**:
- If any field >200 chars: Truncate to 200 chars + "..."
- Renderer handles this, not normalization

**Layout**:
- Vertical auto-layout
- 8px gap between items
- Text nodes use `textAutoResize: 'HEIGHT'`

### 7.4 Frame 2: Risks & Assumptions

**Name**: `"Risks & Assumptions"`

**Content Structure**:
- Heading: "Risks & Assumptions" (H1, 18px, bold)
- For each item (max 12):
  - Bullet prefix: `"• [RISK]"` or `"• [ASSUMPTION]"` (12px, bold)
  - Description text (12px, regular)
  - Optional: Impact badge (small colored rectangle, 8px height, 40px width)
    - High: Red `{ r: 0.9, g: 0.2, b: 0.2 }`
    - Medium: Orange `{ r: 1, g: 0.6, b: 0.2 }`
    - Low: Yellow `{ r: 1, g: 0.9, b: 0.2 }`

**Text Truncation**:
- If description >200 chars: Truncate to 200 + "..."

**Layout**:
- Vertical auto-layout
- Each item is a horizontal frame (bullet + text + optional badge)

### 7.5 Frame 3: Hypotheses & Experiments

**Name**: `"Hypotheses & Experiments"`

**Content Structure**:
- Heading: "Hypotheses & Experiments" (H1, 18px, bold)
- For each item (max 12):
  - Row frame (horizontal auto-layout):
    - Hypothesis text (flexible width, 12px, regular)
    - Experiment text (if present, flexible width, 11px, italic, muted color)
    - Status badge (if present, fixed width ~80px, 11px, bold)
      - Colors: untested (gray), testing (blue), validated (green), invalidated (red)

**Text Truncation**:
- If hypothesis >150 chars: Truncate to 150 + "..."
- If experiment >150 chars: Truncate to 150 + "..."

**Layout**:
- Vertical auto-layout (rows)
- Each row: horizontal auto-layout with gap 12px

### 7.6 Frame 4: Decision Log (Optional)

**Name**: `"Decision Log"`

**Content Structure**:
- Heading: "Decision Log" (H1, 18px, bold)
- For each entry (0-3 default, max 20):
  - Timestamp (11px, muted color `{ r: 0.6, g: 0.6, b: 0.6 }`)
  - Decision text (12px, bold)
  - Rationale (if present, 11px, regular, muted)
  - Context (if present, 11px, italic, muted)

**Text Truncation**:
- If decision >150 chars: Truncate to 150 + "..."
- If rationale >100 chars: Truncate to 100 + "..."

**Layout**:
- Vertical auto-layout
- 8px gap between entries

**Rendering Logic**:
- Only render if `decisionLog` array exists and has length > 0
- If missing or empty: Skip frame entirely

### 7.7 Frame 5: Async Tasks (Optional)

**Name**: `"Async Tasks"`

**Content Structure**:
- Heading: "Async Tasks" (H1, 18px, bold)
- For each task (max 6):
  - Row frame (horizontal auto-layout):
    - Owner role badge (fixed width ~80px, 11px, bold, colored by role)
    - Task text (flexible width, 12px, regular)
    - Due indicator (if `dueInHours` present, fixed width ~60px, 11px, muted)
      - Format: "{hours}h" or "{days}d" if >24h

**Text Truncation**:
- If task >150 chars: Truncate to 150 + "..."

**Layout**:
- Vertical auto-layout (rows)
- Each row: horizontal auto-layout with gap 12px

**Rendering Logic**:
- Only render if `asyncTasks` array exists and has length > 0
- If missing or empty: Skip frame entirely


## File Changes List

### 8.1 New Files

**`src/core/discovery/types.ts`** (NEW)
- `DiscoverySpecV1` interface
- Supporting types: `RiskOrAssumption`, `HypothesisExperiment`, `DecisionLogEntry`, `AsyncTask`
- Export all types

**`src/core/discovery/validate.ts`** (NEW)
- `ValidationResult` interface (reuse from Design Workshop pattern)
- `validateDiscoverySpecV1(spec: unknown): ValidationResult`
- `normalizeDiscoverySpecV1(spec: DiscoverySpecV1): DiscoverySpecV1`
- Title derivation helper: `deriveTitle(userRequest: string, maxLength: number): string`

**`src/core/discovery/renderer.ts`** (NEW)
- `renderDiscoverySpecToSection(spec: DiscoverySpecV1, runId?: string): Promise<{ section: FrameNode, frames: FrameNode[] }>`
- Helper functions:
  - `renderBriefFrame(spec: DiscoverySpecV1, fonts): Promise<FrameNode>`
  - `renderRisksFrame(spec: DiscoverySpecV1, fonts): Promise<FrameNode>`
  - `renderHypothesesFrame(spec: DiscoverySpecV1, fonts): Promise<FrameNode>`
  - `renderDecisionLogFrame(spec: DiscoverySpecV1, fonts): Promise<FrameNode | null>`
  - `renderAsyncTasksFrame(spec: DiscoverySpecV1, fonts): Promise<FrameNode | null>`
  - `calculateSectionPlacement(section: FrameNode): { x: number, y: number }` (reuse pattern)
  - `truncateText(text: string, maxLength: number): string`

**`src/core/assistants/handlers/discovery.ts`** (NEW)
- `DiscoveryCopilotHandler` class implements `AssistantHandler`
- `canHandle(assistantId: string, actionId: string | undefined): boolean`
- `prepareMessages(messages: NormalizedMessage[]): NormalizedMessage[]`
- `handleResponse(context: HandlerContext): Promise<HandlerResult>`
- `attemptRepair(context: HandlerContext, originalResponse: string, runId: string): Promise<HandlerResult>`
- `deriveTitle(userRequest: string): string` (48 char cap)

### 8.2 Modified Files

**`src/assistants/index.ts`** (MODIFY)
- Add `discovery_copilot` entry to `ASSISTANTS` array
- Icon: `PathIcon`
- Quick action: `"start-discovery"` (optional, chat-only is fine)
- Intro message: `"I help you structure discovery thinking through problem framing, risk identification, and hypothesis formation. Describe what you're discovering, and I'll create discovery artifacts on the canvas."`
- Prompt: Include JSON-only enforcement, schema requirements, async tasks encouragement

**`src/core/assistants/handlers/index.ts`** (MODIFY)
- Import `DiscoveryCopilotHandler`
- Add to `handlers` array

**`src/ui/icons.tsx`** (MODIFY)
- Add `PathIcon` component (inline SVG from `svgs/PathIcon.svg`)
- Export function

**`src/ui.tsx`** (MODIFY)
- Add `PathIcon` to `getAssistantIcon` map
- Ensure intro message deduplication (reuse Design Workshop pattern)

### 8.3 File Structure

```
src/
├── core/
│   ├── discovery/
│   │   ├── types.ts          (NEW)
│   │   ├── validate.ts       (NEW)
│   │   └── renderer.ts       (NEW)
│   └── assistants/
│       └── handlers/
│           └── discovery.ts  (NEW)
├── assistants/
│   └── index.ts              (MODIFY)
├── ui/
│   ├── icons.tsx             (MODIFY)
│   └── tsx                   (MODIFY)
└── svgs/
    └── PathIcon.svg          (EXISTS - reference for inline)
```

## Acceptance Tests

### 9.1 JSON-Only Compliance + Repair Flow

**Test 1.1: Valid JSON Response**
- **Input**: LLM returns valid `DiscoverySpecV1` JSON
- **Expected**: No repair triggered, validation passes, rendering succeeds
- **Verify**: Section created with all frames

**Test 1.2: JSON with Code Fences**
- **Input**: LLM returns JSON wrapped in `\`\`\`json ... \`\`\``
- **Expected**: `extractJsonFromResponse()` strips fences, parsing succeeds
- **Verify**: No repair triggered, rendering succeeds

**Test 1.3: Invalid JSON (Parse Error)**
- **Input**: LLM returns malformed JSON (missing closing brace)
- **Expected**: Repair flow triggered, LLM asked to fix, retry succeeds
- **Verify**: Repair attempt logged, final rendering succeeds

**Test 1.4: Invalid Schema (Validation Error)**
- **Input**: LLM returns valid JSON but missing required field (e.g., `problemFrame.what`)
- **Expected**: Validation fails, repair flow triggered with validation errors in prompt
- **Verify**: Repair attempt includes validation errors, final rendering succeeds

**Test 1.5: Repair Failure**
- **Input**: LLM returns invalid JSON, repair attempt also fails
- **Expected**: Error message sent to user, handler returns `{ handled: true, message: "Error: ..." }`
- **Verify**: No Section created, error message in chat

### 9.2 Canvas Artifacts

**Test 2.1: Section Creation**
- **Input**: Valid spec with all required fields
- **Expected**: 1 Section created, named "Discovery — {title}"
- **Verify**: Section exists on canvas, name matches derived title

**Test 2.2: Frame Count**
- **Input**: Spec with all optional fields present
- **Expected**: 3 primary frames + Decision Log + Async Tasks = 5 frames total
- **Verify**: All frames present in Section

**Test 2.3: Frame Count (Minimal)**
- **Input**: Spec with only required fields (no Decision Log, no Async Tasks)
- **Expected**: 3 primary frames total
- **Verify**: Brief, Risks, Hypotheses present; Decision Log and Async Tasks absent

### 9.3 Async Tasks Rendering

**Test 3.1: Async Tasks Present**
- **Input**: Spec with `asyncTasks` array (3 items)
- **Expected**: Async Tasks frame rendered with 3 task rows
- **Verify**: Frame name "Async Tasks", 3 rows, owner roles and tasks visible

**Test 3.2: Async Tasks Absent**
- **Input**: Spec without `asyncTasks` field
- **Expected**: Async Tasks frame not rendered
- **Verify**: Frame count excludes Async Tasks frame

**Test 3.3: Async Tasks Truncation**
- **Input**: Spec with 8 async tasks (exceeds max 6)
- **Expected**: Normalization truncates to 6, rendering shows 6 tasks, truncation notice set
- **Verify**: Only 6 tasks in frame, `meta.truncationNotice` present

**Test 3.4: Due Hours Formatting**
- **Input**: Spec with `dueInHours: 24` and `dueInHours: 72`
- **Expected**: Rendered as "24h" and "3d" respectively
- **Verify**: Due indicators show correct format

### 9.4 Title Derivation

**Test 4.1: Title from User Request**
- **Input**: `meta.userRequest = "Help me discover what we need to know before redesigning checkout"`
- **Expected**: `meta.title = "Help me discover what we need to know..."` (48 chars max)
- **Verify**: Title derived, truncated with "..." if needed

**Test 4.2: Title Already Present**
- **Input**: Spec with `meta.title = "Custom Title"`
- **Expected**: Title preserved (not overridden)
- **Verify**: Section name uses "Custom Title"

**Test 4.3: Title Missing and No User Request**
- **Input**: Spec without `meta.title` and without `meta.userRequest`
- **Expected**: `meta.title = "Discovery Session"` (default)
- **Verify**: Section name is "Discovery — Discovery Session"

### 9.5 Selection Ignoring

**Test 5.1: Selection Present, Ignored**
- **Input**: User has 3 frames selected, runs Discovery Copilot
- **Expected**: Section placed using `calculateSectionPlacement()` (below lowest node), selection not used
- **Verify**: Section placement independent of selection, no selection context extracted

**Test 5.2: No Selection**
- **Input**: No selection, empty canvas
- **Expected**: Section placed at origin (x=0, y=0, ensure y>=0)
- **Verify**: Section at origin

### 9.6 Unknown Keys Handling

**Test 6.1: Unknown Top-Level Key**
- **Input**: Spec with `{ type: "discovery", version: 1, unknownField: "value", ... }`
- **Expected**: Validation warns but doesn't error, renderer ignores `unknownField`
- **Verify**: Section renders correctly, `unknownField` not in SSOT JSON (or preserved but not rendered)

**Test 6.2: Unknown Nested Key**
- **Input**: Spec with `problemFrame: { what: "...", unknownNested: "value" }`
- **Expected**: Renderer ignores `unknownNested`, renders only known fields
- **Verify**: Brief frame shows only What/Who/Why/Success, unknown field ignored

### 9.7 Text Truncation

**Test 7.1: Long Problem Frame Text**
- **Input**: `problemFrame.what` = 300 char string
- **Expected**: Rendered text truncated to 200 chars + "..."
- **Verify**: Text node shows truncated version

**Test 7.2: Long Hypothesis Text**
- **Input**: `hypothesesAndExperiments[0].hypothesis` = 200 char string
- **Expected**: Rendered text truncated to 150 chars + "..."
- **Verify**: Hypothesis frame shows truncated version

### 9.8 Array Truncation

**Test 8.1: Risks Array Truncation**
- **Input**: Spec with 15 risks (exceeds max 12)
- **Expected**: Normalization keeps first 12, sets `meta.truncationNotice`
- **Verify**: Risks frame shows 12 items, truncation notice in chat

**Test 8.2: Hypotheses Array Truncation**
- **Input**: Spec with 15 hypotheses (exceeds max 12)
- **Expected**: Normalization keeps first 12, sets `meta.truncationNotice`
- **Verify**: Hypotheses frame shows 12 items, truncation notice in chat

**Test 8.3: Decision Log Truncation**
- **Input**: Spec with 25 decision log entries (exceeds max 20)
- **Expected**: Normalization keeps first 20, sets `meta.truncationNotice`
- **Verify**: Decision Log frame shows 20 entries, truncation notice in chat

**Test 8.4: Async Tasks Truncation**
- **Input**: Spec with 8 async tasks (exceeds max 6)
- **Expected**: Normalization keeps first 6, sets `meta.truncationNotice`
- **Verify**: Async Tasks frame shows 6 tasks, truncation notice in chat

### 9.9 Demo Flow

**Test 9.1: Complete Demo Flow**
- **Steps**:
  1. Select "Discovery Copilot" assistant
  2. Verify intro message (non-duplicated, clean)
  3. Type: "Help me discover what we need to know before building a save for later feature"
  4. Verify "Analyzing..." spinner
  5. Wait for completion
  6. Verify "Discovery artifacts placed on stage" message
  7. Verify Section created with frames
- **Expected**: All steps complete in <5 minutes
- **Verify**: Section name derived from request, all frames present and correctly rendered

## Future Enhancements

### 10.1 Design System Reference Packs (Placeholder)

**Extension Point** (documentation only, not implemented):
- Future: `WorkAdapter.getDesignSystemRegistry()` may provide DS packs
- Future: Renderer may use DS tokens for colors, typography, spacing
- **MVP**: Use plugin defaults, document extension point in `docs/EXTENSION_POINTS.md`

**Placeholder Documentation**:
```markdown
### Discovery Copilot - Design System Integration (Future)

**Extension Point**: `WorkAdapter.getDesignSystemRegistry()`

**Future Behavior**:
- Renderer may check for DS registry
- If present, use DS tokens for colors, typography, spacing
- If absent, use plugin defaults (current MVP behavior)

**MVP Status**: Not implemented, uses plugin defaults
```

### 10.2 SSOT Strategy (Future)

**Future Enhancement** (not in MVP):
- Future: May add SSOT JSON frame to canvas for debugging/transparency
- Future: May implement SSOT-based editing (edit frames, sync to JSON)
- **MVP**: Focus on rendering only, no SSOT visibility on canvas

### 10.2 Post-MVP Enhancements

1. **Template Library**:
   - Pre-filled discovery frames for common scenarios
   - User can select template and customize

2. **Export/Import**:
   - Export discovery artifacts to markdown/PDF
   - Import from previous sessions
   - JSON export button

3. **Interactive Editing**:
   - Edit frames directly in Figma
   - Sync edits back to SSOT JSON

4. **Multi-Session History**:
   - Track multiple discovery sessions
   - Compare sessions over time

5. **Design Context Integration**:
   - Scan selected Figma frames for context
   - Extract design decisions from canvas

6. **Collaboration Features**:
   - Comments on discovery artifacts
   - Approval workflows
   - Team annotations

7. **Advanced Discovery Methods**:
   - User research synthesis
   - Competitive analysis integration
   - Data analysis integration

8. **External Integrations** (if needed):
   - Jira/Confluence export
   - Slack/Teams notifications
   - Task management sync

## Implementation Order

1. **Types** (`types.ts`) - Foundation
2. **Validation** (`validate.ts`) - Schema contract, title derivation
3. **Renderer** (`renderer.ts`) - Core output, text truncation
4. **Handler** (`discovery.ts`) - Orchestration, repair flow
5. **Integration** (assistant registration, icons, UI)
6. **Testing** (acceptance tests validation)

## Success Criteria

**MVP is successful if**:
- ✅ User can run discovery session in <5 minutes
- ✅ All 3 primary frames render correctly with content
- ✅ Async tasks render when present
- ✅ Title derivation works (48 char cap)
- ✅ Hard limits prevent runaway output
- ✅ Error handling is graceful (no crashes)
- ✅ JSON repair works for common LLM mistakes
- ✅ Section placement ignores selection
- ✅ Unknown keys are ignored silently
- ✅ Text truncation works for long content
- ✅ Intro message is clean (no duplicates, no metadata tags)

---

**Plan Status**: Ready for implementation
**Next Step**: Begin with `types.ts` and work through implementation order
