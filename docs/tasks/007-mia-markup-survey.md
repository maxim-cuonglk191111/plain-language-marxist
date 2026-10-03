# Task 007 — MIA markup survey and parser fixtures

| | |
|---|---|
| **Status** | Open |
| **Filed** | 2026-10-03 |
| **Owner** | Unassigned |
| **Severity** | High |
| **Milestone** | M1 |
| **Depends on** | 003 |

## Goal
Find out how varied MIA's HTML is before the parser and the layout markup are frozen. This addresses the SDD §18 risk "MIA markup variety".

## Scope
- **Collect 6–10 MIA pages** across eras and authors. Include:
  - *Manifesto* Ch. I;
  - a *Capital* chapter;
  - a text with verse or letter formatting;
  - a text with heavy footnotes;
  - a text with tables of figures.
- **Save them as fixtures** in `packages/parser/fixtures/mia/`. Use public-domain texts only, and record each page's source URL and retrieval date.
- **Write up the findings** in `docs/architecture/mia-markup.md`:
  - how the content body is delimited and what counts as site chrome;
  - block elements;
  - how footnotes are encoded;
  - line-break and indentation conventions;
  - anchor patterns (anchors are discarded, but the parser must strip them reliably).
- **Update the layout markup spec** from task 003 if any construct cannot be represented.

## Acceptance
- Fixtures are committed with their provenance.
- The markup doc lists every construct found, and for each one either how it maps to layout markup or that it is discarded.
