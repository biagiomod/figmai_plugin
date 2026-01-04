# Assistant Design Specification

## Overview

This document defines the design, scope, and boundaries for all Assistants in the FigmAI plugin. Each Assistant has a clear purpose, structured knowledge base, and predictable outputs optimized for designers, content writers, product thinkers, and developers.

---

## Assistant Architecture

### Core Principles

1. **Single Responsibility**: Each Assistant has one primary purpose
2. **Structured Outputs**: All outputs follow predictable formats (JSON, markdown sections, checklists)
3. **Opinionated Guidance**: Assistants provide specific, actionable recommendations
4. **Role-Appropriate Tone**: Tone matches the Assistant's purpose and audience
5. **Clear Boundaries**: Minimal overlap between Assistants unless intentional

### Knowledge Base Structure

Each Assistant's knowledge base is a markdown file (`{assistantId}.md`) containing:

1. **Identity & Role**: Clear introduction and purpose
2. **Input Expectations**: What the Assistant needs (selection, images, text, etc.)
3. **Output Structure**: Exact format for responses (JSON schema, markdown sections)
4. **Evaluation Criteria**: Dimensions, scoring models, or checklists used
5. **Tone & Rigor**: Level of detail, formality, and strictness
6. **Quick Action Context**: When and how Quick Actions should be used

---

## Assistant Catalog

### 1. General Assistant
**Purpose**: Catch-all helper for design questions, Figma usage, and general guidance  
**Audience**: All users  
**Tone**: Supportive, conversational, educational  
**Output**: Free-form text with actionable advice  
**Overlap**: Intentionally broad; defers to specialized Assistants when appropriate

**Quick Actions**:
- Explain this design (no selection required)
- Design suggestions (no selection required)

---

### 2. Design Critique Assistant
**Purpose**: Comprehensive UX/UI design evaluation with quantitative scoring  
**Audience**: Designers seeking structured feedback  
**Tone**: Professional, constructive, specific  
**Output**: Structured JSON with score, wins, fixes, checklist, notes  
**Overlap**: None (unique scoring model)

**Quick Actions**:
- Give Design Crit (requires selection + vision)

**Scoring Model**: 0-100 based on usability impact (hierarchy, spacing, accessibility, interaction clarity)

---

### 3. UX Copy Review Assistant
**Purpose**: Evaluate and improve text content for clarity, tone, and UX effectiveness  
**Audience**: Content writers, designers, product managers  
**Tone**: Editorial, constructive, user-focused  
**Output**: Structured JSON with scores, issues, suggestions, tone analysis  
**Overlap**: Minimal with Design Critique (focuses on text, not visual design)

**Quick Actions**:
- Review copy (requires selection with text)
- Tone check (requires selection with text)
- Content suggestions (no selection required)

**Scoring Dimensions**:
- Clarity (0-100)
- Tone appropriateness (0-100)
- Conciseness (0-100)
- Actionability (0-100)
- Overall score (weighted average)

---

### 4. Dev Handoff Assistant
**Purpose**: Generate developer-friendly specifications and documentation from designs  
**Audience**: Developers reading designs in Figma  
**Tone**: Technical, precise, implementation-focused  
**Output**: Structured markdown with specs, measurements, code snippets, component details  
**Overlap**: None (unique technical focus)

**Quick Actions**:
- Generate specs (requires selection)
- Export measurements (requires selection)
- Component details (requires selection)

**Output Sections**:
- Layout & Spacing (exact measurements)
- Typography (font families, sizes, weights, line heights)
- Colors (hex codes, usage context)
- Components (reusable patterns, variants)
- Interactions (states, animations, transitions)
- Responsive behavior (breakpoints, constraints)
- Accessibility notes (ARIA, keyboard navigation)

---

### 5. Accessibility Assistant
**Purpose**: Identify and fix accessibility issues in designs  
**Audience**: Designers, accessibility advocates  
**Tone**: Technical, compliance-focused, educational  
**Output**: Structured JSON with issues, severity, WCAG references, fixes  
**Overlap**: Some with Design Critique (accessibility is one dimension there)

**Quick Actions**:
- Check accessibility (requires selection + vision)
- WCAG compliance check (requires selection + vision)
- Color contrast analysis (requires selection + vision)

**Scoring Model**: 
- Pass/Fail per WCAG criterion
- Overall compliance level (A, AA, AAA)
- Issue severity (critical, high, medium, low)

**Evaluation Dimensions**:
- Color contrast (WCAG AA/AAA)
- Text sizing and legibility
- Interactive element sizing (44x44pt minimum)
- Focus indicators
- Semantic structure
- Alternative text needs
- Keyboard navigation support

---

### 6. Content Table Assistant
**Purpose**: Generate structured content inventories and tables from designs  
**Audience**: Content strategists, product managers, designers  
**Tone**: Analytical, organized, systematic  
**Output**: Structured markdown table with content inventory  
**Overlap**: None (unique content-focused output)

**Quick Actions**:
- Generate content table (requires selection)
- Export content inventory (requires selection)

**Output Structure**:
- Markdown table with columns: Element, Type, Content, Variants, Notes
- Grouped by screen/page
- Includes all text content, CTAs, labels, placeholders

---

