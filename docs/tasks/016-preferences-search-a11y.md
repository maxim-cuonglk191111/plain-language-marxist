# Task 016 — Reader preferences, search, accessibility pass

| | |
|---|---|
| **Status** | Open |
| **Filed** | 2026-10-03 |
| **Owner** | Unassigned |
| **Severity** | Medium |
| **Milestone** | M1 |
| **Depends on** | 015 |

## Goal
Finish the M1 reader (SDD §10.3, §12).

## Scope
- **Preferences in `localStorage`:**
  - theme, font size and line height;
  - default reading mode, card style and highlight visibility;
  - reading progress and bookmarks.

  Wrap every storage call in try/catch so the reader still works where storage is blocked.
- **Search.** Pagefind, with each result labelled by layer.
- **Accessibility (WCAG 2.2 AA).**
  - Check keyboard navigation, focus visibility, contrast, reduced motion and semantic landmarks.
  - Run axe in CI on the key pages.

## Acceptance
- axe reports no serious or critical violations.
- Search finds Ch. I text in both the Original and Plain English layers.
- Preferences survive a page reload.
