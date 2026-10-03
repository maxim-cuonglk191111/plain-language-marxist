# Task 003 — Content schemas v1 (persisted shapes)

| | |
|---|---|
| **Status** | Open |
| **Filed** | 2026-10-03 |
| **Owner** | Unassigned |
| **Severity** | High |
| **Milestone** | M0 |
| **Depends on** | 002 |

## Goal
Define every content file format once, in `packages/schema`, before any code reads or writes it. These formats outlive any single run of the tools (persisted shapes), so they land first.

## Scope
Zod schemas, all starting at `schema_version: 1`:

| File | Contents | SDD |
|---|---|---|
| `work.yml` | Metadata, rights (publishable-status enum), document order | §5.3, §5.6 |
| `source.yml` | Passages: id, type, text with layout markup, hash, state, derived_from | §5.2, §5.3 |
| `{lang}-{register}.yml` | Renderings as a keyed map: covers, based_on, revision, ai_assisted, text | §5.4 |
| `original-terms.yml` | Passage, term, match, occurrence | §5.5 |
| `explanations.yml` | Explanations | §5.7 |
| `content/vocabulary/{term}.yml` | Forms, renderings, default, scoped_defaults | §6.1 |
| Collections, reading paths | — | §5.7 |
| `governance.yml` | Roles, approval rules, bootstrap_mode, min_account_age_days | §9 |

Also in scope:
- **Layout markup spec.** The allowlisted inline syntax for passage text: line breaks, emphasis, small caps, footnote refs, links and indentation.
  - Write it up in `docs/architecture/layout-markup.md`.
  - Ship a parser and serializer with round-trip tests.
  - Revise it with the findings of task 007.
- **JSON Schema export** (`pnpm --filter schema export`) for external tools.
- **`plm migrate` stub** that reads `schema_version`. There are no migrations yet, so it refuses unknown versions.

## Acceptance
- Tests cover a valid and an invalid fixture for every file type.
- JSON Schemas are generated.
- Layout markup round-trips: parse → serialize → parse gives an identical result.
