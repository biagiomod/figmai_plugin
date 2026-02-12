# FigmAI — Collaboration Mode Guide

## Purpose

This document defines when and how the FigmAI project should transition from a solo-controlled codebase to a team-collaborative environment.

The goal is to preserve architectural integrity while minimizing unnecessary tooling overhead during solo development.

---

# Current State (Solo Mode)

As long as the project is primarily maintained by a single developer:

- TypeScript strict mode is enforced
- Build includes `--typecheck`
- Invariants are enforced via `assert-invariants.ts`
- Tests validate prompt assembly, routing, KB resolution
- Prettier is enforced at the workspace level
- No ESLint dependency is required
- No pre-commit hooks are required
- CI is optional

This keeps the system lean and avoids unnecessary dependency approvals (e.g., Artifactory).

---

# Trigger Conditions for Collaboration Mode

Switch to Collaboration Mode when one or more of the following occur:

- Multiple active contributors
- External PRs accepted
- Enterprise-wide distribution
- Open-source publication
- Increased architectural churn
- Repeated hygiene issues (unused vars, drift, inconsistent formatting)

---

# Collaboration Mode Requirements

When activated, implement the following in order:

## 1. Add ESLint (Minimal Configuration Only)

Install:

- eslint
- @typescript-eslint/parser
- @typescript-eslint/eslint-plugin

Do NOT install heavy rule packs.

Enable only:

- no-unused-vars
- no-floating-promises
- no-implicit-any
- consistent-type-imports

Avoid stylistic rules (Prettier handles formatting).

---

## 2. Add Pre-Commit Hook (Husky)

Install:

- husky

Add pre-commit hook to run:

npm run build
npm run test
npm run invariants

Reject commit if any step fails.

---

## 3. Add CI Enforcement

In CI (GitHub Actions or internal pipeline), require:

npm run build
npm run test
npm run invariants

No merge without passing all three.

---

## 4. Add PR Template

Require contributors to declare:

- Change type (UI, Assistant, KB, Config, Architecture)
- Risk level (Low / Medium / High)
- Invariants verified
- Network behavior unchanged (if applicable)
- No runtime JSON reads introduced
- No new external domains added

---

## 5. Enforce Architectural Review for Cross-Cutting Changes

Require Architect-level review for changes involving:

- Prompt assembly
- Provider routing
- Knowledge base injection
- ExecutionType handling
- Manifest allowedDomains
- Runtime network behavior
- Build-time generators

---

# What NOT to Do in Collaboration Mode

- Do not introduce large style rule packs
- Do not enable automatic refactor extensions
- Do not allow runtime JSON configuration
- Do not bypass invariant scripts
- Do not disable build-time generators

The runtime must remain:

- Deterministic
- Generated-only
- Config-isolated
- Enterprise-safe

---

# Philosophy

Formatting is cosmetic.
Invariants are structural.
Tests are behavioral.
Generators are deterministic.
Architecture is sacred.

Collaboration Mode should strengthen guarantees — not introduce noise.

---

# Activation Checklist

When switching to Collaboration Mode:

- [ ] Install ESLint (minimal config)
- [ ] Add Husky pre-commit hook
- [ ] Add CI build/test/invariants gate
- [ ] Add PR template
- [ ] Announce architectural review requirement

Until then, keep the environment lean.
