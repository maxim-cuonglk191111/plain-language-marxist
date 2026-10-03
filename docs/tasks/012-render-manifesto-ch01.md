# Task 012 — Plain English rendering of Manifesto Chapter I

| | |
|---|---|
| **Status** | Open |
| **Filed** | 2026-10-03 |
| **Owner** | Unassigned |
| **Severity** | High |
| **Milestone** | M1 |
| **Depends on** | 009, 011 |

## Goal
Complete, reviewed Plain English for Ch. I. This chapter is the project's first impression, so quality matters more than speed.

## Scope
- Write renderings with `plm prompt` / `plm apply` or by hand, following the style guide (task 005). Declare `ai_assisted` honestly.
- Use term tokens throughout.
- Add a few explanations (historical context) where passages need them, kept separate from the Plain English text.
- Review every passage against the checklist in SDD §9.3. Get at least one second reader if possible.
- Submit in batches of 10–20 passages per PR, with commit messages like `content(manifesto/ch01): render p000xx–p000yy`.

## Acceptance
- Every Ch. I passage has a rendering, and `plm validate` reports nothing.
- No check warnings are left unresolved: each one was either fixed or explained in its PR.
