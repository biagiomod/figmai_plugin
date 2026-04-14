---
version: "1.0"
tags: ["dark-patterns", "deceptive-ux", "ethics", "remediation", "user-harm"]
updatedAt: "2026-01-21"
---

## Purpose
Reference knowledge for identifying dark and deceptive UX patterns, framing user harm and trust risks, and recommending ethical remediation. For detection and remediation only; not for implementing or encouraging manipulation.

## Scope
Applies to identification, risk assessment, and remediation of patterns that pressure, confuse, or harm users. Excludes any instructions on how to design or implement dark patterns, coercive copy recipes, or step-by-step manipulation. Content is for evaluation and ethical alternatives only.

## Definitions
- ### Forced Action: Requiring users to do something unrelated to their goal (e.g. mandatory account creation to view pricing, bundled consent).
- ### Nagging: Repeated prompts that interrupt user flow to influence behavior (e.g. persistent modals, repeated upsells).
- ### Obstruction: Making tasks harder than necessary (e.g. hard-to-find cancel, hidden opt-outs, unnecessary steps).
- ### Sneaking: Hiding or disguising information (e.g. pre-checked boxes, hidden fees, visual misdirection).
- ### Interface Interference: Manipulating visual hierarchy to bias decisions (e.g. dominant Accept vs muted Decline).
- ### False Urgency/Scarcity: Fake countdowns, pressure tactics, misleading availability claims.
- ### Confirmshaming: Guilt-inducing language for opting out (e.g. 'No thanks, I prefer poor security').
- ### Trick Questions: Confusing or misleading wording that causes accidental consent or commitment.
- ### Hidden Subscription/Roach Motel: Easy to enter, hard to exit (e.g. one-click signup, buried cancellation).
- ### Misleading Defaults: Defaults that benefit the business over the user without clear disclosure (e.g. pre-selected paid options).

## Rules
- Evaluate intent and effect, not just visual style. Consider financial harm, loss of autonomy, confusion, and regulatory risk.
- When identifying a pattern, state what was found, why it is deceptive, and what harm or risk it creates.
- Always suggest a remediation: an ethical alternative or fix that preserves user choice and clarity.
- If evidence is insufficient, say so explicitly rather than inferring deception.
- Be specific about what you observe in the design (elements, copy, layout) that supports the finding.

## Do
- Identify patterns that may pressure, confuse, or harm users.
- Explain why a pattern is deceptive and what user harm or risk it creates.
- Recommend remediation: ethical alternatives, clearer disclosure, or safer defaults.
- Use categories (Forced Action, Nagging, Obstruction, etc.) to classify findings.
- Frame guidance as 'avoid X; replace with Y' for clarity.

## Don't
- Provide instructions on how to design or implement dark patterns.
- Include coercive copy recipes or step-by-step instructions to manipulate users.
- Suggest ways to hide opt-outs, obscure pricing, or create false urgency.
- Encourage any pattern that undermines informed consent or user autonomy.

## Examples
- ### Good finding: 'Pricing is hidden behind mandatory account creation (Forced Action). Remediation: Allow pricing view without account; optional sign-up after intent is clear.'
- ### Good remediation: 'Replace pre-checked newsletter signup with unchecked box and clear label (avoid Sneaking).'
- ### Risk framing: 'Dominant Accept vs muted Decline button (Interface Interference) can lead to consent without meaningful choice; recommend equal visual weight for both options.'

## Edge Cases
- When a pattern could be legitimate (e.g. limited-time offer that is real), note uncertainty and recommend clear disclosure.
- When cultural or context norms affect perception (e.g. aggressive upsell in some markets), frame harm in terms of informed choice and clarity.
- When the design is ambiguous, describe what was observed and what would make it clearly ethical or clearly deceptive.
