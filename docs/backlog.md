# FigmAI Plugin Backlog

## Purpose

This file is the **canonical backlog** for the FigmAI plugin project. It serves as the single source of truth for all planned work, active tasks, bugs, technical debt, and experimental ideas.

**What this backlog is:**
- The authoritative list of all work items (features, bugs, improvements, experiments)
- A prioritized, status-tracked view of project work
- A reference for planning, estimation, and progress tracking
- A historical record of completed work

**What this backlog is not:**
- A task management system (use GitHub Issues, Linear, Jira, etc. for day-to-day execution)
- A replacement for code documentation or architecture decisions
- A place for detailed technical specifications (use plan files for that)
- A duplicate of commit history or PR descriptions

**Single Source of Truth Statement:**
This file is the canonical backlog. All work items must be tracked here before implementation. Code changes must reference a Backlog ID (BL-XXX) in commit messages and PR descriptions.

---

## Backlog Governance

### Modification Rules

1. **Only the Editor agent may modify this file**
   - Human editors should propose changes via PRs or issue tracking
   - AI agents (except Editor) should read-only and reference items by ID
   - Direct edits to this file should be rare and deliberate

2. **Code changes must reference a Backlog ID**
   - Commit messages: `feat: Add feature X (BL-001)`
   - PR titles: `[BL-001] Add feature X`
   - PR descriptions: `Implements BL-001: Add feature X`

3. **Backlog items are promoted, not duplicated**
   - When an item moves from "Later" to "Next", update its status and section
   - Do not create duplicate entries in multiple sections
   - Use status and section changes to track progression

4. **Closed items are archived, not deleted**
   - Move completed items to an "Archived" section or mark as "Done"
   - Preserve historical context and acceptance criteria
   - Archive helps track project velocity and completed work

5. **IDs are never reused**
   - Each Backlog ID (BL-XXX) is unique and permanent
   - Even if an item is cancelled or superseded, its ID remains
   - This ensures traceability and prevents confusion

---

## Backlog Workflow

### Item Lifecycle

```
Ideas → Later → Next → Now → Done → Archived
```

**Ideas / Experiments**
- New proposals, research questions, or experimental concepts
- Low commitment, exploratory items
- May be promoted to "Later" if validated

**Later**
- Validated ideas that are not yet prioritized
- Items with clear value but no immediate timeline
- May be promoted to "Next" when capacity allows

**Next**
- Prioritized items ready for implementation
- Clear scope, acceptance criteria, and dependencies resolved
- Promoted to "Now" when work begins

**Now**
- Currently active work items
- Should be limited to 2-5 items to maintain focus
- Moved to "Done" when acceptance criteria are met

**Done**
- Completed items awaiting verification or archival
- Should be moved to "Archived" after verification period

**Archived**
- Historical record of completed work
- Maintained for reference and velocity tracking

### Plan Files

When an item moves from "Next" to "Now":
1. Create a plan file in `docs/plans/` (see Plan File Convention below)
2. Link the plan file in the backlog item's "Notes / Links" column
3. Use the plan file for detailed implementation steps
4. Keep the backlog item updated with status changes

### Relationship to Commits and PRs

- **Backlog Item**: High-level work item with acceptance criteria
- **Plan File**: Detailed implementation steps and technical approach
- **Commit**: Atomic code change referencing Backlog ID
- **PR**: Collection of commits implementing a Backlog item

Example flow:
1. Item BL-001 in "Next" section
2. Plan file created: `docs/plans/BL-001_add-feature-x.plan.md`
3. Commits: `feat: Add feature X (BL-001)`, `test: Add tests for feature X (BL-001)`
4. PR: `[BL-001] Add feature X` with link to plan file
5. Item BL-001 moved to "Done" after PR merge

---

## Status Definitions

| Status | Description | When to Use |
|--------|-------------|-------------|
| **Proposed** | Item is suggested but not yet approved | Initial state for new items in Ideas section |
| **Approved** | Item is validated and ready for prioritization | Item has clear value and acceptance criteria |
| **In Progress** | Active work is happening | Item is in "Now" section and being worked on |
| **Blocked** | Work cannot proceed due to dependency or issue | External blocker or prerequisite missing |
| **Done** | Work is complete, awaiting verification | Acceptance criteria met, PR merged |
| **Archived** | Item is complete and verified | Historical record, no further action needed |
| **Cancelled** | Item is no longer relevant or superseded | Work abandoned or replaced by another item |

---

## Priority Definitions

| Priority | Description | Examples |
|----------|-------------|----------|
| **P0 - Critical** | Blocks core functionality or security issue | Security vulnerabilities, data loss bugs |
| **P1 - High** | Significant user impact or major feature | Core feature improvements, performance issues |
| **P2 - Medium** | Moderate impact or nice-to-have feature | UI polish, minor feature additions |
| **P3 - Low** | Low impact or experimental | Nice-to-have improvements, research items |

**Priority Guidelines:**
- P0 items should be addressed immediately
- P1 items should be planned for next sprint/cycle
- P2 items can be scheduled when capacity allows
- P3 items are optional and may be deferred indefinitely

---

