# Deceptive Review Quick Action

## Overview

The "Deceptive Review" Quick Action is part of the Design Critique Assistant. It evaluates selected Figma elements for Dark & Deceptive UX practices and produces a structured report artifact on the canvas.

## Usage

1. Select a Figma element (frame, component, etc.)
2. Open the Design Critique Assistant
3. Click the "Deceptive Review" Quick Action
4. The system will analyze the design and place a report artifact on the canvas

## Report Schema

The report artifact contains:

- **Summary**: Overall assessment of deceptive patterns found
- **Overall Severity**: None, Low, Medium, or High
- **Findings**: Array of identified issues, each containing:
  - **Category**: One of 10 Dark UX categories
  - **Severity**: Low, Medium, or High
  - **Description**: What was found
  - **Why Deceptive**: Why this pattern is deceptive
  - **User Harm**: Potential harm to users
  - **Remediation**: Ethical alternative or fix
  - **Evidence**: Specific UI elements/patterns observed (optional)

## Dark UX Categories Evaluated

1. **Forced Action**: Requiring users to do something unrelated to their goal
2. **Nagging**: Repeated prompts interrupting user flow
3. **Obstruction**: Making tasks harder than necessary
4. **Sneaking**: Hiding or disguising information
5. **Interface Interference**: Manipulating visual hierarchy to bias decisions
6. **False Urgency/Scarcity**: Fake countdowns, pressure tactics
7. **Confirmshaming**: Guilt-inducing language for opting out
8. **Trick Questions**: Confusing or misleading wording
9. **Hidden Subscription/Roach Motel**: Easy to enter, hard to exit
10. **Misleading Defaults**: Defaults that benefit business over user

## Placement

The report artifact is placed using the same placement rules as scorecards:
- 40px to the left of the selected element's root container
- Falls back to right side or viewport center if insufficient space
- Replaces previous deceptive review reports when re-run

## Technical Details

- **Artifact Type**: `deceptive-report`
- **Version**: `v1`
- **Component**: `DeceptiveReportComponent` in `src/core/figma/artifacts/components/deceptiveReport.ts`
- **Parser**: `parseDeceptiveReportJson()` in `src/core/output/normalize/deceptiveReport.ts`
- **Handler**: Extended `DesignCritiqueHandler` in `src/core/assistants/handlers/designCritique.ts`

## JSON Response Format

The LLM returns a JSON object with this structure:

```json
{
  "summary": "Overall assessment...",
  "overallSeverity": "Medium",
  "findings": [
    {
      "category": "Forced Action",
      "severity": "High",
      "description": "User must create account to view pricing",
      "whyDeceptive": "Blocks access to information...",
      "userHarm": "Loss of autonomy, privacy concerns...",
      "remediation": "Allow pricing view without account...",
      "evidence": "Pricing page shows 'Create Account' modal..."
    }
  ]
}
```

## Separation from Scorecard

The Deceptive Review feature is completely separate from the existing "Give Design Crit" scorecard flow:
- Different Quick Action (`deceptive-review` vs `give-critique`)
- Different handler branch in `handleResponse()`
- Different artifact type (`deceptive-report` vs `scorecard`)
- Different parser (`parseDeceptiveReportJson()` vs `parseScorecardJson()`)
- Different component (`DeceptiveReportComponent` vs `ScorecardComponent`)

No regressions to scorecard behavior are possible as the code paths are completely independent.
