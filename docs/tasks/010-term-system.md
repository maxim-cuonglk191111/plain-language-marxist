# Task 010 — Term system: tokens, resolver, vocabulary

| | |
|---|---|
| **Status** | Open |
| **Filed** | 2026-10-03 |
| **Owner** | Unassigned |
| **Severity** | High |
| **Milestone** | M1 |
| **Depends on** | 004 |

## Goal
Implement the term system from SDD §6 in `packages/terms`.

## Scope
- **Token parser.** Supports:
  - `{term}` — plain token;
  - `{term:form}` — a specific form;
  - `{Term}` — capitalized output;
  - `{term=rendering}` — pinned to one rendering;
  - `\{` — a literal brace.

  Parse errors report their position.
- **Resolver.** Picks the wording in this order:
  1. a pin on the token;
  2. the reader's preference;
  3. a scoped default (work, then author);
  4. the global default.

  It also handles capitalization.
- **`plm validate` hooks.** Reject:
  - unknown terms or forms;
  - alternatives that are missing a declared form;
  - alternatives whose grammatical number doesn't match.
- **Usage counts.** For each rendering, count the published tokens that display it by default.
- **Initial vocabulary for Ch. I.** Terms such as bourgeoisie, proletariat, means of production, guild-master, journeyman and feudal. Each needs definitions, alternatives, reason/limitation and a default.
- **`original-terms.yml` for Ch. I.**

## Acceptance
- Unit tests cover every token form, the resolution order and capitalization.
- The Ch. I vocabulary and annotations pass validation.