## Backlog Sections

### Now

Active work items currently being implemented. Limit to 2-5 items to maintain focus.

| ID | Title | Priority | Status | Owner | Acceptance Criteria | Notes / Links |
|----|-------|----------|--------|-------|---------------------|---------------|
| BL-004 | Display build/version number in Settings modal | P1 | Proposed | Unassigned | Settings modal shows plugin version/build that matches build artifacts and git tag | |

---

### Next

Prioritized items ready for implementation. These should have clear scope and acceptance criteria.

| ID | Title | Priority | Status | Owner | Acceptance Criteria | Notes / Links |
|----|-------|----------|--------|-------|---------------------|---------------|
| BL-007 | Improve assistant accuracy and usefulness across all assistants | P1 | Proposed | Unassigned | Each assistant has clearer scope, fewer ambiguous responses, and better task completion rates | |
| BL-008 | Create Figma-stage UI components aligned to plugin design direction | P2 | Proposed | Unassigned | Components feel cohesive, usable, and ready for real design workflows | |

---

### Later

Validated items that are not yet prioritized. May be promoted to "Next" when capacity allows.

| ID | Title | Priority | Status | Owner | Acceptance Criteria | Notes / Links |
|----|-------|----------|--------|-------|---------------------|---------------|
| BL-005 | Public HTML marketing website for FigmAI plugin | P2 | Proposed | Unassigned | Static site exists with overview, feature list, screenshots, docs links, and contact info | |
| BL-006 | HTML admin/editor interface for custom config and knowledge files | P2 | Proposed | Unassigned | Editors can update content through UI, with validation and export back to source format | |

---

### Bugs

Known issues and defects that need to be addressed.

| ID | Title | Priority | Status | Owner | Acceptance Criteria | Notes / Links |
|----|-------|----------|--------|-------|---------------------|---------------|
| BL-001 | DCA does not invoke DESIGN_SYSTEM_QUERY for DS availability questions | P1 | Blocked | Unassigned | See details below | DS enforcement implementation session |
| BL-002 | Plugin-generated elements are not placed at intended canvas locations | P1 | Proposed | Unassigned | Generated elements consistently appear in predictable, user-intended positions relative to selection or viewport | |
| BL-003 | Processing animation donut does not animate | P2 | Proposed | Unassigned | Processing indicator animates smoothly while async operations are running | |

#### BL-001: DCA does not invoke DESIGN_SYSTEM_QUERY for DS availability questions

**Summary / Problem Statement:**

When asking the Design Critique Assistant (DCA) "What design system components are available?", the assistant responds with a generic clarification request (e.g., asking about Material, Ant, etc.) instead of calling the DESIGN_SYSTEM_QUERY tool and listing the active registry. Despite prompt-level and handler-level enforcement being added, the tool is not being invoked at runtime.

**Expected Behavior:**

When `designSystems.enabled=true` and `activeRegistries` is non-empty, DCA should:
- Call DESIGN_SYSTEM_QUERY with action "list"
- Respond using real registry/component data from the tool result
- Only ask clarifying questions if multiple registries exist and the request is ambiguous

**Actual Behavior:**

DCA ignores tool-first enforcement and responds as a generic chatbot, suggesting Material/Ant/etc., indicating tool invocation is not occurring at runtime.

**What's Already Verified:**

- Registry is compiled and present in `customRegistries.ts`
- DESIGN_SYSTEM_QUERY tool exists and is registered in `toolRegistry.ts`
- Prompt-level enforcement was added to DCA prompt in `src/assistants/index.ts`
- Handler-level enforcement logic was added in `src/core/assistants/handlers/designCritique.ts` `prepareMessages()`
- Build passes and plugin installs successfully
- Debug logging was added to `src/core/tools/designSystemTools.ts`
- Despite all this, runtime behavior still does not trigger tool usage

**Likely Cause (Hypothesis):**

Assistant orchestration or message preparation path is not correctly forcing tool execution for DS availability queries. The tool call result may be bypassed by the LLM response path, or the tool calling mechanism may not be properly integrated with the provider/LLM interface.

**Acceptance Criteria:**

- Asking "What design system components are available?" results in a tool call
- Console logs confirm DESIGN_SYSTEM_QUERY execution with action "list"
- Response lists only real active registries/components (no generic suggestions)
- No hallucinated or invented component lists

---

### Tech Debt

Technical improvements, refactoring, and code quality improvements.

| ID | Title | Priority | Status | Owner | Acceptance Criteria | Notes / Links |
|----|-------|----------|--------|-------|---------------------|---------------|
| *No tech debt items* | | | | | | |

---

### Ideas / Experiments

Exploratory ideas, research questions, and experimental concepts. Low commitment items.

| ID | Title | Priority | Status | Owner | Acceptance Criteria | Notes / Links |
|----|-------|----------|--------|-------|---------------------|---------------|
| *No ideas proposed* | | | | | | |

---

### Archived

Historical record of completed work. Items are moved here after verification period.

| ID | Title | Priority | Status | Owner | Acceptance Criteria | Notes / Links |
|----|-------|----------|--------|-------|---------------------|---------------|
| *No archived items* | | | | | | |

