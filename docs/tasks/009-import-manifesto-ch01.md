# Task 009 — Import Communist Manifesto Chapter I

| | |
|---|---|
| **Status** | Open |
| **Filed** | 2026-10-03 |
| **Owner** | Unassigned |
| **Severity** | High |
| **Milestone** | M1 |
| **Depends on** | 006, 008 |

## Goal
Get the first real content into the repository.

## Scope
- Run `plm import` on Ch. I.
- Fill in `work.yml`:
  - authors and year;
  - translation: Samuel Moore, 1888;
  - rights: `PUBLIC_DOMAIN`, with notes on why, plus `verified_by` / `verified_at`;
  - document order: ch01 only for now.
- Compare the Original layout with MIA block by block. Record any discrepancies as parser bugs.
- Commit message: `source(manifesto/ch01): import from MIA`.

## Acceptance
- `plm validate` passes.
- The layout comparison is complete, and its notes are attached to the PR.