### 7. Errors Assistant
**Purpose**: Identify design errors, inconsistencies, and quality issues  
**Audience**: Designers, QA reviewers  
**Tone**: Direct, diagnostic, solution-oriented  
**Output**: Structured JSON with errors, severity, category, fixes  
**Overlap**: Some with Design Critique (errors are a subset of critique)

**Quick Actions**:
- Find errors (requires selection + vision)
- Check consistency (requires selection + vision)

**Error Categories**:
- Layout errors (misalignment, overflow, constraints)
- Style inconsistencies (spacing, colors, typography)
- Component misuse (wrong variants, missing states)
- Naming issues (unclear layer names)
- Missing elements (error states, loading states, empty states)

**Severity Levels**:
- Critical: Breaks functionality or usability
- High: Significant UX impact
- Medium: Noticeable inconsistency
- Low: Minor polish issue

---

### 8. Code2Design Assistant
**Purpose**: Import/export JSON templates for design-to-code workflows  
**Audience**: Developers, design systems teams  
**Tone**: Technical, precise  
**Output**: JSON templates, format documentation  
**Overlap**: None (tool-focused, not analysis)

**Quick Actions**:
- SEND JSON (no selection required)
- GET JSON (requires selection)
- How to format JSON (no selection required)

---

### 9. Spell Check Assistant
**Purpose**: Identify spelling and grammar errors in text layers  
**Audience**: Content writers, designers  
**Tone**: Editorial, precise  
**Output**: Structured JSON with errors, suggestions, corrections  
**Overlap**: None (tool-focused, not analysis)

**Quick Actions**:
- Check spelling (requires selection with text)

**Output Structure**:
- List of misspelled words with context
- Suggested corrections
- Grammar issues (if applicable)
- Language detection

---

## Quick Action Design Rules

### When Quick Actions Appear

1. **Always Available**: Actions that don't require selection appear in all contexts
2. **Selection-Dependent**: Actions requiring selection only appear when selection exists
3. **Vision-Dependent**: Actions requiring vision only appear when images can be exported
4. **Text-Dependent**: Actions requiring text only appear when text layers are selected

### Quick Action Naming

- Use action verbs: "Check", "Review", "Generate", "Find", "Export"
- Be specific: "Check accessibility" not "Accessibility"
- Match Assistant purpose: Quick Actions should align with Assistant's core function

---

## Output Format Standards

### JSON Outputs

All JSON outputs must:
- Be valid, parseable JSON
- Include error handling (empty arrays/objects when no data)
- Use consistent key naming (snake_case or camelCase per Assistant)
- Include metadata when helpful (timestamp, version, criteria used)

### Markdown Outputs

All markdown outputs must:
- Use clear section headers (##)
- Include code blocks for technical content
- Use tables for structured data
- Be scannable with bullet points and lists

### Scoring Models

When scoring is used:
- Define clear ranges and what they mean
- Explain criteria explicitly
- Provide context for scores (not just numbers)
- Include sub-scores when helpful

---

## Assistant Boundaries & Overlap

### Intentional Overlaps

1. **Design Critique ↔ Accessibility**: Design Critique includes accessibility as one dimension, but Accessibility Assistant provides deeper WCAG-focused analysis
2. **Design Critique ↔ Errors**: Errors are a subset of critique, but Errors Assistant focuses on diagnostic issues rather than holistic evaluation
3. **UX Copy Review ↔ General**: General can answer copy questions, but UX Copy Review provides structured, UX-focused analysis

### Clear Boundaries

1. **Dev Handoff**: Unique technical focus, no overlap
2. **Content Table**: Unique content inventory focus, no overlap
3. **Code2Design**: Tool-focused, no analysis overlap
4. **Spell Check**: Tool-focused, no design analysis overlap

---

## Implementation Guidelines

### Knowledge Base Files

Each Assistant has a markdown file: `/src/assistants/{assistantId}.md`

Structure:
```markdown
# {Assistant Name}

[Identity & Role section]

## Your Role

[Clear purpose statement]

## Input Expectations

[What the Assistant needs]

## Output Structure

[Exact format requirements]

## Evaluation Criteria / Scoring Model

[How evaluation works]

## Tone & Guidelines

[Personality and approach]

## Quick Actions

[When and how Quick Actions work]
```

### Assistant Registry

Assistants are registered in `/src/assistants/index.ts` with:
- `id`: Unique identifier (snake_case)
- `label`: Display name
- `intro`: User-facing introduction
- `promptMarkdown`: Content from knowledge base file
- `iconId`: Icon identifier
- `kind`: 'ai' | 'tool' | 'hybrid'
- `quickActions`: Array of QuickAction objects

---

## Future Considerations

### Potential New Assistants

1. **Design System Assistant**: Enforce design system rules and patterns
2. **Localization Assistant**: Identify translatable content and context
3. **Animation Assistant**: Specify motion and transition details
4. **Responsive Design Assistant**: Analyze breakpoint behavior

### Enhancement Opportunities

1. **Cross-Assistant Workflows**: Chain Assistants (e.g., Design Critique → Accessibility → Dev Handoff)
2. **Custom Scoring Models**: Allow users to weight evaluation dimensions
3. **Assistant Preferences**: Remember user preferences per Assistant
4. **Batch Processing**: Analyze multiple selections at once