---

## ID Convention

### Format

Backlog IDs follow the format: **BL-XXX**

Where:
- `BL` = Backlog prefix
- `XXX` = Sequential number (001, 002, 003, ...)

Examples:
- `BL-001`
- `BL-002`
- `BL-123`

### Assignment Rules

1. **Sequential assignment**: IDs are assigned in order (001, 002, 003, ...)
2. **Never reused**: Once assigned, an ID is permanent and never reused
3. **No gaps required**: If BL-005 is cancelled, BL-006 still follows (no need to backfill)
4. **Single source**: Only this file assigns Backlog IDs

### How to Assign

1. Find the highest existing ID in all sections
2. Increment by 1
3. Use the new ID for the new item
4. Add the item to the appropriate section

Example:
- Highest existing ID: BL-042
- New item ID: BL-043

---

## Plan File Convention

### When to Create a Plan File

Create a plan file when:
- An item moves from "Next" to "Now" (work is starting)
- Detailed implementation steps are needed
- Multiple commits or PRs will be required
- Technical approach needs documentation

Do not create a plan file for:
- Simple, single-commit changes
- Items still in "Later" or "Ideas"
- Items that are self-explanatory

### Location

All plan files are stored in: `docs/plans/`

### Naming Format

```
<id>_<short-slug>.plan.md
```

Examples:
- `BL-001_add-feature-x.plan.md`
- `BL-042_refactor-handlers.plan.md`
- `BL-123_fix-bug-y.plan.md`

### Plan File Structure

A plan file should contain:

1. **Title**: Brief description of the work
2. **Goal**: What this plan achieves
3. **Scope**: What is included and excluded
4. **Constraints**: Limitations, requirements, or dependencies
5. **Implementation Steps**: Detailed steps to complete the work
6. **Verification**: How to verify the work is complete
7. **Links**: Related backlog items, issues, or documentation

### Example Plan File

```markdown
# BL-001: Add Feature X

## Goal
Add feature X to enable Y capability for users.

## Scope
- Include: Core feature implementation, basic tests
- Exclude: Advanced features, UI polish (deferred to BL-002)

## Constraints
- Must maintain backward compatibility
- Must not break existing tests
- Performance impact must be < 10ms

## Implementation Steps
1. Create feature module
2. Add tests
3. Update documentation
4. Integration testing

## Verification
- All tests pass
- Manual testing confirms feature works
- Documentation updated

## Links
- Related: BL-002 (UI polish)
- References: docs/architecture.md
```

---

## Commit / PR Convention

### Commit Messages

All commits implementing backlog items must reference the Backlog ID:

**Format:**
```
<type>: <description> (BL-XXX)
```

**Examples:**
```
feat: Add feature X (BL-001)
fix: Resolve bug in handler (BL-042)
refactor: Extract common logic (BL-123)
test: Add tests for feature X (BL-001)
docs: Update architecture docs (BL-001)
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code refactoring
- `test`: Test additions or changes
- `docs`: Documentation changes
- `chore`: Maintenance tasks

### PR Titles

**Format:**
```
[BL-XXX] <description>
```

**Examples:**
```
[BL-001] Add feature X
[BL-042] Fix bug in handler
[BL-123] Refactor common logic
```

### PR Descriptions

PR descriptions should include:

1. **Backlog Reference**: `Implements BL-XXX: <title>`
2. **Summary**: Brief description of changes
3. **Plan File Link**: Link to plan file if one exists
4. **Testing**: How the changes were tested
5. **Related Items**: Links to related backlog items or issues

**Example:**
```markdown
Implements BL-001: Add feature X

## Summary
Adds feature X to enable Y capability for users.

## Plan
See docs/plans/BL-001_add-feature-x.plan.md

## Testing
- Unit tests added and passing
- Manual testing completed
- Integration tests verified

## Related
- Related to BL-002 (UI polish)
```

---

## Maintenance Guidelines

### Regular Updates

- **Weekly**: Review "Now" section, update statuses, move completed items to "Done"
- **Monthly**: Review "Next" and "Later" sections, promote items as needed
- **Quarterly**: Archive "Done" items older than 3 months

### Item Quality

Each backlog item should have:
- Clear, actionable title
- Appropriate priority
- Current status
- Acceptance criteria (what "done" looks like)
- Owner (if applicable)

### Section Limits

- **Now**: 2-5 items maximum
- **Next**: 10-20 items maximum
- **Later**: No limit, but review quarterly
- **Bugs**: All known bugs should be tracked
- **Tech Debt**: Prioritized tech debt items only
- **Ideas**: No limit, but review quarterly

---

## Changelog

This section tracks significant changes to the backlog structure itself.

| Date | Change | Reason |
|------|--------|--------|
| 2026-01-26 | Initial backlog structure created | Establish canonical backlog system |

---

## Questions or Issues?

If you have questions about the backlog or need to propose changes to this structure:
1. Create an issue or discussion item
2. Reference this file in your proposal
3. Wait for approval before modifying this file

**Remember**: This file is the single source of truth. Keep it accurate, up-to-date, and well-maintained.
