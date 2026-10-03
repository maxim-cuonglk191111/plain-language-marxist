# Task 019 — M1 end-to-end test suite

| | |
|---|---|
| **Status** | Done |
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

## Notes (on completion)
- `pnpm e2e` builds the site from `e2e/fixture-repo` and serves it with a dependency-free static server (`.htm` served as HTML, as on a real host). It then runs 27 desktop tests and 1 mobile test.
- `e2e/fixture-repo` holds the real Ch. I source and vocabulary plus sample renderings, including one that covers two passages and one with term tokens, and an explanation. The suite therefore does not depend on how far task 012 has got.
- **Coverage:**
  - `.htm` content type;
  - the Original block structure (indents, footnotes, rows);
  - deep links in all three modes, including the second passage of a multi-passage rendering;
  - the mode switch and its remembered choice;
  - term cards from both layers and from the keyboard;
  - "Original terms" changing only Plain English;
  - the explain panel, vocabulary and search;
  - no JavaScript;
  - the mobile bottom sheet;
  - axe in light and dark themes;
  - no console errors in any test.
- **Regression check:** breaking deep links on purpose (renaming the row IDs) made 11 tests fail. The change was reverted.
- CI has a separate `e2e` job that installs Chromium and uploads traces on failure.
