# Task 015 — Term cards, terminology preference, explanations, vocabulary pages

| | |
|---|---|
| **Status** | Open |
| **Filed** | 2026-10-03 |
| **Owner** | Unassigned |
| **Severity** | High |
| **Milestone** | M1 |
| **Depends on** | 010, 014 |

## Goal
Make terminology and interpretation visible and interactive (SDD §6, §12).

## Scope
- **Highlights.** Mark term tokens in Plain English and annotated terms in the Original.
  - Each highlight is a `<button>` styled with a dotted underline.
  - On mobile, a long-press must still select text normally.
- **Term card.** A floating card on desktop and a bottom sheet on mobile. It shows:
  - the term and the wording currently displayed;
  - a short definition;
  - "Why this wording?" with the reason and its limitation;
  - alternatives with usage counts, labelled "community usage";
  - a link to the term's vocabulary page.
- **Terminology preference.** Project default, original terms, or a choice per term. Saved in `localStorage` and applied in the browser by the resolver (task 010).
- **Explain panel.** One per passage, with each explanation labelled by kind.
- **Vocabulary pages.** An index at `/vocabulary/` and a page per term at `/vocabulary/{term}/`.

## Acceptance
- Switching to "Original terms" changes only the Plain English display. The Original text is untouched.
- Term cards work fully from the keyboard (Enter, Space, Escape, Tab) and have screen-reader labels.
