# Task 015 — Term cards, terminology preference, explanations, vocabulary pages

| | |
|---|---|
| **Status** | Done |
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

## Notes (on completion)
- **Term buttons.** In the Original they are built from annotations (whole-word, nth occurrence, mapped across inline markup). In Plain English they are built from tokens and show the default wording server-side, so the page works without JavaScript.
- **`TermCards`** (client) re-resolves Plain English buttons from the local preference (project wording, original terms, or a per-term choice), using the same resolver as the build. It opens one card through a delegated click handler: a popover on desktop, a bottom sheet under 40rem. Escape or a click outside closes it and returns focus. Buttons are real `<button>`s, so Enter and Space work.
- **Explain panel** is `<details>` per row, labelled by kind, and works without JavaScript.
- **`/vocabulary/`** and **`/vocabulary/{term}/`** are static pages. `finalize-export.mjs` now gives every page a clean path (`dir/index.html`) and copies `/data/v1/` into the site as the public read API.
- **Verified in Chromium:** the card shows the definition, "Why this wording?" and alternatives with usage. "Original terms" changes only Plain English and survives a reload. The card works from the keyboard. Explain, vocabulary pages, `/data/v1/manifest.json` and the mobile bottom sheet all work, with no console errors.
- **Fixes found while testing:**
  - The AI badge now says "AI-assisted" (the data records AI use, not who reviewed).
  - The checks compare `{Term}` capitalized, which removes a false "names" warning.
