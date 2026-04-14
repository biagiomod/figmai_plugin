# LLM Context Authoring Guide

> **Audience:** ACE admins, assistant authors, and strike teams
>
> **Purpose:** Define what should be frontloaded into `SKILL.md` versus stored as retrievable reference material such as `internalKBs`.

## Core Rule

Use `SKILL.md` for small, stable, high-value instructions.

Use retrieval for large, changing, or reference-style content.

Do not solve context quality problems by stuffing more text into the prompt.

## Preferred Terminology

- `SKILL.md` = assistant behavior, operating rules, output expectations, and authored quick-action guidance
- shared skills = future reusable behavior modules across assistants
- `internalKBs` = large reference documents or corpora that the LLM can retrieve from when needed

Avoid using generic "knowledge base" wording when it blurs the line between frontloaded behavior and retrieved reference material.

## What Belongs In `SKILL.md`

Put these in `SKILL.md`:

- assistant role and mission
- durable behavior rules
- response style and output expectations
- decision heuristics
- quick-action-specific authored instructions
- compact safety or escalation rules
- short, durable domain framing that improves most requests

Good `SKILL.md` content is:

- concise
- reusable across many runs
- unlikely to change every week
- useful before retrieval happens

## What Does Not Belong In `SKILL.md`

Do not put these in `SKILL.md` unless they are extremely short and stable:

- long policies
- design system inventories
- research libraries
- large product or marketing docs
- long examples collections
- changing operational procedures
- bulky checklists that only matter for some requests

If the content is large, fast-changing, or only relevant to a subset of prompts, it should usually live outside `SKILL.md`.

## What Belongs In `internalKBs`

Use `internalKBs` or other retrieval-backed sources for:

- policy manuals
- product documentation
- design system reference material
- taxonomy definitions
- research repositories
- market, customer, or resource libraries
- long-form writing guidance
- documents owned by other teams that change over time

This keeps the frontloaded prompt compact while still letting the model reach for deeper context when the task actually needs it.

## Practical Decision Test

Ask these questions before adding content to `SKILL.md`:

1. Does this guidance help on most requests?
2. Is it short enough to keep the prompt lean?
3. Is it stable enough that we will not constantly re-edit it?
4. Is it behavioral rather than reference-heavy?

If the answer to any of those is "no," the content likely belongs in retrieval instead.

## Why This Split Matters

This split improves:

- quality: the model sees the most important instructions first
- cost: smaller prompts reduce unnecessary token use
- maintainability: reference content can change without rewriting assistant behavior
- precision: retrieval brings in only the slices needed for the current request
- reuse: multiple assistants can draw from the same reference corpus without duplicating prompt text

## Retrieval Best Practices

When building or curating `internalKB` retrieval, prefer:

- structure-aware chunking rather than arbitrary fixed-size splits
- metadata-rich chunks, including assistant, domain, topic, source, and freshness information
- hybrid retrieval, combining semantic and keyword signals
- reranking before final context assembly
- a small final retrieved context window instead of dumping many chunks
- clear source ownership so stale reference material can be updated confidently

Avoid brute-force prompt stuffing as a substitute for retrieval design.

## Authoring Pattern

Use this mental model:

- `SKILL.md` answers: "How should this assistant behave?"
- `internalKBs` answer: "What background material can the assistant pull in when needed?"

In practice:

- put the assistant's role, tone, constraints, and output contract in `SKILL.md`
- put supporting reference documents in `internalKBs`
- retrieve only the most relevant reference slices for the current task

## Examples

Good for `SKILL.md`:

- "Act as a design critique partner focused on clarity, hierarchy, and interaction cost."
- "Prefer concise, actionable feedback with explicit tradeoffs."
- "When confidence is low, state assumptions before recommending changes."

Good for `internalKBs`:

- a 20-page content style guide
- a component inventory with variants and usage notes
- a research repository of prior studies
- a marketing messaging library
- long operating procedures or policy documents

## ACE And Strike Team Reuse

This document is intended to be reused later in:

- ACE admin guidance for authoring `SKILL.md`
- strike-team onboarding and resources pages
- future `SKILL.md` compiler and authoring docs

When those surfaces are added, link back to this guide rather than duplicating the rules in multiple places.
