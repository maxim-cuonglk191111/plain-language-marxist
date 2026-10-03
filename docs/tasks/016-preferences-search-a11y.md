# Task 016 — Reader preferences, search, accessibility pass

| | |
|---|---|
| **Status** | Done |
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

## Notes (on completion)
- **Preferences** (theme, text size, line spacing, term underlines) are saved in `localStorage` with try/catch and applied before first paint by the inline boot script. Reading progress is offered as a "Continue where you left off" link, never an automatic jump. Bookmarks use buttons beside each row, with a `/bookmarks/` page.
- **Search deviates from the SDD:** it uses MiniSearch over a new `/data/v1/search.json` instead of Pagefind, because Pagefind indexes pages and cannot label results by layer. The SDD §10.3 and the stack table are updated. Every query term must match, so results are not over-broad.
- **Accessibility:** axe runs in the E2E suite (task 019) on home, the reader in all three modes, vocabulary, a term page, search and an open term card, in light and dark themes. It found **no serious or critical violations**.
- **Verified in Chromium:** settings apply and survive a reload, bookmarks toggle and list, the resume link appears after scrolling, and search results are labelled by layer.
