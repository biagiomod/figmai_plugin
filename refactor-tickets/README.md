# Refactor Tickets

This directory contains detailed refactor tickets for improving codebase maintainability. Each ticket is self-contained with implementation steps, acceptance criteria, and risk assessment.

## Quick Start

1. Review the main audit report: `../REFACTOR_AUDIT.md`
2. Pick a ticket from the list below
3. Follow the ticket's implementation steps
4. Mark ticket as complete after verification

## Ticket List

### Phase 1: Quick Wins (1-2 hours each)

| Ticket | Priority | Effort | Status |
|--------|----------|--------|--------|
| [01: Consolidate Assistant Registry](./01-consolidate-assistant-registry.md) | 🔴 High | 1h | Pending |
| [02: Standardize Function Names](./02-standardize-function-names.md) | 🔴 High | 30m | Pending |
| [05: Remove Dead Code](./05-remove-dead-code.md) | 🟢 Low | 5m | Pending |

### Phase 2: Refactoring (2-4 hours each)

| Ticket | Priority | Effort | Status |
|--------|----------|--------|--------|
| [03: Extract Error Handling](./03-extract-error-handling.md) | 🟡 Medium | 2h | Pending |
| [04: Extract Design Critique Handler](./04-extract-design-critique-handler.md) | 🟡 Medium | 3h | Pending |

### Phase 3: Architecture (4-8 hours each)

*Tickets to be created after Phase 1 & 2 completion*

- Centralize Logging
- Split Large Files

## Recommended Order

1. **Start with Phase 1** - Low risk, high impact, quick wins
2. **Tickets 01 & 02 can be combined** - Both touch assistant registry
3. **Ticket 05 is trivial** - Can be done anytime
4. **Phase 2 after Phase 1** - Builds on foundation
5. **Phase 3 last** - Requires more planning

## Ticket Status

- **Pending** - Not started
- **In Progress** - Currently being worked on
- **Review** - Ready for code review
- **Complete** - Merged and verified

## Contributing

When working on a ticket:

1. Create a branch: `refactor/ticket-XX-short-name`
2. Follow the ticket's implementation steps
3. Update ticket status in this README
4. Add notes if you discover issues or need to adjust approach
5. Create PR with ticket number in title

## Questions?

Refer to the main audit report for context and rationale behind each refactor.

