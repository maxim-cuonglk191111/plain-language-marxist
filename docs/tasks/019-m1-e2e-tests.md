# Task 019 — M1 end-to-end test suite

| | |
|---|---|
| **Status** | Open |
| **Filed** | 2026-10-03 |
| **Owner** | Unassigned |
| **Severity** | High |
| **Milestone** | M1 |
| **Depends on** | 016, 017 |

## Goal
Automate the read-only parts of the MVP acceptance test (SDD §15, §16.2 steps 1–3).

## Scope
Playwright tests, run against a built site, that check:
- the Original layout matches the fixture's block structure;
- a `#p00017` deep link works in every mode;
- switching between modes works;
- term cards open from both the Original and Plain English layers;
- the "Original terms" preference changes only the Plain English wording;
- pages still work with JavaScript disabled.

The suite runs in CI on every PR.

## Acceptance
- The suite passes in CI.
- It fails when a regression is introduced on purpose, such as breaking a deep link.
